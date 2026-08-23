"""Compile-only shell for the locked Plan E executor RED commit."""

from __future__ import annotations

from collections.abc import Sequence as _Sequence
from dataclasses import dataclass as _dataclass
from pathlib import Path as _Path
import sys as _sys
from typing import BinaryIO as _BinaryIO
from typing import Protocol as _Protocol


__all__ = (
    "RecordSchema",
    "ParsedCommand",
    "CliResult",
    "CommandSpec",
    "ProducerSpec",
    "Adapters",
    "canonical_json_bytes",
    "load_canonical_json",
    "parse_cli",
    "execute_command",
    "emit_result",
    "main",
)


@_dataclass(frozen=True)
class RecordSchema:
    name: str
    fields: tuple[tuple[str, object], ...]


@_dataclass(frozen=True)
class ParsedCommand:
    name: str
    options: tuple[tuple[str, str], ...]


@_dataclass(frozen=True)
class CliResult:
    schema_version: int
    command: str
    status: str
    code: str
    fields: tuple[tuple[str, object], ...]


@_dataclass(frozen=True)
class CommandSpec:
    command_id: str
    executable_role: str
    argv: tuple[str, ...]
    cwd_role: str
    environment: tuple[tuple[str, str], ...]
    timeout_seconds: int
    stdin_policy: str
    stdout_limit_bytes: int
    stderr_limit_bytes: int


@_dataclass(frozen=True)
class ProducerSpec:
    producer_id: str
    dependencies: tuple[str, ...]
    commands: tuple[CommandSpec, ...]
    candidate_paths: tuple[str, ...]
    source_roots: tuple[str, ...]
    worktree_policy: str
    validator_id: str


class Adapters(_Protocol):
    def repository_root(self) -> _Path:
        ...

    def common_dir(self) -> _Path:
        ...

    def state_root(self) -> _Path:
        ...

    def filesystem(self, operation: str, arguments: tuple[object, ...]) -> object:
        ...

    def git(self, operation: str, arguments: tuple[object, ...]) -> object:
        ...

    def process(self, operation: str, arguments: tuple[object, ...]) -> object:
        ...

    def mutex(self, operation: str, arguments: tuple[object, ...]) -> object:
        ...

    def clock(self, operation: str, arguments: tuple[object, ...]) -> object:
        ...

    def randomness(self, operation: str, arguments: tuple[object, ...]) -> object:
        ...


_COMMAND_SPECS: tuple[CommandSpec, ...] = ()
_PRODUCER_SPECS: tuple[ProducerSpec, ...] = ()


def canonical_json_bytes(value: object) -> bytes:
    del value
    return b"{}\n"


def load_canonical_json(path: _Path, schema: RecordSchema) -> dict[str, object]:
    del path, schema
    return {}


def parse_cli(argv: _Sequence[str]) -> ParsedCommand:
    del argv
    return ParsedCommand(name="inert", options=())


def execute_command(command: ParsedCommand, adapters: Adapters) -> CliResult:
    del adapters
    return CliResult(0, command.name, "inert", "not_implemented", ())


def emit_result(result: CliResult, stream: _BinaryIO) -> None:
    del result, stream


def _make_adapters() -> Adapters:
    raise RuntimeError("not implemented")


def _stdout_stream() -> _BinaryIO:
    return _sys.stdout.buffer


def main(argv: _Sequence[str] | None = None) -> int:
    del argv
    return 5


if __name__ == "__main__":
    raise SystemExit(main())
