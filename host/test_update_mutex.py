import unittest
from pathlib import Path

from update_mutex import (
    MutationMutexError,
    UpdateAlreadyInProgress,
    WindowsNamedMutex,
    canonical_install_identity,
    mutation_mutex_name,
)


class FakeApi:
    def __init__(self, wait_result=0):
        self.wait_result = wait_result
        self.closed = []
        self.released = []
        self.created = []

    def create_mutex(self, name):
        self.created.append(name)
        return 101

    def wait(self, handle, timeout):
        self.wait_args = (handle, timeout)
        return self.wait_result

    def release(self, handle):
        self.released.append(handle)

    def close(self, handle):
        self.closed.append(handle)


class ExceptionContractTests(unittest.TestCase):
    def test_fixed_error_contracts(self):
        self.assertEqual(str(MutationMutexError()), "update_mutex_failed")
        self.assertEqual(str(UpdateAlreadyInProgress()), "update_already_in_progress")


class MutexIdentityTests(unittest.TestCase):
    def test_canonical_identity_and_name(self):
        identity = canonical_install_identity(Path(r"C:\Users\Example\DynamicsHelper"))
        self.assertEqual(identity, r"c:\users\example\dynamicshelper")
        self.assertEqual(
            mutation_mutex_name(Path(r"C:\Users\Example\DynamicsHelper")),
            r"Local\DynamicsHelper.Update.30b562b85ca769812ff2a63dea844f62693c1320b574e45b72e6b077f7410641",
        )


class WindowsNamedMutexTests(unittest.TestCase):
    def test_object_and_abandoned_wait_both_acquire(self):
        for wait_result in (0, 0x80):
            api = FakeApi(wait_result)
            mutex = WindowsNamedMutex("Local\\Test", api=api)
            with mutex:
                self.assertTrue(mutex.held)
            self.assertEqual(api.wait_args, (101, 0))
            self.assertEqual(api.released, [101])
            self.assertEqual(api.closed, [101])

    def test_timeout_is_typed_contention(self):
        api = FakeApi(0x102)
        mutex = WindowsNamedMutex("Local\\Test", api=api)
        with self.assertRaises(UpdateAlreadyInProgress):
            mutex.acquire()
        self.assertEqual(api.closed, [101])

    def test_failed_wait_is_fixed_mutex_error(self):
        api = FakeApi(0xFFFFFFFF)
        mutex = WindowsNamedMutex("Local\\Test", api=api)
        with self.assertRaises(MutationMutexError):
            mutex.acquire()
        self.assertEqual(api.closed, [101])

    def test_body_exception_releases_and_double_release_is_safe(self):
        api = FakeApi()
        mutex = WindowsNamedMutex("Local\\Test", api=api)
        with self.assertRaisesRegex(RuntimeError, "body"):
            with mutex:
                raise RuntimeError("body")
        mutex.release()
        self.assertEqual(api.released, [101])
        self.assertEqual(api.closed, [101])


if __name__ == "__main__":
    unittest.main()
