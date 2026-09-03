import inspect
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import release_helper
from package_archive import validate_staged_package, write_deterministic_archive
from package_manifest import ManifestError, load_installed_product, load_update_manifest, sha256_file
from product_info import VERSION
from test_update_support import current_extension_manifest_bytes
from updater import Updater


PLAN_C_EARLY_MODULES = (
    "early_cli",
    "install_integrity",
    "native_messaging",
    "native_registration",
    "package_archive",
    "package_manifest",
    "product_info",
    "update_engine",
    "update_entrypoint",
    "update_journal",
    "update_mutex",
    "update_ownership",
    "update_operation",
    "update_platform",
    "update_recovery",
    "update_service",
    "update_status_host",
)


class TestReleaseStaging(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.stage = self.root / "stage"
        files = {
            "extension/dist/manifest.json": current_extension_manifest_bytes(),
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
            VERSION,
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
                VERSION,
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
                VERSION,
            )
        self.assertEqual(sentinel.read_bytes(), b"keep")

    def test_stage_release_preserves_colliding_unowned_sibling(self):
        collision = self.stage.parent / ".stg-deadbeef"
        collision.mkdir()
        sentinel = collision / "sentinel.txt"
        sentinel.write_bytes(b"keep")
        fixed = type("FixedUuid", (), {"hex": "deadbeef" * 4})()
        with patch("release_helper.uuid.uuid4", return_value=fixed):
            release_helper.stage_release(
                self.source,
                self.stage,
                VERSION,
            )
        self.assertEqual(sentinel.read_bytes(), b"keep")
        self.assertFalse((self.stage / "sentinel.txt").exists())

    def test_create_zip_does_not_delete_colliding_stage_name(self):
        output = self.root / "collision-output"
        output.mkdir()
        collision = output / ".pkg-deadbeef"
        collision.mkdir()
        sentinel = collision / "sentinel.txt"
        sentinel.write_bytes(b"keep")
        fixed = type("FixedUuid", (), {"hex": "deadbeef" * 4})()
        with (
            patch("release_helper.uuid.uuid4", return_value=fixed),
            self.assertRaises(FileExistsError),
        ):
            release_helper.create_zip(
                VERSION,
                source_root=self.source,
                output_dir=output,
            )
        self.assertEqual(sentinel.read_bytes(), b"keep")

    def test_stage_release_rejects_source_tree_before_copy(self):
        with (
            patch(
                "package_manifest._walk_regular_relative_paths",
                side_effect=ManifestError("unsupported filesystem entry"),
            ) as preflight,
            patch("release_helper.shutil.copytree") as copytree,
        ):
            with self.assertRaises(ManifestError):
                release_helper.stage_release(
                    self.source,
                    self.stage,
                    VERSION,
                )
        preflight.assert_called_once()
        copytree.assert_not_called()

    def test_create_zip_is_deterministic_through_public_helper(self):
        output = self.root / "out"
        first_path = Path(
            release_helper.create_zip(
                VERSION,
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
                VERSION,
                source_root=self.source,
                output_dir=output,
            )
        )
        self.assertEqual(first_path, second_path)
        self.assertEqual(first_bytes, second_path.read_bytes())

    def test_create_zip_supports_long_isolated_temp_root(self):
        long_root = self.root / ("isolated-" + "x" * 72)
        source = long_root / "source"
        output = long_root / "out"
        shutil.copytree(self.source, source)
        archive = Path(
            release_helper.create_zip(
                VERSION,
                source_root=source,
                output_dir=output,
            )
        )
        self.assertEqual(archive.name, f"DynamicsHelper_v{VERSION}.zip")
        self.assertTrue(archive.is_file())

    def test_historical_updater_bootstraps_both_metadata_files(self):
        release_helper.stage_release(
            self.source,
            self.stage,
            VERSION,
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


class PlanCPackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_source_build_argv_uses_venv_python_module_and_every_hidden_import(self):
        with patch("release_helper.subprocess.run") as run:
            command = release_helper.pyinstaller_build_command()
        run.assert_not_called()
        self.assertEqual(Path(command[0]).resolve(), release_helper.VENV_PYTHON)
        self.assertEqual(command[1:3], ["-m", "PyInstaller"])
        self.assertEqual(
            command[3:8],
            ["--onedir", "--clean", "-y", "--name", "dh_native_host"],
        )
        self.assertIn("--paths", command)
        self.assertEqual(
            Path(command[command.index("--paths") + 1]).resolve(),
            release_helper.HOST_DIR.resolve(),
        )
        actual_hidden = tuple(
            command[index + 1]
            for index, value in enumerate(command)
            if value == "--hidden-import"
        )
        self.assertEqual(actual_hidden, PLAN_C_EARLY_MODULES)
        self.assertEqual(
            Path(command[-1]).resolve(),
            (release_helper.HOST_DIR / "dh_native_host.py").resolve(),
        )
        self.assertFalse(any(argument.endswith(".spec") for argument in command))
        self.assertLess(
            max(index for index, value in enumerate(command) if value == "--hidden-import"),
            len(command) - 1,
        )

    def test_matching_installer_replaces_the_complete_internal_runtime(self):
        source = release_helper.INSTALL_SCRIPT.read_text(encoding="utf-8")
        cleanup = 'Remove-Item "$DestDir\\_internal" -Recurse -Force'
        copy_loop = "Get-ChildItem -Path $HostSrc -Recurse | ForEach-Object"
        validate_source = 'foreach ($RequiredPath in @('
        package_probe = '& "$PreflightRoot\\dh_native_host.exe" --update-probe $PackageManifest $PSScriptRoot'
        stop_process = 'Stop-Process -Name "dh_native_host" -Force'
        live_probe = '& $ExePath --update-probe $PackageManifest'
        settle = '& $ExePath --settle-installer-repair'

        self.assertIn(cleanup, source)
        self.assertIn(validate_source, source)
        self.assertIn(package_probe, source)
        self.assertLess(source.index(package_probe), source.index(stop_process))
        self.assertLess(source.index(package_probe), source.index(cleanup))
        self.assertLess(source.index(cleanup), source.index(copy_loop))
        self.assertIn(live_probe, source)
        self.assertIn(settle, source)
        self.assertLess(source.index(live_probe), source.index(settle))
        self.assertLess(source.index(settle), source.index("Running registration command"))

    def test_build_host_invokes_exact_cli_command(self):
        with patch("release_helper.subprocess.run") as run:
            run.return_value.stdout = "6.22.2\n"
            release_helper.build_host()
        self.assertEqual(
            run.call_args_list[0].args[0],
            [
                str(release_helper.VENV_PYTHON),
                "-m",
                "PyInstaller",
                "--version",
            ],
        )
        self.assertTrue(run.call_args_list[0].kwargs["capture_output"])
        self.assertTrue(run.call_args_list[0].kwargs["text"])
        self.assertEqual(
            run.call_args_list[1].args[0],
            release_helper.pyinstaller_build_command(),
        )
        self.assertEqual(
            Path(run.call_args_list[1].kwargs["cwd"]).resolve(),
            release_helper.ROOT_DIR.resolve(),
        )

    def test_build_host_never_provisions_or_uses_bare_pyinstaller(self):
        source = inspect.getsource(release_helper.build_host)
        self.assertNotIn("ensurepip", source)
        self.assertNotRegex(source, r"(?i)(?<!PyInstaller)\bpip\b")
        self.assertNotIn("pyinstaller.exe", source.casefold())

    def test_missing_pyinstaller_module_uses_fixed_error_before_build(self):
        failure = __import__("subprocess").CalledProcessError(
            1, [str(release_helper.VENV_PYTHON), "-m", "PyInstaller"]
        )
        with (
            patch("release_helper.subprocess.run", side_effect=failure) as run,
            patch("builtins.print") as printed,
            self.assertRaises(SystemExit) as raised,
        ):
            release_helper.build_host()
        self.assertEqual(raised.exception.code, 1)
        self.assertEqual(run.call_count, 1)
        printed.assert_any_call(
            "ERROR: required PyInstaller 6.22.2 is unavailable."
        )

    def test_no_plan_c_data_is_implicitly_bundled(self):
        command = release_helper.pyinstaller_build_command()
        self.assertNotIn("--add-data", command)
        self.assertNotIn("--collect-data", command)

    def test_spec_is_ignored_without_creating_it(self):
        text = Path(".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertIn("*.spec", text)
        spec = Path("dh_native_host.spec")
        existed_before = spec.exists()
        bytes_before = spec.read_bytes() if existed_before else None
        completed = __import__("subprocess").run(
            ["git", "check-ignore", "-q", "dh_native_host.spec"],
            check=False,
        )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(spec.exists(), existed_before)
        if existed_before:
            self.assertEqual(spec.read_bytes(), bytes_before)

    def test_normal_plan_a_release_stage_remains_manifest_valid(self):
        source = self.root / "source"
        stage = self.root / "stage"
        files = {
            "extension/dist/manifest.json": current_extension_manifest_bytes(),
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
            path = source.joinpath(*relative.split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        release_helper.stage_release(source, stage, VERSION)
        self.assertFalse((stage / "updates").exists())
        self.assertEqual(
            validate_staged_package(stage).manifest.entries,
            load_update_manifest(stage / "update-manifest.json").entries,
        )


if __name__ == "__main__":
    unittest.main()
