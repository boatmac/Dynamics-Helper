import os
import shutil
import stat
import tempfile
import uuid
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Protocol

from install_integrity import UpdateProbeResult
from native_registration import RegistryBackend, register_status_manifest
from package_manifest import (
    OwnershipClass,
    canonical_json_bytes,
    load_update_manifest,
    sha256_bytes,
    sha256_file,
    update_manifest_to_dict,
)
from update_engine import UpdateEngine, UpdateEngineHooks
from update_journal import (
    FORWARD_FAILURE_CODES,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    TransactionPaths,
    UpdateInitiator,
    parse_transaction_id,
    read_active_transaction,
    read_journal,
    resolve_active_journal,
)
from update_mutex import MutationMutex, create_windows_mutation_mutex
from update_ownership import (
    FileDigest,
    OwnershipPlan,
    OwnershipSource,
    ownership_plan_sha256,
    read_ownership_plan,
)
from update_platform import (
    Clock,
    CtypesWin32ProcessApi,
    ProcessAdapter,
    ProbeProcessAdapter,
    RunOnceStore,
    SubprocessProbeAdapter,
    SystemClock,
    WindowsProcessAdapter,
    WindowsRunOnceStore,
    RUN_ONCE_VALUE_NAME,
    arm_run_once,
)


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


def _ignore_operation(_label: str) -> None:
    return None


def _ignore_phase(_phase: JournalPhase) -> None:
    return None


def _ignore_identity(_identity: InitiatingProcessIdentity) -> None:
    return None


def _ignore() -> None:
    return None


class StagedProbeWorkspace(Protocol):
    def create(self, forbidden_roots: Sequence[Path]) -> Path:
        raise AssertionError("staged probe workspace protocol method")

    def remove(self, root: Path) -> None:
        raise AssertionError("staged probe workspace protocol method")


def _canonical_forbidden_staged_probe_roots(
    forbidden_roots: Sequence[Path],
) -> tuple[Path, ...]:
    if not forbidden_roots or any(
        not isinstance(root, Path) for root in forbidden_roots
    ):
        raise RecoveryError("staged_probe_failed")
    try:
        normalized = tuple(Path(os.fspath(root)) for root in forbidden_roots)
        if any(not root.is_absolute() for root in normalized):
            raise ValueError("relative staged probe boundary")
        canonical = tuple(root.resolve(strict=True) for root in normalized)
        if any(
            root != resolved
            for root, resolved in zip(normalized, canonical, strict=True)
        ):
            raise ValueError("noncanonical staged probe boundary")
        return canonical
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise RecoveryError("staged_probe_failed") from error


def _canonical_staged_probe_root(
    value: object,
    forbidden_roots: Sequence[Path],
) -> Path:
    if not isinstance(value, Path):
        raise RecoveryError("staged_probe_failed")
    forbidden = _canonical_forbidden_staged_probe_roots(forbidden_roots)
    try:
        normalized = Path(os.fspath(value))
        if not normalized.is_absolute():
            raise ValueError("relative staged probe root")
        root = normalized.resolve(strict=True)
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise RecoveryError("staged_probe_failed") from error
    if normalized != root or any(
        root == forbidden_root
        or root.is_relative_to(forbidden_root)
        or forbidden_root.is_relative_to(root)
        for forbidden_root in forbidden
    ):
        raise RecoveryError("staged_probe_failed")
    try:
        _require_plain_ancestor_chain(root)
        _lstat_plain(root, require_directory=True)
    except RecoveryError as error:
        raise RecoveryError("staged_probe_failed") from error
    return root


class TemporaryStagedProbeWorkspace:
    def create(self, forbidden_roots: Sequence[Path]) -> Path:
        forbidden = _canonical_forbidden_staged_probe_roots(forbidden_roots)
        base = Path(tempfile.gettempdir())
        try:
            _require_plain_ancestor_chain(base)
            _lstat_plain(base, require_directory=True)
            base = base.resolve(strict=True)
        except RecoveryError as error:
            raise RecoveryError("staged_probe_failed") from error
        if any(base == root or base.is_relative_to(root) for root in forbidden):
            raise RecoveryError("staged_probe_failed")
        created = _canonical_staged_probe_root(
            Path(tempfile.mkdtemp(prefix="dh-staged-probe-", dir=base)),
            forbidden,
        )
        if created.parent != base or not created.name.startswith("dh-staged-probe-"):
            raise RecoveryError("staged_probe_failed")
        return created

    def remove(self, root: Path) -> None:
        if not isinstance(root, Path):
            raise RecoveryError("staged_probe_failed")
        try:
            normalized = Path(os.fspath(root))
            if not normalized.is_absolute():
                raise ValueError("relative staged probe root")
            canonical = normalized.resolve(strict=True)
            base = Path(tempfile.gettempdir()).resolve(strict=True)
        except (OSError, RuntimeError, TypeError, ValueError) as error:
            raise RecoveryError("staged_probe_failed") from error
        if (
            normalized != canonical
            or canonical.parent != base
            or not canonical.name.startswith("dh-staged-probe-")
        ):
            raise RecoveryError("staged_probe_failed")
        _lstat_plain(canonical, require_directory=True)
        shutil.rmtree(canonical)
        if canonical.exists() or canonical.is_symlink():
            raise RecoveryError("staged_probe_failed")


@dataclass(frozen=True)
class RecoveryDiagnostics:
    after_staged_probe_event: Callable[[str], None] = _ignore_operation
    after_recovery_setup_event: Callable[[str], None] = _ignore_operation
    after_live_phase: Callable[[JournalPhase], None] = _ignore_phase
    after_wait: Callable[[InitiatingProcessIdentity], None] = _ignore_identity
    after_probe: Callable[[], None] = _ignore
    before_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_journal_transition: Callable[[JournalPhase], None] = _ignore_phase


@dataclass(frozen=True)
class RecoveryDependencies:
    process: ProcessAdapter
    probe_process: ProbeProcessAdapter
    staged_probe_workspace: StagedProbeWorkspace
    run_once: RunOnceStore
    clock: Clock
    mutex_factory: Callable[[Path], MutationMutex]
    set_cwd: Callable[[Path], None]
    diagnostics: RecoveryDiagnostics = field(default_factory=RecoveryDiagnostics)


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


def _implied_directories(paths: set[str]) -> set[str]:
    result: set[str] = set()
    for relative in paths:
        parts = relative.split("/")
        for index in range(1, len(parts)):
            result.add("/".join(parts[:index]))
    return result


def _walk_plain_tree(root: Path) -> tuple[set[str], dict[str, str]]:
    _lstat_plain(root, require_directory=True)
    directories: set[str] = set()
    files: dict[str, str] = {}

    def visit(directory: Path) -> None:
        try:
            children = sorted(directory.iterdir(), key=lambda path: path.name)
        except OSError as error:
            raise RecoveryError("staged_probe_failed") from error
        for child in children:
            info = _lstat_plain(child, require_directory=None)
            relative = child.relative_to(root).as_posix()
            if stat.S_ISDIR(info.st_mode):
                directories.add(relative)
                visit(child)
            else:
                files[relative] = sha256_file(child)

    visit(root)
    return directories, files


def _staged_probe_mapping(
    paths: TransactionPaths,
    plan: OwnershipPlan,
) -> tuple[tuple[Path, str, str], ...]:
    if {item.path for item in plan.metadata_files} != {
        "installed-product.json",
        "release-integrity.json",
    }:
        raise RecoveryError("staged_probe_failed")
    if not {"dh_native_host.exe", "system_prompt.md"}.issubset(
        {item.path for item in plan.host_files}
    ) or not any(item.path.startswith("_internal/") for item in plan.host_files):
        raise RecoveryError("staged_probe_failed")
    if "manifest.json" not in {item.path for item in plan.extension_files}:
        raise RecoveryError("staged_probe_failed")

    rows: list[tuple[Path, str, str]] = []
    rows.extend(
        (paths.staged_host / item.path, item.path, item.sha256)
        for item in (*plan.host_files, *plan.metadata_files, *plan.seed_files)
    )
    rows.extend(
        (
            paths.staged_extension / item.path,
            f"extension/{item.path}",
            item.sha256,
        )
        for item in plan.extension_files
    )
    destinations = [row[1] for row in rows]
    if len(destinations) != len(set(destinations)) or len(destinations) != len(
        {value.casefold() for value in destinations}
    ):
        raise RecoveryError("staged_probe_failed")
    return tuple(sorted(rows, key=lambda row: row[1]))


def _require_manifest_plan_links(
    manifest,
    plan: OwnershipPlan,
) -> None:
    host_product = {
        (entry.path.removeprefix("host/"), entry.sha256)
        for entry in manifest.entries
        if entry.path.startswith("host/")
        and entry.ownership
        in (
            OwnershipClass.HOST_PRODUCT_FILE,
            OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
        )
    }
    extension_product = {
        (entry.path.removeprefix("extension/"), entry.sha256)
        for entry in manifest.entries
        if entry.path.startswith("extension/")
        and entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
    }
    metadata = {
        (entry.path.removeprefix("host/"), entry.sha256)
        for entry in manifest.entries
        if entry.ownership is OwnershipClass.PACKAGED_METADATA
    }
    seeds = {
        (entry.path.removeprefix("host/"), entry.sha256)
        for entry in manifest.entries
        if entry.ownership is OwnershipClass.SEED_ONLY
    }
    if (
        manifest.package_version != plan.target_version
        or host_product != {(item.path, item.sha256) for item in plan.host_files}
        or extension_product
        != {(item.path, item.sha256) for item in plan.extension_files}
        or metadata != {(item.path, item.sha256) for item in plan.metadata_files}
        or any((item.path, item.sha256) not in seeds for item in plan.seed_files)
    ):
        raise RecoveryError("staged_probe_failed")


def _require_staged_sources_exact(
    paths: TransactionPaths,
    plan: OwnershipPlan,
) -> None:
    rows = _staged_probe_mapping(paths, plan)
    host_expected = {
        item.path: item.sha256
        for item in (*plan.host_files, *plan.metadata_files, *plan.seed_files)
    }
    extension_expected = {
        item.path: item.sha256 for item in plan.extension_files
    }
    try:
        host_directories, host_files = _walk_plain_tree(paths.staged_host)
        extension_directories, extension_files = _walk_plain_tree(
            paths.staged_extension
        )
    except RecoveryError as error:
        raise RecoveryError("staged_probe_failed") from error
    if (
        host_files != host_expected
        or extension_files != extension_expected
        or host_directories != _implied_directories(set(host_expected))
        or extension_directories
        != _implied_directories(set(extension_expected))
    ):
        raise RecoveryError("staged_probe_failed")
    for source, _destination, expected_sha256 in rows:
        try:
            _lstat_plain(source, require_directory=False)
            if sha256_file(source) != expected_sha256:
                raise RecoveryError("staged_probe_failed")
        except RecoveryError as error:
            raise RecoveryError("staged_probe_failed") from error


def _materialize_staged_probe_root(
    root: Path,
    paths: TransactionPaths,
    plan: OwnershipPlan,
) -> None:
    forbidden = (
        paths.install_root,
        paths.updates_root,
        paths.transaction_root,
        paths.staged_root,
        paths.probe_root,
    )
    canonical = _canonical_staged_probe_root(root, forbidden)
    if any(canonical.iterdir()):
        raise RecoveryError("staged_probe_failed")
    _require_staged_sources_exact(paths, plan)
    rows = _staged_probe_mapping(paths, plan)
    destinations = {row[1] for row in rows}
    for relative in sorted(_implied_directories(destinations)):
        canonical.joinpath(*relative.split("/")).mkdir()
    for source, relative, expected_sha256 in rows:
        destination = canonical.joinpath(*relative.split("/"))
        _copy_plain_file(source, destination, expected_sha256)
    actual_directories, actual_files = _walk_plain_tree(canonical)
    expected_files = {row[1]: row[2] for row in rows}
    if (
        actual_files != expected_files
        or actual_directories != _implied_directories(set(expected_files))
    ):
        raise RecoveryError("staged_probe_failed")


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


class RecoveryController:
    def __init__(
        self,
        install_root: Path,
        dependencies: RecoveryDependencies,
    ) -> None:
        _require_absolute_path(install_root, "install_root_mismatch")
        try:
            _require_plain_ancestor_chain(install_root)
            _lstat_plain(install_root, require_directory=True)
            root = install_root.resolve(strict=True)
        except RecoveryError as error:
            raise RecoveryError("install_root_mismatch") from error
        self.install_root = root
        self.updates_root = root / "updates"
        self.dependencies = dependencies
        self._host_handle = None
        self._expected_wait_identity = None
        self._original_already_exited = False

    def preflight_prepared_target(
        self,
        transaction_id: str,
    ) -> UpdateProbeResult:
        root: Path | None = None
        try:
            tx = parse_transaction_id(transaction_id)
            paths = TransactionPaths.for_install(self.install_root, tx)
            active = read_active_transaction(paths.active)
            if (
                active.transaction_id != tx
                or resolve_active_journal(paths.updates_root, active)
                != paths.journal
            ):
                raise RecoveryError("staged_probe_failed")
            journal = read_journal(paths.journal)
            manifest = load_update_manifest(paths.probe_manifest)
            plan = read_ownership_plan(paths.ownership)
            if (
                journal.transaction_id != tx
                or journal.phase is not JournalPhase.PREPARED
                or journal.initiating_process is not None
                or journal.initiator
                not in (UpdateInitiator.BROWSER, UpdateInitiator.INSTALLER)
                or plan.transaction_id != tx
                or plan.target_version != journal.target_version
                or plan.prior_version != journal.prior_version
                or journal.fresh_install
                != (plan.source is OwnershipSource.FRESH)
                or journal.ownership_path != "ownership.json"
                or ownership_plan_sha256(plan) != journal.ownership_sha256
                or sha256_bytes(
                    canonical_json_bytes(update_manifest_to_dict(manifest))
                )
                != plan.package_ownership_sha256
                or manifest.package_version != journal.target_version
            ):
                raise RecoveryError("staged_probe_failed")
            _require_manifest_plan_links(manifest, plan)

            forbidden_roots = (
                paths.install_root,
                paths.updates_root,
                paths.transaction_root,
                paths.staged_root,
                paths.probe_root,
            )
            created_root = self.dependencies.staged_probe_workspace.create(
                forbidden_roots
            )
            root = _canonical_staged_probe_root(created_root, forbidden_roots)
            self.dependencies.diagnostics.after_staged_probe_event("create")
            _materialize_staged_probe_root(root, paths, plan)
            self.dependencies.diagnostics.after_staged_probe_event("copy")
            result = self.dependencies.probe_process.run_probe(
                root / "dh_native_host.exe",
                paths.probe_manifest.resolve(strict=True),
            )
            if (
                result.status != "success"
                or result.host_version != journal.target_version
                or result.extension_version != journal.target_version
                or tuple(result.capabilities) != manifest.provided_capabilities
                or not set(manifest.required_capabilities).issubset(
                    result.capabilities
                )
            ):
                raise RecoveryError("staged_probe_failed")
            self.dependencies.diagnostics.after_staged_probe_event("process")
            _require_staged_sources_exact(paths, plan)
            reread_journal = read_journal(paths.journal)
            reread_plan = read_ownership_plan(paths.ownership)
            reread_manifest = load_update_manifest(paths.probe_manifest)
            if (
                reread_journal != journal
                or reread_plan != plan
                or reread_manifest != manifest
                or ownership_plan_sha256(reread_plan)
                != reread_journal.ownership_sha256
                or sha256_bytes(
                    canonical_json_bytes(
                        update_manifest_to_dict(reread_manifest)
                    )
                )
                != reread_plan.package_ownership_sha256
            ):
                raise RecoveryError("staged_probe_failed")
            return result
        except Exception as error:
            if (
                type(error) is RecoveryError
                and error.error_code == "staged_probe_failed"
            ):
                raise
            raise RecoveryError("staged_probe_failed") from error
        finally:
            if root is not None:
                try:
                    self.dependencies.staged_probe_workspace.remove(root)
                    self.dependencies.diagnostics.after_staged_probe_event(
                        "remove"
                    )
                except Exception as cleanup_error:
                    raise RecoveryError("staged_probe_failed") from cleanup_error

    def _load_matching_authority(self, transaction_id: str):
        tx = parse_transaction_id(transaction_id)
        paths = TransactionPaths.for_install(self.install_root, tx)
        active = read_active_transaction(paths.active)
        if (
            active.transaction_id != tx
            or resolve_active_journal(paths.updates_root, active) != paths.journal
            or paths.active != self.updates_root / "active.json"
        ):
            raise RecoveryError("active_path_mismatch")
        journal = read_journal(paths.journal)
        plan = read_ownership_plan(paths.ownership)
        if (
            journal.transaction_id != tx
            or plan.transaction_id != tx
            or ownership_plan_sha256(plan) != journal.ownership_sha256
        ):
            raise RecoveryError("active_journal_mismatch")
        return paths, journal, plan

    def prepare_recovery_runtime(
        self,
        transaction_id: str,
        runner_source: Path,
        registry: RegistryBackend | None,
    ) -> Path:
        _require_absolute_path(runner_source, "invalid_runner_source")
        if registry is not None and any(
            not callable(getattr(registry, name, None))
            for name in (
                "read_native_host",
                "write_native_host",
                "delete_native_host",
            )
        ):
            raise RecoveryError("staged_probe_failed")
        paths, before, _plan = self._load_matching_authority(transaction_id)
        if (
            before.phase is not JournalPhase.PREPARED
            or before.initiating_process is not None
            or (
                before.initiator is UpdateInitiator.BROWSER
                and registry is None
            )
            or (
                before.initiator is UpdateInitiator.INSTALLER
                and registry is not None
            )
        ):
            raise RecoveryError("staged_probe_failed")
        self.preflight_prepared_target(transaction_id)
        paths_after, journal, plan = self._load_matching_authority(transaction_id)
        if paths_after != paths or journal != before:
            raise RecoveryError("staged_probe_failed")
        _require_staged_sources_exact(paths, plan)
        expected_source = (
            self.install_root
            if journal.initiator is UpdateInitiator.BROWSER
            else paths.staged_host.resolve(strict=True)
        )
        try:
            actual_source = runner_source.resolve(strict=True)
        except OSError as error:
            raise RecoveryError("invalid_runner_source") from error
        if actual_source != expected_source:
            raise RecoveryError("invalid_runner_source")
        recovery = install_recovery_tree(runner_source, paths.updates_root)
        self.dependencies.diagnostics.after_recovery_setup_event("tree-installed")
        if registry is not None:
            register_status_host(recovery, registry)
            self.dependencies.diagnostics.after_recovery_setup_event(
                "status-registered"
            )
        return recovery

    def _before_live_phase(
        self,
        phase: JournalPhase,
        paths: TransactionPaths,
        _plan: OwnershipPlan,
    ) -> None:
        if paths.install_root != self.install_root:
            raise RecoveryError("install_root_mismatch")
        if paths.active != self.updates_root / "active.json":
            raise RecoveryError("active_path_mismatch")
        arm_run_once(self.dependencies.run_once)
        self.dependencies.diagnostics.after_live_phase(phase)

    def _wait_for_host(self, identity: InitiatingProcessIdentity) -> None:
        if identity != self._expected_wait_identity:
            raise RecoveryError("initiating_process_identity_mismatch")
        if self._original_already_exited:
            return
        handle = self._host_handle
        if handle is None or handle.identity != identity:
            raise RecoveryError("initiating_process_handle_missing")
        if not self.dependencies.process.wait(handle, timeout_seconds=None):
            raise RecoveryError("host_exit_wait_failed")
        self._original_already_exited = True
        self.dependencies.diagnostics.after_wait(identity)

    def _probe(self, install_root: Path, plan: OwnershipPlan) -> None:
        paths = TransactionPaths.for_install(install_root, plan.transaction_id)
        manifest = load_update_manifest(paths.probe_manifest)
        result = self.dependencies.probe_process.run_probe(
            install_root / "dh_native_host.exe",
            paths.probe_manifest,
        )
        if (
            manifest.package_version != plan.target_version
            or result.status != "success"
            or result.host_version != plan.target_version
            or result.extension_version != plan.target_version
            or tuple(result.capabilities) != manifest.provided_capabilities
            or not set(manifest.required_capabilities).issubset(
                result.capabilities
            )
        ):
            raise RecoveryError("startup_probe_failed")
        self.dependencies.diagnostics.after_probe()

    def _engine(self) -> UpdateEngine:
        return UpdateEngine(
            self.install_root,
            mutex_factory=self.dependencies.mutex_factory,
            hooks=UpdateEngineHooks(
                before_live_phase=self._before_live_phase,
                wait_for_initiating_host_exit=self._wait_for_host,
                probe_installed_product=self._probe,
                before_filesystem_operation=(
                    self.dependencies.diagnostics.before_filesystem_operation
                ),
                after_filesystem_operation=(
                    self.dependencies.diagnostics.after_filesystem_operation
                ),
                after_journal_transition=(
                    self.dependencies.diagnostics.after_journal_transition
                ),
            ),
        )

    def _finish_run_once(self, journal) -> None:
        if journal.phase in (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK) or (
            journal.phase is JournalPhase.RECOVERY_REQUIRED
            and journal.reason_code is JournalReason.MANUAL_RECOVERY_REQUIRED
        ):
            self.dependencies.run_once.delete(RUN_ONCE_VALUE_NAME)
        else:
            arm_run_once(self.dependencies.run_once)

    def _finish_run_once_from_disk(self, paths: TransactionPaths) -> None:
        try:
            self._finish_run_once(read_journal(paths.journal))
        except Exception:
            arm_run_once(self.dependencies.run_once)

    def run_complete_update(
        self,
        transaction_id: str,
        process_identity: InitiatingProcessIdentity,
    ):
        if type(process_identity) is not InitiatingProcessIdentity:
            raise RecoveryError("initiating_process_identity_missing")
        paths, before, _plan = self._load_matching_authority(transaction_id)
        if (
            before.initiator is not UpdateInitiator.BROWSER
            or before.phase is not JournalPhase.PREPARED
            or before.initiating_process is not None
        ):
            raise RecoveryError("update_activation_failed")
        validate_recovery_tree(self.updates_root / "recovery")
        self.preflight_prepared_target(transaction_id)
        paths_after, reread, plan = self._load_matching_authority(transaction_id)
        if paths_after != paths or reread != before:
            raise RecoveryError("staged_probe_failed")
        _require_staged_sources_exact(paths, plan)
        handle = self.dependencies.process.open_identity(
            process_identity,
            self.install_root / "dh_native_host.exe",
        )
        if handle is None:
            raise RecoveryError("initiating_process_identity_missing")
        self._host_handle = handle
        self._expected_wait_identity = process_identity
        self._original_already_exited = False
        armed = False
        try:
            arm_run_once(self.dependencies.run_once)
            armed = True
            result = self._engine().activate_prepared(
                transaction_id, process_identity
            )
            if result.phase is JournalPhase.WAITING_FOR_HOST_EXIT:
                result = self._engine().resume(transaction_id)
            self._finish_run_once(result)
            return result
        except BaseException:
            if armed:
                self._finish_run_once_from_disk(paths)
            raise
        finally:
            self.dependencies.process.close(handle)
            self._host_handle = None
            self._expected_wait_identity = None

    def run_installer_update(self, transaction_id: str):
        paths, before, _plan = self._load_matching_authority(transaction_id)
        if (
            before.initiator is not UpdateInitiator.INSTALLER
            or before.phase is not JournalPhase.PREPARED
            or before.initiating_process is not None
        ):
            raise RecoveryError("update_activation_failed")
        validate_recovery_tree(self.updates_root / "recovery")
        self.preflight_prepared_target(transaction_id)
        paths_after, reread, plan = self._load_matching_authority(transaction_id)
        if paths_after != paths or reread != before:
            raise RecoveryError("staged_probe_failed")
        _require_staged_sources_exact(paths, plan)
        armed = False
        try:
            arm_run_once(self.dependencies.run_once)
            armed = True
            result = self._engine().activate_prepared(transaction_id, None)
            if result.phase is JournalPhase.WAITING_FOR_HOST_EXIT:
                result = self._engine().resume(transaction_id)
            self._finish_run_once(result)
            return result
        except BaseException:
            if armed:
                self._finish_run_once_from_disk(paths)
            raise

    def wait_until_ready(
        self,
        transaction_id: str,
        process_identity: InitiatingProcessIdentity,
        timeout_seconds: float,
    ):
        if (
            type(process_identity) is not InitiatingProcessIdentity
            or type(timeout_seconds) not in (int, float)
            or not __import__("math").isfinite(timeout_seconds)
            or timeout_seconds < 0
        ):
            raise RecoveryError("update_activation_failed")
        paths = TransactionPaths.for_install(self.install_root, transaction_id)
        deadline = self.dependencies.clock.monotonic() + timeout_seconds
        while True:
            journal = read_journal(paths.journal)
            if journal.phase is JournalPhase.PREPARED:
                if self.dependencies.clock.monotonic() >= deadline:
                    raise RecoveryError("update_activation_failed")
                self.dependencies.clock.sleep(0.05)
                continue
            if journal.phase in (
                JournalPhase.WAITING_FOR_HOST_EXIT,
                JournalPhase.HOST_BACKED_UP,
                JournalPhase.HOST_INSTALLED,
                JournalPhase.EXTENSION_BACKED_UP,
                JournalPhase.EXTENSION_INSTALLED,
                JournalPhase.METADATA_INSTALLED,
                JournalPhase.PROBING,
                JournalPhase.COMMITTED,
                JournalPhase.ROLLED_BACK,
            ) and journal.initiating_process == process_identity:
                return journal
            raise RecoveryError("update_activation_failed")

    def recover_active(self):
        active = read_active_transaction(self.updates_root / "active.json")
        paths = TransactionPaths.for_install(
            self.install_root, active.transaction_id
        )
        if resolve_active_journal(self.updates_root, active) != paths.journal:
            raise RecoveryError("active_journal_mismatch")
        self.dependencies.set_cwd(paths.transaction_root.resolve(strict=True))
        journal = read_journal(paths.journal)
        if journal.transaction_id != active.transaction_id:
            raise RecoveryError("active_journal_mismatch")
        return self._recover_loaded_journal(active.transaction_id, journal)

    def recover_journal(self, journal_path: Path):
        if not isinstance(journal_path, Path) or not journal_path.is_absolute():
            raise RecoveryError("journal_outside_updates")
        journal = read_journal(journal_path)
        paths = TransactionPaths.for_install(
            self.install_root, journal.transaction_id
        )
        if journal_path.resolve(strict=True) != paths.journal:
            raise RecoveryError("journal_outside_updates")
        active = read_active_transaction(paths.active)
        if (
            active.transaction_id != journal.transaction_id
            or resolve_active_journal(paths.updates_root, active) != paths.journal
        ):
            raise RecoveryError("active_journal_mismatch")
        self.dependencies.set_cwd(paths.transaction_root.resolve(strict=True))
        return self._recover_loaded_journal(journal.transaction_id, journal)

    def _recover_loaded_journal(self, transaction_id: str, journal):
        paths = TransactionPaths.for_install(self.install_root, transaction_id)
        handle = None
        self._expected_wait_identity = None
        self._original_already_exited = False
        try:
            if journal.phase is JournalPhase.PREPARED:
                return journal
            if journal.phase is JournalPhase.RECOVERY_REQUIRED:
                if (
                    journal.reason_code is JournalReason.ROLLBACK_FAILED
                    and journal.original_failure_code in FORWARD_FAILURE_CODES
                ):
                    arm_run_once(self.dependencies.run_once)
                    result = self._engine().rollback(
                        transaction_id, journal.original_failure_code
                    )
                else:
                    self.dependencies.run_once.delete(RUN_ONCE_VALUE_NAME)
                    return journal
            else:
                if journal.phase is JournalPhase.WAITING_FOR_HOST_EXIT:
                    if journal.initiator is UpdateInitiator.BROWSER:
                        if journal.initiating_process is None:
                            raise RecoveryError(
                                "initiating_process_identity_missing"
                            )
                        self._expected_wait_identity = journal.initiating_process
                        handle = self.dependencies.process.open_identity(
                            journal.initiating_process,
                            self.install_root / "dh_native_host.exe",
                        )
                        if handle is None:
                            self._original_already_exited = True
                        else:
                            self._host_handle = handle
                result = self._engine().resume(transaction_id)
            self._finish_run_once(result)
            return result
        except BaseException:
            self._finish_run_once_from_disk(paths)
            raise
        finally:
            if handle is not None:
                self.dependencies.process.close(handle)
            self._host_handle = None
            self._expected_wait_identity = None
            self._original_already_exited = False


def launch_complete_update(
    process: ProcessAdapter,
    recovery_root: Path,
    paths: TransactionPaths,
    process_identity: InitiatingProcessIdentity,
) -> InitiatingProcessIdentity:
    validate_recovery_tree(recovery_root)
    if (
        type(process_identity) is not InitiatingProcessIdentity
        or paths.transaction_root.parent != paths.transactions_root
    ):
        raise RecoveryError("transaction_path_mismatch")
    return process.launch_detached(
        recovery_root / "dh_update_runner.exe",
        [
            "--complete-update",
            paths.transaction_root.name,
            str(process_identity.pid),
            process_identity.creation_token,
        ],
        paths.transaction_root.resolve(strict=True),
    )


def launch_active_recovery(
    process: ProcessAdapter,
    install_root: Path,
) -> InitiatingProcessIdentity:
    updates = install_root.resolve(strict=True) / "updates"
    active = read_active_transaction(updates / "active.json")
    journal_path = resolve_active_journal(updates, active)
    paths = TransactionPaths.for_install(install_root, active.transaction_id)
    if journal_path != paths.journal:
        raise RecoveryError("active_journal_mismatch")
    read_journal(paths.journal)
    recovery = updates / "recovery"
    validate_recovery_tree(recovery)
    return process.launch_detached(
        recovery / "dh_update_runner.exe",
        ["--recover-active"],
        paths.transaction_root.resolve(strict=True),
    )


def create_production_recovery_controller(
    install_root: Path,
) -> RecoveryController:
    return RecoveryController(
        install_root,
        RecoveryDependencies(
            process=WindowsProcessAdapter(CtypesWin32ProcessApi()),
            probe_process=SubprocessProbeAdapter(),
            staged_probe_workspace=TemporaryStagedProbeWorkspace(),
            run_once=WindowsRunOnceStore(),
            clock=SystemClock(),
            mutex_factory=create_windows_mutation_mutex,
            set_cwd=os.chdir,
        ),
    )
