"""Finite sleep; the runner must terminate its owned worker first."""
import time
import unittest


class WaitingCase(unittest.TestCase):
    def test_wait(self):
        time.sleep(20)
