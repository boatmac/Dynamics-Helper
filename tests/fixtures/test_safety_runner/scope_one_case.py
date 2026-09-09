"""First exact-ID scope: importing a module must not select every method."""
import os
import unittest


class ScopeOne(unittest.TestCase):
    def test_selected(self):
        for key in ('LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP'):
            self.assertEqual(os.environ[key], os.path.join(os.getcwd(), key))
            self.assertTrue(os.path.isdir(os.environ[key]))

    def test_not_selected(self):
        self.fail('unselected method executed')
