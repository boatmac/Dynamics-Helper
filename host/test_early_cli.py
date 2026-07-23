import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from package_manifest import generate_release_documents, write_release_documents
from product_info import VERSION


class EarlyCliDispatchTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.root = Path(self.tempdir.name)
        self.live = self.root / "live"
        stage = self.root / "stage"
        files = {
            "host/dh_native_host.exe": b"host-exe",
            "host/_internal/python313.dll": b"runtime",
            "host/system_prompt.md": b"core",
            "host/register.py": b"register",
            "host/config.json": b"{}\n",
            "extension/manifest.json": b'{"version":"2.0.74","version_name":"2.0.74-beta.4"}\n',
            "extension/assets/app.js": b"app",
            "installer_core.ps1": b"installer",
            "install.bat": b"wrapper",
        }
        for relative, payload in files.items():
            path = stage.joinpath(*relative.split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        documents = generate_release_documents(stage, VERSION)
        write_release_documents(stage, documents)
        shutil.copytree(stage / "host", self.live)
        shutil.copytree(stage / "extension", self.live / "extension")
        self.manifest = self.root / "external" / "update-manifest.json"
        self.manifest.parent.mkdir()
        shutil.copy2(stage / "update-manifest.json", self.manifest)
        for name in (
            "dh_native_host.py",
            "early_cli.py",
            "install_integrity.py",
            "package_manifest.py",
            "product_info.py",
        ):
            source = Path("host") / name
            if source.exists():
                shutil.copy2(source, self.live / name)
        self.localappdata = self.root / "local"
        self.appdata = self.root / "roaming"
        self.userprofile = self.root / "profile"
        self.home = self.userprofile
        self.temp = self.root / "temp"
        self.tmp = self.root / "tmp"
        for path in (
            self.localappdata,
            self.appdata,
            self.userprofile,
            self.temp,
            self.tmp,
        ):
            path.mkdir(parents=True)

    def _run_probe(self, manifest: Path, *extra: str) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env.update(
            {
                "LOCALAPPDATA": str(self.localappdata),
                "APPDATA": str(self.appdata),
                "USERPROFILE": str(self.userprofile),
                "HOME": str(self.home),
                "TEMP": str(self.temp),
                "TMP": str(self.tmp),
                "PYTHONPATH": str(self.live),
            }
        )
        return subprocess.run(
            [
                sys.executable,
                str(self.live / "dh_native_host.py"),
                "--update-probe",
                str(manifest),
                *extra,
            ],
            cwd=self.live,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_valid_probe_exits_before_sdk_logging_config_and_updater_imports(self):
        completed = self._run_probe(self.manifest)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(
            json.loads(completed.stdout),
            {
                "status": "success",
                "host_version": VERSION,
                "extension_version": VERSION,
                "capabilities": ["prompt-scope-v1"],
            },
        )
        self.assertEqual(completed.stdout.count("\n"), 1)
        self.assertFalse((self.localappdata / "DynamicsHelper").exists())
        self.assertFalse((self.temp / "dh_startup.log").exists())

    def test_invalid_invocations_emit_only_fixed_failure(self):
        for manifest, extra, expected_exit in (
            (Path("relative.json"), (), 2),
            (self.manifest, ("extra",), 2),
            (self.root / "missing.json", (), 1),
        ):
            completed = self._run_probe(manifest, *extra)
            with self.subTest(manifest=manifest, extra=extra):
                self.assertEqual(completed.returncode, expected_exit)
                self.assertEqual(
                    completed.stdout,
                    '{"error_code":"package_probe_failed","status":"error"}\n',
                )
                self.assertEqual(completed.stderr, "")


if __name__ == "__main__":
    unittest.main()
