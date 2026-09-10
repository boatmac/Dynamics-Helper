"""Fixed offline SDK entry; separate review, NOT a Python scanner/profile pass.

Whole verified site-packages is a bounded trust grant, not per-source review or
an OS sandbox. Snapshot includes __pycache__; runtime ignores bytecode caches.
Stdlib Windows asyncio loops/self-pipes are preallocated before effect guards.
No dependency installation, .pth processing, CLI execution or live SDK probe.
"""
import argparse
import ast
import base64
import csv
import hashlib
import importlib.machinery
import importlib.metadata
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time

REVIEW = 'tests/sdk-test-review.json'
SOURCES = ('scripts/run_sdk_tests.py', 'scripts/run_safe_tests.py',
           'host/test_sdk_compat.py', 'host/sdk_client.py',
           'host/dh_native_host.py', 'host/requirements.txt')
TEST = 'host/test_sdk_compat.py'
EXECUTABLE = {'.py', '.pyw', '.pyd', '.dll', '.exe', '.so'}


def selection(safe, root, expected=None):
    review_hash = safe.digest(root / REVIEW)
    if expected is not None and expected != review_hash:
        raise ValueError('worker review identity mismatch')
    data = json.loads((root / REVIEW).read_bytes())
    if data['version'] != 1 or set(data['sources']) != set(SOURCES) or not isinstance(data.get('dependency_versions'), dict):
        raise ValueError('invalid fixed source review')
    for relative, value in data['sources'].items():
        if not isinstance(value, str) or not re.fullmatch('[0-9a-f]{64}', value):
            raise ValueError('source review pending')
        if safe.digest(root / relative) != value:
            raise ValueError('reviewed source changed')
    tree = ast.parse((root / TEST).read_bytes())
    ids = [f'host.test_sdk_compat.{cls.name}.{method.name}' for cls in tree.body
           if isinstance(cls, ast.ClassDef) for method in cls.body
           if isinstance(method, (ast.FunctionDef, ast.AsyncFunctionDef))
           and method.name.startswith('test_')]
    if (len(ids) != 25 or len(set(ids)) != 25 or sorted(ids) != sorted(data['test_ids'])
            or any(getattr(n, 'name', None) == 'load_tests' or
                   isinstance(n, ast.Name) and n.id == 'load_tests' for n in ast.walk(tree))):
        raise ValueError('fixed AST test selection changed')
    if safe.digest(root / REVIEW) != review_hash:
        raise ValueError('review changed while reading')
    return review_hash, dict(selected=[TEST], dependencies=list(SOURCES), test_ids=ids,
                             sources={**data['sources'], REVIEW: review_hash})


def dependencies(safe, root):
    site = safe.checked_path(root / 'host/venv/Lib/site-packages', directory=True)
    venv = site.parents[1]
    normalize = lambda name: re.sub('[-_.]+', '-', name).lower()
    pins = {}
    for line in (root / 'host/requirements.txt').read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        match = re.fullmatch(r'([A-Za-z0-9_.-]+)==([A-Za-z0-9.!+_-]+)', line)
        if not match or normalize(match[1]) in pins:
            raise ValueError('requirements must be unique exact pins')
        pins[normalize(match[1])] = match[2]
    if len(pins) != 14:
        raise ValueError('exactly fourteen requirements required')
    files, owned, versions, records = {}, set(), {}, {}
    for directory, dirs, names in os.walk(site, followlinks=False):
        for name in dirs:
            safe.checked_path(Path(directory) / name, directory=True)
        for name in names:
            path = safe.checked_path(Path(directory) / name)
            files[path.relative_to(site).as_posix()] = safe.digest(path)
    for dist in importlib.metadata.distributions(path=[str(site)]):
        name = normalize(dist.metadata['Name'])
        if name in versions:
            raise ValueError('duplicate distribution')
        versions[name] = dist.version
        entries = dist.files
        if not entries:
            raise ValueError('distribution RECORD required')
        record_paths = [p for p in entries if len(p.parts) == 2 and p.name == 'RECORD' and p.parent.suffix == '.dist-info']
        if len(record_paths) != 1:
            raise ValueError('unique RECORD required')
        record_path = safe.checked_path(Path(os.path.abspath(dist.locate_file(record_paths[0]))))
        if not record_path.is_relative_to(site):
            raise ValueError('RECORD outside site')
        for row in csv.reader(io.StringIO(record_path.read_text(encoding='utf-8'))):
            if len(row) != 3 or not row[0] or '\\' in row[0] or ':' in row[0]:
                raise ValueError('invalid RECORD row')
            candidate = Path(os.path.abspath(dist.locate_file(row[0])))
            if not candidate.is_relative_to(venv):
                raise ValueError('RECORD outside environment')
            if candidate.suffix.lower() == '.pyc' and not row[1] and not row[2] and not os.path.lexists(candidate):
                safe.checked_path(candidate.parent, directory=True) if candidate.parent.exists() else None
                continue
            path = safe.checked_path(candidate)
            if not path.is_relative_to(venv) or path in owned:
                raise ValueError('invalid or overlapping RECORD ownership')
            owned.add(path)
            actual = safe.digest(path)
            records[path.relative_to(venv).as_posix()] = actual
            if row[1]:
                algorithm, encoded = row[1].split('=', 1)
                if algorithm != 'sha256' or encoded != base64.urlsafe_b64encode(bytes.fromhex(actual)).decode().rstrip('='):
                    raise ValueError('RECORD hash mismatch or unsupported algorithm')
            elif path != record_path and path.suffix.lower() != '.pyc':
                raise ValueError('unhashed RECORD payload')
            if row[2] and (not row[2].isdigit() or int(row[2]) != path.stat().st_size):
                raise ValueError('RECORD size mismatch')
    if any(versions.get(name) != version for name, version in pins.items()):
        raise ValueError('installed requirements version mismatch')
    if versions != json.loads((root / REVIEW).read_bytes())['dependency_versions']:
        raise ValueError('installed distribution set differs from review')
    for relative, value in files.items():
        path = site / relative
        if path.suffix.lower() in EXECUTABLE and path not in owned:
            raise ValueError('unowned executable site file')
        if safe.digest(path) != value:
            raise ValueError('site changed during verification')
    return site, dict(versions=versions, files=files, record_files=records, includes_pycache=True)


def guards(safe, run):
    import ctypes
    import socket
    import subprocess
    import winreg

    def deny(*args, **kwargs):
        raise PermissionError('offline SDK effect denied')

    class Handle:
        def Close(self):
            pass
    registry, timezone = Handle(), Handle()

    def connect(computer, key):
        if computer is None and key == winreg.HKEY_LOCAL_MACHINE:
            return registry
        return deny()

    def open_key(key, subkey, reserved=0, access=winreg.KEY_READ):
        if (key is registry and subkey == r'SOFTWARE\Microsoft\Windows NT\CurrentVersion\Time Zones'
                and reserved == 0 and access == winreg.KEY_READ):
            return timezone
        return deny()

    def writable(value):
        if isinstance(value, int):
            return deny()
        path = Path(os.path.abspath(value))
        if not path.is_relative_to(run):
            return deny()
        for part in (*reversed(path.parents), path):
            if os.path.lexists(part):
                safe.checked_path(part, directory=part.is_dir())

    def audit(event, args):
        if (event.startswith(('subprocess.', 'winreg.', 'os.spawn', 'os.exec', 'os.startfile'))
                or event in {'os.system', 'os.fork', 'os.forkpty', 'ctypes.dlopen',
                             'os.link', 'os.symlink', 'os.add_dll_directory'}
                or event.startswith('socket.') and event not in {'socket.__new__'}):
            deny()
        if event == 'open' and (any(c in (args[1] or '') for c in 'wax+') or
                               args[2] & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND)):
            writable(args[0])
        operations = {'os.remove': (0,), 'os.rmdir': (0,), 'os.mkdir': (0,),
                      'os.rename': (0, 1), 'os.chmod': (0,), 'os.utime': (0,),
                      'os.truncate': (0,), 'os.chdir': (0,)}
        if event in operations:
            for index in operations[event]:
                writable(args[index])
            if event in {'os.remove', 'os.rmdir', 'os.mkdir', 'os.rename', 'os.chmod', 'os.utime'}:
                if args[-1] not in (None, -1):
                    deny()
            if event == 'os.rename' and args[-2] not in (None, -1):
                deny()

    winreg.ConnectRegistry, winreg.OpenKey = connect, open_key
    ctypes.CDLL.__init__ = deny  # Retain FFI declaration classes, deny runtime loading.
    socket.create_connection = socket.getaddrinfo = deny
    subprocess.Popen = subprocess.run = os.system = os.startfile = deny
    sys.addaudithook(audit)


def main():
    script = Path(__file__).absolute()
    spec = importlib.util.spec_from_file_location('sdk_safe_helper', script.with_name('run_safe_tests.py'))
    safe = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = safe
    spec.loader.get_code = lambda name: spec.loader.source_to_code(
        spec.loader.get_data(str(script.with_name('run_safe_tests.py'))), spec.origin)
    spec.loader.exec_module(safe)  # Reviewed stdlib-only helper, never gate().
    executable = safe.startup()
    script = safe.checked_path(script)
    root = script.parents[1]
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--temp-base', type=Path)
    parser.add_argument('--timeout', type=int, default=120)
    parser.add_argument('--check-dependencies', action='store_true')
    parser.add_argument('--worker', type=Path, help=argparse.SUPPRESS)
    parser.add_argument('--review-hash', help=argparse.SUPPRESS)
    parser.add_argument('--snapshot-hash', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if os.name != 'nt' or not 1 <= args.timeout <= 3600:
        raise ValueError('Windows required; timeout must be 1..3600')
    if args.check_dependencies:
        if args.worker or args.temp_base or args.review_hash or args.snapshot_hash:
            raise ValueError('dependency check takes no worker/parent arguments')
        _, baseline = dependencies(safe, root)
        print(json.dumps(dict(dependencies_verified=True, versions=baseline['versions'],
                              files=len(baseline['files']), sdk_executed=False)))
        return 0
    if args.worker:
        if args.temp_base or not args.review_hash or not args.snapshot_hash:
            raise ValueError('invalid worker arguments')
        run = safe.checked_path(args.worker, directory=True)
        env = safe.environment(run)
        if Path.cwd() != run or any(os.environ.get(key) != env[key] for key in safe.ISOLATED):
            raise ValueError('worker isolation mismatch')
        if any(any((run / key).iterdir()) for key in safe.ISOLATED):
            raise ValueError('worker profiles must start empty')
        os.environ.clear()
        os.environ.update(env)
        tempfile.tempdir = env['TEMP']
    review_hash, selected = selection(safe, root, args.review_hash)
    site, baseline = dependencies(safe, root)
    if args.worker:
        snapshot = run / 'dependency-snapshot.json'
        if safe.digest(snapshot) != args.snapshot_hash or json.loads(snapshot.read_bytes()) != baseline:
            raise ValueError('worker dependency baseline mismatch')
        import asyncio
        policy = asyncio.get_event_loop_policy()
        loops = [policy.new_event_loop() for _ in range(25)]
        policy.new_event_loop = lambda: loops.pop()
        # Also covers safe.worker's explicit spec loader, not just path imports.
        def source_code(loader, fullname):
            path = safe.checked_path(Path(loader.path))
            if path.is_relative_to(root) and not path.is_relative_to(site) and path.relative_to(root).as_posix() not in SOURCES:
                raise ImportError('unreviewed repository source')
            return loader.source_to_code(loader.get_data(str(path)), str(path))
        importlib.machinery.SourceFileLoader.get_code = source_code
        original_native_create = importlib.machinery.ExtensionFileLoader.create_module
        def native_create(loader, module_spec):
            path = safe.checked_path(Path(module_spec.origin))
            if path.is_relative_to(root) and not path.is_relative_to(site):
                raise ImportError('unreviewed repository native module')
            return original_native_create(loader, module_spec)
        importlib.machinery.ExtensionFileLoader.create_module = native_create
        sys.path_hooks.insert(0, importlib.machinery.FileFinder.path_hook(
            (importlib.machinery.SourceFileLoader, importlib.machinery.SOURCE_SUFFIXES),
            (importlib.machinery.ExtensionFileLoader, importlib.machinery.EXTENSION_SUFFIXES)))
        sys.path_importer_cache.clear()
        guards(safe, run)
        sys.path.append(str(site))
        try:
            return safe.worker(root, run, selected)
        finally:
            for loop in loops:
                loop.close()
    if args.temp_base is None or args.review_hash or args.snapshot_hash:
        raise ValueError('parent requires only --temp-base and optional --timeout')
    base = safe.checked_path(args.temp_base, directory=True)
    if base.is_relative_to(root):
        raise ValueError('evidence must be outside repository')
    run = Path(tempfile.mkdtemp(prefix='dh-sdk-tests-', dir=base))
    safe.write_record(run / 'dependency-snapshot.json', baseline)
    argv = [str(executable), '-I', '-B', '-S', str(script), '--worker', str(run),
            '--review-hash', review_hash, '--snapshot-hash', safe.digest(run / 'dependency-snapshot.json')]
    record = dict(repository=str(root), sources=selected['sources'], timeout=args.timeout,
                  manifest_hash=safe.digest(root / 'tests/test-safety-manifest.json'),
                  review_hash=review_hash, test_ids=selected['test_ids'], start_time=time.time(),
                  argv=argv, scanner_pass=False, preguard_asyncio_loops=25)
    print('Evidence retained: ' + str(run), flush=True)
    outcome = safe.supervise(run, argv, record)
    final = dict(overall_success=False, reason=record['reason'], dependencies_unchanged=False)
    try:
        _, after = dependencies(safe, root)
        if safe.digest(run / 'dependency-snapshot.json') != argv[-1]:
            raise ValueError('dependency evidence changed')
        final['dependencies_unchanged'] = after == baseline
        final['overall_success'] = outcome == 0 and after == baseline
    except (Exception, KeyboardInterrupt) as error:
        final['verification_error'] = type(error).__name__
        if isinstance(error, KeyboardInterrupt):
            final['reason'] = 'interrupted'
    safe.write_record(run / 'sdk-result.json', final)
    if record['reason'] == 'timeout':
        return 124
    if final['reason'] == 'interrupted':
        return 130
    return 0 if final['overall_success'] else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (Exception, KeyboardInterrupt) as error:
        print('SDK runner rejected: ' + type(error).__name__, file=sys.stderr)
        if isinstance(error, ValueError):
            print(str(error), file=sys.stderr)
        raise SystemExit(130 if isinstance(error, KeyboardInterrupt) else 2)
