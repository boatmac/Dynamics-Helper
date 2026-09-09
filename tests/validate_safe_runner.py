"""Windows-only synthetic runner validation; invoke base Python directly -I -B -S.

No application imports, generated code, shell, discovery, or process-tier opt-in.
Seven serial cases: seven direct Python children and four runner-owned workers.
All evidence is retained. Only direct Popen handles are killed/reaped here; an
unexpected supervisor abort may leave a finite fixture worker (sleep <=20s).
This is accident prevention, not an OS sandbox or a production review approval.
"""
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import threading
import time

BASE = Path(r'C:\Users\zhaobo\AppData\Local\Temp\opencode')
ISOLATED = ('LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP')
LIMIT = 8 * 1024 * 1024
FIXTURES = ('passing_case.py', 'failing_case.py', 'waiting_case.py', 'noisy_case.py',
            'scope_one_case.py', 'scope_two_case.py')


def checked(path):
    if not path.is_absolute() or '..' in path.parts:
        raise ValueError('absolute canonical path required')
    for part in (*reversed(path.parents), path):
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('symlink/reparse path refused')
    return path.resolve(strict=True)


def sha(path):
    return hashlib.sha256(checked(path).read_bytes()).hexdigest()


def launch(script, args, case):
    """30s direct-child deadline and hard 8 MiB retained output cap."""
    env = {key: os.environ[key] for key in ('SystemRoot',)}
    for key in ISOLATED:
        directory = case / key
        directory.mkdir()
        env[key] = str(checked(directory))
    argv = [str(checked(Path(sys.executable))), '-I', '-B', '-S', str(checked(script)), *args]
    record = dict(argv=argv, cwd=str(case), pid=None, returncode=None, start_time=time.time(),
                  timeout=30, stdout=str(case / 'supervisor.log'), log_limit_bytes=LIMIT,
                  cancellation='direct owned Popen handle only; no descendant termination')
    overflow, done, stop = threading.Event(), threading.Event(), threading.Event()
    errors, cleanup_errors = [], []
    proc = reader = log = None
    pending, reason = False, 'startup_failure'
    started = time.monotonic()

    def attempt(step, action):
        try:
            return action()
        except BaseException as error:
            cleanup_errors.append({'step': step, 'error': type(error).__name__})

    try:
        (case / 'launch.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        log = (case / 'supervisor.log').open('xb')
        proc = subprocess.Popen(argv, cwd=case, env=env, stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                shell=False, close_fds=True, bufsize=0)
        reason = 'interrupted'
        record['pid'] = proc.pid
        (case / 'process.json').write_text(json.dumps(record, indent=2), encoding='utf-8')

        def capture():
            captured = 0
            try:
                while not stop.is_set():
                    data = proc.stdout.read(65536)
                    if not data:
                        break
                    remaining = LIMIT - captured
                    log.write(data[:remaining])
                    log.flush()
                    captured += min(remaining, len(data))
                    if len(data) > remaining:
                        overflow.set()
                        break
            except BaseException as error:
                errors.append(type(error).__name__)
            finally:
                done.set()

        reader = threading.Thread(target=capture, daemon=True)
        reader.start()
        while time.monotonic() - started < 30:
            if overflow.is_set() or errors:
                reason = 'capture_limit_or_error'
                break
            if proc.poll() is not None and done.is_set():
                reason = 'exited'
                break
            time.sleep(0.02)
        else:
            reason = 'supervisor_timeout'
    except BaseException as error:
        record['error'] = type(error).__name__
    finally:
        stop.set()
        if proc is not None:
            attempt('kill', lambda: proc.kill() if proc.poll() is None else None)
            attempt('wait', lambda: proc.wait(timeout=5))
            record['returncode'] = attempt('exit_snapshot', lambda: proc.returncode)
        if reader is not None:
            attempt('join', lambda: reader.join(timeout=1))
        pending = reader is not None and attempt('reader_snapshot', reader.is_alive) is not False
        if proc is not None and not pending:
            attempt('pipe_close', lambda: proc.stdout.close())
        if log is not None and not pending:
            attempt('log_close', log.close)
        record.update(reason=reason, elapsed=time.monotonic() - started, reader_pending=pending,
                      capture_errors=errors, cleanupErrors=cleanup_errors,
                      child_unreaped=proc is not None and record['returncode'] is None)
        attempt('result_write', lambda: (case / 'result.json').write_text(json.dumps(record, indent=2), encoding='utf-8'))
    assert reason == 'exited' and not pending and not errors and not cleanup_errors and not overflow.is_set(), record
    return record['returncode'], (case / 'supervisor.log').read_text(encoding='utf-8')


def main():
    if os.name != 'nt' or sys.flags.optimize or not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode):
        raise RuntimeError('Windows and Python -I -B -S required')
    base_executable = getattr(sys, '_base_executable', None)
    if not isinstance(base_executable, str) or not base_executable:
        raise RuntimeError('base interpreter identity unavailable')
    executable = checked(Path(sys.executable))
    if (not executable.is_file() or executable != checked(Path(base_executable))
            or sys.prefix != sys.base_prefix):
        raise RuntimeError('invoke the base Python executable directly, not a venv or launcher')
    root = checked(Path(__file__).absolute()).parents[1]
    sources = ('scripts/run_safe_tests.py', 'scripts/check_test_safety.py',
               'tests/validate_safe_runner.py', 'tests/test-safety-manifest.json',
               *(f'tests/fixtures/test_safety_runner/{name}' for name in FIXTURES))
    hashes = {name: sha(root / name) for name in sources}
    production = json.loads((root / 'tests/test-safety-manifest.json').read_text(encoding='utf-8'))
    assert production['version'] == 2 and 'safety-core' in production['profiles']
    assert all(entry['sha256'] is None for entry in production['inventory'])
    run = checked(Path(tempfile.mkdtemp(prefix='dh-runner-validation-', dir=checked(BASE))))
    print('Evidence retained: ' + str(run), flush=True)
    (run / 'sources.json').write_text(json.dumps(hashes, indent=2), encoding='utf-8')
    cases = ('repository_rejection', 'passing', 'failing', 'manifest_rejection',
             'selection_rejection', 'timeout', 'stdout_limit')
    completed = 0
    try:
        for label in cases:
            print(f'{completed}/7 active={label}', flush=True)
            case = run / label
            case.mkdir()
            temp = case / 'runs'
            temp.mkdir()
            profile_name = 'safety-core' if label == 'repository_rejection' else 'synthetic'
            args = ['--profile', profile_name, '--temp-base', str(temp), '--timeout', '3' if label == 'timeout' else '10']
            script = root / 'scripts/run_safe_tests.py'
            if label != 'repository_rejection':
                repo = case / 'repo'
                repo.mkdir()
                (repo / 'scripts').mkdir()
                (repo / 'tests').mkdir()
                fixture = {'failing': 'failing_case.py', 'timeout': 'waiting_case.py',
                           'stdout_limit': 'noisy_case.py'}.get(label, 'passing_case.py')
                relative = 'tests/test_' + fixture
                copies = {name: name for name in sources[:2]}
                copies['tests/fixtures/test_safety_runner/' + fixture] = relative
                selected, ids = [relative], None
                if label == 'passing':
                    selected = ['tests/test_scope_one_case.py', 'tests/test_scope_two_case.py']
                    ids = ['tests.test_scope_one_case.ScopeOne.test_selected', 'tests.test_scope_two_case.ScopeTwo.test_selected']
                    del copies['tests/fixtures/test_safety_runner/' + fixture]
                    for name in ('scope_one_case.py', 'scope_two_case.py'):
                        copies['tests/fixtures/test_safety_runner/' + name] = 'tests/test_' + name
                for source, destination in copies.items():
                    assert sha(root / source) == hashes[source], 'reviewed source changed'
                    target = repo / destination
                    with target.open('xb') as stream:
                        stream.write(checked(root / source).read_bytes())
                    assert sha(target) == hashes[source], 'copy identity mismatch'
                profile = {'tests': selected, 'dependencies': []}
                if ids is not None:
                    profile['test_ids'] = ids
                manifest = {'version': 2, 'exceptions': [], 'profiles': {'synthetic': profile}, 'inventory': [
                    {'path': path, 'class': 'pure_mock', 'role': 'test', 'source_kind': 'python',
                     'purpose': 'stdlib-only synthetic runner validation',
                     'sha256': sha(repo / path)} for path in selected]}
                manifest_path = repo / 'tests/test-safety-manifest.json'
                manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
                script = repo / 'scripts/run_safe_tests.py'
                if label in {'manifest_rejection', 'selection_rejection'}:
                    selection = dict(profile='synthetic', selected=selected, dependencies=[], test_ids=ids,
                                     sources={name: sha(repo / name) for name in (*sources[:2], *selected)},
                                     allow_process_tests=False)
                    selection_hash = hashlib.sha256(json.dumps(selection, sort_keys=True).encode()).hexdigest()
                    args = ['--profile', 'synthetic', '--worker', str(case), '--manifest-hash',
                            '0' * 64 if label == 'manifest_rejection' else sha(manifest_path),
                            '--selection-hash', '0' * 64 if label == 'selection_rejection' else selection_hash]
            assert all(sha(root / name) == digest for name, digest in hashes.items())
            code, output = launch(script, args, case)
            evidence = list(temp.iterdir())
            if label.endswith('rejection'):
                assert code == 2 and not evidence and 'Evidence retained:' not in output
                assert 'runner rejected: ValueError' in output
            else:
                assert len(evidence) == 1
                worker_run = checked(evidence[0])
                result = json.loads((worker_run / 'result.json').read_text(encoding='utf-8'))
                events = [json.loads(line) for line in (worker_run / 'results.jsonl').read_text(encoding='utf-8').splitlines()]
                assert result['selected'] == selected and result['allow_process_tests'] is False
                assert result['test_ids'] == ids and result['profile'] == 'synthetic'
                assert not result['cleanupErrors'] and not result['child_unreaped']
                assert result['sources_unchanged'] is True
                assert checked(Path(result['repository'])) == checked(repo)
                assert result['manifest_hash'] == sha(repo / 'tests/test-safety-manifest.json')
                assert all(sha(repo / name) == digest for name, digest in result['sources'].items())
                assert result['argv'][1:4] == ['-I', '-B', '-S'] and result['pid'] > 0
                assert checked(Path(result['argv'][0])) == executable
                assert result['returncode'] is not None
                assert result['reason'] == {'timeout': 'timeout', 'stdout_limit': 'stdout_limit'}.get(label, 'exited')
                assert code == (0 if label == 'passing' else 1)
                if label != 'stdout_limit':
                    assert result['completed_successfully'] is (label == 'passing')
                assert result['captured_bytes'] == (worker_run / 'stdout.log').stat().st_size <= LIMIT
                for name, digest in result['hashes'].items():
                    assert sha(worker_run / name) == digest
                starts = [event for event in events if event['event'] == 'start']
                assert starts and starts[0]['completed'] == 0
                if label in {'passing', 'failing'}:
                    total = 2 if label == 'passing' else 1
                    assert result['returncode'] == code and not result['reader_pending']
                    assert events[-1]['event'] == 'finished'
                    assert events[-1]['completed'] == events[-1]['total'] == total
                    assert events[-1]['successful'] is (label == 'passing')
                    stops = [event for event in events if event['event'] == 'stop']
                    assert [event['completed'] for event in stops] == list(range(1, total + 1))
                    assert stops[-1]['failures'] == (1 if label == 'failing' else 0)
                    assert stops[-1]['errors'] == stops[-1]['skipped'] == 0
                else:
                    assert result['elapsed'] < 15
                    if label == 'timeout':
                        assert result['returncode'] != 0
                        assert not any(event['event'] == 'finished' for event in events)
                    else:
                        # The finite writer can finish before the parent notices the cap.
                        assert result['captured_bytes'] == LIMIT
            completed += 1
            print(f'{completed}/7 PASS {label}', flush=True)
    finally:
        unchanged = all(sha(root / name) == digest for name, digest in hashes.items())
        (run / 'summary.json').write_text(json.dumps(dict(completed=completed, total=7,
            source_unchanged=unchanged, evidence_retained=True), indent=2), encoding='utf-8')
        assert unchanged, 'source or production manifest changed during validation'
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (Exception, KeyboardInterrupt) as error:
        print('validation failed: ' + type(error).__name__, file=sys.stderr)
        raise SystemExit(1)
