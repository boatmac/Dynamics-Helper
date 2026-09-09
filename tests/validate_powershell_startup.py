"""One approved, plain -File PowerShell startup comparison, not an installer test.

Use base Python -I -B -S. One child, no retries, no evidence deletion. Only the
direct child handle is owned; this does not provide OS sandbox containment.
"""
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import time

BASE = Path(r'C:\Users\zhaobo\AppData\Local\Temp\opencode')
KEYS = ('LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP')
LIMIT = 1024 * 1024


def checked(path):
    if not path.is_absolute() or '..' in path.parts:
        raise ValueError('invalid absolute path')
    for part in (*reversed(path.parents), path):
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('reparse path refused')
    return path.resolve(strict=True)


def inventory(run):
    result = {}
    for key in KEYS:
        pending, entries = [checked(run / key)], []
        while pending:
            for path in pending.pop().iterdir():
                if len(entries) >= 100:
                    raise ValueError('profile inventory limit')
                info = path.lstat()
                if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                    raise ValueError('unexpected profile reparse entry')
                directory = stat.S_ISDIR(info.st_mode)
                entries.append({'path': path.relative_to(run / key).as_posix(),
                                'kind': 'directory' if directory else 'file'})
                if directory:
                    pending.append(path)
        result[key] = sorted(entries, key=lambda entry: entry['path'])
    return result


def main():
    if (os.name != 'nt' or len(sys.argv) != 1 or sys.flags.optimize
            or not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode)):
        raise ValueError('Windows base Python -I -B -S required')
    if (checked(Path(sys.executable)) != checked(Path(sys._base_executable))
            or sys.prefix != sys.base_prefix):
        raise ValueError('base interpreter required')
    source = checked(Path(__file__).absolute())
    root = source.parents[1]
    baseline = checked(root / 'tests/harnesses/powershell_startup_baseline.ps1')
    system = checked(Path(os.environ['SystemRoot']))
    executable = checked(system / 'System32/WindowsPowerShell/v1.0/powershell.exe')
    sources = (source, baseline)
    hashes = lambda: {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    before_hashes = hashes()
    run = checked(Path(tempfile.mkdtemp(prefix='dh-powershell-baseline-', dir=checked(BASE))))
    print('Evidence retained: ' + str(run), flush=True)
    env = {'SystemRoot': str(system)}
    for key in KEYS:
        (run / key).mkdir()
        env[key] = str(checked(run / key))
    argv = [str(executable), '-NoLogo', '-NoProfile', '-NonInteractive',
            '-File', str(baseline), '-Scenario', 'success']
    record = dict(argv=argv, env=env, cwd=str(run), pid=None, returncode=None,
                  start_time=time.time(), timeout_seconds=20, limit_per_stream=LIMIT,
                  hashes_before=before_hashes, profiles_before=inventory(run),
                  reason='not_started', passed=False, descendants='not enumerated')
    (run / 'launch.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    proc, logs, pipes = None, {}, {}
    counts = {'stdout': 0, 'stderr': 0}
    started = time.monotonic()
    try:
        logs = {name: (run / (name + '.log')).open('xb') for name in counts}
        proc = subprocess.Popen(argv, cwd=run, env=env, stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                shell=False, close_fds=True, bufsize=0)
        record['pid'] = proc.pid
        (run / 'process.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
        pipes = {'stdout': proc.stdout, 'stderr': proc.stderr}
        for pipe in pipes.values():
            os.set_blocking(pipe.fileno(), False)
        eof = set()
        while len(eof) != 2 or proc.poll() is None:
            if time.monotonic() - started >= 20:
                raise TimeoutError('startup comparison deadline')
            for name, pipe in pipes.items():
                if name in eof:
                    continue
                try:
                    data = os.read(pipe.fileno(), min(65536, LIMIT - counts[name]))
                except BlockingIOError:
                    continue
                if not data:
                    eof.add(name)
                    continue
                logs[name].write(data)
                logs[name].flush()
                counts[name] += len(data)
                if counts[name] >= LIMIT:
                    raise ValueError('output limit')
            time.sleep(0.01)
        assert proc.returncode == 0
        assert (run / 'stdout.log').read_bytes().strip() == b'POWERSHELL_STARTUP_BASELINE'
        assert not (run / 'stderr.log').read_bytes()
        record.update(reason='baseline_completed', passed=True)
    except BaseException as error:
        record.update(reason=type(error).__name__, passed=False)
    finally:
        if proc is not None:
            if proc.poll() is None:
                proc.kill()
            proc.wait(timeout=5)
            record['returncode'] = proc.returncode
        for pipe in pipes.values():
            pipe.close()
        for log in logs.values():
            log.close()
        record.update(elapsed=time.monotonic() - started, end_time=time.time(), captured_bytes=counts)
        try:
            record['profiles_after'] = inventory(run)
            record['hashes_after'] = hashes()
            record['source_unchanged'] = before_hashes == record['hashes_after']
            assert record['source_unchanged']
        except BaseException as error:
            record.update(finalization_error=type(error).__name__, passed=False)
        (run / 'result.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    print(json.dumps({'passed': record['passed'], 'pid': record['pid'],
                      'reason': record['reason'], 'returncode': record['returncode']}), flush=True)
    return 0 if record['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
