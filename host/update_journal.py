import json
import os
import re
import secrets
import tempfile
from collections.abc import Callable
from dataclasses import dataclass, replace
from enum import StrEnum
from pathlib import Path, PurePosixPath


class UpdateError(RuntimeError):
    error_code = "update_error"

    def __init__(self) -> None:
        super().__init__(self.error_code)


class JournalValidationError(UpdateError):
    error_code = "update_journal_invalid"


class JournalTransitionError(UpdateError):
    error_code = "update_journal_transition_invalid"


class JournalPhase(StrEnum):
    STAGING = "staging"
    PREPARED = "prepared"
    WAITING_FOR_HOST_EXIT = "waiting-for-host-exit"
    HOST_BACKED_UP = "host-backed-up"
    HOST_INSTALLED = "host-installed"
    EXTENSION_BACKED_UP = "extension-backed-up"
    EXTENSION_INSTALLED = "extension-installed"
    METADATA_INSTALLED = "metadata-installed"
    PROBING = "probing"
    COMMITTED = "committed"
    ROLLING_BACK = "rolling-back"
    ROLLED_BACK = "rolled-back"
    RECOVERY_REQUIRED = "recovery-required"


class UpdateInitiator(StrEnum):
    BROWSER = "browser"
    INSTALLER = "installer"


class JournalReason(StrEnum):
    HOST_EXIT_WAIT_FAILED = "host_exit_wait_failed"
    HOST_BACKUP_FAILED = "host_backup_failed"
    HOST_INSTALL_FAILED = "host_install_failed"
    EXTENSION_BACKUP_FAILED = "extension_backup_failed"
    EXTENSION_INSTALL_FAILED = "extension_install_failed"
    METADATA_INSTALL_FAILED = "metadata_install_failed"
    STARTUP_PROBE_FAILED = "startup_probe_failed"
    LOCKED_PATH = "locked_path"
    ROLLBACK_FAILED = "rollback_failed"
    MANUAL_RECOVERY_REQUIRED = "manual_recovery_required"


JOURNAL_SCHEMA_VERSION = 1
_TX_RE = re.compile(r"^[0-9a-f]{32}$")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

FORWARD_PHASES = (
    JournalPhase.WAITING_FOR_HOST_EXIT,
    JournalPhase.HOST_BACKED_UP,
    JournalPhase.HOST_INSTALLED,
    JournalPhase.EXTENSION_BACKED_UP,
    JournalPhase.EXTENSION_INSTALLED,
    JournalPhase.METADATA_INSTALLED,
    JournalPhase.PROBING,
)
FORWARD_FAILURE_CODES = frozenset(
    {
        JournalReason.HOST_EXIT_WAIT_FAILED,
        JournalReason.HOST_BACKUP_FAILED,
        JournalReason.HOST_INSTALL_FAILED,
        JournalReason.EXTENSION_BACKUP_FAILED,
        JournalReason.EXTENSION_INSTALL_FAILED,
        JournalReason.METADATA_INSTALL_FAILED,
        JournalReason.STARTUP_PROBE_FAILED,
        JournalReason.LOCKED_PATH,
    }
)
RECOVERY_REASON_CODES = frozenset(
    {JournalReason.ROLLBACK_FAILED, JournalReason.MANUAL_RECOVERY_REQUIRED}
)


@dataclass(frozen=True)
class InitiatingProcessIdentity:
    pid: int
    creation_token: str


@dataclass(frozen=True)
class SeedOperationReceipt:
    path: str
    expected_sha256: str
    seed_installed: bool
    observed_live_sha256: str | None


@dataclass(frozen=True)
class TerminalVersion:
    version: str | None
    fresh_install: bool


@dataclass(frozen=True)
class ActiveTransaction:
    schema_version: int
    transaction_id: str
    journal_path: str


@dataclass(frozen=True)
class TransactionPaths:
    install_root: Path
    updates_root: Path
    active: Path
    transactions_root: Path
    preparing_root: Path
    preparing_staged_root: Path
    preparing_staged_host: Path
    preparing_staged_extension: Path
    preparing_probe_manifest: Path
    preparing_ownership: Path
    preparing_journal: Path
    transaction_root: Path
    staged_root: Path
    staged_host: Path
    staged_extension: Path
    backup_root: Path
    host_backup: Path
    extension_backup: Path
    metadata_backup: Path
    failed_new_root: Path
    probe_root: Path
    probe_manifest: Path
    ownership: Path
    journal: Path

    @classmethod
    def for_install(
        cls, install_root: Path, transaction_id: object
    ) -> "TransactionPaths":
        if not isinstance(install_root, Path):
            raise JournalValidationError()
        try:
            root = install_root.resolve(strict=True)
        except OSError as error:
            raise JournalValidationError() from error
        if not root.is_dir():
            raise JournalValidationError()
        tx = parse_transaction_id(transaction_id)
        updates = root / "updates"
        transactions = updates / "transactions"
        preparing = transactions / f"{tx}.preparing"
        transaction = transactions / tx
        backup = transaction / "backup"
        probe = transaction / "probe"
        result = cls(
            install_root=root,
            updates_root=updates,
            active=updates / "active.json",
            transactions_root=transactions,
            preparing_root=preparing,
            preparing_staged_root=preparing / "staged",
            preparing_staged_host=preparing / "staged" / "host",
            preparing_staged_extension=preparing / "staged" / "extension",
            preparing_probe_manifest=preparing / "probe" / "update-manifest.json",
            preparing_ownership=preparing / "ownership.json",
            preparing_journal=preparing / "journal.json",
            transaction_root=transaction,
            staged_root=transaction / "staged",
            staged_host=transaction / "staged" / "host",
            staged_extension=transaction / "staged" / "extension",
            backup_root=backup,
            host_backup=backup / "host",
            extension_backup=backup / "extension",
            metadata_backup=backup / "metadata",
            failed_new_root=transaction / "failed-new",
            probe_root=probe,
            probe_manifest=probe / "update-manifest.json",
            ownership=transaction / "ownership.json",
            journal=transaction / "journal.json",
        )
        for path in result.__dict__.values():
            if isinstance(path, Path) and path != root:
                try:
                    path.resolve(strict=False).relative_to(root)
                except (OSError, ValueError) as error:
                    raise JournalValidationError() from error
        return result


@dataclass(frozen=True)
class UpdateJournal:
    schema_version: int
    transaction_id: str
    phase: JournalPhase
    initiator: UpdateInitiator
    target_version: str
    prior_version: str | None
    fresh_install: bool
    ownership_path: str
    ownership_sha256: str
    initiating_process: InitiatingProcessIdentity | None
    seed_receipt: SeedOperationReceipt | None
    reason_code: JournalReason | None
    original_failure_code: JournalReason | None
    rollback_from: JournalPhase | None


def parse_transaction_id(value: object) -> str:
    if type(value) is not str or _TX_RE.fullmatch(value) is None:
        raise JournalValidationError()
    return value


def generate_transaction_id(
    random_bytes: Callable[[int], bytes] = secrets.token_bytes,
) -> str:
    try:
        raw = random_bytes(16)
    except Exception as error:
        raise JournalValidationError() from error
    if type(raw) is not bytes or len(raw) != 16:
        raise JournalValidationError()
    return parse_transaction_id(raw.hex())


def _require_plain_string(value: object, *, nullable: bool = False) -> str | None:
    if value is None and nullable:
        return None
    if type(value) is not str or not value:
        raise JournalValidationError()
    return value


def _require_sha256(value: object) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        raise JournalValidationError()
    return value


def _parse_process(value: object) -> InitiatingProcessIdentity | None:
    if value is None:
        return None
    if type(value) is not dict or set(value) != {"pid", "creation_token"}:
        raise JournalValidationError()
    pid = value["pid"]
    token = value["creation_token"]
    if type(pid) is not int or pid <= 0 or type(token) is not str or not token:
        raise JournalValidationError()
    return InitiatingProcessIdentity(pid=pid, creation_token=token)


def _process_to_value(
    value: InitiatingProcessIdentity | None,
) -> dict[str, object] | None:
    if value is None:
        return None
    return {"creation_token": value.creation_token, "pid": value.pid}


def _parse_seed(value: object) -> SeedOperationReceipt | None:
    if value is None:
        return None
    if type(value) is not dict or set(value) != {
        "path",
        "expected_sha256",
        "seed_installed",
        "observed_live_sha256",
    }:
        raise JournalValidationError()
    if value["path"] != "config.json":
        raise JournalValidationError()
    expected = _require_sha256(value["expected_sha256"])
    installed = value["seed_installed"]
    observed = value["observed_live_sha256"]
    if type(installed) is not bool:
        raise JournalValidationError()
    if observed is not None:
        observed = _require_sha256(observed)
    return SeedOperationReceipt("config.json", expected, installed, observed)


def _seed_to_value(value: SeedOperationReceipt | None) -> dict[str, object] | None:
    if value is None:
        return None
    return {
        "expected_sha256": value.expected_sha256,
        "observed_live_sha256": value.observed_live_sha256,
        "path": value.path,
        "seed_installed": value.seed_installed,
    }


def _enum_or_none(enum_type, value):
    if value is None:
        return None
    if type(value) is not str:
        raise JournalValidationError()
    try:
        return enum_type(value)
    except ValueError as error:
        raise JournalValidationError() from error


def _validate_journal(journal: UpdateJournal) -> UpdateJournal:
    if journal.schema_version != JOURNAL_SCHEMA_VERSION:
        raise JournalValidationError()
    parse_transaction_id(journal.transaction_id)
    if type(journal.target_version) is not str or not journal.target_version:
        raise JournalValidationError()
    _require_sha256(journal.ownership_sha256)
    if journal.ownership_path != "ownership.json":
        raise JournalValidationError()
    if type(journal.fresh_install) is not bool:
        raise JournalValidationError()
    if journal.fresh_install != (journal.prior_version is None):
        raise JournalValidationError()
    if journal.prior_version is not None and (
        type(journal.prior_version) is not str or not journal.prior_version
    ):
        raise JournalValidationError()
    if journal.initiator is UpdateInitiator.BROWSER:
        if journal.phase in (JournalPhase.STAGING, JournalPhase.PREPARED):
            if journal.initiating_process is not None:
                raise JournalValidationError()
        elif journal.initiating_process is None:
            raise JournalValidationError()
    elif journal.initiating_process is not None:
        raise JournalValidationError()
    if journal.phase in (
        JournalPhase.STAGING,
        JournalPhase.PREPARED,
        *FORWARD_PHASES,
        JournalPhase.COMMITTED,
    ):
        if any(
            value is not None
            for value in (
                journal.reason_code,
                journal.original_failure_code,
                journal.rollback_from,
            )
        ):
            raise JournalValidationError()
    else:
        if journal.original_failure_code not in FORWARD_FAILURE_CODES:
            raise JournalValidationError()
        if journal.rollback_from not in FORWARD_PHASES:
            raise JournalValidationError()
        if journal.phase in (JournalPhase.ROLLING_BACK, JournalPhase.ROLLED_BACK):
            if journal.reason_code != journal.original_failure_code:
                raise JournalValidationError()
        elif journal.reason_code not in RECOVERY_REASON_CODES:
            raise JournalValidationError()
    return journal


def journal_to_value(journal: UpdateJournal) -> dict[str, object]:
    _validate_journal(journal)
    return {
        "fresh_install": journal.fresh_install,
        "initiating_process": _process_to_value(journal.initiating_process),
        "initiator": journal.initiator.value,
        "original_failure_code": (
            journal.original_failure_code.value
            if journal.original_failure_code is not None
            else None
        ),
        "ownership_path": journal.ownership_path,
        "ownership_sha256": journal.ownership_sha256,
        "phase": journal.phase.value,
        "prior_version": journal.prior_version,
        "reason_code": journal.reason_code.value if journal.reason_code else None,
        "rollback_from": journal.rollback_from.value if journal.rollback_from else None,
        "schema_version": journal.schema_version,
        "seed_receipt": _seed_to_value(journal.seed_receipt),
        "target_version": journal.target_version,
        "transaction_id": journal.transaction_id,
    }


_JOURNAL_KEYS = frozenset(journal_to_value.__annotations__ for _ in ())
_EXPECTED_JOURNAL_KEYS = {
    "schema_version",
    "transaction_id",
    "phase",
    "initiator",
    "target_version",
    "prior_version",
    "fresh_install",
    "ownership_path",
    "ownership_sha256",
    "initiating_process",
    "seed_receipt",
    "reason_code",
    "original_failure_code",
    "rollback_from",
}


def parse_journal(value: object) -> UpdateJournal:
    if type(value) is not dict or set(value) != _EXPECTED_JOURNAL_KEYS:
        raise JournalValidationError()
    if type(value["schema_version"]) is not int:
        raise JournalValidationError()
    try:
        phase = JournalPhase(value["phase"])
        initiator = UpdateInitiator(value["initiator"])
    except (TypeError, ValueError) as error:
        raise JournalValidationError() from error
    journal = UpdateJournal(
        schema_version=value["schema_version"],
        transaction_id=parse_transaction_id(value["transaction_id"]),
        phase=phase,
        initiator=initiator,
        target_version=_require_plain_string(value["target_version"]),
        prior_version=_require_plain_string(value["prior_version"], nullable=True),
        fresh_install=value["fresh_install"],
        ownership_path=_require_plain_string(value["ownership_path"]),
        ownership_sha256=_require_sha256(value["ownership_sha256"]),
        initiating_process=_parse_process(value["initiating_process"]),
        seed_receipt=_parse_seed(value["seed_receipt"]),
        reason_code=_enum_or_none(JournalReason, value["reason_code"]),
        original_failure_code=_enum_or_none(
            JournalReason, value["original_failure_code"]
        ),
        rollback_from=_enum_or_none(JournalPhase, value["rollback_from"]),
    )
    return _validate_journal(journal)


def active_transaction_to_value(active: ActiveTransaction) -> dict[str, object]:
    parsed = parse_active_transaction(
        {
            "journal_path": active.journal_path,
            "schema_version": active.schema_version,
            "transaction_id": active.transaction_id,
        }
    )
    return {
        "journal_path": parsed.journal_path,
        "schema_version": parsed.schema_version,
        "transaction_id": parsed.transaction_id,
    }


def parse_active_transaction(value: object) -> ActiveTransaction:
    if type(value) is not dict or set(value) != {
        "schema_version",
        "transaction_id",
        "journal_path",
    }:
        raise JournalValidationError()
    if type(value["schema_version"]) is not int or value["schema_version"] != 1:
        raise JournalValidationError()
    tx = parse_transaction_id(value["transaction_id"])
    path = value["journal_path"]
    expected = f"transactions/{tx}/journal.json"
    if type(path) is not str or path != expected or "\\" in path:
        raise JournalValidationError()
    return ActiveTransaction(1, tx, path)


def _reject_duplicate_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise JournalValidationError()
        result[key] = value
    return result


def _reject_constant(_value):
    raise JournalValidationError()


def _canonical_bytes(value: dict[str, object]) -> bytes:
    try:
        return (
            json.dumps(
                value,
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise JournalValidationError() from error


def _parse_canonical_text(text: str, parser):
    if type(text) is not str:
        raise JournalValidationError()
    try:
        value = json.loads(
            text,
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        parsed = parser(value)
    except JournalValidationError:
        raise
    except (TypeError, ValueError, json.JSONDecodeError) as error:
        raise JournalValidationError() from error
    serializer = journal_to_value if isinstance(parsed, UpdateJournal) else active_transaction_to_value
    if text.encode("utf-8") != _canonical_bytes(serializer(parsed)):
        raise JournalValidationError()
    return parsed


def parse_journal_text(text: str) -> UpdateJournal:
    return _parse_canonical_text(text, parse_journal)


def parse_active_transaction_text(text: str) -> ActiveTransaction:
    return _parse_canonical_text(text, parse_active_transaction)


def _write_atomic(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=".tmp-", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(_canonical_bytes(value))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except Exception:
        try:
            os.close(descriptor)
        except OSError:
            pass
        temporary.unlink(missing_ok=True)
        raise


def write_journal_atomic(path: Path, journal: UpdateJournal) -> None:
    _write_atomic(path, journal_to_value(journal))


def write_active_transaction_atomic(path: Path, active: ActiveTransaction) -> None:
    _write_atomic(path, active_transaction_to_value(active))


def read_journal(path: Path) -> UpdateJournal:
    try:
        parsed = parse_journal_text(path.read_text(encoding="utf-8"))
        resolve_ownership_path(path, parsed)
        return parsed
    except JournalValidationError:
        raise
    except (OSError, UnicodeError) as error:
        raise JournalValidationError() from error


def read_active_transaction(path: Path) -> ActiveTransaction:
    try:
        return parse_active_transaction_text(path.read_text(encoding="utf-8"))
    except JournalValidationError:
        raise
    except (OSError, UnicodeError) as error:
        raise JournalValidationError() from error


def resolve_ownership_path(path: Path, journal: UpdateJournal) -> Path:
    if not isinstance(path, Path) or path.name != "journal.json":
        raise JournalValidationError()
    if journal.ownership_path != "ownership.json":
        raise JournalValidationError()
    root = path.parent.resolve(strict=False)
    resolved = root / PurePosixPath(journal.ownership_path)
    if resolved.parent != root:
        raise JournalValidationError()
    return resolved


def resolve_active_journal(updates_root: Path, active: ActiveTransaction) -> Path:
    if not isinstance(updates_root, Path):
        raise JournalValidationError()
    parsed = parse_active_transaction(active_transaction_to_value(active))
    root = updates_root.resolve(strict=False)
    resolved = root.joinpath(*PurePosixPath(parsed.journal_path).parts).resolve(
        strict=False
    )
    try:
        resolved.relative_to(root / "transactions")
    except ValueError as error:
        raise JournalValidationError() from error
    return resolved


def new_staging_journal(
    *,
    transaction_id: str,
    initiator: UpdateInitiator,
    target_version: str,
    prior_version: str | None,
    fresh_install: bool,
    ownership_sha256: str,
) -> UpdateJournal:
    journal = UpdateJournal(
        schema_version=JOURNAL_SCHEMA_VERSION,
        transaction_id=parse_transaction_id(transaction_id),
        phase=JournalPhase.STAGING,
        initiator=initiator,
        target_version=target_version,
        prior_version=prior_version,
        fresh_install=fresh_install,
        ownership_path="ownership.json",
        ownership_sha256=ownership_sha256,
        initiating_process=None,
        seed_receipt=None,
        reason_code=None,
        original_failure_code=None,
        rollback_from=None,
    )
    return _validate_journal(journal)


_FORWARD_NEXT = {
    JournalPhase.STAGING: JournalPhase.PREPARED,
    JournalPhase.PREPARED: JournalPhase.WAITING_FOR_HOST_EXIT,
    JournalPhase.WAITING_FOR_HOST_EXIT: JournalPhase.HOST_BACKED_UP,
    JournalPhase.HOST_BACKED_UP: JournalPhase.HOST_INSTALLED,
    JournalPhase.HOST_INSTALLED: JournalPhase.EXTENSION_BACKED_UP,
    JournalPhase.EXTENSION_BACKED_UP: JournalPhase.EXTENSION_INSTALLED,
    JournalPhase.EXTENSION_INSTALLED: JournalPhase.METADATA_INSTALLED,
    JournalPhase.METADATA_INSTALLED: JournalPhase.PROBING,
    JournalPhase.PROBING: JournalPhase.COMMITTED,
}


def transition(
    journal: UpdateJournal,
    next_phase: JournalPhase,
    *,
    initiating_process: InitiatingProcessIdentity | None = None,
    failure_code: JournalReason | None = None,
) -> UpdateJournal:
    try:
        _validate_journal(journal)
        next_phase = JournalPhase(next_phase)
        if _FORWARD_NEXT.get(journal.phase) is next_phase:
            identity = journal.initiating_process
            if next_phase is JournalPhase.WAITING_FOR_HOST_EXIT:
                identity = initiating_process
            elif initiating_process is not None:
                raise JournalTransitionError()
            result = replace(journal, phase=next_phase, initiating_process=identity)
        elif journal.phase in FORWARD_PHASES and next_phase is JournalPhase.ROLLING_BACK:
            if failure_code not in FORWARD_FAILURE_CODES:
                raise JournalTransitionError()
            result = replace(
                journal,
                phase=next_phase,
                reason_code=failure_code,
                original_failure_code=failure_code,
                rollback_from=journal.phase,
            )
        elif journal.phase is JournalPhase.ROLLING_BACK and next_phase is JournalPhase.RECOVERY_REQUIRED:
            if failure_code not in RECOVERY_REASON_CODES:
                raise JournalTransitionError()
            result = replace(journal, phase=next_phase, reason_code=failure_code)
        elif journal.phase is JournalPhase.RECOVERY_REQUIRED and next_phase is JournalPhase.ROLLING_BACK:
            if failure_code not in (None, journal.original_failure_code):
                raise JournalTransitionError()
            result = replace(
                journal,
                phase=next_phase,
                reason_code=journal.original_failure_code,
            )
        elif journal.phase is JournalPhase.ROLLING_BACK and next_phase is JournalPhase.ROLLED_BACK:
            if failure_code not in (None, journal.original_failure_code):
                raise JournalTransitionError()
            result = replace(
                journal,
                phase=next_phase,
                reason_code=journal.original_failure_code,
            )
        else:
            raise JournalTransitionError()
        return _validate_journal(result)
    except JournalTransitionError:
        raise
    except (JournalValidationError, TypeError, ValueError) as error:
        raise JournalTransitionError() from error


def record_seed_receipt(
    journal: UpdateJournal, receipt: SeedOperationReceipt
) -> UpdateJournal:
    if journal.seed_receipt is not None or journal.phase not in (
        JournalPhase.EXTENSION_BACKED_UP,
        JournalPhase.EXTENSION_INSTALLED,
    ):
        raise JournalTransitionError()
    return _validate_journal(replace(journal, seed_receipt=receipt))


def terminal_version(journal: UpdateJournal) -> TerminalVersion:
    _validate_journal(journal)
    if journal.phase is JournalPhase.COMMITTED:
        return TerminalVersion(journal.target_version, journal.fresh_install)
    if journal.phase is JournalPhase.ROLLED_BACK:
        return TerminalVersion(
            None if journal.fresh_install else journal.prior_version,
            journal.fresh_install,
        )
    raise JournalValidationError()


def terminal_version_to_value(value: TerminalVersion) -> dict[str, object]:
    parsed = parse_terminal_version(
        {"fresh_install": value.fresh_install, "version": value.version}
    )
    return {"fresh_install": parsed.fresh_install, "version": parsed.version}


def parse_terminal_version(value: object) -> TerminalVersion:
    if type(value) is not dict or set(value) != {"fresh_install", "version"}:
        raise JournalValidationError()
    fresh = value["fresh_install"]
    version = value["version"]
    if type(fresh) is not bool:
        raise JournalValidationError()
    if version is None:
        if not fresh:
            raise JournalValidationError()
    elif type(version) is not str or not version:
        raise JournalValidationError()
    return TerminalVersion(version=version, fresh_install=fresh)
