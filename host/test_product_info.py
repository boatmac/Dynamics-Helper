import json
import re
import tempfile
import unittest
from contextlib import chdir
from pathlib import Path

import release_helper
from product_info import (
    PROVIDED_PROTOCOL_CAPABILITIES,
    REQUIRED_PROTOCOL_CAPABILITIES,
    VERSION,
    HostCapabilities,
    get_host_capabilities,
)
from test_update_support import current_extension_manifest_bytes
from update_service import normalize_update_version


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent


def _extension_versions() -> tuple[str, str]:
    package = json.loads(
        (REPOSITORY_ROOT / "extension/package.json").read_text(encoding="utf-8")
    )
    manifest = json.loads(
        (REPOSITORY_ROOT / "extension/manifest.json").read_text(encoding="utf-8")
    )
    return package["version"], manifest.get("version_name") or manifest["version"]


class TestProductInfo(unittest.TestCase):
    def test_transactional_update_capability_contract(self):
        self.assertEqual(REQUIRED_PROTOCOL_CAPABILITIES, ("prompt-scope-v1",))
        self.assertEqual(
            PROVIDED_PROTOCOL_CAPABILITIES,
            ("prompt-scope-v1", "transactional-update-v1"),
        )

    def test_projection_is_frozen_and_exact(self):
        actual = get_host_capabilities()
        self.assertEqual(
            actual,
            HostCapabilities(
                host_version=VERSION,
                required=("prompt-scope-v1",),
                provided=("prompt-scope-v1", "transactional-update-v1"),
            ),
        )
        with self.assertRaises((AttributeError, TypeError)):
            actual.host_version = "changed"

    def test_current_extension_manifest_fixture_tracks_the_real_carrier(self):
        manifest = json.loads(
            (REPOSITORY_ROOT / "extension/manifest.json").read_text(encoding="utf-8")
        )
        expected = {"version": manifest["version"]}
        if "version_name" in manifest:
            expected["version_name"] = manifest["version_name"]
        self.assertEqual(json.loads(current_extension_manifest_bytes()), expected)

    def test_authoritative_version_carriers_agree(self):
        with tempfile.TemporaryDirectory() as directory, chdir(directory):
            package_version, extension_version = _extension_versions()
            manifest = json.loads(
                (REPOSITORY_ROOT / "extension/manifest.json").read_text(
                    encoding="utf-8"
                )
            )
        self.assertEqual(package_version, VERSION)
        self.assertEqual(extension_version, VERSION)
        self.assertEqual(manifest["version"], VERSION.split("-", 1)[0])
        self.assertEqual(normalize_update_version(VERSION), VERSION)

    def test_release_helper_targets_all_authoritative_version_carriers(self):
        self.assertEqual(
            release_helper.PACKAGE_JSON.resolve(),
            REPOSITORY_ROOT / "extension/package.json",
        )
        self.assertEqual(
            release_helper.MANIFEST_JSON.resolve(),
            REPOSITORY_ROOT / "extension/manifest.json",
        )
        self.assertEqual(
            release_helper.HOST_FILE.resolve(), REPOSITORY_ROOT / "host/product_info.py"
        )

    def test_release_helper_does_not_retain_a_stale_host_version_source(self):
        source = Path(release_helper.__file__).read_text(encoding="utf-8")
        self.assertNotIn(
            'HOST_FILE = os.path.join(HOST_DIR, "dh_native_host.py")', source
        )
        self.assertIn('HOST_FILE = HOST_DIR / "product_info.py"', source)
        self.assertEqual(source.count("update_python_version(HOST_FILE, args.version)"), 1)
        self.assertNotRegex(
            (REPOSITORY_ROOT / "host/dh_native_host.py").read_text(encoding="utf-8"),
            re.compile(r'^VERSION\s*=\s*["\']', re.MULTILINE),
        )

    def test_update_python_version_changes_the_only_runtime_version_source(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "product_info.py"
            target.write_text(
                (REPOSITORY_ROOT / "host/product_info.py").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            release_helper.update_python_version(target, "9.9.9-test")
            self.assertIn(
                'VERSION = "9.9.9-test"',
                target.read_text(encoding="utf-8"),
            )


if __name__ == "__main__":
    unittest.main()
