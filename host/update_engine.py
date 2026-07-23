import os
import shutil
import stat
import tempfile
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Callable

from package_archive import ValidatedPackage
from package_manifest import (
    OwnershipClass,
    UPDATE_MANIFEST_PATH,
    canonical_json_bytes,
    update_manifest_to_dict,
)
from update_journal import (
    ActiveTransaction,
    FORWARD_FAILURE_CODES,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    JournalValidationError,
    SeedOperationReceipt,
    TransactionPaths,
    UpdateError,
    UpdateInitiator,
    UpdateJournal,
    new_staging_journal,
    record_seed_receipt,
    parse_transaction_id,
    read_active_transaction,
    read_journal,
    resolve_active_journal,
    transition,
    write_active_transaction_atomic,
    write_journal_atomic,
)
from update_mutex import MutationMutex, create_windows_mutation_mutex
from update_ownership import (
    FileDigest,
    OwnershipPlan,
    OwnershipError,
    OwnershipSource,
    build_ownership_plan,
    ownership_plan_bytes,
    ownership_plan_sha256,
    read_ownership_plan,
    write_ownership_plan_atomic,
)
from package_manifest import sha256_file


class UpdateEngineError(UpdateError):
    error_code = "update_engine_failed"


class UpdateStateConflict(UpdateEngineError):
    error_code = "update_state_conflict"


class PreparedTransactionConflict(UpdateStateConflict):
    error_code = "update_transaction_conflict"


class _RollbackEvidenceMissing(UpdateEngineError):
    pass


class _UnsafeRecoveryState(UpdateStateConflict):
    pass


class PathState(StrEnum):
    ABSENT = "absent"
    EXACT = "exact"
    MISMATCH = "mismatch"


@dataclass(frozen=True)
class TransferState:
    source: PathState
    destination: PathState


@dataclass(frozen=True)
class _RollbackRow:
    live: Path
    failed_new: Path
    backup: Path
    new_expected: tuple[FileDigest, ...] | None
    prior_expected: tuple[FileDigest, ...] | None
    tree: bool
    remove_label: str
    restore_label: str


def _ignore_operation(_label):
    return None


def _ignore_transition(_phase):
    return None


def _ignore_phase(_phase, _paths, _plan):
    return None


def _ignore_wait(_identity):
    return None


def _ignore_probe(_path, _plan):
    return None


@dataclass(frozen=True)
class UpdateEngineHooks:
    before_live_phase: Callable = _ignore_phase
    wait_for_initiating_host_exit: Callable = _ignore_wait
    probe_installed_product: Callable = _ignore_probe
    before_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_journal_transition: Callable[[JournalPhase], None] = _ignore_transition


class UpdateEngine:
    def __init__(
        self,
        install_root: Path,
        *,
        mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
        hooks: UpdateEngineHooks | None = None,
    ):
        self.install_root = install_root.resolve(strict=True)
        self._mutex_factory = mutex_factory
        self.hooks = hooks or UpdateEngineHooks()

    def _paths(self, transaction_id: object) -> TransactionPaths:
        return TransactionPaths.for_install(self.install_root, transaction_id)

    def _load_authority(self, transaction_id: str):
        paths = self._paths(transaction_id)
        try:
            active = read_active_transaction(paths.active)
            if active.transaction_id != transaction_id:
                raise UpdateStateConflict()
            if resolve_active_journal(paths.updates_root, active) != paths.journal:
                raise UpdateStateConflict()
            journal = read_journal(paths.journal)
            plan = read_ownership_plan(paths.ownership)
        except UpdateStateConflict:
            raise
        except Exception as error:
            raise UpdateStateConflict() from error
        if journal.transaction_id != transaction_id or plan.transaction_id != transaction_id:
            raise UpdateStateConflict()
        if ownership_plan_sha256(plan) != journal.ownership_sha256:
            raise UpdateStateConflict()
        if journal.target_version != plan.target_version:
            raise UpdateStateConflict()
        if journal.prior_version != plan.prior_version:
            raise UpdateStateConflict()
        if journal.fresh_install != (plan.source is OwnershipSource.FRESH):
            raise UpdateStateConflict()
        return paths, journal, plan

    def create_prepared(
        self,
        package: ValidatedPackage,
        transaction_id: str,
        *,
        expected_version: str | None,
        prior_version: str | None,
        initiator: UpdateInitiator,
    ) -> UpdateJournal:
        tx = parse_transaction_id(transaction_id)
        if initiator is UpdateInitiator.BROWSER and (
            type(expected_version) is not str or not expected_version
        ):
            raise PreparedTransactionConflict()
        try:
            candidate = build_ownership_plan(
                package,
                self.install_root,
                tx,
                expected_version=expected_version,
                prior_version=prior_version,
            )
        except OwnershipError as error:
            raise PreparedTransactionConflict() from error
        candidate_bytes = ownership_plan_bytes(candidate)
        candidate_digest = ownership_plan_sha256(candidate)
        paths = self._paths(tx)
        mutex = self._mutex_factory(self.install_root)
        with mutex:
            # Recalculate after lock to bind the live source snapshot.
            locked_candidate = build_ownership_plan(
                package,
                self.install_root,
                tx,
                expected_version=expected_version,
                prior_version=prior_version,
            )
            if ownership_plan_bytes(locked_candidate) != candidate_bytes:
                raise PreparedTransactionConflict()
            if paths.active.exists():
                try:
                    active = read_active_transaction(paths.active)
                    if active.transaction_id != tx:
                        raise PreparedTransactionConflict()
                    journal = read_journal(paths.journal)
                    persisted = read_ownership_plan(paths.ownership)
                    if (
                        journal.phase is not JournalPhase.PREPARED
                        or ownership_plan_bytes(persisted) != candidate_bytes
                        or journal.ownership_sha256 != candidate_digest
                    ):
                        raise PreparedTransactionConflict()
                    return journal
                except PreparedTransactionConflict:
                    raise
                except Exception as error:
                    raise PreparedTransactionConflict() from error
            if paths.transaction_root.exists():
                try:
                    journal = read_journal(paths.journal)
                    persisted = read_ownership_plan(paths.ownership)
                    if (
                        journal.phase is not JournalPhase.PREPARED
                        or ownership_plan_bytes(persisted) != candidate_bytes
                    ):
                        raise PreparedTransactionConflict()
                    write_active_transaction_atomic(
                        paths.active,
                        ActiveTransaction(1, tx, f"transactions/{tx}/journal.json"),
                    )
                    return journal
                except PreparedTransactionConflict:
                    raise
                except Exception as error:
                    raise PreparedTransactionConflict() from error
            if paths.preparing_root.exists():
                shutil.rmtree(paths.preparing_root)
            self._run_operation(
                "workspace:create-preparing",
                lambda: (
                    paths.preparing_staged_host.mkdir(parents=True),
                    paths.preparing_staged_extension.mkdir(parents=True),
                    paths.preparing_probe_manifest.parent.mkdir(parents=True),
                ),
            )
            staging = new_staging_journal(
                transaction_id=tx,
                initiator=initiator,
                target_version=package.manifest.package_version,
                prior_version=prior_version,
                fresh_install=candidate.source is OwnershipSource.FRESH,
                ownership_sha256=candidate_digest,
            )
            self._run_operation(
                "workspace:write-staging-journal",
                lambda: write_journal_atomic(paths.preparing_journal, staging),
            )
            self._copy_prepared_files(package, candidate, paths)
            paths.preparing_probe_manifest.write_bytes(
                canonical_json_bytes(update_manifest_to_dict(package.manifest))
            )
            self._run_operation(
                "workspace:write-ownership",
                lambda: write_ownership_plan_atomic(
                    paths.preparing_ownership, candidate
                ),
            )
            prepared = transition(staging, JournalPhase.PREPARED)
            write_journal_atomic(paths.preparing_journal, prepared)
            paths.transactions_root.mkdir(parents=True, exist_ok=True)
            self._run_operation(
                "workspace:promote-preparing",
                lambda: os.replace(paths.preparing_root, paths.transaction_root),
            )
            self._run_operation(
                "active:write",
                lambda: write_active_transaction_atomic(
                    paths.active,
                    ActiveTransaction(1, tx, f"transactions/{tx}/journal.json"),
                ),
            )
            return read_journal(paths.journal)

    def _copy_prepared_files(
        self,
        package: ValidatedPackage,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        allowed_seed = {item.path for item in plan.seed_files}
        for entry in package.manifest.entries:
            if entry.ownership is OwnershipClass.PACKAGE_ONLY:
                continue
            if entry.ownership is OwnershipClass.SEED_ONLY and entry.path.removeprefix(
                "host/"
            ) not in allowed_seed:
                continue
            source = package.stage_root.joinpath(*entry.path.split("/"))
            if entry.path.startswith("host/"):
                relative = entry.path.removeprefix("host/")
                target = paths.preparing_staged_host.joinpath(*relative.split("/"))
            elif entry.path.startswith("extension/"):
                relative = entry.path.removeprefix("extension/")
                target = paths.preparing_staged_extension.joinpath(
                    *relative.split("/")
                )
            else:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)

    def activate_prepared(
        self,
        transaction_id: str,
        process_identity: InitiatingProcessIdentity | None,
    ) -> UpdateJournal:
        tx = parse_transaction_id(transaction_id)
        with self._mutex_factory(self.install_root):
            paths, journal, plan = self._load_authority(tx)
            if journal.phase is not JournalPhase.PREPARED:
                raise UpdateStateConflict()
            if journal.initiator is UpdateInitiator.BROWSER:
                if type(process_identity) is not InitiatingProcessIdentity:
                    raise UpdateStateConflict()
            elif process_identity is not None:
                raise UpdateStateConflict()
            waiting = transition(
                journal,
                JournalPhase.WAITING_FOR_HOST_EXIT,
                initiating_process=process_identity,
            )
            write_journal_atomic(paths.journal, waiting)
            try:
                self.hooks.after_journal_transition(waiting.phase)
                if process_identity is not None:
                    self.hooks.wait_for_initiating_host_exit(process_identity)
            except Exception as error:
                return self._rollback_locked(
                    paths,
                    waiting,
                    plan,
                    self._forward_failure_code(
                        error, JournalReason.HOST_EXIT_WAIT_FAILED
                    ),
                )
            return waiting

    def resume(self, transaction_id: str) -> UpdateJournal:
        tx = parse_transaction_id(transaction_id)
        with self._mutex_factory(self.install_root):
            paths, journal, plan = self._load_authority(tx)
            if journal.phase in (
                JournalPhase.PREPARED,
                JournalPhase.COMMITTED,
                JournalPhase.ROLLED_BACK,
                JournalPhase.RECOVERY_REQUIRED,
            ):
                return journal
            if journal.phase is JournalPhase.ROLLING_BACK:
                return self._rollback_locked(
                    paths,
                    journal,
                    plan,
                    journal.original_failure_code,
                )
            if journal.phase is JournalPhase.WAITING_FOR_HOST_EXIT:
                if journal.initiating_process is not None:
                    try:
                        self.hooks.wait_for_initiating_host_exit(
                            journal.initiating_process
                        )
                    except Exception as error:
                        return self._rollback_after_forward_failure(
                            paths,
                            plan,
                            error,
                            JournalReason.HOST_EXIT_WAIT_FAILED,
                        )
                try:
                    self._backup_host(paths, plan)
                    journal = transition(journal, JournalPhase.HOST_BACKED_UP)
                    write_journal_atomic(paths.journal, journal)
                    self.hooks.after_journal_transition(journal.phase)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.HOST_BACKUP_FAILED,
                    )
            if journal.phase is JournalPhase.HOST_BACKED_UP:
                try:
                    self._install_host(paths, plan)
                    journal = transition(journal, JournalPhase.HOST_INSTALLED)
                    write_journal_atomic(paths.journal, journal)
                    self.hooks.after_journal_transition(journal.phase)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.HOST_INSTALL_FAILED,
                    )
            if journal.phase is JournalPhase.HOST_INSTALLED:
                try:
                    self._backup_extension(paths, plan)
                    journal = transition(journal, JournalPhase.EXTENSION_BACKED_UP)
                    write_journal_atomic(paths.journal, journal)
                    self.hooks.after_journal_transition(journal.phase)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.EXTENSION_BACKUP_FAILED,
                    )
            if journal.phase is JournalPhase.EXTENSION_BACKED_UP:
                try:
                    self._install_extension_and_seed(paths, journal, plan)
                    journal = read_journal(paths.journal)
                    journal = transition(journal, JournalPhase.EXTENSION_INSTALLED)
                    write_journal_atomic(paths.journal, journal)
                    self.hooks.after_journal_transition(journal.phase)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.EXTENSION_INSTALL_FAILED,
                    )
            if journal.phase is JournalPhase.EXTENSION_INSTALLED:
                try:
                    self._install_metadata(paths, plan)
                    journal = transition(journal, JournalPhase.METADATA_INSTALLED)
                    write_journal_atomic(paths.journal, journal)
                    self.hooks.after_journal_transition(journal.phase)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.METADATA_INSTALL_FAILED,
                    )
            if journal.phase is JournalPhase.METADATA_INSTALLED:
                try:
                    journal = transition(journal, JournalPhase.PROBING)
                    write_journal_atomic(paths.journal, journal)
                    self.hooks.after_journal_transition(journal.phase)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.METADATA_INSTALL_FAILED,
                    )
            if journal.phase is JournalPhase.PROBING:
                try:
                    self.hooks.probe_installed_product(self.install_root, plan)
                except Exception as error:
                    return self._rollback_after_forward_failure(
                        paths,
                        plan,
                        error,
                        JournalReason.STARTUP_PROBE_FAILED,
                    )
                journal = transition(journal, JournalPhase.COMMITTED)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            return journal

    def _forward_failure_code(
        self,
        error: Exception,
        default: JournalReason,
    ) -> JournalReason:
        current: BaseException | None = error
        seen: set[int] = set()
        while current is not None and id(current) not in seen:
            seen.add(id(current))
            if isinstance(current, PermissionError):
                return JournalReason.LOCKED_PATH
            if isinstance(current, OSError) and getattr(current, "winerror", None) in (
                32,
                33,
            ):
                return JournalReason.LOCKED_PATH
            current = current.__cause__ or current.__context__
        return default

    def _rollback_after_forward_failure(
        self,
        paths: TransactionPaths,
        plan: OwnershipPlan,
        error: Exception,
        default: JournalReason,
    ) -> UpdateJournal:
        journal = read_journal(paths.journal)
        return self._rollback_locked(
            paths,
            journal,
            plan,
            self._forward_failure_code(error, default),
        )

    def _run_operation(self, label: str, operation) -> None:
        self.hooks.before_filesystem_operation(label)
        operation()
        self.hooks.after_filesystem_operation(label)

    def _backup_host(self, paths: TransactionPaths, plan: OwnershipPlan) -> None:
        self.hooks.before_live_phase(JournalPhase.HOST_BACKED_UP, paths, plan)
        backup = paths.host_backup
        backup.mkdir(parents=True, exist_ok=True)
        flat = [item for item in plan.prior_host_files if "/" not in item.path]
        flat.sort(key=lambda item: (item.path != "dh_native_host.exe", item.path))
        for item in flat:
            source = self.install_root / item.path
            if not source.exists():
                raise UpdateStateConflict()
            target = backup / item.path
            target.parent.mkdir(parents=True, exist_ok=True)
            self._run_operation(
                f"host:backup:{item.path}",
                lambda source=source, target=target: os.replace(source, target),
            )
        internal = self.install_root / "_internal"
        if internal.exists():
            target = backup / "_internal"
            self._run_operation(
                "host:backup:_internal",
                lambda: os.replace(internal, target),
            )
        if plan.metadata_was_present:
            paths.metadata_backup.mkdir(parents=True, exist_ok=True)
            for item in plan.prior_metadata_files:
                source = self.install_root / item.path
                target = paths.metadata_backup / item.path
                if not source.exists():
                    raise UpdateStateConflict()
                self._run_operation(
                    f"metadata:backup:{item.path}",
                    lambda source=source, target=target: os.replace(source, target),
                )

    def _install_host(self, paths: TransactionPaths, plan: OwnershipPlan) -> None:
        self.hooks.before_live_phase(JournalPhase.HOST_INSTALLED, paths, plan)
        internal = paths.staged_host / "_internal"
        if internal.exists():
            self._run_operation(
                "host:install:_internal",
                lambda: os.replace(internal, self.install_root / "_internal"),
            )
        flat = [
            item
            for item in plan.host_files
            if "/" not in item.path and item.path != "dh_native_host.exe"
        ]
        flat.sort()
        for item in flat:
            source = paths.staged_host / item.path
            target = self.install_root / item.path
            self._run_operation(
                f"host:install:{item.path}",
                lambda source=source, target=target: os.replace(source, target),
            )
        executable = next(
            item for item in plan.host_files if item.path == "dh_native_host.exe"
        )
        self._run_operation(
            "host:install:dh_native_host.exe",
            lambda: os.replace(
                paths.staged_host / executable.path,
                self.install_root / executable.path,
            ),
        )

    def _backup_extension(self, paths: TransactionPaths, plan: OwnershipPlan) -> None:
        self.hooks.before_live_phase(JournalPhase.EXTENSION_BACKED_UP, paths, plan)
        live = self.install_root / "extension"
        backup = paths.extension_backup
        if plan.extension_was_present:
            if backup.exists() and not live.exists():
                return
            if backup.exists() or not live.exists():
                raise UpdateStateConflict()
            backup.parent.mkdir(parents=True, exist_ok=True)
            self._run_operation(
                "extension:backup",
                lambda: os.replace(live, backup),
            )
        elif live.exists() or backup.exists():
            raise UpdateStateConflict()

    def _install_extension_and_seed(
        self,
        paths: TransactionPaths,
        journal: UpdateJournal,
        plan: OwnershipPlan,
    ) -> None:
        self.hooks.before_live_phase(JournalPhase.EXTENSION_INSTALLED, paths, plan)
        staged_extension = paths.staged_extension
        live_extension = self.install_root / "extension"
        if staged_extension.exists() and not live_extension.exists():
            self._run_operation(
                "extension:install",
                lambda: os.replace(staged_extension, live_extension),
            )
        elif staged_extension.exists() or not live_extension.exists():
            raise UpdateStateConflict()

        if not plan.seed_files or journal.seed_receipt is not None:
            return
        seed = plan.seed_files[0]
        staged = paths.staged_host / seed.path
        live = self.install_root / seed.path
        seed_installed = False
        if staged.exists() and not live.exists():
            self._run_operation(
                f"install-seed:{seed.path}",
                lambda: os.replace(staged, live),
            )
            seed_installed = True
        elif staged.exists() and live.exists():
            seed_installed = False
        elif not staged.exists():
            seed_installed = True
        else:
            raise UpdateStateConflict()
        observed = sha256_file(live) if live.exists() else None
        receipt = SeedOperationReceipt(
            path=seed.path,
            expected_sha256=seed.sha256,
            seed_installed=seed_installed,
            observed_live_sha256=observed,
        )
        updated = record_seed_receipt(journal, receipt)
        self._run_operation(
            "journal:record-seed-receipt",
            lambda: write_journal_atomic(paths.journal, updated),
        )

    def _copy_file_replace(self, source: Path, target: Path) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(prefix=".tmp-", dir=target.parent)
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(source.read_bytes())
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, target)
        except Exception:
            try:
                os.close(descriptor)
            except OSError:
                pass
            temporary.unlink(missing_ok=True)
            raise

    def _install_metadata(self, paths: TransactionPaths, plan: OwnershipPlan) -> None:
        self.hooks.before_live_phase(JournalPhase.METADATA_INSTALLED, paths, plan)
        # Validate both sources before replacing either live file.
        for item in plan.metadata_files:
            source = paths.staged_host / item.path
            if not source.exists() or sha256_file(source) != item.sha256:
                raise UpdateStateConflict()
            live = self.install_root / item.path
            if live.exists() and sha256_file(live) != item.sha256:
                raise UpdateStateConflict()
        for item in plan.metadata_files:
            source = paths.staged_host / item.path
            live = self.install_root / item.path
            if live.exists():
                continue
            self._run_operation(
                f"metadata:install:{item.path}",
                lambda source=source, live=live: self._copy_file_replace(
                    source, live
                ),
            )
        for item in plan.metadata_files:
            if sha256_file(self.install_root / item.path) != item.sha256:
                raise UpdateStateConflict()

    def _classify_file(self, path: Path, expected_sha256: str) -> PathState:
        try:
            info = path.lstat()
        except FileNotFoundError:
            return PathState.ABSENT
        attributes = getattr(info, "st_file_attributes", 0)
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if not stat.S_ISREG(info.st_mode) or attributes & reparse:
            return PathState.MISMATCH
        try:
            return (
                PathState.EXACT
                if sha256_file(path) == expected_sha256
                else PathState.MISMATCH
            )
        except FileNotFoundError:
            return PathState.MISMATCH

    def _classify_tree(
        self,
        path: Path,
        expected_files: tuple[FileDigest, ...],
    ) -> PathState:
        try:
            info = path.lstat()
        except FileNotFoundError:
            return PathState.ABSENT
        attributes = getattr(info, "st_file_attributes", 0)
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if not stat.S_ISDIR(info.st_mode) or attributes & reparse:
            return PathState.MISMATCH
        try:
            actual_paths: list[str] = []

            def visit(directory: Path) -> bool:
                children = sorted(directory.iterdir(), key=lambda item: item.name)
                if not children:
                    return False
                for child in children:
                    child_info = child.lstat()
                    child_attributes = getattr(
                        child_info, "st_file_attributes", 0
                    )
                    if child_attributes & reparse:
                        return False
                    if stat.S_ISDIR(child_info.st_mode):
                        if not visit(child):
                            return False
                    elif stat.S_ISREG(child_info.st_mode):
                        actual_paths.append(child.relative_to(path).as_posix())
                    else:
                        return False
                return True

            if not visit(path):
                return PathState.MISMATCH
            actual_paths.sort()
            if tuple(actual_paths) != tuple(item.path for item in expected_files):
                return PathState.MISMATCH
            if any(
                sha256_file(path.joinpath(*item.path.split("/"))) != item.sha256
                for item in expected_files
            ):
                return PathState.MISMATCH
        except FileNotFoundError:
            return PathState.MISMATCH
        return PathState.EXACT

    def _classify_transfer(
        self,
        source: Path,
        destination: Path,
        expected_files: tuple[FileDigest, ...],
        *,
        tree: bool,
    ) -> TransferState:
        if tree:
            source_state = self._classify_tree(source, expected_files)
            destination_state = self._classify_tree(destination, expected_files)
        else:
            if len(expected_files) != 1:
                raise UpdateStateConflict()
            source_state = self._classify_file(
                source, expected_files[0].sha256
            )
            destination_state = self._classify_file(
                destination, expected_files[0].sha256
            )
        return TransferState(source_state, destination_state)

    def _rollback_rows(
        self,
        paths: TransactionPaths,
        plan: OwnershipPlan,
    ) -> tuple[_RollbackRow, ...]:
        rows: list[_RollbackRow] = []

        new_metadata = {item.path: item for item in plan.metadata_files}
        prior_metadata = {item.path: item for item in plan.prior_metadata_files}
        for name in sorted(new_metadata.keys() | prior_metadata.keys()):
            rows.append(
                _RollbackRow(
                    live=self.install_root / name,
                    failed_new=paths.failed_new_root / "metadata" / name,
                    backup=paths.metadata_backup / name,
                    new_expected=(new_metadata[name],) if name in new_metadata else None,
                    prior_expected=(prior_metadata[name],) if name in prior_metadata else None,
                    tree=False,
                    remove_label=f"remove-new-metadata:{name}",
                    restore_label=f"restore-metadata:{name}",
                )
            )

        rows.append(
            _RollbackRow(
                live=self.install_root / "extension",
                failed_new=paths.failed_new_root / "extension",
                backup=paths.extension_backup,
                new_expected=plan.extension_files,
                prior_expected=(
                    plan.prior_extension_files
                    if plan.extension_was_present
                    else None
                ),
                tree=True,
                remove_label="remove-new-extension",
                restore_label="restore-extension",
            )
        )

        new_internal = tuple(
            FileDigest(item.path.removeprefix("_internal/"), item.sha256)
            for item in plan.host_files
            if item.path.startswith("_internal/")
        )
        prior_internal = tuple(
            FileDigest(item.path.removeprefix("_internal/"), item.sha256)
            for item in plan.prior_host_files
            if item.path.startswith("_internal/")
        )
        new_flat = {
            item.path: item for item in plan.host_files if "/" not in item.path
        }
        prior_flat = {
            item.path: item
            for item in plan.prior_host_files
            if "/" not in item.path
        }

        def host_file_row(name: str) -> _RollbackRow:
            return _RollbackRow(
                live=self.install_root / name,
                failed_new=paths.failed_new_root / "host" / name,
                backup=paths.host_backup / name,
                new_expected=(new_flat[name],) if name in new_flat else None,
                prior_expected=(prior_flat[name],) if name in prior_flat else None,
                tree=False,
                remove_label=f"remove-new-host:{name}",
                restore_label=f"restore-host:{name}",
            )

        all_flat = new_flat.keys() | prior_flat.keys()
        if "dh_native_host.exe" in all_flat:
            rows.append(host_file_row("dh_native_host.exe"))
        if new_internal or prior_internal:
            rows.append(
                _RollbackRow(
                    live=self.install_root / "_internal",
                    failed_new=paths.failed_new_root / "host" / "_internal",
                    backup=paths.host_backup / "_internal",
                    new_expected=new_internal or None,
                    prior_expected=prior_internal or None,
                    tree=True,
                    remove_label="remove-new-host:_internal",
                    restore_label="restore-host:_internal",
                )
            )
        for name in sorted(all_flat - {"dh_native_host.exe"}):
            rows.append(host_file_row(name))
        return tuple(rows)

    def _classify_expected(
        self,
        path: Path,
        expected: tuple[FileDigest, ...],
        *,
        tree: bool,
    ) -> PathState:
        if tree:
            return self._classify_tree(path, expected)
        if len(expected) != 1:
            raise UpdateStateConflict()
        return self._classify_file(path, expected[0].sha256)

    def _path_is_absent(self, path: Path) -> bool:
        try:
            path.lstat()
        except FileNotFoundError:
            return True
        return False

    def _evaluate_rollback_row(
        self,
        row: _RollbackRow,
    ) -> tuple[bool, bool]:
        if row.new_expected is None:
            if not self._path_is_absent(row.failed_new):
                raise _UnsafeRecoveryState()
            failed_state = PathState.ABSENT
            live_new = None
        else:
            remove_state = self._classify_transfer(
                row.live,
                row.failed_new,
                row.new_expected,
                tree=row.tree,
            )
            live_new = remove_state.source
            failed_state = remove_state.destination
            if failed_state is PathState.MISMATCH:
                raise _UnsafeRecoveryState()

        if row.prior_expected is None:
            if not self._path_is_absent(row.backup):
                raise _UnsafeRecoveryState()
            if self._path_is_absent(row.live):
                return False, False
            if (
                live_new is PathState.EXACT
                and failed_state is PathState.ABSENT
            ):
                return True, False
            raise _UnsafeRecoveryState()

        restore_state = self._classify_transfer(
            row.backup,
            row.live,
            row.prior_expected,
            tree=row.tree,
        )
        backup_state = restore_state.source
        live_prior = restore_state.destination
        if backup_state is PathState.MISMATCH:
            raise _UnsafeRecoveryState()
        if backup_state is PathState.ABSENT:
            if live_prior is PathState.EXACT:
                return False, False
            if self._path_is_absent(row.live):
                raise _RollbackEvidenceMissing()
            raise _UnsafeRecoveryState()
        if self._path_is_absent(row.live):
            return False, True
        if live_new is PathState.EXACT and failed_state is PathState.ABSENT:
            return True, True
        raise _UnsafeRecoveryState()

    def _plan_rollback_operations(
        self,
        paths: TransactionPaths,
        plan: OwnershipPlan,
    ) -> tuple[tuple[_RollbackRow, ...], tuple[_RollbackRow, ...]]:
        rows = self._rollback_rows(paths, plan)
        remove: list[_RollbackRow] = []
        restore: list[_RollbackRow] = []
        for row in rows:
            remove_pending, restore_pending = self._evaluate_rollback_row(row)
            if remove_pending:
                remove.append(row)
            if restore_pending:
                restore.append(row)

        metadata = [row for row in restore if row.restore_label.startswith("restore-metadata:")]
        extension = [row for row in restore if row.restore_label == "restore-extension"]
        host = [row for row in restore if row.restore_label.startswith("restore-host:")]
        host.sort(
            key=lambda row: (
                row.restore_label.endswith("dh_native_host.exe"),
                row.restore_label,
            )
        )
        metadata.sort(key=lambda row: row.restore_label, reverse=True)
        return tuple(remove), tuple((*host, *extension, *metadata))

    def _move_rollback_row(
        self,
        row: _RollbackRow,
        *,
        restore: bool,
    ) -> None:
        source = row.backup if restore else row.live
        target = row.live if restore else row.failed_new
        label = row.restore_label if restore else row.remove_label

        def move() -> None:
            target.parent.mkdir(parents=True, exist_ok=True)
            os.replace(source, target)

        self._run_operation(label, move)

    def _resume_rollback_products(
        self,
        paths: TransactionPaths,
        plan: OwnershipPlan,
    ) -> None:
        remove, restore = self._plan_rollback_operations(paths, plan)
        for row in remove:
            self._move_rollback_row(row, restore=False)
        for row in restore:
            self._move_rollback_row(row, restore=True)
        pending_remove, pending_restore = self._plan_rollback_operations(paths, plan)
        if pending_remove or pending_restore:
            raise UpdateStateConflict()

    def _rollback_locked(
        self,
        paths: TransactionPaths,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        failure_code: JournalReason,
    ) -> UpdateJournal:
        if journal.phase in (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK):
            return journal
        if journal.phase is JournalPhase.RECOVERY_REQUIRED:
            rolling = transition(journal, JournalPhase.ROLLING_BACK)
            write_journal_atomic(paths.journal, rolling)
            self.hooks.after_journal_transition(rolling.phase)
        elif journal.phase is JournalPhase.ROLLING_BACK:
            rolling = journal
        else:
            rolling = transition(
                journal,
                JournalPhase.ROLLING_BACK,
                failure_code=failure_code,
            )
            write_journal_atomic(paths.journal, rolling)
            self.hooks.after_journal_transition(rolling.phase)
        try:
            self._resume_rollback_products(paths, plan)
            rolled_back = transition(rolling, JournalPhase.ROLLED_BACK)
            write_journal_atomic(paths.journal, rolled_back)
            self.hooks.after_journal_transition(rolled_back.phase)
            return rolled_back
        except Exception as rollback_error:
            reason = (
                JournalReason.MANUAL_RECOVERY_REQUIRED
                if isinstance(rollback_error, _UnsafeRecoveryState)
                else JournalReason.ROLLBACK_FAILED
            )
            recovery = transition(
                rolling,
                JournalPhase.RECOVERY_REQUIRED,
                failure_code=reason,
            )
            try:
                write_journal_atomic(paths.journal, recovery)
            except Exception as persistence_error:
                rollback_safe = UpdateEngineError()
                rollback_safe.__cause__ = rollback_error
                persistence_safe = JournalValidationError()
                persistence_safe.__cause__ = persistence_error
                raise ExceptionGroup(
                    "rollback_and_journal_persistence_failed",
                    [rollback_safe, persistence_safe],
                )
            self.hooks.after_journal_transition(recovery.phase)
            return recovery

    def rollback(
        self, transaction_id: str, failure_code: JournalReason
    ) -> UpdateJournal:
        tx = parse_transaction_id(transaction_id)
        with self._mutex_factory(self.install_root):
            paths, journal, plan = self._load_authority(tx)
            if journal.phase in (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK):
                return journal
            if journal.phase is JournalPhase.RECOVERY_REQUIRED:
                if failure_code != journal.original_failure_code:
                    raise UpdateStateConflict()
            elif journal.phase is JournalPhase.ROLLING_BACK:
                if failure_code != journal.original_failure_code:
                    raise UpdateStateConflict()
            elif journal.phase not in (
                JournalPhase.WAITING_FOR_HOST_EXIT,
                JournalPhase.HOST_BACKED_UP,
                JournalPhase.HOST_INSTALLED,
                JournalPhase.EXTENSION_BACKED_UP,
                JournalPhase.EXTENSION_INSTALLED,
                JournalPhase.METADATA_INSTALLED,
                JournalPhase.PROBING,
            ) or failure_code not in FORWARD_FAILURE_CODES:
                raise UpdateStateConflict()
            return self._rollback_locked(paths, journal, plan, failure_code)

    def finalize_terminal_evidence(self, transaction_id: str) -> bool:
        paths = self._paths(transaction_id)
        with self._mutex_factory(self.install_root):
            if not paths.active.exists() and not paths.transaction_root.exists():
                return False
            paths, journal, _plan = self._load_authority(transaction_id)
            if journal.phase not in (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK):
                raise UpdateStateConflict()
            paths.active.unlink()
            shutil.rmtree(paths.transaction_root)
            return True
