import os
import shutil
import stat
import uuid
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from native_registration import RegistryBackend, register_status_manifest
from package_manifest import sha256_file


class RecoveryError(RuntimeError):
    _ALLOWED = frozenset(
        {
            "update_recovery_failed",
            "invalid_runner_source",
            "invalid_updates_root",
            "invalid_recovery_root",
            "incomplete_onedir_runtime",
            "unsupported_runner_entry",
            "unexpected_recovery_entry",
            "runner_copy_mismatch",
            "install_root_mismatch",
            "active_path_mismatch",
            "active_journal_mismatch",
            "transaction_path_mismatch",
            "initiating_process_identity_missing",
            "initiating_process_identity_mismatch",
            "initiating_process_handle_missing",
            "host_exit_wait_failed",
            "staged_probe_failed",
            "startup_probe_failed",
            "update_activation_failed",
            "journal_outside_updates",
        }
    )

    def __init__(self, error_code: str = "update_recovery_failed") -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_recovery_error")
        self.error_code = error_code
        super().__init__(error_code)


class RunnerSource(StrEnum):
    CURRENT = "current"
    STAGED = "staged"


@dataclass(frozen=True, order=True)
class RuntimeFile:
    path: str
    sha256: str


@dataclass(frozen=True)
class OnedirInventory:
    executable_sha256: str
    internal_directories: tuple[str, ...]
    internal_files: tuple[RuntimeFile, ...]


def _require_absolute_path(path: Path, error_code: str) -> None:
    if (
        not isinstance(path, Path)
        or not path.is_absolute()
        or ".." in path.parts
    ):
        raise RecoveryError(error_code)


def _lstat_plain(
    path: Path,
    *,
    require_directory: bool | None,
):
    try:
        info = path.lstat()
    except OSError as error:
        raise RecoveryError("incomplete_onedir_runtime") from error
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if getattr(info, "st_file_attributes", 0) & reparse:
        raise RecoveryError("unsupported_runner_entry")
    if require_directory is True and not stat.S_ISDIR(info.st_mode):
        raise RecoveryError("unsupported_runner_entry")
    if require_directory is False and not stat.S_ISREG(info.st_mode):
        raise RecoveryError("unsupported_runner_entry")
    if require_directory is None and not (
        stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)
    ):
        raise RecoveryError("unsupported_runner_entry")
    return info


def _require_plain_ancestor_chain(directory: Path) -> None:
    _require_absolute_path(directory, "invalid_runner_source")
    current = Path(directory.anchor)
    for part in directory.parts[1:]:
        current = current / part
        if current.exists() or current.is_symlink():
            _lstat_plain(current, require_directory=True)


def _copy_plain_file(
    source: Path,
    destination: Path,
    expected_sha256: str,
) -> None:
    _lstat_plain(source, require_directory=False)
    _lstat_plain(destination.parent, require_directory=True)
    try:
        with source.open("rb") as input_stream, destination.open("xb") as output:
            shutil.copyfileobj(input_stream, output, length=1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
        _lstat_plain(destination, require_directory=False)
        if sha256_file(destination) != expected_sha256:
            raise RecoveryError("runner_copy_mismatch")
    except Exception:
        destination.unlink(missing_ok=True)
        raise


def _inventory_internal(
    internal: Path,
) -> tuple[tuple[str, ...], tuple[RuntimeFile, ...]]:
    _lstat_plain(internal, require_directory=True)
    try:
        root = internal.resolve(strict=True)
    except OSError as error:
        raise RecoveryError("incomplete_onedir_runtime") from error
    directories: list[str] = []
    files: list[RuntimeFile] = []

    def visit(directory: Path) -> None:
        try:
            children = sorted(directory.iterdir(), key=lambda path: path.name)
        except OSError as error:
            raise RecoveryError("incomplete_onedir_runtime") from error
        for child in children:
            info = _lstat_plain(child, require_directory=None)
            relative = child.relative_to(root).as_posix()
            if stat.S_ISDIR(info.st_mode):
                directories.append(relative)
                visit(child)
            else:
                files.append(RuntimeFile(relative, sha256_file(child)))

    visit(root)
    return tuple(sorted(directories)), tuple(sorted(files))


def select_runner_source(
    kind: RunnerSource,
    current_runtime_root: Path,
    staged_host_root: Path,
) -> Path:
    if type(kind) is not RunnerSource:
        raise RecoveryError("invalid_runner_source")
    source = (
        current_runtime_root
        if kind is RunnerSource.CURRENT
        else staged_host_root
    )
    inventory_onedir(source)
    return source.resolve(strict=True)


def inventory_onedir(source: Path) -> OnedirInventory:
    _require_absolute_path(source, "invalid_runner_source")
    _require_plain_ancestor_chain(source)
    try:
        _lstat_plain(source, require_directory=True)
        executable = source / "dh_native_host.exe"
        internal = source / "_internal"
        _lstat_plain(executable, require_directory=False)
        _lstat_plain(internal, require_directory=True)
        for child in sorted(source.iterdir(), key=lambda path: path.name):
            _lstat_plain(child, require_directory=None)
        directories, files = _inventory_internal(internal)
    except RecoveryError as error:
        if error.error_code == "unsupported_runner_entry":
            raise
        raise RecoveryError("incomplete_onedir_runtime") from error
    except OSError as error:
        raise RecoveryError("incomplete_onedir_runtime") from error
    if not files:
        raise RecoveryError("incomplete_onedir_runtime")
    return OnedirInventory(
        executable_sha256=sha256_file(executable),
        internal_directories=directories,
        internal_files=files,
    )


def validate_recovery_tree(
    recovery_root: Path,
    expected: OnedirInventory | None = None,
) -> OnedirInventory:
    _require_absolute_path(recovery_root, "invalid_recovery_root")
    _require_plain_ancestor_chain(recovery_root)
    try:
        _lstat_plain(recovery_root, require_directory=True)
        runner = recovery_root / "dh_update_runner.exe"
        status = recovery_root / "dh_update_status_host.exe"
        internal = recovery_root / "_internal"
        _lstat_plain(runner, require_directory=False)
        _lstat_plain(status, require_directory=False)
        _lstat_plain(internal, require_directory=True)
        runner_sha256 = sha256_file(runner)
        if sha256_file(status) != runner_sha256:
            raise RecoveryError("runner_copy_mismatch")
        directories, internal_files = _inventory_internal(internal)
    except RecoveryError as error:
        if error.error_code in (
            "unsupported_runner_entry",
            "runner_copy_mismatch",
        ):
            raise
        raise RecoveryError("incomplete_onedir_runtime") from error
    if not internal_files:
        raise RecoveryError("incomplete_onedir_runtime")
    fixed = {
        "dh_update_runner.exe",
        "dh_update_status_host.exe",
        "_internal",
        "status-manifest.json",
    }
    for child in sorted(recovery_root.iterdir(), key=lambda path: path.name):
        if child.name in fixed:
            if child.name == "status-manifest.json":
                _lstat_plain(child, require_directory=False)
            continue
        raise RecoveryError("unexpected_recovery_entry")
    actual = OnedirInventory(
        executable_sha256=runner_sha256,
        internal_directories=directories,
        internal_files=internal_files,
    )
    if expected is not None and actual != expected:
        raise RecoveryError("runner_copy_mismatch")
    return actual


def install_recovery_tree(source: Path, updates_root: Path) -> Path:
    expected = inventory_onedir(source)
    source = source.resolve(strict=True)
    _require_absolute_path(updates_root, "invalid_updates_root")
    if updates_root.name.casefold() != "updates":
        raise RecoveryError("invalid_updates_root")
    active_bytes = None
    if updates_root.exists():
        _require_plain_ancestor_chain(updates_root)
        _lstat_plain(updates_root, require_directory=True)
        active_path = updates_root / "active.json"
        if active_path.exists() or active_path.is_symlink():
            _lstat_plain(active_path, require_directory=False)
            active_bytes = active_path.read_bytes()
    else:
        _require_plain_ancestor_chain(updates_root.parent)
        updates_root.mkdir(parents=True)
        _lstat_plain(updates_root, require_directory=True)
    updates = updates_root.resolve(strict=True)
    recovery = updates / "recovery"
    token = uuid.uuid4().hex
    new_root = updates / f".recovery.{token}.new"
    old_root = updates / f".recovery.{token}.old"
    try:
        new_root.mkdir()
        internal = new_root / "_internal"
        internal.mkdir()
        for relative in expected.internal_directories:
            internal.joinpath(*relative.split("/")).mkdir()
        for record in expected.internal_files:
            source_file = source / "_internal" / Path(*record.path.split("/"))
            destination = internal / Path(*record.path.split("/"))
            _copy_plain_file(source_file, destination, record.sha256)
        executable = source / "dh_native_host.exe"
        _copy_plain_file(
            executable,
            new_root / "dh_update_runner.exe",
            expected.executable_sha256,
        )
        _copy_plain_file(
            executable,
            new_root / "dh_update_status_host.exe",
            expected.executable_sha256,
        )
        validate_recovery_tree(new_root, expected)
        if recovery.exists() or recovery.is_symlink():
            validate_recovery_tree(recovery)
            os.replace(recovery, old_root)
        try:
            os.replace(new_root, recovery)
        except Exception:
            if old_root.exists() and not recovery.exists():
                os.replace(old_root, recovery)
            raise
        if old_root.exists():
            shutil.rmtree(old_root, ignore_errors=False)
        active_path = updates / "active.json"
        if active_bytes is None:
            if active_path.exists() or active_path.is_symlink():
                raise RecoveryError("active_path_mismatch")
        else:
            _lstat_plain(active_path, require_directory=False)
            if active_path.read_bytes() != active_bytes:
                raise RecoveryError("active_path_mismatch")
        return recovery.resolve(strict=True)
    except Exception:
        if new_root.exists():
            shutil.rmtree(new_root)
        raise


def register_status_host(
    recovery_root: Path,
    registry: RegistryBackend,
) -> Path:
    validate_recovery_tree(recovery_root)
    return register_status_manifest(recovery_root, registry)
