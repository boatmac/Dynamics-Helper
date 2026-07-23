import os
import stat
import struct
import tempfile
import unittest
import zipfile
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from package_archive import (
    PackageValidationError,
    _preflight_zip_infos,
    stage_and_validate_archive,
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

    def test_archive_writer_preserves_colliding_unowned_sibling(self):
        archive = self.root / "result.zip"
        collision = self.root / ".zip-deadbeef"
        collision.write_bytes(b"keep")
        fixed = type("FixedUuid", (), {"hex": "deadbeef" * 4})()
        with patch("package_archive.uuid.uuid4", return_value=fixed):
            write_deterministic_archive(self.stage, archive)
        self.assertEqual(collision.read_bytes(), b"keep")
        self.assertTrue(archive.is_file())


class HostileArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = make_stage(self.root / "source")

    def _valid_entries(self) -> list[tuple[str, bytes, int, int]]:
        return [
            (relative, self.stage.joinpath(*relative.split("/")).read_bytes(), 3, 0o100644 << 16)
            for relative in sorted(
                path.relative_to(self.stage).as_posix()
                for path in self.stage.rglob("*")
                if path.is_file()
            )
        ]

    def _write_archive(
        self,
        name: str,
        extras: tuple[tuple[str, bytes, int, int], ...] = (),
    ) -> Path:
        archive = self.root / f"{name}.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as output:
            for filename, payload, create_system, external_attr in (
                *self._valid_entries(),
                *extras,
            ):
                info = zipfile.ZipInfo(filename)
                info.create_system = create_system
                info.external_attr = external_attr
                output.writestr(info, payload)
        for filename, _payload, _create_system, _external_attr in extras:
            if "\\" not in filename:
                continue
            normalized = filename.replace("\\", "/")
            data = bytearray(archive.read_bytes())
            original = normalized.encode("utf-8")
            replacement = filename.encode("utf-8")
            self.assertEqual(len(original), len(replacement))
            self.assertEqual(data.count(original), 2)
            archive.write_bytes(data.replace(original, replacement))
        return archive

    def test_hostile_archive_table(self):
        cases = (
            ("parent", "../escape.txt", 3, 0o100644 << 16, "invalid_package_path"),
            ("absolute", "/escape.txt", 3, 0o100644 << 16, "invalid_package_path"),
            ("drive", "C:/escape.txt", 3, 0o100644 << 16, "invalid_package_path"),
            ("duplicate", "host/system_prompt.md", 3, 0o100644 << 16, "duplicate_package_path"),
            ("case-collision", "extension/assets/APP.js", 3, 0o100644 << 16, "duplicate_package_path"),
            ("symlink", "host/link", 3, 0o120777 << 16, "unsupported_archive_entry"),
            ("fifo", "host/pipe", 3, 0o010644 << 16, "unsupported_archive_entry"),
            ("directory", "host/_internal/", 3, 0o040755 << 16, "unsupported_archive_entry"),
            ("extra-directory", "surprise/", 3, 0o040755 << 16, "unsupported_archive_entry"),
            ("ads", "extension/assets/app.js:secret", 3, 0o100644 << 16, "invalid_package_path"),
            ("trailing-dot", "extension/assets/app.js.", 3, 0o100644 << 16, "invalid_package_path"),
            ("trailing-space", "extension/assets/app.js ", 3, 0o100644 << 16, "invalid_package_path"),
            ("reserved", "extension/assets/CON.txt", 3, 0o100644 << 16, "invalid_package_path"),
            ("dos-directory", "surprise", 0, 0x10, "unsupported_archive_entry"),
        )
        for name, filename, create_system, attrs, expected in cases:
            archive = self._write_archive(
                name,
                ((filename, b"x", create_system, attrs),),
            )
            destination = self.root / f"{name}-stage"
            with self.subTest(name=name):
                with self.assertRaises(PackageValidationError) as captured:
                    stage_and_validate_archive(archive, destination)
                self.assertEqual(captured.exception.error_code, expected)
                self.assertFalse(destination.exists())
        self.assertFalse((self.root.parent / "escape.txt").exists())

    def test_preflight_rejects_backslash_before_extraction(self):
        class BackslashInfo:
            filename = r"host\escape.txt"
            flag_bits = 0
            create_system = 3
            external_attr = 0o100644 << 16

            @staticmethod
            def is_dir() -> bool:
                return False

        with self.assertRaises(PackageValidationError) as captured:
            _preflight_zip_infos([BackslashInfo()])
        self.assertEqual(captured.exception.error_code, "invalid_package_path")

    def test_preflight_rejects_parent_segments_before_extraction(self):
        class ParentInfo:
            filename = "../escape.txt"
            flag_bits = 0
            create_system = 3
            external_attr = 0o100644 << 16

            @staticmethod
            def is_dir() -> bool:
                return False

        with self.assertRaises(PackageValidationError) as captured:
            _preflight_zip_infos([ParentInfo()])
        self.assertEqual(captured.exception.error_code, "invalid_package_path")

    def test_deterministic_archive_round_trips(self):
        archive = self.root / "round-trip.zip"
        destination = self.root / "round-trip-stage"
        write_deterministic_archive(self.stage, archive)
        validated = stage_and_validate_archive(
            archive,
            destination,
            expected_version="2.0.74-beta.4",
        )
        self.assertEqual(validated.manifest.package_version, "2.0.74-beta.4")

    def test_dos_regular_entry_reaches_manifest_validation(self):
        archive = self._write_archive(
            "dos-file",
            (("surprise.txt", b"x", 0, 0),),
        )
        with self.assertRaises(PackageValidationError) as captured:
            stage_and_validate_archive(archive, self.root / "dos-file-stage")
        self.assertEqual(captured.exception.error_code, "package_file_unmanifested")

    def test_preexisting_stage_destination_is_untouched(self):
        archive = self.root / "valid.zip"
        write_deterministic_archive(self.stage, archive)
        destination = self.root / "existing"
        destination.mkdir()
        sentinel = destination / "sentinel.txt"
        sentinel.write_bytes(b"keep")
        with self.assertRaises(FileExistsError):
            stage_and_validate_archive(archive, destination)
        self.assertEqual(sentinel.read_bytes(), b"keep")

    def test_extractor_preserves_colliding_unowned_sibling(self):
        archive = self.root / "valid-collision.zip"
        write_deterministic_archive(self.stage, archive)
        collision = self.root / ".ext-deadbeef"
        collision.mkdir()
        sentinel = collision / "sentinel.txt"
        sentinel.write_bytes(b"keep")
        fixed = type("FixedUuid", (), {"hex": "deadbeef" * 4})()
        destination = self.root / "collision-stage"
        with patch("package_archive.uuid.uuid4", return_value=fixed):
            stage_and_validate_archive(archive, destination)
        self.assertEqual(sentinel.read_bytes(), b"keep")
        self.assertTrue(destination.is_dir())

    def test_encrypted_flag_is_rejected_before_open(self):
        archive = self.root / "encrypted.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as output:
            output.writestr("one.txt", b"x")
        data = bytearray(archive.read_bytes())
        local = data.find(b"PK\x03\x04")
        central = data.find(b"PK\x01\x02")
        self.assertGreaterEqual(local, 0)
        self.assertGreaterEqual(central, 0)
        struct.pack_into(
            "<H",
            data,
            local + 6,
            struct.unpack_from("<H", data, local + 6)[0] | 1,
        )
        struct.pack_into(
            "<H",
            data,
            central + 8,
            struct.unpack_from("<H", data, central + 8)[0] | 1,
        )
        archive.write_bytes(data)
        with patch("zipfile.ZipFile.open", side_effect=AssertionError("opened")) as opened:
            with self.assertRaises(PackageValidationError) as captured:
                stage_and_validate_archive(archive, self.root / "encrypted-stage")
        self.assertEqual(captured.exception.error_code, "unsupported_archive_entry")
        opened.assert_not_called()


if __name__ == "__main__":
    unittest.main()
