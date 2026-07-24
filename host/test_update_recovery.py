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
from package_archive import validate_staged_package
from product_info import PROVIDED_PROTOCOL_CAPABILITIES, VERSION
from release_helper import stage_release
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
from update_platform import (
    RUN_ONCE_VALUE_NAME,
    RetainedProcessHandle,
    SubprocessProbeAdapter,
)
from update_ownership import read_ownership_plan
from update_mutex import UpdateAlreadyInProgress
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
            hooks=UpdateEngineHooks(
                before_live_phase=lambda _phase, _paths, _plan: None,
                wait_for_initiating_host_exit=lambda _identity: None,
                probe_installed_product=probe,
            ),
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

    def create_next_terminal(self, transaction_id):
        engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
        )
        engine.create_prepared(
            self.package,
            transaction_id,
            expected_version=None,
            prior_version=VERSION,
            initiator=UpdateInitiator.INSTALLER,
        )
        engine.activate_prepared(transaction_id, None)
        terminal = engine.resume(transaction_id)
        if terminal.phase is not JournalPhase.COMMITTED:
            raise AssertionError(terminal)
        return terminal

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


FINALIZE_CRASH_EVENTS = (
    "cursor-reserved:scratch-create",
    "cursor-reserved:scratch-write",
    "cursor-reserved:file-fsync",
    "cursor-reserved:replace",
    "cursor-reserved:dir-fsync",
    "receipt:scratch-create",
    "receipt:scratch-write",
    "receipt:file-fsync",
    "receipt:replace",
    "receipt:dir-fsync",
    "cursor-receipt-ready:scratch-create",
    "cursor-receipt-ready:scratch-write",
    "cursor-receipt-ready:file-fsync",
    "cursor-receipt-ready:replace",
    "cursor-receipt-ready:dir-fsync",
)

ACKNOWLEDGE_CRASH_EVENTS = (
    "ack-move:before-replace",
    "ack-move:replace",
    "ack:file-fsync",
    "ack-move:source-dir-fsync",
    "ack-move:target-dir-fsync",
    "ack-replay:file-fsync",
    "ack-replay:source-dir-fsync",
    "ack-replay:target-dir-fsync",
    "cursor-replay:scratch-normalize",
    "cursor-replay:dir-fsync",
    "cursor:unlink",
    "cursor:delete-dir-fsync",
)

RECEIPTS_DIRECTORY_CRASH_EVENTS = (
    "receipts-directory:before-create",
    "receipts-directory:after-create",
    "receipts-directory:parent-fsync",
)

EXTERNAL_CLEANUP_CRASH_EVENTS = (
    "status:unregister",
    "engine:active-remove",
    "engine:finalize-terminal-evidence",
)


class CrashBoundaryFinalizationFilesystem(OSFinalizationFilesystem):
    def __init__(self):
        self.events = []
        self.crash_after = None
        self.fail_at = None
        self.cursor_replay_mode = False
        self.pause_after = None
        self.paused = threading.Event()
        self.release_pause = threading.Event()
        self.rollback_namespace_on_crash = False
        self.preoperation_namespaces = {}

    @staticmethod
    def _namespace(*paths):
        return {
            path: (
                ("file", path.read_bytes())
                if path.is_file()
                else ("directory", None)
                if path.is_dir()
                else ("absent", None)
            )
            for path in paths
        }

    def _event(self, label):
        self.events.append(label)
        if self.pause_after == label:
            self.paused.set()
            if not self.release_pause.wait(5):
                raise AssertionError("finalization pause timed out")
        if self.crash_after == label:
            raise InjectedCrash()
        if self.fail_at == label:
            raise OSError(f"injected finalization fault: {label}")

    @staticmethod
    def _bytes(value):
        return json.dumps(
            value,
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8") + b"\n"

    @staticmethod
    def _prefix(path, value):
        if path.name == "finalization-cursor.json":
            return f"cursor-{value['state']}"
        return "receipt"

    def atomic_write(self, path, value):
        self.exists(path)  # Apply the production path guard before test writes.
        expected = self._bytes(value)
        scratch = path.with_name(f".{path.name}.tmp")
        prefix = self._prefix(path, value)
        if scratch.exists() or scratch.is_symlink():
            existing = scratch.read_bytes()
            if not expected.startswith(existing):
                code = (
                    "invalid_finalization_cursor"
                    if path.name == "finalization-cursor.json"
                    else "invalid_finalization_receipt"
                )
                raise FinalizationError(code)
            if (
                self.cursor_replay_mode
                and path.name == "finalization-cursor.json"
                and not path.exists()
            ):
                original_scratch = existing
                before = self._namespace(scratch, path)
                self.preoperation_namespaces[
                    "cursor-replay:scratch-normalize"
                ] = before
                scratch.unlink()
                with scratch.open("xb") as stream:
                    stream.write(expected)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(scratch, path)
                try:
                    self._event("cursor-replay:scratch-normalize")
                except BaseException:
                    if self.rollback_namespace_on_crash:
                        path.unlink(missing_ok=True)
                        scratch.write_bytes(original_scratch)
                    raise
                self._event("cursor-replay:dir-fsync")
                return
            scratch.unlink()
        path.parent.mkdir(parents=True, exist_ok=True)
        with scratch.open("xb") as stream:
            self._event(f"{prefix}:scratch-create")
            midpoint = max(1, len(expected) // 2)
            stream.write(expected[:midpoint])
            self._event(f"{prefix}:scratch-write")
            stream.write(expected[midpoint:])
            stream.flush()
            os.fsync(stream.fileno())
            self._event(f"{prefix}:file-fsync")
        prior = path.read_bytes() if path.exists() else None
        self.preoperation_namespaces[f"{prefix}:replace"] = self._namespace(
            scratch, path
        )
        os.replace(scratch, path)
        try:
            self._event(f"{prefix}:replace")
        except BaseException:
            if self.rollback_namespace_on_crash:
                path.unlink(missing_ok=True)
                if prior is not None:
                    path.write_bytes(prior)
                scratch.write_bytes(expected)
            raise
        self._event(f"{prefix}:dir-fsync")

    def move_receipt_to_ack(self, source, target):
        if not self.exists(source):
            raise OSError("missing receipt")
        self.exists(target)
        source_bytes = source.read_bytes()
        target_bytes = target.read_bytes() if target.exists() else None
        before = self._namespace(source, target)
        self.preoperation_namespaces["ack-move:replace"] = before
        self.preoperation_namespaces["ack:file-fsync"] = before
        self._event("ack-move:before-replace")
        os.replace(source, target)
        try:
            self._event("ack-move:replace")
            self._event("ack:file-fsync")
        except BaseException:
            if self.rollback_namespace_on_crash:
                target.unlink(missing_ok=True)
                source.write_bytes(source_bytes)
                if target_bytes is not None:
                    target.write_bytes(target_bytes)
            raise
        self._event("ack-move:source-dir-fsync")
        self._event("ack-move:target-dir-fsync")

    def fsync_file(self, path):
        self._event("ack-replay:file-fsync")

    def fsync_directory(self, path):
        label = (
            "ack-replay:source-dir-fsync"
            if path.name == "receipts"
            else "ack-replay:target-dir-fsync"
        )
        self._event(label)

    def remove_cursor(self, path):
        if not self.exists(path):
            raise OSError("missing cursor")
        cursor_bytes = path.read_bytes()
        self.preoperation_namespaces["cursor:unlink"] = self._namespace(path)
        path.unlink()
        try:
            self._event("cursor:unlink")
        except BaseException:
            if self.rollback_namespace_on_crash:
                path.write_bytes(cursor_bytes)
            raise
        self._event("cursor:delete-dir-fsync")


class BlockingMutationMutex:
    def __init__(self):
        self.lock = threading.Lock()
        self.condition = threading.Condition()
        self.waiting = 0

    def __enter__(self):
        if not self.lock.acquire(blocking=False):
            with self.condition:
                self.waiting += 1
                self.condition.notify_all()
            self.lock.acquire()
            with self.condition:
                self.waiting -= 1
                self.condition.notify_all()
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.lock.release()

    def wait_for_waiters(self, count):
        with self.condition:
            return self.condition.wait_for(
                lambda: self.waiting >= count,
                timeout=5,
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

    @staticmethod
    def _scratch_for_boundary(fixture, boundary):
        target = (
            fixture.receipt_path
            if boundary.startswith("receipt:")
            else fixture.cursor_path
        )
        return target.with_name(f".{target.name}.tmp")

    @staticmethod
    def _ordinary_error_for_boundary(boundary):
        if boundary.startswith("receipt:"):
            return "invalid_finalization_receipt"
        if boundary.startswith("cursor-reserved:") or boundary.startswith(
            "cursor-receipt-ready:"
        ) or boundary.startswith("cursor-replay:"):
            return "invalid_finalization_cursor"
        return "finalization_cleanup_failed"

    @staticmethod
    def _assert_namespace(test_case, expected):
        for path, state in expected.items():
            kind, payload = state
            if kind == "absent":
                test_case.assertFalse(path.exists() or path.is_symlink())
            elif kind == "directory":
                test_case.assertTrue(path.is_dir())
            else:
                test_case.assertTrue(path.is_file())
                test_case.assertEqual(path.read_bytes(), payload)

    @staticmethod
    def finalize_with(fixture, filesystem, transaction_id=TX):
        return finalize_update_status(
            fixture.install,
            transaction_id,
            fixture.registry,
            fixture.engine_factory,
            filesystem=filesystem,
            mutex_factory=fixture.mutex_factory,
        )

    @staticmethod
    def acknowledge_with(fixture, filesystem, transaction_id=TX):
        return acknowledge_update_finalization(
            fixture.install,
            transaction_id,
            filesystem=filesystem,
            mutex_factory=fixture.mutex_factory,
        )

    @staticmethod
    def barrier_with(fixture, filesystem):
        return require_no_pending_finalization(
            fixture.install,
            filesystem=filesystem,
            mutex_factory=fixture.mutex_factory,
        )

    def assert_bounded_finalization_artifacts(self, fixture, transaction_id=TX):
        updates = fixture.paths.updates_root
        receipts = updates / "receipts"
        stable_receipts = sorted(receipts.glob("*.json")) if receipts.exists() else []
        receipt_scratch = (
            sorted(receipts.glob(".*.json.tmp")) if receipts.exists() else []
        )
        cursor = updates / "finalization-cursor.json"
        cursor_scratch = updates / ".finalization-cursor.json.tmp"
        ack = updates / "finalization-ack.json"
        ack_scratch = updates / ".finalization-ack.json.tmp"
        allowed_updates = {
            "active.json",
            "transactions",
            "recovery",
            "receipts",
            "finalization-cursor.json",
            ".finalization-cursor.json.tmp",
            "finalization-ack.json",
        }
        self.assertFalse(
            {
                child.name
                for child in updates.iterdir()
            }
            - allowed_updates
        )
        if receipts.exists():
            allowed_receipts = {
                f"{transaction_id}.json",
                f".{transaction_id}.json.tmp",
            }
            self.assertFalse(
                {child.name for child in receipts.iterdir()} - allowed_receipts
            )
        self.assertLessEqual(len(stable_receipts), 1)
        self.assertLessEqual(len(receipt_scratch), 1)
        self.assertFalse(ack_scratch.exists())
        if stable_receipts:
            self.assertEqual(stable_receipts[0].name, f"{transaction_id}.json")
        if receipt_scratch:
            self.assertEqual(
                receipt_scratch[0].name,
                f".{transaction_id}.json.tmp",
            )
        self.assertLessEqual(
            int(cursor.exists()) + int(cursor_scratch.exists()),
            2,
        )
        if not cursor.exists() and not cursor_scratch.exists():
            self.assertTrue(ack.exists())
            self.assertEqual(stable_receipts, [])
            self.assertEqual(receipt_scratch, [])

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

    def test_cursor_precedes_receipt_unregister_and_engine_cleanup(self):
        fixture = self.make_terminal()
        events = []

        class RecordingFilesystem(OSFinalizationFilesystem):
            publication = None

            def atomic_write(self, path, value):
                if path.name == "finalization-cursor.json":
                    self.publication = f"cursor-{value['state']}:dir-fsync"
                else:
                    self.publication = "receipt:dir-fsync"
                try:
                    super().atomic_write(path, value)
                finally:
                    self.publication = None

            def fsync_directory(self, path):
                super().fsync_directory(path)
                if self.publication is not None:
                    events.append(self.publication)

        def engine_factory(root):
            engine = fixture.engine_factory(root)

            class RecordingEngine:
                def finalize_terminal_evidence(self, transaction_id):
                    result = engine.finalize_terminal_evidence(transaction_id)
                    events.append("engine:finalize-terminal-evidence")
                    return result

            return RecordingEngine()

        def unregister(registry, name):
            __import__("native_registration").unregister_host(registry, name)
            events.append("status:unregister")

        with (
            mock.patch(
                "update_recovery.unregister_host",
                side_effect=unregister,
            ),
        ):
            finalize_update_status(
                fixture.install,
                TX,
                fixture.registry,
                engine_factory,
                filesystem=RecordingFilesystem(),
                mutex_factory=fixture.mutex_factory,
            )

        self.assertEqual(
            events,
            [
                "cursor-reserved:dir-fsync",
                "receipt:dir-fsync",
                "cursor-receipt-ready:dir-fsync",
                "status:unregister",
                "engine:finalize-terminal-evidence",
            ],
        )
        self.assertFalse(fixture.paths.active.exists())
        self.assertFalse(fixture.paths.transaction_root.exists())

    def test_first_receipt_directory_creation_fsyncs_updates_parent(self):
        fixture = self.make_terminal()
        filesystem = OSFinalizationFilesystem()
        real_fsync = filesystem.fsync_directory
        calls = []

        def record_fsync(path):
            calls.append(path)
            return real_fsync(path)

        with mock.patch.object(
            filesystem,
            "fsync_directory",
            side_effect=record_fsync,
        ):
            self.finalize_with(fixture, filesystem)

        self.assertEqual(
            calls[:4],
            [
                fixture.paths.updates_root,
                fixture.paths.updates_root,
                fixture.receipt_path.parent,
                fixture.paths.updates_root,
            ],
        )

    def test_receipts_directory_crash_table_replays_without_orphan(self):
        self.assertEqual(
            RECEIPTS_DIRECTORY_CRASH_EVENTS,
            (
                "receipts-directory:before-create",
                "receipts-directory:after-create",
                "receipts-directory:parent-fsync",
            ),
        )
        cases = (
            ("receipts-directory:before-create", False),
            ("receipts-directory:after-create", False),
            ("receipts-directory:after-create", True),
            ("receipts-directory:parent-fsync", False),
        )
        for index, (event, lose_directory) in enumerate(cases):
            with self.subTest(event=event, lose_directory=lose_directory):
                fixture = TerminalFixture(
                    self.root / f"receipts-directory-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )

                def crash(label):
                    if label == event:
                        if lose_directory:
                            fixture.receipt_path.parent.rmdir()
                        raise InjectedCrash()

                with (
                    mock.patch(
                        "update_recovery._after_finalization_event",
                        side_effect=crash,
                    ),
                    self.assertRaises(InjectedCrash),
                ):
                    fixture.finalize()

                self.assertTrue(fixture.cursor_path.exists())
                self.assertEqual(
                    load_finalization_cursor(
                        fixture.cursor_path,
                        OSFinalizationFilesystem(),
                    ).state,
                    "reserved",
                )
                self.assertFalse(fixture.receipt_path.exists())
                self.assertFalse(
                    fixture.receipt_path.with_name(
                        f".{fixture.receipt_path.name}.tmp"
                    ).exists()
                )
                if event == "receipts-directory:before-create" or lose_directory:
                    self.assertFalse(fixture.receipt_path.parent.exists())
                else:
                    self.assertTrue(fixture.receipt_path.parent.is_dir())
                replay = fixture.finalize()
                self.assertEqual(replay.transaction_id, TX)
                self.assertTrue(fixture.acknowledge())

    def test_external_cleanup_crash_table_replays_receipt_ready_evidence(self):
        self.assertEqual(
            EXTERNAL_CLEANUP_CRASH_EVENTS,
            (
                "status:unregister",
                "engine:active-remove",
                "engine:finalize-terminal-evidence",
            ),
        )
        for index, event in enumerate(EXTERNAL_CLEANUP_CRASH_EVENTS):
            with self.subTest(event=event):
                fixture = TerminalFixture(
                    self.root / f"external-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )
                filesystem = OSFinalizationFilesystem()

                class CrashAfterFirstDeleteRegistry(MemoryRegistryBackend):
                    def __init__(self):
                        super().__init__()
                        self.crash = event == "status:unregister"

                    def delete_native_host(self, prefix, name):
                        super().delete_native_host(prefix, name)
                        if self.crash:
                            self.crash = False
                            raise InjectedCrash()

                registry = CrashAfterFirstDeleteRegistry()
                manifest = fixture.install / "updates/recovery/status-manifest.json"
                manifest.parent.mkdir(parents=True, exist_ok=True)
                manifest.write_bytes(b"status-manifest")
                for prefix in __import__(
                    "native_registration"
                ).BROWSER_KEY_PREFIXES:
                    registry.values[(prefix, STATUS_HOST_NAME)] = manifest
                fixture.registry = registry

                class CrashingEngine:
                    def finalize_terminal_evidence(self, transaction_id):
                        if event == "engine:active-remove":
                            hooks = UpdateEngineHooks(
                                before_live_phase=lambda _phase, _paths, _plan: None,
                                wait_for_initiating_host_exit=lambda _identity: None,
                                probe_installed_product=lambda _path, _plan: None,
                                after_filesystem_operation=lambda label: (
                                    (_ for _ in ()).throw(InjectedCrash())
                                    if label == "active:remove"
                                    else None
                                ),
                            )
                            return UpdateEngine(
                                fixture.install,
                                mutex_factory=fixture.mutex_factory,
                                hooks=hooks,
                            ).finalize_terminal_evidence(transaction_id)
                        result = fixture.engine_factory(
                            fixture.install
                        ).finalize_terminal_evidence(transaction_id)
                        if event == "engine:finalize-terminal-evidence":
                            raise InjectedCrash()
                        return result

                with self.assertRaises(InjectedCrash):
                    finalize_update_status(
                        fixture.install,
                        TX,
                        fixture.registry,
                        lambda _root: CrashingEngine(),
                        filesystem=filesystem,
                        mutex_factory=fixture.mutex_factory,
                    )

                self.assertEqual(
                    load_finalization_cursor(
                        fixture.cursor_path, filesystem
                    ).state,
                    "receipt-ready",
                )
                self.assertTrue(fixture.receipt_path.exists())
                if event == "status:unregister":
                    values = tuple(
                        registry.read_native_host(prefix, STATUS_HOST_NAME)
                        for prefix in __import__(
                            "native_registration"
                        ).BROWSER_KEY_PREFIXES
                    )
                    self.assertEqual(sum(value is None for value in values), 1)
                    self.assertTrue(fixture.paths.active.exists())
                    self.assertTrue(fixture.paths.transaction_root.exists())
                elif event == "engine:active-remove":
                    self.assertFalse(fixture.paths.active.exists())
                    self.assertTrue(fixture.paths.transaction_root.exists())
                else:
                    self.assertFalse(fixture.paths.active.exists())
                    self.assertFalse(fixture.paths.transaction_root.exists())
                replay = fixture.finalize()
                self.assertEqual(replay.transaction_id, TX)
                self.assertTrue(
                    all(
                        registry.read_native_host(prefix, STATUS_HOST_NAME)
                        is None
                        for prefix in __import__(
                            "native_registration"
                        ).BROWSER_KEY_PREFIXES
                    )
                )
                self.assertTrue(fixture.acknowledge())

    def test_lost_finalize_response_replays_stable_receipt_after_engine_cleanup(self):
        fixture = self.make_terminal()
        first = fixture.finalize()
        receipt_bytes = fixture.receipt_path.read_bytes()

        second = fixture.finalize()

        self.assertEqual(second, first)
        self.assertEqual(fixture.receipt_path.read_bytes(), receipt_bytes)
        self.assertEqual(
            fixture.finalize_factory_calls,
            [fixture.install, fixture.install],
        )
        self.assertFalse(fixture.paths.active.exists())
        self.assertFalse(fixture.paths.transaction_root.exists())

    def test_same_id_finalize_replays_cursor_without_second_receipt(self):
        fixture = self.make_terminal()
        receipt = receipt_from_terminal_journal(fixture.terminal)
        filesystem = OSFinalizationFilesystem()
        filesystem.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                TX,
                receipt.outcome,
                receipt.terminal_version,
                "reserved",
            ).to_dict(),
        )
        fixture.receipt_path.parent.mkdir()
        filesystem.atomic_write(fixture.receipt_path, receipt.to_dict())
        receipt_bytes = fixture.receipt_path.read_bytes()
        real_atomic_write = filesystem.atomic_write
        writes = []

        def record_write(path, value):
            writes.append(path)
            real_atomic_write(path, value)

        with mock.patch.object(
            filesystem,
            "atomic_write",
            side_effect=record_write,
        ):
            second = finalize_update_status(
                fixture.install,
                TX,
                fixture.registry,
                fixture.engine_factory,
                filesystem=filesystem,
                mutex_factory=fixture.mutex_factory,
            )
        self.assertEqual(second, receipt)
        self.assertEqual(fixture.receipt_path.read_bytes(), receipt_bytes)
        self.assertEqual(writes, [fixture.cursor_path])
        self.assertEqual(
            load_finalization_cursor(fixture.cursor_path, filesystem).state,
            "receipt-ready",
        )

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

    def test_public_finalization_mutex_contention_is_fixed_pending(self):
        fixture = self.make_terminal()

        class ContendedMutex:
            def __enter__(self):
                raise UpdateAlreadyInProgress()

            def __exit__(self, exc_type, exc, traceback):
                return False

        class EnterFailureMutex:
            def __enter__(self):
                raise OSError("injected mutex enter failure")

            def __exit__(self, exc_type, exc, traceback):
                return False

        operations = (
            lambda: finalize_update_status(
                fixture.install,
                TX,
                fixture.registry,
                fixture.engine_factory,
                mutex_factory=lambda _root: ContendedMutex(),
            ),
            lambda: acknowledge_update_finalization(
                fixture.install,
                TX,
                mutex_factory=lambda _root: ContendedMutex(),
            ),
            lambda: require_no_pending_finalization(
                fixture.install,
                mutex_factory=lambda _root: ContendedMutex(),
            ),
        )
        for operation in operations:
            with self.assertRaisesRegex(
                FinalizationError, "^finalization_ack_pending$"
            ):
                operation()
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_cleanup_failed$"
        ):
            require_no_pending_finalization(
                fixture.install,
                mutex_factory=lambda _root: EnterFailureMutex(),
            )

    def test_finalization_mutex_exit_failure_is_cleanup_and_body_error_is_preserved(self):
        fixture = self.make_terminal()

        class ExitFailureMutex:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                raise OSError("injected mutex exit failure")

        with self.assertRaisesRegex(
            FinalizationError, "^finalization_cleanup_failed$"
        ):
            require_no_pending_finalization(
                fixture.install,
                mutex_factory=lambda _root: ExitFailureMutex(),
            )

        class PassThroughMutex:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

        class BodyFailureFilesystem(OSFinalizationFilesystem):
            def exists(self, path):
                raise FinalizationError("invalid_finalization_cursor")

        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_cursor$"
        ):
            require_no_pending_finalization(
                fixture.install,
                filesystem=BodyFailureFilesystem(),
                mutex_factory=lambda _root: PassThroughMutex(),
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

    def test_ack_normalizes_matching_receipt_scratch_before_opening_barrier(self):
        fixture = self.make_terminal()
        fixture.finalize()
        expected = fixture.receipt_path.read_bytes()
        scratch = fixture.receipt_path.with_name(
            f".{fixture.receipt_path.name}.tmp"
        )
        scratch.write_bytes(expected[: len(expected) // 2])

        self.assertTrue(fixture.acknowledge())

        self.assertFalse(scratch.exists())
        self.assertFalse(fixture.receipt_path.exists())
        self.assertFalse(fixture.cursor_path.exists())
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

    def test_same_id_replay_receipt_error_retains_preexisting_cursor(self):
        fixture = self.make_terminal()
        filesystem = OSFinalizationFilesystem()
        real_atomic_write = filesystem.atomic_write
        crash_after_reserved = True
        fail_receipt = False

        def faulting_write(path, value):
            nonlocal crash_after_reserved
            if fail_receipt and path == fixture.receipt_path:
                raise OSError("injected receipt creation failure")
            real_atomic_write(path, value)
            if (
                crash_after_reserved
                and path == fixture.cursor_path
                and value["state"] == "reserved"
            ):
                crash_after_reserved = False
                raise InjectedCrash()

        with mock.patch.object(
            filesystem,
            "atomic_write",
            side_effect=faulting_write,
        ):
            with self.assertRaises(InjectedCrash):
                finalize_update_status(
                    fixture.install,
                    TX,
                    fixture.registry,
                    fixture.engine_factory,
                    filesystem=filesystem,
                    mutex_factory=fixture.mutex_factory,
                )
        cursor_bytes = fixture.cursor_path.read_bytes()
        fail_receipt = True
        with mock.patch.object(
            filesystem,
            "atomic_write",
            side_effect=faulting_write,
        ):
            with self.assertRaisesRegex(
                FinalizationError, "^invalid_finalization_receipt$"
            ):
                finalize_update_status(
                    fixture.install,
                    TX,
                    fixture.registry,
                    fixture.engine_factory,
                    filesystem=filesystem,
                    mutex_factory=fixture.mutex_factory,
                )

        self.assertEqual(fixture.cursor_path.read_bytes(), cursor_bytes)
        self.assertFalse(fixture.receipt_path.exists())

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

    def test_ack_slot_replays_same_id_until_later_transaction_replaces_it(self):
        fixture = self.make_terminal()
        old_receipt = fixture.finalize()
        fixture.acknowledge()
        old_ack_bytes = fixture.ack_path.read_bytes()
        self.assertTrue(fixture.acknowledge())

        next_id = "f" * 32
        newer_terminal = fixture.create_next_terminal(next_id)
        newer = receipt_from_terminal_journal(newer_terminal)
        self.assertEqual(
            finalize_update_status(
                fixture.install,
                next_id,
                fixture.registry,
                fixture.engine_factory,
                mutex_factory=fixture.mutex_factory,
            ),
            newer,
        )

        newer_paths = TransactionPaths.for_install(fixture.install, next_id)
        newer_receipt_path = (
            newer_paths.updates_root / "receipts" / f"{next_id}.json"
        )
        self.assertEqual(fixture.ack_path.read_bytes(), old_ack_bytes)
        self.assertFalse(fixture.receipt_path.exists())
        self.assertTrue(newer_receipt_path.exists())

        cursor_bytes = fixture.cursor_path.read_bytes()
        self.assertTrue(fixture.acknowledge())
        self.assertEqual(fixture.cursor_path.read_bytes(), cursor_bytes)
        self.assertFalse(fixture.receipt_path.exists())
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, OSFinalizationFilesystem()),
            old_receipt,
        )

        self.assertTrue(
            acknowledge_update_finalization(
                fixture.install,
                next_id,
                mutex_factory=fixture.mutex_factory,
            )
        )
        self.assertFalse(newer_receipt_path.exists())
        self.assertFalse(fixture.receipt_path.exists())
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, OSFinalizationFilesystem()),
            newer,
        )
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_not_current$"
        ):
            fixture.acknowledge()

    def test_malformed_old_ack_does_not_block_valid_new_terminal_authority(self):
        fixture = self.make_terminal()
        fixture.ack_path.write_bytes(b"malformed-old-ack")
        receipt = fixture.finalize()
        self.assertEqual(receipt.transaction_id, TX)
        self.assertTrue(fixture.receipt_path.exists())
        self.assertTrue(fixture.cursor_path.exists())

    def test_ack_only_invalid_target_type_uses_fixed_ack_error(self):
        fixture = self.make_terminal()
        fixture.finalize()
        fixture.acknowledge()
        fixture.ack_path.unlink()
        fixture.ack_path.mkdir()

        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_acknowledgment$"
        ):
            fixture.acknowledge()

        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_acknowledgment$"
        ):
            fixture.finalize()

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

    def test_crash_boundary_table_replays_same_id_without_orphan(self):
        self.assertEqual(
            FINALIZE_CRASH_EVENTS,
            (
                "cursor-reserved:scratch-create",
                "cursor-reserved:scratch-write",
                "cursor-reserved:file-fsync",
                "cursor-reserved:replace",
                "cursor-reserved:dir-fsync",
                "receipt:scratch-create",
                "receipt:scratch-write",
                "receipt:file-fsync",
                "receipt:replace",
                "receipt:dir-fsync",
                "cursor-receipt-ready:scratch-create",
                "cursor-receipt-ready:scratch-write",
                "cursor-receipt-ready:file-fsync",
                "cursor-receipt-ready:replace",
                "cursor-receipt-ready:dir-fsync",
            ),
        )
        self.assertEqual(
            ACKNOWLEDGE_CRASH_EVENTS,
            (
                "ack-move:before-replace",
                "ack-move:replace",
                "ack:file-fsync",
                "ack-move:source-dir-fsync",
                "ack-move:target-dir-fsync",
                "ack-replay:file-fsync",
                "ack-replay:source-dir-fsync",
                "ack-replay:target-dir-fsync",
                "cursor-replay:scratch-normalize",
                "cursor-replay:dir-fsync",
                "cursor:unlink",
                "cursor:delete-dir-fsync",
            ),
        )
        for index, boundary in enumerate(
            (*FINALIZE_CRASH_EVENTS, *ACKNOWLEDGE_CRASH_EVENTS)
        ):
            with self.subTest(boundary=boundary):
                fixture = TerminalFixture(
                    self.root / f"crash-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )
                crashing = CrashBoundaryFinalizationFilesystem()
                if boundary in FINALIZE_CRASH_EVENTS:
                    crashing.crash_after = boundary
                    with self.assertRaises(InjectedCrash):
                        self.finalize_with(fixture, crashing)
                else:
                    self.finalize_with(fixture, crashing)
                    crashing.events.clear()
                    if boundary.startswith("cursor-replay:"):
                        os.replace(fixture.receipt_path, fixture.ack_path)
                        cursor_bytes = fixture.cursor_path.read_bytes()
                        fixture.cursor_path.unlink()
                        fixture.cursor_path.with_name(
                            f".{fixture.cursor_path.name}.tmp"
                        ).write_bytes(cursor_bytes[: len(cursor_bytes) // 2])
                        crashing.cursor_replay_mode = True
                    crashing.crash_after = boundary
                    with self.assertRaises(InjectedCrash):
                        self.acknowledge_with(fixture, crashing)

                if boundary.endswith(":scratch-create"):
                    scratch = self._scratch_for_boundary(fixture, boundary)
                    self.assertEqual(scratch.read_bytes(), b"")
                elif boundary.endswith(":scratch-write"):
                    scratch = self._scratch_for_boundary(fixture, boundary)
                    self.assertTrue(scratch.read_bytes())
                    self.assertFalse(scratch.read_bytes().endswith(b"\n"))

                self.assert_bounded_finalization_artifacts(fixture)
                cursor = fixture.cursor_path
                cursor_scratch = cursor.with_name(f".{cursor.name}.tmp")
                if cursor.exists() or cursor_scratch.exists():
                    with self.assertRaisesRegex(
                        FinalizationError, "^finalization_ack_pending$"
                    ):
                        self.barrier_with(
                            fixture, CrashBoundaryFinalizationFilesystem()
                        )

                restarted = CrashBoundaryFinalizationFilesystem()
                restarted.cursor_replay_mode = boundary.startswith(
                    "cursor-replay:"
                )
                if boundary in FINALIZE_CRASH_EVENTS:
                    self.finalize_with(fixture, restarted)
                self.assertTrue(self.acknowledge_with(fixture, restarted))
                self.assert_bounded_finalization_artifacts(fixture)
                self.assertFalse(fixture.cursor_path.exists())
                self.assertFalse(
                    fixture.cursor_path.with_name(
                        f".{fixture.cursor_path.name}.tmp"
                    ).exists()
                )
                self.assertFalse(fixture.receipt_path.exists())
                self.assertTrue(fixture.ack_path.exists())
                self.barrier_with(fixture, CrashBoundaryFinalizationFilesystem())

    def test_replace_and_unlink_crashes_accept_preoperation_namespace(self):
        rollback_boundaries = (
            "cursor-reserved:replace",
            "receipt:replace",
            "cursor-receipt-ready:replace",
            "ack-move:replace",
            "ack:file-fsync",
            "cursor-replay:scratch-normalize",
            "cursor:unlink",
        )
        for index, boundary in enumerate(rollback_boundaries):
            with self.subTest(boundary=boundary):
                fixture = TerminalFixture(
                    self.root / f"rollback-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )
                crashing = CrashBoundaryFinalizationFilesystem()
                crashing.crash_after = boundary
                crashing.rollback_namespace_on_crash = True
                if boundary in FINALIZE_CRASH_EVENTS:
                    with self.assertRaises(InjectedCrash):
                        self.finalize_with(fixture, crashing)
                else:
                    crashing.crash_after = None
                    self.finalize_with(fixture, crashing)
                    crashing.events.clear()
                    if boundary == "cursor-replay:scratch-normalize":
                        os.replace(fixture.receipt_path, fixture.ack_path)
                        cursor_bytes = fixture.cursor_path.read_bytes()
                        fixture.cursor_path.unlink()
                        fixture.cursor_path.with_name(
                            f".{fixture.cursor_path.name}.tmp"
                        ).write_bytes(cursor_bytes[: len(cursor_bytes) // 2])
                        crashing.cursor_replay_mode = True
                    crashing.crash_after = boundary
                    with self.assertRaises(InjectedCrash):
                        self.acknowledge_with(fixture, crashing)

                self.assertIn(boundary, crashing.preoperation_namespaces)
                self._assert_namespace(
                    self,
                    crashing.preoperation_namespaces[boundary],
                )
                self.assert_bounded_finalization_artifacts(fixture)
                restarted = CrashBoundaryFinalizationFilesystem()
                restarted.cursor_replay_mode = (
                    boundary == "cursor-replay:scratch-normalize"
                )
                if boundary in FINALIZE_CRASH_EVENTS:
                    self.finalize_with(fixture, restarted)
                self.assertTrue(self.acknowledge_with(fixture, restarted))
                self.assertFalse(fixture.cursor_path.exists())
                self.assertFalse(fixture.receipt_path.exists())
                self.assertTrue(fixture.ack_path.exists())

    def test_ordinary_fault_boundary_table_remains_bounded_and_replays(self):
        for index, boundary in enumerate(
            (*FINALIZE_CRASH_EVENTS, *ACKNOWLEDGE_CRASH_EVENTS)
        ):
            with self.subTest(boundary=boundary):
                fixture = TerminalFixture(
                    self.root / f"fault-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )
                faulting = CrashBoundaryFinalizationFilesystem()
                if boundary in FINALIZE_CRASH_EVENTS:
                    faulting.fail_at = boundary
                    with self.assertRaises(FinalizationError) as raised:
                        self.finalize_with(fixture, faulting)
                else:
                    self.finalize_with(fixture, faulting)
                    faulting.events.clear()
                    if boundary.startswith("cursor-replay:"):
                        os.replace(fixture.receipt_path, fixture.ack_path)
                        cursor_bytes = fixture.cursor_path.read_bytes()
                        fixture.cursor_path.unlink()
                        fixture.cursor_path.with_name(
                            f".{fixture.cursor_path.name}.tmp"
                        ).write_bytes(cursor_bytes[: len(cursor_bytes) // 2])
                        faulting.cursor_replay_mode = True
                    faulting.fail_at = boundary
                    with self.assertRaises(FinalizationError) as raised:
                        self.acknowledge_with(fixture, faulting)

                self.assertEqual(
                    raised.exception.error_code,
                    self._ordinary_error_for_boundary(boundary),
                )

                self.assert_bounded_finalization_artifacts(fixture)
                restarted = CrashBoundaryFinalizationFilesystem()
                restarted.cursor_replay_mode = boundary.startswith(
                    "cursor-replay:"
                )
                if boundary in FINALIZE_CRASH_EVENTS:
                    self.finalize_with(fixture, restarted)
                self.assertTrue(self.acknowledge_with(fixture, restarted))
                self.assertFalse(fixture.cursor_path.exists())
                self.assertFalse(fixture.receipt_path.exists())
                self.assertTrue(fixture.ack_path.exists())

    def test_ack_receipt_scratch_normalization_fault_table_replays(self):
        receipt_events = tuple(
            event for event in FINALIZE_CRASH_EVENTS if event.startswith("receipt:")
        )
        for index, (fault_kind, boundary) in enumerate(
            (kind, event)
            for kind in ("crash", "ordinary")
            for event in receipt_events
        ):
            with self.subTest(fault_kind=fault_kind, boundary=boundary):
                fixture = TerminalFixture(
                    self.root / f"ack-receipt-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )
                filesystem = CrashBoundaryFinalizationFilesystem()
                self.finalize_with(fixture, filesystem)
                expected = fixture.receipt_path.read_bytes()
                fixture.receipt_path.with_name(
                    f".{fixture.receipt_path.name}.tmp"
                ).write_bytes(expected[: len(expected) // 2])
                filesystem.events.clear()
                if fault_kind == "crash":
                    filesystem.crash_after = boundary
                    with self.assertRaises(InjectedCrash):
                        self.acknowledge_with(fixture, filesystem)
                else:
                    filesystem.fail_at = boundary
                    with self.assertRaises(FinalizationError) as raised:
                        self.acknowledge_with(fixture, filesystem)
                    self.assertEqual(
                        raised.exception.error_code,
                        "invalid_finalization_receipt",
                    )

                scratch = fixture.receipt_path.with_name(
                    f".{fixture.receipt_path.name}.tmp"
                )
                if boundary == "receipt:scratch-create":
                    self.assertEqual(scratch.read_bytes(), b"")
                elif boundary == "receipt:scratch-write":
                    self.assertTrue(scratch.read_bytes())
                    self.assertFalse(scratch.read_bytes().endswith(b"\n"))

                self.assert_bounded_finalization_artifacts(fixture)
                restarted = CrashBoundaryFinalizationFilesystem()
                self.assertTrue(self.acknowledge_with(fixture, restarted))
                self.assertFalse(fixture.cursor_path.exists())
                self.assertFalse(fixture.receipt_path.exists())
                self.assertFalse(
                    fixture.receipt_path.with_name(
                        f".{fixture.receipt_path.name}.tmp"
                    ).exists()
                )
                self.assertTrue(fixture.ack_path.exists())

    def test_ack_receipt_normalization_replace_accepts_preoperation_namespace(self):
        fixture = self.make_terminal()
        filesystem = CrashBoundaryFinalizationFilesystem()
        self.finalize_with(fixture, filesystem)
        expected = fixture.receipt_path.read_bytes()
        scratch = fixture.receipt_path.with_name(
            f".{fixture.receipt_path.name}.tmp"
        )
        scratch.write_bytes(expected[: len(expected) // 2])
        filesystem.events.clear()
        filesystem.crash_after = "receipt:replace"
        filesystem.rollback_namespace_on_crash = True

        with self.assertRaises(InjectedCrash):
            self.acknowledge_with(fixture, filesystem)

        self.assertIn("receipt:replace", filesystem.preoperation_namespaces)
        self._assert_namespace(
            self,
            filesystem.preoperation_namespaces["receipt:replace"],
        )
        self.assert_bounded_finalization_artifacts(fixture)
        restarted = CrashBoundaryFinalizationFilesystem()
        self.assertTrue(self.acknowledge_with(fixture, restarted))
        self.assertFalse(fixture.receipt_path.exists())
        self.assertFalse(scratch.exists())
        self.assertTrue(fixture.ack_path.exists())

    def test_bounded_artifact_assertion_rejects_unknown_and_orphan_scratch(self):
        fixture = self.make_terminal()
        fixture.finalize()
        unknown = fixture.paths.updates_root / "unexpected-finalization.bin"
        unknown.write_bytes(b"unexpected")
        with self.assertRaises(AssertionError):
            self.assert_bounded_finalization_artifacts(fixture)
        unknown.unlink()
        fixture.acknowledge()
        orphan = fixture.receipt_path.with_name(
            f".{fixture.receipt_path.name}.tmp"
        )
        orphan.write_bytes(b"orphan")
        with self.assertRaises(AssertionError):
            self.assert_bounded_finalization_artifacts(fixture)

    def test_concurrent_different_finalize_reserves_only_one_cursor(self):
        fixture = self.make_terminal()
        fixture.mutex = BlockingMutationMutex()
        crash_hooks = UpdateEngineHooks(
            before_live_phase=lambda _phase, _paths, _plan: None,
            wait_for_initiating_host_exit=lambda _identity: None,
            probe_installed_product=lambda _path, _plan: None,
            after_filesystem_operation=lambda label: (
                (_ for _ in ()).throw(InjectedCrash())
                if label == "active:remove"
                else None
            ),
        )
        crash_cleanup = UpdateEngine(
            fixture.install,
            mutex_factory=fixture.mutex_factory,
            hooks=crash_hooks,
        )
        with self.assertRaises(InjectedCrash):
            crash_cleanup.finalize_terminal_evidence(TX)
        self.assertFalse(fixture.paths.active.exists())
        self.assertTrue(fixture.paths.transaction_root.exists())
        next_id = "f" * 32
        fixture.create_next_terminal(next_id)
        next_paths = TransactionPaths.for_install(fixture.install, next_id)
        self.assertTrue(next_paths.active.exists())
        self.assertTrue(next_paths.transaction_root.exists())
        filesystem = CrashBoundaryFinalizationFilesystem()
        filesystem.pause_after = "cursor-reserved:dir-fsync"
        results = {}
        first_started = threading.Event()
        second_started = threading.Event()

        def run_first():
            first_started.set()
            try:
                results["first"] = self.finalize_with(
                    fixture, filesystem, next_id
                )
            except BaseException as error:
                results["first"] = error

        def run_second():
            second_started.set()
            try:
                results["second"] = finalize_update_status(
                    fixture.install,
                    TX,
                    fixture.registry,
                    lambda _root: self.fail("second engine factory called"),
                    filesystem=filesystem,
                    mutex_factory=fixture.mutex_factory,
                )
            except BaseException as error:
                results["second"] = error

        first = threading.Thread(target=run_first)
        first.start()
        self.assertTrue(first_started.wait(5))
        self.assertTrue(filesystem.paused.wait(5))
        second = threading.Thread(target=run_second)
        second.start()
        self.assertTrue(second_started.wait(5))
        self.assertTrue(fixture.mutex.wait_for_waiters(1))
        self.assertTrue(second.is_alive())
        self.assertNotIn("second", results)
        self.assertFalse(
            (
                fixture.paths.updates_root
                / "receipts"
                / f"{TX}.json"
            ).exists()
        )
        filesystem.release_pause.set()
        first.join(5)
        second.join(5)
        self.assertFalse(first.is_alive())
        self.assertFalse(second.is_alive())
        self.assertIsInstance(results["first"], FinalizationReceipt)
        self.assertEqual(results["first"].transaction_id, next_id)
        self.assertIsInstance(results["second"], FinalizationError)
        self.assertEqual(
            results["second"].error_code,
            "finalization_ack_pending",
        )

    def test_ack_replace_holds_mutex_until_cursor_cleanup(self):
        fixture = self.make_terminal()
        fixture.mutex = BlockingMutationMutex()
        filesystem = CrashBoundaryFinalizationFilesystem()
        self.finalize_with(fixture, filesystem)
        filesystem.events.clear()
        filesystem.pause_after = "ack-move:replace"
        results = {}

        def run_ack():
            try:
                results["ack"] = self.acknowledge_with(fixture, filesystem)
            except BaseException as error:
                results["ack"] = error

        def run_barrier():
            try:
                results["barrier"] = self.barrier_with(fixture, filesystem)
            except BaseException as error:
                results["barrier"] = error

        def run_newer():
            try:
                results["newer"] = self.finalize_with(
                    fixture, filesystem, "f" * 32
                )
            except BaseException as error:
                results["newer"] = error

        acknowledge_thread = threading.Thread(target=run_ack)
        acknowledge_thread.start()
        self.assertTrue(filesystem.paused.wait(5))
        barrier_thread = threading.Thread(target=run_barrier)
        newer_thread = threading.Thread(target=run_newer)
        barrier_thread.start()
        newer_thread.start()
        self.assertTrue(fixture.mutex.wait_for_waiters(2))
        self.assertTrue(barrier_thread.is_alive())
        self.assertTrue(newer_thread.is_alive())
        self.assertNotIn("barrier", results)
        self.assertNotIn("newer", results)
        filesystem.release_pause.set()
        acknowledge_thread.join(5)
        barrier_thread.join(5)
        newer_thread.join(5)
        self.assertFalse(acknowledge_thread.is_alive())
        self.assertFalse(barrier_thread.is_alive())
        self.assertFalse(newer_thread.is_alive())
        self.assertIs(results["ack"], True)
        self.assertIsNone(results["barrier"])
        self.assertIsInstance(results["newer"], FinalizationError)
        self.assertEqual(
            results["newer"].error_code,
            "active_transaction_mismatch",
        )
        self.assertFalse(
            (
                fixture.paths.updates_root
                / "receipts"
                / f"{'f' * 32}.json"
            ).exists()
        )

    def test_cursor_scratch_with_old_ack_blocks_different_finalization(self):
        fixture = self.make_terminal()
        receipt = fixture.finalize()
        fixture.acknowledge()
        scratch = fixture.cursor_path.with_name(
            f".{fixture.cursor_path.name}.tmp"
        )
        cursor = FinalizationCursor(
            TX,
            receipt.outcome,
            receipt.terminal_version,
            "receipt-ready",
        )
        scratch.write_bytes(
            json.dumps(
                cursor.to_dict(),
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
        )
        before = snapshot_tree(fixture.paths.updates_root)

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

        self.assertEqual(snapshot_tree(fixture.paths.updates_root), before)

    def test_newer_cursor_scratch_replays_despite_older_ack_slot(self):
        fixture = self.make_terminal()
        fixture.finalize()
        fixture.acknowledge()
        old_ack = fixture.ack_path.read_bytes()
        next_id = "f" * 32
        terminal = fixture.create_next_terminal(next_id)
        receipt = receipt_from_terminal_journal(terminal)
        cursor = FinalizationCursor(
            next_id,
            receipt.outcome,
            receipt.terminal_version,
            "reserved",
        )
        scratch = fixture.cursor_path.with_name(
            f".{fixture.cursor_path.name}.tmp"
        )
        encoded = json.dumps(
            cursor.to_dict(),
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8") + b"\n"
        scratch.write_bytes(encoded[: len(encoded) // 2])

        replay = finalize_update_status(
            fixture.install,
            next_id,
            fixture.registry,
            fixture.engine_factory,
            mutex_factory=fixture.mutex_factory,
        )

        self.assertEqual(replay, receipt)
        self.assertEqual(fixture.ack_path.read_bytes(), old_ack)
        self.assertTrue(
            (
                fixture.paths.updates_root
                / "receipts"
                / f"{next_id}.json"
            ).exists()
        )
        self.assertEqual(
            load_finalization_cursor(
                fixture.cursor_path,
                OSFinalizationFilesystem(),
            ).state,
            "receipt-ready",
        )

    def test_wrong_id_precedence_table_preserves_records(self):
        fixture = self.make_terminal()
        old_receipt = fixture.finalize()
        fixture.acknowledge()
        ack_only = snapshot_tree(fixture.paths.updates_root)
        self.assertTrue(fixture.acknowledge())
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_not_current$"
        ):
            acknowledge_update_finalization(
                fixture.install,
                "f" * 32,
                mutex_factory=fixture.mutex_factory,
            )
        self.assertEqual(snapshot_tree(fixture.paths.updates_root), ack_only)

        fixture.ack_path.write_bytes(b"malformed")
        malformed = snapshot_tree(fixture.paths.updates_root)
        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_acknowledgment$"
        ):
            fixture.acknowledge()
        self.assertEqual(snapshot_tree(fixture.paths.updates_root), malformed)
        fixture.ack_path.write_bytes(
            json.dumps(
                old_receipt.to_dict(),
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
            + b"\n"
        )

        next_id = "f" * 32
        next_receipt = FinalizationReceipt(
            next_id,
            "committed",
            TerminalVersion(VERSION, False),
        )
        fs = OSFinalizationFilesystem()
        fs.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                next_id,
                next_receipt.outcome,
                next_receipt.terminal_version,
                "receipt-ready",
            ).to_dict(),
        )
        fs.atomic_write(
            fixture.paths.updates_root / "receipts" / f"{next_id}.json",
            next_receipt.to_dict(),
        )
        cursor_and_old_ack = snapshot_tree(fixture.paths.updates_root)
        self.assertTrue(fixture.acknowledge())
        self.assertEqual(
            snapshot_tree(fixture.paths.updates_root), cursor_and_old_ack
        )

        fixture.cursor_path.unlink()
        (
            fixture.paths.updates_root / "receipts" / f"{next_id}.json"
        ).unlink()
        fixture.ack_path.unlink()
        no_evidence = snapshot_tree(fixture.paths.updates_root)
        with self.assertRaisesRegex(
            FinalizationError, "^finalization_not_current$"
        ):
            fixture.acknowledge()
        self.assertEqual(snapshot_tree(fixture.paths.updates_root), no_evidence)

    def test_cursor_scratch_with_wrong_id_ack_rejects_without_mutation(self):
        fixture = self.make_terminal()
        receipt = fixture.finalize()
        fixture.acknowledge()
        cursor = FinalizationCursor(
            TX,
            receipt.outcome,
            receipt.terminal_version,
            "receipt-ready",
        )
        scratch = fixture.cursor_path.with_name(
            f".{fixture.cursor_path.name}.tmp"
        )
        encoded = json.dumps(
            cursor.to_dict(),
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8") + b"\n"
        scratch.write_bytes(encoded[: len(encoded) // 2])
        before = snapshot_tree(fixture.paths.updates_root)

        with self.assertRaisesRegex(
            FinalizationError, "^finalization_not_current$"
        ):
            acknowledge_update_finalization(
                fixture.install,
                "f" * 32,
                mutex_factory=fixture.mutex_factory,
            )

        self.assertEqual(snapshot_tree(fixture.paths.updates_root), before)

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
                "FrozenStagedProbeIntegrationTests",
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

    def test_receipt_rejects_lexical_reparse_parent_before_resolution(self):
        fs = OSFinalizationFilesystem()
        receipts = self.root / "updates/receipts"
        receipts.mkdir(parents=True)
        external = self.root / "external/updates/receipts"
        external.mkdir(parents=True)
        receipt = receipts / f"{TX}.json"
        real_resolve = Path.resolve
        real_lstat = Path.lstat
        lexical_info = real_lstat(receipts)

        def redirected_resolve(path, *args, **kwargs):
            if path == receipts:
                raise AssertionError("resolved lexical reparse parent")
            return real_resolve(path, *args, **kwargs)

        def reparse_lstat(path, *args, **kwargs):
            if path == receipts:
                return SimpleNamespace(
                    st_mode=lexical_info.st_mode,
                    st_file_attributes=0x400,
                )
            return real_lstat(path, *args, **kwargs)

        with (
            mock.patch.object(Path, "resolve", redirected_resolve),
            mock.patch.object(Path, "lstat", reparse_lstat),
            self.assertRaisesRegex(
                FinalizationError, "^invalid_finalization_receipt$"
            ),
        ):
            fs.exists(receipt)

    def test_ack_target_entry_type_table_rejects_before_replace(self):
        cases = ("directory", "symlink", "reparse", "unsupported")
        for index, case in enumerate(cases):
            with self.subTest(case=case):
                root = self.root / f"ack-type-{index}"
                receipts = root / "updates/receipts"
                receipts.mkdir(parents=True)
                receipt = receipts / f"{TX}.json"
                receipt.write_bytes(b"receipt\n")
                ack = root / "updates/finalization-ack.json"
                if case == "directory":
                    ack.mkdir()
                elif case == "symlink":
                    target = root / "updates/old-ack.json"
                    target.write_bytes(b"old-ack")
                    try:
                        ack.symlink_to(target)
                    except (OSError, NotImplementedError):
                        ack.write_bytes(b"old-ack")
                        symlink_fallback = True
                    else:
                        symlink_fallback = False
                else:
                    ack.write_bytes(b"old-ack")
                    symlink_fallback = False
                real_lstat = Path.lstat

                def typed_lstat(path, *args, **kwargs):
                    info = real_lstat(path, *args, **kwargs)
                    if path != ack:
                        return info
                    if case == "symlink" and symlink_fallback:
                        return SimpleNamespace(
                            st_mode=stat.S_IFLNK,
                            st_file_attributes=0,
                        )
                    if case == "reparse":
                        return SimpleNamespace(
                            st_mode=info.st_mode,
                            st_file_attributes=0x400,
                        )
                    if case == "unsupported":
                        return SimpleNamespace(
                            st_mode=stat.S_IFIFO,
                            st_file_attributes=0,
                        )
                    return info

                fs = OSFinalizationFilesystem()
                with (
                    mock.patch.object(Path, "lstat", typed_lstat),
                    mock.patch("update_recovery.os.replace") as replace_call,
                    self.assertRaisesRegex(
                        FinalizationError,
                        "^invalid_finalization_acknowledgment$",
                    ),
                ):
                    fs.move_receipt_to_ack(receipt, ack)
                replace_call.assert_not_called()

    def test_ack_invalid_receipt_scratch_type_is_fixed_and_retains_cursor(self):
        fixture = TerminalFixture(
            self.root / "receipt-scratch-type",
            fresh_install=False,
            rolled_back=False,
        )
        fixture.finalize()
        scratch = fixture.receipt_path.with_name(
            f".{fixture.receipt_path.name}.tmp"
        )
        scratch.mkdir()
        cursor_bytes = fixture.cursor_path.read_bytes()

        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_receipt$"
        ):
            fixture.acknowledge()

        self.assertEqual(fixture.cursor_path.read_bytes(), cursor_bytes)
        self.assertTrue(fixture.receipt_path.exists())
        self.assertTrue(scratch.is_dir())

    def test_public_ack_invalid_target_type_is_fixed_and_retains_evidence(self):
        fixture = TerminalFixture(
            self.root / "public-ack-type",
            fresh_install=False,
            rolled_back=False,
        )
        fixture.finalize()
        fixture.ack_path.mkdir()
        cursor_bytes = fixture.cursor_path.read_bytes()
        receipt_bytes = fixture.receipt_path.read_bytes()

        with self.assertRaisesRegex(
            FinalizationError, "^invalid_finalization_acknowledgment$"
        ):
            fixture.acknowledge()

        self.assertEqual(fixture.cursor_path.read_bytes(), cursor_bytes)
        self.assertEqual(fixture.receipt_path.read_bytes(), receipt_bytes)

    def test_ack_only_entry_type_table_maps_exists_read_and_public_calls(self):
        cases = ("directory", "symlink", "reparse", "unsupported")
        for index, case in enumerate(cases):
            with self.subTest(case=case):
                fixture = TerminalFixture(
                    self.root / f"ack-only-{index}",
                    fresh_install=False,
                    rolled_back=False,
                )
                receipt = fixture.finalize()
                fixture.acknowledge()
                fixture.ack_path.unlink()
                if case == "directory":
                    fixture.ack_path.mkdir()
                elif case == "symlink":
                    symlink_fallback = False
                    target = fixture.paths.updates_root / "old-ack.json"
                    target.write_bytes(b"old-ack")
                    try:
                        fixture.ack_path.symlink_to(target)
                    except (OSError, NotImplementedError):
                        fixture.ack_path.write_bytes(b"old-ack")
                        symlink_fallback = True
                else:
                    fixture.ack_path.write_bytes(b"old-ack")
                    symlink_fallback = False
                real_lstat = Path.lstat

                def typed_lstat(path, *args, **kwargs):
                    info = real_lstat(path, *args, **kwargs)
                    if path != fixture.ack_path:
                        return info
                    if case == "symlink" and symlink_fallback:
                        return SimpleNamespace(
                            st_mode=stat.S_IFLNK,
                            st_file_attributes=0,
                        )
                    if case == "reparse":
                        return SimpleNamespace(
                            st_mode=info.st_mode,
                            st_file_attributes=0x400,
                        )
                    if case == "unsupported":
                        return SimpleNamespace(
                            st_mode=stat.S_IFIFO,
                            st_file_attributes=0,
                        )
                    return info

                fs = OSFinalizationFilesystem()
                before = snapshot_tree(fixture.paths.updates_root)
                with mock.patch.object(Path, "lstat", typed_lstat):
                    for operation in (
                        lambda: fs.exists(fixture.ack_path),
                        lambda: fs.read(fixture.ack_path),
                        fixture.acknowledge,
                        fixture.finalize,
                    ):
                        with self.assertRaisesRegex(
                            FinalizationError,
                            "^invalid_finalization_acknowledgment$",
                        ):
                            operation()
                self.assertEqual(snapshot_tree(fixture.paths.updates_root), before)
                self.assertEqual(receipt.transaction_id, TX)

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


class FrozenStagedProbeIntegrationTests(unittest.TestCase):
    class RecordingRealProbe(SubprocessProbeAdapter):
        def __init__(self):
            self.calls = []

        def run_probe(self, executable, manifest_path):
            call = SimpleNamespace(
                executable=executable,
                manifest_path=manifest_path,
                cwd=executable.parent,
            )
            self.calls.append(call)
            return super().run_probe(executable, manifest_path)

    def make_plan_a_package_from_built_onedir(self, onedir: Path):
        source = self.root / "source"
        shutil.copytree(onedir, source / "dist/dh_native_host")
        files = {
            "extension/dist/manifest.json": (
                b'{"version":"2.0.74",'
                b'"version_name":"2.0.74-beta.4"}\n'
            ),
            "extension/dist/assets/app.js": b"app",
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
        stage = self.root / "package"
        stage_release(source, stage, VERSION)
        return validate_staged_package(stage, expected_version=VERSION)

    def make_real_prepared_installer_fixture(self, package):
        install_root = self.root / "install"
        install_root.mkdir()
        mutex = FakeMutationMutex()
        engine = UpdateEngine(
            install_root,
            mutex_factory=lambda _root: mutex,
        )
        engine.create_prepared(
            package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.INSTALLER,
        )
        paths = TransactionPaths.for_install(install_root, TX)
        probe = self.RecordingRealProbe()
        run_once = MemoryRunOnceStore()
        workspace = TemporaryStagedProbeWorkspace()
        registry = MemoryRegistryBackend()
        controller = RecoveryController(
            install_root,
            RecoveryDependencies(
                process=NoopProcessAdapter(),
                probe_process=probe,
                staged_probe_workspace=workspace,
                run_once=run_once,
                clock=NoopClock(),
                mutex_factory=lambda _root: mutex,
                set_cwd=lambda _path: None,
            ),
        )
        return SimpleNamespace(
            install_root=install_root,
            paths=paths,
            probe=probe,
            run_once=run_once,
            workspace=workspace,
            registry=registry,
            controller=controller,
        )

    def test_complete_built_runtime_starts_and_matches_target_without_live_mutation(self):
        onedir_text = os.environ.get("DH_PLAN_C_FROZEN_ONEDIR")
        if not onedir_text:
            self.skipTest("DH_PLAN_C_FROZEN_ONEDIR not set")
        onedir = Path(onedir_text)
        if not onedir.is_absolute():
            self.fail("DH_PLAN_C_FROZEN_ONEDIR must be absolute")
        inventory_onedir(onedir.resolve(strict=True))
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        package = self.make_plan_a_package_from_built_onedir(onedir)
        fixture = self.make_real_prepared_installer_fixture(package)
        before = snapshot_tree(fixture.install_root)

        result = fixture.controller.preflight_prepared_target(TX)

        self.assertEqual(len(fixture.probe.calls), 1)
        self.assertEqual(
            result,
            UpdateProbeResult(
                status="success",
                host_version=VERSION,
                extension_version=VERSION,
                capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
            ),
        )
        self.assertEqual(snapshot_tree(fixture.install_root), before)
        self.assertEqual(
            read_journal(fixture.paths.journal).phase,
            JournalPhase.PREPARED,
        )
        self.assertEqual(fixture.run_once.write_calls, [])
        self.assertEqual(fixture.registry.values, {})
        self.assertEqual(
            fixture.probe.calls[0].cwd,
            fixture.probe.calls[0].executable.parent,
        )
        self.assertFalse(fixture.probe.calls[0].cwd.exists())

if __name__ == "__main__":
    unittest.main()
