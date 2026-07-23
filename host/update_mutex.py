import ctypes
import hashlib
import os
from pathlib import Path
from typing import Protocol

from update_journal import UpdateError


WAIT_OBJECT_0 = 0
WAIT_ABANDONED = 0x80
WAIT_TIMEOUT = 0x102
WAIT_FAILED = 0xFFFFFFFF


class MutationMutexError(UpdateError):
    error_code = "update_mutex_failed"


class UpdateAlreadyInProgress(MutationMutexError):
    error_code = "update_already_in_progress"


class MutationMutex(Protocol):
    held: bool

    def acquire(self) -> None: ...

    def release(self) -> None: ...

    def __enter__(self): ...

    def __exit__(self, exc_type, exc, traceback): ...


def canonical_install_identity(install_root: Path) -> str:
    if not isinstance(install_root, Path):
        raise MutationMutexError()
    text = str(install_root.resolve(strict=False)).replace("/", "\\")
    return text.rstrip("\\").casefold()


def mutation_mutex_name(install_root: Path) -> str:
    digest = hashlib.sha256(canonical_install_identity(install_root).encode("utf-8")).hexdigest()
    return f"Local\\DynamicsHelper.Update.{digest}"


class CtypesMutexApi:
    def __init__(self):
        if os.name != "nt":
            raise MutationMutexError()
        self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    def create_mutex(self, name: str) -> int:
        handle = self._kernel32.CreateMutexW(None, False, name)
        if not handle:
            raise OSError(ctypes.get_last_error(), "CreateMutexW failed")
        return handle

    def wait(self, handle: int, timeout: int) -> int:
        return self._kernel32.WaitForSingleObject(handle, timeout)

    def release(self, handle: int) -> None:
        if not self._kernel32.ReleaseMutex(handle):
            raise OSError(ctypes.get_last_error(), "ReleaseMutex failed")

    def close(self, handle: int) -> None:
        if not self._kernel32.CloseHandle(handle):
            raise OSError(ctypes.get_last_error(), "CloseHandle failed")


class WindowsNamedMutex:
    def __init__(self, name: str, *, api=None):
        self._name = name
        self._api = api or CtypesMutexApi()
        self._handle = None
        self.held = False

    def acquire(self) -> None:
        if self.held or self._handle is not None:
            raise MutationMutexError()
        try:
            handle = self._api.create_mutex(self._name)
            self._handle = handle
            result = self._api.wait(handle, 0)
            if result in (WAIT_OBJECT_0, WAIT_ABANDONED):
                self.held = True
                return
            if result == WAIT_TIMEOUT:
                raise UpdateAlreadyInProgress()
            raise MutationMutexError() from OSError(result, "mutex wait failed")
        except (MutationMutexError, UpdateAlreadyInProgress):
            self._close_unheld()
            raise
        except Exception as error:
            self._close_unheld()
            raise MutationMutexError() from error

    def _close_unheld(self) -> None:
        if self._handle is not None:
            try:
                self._api.close(self._handle)
            finally:
                self._handle = None

    def release(self) -> None:
        if self._handle is None:
            return
        handle = self._handle
        self._handle = None
        try:
            if self.held:
                self._api.release(handle)
        finally:
            self.held = False
            self._api.close(handle)

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.release()
        return False


def create_windows_mutation_mutex(install_root: Path) -> WindowsNamedMutex:
    return WindowsNamedMutex(mutation_mutex_name(install_root))
