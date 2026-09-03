import asyncio
import inspect
import unittest
from unittest.mock import MagicMock

from host.dh_native_host import NativeHost, _select_update_candidate
from update_journal import TerminalVersion
from update_recovery import FinalizationReceipt
from update_service import ActivatedUpdate, PreparedUpdate, UpdateServiceError


TX = "0123456789abcdef0123456789abcdef"
TARGET = "2.0.76-beta.1"
PRIOR = "2.0.75-beta.1"
URL = "https://example.invalid/DynamicsHelper_v2.0.76-beta.1.zip"


class UpdateActionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.host = NativeHost.__new__(NativeHost)
        self.host.current_request_id = None
        self.host.running = True
        self.host._source_runtime = False
        self.host._installation_ready = True
        self.host._update_service = MagicMock()
        self.host.send_message = MagicMock()
        self.host.send_progress = MagicMock()
        self.host._safe_sdk_error = MagicMock()

    async def test_four_update_actions_route_exact_payloads_and_shapes(self):
        receipt = FinalizationReceipt(
            TX,
            "committed",
            TerminalVersion(TARGET, False),
        )
        cases = (
            (
                {
                    "requestId": "prepare-1",
                    "action": "perform_update",
                    "payload": {
                        "url": URL,
                        "transactionId": TX,
                        "targetVersion": TARGET,
                    },
                },
                "prepare",
                (URL, TX, TARGET),
                PreparedUpdate(TX, TARGET, PRIOR),
                {
                    "state": "update_prepared",
                    "transactionId": TX,
                    "targetVersion": TARGET,
                    "priorVersion": PRIOR,
                },
            ),
            (
                {
                    "requestId": "activate-1",
                    "action": "activate_update",
                    "payload": {"transactionId": TX},
                },
                "activate",
                (TX,),
                ActivatedUpdate(TX),
                {"state": "update_activated", "transactionId": TX},
            ),
            (
                {
                    "requestId": "finalize-1",
                    "action": "finalize_update_status",
                    "payload": {"transactionId": TX},
                },
                "finalize",
                (TX,),
                receipt,
                receipt.to_dict(),
            ),
            (
                {
                    "requestId": "ack-1",
                    "action": "acknowledge_update_finalization",
                    "payload": {"transactionId": TX},
                },
                "acknowledge",
                (TX,),
                True,
                {"transactionId": TX, "acknowledged": True},
            ),
        )
        for request, method_name, args, result, expected_data in cases:
            with self.subTest(action=request["action"]):
                self.host.send_message.reset_mock()
                method = getattr(self.host._update_service, method_name)
                method.reset_mock()
                method.return_value = result
                await self.host.process_message(request)
                method.assert_called_once_with(*args)
                self.assertEqual(
                    self.host.send_message.call_args.args[0],
                    {
                        "requestId": request["requestId"],
                        "status": "success",
                        "data": expected_data,
                    },
                )
                self.host.send_progress.assert_not_called()

    async def test_update_requests_reject_extra_missing_and_wrong_types(self):
        invalid = (
            {
                "requestId": "r",
                "action": "perform_update",
                "payload": {"url": URL, "transactionId": TX},
            },
            {
                "requestId": "r",
                "action": "perform_update",
                "payload": {
                    "url": URL,
                    "transactionId": TX,
                    "targetVersion": TARGET,
                    "extra": True,
                },
            },
            {
                "requestId": "r",
                "action": "activate_update",
                "payload": {"transactionId": TX.upper()},
            },
            {
                "requestId": "r",
                "action": "finalize_update_status",
                "payload": {"transactionId": 7},
            },
            {
                "requestId": "r",
                "action": "acknowledge_update_finalization",
                "payload": {"transactionId": TX},
                "extra": True,
            },
        )
        for request in invalid:
            self.host.send_message.reset_mock()
            with self.subTest(request=request):
                await self.host.process_message(request)
                self.assertEqual(
                    self.host.send_message.call_args.args[0],
                    {
                        "requestId": "r",
                        "status": "error",
                        "error_code": "invalid_update_request",
                        "error": "The update request is invalid.",
                    },
                )
        self.host._update_service.prepare.assert_not_called()
        self.host._update_service.activate.assert_not_called()
        self.host._update_service.finalize.assert_not_called()
        self.host._update_service.acknowledge.assert_not_called()

    async def test_source_runtime_denies_actions_before_service_use(self):
        self.host._source_runtime = True
        for action, payload in (
            (
                "perform_update",
                {"url": URL, "transactionId": TX, "targetVersion": TARGET},
            ),
            ("activate_update", {"transactionId": TX}),
            ("finalize_update_status", {"transactionId": TX}),
            ("acknowledge_update_finalization", {"transactionId": TX}),
        ):
            self.host.send_message.reset_mock()
            await self.host.process_message(
                {"requestId": "source", "action": action, "payload": payload}
            )
            self.assertEqual(
                self.host.send_message.call_args.args[0],
                {
                    "requestId": "source",
                    "status": "error",
                    "error_code": "source_update_disabled",
                    "error": (
                        "Automatic update is disabled while the source Host "
                        "is registered."
                    ),
                },
            )
        self.host._update_service.prepare.assert_not_called()
        self.host._update_service.activate.assert_not_called()

    async def test_mixed_install_rejects_legacy_url_only_request_with_installer_guidance(self):
        self.host._installation_ready = False
        await self.host.process_message(
            {
                "requestId": "legacy",
                "action": "perform_update",
                "payload": {"url": URL},
            }
        )
        self.assertEqual(
            self.host.send_message.call_args.args[0],
            {
                "requestId": "legacy",
                "status": "error",
                "error_code": "installation_integrity_failed",
                "error": (
                    "The installed Host and Extension do not match. "
                    "Run the matching full installer."
                ),
            },
        )
        self.host._update_service.prepare.assert_not_called()

    async def test_new_host_rejects_legacy_url_only_request_with_installer_guidance(self):
        self.host._installation_ready = True
        await self.host.process_message(
            {
                "requestId": "legacy-new-host",
                "action": "perform_update",
                "payload": {"url": URL},
            }
        )
        self.assertEqual(
            self.host.send_message.call_args.args[0],
            {
                "requestId": "legacy-new-host",
                "status": "error",
                "error_code": "installation_integrity_failed",
                "error": (
                    "The installed Host and Extension do not match. "
                    "Run the matching full installer."
                ),
            },
        )
        self.host._update_service.prepare.assert_not_called()

    async def test_service_errors_use_only_fixed_envelopes(self):
        marker = "SECRET URL https://example.invalid/update.zip?sig=secret"
        self.host._update_service.prepare.side_effect = UpdateServiceError(
            "update_prepare_failed"
        )
        await self.host.process_message(
            {
                "requestId": "prepare-error",
                "action": "perform_update",
                "payload": {
                    "url": URL,
                    "transactionId": TX,
                    "targetVersion": TARGET,
                },
                }
        )
        response = self.host.send_message.call_args.args[0]
        self.assertEqual(
            response,
            {
                "requestId": "prepare-error",
                "status": "error",
                "error_code": "update_prepare_failed",
                "error": (
                    "The update could not be prepared. Retry or run the "
                    "matching full installer."
                ),
            },
        )
        self.assertNotIn(marker, repr(response))

    async def test_activation_response_is_flushed_before_loop_stops(self):
        self.host._update_service.activate.return_value = ActivatedUpdate(TX)
        observed_running = []

        def send(message, **kwargs):
            observed_running.append((self.host.running, message, kwargs))

        self.host.send_message.side_effect = send
        await self.host.process_message(
            {
                "requestId": "activate",
                "action": "activate_update",
                "payload": {"transactionId": TX},
            }
        )
        self.assertEqual(len(observed_running), 1)
        self.assertTrue(observed_running[0][0])
        self.assertEqual(observed_running[0][2], {"raise_on_error": True})
        self.assertFalse(self.host.running)

    async def test_activation_flush_failure_still_stops_host_with_fixed_fallback(self):
        self.host._update_service.activate.return_value = ActivatedUpdate(TX)
        sent = []

        def send(message, **kwargs):
            sent.append((message, kwargs))
            if kwargs.get("raise_on_error"):
                raise OSError("SECRET PIPE FAILURE")

        self.host.send_message.side_effect = send
        await self.host.process_message(
            {
                "requestId": "activate-flush",
                "action": "activate_update",
                "payload": {"transactionId": TX},
            }
        )

        self.assertFalse(self.host.running)
        self.assertEqual(
            sent[-1][0],
            {
                "requestId": "activate-flush",
                "status": "error",
                "error_code": "update_activation_failed",
                "error": (
                    "The prepared update could not be started. Retry or run "
                    "the matching full installer."
                ),
            },
        )
        self.assertNotIn("SECRET", repr(sent))

    async def test_unexpected_update_exception_uses_fixed_action_envelope(self):
        self.host._update_service.prepare.side_effect = RuntimeError(
            "SECRET https://example.invalid/update.zip?sig=hidden"
        )
        await self.host.process_message(
            {
                "requestId": "prepare-unexpected",
                "action": "perform_update",
                "payload": {
                    "url": URL,
                    "transactionId": TX,
                    "targetVersion": TARGET,
                },
            }
        )

        response = self.host.send_message.call_args.args[0]
        self.assertEqual(
            response,
            {
                "requestId": "prepare-unexpected",
                "status": "error",
                "error_code": "update_prepare_failed",
                "error": (
                    "The update could not be prepared. Retry or run the "
                    "matching full installer."
                ),
            },
        )
        self.assertNotIn("SECRET", repr(response))

    async def test_post_launch_activation_error_stops_host(self):
        error = UpdateServiceError("update_activation_failed")
        error.activation_launched = True
        self.host._update_service.activate.side_effect = error

        await self.host.process_message(
            {
                "requestId": "activate-launched-error",
                "action": "activate_update",
                "payload": {"transactionId": TX},
            }
        )

        self.assertFalse(self.host.running)
        self.host.send_message.assert_not_called()

    async def test_non_string_action_returns_unknown_action_without_escape(self):
        await self.host.process_message({"requestId": "bad-action", "action": []})

        self.assertEqual(
            self.host.send_message.call_args.args[0],
            {
                "requestId": "bad-action",
                "status": "error",
                "data": None,
                "error": "unknown_action",
                "message": "Unknown action.",
            },
        )

    def test_legacy_updater_is_not_reachable_from_process_message(self):
        source = inspect.getsource(NativeHost.process_message)
        self.assertNotIn("Updater", source)
        self.assertNotIn("apply_update", source)
        self.assertNotIn("download_update", source)


class UpdateCandidateSelectionTests(unittest.TestCase):
    def release(self, *, assets, tag="v2.0.76-beta.1", prerelease=True):
        return {
            "tag_name": tag,
            "prerelease": prerelease,
            "assets": assets,
            "html_url": "https://example.invalid/release-page",
        }

    def asset(self, url=URL, name="DynamicsHelper.zip"):
        return {"name": name, "browser_download_url": url}

    def test_exactly_one_direct_https_zip_is_selected_and_version_normalized(self):
        self.assertEqual(
            _select_update_candidate([self.release(assets=[self.asset()])]),
            {
                "version": TARGET,
                "url": URL,
                "is_prerelease": True,
            },
        )

    def test_zero_multiple_or_unsafe_zip_assets_produce_no_candidate(self):
        cases = (
            self.release(assets=[]),
            self.release(assets=[self.asset(), self.asset(URL + "?second=1")]),
            self.release(assets=[self.asset("http://example.invalid/update.zip")]),
            self.release(assets=[self.asset("https://example.invalid/release")]),
            self.release(assets=[self.asset(URL + "#fragment")]),
            self.release(assets=[self.asset("https://user@example.invalid/update.zip")]),
            self.release(assets=[self.asset()], prerelease=1),
        )
        for release in cases:
            with self.subTest(release=release):
                self.assertIsNone(_select_update_candidate([release]))


if __name__ == "__main__":
    unittest.main()
