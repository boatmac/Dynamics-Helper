import copy
import json
import stat
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
from unittest.mock import patch

from package_manifest import (
    INSTALLED_PRODUCT_SCHEMA_VERSION,
    LEGACY_PRODUCT_ALLOWLIST_VERSION,
    OWNERSHIP_SCHEMA_VERSION,
    RELEASE_INTEGRITY_SCHEMA_VERSION,
    UPDATE_MANIFEST_SCHEMA_VERSION,
    FileRecord,
    InstalledProduct,
    ManifestEntry,
    ManifestError,
    OwnershipClass,
    ReleaseIntegrity,
    UpdateManifest,
    _require_regular_file,
    _walk_regular_relative_paths,
    canonical_json_bytes,
    generate_release_documents,
    installed_product_to_dict,
    load_installed_product,
    load_release_integrity,
    load_update_manifest,
    normalize_package_path,
    parse_installed_product,
    parse_release_integrity,
    parse_update_manifest,
    release_integrity_to_dict,
    sha256_bytes,
    sha256_file,
    update_manifest_to_dict,
    write_release_documents,
)


HASH_A = "0" * 64
HASH_B = "1" * 64


def valid_manifest_value() -> dict[str, object]:
    entries = [
        {
            "path": "extension/assets/app.js",
            "ownership": "whole_product_directory",
            "sha256": HASH_A,
        },
        {
            "path": "extension/manifest.json",
            "ownership": "whole_product_directory",
            "sha256": HASH_A,
        },
        {
            "path": "host/_internal/python313.dll",
            "ownership": "whole_product_directory",
            "sha256": HASH_A,
        },
        {
            "path": "host/config.json",
            "ownership": "seed_only",
            "sha256": HASH_A,
        },
        {
            "path": "host/dh_native_host.exe",
            "ownership": "host_product_file",
            "sha256": HASH_A,
        },
        {
            "path": "host/installed-product.json",
            "ownership": "packaged_metadata",
            "sha256": HASH_A,
        },
        {
            "path": "host/register.py",
            "ownership": "host_product_file",
            "sha256": HASH_A,
        },
        {
            "path": "host/release-integrity.json",
            "ownership": "packaged_metadata",
            "sha256": HASH_A,
        },
        {
            "path": "host/system_prompt.md",
            "ownership": "host_product_file",
            "sha256": HASH_A,
        },
        {
            "path": "install.bat",
            "ownership": "package_only",
            "sha256": HASH_A,
        },
        {
            "path": "installer_core.ps1",
            "ownership": "package_only",
            "sha256": HASH_A,
        },
    ]
    return {
        "schema_version": 1,
        "package_version": "2.0.74-beta.4",
        "required_capabilities": ["prompt-scope-v1"],
        "provided_capabilities": ["prompt-scope-v1"],
        "chrome_manifest": {
            "version": "2.0.74",
            "version_name": "2.0.74-beta.4",
        },
        "entries": entries,
    }


def valid_integrity_value() -> dict[str, object]:
    return {
        "schema_version": 1,
        "package_version": "2.0.74-beta.4",
        "required_capabilities": ["prompt-scope-v1"],
        "provided_capabilities": ["prompt-scope-v1"],
        "chrome_manifest": {
            "version": "2.0.74",
            "version_name": "2.0.74-beta.4",
        },
        "host_files": [
            {"path": "_internal/python313.dll", "sha256": HASH_A},
            {"path": "dh_native_host.exe", "sha256": HASH_A},
            {"path": "register.py", "sha256": HASH_A},
            {"path": "system_prompt.md", "sha256": HASH_A},
        ],
        "extension_files": [
            {"path": "assets/app.js", "sha256": HASH_A},
            {"path": "manifest.json", "sha256": HASH_A},
        ],
    }


def valid_installed_value() -> dict[str, object]:
    return {
        "schema_version": 1,
        "package_version": "2.0.74-beta.4",
        "required_capabilities": ["prompt-scope-v1"],
        "provided_capabilities": ["prompt-scope-v1"],
        "ownership_schema_version": 1,
        "legacy_allowlist_version": 1,
        "release_integrity_sha256": HASH_B,
    }


class ManifestParserTests(unittest.TestCase):
    PATH_CASES = (
        ("host/system_prompt.md", "host/system_prompt.md"),
        ("", None),
        (".", None),
        ("../x", None),
        ("host/../x", None),
        ("/host/x", None),
        (r"C:\host\x", None),
        (r"\\server\share\x", None),
        (r"host\x", None),
        ("host//x", None),
        ("host/./x", None),
        ("host/x\x00y", None),
        ("extension/app.js:stream", None),
        ("extension/app.js.", None),
        ("extension/app.js ", None),
        ("host/CON", None),
        ("extension/AUX.txt", None),
    )

    def test_path_normalization_table(self):
        for raw, expected in self.PATH_CASES:
            with self.subTest(raw=raw):
                if expected is None:
                    with self.assertRaises(ManifestError):
                        normalize_package_path(raw)
                else:
                    self.assertEqual(normalize_package_path(raw), expected)

    def test_canonical_json_is_stable_ascii_and_newline_terminated(self):
        self.assertEqual(
            canonical_json_bytes({"z": "é", "a": [2, 1]}),
            b'{"a":[2,1],"z":"\\u00e9"}\n',
        )

    def test_valid_documents_parse_to_frozen_models(self):
        manifest = parse_update_manifest(valid_manifest_value())
        integrity = parse_release_integrity(valid_integrity_value())
        installed = parse_installed_product(valid_installed_value())
        self.assertIsInstance(manifest, UpdateManifest)
        self.assertIsInstance(integrity, ReleaseIntegrity)
        self.assertIsInstance(installed, InstalledProduct)
        self.assertEqual(manifest.schema_version, UPDATE_MANIFEST_SCHEMA_VERSION)
        self.assertEqual(integrity.schema_version, RELEASE_INTEGRITY_SCHEMA_VERSION)
        self.assertEqual(installed.schema_version, INSTALLED_PRODUCT_SCHEMA_VERSION)
        self.assertEqual(installed.ownership_schema_version, OWNERSHIP_SCHEMA_VERSION)
        self.assertEqual(
            installed.legacy_allowlist_version,
            LEGACY_PRODUCT_ALLOWLIST_VERSION,
        )
        with self.assertRaises((AttributeError, TypeError)):
            manifest.package_version = "changed"

    def test_manifest_parser_rejects_structural_mutations(self):
        mutations = (
            lambda value: value.pop("package_version"),
            lambda value: value.__setitem__("surprise", True),
            lambda value: value.__setitem__("schema_version", True),
            lambda value: value.__setitem__("provided_capabilities", [""]),
            lambda value: value.__setitem__(
                "provided_capabilities", ["prompt-scope-v1", "prompt-scope-v1"]
            ),
            lambda value: value["entries"][0].__setitem__("sha256", "A" * 64),
            lambda value: value["entries"][0].__setitem__("ownership", "mystery"),
            lambda value: value["entries"].append(dict(value["entries"][0])),
            lambda value: value["entries"].append(
                {
                    "path": "update-manifest.json",
                    "ownership": "package_only",
                    "sha256": HASH_A,
                }
            ),
        )
        for mutate in mutations:
            value = copy.deepcopy(valid_manifest_value())
            mutate(value)
            with self.subTest(value=value):
                with self.assertRaises(ManifestError):
                    parse_update_manifest(value)

    def test_manifest_parser_rejects_ownership_and_order_drift(self):
        cases = []
        live_only = copy.deepcopy(valid_manifest_value())
        live_only["entries"][0]["ownership"] = "user_owned"
        cases.append(live_only)
        wrong_internal = copy.deepcopy(valid_manifest_value())
        wrong_internal["entries"][2]["ownership"] = "host_product_file"
        cases.append(wrong_internal)
        wrong_config = copy.deepcopy(valid_manifest_value())
        wrong_config["entries"][3]["ownership"] = "host_product_file"
        cases.append(wrong_config)
        unsorted = copy.deepcopy(valid_manifest_value())
        unsorted["entries"][0], unsorted["entries"][1] = (
            unsorted["entries"][1],
            unsorted["entries"][0],
        )
        cases.append(unsorted)
        collision = copy.deepcopy(valid_manifest_value())
        collision["entries"].insert(
            1,
            {
                "path": "extension/Assets/app.js",
                "ownership": "whole_product_directory",
                "sha256": HASH_A,
            },
        )
        cases.append(collision)
        for value in cases:
            with self.subTest(entries=value["entries"]):
                with self.assertRaises(ManifestError):
                    parse_update_manifest(value)

    def test_other_document_parsers_are_strict(self):
        cases = (
            (parse_release_integrity, valid_integrity_value()),
            (parse_installed_product, valid_installed_value()),
        )
        for parser, valid in cases:
            for mutation in ("missing", "unknown", "wrong-type"):
                value = copy.deepcopy(valid)
                if mutation == "missing":
                    value.pop("package_version")
                elif mutation == "unknown":
                    value["unexpected"] = True
                else:
                    value["schema_version"] = True
                with self.subTest(parser=parser.__name__, mutation=mutation):
                    with self.assertRaises(ManifestError):
                        parser(value)

    def test_rejected_values_are_not_coerced(self):
        class Secret:
            def __str__(self):
                raise AssertionError("must not coerce")

        for parser in (
            parse_update_manifest,
            parse_release_integrity,
            parse_installed_product,
        ):
            with self.subTest(parser=parser.__name__):
                with self.assertRaises(ManifestError):
                    parser(Secret())


class CanonicalLoaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_canonical_documents_round_trip(self):
        cases = (
            (
                self.root / "update-manifest.json",
                valid_manifest_value(),
                parse_update_manifest,
                update_manifest_to_dict,
                load_update_manifest,
            ),
            (
                self.root / "release-integrity.json",
                valid_integrity_value(),
                parse_release_integrity,
                release_integrity_to_dict,
                load_release_integrity,
            ),
            (
                self.root / "installed-product.json",
                valid_installed_value(),
                parse_installed_product,
                installed_product_to_dict,
                load_installed_product,
            ),
        )
        for path, value, parser, serializer, loader in cases:
            parsed = parser(value)
            path.write_bytes(canonical_json_bytes(serializer(parsed)))
            with self.subTest(path=path.name):
                self.assertEqual(loader(path), parsed)

    def test_loaders_reject_noncanonical_or_malformed_bytes(self):
        parser = parse_update_manifest
        canonical = canonical_json_bytes(update_manifest_to_dict(parser(valid_manifest_value())))
        duplicate = canonical.replace(
            b'"schema_version":1',
            b'"schema_version":1,"schema_version":1',
            1,
        )
        malformed = (
            duplicate,
            canonical.replace(b'"schema_version":1', b'"schema_version":NaN'),
            json.dumps(valid_manifest_value(), indent=2).encode("utf-8") + b"\n",
            canonical.rstrip(b"\n"),
            b"\xff",
        )
        path = self.root / "update-manifest.json"
        for raw in malformed:
            path.write_bytes(raw)
            with self.subTest(raw=raw[:30]):
                with self.assertRaises(ManifestError):
                    load_update_manifest(path)


class HashHelperTests(unittest.TestCase):
    def test_sha256_bytes_is_lowercase_fixed_width(self):
        self.assertEqual(
            sha256_bytes(b"hello"),
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
        )


class ReleaseDocumentGenerationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def _make_stage(self) -> Path:
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
        return stage

    def test_generated_documents_have_exact_ownership_and_hash_links(self):
        stage = self._make_stage()
        docs = generate_release_documents(stage, "2.0.74-beta.4")
        self.assertEqual(docs.update_manifest.required_capabilities, ("prompt-scope-v1",))
        self.assertEqual(docs.update_manifest.provided_capabilities, ("prompt-scope-v1",))
        self.assertEqual(
            {
                entry.path
                for entry in docs.update_manifest.entries
                if entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
            },
            {
                "extension/assets/app.js",
                "extension/manifest.json",
                "host/_internal/python313.dll",
            },
        )
        self.assertEqual(
            {
                entry.path
                for entry in docs.update_manifest.entries
                if entry.ownership is OwnershipClass.PACKAGED_METADATA
            },
            {"host/installed-product.json", "host/release-integrity.json"},
        )
        self.assertNotIn(
            "release-integrity.json",
            {record.path for record in docs.release_integrity.host_files},
        )
        self.assertNotIn(
            "installed-product.json",
            {record.path for record in docs.release_integrity.host_files},
        )
        self.assertEqual(
            docs.installed_product.release_integrity_sha256,
            sha256_bytes(
                canonical_json_bytes(
                    release_integrity_to_dict(docs.release_integrity)
                )
            ),
        )
        update_host = {
            (entry.path.removeprefix("host/"), entry.sha256)
            for entry in docs.update_manifest.entries
            if entry.ownership in (
                OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
                OwnershipClass.HOST_PRODUCT_FILE,
            )
            and entry.path.startswith("host/")
        }
        update_extension = {
            (entry.path.removeprefix("extension/"), entry.sha256)
            for entry in docs.update_manifest.entries
            if entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
            and entry.path.startswith("extension/")
        }
        self.assertEqual(
            update_host,
            {(record.path, record.sha256) for record in docs.release_integrity.host_files},
        )
        self.assertEqual(
            update_extension,
            {
                (record.path, record.sha256)
                for record in docs.release_integrity.extension_files
            },
        )

    def test_write_release_documents_materializes_external_metadata_hashes(self):
        stage = self._make_stage()
        docs = generate_release_documents(stage, "2.0.74-beta.4")
        write_release_documents(stage, docs)
        parsed = load_update_manifest(stage / "update-manifest.json")
        hashes = {entry.path: entry.sha256 for entry in parsed.entries}
        self.assertEqual(
            hashes["host/release-integrity.json"],
            sha256_file(stage / "host" / "release-integrity.json"),
        )
        self.assertEqual(
            hashes["host/installed-product.json"],
            sha256_file(stage / "host" / "installed-product.json"),
        )
        self.assertNotIn("update-manifest.json", hashes)

    def test_valid_stage_requires_and_accepts_internal_whole_product_directory(self):
        stage = self._make_stage()
        documents = generate_release_documents(stage, "2.0.74-beta.4")
        entries = {entry.path: entry for entry in documents.update_manifest.entries}
        self.assertNotIn("host/_internal", entries)
        self.assertEqual(
            entries["host/_internal/python313.dll"].ownership,
            OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
        )
        integrity = {
            record.path: record.sha256
            for record in documents.release_integrity.host_files
        }
        self.assertEqual(
            entries["host/_internal/python313.dll"].sha256,
            integrity["_internal/python313.dll"],
        )

    def test_generation_rejects_incomplete_or_contaminated_stage(self):
        cases = (
            "missing-exe",
            "missing-internal",
            "version-mismatch",
            "preexisting-integrity",
            "preexisting-installed",
            "unexpected-host-directory",
            "forbidden-user-file",
        )
        for case in cases:
            stage = self._make_stage()
            if case == "missing-exe":
                (stage / "host" / "dh_native_host.exe").unlink()
            elif case == "missing-internal":
                (stage / "host" / "_internal" / "python313.dll").unlink()
                (stage / "host" / "_internal").rmdir()
            elif case == "version-mismatch":
                (stage / "extension" / "manifest.json").write_text(
                    '{"version":"2.0.73"}\n', encoding="utf-8"
                )
            elif case == "preexisting-integrity":
                (stage / "host" / "release-integrity.json").write_bytes(b"old")
            elif case == "preexisting-installed":
                (stage / "host" / "installed-product.json").write_bytes(b"old")
            elif case == "unexpected-host-directory":
                path = stage / "host" / "plugins" / "x.dll"
                path.parent.mkdir()
                path.write_bytes(b"plugin")
            else:
                (stage / "host" / "user_prompt.md").write_text(
                    "secret", encoding="utf-8"
                )
            with self.subTest(case=case):
                with self.assertRaises(ManifestError):
                    generate_release_documents(stage, "2.0.74-beta.4")

    def test_flat_host_runtime_file_is_product_owned(self):
        stage = self._make_stage()
        (stage / "host" / "helper.dll").write_bytes(b"helper")
        documents = generate_release_documents(stage, "2.0.74-beta.4")
        entries = {entry.path: entry for entry in documents.update_manifest.entries}
        self.assertEqual(
            entries["host/helper.dll"].ownership,
            OwnershipClass.HOST_PRODUCT_FILE,
        )

    def test_metadata_writer_preserves_colliding_unowned_siblings(self):
        stage = self._make_stage()
        documents = generate_release_documents(stage, "2.0.74-beta.4")
        collisions = (
            stage / ".tmp-deadbeef",
            stage / "host" / ".tmp-deadbeef",
        )
        for path in collisions:
            path.write_bytes(b"keep")
        with patch(
            "package_manifest.tempfile.mkstemp",
            side_effect=FileExistsError("collision"),
        ):
            with self.assertRaises(FileExistsError):
                write_release_documents(stage, documents)
        for path in collisions:
            self.assertEqual(path.read_bytes(), b"keep")


class FilesystemEntryTypeTests(unittest.TestCase):
    def test_regular_file_guard_rejects_link_fifo_and_reparse(self):
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        cases = (
            SimpleNamespace(st_mode=stat.S_IFLNK | 0o777, st_file_attributes=0),
            SimpleNamespace(st_mode=stat.S_IFIFO | 0o600, st_file_attributes=0),
            SimpleNamespace(
                st_mode=stat.S_IFREG | 0o644,
                st_file_attributes=reparse,
            ),
        )
        for fake_stat in cases:
            with self.subTest(mode=fake_stat.st_mode):
                path = MagicMock(spec=Path)
                path.lstat.return_value = fake_stat
                with self.assertRaises(ManifestError):
                    _require_regular_file(path)

    def test_walker_returns_global_normalized_lexical_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "z").mkdir()
            (root / "a").mkdir()
            (root / "z" / "a.txt").write_bytes(b"za")
            (root / "a" / "z.txt").write_bytes(b"az")
            (root / "a.txt").write_bytes(b"a")
            (root / "m.txt").write_bytes(b"m")
            self.assertEqual(
                _walk_regular_relative_paths(root),
                ("a.txt", "a/z.txt", "m.txt", "z/a.txt"),
            )


if __name__ == "__main__":
    unittest.main()
