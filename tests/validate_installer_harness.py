"""Separately reviewed, one-scenario bootstrap; not a general runner or sandbox.

Invoke base Python directly with -I -B -S. Imports stdlib and the reviewed profile
helper only; product source is hashed as data, never imported. Harness uses FakeOps, not the
production factory. No synthetic live directories or production inventory edits.
Only the direct PowerShell handle is owned; descendants are not enumerated.
New records use schema 2: profiles hold relative path/kind entries instead of
immediate names. profiles_empty remains literal; profile_delta_allowed accepts
only the current-environment baseline. Historical records are not rewritten.
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

ROOT = Path(r'C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec')
BASE = Path(r'C:\Users\zhaobo\AppData\Local\Temp\opencode')
SOURCES = ('tests/harnesses/installer_safety.ps1', 'installer_core.ps1',
           'tests/validate_installer_harness.py', 'scripts/test_profile_state.py')
LIMIT = 1024 * 1024
SCENARIOS = ('running', 'roaming', 'preflight-throw', 'preflight-nonzero',
             'live-throw', 'live-nonzero', 'settle-throw', 'settle-nonzero',
             'register-throw', 'register-nonzero', 'register-generic-throw',
             'missing-exe', 'missing-package', 'copy-throw', 'success')


def checked(path):
    if not path.is_absolute() or '..' in path.parts:
        raise ValueError('absolute canonical path required')
    for part in (*reversed(path.parents), path):
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('reparse path refused')
    return path.resolve(strict=True)


def hashes():
    return {name: hashlib.sha256(checked(ROOT / name).read_bytes()).hexdigest() for name in SOURCES}


def validate(report, scenario='success'):
    assert scenario in SCENARIOS
    assert set(report) == {'exitCode', 'isUpdate', 'events'}
    assert type(report['exitCode']) is int and report['exitCode'] == (0 if scenario == 'success' else 1)
    assert type(report['isUpdate']) is bool
    assert report['isUpdate'] == (scenario in (
        'register-throw', 'register-nonzero', 'register-generic-throw', 'missing-exe', 'success'))
    events = report['events']
    assert isinstance(events, list) and events
    allowed = {'test-path', 'running-host', 'create-directory', 'copy', 'enumerate',
               'remove-tree', 'invoke-host', 'emit', 'prompt'}
    assert all(e['kind'] in allowed and isinstance(e['phase'], str) for e in events)
    assert events[-1] == {'kind': 'prompt', 'phase': 'finish', 'message': 'Press Enter to exit'}
    native = [e for e in events if e['kind'] == 'invoke-host']
    package, live = r'C:\synthetic\package', r'C:\synthetic\local\DynamicsHelper'
    if scenario != 'success':
        assert not any(e['phase'] == 'success' for e in events)
        assert not any(e.get('message') == '    - Registration successful.' for e in events)
        assert events[-2]['kind'] == 'emit'
        if scenario in ('running', 'roaming'):
            assert [e['kind'] for e in events] == (
                ['emit', 'running-host'] + (['test-path'] if scenario == 'roaming' else []) + ['emit', 'prompt'])
            assert events[-2]['phase'] == 'refusal'
            if scenario == 'running':
                assert 'dh_native_host is running' in events[-2]['message']
            else:
                assert 'Roaming' in events[-2]['message'] and 'preserved' in events[-2]['message']
            return
        assert events[-2]['phase'] == 'error'
        assert events[-2]['message'].startswith('Installation failed.')
        assert 'Keep security protections unchanged' in events[-2]['message']
        count = 0 if scenario in ('missing-package', 'copy-throw') else (
            1 if scenario.startswith('preflight-') else 2 if scenario.startswith('live-') else
            3 if scenario.startswith('settle-') or scenario == 'missing-exe' else 4)
        assert [e['phase'] for e in native] == ['preflight', 'live', 'settle', 'register'][:count]
        assert [e['arguments'] for e in native] == [
            ['--update-probe', package + '\\update-manifest.json', package],
            ['--update-probe', package + '\\update-manifest.json'],
            ['--settle-installer-repair'], ['--register']][:count]
        assert all(e['executable'] == live + '\\dh_native_host.exe' for e in native[1:])
        effects = [e for e in events if e['kind'] in {
            'create-directory', 'copy', 'remove-tree', 'invoke-host',
        }]
        if scenario == 'missing-package':
            assert effects == []
            assert events[-3] == dict(kind='test-path', phase='preflight',
                                     path=package + '\\host\\dh_native_host.exe', exists=False)
            return
        preflight = effects[0]['path']
        assert effects[0]['kind'] == 'create-directory' and effects[0]['phase'] == 'preflight'
        assert preflight.startswith('C:\\synthetic\\temp\\DynamicsHelper-preflight-')
        cleanup = dict(kind='remove-tree', phase='preflight-cleanup', path=preflight)
        assert [e for e in events if e['phase'] == 'preflight-cleanup'] == [
            dict(kind='test-path', phase='preflight-cleanup', path=preflight, exists=True), cleanup]
        if native:
            assert native[0]['executable'] == preflight + '\\dh_native_host.exe'
            assert events.index(native[0]) < events.index(cleanup)
        if scenario in ('preflight-throw', 'preflight-nonzero', 'copy-throw'):
            assert all(e['phase'] in {'preflight', 'preflight-cleanup'} for e in effects)
            assert [e for e in effects if e['kind'] == 'remove-tree'] == [cleanup]
            assert effects[-1] == cleanup
            failed = native[-1] if native else next(e for e in events if e['kind'] == 'copy')
            assert events[events.index(failed) + 1:] == [
                dict(kind='test-path', phase='preflight-cleanup', path=preflight, exists=True),
                cleanup, *events[-2:]]
        else:
            assert events.index(cleanup) < events.index(native[1])
            if scenario == 'missing-exe':
                failed = dict(kind='test-path', phase='register',
                              path=live + '\\dh_native_host.exe', exists=False)
                assert events.index(native[-1]) < events.index(failed)
            else:
                failed = native[-1]
            assert events[events.index(failed) + 1:] == events[-2:]
        return
    assert [e['phase'] for e in native] == ['preflight', 'live', 'settle', 'register']
    assert [e['arguments'] for e in native] == [
        ['--update-probe', package + '\\update-manifest.json', package],
        ['--update-probe', package + '\\update-manifest.json'], ['--settle-installer-repair'], ['--register']]
    assert all(e['executable'] == live + '\\dh_native_host.exe' for e in native[1:])
    assert any(e.get('message') == 'SUCCESS: Update Complete!' for e in events)
    removals = [e for e in events if e['kind'] == 'remove-tree']
    assert [e['phase'] for e in removals] == ['preflight-cleanup', 'host-copy', 'extension-copy']
    assert [e['path'] for e in removals[1:]] == [live + '\\_internal', live + '\\extension']
    preflight = next(e['path'] for e in events if e['kind'] == 'create-directory')
    assert preflight.startswith('C:\\synthetic\\temp\\DynamicsHelper-preflight-')
    assert removals[0]['path'] == preflight and native[0]['executable'] == preflight + '\\dh_native_host.exe'
    copies = [e for e in events if e['kind'] == 'copy' and e['phase'] == 'host-copy']
    names = ('dh_native_host.exe', '_internal\\runtime.dll', '_internal\\nested\\library.dll',
             'release-integrity.json', 'installed-product.json', 'system_prompt.md', 'system_prompt.md')
    assert [e['destination'] for e in copies] == [live + '\\' + name for name in names]
    assert [e['source'] for e in copies] == [package + '\\host\\' + name for name in names]
    assert all(e['recurse'] is False for e in copies)
    for name in ('config.json', 'copilot-instructions.md', 'user_prompt.md'):
        assert any(e['kind'] == 'test-path' and e.get('path') == live + '\\' + name and e['exists'] for e in events)
    for path in (live + '\\_internal', live + '\\_internal\\nested'):
        assert any(e['kind'] == 'create-directory' and e['path'] == path for e in events)
    extension = next(e for e in events if e['kind'] == 'copy' and e['phase'] == 'extension-copy')
    assert extension == dict(kind='copy', phase='extension-copy', source=package + '\\extension',
                             destination=live + '\\extension', recurse=True)
    ordered = [native[0], removals[0], removals[1], copies[0], removals[2], extension, *native[1:]]
    assert [events.index(e) for e in ordered] == sorted(events.index(e) for e in ordered)


def main():
    args = sys.argv[1:]
    if args and (len(args) != 2 or args[0] != '--scenario' or args[1] not in SCENARIOS):
        raise ValueError('expected no arguments or exactly --scenario <known scenario>')
    scenario = args[1] if args else 'success'
    expected_child_exit = 0 if scenario == 'success' else 1
    if (os.name != 'nt' or sys.flags.optimize
            or not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode)):
        raise ValueError('Windows base Python -I -B -S required')
    base = getattr(sys, '_base_executable', None)
    if (not isinstance(base, str) or not base or checked(Path(sys.executable)) != checked(Path(base))
            or sys.prefix != sys.base_prefix or not Path(sys.executable).is_file()):
        raise ValueError('direct base interpreter required')
    assert checked(Path(__file__).absolute()) == checked(ROOT / SOURCES[2])
    checked(ROOT / 'scripts/test_profile_state.py')
    sys.path.insert(0, str(checked(ROOT)))
    from scripts.test_profile_state import (
        PROFILE_KEYS as ISOLATED, capture_profile_state, validate_profile_state,
    )
    system_root = checked(Path(os.environ['SystemRoot']))
    executable = checked(system_root / 'System32/WindowsPowerShell/v1.0/powershell.exe')
    assert executable.is_file()
    run = checked(Path(tempfile.mkdtemp(prefix='dh-installer-validation-', dir=checked(BASE))))
    print('Evidence retained: ' + str(run), flush=True)
    record = dict(schema_version=2, scenario=scenario, expected_child_exit=expected_child_exit,
                  stage='prepare', passed=False, pid=None, returncode=None,
                  start_time=None, hashes_before=None, hashes_after=None, source_unchanged=None,
                  profiles_before=None, profiles_after=None, profiles_empty=None,
                  profile_delta_allowed=None, timeout_seconds=20,
                  capture_limit_bytes=LIMIT, capture_errors=[], readers_pending=False,
                  cancellation='owned direct PowerShell handle only', descendants='not enumerated',
                  invalid_dependencies=dict(expected_checks=27, inferred=False,
                      mechanism='nine Ops keys x three invalid variants; loop must finish before main report; not 27 separately reported tests'))
    proc, readers = None, []
    stop, overflow = threading.Event(), threading.Event()
    started = time.monotonic()
    try:
        env = {'SystemRoot': str(system_root)}
        for key in ISOLATED:
            (run / key).mkdir()
            env[key] = str(checked(run / key))
        record.update(env=env, cwd=str(run), supervisor_argv=list(sys.orig_argv),
                      argv=[str(executable), '-NoLogo', '-NoProfile', '-NonInteractive',
                            '-File', str(checked(ROOT / SOURCES[0])), '-Scenario', scenario])
        record['profiles_before'], record['hashes_before'] = capture_profile_state(run), hashes()
        assert all(not entries for entries in record['profiles_before'].values())
        for name in ('stdout', 'stderr'):
            record[name] = str(run / (name + '.log'))
            (run / (name + '.log')).touch(exist_ok=False)
        record.update(stage='launch', start_time=time.time())
        (run / 'launch.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        started = time.monotonic()
        proc = subprocess.Popen(record['argv'], cwd=run, env=env, stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False, close_fds=True, bufsize=0)
        record.update(pid=proc.pid, stage='capture')
        (run / 'process.json').write_text(json.dumps(record, indent=2), encoding='utf-8')

        def capture(pipe, name):
            # Nonblocking pipe reads allow shutdown even if an unexpected child retains a writer.
            try:
                with Path(record[name]).open('ab', buffering=0) as log:
                    total = 0
                    while not stop.is_set():
                        try:
                            data = os.read(pipe.fileno(), min(65536, LIMIT - total))
                        except BlockingIOError:
                            stop.wait(0.01)
                            continue
                        if not data:
                            break
                        log.write(data)
                        total += len(data)
                        if total >= LIMIT:
                            overflow.set()
                            break
            except Exception as error:
                record['capture_errors'].append(type(error).__name__)

        for name, pipe in (('stdout', proc.stdout), ('stderr', proc.stderr)):
            os.set_blocking(pipe.fileno(), False)
            reader = threading.Thread(target=capture, args=(pipe, name))
            reader.start()
            readers.append(reader)
        while True:
            if overflow.is_set() or record['capture_errors']:
                raise RuntimeError('capture failure')
            if time.monotonic() - started >= 20:
                raise TimeoutError('wall deadline')
            if proc.poll() is not None and not any(r.is_alive() for r in readers):
                break
            time.sleep(0.01)
        record['stage'] = 'assertions'
        assert proc.returncode == expected_child_exit
        out, err = Path(record['stdout']).read_bytes(), Path(record['stderr']).read_bytes()
        assert not err and b'SECRET' not in out and b'SECRET' not in err
        validate(json.loads(out), scenario)
        record['invalid_dependencies']['inferred'] = True
        record['passed'] = True
    except BaseException as error:
        record.update(error_type=type(error).__name__, passed=False)
    finally:
        try:
            if proc is not None:
                if proc.poll() is None:
                    proc.kill()
                proc.wait(timeout=5)
        except BaseException as error:
            record.update(cleanup_error_type=type(error).__name__, passed=False)
        finally:
            stop.set()
            for reader in readers:
                reader.join(timeout=1)
            record['readers_pending'] = any(r.is_alive() for r in readers)
            if proc is not None and not record['readers_pending']:
                proc.stdout.close()
                proc.stderr.close()
            record.update(returncode=proc.returncode if proc else None, elapsed=time.monotonic() - started,
                          end_time=time.time(), output_cap_reached=overflow.is_set())
        try:
            record['hashes_after'] = hashes()
            record['source_unchanged'] = record['hashes_before'] == record['hashes_after']
            record['profile_delta_allowed'] = False
            record['profiles_after'] = capture_profile_state(run)
            record['profiles_empty'] = all(not entries for entries in record['profiles_after'].values())
            record['profile_delta_allowed'] = validate_profile_state(record['profiles_after'])
            assert record['source_unchanged'] and record['profile_delta_allowed'] and not record['readers_pending']
            assert not record['capture_errors'] and not overflow.is_set()
            record['captured_bytes'] = {name: Path(record[name]).stat().st_size for name in ('stdout', 'stderr')}
        except BaseException as error:
            record.update(finalization_error_type=type(error).__name__, passed=False)
        (run / 'result.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    return 0 if record['passed'] else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception:
        print('Supervisor failed; retain any evidence directory reported above.', file=sys.stderr)
        raise SystemExit(1)
