import re
import tempfile
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal, Protocol
from urllib.parse import urlsplit

from install_integrity import InstallationVerification, InstallationVerifier
from native_registration import RegistryBackend, WindowsRegistryBackend
from package_archive import stage_and_validate_archive
from package_manifest import load_update_manifest
from update_engine import PreparedTransactionConflict, UpdateEngine
from update_entrypoint import resolve_active_command
from update_journal import (
    FORWARD_FAILURE_CODES,
    FORWARD_PHASES,
    JournalPhase,
    JournalReason,
    TransactionPaths,
    UpdateInitiator,
    UpdateJournal,
    parse_transaction_id,
    read_journal,
)
from update_mutex import (
    MutationMutex,
    UpdateAlreadyInProgress,
    create_windows_mutation_mutex,
)
from update_platform import (
    CtypesWin32ProcessApi,
    ProcessAdapter,
    WindowsProcessAdapter,
)
from update_operation import create_windows_operation_mutex
from update_recovery import (
    FinalizationFilesystem,
    FinalizationError,
    FinalizationReceipt,
    RecoveryController,
    RunnerSource,
    acknowledge_update_finalization,
    create_production_recovery_controller,
    finalize_update_status,
    launch_active_recovery,
    launch_complete_update,
    require_no_pending_finalization,
    select_runner_source,
)


_DOWNLOAD_TIMEOUT_SECONDS = 30.0
_MAX_DOWNLOAD_BYTES = 256 * 1024 * 1024
_DOWNLOAD_CHUNK_BYTES = 1024 * 1024
_ACTIVATION_READY_TIMEOUT_SECONDS = 30.0
_SEMVER_RE = re.compile(
    r"^(0|[1-9][0-9]*)\."
    r"(0|[1-9][0-9]*)\."
    r"(0|[1-9][0-9]*)"
    r"(?:-((?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)"
    r"(?:\.(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*))?$"
)


class ArchiveDownloadError(RuntimeError):
    def __init__(self) -> None:
        super().__init__("archive_download_failed")


class ArchiveDownloader(Protocol):
    def download(self, url: str, destination: Path) -> None: ...


class InstallationVerificationProvider(Protocol):
    def verify(self) -> InstallationVerification: ...


class TemporaryRoot(Protocol):
    def __enter__(self) -> str: ...

    def __exit__(self, exc_type, exc, traceback) -> bool | None: ...


_ERROR_MESSAGES = {
    "invalid_update_request": "The update request is invalid.",
    "installation_integrity_failed": (
        "The installed Host and Extension do not match. "
        "Run the matching full installer."
    ),
    "update_already_in_progress": "Another update is already in progress.",
    "update_prepare_failed": (
        "The update could not be prepared. Retry or run the matching full installer."
    ),
    "update_activation_failed": (
        "The prepared update could not be started. "
        "Retry or run the matching full installer."
    ),
    "update_not_terminal": "The update has not finished yet.",
    "update_cleanup_failed": (
        "The update finished but cleanup is incomplete. Retry cleanup."
    ),
    "source_update_disabled": (
        "Automatic update is disabled while the source Host is registered."
    ),
    "manual_recovery_required": (
        "Automatic recovery could not finish. Run the matching full installer."
    ),
}


class UpdateServiceError(RuntimeError):
    def __init__(
        self,
        error_code: str,
        *,
        activation_launched: bool = False,
    ) -> None:
        try:
            message = _ERROR_MESSAGES[error_code]
        except (KeyError, TypeError) as error:
            raise ValueError("unknown update service error code") from error
        self.error_code = error_code
        self.activation_launched = activation_launched
        super().__init__(message)


@dataclass(frozen=True)
class PreparedUpdate:
    transaction_id: str
    target_version: str
    prior_version: str


@dataclass(frozen=True)
class ActivatedUpdate:
    transaction_id: str


def normalize_update_version(value: object) -> str:
    if type(value) is not str or not value:
        raise ValueError("invalid_update_version")
    normalized = value[1:] if value.startswith(("v", "V")) else value
    if _SEMVER_RE.fullmatch(normalized) is None:
        raise ValueError("invalid_update_version")
    return normalized


def _require_internal_version(value: object) -> str:
    if type(value) is not str or value.startswith(("v", "V")):
        raise ValueError("invalid_update_version")
    normalized = normalize_update_version(value)
    if normalized != value:
        raise ValueError("invalid_update_version")
    return normalized


def _parsed_version(value: object) -> tuple[tuple[int, int, int], tuple[str, ...]]:
    normalized = normalize_update_version(value)
    match = _SEMVER_RE.fullmatch(normalized)
    if match is None:
        raise ValueError("invalid_update_version")
    major, minor, patch, prerelease = match.groups()
    return (
        (int(major), int(minor), int(patch)),
        tuple(prerelease.split(".")) if prerelease else (),
    )


def _compare_prerelease(left: tuple[str, ...], right: tuple[str, ...]) -> int:
    if left == right:
        return 0
    if not left:
        return 1
    if not right:
        return -1
    for left_part, right_part in zip(left, right):
        left_numeric = left_part.isdecimal()
        right_numeric = right_part.isdecimal()
        if left_numeric and right_numeric:
            left_number = int(left_part)
            right_number = int(right_part)
            if left_number != right_number:
                return -1 if left_number < right_number else 1
        elif left_numeric != right_numeric:
            return -1 if left_numeric else 1
        elif left_part != right_part:
            return -1 if left_part < right_part else 1
    return -1 if len(left) < len(right) else 1


def is_strictly_newer_version(target: object, prior: object) -> bool:
    target_core, target_pre = _parsed_version(target)
    prior_core, prior_pre = _parsed_version(prior)
    if target_core != prior_core:
        return target_core > prior_core
    return _compare_prerelease(target_pre, prior_pre) > 0


def _require_https_url(value: object, *, require_zip_path: bool = False) -> str:
    if type(value) is not str or not value:
        raise ArchiveDownloadError()
    try:
        parsed = urlsplit(value)
    except ValueError as error:
        raise ArchiveDownloadError() from error
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or bool(parsed.fragment)
        or require_zip_path and not parsed.path.lower().endswith(".zip")
    ):
        raise ArchiveDownloadError()
    return value


def _parse_content_length(value: object) -> int | None:
    if value is None:
        return None
    if type(value) is not str or not value.isascii() or not value.isdecimal():
        raise ArchiveDownloadError()
    parsed = int(value, 10)
    if parsed > _MAX_DOWNLOAD_BYTES:
        raise ArchiveDownloadError()
    return parsed


class _HttpsOnlyRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self,
        request,
        file_pointer,
        code,
        message,
        headers,
        new_url,
    ):
        _require_https_url(new_url)
        return super().redirect_request(
            request,
            file_pointer,
            code,
            message,
            headers,
            new_url,
        )


class HttpsArchiveDownloader:
    def __init__(self, *, opener=None) -> None:
        if opener is None:
            opener = urllib.request.build_opener(
                _HttpsOnlyRedirectHandler()
            ).open
        self._opener = opener

    def download(self, url: str, destination: Path) -> None:
        if not isinstance(destination, Path):
            raise ArchiveDownloadError()
        request_url = _require_https_url(url, require_zip_path=True)
        if destination.exists() or destination.is_symlink():
            raise ArchiveDownloadError()
        owned = False
        try:
            request = urllib.request.Request(
                request_url,
                headers={"User-Agent": "DynamicsHelper-Updater"},
            )
            with self._opener(
                request,
                timeout=_DOWNLOAD_TIMEOUT_SECONDS,
            ) as response:
                _require_https_url(response.geturl())
                declared_size = _parse_content_length(
                    response.headers.get("Content-Length")
                )
                received = 0
                output = destination.open("xb")
                owned = True
                with output:
                    while True:
                        chunk = response.read(_DOWNLOAD_CHUNK_BYTES)
                        if not chunk:
                            break
                        received += len(chunk)
                        if received > _MAX_DOWNLOAD_BYTES:
                            raise ArchiveDownloadError()
                        output.write(chunk)
                if declared_size is not None and received != declared_size:
                    raise ArchiveDownloadError()
        except ArchiveDownloadError:
            if owned:
                destination.unlink(missing_ok=True)
            raise
        except Exception as error:
            if owned:
                destination.unlink(missing_ok=True)
            raise ArchiveDownloadError() from error


def _default_temp_root_factory() -> tempfile.TemporaryDirectory[str]:
    return tempfile.TemporaryDirectory(prefix="dh-update-")


def _validate_prepare_request(
    url: object,
    transaction_id: object,
    target_version: object,
) -> tuple[str, str, str]:
    try:
        return (
            _require_https_url(url, require_zip_path=True),
            parse_transaction_id(transaction_id),
            _require_internal_version(target_version),
        )
    except Exception as error:
        raise UpdateServiceError("invalid_update_request") from error


def _validate_transaction_id(transaction_id: object) -> str:
    try:
        return parse_transaction_id(transaction_id)
    except Exception as error:
        raise UpdateServiceError("invalid_update_request") from error


def _load_prepared_browser_journal(
    install_root: Path,
    transaction_id: str,
) -> UpdateJournal:
    command = resolve_active_command(install_root)
    if command.transaction_id != transaction_id:
        raise ValueError("prepared update authority mismatch")
    journal = read_journal(command.journal_path)
    if (
        journal.transaction_id != transaction_id
        or journal.phase is not JournalPhase.PREPARED
        or journal.initiator is not UpdateInitiator.BROWSER
        or journal.initiating_process is not None
    ):
        raise ValueError("prepared update authority mismatch")
    return journal


class UpdateService:
    def __init__(
        self,
        install_root: Path,
        *,
        downloader: ArchiveDownloader | None = None,
        verifier: InstallationVerificationProvider | None = None,
        engine: UpdateEngine | None = None,
        controller: RecoveryController | None = None,
        process: ProcessAdapter | None = None,
        registry: RegistryBackend | None = None,
        temp_root_factory: Callable[[], TemporaryRoot] = _default_temp_root_factory,
        engine_factory: Callable[[Path], UpdateEngine] | None = None,
        mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
        operation_mutex_factory: Callable[
            [Path], MutationMutex
        ] = create_windows_operation_mutex,
        finalization_filesystem: FinalizationFilesystem | None = None,
    ) -> None:
        if not isinstance(install_root, Path) or not install_root.is_absolute():
            raise UpdateServiceError("invalid_update_request")
        try:
            root = install_root.resolve(strict=True)
        except (AttributeError, OSError) as error:
            raise UpdateServiceError("invalid_update_request") from error
        if root != install_root or not root.is_dir():
            raise UpdateServiceError("invalid_update_request")
        self.install_root = root
        self.downloader = downloader or HttpsArchiveDownloader()
        self.verifier = verifier
        self.mutex_factory = mutex_factory
        self.operation_mutex_factory = operation_mutex_factory
        self.engine = engine or UpdateEngine(
            root,
            mutex_factory=self.mutex_factory,
        )
        self.controller = controller or create_production_recovery_controller(root)
        self.process = process or WindowsProcessAdapter(CtypesWin32ProcessApi())
        self.registry = registry or WindowsRegistryBackend()
        self.temp_root_factory = temp_root_factory
        self.engine_factory = engine_factory or (
            lambda path: UpdateEngine(
                path,
                mutex_factory=self.mutex_factory,
            )
        )
        self.finalization_filesystem = finalization_filesystem

    @contextmanager
    def _operation_scope(self, failure_code: str):
        body_error = None
        try:
            with self.operation_mutex_factory(self.install_root):
                try:
                    yield
                except BaseException as error:
                    body_error = error
                    raise
        except UpdateAlreadyInProgress as error:
            raise UpdateServiceError("update_already_in_progress") from error
        except UpdateServiceError:
            raise
        except Exception as error:
            launched = bool(
                failure_code == "update_activation_failed"
                and isinstance(body_error, UpdateServiceError)
                and body_error.activation_launched
            )
            raise UpdateServiceError(
                failure_code,
                activation_launched=launched,
            ) from error

    def _verified_prior_version(self) -> str:
        try:
            verifier = self.verifier or InstallationVerifier(
                self.install_root,
                frozen=True,
            )
            verification = verifier.verify()
            mode = verification.mode
            integrity = verification.integrity
            host_version = verification.host_version
            extension_version = verification.extension_version
        except Exception as error:
            raise UpdateServiceError("installation_integrity_failed") from error
        if mode == "development":
            raise UpdateServiceError("source_update_disabled")
        if (
            mode != "packaged"
            or integrity != "verified"
            or type(host_version) is not str
            or type(extension_version) is not str
            or host_version != extension_version
        ):
            raise UpdateServiceError("installation_integrity_failed")
        try:
            return _require_internal_version(host_version)
        except ValueError as error:
            raise UpdateServiceError("installation_integrity_failed") from error

    def _require_prepare_barrier(self) -> None:
        try:
            require_no_pending_finalization(
                self.install_root,
                filesystem=self.finalization_filesystem,
                mutex_factory=self.mutex_factory,
            )
        except UpdateAlreadyInProgress as error:
            raise UpdateServiceError("update_already_in_progress") from error
        except FinalizationError as error:
            if error.error_code == "finalization_ack_pending":
                raise UpdateServiceError("update_cleanup_failed") from error
            raise UpdateServiceError("update_prepare_failed") from error
        except Exception as error:
            raise UpdateServiceError("update_prepare_failed") from error

    def prepare(
        self,
        url: str,
        transaction_id: str,
        target_version: str,
    ) -> PreparedUpdate:
        request_url, tx, target = _validate_prepare_request(
            url,
            transaction_id,
            target_version,
        )
        with self._operation_scope("update_prepare_failed"):
            self._require_prepare_barrier()

            prior = self._verified_prior_version()
            try:
                if not is_strictly_newer_version(target, prior):
                    raise UpdateServiceError("invalid_update_request")
            except ValueError as error:
                raise UpdateServiceError("installation_integrity_failed") from error

            try:
                with self.temp_root_factory() as temporary_name:
                    temporary = Path(temporary_name).resolve(strict=True)
                    archive = temporary / "update.zip"
                    staged = temporary / "staged"
                    self.downloader.download(request_url, archive)
                    package = stage_and_validate_archive(
                        archive,
                        staged,
                        expected_version=target,
                    )
                    rechecked_prior = self._verified_prior_version()
                    if rechecked_prior != prior:
                        raise UpdateServiceError("invalid_update_request")
                    self._require_prepare_barrier()
                    journal = self.engine.create_prepared(
                        package,
                        tx,
                        expected_version=target,
                        prior_version=prior,
                        initiator=UpdateInitiator.BROWSER,
                    )
                    paths = TransactionPaths.for_install(
                        self.install_root,
                        journal.transaction_id,
                    )
                    if load_update_manifest(paths.probe_manifest) != package.manifest:
                        raise UpdateServiceError("update_prepare_failed")
                    runner_source = select_runner_source(
                        RunnerSource.CURRENT,
                        self.install_root,
                        paths.staged_host,
                    )
                    self.controller.prepare_recovery_runtime(
                        journal.transaction_id,
                        runner_source,
                        self.registry,
                    )
            except UpdateServiceError:
                raise
            except UpdateAlreadyInProgress as error:
                raise UpdateServiceError("update_already_in_progress") from error
            except FinalizationError as error:
                if error.error_code == "finalization_ack_pending":
                    raise UpdateServiceError("update_cleanup_failed") from error
                raise UpdateServiceError("update_prepare_failed") from error
            except PreparedTransactionConflict as error:
                raise UpdateServiceError("update_already_in_progress") from error
            except Exception as error:
                raise UpdateServiceError("update_prepare_failed") from error

            if (
                journal.phase is not JournalPhase.PREPARED
                or journal.transaction_id != tx
                or journal.target_version != target
                or journal.prior_version != prior
            ):
                raise UpdateServiceError("update_prepare_failed")
            return PreparedUpdate(tx, target, prior)

    def activate(self, transaction_id: str) -> ActivatedUpdate:
        tx = _validate_transaction_id(transaction_id)
        launched = False
        try:
            with self._operation_scope("update_activation_failed"):
                try:
                    _load_prepared_browser_journal(self.install_root, tx)
                    paths = TransactionPaths.for_install(self.install_root, tx)
                    identity = self.process.capture_current_identity(
                        self.install_root / "dh_native_host.exe"
                    )
                    recovery = self.install_root / "updates" / "recovery"
                    launch_complete_update(self.process, recovery, paths, identity)
                    launched = True
                    self.controller.wait_until_ready(
                        tx,
                        identity,
                        timeout_seconds=_ACTIVATION_READY_TIMEOUT_SECONDS,
                    )
                except BaseException as error:
                    raise UpdateServiceError(
                        "update_activation_failed",
                        activation_launched=(
                            launched
                            or getattr(error, "process_launched", False)
                        ),
                    ) from error
        except UpdateServiceError as error:
            if launched and not error.activation_launched:
                raise UpdateServiceError(
                    "update_activation_failed",
                    activation_launched=True,
                ) from error
            raise
        return ActivatedUpdate(tx)

    def finalize(self, transaction_id: str) -> FinalizationReceipt:
        tx = _validate_transaction_id(transaction_id)
        with self._operation_scope("update_cleanup_failed"):
            try:
                return finalize_update_status(
                    self.install_root,
                    tx,
                    self.registry,
                    self.engine_factory,
                    filesystem=self.finalization_filesystem,
                    mutex_factory=self.mutex_factory,
                )
            except FinalizationError as error:
                if error.error_code == "transaction_not_terminal":
                    code = "update_not_terminal"
                elif error.error_code in {
                    "finalization_ack_pending",
                    "finalization_not_current",
                }:
                    code = "update_cleanup_failed"
                else:
                    code = "update_cleanup_failed"
                raise UpdateServiceError(code) from error
            except Exception as error:
                raise UpdateServiceError("update_cleanup_failed") from error

    def acknowledge(self, transaction_id: str) -> bool:
        tx = _validate_transaction_id(transaction_id)
        with self._operation_scope("update_cleanup_failed"):
            try:
                acknowledged = acknowledge_update_finalization(
                    self.install_root,
                    tx,
                    filesystem=self.finalization_filesystem,
                    mutex_factory=self.mutex_factory,
                )
            except FinalizationError as error:
                code = "update_cleanup_failed"
                raise UpdateServiceError(code) from error
            except Exception as error:
                raise UpdateServiceError("update_cleanup_failed") from error
            if acknowledged is not True:
                raise UpdateServiceError("update_cleanup_failed")
            return True


def _create_process_adapter() -> ProcessAdapter:
    return WindowsProcessAdapter(CtypesWin32ProcessApi())


def _load_active_journal(install_root: Path) -> UpdateJournal:
    command = resolve_active_command(install_root)
    journal = read_journal(command.journal_path)
    if journal.transaction_id != command.transaction_id:
        raise ValueError("active update authority mismatch")
    return journal


def launch_startup_recovery_if_needed(
    install_root: Path,
) -> Literal["continue", "recovery-launched", "manual-recovery"]:
    try:
        if not isinstance(install_root, Path) or not install_root.is_absolute():
            return "manual-recovery"
        root = install_root.resolve(strict=True)
        if root != install_root:
            return "manual-recovery"
        active_path = root / "updates" / "active.json"
        if not active_path.exists() and not active_path.is_symlink():
            return "continue"
        journal = _load_active_journal(root)
    except Exception:
        return "manual-recovery"

    if journal.phase in (
        JournalPhase.PREPARED,
        JournalPhase.COMMITTED,
        JournalPhase.ROLLED_BACK,
    ):
        return "continue"
    should_launch = journal.phase in FORWARD_PHASES or journal.phase is JournalPhase.ROLLING_BACK
    if journal.phase is JournalPhase.RECOVERY_REQUIRED:
        should_launch = (
            journal.reason_code is JournalReason.ROLLBACK_FAILED
            and journal.original_failure_code in FORWARD_FAILURE_CODES
        )
    if not should_launch:
        return "manual-recovery"
    try:
        process = _create_process_adapter()
        launch_active_recovery(process, root)
    except Exception:
        return "manual-recovery"
    return "recovery-launched"


def settle_installer_repair(
    install_root: Path,
    *,
    verifier: InstallationVerificationProvider | None = None,
    operation_mutex_factory: Callable[
        [Path], MutationMutex
    ] = create_windows_operation_mutex,
    mutation_mutex_factory: Callable[
        [Path], MutationMutex
    ] = create_windows_mutation_mutex,
    engine_factory: Callable[[Path], UpdateEngine] | None = None,
) -> bool:
    try:
        root = install_root.resolve(strict=True)
        verification = (verifier or InstallationVerifier(root, frozen=True)).verify()
        if (
            verification.integrity != "verified"
            or not verification.host_version
            or verification.host_version != verification.extension_version
        ):
            return False
        operation = operation_mutex_factory(root)
        with operation:
            active_path = root / "updates" / "active.json"
            if not active_path.exists() and not active_path.is_symlink():
                return True
            journal = _load_active_journal(root)
            engine = (engine_factory or (
                lambda path: UpdateEngine(
                    path,
                    mutex_factory=mutation_mutex_factory,
                )
            ))(root)
            settled = engine.settle_installer_repair(
                journal.transaction_id,
                verification.host_version,
            )
            if settled.transaction_id != journal.transaction_id:
                return False
            return True
    except UpdateAlreadyInProgress:
        raise
    except BaseException:
        return False
