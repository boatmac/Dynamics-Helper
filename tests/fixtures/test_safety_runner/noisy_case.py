"""At most 16 MiB of synthetic output, using one small reusable string."""
import unittest


class NoisyCase(unittest.TestCase):
    def test_output_budget(self):
        chunk = 'x' * 4095
        for _ in range(4096):
            print(chunk, flush=True)
