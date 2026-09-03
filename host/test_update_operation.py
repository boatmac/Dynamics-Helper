import unittest
from pathlib import Path

from update_operation import OPERATION_MUTEX_PREFIX, operation_mutex_name


class OperationMutexIdentityTests(unittest.TestCase):
    def test_operation_mutex_uses_distinct_canonical_install_identity(self):
        self.assertEqual(
            OPERATION_MUTEX_PREFIX,
            "Local\\DynamicsHelper.UpdateOperation.",
        )
        self.assertEqual(
            operation_mutex_name(Path(r"C:\Users\Example\DynamicsHelper")),
            (
                r"Local\DynamicsHelper.UpdateOperation."
                "30b562b85ca769812ff2a63dea844f62693c1320b574e45b72e6b077f7410641"
            ),
        )


if __name__ == "__main__":
    unittest.main()
