"""Base Python -I -B -S, never -O. Explicit profiles, no execution on import.
Bootstrap and transitive imports need review. Not an OS sandbox: only the owned
Popen handle is killed; descendants and evidence may survive.
"""
import argparse
import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import queue
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest

ISOLATED = ('LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP')
LIMIT = 8 * 1024 * 1024
BOOTSTRAP = ('scripts/run_safe_tests.py', 'scripts/check_test_safety.py')
def checked_path(path, directory=False):
    path = Path(path)
    if not path.is_absolute() or '..' in path.parts:
        raise ValueError('absolute canonical path required')
    for ancestor in (*reversed(path.parents), path):
        info = ancestor.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('symlink/reparse path refused')
    resolved = path.resolve(strict=True)
    if not (resolved.is_dir() if directory else resolved.is_file()):
        raise ValueError('unexpected path type')
    return resolved
def digest(path):
    with checked_path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
def startup():
    if not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode) or sys.flags.optimize:
        raise ValueError('base Python -I -B -S without optimization required')
    base = getattr(sys, '_base_executable', None)
    executable = checked_path(Path(sys.executable))
    if not base or executable != checked_path(Path(base)) or sys.prefix != sys.base_prefix:
        raise ValueError('base interpreter required')
    return executable
def gate(root, profile, allow_process=False):
    startup()  # Must precede the first non-stdlib import, even for direct callers.
    manifest = root / 'tests/test-safety-manifest.json'
    before = digest(manifest)
    bootstrap = {relative: digest(root / relative) for relative in BOOTSTRAP}
    from check_test_safety import check_repository
    diagnostics, selected = check_repository(root, profile=profile, process_tests=allow_process)
    if diagnostics or not profile:
        raise ValueError('review gate blocked all tests')
    data = json.loads(manifest.read_text(encoding='utf-8'))
    definition = data['profiles'][profile]
    dependencies, ids = definition['dependencies'], definition.get('test_ids')
    if (data['version'] != 2 or not selected or set(selected) != set(definition['tests'])
            or len(selected) != len(set(selected)) or any(Path(p).suffix != '.py' for p in selected)):
        raise ValueError('invalid Python selection')
    if ids is not None and (not ids or len(ids) != len(set(ids)) or any(
            not isinstance(i, str) or len(i.split('.')) < 3 or
            not all(part.isidentifier() for part in i.split('.')) or
            i.rsplit('.', 2)[0] not in {p[:-3].replace('/', '.') for p in selected} for i in ids)):
        raise ValueError('invalid exact test IDs')
    sources = {}
    for relative in dict.fromkeys([*selected, *dependencies, *BOOTSTRAP]):
        path = checked_path(root / relative)
        if not path.is_relative_to(root):
            raise ValueError('source outside repository')
        sources[relative] = digest(path)
        if relative in bootstrap and sources[relative] != bootstrap[relative]:
            raise ValueError('bootstrap changed during gate')
        if relative not in BOOTSTRAP:
            entries = [entry for entry in data['inventory'] if entry['path'] == relative]
            if len(entries) != 1 or entries[0]['sha256'] != sources[relative]:
                raise ValueError('reviewed source changed')
            if relative in selected and entries[0]['class'] not in (
                    {'pure_mock', 'process'} if allow_process else {'pure_mock'}):
                raise ValueError('non-runnable source selected')
        if relative in selected and any(
                getattr(node, 'name', None) == 'load_tests' or
                isinstance(node, ast.Name) and node.id == 'load_tests'
                for node in ast.walk(ast.parse(path.read_bytes()))):
            raise ValueError('discovery hook refused')
    if any(digest(root / relative) != expected for relative, expected in sources.items()) or before != digest(manifest):
        raise ValueError('manifest changed during gate')
    selection = dict(profile=profile, selected=selected, dependencies=dependencies,
                     test_ids=ids, sources=sources, allow_process_tests=allow_process)
    return before, hashlib.sha256(json.dumps(selection, sort_keys=True).encode()).hexdigest(), selection
def environment(run):
    env = {'SystemRoot': str(checked_path(Path(os.environ['SystemRoot']), directory=True))}
    env.update({key: str(checked_path(run / key, directory=True)) for key in ISOLATED})
    return env
def worker(root, run, selection):
    started = time.monotonic()
    for relative, expected in selection['sources'].items():
        if digest(root / relative) != expected:
            raise ValueError('source changed before import')
    # Root enables reviewed namespace imports; this is not import confinement.
    sys.path[:0] = list(dict.fromkeys([str(root), *(str((root / p).parent) for p in
                                   [*selection['selected'], *selection['dependencies']])]))
    with (run / 'results.jsonl').open('x', encoding='utf-8') as events:
        def emit(**event):
            line = json.dumps(dict(elapsed=time.monotonic() - started, **event)) + '\n'
            if events.tell() + len(line.encode()) > LIMIT:
                raise RuntimeError('result log limit exceeded')
            events.write(line)
            events.flush()
        class Result(unittest.TextTestResult):
            def startTest(self, test):
                super().startTest(test)
                emit(event='start', active=test.id(), completed=self.testsRun - 1, total=total)

            def stopTest(self, test):
                super().stopTest(test)
                emit(event='stop', test=test.id(), active=None, completed=self.testsRun,
                     total=total, failures=len(self.failures), errors=len(self.errors), skipped=len(self.skipped))
        suite, found = unittest.TestSuite(), set()
        ids = selection['test_ids']
        for relative in selection['selected']:
            emit(event='import', active=relative, completed=0, total=None)
            name, path = relative[:-3].replace('/', '.'), root / relative
            if name in sys.modules or digest(path) != selection['sources'][relative]:
                raise ImportError('selected module changed or already imported')
            spec = importlib.util.spec_from_file_location(name, path)
            module = importlib.util.module_from_spec(spec)
            sys.modules[name] = module
            spec.loader.exec_module(module)
            if 'load_tests' in vars(module):
                raise ImportError('discovery hook refused')
            for cls in vars(module).values():
                if not isinstance(cls, type) or not issubclass(cls, unittest.TestCase) or cls.__module__ != name:
                    continue
                for method in unittest.TestLoader().getTestCaseNames(cls):
                    identity = f'{name}.{cls.__name__}.{method}'
                    if (ids is None or identity in ids) and identity not in found:
                        suite.addTest(cls(method))
                        found.add(identity)
        total = suite.countTestCases()
        if not total or ids is not None and found != set(ids):
            raise ValueError('missing selected test methods')
        result = unittest.TextTestRunner(resultclass=Result, verbosity=2).run(suite)
        successful = result.wasSuccessful() and result.testsRun == total and not result.skipped
        emit(event='finished', active=None, completed=result.testsRun, total=total, successful=successful)
        return 0 if successful else 1
def write_record(path, record):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(record, stream, indent=2)
def supervise(run, argv, record):
    proc = reader = log = None
    chunks, stop, done = queue.Queue(maxsize=8), threading.Event(), threading.Event()
    errors, capture_errors = [], []
    started, captured, reason = time.monotonic(), 0, 'startup_failure'
    record.update(pid=None, returncode=None, cleanupErrors=errors, hashes={},
                  completed_successfully=False, sources_unchanged=False)
    def attempt(step, action):
        try:
            return action()
        except BaseException as error:
            errors.append({'step': step, 'error': type(error).__name__})
    try:
        write_record(run / 'launch.json', record)  # Independent evidence before creation.
        for key in ISOLATED:
            (run / key).mkdir()
        log = (run / 'stdout.log').open('xb')
        proc = subprocess.Popen(argv, cwd=run, env=environment(run), stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                shell=False, close_fds=True, bufsize=0)
        record.update(pid=proc.pid, spawned_at=time.time())
        reason = 'interrupted'
        write_record(run / 'process.json', record)
        def capture():
            try:
                while not stop.is_set():
                    data = proc.stdout.read(65536)
                    if not data:
                        break
                    while not stop.is_set():
                        try:
                            chunks.put(data, timeout=0.1)
                            break
                        except queue.Full:
                            continue
            except BaseException as error:
                capture_errors.append(type(error).__name__)
            finally:
                done.set()
        reader = threading.Thread(target=capture, daemon=True)
        reader.start()
        exited_at = None
        while True:
            if time.monotonic() - started >= record['timeout']:
                reason = 'timeout'
                break
            if capture_errors:
                reason = 'capture_error'
                break
            if proc.poll() is not None:
                if done.is_set() and chunks.empty():
                    reason = 'exited'
                    break
                exited_at = exited_at or time.monotonic()
                if time.monotonic() - exited_at > 2:
                    reason = 'capture_incomplete_possible_descendant_pipe'
                    break
            try:
                data = chunks.get(timeout=0.1)
            except queue.Empty:
                continue
            remaining = LIMIT - captured
            log.write(data[:remaining])
            log.flush()
            captured += min(len(data), remaining)
            if len(data) >= remaining:
                reason = 'stdout_limit'
                break
    except BaseException as error:
        record['error'] = type(error).__name__
    finally:
        stop.set()
        if proc is not None:
            attempt('kill', lambda: proc.kill() if proc.poll() is None else None)
            attempt('wait', lambda: proc.wait(timeout=5))
            record['returncode'] = attempt('exit_snapshot', lambda: proc.returncode)
        if reader is not None:
            attempt('join', lambda: reader.join(timeout=0.5))
        pending = reader is not None and attempt('reader_snapshot', reader.is_alive) is not False
        if proc is not None and not pending:
            attempt('pipe_close', lambda: proc.stdout.close())
        if log is not None:
            attempt('flush', log.flush)
            attempt('log_close', log.close)
        record.update(reason=reason, elapsed=time.monotonic() - started, captured_bytes=captured,
                      reader_pending=pending, capture_errors=capture_errors,
                      child_unreaped=proc is not None and record['returncode'] is None)
        for name in ('stdout.log', 'results.jsonl'):
            def hash_evidence(name=name):
                if (run / name).is_file():
                    record['hashes'][name] = digest(run / name)
            attempt('hash_' + name, hash_evidence)
        def snapshot():
            path = run / 'results.jsonl'
            if path.is_file() and checked_path(path).stat().st_size <= LIMIT:
                last = json.loads(path.read_text(encoding='utf-8').splitlines()[-1])
                record['completed_successfully'] = (last.get('event') == 'finished' and
                    last.get('successful') is True and last.get('completed', 0) > 0 and
                    last.get('completed') == last.get('total'))
        attempt('snapshot', snapshot)
        def verify_inputs():
            root = checked_path(Path(record['repository']), directory=True)
            unchanged = True
            for relative, expected in [*record['sources'].items(),
                                       ('tests/test-safety-manifest.json', record['manifest_hash'])]:
                path = checked_path(root / relative)
                if not path.is_relative_to(root):
                    raise ValueError('source outside repository')
                if digest(path) != expected:
                    unchanged = False
            if not unchanged or proc is None or record['child_unreaped']:
                raise ValueError('source identity not confirmed after child exit')
            record['sources_unchanged'] = True
        attempt('source_revalidation', verify_inputs)
        record['completed_successfully'] = record['completed_successfully'] and record['sources_unchanged']
        attempt('result_write', lambda: write_record(run / 'result.json', record))
    print(json.dumps(dict(reason=reason, returncode=record['returncode'], evidence=str(run),
                          sources_unchanged=record['sources_unchanged'], cleanupErrors=errors)), flush=True)
    return 0 if (reason == 'exited' and record['returncode'] == 0 and not errors and
                  not pending and not capture_errors and record['sources_unchanged'] and
                  not record['child_unreaped'] and record['completed_successfully']) else 1
def main():
    executable = startup()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', required=True)
    parser.add_argument('--allow-process-tests', action='store_true')
    parser.add_argument('--temp-base', type=Path)
    parser.add_argument('--timeout', type=int, default=600)
    parser.add_argument('--worker', type=Path, help=argparse.SUPPRESS)
    for flag in ('--manifest-hash', '--selection-hash'):
        parser.add_argument(flag, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if os.name != 'nt' or not 1 <= args.timeout <= 3600:
        raise ValueError('Windows required; timeout must be 1..3600 seconds')
    if args.worker:
        run = checked_path(args.worker, directory=True)
        env = environment(run)
        if any(os.environ.get(key) != env[key] for key in ISOLATED):
            raise ValueError('worker isolation mismatch')
        os.environ.clear()
        os.environ.update(env)
        if args.allow_process_tests:
            os.environ['DH_TEST_ALLOW_POWERSHELL_HARNESS'] = '1'
        tempfile.tempdir = env['TEMP']
        os.chdir(run)
    script = checked_path(Path(__file__).absolute())
    root = script.parents[1]
    sys.path.insert(0, str(script.parent))
    manifest_hash, selection_hash, selection = gate(root, args.profile, args.allow_process_tests)
    if args.worker:
        if (args.manifest_hash, args.selection_hash) != (manifest_hash, selection_hash):
            raise ValueError('worker manifest/source selection changed')
        return worker(root, run, selection)
    if args.temp_base is None or args.manifest_hash or args.selection_hash:
        raise ValueError('parent requires --temp-base, not worker hashes')
    run = Path(tempfile.mkdtemp(prefix='dh-safe-tests-', dir=checked_path(args.temp_base, directory=True)))
    print('Evidence retained: ' + str(run), flush=True)
    argv = [str(executable), '-I', '-B', '-S', str(script), '--worker', str(run), '--profile', args.profile,
            '--manifest-hash', manifest_hash, '--selection-hash', selection_hash]
    if args.allow_process_tests:
        argv.append('--allow-process-tests')
    record = dict(start_time=time.time(), argv=argv, timeout=args.timeout, profile=args.profile, repository=str(root),
                  manifest_hash=manifest_hash, selection_hash=selection_hash, selected=selection['selected'],
                  test_ids=selection['test_ids'], sources=selection['sources'], log_limit_bytes=LIMIT,
                  stdout=str(run / 'stdout.log'), results=str(run / 'results.jsonl'),
                  allow_process_tests=args.allow_process_tests,
                  cancellation='owned Popen handle only; descendants may survive; evidence retained')
    return supervise(run, argv, record)
if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (Exception, KeyboardInterrupt) as error:
        print('runner rejected: ' + type(error).__name__, file=sys.stderr)
        raise SystemExit(2)
