import json
import struct
from typing import BinaryIO


MAX_MESSAGE_BYTES = 1_048_576


class NativeMessageError(ValueError):
    def __init__(self, error_code: str) -> None:
        self.error_code = error_code
        super().__init__(error_code)


def _reject_constant(_value: str) -> object:
    raise ValueError("non_finite_json_number")


def _reject_duplicate_pairs(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_json_key")
        result[key] = value
    return result


def read_native_message(
    stream: BinaryIO,
    *,
    max_payload_bytes: int | None = None,
) -> dict[str, object] | None:
    header = stream.read(4)
    if header == b"":
        return None
    if len(header) != 4:
        raise NativeMessageError("truncated_native_header")
    size = struct.unpack("<I", header)[0]
    if size == 0:
        raise NativeMessageError("empty_native_message")
    if max_payload_bytes is not None and size > max_payload_bytes:
        raise NativeMessageError("native_message_too_large")
    payload = stream.read(size)
    if len(payload) != size:
        raise NativeMessageError("truncated_native_message")
    try:
        value = json.loads(
            payload.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
    except (UnicodeDecodeError, ValueError) as error:
        raise NativeMessageError("invalid_native_message") from error
    if type(value) is not dict:
        raise NativeMessageError("native_message_must_be_object")
    return value


def write_message(
    stream: BinaryIO,
    message: dict[str, object],
    *,
    max_bytes: int = MAX_MESSAGE_BYTES,
) -> None:
    if type(message) is not dict:
        raise NativeMessageError("native_message_must_be_object")
    try:
        payload = json.dumps(
            message,
            ensure_ascii=True,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
    except (TypeError, ValueError, OverflowError) as error:
        raise NativeMessageError("invalid_native_message") from error
    if len(payload) == 0 or len(payload) > max_bytes:
        raise NativeMessageError("native_message_too_large")
    stream.write(struct.pack("<I", len(payload)))
    stream.write(payload)
    stream.flush()
