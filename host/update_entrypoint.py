import os
import stat
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import BinaryIO

from early_cli import dispatch_early_cli
from native_registration import (
    MainHostRuntime,
    RegistryBackend,
    WindowsRegistryBackend,
    register_main_host,
)
from update_journal import (
    InitiatingProcessIdentity,
    JournalPhase,
    JournalValidationError,
    TransactionPaths,
    UpdateInitiator,
    UpdateJournal,
    parse_transaction_id,
    read_active_transaction,
    read_journal,
    resolve_active_journal,
)
from update_mutex import UpdateAlreadyInProgress
from update_platform import validate_cli_process_identity_text
from update_recovery import RecoveryController, create_production_recovery_controller
from update_status_host import ChromeLaunch, parse_chrome_launch_args, serve_status_host


EXIT_SUCCESS = 0
EXIT_INVALID_ARGUMENTS = 2
EXIT_INSTALLER_UNAVAILABLE = 10
EXIT_ROLLED_BACK = 20
EXIT_RECOVERY_REQUIRED = 30
EXIT_ALREADY_IN_PROGRESS = 31
EXIT_PROBE_FAILED = 40
EXIT_INTERNAL_FAILURE = 50
INVALID_EARLY_INVOCATION = b"invalid_early_invocation\n"


class EntryMode(StrEnum):
    MAIN_HOST = "main-host"
    STATUS_HOST = "status-host"
    REGISTER = "register"
    COMPLETE_UPDATE = "complete-update"
    INSTALL_PACKAGE = "install-package"
    RECOVER_ACTIVE = "recover-active"
    RECOVER_UPDATE = "recover-update"


class ExecutableRole(StrEnum):
    PRODUCTION_MAIN = "production-main"
    SOURCE_MAIN = "source-main"
    DETACHED_RUNNER = "detached-runner"
    STATUS_HOST = "status-host"


class EarlyInvocationError(ValueError):
    def __init__(self) -> None:
        super().__init__("invalid_early_invocation")


@dataclass(frozen=True)
class EntrySelection:
    mode: EntryMode
    arguments: tuple[str, ...]

    def __post_init__(self) -> None:
        if (
            type(self.mode) is not EntryMode
            or type(self.arguments) is not tuple
            or any(type(value) is not str for value in self.arguments)
        ):
            raise ValueError("invalid_early_selection")


@dataclass(frozen=True)
class ValidatedMainHost:
    launch: ChromeLaunch | None


@dataclass(frozen=True)
class ValidatedStatusHost:
    install_root: Path
    launch: ChromeLaunch


@dataclass(frozen=True)
class ValidatedRegistration:
    host_root: Path
    runtime: MainHostRuntime


@dataclass(frozen=True)
class ValidatedProbe:
    entrypoint: Path
    manifest_path: Path


@dataclass(frozen=True)
class ValidatedInstallPackage:
    package_root: Path


@dataclass(frozen=True)
class ValidatedCompleteUpdate:
    install_root: Path
    transaction_id: str
    process_identity: InitiatingProcessIdentity

    def __post_init__(self) -> None:
        if (
            not isinstance(self.install_root, Path)
            or not self.install_root.is_absolute()
            or type(self.process_identity) is not InitiatingProcessIdentity
        ):
            raise ValueError("invalid_complete_update_authority")
        parse_transaction_id(self.transaction_id)


@dataclass(frozen=True)
class ValidatedRecoveryCommand:
    install_root: Path
    transaction_id: str
    journal_path: Path

    def __post_init__(self) -> None:
        if (
            not isinstance(self.install_root, Path)
            or not isinstance(self.journal_path, Path)
            or not self.install_root.is_absolute()
            or not self.journal_path.is_absolute()
        ):
            raise ValueError("invalid_recovery_authority")
        parse_transaction_id(self.transaction_id)
        if self.journal_path != TransactionPaths.for_install(
            self.install_root, self.transaction_id
        ).journal:
            raise ValueError("invalid_recovery_authority")


@dataclass(frozen=True)
class ValidatedEarlyInvocation:
    entrypoint: Path
    role: ExecutableRole
    selection: EntrySelection
    payload: object

    def __post_init__(self) -> None:
        if (
            not isinstance(self.entrypoint, Path)
            or not self.entrypoint.is_absolute()
            or type(self.role) is not ExecutableRole
            or type(self.selection) is not EntrySelection
        ):
            raise ValueError("invalid_early_invocation")


@dataclass(frozen=True)
class EarlyModeDependencies:
    input_stream: BinaryIO
    output_stream: BinaryIO
    error_stream: BinaryIO
    registry_factory: Callable[[], RegistryBackend]
    recovery_factory: Callable[[Path], RecoveryController]
    default_install_root: Callable[[], Path]
    install_package: Callable[[Path, Path], int]
    status_server: Callable[[BinaryIO, BinaryIO, Path], int]


COMMANDS = {
    "--register": EntryMode.REGISTER,
    "--complete-update": EntryMode.COMPLETE_UPDATE,
    "--install-package": EntryMode.INSTALL_PACKAGE,
    "--recover-active": EntryMode.RECOVER_ACTIVE,
    "--recover-update": EntryMode.RECOVER_UPDATE,
}
COMMAND_ARITIES = {
    EntryMode.REGISTER: 0,
    EntryMode.COMPLETE_UPDATE: 3,
    EntryMode.INSTALL_PACKAGE: 1,
    EntryMode.RECOVER_ACTIVE: 0,
    EntryMode.RECOVER_UPDATE: 1,
}
MODE_ROLES = {
    EntryMode.MAIN_HOST: frozenset(
        {ExecutableRole.PRODUCTION_MAIN, ExecutableRole.SOURCE_MAIN}
    ),
    EntryMode.REGISTER: frozenset(
        {ExecutableRole.PRODUCTION_MAIN, ExecutableRole.SOURCE_MAIN}
    ),
    EntryMode.INSTALL_PACKAGE: frozenset({ExecutableRole.PRODUCTION_MAIN}),
    EntryMode.COMPLETE_UPDATE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.RECOVER_ACTIVE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.RECOVER_UPDATE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.STATUS_HOST: frozenset({ExecutableRole.STATUS_HOST}),
}


def _require_plain_entrypoint_file(path: Path) -> None:
    info = path.lstat()
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if not stat.S_ISREG(info.st_mode) or getattr(info, "st_file_attributes", 0) & reparse:
        raise ValueError("invalid entrypoint file")


def _require_plain_entrypoint_directory(path: Path) -> None:
    info = path.lstat()
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if not stat.S_ISDIR(info.st_mode) or getattr(info, "st_file_attributes", 0) & reparse:
        raise ValueError("invalid entrypoint directory")


def _require_nonempty_plain_directory(path: Path) -> None:
    _require_plain_entrypoint_directory(path)
    children = sorted(path.iterdir(), key=lambda value: value.name)
    if not children:
        raise ValueError("empty entrypoint directory")
    for child in children:
        info = child.lstat()
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if getattr(info, "st_file_attributes", 0) & reparse or not (
            stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)
        ):
            raise ValueError("unsupported entrypoint child")


def resolve_recovery_install_root(executable: Path, expected_basename: str) -> Path:
    if not isinstance(executable, Path) or not executable.is_absolute():
        raise ValueError("invalid_recovery_executable")
    resolved = executable.resolve(strict=True)
    if resolved != executable or expected_basename not in (
        "dh_update_runner.exe",
        "dh_update_status_host.exe",
    ) or resolved.name.casefold() != expected_basename.casefold():
        raise ValueError("invalid_recovery_executable")
    recovery = resolved.parent
    updates = recovery.parent
    install = updates.parent
    if recovery.name.casefold() != "recovery" or updates.name.casefold() != "updates":
        raise ValueError("invalid_recovery_executable")
    _require_plain_entrypoint_directory(recovery)
    _require_plain_entrypoint_directory(updates)
    _require_plain_entrypoint_directory(install)
    canonical_install = install.resolve(strict=True)
    if canonical_install != install:
        raise ValueError("noncanonical_recovery_install")
    return canonical_install


def classify_entrypoint(executable: Path) -> tuple[ExecutableRole, Path]:
    try:
        if not isinstance(executable, Path) or not executable.is_absolute() or ".." in executable.parts:
            raise ValueError("invalid entrypoint")
        canonical = executable.resolve(strict=True)
        if canonical != executable:
            raise ValueError("noncanonical entrypoint")
        _require_plain_entrypoint_file(canonical)
        basename = canonical.name.casefold()
        if basename == "dh_native_host.exe":
            return ExecutableRole.PRODUCTION_MAIN, canonical
        if basename == "dh_native_host.py":
            expected_source = Path(__file__).resolve(strict=True).parent / "dh_native_host.py"
            if canonical != expected_source:
                raise ValueError("unknown source entrypoint")
            _require_plain_entrypoint_file(canonical.parent / "launch_host.bat")
            return ExecutableRole.SOURCE_MAIN, canonical
        if basename == "dh_update_runner.exe":
            resolve_recovery_install_root(canonical, "dh_update_runner.exe")
            _require_nonempty_plain_directory(canonical.parent / "_internal")
            _require_plain_entrypoint_file(canonical.parent / "dh_update_status_host.exe")
            return ExecutableRole.DETACHED_RUNNER, canonical
        if basename == "dh_update_status_host.exe":
            resolve_recovery_install_root(canonical, "dh_update_status_host.exe")
            _require_nonempty_plain_directory(canonical.parent / "_internal")
            _require_plain_entrypoint_file(canonical.parent / "dh_update_runner.exe")
            return ExecutableRole.STATUS_HOST, canonical
        raise ValueError("unknown entrypoint")
    except EarlyInvocationError:
        raise
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise EarlyInvocationError() from error


def select_entry_mode(executable: Path, argv: Sequence[str]) -> EntrySelection:
    if isinstance(argv, (str, bytes)) or any(type(argument) is not str for argument in argv):
        raise ValueError("invalid_early_arguments")
    recognized_tokens = set(COMMANDS) | {"--update-probe"}
    matches = [
        (index, COMMANDS[argument])
        for index, argument in enumerate(argv)
        if argument in COMMANDS
    ]
    if any(
        argument.startswith("--")
        and argument not in recognized_tokens
        and not argument.startswith("--parent-window=")
        for argument in argv
    ):
        raise ValueError("unknown_dh_command")
    if len(matches) > 1:
        raise ValueError("multiple_dh_commands")
    if matches:
        index, mode = matches[0]
        if index != 0:
            raise ValueError("dh_command_must_be_first")
        return EntrySelection(mode, tuple(argv[1:]))
    basename = executable.name.casefold()
    if basename == "dh_update_status_host.exe":
        return EntrySelection(EntryMode.STATUS_HOST, tuple(argv))
    if basename == "dh_update_runner.exe":
        raise ValueError("runner_command_required")
    return EntrySelection(EntryMode.MAIN_HOST, tuple(argv))


def parse_main_host_launch_args(argv: Sequence[str]) -> ChromeLaunch | None:
    if len(argv) == 0:
        return None
    return parse_chrome_launch_args(argv)


def _validate_frozen_main_runtime(entrypoint: Path) -> None:
    _require_nonempty_plain_directory(entrypoint.parent / "_internal")


def _validate_frozen_probe_host_root(entrypoint: Path) -> None:
    _validate_frozen_main_runtime(entrypoint)
    _require_plain_entrypoint_file(entrypoint.parent / "release-integrity.json")
    _require_plain_entrypoint_file(entrypoint.parent / "installed-product.json")


def validate_probe_invocation(
    executable: Path,
    argv: Sequence[str],
    *,
    source_runtime: bool,
) -> ValidatedProbe:
    try:
        role, canonical = classify_entrypoint(executable)
        if (
            type(source_runtime) is not bool
            or source_runtime
            or role is not ExecutableRole.PRODUCTION_MAIN
            or len(argv) != 2
            or any(type(argument) is not str for argument in argv)
            or argv[0] != "--update-probe"
        ):
            raise ValueError("invalid probe invocation")
        _validate_frozen_probe_host_root(canonical)
        manifest = Path(argv[1])
        if not manifest.is_absolute() or ".." in manifest.parts:
            raise ValueError("invalid probe manifest")
        resolved = manifest.resolve(strict=True)
        if resolved != manifest:
            raise ValueError("noncanonical probe manifest")
        _require_plain_entrypoint_file(resolved)
        return ValidatedProbe(canonical, resolved)
    except EarlyInvocationError:
        raise
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise EarlyInvocationError() from error


def validate_complete_update_command(
    executable: Path, arguments: Sequence[str]
) -> ValidatedCompleteUpdate:
    if any(type(argument) is not str for argument in arguments) or len(arguments) != 3:
        raise ValueError("invalid_complete_update_arguments")
    install = resolve_recovery_install_root(executable, "dh_update_runner.exe")
    transaction_id = parse_transaction_id(arguments[0])
    pid, token = validate_cli_process_identity_text(arguments[1], arguments[2])
    paths = TransactionPaths.for_install(install, transaction_id)
    _require_plain_entrypoint_file(paths.active)
    active = read_active_transaction(paths.active)
    journal_path = resolve_active_journal(paths.updates_root, active)
    _require_plain_entrypoint_file(journal_path)
    journal = read_journal(journal_path)
    if (
        active.transaction_id != transaction_id
        or journal_path != paths.journal
        or journal.transaction_id != transaction_id
        or journal.phase is not JournalPhase.PREPARED
        or journal.initiator is not UpdateInitiator.BROWSER
        or journal.initiating_process is not None
    ):
        raise ValueError("invalid_complete_update_authority")
    return ValidatedCompleteUpdate(
        install, transaction_id, InitiatingProcessIdentity(pid, token)
    )


def resolve_active_command(install_root: Path) -> ValidatedRecoveryCommand:
    install = install_root.resolve(strict=True)
    if install != install_root:
        raise ValueError("invalid_active_recovery")
    updates = install / "updates"
    _require_plain_entrypoint_file(updates / "active.json")
    active = read_active_transaction(updates / "active.json")
    transaction_id = parse_transaction_id(active.transaction_id)
    journal_path = resolve_active_journal(updates, active)
    _require_plain_entrypoint_file(journal_path)
    paths = TransactionPaths.for_install(install, transaction_id)
    journal = read_journal(journal_path)
    if journal_path != paths.journal or journal.transaction_id != transaction_id:
        raise ValueError("invalid_active_recovery")
    return ValidatedRecoveryCommand(install, transaction_id, journal_path)


def resolve_journal_command(journal_path: Path) -> ValidatedRecoveryCommand:
    if not isinstance(journal_path, Path) or not journal_path.is_absolute() or ".." in journal_path.parts:
        raise ValueError("invalid_recovery_journal")
    resolved = journal_path.resolve(strict=True)
    if resolved != journal_path:
        raise ValueError("noncanonical_recovery_journal")
    _require_plain_entrypoint_file(resolved)
    transaction_root = resolved.parent
    transactions = transaction_root.parent
    updates = transactions.parent
    install = updates.parent
    transaction_id = parse_transaction_id(transaction_root.name)
    paths = TransactionPaths.for_install(install, transaction_id)
    if (
        resolved != paths.journal
        or transactions != paths.transactions_root
        or read_journal(resolved).transaction_id != transaction_id
    ):
        raise ValueError("invalid_recovery_journal")
    return ValidatedRecoveryCommand(install, transaction_id, resolved)


def validate_early_invocation(
    executable: Path,
    argv: Sequence[str],
    *,
    source_runtime: bool,
) -> ValidatedEarlyInvocation:
    try:
        if any(type(argument) is not str for argument in argv):
            raise ValueError("non-string argument")
        role, entrypoint = classify_entrypoint(executable)
        if type(source_runtime) is not bool or (
            (role is ExecutableRole.SOURCE_MAIN) != source_runtime
        ):
            raise ValueError("runtime role mismatch")
        selection = select_entry_mode(entrypoint, argv)
        expected_arity = COMMAND_ARITIES.get(selection.mode)
        if expected_arity is not None and len(selection.arguments) != expected_arity:
            raise ValueError("invalid arity")
        if role not in MODE_ROLES[selection.mode]:
            raise ValueError("role mismatch")
        if selection.mode is EntryMode.MAIN_HOST:
            payload = ValidatedMainHost(parse_main_host_launch_args(selection.arguments))
        elif selection.mode is EntryMode.STATUS_HOST:
            payload = ValidatedStatusHost(
                resolve_recovery_install_root(entrypoint, "dh_update_status_host.exe"),
                parse_chrome_launch_args(selection.arguments),
            )
        elif selection.mode is EntryMode.REGISTER:
            if role is ExecutableRole.PRODUCTION_MAIN:
                _validate_frozen_main_runtime(entrypoint)
            payload = ValidatedRegistration(
                entrypoint.parent,
                MainHostRuntime.SOURCE
                if role is ExecutableRole.SOURCE_MAIN
                else MainHostRuntime.FROZEN,
            )
        elif selection.mode is EntryMode.INSTALL_PACKAGE:
            requested = Path(selection.arguments[0])
            if not requested.is_absolute() or ".." in requested.parts:
                raise ValueError("invalid package root")
            package_root = requested.resolve(strict=True)
            if package_root != requested:
                raise ValueError("noncanonical package root")
            _require_plain_entrypoint_directory(package_root)
            _require_plain_entrypoint_directory(package_root / "host")
            if entrypoint != package_root / "host" / "dh_native_host.exe":
                raise ValueError("package entrypoint mismatch")
            _validate_frozen_probe_host_root(entrypoint)
            payload = ValidatedInstallPackage(package_root)
        elif selection.mode is EntryMode.COMPLETE_UPDATE:
            payload = validate_complete_update_command(entrypoint, selection.arguments)
        elif selection.mode is EntryMode.RECOVER_ACTIVE:
            payload = resolve_active_command(
                resolve_recovery_install_root(entrypoint, "dh_update_runner.exe")
            )
        elif selection.mode is EntryMode.RECOVER_UPDATE:
            install_root = resolve_recovery_install_root(entrypoint, "dh_update_runner.exe")
            payload = resolve_journal_command(Path(selection.arguments[0]))
            if payload.install_root != install_root:
                raise ValueError("journal install mismatch")
        else:
            raise ValueError("unsupported mode")
        return ValidatedEarlyInvocation(entrypoint, role, selection, payload)
    except EarlyInvocationError:
        raise
    except (JournalValidationError, OSError, RuntimeError, TypeError, ValueError) as error:
        raise EarlyInvocationError() from error


def production_early_mode_dependencies() -> EarlyModeDependencies:
    return EarlyModeDependencies(
        input_stream=sys.stdin.buffer,
        output_stream=sys.stdout.buffer,
        error_stream=sys.stderr.buffer,
        registry_factory=WindowsRegistryBackend,
        recovery_factory=create_production_recovery_controller,
        default_install_root=lambda: (
            Path(os.environ["LOCALAPPDATA"]) / "DynamicsHelper"
        ).resolve(),
        install_package=lambda _package, _install: EXIT_INSTALLER_UNAVAILABLE,
        status_server=serve_status_host,
    )


def _write_fixed_error(stream: BinaryIO, payload: bytes) -> None:
    try:
        stream.write(payload)
        stream.flush()
    except Exception:
        return


def _journal_exit(journal: UpdateJournal) -> int:
    if type(journal) is not UpdateJournal:
        raise TypeError("invalid journal result")
    if journal.phase is JournalPhase.COMMITTED:
        return EXIT_SUCCESS
    if journal.phase is JournalPhase.ROLLED_BACK:
        return EXIT_ROLLED_BACK
    return EXIT_RECOVERY_REQUIRED


def dispatch_early_mode(
    executable: str,
    argv: Sequence[str],
    *,
    source_runtime: bool,
    dependencies_factory: Callable[[], EarlyModeDependencies] | None = None,
) -> int | None:
    deps: EarlyModeDependencies | None = None
    try:
        if type(executable) is not str or not executable or type(source_runtime) is not bool:
            _write_fixed_error(sys.stderr.buffer, INVALID_EARLY_INVOCATION)
            return EXIT_INVALID_ARGUMENTS
        if isinstance(argv, (str, bytes)) or any(type(argument) is not str for argument in argv):
            _write_fixed_error(sys.stderr.buffer, INVALID_EARLY_INVOCATION)
            return EXIT_INVALID_ARGUMENTS
        entrypoint = Path(executable)
        if "--update-probe" in argv:
            try:
                probe = validate_probe_invocation(entrypoint, argv, source_runtime=source_runtime)
                probe_argv = (str(probe.entrypoint), "--update-probe", str(probe.manifest_path))
            except EarlyInvocationError:
                absolute = entrypoint.absolute()
                probe_argv = (str(absolute), "--update-probe")
            result = dispatch_early_cli(probe_argv)
            if result == 0:
                return EXIT_SUCCESS
            if result == 1:
                return EXIT_PROBE_FAILED
            return EXIT_INVALID_ARGUMENTS
        if any(
            argument.casefold() == "--update-probe" and argument != "--update-probe"
            for argument in argv
        ):
            raise EarlyInvocationError()
        invocation = validate_early_invocation(
            entrypoint, argv, source_runtime=source_runtime
        )
        mode = invocation.selection.mode
        if mode is EntryMode.MAIN_HOST:
            return None
        deps = dependencies_factory() if dependencies_factory else production_early_mode_dependencies()
        if not isinstance(deps, EarlyModeDependencies):
            raise TypeError("invalid dependencies")
        if mode is EntryMode.STATUS_HOST:
            command = invocation.payload
            return deps.status_server(deps.input_stream, deps.output_stream, command.install_root)
        if mode is EntryMode.REGISTER:
            command = invocation.payload
            register_main_host(command.host_root, deps.registry_factory(), command.runtime)
            return EXIT_SUCCESS
        if mode is EntryMode.INSTALL_PACKAGE:
            command = invocation.payload
            return deps.install_package(command.package_root, deps.default_install_root())
        if mode is EntryMode.RECOVER_UPDATE:
            command = invocation.payload
            return _journal_exit(
                deps.recovery_factory(command.install_root).recover_journal(command.journal_path)
            )
        command = invocation.payload
        controller = deps.recovery_factory(command.install_root)
        if mode is EntryMode.RECOVER_ACTIVE:
            return _journal_exit(controller.recover_active())
        if mode is EntryMode.COMPLETE_UPDATE:
            return _journal_exit(
                controller.run_complete_update(command.transaction_id, command.process_identity)
            )
        return EXIT_INVALID_ARGUMENTS
    except UpdateAlreadyInProgress:
        return EXIT_ALREADY_IN_PROGRESS
    except EarlyInvocationError:
        _write_fixed_error(sys.stderr.buffer, INVALID_EARLY_INVOCATION)
        return EXIT_INVALID_ARGUMENTS
    except Exception:
        stream = deps.error_stream if isinstance(deps, EarlyModeDependencies) else sys.stderr.buffer
        _write_fixed_error(stream, b"early_mode_failed\n")
        return EXIT_INTERNAL_FAILURE
