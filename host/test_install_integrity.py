import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from install_integrity import (
    InstallationVerification,
    InstallationVerifier,
    UpdateProbeResult,
    run_update_probe,
)
from package_manifest import (
    InstalledProduct,
    canonical_json_bytes,
    generate_release_documents,
    installed_product_to_dict,
    load_installed_product,
    load_release_integrity,
    release_integrity_to_dict,
    sha256_bytes,
    write_release_documents,
)
from product_info import VERSION


class InstallationVerifierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def _make_live(self) -> Path:
        stage = self.root / next(tempfile._get_candidate_names())
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
        live = self.root / next(tempfile._get_candidate_names())
        shutil.copytree(stage / "host", live)
        shutil.copytree(stage / "extension", live / "extension")
        return live

    def test_source_host_reports_development_without_metadata(self):
        live = self.root / "development"
        live.mkdir()
        result = InstallationVerifier(live, frozen=False).verify()
        self.assertEqual(
            result,
            InstallationVerification(
                mode="development",
                integrity="development",
                host_version=VERSION,
            ),
        )

    def test_frozen_complete_product_is_verified(self):
        live = self._make_live()
        result = InstallationVerifier(live, frozen=True).verify()
        self.assertEqual(
            result,
            InstallationVerification(
                mode="packaged",
                integrity="verified",
                host_version=VERSION,
                extension_version=VERSION,
            ),
        )

    def test_frozen_failure_table(self):
        cases = (
            ("missing-integrity", lambda live: (live / "release-integrity.json").unlink()),
            ("missing-installed", lambda live: (live / "installed-product.json").unlink()),
            ("bad-link", lambda live: (live / "release-integrity.json").write_bytes(b"{}\n")),
            ("missing-host", lambda live: (live / "system_prompt.md").unlink()),
            ("changed-host", lambda live: (live / "system_prompt.md").write_bytes(b"changed")),
            ("extra-internal", lambda live: (live / "_internal/extra.dll").write_bytes(b"extra")),
            ("missing-extension", lambda live: (live / "extension/assets/app.js").unlink()),
            ("extra-extension", lambda live: (live / "extension/extra.js").write_bytes(b"extra")),
            ("extension-version", lambda live: (live / "extension/manifest.json").write_text('{"version":"9.9.9"}\n', encoding="utf-8")),
        )
        expected = InstallationVerification(
            mode="packaged",
            integrity="failed",
            error_code="installation_integrity_failed",
        )
        for name, mutate in cases:
            live = self._make_live()
            mutate(live)
            with self.subTest(name=name):
                self.assertEqual(InstallationVerifier(live, frozen=True).verify(), expected)

    def test_metadata_capability_or_version_mismatch_fails(self):
        for field, value in (
            ("package_version", "9.9.9"),
            ("provided_capabilities", ("transactional-update-v1",)),
        ):
            live = self._make_live()
            installed = load_installed_product(live / "installed-product.json")
            changed = InstalledProduct(
                schema_version=installed.schema_version,
                package_version=(value if field == "package_version" else installed.package_version),
                required_capabilities=installed.required_capabilities,
                provided_capabilities=(value if field == "provided_capabilities" else installed.provided_capabilities),
                ownership_schema_version=installed.ownership_schema_version,
                legacy_allowlist_version=installed.legacy_allowlist_version,
                release_integrity_sha256=installed.release_integrity_sha256,
            )
            (live / "installed-product.json").write_bytes(
                canonical_json_bytes(installed_product_to_dict(changed))
            )
            with self.subTest(field=field):
                self.assertEqual(
                    InstallationVerifier(live, frozen=True).verify().integrity,
                    "failed",
                )

    def test_result_is_cached_per_instance(self):
        live = self._make_live()
        verifier = InstallationVerifier(live, frozen=True)
        first = verifier.verify()
        (live / "system_prompt.md").write_bytes(b"changed")
        self.assertIs(verifier.verify(), first)
        self.assertEqual(
            InstallationVerifier(live, frozen=True).verify().integrity,
            "failed",
        )

    def test_unexpected_verifier_exception_fails_closed(self):
        live = self._make_live()
        verifier = InstallationVerifier(live, frozen=True)
        with patch.object(
            verifier,
            "_verify_packaged",
            side_effect=RuntimeError("SECRET-VERIFIER"),
        ):
            result = verifier.verify()
        self.assertEqual(result.integrity, "failed")
        self.assertEqual(result.error_code, "installation_integrity_failed")
        self.assertNotIn("SECRET-VERIFIER", repr(result))


class UpdateProbeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
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
        self.manifest = self.root / "external" / "update-manifest.json"
        self.manifest.parent.mkdir()
        shutil.copy2(stage / "update-manifest.json", self.manifest)
        self.live = self.root / "live"
        shutil.copytree(stage / "host", self.live)
        shutil.copytree(stage / "extension", self.live / "extension")

    def _make_live(self) -> Path:
        live = self.root / next(tempfile._get_candidate_names())
        stage = self.root / "stage"
        shutil.copytree(stage / "host", live)
        shutil.copytree(stage / "extension", live / "extension")
        return live

    def test_valid_probe_returns_only_allowlisted_success(self):
        self.assertEqual(
            run_update_probe(self.manifest, install_root=self.live),
            UpdateProbeResult(
                status="success",
                host_version=VERSION,
                extension_version=VERSION,
                capabilities=("prompt-scope-v1",),
            ),
        )

    def test_probe_failure_table(self):
        failures = (
            ("host-file", lambda: (self.live / "system_prompt.md").write_bytes(b"changed")),
            ("core-missing", lambda: (self.live / "system_prompt.md").unlink()),
            ("extension-version", lambda: (self.live / "extension/manifest.json").write_text('{"version":"9.9.9"}\n', encoding="utf-8")),
            ("manifest-malformed", lambda: self.manifest.write_bytes(b"{}\n")),
        )
        expected = UpdateProbeResult(
            status="error",
            error_code="package_probe_failed",
        )
        for name, mutate in failures:
            with self.subTest(name=name):
                self.tearDown_probe_state()
                mutate()
                self.assertEqual(
                    run_update_probe(self.manifest, install_root=self.live),
                    expected,
                )

    def tearDown_probe_state(self):
        # Rebuild from the fixture bytes so each mutation is independent.
        if self.live.exists():
            shutil.rmtree(self.live)
        stage = self.root / "stage"
        shutil.copytree(stage / "host", self.live)
        shutil.copytree(stage / "extension", self.live / "extension")
        shutil.copy2(stage / "update-manifest.json", self.manifest)

    def test_manifest_parent_is_not_used_as_install_root(self):
        self.assertNotEqual(self.manifest.parent, self.live)
        self.assertEqual(
            run_update_probe(self.manifest, install_root=self.live).status,
            "success",
        )

    def test_unexpected_probe_exception_returns_fixed_failure(self):
        with patch(
            "install_integrity.load_update_manifest",
            side_effect=RuntimeError("SECRET-PROBE"),
        ):
            result = run_update_probe(self.manifest, install_root=self.live)
        self.assertEqual(
            result,
            UpdateProbeResult(status="error", error_code="package_probe_failed"),
        )
        self.assertNotIn("SECRET-PROBE", repr(result))

    def test_relinked_integrity_with_reserved_host_path_fails(self):
        live = self._make_live()
        integrity = load_release_integrity(live / "release-integrity.json")
        config = live / "config.json"
        changed_integrity = type(integrity)(
            schema_version=integrity.schema_version,
            package_version=integrity.package_version,
            required_capabilities=integrity.required_capabilities,
            provided_capabilities=integrity.provided_capabilities,
            chrome_version=integrity.chrome_version,
            chrome_version_name=integrity.chrome_version_name,
            host_files=tuple(sorted((*integrity.host_files, type(integrity.host_files[0])(
                path="config.json",
                sha256=sha256_bytes(config.read_bytes()),
            )))),
            extension_files=integrity.extension_files,
        )
        integrity_bytes = canonical_json_bytes(
            release_integrity_to_dict(changed_integrity)
        )
        (live / "release-integrity.json").write_bytes(integrity_bytes)
        installed = load_installed_product(live / "installed-product.json")
        relinked = type(installed)(
            schema_version=installed.schema_version,
            package_version=installed.package_version,
            required_capabilities=installed.required_capabilities,
            provided_capabilities=installed.provided_capabilities,
            ownership_schema_version=installed.ownership_schema_version,
            legacy_allowlist_version=installed.legacy_allowlist_version,
            release_integrity_sha256=sha256_bytes(integrity_bytes),
        )
        (live / "installed-product.json").write_bytes(
            canonical_json_bytes(installed_product_to_dict(relinked))
        )
        self.assertEqual(
            InstallationVerifier(live, frozen=True).verify().integrity,
            "failed",
        )


if __name__ == "__main__":
    unittest.main()
