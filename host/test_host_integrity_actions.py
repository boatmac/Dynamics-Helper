import asyncio
from pathlib import Path
import tempfile
import typing
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from host.dh_native_host import NativeHost
from install_integrity import InstallationVerification
from product_info import VERSION


class HostIntegrityActionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.host = NativeHost.__new__(NativeHost)
        self.host.current_request_id = None
        self.host.loop = None
        self.host.client = object()
        self.host.running = True
        self.host.send_progress = MagicMock()
        self.host.send_message = MagicMock()
        self.host._installation_verifier = MagicMock()
        self.host._source_runtime = False

    async def test_get_capabilities_exact_envelope(self):
        await self.host.process_message(
            {"action": "get_capabilities", "requestId": "cap-1"}
        )
        self.host.send_message.assert_called_once_with(
            {
                "requestId": "cap-1",
                "status": "success",
                "data": {
                    "host_version": VERSION,
                    "capabilities": [
                        "prompt-scope-v1",
                        "transactional-update-v1",
                    ],
                },
            }
        )

    async def test_verify_installation_exact_shapes(self):
        cases = (
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="verified",
                    host_version="2.0.74-beta.4",
                    extension_version="2.0.74-beta.4",
                ),
                {
                    "mode": "packaged",
                    "integrity": "verified",
                    "host_version": "2.0.74-beta.4",
                    "extension_version": "2.0.74-beta.4",
                },
            ),
            (
                InstallationVerification(
                    mode="packaged",
                    integrity="failed",
                    error_code="installation_integrity_failed",
                ),
                {
                    "mode": "packaged",
                    "integrity": "failed",
                    "error_code": "installation_integrity_failed",
                },
            ),
            (
                InstallationVerification(
                    mode="development",
                    integrity="development",
                    host_version="2.0.74-beta.4",
                ),
                {
                    "mode": "development",
                    "integrity": "development",
                    "host_version": "2.0.74-beta.4",
                },
            ),
        )
        for verification, expected in cases:
            self.host.send_message.reset_mock()
            self.host._installation_verifier.verify.return_value = verification
            await self.host.process_message(
                {"action": "verify_installation", "requestId": "verify-1"}
            )
            with self.subTest(verification=verification):
                self.assertEqual(
                    self.host.send_message.call_args.args[0]["data"],
                    expected,
                )

    async def test_verifier_exception_returns_fixed_failure(self):
        secret = "SECRET-INTEGRITY-MARKER"
        self.host._installation_verifier.verify.side_effect = RuntimeError(secret)
        await self.host.process_message(
            {"action": "verify_installation", "requestId": "verify-2"}
        )
        response = self.host.send_message.call_args.args[0]
        self.assertEqual(
            response["data"],
            {
                "mode": "packaged",
                "integrity": "failed",
                "error_code": "installation_integrity_failed",
            },
        )
        self.assertNotIn(secret, repr(response))

    async def test_plan_a_does_not_gate_analyze(self):
        self.host.handle_analyze_error = AsyncMock(
            return_value={"status": "success", "data": {"markdown": "ok"}}
        )
        await self.host.process_message(
            {"action": "analyze_error", "requestId": "a", "payload": {}}
        )
        self.host.handle_analyze_error.assert_awaited_once_with({})

    async def test_legacy_url_only_update_is_rejected_without_updater(self):
        self.host._source_runtime = False
        self.host._installation_ready = False
        self.host._update_service = None
        with patch("updater.Updater") as updater:
            await self.host.process_message(
                {
                    "action": "perform_update",
                    "requestId": "u",
                    "payload": {"url": "https://example.invalid/release.zip"},
                }
            )
        updater.assert_not_called()
        self.assertEqual(
            self.host.send_message.call_args.args[0]["error_code"],
            "installation_integrity_failed",
        )

    async def test_mixed_install_update_check_emits_guidance_before_network(self):
        self.host._installation_ready = False
        self.host.last_update_check = 0
        with patch("host.dh_native_host.urllib.request.urlopen") as open_url:
            await self.host.check_for_updates(force=True)

        open_url.assert_not_called()
        self.host.send_message.assert_called_once_with(
            {
                "action": "update_error",
                "payload": {
                    "error": (
                        "The installed Host and Extension do not match. "
                        "Run the matching full installer."
                    )
                },
            }
        )

    def test_source_startup_never_runs_production_legacy_cleanup(self):
        with (
            patch("host.dh_native_host._source_runtime", True),
            patch(
                "host.dh_native_host.InstallationVerifier.verify",
                return_value=InstallationVerification(
                    mode="development",
                    integrity="development",
                    host_version="2.0.74-beta.4",
                ),
            ),
            patch("updater.Updater.cleanup_old_version") as cleanup,
        ):
            host = NativeHost()

        self.assertTrue(host._source_runtime)
        cleanup.assert_not_called()

    def test_integrity_serializer_annotation_resolves(self):
        hints = typing.get_type_hints(
            NativeHost._serialize_installation_verification
        )
        self.assertIs(hints["verification"], InstallationVerification)
        self.assertEqual(hints["return"], dict[str, str])

    def test_verified_constructor_preserves_extension_trees(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            install = root / "DynamicsHelper"
            installed = install / "extension"
            sibling = root / "extension"
            nested = installed / "extension"
            for tree, label in (
                (installed, "installed"),
                (sibling, "sibling"),
                (nested, "nested"),
            ):
                (tree / "assets").mkdir(parents=True)
                (tree / "empty").mkdir()
                (tree / "manifest.json").write_bytes(
                    ('{"name":"' + label + '"}').encode("ascii")
                )
                (tree / "assets" / "content.js").write_bytes(label.encode("ascii"))
            before = {
                path.relative_to(root): path.read_bytes() if path.is_file() else None
                for path in root.rglob("*")
            }
            executable = str(install / "dh_native_host.exe")
            with (
                patch("host.dh_native_host._source_runtime", False),
                patch("host.dh_native_host.sys.frozen", True, create=True),
                patch("host.dh_native_host.sys.executable", executable),
                patch("host.dh_native_host.InstallationVerifier") as verifier,
                patch("host.dh_native_host.UpdateService") as update_service,
                patch("updater.Updater.cleanup_old_version") as cleanup,
                patch("host.dh_native_host.CopilotClient") as client,
            ):
                verifier.return_value.verify.return_value = InstallationVerification(
                    mode="packaged",
                    integrity="verified",
                    host_version=VERSION,
                    extension_version=VERSION,
                )
                host = NativeHost()

            self.assertTrue(host._installation_ready)
            verifier.assert_called_once_with(install)
            verifier.return_value.verify.assert_called_once_with()
            update_service.assert_called_once_with(install)
            cleanup.assert_called_once_with(executable)
            client.assert_not_called()
            after = {
                path.relative_to(root): path.read_bytes() if path.is_file() else None
                for path in root.rglob("*")
            }
            self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
