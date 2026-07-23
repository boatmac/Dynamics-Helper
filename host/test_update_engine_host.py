import shutil
import tempfile
import unittest
from pathlib import Path

from package_archive import validate_staged_package
from package_manifest import generate_release_documents, write_release_documents
from product_info import VERSION
from test_update_support import FakeMutationMutex, RecordingHooks
from update_engine import (
    PreparedTransactionConflict,
    UpdateEngine,
    UpdateEngineError,
    UpdateEngineHooks,
    UpdateStateConflict,
)
from update_journal import InitiatingProcessIdentity, JournalPhase, UpdateInitiator


TX = "0123456789abcdef0123456789abcdef"


def make_package(root: Path):
    stage = root / "package"
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


class EngineFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.install = self.root / "install"
        self.install.mkdir()
        self.package = make_package(self.root)
        self.mutex = FakeMutationMutex()
        self.hooks = RecordingHooks(self.mutex)
        deps = UpdateEngineHooks(
            before_live_phase=self.hooks.before_live_phase,
            wait_for_initiating_host_exit=self.hooks.wait_for_initiating_host_exit,
            probe_installed_product=self.hooks.probe_installed_product,
            before_filesystem_operation=self.hooks.before_filesystem_operation,
            after_filesystem_operation=self.hooks.after_filesystem_operation,
            after_journal_transition=self.hooks.after_journal_transition,
        )
        self.engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
            hooks=deps,
        )


class ExceptionContractTests(unittest.TestCase):
    def test_fixed_errors(self):
        self.assertEqual(str(UpdateEngineError()), "update_engine_failed")
        self.assertEqual(str(UpdateStateConflict()), "update_state_conflict")
        self.assertEqual(str(PreparedTransactionConflict()), "update_transaction_conflict")


class MutexOwnershipTests(EngineFixture):
    def test_create_and_activate_hold_one_mutex(self):
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        identity = InitiatingProcessIdentity(123, "created")
        journal = self.engine.activate_prepared(TX, identity)
        self.assertEqual(journal.phase, JournalPhase.WAITING_FOR_HOST_EXIT)
        self.assertEqual(self.hooks.waited_processes, [identity])
        self.assertEqual(self.mutex.acquire_count, 2)
        self.assertEqual(self.mutex.release_count, 2)

    def test_preparation_filesystem_hooks_observe_mutex(self):
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        before = [value for kind, value in self.hooks.events if kind == "before"]
        after = [value for kind, value in self.hooks.events if kind == "after"]
        self.assertIn("workspace:create-preparing", before)
        self.assertIn("workspace:write-staging-journal", before)
        self.assertIn("workspace:write-ownership", before)
        self.assertIn("workspace:promote-preparing", before)
        self.assertIn("active:write", before)
        self.assertEqual(before, after)


class PreparedWorkspaceTests(EngineFixture):
    def test_prepared_workspace_and_replay(self):
        first = self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        second = self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        self.assertEqual(first, second)
        self.assertEqual(first.phase, JournalPhase.PREPARED)
        tx_root = self.install / "updates" / "transactions" / TX
        self.assertTrue((tx_root / "journal.json").is_file())
        self.assertTrue((tx_root / "ownership.json").is_file())
        self.assertTrue((tx_root / "probe/update-manifest.json").is_file())
        self.assertTrue((self.install / "updates/active.json").is_file())
        self.assertFalse((self.install / "updates/transactions" / f"{TX}.preparing").exists())

    def test_same_id_different_target_conflicts(self):
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        with self.assertRaises(PreparedTransactionConflict):
            self.engine.create_prepared(
                self.package,
                TX,
                expected_version="9.9.9",
                prior_version=None,
                initiator=UpdateInitiator.BROWSER,
            )


class HostPhaseTests(EngineFixture):
    def test_installed_host_backup_and_install_order(self):
        # Build an installed prior product from the package, then change package bytes.
        shutil.copytree(self.package.stage_root / "host" / "_internal", self.install / "_internal")
        shutil.copytree(self.package.stage_root / "extension", self.install / "extension")
        for name in ("dh_native_host.exe", "system_prompt.md", "register.py", "release-integrity.json", "installed-product.json"):
            shutil.copy2(self.package.stage_root / "host" / name, self.install / name)
        old_exe = (self.install / "dh_native_host.exe").read_bytes()
        engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
            hooks=self.engine.hooks,
        )
        engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=VERSION,
            initiator=UpdateInitiator.BROWSER,
        )
        identity = InitiatingProcessIdentity(123, "created")
        engine.activate_prepared(TX, identity)
        journal = engine.resume(TX)
        self.assertEqual(journal.phase, JournalPhase.COMMITTED)
        backup_exe = self.install / "updates/transactions" / TX / "backup/host/dh_native_host.exe"
        self.assertEqual(backup_exe.read_bytes(), old_exe)
        before_labels = [value for kind, value in self.hooks.events if kind == "before"]
        self.assertLess(
            before_labels.index("host:backup:dh_native_host.exe"),
            before_labels.index("host:install:dh_native_host.exe"),
        )


class TerminalEvidenceTests(EngineFixture):
    def test_absent_terminal_evidence_returns_false(self):
        self.assertFalse(self.engine.finalize_terminal_evidence(TX))


if __name__ == "__main__":
    unittest.main()
