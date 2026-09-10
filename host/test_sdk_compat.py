"""Fixed offline SDK 1.0.13 contracts, imported only by the reviewed runner.

The runner verifies third-party bytes and prepares isolated profile directories
before importing this module. It must block downloads, process creation, network
I/O and native runtime loading BEFORE SDK import. Test-local mocks are regression
assertions, not that import-time safety boundary. No real Host is imported.

On Windows, dateutil.tz.win imports six.moves.winreg and calls ConnectRegistry
(None, HKEY_LOCAL_MACHINE), then OpenKey(handle, its NT Time Zones key). The
runner must provide synthetic handles with no-op Close() methods for those exact
calls and deny other registry operations. No timezone values or DLLs are needed.
The SDK imports ctypes/FFI declarations and third-party native dependencies;
those reviewed imports are not permission to load a Copilot native runtime.
The runner must also accommodate unittest's owned asyncio loop initialization
without granting test code network access.

Only request/stop at the transport boundary are mocked. SDK clients, sessions,
events, option responses and permission RPC serializers remain real. Host wiring
checks parse source with ast only; they are not Host runtime verification.
"""

import ast
import asyncio
import inspect
import json
import sys
import typing
import unittest
from importlib.metadata import version
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import copilot._cli_download as cli_download
from copilot import CopilotClient as SdkCopilotClient, RuntimeConnection
from copilot._jsonrpc import ProcessExitedError
from copilot.generated.rpc import SessionUpdateOptionsParams, SessionUpdateOptionsResult
from copilot.generated.session_events import (
    PermissionRequestMcp,
    PermissionRequestRead,
    PermissionRequestShell,
    SessionEvent,
)
from copilot.session import (
    CopilotSession,
    PermissionDecisionApproveOnce,
    PermissionDecisionUserNotAvailable,
    PermissionRequestResult,
    PreToolUseHookOutput,
)

from host.sdk_client import (
    CopilotClient,
    SessionOptionsPatchError,
    headless_permission_handler,
)


SESSION_ID = "ce0ec286-26e6-5095-8b30-46143e9f437f"
CLI_PATH = r"C:\sdk-offline-synthetic\NEVER-EXECUTE-copilot.cmd"
WORKING_DIRECTORY = r"C:\sdk-offline-synthetic\workspace"
SYSTEM_MESSAGE = {
    "mode": "append",
    "content": "Synthetic Core\r\nSynthetic Instructions\n"
    "## Session Info\nSession Name: " + SESSION_ID,
}


class TestSdkCompatibility(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.start_guard = self.enterContext(
            patch.object(
                SdkCopilotClient,
                "start",
                new=AsyncMock(side_effect=AssertionError("Offline tests must not start CLI")),
            )
        )
        self.download_guards = [
            self.enterContext(
                patch.object(
                    cli_download,
                    name,
                    side_effect=AssertionError("Offline tests must not download runtime"),
                )
            )
            for name in ("ensure_runtime_wrapper", "ensure_runtime_library")
        ]
        self.client = CopilotClient(
            connection=RuntimeConnection.for_stdio(path=CLI_PATH),
            working_directory=WORKING_DIRECTORY,
        )
        self.responses = {}
        self.failures = {}
        self.events_on_send = []
        self.observed_sessions = []
        self.transport = SimpleNamespace(
            request=AsyncMock(side_effect=self._request), stop=AsyncMock()
        )
        self.client._client = self.transport
        self.addAsyncCleanup(self.client.stop)

    def tearDown(self):
        self.start_guard.assert_not_called()
        for guard in self.download_guards:
            guard.assert_not_called()

    async def _request(self, method, params, **kwargs):
        if method == "session.options.update":
            self.observed_sessions.append(self.client._sessions[params["sessionId"]])
        if method in self.failures:
            raise self.failures[method]
        if method in self.responses:
            response = self.responses[method]
        elif method in ("session.create", "session.resume"):
            response = {"sessionId": params["sessionId"], "workspacePath": WORKING_DIRECTORY}
        elif method in (
            "session.options.update",
            "session.detach",
            "session.permissions.handlePendingPermissionRequest",
        ):
            response = {"success": True}
        elif method == "session.send":
            session = self.client._sessions[params["sessionId"]]
            for event in self.events_on_send:
                session._dispatch_event(event)
            response = {"messageId": "synthetic-message"}
        else:
            raise AssertionError("Unconfigured offline RPC: " + method)
        inline_callback = kwargs.get("on_response_inline")
        if inline_callback is not None:
            inline_callback(response)
        return response

    def _payloads(self, method):
        return [
            call.args[1]
            for call in self.transport.request.await_args_list
            if call.args[0] == method
        ]

    async def _open(self, method="create_session"):
        return await getattr(self.client, method)(
            session_id=SESSION_ID,
            on_permission_request=headless_permission_handler,
            skip_custom_instructions=True,
            system_message=dict(SYSTEM_MESSAGE),
            working_directory=WORKING_DIRECTORY,
            skill_directories=[WORKING_DIRECTORY + r"\skills"],
            mcp_servers={
                "synthetic": {
                    "type": "stdio",
                    "command": CLI_PATH,
                    "args": [],
                    "tools": ["*"],
                }
            },
            model="synthetic-model",
            reasoning_effort="high",
            context_tier="long_context",
        )

    def _assert_open_wire(self, session, method):
        self.assertIsInstance(session, CopilotSession)
        self.assertEqual(session.session_id, SESSION_ID)
        self.assertIs(self.client._sessions[SESSION_ID], session)
        payloads = self._payloads(method)
        self.assertEqual(len(payloads), 1)
        payload = payloads[0]
        for key, expected in (
            ("sessionId", SESSION_ID),
            ("workingDirectory", WORKING_DIRECTORY),
            ("systemMessage", SYSTEM_MESSAGE),
            ("skillDirectories", [WORKING_DIRECTORY + r"\skills"]),
            ("model", "synthetic-model"),
            ("reasoningEffort", "high"),
            ("contextTier", "long_context"),
        ):
            self.assertEqual(payload[key], expected, key)
        self.assertEqual(payload["mcpServers"]["synthetic"]["command"], CLI_PATH)
        self.assertEqual(
            self._payloads("session.options.update"),
            [{"sessionId": SESSION_ID, "skipCustomInstructions": True}],
        )
        self.assertEqual(
            [call.args[0] for call in self.transport.request.await_args_list],
            [method, "session.options.update"],
        )

    async def _assert_patch_rejected(self, method, *, detached=True):
        self.transport.request.reset_mock()
        self.observed_sessions.clear()
        original = SdkCopilotClient._apply_post_create_options_patch
        with patch.object(
            SdkCopilotClient,
            "_apply_post_create_options_patch",
            autospec=True,
            side_effect=original,
        ) as sdk_patch:
            with self.assertRaises(SessionOptionsPatchError):
                await self._open(method)
            sdk_patch.assert_awaited_once()
        self.assertEqual(self.client._sessions, {})
        self.assertEqual(
            [call.args[0] for call in self.transport.request.await_args_list],
            ["session." + method.removesuffix("_session"),
             "session.options.update", "session.detach"],
        )
        self.assertEqual(self._payloads("session.detach"), [{"sessionId": SESSION_ID}])
        self.assertEqual(len(self.observed_sessions), 1)
        if detached:
            session = self.observed_sessions[0]
            self.assertTrue(session._destroyed)
            self.assertEqual(len(session._event_handlers), 0)
            self.assertIsNone(session._permission_handler)
        # A failed detach is only an attempted cleanup, not proof of destruction.

    @staticmethod
    def _event(kind, data):
        return SessionEvent.from_dict(
            {"id": SESSION_ID, "timestamp": "2026-09-09T00:00:00Z", "type": kind, "data": data}
        )

    @staticmethod
    def _host_tree():
        source = Path(__file__).resolve().with_name("dh_native_host.py")
        return ast.parse(source.read_bytes(), filename=str(source))

    def test_imports_and_sdk_version(self):
        self.assertEqual(version("github-copilot-sdk"), "1.0.13")
        self.assertTrue(issubclass(CopilotClient, SdkCopilotClient))
        self.assertIsNot(CopilotClient, SdkCopilotClient)
        self.assertTrue(issubclass(SessionOptionsPatchError, Exception))
        self.assertTrue(issubclass(ProcessExitedError, Exception))
        self.assertIn(PermissionDecisionApproveOnce, typing.get_args(PermissionRequestResult))
        self.assertIn(PermissionDecisionUserNotAvailable, typing.get_args(PermissionRequestResult))
        self.assertEqual(PreToolUseHookOutput(permissionDecision="allow"), {"permissionDecision": "allow"})
        self.assertNotIn("host.dh_native_host", sys.modules)
        self.assertNotIn("dh_native_host", sys.modules)
        import ctypes
        import socket
        import subprocess
        for forbidden, args in (
            (subprocess.Popen, ([CLI_PATH],)),
            (socket.getaddrinfo, ("offline.invalid", 443)),
            (ctypes.CDLL, ("NEVER-LOAD-offline.dll",)),
        ):
            with self.assertRaises(PermissionError):
                forbidden(*args)
        from scripts import run_sdk_tests
        import sdk_safe_helper as safe
        root = Path(__file__).resolve().parents[1]
        review_hash, selected = run_sdk_tests.selection(safe, root)
        self.assertEqual(len(selected['test_ids']), 25)
        with self.assertRaises(ValueError):
            run_sdk_tests.selection(safe, root, '0' * 64)
        review = json.loads((root / run_sdk_tests.REVIEW).read_bytes())
        read_bytes = Path.read_bytes
        for field in ('hash', 'selection'):
            changed = json.loads(json.dumps(review))
            if field == 'hash':
                changed['sources']['host/sdk_client.py'] = '0' * 64
            else:
                changed['test_ids'] = changed['test_ids'][:-1]
            with patch.object(Path, 'read_bytes', autospec=True, side_effect=lambda path:
                              json.dumps(changed).encode() if path == root / run_sdk_tests.REVIEW else read_bytes(path)):
                with self.assertRaises(ValueError):
                    run_sdk_tests.selection(safe, root)

    def test_signatures_used_by_host(self):
        expected = {
            "session_id", "on_permission_request", "skip_custom_instructions",
            "system_message", "working_directory", "skill_directories", "mcp_servers",
            "model", "reasoning_effort", "context_tier", "hooks",
        }
        for name in ("create_session", "resume_session"):
            with self.subTest(method=name):
                self.assertTrue(expected.issubset(inspect.signature(getattr(SdkCopilotClient, name)).parameters))
                self.assertIs(getattr(CopilotClient, name), getattr(SdkCopilotClient, name))
        self.assertIn("path", inspect.signature(RuntimeConnection.for_stdio).parameters)
        self.assertIn("timeout", inspect.signature(CopilotSession.send_and_wait).parameters)

    def test_explicit_external_cli_does_not_download(self):
        self.assertEqual(self.client._connection.path, CLI_PATH)
        self.assertEqual(self.client._cli_path_source, "explicit")
        self.assertEqual(self.client._options.working_directory, WORKING_DIRECTORY)
        self.assertIsNone(self.client._cli_process)
        self.assertIsNone(self.client._ffi_host)
        self.transport.request.assert_not_called()

    async def test_create_serializes_host_options_once(self):
        self._assert_open_wire(await self._open(), "session.create")

    async def test_resume_serializes_host_options_once(self):
        self._assert_open_wire(await self._open("resume_session"), "session.resume")

    async def test_first_false_ack_rejects_create_and_resume(self):
        self.responses["session.options.update"] = {"success": False}
        for method in ("create_session", "resume_session"):
            with self.subTest(method=method):
                await self._assert_patch_rejected(method)

    async def test_first_options_rpc_error_rejects_create_and_resume(self):
        for error in (RuntimeError("synthetic rejection"), ProcessExitedError("synthetic exit")):
            self.failures["session.options.update"] = error
            for method in ("create_session", "resume_session"):
                with self.subTest(method=method, error=type(error).__name__):
                    await self._assert_patch_rejected(method)

    async def test_malformed_options_results_reject_create_and_resume(self):
        for response in ({}, None, [], {"success": None}, {"success": 1}, {"success": "true"}):
            self.responses["session.options.update"] = response
            for method in ("create_session", "resume_session"):
                with self.subTest(method=method, response=response):
                    await self._assert_patch_rejected(method)

    async def test_detach_error_or_timeout_preserves_patch_failure(self):
        self.responses["session.options.update"] = {"success": False}
        for error in (RuntimeError("synthetic detach failure"), TimeoutError("synthetic detach timeout")):
            self.failures["session.detach"] = error
            for method in ("create_session", "resume_session"):
                with self.subTest(method=method, error=type(error).__name__):
                    await self._assert_patch_rejected(method, detached=False)
        self.failures["session.detach"] = asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await self._open()
        self.assertEqual(self.client._sessions, {})

    async def test_options_timeout_rejects_create_and_resume(self):
        self.failures["session.options.update"] = TimeoutError("synthetic options timeout")
        for method in ("create_session", "resume_session"):
            with self.subTest(method=method):
                await self._assert_patch_rejected(method)

    async def test_first_patch_interceptor_does_not_wrap_later_updates(self):
        session = await self._open()
        self.responses["session.options.update"] = {"success": False}
        result = await session.rpc.options.update(SessionUpdateOptionsParams(skip_custom_instructions=True))
        self.assertIsInstance(result, SessionUpdateOptionsResult)
        self.assertIs(result.success, False)
        self.assertEqual(len(self._payloads("session.options.update")), 2)
        self.assertEqual(self._payloads("session.detach"), [])
        self.assertIs(self.client._sessions[SESSION_ID], session)

    async def _assert_permission_wire(self, request_type, payload):
        session = await self._open()
        for managed in (None, False, True):
            with self.subTest(managed=managed):
                raw = dict(payload)
                if managed is not None:
                    raw["managedApprovalRequired"] = managed
                request = request_type.from_dict(raw)
                decision = headless_permission_handler(request, {"session_id": SESSION_ID})
                if inspect.isawaitable(decision):
                    decision = await decision
                expected_type = PermissionDecisionUserNotAvailable if managed is True else PermissionDecisionApproveOnce
                self.assertIsInstance(decision, expected_type)
                self.transport.request.reset_mock()
                await session._execute_permission_and_respond("synthetic-request", request, headless_permission_handler)
                self.transport.request.assert_awaited_once_with(
                    "session.permissions.handlePendingPermissionRequest",
                    {
                        "sessionId": SESSION_ID,
                        "requestId": "synthetic-request",
                        "result": {"kind": "user-not-available" if managed is True else "approve-once"},
                    },
                )

    async def test_read_permission_ordinary_and_managed_wire(self):
        for invalid in (SimpleNamespace(), SimpleNamespace(managed_approval_required=1),
                        SimpleNamespace(managed_approval_required="true")):
            self.assertIsInstance(headless_permission_handler(invalid, {}), PermissionDecisionUserNotAvailable)
        await self._assert_permission_wire(
            PermissionRequestRead,
            {"kind": "read", "intention": "Synthetic read", "path": WORKING_DIRECTORY + r"\synthetic.txt"},
        )

    async def test_shell_permission_ordinary_and_managed_wire(self):
        await self._assert_permission_wire(
            PermissionRequestShell,
            {
                "kind": "shell", "canOfferSessionApproval": False, "commands": [],
                "fullCommandText": "synthetic-never-executed", "hasWriteFileRedirection": False,
                "intention": "Synthetic shell", "possiblePaths": [], "possibleUrls": [],
            },
        )

    async def test_mcp_permission_ordinary_and_managed_wire(self):
        await self._assert_permission_wire(
            PermissionRequestMcp,
            {
                "kind": "mcp", "readOnly": True, "serverName": "synthetic",
                "toolName": "synthetic_tool", "toolTitle": "Synthetic tool", "args": {},
            },
        )

    async def test_get_auth_status_uses_real_response_fields(self):
        for authenticated in (False, True):
            with self.subTest(authenticated=authenticated):
                self.transport.request.reset_mock()
                self.responses["auth.getStatus"] = {
                    "isAuthenticated": authenticated, "authType": "user",
                    "login": "synthetic-user", "statusMessage": "Synthetic status",
                }
                result = await self.client.get_auth_status()
                self.assertIs(result.isAuthenticated, authenticated)
                self.assertEqual(result.authType, "user")
                self.assertEqual(result.login, "synthetic-user")
                self.assertEqual(result.statusMessage, "Synthetic status")
                self.transport.request.assert_awaited_once_with("auth.getStatus", {})

    async def test_list_models_fields_used_by_host(self):
        self.responses["models.list"] = {"models": [{
            "id": "synthetic-model", "name": "Synthetic model", "capabilities": {},
            "supportedReasoningEfforts": ["low", "high", "max"], "defaultReasoningEffort": "high",
        }]}
        models = await self.client.list_models()
        self.assertEqual(len(models), 1)
        model = models[0]
        self.assertEqual(model.id, "synthetic-model")
        self.assertEqual(model.name, "Synthetic model")
        self.assertEqual(model.supported_reasoning_efforts, ["low", "high", "max"])
        self.assertEqual(model.default_reasoning_effort, "high")
        self.transport.request.assert_awaited_once_with("models.list", {})

    async def test_list_models_optional_efforts_absent(self):
        self.responses["models.list"] = {"models": [{"id": "plain", "name": "Plain", "capabilities": {}}]}
        model = (await self.client.list_models())[0]
        self.assertIsNone(model.supported_reasoning_efforts)
        self.assertIsNone(model.default_reasoning_effort)

    async def test_list_models_missing_required_id_rejected(self):
        self.responses["models.list"] = {"models": [{"name": "Invalid", "capabilities": {}}]}
        with self.assertRaises(ValueError):
            await self.client.list_models()

    async def test_send_and_wait_returns_last_assistant_and_unsubscribes(self):
        session = await self._open()
        first = self._event("assistant.message", {"content": "first", "messageId": "first"})
        last = self._event("assistant.message", {"content": "last", "messageId": "last"})
        self.events_on_send = [first, last, self._event("session.idle", {})]
        result = await session.send_and_wait("synthetic prompt", timeout=1)
        self.assertIs(result, last)
        self.assertEqual(result.data.content, "last")
        self.assertEqual(self._payloads("session.send"), [{"sessionId": SESSION_ID, "prompt": "synthetic prompt"}])
        self.assertEqual(len(session._event_handlers), 0)

    async def test_send_and_wait_idle_without_assistant_unsubscribes(self):
        session = await self._open()
        self.events_on_send = [self._event("session.idle", {})]
        self.assertIsNone(await session.send_and_wait("synthetic prompt", timeout=1))
        self.assertEqual(len(session._event_handlers), 0)

    async def test_send_and_wait_timeout_unsubscribes(self):
        session = await self._open()
        with self.assertRaises(TimeoutError):
            await session.send_and_wait("synthetic prompt", timeout=0)
        self.assertEqual(len(session._event_handlers), 0)
        self.assertEqual(len(self._payloads("session.send")), 1)

    async def test_stop_disconnects_session_and_reports_detach_failure(self):
        for fail_detach in (False, True):
            with self.subTest(fail_detach=fail_detach):
                self.client._client = self.transport
                self.transport.stop.reset_mock()
                session = await self._open()
                if fail_detach:
                    self.failures["session.detach"] = ProcessExitedError("synthetic exit")
                    with self.assertRaises(ExceptionGroup):
                        await self.client.stop()
                else:
                    await self.client.stop()
                    self.assertTrue(session._destroyed)
                self.assertEqual(self.client._sessions, {})
                self.assertIsNone(self.client._client)
                self.transport.stop.assert_awaited_once_with()

    async def test_stop_fixture_explicitly_cancels_and_awaits_owned_request(self):
        # This models fixture ownership, not real JsonRpcClient.stop semantics.
        entered = asyncio.Event()
        released = asyncio.Event()

        async def pending_request(method, params):
            self.assertEqual((method, params), ("synthetic.pending", {}))
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                released.set()

        self.transport.request.side_effect = pending_request
        task = asyncio.create_task(self.transport.request("synthetic.pending", {}))
        try:
            await asyncio.wait_for(entered.wait(), timeout=1)
            await self.client.stop()
            self.transport.stop.assert_awaited_once_with()
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        self.assertTrue(task.done())
        self.assertTrue(task.cancelled())
        self.assertTrue(released.is_set())

    def test_host_ast_uses_adapter_and_isolated_session_kwargs(self):
        tree = self._host_tree()
        adapter_imports = {
            alias.name
            for node in ast.walk(tree)
            if isinstance(node, ast.ImportFrom) and node.module in ("sdk_client", "host.sdk_client")
            for alias in node.names
        }
        self.assertTrue({"CopilotClient", "SessionOptionsPatchError", "headless_permission_handler"}.issubset(adapter_imports))
        self.assertFalse(any(
            isinstance(node, ast.ImportFrom) and node.module == "copilot"
            and any(alias.name == "CopilotClient" for alias in node.names)
            for node in ast.walk(tree)
        ))
        host = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "NativeHost")
        handler = next(node for node in host.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "_permission_handler")
        self.assertTrue(any(
            isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
            and node.func.id == "headless_permission_handler"
            for node in ast.walk(handler)
        ))
        refresh = next(node for node in host.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "_refresh_session")
        kwargs = next(
            node.value for node in ast.walk(refresh)
            if isinstance(node, ast.Assign)
            and any(isinstance(target, ast.Name) and target.id == "sdk_kwargs" for target in node.targets)
            and isinstance(node.value, ast.Dict)
        )
        fields = {key.value: value for key, value in zip(kwargs.keys, kwargs.values) if isinstance(key, ast.Constant)}
        self.assertIsInstance(fields["skip_custom_instructions"], ast.Constant)
        self.assertIs(fields["skip_custom_instructions"].value, True)
        self.assertEqual(ast.unparse(fields["on_permission_request"]), "self._permission_handler")
        self.assertIn("system_message", fields)

    def test_host_ast_patch_failure_is_terminal_for_resume_create_and_retry(self):
        tree = self._host_tree()
        host = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "NativeHost")
        refresh = next(node for node in host.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "_refresh_session")
        reject = next(node for node in host.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "_reject_session_options")
        self.assertTrue(any(
            isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            and node.func.attr == "_invalidate_active_session"
            and any(kw.arg == "clear_client" and isinstance(kw.value, ast.Constant)
                    and kw.value.value is True for kw in node.keywords)
            for node in ast.walk(reject)
        ))
        self.assertIsInstance(reject.body[-1], ast.Return)
        self.assertIsInstance(reject.body[-1].value, ast.Constant)
        self.assertIs(reject.body[-1].value.value, False)
        self.assertFalse(any(
            isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            and node.func.attr in ("create_session", "resume_session", "start")
            for node in ast.walk(reject)
        ))
        parents = {child: parent for parent in ast.walk(refresh) for child in ast.iter_child_nodes(parent)}
        calls = [
            node for node in ast.walk(refresh)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            and node.func.attr in ("create_session", "resume_session")
        ]
        self.assertEqual(sorted(node.func.attr for node in calls), ["create_session", "create_session", "resume_session"])
        for call in calls:
            with self.subTest(method=call.func.attr, line=call.lineno):
                self.assertTrue(any(kw.arg is None and isinstance(kw.value, ast.Name) and kw.value.id == "sdk_kwargs" for kw in call.keywords))
                owner = parents[call]
                while not isinstance(owner, ast.Try):
                    owner = parents[owner]
                handler = owner.handlers[0]
                self.assertIsInstance(handler.type, ast.Name)
                self.assertEqual(handler.type.id, "SessionOptionsPatchError")
                self.assertEqual(len(handler.body), 1)
                self.assertIsInstance(handler.body[-1], ast.Return)
                self.assertEqual(ast.unparse(handler.body[-1].value), "await self._reject_session_options()")
                cancellation = owner.handlers[1]
                self.assertEqual(ast.unparse(cancellation.type), "asyncio.CancelledError")
                self.assertTrue(any(
                    isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                    and node.func.attr == "_invalidate_active_session"
                    and any(kw.arg == "clear_client" and isinstance(kw.value, ast.Constant)
                            and kw.value.value is True for kw in node.keywords)
                    for node in ast.walk(cancellation)
                ))
                self.assertIsInstance(cancellation.body[-1], ast.Raise)
