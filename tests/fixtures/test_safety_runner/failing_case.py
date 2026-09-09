"""One intentional assertion failure, not an import error."""
import unittest


class FailingCase(unittest.TestCase):
    def test_expected_failure(self):
        assert False, 'intentional synthetic failure'
