import os
import tempfile
import unittest
import zipfile
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from package_archive import (
    PackageValidationError,
    validate_staged_package,
    write_deterministic_archive,
)
from package_manifest import (
    ManifestError,
    canonical_json_bytes,
    generate_release_documents,
    installed_product_to_dict,
    load_installed_product,
    load_release_integrity,
    load_update_manifest,
    release_integrity_to_dict,
    sha256_bytes,
    update_manifest_to_dict,
    write_release_documents,
)


def make_stage(root: Path) -> Path:
    stage = root / "stage"
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
    documents = generate_release_documents(stage, "2.0.74-beta.4")
    write_release_documents(stage, documents)
    return stage


class StagedPackageValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def _fresh_stage(self) -> Path:
        return make_stage(self.root / os.urandom(4).hex())

    def _relink_metadata_with_wrong_product_hash(self, stage: Path) -> None:
        integrity = load_release_integrity(stage / "host/release-integrity.json")
        changed_integrity = replace(
            integrity,
            host_files=tuple(
                replace(record, sha256="0" * 64)
                if record.path == "system_prompt.md"
                else record
                for record in integrity.host_files
            ),
        )
        integrity_bytes = canonical_json_bytes(
            release_integrity_to_dict(changed_integrity)
        )
        installed = load_installed_product(stage / "host/installed-product.json")
        changed_installed = replace(
            installed,
            release_integrity_sha256=sha256_bytes(integrity_bytes),
        )
        installed_bytes = canonical_json_bytes(
            installed_product_to_dict(changed_installed)
        )
        manifest = load_update_manifest(stage / "update-manifest.json")
        metadata_hashes = {
            "host/release-integrity.json": sha256_bytes(integrity_bytes),
            "host/installed-product.json": sha256_bytes(installed_bytes),
        }
        changed_manifest = replace(
            manifest,
            entries=tuple(
                replace(entry, sha256=metadata_hashes[entry.path])
                if entry.path in metadata_hashes
                else entry
                for entry in manifest.entries
            ),
        )
        (stage / "host/release-integrity.json").write_bytes(integrity_bytes)
        (stage / "host/installed-product.json").write_bytes(installed_bytes)
        (stage / "update-manifest.json").write_bytes(
            canonical_json_bytes(update_manifest_to_dict(changed_manifest))
        )

    def test_valid_stage_returns_resolved_models(self):
        stage = self._fresh_stage()
        result = validate_staged_package(stage, expected_version="2.0.74-beta.4")
        self.assertEqual(result.stage_root, stage.resolve())
        self.assertEqual(result.manifest.package_version, "2.0.74-beta.4")
        self.assertEqual(result.release_integrity.package_version, "2.0.74-beta.4")
        self.assertEqual(result.installed_product.package_version, "2.0.74-beta.4")

    def test_staged_mutation_table(self):
        mutations = (
            (
                "missing",
                "package_file_missing",
                lambda stage: (stage / "extension/assets/app.js").unlink(),
            ),
            (
                "extra-extension",
                "package_file_unmanifested",
                lambda stage: (stage / "extension/extra.js").write_bytes(b"x"),
            ),
            (
                "extra-internal",
                "package_file_unmanifested",
                lambda stage: (stage / "host/_internal/extra.dll").write_bytes(b"x"),
            ),
            (
                "extra-root",
                "package_file_unmanifested",
                lambda stage: (stage / "surprise.txt").write_bytes(b"x"),
            ),
            (
                "content-hash",
                "package_hash_mismatch",
                lambda stage: (stage / "host/system_prompt.md").write_bytes(b"changed"),
            ),
            (
                "malformed-integrity",
                "package_manifest_invalid",
                lambda stage: (stage / "host/release-integrity.json").write_bytes(b"{\n"),
            ),
            (
                "relinked-product",
                "package_metadata_mismatch",
                self._relink_metadata_with_wrong_product_hash,
            ),
        )
        for name, code, mutate in mutations:
            stage = self._fresh_stage()
            mutate(stage)
            with self.subTest(name=name):
                with self.assertRaises(PackageValidationError) as captured:
                    validate_staged_package(stage)
                self.assertEqual(captured.exception.error_code, code)

    def test_expected_target_validation(self):
        stage = self._fresh_stage()
        for value in ("", 7, True, [], {}, "2.0.75"):
            with self.subTest(value=value):
                with self.assertRaises(PackageValidationError) as captured:
                    validate_staged_package(stage, expected_version=value)
                self.assertEqual(
                    captured.exception.error_code,
                    "package_metadata_mismatch",
                )

    def test_staged_non_file_walker_failure_is_typed(self):
        stage = self._fresh_stage()
        with patch(
            "package_archive._walk_regular_relative_paths",
            side_effect=ManifestError("unsupported filesystem entry"),
        ):
            with self.assertRaises(PackageValidationError) as captured:
                validate_staged_package(stage)
        self.assertEqual(captured.exception.error_code, "unsupported_archive_entry")


class DeterministicArchiveWriterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = make_stage(self.root)

    def test_deterministic_archive_bytes_and_metadata(self):
        first = self.root / "first.zip"
        second = self.root / "second.zip"
        write_deterministic_archive(self.stage, first)
        os.utime(
            self.stage / "host/system_prompt.md",
            (1_900_000_000, 1_900_000_000),
        )
        write_deterministic_archive(self.stage, second)
        self.assertEqual(first.read_bytes(), second.read_bytes())
        with zipfile.ZipFile(first) as package:
            self.assertEqual(package.namelist(), sorted(package.namelist()))
            for info in package.infolist():
                self.assertEqual(info.date_time, (1980, 1, 1, 0, 0, 0))
                self.assertEqual(info.create_system, 3)
                self.assertEqual(info.external_attr >> 16, 0o100644)

    def test_deterministic_archive_contains_no_directory_entries(self):
        archive = self.root / "files-only.zip"
        write_deterministic_archive(self.stage, archive)
        with zipfile.ZipFile(archive) as package:
            self.assertTrue(package.infolist())
            self.assertTrue(all(not info.is_dir() for info in package.infolist()))
            self.assertTrue(
                all(not info.filename.endswith("/") for info in package.infolist())
            )


if __name__ == "__main__":
    unittest.main()
