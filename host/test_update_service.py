import tempfile
import unittest
import inspect
import os
import shutil
import threading
from dataclasses import FrozenInstanceError, fields
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from install_integrity import InstallationVerification
from package_archive import write_deterministic_archive
from package_manifest import (
    canonical_json_bytes,
    generate_release_documents,
    write_release_documents,
)
from test_update_recovery import TerminalFixture
from test_update_support import FakeMutationMutex
from update_engine import UpdateEngine
from update_journal import (
    FORWARD_PHASES,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    TerminalVersion,
    UpdateInitiator,
)
from update_mutex import UpdateAlreadyInProgress
from update_recovery import (
    FINALIZATION_CURSOR_STATES,
    FinalizationCursor,
    FinalizationError,
    FinalizationReceipt,
    OSFinalizationFilesystem,
    load_finalization_ack,
    load_finalization_cursor,
    load_finalization_receipt,
    receipt_from_terminal_journal,
    require_no_pending_finalization,
)
from update_service import (
    ActivatedUpdate,
    ArchiveDownloadError,
    HttpsArchiveDownloader,
    PreparedUpdate,
    UpdateService,
    UpdateServiceError,
    _ERROR_MESSAGES,
    _DOWNLOAD_TIMEOUT_SECONDS,
    _HttpsOnlyRedirectHandler,
    _MAX_DOWNLOAD_BYTES,
    is_strictly_newer_version,
    launch_startup_recovery_if_needed,
    normalize_update_version,
)


class FakeDownloadResponse:
    def __init__(
        self,
        chunks: list[bytes],
        *,
        final_url: str = "https://example.invalid/update.zip",
        content_length: str | None = None,
    ) -> None:
        self._chunks = iter(chunks)
        self._final_url = final_url
        self.headers = {}
        if content_length is not None:
            self.headers["Content-Length"] = content_length
        self.read_count = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def geturl(self) -> str:
        return self._final_url

    def read(self, _size: int) -> bytes:
        self.read_count += 1
        return next(self._chunks, b"")


class UpdateVersionTests(unittest.TestCase):
    def test_normalizes_exactly_one_optional_tag_prefix(self):
        for value in ("2.0.76-beta.1", "v2.0.76-beta.1", "V2.0.76-beta.1"):
            with self.subTest(value=value):
                self.assertEqual(
                    normalize_update_version(value),
                    "2.0.76-beta.1",
                )

    def test_rejects_noncanonical_semver(self):
        invalid = (
            "",
            " 2.0.76",
            "2.0.76 ",
            "vv2.0.76",
            "1.2",
            "1.2.3.4",
            "01.2.3",
            "1.02.3",
            "1.2.03",
            "1.2.3-",
            "1.2.3-beta..1",
            "1.2.3-beta.01",
            "1.2.3+build",
            7,
            True,
            None,
        )
        for value in invalid:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    normalize_update_version(value)

    def test_strict_semver_precedence_requires_newer_target(self):
        cases = (
            ("2.0.76", "2.0.75", True),
            ("2.0.76-beta.1", "2.0.75", True),
            ("2.0.76", "2.0.76-beta.2", True),
            ("2.0.76-beta.2", "2.0.76-beta.1", True),
            ("2.0.76-beta.1", "2.0.76-beta", True),
            ("2.0.76-beta", "2.0.76-beta.1", False),
            ("2.0.76", "2.0.76", False),
            ("2.0.75", "2.0.76", False),
        )
        for target, prior, expected in cases:
            with self.subTest(target=target, prior=prior):
                self.assertEqual(
                    is_strictly_newer_version(target, prior),
                    expected,
                )


class HttpsArchiveDownloaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.destination = self.root / "update.zip"

    def test_fixed_network_limits(self):
        self.assertEqual(_DOWNLOAD_TIMEOUT_SECONDS, 30.0)
        self.assertEqual(_MAX_DOWNLOAD_BYTES, 256 * 1024 * 1024)

    def test_rejects_non_https_url_before_open(self):
        opener = MagicMock()
        downloader = HttpsArchiveDownloader(opener=opener)

        for url in (
            "http://example.invalid/update.zip",
            "file:///update.zip",
            "//example.invalid/update.zip",
            "https:///update.zip",
            7,
        ):
            with self.subTest(url=url):
                with self.assertRaises(ArchiveDownloadError):
                    downloader.download(url, self.destination)
                self.assertFalse(self.destination.exists())
        opener.assert_not_called()

    def test_preexisting_destination_is_never_deleted(self):
        self.destination.write_bytes(b"keep")
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(return_value=FakeDownloadResponse([b"replace"])),
        )

        with self.assertRaises(ArchiveDownloadError):
            downloader.download(
                "https://example.invalid/update.zip",
                self.destination,
            )

        self.assertEqual(self.destination.read_bytes(), b"keep")

    def test_passes_fixed_timeout_and_accepts_https_redirect(self):
        response = FakeDownloadResponse(
            [b"abc"],
            final_url="https://cdn.example.invalid/release.zip",
            content_length="3",
        )
        opener = MagicMock(return_value=response)

        HttpsArchiveDownloader(opener=opener).download(
            "https://example.invalid/update.zip",
            self.destination,
        )

        request = opener.call_args.args[0]
        self.assertEqual(request.full_url, "https://example.invalid/update.zip")
        self.assertEqual(
            opener.call_args.kwargs,
            {"timeout": _DOWNLOAD_TIMEOUT_SECONDS},
        )
        self.assertEqual(self.destination.read_bytes(), b"abc")

    def test_rejects_https_to_http_redirect_and_cleans_destination(self):
        response = FakeDownloadResponse(
            [b"secret"],
            final_url="http://example.invalid/update.zip?token=secret",
            content_length="6",
        )
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(return_value=response),
        )

        with self.assertRaises(ArchiveDownloadError):
            downloader.download(
                "https://example.invalid/update.zip",
                self.destination,
            )

        self.assertFalse(self.destination.exists())
        self.assertEqual(response.read_count, 0)

    def test_redirect_handler_rejects_each_non_https_hop(self):
        handler = _HttpsOnlyRedirectHandler()
        request = __import__("urllib.request").request.Request(
            "https://example.invalid/update.zip"
        )

        with self.assertRaises(ArchiveDownloadError):
            handler.redirect_request(
                request,
                None,
                302,
                "Found",
                {},
                "http://intermediate.invalid/update.zip?secret=hidden",
            )

    def test_default_downloader_installs_https_only_redirect_handler(self):
        opener = MagicMock()
        with patch(
            "update_service.urllib.request.build_opener",
            return_value=opener,
        ) as build:
            downloader = HttpsArchiveDownloader()

        self.assertIs(downloader._opener, opener.open)
        self.assertEqual(len(build.call_args.args), 1)
        self.assertIsInstance(build.call_args.args[0], _HttpsOnlyRedirectHandler)

    def test_rejects_declared_size_one_over_before_read(self):
        response = FakeDownloadResponse(
            [b"must-not-read"],
            content_length=str(_MAX_DOWNLOAD_BYTES + 1),
        )
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(return_value=response),
        )

        with self.assertRaises(ArchiveDownloadError):
            downloader.download(
                "https://example.invalid/update.zip",
                self.destination,
            )

        self.assertFalse(self.destination.exists())
        self.assertEqual(response.read_count, 0)

    def test_rejects_actual_size_one_over_and_removes_partial_file(self):
        response = FakeDownloadResponse([b"abcd", b"e"])
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(return_value=response),
        )

        with patch("update_service._MAX_DOWNLOAD_BYTES", 4):
            with self.assertRaises(ArchiveDownloadError):
                downloader.download(
                    "https://example.invalid/update.zip",
                    self.destination,
                )

        self.assertFalse(self.destination.exists())

    def test_declared_and_actual_size_exact_boundary_passes(self):
        response = FakeDownloadResponse(
            [b"abcd"],
            content_length="4",
        )
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(return_value=response),
        )

        with patch("update_service._MAX_DOWNLOAD_BYTES", 4):
            downloader.download(
                "https://example.invalid/update.zip",
                self.destination,
            )

        self.assertEqual(self.destination.read_bytes(), b"abcd")

    def test_timeout_failure_leaves_no_destination(self):
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(side_effect=TimeoutError("SECRET TIMEOUT URL")),
        )

        with self.assertRaises(ArchiveDownloadError) as captured:
            downloader.download(
                "https://example.invalid/update.zip",
                self.destination,
            )

        self.assertEqual(str(captured.exception), "archive_download_failed")
        self.assertFalse(self.destination.exists())

    def test_rejects_declared_actual_length_disagreement_and_cleans(self):
        downloader = HttpsArchiveDownloader(
            opener=MagicMock(return_value=FakeDownloadResponse(
                [b"abc"],
                content_length="4",
            )),
        )

        with self.assertRaises(ArchiveDownloadError):
            downloader.download(
                "https://example.invalid/update.zip",
                self.destination,
            )

        self.assertFalse(self.destination.exists())


class RecordingDownloader:
    def __init__(self, events: list[str]) -> None:
        self.events = events
        self.calls: list[tuple[str, Path]] = []

    def download(self, url: str, destination: Path) -> None:
        self.events.append("download")
        self.calls.append((url, destination))
        destination.write_bytes(b"archive")


class RecordingEngine:
    def __init__(self, events: list[str]) -> None:
        self.events = events
        self.calls = []

    def create_prepared(self, package, transaction_id, **kwargs):
        self.events.append("engine")
        self.calls.append((package, transaction_id, kwargs))
        return SimpleNamespace(
            transaction_id=transaction_id,
            target_version=kwargs["expected_version"],
            prior_version=kwargs["prior_version"],
            phase=JournalPhase.PREPARED,
            initiator=UpdateInitiator.BROWSER,
            initiating_process=None,
        )


class RecordingController:
    def __init__(self, events: list[str], install_root: Path) -> None:
        self.events = events
        self.install_root = install_root
        self.prepare_calls = []
        self.wait_calls = []

    def prepare_recovery_runtime(self, transaction_id, source, registry):
        self.events.append("recovery")
        self.prepare_calls.append((transaction_id, source, registry))
        return self.install_root / "updates" / "recovery"

    def wait_until_ready(self, transaction_id, identity, timeout_seconds):
        self.events.append("ready")
        self.wait_calls.append((transaction_id, identity, timeout_seconds))
        return SimpleNamespace(phase=JournalPhase.WAITING_FOR_HOST_EXIT)


class UpdateServiceFixture(unittest.TestCase):
    TX = "0123456789abcdef0123456789abcdef"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.install = self.root / "install"
        self.install.mkdir()
        self.scratch = self.root / "scratch"
        self.scratch.mkdir()
        self.events: list[str] = []
        self.created_temp_roots: list[Path] = []
        self.downloader = RecordingDownloader(self.events)
        self.engine = RecordingEngine(self.events)
        self.controller = RecordingController(self.events, self.install)
        self.process = MagicMock()
        self.registry = object()
        self.verifier = MagicMock()
        self.verifier.verify.side_effect = self._verify

    def _verify(self):
        self.events.append("verify")
        return InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version="2.0.75-beta.1",
            extension_version="2.0.75-beta.1",
        )

    def _temp_root_factory(self):
        temporary = tempfile.TemporaryDirectory(dir=self.scratch)
        self.created_temp_roots.append(Path(temporary.name))
        return temporary

    def service(self) -> UpdateService:
        return UpdateService(
            self.install,
            downloader=self.downloader,
            verifier=self.verifier,
            engine=self.engine,
            controller=self.controller,
            process=self.process,
            registry=self.registry,
            temp_root_factory=self._temp_root_factory,
        )


class UpdateServicePreparationTests(UpdateServiceFixture):
    def test_default_engines_share_the_injected_mutex_factory(self):
        mutex_factory = MagicMock()
        service = UpdateService(
            self.install,
            downloader=self.downloader,
            verifier=self.verifier,
            controller=self.controller,
            process=self.process,
            registry=self.registry,
            mutex_factory=mutex_factory,
        )

        self.assertIs(service.engine._mutex_factory, mutex_factory)
        self.assertIs(
            service.engine_factory(self.install)._mutex_factory,
            mutex_factory,
        )

    def test_constructor_rejects_existing_relative_install_root(self):
        relative = Path(os.path.relpath(self.install, Path.cwd()))
        self.assertTrue(relative.exists())

        with self.assertRaises(UpdateServiceError) as captured:
            UpdateService(relative)

        self.assertEqual(
            captured.exception.error_code,
            "invalid_update_request",
        )

    def test_public_interface_signatures_are_exact(self):
        self.assertEqual(
            tuple(inspect.signature(UpdateService.prepare).parameters),
            ("self", "url", "transaction_id", "target_version"),
        )
        self.assertEqual(
            tuple(inspect.signature(UpdateService.activate).parameters),
            ("self", "transaction_id"),
        )
        self.assertEqual(
            tuple(inspect.signature(UpdateService.finalize).parameters),
            ("self", "transaction_id"),
        )
        self.assertEqual(
            tuple(inspect.signature(UpdateService.acknowledge).parameters),
            ("self", "transaction_id"),
        )
        self.assertEqual(
            tuple(inspect.signature(launch_startup_recovery_if_needed).parameters),
            ("install_root",),
        )

    def test_service_error_table_is_closed_and_fixed(self):
        expected = {
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
            "finalization_ack_pending": (
                "A previous update is awaiting cleanup. Retry cleanup."
            ),
            "finalization_not_current": (
                "This update finalization is no longer current."
            ),
        }
        self.assertEqual(_ERROR_MESSAGES, expected)
        for code, message in expected.items():
            with self.subTest(code=code):
                error = UpdateServiceError(code)
                self.assertEqual(error.error_code, code)
                self.assertEqual(str(error), message)
        with self.assertRaises(ValueError):
            UpdateServiceError("future_unreviewed_error")

    def test_public_result_models_are_frozen_and_exact(self):
        self.assertEqual(
            tuple(field.name for field in fields(PreparedUpdate)),
            ("transaction_id", "target_version", "prior_version"),
        )
        self.assertEqual(
            tuple(field.name for field in fields(ActivatedUpdate)),
            ("transaction_id",),
        )
        self.assertEqual(
            tuple(field.name for field in fields(FinalizationReceipt)),
            ("transaction_id", "outcome", "terminal_version", "state"),
        )
        self.assertEqual(
            tuple(field.name for field in fields(FinalizationCursor)),
            ("transaction_id", "outcome", "terminal_version", "state"),
        )
        self.assertEqual(
            FINALIZATION_CURSOR_STATES,
            frozenset({"reserved", "receipt-ready"}),
        )
        barrier_signature = inspect.signature(require_no_pending_finalization)
        self.assertEqual(
            tuple(barrier_signature.parameters),
            ("install_root", "filesystem", "mutex_factory"),
        )
        self.assertEqual(
            barrier_signature.parameters["filesystem"].kind,
            inspect.Parameter.KEYWORD_ONLY,
        )
        self.assertEqual(
            barrier_signature.parameters["mutex_factory"].kind,
            inspect.Parameter.KEYWORD_ONLY,
        )
        prepared = PreparedUpdate(self.TX, "2.0.76", "2.0.75")
        activated = ActivatedUpdate(self.TX)
        with self.assertRaises(FrozenInstanceError):
            prepared.target_version = "9.9.9"
        with self.assertRaises(FrozenInstanceError):
            activated.transaction_id = "f" * 32

    def test_prepare_composes_plan_a_b_c_in_order_and_cleans_temp(self):
        manifest = object()
        package = SimpleNamespace(manifest=manifest)
        sentinel = self.install / "sentinel.txt"
        sentinel.write_bytes(b"unchanged")

        def barrier(install_root, **kwargs):
            self.assertEqual(install_root, self.install)
            self.assertEqual(
                kwargs,
                {
                    "filesystem": None,
                    "mutex_factory": service.mutex_factory,
                },
            )
            self.events.append("barrier")

        def stage(archive, destination, *, expected_version):
            self.events.append("stage")
            self.assertEqual(archive.read_bytes(), b"archive")
            self.assertEqual(expected_version, "2.0.76-beta.1")
            self.assertEqual(destination.parent, archive.parent)
            return package

        def load_manifest(path):
            self.events.append("manifest")
            self.assertEqual(
                path,
                self.install / "updates" / "transactions" / self.TX
                / "probe" / "update-manifest.json",
            )
            return manifest

        def select_source(kind, current, staged):
            self.events.append("source")
            self.assertEqual(kind.value, "current")
            self.assertEqual(current, self.install)
            self.assertEqual(
                staged,
                self.install / "updates" / "transactions" / self.TX
                / "staged" / "host",
            )
            return current

        service = self.service()
        with (
            patch("update_service.require_no_pending_finalization", side_effect=barrier),
            patch("update_service.stage_and_validate_archive", side_effect=stage),
            patch("update_service.load_update_manifest", side_effect=load_manifest),
            patch("update_service.select_runner_source", side_effect=select_source),
        ):
            result = service.prepare(
                "https://example.invalid/update.zip",
                self.TX,
                "2.0.76-beta.1",
            )

        self.assertEqual(
            result,
            PreparedUpdate(self.TX, "2.0.76-beta.1", "2.0.75-beta.1"),
        )
        self.assertEqual(
            self.events,
            [
                "barrier",
                "verify",
                "download",
                "stage",
                "verify",
                "barrier",
                "engine",
                "manifest",
                "source",
                "recovery",
            ],
        )
        package_arg, tx_arg, kwargs = self.engine.calls[0]
        self.assertIs(package_arg, package)
        self.assertEqual(tx_arg, self.TX)
        self.assertEqual(kwargs, {
            "expected_version": "2.0.76-beta.1",
            "prior_version": "2.0.75-beta.1",
            "initiator": UpdateInitiator.BROWSER,
        })
        self.assertEqual(
            self.controller.prepare_calls,
            [(self.TX, self.install, self.registry)],
        )
        self.assertEqual(sentinel.read_bytes(), b"unchanged")
        self.assertTrue(self.created_temp_roots)
        self.assertTrue(all(not path.exists() for path in self.created_temp_roots))

    def test_prepare_rechecks_current_version_after_download(self):
        before = InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version="2.0.75",
            extension_version="2.0.75",
        )
        changed = InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version="2.0.76",
            extension_version="2.0.76",
        )
        self.verifier.verify.side_effect = [before, changed]
        package = SimpleNamespace(manifest=object())

        with (
            patch("update_service.require_no_pending_finalization"),
            patch("update_service.stage_and_validate_archive", return_value=package),
        ):
            with self.assertRaises(UpdateServiceError) as captured:
                self.service().prepare(
                    "https://example.invalid/update.zip",
                    self.TX,
                    "2.0.76",
                )

        self.assertEqual(captured.exception.error_code, "invalid_update_request")
        self.assertEqual(self.verifier.verify.call_count, 2)
        self.assertEqual(self.engine.calls, [])
        self.assertEqual(self.controller.prepare_calls, [])
        self.assertTrue(all(not path.exists() for path in self.created_temp_roots))

    def test_same_id_retry_reuses_authority_and_redownloads_owned_candidate(self):
        manifest = object()
        package = SimpleNamespace(manifest=manifest)
        with (
            patch("update_service.require_no_pending_finalization"),
            patch("update_service.stage_and_validate_archive", return_value=package),
            patch("update_service.load_update_manifest", return_value=manifest),
            patch(
                "update_service.select_runner_source",
                return_value=self.install,
            ),
        ):
            service = self.service()
            first = service.prepare(
                "https://example.invalid/update.zip",
                self.TX,
                "2.0.76",
            )
            second = service.prepare(
                "https://example.invalid/update.zip",
                self.TX,
                "2.0.76",
            )

        self.assertEqual(first, second)
        self.assertEqual(len(self.downloader.calls), 2)
        self.assertEqual(len(self.engine.calls), 2)
        self.assertEqual(len(self.controller.prepare_calls), 2)
        self.assertTrue(all(not path.exists() for path in self.created_temp_roots))

    def test_invalid_request_is_rejected_before_barrier_or_network(self):
        invalid_cases = (
            ("http://example.invalid/update.zip", self.TX, "2.0.76"),
            ("https://example.invalid/update.zip", "A" * 32, "2.0.76"),
            ("https://example.invalid/update.zip", self.TX, "vv2.0.76"),
            ("https://example.invalid/update.zip", self.TX, "v2.0.76"),
            ("https://example.invalid/update.zip", self.TX, "V2.0.76"),
        )
        barrier = MagicMock()
        for url, transaction_id, target in invalid_cases:
            self.downloader.calls.clear()
            with self.subTest(url=url, transaction_id=transaction_id, target=target):
                with patch(
                    "update_service.require_no_pending_finalization",
                    barrier,
                ):
                    with self.assertRaises(UpdateServiceError) as captured:
                        self.service().prepare(url, transaction_id, target)
                self.assertEqual(
                    captured.exception.error_code,
                    "invalid_update_request",
                )
                self.assertEqual(self.downloader.calls, [])
        barrier.assert_not_called()

    def test_integrity_and_newer_recheck_block_before_download(self):
        cases = (
            (
                InstallationVerification(
                    mode="development",
                    integrity="development",
                    host_version="2.0.75",
                ),
                "2.0.76",
                "source_update_disabled",
            ),
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="failed",
                    error_code="installation_integrity_failed",
                ),
                "2.0.76",
                "installation_integrity_failed",
            ),
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="verified",
                    host_version="2.0.75",
                    extension_version="2.0.74",
                ),
                "2.0.76",
                "installation_integrity_failed",
            ),
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="verified",
                    host_version="2.0.75",
                    extension_version="2.0.75",
                ),
                "2.0.75",
                "invalid_update_request",
            ),
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="verified",
                    host_version="2.0.75",
                    extension_version="2.0.75",
                ),
                "2.0.74",
                "invalid_update_request",
            ),
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="verified",
                    host_version="v2.0.75",
                    extension_version="v2.0.75",
                ),
                "2.0.76",
                "installation_integrity_failed",
            ),
        )
        for verification, target, expected_code in cases:
            self.downloader.calls.clear()
            self.verifier.verify.side_effect = None
            self.verifier.verify.return_value = verification
            with self.subTest(verification=verification, target=target):
                with patch("update_service.require_no_pending_finalization"):
                    with self.assertRaises(UpdateServiceError) as captured:
                        self.service().prepare(
                            "https://example.invalid/update.zip",
                            self.TX,
                            target,
                        )
                self.assertEqual(captured.exception.error_code, expected_code)
                self.assertEqual(self.downloader.calls, [])

    def test_pending_finalization_precedes_network(self):
        from update_recovery import FinalizationError

        with patch(
            "update_service.require_no_pending_finalization",
            side_effect=FinalizationError("finalization_ack_pending"),
        ):
            with self.assertRaises(UpdateServiceError) as captured:
                self.service().prepare(
                    "https://example.invalid/update.zip",
                    self.TX,
                    "2.0.76",
                )

        self.assertEqual(
            captured.exception.error_code,
            "finalization_ack_pending",
        )
        self.assertEqual(self.downloader.calls, [])

    def test_first_barrier_mutex_contention_is_safely_mapped(self):
        with patch(
            "update_service.require_no_pending_finalization",
            side_effect=UpdateAlreadyInProgress(),
        ):
            with self.assertRaises(UpdateServiceError) as captured:
                self.service().prepare(
                    "https://example.invalid/update.zip",
                    self.TX,
                    "2.0.76",
                )

        self.assertEqual(
            captured.exception.error_code,
            "update_already_in_progress",
        )
        self.assertEqual(self.downloader.calls, [])

    def test_malformed_verification_is_safely_mapped(self):
        self.verifier.verify.side_effect = None
        self.verifier.verify.return_value = object()

        with patch("update_service.require_no_pending_finalization"):
            with self.assertRaises(UpdateServiceError) as captured:
                self.service().prepare(
                    "https://example.invalid/update.zip",
                    self.TX,
                    "2.0.76",
                )

        self.assertEqual(
            captured.exception.error_code,
            "installation_integrity_failed",
        )
        self.assertEqual(self.downloader.calls, [])

    def test_prepare_failure_uses_fixed_safe_error(self):
        marker = "SECRET URL https://example.invalid/update.zip?sig=secret"
        self.downloader.download = MagicMock(side_effect=RuntimeError(marker))

        with patch("update_service.require_no_pending_finalization"):
            with self.assertRaises(UpdateServiceError) as captured:
                self.service().prepare(
                    "https://example.invalid/update.zip",
                    self.TX,
                    "2.0.76",
                )

        self.assertEqual(captured.exception.error_code, "update_prepare_failed")
        self.assertNotIn(marker, str(captured.exception))
        self.assertEqual(
            str(captured.exception),
            "The update could not be prepared. Retry or run the matching full installer.",
        )
        self.assertTrue(all(not path.exists() for path in self.created_temp_roots))

    def test_prepare_serializes_finalize_between_barrier_and_create(self):
        package = SimpleNamespace(manifest=object())
        second_barrier_entered = threading.Event()
        release_prepare = threading.Event()
        finalization_entered = threading.Event()
        failures: list[BaseException] = []
        barrier_calls = 0
        receipt = FinalizationReceipt(
            self.TX,
            "committed",
            TerminalVersion("2.0.76", False),
        )

        def barrier(_install_root, **_kwargs):
            nonlocal barrier_calls
            barrier_calls += 1
            if barrier_calls == 2:
                second_barrier_entered.set()
                if not release_prepare.wait(2):
                    raise RuntimeError("test prepare release timed out")

        def finalize(*_args, **_kwargs):
            finalization_entered.set()
            return receipt

        service = self.service()

        def run_prepare():
            try:
                service.prepare(
                    "https://example.invalid/update.zip",
                    self.TX,
                    "2.0.76",
                )
            except BaseException as error:
                failures.append(error)

        def run_finalize():
            try:
                service.finalize(self.TX)
            except BaseException as error:
                failures.append(error)

        with (
            patch("update_service.require_no_pending_finalization", side_effect=barrier),
            patch("update_service.stage_and_validate_archive", return_value=package),
            patch(
                "update_service.load_update_manifest",
                return_value=package.manifest,
            ),
            patch(
                "update_service.select_runner_source",
                return_value=self.install,
            ),
            patch("update_service.finalize_update_status", side_effect=finalize),
        ):
            prepare_thread = threading.Thread(target=run_prepare)
            finalize_thread = threading.Thread(target=run_finalize)
            prepare_thread.start()
            self.assertTrue(second_barrier_entered.wait(2))
            finalize_thread.start()
            self.assertFalse(finalization_entered.wait(0.05))
            release_prepare.set()
            prepare_thread.join(2)
            finalize_thread.join(2)

        self.assertFalse(prepare_thread.is_alive())
        self.assertFalse(finalize_thread.is_alive())
        self.assertEqual(failures, [])
        self.assertTrue(finalization_entered.is_set())


class UpdateServiceActivationTests(UpdateServiceFixture):
    def test_prepared_loader_uses_validated_plan_c_command(self):
        command = SimpleNamespace(
            transaction_id=self.TX,
            journal_path=self.install / "updates" / "transactions" / self.TX
            / "journal.json",
        )
        journal = SimpleNamespace(
            transaction_id=self.TX,
            phase=JournalPhase.PREPARED,
            initiator=UpdateInitiator.BROWSER,
            initiating_process=None,
        )
        with (
            patch("update_service.resolve_active_command", return_value=command) as resolve,
            patch("update_service.read_journal", return_value=journal) as read,
        ):
            from update_service import _load_prepared_browser_journal

            self.assertIs(
                _load_prepared_browser_journal(self.install, self.TX),
                journal,
            )
        resolve.assert_called_once_with(self.install)
        read.assert_called_once_with(command.journal_path)

    def test_activate_captures_identity_launches_and_waits_for_ready(self):
        identity = InitiatingProcessIdentity(123, "win-create-time-456")
        self.process.capture_current_identity.return_value = identity
        self.process.launch_detached.return_value = InitiatingProcessIdentity(
            789,
            "win-create-time-999",
        )
        journal = SimpleNamespace(
            transaction_id=self.TX,
            phase=JournalPhase.PREPARED,
            initiator=UpdateInitiator.BROWSER,
            initiating_process=None,
        )

        with (
            patch(
                "update_service._load_prepared_browser_journal",
                return_value=journal,
            ),
            patch("update_service.launch_complete_update") as launch,
        ):
            result = self.service().activate(self.TX)

        self.assertEqual(result, ActivatedUpdate(self.TX))
        self.process.capture_current_identity.assert_called_once_with(
            self.install / "dh_native_host.exe"
        )
        launch.assert_called_once_with(
            self.process,
            self.install / "updates" / "recovery",
            unittest.mock.ANY,
            identity,
        )
        paths = launch.call_args.args[2]
        self.assertEqual(paths.transaction_root, self.install / "updates" / "transactions" / self.TX)
        self.assertEqual(
            self.controller.wait_calls,
            [(self.TX, identity, 30.0)],
        )

    def test_activate_rejects_invalid_or_nonprepared_authority_safely(self):
        marker = "SECRET PREPARED PATH C:/private"
        cases = (
            ("A" * 32, ValueError(marker), "invalid_update_request"),
            (self.TX, RuntimeError(marker), "update_activation_failed"),
        )
        for transaction_id, failure, expected_code in cases:
            self.process.reset_mock()
            with self.subTest(transaction_id=transaction_id):
                with patch(
                    "update_service._load_prepared_browser_journal",
                    side_effect=failure,
                ):
                    with self.assertRaises(UpdateServiceError) as captured:
                        self.service().activate(transaction_id)
                self.assertEqual(captured.exception.error_code, expected_code)
                self.assertNotIn(marker, str(captured.exception))
                self.process.capture_current_identity.assert_not_called()


class RealPreparationIntegrationTests(unittest.TestCase):
    TX = "fedcba9876543210fedcba9876543210"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.install = self.root / "install"
        self.install.mkdir()
        self.prior = "2.0.75-beta.1"
        self.target = "2.0.76-beta.1"
        self.current_stage = self._make_stage(
            self.root / "current",
            self.prior,
            b"old-host",
        )
        self.target_stage = self._make_stage(
            self.root / "target",
            self.target,
            b"new-host",
        )
        shutil.copytree(
            self.current_stage / "host",
            self.install,
            dirs_exist_ok=True,
        )
        shutil.copytree(
            self.current_stage / "extension",
            self.install / "extension",
        )
        self.archive = self.root / "target.zip"
        write_deterministic_archive(self.target_stage, self.archive)
        self.mutex = FakeMutationMutex()
        self.engine = UpdateEngine(
            self.install,
            mutex_factory=lambda _root: self.mutex,
        )
        self.controller = RecordingController([], self.install)
        self.registry = object()

    @staticmethod
    def _make_stage(root: Path, version: str, host_bytes: bytes) -> Path:
        chrome_version = version.split("-", 1)[0]
        files = {
            "host/dh_native_host.exe": host_bytes,
            "host/_internal/python313.dll": b"runtime-" + host_bytes,
            "host/system_prompt.md": b"core-" + host_bytes,
            "host/register.py": b"register",
            "host/config.json": b"{}\n",
            "extension/manifest.json": (
                '{"version":"' + chrome_version + '","version_name":"'
                + version + '"}\n'
            ).encode("utf-8"),
            "extension/assets/app.js": b"app-" + host_bytes,
            "installer_core.ps1": b"installer",
            "install.bat": b"wrapper",
        }
        for relative, payload in files.items():
            path = root.joinpath(*relative.split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        with patch("package_manifest.VERSION", version):
            documents = generate_release_documents(root, version)
        write_release_documents(root, documents)
        return root

    def test_real_archive_and_engine_prepare_without_live_mutation(self):
        verifier = MagicMock()
        verifier.verify.return_value = InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version=self.prior,
            extension_version=self.prior,
        )
        downloader = MagicMock()
        downloader.download.side_effect = lambda _url, destination: shutil.copy2(
            self.archive,
            destination,
        )
        sentinel_before = (self.install / "dh_native_host.exe").read_bytes()
        extension_before = (
            self.install / "extension" / "assets" / "app.js"
        ).read_bytes()

        with patch("update_service.require_no_pending_finalization"):
            result = UpdateService(
                self.install,
                downloader=downloader,
                verifier=verifier,
                engine=self.engine,
                controller=self.controller,
                process=MagicMock(),
                registry=self.registry,
            ).prepare(
                "https://example.invalid/target.zip",
                self.TX,
                self.target,
            )

        self.assertEqual(
            result,
            PreparedUpdate(self.TX, self.target, self.prior),
        )
        paths = self.install / "updates" / "transactions" / self.TX
        self.assertTrue((paths / "journal.json").is_file())
        self.assertTrue((paths / "ownership.json").is_file())
        self.assertTrue((paths / "probe" / "update-manifest.json").is_file())
        self.assertEqual(
            self.controller.prepare_calls,
            [(self.TX, self.install, self.registry)],
        )
        self.assertEqual(
            (self.install / "dh_native_host.exe").read_bytes(),
            sentinel_before,
        )
        self.assertEqual(
            (self.install / "extension" / "assets" / "app.js").read_bytes(),
            extension_before,
        )

    def test_real_prepare_wins_before_same_id_finalization(self):
        verifier = MagicMock()
        verifier.verify.return_value = InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version=self.prior,
            extension_version=self.prior,
        )
        downloader = MagicMock()
        downloader.download.side_effect = lambda _url, destination: shutil.copy2(
            self.archive,
            destination,
        )
        second_barrier_entered = threading.Event()
        release_prepare = threading.Event()
        barrier_calls = 0
        prepare_results: list[object] = []
        finalize_results: list[object] = []

        def barrier(*args, **kwargs):
            nonlocal barrier_calls
            barrier_calls += 1
            if barrier_calls == 2:
                second_barrier_entered.set()
                if not release_prepare.wait(2):
                    raise AssertionError("prepare release timed out")
            return __import__("update_recovery").require_no_pending_finalization(
                *args,
                **kwargs,
            )

        service = UpdateService(
            self.install,
            downloader=downloader,
            verifier=verifier,
            engine=self.engine,
            controller=self.controller,
            process=MagicMock(),
            registry=self.registry,
            engine_factory=lambda root: UpdateEngine(
                root,
                mutex_factory=lambda _root: self.mutex,
            ),
            mutex_factory=lambda _root: self.mutex,
        )

        def run_prepare():
            try:
                prepare_results.append(service.prepare(
                    "https://example.invalid/target.zip",
                    self.TX,
                    self.target,
                ))
            except BaseException as error:
                prepare_results.append(error)

        def run_finalize():
            try:
                finalize_results.append(service.finalize(self.TX))
            except BaseException as error:
                finalize_results.append(error)

        with patch(
            "update_service.require_no_pending_finalization",
            side_effect=barrier,
        ):
            prepare_thread = threading.Thread(target=run_prepare)
            finalize_thread = threading.Thread(target=run_finalize)
            prepare_thread.start()
            self.assertTrue(second_barrier_entered.wait(2))
            finalize_thread.start()
            self.assertTrue(finalize_thread.is_alive())
            release_prepare.set()
            prepare_thread.join(3)
            finalize_thread.join(3)

        self.assertFalse(prepare_thread.is_alive())
        self.assertFalse(finalize_thread.is_alive())
        self.assertEqual(
            prepare_results,
            [PreparedUpdate(self.TX, self.target, self.prior)],
        )
        self.assertEqual(len(finalize_results), 1)
        self.assertIsInstance(finalize_results[0], UpdateServiceError)
        self.assertEqual(
            finalize_results[0].error_code,
            "update_not_terminal",
        )
        transaction = self.install / "updates" / "transactions" / self.TX
        self.assertTrue((transaction / "journal.json").is_file())
        self.assertTrue((self.install / "updates" / "active.json").is_file())
        self.assertFalse(
            (self.install / "updates" / "finalization-cursor.json").exists()
        )
        self.assertFalse(
            (self.install / "updates" / "receipts" / f"{self.TX}.json").exists()
        )


class UpdateServiceFinalizationTests(UpdateServiceFixture):
    def test_finalize_and_acknowledge_delegate_exactly_once(self):
        receipt = FinalizationReceipt(
            self.TX,
            "committed",
            TerminalVersion("2.0.76", False),
        )
        with (
            patch("update_service.finalize_update_status", return_value=receipt) as finalize,
            patch("update_service.acknowledge_update_finalization", return_value=True) as acknowledge,
        ):
            service = self.service()
            self.assertEqual(service.finalize(self.TX), receipt)
            self.assertTrue(service.acknowledge(self.TX))

        finalize.assert_called_once_with(
            self.install,
            self.TX,
            self.registry,
            service.engine_factory,
            filesystem=None,
            mutex_factory=service.mutex_factory,
        )
        acknowledge.assert_called_once_with(
            self.install,
            self.TX,
            filesystem=None,
            mutex_factory=service.mutex_factory,
        )

    def test_finalization_error_mapping_is_exhaustive_and_safe(self):
        cleanup_codes = {
            "active_transaction_mismatch",
            "invalid_finalization_receipt",
            "invalid_finalization_cursor",
            "invalid_finalization_acknowledgment",
            "finalization_cleanup_failed",
            "finalization_cleanup_incomplete",
            "finalization_record_round_trip_failed",
        }
        expected = {
            "transaction_not_terminal": "update_not_terminal",
            "finalization_ack_pending": "finalization_ack_pending",
            "finalization_not_current": "finalization_not_current",
            **{code: "update_cleanup_failed" for code in cleanup_codes},
        }
        self.assertEqual(set(FinalizationError._ALLOWED), set(expected))

        for source_code, service_code in expected.items():
            with self.subTest(source_code=source_code):
                with patch(
                    "update_service.finalize_update_status",
                    side_effect=FinalizationError(source_code),
                ):
                    with self.assertRaises(UpdateServiceError) as captured:
                        self.service().finalize(self.TX)
                self.assertEqual(captured.exception.error_code, service_code)
                self.assertNotIn(source_code, str(captured.exception))

    def test_acknowledgment_error_mapping_and_false_result(self):
        cases = (
            (FinalizationError("finalization_not_current"), "finalization_not_current"),
            (FinalizationError("finalization_ack_pending"), "finalization_ack_pending"),
            (FinalizationError("finalization_cleanup_incomplete"), "update_cleanup_failed"),
            (RuntimeError("SECRET ACK PATH"), "update_cleanup_failed"),
        )
        for failure, expected_code in cases:
            with self.subTest(failure=failure):
                with patch(
                    "update_service.acknowledge_update_finalization",
                    side_effect=failure,
                ):
                    with self.assertRaises(UpdateServiceError) as captured:
                        self.service().acknowledge(self.TX)
                self.assertEqual(captured.exception.error_code, expected_code)
                self.assertNotIn("SECRET ACK PATH", str(captured.exception))

        with patch(
            "update_service.acknowledge_update_finalization",
            return_value=False,
        ):
            with self.assertRaises(UpdateServiceError) as captured:
                self.service().acknowledge(self.TX)
        self.assertEqual(captured.exception.error_code, "update_cleanup_failed")

    def test_invalid_ids_are_rejected_before_plan_c_calls(self):
        with (
            patch("update_service.finalize_update_status") as finalize,
            patch("update_service.acknowledge_update_finalization") as acknowledge,
        ):
            for action in (self.service().finalize, self.service().acknowledge):
                with self.subTest(action=action.__name__):
                    with self.assertRaises(UpdateServiceError) as captured:
                        action("A" * 32)
                    self.assertEqual(
                        captured.exception.error_code,
                        "invalid_update_request",
                    )
        finalize.assert_not_called()
        acknowledge.assert_not_called()


class StatefulUpdateServiceFinalizationTests(unittest.TestCase):
    TX = "0123456789abcdef0123456789abcdef"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.fixture_index = 0

    def make_terminal(self, *, rolled_back: bool = False):
        self.fixture_index += 1
        return TerminalFixture(
            self.root / f"terminal-{self.fixture_index}",
            fresh_install=False,
            rolled_back=rolled_back,
        )

    @staticmethod
    def service(fixture, *, filesystem=None, downloader=None):
        return UpdateService(
            fixture.install,
            downloader=downloader or MagicMock(),
            verifier=MagicMock(),
            engine=fixture.engine,
            controller=MagicMock(),
            process=MagicMock(),
            registry=fixture.registry,
            engine_factory=fixture.engine_factory,
            mutex_factory=fixture.mutex_factory,
            finalization_filesystem=(
                filesystem
                if filesystem is not None
                else OSFinalizationFilesystem()
            ),
        )

    def test_reserved_cursor_replays_to_receipt_ready_through_service(self):
        fixture = self.make_terminal()
        expected = receipt_from_terminal_journal(fixture.terminal)
        filesystem = OSFinalizationFilesystem()
        filesystem.atomic_write(
            fixture.cursor_path,
            FinalizationCursor(
                self.TX,
                expected.outcome,
                expected.terminal_version,
                "reserved",
            ).to_dict(),
        )

        actual = self.service(
            fixture,
            filesystem=filesystem,
        ).finalize(self.TX)

        self.assertEqual(actual, expected)
        self.assertEqual(
            load_finalization_cursor(fixture.cursor_path, filesystem).state,
            "receipt-ready",
        )
        self.assertEqual(
            load_finalization_receipt(
                fixture.receipt_path,
                self.TX,
                filesystem,
            ),
            expected,
        )
        self.assertFalse(fixture.paths.active.exists())
        self.assertFalse(fixture.paths.transaction_root.exists())

    def test_receipt_replay_ack_and_matching_ack_without_receipt(self):
        fixture = self.make_terminal()
        filesystem = OSFinalizationFilesystem()
        service = self.service(fixture, filesystem=filesystem)

        first = service.finalize(self.TX)
        receipt_bytes = fixture.receipt_path.read_bytes()
        self.assertEqual(service.finalize(self.TX), first)
        self.assertEqual(fixture.receipt_path.read_bytes(), receipt_bytes)

        filesystem.move_receipt_to_ack(
            fixture.receipt_path,
            fixture.ack_path,
        )
        self.assertEqual(service.finalize(self.TX), first)
        self.assertTrue(service.acknowledge(self.TX))
        self.assertFalse(fixture.cursor_path.exists())
        self.assertFalse(fixture.receipt_path.exists())
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, filesystem),
            first,
        )
        self.assertTrue(service.acknowledge(self.TX))

    def test_wrong_id_is_blocked_while_cursor_is_pending(self):
        fixture = self.make_terminal()
        service = self.service(fixture)
        service.finalize(self.TX)

        other = "f" * 32
        with self.assertRaises(UpdateServiceError) as captured:
            service.finalize(other)

        self.assertEqual(
            captured.exception.error_code,
            "finalization_ack_pending",
        )
        self.assertFalse(
            (fixture.paths.updates_root / "receipts" / f"{other}.json").exists()
        )

    def test_later_ack_replaces_slot_and_expires_delayed_old_id(self):
        fixture = self.make_terminal()
        filesystem = OSFinalizationFilesystem()
        service = self.service(fixture, filesystem=filesystem)
        old_receipt = service.finalize(self.TX)
        self.assertTrue(service.acknowledge(self.TX))
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, filesystem),
            old_receipt,
        )

        newer = "f" * 32
        fixture.create_next_terminal(newer)
        newer_receipt = service.finalize(newer)
        self.assertTrue(service.acknowledge(self.TX))
        self.assertTrue(service.acknowledge(newer))
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, filesystem),
            newer_receipt,
        )
        with self.assertRaises(UpdateServiceError) as captured:
            service.acknowledge(self.TX)
        self.assertEqual(
            captured.exception.error_code,
            "finalization_not_current",
        )

    def test_rolled_back_receipt_is_preserved_through_service(self):
        fixture = self.make_terminal(rolled_back=True)

        receipt = self.service(fixture).finalize(self.TX)

        self.assertEqual(receipt.outcome, "rolled-back")
        self.assertEqual(receipt.terminal_version.version, fixture.terminal.prior_version)

    def test_ack_only_does_not_block_or_trigger_acknowledgment_on_prepare(self):
        fixture = self.make_terminal()
        finalization_service = self.service(fixture)
        finalization_service.finalize(self.TX)
        self.assertTrue(finalization_service.acknowledge(self.TX))
        ack_before = fixture.ack_path.read_bytes()
        downloader = RecordingDownloader([])
        engine = RecordingEngine([])
        controller = RecordingController([], fixture.install)
        verifier = MagicMock()
        verifier.verify.return_value = InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version="2.0.74",
            extension_version="2.0.74",
        )
        package = SimpleNamespace(manifest=object())
        newer = "f" * 32

        with (
            patch("update_service.stage_and_validate_archive", return_value=package),
            patch(
                "update_service.load_update_manifest",
                return_value=package.manifest,
            ),
            patch(
                "update_service.select_runner_source",
                return_value=fixture.install,
            ),
            patch("update_service.acknowledge_update_finalization") as acknowledge,
        ):
            result = UpdateService(
                fixture.install,
                downloader=downloader,
                verifier=verifier,
                engine=engine,
                controller=controller,
                process=MagicMock(),
                registry=fixture.registry,
                mutex_factory=fixture.mutex_factory,
                finalization_filesystem=OSFinalizationFilesystem(),
            ).prepare(
                "https://example.invalid/new.zip",
                newer,
                "2.0.75",
            )

        self.assertEqual(result, PreparedUpdate(newer, "2.0.75", "2.0.74"))
        self.assertEqual(fixture.ack_path.read_bytes(), ack_before)
        acknowledge.assert_not_called()
        self.assertEqual(len(downloader.calls), 1)

    def test_matching_ack_plus_cursor_scratch_blocks_prepare_before_network(self):
        fixture = self.make_terminal()
        filesystem = OSFinalizationFilesystem()
        service = self.service(fixture, filesystem=filesystem)
        receipt = service.finalize(self.TX)
        filesystem.move_receipt_to_ack(fixture.receipt_path, fixture.ack_path)
        fixture.cursor_path.unlink()
        scratch = fixture.cursor_path.with_name(
            f".{fixture.cursor_path.name}.tmp"
        )
        expected_cursor = canonical_json_bytes(
            FinalizationCursor(
                self.TX,
                receipt.outcome,
                receipt.terminal_version,
                "receipt-ready",
            ).to_dict()
        )
        scratch.write_bytes(expected_cursor[: len(expected_cursor) // 2])
        ack_before = fixture.ack_path.read_bytes()
        scratch_before = scratch.read_bytes()
        downloader = MagicMock()

        with patch("update_service.acknowledge_update_finalization") as acknowledge:
            with self.assertRaises(UpdateServiceError) as captured:
                UpdateService(
                    fixture.install,
                    downloader=downloader,
                    verifier=MagicMock(),
                    engine=MagicMock(),
                    controller=MagicMock(),
                    process=MagicMock(),
                    registry=fixture.registry,
                    mutex_factory=fixture.mutex_factory,
                    finalization_filesystem=filesystem,
                ).prepare(
                    "https://example.invalid/new.zip",
                    "f" * 32,
                    "2.0.75",
                )

        self.assertEqual(
            captured.exception.error_code,
            "finalization_ack_pending",
        )
        downloader.download.assert_not_called()
        acknowledge.assert_not_called()
        self.assertEqual(fixture.ack_path.read_bytes(), ack_before)
        self.assertEqual(scratch.read_bytes(), scratch_before)

    def test_finalization_wins_and_blocks_new_prepare_before_network(self):
        fixture = self.make_terminal()
        paused = threading.Event()
        release = threading.Event()

        class BlockingFilesystem(OSFinalizationFilesystem):
            def atomic_write(self, path, value):
                super().atomic_write(path, value)
                if (
                    path.name == "finalization-cursor.json"
                    and value.get("state") == "receipt-ready"
                ):
                    paused.set()
                    if not release.wait(2):
                        raise AssertionError("finalization release timed out")

        downloader = MagicMock()
        service = self.service(
            fixture,
            filesystem=BlockingFilesystem(),
            downloader=downloader,
        )
        finalize_results: list[object] = []
        prepare_errors: list[BaseException] = []

        def run_finalize():
            try:
                finalize_results.append(service.finalize(self.TX))
            except BaseException as error:
                finalize_results.append(error)

        def run_prepare():
            try:
                service.prepare(
                    "https://example.invalid/new.zip",
                    "f" * 32,
                    "2.0.75",
                )
            except BaseException as error:
                prepare_errors.append(error)

        finalize_thread = threading.Thread(target=run_finalize)
        prepare_thread = threading.Thread(target=run_prepare)
        finalize_thread.start()
        self.assertTrue(paused.wait(2))
        prepare_thread.start()
        self.assertFalse(downloader.download.called)
        self.assertTrue(prepare_thread.is_alive())
        release.set()
        finalize_thread.join(2)
        prepare_thread.join(2)

        self.assertFalse(finalize_thread.is_alive())
        self.assertFalse(prepare_thread.is_alive())
        self.assertEqual(len(finalize_results), 1)
        self.assertIsInstance(finalize_results[0], FinalizationReceipt)
        self.assertEqual(len(prepare_errors), 1)
        self.assertIsInstance(prepare_errors[0], UpdateServiceError)
        self.assertEqual(
            prepare_errors[0].error_code,
            "finalization_ack_pending",
        )
        downloader.download.assert_not_called()
        self.assertFalse(
            (
                fixture.paths.transactions_root
                / ("f" * 32)
            ).exists()
        )


class StartupRecoveryTests(unittest.TestCase):
    TX = "0123456789abcdef0123456789abcdef"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.install = Path(self.temp.name).resolve()
        (self.install / "updates").mkdir()
        (self.install / "updates" / "active.json").write_text(
            "placeholder",
            encoding="utf-8",
        )
        self.process = MagicMock()

    def journal(self, phase, *, reason=None, original=None):
        return SimpleNamespace(
            transaction_id=self.TX,
            phase=phase,
            reason_code=reason,
            original_failure_code=original,
        )

    def test_no_active_continues_without_constructing_process(self):
        (self.install / "updates" / "active.json").unlink()
        with patch("update_service._create_process_adapter") as process_factory:
            result = launch_startup_recovery_if_needed(self.install)
        self.assertEqual(result, "continue")
        process_factory.assert_not_called()

    def test_relative_install_root_requires_manual_recovery(self):
        (self.install / "updates" / "active.json").unlink()
        relative = Path(os.path.relpath(self.install, Path.cwd()))
        self.assertTrue(relative.exists())
        with patch("update_service._create_process_adapter") as process_factory:
            result = launch_startup_recovery_if_needed(relative)
        self.assertEqual(result, "manual-recovery")
        process_factory.assert_not_called()

    def test_prepared_and_terminal_continue_without_launch(self):
        cases = (
            self.journal(JournalPhase.PREPARED),
            self.journal(JournalPhase.COMMITTED),
            self.journal(JournalPhase.ROLLED_BACK),
        )
        for authority in cases:
            self.process.reset_mock()
            with self.subTest(authority=authority):
                patcher = patch("update_service._load_active_journal")
                with patcher as load, patch(
                    "update_service._create_process_adapter",
                    return_value=self.process,
                ):
                    if isinstance(authority, BaseException):
                        load.side_effect = authority
                    else:
                        load.return_value = authority
                    result = launch_startup_recovery_if_needed(self.install)
                self.assertEqual(result, "continue")
                self.process.launch_detached.assert_not_called()

    def test_forward_and_retryable_rollback_launch_recovery(self):
        retryable = self.journal(
            JournalPhase.RECOVERY_REQUIRED,
            reason=JournalReason.ROLLBACK_FAILED,
            original=JournalReason.HOST_INSTALL_FAILED,
        )
        for journal in (
            *(self.journal(phase) for phase in FORWARD_PHASES),
            self.journal(JournalPhase.ROLLING_BACK),
            retryable,
        ):
            self.process.reset_mock()
            with (
                patch("update_service._load_active_journal", return_value=journal),
                patch(
                    "update_service._create_process_adapter",
                    return_value=self.process,
                ),
                patch("update_service.launch_active_recovery") as launch,
            ):
                result = launch_startup_recovery_if_needed(self.install)
            self.assertEqual(result, "recovery-launched")
            launch.assert_called_once_with(self.process, self.install)

    def test_manual_or_malformed_authority_requires_manual_recovery(self):
        cases = (
            FileNotFoundError(),
            RuntimeError("SECRET JOURNAL PATH"),
            self.journal(
                JournalPhase.RECOVERY_REQUIRED,
                reason=JournalReason.MANUAL_RECOVERY_REQUIRED,
            ),
            self.journal(
                JournalPhase.RECOVERY_REQUIRED,
                reason=JournalReason.ROLLBACK_FAILED,
                original=None,
            ),
        )
        for authority in cases:
            self.process.reset_mock()
            with self.subTest(authority=authority):
                with patch("update_service._load_active_journal") as load, patch(
                    "update_service._create_process_adapter",
                    return_value=self.process,
                ):
                    if isinstance(authority, BaseException):
                        load.side_effect = authority
                    else:
                        load.return_value = authority
                    result = launch_startup_recovery_if_needed(self.install)
                self.assertEqual(result, "manual-recovery")
                self.process.launch_detached.assert_not_called()

    def test_active_loader_uses_validated_plan_c_command(self):
        command = SimpleNamespace(
            transaction_id=self.TX,
            journal_path=self.install / "updates" / "transactions" / self.TX
            / "journal.json",
        )
        journal = self.journal(JournalPhase.PREPARED)
        with (
            patch("update_service.resolve_active_command", return_value=command) as resolve,
            patch("update_service.read_journal", return_value=journal) as read,
        ):
            from update_service import _load_active_journal

            self.assertIs(_load_active_journal(self.install), journal)
        resolve.assert_called_once_with(self.install)
        read.assert_called_once_with(command.journal_path)


if __name__ == "__main__":
    unittest.main()
