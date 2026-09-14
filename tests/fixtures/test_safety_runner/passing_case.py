"""Pure worker assertions; no application imports or external integrations."""
import os
import sys
import unittest


class PassingCase(unittest.TestCase):
    def test_directories(self):
        for key in ('LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP'):
            assert os.environ[key] == os.path.join(os.getcwd(), key)
            assert os.path.isdir(os.environ[key])

    def test_startup_and_environment(self):
        assert sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode and not sys.flags.optimize
        assert isinstance(sys._base_executable, str)
        assert os.path.isabs(sys._base_executable) and os.path.isfile(sys._base_executable)
        assert os.path.realpath(sys.executable, strict=True) == os.path.realpath(sys._base_executable, strict=True)
        assert sys.prefix == sys.base_prefix
        assert 'site' not in sys.modules
        assert not set(os.environ) - {
            'SYSTEMROOT', 'LOCALAPPDATA', 'APPDATA',
            'USERPROFILE', 'HOME', 'TEMP', 'TMP',
        }
