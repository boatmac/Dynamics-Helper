"""Tests for the configurable model + performance feature
(spec docs/superpowers/specs/2026-07-03-configurable-model-performance-design.md).

Covers:
  - _classify_list_models_error: failure classification for the Options UI.
  - Source-inspection guards on the two contract-critical code paths:
    the empty=inherit gating in _refresh_session and the enum validation
    in _get_session_config. Source inspection (not full execution) matches
    the test_analyze_timeout.py precedent — the real paths have heavy
    asyncio / filesystem side effects, and these guards exist to stop a
    silent refactor from removing the contract.
"""

import inspect
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from host.dh_native_host import NativeHost
import host.dh_native_host as dhm


class TestClassifyListModelsError(unittest.TestCase):
    """list_models failures must be classified so the Options UI can show
    the right message (auth → re-login hint) instead of a silent empty
    dropdown (spec § 5)."""

    def test_auth_markers(self):
        for msg in [
            "401 Unauthorized",
            "authentication failed",
            "Please login to continue",
            "invalid token",
            "403 Forbidden",
            "not logged in",
            "credential expired",
        ]:
            self.assertEqual(
                NativeHost._classify_list_models_error(Exception(msg)),
                "auth",
                f"{msg!r} should classify as auth",
            )

    def test_unavailable_markers(self):
        for msg in [
            "client not started",
            "connection refused",
            "broken pipe",
            "request timeout",
            "ECONNREFUSED",
            "server unavailable",
        ]:
            self.assertEqual(
                NativeHost._classify_list_models_error(Exception(msg)),
                "unavailable",
                f"{msg!r} should classify as unavailable",
            )

    def test_unknown_default(self):
        self.assertEqual(
            NativeHost._classify_list_models_error(Exception("weird nonspecific error")),
            "unknown",
        )


class TestListModelsSecrecy(unittest.IsolatedAsyncioTestCase):
    async def test_sdk_exception_text_is_classified_but_never_logged_or_returned(self):
        marker = "LIST-MODELS-SECRET-MARKER /private/prompt"
        host = NativeHost.__new__(NativeHost)
        host.client = MagicMock()
        host.client.list_models = AsyncMock(
            side_effect=RuntimeError(f"authentication failed {marker}")
        )

        with self.assertLogs("dh", level="WARNING") as captured:
            result = await host.handle_list_models()

        self.assertEqual(result["errorKind"], "auth")
        observed = str(result) + "\n".join(captured.output)
        self.assertNotIn(marker, observed)
        self.assertEqual(result["error"], "list Copilot models failed (RuntimeError).")

    async def test_list_models_filters_unsupported_reasoning_efforts(self):
        host = NativeHost.__new__(NativeHost)
        host.client = MagicMock()
        host.client.list_models = AsyncMock(return_value=[SimpleNamespace(
            id="model-a",
            name="Model A",
            supported_reasoning_efforts=["low", "max", "high", "future"],
            default_reasoning_effort="max",
        )])

        result = await host.handle_list_models()

        self.assertEqual(result, {
            "status": "success",
            "data": {"models": [{
                "id": "model-a",
                "name": "Model A",
                "supported_reasoning_efforts": ["low", "high"],
                "default_reasoning_effort": None,
            }]},
        })

    async def test_list_models_preserves_unknown_reasoning_capability(self):
        host = NativeHost.__new__(NativeHost)
        host.client = MagicMock()
        host.client.list_models = AsyncMock(return_value=[
            SimpleNamespace(id="missing", name="Missing"),
            SimpleNamespace(
                id="none",
                name="None",
                supported_reasoning_efforts=None,
                default_reasoning_effort=None,
            ),
            SimpleNamespace(
                id="malformed",
                name="Malformed",
                supported_reasoning_efforts="high",
                default_reasoning_effort="high",
            ),
            SimpleNamespace(
                id="malformed-array",
                name="Malformed Array",
                supported_reasoning_efforts=[None],
                default_reasoning_effort=None,
            ),
            SimpleNamespace(
                id="explicit-empty",
                name="Explicit Empty",
                supported_reasoning_efforts=[],
                default_reasoning_effort=None,
            ),
        ])

        result = await host.handle_list_models()

        rows = result["data"]["models"]
        for row in rows[:4]:
            self.assertNotIn("supported_reasoning_efforts", row)
            self.assertNotIn("default_reasoning_effort", row)
        self.assertEqual(rows[4], {
            "id": "explicit-empty",
            "name": "Explicit Empty",
            "supported_reasoning_efforts": [],
            "default_reasoning_effort": None,
        })


class TestOuterSdkErrorSecrecy(unittest.IsolatedAsyncioTestCase):
    async def test_process_message_outer_exception_never_exposes_marker(self):
        marker = "OUTER-PROCESS-SECRET-MARKER /private/prompt"
        host = NativeHost.__new__(NativeHost)
        host.current_request_id = None
        host.send_progress = MagicMock()
        host.send_message = MagicMock()
        host.handle_list_models = AsyncMock(side_effect=RuntimeError(marker))

        with self.assertLogs("dh", level="ERROR") as captured:
            await host.process_message({"action": "list_models", "requestId": "r1"})

        response = host.send_message.call_args.args[0]
        observed = str(response) + "\n".join(captured.output)
        self.assertNotIn(marker, observed)
        self.assertEqual(response["error"], "internal_error")


class TestModelConfigContract(unittest.TestCase):
    """Contract guards for the empty=inherit + enum-validation behaviour."""

    def test_sdk_kwargs_gated_on_nonempty(self):
        """model / reasoning_effort / context_tier are only added to
        sdk_kwargs when non-empty — empty MUST mean 'inherit the CLI
        default', never pass an empty string to the SDK."""
        src = inspect.getsource(dhm.NativeHost._refresh_session)
        self.assertIn('full_config.get("model")', src)
        self.assertIn('full_config.get("reasoning_effort")', src)
        self.assertIn('full_config.get("context_tier")', src)

    def test_enums_validated_in_session_config(self):
        """_get_session_config must validate reasoning_effort against the 4
        SDK values and context_tier against the 2, dropping illegal values
        (defensive against a hand-edited config.json)."""
        src = inspect.getsource(dhm.NativeHost._get_session_config)
        self.assertIn('"low", "medium", "high", "xhigh"', src)
        self.assertIn('"default", "long_context"', src)

    def test_list_models_action_wired(self):
        """The message dispatch must route the list_models action."""
        src = inspect.getsource(dhm.NativeHost.process_message)
        self.assertIn('action == "list_models"', src)

    def test_release_requirements_pin_reviewed_sdk(self):
        from pathlib import Path

        requirements = Path(__file__).with_name("requirements.txt").read_text(
            encoding="utf-8"
        )
        active_sdk_lines = [
            line.strip()
            for line in requirements.splitlines()
            if line.strip()
            and not line.lstrip().startswith("#")
            and line.strip().lower().startswith("github-copilot-sdk")
        ]
        self.assertEqual(active_sdk_lines, ["github-copilot-sdk==1.0.5"])


if __name__ == "__main__":
    unittest.main()
