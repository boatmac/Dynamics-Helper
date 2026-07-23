import os
import shutil
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from test_native_registration import MemoryRegistryBackend
from update_recovery import (
    RecoveryError,
    RunnerSource,
    install_recovery_tree,
    inventory_onedir,
    register_status_host,
    select_runner_source,
    validate_recovery_tree,
)


def make_complete_onedir(
    root: Path,
    *,
    marker: bytes = b"new",
    include_empty_directory: bool = False,
) -> Path:
    root.mkdir(parents=True)
    (root / "dh_native_host.exe").write_bytes(marker + b"-exe")
    internal = root / "_internal"
    (internal / "encodings").mkdir(parents=True)
    (internal / "python313.dll").write_bytes(marker + b"-runtime")
    (internal / "encodings/aliases.pyc").write_bytes(marker + b"-aliases")
    if include_empty_directory:
        (internal / "empty/nested").mkdir(parents=True)
    (root / "config.json").write_bytes(b"ignored-user-file")
    (root / "extension").mkdir()
    (root / "extension/ignored.js").write_bytes(b"ignored-extension")
    return root.resolve()


def snapshot_tree(root: Path) -> dict[str, tuple[str, bytes | None]]:
    if not root.exists():
        return {}
    result = {}
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_dir():
            result[relative] = ("directory", None)
        elif path.is_file():
            result[relative] = ("file", path.read_bytes())
        else:
            result[relative] = ("other", None)
    return result


class RecoveryTreeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

    def test_install_replaces_only_recovery_child_and_preserves_stable_active(self):
        source = make_complete_onedir(self.root / "source")
        updates = self.root / "install" / "updates"
        updates.mkdir(parents=True)
        active = updates / "active.json"
        active.write_bytes(b"stable-active\n")
        unrelated = updates / "unrelated.bin"
        unrelated.write_bytes(b"keep")

        recovery = install_recovery_tree(source, updates)

        self.assertEqual(active.read_bytes(), b"stable-active\n")
        self.assertEqual(unrelated.read_bytes(), b"keep")
        self.assertEqual(recovery, (updates / "recovery").resolve())
        self.assertFalse((recovery / "active.json").exists())
        self.assertTrue((recovery / "dh_update_runner.exe").is_file())
        self.assertTrue((recovery / "dh_update_status_host.exe").is_file())
        self.assertFalse((recovery / "config.json").exists())
        self.assertFalse((recovery / "extension").exists())

    def test_source_reparse_is_rejected_before_first_copy(self):
        source = make_complete_onedir(self.root / "source")
        with (
            mock.patch(
                "update_recovery._lstat_plain",
                side_effect=RecoveryError("unsupported_runner_entry"),
            ),
            mock.patch("update_recovery._copy_plain_file") as copied,
        ):
            with self.assertRaisesRegex(
                RecoveryError, "^unsupported_runner_entry$"
            ):
                install_recovery_tree(source, self.root / "updates")
        copied.assert_not_called()
        self.assertFalse((self.root / "updates").exists())

    def test_internal_is_defined_and_complete_before_copy(self):
        source = self.root / "source"
        source.mkdir()
        (source / "dh_native_host.exe").write_bytes(b"exe")
        with mock.patch("update_recovery._copy_plain_file") as copied:
            with self.assertRaisesRegex(
                RecoveryError, "^incomplete_onedir_runtime$"
            ):
                inventory_onedir(source)
        copied.assert_not_called()

    def test_copy_inventory_matches_every_internal_file_and_directory(self):
        source = make_complete_onedir(
            self.root / "source", include_empty_directory=True
        )
        expected = inventory_onedir(source)
        recovery = install_recovery_tree(source, self.root / "updates")
        self.assertEqual(validate_recovery_tree(recovery, expected), expected)
        self.assertIn("empty", expected.internal_directories)
        self.assertIn("empty/nested", expected.internal_directories)

    def test_explicit_source_selection_has_no_fallback(self):
        current = make_complete_onedir(self.root / "current", marker=b"current")
        staged = make_complete_onedir(self.root / "staged", marker=b"staged")
        self.assertEqual(
            select_runner_source(RunnerSource.CURRENT, current, staged), current
        )
        self.assertEqual(
            select_runner_source(RunnerSource.STAGED, current, staged), staged
        )
        current.rename(self.root / "current-missing")
        with self.assertRaises(RecoveryError):
            select_runner_source(RunnerSource.CURRENT, current, staged)
        with self.assertRaisesRegex(RecoveryError, "^invalid_runner_source$"):
            select_runner_source("current", current, staged)

    def test_missing_empty_or_nonregular_runtime_is_rejected(self):
        cases = ("missing-exe", "missing-internal", "empty-internal", "fifo-exe")
        for case in cases:
            with self.subTest(case=case):
                source = make_complete_onedir(self.root / case)
                if case == "missing-exe":
                    (source / "dh_native_host.exe").unlink()
                elif case == "missing-internal":
                    shutil.rmtree(source / "_internal")
                elif case == "empty-internal":
                    shutil.rmtree(source / "_internal")
                    (source / "_internal").mkdir()
                else:
                    with mock.patch(
                        "update_recovery._lstat_plain",
                        side_effect=RecoveryError("unsupported_runner_entry"),
                    ):
                        with self.assertRaisesRegex(
                            RecoveryError, "^unsupported_runner_entry$"
                        ):
                            inventory_onedir(source)
                    continue
                with self.assertRaisesRegex(
                    RecoveryError, "^incomplete_onedir_runtime$"
                ):
                    inventory_onedir(source)

    def test_descendant_reparse_or_unsupported_entry_is_rejected(self):
        source = make_complete_onedir(self.root / "source")
        target = source / "_internal/encodings/aliases.pyc"
        real_lstat = Path.lstat

        def reparse_lstat(path):
            info = real_lstat(path)
            if path == target:
                values = list(info)
                fake = mock.Mock(wraps=info)
                fake.st_mode = info.st_mode
                fake.st_file_attributes = getattr(
                    stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400
                )
                return fake
            return info

        with mock.patch.object(Path, "lstat", reparse_lstat):
            with self.assertRaisesRegex(
                RecoveryError, "^unsupported_runner_entry$"
            ):
                inventory_onedir(source)

    def test_existing_old_recovery_survives_copy_verify_and_rename_failures(self):
        failure_cases = (
            "copy",
            "verify",
            "first-rename",
            "second-rename",
        )
        for case in failure_cases:
            with self.subTest(case=case):
                base = self.root / case
                old_source = make_complete_onedir(base / "old-source", marker=b"old")
                new_source = make_complete_onedir(base / "new-source", marker=b"new")
                updates = base / "install/updates"
                old_recovery = install_recovery_tree(old_source, updates)
                before = snapshot_tree(old_recovery)
                active = updates / "active.json"
                active.write_bytes(b"active-before")

                if case == "copy":
                    patcher = mock.patch(
                        "update_recovery._copy_plain_file",
                        side_effect=OSError("copy failure"),
                    )
                elif case == "verify":
                    real_validate = validate_recovery_tree

                    def fail_new(path, expected=None):
                        if path.name.endswith(".new"):
                            raise RecoveryError("runner_copy_mismatch")
                        return real_validate(path, expected)

                    patcher = mock.patch(
                        "update_recovery.validate_recovery_tree",
                        side_effect=fail_new,
                    )
                else:
                    real_replace = os.replace
                    calls = []

                    def replace(source, destination):
                        calls.append((Path(source), Path(destination)))
                        if case == "first-rename" and len(calls) == 1:
                            raise OSError("first rename failure")
                        if case == "second-rename" and len(calls) == 2:
                            raise OSError("second rename failure")
                        return real_replace(source, destination)

                    patcher = mock.patch(
                        "update_recovery.os.replace", side_effect=replace
                    )

                with patcher, self.assertRaises(Exception):
                    install_recovery_tree(new_source, updates)

                self.assertEqual(snapshot_tree(old_recovery), before)
                self.assertEqual(active.read_bytes(), b"active-before")

    def test_stale_scratch_sibling_blocks_without_touching_old_recovery(self):
        old_source = make_complete_onedir(self.root / "old-source", marker=b"old")
        new_source = make_complete_onedir(self.root / "new-source", marker=b"new")
        updates = self.root / "install/updates"
        recovery = install_recovery_tree(old_source, updates)
        before = snapshot_tree(recovery)

        with mock.patch("update_recovery.uuid.uuid4") as token:
            token.return_value.hex = "fixed"
            stale = updates / ".recovery.fixed.old"
            stale.mkdir()
            (stale / "evidence.bin").write_bytes(b"stale")
            with self.assertRaises(Exception):
                install_recovery_tree(new_source, updates)

        self.assertEqual(snapshot_tree(recovery), before)
        self.assertEqual((stale / "evidence.bin").read_bytes(), b"stale")

    def test_existing_destination_reparse_is_rejected_before_replacement(self):
        source = make_complete_onedir(self.root / "source")
        updates = self.root / "install/updates"
        recovery = install_recovery_tree(source, updates)
        before = snapshot_tree(recovery)
        real_lstat = Path.lstat

        def reject_recovery(path):
            if path == recovery:
                raise RecoveryError("unsupported_runner_entry")
            return real_lstat(path)

        with mock.patch.object(Path, "lstat", reject_recovery):
            with self.assertRaisesRegex(
                RecoveryError, "^unsupported_runner_entry$"
            ):
                install_recovery_tree(source, updates)
        self.assertEqual(snapshot_tree(recovery), before)

    def test_validate_detects_byte_mismatch_and_extra_root_entry(self):
        source = make_complete_onedir(self.root / "source")
        expected = inventory_onedir(source)
        recovery = install_recovery_tree(source, self.root / "updates")
        (recovery / "_internal/python313.dll").write_bytes(b"corrupt")
        with self.assertRaisesRegex(RecoveryError, "^runner_copy_mismatch$"):
            validate_recovery_tree(recovery, expected)
        (recovery / "_internal/python313.dll").write_bytes(b"new-runtime")
        (recovery / "unexpected.bin").write_bytes(b"extra")
        with self.assertRaisesRegex(
            RecoveryError, "^unexpected_recovery_entry$"
        ):
            validate_recovery_tree(recovery)

    def test_status_registration_occurs_only_after_exact_validation(self):
        source = make_complete_onedir(self.root / "source")
        recovery = install_recovery_tree(source, self.root / "updates")
        registry = MemoryRegistryBackend()
        manifest = register_status_host(recovery, registry)
        self.assertEqual(manifest, recovery / "status-manifest.json")

        (recovery / "unexpected.bin").write_bytes(b"extra")
        other = MemoryRegistryBackend()
        with self.assertRaisesRegex(
            RecoveryError, "^unexpected_recovery_entry$"
        ):
            register_status_host(recovery, other)
        self.assertEqual(other.values, {})

    def test_invalid_updates_root_is_rejected_before_creation(self):
        source = make_complete_onedir(self.root / "source")
        invalid = self.root / "not-updates"
        with self.assertRaisesRegex(RecoveryError, "^invalid_updates_root$"):
            install_recovery_tree(source, invalid)
        self.assertFalse(invalid.exists())


if __name__ == "__main__":
    unittest.main()
