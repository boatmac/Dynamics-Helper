"""Tests for the semver-style version parser used by the updater.

Spec: docs/superpowers/specs/2026-05-11-beta-channel-toggle-design.md § 3.5
Implementation: _parse_version() and _version_gt() in dh_native_host.py.
"""

import unittest

from dh_native_host import _parse_version, _version_gt


class TestParseVersion(unittest.TestCase):
    def test_plain_stable(self):
        self.assertEqual(_parse_version("2.0.70"), ((2, 0, 70), ()))

    def test_leading_v_is_stripped(self):
        self.assertEqual(_parse_version("v2.0.70"), ((2, 0, 70), ()))

    def test_simple_prerelease(self):
        self.assertEqual(_parse_version("2.0.70-beta"), ((2, 0, 70), ("beta",)))

    def test_multi_part_prerelease(self):
        self.assertEqual(
            _parse_version("2.0.70-beta.2"), ((2, 0, 70), ("beta", "2"))
        )

    def test_unparseable_returns_none(self):
        self.assertIsNone(_parse_version("not-a-version"))
        self.assertIsNone(_parse_version(""))
        self.assertIsNone(_parse_version("1.2"))  # missing patch
        self.assertIsNone(_parse_version("1.2.3.4"))  # too many parts


class TestVersionGt(unittest.TestCase):
    def test_patch_bump_is_greater(self):
        self.assertTrue(_version_gt("2.0.71", "2.0.70"))

    def test_equal_is_not_greater(self):
        self.assertFalse(_version_gt("2.0.70", "2.0.70"))

    def test_stable_is_greater_than_prerelease_same_triple(self):
        # semver 11.3: a pre-release version has lower precedence than the
        # associated normal version.
        self.assertTrue(_version_gt("2.0.70", "2.0.70-beta"))

    def test_prerelease_is_not_greater_than_stable_same_triple(self):
        self.assertFalse(_version_gt("2.0.70-beta", "2.0.70"))

    def test_higher_patch_prerelease_greater_than_lower_stable(self):
        # 2.0.71-beta is still 2.0.71 territory, which is > 2.0.70.
        self.assertTrue(_version_gt("2.0.71-beta", "2.0.70"))

    def test_prerelease_ordering_numeric(self):
        # semver 11.4.4: when all preceding identifiers are equal,
        # a larger set of pre-release fields has higher precedence.
        self.assertTrue(_version_gt("2.0.70-beta.2", "2.0.70-beta.1"))

    def test_prerelease_shorter_is_lower(self):
        # 2.0.70-beta < 2.0.70-beta.1 because the longer set wins when
        # the shared prefix is equal.
        self.assertFalse(_version_gt("2.0.70-beta", "2.0.70-beta.1"))
        self.assertTrue(_version_gt("2.0.70-beta.1", "2.0.70-beta"))

    def test_unparseable_remote_returns_false(self):
        # Defensive: an unparseable remote tag must not trigger an update.
        self.assertFalse(_version_gt("garbage", "2.0.70"))


if __name__ == "__main__":
    unittest.main()
