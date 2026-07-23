import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import release_helper
from package_archive import write_deterministic_archive
from package_manifest import load_installed_product, sha256_file
from updater import Updater


class TestReleaseStaging(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.stage = self.root / "stage"
        files = {
            "extension/dist/manifest.json": b'{"version":"2.0.74","version_name":"2.0.74-beta.4"}\n',
            "extension/dist/assets/app.js": b"app",
            "dist/dh_native_host/dh_native_host.exe": b"host-exe",
            "dist/dh_native_host/_internal/python313.dll": b"runtime",
            "host/config.json": b"{}\n",
            "host/system_prompt.md": b"core",
            "host/register.py": b"register",
            "installer_core.ps1": b"installer",
            "install.bat": b"wrapper",
        }
        for relative, payload in files.items():
            path = self.source.joinpath(*relative.split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)

    @staticmethod
    def _relative_files(root: Path) -> tuple[str, ...]:
        return tuple(
            sorted(path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file())
        )

    @classmethod
    def _snapshot(cls, root: Path) -> dict[str, bytes]:
        return {
            relative: root.joinpath(*relative.split("/")).read_bytes()
            for relative in cls._relative_files(root)
        }

    def test_stage_release_is_complete_and_does_not_touch_source(self):
        before = self._snapshot(self.source)
        result = release_helper.stage_release(
            self.source,
            self.stage,
            "2.0.74-beta.4",
        )
        self.assertEqual(result, self.stage)
        self.assertEqual(before, self._snapshot(self.source))
        self.assertEqual(
            set(self._relative_files(self.stage)),
            {
                "extension/manifest.json",
                "extension/assets/app.js",
                "host/dh_native_host.exe",
                "host/_internal/python313.dll",
                "host/config.json",
                "host/system_prompt.md",
                "host/register.py",
                "host/release-integrity.json",
                "host/installed-product.json",
                "installer_core.ps1",
                "install.bat",
                "update-manifest.json",
            },
        )

    def test_stage_release_rejects_empty_source_directory_without_output(self):
        (self.source / "extension/dist/empty").mkdir()
        with self.assertRaises(Exception):
            release_helper.stage_release(
                self.source,
                self.stage,
                "2.0.74-beta.4",
            )
        self.assertFalse(self.stage.exists())

    def test_stage_release_preserves_preexisting_destination(self):
        self.stage.mkdir()
        sentinel = self.stage / "sentinel.txt"
        sentinel.write_bytes(b"keep")
        with self.assertRaises(FileExistsError):
            release_helper.stage_release(
                self.source,
                self.stage,
                "2.0.74-beta.4",
            )
        self.assertEqual(sentinel.read_bytes(), b"keep")

    def test_create_zip_is_deterministic_through_public_helper(self):
        output = self.root / "out"
        first_path = Path(
            release_helper.create_zip(
                "2.0.74-beta.4",
                source_root=self.source,
                output_dir=output,
            )
        )
        first_bytes = first_path.read_bytes()
        os.utime(
            self.source / "host/system_prompt.md",
            (1_900_000_000, 1_900_000_000),
        )
        second_path = Path(
            release_helper.create_zip(
                "2.0.74-beta.4",
                source_root=self.source,
                output_dir=output,
            )
        )
        self.assertEqual(first_path, second_path)
        self.assertEqual(first_bytes, second_path.read_bytes())

    def test_historical_updater_bootstraps_both_metadata_files(self):
        release_helper.stage_release(
            self.source,
            self.stage,
            "2.0.74-beta.4",
        )
        archive = self.root / "release.zip"
        write_deterministic_archive(self.stage, archive)
        install = self.root / "installed"
        install.mkdir()
        current_exe = install / "dh_native_host.exe"
        current_exe.write_bytes(b"old-host")
        updater = Updater(current_exe)
        updater.extension_dir = install / "extension"
        original_overwrite = updater._overwrite_directory
        with (
            patch.object(
                updater,
                "_swap_host_binary",
                side_effect=lambda source: shutil.copy2(source, current_exe),
            ),
            patch.object(
                updater,
                "_overwrite_directory",
                wraps=original_overwrite,
            ) as overwrite,
        ):
            updater.apply_update(archive)
        self.assertTrue(
            any(
                Path(call.args[0]).name == "_internal"
                for call in overwrite.call_args_list
            )
        )
        installed = load_installed_product(install / "installed-product.json")
        self.assertEqual(
            sha256_file(install / "release-integrity.json"),
            installed.release_integrity_sha256,
        )
        self.assertFalse((install / "update-manifest.json").exists())


if __name__ == "__main__":
    unittest.main()
