import ast
import io
import json
import struct
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from native_messaging import read_native_message, write_message
from native_registration import ALLOWED_ORIGINS
from product_info import VERSION
from test_update_engine_host import TX, make_package
from test_update_support import FakeMutationMutex
from update_engine import UpdateEngine
from update_journal import (
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    UpdateInitiator,
    read_journal,
)
from update_status_host import (
    STATUS_MAX_REQUEST_BYTES,
    ChromeLaunch,
    StatusHostArgumentError,
    parse_chrome_launch_args,
    project_update_status,
    serve_status_host,
)


class StatusArgTests(unittest.TestCase):
    def test_accepts_allowlisted_origin_and_optional_decimal_parent(self):
        origin = ALLOWED_ORIGINS[0]
        self.assertEqual(
            parse_chrome_launch_args([origin]),
            ChromeLaunch(origin=origin, parent_window=None),
        )
        self.assertEqual(
            parse_chrome_launch_args([origin, "--parent-window=123"]),
            ChromeLaunch(origin=origin, parent_window=123),
        )
        self.assertEqual(
            parse_chrome_launch_args([origin, "--parent-window=0"]),
            ChromeLaunch(origin=origin, parent_window=0),
        )
        self.assertEqual(
            parse_chrome_launch_args([origin, "--parent-window=00"]),
            ChromeLaunch(origin=origin, parent_window=0),
        )

    def test_rejects_path_id_unknown_origin_and_nondecimal_parent(self):
        origin = ALLOWED_ORIGINS[0]
        invalid = (
            [],
            ["chrome-extension://unknown/"],
            [origin, r"C:\journal.json"],
            [origin, TX],
            [origin, "--parent-window=-1"],
            [origin, "--parent-window=0x10"],
            [origin, "--parent-window= 1"],
            [origin, "--parent-window=1", "--parent-window=2"],
            [origin, 1],
        )
        for argv in invalid:
            with self.subTest(argv=argv), self.assertRaises(
                StatusHostArgumentError
            ):
                parse_chrome_launch_args(argv)

    def test_direct_chrome_launch_accepts_zero_and_rejects_bool_or_negative(self):
        origin = ALLOWED_ORIGINS[0]
        self.assertEqual(ChromeLaunch(origin, 0).parent_window, 0)
        for value in (True, -1):
            with self.subTest(value=value), self.assertRaises(
                StatusHostArgumentError
            ):
                ChromeLaunch(origin, value)


class HeaderOnlyStream:
    def __init__(self, announced_size: int):
        self.announced_size = announced_size
        self.read_sizes = []

    def read(self, size: int) -> bytes:
        self.read_sizes.append(size)
        if self.read_sizes == [4]:
            return struct.pack("<I", self.announced_size)
        raise AssertionError("status Host attempted to read an oversized body")


def frame_messages(*messages):
    stream = io.BytesIO()
    for message in messages:
        write_message(stream, message)
    stream.seek(0)
    return stream


def read_responses(stream):
    stream.seek(0)
    result = []
    while True:
        value = read_native_message(stream)
        if value is None:
            return result
        result.append(value)


class StatusProtocolTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.install = self.root / "install"
        self.install.mkdir()
        package = make_package(self.root)
        mutex = FakeMutationMutex()
        engine = UpdateEngine(
            self.install, mutex_factory=lambda _root: mutex
        )
        engine.create_prepared(
            package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        engine.activate_prepared(
            TX, InitiatingProcessIdentity(77, "win-create-time-77")
        )
        self.journal = read_journal(
            self.install / "updates/transactions" / TX / "journal.json"
        )

    def test_ping_and_exact_status_are_framed(self):
        input_stream = frame_messages(
            {"requestId": "p", "action": "ping"},
            {
                "requestId": "s",
                "action": "get_update_status",
                "payload": {"transactionId": TX},
            },
        )
        output = io.BytesIO()
        self.assertEqual(serve_status_host(input_stream, output, self.install), 0)
        responses = read_responses(output)
        self.assertEqual(
            responses[0],
            {"requestId": "p", "status": "success", "data": "pong"},
        )
        self.assertEqual(
            responses[1],
            {
                "requestId": "s",
                "status": "success",
                "data": {
                    "transactionId": TX,
                    "phase": "waiting-for-host-exit",
                    "targetVersion": VERSION,
                    "reasonCode": None,
                },
            },
        )

    def test_reason_projection_exposes_only_current_reason(self):
        recovery = replace(
            self.journal,
            phase=JournalPhase.RECOVERY_REQUIRED,
            reason_code=JournalReason.ROLLBACK_FAILED,
            original_failure_code=JournalReason.HOST_INSTALL_FAILED,
            rollback_from=JournalPhase.HOST_BACKED_UP,
        )
        projected = project_update_status(recovery)
        self.assertEqual(projected["reasonCode"], "rollback_failed")
        self.assertNotIn("originalFailureCode", projected)
        self.assertNotIn("rollbackFrom", projected)

    def test_malformed_unknown_other_id_and_unknown_transaction_are_safe_errors(self):
        other = "fedcba9876543210fedcba9876543210"
        messages = (
            {"requestId": 1, "action": "ping"},
            {"requestId": "x", "action": "unknown"},
            {"requestId": "x", "action": "ping", "extra": True},
            {
                "requestId": "x",
                "action": "get_update_status",
                "payload": {"transactionId": other, "extra": True},
            },
            {
                "requestId": "u",
                "action": "get_update_status",
                "payload": {"transactionId": other},
            },
        )
        output = io.BytesIO()
        self.assertEqual(
            serve_status_host(frame_messages(*messages), output, self.install),
            0,
        )
        errors = read_responses(output)
        self.assertEqual(
            [value["error_code"] for value in errors],
            [
                "invalid_request",
                "unknown_action",
                "invalid_request",
                "invalid_request",
                "unknown_transaction",
            ],
        )
        self.assertEqual(errors[-1]["requestId"], "u")

    def test_malformed_frame_exits_two_without_response(self):
        output = io.BytesIO()
        self.assertEqual(
            serve_status_host(io.BytesIO(b"\x01"), output, self.install), 2
        )
        self.assertEqual(output.getvalue(), b"")

    def test_clean_eof_exits_zero(self):
        self.assertEqual(
            serve_status_host(io.BytesIO(), io.BytesIO(), self.install), 0
        )

    def test_rejects_more_than_64_kib_before_reading_body(self):
        input_stream = HeaderOnlyStream(STATUS_MAX_REQUEST_BYTES + 1)
        output_stream = io.BytesIO()
        result = serve_status_host(
            input_stream,
            output_stream,
            Path.cwd(),
            journal_reader=lambda _path: self.fail("journal read attempted"),
        )
        self.assertEqual(result, 2)
        self.assertEqual(input_stream.read_sizes, [4])
        self.assertEqual(output_stream.getvalue(), b"")


class StatusReadOnlyTests(unittest.TestCase):
    def test_module_has_no_mutation_dependency_or_operation(self):
        path = Path("host/update_status_host.py")
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        forbidden_names = {
            "UpdateEngine",
            "update_mutex",
            "winreg",
            "RunOnce",
            "unlink",
            "rmtree",
            "replace",
            "write_text",
            "write_bytes",
        }
        names = {
            node.id for node in ast.walk(tree) if isinstance(node, ast.Name)
        }
        attributes = {
            node.attr
            for node in ast.walk(tree)
            if isinstance(node, ast.Attribute)
        }
        imports = {
            alias.name
            for node in tree.body
            if isinstance(node, (ast.Import, ast.ImportFrom))
            for alias in node.names
        }
        self.assertFalse(forbidden_names & (names | attributes | imports))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id == "open":
                    self.assertFalse(
                        len(node.args) > 1
                        and isinstance(node.args[1], ast.Constant)
                        and any(flag in node.args[1].value for flag in "wa+")
                    )


if __name__ == "__main__":
    unittest.main()
