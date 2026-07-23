import os
import shutil
import tempfile
from dataclasses import dataclass
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
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
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
            paths, journal, _plan = self._load_authority(tx)
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
            self.hooks.after_journal_transition(waiting.phase)
            if process_identity is not None:
                self.hooks.wait_for_initiating_host_exit(process_identity)
            return waiting

    def resume(self, transaction_id: str) -> UpdateJournal:
        tx = parse_transaction_id(transaction_id)
        with self._mutex_factory(self.install_root):
            paths, journal, plan = self._load_authority(tx)
            if journal.phase is JournalPhase.PREPARED:
                return journal
            if journal.phase is JournalPhase.WAITING_FOR_HOST_EXIT:
                if journal.initiating_process is not None:
                    self.hooks.wait_for_initiating_host_exit(
                        journal.initiating_process
                    )
                self._backup_host(paths, plan)
                journal = transition(journal, JournalPhase.HOST_BACKED_UP)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            if journal.phase is JournalPhase.HOST_BACKED_UP:
                self._install_host(paths, plan)
                journal = transition(journal, JournalPhase.HOST_INSTALLED)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            if journal.phase is JournalPhase.HOST_INSTALLED:
                self._backup_extension(paths, plan)
                journal = transition(journal, JournalPhase.EXTENSION_BACKED_UP)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            if journal.phase is JournalPhase.EXTENSION_BACKED_UP:
                self._install_extension_and_seed(paths, journal, plan)
                journal = read_journal(paths.journal)
                journal = transition(journal, JournalPhase.EXTENSION_INSTALLED)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            if journal.phase is JournalPhase.EXTENSION_INSTALLED:
                self._install_metadata(paths, plan)
                journal = transition(journal, JournalPhase.METADATA_INSTALLED)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            if journal.phase is JournalPhase.METADATA_INSTALLED:
                journal = transition(journal, JournalPhase.PROBING)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            if journal.phase is JournalPhase.PROBING:
                self.hooks.probe_installed_product(self.install_root, plan)
                journal = transition(journal, JournalPhase.COMMITTED)
                write_journal_atomic(paths.journal, journal)
                self.hooks.after_journal_transition(journal.phase)
            return journal

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

    def rollback(self, transaction_id: str, failure_code: JournalReason):
        raise UpdateEngineError()

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
