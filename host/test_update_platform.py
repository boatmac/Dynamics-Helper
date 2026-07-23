import ctypes
import inspect
import json
import subprocess
import sys
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from install_integrity import UpdateProbeResult
from update_journal import InitiatingProcessIdentity, TransactionPaths
from update_platform import (
    CREATE_NEW_PROCESS_GROUP,
    DETACHED_PROCESS,
    EXTENDED_STARTUPINFO_PRESENT,
    INFINITE,
    PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
    RUNNER_ENV_PATH,
    RUN_ONCE_LIMIT,
    RUN_ONCE_VALUE_NAME,
    STARTF_USESTDHANDLES,
    WAIT_OBJECT_0,
    WAIT_TIMEOUT,
    CreatedProcess,
    CtypesWin32ProcessApi,
    ProcessAdapterError,
    SubprocessProbeAdapter,
    WindowsProcessAdapter,
    WindowsRunOnceStore,
    arm_run_once,
    argv_to_command_line,
    build_run_once_command,
    parse_cli_process_identity,
    parse_probe_process_result,
    validate_cli_process_identity_text,
)


TX_ID = "0123456789abcdef0123456789abcdef"
PROBE_SUCCESS = (
    b'{"capabilities":["prompt-scope-v1"],'
    b'"extension_version":"2.0.75",'
    b'"host_version":"2.0.75","status":"success"}\n'
)
PROBE_FAILURE = UpdateProbeResult(
    status="error", error_code="package_probe_failed"
)


class ProbeProcessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.installed_host = self.root / "dh_native_host.exe"
        self.installed_host.write_bytes(b"host")
        self.probe_manifest = self.root / "update-manifest.json"
        self.probe_manifest.write_bytes(b"{}\n")

    def test_exact_canonical_success_is_parsed(self):
        self.assertEqual(
            parse_probe_process_result(0, PROBE_SUCCESS),
            UpdateProbeResult(
                status="success",
                host_version="2.0.75",
                extension_version="2.0.75",
                capabilities=("prompt-scope-v1",),
            ),
        )

    def test_nonzero_malformed_or_extra_output_is_fixed_failure(self):
        cases = (
            (1, b'{"error_code":"package_probe_failed","status":"error"}\n'),
            (0, b"not-json\n"),
            (0, b'{"status":"success"}\nextra\n'),
            (0, b'{"status":"success","status":"success"}\n'),
            (True, PROBE_SUCCESS),
            (0, b"\xff\n"),
            (0, b'{"capabilities":[],"extension_version":"x","host_version":"x","status":NaN}\n'),
            (0, PROBE_SUCCESS[:-1]),
            (0, PROBE_SUCCESS + b"\n"),
        )
        for exit_code, stdout in cases:
            with self.subTest(exit_code=exit_code, stdout=stdout[:40]):
                self.assertEqual(
                    parse_probe_process_result(exit_code, stdout),
                    PROBE_FAILURE,
                )

    def test_wrong_keys_types_capabilities_and_canonical_bytes_fail(self):
        values = (
            {
                "status": "success",
                "host_version": "2.0.75",
                "extension_version": "2.0.75",
                "capabilities": ["prompt-scope-v1"],
                "extra": True,
            },
            {
                "status": "success",
                "host_version": "",
                "extension_version": "2.0.75",
                "capabilities": ["prompt-scope-v1"],
            },
            {
                "status": "success",
                "host_version": "2.0.75",
                "extension_version": 1,
                "capabilities": ["prompt-scope-v1"],
            },
            {
                "status": "success",
                "host_version": "2.0.75",
                "extension_version": "2.0.75",
                "capabilities": ["", "prompt-scope-v1"],
            },
            {
                "status": "success",
                "host_version": "2.0.75",
                "extension_version": "2.0.75",
                "capabilities": ["prompt-scope-v1", "prompt-scope-v1"],
            },
        )
        for value in values:
            raw = (
                json.dumps(
                    value,
                    ensure_ascii=True,
                    allow_nan=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                + "\n"
            ).encode("utf-8")
            with self.subTest(value=value):
                self.assertEqual(parse_probe_process_result(0, raw), PROBE_FAILURE)
        self.assertEqual(
            parse_probe_process_result(0, PROBE_SUCCESS.replace(b'"status"', b' "status"')),
            PROBE_FAILURE,
        )

    def test_oversize_and_wrong_argument_types_fail(self):
        self.assertEqual(
            parse_probe_process_result(0, b"x" * 65_537), PROBE_FAILURE
        )
        for exit_code, stdout in ((0, "text"), ("0", PROBE_SUCCESS), (0, bytearray())):
            with self.subTest(exit_code=exit_code, stdout_type=type(stdout)):
                self.assertEqual(
                    parse_probe_process_result(exit_code, stdout), PROBE_FAILURE
                )

    def test_probe_process_invokes_installed_host_with_absolute_manifest(self):
        with mock.patch("update_platform.subprocess.run") as run:
            run.return_value = SimpleNamespace(
                returncode=0,
                stdout=PROBE_SUCCESS,
                stderr=b"",
            )
            result = SubprocessProbeAdapter().run_probe(
                self.installed_host.resolve(),
                self.probe_manifest.resolve(),
            )
        self.assertEqual(result.status, "success")
        self.assertEqual(
            run.call_args.args[0],
            [
                str(self.installed_host.resolve()),
                "--update-probe",
                str(self.probe_manifest.resolve()),
            ],
        )
        self.assertTrue(run.call_args.kwargs["close_fds"])
        self.assertIs(run.call_args.kwargs["stdin"], subprocess.DEVNULL)
        self.assertEqual(
            run.call_args.kwargs["cwd"], self.installed_host.resolve().parent
        )
        self.assertFalse(run.call_args.kwargs["shell"])
        self.assertEqual(run.call_args.kwargs["timeout"], 30)

    def test_probe_timeout_oserror_or_relative_path_is_fixed_failure(self):
        for error in (subprocess.TimeoutExpired("probe", 30), OSError("private")):
            with self.subTest(error=type(error).__name__):
                with mock.patch(
                    "update_platform.subprocess.run", side_effect=error
                ):
                    self.assertEqual(
                        SubprocessProbeAdapter().run_probe(
                            self.installed_host.resolve(),
                            self.probe_manifest.resolve(),
                        ),
                        PROBE_FAILURE,
                    )
        with mock.patch("update_platform.subprocess.run") as run:
            self.assertEqual(
                SubprocessProbeAdapter().run_probe(
                    Path("relative.exe"), self.probe_manifest.resolve()
                ),
                PROBE_FAILURE,
            )
        run.assert_not_called()


@dataclass
class FakeProcess:
    pid: int
    creation_ticks: int
    image: Path
    native_handle: int
    exited: bool = False


class FakeWin32ProcessApi:
    def __init__(self):
        self.processes = {}
        self.handles = {}
        self.next_handle = 100
        self.current_pid = 41
        self.open_calls = []
        self.wait_calls = []
        self.closed_retained = []
        self.closed_created_handles = []
        self.created = None
        self.inherited_handles = (901,)
        self.nul_handle = 901
        self.wait_result = None
        self.query_error = None
        self.close_error_handles = set()
        self.close_attempts = []

    @property
    def open_handle_count(self):
        return len(self.handles)

    def add_process(self, pid, creation_ticks, image):
        process = FakeProcess(pid, creation_ticks, image.resolve(), self.next_handle)
        self.next_handle += 1
        self.processes[pid] = process
        return process

    def exit(self, process):
        process.exited = True

    def current_process_id(self):
        return self.current_pid

    def open_process(self, pid):
        self.open_calls.append(pid)
        process = self.processes.get(pid)
        if process is None:
            return None
        self.handles[process.native_handle] = process
        return process.native_handle

    def creation_ticks(self, handle):
        if handle in self.handles:
            return self.handles[handle].creation_ticks
        return self._created_process().creation_ticks

    def query_image(self, handle):
        if self.query_error:
            raise self.query_error
        return self.handles[handle].image

    def wait(self, handle, milliseconds):
        self.wait_calls.append((handle, milliseconds))
        if self.wait_result is not None:
            return self.wait_result
        return WAIT_OBJECT_0 if self.handles[handle].exited else WAIT_TIMEOUT

    def close_handle(self, handle):
        self.close_attempts.append(handle)
        if handle in self.close_error_handles:
            raise OSError("injected close failure")
        if self.created and handle in (
            self.created.thread_handle,
            self.created.process_handle,
        ):
            self.closed_created_handles.append(handle)
        else:
            self.closed_retained.append(handle)
        self.handles.pop(handle, None)

    def create_detached(self, executable, args, cwd):
        process = FakeProcess(77, 456, executable.resolve(), 701)
        self.handles[701] = process
        self.created = SimpleNamespace(
            pid=77,
            process_handle=701,
            thread_handle=702,
            executable=executable.resolve(),
            args=tuple(args),
            cwd=cwd.resolve(),
        )
        return CreatedProcess(77, 701, 702)

    def _created_process(self):
        if self.created is None:
            raise KeyError("no created process")
        return self.handles[self.created.process_handle]


class ProcessAdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.install = Path(self.temp.name) / "install"
        self.install.mkdir()
        self.host_executable = self.install / "dh_native_host.exe"
        self.host_executable.write_bytes(b"host")
        self.other_executable = self.install / "other.exe"
        self.other_executable.write_bytes(b"other")
        self.paths = TransactionPaths.for_install(self.install, TX_ID)
        self.paths.transaction_root.mkdir(parents=True)
        recovery = self.paths.updates_root / "recovery"
        recovery.mkdir()
        self.runner = recovery / "dh_update_runner.exe"
        self.runner.write_bytes(b"runner")
        self.api = FakeWin32ProcessApi()
        self.adapter = WindowsProcessAdapter(self.api)

    def test_retained_handle_defeats_pid_reuse(self):
        original = self.api.add_process(
            pid=41,
            creation_ticks=133801632000000000,
            image=self.host_executable,
        )
        identity = InitiatingProcessIdentity(
            pid=41,
            creation_token="win-create-time-133801632000000000",
        )
        handle = self.adapter.open_identity(identity, self.host_executable)
        self.assertIsNotNone(handle)
        self.api.exit(original)
        self.api.add_process(41, 133801632999999999, self.other_executable)
        self.assertTrue(self.adapter.wait(handle, None))
        self.assertEqual(handle.identity, identity)
        self.adapter.close(handle)
        self.adapter.close(handle)
        self.assertEqual(self.api.closed_retained, [original.native_handle])

    def test_token_or_image_mismatch_closes_and_returns_absent(self):
        process = self.api.add_process(41, 99, self.other_executable)
        identity = InitiatingProcessIdentity(41, "win-create-time-98")
        self.assertIsNone(
            self.adapter.open_identity(identity, self.host_executable)
        )
        self.assertEqual(self.api.closed_retained, [process.native_handle])
        self.assertEqual(self.api.open_handle_count, 0)

    def test_mismatch_close_failure_attempts_close_exactly_once(self):
        process = self.api.add_process(41, 99, self.other_executable)
        self.api.close_error_handles.add(process.native_handle)
        identity = InitiatingProcessIdentity(41, "win-create-time-98")
        with self.assertRaises(OSError):
            self.adapter.open_identity(identity, self.host_executable)
        self.assertEqual(self.api.close_attempts, [process.native_handle])

    def test_query_exception_closes_opened_handle_once(self):
        process = self.api.add_process(41, 99, self.host_executable)
        self.api.query_error = OSError("private query failure")
        with self.assertRaises(OSError):
            self.adapter.open_identity(
                InitiatingProcessIdentity(41, "win-create-time-99"),
                self.host_executable,
            )
        self.assertEqual(self.api.close_attempts, [process.native_handle])

    def test_capture_current_identity_closes_temporary_handle(self):
        process = self.api.add_process(41, 123, self.host_executable)
        self.assertEqual(
            self.adapter.capture_current_identity(self.host_executable),
            InitiatingProcessIdentity(41, "win-create-time-123"),
        )
        self.assertEqual(self.api.closed_retained, [process.native_handle])

    def test_open_absent_process_returns_none(self):
        self.assertIsNone(
            self.adapter.open_identity(
                InitiatingProcessIdentity(41, "win-create-time-1"),
                self.host_executable,
            )
        )

    def test_wait_timeout_does_not_reopen(self):
        self.api.add_process(41, 123, self.host_executable)
        handle = self.adapter.open_identity(
            InitiatingProcessIdentity(41, "win-create-time-123"),
            self.host_executable,
        )
        open_calls = list(self.api.open_calls)
        self.assertFalse(self.adapter.wait(handle, 0.001))
        self.assertEqual(self.api.open_calls, open_calls)
        self.assertEqual(self.api.wait_calls[-1][1], 1)

    def test_wait_failure_and_invalid_timeout_are_fixed(self):
        self.api.add_process(41, 123, self.host_executable)
        handle = self.adapter.open_identity(
            InitiatingProcessIdentity(41, "win-create-time-123"),
            self.host_executable,
        )
        self.api.wait_result = 0xFFFFFFFF
        with self.assertRaisesRegex(ProcessAdapterError, "^process_wait_failed$"):
            self.adapter.wait(handle, None)
        for value in (-1, float("inf"), True, INFINITE / 1000):
            with self.subTest(value=value):
                with self.assertRaisesRegex(
                    ProcessAdapterError, "^invalid_process_timeout$"
                ):
                    self.adapter.wait(handle, value)

    def test_detached_launch_closes_parent_thread_and_process_handles(self):
        identity = self.adapter.launch_detached(
            self.runner,
            ["--complete-update", TX_ID, "77", "win-create-time-123"],
            self.paths.transaction_root,
        )
        self.assertEqual(identity.creation_token, "win-create-time-456")
        self.assertEqual(
            self.api.closed_created_handles,
            [self.api.created.thread_handle, self.api.created.process_handle],
        )
        self.assertEqual(self.api.inherited_handles, (self.api.nul_handle,))
        self.assertEqual(self.api.created.cwd, self.paths.transaction_root.resolve())

    def test_launch_rejects_relative_wrong_cwd_or_bad_args(self):
        cases = (
            (Path("runner.exe"), ["--recover-active"], self.paths.transaction_root),
            (self.runner, ["--recover-active"], self.install),
            (self.runner, ["--unknown"], self.paths.transaction_root),
            (
                self.runner,
                ["--complete-update", TX_ID, "77", "bad-token"],
                self.paths.transaction_root,
            ),
        )
        for executable, args, cwd in cases:
            with self.subTest(executable=executable, args=args, cwd=cwd):
                with self.assertRaisesRegex(
                    ProcessAdapterError, "^invalid_process_path$"
                ):
                    self.adapter.launch_detached(executable, args, cwd)

    def test_no_public_method_accepts_pid_without_creation_token(self):
        signatures = (
            inspect.signature(self.adapter.capture_current_identity),
            inspect.signature(self.adapter.open_identity),
            inspect.signature(self.adapter.wait),
            inspect.signature(self.adapter.close),
            inspect.signature(self.adapter.launch_detached),
        )
        self.assertEqual(
            tuple(signatures[1].parameters),
            ("identity", "expected_executable"),
        )
        with self.assertRaisesRegex(
            ProcessAdapterError, "^process_identity_mismatch$"
        ):
            self.adapter.open_identity(41, self.host_executable)

    def test_cli_identity_text_is_strict_and_constructs_last(self):
        self.assertEqual(
            validate_cli_process_identity_text("41", "win-create-time-123"),
            (41, "win-create-time-123"),
        )
        self.assertEqual(
            parse_cli_process_identity("41", "win-create-time-123"),
            InitiatingProcessIdentity(41, "win-create-time-123"),
        )
        for pid, token in (
            (41, "win-create-time-123"),
            ("0", "win-create-time-123"),
            ("01", "win-create-time-123"),
            (str(0x100000000), "win-create-time-123"),
            ("41", "win-create-time-0"),
            ("41", "win-create-time-01"),
            ("41", object()),
        ):
            with self.subTest(pid=pid, token=token):
                with self.assertRaisesRegex(ValueError, "^invalid_process_identity$"):
                    validate_cli_process_identity_text(pid, token)


class FakeFunction:
    def __init__(self, implementation=None, result=1):
        self.implementation = implementation
        self.result = result
        self.calls = []
        self.argtypes = None
        self.restype = None

    def __call__(self, *args):
        self.calls.append(args)
        if self.implementation is not None:
            return self.implementation(*args)
        return self.result


class FakeKernel32:
    def __init__(self):
        self.attr_size = 128
        self.nul_handle = 901
        self.deleted_attributes = 0
        self.closed = []
        self.inherited_handles = None
        self.command_line_is_mutable = False
        self.application_name = None
        self.cwd = None
        self.creation_flags = None
        self.standard_handles = None
        self.fail_close_handles = set()
        self.security_attributes = None
        self.startup_cb = None
        self.startup_flags = None
        self.process_attributes = None
        self.thread_attributes = None

        self.OpenProcess = FakeFunction(result=501)
        self.GetCurrentProcessId = FakeFunction(result=41)
        self.GetProcessTimes = FakeFunction(self._get_process_times)
        self.QueryFullProcessImageNameW = FakeFunction(self._query_image)
        self.WaitForSingleObject = FakeFunction(result=WAIT_OBJECT_0)
        self.CloseHandle = FakeFunction(self._close_handle)
        self.CreateFileW = FakeFunction(result=self.nul_handle)
        self.InitializeProcThreadAttributeList = FakeFunction(self._initialize_attrs)
        self.UpdateProcThreadAttribute = FakeFunction(self._update_attrs)
        self.DeleteProcThreadAttributeList = FakeFunction(self._delete_attrs)
        self.CreateProcessW = FakeFunction(self._create_process)

    def _get_process_times(self, handle, creation, exit_time, kernel, user):
        target = ctypes.cast(creation, ctypes.POINTER(CtypesWin32ProcessApi.FILETIME))
        target.contents.dwLowDateTime = 123
        target.contents.dwHighDateTime = 1
        return 1

    def _query_image(self, handle, flags, buffer, size):
        value = "C:\\Program Files\\DynamicsHelper\\dh_native_host.exe"
        buffer.value = value
        ctypes.cast(size, ctypes.POINTER(ctypes.c_ulong)).contents.value = len(value)
        return 1

    def _close_handle(self, handle):
        self.closed.append(int(handle))
        if int(handle) in self.fail_close_handles:
            return 0
        return 1

    def _initialize_attrs(self, pointer, count, flags, size):
        size_pointer = ctypes.cast(size, ctypes.POINTER(ctypes.c_size_t))
        if not pointer:
            size_pointer.contents.value = self.attr_size
            return 0
        return 1

    def _update_attrs(
        self, pointer, flags, attribute, value, size, previous, return_size
    ):
        self.inherited_handles = (
            ctypes.cast(value, ctypes.POINTER(ctypes.c_void_p))[0],
        )
        self.attribute = int(attribute)
        return 1

    def _delete_attrs(self, pointer):
        self.deleted_attributes += 1

    def _create_process(
        self,
        application_name,
        command_line,
        process_attributes,
        thread_attributes,
        inherit_handles,
        creation_flags,
        environment,
        cwd,
        startup_pointer,
        process_info_pointer,
    ):
        self.application_name = application_name
        self.process_attributes = process_attributes
        self.thread_attributes = thread_attributes
        self.command_line_is_mutable = isinstance(command_line, ctypes.Array)
        self.command_line = command_line.value
        self.cwd = cwd
        self.creation_flags = int(creation_flags)
        self.inherit_handles = bool(inherit_handles)
        startup = ctypes.cast(
            startup_pointer,
            ctypes.POINTER(CtypesWin32ProcessApi.STARTUPINFOW),
        ).contents
        self.standard_handles = (
            startup.hStdInput,
            startup.hStdOutput,
            startup.hStdError,
        )
        self.startup_cb = startup.cb
        self.startup_flags = startup.dwFlags
        info = ctypes.cast(
            process_info_pointer,
            ctypes.POINTER(CtypesWin32ProcessApi.PROCESS_INFORMATION),
        ).contents
        info.dwProcessId = 77
        info.hProcess = 701
        info.hThread = 702
        return 1


class Win32ProcessApiTests(unittest.TestCase):
    def test_ctypes_signatures_and_required_win32_calls_are_present(self):
        kernel = FakeKernel32()
        CtypesWin32ProcessApi(kernel32=kernel)
        for name in (
            "OpenProcess",
            "GetCurrentProcessId",
            "GetProcessTimes",
            "QueryFullProcessImageNameW",
            "WaitForSingleObject",
            "CloseHandle",
            "CreateFileW",
            "InitializeProcThreadAttributeList",
            "UpdateProcThreadAttribute",
            "DeleteProcThreadAttributeList",
            "CreateProcessW",
        ):
            function = getattr(kernel, name)
            self.assertIsNotNone(function.argtypes, name)
            if name == "DeleteProcThreadAttributeList":
                self.assertIsNone(function.restype)
            else:
                self.assertIsNotNone(function.restype, name)
        source = Path("host/update_platform.py").read_text(encoding="utf-8")
        for name in (
            "CreateProcessW",
            "OpenProcess",
            "GetProcessTimes",
            "QueryFullProcessImageNameW",
            "WaitForSingleObject",
            "CloseHandle",
        ):
            self.assertIn(name, source)
        adapter_source = source.split("class WindowsProcessAdapter", 1)[1]
        self.assertNotIn("subprocess.Popen", adapter_source)

    def test_create_detached_uses_one_nul_allowlist_and_exact_flags(self):
        kernel = FakeKernel32()
        api = CtypesWin32ProcessApi(kernel32=kernel)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            executable = (root / "runner.exe").resolve()
            executable.write_bytes(b"runner")
            cwd = (root / "cwd").resolve()
            cwd.mkdir()
            with mock.patch(
                "update_platform.ctypes.get_last_error", return_value=122
            ):
                created = api.create_detached(
                    executable,
                    ["--recover-active"],
                    cwd,
                )
        self.assertEqual(created, CreatedProcess(77, 701, 702))
        self.assertEqual(kernel.inherited_handles, (kernel.nul_handle,))
        self.assertEqual(kernel.attribute, PROC_THREAD_ATTRIBUTE_HANDLE_LIST)
        self.assertEqual(
            kernel.creation_flags,
            DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | EXTENDED_STARTUPINFO_PRESENT,
        )
        self.assertTrue(kernel.inherit_handles)
        self.assertTrue(kernel.command_line_is_mutable)
        self.assertEqual(kernel.application_name, str(executable))
        self.assertEqual(
            kernel.command_line,
            subprocess.list2cmdline([str(executable), "--recover-active"]),
        )
        self.assertEqual(kernel.cwd, str(cwd))
        self.assertIsNone(kernel.process_attributes)
        self.assertIsNone(kernel.thread_attributes)
        self.assertEqual(
            kernel.startup_cb,
            ctypes.sizeof(CtypesWin32ProcessApi.STARTUPINFOEXW),
        )
        self.assertTrue(kernel.startup_flags & STARTF_USESTDHANDLES)
        self.assertEqual(
            tuple(int(value) for value in kernel.standard_handles),
            (kernel.nul_handle, kernel.nul_handle, kernel.nul_handle),
        )
        self.assertEqual(kernel.deleted_attributes, 1)
        self.assertEqual(kernel.closed, [kernel.nul_handle])
        self.assertEqual(len(kernel.InitializeProcThreadAttributeList.calls), 2)
        self.assertEqual(len(kernel.UpdateProcThreadAttribute.calls), 1)
        create_file_args = kernel.CreateFileW.calls[0]
        security = ctypes.cast(
            create_file_args[3],
            ctypes.POINTER(CtypesWin32ProcessApi.SECURITY_ATTRIBUTES),
        ).contents
        self.assertEqual(
            security.nLength,
            ctypes.sizeof(CtypesWin32ProcessApi.SECURITY_ATTRIBUTES),
        )
        self.assertFalse(security.lpSecurityDescriptor)
        self.assertTrue(security.bInheritHandle)

    def test_create_failure_closes_nul_and_attribute_list(self):
        kernel = FakeKernel32()
        kernel.CreateProcessW = FakeFunction(result=0)
        api = CtypesWin32ProcessApi(kernel32=kernel)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            executable = root / "runner.exe"
            executable.write_bytes(b"runner")
            cwd = root / "cwd"
            cwd.mkdir()
            errors = iter((122, 5))
            with mock.patch(
                "update_platform.ctypes.get_last_error",
                side_effect=lambda: next(errors),
            ):
                with self.assertRaisesRegex(
                    ProcessAdapterError, "^process_launch_failed$"
                ):
                    api.create_detached(executable.resolve(), [], cwd.resolve())
        self.assertEqual(kernel.deleted_attributes, 1)
        self.assertEqual(kernel.closed, [kernel.nul_handle])

    def test_nul_close_failure_after_create_closes_unreturned_child_handles(self):
        kernel = FakeKernel32()
        kernel.fail_close_handles.add(kernel.nul_handle)
        api = CtypesWin32ProcessApi(kernel32=kernel)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            executable = root / "runner.exe"
            executable.write_bytes(b"runner")
            cwd = root / "cwd"
            cwd.mkdir()
            with mock.patch(
                "update_platform.ctypes.get_last_error", return_value=122
            ):
                with self.assertRaisesRegex(
                    ProcessAdapterError, "^process_close_failed$"
                ):
                    api.create_detached(executable.resolve(), [], cwd.resolve())
        self.assertEqual(kernel.closed, [kernel.nul_handle, 702, 701])
        self.assertEqual(kernel.deleted_attributes, 1)

    def test_filetime_query_image_wait_and_close_wrappers(self):
        kernel = FakeKernel32()
        api = CtypesWin32ProcessApi(kernel32=kernel)
        self.assertEqual(api.current_process_id(), 41)
        self.assertEqual(api.open_process(41), 501)
        self.assertEqual(api.creation_ticks(501), (1 << 32) | 123)
        self.assertTrue(api.query_image(501).is_absolute())
        self.assertEqual(api.wait(501, 7), WAIT_OBJECT_0)
        api.close_handle(501)
        self.assertIn(501, kernel.closed)


class MemoryRunOnceStore:
    def __init__(self):
        self.values = {}
        self.writes = []
        self.deletes = []
        self.mismatch = False

    def write_expand_string(self, name, value):
        self.writes.append((name, value))
        self.values[name] = ("REG_EXPAND_SZ", value)

    def read(self, name):
        if self.mismatch and name in self.values:
            return "unexpected", self.values[name][1]
        return self.values.get(name)

    def delete(self, name):
        self.deletes.append(name)
        self.values.pop(name, None)


class RunOnceTests(unittest.TestCase):
    def test_exact_command_type_and_round_trip(self):
        store = MemoryRunOnceStore()
        expected = f'"{RUNNER_ENV_PATH}" --recover-active'
        self.assertEqual(build_run_once_command(), expected)
        self.assertEqual(arm_run_once(store), expected)
        self.assertEqual(
            store.values[RUN_ONCE_VALUE_NAME], ("REG_EXPAND_SZ", expected)
        )

    def test_stored_environment_text_is_not_expanded(self):
        store = MemoryRunOnceStore()
        with mock.patch.dict(
            "os.environ",
            {"LOCALAPPDATA": "C:\\Users\\测试 User\\App Data"},
        ):
            arm_run_once(store)
        self.assertIn("%LOCALAPPDATA%", store.values[RUN_ONCE_VALUE_NAME][1])
        self.assertNotIn("测试 User", store.values[RUN_ONCE_VALUE_NAME][1])

    def test_command_line_quoting_is_exact_and_rejects_invalid_argv(self):
        self.assertEqual(
            argv_to_command_line(["C:\\one two\\app.exe", "a b"]),
            '"C:\\one two\\app.exe" "a b"',
        )
        self.assertEqual(
            argv_to_command_line(["plain.exe", "arg"], quote_first=True),
            '"plain.exe" arg',
        )
        for argv in ((), ("",), (1,)):
            with self.subTest(argv=argv):
                with self.assertRaisesRegex(ValueError, "^invalid_command_line$"):
                    argv_to_command_line(argv)

    def test_260_bound_occurs_before_write(self):
        store = MemoryRunOnceStore()
        with mock.patch(
            "update_platform.build_run_once_command",
            return_value="x" * (RUN_ONCE_LIMIT + 1),
        ):
            with self.assertRaisesRegex(
                ValueError, "^run_once_command_too_long$"
            ):
                arm_run_once(store)
        self.assertEqual(store.writes, [])

    def test_readback_mismatch_deletes_value(self):
        store = MemoryRunOnceStore()
        store.mismatch = True
        with self.assertRaisesRegex(
            RuntimeError, "^run_once_round_trip_failed$"
        ):
            arm_run_once(store)
        self.assertNotIn(RUN_ONCE_VALUE_NAME, store.values)
        self.assertEqual(store.deletes, [RUN_ONCE_VALUE_NAME])

    def test_windows_store_is_lazy_hkcu_expand_sz_and_context_managed(self):
        from test_native_registration import FakeWinreg

        fake = FakeWinreg()
        fake.REG_EXPAND_SZ = 2
        fake.DeleteValue = lambda key, name: fake.values.pop(
            (key.subkey, name), None
        )
        original_set = fake.SetValueEx

        def set_value(key, name, reserved, kind, value):
            original_set(key, name, reserved, kind, value)
            fake.values[(key.subkey, name)] = (value, kind)

        fake.SetValueEx = set_value
        original_query = fake.QueryValueEx

        def query_value(key, name):
            if (key.subkey, name) in fake.values:
                return fake.values[(key.subkey, name)]
            return original_query(key, name)

        fake.QueryValueEx = query_value
        store = WindowsRunOnceStore()
        with mock.patch.dict(sys.modules, {"winreg": fake}):
            store.write_expand_string("name", "value")
            self.assertEqual(store.read("name"), ("REG_EXPAND_SZ", "value"))
            store.delete("name")
            store.delete("missing")
        self.assertEqual(fake.entered, fake.exited)
        self.assertEqual(
            {call[1] for call in fake.calls if call[0] in ("create", "open")},
            {fake.HKEY_CURRENT_USER},
        )
        source = Path("host/update_platform.py").read_text(encoding="utf-8")
        self.assertNotIn("HKEY_LOCAL_MACHINE", source)


if __name__ == "__main__":
    unittest.main()
