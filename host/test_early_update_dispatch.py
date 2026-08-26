import ast
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from update_entrypoint import EXIT_INVALID_ARGUMENTS, INVALID_EARLY_INVOCATION


PROBE_FAILURE_JSON = b'{"error_code":"package_probe_failed","status":"error"}\n'


class EarlyDispatchIsolationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.local = self.root / "local"
        self.roaming = self.root / "roaming"
        self.profile = self.root / "profile"
        self.home = self.root / "home"
        self.process_temp = self.root / "temp"
        self.tmp = self.root / "tmp"
        for path in (
            self.local,
            self.roaming,
            self.profile,
            self.home,
            self.process_temp,
            self.tmp,
        ):
            path.mkdir()

    def run_source_host(self, argv):
        env = os.environ.copy()
        env.update(
            {
                "LOCALAPPDATA": str(self.local),
                "APPDATA": str(self.roaming),
                "USERPROFILE": str(self.profile),
                "HOME": str(self.home),
                "TEMP": str(self.process_temp),
                "TMP": str(self.tmp),
                "PYTHONPATH": "host",
            }
        )
        return subprocess.run(
            [sys.executable, "host/dh_native_host.py", *argv],
            cwd=Path.cwd(),
            env=env,
            capture_output=True,
            check=False,
        )

    def assert_no_host_side_effects(self):
        self.assertFalse((self.local / "DynamicsHelper").exists())
        self.assertFalse((self.process_temp / "dh_startup.log").exists())
        self.assertFalse((self.profile / "dhnativehost_error.log").exists())

    def test_integrated_source_probe_is_rejected_canonically_before_startup(self):
        cases = (
            ["--update-probe"],
            ["--update-probe", "relative.json"],
            ["--update-probe", str(self.root / "x" / ".." / "m.json")],
            ["--update-probe", str(self.root / "missing.json"), "extra"],
        )
        for argv in cases:
            with self.subTest(argv=argv):
                completed = self.run_source_host(argv)
                self.assertEqual(completed.returncode, EXIT_INVALID_ARGUMENTS)
                self.assertEqual(completed.stdout, PROBE_FAILURE_JSON)
                self.assertEqual(completed.stderr, b"")
                self.assert_no_host_side_effects()

    def test_source_wrong_special_command_uses_fixed_stderr_before_startup(self):
        completed = self.run_source_host(["--recover-active"])
        self.assertEqual(completed.returncode, EXIT_INVALID_ARGUMENTS)
        self.assertEqual(completed.stdout, b"")
        self.assertEqual(completed.stderr, INVALID_EARLY_INVOCATION)
        self.assert_no_host_side_effects()

    def test_host_bootstrap_order_and_entrypoint_source_are_exact(self):
        tree = ast.parse(
            Path("host/dh_native_host.py").read_text(encoding="utf-8")
        )
        first = tree.body[:7]
        self.assertIsInstance(first[0], ast.Import)
        self.assertIsInstance(first[1], ast.ImportFrom)
        self.assertEqual(first[1].module, "pathlib")
        self.assertIsInstance(first[2], ast.ImportFrom)
        self.assertEqual(first[2].module, "update_entrypoint")
        assigns = [node for node in first if isinstance(node, ast.Assign)]
        self.assertEqual(len(assigns), 3)
        source = ast.get_source_segment(
            Path("host/dh_native_host.py").read_text(encoding="utf-8"),
            assigns[1],
        )
        self.assertIn("Path(__file__)", source)
        self.assertIn("Path(sys.executable)", source)
        self.assertIsInstance(first[6], ast.If)


if __name__ == "__main__":
    unittest.main()
