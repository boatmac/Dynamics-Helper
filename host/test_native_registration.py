import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from native_registration import (
    ALLOWED_ORIGINS,
    BROWSER_KEY_PREFIXES,
    MAIN_HOST_NAME,
    STATUS_HOST_NAME,
    MainHostRuntime,
    WindowsRegistryBackend,
    register_main_host,
    register_status_manifest,
    unregister_host,
)


class MemoryRegistryBackend:
    def __init__(self):
        self.values = {}
        self.fail_write_prefix = None
        self.mismatch_after_write_prefix = None
        self._mismatch_active = False

    def read_native_host(self, key_prefix, name):
        value = self.values.get((key_prefix, name))
        if self._mismatch_active and key_prefix == self.mismatch_after_write_prefix:
            return Path("C:/wrong/readback.json")
        return value

    def write_native_host(self, key_prefix, name, manifest_path):
        if key_prefix == self.fail_write_prefix:
            self.fail_write_prefix = None
            raise OSError("injected write failure")
        self.values[(key_prefix, name)] = manifest_path.resolve(strict=False)
        if key_prefix == self.mismatch_after_write_prefix:
            self._mismatch_active = True

    def delete_native_host(self, key_prefix, name):
        self._mismatch_active = False
        self.values.pop((key_prefix, name), None)

    def get_native_host(self, name):
        values = tuple(
            self.values.get((prefix, name)) for prefix in BROWSER_KEY_PREFIXES
        )
        if values[0] != values[1]:
            raise AssertionError("split registry state")
        return values[0]


def make_source_host(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    (root / "launch_host.bat").write_bytes(b"@echo off\r\n")


def make_frozen_host(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    (root / "dh_native_host.exe").write_bytes(b"frozen-host")


def make_complete_recovery_tree(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    (root / "dh_update_runner.exe").write_bytes(b"runner")
    (root / "dh_update_status_host.exe").write_bytes(b"status")
    (root / "_internal").mkdir()
    (root / "_internal/python313.dll").write_bytes(b"runtime")


class NativeRegistrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "host"

    def test_source_registration_preserves_batch_and_host_manifest(self):
        make_source_host(self.root)
        registry = MemoryRegistryBackend()
        path = register_main_host(self.root, registry, MainHostRuntime.SOURCE)
        value = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(path, (self.root / "host_manifest.json").resolve())
        self.assertEqual(
            value["path"], str((self.root / "launch_host.bat").resolve())
        )
        self.assertEqual(registry.get_native_host(MAIN_HOST_NAME), path)

    def test_frozen_registration_uses_relative_executable_and_manifest(self):
        make_frozen_host(self.root)
        registry = MemoryRegistryBackend()
        path = register_main_host(self.root, registry, MainHostRuntime.FROZEN)
        value = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(path, (self.root / "manifest.json").resolve())
        self.assertEqual(value["path"], "dh_native_host.exe")

    def test_runtime_mode_never_silently_falls_back(self):
        make_source_host(self.root)
        with self.assertRaisesRegex(
            RuntimeError, "^main_host_executable_missing$"
        ):
            register_main_host(
                self.root,
                MemoryRegistryBackend(),
                MainHostRuntime.FROZEN,
            )

    def test_source_wrapper_forwards_browser_arguments(self):
        source = Path("host/launch_host.bat").read_text(encoding="utf-8")
        invocation = next(
            line
            for line in source.splitlines()
            if "dh_native_host.py" in line and "python.exe" in line
        )
        self.assertIn('"%~dp0dh_native_host.py" %*', invocation)

    def test_status_registration_requires_two_executables_and_internal(self):
        make_complete_recovery_tree(self.root)
        path = register_status_manifest(self.root, MemoryRegistryBackend())
        self.assertEqual(
            json.loads(path.read_bytes())["path"],
            "dh_update_status_host.exe",
        )

    def test_manifest_is_canonical_ascii_newline_without_bom(self):
        make_source_host(self.root)
        path = register_main_host(
            self.root, MemoryRegistryBackend(), MainHostRuntime.SOURCE
        )
        raw = path.read_bytes()
        self.assertFalse(raw.startswith(b"\xef\xbb\xbf"))
        self.assertTrue(raw.endswith(b"\n"))
        self.assertEqual(raw.count(b"\n"), 1)
        value = json.loads(raw)
        self.assertEqual(value["allowed_origins"], list(ALLOWED_ORIGINS))
        self.assertEqual(
            raw,
            (
                json.dumps(
                    value,
                    ensure_ascii=True,
                    allow_nan=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                + "\n"
            ).encode("utf-8"),
        )

    def test_split_brain_is_rejected_before_manifest_write(self):
        make_source_host(self.root)
        registry = MemoryRegistryBackend()
        registry.values[(BROWSER_KEY_PREFIXES[0], MAIN_HOST_NAME)] = Path(
            "C:/one.json"
        )
        registry.values[(BROWSER_KEY_PREFIXES[1], MAIN_HOST_NAME)] = Path(
            "C:/two.json"
        )
        with self.assertRaisesRegex(
            RuntimeError, "^native_registration_split_brain$"
        ):
            register_main_host(self.root, registry, MainHostRuntime.SOURCE)
        self.assertFalse((self.root / "host_manifest.json").exists())

    def test_partial_registry_failure_restores_registry_and_manifest(self):
        make_source_host(self.root)
        manifest = self.root / "host_manifest.json"
        manifest.write_bytes(b"prior-manifest")
        registry = MemoryRegistryBackend()
        prior = Path("C:/prior/manifest.json")
        for prefix in BROWSER_KEY_PREFIXES:
            registry.values[(prefix, MAIN_HOST_NAME)] = prior
        registry.fail_write_prefix = BROWSER_KEY_PREFIXES[1]
        with self.assertRaisesRegex(RuntimeError, "^native_registration_failed$"):
            register_main_host(self.root, registry, MainHostRuntime.SOURCE)
        self.assertEqual(manifest.read_bytes(), b"prior-manifest")
        self.assertEqual(registry.get_native_host(MAIN_HOST_NAME), prior)

    def test_registry_readback_mismatch_restores_prior_state(self):
        make_source_host(self.root)
        registry = MemoryRegistryBackend()
        registry.mismatch_after_write_prefix = BROWSER_KEY_PREFIXES[1]
        with self.assertRaisesRegex(RuntimeError, "^native_registration_failed$"):
            register_main_host(self.root, registry, MainHostRuntime.SOURCE)
        self.assertIsNone(registry.get_native_host(MAIN_HOST_NAME))
        self.assertFalse((self.root / "host_manifest.json").exists())

    def test_unregister_is_idempotent_and_rejects_split_brain(self):
        registry = MemoryRegistryBackend()
        unregister_host(registry, MAIN_HOST_NAME)
        unregister_host(registry, MAIN_HOST_NAME)
        registry.values[(BROWSER_KEY_PREFIXES[0], MAIN_HOST_NAME)] = Path(
            "C:/one.json"
        )
        with self.assertRaisesRegex(
            RuntimeError, "^native_registration_split_brain$"
        ):
            unregister_host(registry, MAIN_HOST_NAME)

    def test_missing_source_or_incomplete_status_runtime_is_rejected(self):
        self.root.mkdir(parents=True)
        with self.assertRaisesRegex(
            RuntimeError, "^source_host_launcher_missing$"
        ):
            register_main_host(
                self.root,
                MemoryRegistryBackend(),
                MainHostRuntime.SOURCE,
            )
        for missing in (
            "dh_update_runner.exe",
            "dh_update_status_host.exe",
            "_internal",
        ):
            with self.subTest(missing=missing):
                shutil_root = Path(self.temp.name) / f"status-{missing}"
                make_complete_recovery_tree(shutil_root)
                target = shutil_root / missing
                if target.is_dir():
                    for child in target.iterdir():
                        child.unlink()
                    target.rmdir()
                else:
                    target.unlink()
                with self.assertRaisesRegex(
                    RuntimeError, "^status_runtime_incomplete$"
                ):
                    register_status_manifest(
                        shutil_root, MemoryRegistryBackend()
                    )

    def test_status_empty_internal_is_rejected(self):
        make_complete_recovery_tree(self.root)
        (self.root / "_internal/python313.dll").unlink()
        with self.assertRaisesRegex(
            RuntimeError, "^status_runtime_incomplete$"
        ):
            register_status_manifest(self.root, MemoryRegistryBackend())


class FakeKey:
    def __init__(self, owner, subkey):
        self.owner = owner
        self.subkey = subkey

    def __enter__(self):
        self.owner.entered += 1
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.owner.exited += 1


class FakeWinreg:
    HKEY_CURRENT_USER = object()
    KEY_QUERY_VALUE = 1
    KEY_SET_VALUE = 2
    REG_SZ = 1

    def __init__(self):
        self.values = {}
        self.calls = []
        self.entered = 0
        self.exited = 0

    def CreateKeyEx(self, hive, subkey, reserved, access):
        self.calls.append(("create", hive, subkey, access))
        return FakeKey(self, subkey)

    def OpenKey(self, hive, subkey, reserved, access):
        self.calls.append(("open", hive, subkey, access))
        if subkey not in self.values:
            raise FileNotFoundError
        return FakeKey(self, subkey)

    def SetValueEx(self, key, name, reserved, kind, value):
        self.calls.append(("set", name, kind, value))
        self.values[key.subkey] = (value, kind)

    def QueryValueEx(self, key, name):
        self.calls.append(("query", name))
        return self.values[key.subkey]

    def DeleteKey(self, hive, subkey):
        self.calls.append(("delete", hive, subkey))
        if subkey not in self.values:
            raise FileNotFoundError
        del self.values[subkey]


class WindowsRegistrationSourceTests(unittest.TestCase):
    def test_lazy_adapter_uses_hkcu_reg_sz_both_browsers_and_contexts(self):
        fake = FakeWinreg()
        backend = WindowsRegistryBackend()
        path = Path("C:/manifest.json")
        with patch.dict(sys.modules, {"winreg": fake}):
            for prefix in BROWSER_KEY_PREFIXES:
                backend.write_native_host(prefix, MAIN_HOST_NAME, path)
                self.assertEqual(
                    backend.read_native_host(prefix, MAIN_HOST_NAME),
                    path.resolve(strict=False),
                )
            for prefix in BROWSER_KEY_PREFIXES:
                backend.delete_native_host(prefix, MAIN_HOST_NAME)
        self.assertEqual(fake.entered, fake.exited)
        self.assertGreater(fake.entered, 0)
        self.assertEqual(
            {call[1] for call in fake.calls if call[0] in ("create", "open")},
            {fake.HKEY_CURRENT_USER},
        )
        self.assertEqual(
            {call[2] for call in fake.calls if call[0] == "set"},
            {fake.REG_SZ},
        )
        called_subkeys = "\n".join(
            call[2]
            for call in fake.calls
            if call[0] in ("create", "open", "delete")
        )
        for prefix in BROWSER_KEY_PREFIXES:
            self.assertIn(prefix, called_subkeys)
        source = Path("host/native_registration.py").read_text(encoding="utf-8")
        self.assertNotIn("HKEY_LOCAL_MACHINE", source)


if __name__ == "__main__":
    unittest.main()
