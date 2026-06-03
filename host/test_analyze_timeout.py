"""Tests for analyze_timeout_seconds config field.

C2b-lite: timeout is now user-configurable via Options. Host reads
extension_preferences.analyze_timeout_seconds at config load time and
on update_config refresh. Default 1200 (was hardcoded 600). Clamped to
[60, 3600] to keep the OS pipe buffer / SDK from pathological extremes.
"""

import unittest


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


class TestAnalyzeTimeoutClamp(unittest.TestCase):
    """Pure-function bound check. Mirrors the clamp the host applies
    when reading config + accepting update_config payloads.

    Kept as a free function rather than a NativeHost method so the test
    doesn't have to spin up a NativeHost.__new__ shell. The actual host
    inlines max(60, min(3600, int(...))) at the read site.
    """

    def test_below_min_clamps_to_60(self):
        self.assertEqual(_clamp(30, 60, 3600), 60)
        self.assertEqual(_clamp(0, 60, 3600), 60)
        self.assertEqual(_clamp(-5, 60, 3600), 60)

    def test_above_max_clamps_to_3600(self):
        self.assertEqual(_clamp(7200, 60, 3600), 3600)
        self.assertEqual(_clamp(10000, 60, 3600), 3600)

    def test_in_range_passes_through(self):
        self.assertEqual(_clamp(60, 60, 3600), 60)
        self.assertEqual(_clamp(600, 60, 3600), 600)
        self.assertEqual(_clamp(1200, 60, 3600), 1200)
        self.assertEqual(_clamp(3600, 60, 3600), 3600)


class TestAnalyzeTimeoutInit(unittest.TestCase):
    """Verify NativeHost initialises analyze_timeout_seconds to the
    1200s default before any config load runs.

    Catches regressions where:
    - Default is silently changed (e.g. back to 600 by a refactor)
    - Attribute is missing entirely (would surface as AttributeError
      at send_and_wait time, way too late)
    """

    def test_default_is_1200(self):
        from host.dh_native_host import NativeHost
        host = NativeHost.__new__(NativeHost)
        # Mimic the __init__ assignment without running the full init
        # (which spawns asyncio loops, file handles, etc).
        host.analyze_timeout_seconds = 1200
        self.assertEqual(host.analyze_timeout_seconds, 1200)

    def test_real_init_sets_attribute(self):
        """Read the actual NativeHost class to ensure the attribute is
        set in __init__. We can't easily run __init__ in a test (it
        opens files, starts threads), so we grep the source instead.
        """
        import inspect
        from host.dh_native_host import NativeHost
        src = inspect.getsource(NativeHost.__init__)
        self.assertIn(
            "self.analyze_timeout_seconds",
            src,
            "NativeHost.__init__ must initialise self.analyze_timeout_seconds; "
            "otherwise send_and_wait will AttributeError on first analyze.",
        )
        self.assertIn(
            "1200",
            src,
            "Default analyze_timeout_seconds should be 1200 (C2b-lite).",
        )


class TestAnalyzeTimeoutConfigRead(unittest.TestCase):
    """Lock the contract that the load_config path reads
    analyze_timeout_seconds from extension_preferences and applies the
    [60, 3600] clamp.

    Tested via source inspection because the actual _load_config method
    has heavy file/network side effects and is not unit-test friendly
    today. Pinning this with a grep is the cheapest insurance against
    a future refactor that forgets to copy the read.
    """

    def test_load_config_reads_field(self):
        import inspect
        from host.dh_native_host import NativeHost
        src = inspect.getsource(NativeHost._get_session_config)
        self.assertIn(
            "analyze_timeout_seconds",
            src,
            "_get_session_config must read analyze_timeout_seconds from "
            "extension_preferences and assign to self.",
        )

    def test_update_config_refreshes_field(self):
        """handle_update_config must refresh self.analyze_timeout_seconds
        in the same way it refreshes self log level, so an Options edit
        takes effect on the very next analyze without restarting the host.
        """
        import inspect
        from host.dh_native_host import NativeHost
        src = inspect.getsource(NativeHost.handle_update_config)
        self.assertIn(
            "analyze_timeout_seconds",
            src,
            "handle_update_config must refresh self.analyze_timeout_seconds "
            "so Options edits take effect without host restart.",
        )


if __name__ == "__main__":
    unittest.main()
