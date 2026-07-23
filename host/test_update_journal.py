import json
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from update_journal import (
    JOURNAL_SCHEMA_VERSION,
    ActiveTransaction,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    JournalTransitionError,
    JournalValidationError,
    TerminalVersion,
    TransactionPaths,
    UpdateError,
    UpdateInitiator,
    active_transaction_to_value,
    generate_transaction_id,
    journal_to_value,
    new_staging_journal,
    parse_active_transaction,
    parse_active_transaction_text,
    parse_journal,
    parse_journal_text,
    parse_terminal_version,
    parse_transaction_id,
    read_active_transaction,
    read_journal,
    resolve_active_journal,
    resolve_ownership_path,
    terminal_version,
    terminal_version_to_value,
    transition,
    write_active_transaction_atomic,
    write_journal_atomic,
)


TX = "0123456789abcdef0123456789abcdef"
HASH = "0" * 64


class ExceptionContractTests(unittest.TestCase):
    def test_exceptions_have_fixed_safe_messages(self):
        for error_type, code in (
            (UpdateError, "update_error"),
            (JournalValidationError, "update_journal_invalid"),
            (JournalTransitionError, "update_journal_transition_invalid"),
        ):
            error = error_type()
            self.assertEqual(error.error_code, code)
            self.assertEqual(str(error), code)


class TransactionIdTests(unittest.TestCase):
    def test_parse_transaction_id_is_exact(self):
        self.assertEqual(parse_transaction_id(TX), TX)
        for value in ("", "A" * 32, "0" * 31, "0" * 33, 7, True, None):
            with self.subTest(value=value):
                with self.assertRaises(JournalValidationError):
                    parse_transaction_id(value)

    def test_generate_transaction_id_uses_exactly_sixteen_bytes(self):
        calls = []

        def random_bytes(length: int) -> bytes:
            calls.append(length)
            return bytes(range(16))

        self.assertEqual(
            generate_transaction_id(random_bytes),
            "000102030405060708090a0b0c0d0e0f",
        )
        self.assertEqual(calls, [16])

    def test_generate_transaction_id_rejects_bad_output(self):
        for value in (b"short", bytearray(16), "0" * 16, None):
            with self.subTest(value_type=type(value).__name__):
                with self.assertRaises(JournalValidationError):
                    generate_transaction_id(lambda _length, value=value: value)


class TransactionPathsTests(unittest.TestCase):
    def test_exact_path_topology(self):
        with tempfile.TemporaryDirectory() as directory:
            install = Path(directory).resolve()
            paths = TransactionPaths.for_install(install, TX)
            self.assertEqual(paths.install_root, install)
            self.assertEqual(paths.updates_root, install / "updates")
            self.assertEqual(paths.active, install / "updates" / "active.json")
            self.assertEqual(
                paths.preparing_root,
                install / "updates" / "transactions" / f"{TX}.preparing",
            )
            self.assertEqual(
                paths.preparing_probe_manifest,
                paths.preparing_root / "probe" / "update-manifest.json",
            )
            self.assertEqual(
                paths.transaction_root,
                install / "updates" / "transactions" / TX,
            )
            self.assertEqual(paths.host_backup, paths.backup_root / "host")
            self.assertEqual(paths.extension_backup, paths.backup_root / "extension")
            self.assertEqual(paths.metadata_backup, paths.backup_root / "metadata")
            self.assertEqual(paths.probe_manifest, paths.probe_root / "update-manifest.json")
            self.assertEqual(paths.ownership, paths.transaction_root / "ownership.json")
            self.assertEqual(paths.journal, paths.transaction_root / "journal.json")
            self.assertNotIn("recovery", paths.active.parts)


def staging_journal(*, initiator=UpdateInitiator.BROWSER, fresh=False):
    return new_staging_journal(
        transaction_id=TX,
        initiator=initiator,
        target_version="2.0.75",
        prior_version=None if fresh else "2.0.74",
        fresh_install=fresh,
        ownership_sha256=HASH,
    )


class JournalParserTests(unittest.TestCase):
    def test_staging_round_trip_is_canonical(self):
        journal = staging_journal()
        value = journal_to_value(journal)
        self.assertEqual(parse_journal(value), journal)
        text = json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n"
        self.assertEqual(parse_journal_text(text), journal)
        self.assertEqual(JOURNAL_SCHEMA_VERSION, 1)

    def test_parser_rejects_wrong_keys_types_and_noncanonical_text(self):
        value = journal_to_value(staging_journal())
        mutations = []
        missing = dict(value)
        missing.pop("target_version")
        mutations.append(missing)
        extra = dict(value)
        extra["extra"] = True
        mutations.append(extra)
        boolean_schema = dict(value)
        boolean_schema["schema_version"] = True
        mutations.append(boolean_schema)
        for candidate in mutations:
            with self.subTest(candidate=candidate):
                with self.assertRaises(JournalValidationError):
                    parse_journal(candidate)
        pretty = json.dumps(value, indent=2) + "\n"
        with self.assertRaises(JournalValidationError):
            parse_journal_text(pretty)

    def test_browser_and_installer_identity_invariants(self):
        browser = transition(
            transition(staging_journal(), JournalPhase.PREPARED),
            JournalPhase.WAITING_FOR_HOST_EXIT,
            initiating_process=InitiatingProcessIdentity(123, "created-1"),
        )
        self.assertEqual(browser.initiating_process.pid, 123)
        installer = transition(
            transition(
                staging_journal(initiator=UpdateInitiator.INSTALLER, fresh=True),
                JournalPhase.PREPARED,
            ),
            JournalPhase.WAITING_FOR_HOST_EXIT,
        )
        self.assertIsNone(installer.initiating_process)


class ActiveRecordTests(unittest.TestCase):
    def test_active_round_trip_and_containment(self):
        active = ActiveTransaction(
            schema_version=1,
            transaction_id=TX,
            journal_path=f"transactions/{TX}/journal.json",
        )
        value = active_transaction_to_value(active)
        self.assertEqual(parse_active_transaction(value), active)
        text = json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n"
        self.assertEqual(parse_active_transaction_text(text), active)
        with tempfile.TemporaryDirectory() as directory:
            updates = Path(directory).resolve()
            self.assertEqual(
                resolve_active_journal(updates, active),
                updates / "transactions" / TX / "journal.json",
            )
        for path in ("../journal.json", f"transactions/{TX}/../journal.json", "C:/x"):
            bad = dict(value)
            bad["journal_path"] = path
            with self.assertRaises(JournalValidationError):
                parse_active_transaction(bad)


class AtomicJsonTests(unittest.TestCase):
    def test_atomic_journal_and_active_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            tx_root = root / "updates" / "transactions" / TX
            tx_root.mkdir(parents=True)
            ownership = tx_root / "ownership.json"
            ownership.write_text("{}\n", encoding="utf-8")
            journal_path = tx_root / "journal.json"
            journal = staging_journal()
            write_journal_atomic(journal_path, journal)
            self.assertEqual(read_journal(journal_path), journal)
            self.assertEqual(resolve_ownership_path(journal_path, journal), ownership)
            active_path = root / "updates" / "active.json"
            active = ActiveTransaction(1, TX, f"transactions/{TX}/journal.json")
            write_active_transaction_atomic(active_path, active)
            self.assertEqual(read_active_transaction(active_path), active)


class TransitionTests(unittest.TestCase):
    def test_forward_graph_and_terminal_version(self):
        journal = transition(staging_journal(), JournalPhase.PREPARED)
        identity = InitiatingProcessIdentity(123, "created-1")
        phases = (
            JournalPhase.WAITING_FOR_HOST_EXIT,
            JournalPhase.HOST_BACKED_UP,
            JournalPhase.HOST_INSTALLED,
            JournalPhase.EXTENSION_BACKED_UP,
            JournalPhase.EXTENSION_INSTALLED,
            JournalPhase.METADATA_INSTALLED,
            JournalPhase.PROBING,
            JournalPhase.COMMITTED,
        )
        for index, phase in enumerate(phases):
            journal = transition(
                journal,
                phase,
                initiating_process=identity if index == 0 else None,
            )
        self.assertEqual(
            terminal_version(journal),
            TerminalVersion(version="2.0.75", fresh_install=False),
        )
        self.assertEqual(
            parse_terminal_version(terminal_version_to_value(terminal_version(journal))),
            terminal_version(journal),
        )
        with self.assertRaises(JournalTransitionError):
            transition(journal, JournalPhase.ROLLED_BACK)


class FailureLineageTests(unittest.TestCase):
    def test_recovery_required_round_trip_retains_original_failure(self):
        identity = InitiatingProcessIdentity(123, "created-1")
        journal = transition(staging_journal(), JournalPhase.PREPARED)
        journal = transition(
            journal,
            JournalPhase.WAITING_FOR_HOST_EXIT,
            initiating_process=identity,
        )
        journal = transition(
            journal,
            JournalPhase.ROLLING_BACK,
            failure_code=JournalReason.HOST_EXIT_WAIT_FAILED,
        )
        journal = transition(
            journal,
            JournalPhase.RECOVERY_REQUIRED,
            failure_code=JournalReason.ROLLBACK_FAILED,
        )
        self.assertEqual(journal.original_failure_code, JournalReason.HOST_EXIT_WAIT_FAILED)
        retry = transition(journal, JournalPhase.ROLLING_BACK)
        self.assertEqual(retry.reason_code, JournalReason.HOST_EXIT_WAIT_FAILED)
        rolled_back = transition(retry, JournalPhase.ROLLED_BACK)
        self.assertEqual(rolled_back.reason_code, JournalReason.HOST_EXIT_WAIT_FAILED)
        self.assertEqual(rolled_back.original_failure_code, JournalReason.HOST_EXIT_WAIT_FAILED)


if __name__ == "__main__":
    unittest.main()
