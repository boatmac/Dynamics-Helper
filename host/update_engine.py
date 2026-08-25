import os
import shutil
import stat
import tempfile
import time
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


_replace_path = os.replace
_sleep = time.sleep
_is_windows = os.name == "nt"
PROMOTION_TRANSIENT_WINERRORS = frozenset((5, 32, 33))
PROMOTION_RETRY_DELAYS = (0.05, 0.2)


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


@dataclass(frozen=True)
class _MoveRow:
    source: Path
    destination: Path
    expected: tuple[FileDigest, ...]
    tree: bool
    label: str


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
    before_live_phase: Callable[[JournalPhase, TransactionPaths, OwnershipPlan], None]
    wait_for_initiating_host_exit: Callable[[InitiatingProcessIdentity], None]
    probe_installed_product: Callable[[Path, OwnershipPlan], None]
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
        self.hooks = hooks or UpdateEngineHooks(
            _ignore_phase,
            _ignore_wait,
            _ignore_probe,
        )

    def _paths(self, transaction_id: object) -> TransactionPaths:
        return TransactionPaths.for_install(self.install_root, transaction_id)

    def _load_authority(self, transaction_id: str):
        paths = self._paths(transaction_id)
        try:
            canonical_install = self._require_plain_directory(
                self.install_root, None, UpdateStateConflict
            )
            canonical_updates = self._require_plain_directory(
                paths.updates_root, canonical_install, UpdateStateConflict
            )
            self._require_plain_file(
                paths.active, canonical_updates, UpdateStateConflict
            )
            active = read_active_transaction(paths.active)
            if active.transaction_id != transaction_id:
                raise UpdateStateConflict()
            if resolve_active_journal(paths.updates_root, active) != paths.journal:
                raise UpdateStateConflict()
        except UpdateStateConflict:
            raise
        except Exception as error:
            raise UpdateStateConflict() from error
        journal, plan = self._load_transaction_authority(paths, transaction_id)
        return paths, journal, plan

    def _load_transaction_authority(
        self,
        paths: TransactionPaths,
        transaction_id: str,
    ) -> tuple[UpdateJournal, OwnershipPlan]:
        try:
            canonical_install = self._require_plain_directory(
                self.install_root, None, UpdateStateConflict
            )
            canonical_updates = self._require_plain_directory(
                paths.updates_root, canonical_install, UpdateStateConflict
            )
            canonical_transactions = self._require_plain_directory(
                paths.transactions_root, canonical_updates, UpdateStateConflict
            )
            canonical_root = self._require_plain_directory(
                paths.transaction_root,
                canonical_transactions,
                UpdateStateConflict,
            )
            self._require_plain_file(
                paths.journal, canonical_root, UpdateStateConflict
            )
            self._require_plain_file(
                paths.ownership, canonical_root, UpdateStateConflict
            )
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
        if journal.seed_receipt is not None:
            if (
                plan.source is not OwnershipSource.FRESH
                or len(plan.seed_files) != 1
                or journal.seed_receipt.path != plan.seed_files[0].path
                or journal.seed_receipt.expected_sha256 != plan.seed_files[0].sha256
            ):
                raise UpdateStateConflict()
        receipt_required = journal.phase in (
            JournalPhase.EXTENSION_INSTALLED,
            JournalPhase.METADATA_INSTALLED,
            JournalPhase.PROBING,
            JournalPhase.COMMITTED,
        ) or (
            journal.phase
            in (
                JournalPhase.ROLLING_BACK,
                JournalPhase.ROLLED_BACK,
                JournalPhase.RECOVERY_REQUIRED,
            )
            and journal.rollback_from
            in (
                JournalPhase.EXTENSION_INSTALLED,
                JournalPhase.METADATA_INSTALLED,
                JournalPhase.PROBING,
            )
        )
        receipt_forbidden = journal.phase in (
            JournalPhase.STAGING,
            JournalPhase.PREPARED,
            JournalPhase.WAITING_FOR_HOST_EXIT,
            JournalPhase.HOST_BACKED_UP,
            JournalPhase.HOST_INSTALLED,
        ) or (
            journal.phase
            in (
                JournalPhase.ROLLING_BACK,
                JournalPhase.ROLLED_BACK,
                JournalPhase.RECOVERY_REQUIRED,
            )
            and journal.rollback_from
            in (
                JournalPhase.STAGING,
                JournalPhase.PREPARED,
                JournalPhase.WAITING_FOR_HOST_EXIT,
                JournalPhase.HOST_BACKED_UP,
                JournalPhase.HOST_INSTALLED,
            )
        )
        if receipt_forbidden and journal.seed_receipt is not None:
            raise UpdateStateConflict()
        if plan.seed_files and receipt_required and journal.seed_receipt is None:
            raise UpdateStateConflict()
        return journal, plan

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
            self._require_existing_preparation_ancestors(paths)
            if paths.active.exists():
                try:
                    _paths, journal, persisted = self._load_authority(tx)
                    self._require_prepared_candidate(
                        journal,
                        persisted,
                        candidate,
                        candidate_bytes,
                        initiator,
                    )
                    active_staging = new_staging_journal(
                        transaction_id=tx,
                        initiator=initiator,
                        target_version=candidate.target_version,
                        prior_version=candidate.prior_version,
                        fresh_install=candidate.source is OwnershipSource.FRESH,
                        ownership_sha256=ownership_plan_sha256(candidate),
                    )
                    self._require_promotion_workspace(
                        package,
                        candidate,
                        candidate_bytes,
                        paths,
                        active_staging,
                        preparing=False,
                    )
                    return journal
                except PreparedTransactionConflict:
                    raise
                except Exception as error:
                    raise PreparedTransactionConflict() from error
            if paths.transaction_root.exists():
                try:
                    journal, persisted = self._load_transaction_authority(
                        paths, tx
                    )
                    self._require_prepared_candidate(
                        journal,
                        persisted,
                        candidate,
                        candidate_bytes,
                        initiator,
                    )
                    repair_staging = new_staging_journal(
                        transaction_id=tx,
                        initiator=initiator,
                        target_version=candidate.target_version,
                        prior_version=candidate.prior_version,
                        fresh_install=candidate.source is OwnershipSource.FRESH,
                        ownership_sha256=ownership_plan_sha256(candidate),
                    )
                    self._require_promotion_workspace(
                        package,
                        candidate,
                        candidate_bytes,
                        paths,
                        repair_staging,
                        preparing=False,
                    )
                    self._run_preparation_operation(
                        "active:write",
                        lambda: self._write_active_after_final_validation(
                            package,
                            candidate,
                            candidate_bytes,
                            paths,
                            repair_staging,
                        ),
                    )
                    return journal
                except PreparedTransactionConflict:
                    raise
                except Exception as error:
                    raise PreparedTransactionConflict() from error
            staging = new_staging_journal(
                transaction_id=tx,
                initiator=initiator,
                target_version=package.manifest.package_version,
                prior_version=prior_version,
                fresh_install=candidate.source is OwnershipSource.FRESH,
                ownership_sha256=candidate_digest,
            )
            return self._resume_preparation(
                package,
                candidate,
                candidate_bytes,
                paths,
                staging,
            )

    def _require_prepared_candidate(
        self,
        journal: UpdateJournal,
        persisted: OwnershipPlan,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        initiator: UpdateInitiator,
    ) -> None:
        if (
            journal.phase is not JournalPhase.PREPARED
            or journal.initiator is not initiator
            or journal.target_version != candidate.target_version
            or journal.prior_version != candidate.prior_version
            or journal.ownership_sha256 != ownership_plan_sha256(candidate)
            or ownership_plan_bytes(persisted) != candidate_bytes
        ):
            raise PreparedTransactionConflict()

    def _run_preparation_operation(self, label: str, operation) -> None:
        try:
            self._run_operation(label, operation)
        except PreparedTransactionConflict:
            raise
        except Exception as error:
            raise PreparedTransactionConflict() from error

    def _preparing_orphan_is_cleanup_safe(self, paths: TransactionPaths) -> bool:
        allowed_directories = {
            "staged",
            "staged/host",
            "staged/extension",
            "probe",
        }
        try:
            for child in paths.preparing_root.rglob("*"):
                relative = child.relative_to(paths.preparing_root).as_posix()
                if child.is_symlink() or not child.is_dir():
                    return False
                if relative not in allowed_directories:
                    return False
        except OSError:
            return False
        return True

    def _classify_bytes(self, path: Path, expected: bytes) -> PathState:
        try:
            info = path.lstat()
        except FileNotFoundError:
            return PathState.ABSENT
        attributes = getattr(info, "st_file_attributes", 0)
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if not stat.S_ISREG(info.st_mode) or attributes & reparse:
            return PathState.MISMATCH
        try:
            return PathState.EXACT if path.read_bytes() == expected else PathState.MISMATCH
        except OSError:
            return PathState.MISMATCH

    def _write_bytes_replace(self, path: Path, payload: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(prefix=".tmp-", dir=path.parent)
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(payload)
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

    def _preparation_entries(
        self,
        package: ValidatedPackage,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> tuple[tuple[str, Path, Path, str], ...]:
        allowed_seed = {item.path for item in plan.seed_files}
        host_entries = []
        extension_entries = []
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
                host_entries.append(
                    (f"workspace:stage-host:{relative}", source, target, entry.sha256)
                )
            elif entry.path.startswith("extension/"):
                relative = entry.path.removeprefix("extension/")
                target = paths.preparing_staged_extension.joinpath(
                    *relative.split("/")
                )
                extension_entries.append(
                    (
                        f"workspace:stage-extension:{relative}",
                        source,
                        target,
                        entry.sha256,
                    )
                )
            else:
                continue
        return tuple(
            sorted(host_entries, key=lambda item: item[0])
            + sorted(extension_entries, key=lambda item: item[0])
        )

    def _verify_prepared_workspace(
        self,
        package: ValidatedPackage,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        paths: TransactionPaths,
        *,
        preparing: bool,
    ) -> None:
        if preparing:
            staged_host = paths.preparing_staged_host
            staged_extension = paths.preparing_staged_extension
            probe_manifest = paths.preparing_probe_manifest
            ownership = paths.preparing_ownership
        else:
            staged_host = paths.staged_host
            staged_extension = paths.staged_extension
            probe_manifest = paths.probe_manifest
            ownership = paths.ownership
        expected_host = tuple(
            sorted(
                (
                    *candidate.host_files,
                    *candidate.seed_files,
                    *candidate.metadata_files,
                )
            )
        )
        probe_bytes = canonical_json_bytes(update_manifest_to_dict(package.manifest))
        if (
            self._classify_tree(staged_host, expected_host) is not PathState.EXACT
            or self._classify_tree(staged_extension, candidate.extension_files)
            is not PathState.EXACT
            or self._classify_bytes(probe_manifest, probe_bytes)
            is not PathState.EXACT
            or self._classify_bytes(ownership, candidate_bytes)
            is not PathState.EXACT
        ):
            raise PreparedTransactionConflict()

    def _require_plain_directory(
        self,
        path: Path,
        expected_parent: Path | None,
        conflict_type: type[Exception] = PreparedTransactionConflict,
    ) -> Path:
        try:
            info = path.lstat()
            attributes = getattr(info, "st_file_attributes", 0)
            reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
            if not stat.S_ISDIR(info.st_mode) or attributes & reparse:
                raise conflict_type()
            resolved = path.resolve(strict=True)
            resolved.relative_to(self.install_root)
            if expected_parent is not None and resolved.parent != expected_parent:
                raise conflict_type()
            return resolved
        except conflict_type:
            raise
        except Exception as error:
            raise conflict_type() from error

    def _require_plain_file(
        self,
        path: Path,
        root: Path,
        conflict_type: type[Exception] = PreparedTransactionConflict,
    ) -> None:
        try:
            info = path.lstat()
            attributes = getattr(info, "st_file_attributes", 0)
            reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
            if not stat.S_ISREG(info.st_mode) or attributes & reparse:
                raise conflict_type()
            path.resolve(strict=True).relative_to(root)
        except conflict_type:
            raise
        except Exception as error:
            raise conflict_type() from error

    def _require_absent_target(self, path: Path) -> None:
        try:
            path.lstat()
        except FileNotFoundError:
            return
        except Exception as error:
            raise PreparedTransactionConflict() from error
        raise PreparedTransactionConflict()

    def _require_existing_preparation_ancestors(
        self,
        paths: TransactionPaths,
    ) -> None:
        try:
            canonical_install = self._require_plain_directory(
                self.install_root, None
            )
            if canonical_install != self.install_root:
                raise PreparedTransactionConflict()
            if paths.updates_root.exists():
                canonical_updates = self._require_plain_directory(
                    paths.updates_root, canonical_install
                )
                if paths.transactions_root.exists():
                    canonical_transactions = self._require_plain_directory(
                        paths.transactions_root, canonical_updates
                    )
                    for root in (paths.preparing_root, paths.transaction_root):
                        try:
                            root.lstat()
                        except FileNotFoundError:
                            continue
                        self._require_plain_directory(
                            root, canonical_transactions
                        )
        except PreparedTransactionConflict:
            raise
        except Exception as error:
            raise PreparedTransactionConflict() from error

    def _create_plain_preparing_workspace(self, paths: TransactionPaths) -> None:
        canonical_install = self._require_plain_directory(self.install_root, None)
        chain = (
            (paths.updates_root, canonical_install),
            (paths.transactions_root, paths.updates_root),
            (paths.preparing_root, paths.transactions_root),
            (paths.preparing_staged_root, paths.preparing_root),
            (paths.preparing_staged_host, paths.preparing_staged_root),
            (paths.preparing_staged_extension, paths.preparing_staged_root),
            (paths.preparing_probe_manifest.parent, paths.preparing_root),
        )
        canonical: dict[Path, Path] = {self.install_root: canonical_install}
        for path, parent_path in chain:
            try:
                path.mkdir()
            except FileExistsError:
                pass
            parent = canonical.get(parent_path)
            if parent is None:
                parent = self._require_plain_directory(parent_path, None)
            canonical[path] = self._require_plain_directory(path, parent)

    def _require_plain_target_parent(self, root: Path, target: Path) -> None:
        canonical_install = self._require_plain_directory(self.install_root, None)
        canonical_updates = self._require_plain_directory(
            root.parent.parent, canonical_install
        )
        canonical_transactions = self._require_plain_directory(
            root.parent, canonical_updates
        )
        canonical_parent = self._require_plain_directory(
            root, canonical_transactions
        )
        current = root
        for component in target.parent.relative_to(root).parts:
            child = current / component
            try:
                child.mkdir()
            except FileExistsError:
                pass
            canonical_parent = self._require_plain_directory(child, canonical_parent)
            current = child

    def _write_active_after_final_validation(
        self,
        package: ValidatedPackage,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        paths: TransactionPaths,
        staging: UpdateJournal,
    ) -> None:
        self._require_promotion_workspace(
            package,
            candidate,
            candidate_bytes,
            paths,
            staging,
            preparing=False,
        )
        self._require_absent_target(paths.active)
        write_active_transaction_atomic(
            paths.active,
            ActiveTransaction(
                1,
                staging.transaction_id,
                f"transactions/{staging.transaction_id}/journal.json",
            ),
        )

    def _write_absent_bytes(
        self,
        root: Path,
        target: Path,
        payload: bytes,
    ) -> None:
        self._require_plain_target_parent(root, target)
        self._require_absent_target(target)
        self._write_bytes_replace(target, payload)

    def _write_absent_journal(
        self,
        paths: TransactionPaths,
        journal: UpdateJournal,
    ) -> None:
        self._require_plain_target_parent(
            paths.preparing_root, paths.preparing_journal
        )
        self._require_absent_target(paths.preparing_journal)
        write_journal_atomic(paths.preparing_journal, journal)

    def _replace_staging_journal(
        self,
        paths: TransactionPaths,
        staging: UpdateJournal,
        prepared: UpdateJournal,
    ) -> None:
        canonical_root = self._require_plain_directory(
            paths.preparing_root,
            self._require_plain_directory(
                paths.transactions_root,
                self._require_plain_directory(
                    paths.updates_root,
                    self._require_plain_directory(self.install_root, None),
                ),
            ),
        )
        self._require_plain_file(paths.preparing_journal, canonical_root)
        if read_journal(paths.preparing_journal) != staging:
            raise PreparedTransactionConflict()
        write_journal_atomic(paths.preparing_journal, prepared)

    def _write_absent_ownership(
        self,
        paths: TransactionPaths,
        candidate: OwnershipPlan,
    ) -> None:
        self._require_plain_target_parent(
            paths.preparing_root, paths.preparing_ownership
        )
        self._require_absent_target(paths.preparing_ownership)
        write_ownership_plan_atomic(paths.preparing_ownership, candidate)

    def _require_promotion_workspace(
        self,
        package: ValidatedPackage,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        paths: TransactionPaths,
        staging: UpdateJournal,
        *,
        preparing: bool,
    ) -> None:
        root = paths.preparing_root if preparing else paths.transaction_root
        journal_path = paths.preparing_journal if preparing else paths.journal
        ownership_path = paths.preparing_ownership if preparing else paths.ownership
        probe_path = (
            paths.preparing_probe_manifest if preparing else paths.probe_manifest
        )
        other_root = paths.transaction_root if preparing else paths.preparing_root
        expected_paths = self._paths(staging.transaction_id)
        if paths != expected_paths or paths.install_root != self.install_root:
            raise PreparedTransactionConflict()

        canonical_install = self._require_plain_directory(self.install_root, None)
        canonical_updates = self._require_plain_directory(
            paths.updates_root, canonical_install
        )
        canonical_transactions = self._require_plain_directory(
            paths.transactions_root, canonical_updates
        )
        canonical_root = self._require_plain_directory(root, canonical_transactions)

        try:
            other_root.lstat()
        except FileNotFoundError:
            pass
        except Exception as error:
            raise PreparedTransactionConflict() from error
        else:
            raise PreparedTransactionConflict()

        prepared = (
            staging
            if staging.phase is JournalPhase.PREPARED
            else transition(staging, JournalPhase.PREPARED)
        )
        self._require_plain_file(journal_path, canonical_root)
        self._require_plain_file(ownership_path, canonical_root)
        self._require_plain_file(probe_path, canonical_root)
        if read_journal(journal_path) != prepared:
            raise PreparedTransactionConflict()
        if (
            ownership_path.read_bytes() != candidate_bytes
            or ownership_plan_bytes(candidate) != candidate_bytes
            or read_ownership_plan(ownership_path) != candidate
            or ownership_plan_sha256(candidate) != prepared.ownership_sha256
        ):
            raise PreparedTransactionConflict()
        probe_bytes = canonical_json_bytes(update_manifest_to_dict(package.manifest))
        if probe_path.read_bytes() != probe_bytes:
            raise PreparedTransactionConflict()

        host_files = (
            *candidate.host_files,
            *candidate.seed_files,
            *candidate.metadata_files,
        )
        expected_files = {
            "journal.json",
            "ownership.json",
            "probe/update-manifest.json",
            *(f"staged/host/{item.path}" for item in host_files),
            *(f"staged/extension/{item.path}" for item in candidate.extension_files),
        }
        expected_directories = {
            "probe",
            "staged",
            "staged/host",
            "staged/extension",
        }
        for relative in expected_files:
            parts = relative.split("/")
            expected_directories.update(
                "/".join(parts[:index]) for index in range(1, len(parts))
            )

        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        actual_files: set[str] = set()
        actual_directories: set[str] = set()

        def visit(directory: Path) -> None:
            for child in sorted(directory.iterdir(), key=lambda item: item.name):
                info = child.lstat()
                attributes = getattr(info, "st_file_attributes", 0)
                if attributes & reparse:
                    raise PreparedTransactionConflict()
                resolved = child.resolve(strict=True)
                try:
                    resolved.relative_to(canonical_root)
                except ValueError as error:
                    raise PreparedTransactionConflict() from error
                relative = child.relative_to(root).as_posix()
                if stat.S_ISDIR(info.st_mode):
                    actual_directories.add(relative)
                    visit(child)
                elif stat.S_ISREG(info.st_mode):
                    actual_files.add(relative)
                else:
                    raise PreparedTransactionConflict()

        visit(root)
        if (
            actual_files != expected_files
            or actual_directories != expected_directories
        ):
            raise PreparedTransactionConflict()
        self._verify_prepared_workspace(
            package,
            candidate,
            candidate_bytes,
            paths,
            preparing=preparing,
        )

    def _require_preparing_promotion_candidate(
        self,
        package: ValidatedPackage,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        paths: TransactionPaths,
        staging: UpdateJournal,
    ) -> None:
        try:
            self._require_promotion_workspace(
                package,
                candidate,
                candidate_bytes,
                paths,
                staging,
                preparing=True,
            )
        except PreparedTransactionConflict:
            raise
        except Exception as error:
            raise PreparedTransactionConflict() from error

    def _promote_preparing_with_retry(
        self,
        package: ValidatedPackage,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        paths: TransactionPaths,
        staging: UpdateJournal,
    ) -> None:
        # promotion-checkpoint: initial
        self._require_preparing_promotion_candidate(
            package, candidate, candidate_bytes, paths, staging
        )
        for attempt in range(len(PROMOTION_RETRY_DELAYS) + 1):
            try:
                _replace_path(paths.preparing_root, paths.transaction_root)
                self._require_promotion_workspace(
                    package,
                    candidate,
                    candidate_bytes,
                    paths,
                    staging,
                    preparing=False,
                )
                return
            except OSError as error:
                winerror = getattr(error, "winerror", None)
                if (
                    not _is_windows
                    or type(winerror) is not int
                    or winerror not in PROMOTION_TRANSIENT_WINERRORS
                    or attempt >= len(PROMOTION_RETRY_DELAYS)
                ):
                    raise
                # promotion-checkpoint: pre-sleep
                self._require_preparing_promotion_candidate(
                    package, candidate, candidate_bytes, paths, staging
                )
                _sleep(PROMOTION_RETRY_DELAYS[attempt])
                # promotion-checkpoint: post-sleep
                self._require_preparing_promotion_candidate(
                    package, candidate, candidate_bytes, paths, staging
                )

    def _resume_preparation(
        self,
        package: ValidatedPackage,
        candidate: OwnershipPlan,
        candidate_bytes: bytes,
        paths: TransactionPaths,
        staging: UpdateJournal,
    ) -> UpdateJournal:
        if paths.preparing_root.exists() and not paths.preparing_journal.exists():
            if not self._preparing_orphan_is_cleanup_safe(paths):
                raise PreparedTransactionConflict()
            self._run_preparation_operation(
                "workspace:remove-orphan-preparing",
                lambda: shutil.rmtree(paths.preparing_root),
            )

        if not paths.preparing_root.exists():
            self._run_preparation_operation(
                "workspace:create-preparing",
                lambda: self._create_plain_preparing_workspace(paths),
            )

        if paths.preparing_journal.exists():
            try:
                journal = read_journal(paths.preparing_journal)
            except Exception as error:
                raise PreparedTransactionConflict() from error
            if (
                journal.transaction_id != staging.transaction_id
                or journal.initiator is not staging.initiator
                or journal.target_version != staging.target_version
                or journal.prior_version != staging.prior_version
                or journal.fresh_install != staging.fresh_install
                or journal.ownership_sha256 != staging.ownership_sha256
                or journal.phase not in (JournalPhase.STAGING, JournalPhase.PREPARED)
            ):
                raise PreparedTransactionConflict()
        else:
            self._run_preparation_operation(
                "workspace:write-staging-journal",
                lambda: self._write_absent_journal(paths, staging),
            )
            self.hooks.after_journal_transition(JournalPhase.STAGING)
            journal = staging

        probe_bytes = canonical_json_bytes(update_manifest_to_dict(package.manifest))
        probe_state = self._classify_bytes(paths.preparing_probe_manifest, probe_bytes)
        if probe_state is PathState.MISMATCH:
            raise PreparedTransactionConflict()
        if probe_state is PathState.ABSENT:
            self._run_preparation_operation(
                "workspace:write-probe-manifest",
                lambda: self._write_absent_bytes(
                    paths.preparing_root,
                    paths.preparing_probe_manifest,
                    probe_bytes,
                ),
            )

        entries = self._preparation_entries(package, candidate, paths)
        for label, source, target, expected_sha256 in entries:
            state = self._classify_file(target, expected_sha256)
            if state is PathState.MISMATCH:
                raise PreparedTransactionConflict()
            if state is PathState.ABSENT:
                self._run_preparation_operation(
                    label,
                    lambda source=source, target=target: (
                        self._require_plain_target_parent(
                            paths.preparing_root, target
                        ),
                        self._require_absent_target(target),
                        shutil.copy2(source, target),
                    ),
                )

        ownership_state = self._classify_bytes(
            paths.preparing_ownership, candidate_bytes
        )
        if ownership_state is PathState.MISMATCH:
            raise PreparedTransactionConflict()
        if ownership_state is PathState.ABSENT:
            self._run_preparation_operation(
                "workspace:write-ownership",
                lambda: self._write_absent_ownership(paths, candidate),
            )

        if journal.phase is JournalPhase.STAGING:
            prepared = transition(journal, JournalPhase.PREPARED)
            self._run_preparation_operation(
                "workspace:write-prepared-journal",
                lambda: self._replace_staging_journal(
                    paths, journal, prepared
                ),
            )
            self.hooks.after_journal_transition(JournalPhase.PREPARED)
            journal = prepared

        for _label, _source, target, expected_sha256 in entries:
            if self._classify_file(target, expected_sha256) is not PathState.EXACT:
                raise PreparedTransactionConflict()
        if self._classify_bytes(paths.preparing_probe_manifest, probe_bytes) is not PathState.EXACT:
            raise PreparedTransactionConflict()
        if self._classify_bytes(paths.preparing_ownership, candidate_bytes) is not PathState.EXACT:
            raise PreparedTransactionConflict()
        self._verify_prepared_workspace(
            package,
            candidate,
            candidate_bytes,
            paths,
            preparing=True,
        )

        if paths.transaction_root.exists() or not paths.preparing_root.exists():
            raise PreparedTransactionConflict()
        self._run_preparation_operation(
            "workspace:promote-preparing",
            lambda: self._promote_preparing_with_retry(
                package, candidate, candidate_bytes, paths, staging
            ),
        )
        self._run_preparation_operation(
            "active:write",
            lambda: self._write_active_after_final_validation(
                package,
                candidate,
                candidate_bytes,
                paths,
                staging,
            ),
        )
        return read_journal(paths.journal)

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
                    self._resume_host_backup(journal, plan, paths)
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
                    self._resume_host_install(journal, plan, paths)
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
                    self._resume_extension_backup(journal, plan, paths)
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
                    self._resume_extension_install(journal, plan, paths)
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
                    self._resume_metadata_install(journal, plan, paths)
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
                    self._resume_probe(journal, plan, paths)
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

    def _preflight_phase(
        self,
        rows: tuple[_MoveRow, ...],
    ) -> tuple[_MoveRow, ...]:
        pending = []
        for row in rows:
            state = self._classify_transfer(
                row.source,
                row.destination,
                row.expected,
                tree=row.tree,
            )
            if state == TransferState(PathState.EXACT, PathState.ABSENT):
                pending.append(row)
            elif state != TransferState(PathState.ABSENT, PathState.EXACT):
                raise UpdateStateConflict()
        return tuple(pending)

    def _run_move_phase(self, rows: tuple[_MoveRow, ...]) -> None:
        pending = self._preflight_phase(rows)
        for row in pending:
            def move(row=row):
                row.destination.parent.mkdir(parents=True, exist_ok=True)
                os.replace(row.source, row.destination)

            self._run_operation(row.label, move)
        if self._preflight_phase(rows):
            raise UpdateStateConflict()

    def _resume_host_backup(
        self,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        self.hooks.before_live_phase(JournalPhase.HOST_BACKED_UP, paths, plan)
        rows: list[_MoveRow] = []
        for item in plan.prior_metadata_files:
            rows.append(
                _MoveRow(
                    self.install_root / item.path,
                    paths.metadata_backup / item.path,
                    (item,),
                    False,
                    f"backup-metadata:{item.path}",
                )
            )
        flat = {
            item.path: item
            for item in plan.prior_host_files
            if "/" not in item.path
        }
        executable = flat.pop("dh_native_host.exe", None)
        if executable is not None:
            rows.append(
                _MoveRow(
                    self.install_root / executable.path,
                    paths.host_backup / executable.path,
                    (executable,),
                    False,
                    "backup-host:dh_native_host.exe",
                )
            )
        internal = tuple(
            FileDigest(item.path.removeprefix("_internal/"), item.sha256)
            for item in plan.prior_host_files
            if item.path.startswith("_internal/")
        )
        if internal:
            rows.append(
                _MoveRow(
                    self.install_root / "_internal",
                    paths.host_backup / "_internal",
                    internal,
                    True,
                    "backup-host:_internal",
                )
            )
        for name in sorted(flat):
            item = flat[name]
            rows.append(
                _MoveRow(
                    self.install_root / item.path,
                    paths.host_backup / item.path,
                    (item,),
                    False,
                    f"backup-host:{item.path}",
                )
            )
        self._run_move_phase(tuple(rows))

    def _resume_host_install(
        self,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        self.hooks.before_live_phase(JournalPhase.HOST_INSTALLED, paths, plan)
        rows: list[_MoveRow] = []
        internal = tuple(
            FileDigest(item.path.removeprefix("_internal/"), item.sha256)
            for item in plan.host_files
            if item.path.startswith("_internal/")
        )
        if internal:
            rows.append(
                _MoveRow(
                    paths.staged_host / "_internal",
                    self.install_root / "_internal",
                    internal,
                    True,
                    "install-host:_internal",
                )
            )
        flat = {
            item.path: item for item in plan.host_files if "/" not in item.path
        }
        executable = flat.pop("dh_native_host.exe")
        for name in sorted(flat):
            item = flat[name]
            rows.append(
                _MoveRow(
                    paths.staged_host / item.path,
                    self.install_root / item.path,
                    (item,),
                    False,
                    f"install-host:{item.path}",
                )
            )
        rows.append(
            _MoveRow(
                paths.staged_host / executable.path,
                self.install_root / executable.path,
                (executable,),
                False,
                "install-host:dh_native_host.exe",
            )
        )
        self._run_move_phase(tuple(rows))

    def _resume_extension_backup(
        self,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        self.hooks.before_live_phase(JournalPhase.EXTENSION_BACKED_UP, paths, plan)
        live = self.install_root / "extension"
        backup = paths.extension_backup
        if plan.extension_was_present:
            self._run_move_phase(
                (
                    _MoveRow(
                        live,
                        backup,
                        plan.prior_extension_files,
                        True,
                        "backup-extension",
                    ),
                )
            )
        elif not self._path_is_absent(live) or not self._path_is_absent(backup):
            raise UpdateStateConflict()

    def _resume_extension_install(
        self,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        self.hooks.before_live_phase(JournalPhase.EXTENSION_INSTALLED, paths, plan)
        staged_extension = paths.staged_extension
        live_extension = self.install_root / "extension"
        self._run_move_phase(
            (
                _MoveRow(
                    staged_extension,
                    live_extension,
                    plan.extension_files,
                    True,
                    "install-extension",
                ),
            )
        )

        if not plan.seed_files or journal.seed_receipt is not None:
            return
        seed = plan.seed_files[0]
        staged = paths.staged_host / seed.path
        live = self.install_root / seed.path
        seed_installed = False
        staged_state = self._classify_file(staged, seed.sha256)
        if staged_state is PathState.MISMATCH:
            raise UpdateStateConflict()
        if staged_state is PathState.EXACT and not live.exists():
            self._run_operation(
                f"install-seed:{seed.path}",
                lambda: os.replace(staged, live),
            )
            seed_installed = True
        elif staged_state is PathState.EXACT and live.exists():
            seed_installed = False
        elif staged_state is PathState.ABSENT:
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
        self.hooks.after_journal_transition(updated.phase)

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

    def _resume_metadata_install(
        self,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        self.hooks.before_live_phase(JournalPhase.METADATA_INSTALLED, paths, plan)
        # Validate both sources before replacing either live file.
        metadata = tuple(
            sorted(
                plan.metadata_files,
                key=lambda item: (item.path != "release-integrity.json", item.path),
            )
        )
        pending = []
        for item in metadata:
            source = paths.staged_host / item.path
            live = self.install_root / item.path
            source_state = self._classify_file(source, item.sha256)
            live_state = self._classify_file(live, item.sha256)
            if source_state is PathState.MISMATCH or live_state is PathState.MISMATCH:
                raise UpdateStateConflict()
            if source_state is PathState.ABSENT and live_state is PathState.ABSENT:
                raise UpdateStateConflict()
            if source_state is PathState.EXACT and live_state is PathState.ABSENT:
                pending.append(item)
        for item in pending:
            source = paths.staged_host / item.path
            live = self.install_root / item.path
            self._run_operation(
                f"install-metadata:{item.path}",
                lambda source=source, live=live: self._copy_file_replace(
                    source, live
                ),
            )
        for item in metadata:
            if sha256_file(self.install_root / item.path) != item.sha256:
                raise UpdateStateConflict()

    def _resume_probe(
        self,
        journal: UpdateJournal,
        plan: OwnershipPlan,
        paths: TransactionPaths,
    ) -> None:
        self.hooks.probe_installed_product(self.install_root, plan)
        self._verify_live_product(plan)

    def _verify_live_product(self, plan: OwnershipPlan) -> None:
        internal = tuple(
            FileDigest(item.path.removeprefix("_internal/"), item.sha256)
            for item in plan.host_files
            if item.path.startswith("_internal/")
        )
        if internal and self._classify_tree(
            self.install_root / "_internal", internal
        ) is not PathState.EXACT:
            raise UpdateStateConflict()
        for item in plan.host_files:
            if "/" in item.path:
                continue
            if self._classify_file(
                self.install_root / item.path, item.sha256
            ) is not PathState.EXACT:
                raise UpdateStateConflict()
        if self._classify_tree(
            self.install_root / "extension", plan.extension_files
        ) is not PathState.EXACT:
            raise UpdateStateConflict()
        for item in plan.metadata_files:
            if self._classify_file(
                self.install_root / item.path, item.sha256
            ) is not PathState.EXACT:
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

    def _preflight_remove_new(
        self,
        paths: TransactionPaths,
        plan: OwnershipPlan,
    ) -> tuple[_RollbackRow, ...]:
        remove, _restore = self._plan_rollback_operations(paths, plan)
        return remove

    def _preflight_restore_prior(
        self,
        paths: TransactionPaths,
        plan: OwnershipPlan,
    ) -> tuple[_RollbackRow, ...]:
        _remove, restore = self._plan_rollback_operations(paths, plan)
        return restore

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

    def _resume_rollback(
        self,
        journal: UpdateJournal,
        paths: TransactionPaths,
        plan: OwnershipPlan,
    ) -> None:
        remove = self._preflight_remove_new(paths, plan)
        restore = self._preflight_restore_prior(paths, plan)
        metadata_remove = [
            row for row in remove if row.remove_label.startswith("remove-new-metadata:")
        ]
        extension_remove = [
            row for row in remove if row.remove_label == "remove-new-extension"
        ]
        host_remove = [
            row for row in remove if row.remove_label.startswith("remove-new-host:")
        ]
        extension_restore = [
            row for row in restore if row.restore_label == "restore-extension"
        ]
        host_restore = [
            row for row in restore if row.restore_label.startswith("restore-host:")
        ]
        metadata_restore = [
            row for row in restore if row.restore_label.startswith("restore-metadata:")
        ]
        for row in (*metadata_remove, *extension_remove):
            self._move_rollback_row(row, restore=False)
        for row in extension_restore:
            self._move_rollback_row(row, restore=True)
        for row in host_remove:
            self._move_rollback_row(row, restore=False)
        for row in (*host_restore, *metadata_restore):
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
            self._resume_rollback(rolling, paths, plan)
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
        tx = parse_transaction_id(transaction_id)
        paths = self._paths(tx)
        with self._mutex_factory(self.install_root):
            active_exists = paths.active.exists()
            workspace_exists = paths.transaction_root.exists()
            if not active_exists and not workspace_exists:
                return False
            if active_exists and not workspace_exists:
                raise UpdateStateConflict()
            if active_exists:
                paths, journal, _plan = self._load_authority(tx)
            else:
                journal, _plan = self._load_transaction_authority(paths, tx)
            if journal.phase not in (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK):
                raise UpdateStateConflict()
            return self._finalize_terminal_evidence(paths, active_exists)

    def _finalize_terminal_evidence(
        self,
        paths: TransactionPaths,
        active_exists: bool,
    ) -> bool:
            try:
                if active_exists:
                    self._run_operation("active:remove", paths.active.unlink)
                self._run_operation(
                    "workspace:remove-terminal",
                    lambda: shutil.rmtree(paths.transaction_root),
                )
            except UpdateEngineError:
                raise
            except Exception as error:
                raise UpdateEngineError() from error
            return True
