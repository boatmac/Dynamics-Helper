import ctypes
import json
import math
import re
import subprocess
import time
from ctypes import wintypes
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, Sequence

from install_integrity import UpdateProbeResult
from update_journal import (
    InitiatingProcessIdentity,
    JournalValidationError,
    TransactionPaths,
    parse_transaction_id,
)


MAX_PROBE_OUTPUT_BYTES = 65_536

SYNCHRONIZE = 0x00100000
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
WAIT_OBJECT_0 = 0x00000000
WAIT_TIMEOUT = 0x00000102
INFINITE = 0xFFFFFFFF
DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200
EXTENDED_STARTUPINFO_PRESENT = 0x00080000
STARTF_USESTDHANDLES = 0x00000100
PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
ERROR_INVALID_PARAMETER = 87
ERROR_INSUFFICIENT_BUFFER = 122

RUN_ONCE_KEY = r"Software\Microsoft\Windows\CurrentVersion\RunOnce"
RUN_ONCE_VALUE_NAME = "DynamicsHelperUpdateRecovery"
RUN_ONCE_LIMIT = 260
RUNNER_ENV_PATH = (
    r"%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe"
)

_CREATION_TOKEN_RE = re.compile(r"^win-create-time-([1-9][0-9]*)$")


def _probe_failure() -> UpdateProbeResult:
    return UpdateProbeResult(
        status="error",
        error_code="package_probe_failed",
    )


def _reject_constant(_value: str) -> object:
    raise ValueError("non_finite_json_number")


def _reject_duplicate_pairs(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_json_key")
        result[key] = value
    return result


def parse_probe_process_result(
    exit_code: int,
    stdout: bytes,
) -> UpdateProbeResult:
    failure = _probe_failure()
    if type(exit_code) is not int or type(stdout) is not bytes:
        return failure
    if exit_code != 0 or not stdout or len(stdout) > MAX_PROBE_OUTPUT_BYTES:
        return failure
    if not stdout.endswith(b"\n") or stdout.count(b"\n") != 1:
        return failure
    try:
        value = json.loads(
            stdout[:-1].decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        if type(value) is not dict or set(value) != {
            "status",
            "host_version",
            "extension_version",
            "capabilities",
        }:
            return failure
        if value["status"] != "success":
            return failure
        host_version = value["host_version"]
        extension_version = value["extension_version"]
        capabilities = value["capabilities"]
        if (
            type(host_version) is not str
            or not host_version
            or type(extension_version) is not str
            or not extension_version
            or type(capabilities) is not list
            or any(type(item) is not str or not item for item in capabilities)
            or len(set(capabilities)) != len(capabilities)
        ):
            return failure
        canonical = (
            json.dumps(
                value,
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
        if stdout != canonical:
            return failure
        return UpdateProbeResult(
            status="success",
            host_version=host_version,
            extension_version=extension_version,
            capabilities=tuple(capabilities),
        )
    except (TypeError, ValueError, UnicodeDecodeError):
        return failure


class ProbeProcessAdapter(Protocol):
    def run_probe(
        self,
        executable: Path,
        manifest_path: Path,
    ) -> UpdateProbeResult:
        raise AssertionError("probe process protocol method")


class SubprocessProbeAdapter:
    def run_probe(
        self,
        executable: Path,
        manifest_path: Path,
    ) -> UpdateProbeResult:
        failure = _probe_failure()
        if not executable.is_absolute() or not manifest_path.is_absolute():
            return failure
        try:
            executable = executable.resolve(strict=True)
            manifest_path = manifest_path.resolve(strict=True)
            completed = subprocess.run(
                [str(executable), "--update-probe", str(manifest_path)],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=executable.parent,
                close_fds=True,
                shell=False,
                timeout=30,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            return failure
        return parse_probe_process_result(completed.returncode, completed.stdout)


@dataclass
class RetainedProcessHandle:
    identity: InitiatingProcessIdentity
    executable: Path
    native_handle: int
    closed: bool = False


@dataclass(frozen=True)
class CreatedProcess:
    pid: int
    process_handle: int
    thread_handle: int


class ProcessAdapterError(RuntimeError):
    _ALLOWED = frozenset(
        {
            "process_open_failed",
            "process_query_failed",
            "process_wait_failed",
            "process_launch_failed",
            "process_close_failed",
            "process_identity_mismatch",
            "invalid_process_path",
            "invalid_process_timeout",
        }
    )

    def __init__(self, error_code: str) -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_process_error")
        self.error_code = error_code
        super().__init__(error_code)


class ParentHandleCloseError(BaseException):
    def __init__(self) -> None:
        super().__init__("process_parent_handle_close_failed")


def _mark_process_launched(error: BaseException) -> BaseException:
    try:
        error.process_launched = True
    except Exception:
        pass
    return error


def validate_cli_process_identity_text(
    pid_text: object,
    creation_token: object,
) -> tuple[int, str]:
    if (
        type(pid_text) is not str
        or not pid_text.isascii()
        or not pid_text.isdecimal()
        or pid_text.startswith("0")
        or type(creation_token) is not str
        or _CREATION_TOKEN_RE.fullmatch(creation_token) is None
    ):
        raise ValueError("invalid_process_identity")
    pid = int(pid_text, 10)
    if pid <= 0 or pid > 0xFFFFFFFF:
        raise ValueError("invalid_process_identity")
    return pid, creation_token


def parse_cli_process_identity(
    pid_text: object,
    creation_token: object,
) -> InitiatingProcessIdentity:
    pid, token = validate_cli_process_identity_text(pid_text, creation_token)
    return InitiatingProcessIdentity(pid=pid, creation_token=token)


def _creation_token(ticks: int) -> str:
    if type(ticks) is not int or ticks <= 0:
        raise ProcessAdapterError("process_query_failed")
    return f"win-create-time-{ticks}"


def _canonical_image(path: Path) -> str:
    if not isinstance(path, Path) or not path.is_absolute():
        raise ProcessAdapterError("invalid_process_path")
    return str(path.resolve(strict=False)).replace("/", "\\").rstrip("\\").casefold()


class ProcessAdapter(Protocol):
    def capture_current_identity(
        self,
        expected_executable: Path,
    ) -> InitiatingProcessIdentity:
        raise AssertionError("process protocol method")

    def open_identity(
        self,
        identity: InitiatingProcessIdentity,
        expected_executable: Path,
    ) -> RetainedProcessHandle | None:
        raise AssertionError("process protocol method")

    def wait(
        self,
        handle: RetainedProcessHandle,
        timeout_seconds: float | None,
    ) -> bool:
        raise AssertionError("process protocol method")

    def close(self, handle: RetainedProcessHandle) -> None:
        raise AssertionError("process protocol method")

    def launch_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> InitiatingProcessIdentity:
        raise AssertionError("process protocol method")


class Clock(Protocol):
    def monotonic(self) -> float:
        raise AssertionError("clock protocol method")

    def sleep(self, seconds: float) -> None:
        raise AssertionError("clock protocol method")


class SystemClock:
    def monotonic(self) -> float:
        return time.monotonic()

    def sleep(self, seconds: float) -> None:
        time.sleep(seconds)


class RunOnceStore(Protocol):
    def write_expand_string(self, name: str, value: str) -> None:
        raise AssertionError("RunOnce protocol method")

    def read(self, name: str) -> tuple[str, str] | None:
        raise AssertionError("RunOnce protocol method")

    def delete(self, name: str) -> None:
        raise AssertionError("RunOnce protocol method")


class Win32ProcessApi(Protocol):
    def current_process_id(self) -> int:
        raise AssertionError("Win32 process API method")

    def open_process(self, pid: int) -> int | None:
        raise AssertionError("Win32 process API method")

    def creation_ticks(self, handle: int) -> int:
        raise AssertionError("Win32 process API method")

    def query_image(self, handle: int) -> Path:
        raise AssertionError("Win32 process API method")

    def wait(self, handle: int, milliseconds: int) -> int:
        raise AssertionError("Win32 process API method")

    def close_handle(self, handle: int) -> None:
        raise AssertionError("Win32 process API method")

    def create_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> CreatedProcess:
        raise AssertionError("Win32 process API method")


class CtypesWin32ProcessApi:
    class FILETIME(ctypes.Structure):
        _fields_ = [
            ("dwLowDateTime", wintypes.DWORD),
            ("dwHighDateTime", wintypes.DWORD),
        ]

    class SECURITY_ATTRIBUTES(ctypes.Structure):
        _fields_ = [
            ("nLength", wintypes.DWORD),
            ("lpSecurityDescriptor", wintypes.LPVOID),
            ("bInheritHandle", wintypes.BOOL),
        ]

    class STARTUPINFOW(ctypes.Structure):
        _fields_ = [
            ("cb", wintypes.DWORD),
            ("lpReserved", wintypes.LPWSTR),
            ("lpDesktop", wintypes.LPWSTR),
            ("lpTitle", wintypes.LPWSTR),
            ("dwX", wintypes.DWORD),
            ("dwY", wintypes.DWORD),
            ("dwXSize", wintypes.DWORD),
            ("dwYSize", wintypes.DWORD),
            ("dwXCountChars", wintypes.DWORD),
            ("dwYCountChars", wintypes.DWORD),
            ("dwFillAttribute", wintypes.DWORD),
            ("dwFlags", wintypes.DWORD),
            ("wShowWindow", wintypes.WORD),
            ("cbReserved2", wintypes.WORD),
            ("lpReserved2", ctypes.POINTER(wintypes.BYTE)),
            ("hStdInput", wintypes.HANDLE),
            ("hStdOutput", wintypes.HANDLE),
            ("hStdError", wintypes.HANDLE),
        ]

    class PROCESS_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("hProcess", wintypes.HANDLE),
            ("hThread", wintypes.HANDLE),
            ("dwProcessId", wintypes.DWORD),
            ("dwThreadId", wintypes.DWORD),
        ]

    class STARTUPINFOEXW(ctypes.Structure):
        pass

    STARTUPINFOEXW._fields_ = [
        ("StartupInfo", STARTUPINFOW),
        ("lpAttributeList", wintypes.LPVOID),
    ]

    def __init__(self, kernel32=None) -> None:
        if kernel32 is None:
            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        self._kernel32 = kernel32
        self._configure_signatures()

    def _configure_signatures(self) -> None:
        kernel32 = self._kernel32
        kernel32.OpenProcess.argtypes = [
            wintypes.DWORD,
            wintypes.BOOL,
            wintypes.DWORD,
        ]
        kernel32.OpenProcess.restype = wintypes.HANDLE
        kernel32.GetCurrentProcessId.argtypes = []
        kernel32.GetCurrentProcessId.restype = wintypes.DWORD
        kernel32.GetProcessTimes.argtypes = [
            wintypes.HANDLE,
            ctypes.POINTER(self.FILETIME),
            ctypes.POINTER(self.FILETIME),
            ctypes.POINTER(self.FILETIME),
            ctypes.POINTER(self.FILETIME),
        ]
        kernel32.GetProcessTimes.restype = wintypes.BOOL
        kernel32.QueryFullProcessImageNameW.argtypes = [
            wintypes.HANDLE,
            wintypes.DWORD,
            wintypes.LPWSTR,
            ctypes.POINTER(wintypes.DWORD),
        ]
        kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
        kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel32.WaitForSingleObject.restype = wintypes.DWORD
        kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
        kernel32.CloseHandle.restype = wintypes.BOOL
        kernel32.CreateFileW.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.POINTER(self.SECURITY_ATTRIBUTES),
            wintypes.DWORD,
            wintypes.DWORD,
            wintypes.HANDLE,
        ]
        kernel32.CreateFileW.restype = wintypes.HANDLE
        kernel32.InitializeProcThreadAttributeList.argtypes = [
            wintypes.LPVOID,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.c_size_t),
        ]
        kernel32.InitializeProcThreadAttributeList.restype = wintypes.BOOL
        kernel32.UpdateProcThreadAttribute.argtypes = [
            wintypes.LPVOID,
            wintypes.DWORD,
            ctypes.c_size_t,
            wintypes.LPVOID,
            ctypes.c_size_t,
            wintypes.LPVOID,
            ctypes.POINTER(ctypes.c_size_t),
        ]
        kernel32.UpdateProcThreadAttribute.restype = wintypes.BOOL
        kernel32.DeleteProcThreadAttributeList.argtypes = [wintypes.LPVOID]
        kernel32.DeleteProcThreadAttributeList.restype = None
        kernel32.CreateProcessW.argtypes = [
            wintypes.LPCWSTR,
            wintypes.LPWSTR,
            ctypes.POINTER(self.SECURITY_ATTRIBUTES),
            ctypes.POINTER(self.SECURITY_ATTRIBUTES),
            wintypes.BOOL,
            wintypes.DWORD,
            wintypes.LPVOID,
            wintypes.LPCWSTR,
            ctypes.POINTER(self.STARTUPINFOW),
            ctypes.POINTER(self.PROCESS_INFORMATION),
        ]
        kernel32.CreateProcessW.restype = wintypes.BOOL

    @staticmethod
    def _native_handle(value) -> int:
        if value is None:
            return 0
        return int(value)

    @staticmethod
    def _winerror() -> OSError:
        return ctypes.WinError(ctypes.get_last_error())

    def current_process_id(self) -> int:
        return int(self._kernel32.GetCurrentProcessId())

    def open_process(self, pid: int) -> int | None:
        handle = self._kernel32.OpenProcess(
            SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION,
            False,
            pid,
        )
        native = self._native_handle(handle)
        if native:
            return native
        if ctypes.get_last_error() == ERROR_INVALID_PARAMETER:
            return None
        raise ProcessAdapterError("process_open_failed") from self._winerror()

    def creation_ticks(self, handle: int) -> int:
        creation = self.FILETIME()
        exit_time = self.FILETIME()
        kernel = self.FILETIME()
        user = self.FILETIME()
        if not self._kernel32.GetProcessTimes(
            handle,
            ctypes.byref(creation),
            ctypes.byref(exit_time),
            ctypes.byref(kernel),
            ctypes.byref(user),
        ):
            raise ProcessAdapterError("process_query_failed") from self._winerror()
        return (int(creation.dwHighDateTime) << 32) | int(
            creation.dwLowDateTime
        )

    def query_image(self, handle: int) -> Path:
        capacity = 32_768
        buffer = ctypes.create_unicode_buffer(capacity)
        size = wintypes.DWORD(capacity)
        if not self._kernel32.QueryFullProcessImageNameW(
            handle, 0, buffer, ctypes.byref(size)
        ):
            raise ProcessAdapterError("process_query_failed") from self._winerror()
        path = Path(buffer.value)
        if not path.is_absolute():
            raise ProcessAdapterError("process_query_failed")
        return path

    def wait(self, handle: int, milliseconds: int) -> int:
        return int(self._kernel32.WaitForSingleObject(handle, milliseconds))

    def close_handle(self, handle: int) -> None:
        if not self._kernel32.CloseHandle(handle):
            raise ProcessAdapterError("process_close_failed") from self._winerror()

    def create_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> CreatedProcess:
        security = self.SECURITY_ATTRIBUTES(
            ctypes.sizeof(self.SECURITY_ATTRIBUTES),
            None,
            True,
        )
        nul_handle = self._kernel32.CreateFileW(
            "NUL",
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            ctypes.byref(security),
            OPEN_EXISTING,
            0,
            None,
        )
        nul_native = self._native_handle(nul_handle)
        if not nul_native or nul_native == ctypes.c_void_p(-1).value:
            raise ProcessAdapterError("process_launch_failed") from self._winerror()

        attribute_buffer = None
        attribute_pointer = None
        attribute_initialized = False
        created: CreatedProcess | None = None
        try:
            size = ctypes.c_size_t()
            first = self._kernel32.InitializeProcThreadAttributeList(
                None, 1, 0, ctypes.byref(size)
            )
            if first or ctypes.get_last_error() != ERROR_INSUFFICIENT_BUFFER:
                raise ProcessAdapterError("process_launch_failed")
            attribute_buffer = ctypes.create_string_buffer(size.value)
            attribute_pointer = ctypes.cast(attribute_buffer, wintypes.LPVOID)
            if not self._kernel32.InitializeProcThreadAttributeList(
                attribute_pointer, 1, 0, ctypes.byref(size)
            ):
                raise ProcessAdapterError("process_launch_failed") from self._winerror()
            attribute_initialized = True
            handles = (wintypes.HANDLE * 1)(nul_native)
            if not self._kernel32.UpdateProcThreadAttribute(
                attribute_pointer,
                0,
                PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
                ctypes.cast(handles, wintypes.LPVOID),
                ctypes.sizeof(handles),
                None,
                None,
            ):
                raise ProcessAdapterError("process_launch_failed") from self._winerror()

            startup = self.STARTUPINFOEXW()
            startup.StartupInfo.cb = ctypes.sizeof(self.STARTUPINFOEXW)
            startup.StartupInfo.dwFlags |= STARTF_USESTDHANDLES
            startup.StartupInfo.hStdInput = nul_native
            startup.StartupInfo.hStdOutput = nul_native
            startup.StartupInfo.hStdError = nul_native
            startup.lpAttributeList = attribute_pointer
            process_info = self.PROCESS_INFORMATION()
            command_line = ctypes.create_unicode_buffer(
                subprocess.list2cmdline([str(executable), *args])
            )
            flags = (
                DETACHED_PROCESS
                | CREATE_NEW_PROCESS_GROUP
                | EXTENDED_STARTUPINFO_PRESENT
            )
            startup_pointer = ctypes.cast(
                ctypes.byref(startup), ctypes.POINTER(self.STARTUPINFOW)
            )
            if not self._kernel32.CreateProcessW(
                str(executable),
                command_line,
                None,
                None,
                True,
                flags,
                None,
                str(cwd),
                startup_pointer,
                ctypes.byref(process_info),
            ):
                raise ProcessAdapterError("process_launch_failed") from self._winerror()
            created = CreatedProcess(
                pid=int(process_info.dwProcessId),
                process_handle=self._native_handle(process_info.hProcess),
                thread_handle=self._native_handle(process_info.hThread),
            )
            return created
        except ProcessAdapterError:
            raise
        except Exception as error:
            raise ProcessAdapterError("process_launch_failed") from error
        finally:
            if attribute_initialized:
                self._kernel32.DeleteProcThreadAttributeList(attribute_pointer)
            try:
                self.close_handle(nul_native)
            except Exception as error:
                cleanup_errors: list[Exception] = [error]
                if created is not None:
                    for handle in (created.thread_handle, created.process_handle):
                        try:
                            self.close_handle(handle)
                        except Exception as child_error:
                            cleanup_errors.append(child_error)
                cause: Exception = error
                if len(cleanup_errors) > 1:
                    cause = ExceptionGroup(
                        "process_launch_cleanup_failed", cleanup_errors
                    )
                raise ProcessAdapterError("process_close_failed") from cause


class WindowsProcessAdapter:
    def __init__(self, api: Win32ProcessApi) -> None:
        self._api = api

    def capture_current_identity(
        self,
        expected_executable: Path,
    ) -> InitiatingProcessIdentity:
        expected = _canonical_image(expected_executable)
        pid = self._api.current_process_id()
        handle = self._api.open_process(pid)
        if handle is None:
            raise ProcessAdapterError("process_open_failed")
        identity: InitiatingProcessIdentity | None = None
        primary_error: BaseException | None = None
        try:
            if _canonical_image(self._api.query_image(handle)) != expected:
                raise ProcessAdapterError("process_identity_mismatch")
            identity = InitiatingProcessIdentity(
                pid=pid,
                creation_token=_creation_token(self._api.creation_ticks(handle)),
            )
        except BaseException as error:
            primary_error = error
        try:
            self._api.close_handle(handle)
        except Exception as close_error:
            if primary_error is not None:
                raise BaseExceptionGroup(
                    "process_capture_and_close_failed",
                    [primary_error, ParentHandleCloseError()],
                ) from close_error
            raise ProcessAdapterError("process_close_failed") from close_error
        if primary_error is not None:
            raise primary_error
        if identity is None:
            raise ProcessAdapterError("process_query_failed")
        return identity

    def open_identity(
        self,
        identity: InitiatingProcessIdentity,
        expected_executable: Path,
    ) -> RetainedProcessHandle | None:
        if type(identity) is not InitiatingProcessIdentity:
            raise ProcessAdapterError("process_identity_mismatch")
        expected = _canonical_image(expected_executable)
        native_handle = self._api.open_process(identity.pid)
        if native_handle is None:
            return None
        owned = True
        try:
            actual_token = _creation_token(
                self._api.creation_ticks(native_handle)
            )
            actual_image = _canonical_image(self._api.query_image(native_handle))
            if actual_token != identity.creation_token or actual_image != expected:
                owned = False
                self._api.close_handle(native_handle)
                return None
            retained = RetainedProcessHandle(
                identity=identity,
                executable=expected_executable.resolve(strict=False),
                native_handle=native_handle,
            )
            owned = False
            return retained
        except Exception:
            if owned:
                self._api.close_handle(native_handle)
            raise

    def wait(
        self,
        handle: RetainedProcessHandle,
        timeout_seconds: float | None,
    ) -> bool:
        if type(handle) is not RetainedProcessHandle or handle.closed:
            raise ProcessAdapterError("process_wait_failed")
        if timeout_seconds is None:
            milliseconds = INFINITE
        elif (
            type(timeout_seconds) not in (int, float)
            or not math.isfinite(timeout_seconds)
            or timeout_seconds < 0
            or timeout_seconds * 1000 >= INFINITE
        ):
            raise ProcessAdapterError("invalid_process_timeout")
        else:
            milliseconds = math.ceil(timeout_seconds * 1000)
        result = self._api.wait(handle.native_handle, milliseconds)
        if result == WAIT_OBJECT_0:
            return True
        if result == WAIT_TIMEOUT:
            return False
        raise ProcessAdapterError("process_wait_failed")

    def close(self, handle: RetainedProcessHandle) -> None:
        if type(handle) is not RetainedProcessHandle:
            raise ProcessAdapterError("process_close_failed")
        if handle.closed:
            return
        self._api.close_handle(handle.native_handle)
        handle.closed = True

    def launch_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> InitiatingProcessIdentity:
        if (
            not isinstance(executable, Path)
            or not isinstance(cwd, Path)
            or not executable.is_absolute()
            or not cwd.is_absolute()
            or isinstance(args, (str, bytes))
            or any(type(value) is not str for value in args)
        ):
            raise ProcessAdapterError("invalid_process_path")
        try:
            executable = executable.resolve(strict=True)
            cwd = cwd.resolve(strict=True)
            transaction_id = parse_transaction_id(cwd.name)
            install_root = cwd.parent.parent.parent
            paths = TransactionPaths.for_install(install_root, transaction_id)
        except (OSError, JournalValidationError, ValueError) as error:
            raise ProcessAdapterError("invalid_process_path") from error
        if (
            cwd != paths.transaction_root
            or executable
            != (paths.updates_root / "recovery" / "dh_update_runner.exe")
        ):
            raise ProcessAdapterError("invalid_process_path")
        allowed_args = tuple(args) == ("--recover-active",)
        if not allowed_args and (
            len(args) == 4
            and args[0] == "--complete-update"
            and args[1] == transaction_id
        ):
            try:
                parse_cli_process_identity(args[2], args[3])
                allowed_args = True
            except ValueError:
                allowed_args = False
        if not allowed_args:
            raise ProcessAdapterError("invalid_process_path")
        created = self._api.create_detached(executable, args, cwd)
        identity: InitiatingProcessIdentity | None = None
        primary_error: BaseException | None = None
        try:
            identity = InitiatingProcessIdentity(
                pid=created.pid,
                creation_token=_creation_token(
                    self._api.creation_ticks(created.process_handle)
                ),
            )
        except BaseException as error:
            primary_error = error
        close_errors: list[BaseException] = []
        for native_handle in (created.thread_handle, created.process_handle):
            try:
                self._api.close_handle(native_handle)
            except Exception as error:
                close_errors.append(
                    ParentHandleCloseError().with_traceback(error.__traceback__)
                )
        if primary_error is not None and close_errors:
            raise _mark_process_launched(BaseExceptionGroup(
                "process_launch_and_close_failed",
                [primary_error, *close_errors],
            ))
        if primary_error is not None:
            raise _mark_process_launched(primary_error)
        if close_errors:
            raise _mark_process_launched(BaseExceptionGroup(
                "process_parent_handle_close_failed", close_errors
            ))
        if identity is None:
            raise ProcessAdapterError("process_launch_failed")
        return identity


def argv_to_command_line(
    argv: Sequence[str],
    *,
    quote_first: bool = False,
) -> str:
    if (
        not argv
        or isinstance(argv, (str, bytes))
        or any(type(value) is not str or not value for value in argv)
    ):
        raise ValueError("invalid_command_line")
    encoded = [subprocess.list2cmdline([value]) for value in argv]
    if quote_first:
        first = encoded[0]
        if not first.startswith('"'):
            encoded[0] = f'"{first}"'
    return " ".join(encoded)


def build_run_once_command() -> str:
    return argv_to_command_line(
        [RUNNER_ENV_PATH, "--recover-active"], quote_first=True
    )


def arm_run_once(store: RunOnceStore) -> str:
    expected = build_run_once_command()
    if len(expected) > RUN_ONCE_LIMIT:
        raise ValueError("run_once_command_too_long")
    store.write_expand_string(RUN_ONCE_VALUE_NAME, expected)
    if store.read(RUN_ONCE_VALUE_NAME) != ("REG_EXPAND_SZ", expected):
        store.delete(RUN_ONCE_VALUE_NAME)
        raise RuntimeError("run_once_round_trip_failed")
    return expected


class WindowsRunOnceStore:
    def write_expand_string(self, name: str, value: str) -> None:
        import winreg

        with winreg.CreateKeyEx(
            winreg.HKEY_CURRENT_USER,
            RUN_ONCE_KEY,
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE,
        ) as key:
            winreg.SetValueEx(key, name, 0, winreg.REG_EXPAND_SZ, value)

    def read(self, name: str) -> tuple[str, str] | None:
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                RUN_ONCE_KEY,
                0,
                winreg.KEY_QUERY_VALUE,
            ) as key:
                value, kind = winreg.QueryValueEx(key, name)
        except FileNotFoundError:
            return None
        type_name = (
            "REG_EXPAND_SZ" if kind == winreg.REG_EXPAND_SZ else "unexpected"
        )
        return type_name, value

    def delete(self, name: str) -> None:
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                RUN_ONCE_KEY,
                0,
                winreg.KEY_SET_VALUE,
            ) as key:
                winreg.DeleteValue(key, name)
        except FileNotFoundError:
            return
