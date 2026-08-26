import shutil
import tempfile
import unittest
from pathlib import Path

from product_info import VERSION
from test_update_engine_host import TX, make_package
from test_update_support import FakeMutationMutex, RecordingHooks
from update_engine import UpdateEngine, UpdateEngineHooks
from update_journal import InitiatingProcessIdentity, JournalPhase, UpdateInitiator


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
        self.engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
            hooks=UpdateEngineHooks(
                self.hooks.before_live_phase,
                self.hooks.wait_for_initiating_host_exit,
                self.hooks.probe_installed_product,
                self.hooks.before_filesystem_operation,
                self.hooks.after_filesystem_operation,
                self.hooks.after_journal_transition,
            ),
        )

    def prepare_and_activate(self, *, prior=None):
        self.engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=prior,
            initiator=UpdateInitiator.BROWSER,
        )
        return self.engine.activate_prepared(
            TX, InitiatingProcessIdentity(123, "created")
        )


class ExtensionPhaseTests(EngineFixture):
    def test_installed_extension_is_replaced_as_whole_tree(self):
        # Installed metadata and product establish installed source mode.
        shutil.copytree(self.package.stage_root / "host", self.install, dirs_exist_ok=True)
        shutil.copytree(self.package.stage_root / "extension", self.install / "extension")
        (self.install / "extension" / "stale.js").write_bytes(b"stale")
        self.prepare_and_activate(prior=VERSION)
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        backup = self.install / "updates/transactions" / TX / "backup/extension"
        self.assertTrue((backup / "stale.js").is_file())
        self.assertFalse((self.install / "extension" / "stale.js").exists())


class SeedPhaseTests(EngineFixture):
    def test_fresh_seed_installs_once_and_records_receipt(self):
        self.prepare_and_activate()
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertEqual((self.install / "config.json").read_bytes(), b"{}\n")
        self.assertTrue(result.seed_receipt.seed_installed)
        self.assertEqual(result.seed_receipt.observed_live_sha256, result.seed_receipt.expected_sha256)

    def test_user_created_config_after_planning_wins(self):
        self.prepare_and_activate()
        (self.install / "config.json").write_bytes(b"user")
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertEqual((self.install / "config.json").read_bytes(), b"user")
        self.assertFalse(result.seed_receipt.seed_installed)

    def test_installed_mode_never_seeds_missing_config(self):
        shutil.copytree(self.package.stage_root / "host", self.install, dirs_exist_ok=True)
        shutil.copytree(self.package.stage_root / "extension", self.install / "extension")
        (self.install / "config.json").unlink()
        self.prepare_and_activate(prior=VERSION)
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertFalse((self.install / "config.json").exists())
        self.assertIsNone(result.seed_receipt)


class MetadataAndProbeTests(EngineFixture):
    def test_metadata_pair_is_installed_and_probe_commits(self):
        self.prepare_and_activate()
        result = self.engine.resume(TX)
        self.assertEqual(result.phase, JournalPhase.COMMITTED)
        self.assertTrue((self.install / "release-integrity.json").is_file())
        self.assertTrue((self.install / "installed-product.json").is_file())
        self.assertEqual(len([event for event in self.hooks.events if event[0] == "probe"]), 1)

    def test_metadata_exact_replay_commits_without_replacement_conflict(self):
        self.prepare_and_activate()
        first = self.engine.resume(TX)
        self.assertEqual(first.phase, JournalPhase.COMMITTED)
        self.assertEqual(self.engine.resume(TX).phase, JournalPhase.COMMITTED)


if __name__ == "__main__":
    unittest.main()
