import asyncio
import io
import json
import struct
import unittest

from native_messaging import (
    MAX_MESSAGE_BYTES,
    NativeMessageError,
    read_native_message,
    write_message,
)
from host.dh_native_host import NativeHost


class FlushBytesIO(io.BytesIO):
    def __init__(self):
        super().__init__()
        self.flush_count = 0

    def flush(self):
        self.flush_count += 1
        return super().flush()


def frame(payload: bytes) -> bytes:
    return struct.pack("<I", len(payload)) + payload


class NativeMessagingTests(unittest.TestCase):
    def test_little_endian_writer_round_trips_through_little_endian_reader(self):
        output = FlushBytesIO()
        message = {"requestId": "r1", "status": "success"}
        write_message(output, message)
        raw = output.getvalue()
        self.assertEqual(struct.unpack("<I", raw[:4])[0], len(raw[4:]))
        self.assertEqual(read_native_message(io.BytesIO(raw)), message)
        self.assertEqual(output.flush_count, 1)

    def test_reader_accepts_a_little_endian_peer_frame(self):
        payload = b'{"action":"ping"}'
        self.assertEqual(
            read_native_message(io.BytesIO(frame(payload))),
            {"action": "ping"},
        )

    def test_clean_eof_returns_none(self):
        self.assertIsNone(read_native_message(io.BytesIO()))

    def test_truncated_header_or_body_is_rejected(self):
        cases = (
            (b"\x01", "truncated_native_header"),
            (struct.pack("<I", 4) + b"{}", "truncated_native_message"),
        )
        for raw, code in cases:
            with self.subTest(code=code):
                with self.assertRaisesRegex(NativeMessageError, f"^{code}$"):
                    read_native_message(io.BytesIO(raw))

    def test_zero_and_explicitly_oversized_lengths_are_rejected(self):
        cases = (
            (struct.pack("<I", 0), None, "empty_native_message"),
            (struct.pack("<I", 5), 4, "native_message_too_large"),
        )
        for raw, limit, code in cases:
            with self.subTest(code=code):
                with self.assertRaisesRegex(NativeMessageError, f"^{code}$"):
                    read_native_message(
                        io.BytesIO(raw), max_payload_bytes=limit
                    )

    def test_default_reader_accepts_analyze_payload_larger_than_one_mib(self):
        message = {
            "action": "analyze_error",
            "requestId": "large-analyze",
            "payload": {"prompt": "x" * (MAX_MESSAGE_BYTES + 1)},
        }
        payload = json.dumps(
            message,
            ensure_ascii=True,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
        self.assertGreater(len(payload), MAX_MESSAGE_BYTES)
        self.assertEqual(
            read_native_message(io.BytesIO(frame(payload))),
            message,
        )

    def test_invalid_utf8_duplicate_nonfinite_and_nonobject_are_rejected(self):
        cases = (
            (b"\xff", "invalid_native_message"),
            (b'{"a":1,"a":2}', "invalid_native_message"),
            (b'{"a":NaN}', "invalid_native_message"),
            (b"[]", "native_message_must_be_object"),
        )
        for payload, code in cases:
            with self.subTest(payload=payload):
                with self.assertRaisesRegex(NativeMessageError, f"^{code}$"):
                    read_native_message(io.BytesIO(frame(payload)))

    def test_writer_serialization_limit_and_flush_are_unchanged(self):
        output = FlushBytesIO()
        message = {"text": "ok", "value": 1}
        write_message(output, message)
        payload = output.getvalue()[4:]
        self.assertEqual(payload, b'{"text":"ok","value":1}')
        self.assertEqual(output.flush_count, 1)

        with self.assertRaisesRegex(
            NativeMessageError, "^native_message_too_large$"
        ):
            write_message(io.BytesIO(), {"text": "xx"}, max_bytes=1)

    def test_invalid_writer_writes_nothing(self):
        output = io.BytesIO()
        with self.assertRaisesRegex(NativeMessageError, "invalid_native_message"):
            write_message(output, {"value": object()})
        self.assertEqual(output.getvalue(), b"")

    def test_writer_requires_exact_dict(self):
        with self.assertRaisesRegex(
            NativeMessageError, "^native_message_must_be_object$"
        ):
            write_message(io.BytesIO(), [])


class NativeHostFramingIntegrationTests(unittest.IsolatedAsyncioTestCase):
    def make_host(self, input_bytes: bytes = b"") -> NativeHost:
        host = NativeHost.__new__(NativeHost)
        host.input_queue = asyncio.Queue()
        host.current_request_id = None
        host.loop = asyncio.get_running_loop()
        host.running = True
        host.send_progress = lambda _message: None
        host._native_input_stream = io.BytesIO(input_bytes)
        host._native_output_stream = FlushBytesIO()
        return host

    async def test_native_host_ping_response_uses_little_endian_frame(self):
        host = self.make_host()
        await host.process_message({"action": "ping", "requestId": "host-r1"})
        raw = host._native_output_stream.getvalue()
        self.assertEqual(struct.unpack("<I", raw[:4])[0], len(raw[4:]))
        self.assertEqual(
            read_native_message(io.BytesIO(raw)),
            {
                "requestId": "host-r1",
                "status": "success",
                "data": "pong",
            },
        )
        self.assertEqual(host._native_output_stream.flush_count, 1)

    async def test_little_endian_peer_ping_round_trips_through_native_host(self):
        peer = io.BytesIO()
        write_message(peer, {"action": "ping", "requestId": "peer-r1"})
        host = self.make_host(peer.getvalue())
        host._read_stdin_loop()
        request = await asyncio.wait_for(host.input_queue.get(), timeout=1.0)
        self.assertEqual(request, {"action": "ping", "requestId": "peer-r1"})
        await host.process_message(request)
        self.assertEqual(
            read_native_message(
                io.BytesIO(host._native_output_stream.getvalue())
            ),
            {
                "requestId": "peer-r1",
                "status": "success",
                "data": "pong",
            },
        )

    async def test_main_host_accepts_analyze_payload_larger_than_one_mib(self):
        message = {
            "action": "analyze_error",
            "requestId": "large-analyze",
            "payload": {"prompt": "x" * (MAX_MESSAGE_BYTES + 1)},
        }
        payload = json.dumps(
            message,
            ensure_ascii=True,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
        frame = struct.pack("<I", len(payload)) + payload
        host = self.make_host(frame)
        host._read_stdin_loop()
        request = await asyncio.wait_for(host.input_queue.get(), timeout=1.0)
        self.assertEqual(request, message)


if __name__ == "__main__":
    unittest.main()
