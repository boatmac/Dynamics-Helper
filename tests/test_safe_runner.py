"""Inert runner tests: all process creation and filesystem mutation are mocked.

Load this explicit module from the reviewed validation bootstrap, not discovery.
No supervisor or fixture child is executed by these tests.
"""
from contextlib import ExitStack
import io
import json
from pathlib import Path
import queue
import subprocess
import sys
import threading
import types
import unittest
from unittest.mock import Mock, patch

from scripts import run_safe_tests as runner


ROOT = Path(__file__).absolute().parents[1]


class SafeRunnerTests(unittest.TestCase):
    def run_supervisor(self, *, launch_error=None, kill_error=None, wait_error=None,
                       capture_error=None, hash_error=None, write_error=None,
                       snapshot_error=None, close_error=None, join_error=None,
                       flush_error=None, interrupt=False, full_queue=False,
                       changed_input=None, input_read_error=None):
        proc = Mock(pid=123, returncode=None if wait_error else 0)
        proc.poll.return_value = None if kill_error or wait_error or interrupt or full_queue else 0
        proc.kill.side_effect = kill_error
        operations = []

        def waited(timeout):
            operations.append('wait')
            if wait_error:
                raise wait_error

        proc.wait.side_effect = waited
        proc.stdout.read.side_effect = capture_error or [b'output', b'']
        proc.stdout.close.side_effect = close_error
        log = Mock()
        log.write.side_effect = KeyboardInterrupt() if interrupt else None
        log.flush.side_effect = flush_error
        record = dict(timeout=10, repository=str(ROOT), manifest_hash='hash', sources={
            name: 'hash' for name in ('tests/test_one.py', 'support/helper.py', *runner.BOOTSTRAP)})
        written = {}
        final = json.dumps(dict(event='finished', successful=True, completed=1, total=1))
        stop = threading.Event()

        def save(path, value):
            operations.append(path.name)
            if path.name == write_error:
                raise OSError('secret must not escape')
            written[path.name] = json.loads(json.dumps(value))

        def hashing(path):
            if path.name in ('stdout.log', 'results.jsonl'):
                if hash_error:
                    raise hash_error
                return 'hash'
            relative = path.relative_to(ROOT).as_posix()
            operations.append(relative)
            if relative == changed_input and 'wait' in operations:
                if input_read_error:
                    raise input_read_error
                return 'changed'
            return 'hash'

        def fake_thread(*, target, daemon):
            thread = Mock()
            thread.start.side_effect = target
            thread.join.side_effect = join_error
            thread.is_alive.return_value = False
            return thread

        chunks = queue.Queue(maxsize=8)
        if full_queue:
            def blocked_put(data, timeout):
                self.assertEqual(timeout, 0.1)
                stop.set()
                raise queue.Full
            chunks.put = blocked_put

        with ExitStack() as stack:
            stack.enter_context(patch.object(runner, 'write_record', side_effect=save))
            stack.enter_context(patch.object(runner, 'environment', return_value={'TEMP': 'isolated'}))
            stack.enter_context(patch.object(Path, 'mkdir'))
            stack.enter_context(patch.object(Path, 'open', return_value=log))
            stack.enter_context(patch.object(Path, 'is_file', return_value=True))
            stack.enter_context(patch.object(Path, 'stat', return_value=types.SimpleNamespace(st_size=20)))
            stack.enter_context(patch.object(Path, 'read_text', side_effect=snapshot_error, return_value=final))
            stack.enter_context(patch.object(runner, 'checked_path', side_effect=lambda path, directory=False: path))
            stack.enter_context(patch.object(runner, 'digest', side_effect=hashing))
            popen = stack.enter_context(patch.object(runner.subprocess, 'Popen', side_effect=launch_error, return_value=proc))
            stack.enter_context(patch.object(runner.threading, 'Thread', side_effect=fake_thread))
            stack.enter_context(patch.object(runner.threading, 'Event', side_effect=[stop, threading.Event()]))
            stack.enter_context(patch.object(runner.queue, 'Queue', return_value=chunks))
            if full_queue:
                stack.enter_context(patch.object(runner.time, 'monotonic', side_effect=[0, 11, 12]))
            console = io.StringIO()
            stack.enter_context(patch('sys.stdout', console))
            code = runner.supervise(ROOT / 'inert-run', ['base-python', '-I', '-B', '-S'], record)
        self.assertNotIn('secret', console.getvalue())
        self.assertIn('evidence', console.getvalue())
        if proc.wait.called:
            proc.wait.assert_called_once_with(timeout=5)
            inputs = [*record['sources'], 'tests/test-safety-manifest.json']
            if input_read_error:
                inputs = inputs[:inputs.index(changed_input) + 1]
            for relative in inputs:
                self.assertLess(operations.index('wait'), operations.index(relative))
                self.assertLess(operations.index(relative), operations.index('result.json'))
        return code, record, written, popen, proc

    def test_success_and_launch_record_precedes_creation(self):
        code, record, written, popen, proc = self.run_supervisor()
        self.assertEqual(code, 0)
        self.assertIsNone(written['launch.json']['pid'])
        self.assertIsNone(written['launch.json']['returncode'])
        self.assertEqual(written['process.json']['pid'], 123)
        self.assertEqual(record['captured_bytes'], 6)
        self.assertTrue(record['sources_unchanged'])
        self.assertTrue(written['result.json']['sources_unchanged'])
        self.assertFalse(popen.call_args.kwargs['shell'])
        self.assertEqual(popen.call_args.kwargs['env'], {'TEMP': 'isolated'})
        proc.kill.assert_not_called()

    def test_launch_failure_retains_independent_result(self):
        code, record, written, _, _ = self.run_supervisor(launch_error=OSError('secret'))
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'startup_failure')
        self.assertIsNone(record['pid'])
        self.assertIsNone(record['returncode'])
        self.assertIn('launch.json', written)
        self.assertIn('result.json', written)

    def test_kill_and_wait_failures_do_not_block_finalization(self):
        code, record, written, _, proc = self.run_supervisor(
            kill_error=OSError('secret'), wait_error=subprocess.TimeoutExpired('secret', 5), full_queue=True)
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'timeout')
        self.assertEqual([e['step'] for e in record['cleanupErrors']], ['kill', 'wait', 'source_revalidation'])
        self.assertTrue(record['child_unreaped'])
        self.assertFalse(record['sources_unchanged'])
        self.assertFalse(record['completed_successfully'])
        self.assertIsNone(record['returncode'])
        self.assertIn('result.json', written)
        proc.kill.assert_called_once()

    def test_capture_failure_is_nonzero(self):
        code, record, written, _, _ = self.run_supervisor(capture_error=OSError('secret'))
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'capture_error')
        self.assertEqual(record['capture_errors'], ['OSError'])
        self.assertIn('result.json', written)

    def test_postwait_input_mutation_blocks_success(self):
        for relative in ('tests/test_one.py', 'support/helper.py', *runner.BOOTSTRAP,
                         'tests/test-safety-manifest.json'):
            with self.subTest(relative=relative):
                code, record, written, _, _ = self.run_supervisor(changed_input=relative)
                self.assertEqual(code, 1)
                self.assertEqual(record['reason'], 'exited')
                self.assertFalse(record['sources_unchanged'])
                self.assertFalse(record['completed_successfully'])
                self.assertEqual(record['cleanupErrors'], [{'step': 'source_revalidation', 'error': 'ValueError'}])
                self.assertFalse(written['result.json']['sources_unchanged'])

    def test_postwait_input_read_failure_retains_terminal_record(self):
        code, record, written, _, _ = self.run_supervisor(
            changed_input='support/helper.py', input_read_error=OSError('secret'))
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'exited')
        self.assertFalse(record['sources_unchanged'])
        self.assertFalse(record['completed_successfully'])
        self.assertEqual(record['cleanupErrors'], [{'step': 'source_revalidation', 'error': 'OSError'}])
        self.assertIn('result.json', written)

    def test_hash_and_snapshot_failures_are_independent(self):
        code, record, written, _, _ = self.run_supervisor(
            hash_error=OSError('secret'), snapshot_error=ValueError('secret'))
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'exited')
        self.assertEqual([e['step'] for e in record['cleanupErrors']],
                         ['hash_stdout.log', 'hash_results.jsonl', 'snapshot'])
        self.assertIn('result.json', written)

    def test_record_write_failures_cannot_pass(self):
        for name in ('launch.json', 'process.json', 'result.json'):
            with self.subTest(name=name):
                code, record, written, popen, _ = self.run_supervisor(write_error=name)
                self.assertEqual(code, 1)
                if name == 'launch.json':
                    popen.assert_not_called()
                if name != 'result.json':
                    self.assertIn('result.json', written)
                else:
                    self.assertEqual(record['cleanupErrors'][-1]['step'], 'result_write')

    def test_interrupt_survives_cleanup_error(self):
        code, record, written, _, _ = self.run_supervisor(interrupt=True, close_error=OSError('secret'))
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'interrupted')
        self.assertEqual(record['error'], 'KeyboardInterrupt')
        self.assertEqual(record['cleanupErrors'][0]['step'], 'pipe_close')
        self.assertIn('result.json', written)

    def test_full_capture_queue_stops_without_blocking(self):
        code, record, _, _, _ = self.run_supervisor(full_queue=True)
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'timeout')
        self.assertFalse(record['reader_pending'])

    def test_join_and_flush_failures_still_write_result(self):
        code, record, written, _, _ = self.run_supervisor(
            join_error=RuntimeError('secret'), flush_error=OSError('secret'))
        self.assertEqual(code, 1)
        self.assertEqual(record['reason'], 'interrupted')
        self.assertEqual([e['step'] for e in record['cleanupErrors']], ['join', 'flush'])
        self.assertIn('result.json', written)

    def test_startup_rejects_flags_and_venv(self):
        for isolated, no_site, bytecode, optimize, prefix in (
                (False, True, True, 0, 'base'), (True, False, True, 0, 'base'),
                (True, True, False, 0, 'base'), (True, True, True, 1, 'base'),
                (True, True, True, 0, 'venv')):
            with self.subTest(isolated=isolated, no_site=no_site, optimize=optimize, prefix=prefix):
                fake = types.SimpleNamespace(flags=types.SimpleNamespace(isolated=isolated, no_site=no_site,
                    optimize=optimize), dont_write_bytecode=bytecode, executable='python',
                    _base_executable='python', prefix=prefix, base_prefix='base')
                with patch.object(runner, 'sys', fake), patch.object(runner, 'checked_path', side_effect=lambda p: p):
                    self.assertRaises(ValueError, runner.startup)

    def test_minimal_environment_does_not_inherit_credentials_or_optins(self):
        inherited = {'SystemRoot': str(ROOT), 'SECRET': 'secret', 'DH_TEST_ALLOW_FROZEN': '1',
                     'DH_TEST_ALLOW_POWERSHELL_HARNESS': '1'}
        with patch.dict(runner.os.environ, inherited, clear=True), patch.object(
                runner, 'checked_path', side_effect=lambda path, directory=False: path):
            env = runner.environment(ROOT)
        self.assertEqual(set(env), {'SystemRoot', *runner.ISOLATED})

    def test_gate_binds_dependency_ids_and_process_permission(self):
        data = {'version': 2, 'profiles': {'pure': {'tests': ['tests/test_one.py'],
                'dependencies': ['support/helper.py'], 'test_ids': ['tests.test_one.Case.test_one']}},
                'inventory': [{'path': 'tests/test_one.py', 'class': 'pure_mock', 'sha256': 'hash'},
                              {'path': 'support/helper.py', 'class': 'support', 'sha256': 'hash'}]}
        checker = types.SimpleNamespace(check_repository=Mock(return_value=([], ['tests/test_one.py'])))
        with patch.object(runner, 'startup'), patch.dict(sys.modules, {'check_test_safety': checker}), \
                patch.object(runner, 'checked_path', side_effect=lambda path: path), \
                patch.object(runner, 'digest', return_value='hash') as hashing, \
                patch.object(Path, 'read_text', side_effect=lambda **kw: json.dumps(data)), \
                patch.object(Path, 'read_bytes', return_value=b'import unittest'):
            _, first, selection = runner.gate(ROOT, 'pure')
            _, process, _ = runner.gate(ROOT, 'pure', True)
            data['profiles']['pure']['test_ids'] = ['tests.test_one.Case.test_other']
            _, changed, _ = runner.gate(ROOT, 'pure')
            self.assertEqual(set(selection['sources']), {'tests/test_one.py', 'support/helper.py', *runner.BOOTSTRAP})
            self.assertNotEqual(first, process)
            self.assertNotEqual(first, changed)
            self.assertEqual(hashing.call_args.args[0], ROOT / 'tests/test-safety-manifest.json')
            data['inventory'][1]['sha256'] = None
            self.assertRaises(ValueError, runner.gate, ROOT, 'pure')

    def test_worker_hashes_all_sources_before_any_import(self):
        selection = dict(selected=['tests/test_one.py'], dependencies=['support/helper.py'],
                         test_ids=None, sources={'tests/test_one.py': 'hash', 'support/helper.py': 'hash'})
        with patch.object(runner, 'digest', side_effect=['hash', 'changed']), \
                patch.object(runner.importlib.util, 'spec_from_file_location') as importing:
            self.assertRaises(ValueError, runner.worker, ROOT, ROOT, selection)
            importing.assert_not_called()

    def test_gate_rejects_hooks_nonpython_and_manifest_races(self):
        data = {'version': 2, 'profiles': {'pure': {'tests': ['tests/test_one.py'], 'dependencies': []}},
                'inventory': [{'path': 'tests/test_one.py', 'class': 'pure_mock', 'sha256': 'hash'}]}
        checker = types.SimpleNamespace(check_repository=Mock(return_value=([], ['tests/test_one.py'])))
        with patch.object(runner, 'startup'), patch.dict(sys.modules, {'check_test_safety': checker}), \
                patch.object(runner, 'checked_path', side_effect=lambda path: path), \
                patch.object(runner, 'digest', return_value='hash') as hashing, \
                patch.object(Path, 'read_text', side_effect=lambda **kw: json.dumps(data)), \
                patch.object(Path, 'read_bytes', return_value=b'def load_tests(): pass') as source:
            self.assertRaises(ValueError, runner.gate, ROOT, 'pure')
            source.return_value = b'import unittest'
            manifest_reads = 0

            def changed_manifest(path):
                nonlocal manifest_reads
                if path.name == 'test-safety-manifest.json':
                    manifest_reads += 1
                    return 'hash' if manifest_reads == 1 else 'changed'
                return 'hash'

            hashing.side_effect = changed_manifest
            self.assertRaises(ValueError, runner.gate, ROOT, 'pure')
            hashing.side_effect = None
            data['profiles']['pure']['tests'] = ['tests/test_one.ps1']
            checker.check_repository.return_value = ([], ['tests/test_one.ps1'])
            self.assertRaises(ValueError, runner.gate, ROOT, 'pure')

    def test_exact_ids_missing_methods_hooks_and_skips(self):
        class Case(unittest.TestCase):
            def test_selected(self):
                pass

            def test_unselected(self):
                self.fail('unselected method executed')

            @unittest.skip('selected skips are not passes')
            def test_skipped(self):
                pass

        Case.__module__ = 'tests.test_inert_scope'
        for method, hook, expected in (('test_selected', False, 0), ('test_missing', False, ValueError),
                                       ('test_selected', True, ImportError), ('test_skipped', False, 1)):
            with self.subTest(method=method, hook=hook):
                module = types.ModuleType('tests.test_inert_scope')
                module.Case = Case
                if hook:
                    module.load_tests = Mock(side_effect=AssertionError('hook executed'))
                selection = dict(selected=['tests/test_inert_scope.py'], dependencies=[],
                    test_ids=['tests.test_inert_scope.Case.' + method], sources={'tests/test_inert_scope.py': 'hash'})
                def import_reviewed_module(loaded):
                    self.assertEqual(sys.path[0], str(ROOT))
                    self.assertIn(str(ROOT / 'tests'), sys.path)
                    self.assertIs(loaded, module)

                spec = Mock()
                spec.loader.exec_module.side_effect = import_reviewed_module
                with patch.object(runner, 'digest', return_value='hash'), \
                        patch.object(Path, 'open', return_value=io.StringIO()), \
                        patch.object(runner.importlib.util, 'spec_from_file_location', return_value=spec), \
                        patch.object(runner.importlib.util, 'module_from_spec', return_value=module), \
                        patch.object(sys, 'path', sys.path.copy()), patch.dict(sys.modules), \
                        patch('sys.stderr', io.StringIO()):
                    if isinstance(expected, type):
                        self.assertRaises(expected, runner.worker, ROOT, ROOT, selection)
                    else:
                        self.assertEqual(runner.worker(ROOT, ROOT, selection), expected)
                if hook:
                    module.load_tests.assert_not_called()
