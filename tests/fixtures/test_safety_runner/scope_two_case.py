"""Second exact-ID scope: unrelated skipped cases must not count as passes."""
import os
import sys
import unittest


class ScopeTwo(unittest.TestCase):
    def test_selected(self):
        self.assertTrue(sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode)
        self.assertFalse(sys.flags.optimize)
        self.assertEqual(sys.prefix, sys.base_prefix)
        self.assertEqual(os.path.realpath(sys.executable), os.path.realpath(sys._base_executable))
        self.assertNotIn('site', sys.modules)
        self.assertFalse(set(key.upper() for key in os.environ) - {
            'SYSTEMROOT', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP'})

    @unittest.skip('must remain outside explicit scope')
    def test_not_selected(self):
        self.fail('unselected method executed')
