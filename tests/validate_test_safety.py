"""Bounded checker/profile/runner mocks. Never launch the installer or runner.

Run as an explicit file with Python -I -B -S after approval. Fixture strings are
parsed only, never executed. This bootstrap is separately reviewed, not an
exception that approves the incomplete repository test inventory.
"""
import ast
import importlib
import json
import os
from pathlib import Path
import sys
import unittest


def main():
    if sys.flags.optimize or not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode):
        raise RuntimeError('Use isolated, no-site, no-bytecode startup')
    base = getattr(sys, '_base_executable', None)
    if (not isinstance(base, str) or not base or sys.prefix != sys.base_prefix
            or Path(sys.executable).resolve(strict=True) != Path(base).resolve(strict=True)):
        raise RuntimeError('Use the base Python executable directly')
    root = Path(__file__).resolve().parents[1]
    files = (
        'scripts/check_test_safety.py',
        'scripts/test_profile_state.py',
        'scripts/run_safe_tests.py',
        'tests/test_test_safety.py',
        'tests/test_profile_state.py',
        'tests/test_safe_runner.py',
        'tests/validate_test_safety.py',
        'tests/validate_safe_runner.py',
        'tests/fixtures/test_safety_runner/passing_case.py',
        'tests/fixtures/test_safety_runner/failing_case.py',
        'tests/fixtures/test_safety_runner/waiting_case.py',
        'tests/fixtures/test_safety_runner/noisy_case.py',
        'tests/fixtures/test_safety_runner/scope_one_case.py',
        'tests/fixtures/test_safety_runner/scope_two_case.py',
        'tests/validate_installer_harness.py',
        'host/test_install_integrity.py',
        'host/test_release_helper.py',
    )

    def guard(event, args):
        if event.startswith(('subprocess.', 'socket.', 'winreg.')) or event in {
            'os.system', 'os.startfile', 'os.startfile/2', 'os.posix_spawn',
            'os.exec', 'os.mkdir', 'os.remove', 'os.rmdir', 'os.rename',
            'os.chmod', 'os.utime', 'ctypes.dlopen',
        }:
            raise RuntimeError('Validation operation outside approved scope')
        if event == 'open':
            mode, flags = args[1], args[2]
            if (mode and any(char in mode for char in 'wax+')) or flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND):
                raise RuntimeError('Validation file writes are not permitted')

    # Accident prevention only, not an OS sandbox. No product modules are imported.
    sys.addaudithook(guard)
    for relative in files:
        ast.parse((root / relative).read_text(encoding='utf-8-sig'), filename=relative)
    json.loads((root / 'tests/test-safety-manifest.json').read_text(encoding='utf-8'))
    print(f'Python syntax: {len(files)}/{len(files)}; manifest JSON parsed', flush=True)
    sys.path[:0] = [str(root), str(root / 'tests')]
    suite = unittest.TestSuite()
    for name in ('test_test_safety', 'test_profile_state', 'test_safe_runner'):
        module = importlib.import_module(name)
        if Path(module.__file__).resolve() != root / 'tests' / (name + '.py'):
            raise RuntimeError('Unexpected validation module')
        suite.addTests(unittest.defaultTestLoader.loadTestsFromModule(module))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    print(f'Checker/profile/runner cases: {result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped)}/{result.testsRun}; '
          f'failures={len(result.failures)} errors={len(result.errors)} skipped={len(result.skipped)}')
    return 0 if result.wasSuccessful() and not result.skipped else 1


if __name__ == '__main__':
    raise SystemExit(main())
