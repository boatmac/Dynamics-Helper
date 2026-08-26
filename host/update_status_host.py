import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from native_messaging import NativeMessageError, read_native_message, write_message
from native_registration import ALLOWED_ORIGINS
from update_journal import (
    JournalPhase,
    JournalReason,
    JournalValidationError,
    TransactionPaths,
    UpdateJournal,
    parse_transaction_id,
    read_journal,
)


STATUS_MAX_REQUEST_BYTES = 64 * 1024
PARENT_WINDOW_RE = re.compile(r"^--parent-window=([0-9]+)$", re.ASCII)
ALLOWED_PHASES = frozenset(phase.value for phase in JournalPhase)
ALLOWED_REASONS = frozenset(reason.value for reason in JournalReason)


class StatusHostArgumentError(ValueError):
    def __init__(self) -> None:
        super().__init__("invalid_status_host_arguments")


class StatusHostProtocolError(ValueError):
    _ALLOWED = frozenset(
        {
            "invalid_request",
            "unknown_action",
            "unknown_transaction",
            "invalid_journal_phase",
            "invalid_journal_reason",
        }
    )

    def __init__(self, error_code: str) -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_status_error")
        self.error_code = error_code
        super().__init__(error_code)


@dataclass(frozen=True)
class ChromeLaunch:
    origin: str
    parent_window: int | None

    def __post_init__(self) -> None:
        if (
            type(self.origin) is not str
            or self.origin not in ALLOWED_ORIGINS
            or (
                self.parent_window is not None
                and (
                    type(self.parent_window) is not int
                    or self.parent_window < 0
                )
            )
        ):
            raise StatusHostArgumentError()


def parse_chrome_launch_args(argv: Sequence[str]) -> ChromeLaunch:
    if (
        isinstance(argv, (str, bytes))
        or len(argv) not in (1, 2)
        or type(argv[0]) is not str
        or argv[0] not in ALLOWED_ORIGINS
    ):
        raise StatusHostArgumentError()
    parent_window = None
    if len(argv) == 2:
        if type(argv[1]) is not str:
            raise StatusHostArgumentError()
        match = PARENT_WINDOW_RE.fullmatch(argv[1])
        if match is None:
            raise StatusHostArgumentError()
        parent_window = int(match.group(1), 10)
    return ChromeLaunch(argv[0], parent_window)


def project_update_status(journal: UpdateJournal) -> dict[str, object]:
    if journal.phase.value not in ALLOWED_PHASES:
        raise StatusHostProtocolError("invalid_journal_phase")
    reason = journal.reason_code
    if reason is not None and reason.value not in ALLOWED_REASONS:
        raise StatusHostProtocolError("invalid_journal_reason")
    return {
        "transactionId": journal.transaction_id,
        "phase": journal.phase.value,
        "targetVersion": journal.target_version,
        "reasonCode": reason.value if reason is not None else None,
    }


def _status_error(
    request_id: str | None,
    error_code: str,
) -> dict[str, object]:
    return {
        "requestId": request_id,
        "status": "error",
        "error_code": error_code,
    }


def _handle_status_request(
    message: dict[str, object],
    install_root: Path,
    journal_reader: Callable[[Path], UpdateJournal],
) -> dict[str, object]:
    if not set(message).issubset({"requestId", "action", "payload"}):
        raise StatusHostProtocolError("invalid_request")
    request_id = message.get("requestId")
    if request_id is not None and type(request_id) is not str:
        raise StatusHostProtocolError("invalid_request")
    action = message.get("action")
    if type(action) is not str:
        raise StatusHostProtocolError("invalid_request")
    if action == "ping":
        if set(message) not in ({"action"}, {"requestId", "action"}):
            raise StatusHostProtocolError("invalid_request")
        return {
            "requestId": request_id,
            "status": "success",
            "data": "pong",
        }
    if action != "get_update_status":
        raise StatusHostProtocolError("unknown_action")
    if set(message) not in (
        {"action", "payload"},
        {"requestId", "action", "payload"},
    ):
        raise StatusHostProtocolError("invalid_request")
    payload = message["payload"]
    if type(payload) is not dict or set(payload) != {"transactionId"}:
        raise StatusHostProtocolError("invalid_request")
    try:
        transaction_id = parse_transaction_id(payload["transactionId"])
        journal_path = TransactionPaths.for_install(
            install_root, transaction_id
        ).journal
        journal = journal_reader(journal_path)
    except (FileNotFoundError, JournalValidationError) as error:
        raise StatusHostProtocolError("unknown_transaction") from error
    if journal.transaction_id != transaction_id:
        raise StatusHostProtocolError("unknown_transaction")
    return {
        "requestId": request_id,
        "status": "success",
        "data": project_update_status(journal),
    }


def serve_status_host(
    input_stream: BinaryIO,
    output_stream: BinaryIO,
    install_root: Path,
    journal_reader: Callable[[Path], UpdateJournal] = read_journal,
) -> int:
    while True:
        try:
            message = read_native_message(
                input_stream,
                max_payload_bytes=STATUS_MAX_REQUEST_BYTES,
            )
        except NativeMessageError:
            return 2
        if message is None:
            return 0
        request_id = (
            message.get("requestId")
            if type(message.get("requestId")) is str
            else None
        )
        try:
            response = _handle_status_request(
                message, install_root, journal_reader
            )
        except StatusHostProtocolError as error:
            response = _status_error(request_id, error.error_code)
        except (JournalValidationError, ValueError, OSError):
            response = _status_error(request_id, "invalid_request")
        write_message(output_stream, response)
