import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from package_archive import validate_staged_package
from package_manifest import generate_release_documents, write_release_documents
from product_info import VERSION
from test_update_engine_host import TX, make_package
from test_update_support import FakeMutationMutex, RecordingHooks
from update_engine import UpdateEngine, UpdateEngineError, UpdateEngineHooks
from update_journal import (
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    JournalValidationError,
    UpdateInitiator,
)


class ProbeFailure(RuntimeError):
    pass


class PhaseFailure(RuntimeError):
    pass


def product_snapshot(root: Path) -> dict[str, bytes]:
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in root.rglob("*")
        if path.is_file() and "updates" not in path.relative_to(root).parts
    }


class RollbackFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.install = self.root / "install"
        self.install.mkdir()
        self.package = make_package(self.root)
        prior_root = self.root / "prior"
        self.prior_package = make_package(prior_root)
        prior_stage = self.prior_package.stage_root
        (prior_stage / "update-manifest.json").unlink()
        (prior_stage / "host/installed-product.json").unlink()
        (prior_stage / "host/release-integrity.json").unlink()
        (prior_stage / "host/dh_native_host.exe").write_bytes(b"old-host")
        (prior_stage / "host/system_prompt.md").write_bytes(b"old-core")
        (prior_stage / "extension/assets/app.js").write_bytes(b"old-app")
        prior_documents = generate_release_documents(prior_stage, VERSION)
        write_release_documents(prior_stage, prior_documents)
        self.prior_package = validate_staged_package(
            prior_stage, expected_version=VERSION
        )
        self.mutex = FakeMutationMutex()
        self.hooks = RecordingHooks(self.mutex)
        self.fail_probe = False

        def probe(path, plan):
            assert self.mutex.held
            if self.fail_probe:
                raise ProbeFailure("probe")
            self.hooks.probe_installed_product(path, plan)

        self.engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
            hooks=UpdateEngineHooks(
                self.hooks.before_live_phase,
                self.hooks.wait_for_initiating_host_exit,
                probe,
                self.hooks.before_filesystem_operation,
                self.hooks.after_filesystem_operation,
                self.hooks.after_journal_transition,
            ),
        )

    def activate(self, *, prior=None):
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=prior,
            initiator=UpdateInitiator.BROWSER,
        )
        self.engine.activate_prepared(TX, InitiatingProcessIdentity(123, "created"))

    def install_current_product(self):
        shutil.copytree(
            self.prior_package.stage_root / "host",
            self.install,
            dirs_exist_ok=True,
        )
        shutil.copytree(
            self.prior_package.stage_root / "extension",
            self.install / "extension",
        )

    def install_legacy_product(self):
        (self.install / "dh_native_host.exe").write_bytes(b"legacy-host")
        (self.install / "system_prompt.md").write_bytes(b"legacy-core")
        (self.install / "register.py").write_bytes(b"legacy-register")
        (self.install / "_internal").mkdir()
        (self.install / "_internal/runtime.dll").write_bytes(b"legacy-runtime")
        (self.install / "extension").mkdir()
        (self.install / "extension/legacy.js").write_bytes(b"legacy-extension")


class RollbackRestorationTests(RollbackFixture):
    def test_probe_failure_restores_installed_product_exactly(self):
        self.install_current_product()
        (self.install / "extension/stale.js").write_bytes(b"stale")
        (self.install / "_internal/stale.dll").write_bytes(b"stale-runtime")
        (self.install / "unknown.bin").write_bytes(b"unknown")
        before = product_snapshot(self.install)
        self.activate(prior=VERSION)
        self.fail_probe = True
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(product_snapshot(self.install), before)

    def test_probe_failure_restores_legacy_product_exactly(self):
        self.install_legacy_product()
        (self.install / "unknown.bin").write_bytes(b"unknown")
        before = product_snapshot(self.install)
        self.activate(prior="legacy-version")
        self.fail_probe = True
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(product_snapshot(self.install), before)

    def test_fresh_seed_installed_by_transaction_survives_rollback(self):
        self.activate()
        self.fail_probe = True
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual((self.install / "config.json").read_bytes(), b"{}\n")
        self.assertTrue(result.seed_receipt.seed_installed)
        self.assertFalse((self.install / "dh_native_host.exe").exists())
        self.assertFalse((self.install / "extension").exists())
        failed_new = self.install / "updates/transactions" / TX / "failed-new"
        self.assertFalse((failed_new / "config.json").exists())
        self.assertFalse((failed_new / "host/config.json").exists())

    def test_fresh_seed_modified_before_probe_survives_rollback(self):
        self.activate()

        def edit_seed_then_fail(_path, _plan):
            (self.install / "config.json").write_bytes(b"user-modified-seed")
            raise ProbeFailure("probe")

        object.__setattr__(
            self.engine.hooks, "probe_installed_product", edit_seed_then_fail
        )
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertTrue(result.seed_receipt.seed_installed)
        self.assertEqual(
            (self.install / "config.json").read_bytes(), b"user-modified-seed"
        )

    def test_fresh_preexisting_config_survives_rollback(self):
        (self.install / "config.json").write_bytes(b"preexisting-user")
        self.activate()
        self.fail_probe = True
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(
            (self.install / "config.json").read_bytes(), b"preexisting-user"
        )
        self.assertIsNone(result.seed_receipt)

    def test_fresh_user_config_survives_rollback(self):
        self.activate()
        (self.install / "config.json").write_bytes(b"user-after-plan")
        self.fail_probe = True
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual((self.install / "config.json").read_bytes(), b"user-after-plan")
        self.assertFalse((self.install / "dh_native_host.exe").exists())
        self.assertFalse((self.install / "extension").exists())


class FailureLineageTests(RollbackFixture):
    def test_probe_failure_persists_original_lineage(self):
        self.activate()
        self.fail_probe = True
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(result.original_failure_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(result.reason_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(result.rollback_from, JournalPhase.PROBING)

    def test_each_forward_failure_maps_first_durable_phase(self):
        cases = (
            (
                "wait",
                None,
                JournalReason.HOST_EXIT_WAIT_FAILED,
                JournalPhase.WAITING_FOR_HOST_EXIT,
            ),
            (
                "phase",
                JournalPhase.HOST_BACKED_UP,
                JournalReason.HOST_BACKUP_FAILED,
                JournalPhase.WAITING_FOR_HOST_EXIT,
            ),
            (
                "phase",
                JournalPhase.HOST_INSTALLED,
                JournalReason.HOST_INSTALL_FAILED,
                JournalPhase.HOST_BACKED_UP,
            ),
            (
                "phase",
                JournalPhase.EXTENSION_BACKED_UP,
                JournalReason.EXTENSION_BACKUP_FAILED,
                JournalPhase.HOST_INSTALLED,
            ),
            (
                "phase",
                JournalPhase.EXTENSION_INSTALLED,
                JournalReason.EXTENSION_INSTALL_FAILED,
                JournalPhase.EXTENSION_BACKED_UP,
            ),
            (
                "phase",
                JournalPhase.METADATA_INSTALLED,
                JournalReason.METADATA_INSTALL_FAILED,
                JournalPhase.EXTENSION_INSTALLED,
            ),
            ("probe", None, JournalReason.STARTUP_PROBE_FAILED, JournalPhase.PROBING),
        )
        for index, (fault_kind, fault_phase, reason, rollback_from) in enumerate(cases):
            with self.subTest(reason=reason):
                root = self.root / f"failure-{index}"
                install = root / "install"
                install.mkdir(parents=True)
                package = make_package(root)
                mutex = FakeMutationMutex()
                recording = RecordingHooks(mutex)

                def before_phase(phase, paths, plan, *, selected=fault_phase):
                    recording.before_live_phase(phase, paths, plan)
                    if fault_kind == "phase" and phase is selected:
                        raise PhaseFailure("phase")

                def wait(identity):
                    recording.wait_for_initiating_host_exit(identity)
                    if fault_kind == "wait":
                        raise PhaseFailure("wait")

                def probe(path, plan):
                    recording.probe_installed_product(path, plan)
                    if fault_kind == "probe":
                        raise PhaseFailure("probe")

                engine = UpdateEngine(
                    install,
                    mutex_factory=lambda _root, value=mutex: value,
                    hooks=UpdateEngineHooks(
                        before_phase,
                        wait,
                        probe,
                        recording.before_filesystem_operation,
                        recording.after_filesystem_operation,
                        recording.after_journal_transition,
                    ),
                )
                engine.create_prepared(
                    package,
                    TX,
                    expected_version=VERSION,
                    prior_version=None,
                    initiator=UpdateInitiator.BROWSER,
                )
                activated = engine.activate_prepared(
                    TX, InitiatingProcessIdentity(123, "created")
                )
                result = activated if fault_kind == "wait" else engine.resume(TX)
                self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
                self.assertEqual(result.reason_code, reason)
                self.assertEqual(result.original_failure_code, reason)
                self.assertEqual(result.rollback_from, rollback_from)

    def test_permission_failure_maps_to_locked_path(self):
        def fail_metadata(phase, paths, plan):
            self.hooks.before_live_phase(phase, paths, plan)
            if phase is JournalPhase.METADATA_INSTALLED:
                raise PermissionError("private path")

        object.__setattr__(self.engine.hooks, "before_live_phase", fail_metadata)
        self.activate()
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(result.reason_code, JournalReason.LOCKED_PATH)
        self.assertNotIn("private path", str(result))


class RecoveryRequiredTests(RollbackFixture):
    def test_reverse_permission_fault_retains_evidence_for_retry(self):
        self.install_current_product()
        before = product_snapshot(self.install)
        self.activate(prior=VERSION)
        self.fail_probe = True

        def fail_remove(label):
            self.hooks.before_filesystem_operation(label)
            if label == "remove-new-extension":
                raise PermissionError("private locked path")

        object.__setattr__(self.engine.hooks, "before_filesystem_operation", fail_remove)
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
        self.assertEqual(result.reason_code, JournalReason.ROLLBACK_FAILED)
        self.assertEqual(result.original_failure_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertNotIn("private locked path", str(result))

        object.__setattr__(
            self.engine.hooks,
            "before_filesystem_operation",
            self.hooks.before_filesystem_operation,
        )
        retried = self.engine.rollback(TX, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(retried.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(product_snapshot(self.install), before)

    def test_corrupt_backup_enters_manual_recovery_without_reverse_move(self):
        self.install_current_product()
        self.activate(prior=VERSION)

        def corrupt_backup_then_fail(_path, _plan):
            backup = (
                self.install
                / "updates/transactions"
                / TX
                / "backup/host/dh_native_host.exe"
            )
            backup.write_bytes(b"corrupt-prior-evidence")
            raise ProbeFailure("probe")

        object.__setattr__(
            self.engine.hooks,
            "probe_installed_product",
            corrupt_backup_then_fail,
        )
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
        self.assertEqual(result.reason_code, JournalReason.MANUAL_RECOVERY_REQUIRED)
        rollback_operations = [
            label
            for kind, label in self.hooks.events
            if kind == "before"
            and (label.startswith("remove-new-") or label.startswith("restore-"))
        ]
        self.assertEqual(rollback_operations, [])

    def test_missing_backup_enters_recovery_required_and_retry_uses_original(self):
        self.install_current_product()
        before = product_snapshot(self.install)
        old_executable = (self.install / "dh_native_host.exe").read_bytes()
        self.activate(prior=VERSION)
        self.fail_probe = True

        def remove_backup(label):
            if label == "restore-host:dh_native_host.exe":
                backup = self.install / "updates/transactions" / TX / "backup/host/dh_native_host.exe"
                backup.unlink(missing_ok=True)
            self.hooks.before_filesystem_operation(label)

        object.__setattr__(self.engine.hooks, "before_filesystem_operation", remove_backup)
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
        self.assertEqual(result.reason_code, JournalReason.ROLLBACK_FAILED)
        self.assertEqual(result.original_failure_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(result.rollback_from, JournalPhase.PROBING)

        events_before = list(self.hooks.events)
        acquire_before = self.mutex.acquire_count
        self.assertEqual(self.engine.resume(TX), result)
        self.assertEqual(self.hooks.events, events_before)
        self.assertEqual(self.mutex.acquire_count, acquire_before + 1)

        backup = self.install / "updates/transactions" / TX / "backup/host/dh_native_host.exe"
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(old_executable)
        object.__setattr__(
            self.engine.hooks,
            "before_filesystem_operation",
            self.hooks.before_filesystem_operation,
        )
        retried = self.engine.rollback(TX, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(retried.phase, JournalPhase.ROLLED_BACK)
        self.assertEqual(retried.reason_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(retried.original_failure_code, JournalReason.STARTUP_PROBE_FAILED)
        self.assertEqual(product_snapshot(self.install), before)
        self.assertEqual(
            self.engine.rollback(TX, JournalReason.STARTUP_PROBE_FAILED), retried
        )

    def test_mismatched_new_host_preflights_before_first_host_move(self):
        self.activate()

        def corrupt_then_fail(path, plan):
            (self.install / "system_prompt.md").write_bytes(b"corrupt-new-host")
            raise ProbeFailure("probe")

        object.__setattr__(self.engine.hooks, "probe_installed_product", corrupt_then_fail)
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
        self.assertEqual(result.reason_code, JournalReason.MANUAL_RECOVERY_REQUIRED)
        rollback_operations = [
            label
            for kind, label in self.hooks.events
            if kind == "before"
            and (label.startswith("remove-new-") or label.startswith("restore-"))
        ]
        self.assertEqual(rollback_operations, [])
        self.assertTrue((self.install / "dh_native_host.exe").exists())
        self.assertFalse(
            (self.install / "updates/transactions" / TX / "failed-new/host").exists()
        )

    def test_recovery_journal_write_failure_raises_fixed_exception_group(self):
        self.install_current_product()
        self.activate(prior=VERSION)
        self.fail_probe = True

        def remove_backup(label):
            if label == "restore-host:dh_native_host.exe":
                backup = self.install / "updates/transactions" / TX / "backup/host/dh_native_host.exe"
                backup.unlink(missing_ok=True)
            self.hooks.before_filesystem_operation(label)

        object.__setattr__(self.engine.hooks, "before_filesystem_operation", remove_backup)

        from update_engine import write_journal_atomic as real_write

        def fail_recovery_write(path, journal):
            if journal.phase is JournalPhase.RECOVERY_REQUIRED:
                raise PermissionError("private journal path")
            return real_write(path, journal)

        with patch("update_engine.write_journal_atomic", side_effect=fail_recovery_write):
            with self.assertRaises(ExceptionGroup) as raised:
                self.engine.resume(TX)
        group = raised.exception
        self.assertEqual(group.message, "rollback_and_journal_persistence_failed")
        self.assertEqual(len(group.exceptions), 2)
        self.assertIsInstance(group.exceptions[0], UpdateEngineError)
        self.assertIsInstance(group.exceptions[1], JournalValidationError)
        self.assertEqual(str(group.exceptions[0]), "update_engine_failed")
        self.assertEqual(str(group.exceptions[1]), "update_journal_invalid")
        self.assertNotIn("private journal path", str(group))


if __name__ == "__main__":
    unittest.main()
