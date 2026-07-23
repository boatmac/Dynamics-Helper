import shutil
import tempfile
import unittest
from pathlib import Path

from package_archive import validate_staged_package
from package_manifest import generate_release_documents, write_release_documents
from product_info import VERSION
from update_ownership import (
    OwnershipConflictError,
    OwnershipError,
    OwnershipSource,
    build_ownership_plan,
    ownership_plan_bytes,
    ownership_plan_sha256,
    ownership_plan_to_value,
    parse_ownership_plan,
    parse_ownership_plan_text,
    read_ownership_plan,
    validate_package_links,
    write_ownership_plan_atomic,
)


TX = "0123456789abcdef0123456789abcdef"


def make_package(root: Path):
    stage = root / "stage"
    files = {
        "host/dh_native_host.exe": b"new-host",
        "host/_internal/python313.dll": b"new-runtime",
        "host/system_prompt.md": b"new-core",
        "host/register.py": b"new-register",
        "host/config.json": b"{}\n",
        "extension/manifest.json": b'{"version":"2.0.74","version_name":"2.0.74-beta.4"}\n',
        "extension/assets/app.js": b"new-app",
        "installer_core.ps1": b"installer",
        "install.bat": b"wrapper",
    }
    for relative, payload in files.items():
        path = stage.joinpath(*relative.split("/"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
    documents = generate_release_documents(stage, VERSION)
    write_release_documents(stage, documents)
    return validate_staged_package(stage, expected_version=VERSION)


class ExceptionContractTests(unittest.TestCase):
    def test_ownership_errors_are_fixed(self):
        self.assertEqual(str(OwnershipError()), "update_ownership_invalid")
        self.assertEqual(str(OwnershipConflictError()), "update_ownership_conflict")


class PlanAContractTests(unittest.TestCase):
    def test_package_links_accept_current_target_and_reject_wrong_target(self):
        with tempfile.TemporaryDirectory() as directory:
            package = make_package(Path(directory))
            validate_package_links(package, expected_version=VERSION)
            with self.assertRaises(OwnershipError):
                validate_package_links(package, expected_version="9.9.9")


class OwnershipSerializationTests(unittest.TestCase):
    def test_plan_round_trips_canonically(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            package = make_package(root)
            install = root / "install"
            install.mkdir()
            plan = build_ownership_plan(
                package,
                install,
                TX,
                expected_version=VERSION,
                prior_version=None,
            )
            value = ownership_plan_to_value(plan)
            self.assertEqual(parse_ownership_plan(value), plan)
            self.assertEqual(
                parse_ownership_plan_text(ownership_plan_bytes(plan).decode("ascii")),
                plan,
            )
            path = root / "ownership.json"
            write_ownership_plan_atomic(path, plan)
            self.assertEqual(read_ownership_plan(path), plan)
            self.assertRegex(ownership_plan_sha256(plan), r"^[0-9a-f]{64}$")


class BuildOwnershipPlanTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.package = make_package(self.root)

    def test_fresh_empty_has_only_config_seed(self):
        install = self.root / "fresh"
        install.mkdir()
        plan = build_ownership_plan(
            self.package,
            install,
            TX,
            expected_version=VERSION,
            prior_version=None,
        )
        self.assertEqual(plan.source, OwnershipSource.FRESH)
        self.assertEqual(tuple(item.path for item in plan.seed_files), ("config.json",))
        self.assertFalse(plan.extension_was_present)
        self.assertFalse(plan.metadata_was_present)
        self.assertEqual(plan.prior_host_files, ())

    def test_fresh_preexisting_config_is_preserved_not_seeded(self):
        install = self.root / "fresh-config"
        install.mkdir()
        (install / "config.json").write_bytes(b"user")
        plan = build_ownership_plan(
            self.package,
            install,
            TX,
            expected_version=VERSION,
            prior_version=None,
        )
        self.assertEqual(plan.source, OwnershipSource.FRESH)
        self.assertEqual(plan.seed_files, ())
        self.assertEqual((install / "config.json").read_bytes(), b"user")

    def test_installed_pair_derives_exact_prior_product(self):
        install = self.root / "installed"
        shutil.copytree(self.package.stage_root / "host", install)
        shutil.copytree(self.package.stage_root / "extension", install / "extension")
        (install / "_internal" / "stale.dll").write_bytes(b"stale")
        plan = build_ownership_plan(
            self.package,
            install,
            TX,
            expected_version=VERSION,
            prior_version=VERSION,
        )
        self.assertEqual(plan.source, OwnershipSource.INSTALLED)
        self.assertTrue(plan.metadata_was_present)
        self.assertTrue(plan.extension_was_present)
        self.assertIn("_internal/stale.dll", {item.path for item in plan.prior_host_files})
        self.assertEqual(plan.seed_files, ())

    def test_half_metadata_is_not_legacy(self):
        install = self.root / "half"
        install.mkdir()
        shutil.copy2(
            self.package.stage_root / "host" / "installed-product.json",
            install,
        )
        with self.assertRaises(OwnershipError):
            build_ownership_plan(
                self.package,
                install,
                TX,
                expected_version=VERSION,
                prior_version=VERSION,
            )

    def test_legacy_uses_only_fixed_roots(self):
        install = self.root / "legacy"
        (install / "_internal").mkdir(parents=True)
        (install / "extension").mkdir()
        (install / "dh_native_host.exe").write_bytes(b"old-host")
        (install / "_internal" / "runtime.dll").write_bytes(b"old-runtime")
        (install / "system_prompt.md").write_bytes(b"old-core")
        (install / "register.py").write_bytes(b"old-register")
        (install / "extension" / "manifest.json").write_bytes(b"old-extension")
        (install / "unknown.txt").write_bytes(b"preserve")
        plan = build_ownership_plan(
            self.package,
            install,
            TX,
            expected_version=VERSION,
            prior_version="2.0.73",
        )
        self.assertEqual(plan.source, OwnershipSource.LEGACY_V1)
        self.assertNotIn("unknown.txt", {item.path for item in plan.prior_host_files})
        self.assertEqual((install / "unknown.txt").read_bytes(), b"preserve")
        self.assertEqual(plan.seed_files, ())


if __name__ == "__main__":
    unittest.main()
