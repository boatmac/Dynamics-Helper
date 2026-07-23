import asyncio
import typing
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from host.dh_native_host import NativeHost
from install_integrity import InstallationVerification


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

    async def test_get_capabilities_exact_envelope(self):
        await self.host.process_message(
            {"action": "get_capabilities", "requestId": "cap-1"}
        )
        self.host.send_message.assert_called_once_with(
            {
                "requestId": "cap-1",
                "status": "success",
                "data": {
                    "host_version": "2.0.74-beta.4",
                    "capabilities": ["prompt-scope-v1"],
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

    async def test_plan_a_perform_update_still_uses_legacy_updater(self):
        self.host.loop = asyncio.get_running_loop()
        fake = MagicMock()
        fake.download_update.return_value = "synthetic.zip"
        fake.apply_update.return_value = True
        with patch("updater.Updater", return_value=fake):
            await self.host.process_message(
                {
                    "action": "perform_update",
                    "requestId": "u",
                    "payload": {"url": "https://example.invalid/release.zip"},
                }
            )
        fake.download_update.assert_called_once()
        fake.apply_update.assert_called_once_with("synthetic.zip")

    def test_integrity_serializer_annotation_resolves(self):
        hints = typing.get_type_hints(
            NativeHost._serialize_installation_verification
        )
        self.assertIs(hints["verification"], InstallationVerification)
        self.assertEqual(hints["return"], dict[str, str])


if __name__ == "__main__":
    unittest.main()
