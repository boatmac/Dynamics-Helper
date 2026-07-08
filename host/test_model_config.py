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


if __name__ == "__main__":
    unittest.main()
