import ast
import ctypes
import inspect
import json
import os
import shutil
import stat
import tempfile
import threading
import unittest
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from install_integrity import UpdateProbeResult
from package_manifest import load_update_manifest
from product_info import VERSION
from native_registration import STATUS_HOST_NAME
from test_native_registration import MemoryRegistryBackend
from test_update_engine_host import TX, make_package
from test_update_support import FakeMutationMutex, InjectedCrash
from update_engine import UpdateEngine, UpdateEngineHooks
from update_journal import (
    JournalReason,
    InitiatingProcessIdentity,
    JournalPhase,
    TransactionPaths,
    TerminalVersion,
    UpdateInitiator,
    read_journal,
    terminal_version,
)
from update_platform import RUN_ONCE_VALUE_NAME, RetainedProcessHandle
from update_ownership import read_ownership_plan
from update_recovery import (
    FINALIZATION_CURSOR_STATES,
    FINALIZATION_RECEIPT_STATE,
    FinalizationCursor,
    FinalizationError,
    FinalizationFilesystem,
    FinalizationReceipt,
    OSFinalizationFilesystem,
    RecoveryController,
    RecoveryDependencies,
    RecoveryDiagnostics,
    RecoveryError,
    RunnerSource,
    TemporaryStagedProbeWorkspace,
    acknowledge_update_finalization,
    finalize_update_status,
    launch_active_recovery,
    launch_complete_update,
    install_recovery_tree,
    inventory_onedir,
    register_status_host,
    require_no_pending_finalization,
    receipt_from_terminal_journal,
    load_finalization_ack,
    load_finalization_cursor,
    load_finalization_receipt,
    _replace_finalization_file,
    _same_finalization_volume,
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


def inventory_files(root: Path) -> dict[str, bytes]:
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in root.rglob("*")
        if path.is_file()
    }


class MemoryRunOnceStore:
    def __init__(self):
        self.values = {}
        self.write_calls = []
        self.delete_calls = []

    def write_expand_string(self, name, value):
        self.write_calls.append((name, value))
        self.values[name] = ("REG_EXPAND_SZ", value)

    def read(self, name):
        return self.values.get(name)

    def delete(self, name):
        self.delete_calls.append(name)
        self.values.pop(name, None)


class RecordingStagedProbeWorkspace:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.create_calls = []
        self.remove_calls = []
        self.last_root = self.root

    def create(self, forbidden_roots):
        self.create_calls.append(tuple(forbidden_roots))
        self.root.mkdir()
        self.last_root = self.root
        return self.root

    def remove(self, root):
        self.remove_calls.append(root)
        shutil.rmtree(root)


class RecordingProbeProcess:
    def __init__(self, result):
        self.result = result
        self.results = []
        self.calls = []
        self.snapshots = []
        self.callback = None

    def run_probe(self, executable, manifest_path):
        self.calls.append(
            SimpleNamespace(executable=executable, manifest_path=manifest_path)
        )
        self.snapshots.append(inventory_files(executable.parent))
        if self.callback is not None:
            self.callback(executable, manifest_path)
        if self.results:
            return self.results.pop(0)
        return self.result


class NoopProcessAdapter:
    def __init__(self):
        self.opened_identities = []
        self.waited_identities = []
        self.closed_identities = []
        self.launched = []
        self.handle = None
        self.return_absent = False
        self.wait_result = True
        self.wait_error = None

    def capture_current_identity(self, expected_executable):
        raise AssertionError("capture not expected")

    def open_identity(self, identity, expected_executable):
        self.opened_identities.append(identity)
        if self.return_absent:
            return None
        if self.handle is not None:
            return self.handle
        return RetainedProcessHandle(
            identity=identity,
            executable=expected_executable,
            native_handle=501,
        )

    def wait(self, handle, timeout_seconds):
        self.waited_identities.append(handle.identity)
        if self.wait_error is not None:
            raise self.wait_error
        return self.wait_result

    def close(self, handle):
        if not handle.closed:
            handle.closed = True
            self.closed_identities.append(handle.identity)

    def launch_detached(self, executable, args, cwd):
        self.launched.append((executable, tuple(args), cwd))
        return InitiatingProcessIdentity(99, "win-create-time-99")


class NoopClock:
    def __init__(self):
        self.now = 0.0
        self.sleeps = []

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.now += seconds


class NonPathPathLike(os.PathLike[str]):
    def __init__(self, value: Path):
        self.value = value

    def __fspath__(self):
        return os.fspath(self.value)


class ReturningStagedProbeWorkspace:
    def __init__(self, value):
        self.value = value
        self.remove_calls = []

    def create(self, _forbidden_roots):
        return self.value

    def remove(self, root):
        self.remove_calls.append(root)


class FailingRemoveWorkspace(RecordingStagedProbeWorkspace):
    def remove(self, root):
        self.remove_calls.append(root)
        raise OSError("injected cleanup failure")


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


class StagedHostPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.install_root = self.root / "install"
        self.install_root.mkdir()
        self.package = make_package(self.root)
        self.mutex = FakeMutationMutex()
        self.engine = UpdateEngine(
            self.install_root,
            mutex_factory=lambda _root: self.mutex,
        )
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        self.paths = TransactionPaths.for_install(self.install_root, TX)
        self.journal = read_journal(self.paths.journal)
        self.ownership = read_ownership_plan(self.paths.ownership)
        self.manifest = load_update_manifest(self.paths.probe_manifest)
        self.success_result = UpdateProbeResult(
            status="success",
            host_version=self.journal.target_version,
            extension_version=self.journal.target_version,
            capabilities=self.manifest.provided_capabilities,
        )
        self.workspace = RecordingStagedProbeWorkspace(
            self.root / "staged-probe-view"
        )
        self.probe = RecordingProbeProcess(self.success_result)
        self.run_once = MemoryRunOnceStore()
        self.process = NoopProcessAdapter()
        self.events = []
        self.dependencies = RecoveryDependencies(
            process=self.process,
            probe_process=self.probe,
            staged_probe_workspace=self.workspace,
            run_once=self.run_once,
            clock=NoopClock(),
            mutex_factory=lambda _root: self.mutex,
            set_cwd=lambda _path: None,
            diagnostics=RecoveryDiagnostics(
                after_staged_probe_event=self.events.append
            ),
        )
        self.controller = RecoveryController(
            self.install_root, self.dependencies
        )

    def expected_combined_inventory(self):
        expected = {}
        for record in (
            *self.ownership.host_files,
            *self.ownership.metadata_files,
            *self.ownership.seed_files,
        ):
            expected[record.path] = (
                self.paths.staged_host / record.path
            ).read_bytes()
        for record in self.ownership.extension_files:
            expected[f"extension/{record.path}"] = (
                self.paths.staged_extension / record.path
            ).read_bytes()
        return expected

    def test_preflight_starts_combined_staged_frozen_target_before_activation(self):
        live_before = snapshot_tree(self.install_root)

        with mock.patch("update_recovery.UpdateEngine") as engine_class:
            result = self.controller.preflight_prepared_target(TX)

        self.assertEqual(result, self.success_result)
        call = self.probe.calls[0]
        self.assertEqual(call.executable.name, "dh_native_host.exe")
        self.assertNotEqual(call.executable.parent, self.paths.staged_host)
        self.assertFalse(call.executable.is_relative_to(self.install_root))
        self.assertEqual(
            call.manifest_path, self.paths.probe_manifest.resolve()
        )
        self.assertEqual(
            self.probe.snapshots[0], self.expected_combined_inventory()
        )
        self.assertFalse(self.workspace.last_root.exists())
        self.assertEqual(read_journal(self.paths.journal), self.journal)
        self.assertEqual(snapshot_tree(self.install_root), live_before)
        self.assertEqual(self.run_once.write_calls, [])
        engine_class.assert_not_called()
        self.assertEqual(self.events, ["create", "copy", "process", "remove"])

    def test_failed_preflight_leaves_prepared_inert(self):
        self.probe.result = UpdateProbeResult(
            status="error", error_code="package_probe_failed"
        )
        live_before = snapshot_tree(self.install_root)
        with mock.patch("update_recovery.UpdateEngine") as engine_class:
            with self.assertRaisesRegex(
                RecoveryError, "^staged_probe_failed$"
            ):
                self.controller.preflight_prepared_target(TX)
        self.assertEqual(read_journal(self.paths.journal).phase, JournalPhase.PREPARED)
        self.assertEqual(snapshot_tree(self.install_root), live_before)
        self.assertEqual(self.run_once.write_calls, [])
        engine_class.assert_not_called()
        self.assertFalse(self.workspace.last_root.exists())

    def test_staged_probe_workspace_receives_every_forbidden_root(self):
        self.controller.preflight_prepared_target(TX)
        self.assertEqual(
            self.workspace.create_calls,
            [(
                self.paths.install_root,
                self.paths.updates_root,
                self.paths.transaction_root,
                self.paths.staged_root,
                self.paths.probe_root,
            )],
        )

    def test_probe_time_staged_mutation_fails_before_any_activation_mutation(self):
        self.probe.callback = lambda _exe, _manifest: (
            self.paths.staged_host / "system_prompt.md"
        ).write_bytes(b"mutated-after-copy")
        live_before = snapshot_tree(self.install_root)
        with mock.patch("update_recovery.UpdateEngine") as engine_class:
            with self.assertRaisesRegex(
                RecoveryError, "^staged_probe_failed$"
            ):
                self.controller.preflight_prepared_target(TX)
        self.assertEqual(read_journal(self.paths.journal).phase, JournalPhase.PREPARED)
        self.assertEqual(self.run_once.write_calls, [])
        engine_class.assert_not_called()
        self.assertFalse(self.workspace.last_root.exists())
        self.assertNotEqual(snapshot_tree(self.install_root), live_before)

    def test_probe_time_staged_mutation_table_fails_before_activation(self):
        cases = (
            ("host", self.paths.staged_host / "system_prompt.md", b"mutated-host"),
            (
                "extension",
                self.paths.staged_extension / "assets/app.js",
                b"mutated-extension",
            ),
            (
                "metadata",
                self.paths.staged_host / "installed-product.json",
                b"mutated-metadata",
            ),
            ("added", self.paths.staged_host / "added.bin", b"added"),
        )
        for name, target, payload in cases:
            with self.subTest(name=name):
                existed = target.exists()
                original = target.read_bytes() if existed else None
                self.probe.callback = (
                    lambda _exe, _manifest, target=target, payload=payload:
                    target.write_bytes(payload)
                )
                with mock.patch("update_recovery.UpdateEngine") as engine_class:
                    with self.assertRaisesRegex(
                        RecoveryError, "^staged_probe_failed$"
                    ):
                        self.controller.preflight_prepared_target(TX)
                self.assertEqual(
                    read_journal(self.paths.journal).phase,
                    JournalPhase.PREPARED,
                )
                self.assertEqual(self.run_once.write_calls, [])
                engine_class.assert_not_called()
                self.assertFalse(self.workspace.last_root.exists())
                if existed:
                    target.write_bytes(original)
                else:
                    target.unlink()
                self.probe.callback = None
                self.probe.calls.clear()
                self.probe.snapshots.clear()
                self.events.clear()

    def test_probe_result_identity_mismatch_table_is_fixed_failure(self):
        cases = (
            replace(self.success_result, host_version="wrong"),
            replace(self.success_result, extension_version="wrong"),
            replace(self.success_result, capabilities=("wrong",)),
            replace(self.success_result, capabilities=()),
        )
        for result in cases:
            with self.subTest(result=result):
                self.probe.result = result
                with self.assertRaisesRegex(
                    RecoveryError, "^staged_probe_failed$"
                ):
                    self.controller.preflight_prepared_target(TX)
                self.assertEqual(
                    read_journal(self.paths.journal).phase,
                    JournalPhase.PREPARED,
                )
                self.assertEqual(self.run_once.write_calls, [])
                self.assertFalse(self.workspace.last_root.exists())
                self.probe.calls.clear()
                self.probe.snapshots.clear()
                self.events.clear()

    def test_copy_process_and_cleanup_faults_are_fixed_and_inert(self):
        live_before = snapshot_tree(self.install_root)
        cases = ("copy", "process", "cleanup")
        for case in cases:
            with self.subTest(case=case):
                workspace = (
                    FailingRemoveWorkspace(self.root / "cleanup-view")
                    if case == "cleanup"
                    else RecordingStagedProbeWorkspace(
                        self.root / f"{case}-view"
                    )
                )
                dependencies = replace(
                    self.dependencies,
                    staged_probe_workspace=workspace,
                )
                controller = RecoveryController(
                    self.install_root, dependencies
                )
                copy_patch = (
                    mock.patch(
                        "update_recovery._copy_plain_file",
                        side_effect=OSError("injected copy failure"),
                    )
                    if case == "copy"
                    else mock.patch("update_recovery._copy_plain_file", wraps=__import__("update_recovery")._copy_plain_file)
                )
                process_error = self.probe.callback
                if case == "process":
                    self.probe.callback = lambda *_args: (_ for _ in ()).throw(
                        OSError("injected process failure")
                    )
                with copy_patch, mock.patch(
                    "update_recovery.UpdateEngine"
                ) as engine_class, self.assertRaisesRegex(
                    RecoveryError, "^staged_probe_failed$"
                ):
                    controller.preflight_prepared_target(TX)
                self.probe.callback = process_error
                self.assertEqual(
                    read_journal(self.paths.journal).phase,
                    JournalPhase.PREPARED,
                )
                self.assertEqual(self.run_once.write_calls, [])
                engine_class.assert_not_called()
                self.assertEqual(snapshot_tree(self.install_root), live_before)
                if case in ("copy", "process"):
                    self.assertFalse(workspace.last_root.exists())
                self.probe.calls.clear()
                self.probe.snapshots.clear()
                self.events.clear()

    def test_workspace_adapter_rejects_wrong_type_or_escaping_root_before_copy_or_cleanup(self):
        outside = self.root / "outside"
        outside.mkdir()
        values = (
            os.fspath(outside),
            NonPathPathLike(outside),
            self.paths.staged_root / ".." / self.paths.probe_root.name,
        )
        for value in values:
            with self.subTest(value_type=type(value).__name__):
                workspace = ReturningStagedProbeWorkspace(value)
                dependencies = replace(
                    self.dependencies, staged_probe_workspace=workspace
                )
                controller = RecoveryController(
                    self.install_root, dependencies
                )
                with mock.patch(
                    "update_recovery._materialize_staged_probe_root"
                ) as materialize, self.assertRaisesRegex(
                    RecoveryError, "^staged_probe_failed$"
                ):
                    controller.preflight_prepared_target(TX)
                materialize.assert_not_called()
                self.assertEqual(workspace.remove_calls, [])
                self.assertEqual(self.run_once.write_calls, [])


class RecoveryFixture:
    initiator = UpdateInitiator.BROWSER

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.install_root = self.root / "install"
        self.install_root.mkdir()
        self.package = make_package(self.root)
        self.mutex = FakeMutationMutex()
        self.prior_version = None
        if self.initiator is UpdateInitiator.BROWSER:
            shutil.copytree(
                self.package.stage_root / "host",
                self.install_root,
                dirs_exist_ok=True,
            )
            shutil.copytree(
                self.package.stage_root / "extension",
                self.install_root / "extension",
            )
            self.prior_version = VERSION
        self.preparer = UpdateEngine(
            self.install_root,
            mutex_factory=lambda _root: self.mutex,
        )
        self.preparer.create_prepared(
            self.package,
            TX,
            expected_version=(
                VERSION if self.initiator is UpdateInitiator.BROWSER else None
            ),
            prior_version=self.prior_version,
            initiator=self.initiator,
        )
        self.paths = TransactionPaths.for_install(self.install_root, TX)
        self.manifest = load_update_manifest(self.paths.probe_manifest)
        self.success = UpdateProbeResult(
            status="success",
            host_version=VERSION,
            extension_version=VERSION,
            capabilities=self.manifest.provided_capabilities,
        )
        self.probe = RecordingProbeProcess(self.success)
        self.workspace = RecordingStagedProbeWorkspace(
            self.root / "probe-view"
        )
        self.run_once = MemoryRunOnceStore()
        self.process = NoopProcessAdapter()
        self.cwd_calls = []
        self.events = []
        self.clock = NoopClock()
        self.dependencies = RecoveryDependencies(
            process=self.process,
            probe_process=self.probe,
            staged_probe_workspace=self.workspace,
            run_once=self.run_once,
            clock=self.clock,
            mutex_factory=lambda _root: self.mutex,
            set_cwd=self.cwd_calls.append,
            diagnostics=RecoveryDiagnostics(
                after_staged_probe_event=self.events.append,
                after_recovery_setup_event=self.events.append,
            ),
        )
        self.controller = RecoveryController(
            self.install_root, self.dependencies
        )
        source = (
            self.install_root
            if self.initiator is UpdateInitiator.BROWSER
            else self.paths.staged_host
        )
        self.registry = (
            MemoryRegistryBackend()
            if self.initiator is UpdateInitiator.BROWSER
            else None
        )
        self.recovery = self.controller.prepare_recovery_runtime(
            TX, source, self.registry
        )
        self.probe.calls.clear()
        self.probe.snapshots.clear()
        self.events.clear()


class RecoveryRunnerTests(RecoveryFixture, unittest.TestCase):
    def test_prepare_runtime_order_and_browser_registry_contract(self):
        self.controller.prepare_recovery_runtime(
            TX, self.install_root, self.registry
        )
        self.assertEqual(
            self.events,
            [
                "create",
                "copy",
                "process",
                "remove",
                "tree-installed",
                "status-registered",
            ],
        )
        self.events.clear()
        self.probe.calls.clear()
        with self.assertRaisesRegex(RecoveryError, "^staged_probe_failed$"):
            self.controller.prepare_recovery_runtime(
                TX, self.install_root, None
            )
        self.assertEqual(self.events, [])
        self.assertEqual(self.probe.calls, [])

    def test_activation_persists_complete_identity_before_retained_wait(self):
        identity = InitiatingProcessIdentity(
            77, "win-create-time-133801632000000000"
        )
        result = self.controller.run_complete_update(TX, identity)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertEqual(result.initiating_process, identity)
        self.assertEqual(self.process.opened_identities, [identity])
        self.assertEqual(self.process.waited_identities, [identity])
        self.assertEqual(self.process.closed_identities, [identity])
        self.assertIsNone(self.run_once.read(RUN_ONCE_VALUE_NAME))

    def test_failed_staged_preflight_never_arms_or_activates(self):
        self.probe.result = UpdateProbeResult(
            status="error", error_code="package_probe_failed"
        )
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        before = read_journal(self.paths.journal)
        with self.assertRaisesRegex(RecoveryError, "^staged_probe_failed$"):
            self.controller.run_complete_update(TX, identity)
        self.assertEqual(read_journal(self.paths.journal), before)
        self.assertEqual(self.run_once.write_calls, [])
        self.assertEqual(self.process.opened_identities, [])

    def test_wrong_or_absent_browser_identity_leaves_prepared(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        self.process.return_absent = True
        with self.assertRaisesRegex(
            RecoveryError, "^initiating_process_identity_missing$"
        ):
            self.controller.run_complete_update(TX, identity)
        self.assertEqual(read_journal(self.paths.journal).phase, JournalPhase.PREPARED)
        self.assertEqual(self.run_once.write_calls, [])

    def test_wait_failure_maps_through_plan_b_rollback_and_closes_once(self):
        self.process.wait_result = False
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        result = self.controller.run_complete_update(TX, identity)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(result.original_failure_code, JournalReason.HOST_EXIT_WAIT_FAILED)
        self.assertEqual(self.process.closed_identities, [identity])
        self.assertIsNone(self.run_once.read(RUN_ONCE_VALUE_NAME))

    def test_interruption_after_arm_rearms_and_closes_retained_handle_once(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        diagnostics = replace(
            self.dependencies.diagnostics,
            after_journal_transition=lambda phase: (
                (_ for _ in ()).throw(InjectedCrash())
                if phase is JournalPhase.WAITING_FOR_HOST_EXIT
                else None
            ),
        )
        controller = RecoveryController(
            self.install_root,
            replace(self.dependencies, diagnostics=diagnostics),
        )
        with self.assertRaises(InjectedCrash):
            controller.run_complete_update(TX, identity)
        self.assertIsNotNone(self.run_once.read(RUN_ONCE_VALUE_NAME))
        self.assertEqual(self.process.closed_identities, [identity])
        self.assertEqual(read_journal(self.paths.journal).phase, JournalPhase.WAITING_FOR_HOST_EXIT)

    def test_duplicate_activation_preserves_original_identity(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        first = self.controller.run_complete_update(TX, identity)
        with self.assertRaisesRegex(RecoveryError, "^update_activation_failed$"):
            self.controller.run_complete_update(
                TX,
                InitiatingProcessIdentity(78, "win-create-time-78"),
            )
        self.assertEqual(read_journal(self.paths.journal).initiating_process, identity)
        self.assertEqual(first.phase, JournalPhase.COMMITTED)

    def test_recover_active_resets_cwd_and_opens_waiting_identity_once(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        self.preparer.activate_prepared(TX, identity)
        result = self.controller.recover_active()
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertEqual(self.cwd_calls, [self.paths.transaction_root.resolve()])
        self.assertEqual(self.process.opened_identities, [identity])
        self.assertEqual(self.process.waited_identities, [identity])

    def test_rollback_failed_retry_uses_persisted_original_failure(self):
        old_executable = (self.install_root / "dh_native_host.exe").read_bytes()
        self.probe.results = [
            self.success,
            UpdateProbeResult(status="error", error_code="package_probe_failed"),
        ]

        def remove_backup(label):
            if label == "restore-host:dh_native_host.exe":
                (self.paths.host_backup / "dh_native_host.exe").unlink(missing_ok=True)

        diagnostics = replace(
            self.dependencies.diagnostics,
            before_filesystem_operation=remove_backup,
        )
        controller = RecoveryController(
            self.install_root,
            replace(self.dependencies, diagnostics=diagnostics),
        )
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        failed = controller.run_complete_update(TX, identity)
        self.assertEqual(failed.phase, JournalPhase.RECOVERY_REQUIRED)
        self.assertEqual(failed.reason_code, JournalReason.ROLLBACK_FAILED)
        self.assertEqual(failed.original_failure_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertIsNotNone(self.run_once.read(RUN_ONCE_VALUE_NAME))

        self.paths.host_backup.mkdir(parents=True, exist_ok=True)
        (self.paths.host_backup / "dh_native_host.exe").write_bytes(old_executable)
        recovered = RecoveryController(
            self.install_root,
            replace(self.dependencies, diagnostics=RecoveryDiagnostics()),
        ).recover_active()
        self.assertEqual(recovered.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(recovered.original_failure_code, JournalReason.STARTUP_PROBE_FAILED)

    def test_manual_recovery_required_removes_run_once_without_retry(self):
        self.probe.results = [self.success, self.success]

        def corrupt_live(_executable, _manifest):
            if len(self.probe.calls) == 2:
                (self.install_root / "system_prompt.md").write_bytes(b"corrupt-live")

        self.probe.callback = corrupt_live
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        result = self.controller.run_complete_update(TX, identity)
        self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
        self.assertEqual(result.reason_code, JournalReason.MANUAL_RECOVERY_REQUIRED)
        self.assertIsNone(self.run_once.read(RUN_ONCE_VALUE_NAME))
        reread = self.controller.recover_active()
        self.assertEqual(reread, result)
        self.assertIsNone(self.run_once.read(RUN_ONCE_VALUE_NAME))

    def test_wait_until_ready_times_out_prepared_and_accepts_matching_waiting(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        with self.assertRaisesRegex(RecoveryError, "^update_activation_failed$"):
            self.controller.wait_until_ready(TX, identity, 0.1)
        self.assertGreaterEqual(self.clock.now, 0.1)
        self.preparer.activate_prepared(TX, identity)
        self.assertEqual(
            self.controller.wait_until_ready(TX, identity, 0).phase,
            JournalPhase.WAITING_FOR_HOST_EXIT,
        )

    def test_recover_journal_rejects_path_outside_exact_transaction(self):
        outside = self.root / "journal.json"
        outside.write_bytes(self.paths.journal.read_bytes())
        with self.assertRaisesRegex(RecoveryError, "^journal_outside_updates$"):
            self.controller.recover_journal(outside)

    def test_launch_helpers_use_canonical_transaction_cwd(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        launch_complete_update(
            self.process, self.recovery, self.paths, identity
        )
        self.assertEqual(
            self.process.launched[-1][2], self.paths.transaction_root.resolve()
        )
        launch_active_recovery(self.process, self.install_root)
        self.assertEqual(
            self.process.launched[-1][2], self.paths.transaction_root.resolve()
        )


class InstallerRecoveryTests(RecoveryFixture, unittest.TestCase):
    initiator = UpdateInitiator.INSTALLER

    def test_installer_activation_uses_null_identity_and_never_opens_or_waits(self):
        result = self.controller.run_installer_update(TX)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertIsNone(result.initiating_process)
        self.assertEqual(self.process.opened_identities, [])
        self.assertEqual(self.process.waited_identities, [])
        self.assertIsNone(self.run_once.read(RUN_ONCE_VALUE_NAME))

    def test_installed_probe_remains_commit_gate_after_staged_probe_passes(self):
        self.probe.results = [
            self.success,
            UpdateProbeResult(
                status="error", error_code="package_probe_failed"
            ),
        ]
        result = self.controller.run_installer_update(TX)
        self.assertEqual(len(self.probe.calls), 2)
        self.assertFalse(
            self.probe.calls[0].executable.is_relative_to(self.install_root)
        )
        self.assertEqual(
            self.probe.calls[1].executable,
            self.install_root / "dh_native_host.exe",
        )
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)

    def test_browser_and_installer_methods_reject_wrong_initiator(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-77")
        with self.assertRaises(RecoveryError):
            self.controller.run_complete_update(TX, identity)

    def test_prepare_runtime_order_and_installer_registry_contract(self):
        self.controller.prepare_recovery_runtime(
            TX, self.paths.staged_host, None
        )
        self.assertEqual(
            self.events,
            ["create", "copy", "process", "remove", "tree-installed"],
        )
        self.events.clear()
        self.probe.calls.clear()
        with self.assertRaisesRegex(RecoveryError, "^staged_probe_failed$"):
            self.controller.prepare_recovery_runtime(
                TX, self.paths.staged_host, MemoryRegistryBackend()
            )
        self.assertEqual(self.events, [])
        self.assertEqual(self.probe.calls, [])


class TerminalFixture:
    def __init__(
        self,
        root: Path,
        *,
        fresh_install: bool,
        rolled_back: bool,
    ):
        self.root = root
        self.install = root / "install"
        self.install.mkdir(parents=True)
        self.package = make_package(root)
        self.mutex = FakeMutationMutex()
        self.registry = MemoryRegistryBackend()
        self.finalize_factory_calls = []
        prior_version = None
        if not fresh_install:
            shutil.copytree(
                self.package.stage_root / "host",
                self.install,
                dirs_exist_ok=True,
            )
            shutil.copytree(
                self.package.stage_root / "extension",
                self.install / "extension",
            )
            prior_version = VERSION

        def probe(_root, _plan):
            if rolled_back:
                raise RuntimeError("fixed test probe failure")

        self.engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
            hooks=UpdateEngineHooks(probe_installed_product=probe),
        )
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=None,
            prior_version=prior_version,
            initiator=UpdateInitiator.INSTALLER,
        )
        self.engine.activate_prepared(TX, None)
        self.terminal = self.engine.resume(TX)
        expected_phase = (
            JournalPhase.ROLLED_BACK if rolled_back else JournalPhase.COMMITTED
        )
        if self.terminal.phase is not expected_phase:
            raise AssertionError(self.terminal)
        self.paths = TransactionPaths.for_install(self.install, TX)
        self.receipt_path = self.paths.updates_root / "receipts" / f"{TX}.json"
        self.cursor_path = self.paths.updates_root / "finalization-cursor.json"
        self.ack_path = self.paths.updates_root / "finalization-ack.json"

    def mutex_factory(self, _root):
        return self.mutex

    def engine_factory(self, root):
        self.finalize_factory_calls.append(root)
        return UpdateEngine(
            root,
            mutex_factory=lambda _root: self.mutex,
        )

    def finalize(self):
        return finalize_update_status(
            self.install,
            TX,
            self.registry,
            self.engine_factory,
            mutex_factory=self.mutex_factory,
        )

    def acknowledge(self):
        return acknowledge_update_finalization(
            self.install,
            TX,
            mutex_factory=self.mutex_factory,
        )

    def barrier(self):
        return require_no_pending_finalization(
            self.install,
            mutex_factory=self.mutex_factory,
        )


class FinalizationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

    def make_terminal(self, *, fresh=False, rolled_back=False):
        return TerminalFixture(
            self.root,
            fresh_install=fresh,
            rolled_back=rolled_back,
        )

    def test_finalization_filesystem_protocol_order_is_exact(self):
        self.assertEqual(
            tuple(
                name
                for name, value in FinalizationFilesystem.__dict__.items()
                if callable(value) and not name.startswith("_")
            ),
            (
                "atomic_write",
                "read",
                "exists",
                "has_atomic_scratch",
                "move_receipt_to_ack",
                "remove_cursor",
                "fsync_file",
                "fsync_directory",
            ),
        )

    def test_record_constructor_and_four_terminal_projection_table(self):
        valid = (
            ("committed", TerminalVersion(VERSION, False)),
            ("committed", TerminalVersion(VERSION, True)),
            ("rolled-back", TerminalVersion(VERSION, False)),
            ("rolled-back", TerminalVersion(None, True)),
        )
        for outcome, projected in valid:
            with self.subTest(outcome=outcome, projected=projected):
                receipt = FinalizationReceipt(TX, outcome, projected)
                self.assertEqual(receipt.terminal_version, projected)
                cursor = FinalizationCursor(
                    TX, outcome, projected, "receipt-ready"
                )
                self.assertEqual(cursor.terminal_version, projected)
        invalid = (
            ("committed", TerminalVersion(None, True)),
            ("committed", TerminalVersion(None, False)),
            ("rolled-back", TerminalVersion(None, False)),
            ("rolled-back", TerminalVersion(VERSION, True)),
        )
        for outcome, projected in invalid:
            with self.subTest(outcome=outcome, projected=projected):
                with self.assertRaises(FinalizationError):
                    FinalizationReceipt(TX, outcome, projected)
        self.assertEqual(
            FINALIZATION_CURSOR_STATES,
            frozenset({"reserved", "receipt-ready"}),
        )
        self.assertEqual(
            FINALIZATION_RECEIPT_STATE, "finalized-awaiting-ack"
        )

    def test_real_plan_b_four_way_terminal_projection_is_preserved(self):
        cases = (
            (False, False, TerminalVersion(VERSION, False)),
            (True, False, TerminalVersion(VERSION, True)),
            (False, True, TerminalVersion(VERSION, False)),
            (True, True, TerminalVersion(None, True)),
        )
        for index, (fresh, rolled_back, expected) in enumerate(cases):
            with self.subTest(fresh=fresh, rolled_back=rolled_back):
                fixture = TerminalFixture(
                    self.root / f"case-{index}",
                    fresh_install=fresh,
                    rolled_back=rolled_back,
                )
                self.assertEqual(terminal_version(fixture.terminal), expected)
                self.assertEqual(fixture.finalize().terminal_version, expected)

    def test_cursor_receipt_ready_precedes_plan_b_cleanup(self):
        fixture = self.make_terminal()
        receipt = fixture.finalize()
        self.assertEqual(
            receipt.to_dict(),
            {
                "outcome": "committed",
                "state": "finalized-awaiting-ack",
                "terminal_version": {
                    "fresh_install": False,
                    "version": VERSION,
                },
                "transactionId": TX,
            },
        )
        cursor = load_finalization_cursor(
            fixture.cursor_path, OSFinalizationFilesystem()
        )
        self.assertEqual(cursor.state, "receipt-ready")
        self.assertEqual(
            load_finalization_receipt(
                fixture.receipt_path, TX, OSFinalizationFilesystem()
            ),
            receipt,
        )
        self.assertFalse(fixture.paths.active.exists())
        self.assertFalse(fixture.paths.transaction_root.exists())
        self.assertEqual(fixture.finalize_factory_calls, [fixture.install])

    def test_lost_finalize_response_replays_same_receipt_without_second_source(self):
        fixture = self.make_terminal()
        first = fixture.finalize()
        first_bytes = fixture.receipt_path.read_bytes()
        second = fixture.finalize()
        self.assertEqual(second, first)
        self.assertEqual(fixture.receipt_path.read_bytes(), first_bytes)

    def test_different_transaction_is_blocked_while_cursor_pending(self):
        fixture = self.make_terminal()
        fixture.finalize()
        other = "f" * 32
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_ack_pending$"
        ):
            finalize_update_status(
                fixture.install,
                other,
                fixture.registry,
                lambda _root: self.fail("engine factory called"),
                mutex_factory=fixture.mutex_factory,
            )
        self.assertFalse(
            (fixture.paths.updates_root / "receipts" / f"{other}.json").exists()
        )

    def test_different_id_cursor_precedence_skips_registry_and_engine_factory(self):
        fixture = self.make_terminal()
        fixture.finalize()
        registry_before = dict(fixture.registry.values)
        calls = []
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_ack_pending$"
        ):
            finalize_update_status(
                fixture.install,
                "e" * 32,
                fixture.registry,
                lambda root: calls.append(root),
                mutex_factory=fixture.mutex_factory,
            )
        self.assertEqual(calls, [])
        self.assertEqual(fixture.registry.values, registry_before)

    def test_invalid_id_or_root_fails_before_mutex_and_filesystem_construction(self):
        fixture = self.make_terminal()
        mutex_calls = []
        with mock.patch(
            "update_recovery.OSFinalizationFilesystem"
        ) as filesystem_class:
            with self.assertRaises(FinalizationError):
                finalize_update_status(
                    fixture.install,
                    "bad-id",
                    fixture.registry,
                    fixture.engine_factory,
                    mutex_factory=lambda root: mutex_calls.append(root),
                )
            with self.assertRaises(FinalizationError):
                require_no_pending_finalization(
                    Path("relative"),
                    mutex_factory=lambda root: mutex_calls.append(root),
                )
        self.assertEqual(mutex_calls, [])
        filesystem_class.assert_not_called()

    def test_default_filesystem_is_constructed_only_inside_mutex(self):
        fixture = self.make_terminal()
        events = []

        class RecordingMutex:
            def __enter__(self):
                events.append("mutex-enter")
                return self

            def __exit__(self, exc_type, exc, traceback):
                events.append("mutex-exit")

        real_class = OSFinalizationFilesystem

        def create_filesystem():
            events.append("filesystem-construct")
            return real_class()

        with mock.patch(
            "update_recovery.OSFinalizationFilesystem",
            side_effect=create_filesystem,
        ):
            finalize_update_status(
                fixture.install,
                TX,
                fixture.registry,
                fixture.engine_factory,
                mutex_factory=lambda _root: RecordingMutex(),
            )
        self.assertLess(
            events.index("mutex-enter"), events.index("filesystem-construct")
        )
        self.assertLess(
            events.index("filesystem-construct"), events.index("mutex-exit")
        )

    def test_ack_atomically_moves_receipt_to_fixed_slot_then_opens_barrier(self):
        fixture = self.make_terminal()
        fixture.barrier()
        receipt = fixture.finalize()
        source_bytes = fixture.receipt_path.read_bytes()
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_ack_pending$"
        ):
            fixture.barrier()
        self.assertTrue(fixture.acknowledge())
        self.assertFalse(fixture.receipt_path.exists())
        self.assertFalse(fixture.cursor_path.exists())
        self.assertEqual(fixture.ack_path.read_bytes(), source_bytes)
        self.assertEqual(
            load_finalization_ack(
                fixture.ack_path, OSFinalizationFilesystem()
            ),
            receipt,
        )
        fixture.barrier()
        self.assertTrue(fixture.acknowledge())

    def test_ack_rejects_before_plan_b_cleanup_is_complete(self):
        fixture = self.make_terminal()
        receipt = receipt_from_terminal_journal(fixture.terminal)
        fs = OSFinalizationFilesystem()
        fixture.paths.updates_root.joinpath("receipts").mkdir()
        fs.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                TX,
                receipt.outcome,
                receipt.terminal_version,
                "receipt-ready",
            ).to_dict(),
        )
        fs.atomic_write(fixture.receipt_path, receipt.to_dict())
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_cleanup_incomplete$"
        ):
            fixture.acknowledge()
        self.assertTrue(fixture.receipt_path.exists())

    def test_strict_record_loaders_reject_noncanonical_duplicate_and_wrong_state(self):
        fixture = self.make_terminal()
        receipt = receipt_from_terminal_journal(fixture.terminal)
        fixture.paths.updates_root.joinpath("receipts").mkdir()
        fixture.receipt_path.write_bytes(
            json.dumps(receipt.to_dict(), indent=2).encode("utf-8")
        )
        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_receipt$"
        ):
            load_finalization_receipt(
                fixture.receipt_path, TX, OSFinalizationFilesystem()
            )
        fixture.receipt_path.write_bytes(
            b'{"outcome":"committed","outcome":"committed",'
            b'"state":"finalized-awaiting-ack",'
            b'"terminal_version":{"fresh_install":false,"version":"x"},'
            b'"transactionId":"0123456789abcdef0123456789abcdef"}\n'
        )
        with self.assertRaises(FinalizationError):
            load_finalization_receipt(
                fixture.receipt_path, TX, OSFinalizationFilesystem()
            )

    def test_reserved_cursor_only_reconstructs_receipt_on_same_id_replay(self):
        fixture = self.make_terminal()
        receipt = receipt_from_terminal_journal(fixture.terminal)
        fs = OSFinalizationFilesystem()
        fs.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                TX, receipt.outcome, receipt.terminal_version, "reserved"
            ).to_dict(),
        )
        replay = fixture.finalize()
        self.assertEqual(replay, receipt)
        self.assertTrue(fixture.receipt_path.exists())
        self.assertEqual(
            load_finalization_cursor(fixture.cursor_path, fs).state,
            "receipt-ready",
        )

    def test_receipt_ready_cursor_normalizes_receipt_scratch_only(self):
        fixture = self.make_terminal()
        receipt = receipt_from_terminal_journal(fixture.terminal)
        fs = OSFinalizationFilesystem()
        fs.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                TX,
                receipt.outcome,
                receipt.terminal_version,
                "receipt-ready",
            ).to_dict(),
        )
        fixture.paths.updates_root.joinpath("receipts").mkdir()
        scratch = fixture.receipt_path.with_name(
            f".{fixture.receipt_path.name}.tmp"
        )
        expected = json.dumps(
            receipt.to_dict(),
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8") + b"\n"
        scratch.write_bytes(expected[: len(expected) // 2])
        replay = fixture.finalize()
        self.assertEqual(replay, receipt)
        self.assertFalse(scratch.exists())
        self.assertEqual(
            load_finalization_receipt(fixture.receipt_path, TX, fs), receipt
        )

    def test_cursor_scratch_blocks_start_and_newer_finalization(self):
        fixture = self.make_terminal()
        receipt = receipt_from_terminal_journal(fixture.terminal)
        scratch = fixture.cursor_path.with_name(
            f".{fixture.cursor_path.name}.tmp"
        )
        expected = json.dumps(
            FinalizationCursor(
                TX, receipt.outcome, receipt.terminal_version, "reserved"
            ).to_dict(),
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8") + b"\n"
        scratch.write_bytes(expected[: len(expected) // 2])
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_ack_pending$"
        ):
            fixture.barrier()
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_ack_pending$"
        ):
            finalize_update_status(
                fixture.install,
                "f" * 32,
                fixture.registry,
                lambda _root: self.fail("engine factory called"),
                mutex_factory=fixture.mutex_factory,
            )
        fixture.finalize()
        self.assertFalse(scratch.exists())

    def test_post_move_replay_removes_cursor_without_recreating_receipt(self):
        fixture = self.make_terminal()
        receipt = fixture.finalize()
        os.replace(fixture.receipt_path, fixture.ack_path)
        self.assertTrue(fixture.acknowledge())
        self.assertFalse(fixture.receipt_path.exists())
        self.assertFalse(fixture.cursor_path.exists())
        self.assertEqual(
            load_finalization_ack(
                fixture.ack_path, OSFinalizationFilesystem()
            ),
            receipt,
        )

    def test_post_move_replay_refsyncs_ack_and_both_parents_before_cursor(self):
        fixture = self.make_terminal()
        fixture.finalize()
        os.replace(fixture.receipt_path, fixture.ack_path)
        fs = OSFinalizationFilesystem()
        with (
            mock.patch.object(fs, "fsync_file") as fsync_file,
            mock.patch.object(fs, "fsync_directory") as fsync_directory,
            mock.patch.object(
                fs,
                "remove_cursor",
                wraps=fs.remove_cursor,
            ) as remove_cursor,
        ):
            self.assertTrue(
                acknowledge_update_finalization(
                    fixture.install,
                    TX,
                    filesystem=fs,
                    mutex_factory=fixture.mutex_factory,
                )
            )
        fsync_file.assert_called_once_with(fixture.ack_path)
        self.assertIn(mock.call(fixture.receipt_path.parent), fsync_directory.call_args_list)
        self.assertIn(mock.call(fixture.ack_path.parent), fsync_directory.call_args_list)
        remove_cursor.assert_called_once_with(fixture.cursor_path)

    def test_cursor_scratch_with_matching_ack_replays_cleanup(self):
        fixture = self.make_terminal()
        receipt = fixture.finalize()
        os.replace(fixture.receipt_path, fixture.ack_path)
        fixture.cursor_path.unlink()
        scratch = fixture.cursor_path.with_name(
            f".{fixture.cursor_path.name}.tmp"
        )
        expected = json.dumps(
            FinalizationCursor(
                TX,
                receipt.outcome,
                receipt.terminal_version,
                "receipt-ready",
            ).to_dict(),
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8") + b"\n"
        scratch.write_bytes(expected[: len(expected) // 2])
        self.assertTrue(fixture.acknowledge())
        self.assertFalse(fixture.cursor_path.exists())
        self.assertFalse(scratch.exists())
        fixture.barrier()

    def test_cursor_removal_failure_keeps_barrier_and_replays(self):
        fixture = self.make_terminal()
        fixture.finalize()
        real_remove = OSFinalizationFilesystem.remove_cursor
        with mock.patch.object(
            OSFinalizationFilesystem,
            "remove_cursor",
            side_effect=OSError("injected cursor removal failure"),
        ):
            with self.assertRaisesRegex(
                FinalizationError, "^finalization_cleanup_failed$"
            ):
                fixture.acknowledge()
        self.assertTrue(fixture.cursor_path.exists())
        self.assertTrue(fixture.ack_path.exists())
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_ack_pending$"
        ):
            fixture.barrier()
        self.assertTrue(fixture.acknowledge())
        self.assertFalse(fixture.cursor_path.exists())

    def test_older_ack_replay_is_read_only_while_newer_cursor_exists(self):
        fixture = self.make_terminal()
        old_receipt = fixture.finalize()
        fixture.acknowledge()
        next_id = "f" * 32
        newer = FinalizationReceipt(
            next_id,
            "committed",
            TerminalVersion(VERSION, False),
        )
        fs = OSFinalizationFilesystem()
        fs.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                next_id,
                newer.outcome,
                newer.terminal_version,
                "receipt-ready",
            ).to_dict(),
        )
        fs.atomic_write(
            fixture.paths.updates_root / "receipts" / f"{next_id}.json",
            newer.to_dict(),
        )
        before_cursor = fixture.cursor_path.read_bytes()
        self.assertTrue(fixture.acknowledge())
        self.assertEqual(fixture.cursor_path.read_bytes(), before_cursor)
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, fs), old_receipt
        )

    def test_malformed_old_ack_does_not_block_valid_new_terminal_authority(self):
        fixture = self.make_terminal()
        fixture.ack_path.write_bytes(b"malformed-old-ack")
        receipt = fixture.finalize()
        self.assertEqual(receipt.transaction_id, TX)
        self.assertTrue(fixture.receipt_path.exists())
        self.assertTrue(fixture.cursor_path.exists())

    def test_ack_scratch_is_rejected_and_fixed_ack_alone_does_not_block_start(self):
        fixture = self.make_terminal()
        fixture.finalize()
        fixture.acknowledge()
        fixture.barrier()
        scratch = fixture.ack_path.with_name(f".{fixture.ack_path.name}.tmp")
        scratch.write_bytes(b"forbidden")
        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_acknowledgment$"
        ):
            fixture.acknowledge()

    def test_finalization_source_has_no_random_or_receipt_scan_or_direct_ack_write(self):
        source = Path("host/update_recovery.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        finalization_functions = {
            "_scratch_path",
            "_canonical_finalization_bytes",
            "_require_finalization_path",
            "_replace_finalization_file",
            "_same_finalization_volume",
            "_parse_finalization_value",
            "load_finalization_receipt",
            "load_finalization_cursor",
            "load_finalization_ack",
            "_ensure_receipts_directory",
            "_write_and_verify_cursor",
            "_write_and_verify_receipt",
            "_terminal_receipt_from_authority",
            "_terminal_cleanup_complete",
            "_finalization_paths",
            "finalize_update_status",
            "acknowledge_update_finalization",
            "require_no_pending_finalization",
        }
        forbidden = {
            "uuid4",
            "mkstemp",
            "NamedTemporaryFile",
            "rglob",
            "glob",
            "iterdir",
            "walk",
        }
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name in finalization_functions:
                calls = {
                    (
                        call.func.id
                        if isinstance(call.func, ast.Name)
                        else call.func.attr
                        if isinstance(call.func, ast.Attribute)
                        else ""
                    )
                    for call in ast.walk(node)
                    if isinstance(call, ast.Call)
                }
                self.assertFalse(calls & forbidden, node.name)
        acknowledge_source = inspect.getsource(acknowledge_update_finalization)
        self.assertNotIn("copy2", acknowledge_source)
        self.assertNotIn("unlink", acknowledge_source)
        self.assertIn("move_receipt_to_ack", acknowledge_source)
        production = Path("host/update_recovery.py").read_text(encoding="utf-8")
        self.assertEqual(production.count("os.replace(receipt_path, ack_path)"), 1)

    def test_finalization_test_class_map_and_move_owner_are_exact(self):
        tests = ast.parse(Path(__file__).read_text(encoding="utf-8"))
        unittest_classes = {
            node.name
            for node in tests.body
            if isinstance(node, ast.ClassDef)
            and any(
                (isinstance(base, ast.Attribute) and base.attr == "TestCase")
                or (isinstance(base, ast.Name) and base.id == "TestCase")
                for base in node.bases
            )
        }
        self.assertEqual(
            unittest_classes,
            {
                "RecoveryTreeTests",
                "StagedHostPreflightTests",
                "RecoveryRunnerTests",
                "InstallerRecoveryTests",
                "FinalizationTests",
                "FinalizationWindowsDurabilityTests",
            },
        )
        source = Path("host/update_recovery.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        owners = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef):
                continue
            if any(
                isinstance(call, ast.Call)
                and isinstance(call.func, ast.Attribute)
                and call.func.attr == "move_receipt_to_ack"
                for call in ast.walk(node)
            ):
                owners.append(node.name)
        self.assertEqual(owners, ["acknowledge_update_finalization"])

    def test_plan_c_never_directly_deletes_workspace_or_active(self):
        source = inspect.getsource(finalize_update_status)
        self.assertNotIn("unlink(", source)
        self.assertNotIn("rmtree(", source)
        self.assertIn("finalize_terminal_evidence", source)


class FakeMoveFunction:
    def __init__(self, success=True):
        self.success = success
        self.argtypes = None
        self.restype = None
        self.source = None
        self.target = None
        self.flags = None

    def __call__(self, source, target, flags):
        self.source = source
        self.target = target
        self.flags = flags
        return self.success


class FakeMoveFileApi:
    def __init__(self, success=True):
        self.MoveFileExW = FakeMoveFunction(success)


class FinalizationWindowsDurabilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.source = self.root / "source.json"
        self.target = self.root / "target.json"

    def test_replace_uses_replace_existing_and_write_through(self):
        api = FakeMoveFileApi(success=True)
        with mock.patch("update_recovery.os.name", "nt"):
            _replace_finalization_file(
                self.source, self.target, windows_api=api
            )
        self.assertEqual(api.MoveFileExW.flags, 0x00000001 | 0x00000008)
        self.assertEqual(api.MoveFileExW.source, str(self.source))
        self.assertEqual(api.MoveFileExW.target, str(self.target))

    def test_replace_failure_is_fixed(self):
        api = FakeMoveFileApi(success=False)
        with mock.patch("update_recovery.os.name", "nt"), self.assertRaisesRegex(
            OSError, "^finalization_replace_failed$"
        ):
            _replace_finalization_file(
                self.source, self.target, windows_api=api
            )

    def test_acknowledgment_uses_one_os_replace_from_receipt_to_fixed_slot(self):
        fs = OSFinalizationFilesystem()
        receipts = self.root / "updates/receipts"
        receipts.mkdir(parents=True)
        ack = self.root / "updates/finalization-ack.json"
        receipt = receipts / f"{TX}.json"
        receipt.write_bytes(b"receipt\n")
        with (
            mock.patch("update_recovery.os.replace") as replace_call,
            mock.patch(
                "update_recovery._same_finalization_volume", return_value=True
            ),
            mock.patch.object(fs, "fsync_file") as fsync_file,
            mock.patch.object(fs, "fsync_directory") as fsync_directory,
            mock.patch("update_recovery._lstat_plain"),
        ):
            fs.move_receipt_to_ack(receipt, ack)
        replace_call.assert_called_once_with(receipt, ack)
        fsync_file.assert_called_once_with(ack)
        self.assertEqual(
            fsync_directory.call_args_list,
            [mock.call(receipts), mock.call(ack.parent)],
        )

    def test_same_volume_uses_device_identity_without_following_symlinks(self):
        receipts = self.root / "updates/receipts"
        updates = self.root / "updates"
        with mock.patch(
            "update_recovery.os.stat",
            side_effect=(mock.Mock(st_dev=7), mock.Mock(st_dev=7)),
        ) as stat_call:
            self.assertTrue(_same_finalization_volume(receipts, updates))
        self.assertEqual(
            stat_call.call_args_list,
            [
                mock.call(receipts, follow_symlinks=False),
                mock.call(updates, follow_symlinks=False),
            ],
        )
        with mock.patch(
            "update_recovery.os.stat",
            side_effect=(mock.Mock(st_dev=7), mock.Mock(st_dev=8)),
        ):
            self.assertFalse(_same_finalization_volume(receipts, updates))

    def test_cross_volume_move_fails_before_replace(self):
        fs = OSFinalizationFilesystem()
        receipts = self.root / "updates/receipts"
        receipts.mkdir(parents=True)
        receipt = receipts / f"{TX}.json"
        receipt.write_bytes(b"receipt\n")
        ack = self.root / "updates/finalization-ack.json"
        with (
            mock.patch(
                "update_recovery._same_finalization_volume", return_value=False
            ),
            mock.patch("update_recovery.os.replace") as replace_call,
            mock.patch("update_recovery._lstat_plain"),
            self.assertRaisesRegex(OSError, "^finalization_replace_failed$"),
        ):
            fs.move_receipt_to_ack(receipt, ack)
        replace_call.assert_not_called()

    def test_ack_slot_has_no_atomic_write_or_scratch_path(self):
        fs = OSFinalizationFilesystem()
        updates = self.root / "updates"
        updates.mkdir()
        ack = updates / "finalization-ack.json"
        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_acknowledgment$"
        ):
            fs.atomic_write(ack, {"forbidden": True})
        self.assertFalse(fs.has_atomic_scratch(ack))


if __name__ == "__main__":
    unittest.main()
