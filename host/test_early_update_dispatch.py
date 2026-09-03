import ast
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from update_entrypoint import (
    EXIT_INVALID_ARGUMENTS,
    INVALID_EARLY_INVOCATION,
    MANUAL_RECOVERY_REQUIRED,
)


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

    def test_frozen_manual_recovery_uses_fixed_stderr_before_startup(self):
        shadow = self.root / "shadow"
        shadow.mkdir()
        (shadow / "dh_native_host.py").write_bytes(
            Path("host/dh_native_host.py").read_bytes()
        )
        (shadow / "update_entrypoint.py").write_text(
            "MANUAL_RECOVERY_REQUIRED = b'manual_recovery_required\\n'\n"
            "def dispatch_early_mode(*args, **kwargs):\n"
            "    return None\n",
            encoding="utf-8",
        )
        (shadow / "update_service.py").write_text(
            "def launch_startup_recovery_if_needed(*args, **kwargs):\n"
            "    return 'manual-recovery'\n",
            encoding="utf-8",
        )
        env = os.environ.copy()
        env.update(
            {
                "LOCALAPPDATA": str(self.local),
                "APPDATA": str(self.roaming),
                "USERPROFILE": str(self.profile),
                "HOME": str(self.home),
                "TEMP": str(self.process_temp),
                "TMP": str(self.tmp),
                "PYTHONPATH": str(shadow),
            }
        )
        completed = subprocess.run(
            [
                sys.executable,
                "-c",
                (
                    "import runpy, sys; "
                    "sys.frozen = True; "
                    "runpy.run_path(sys.argv[1], run_name='__main__')"
                ),
                str(shadow / "dh_native_host.py"),
            ],
            cwd=Path.cwd(),
            env=env,
            capture_output=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 30)
        self.assertEqual(completed.stdout, b"")
        self.assertEqual(completed.stderr, MANUAL_RECOVERY_REQUIRED)
        self.assert_no_host_side_effects()

    def test_host_bootstrap_order_and_entrypoint_source_are_exact(self):
        source_text = Path("host/dh_native_host.py").read_text(encoding="utf-8")
        tree = ast.parse(source_text)
        first = tree.body[:12]
        self.assertIsInstance(first[0], ast.Import)
        self.assertIsInstance(first[1], ast.ImportFrom)
        self.assertEqual(first[1].module, "pathlib")
        self.assertIsInstance(first[2], ast.ImportFrom)
        self.assertEqual(first[2].module, "update_entrypoint")
        assigns = [node for node in first if isinstance(node, ast.Assign)]
        names = {
            target.id: node
            for node in assigns
            for target in node.targets
            if isinstance(target, ast.Name)
        }
        self.assertEqual(
            set(names),
            {"_source_runtime", "_early_entrypoint", "_early_exit", "_startup_recovery"},
        )
        source = ast.get_source_segment(
            Path("host/dh_native_host.py").read_text(encoding="utf-8"),
            names["_early_entrypoint"],
        )
        self.assertIn("Path(__file__)", source)
        self.assertIn("Path(sys.executable)", source)
        early_exit_if = next(
            node
            for node in first
            if isinstance(node, ast.If)
            and "_early_exit is not None" in ast.get_source_segment(source_text, node.test)
        )
        recovery_import = next(
            node
            for node in first
            if isinstance(node, ast.ImportFrom)
            and node.module == "update_service"
        )
        recovery_assignment = next(
            node
            for node in first
            if isinstance(node, ast.Assign)
            and any(
                isinstance(target, ast.Name)
                and target.id == "_startup_recovery"
                for target in node.targets
            )
        )
        recovery_exit_if = next(
            node
            for node in first
            if isinstance(node, ast.If)
            and "_startup_recovery" in ast.get_source_segment(source_text, node.test)
        )
        self.assertLess(tree.body.index(early_exit_if), tree.body.index(recovery_import))
        self.assertLess(tree.body.index(recovery_import), tree.body.index(recovery_assignment))
        self.assertLess(tree.body.index(recovery_assignment), tree.body.index(recovery_exit_if))
        stdout_index = next(
            index
            for index, node in enumerate(tree.body)
            if isinstance(node, ast.Import)
            and any(alias.name == "datetime" for alias in node.names)
        )
        self.assertLess(tree.body.index(recovery_exit_if), stdout_index)


if __name__ == "__main__":
    unittest.main()
