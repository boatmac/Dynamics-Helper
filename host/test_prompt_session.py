import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from copilot._jsonrpc import ProcessExitedError

import host.dh_native_host as dhm
from host.dh_native_host import NativeHost, PromptSnapshot, PromptSourceError


def make_snapshot(
    *,
    mode: str = "dh-specific",
    fingerprint: str = "v1:candidate",
) -> PromptSnapshot:
    return PromptSnapshot(
        mode=mode,
        effective_root=None,
        core_bytes=b"CORE",
        core_text="CORE",
        selected_bytes=b"DH",
        selected_text="DH",
        fingerprint=fingerprint,
    )


class PromptSessionFixture:
    def setUp(self):
        self.case_id = "2601190030003106"
        self.session_id = NativeHost._case_to_session_id(self.case_id)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = os.path.normpath(self.temp.name)
        self.snapshot = PromptSnapshot(
            mode="dh-specific",
            effective_root=self.root,
            core_bytes=b"CORE",
            core_text="CORE",
            selected_bytes=b"DH",
            selected_text="DH",
            fingerprint="v1:candidate",
        )
        self.config = {
            "_effective_root": self.root,
            "_use_workspace_only": False,
            "working_directory": self.root,
            "skill_directories": [os.path.join(self.root, "skills")],
            "mcp_servers": {
                "fixture": {"type": "stdio", "command": "cmd", "args": []}
            },
            "model": "fixture-model",
            "reasoning_effort": "high",
            "context_tier": "long_context",
        }
        self.host = NativeHost.__new__(NativeHost)
        self.host.client = MagicMock()
        self.host.client.resume_session = AsyncMock(
            return_value=SimpleNamespace(session_id=self.session_id)
        )
        self.host.client.create_session = AsyncMock(
            return_value=SimpleNamespace(session_id=self.session_id)
        )
        self.host.client.stop = AsyncMock()
        self.host.session = None
        self.host.root_path = None
        self.host.client_working_directory = self.root
        self.host.current_session_id = None
        self.host.current_case_id = None
        self.host.current_session_root_path = None
        self.host.current_prompt_fingerprint = None
        self.host.last_session_error = None
        self.host.last_prompt_source_error = None
        self.host.find_copilot_cli = MagicMock(return_value=None)


class TestPromptSessionKwargs(
    PromptSessionFixture,
    unittest.IsolatedAsyncioTestCase,
):
    async def test_PS_I1_resume_sets_skip_custom_instructions_true(self):
        success = await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertTrue(success)
        _, kwargs = self.host.client.resume_session.await_args
        self.assertIs(kwargs["skip_custom_instructions"], True)

    async def test_PS_I1_create_fallback_keeps_skip_true(self):
        self.host.client.resume_session.side_effect = RuntimeError("not found")
        await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        kwargs = self.host.client.create_session.await_args.kwargs
        self.assertIs(kwargs["skip_custom_instructions"], True)

    async def test_PF_I6_resume_and_create_use_equal_prompt_kwargs(self):
        self.host.client.resume_session.side_effect = RuntimeError("not found")
        await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        resume_kwargs = self.host.client.resume_session.await_args.kwargs
        create_kwargs = dict(self.host.client.create_session.await_args.kwargs)
        self.assertEqual(create_kwargs.pop("session_id"), self.session_id)
        self.assertEqual(resume_kwargs, create_kwargs)

    async def test_PS_I1_oserror_retry_keeps_complete_prompt_kwargs(self):
        broken_client = self.host.client
        broken_client.resume_session.side_effect = AttributeError("no resume")
        broken_client.create_session.side_effect = OSError("broken pipe")
        broken_client.stop.side_effect = RuntimeError("already stopped")
        replacement = MagicMock()
        replacement.start = AsyncMock()
        replacement.create_session = AsyncMock(
            return_value=SimpleNamespace(session_id=self.session_id)
        )
        with (
            patch.object(
                NativeHost,
                "find_copilot_cli",
                return_value=None,
            ),
            patch("host.dh_native_host.RuntimeConnection.for_stdio"),
            patch("host.dh_native_host.CopilotClient", return_value=replacement),
        ):
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )
        self.assertTrue(success)
        broken_client.stop.assert_awaited_once()
        retry_kwargs = replacement.create_session.await_args.kwargs
        self.assertIs(retry_kwargs["skip_custom_instructions"], True)
        self.assertEqual(
            retry_kwargs["system_message"],
            NativeHost._build_system_message(self.snapshot, self.session_id),
        )
        self.assertEqual(retry_kwargs["session_id"], self.session_id)
        self.assertEqual(retry_kwargs["working_directory"], self.root)
        self.assertEqual(
            retry_kwargs["skill_directories"], self.config["skill_directories"]
        )
        self.assertEqual(retry_kwargs["mcp_servers"], self.config["mcp_servers"])
        self.assertEqual(retry_kwargs["model"], "fixture-model")
        self.assertEqual(retry_kwargs["reasoning_effort"], "high")
        self.assertEqual(retry_kwargs["context_tier"], "long_context")
        permission_handler = retry_kwargs["on_permission_request"]
        self.assertIs(permission_handler.__self__, self.host)
        self.assertIs(permission_handler.__func__, NativeHost._permission_handler)
        self.assertEqual(
            retry_kwargs["hooks"],
            {"on_pre_tool_use": self.host._pre_tool_use_hook},
        )

    async def test_process_exit_retry_keeps_equal_prompt_kwargs(self):
        broken_client = self.host.client
        broken_client.resume_session.side_effect = ProcessExitedError("CLI exited")
        replacement = MagicMock()
        replacement.start = AsyncMock()
        replacement.create_session = AsyncMock(
            return_value=SimpleNamespace(session_id=self.session_id)
        )
        with (
            patch("host.dh_native_host.RuntimeConnection.for_stdio"),
            patch("host.dh_native_host.CopilotClient", return_value=replacement),
        ):
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )

        self.assertTrue(success)
        broken_client.stop.assert_awaited_once()
        resume_kwargs = broken_client.resume_session.await_args.kwargs
        create_kwargs = dict(replacement.create_session.await_args.kwargs)
        self.assertEqual(create_kwargs.pop("session_id"), self.session_id)
        self.assertEqual(create_kwargs, resume_kwargs)

    async def test_retry_configuration_failure_retains_replacement_client(self):
        broken_client = self.host.client
        broken_client.resume_session.side_effect = AttributeError("no resume")
        broken_client.create_session.side_effect = OSError("broken pipe")
        replacement = MagicMock()
        replacement.start = AsyncMock()
        replacement.create_session = AsyncMock(
            side_effect=RuntimeError(
                "Model does not support reasoning effort configuration"
            )
        )
        with (
            patch("host.dh_native_host.RuntimeConnection.for_stdio"),
            patch("host.dh_native_host.CopilotClient", return_value=replacement),
        ):
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )

        self.assertFalse(success)
        broken_client.stop.assert_awaited_once()
        self.assertIs(self.host.client, replacement)
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_prompt_fingerprint)

    async def test_client_start_exception_never_exposes_raw_text(self):
        marker = "CLIENT-START-SECRET-MARKER /private/prompt"
        self.host.client = None
        replacement = MagicMock()
        replacement.start = AsyncMock(side_effect=RuntimeError(marker))
        with (
            patch("host.dh_native_host.RuntimeConnection.for_stdio"),
            patch("host.dh_native_host.CopilotClient", return_value=replacement),
            self.assertLogs("dh", level="INFO") as captured,
        ):
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )
        self.assertFalse(success)
        self.assertNotIn(marker, "\n".join(captured.output))
        self.assertNotIn(marker, self.host.last_session_error or "")

    async def test_resume_exception_never_exposes_raw_text(self):
        marker = "RESUME-SECRET-MARKER /private/prompt"
        self.host.client.resume_session.side_effect = RuntimeError(marker)
        with self.assertLogs("dh", level="INFO") as captured:
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )
        self.assertTrue(success)
        self.assertNotIn(marker, "\n".join(captured.output))

    async def test_create_exception_never_exposes_raw_text(self):
        marker = "CREATE-SECRET-MARKER /private/prompt"
        self.host.client.resume_session.side_effect = AttributeError("unsupported")
        self.host.client.create_session.side_effect = RuntimeError(marker)
        with self.assertLogs("dh", level="INFO") as captured:
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )
        self.assertFalse(success)
        observed = "\n".join(captured.output) + (self.host.last_session_error or "")
        self.assertNotIn(marker, observed)

    def test_permission_handler_never_logs_request_repr_or_secret_fields(self):
        marker = "PERMISSION-SECRET-MARKER /private/path command=https://secret"

        class SecretRequest:
            kind = marker
            tool_name = marker

            def __repr__(self):
                return f"SecretRequest({marker})"

        with self.assertLogs("dh", level="INFO") as captured:
            approval = self.host._permission_handler(SecretRequest(), object())

        self.assertIsNotNone(approval)
        self.assertNotIn(marker, "\n".join(captured.output))

    def test_pre_tool_hook_never_logs_arbitrary_tool_name(self):
        marker = "TOOL-NAME-SECRET-MARKER /private/path --token=secret"
        with self.assertLogs("dh", level="INFO") as captured:
            result = self.host._pre_tool_use_hook({"toolName": marker}, object())
        self.assertEqual(result["permissionDecision"], "allow")
        self.assertNotIn(marker, "\n".join(captured.output))

    async def test_retry_exception_never_exposes_raw_text(self):
        marker = "RETRY-SECRET-MARKER /private/prompt"
        self.host.client.resume_session.side_effect = AttributeError("unsupported")
        self.host.client.create_session.side_effect = OSError("broken pipe")
        replacement = MagicMock()
        replacement.start = AsyncMock()
        replacement.create_session = AsyncMock(side_effect=RuntimeError(marker))
        with (
            patch("host.dh_native_host.RuntimeConnection.for_stdio"),
            patch("host.dh_native_host.CopilotClient", return_value=replacement),
            self.assertLogs("dh", level="INFO") as captured,
        ):
            success = await self.host._refresh_session(
                session_id=self.session_id,
                case_id=self.case_id,
                session_config=self.config,
                prompt_snapshot=self.snapshot,
            )
        self.assertFalse(success)
        observed = "\n".join(captured.output) + (self.host.last_session_error or "")
        self.assertNotIn(marker, observed)


class TestPromptFingerprintLifecycle(
    PromptSessionFixture,
    unittest.IsolatedAsyncioTestCase,
):
    async def _install_replacement_session(self, **kwargs):
        self.host.session = self.replacement_session
        self.host.current_session_id = kwargs["session_id"]
        self.host.current_case_id = kwargs["case_id"]
        self.host.current_session_root_path = kwargs["session_config"][
            "working_directory"
        ]
        self.host.current_prompt_fingerprint = kwargs[
            "prompt_snapshot"
        ].fingerprint
        return True

    def setUp(self):
        super().setUp()
        self.active_session = MagicMock()
        self.active_session.send_and_wait = AsyncMock(
            return_value=SimpleNamespace(
                type="assistant.message",
                data=SimpleNamespace(content="analysis complete"),
            )
        )
        self.replacement_session = MagicMock()
        self.replacement_session.send_and_wait = AsyncMock(
            return_value=SimpleNamespace(
                type="assistant.message",
                data=SimpleNamespace(content="analysis complete"),
            )
        )
        self.host.session = self.active_session
        self.host.client.get_auth_status = AsyncMock(
            return_value=SimpleNamespace(isAuthenticated=True)
        )
        self.host.current_case_id = self.case_id
        self.host.current_session_id = self.session_id
        self.host.current_session_root_path = self.root
        self.host.root_path = self.root
        self.host.current_request_id = None
        self.host.send_progress = MagicMock()
        self.host.scrubber = MagicMock()
        self.host.scrubber.scrub.side_effect = lambda value: value
        self.host.analyze_timeout_seconds = 60
        self.host._get_session_config = MagicMock(return_value=self.config)
        self.host._resolve_prompt_snapshot = MagicMock(return_value=self.snapshot)
        self.host._refresh_session = AsyncMock(
            side_effect=self._install_replacement_session
        )
        self.payload = {
            "text": "CUSTOM-USER-PROMPT",
            "context": "context",
            "product": "General",
            "caseNumber": self.case_id,
            "rootPath": self.root,
        }

    async def test_PF_I2_unchanged_fingerprint_reuses_active_session(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["status"], "success")
        self.host._refresh_session.assert_not_awaited()
        self.host.session.send_and_wait.assert_awaited_once()

    async def test_PF_I3_changed_fingerprint_refreshes_before_send(self):
        self.host.current_prompt_fingerprint = "v1:old"
        order: list[str] = []

        async def refresh(**kwargs):
            order.append("refresh")
            return await self._install_replacement_session(**kwargs)

        async def send(*_args, **_kwargs):
            order.append("send")
            return SimpleNamespace(
                type="assistant.message",
                data=SimpleNamespace(content="analysis complete"),
            )

        self.host._refresh_session.side_effect = refresh
        self.replacement_session.send_and_wait.side_effect = send
        result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["status"], "success")
        self.host._refresh_session.assert_awaited_once_with(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertEqual(order, ["refresh", "send"])
        self.active_session.send_and_wait.assert_not_awaited()
        self.replacement_session.send_and_wait.assert_awaited_once()

    async def test_case_to_generic_refreshes_and_uses_replacement_session(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.payload["caseNumber"] = "invalid-case-id"

        result = await self.host.handle_analyze_error(self.payload)

        self.assertEqual(result["status"], "success")
        self.host._refresh_session.assert_awaited_once_with(
            session_id=None,
            case_id=None,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.active_session.send_and_wait.assert_not_awaited()
        self.replacement_session.send_and_wait.assert_awaited_once()
        sent_prompt = self.replacement_session.send_and_wait.await_args.args[0]
        self.assertIn("CUSTOM-USER-PROMPT", sent_prompt)

    async def test_PF_I5_resolution_failure_sends_no_turn(self):
        original_session = self.host.session
        self.host._resolve_prompt_snapshot.side_effect = PromptSourceError(
            "repository_instructions_missing"
        )
        result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["error_code"], "repository_instructions_missing")
        original_session.send_and_wait.assert_not_awaited()
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_prompt_fingerprint)

    async def test_PF_I4_resume_success_commits_candidate_fingerprint(self):
        self.host._refresh_session = NativeHost._refresh_session.__get__(
            self.host,
            NativeHost,
        )
        success = await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertTrue(success)
        self.assertEqual(
            self.host.current_prompt_fingerprint,
            self.snapshot.fingerprint,
        )

    async def test_PF_I4_failure_clears_prior_without_committing_candidate(self):
        self.host._refresh_session = NativeHost._refresh_session.__get__(
            self.host,
            NativeHost,
        )
        self.host.current_prompt_fingerprint = "v1:old"
        self.host.client.resume_session.side_effect = RuntimeError("not found")
        fingerprints_seen_during_create = []

        async def fail_create(**_kwargs):
            fingerprints_seen_during_create.append(
                self.host.current_prompt_fingerprint
            )
            raise RuntimeError("failed")

        self.host.client.create_session.side_effect = fail_create
        success = await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertFalse(success)
        self.assertEqual(fingerprints_seen_during_create, ["v1:old"])
        self.assertIsNone(self.host.current_prompt_fingerprint)
        self.assertNotEqual(
            self.host.current_prompt_fingerprint,
            self.snapshot.fingerprint,
        )

    async def test_mode_change_with_same_text_forces_refresh(self):
        repository_snapshot = PromptSnapshot(
            mode="repository-only",
            effective_root=self.root,
            core_bytes=self.snapshot.core_bytes,
            core_text=self.snapshot.core_text,
            selected_bytes=self.snapshot.selected_bytes,
            selected_text=self.snapshot.selected_text,
            fingerprint=NativeHost._compute_prompt_fingerprint(
                "repository-only",
                self.snapshot.core_bytes,
                self.snapshot.selected_bytes,
            ),
        )
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.host._resolve_prompt_snapshot.return_value = repository_snapshot
        await self.host.handle_analyze_error(self.payload)
        self.host._refresh_session.assert_awaited_once()
        self.active_session.send_and_wait.assert_not_awaited()
        self.replacement_session.send_and_wait.assert_awaited_once()

    async def test_PF_I4_create_fallback_commits_candidate_fingerprint(self):
        self.host._refresh_session = NativeHost._refresh_session.__get__(
            self.host,
            NativeHost,
        )
        self.host.client.resume_session.side_effect = RuntimeError("not found")
        success = await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertTrue(success)
        self.host.client.create_session.assert_awaited_once()
        self.assertEqual(
            self.host.current_prompt_fingerprint,
            self.snapshot.fingerprint,
        )

    async def test_core_change_forces_refresh(self):
        changed = PromptSnapshot(
            mode=self.snapshot.mode,
            effective_root=self.root,
            core_bytes=b"CHANGED-CORE",
            core_text="CHANGED-CORE",
            selected_bytes=self.snapshot.selected_bytes,
            selected_text=self.snapshot.selected_text,
            fingerprint=NativeHost._compute_prompt_fingerprint(
                self.snapshot.mode,
                b"CHANGED-CORE",
                self.snapshot.selected_bytes,
            ),
        )
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.host._resolve_prompt_snapshot.return_value = changed
        await self.host.handle_analyze_error(self.payload)
        self.host._refresh_session.assert_awaited_once()
        self.active_session.send_and_wait.assert_not_awaited()
        self.replacement_session.send_and_wait.assert_awaited_once()

    async def test_session_not_found_retry_reuses_same_snapshot_object(self):
        response = SimpleNamespace(
            type="assistant.message",
            data=SimpleNamespace(content="analysis complete"),
        )
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.active_session.send_and_wait.side_effect = Exception("Session not found")
        self.replacement_session.send_and_wait.return_value = response
        await self.host.handle_analyze_error(self.payload)
        call = self.host._refresh_session.await_args
        self.assertIs(call.kwargs["prompt_snapshot"], self.snapshot)
        self.assertIs(call.kwargs["session_config"], self.config)
        self.host._resolve_prompt_snapshot.assert_called_once_with(self.root, False)
        self.active_session.send_and_wait.assert_awaited_once()
        self.replacement_session.send_and_wait.assert_awaited_once()

    async def test_session_not_found_marker_is_inspected_but_never_observed(self):
        marker = "SESSION-NOT-FOUND-SECRET-MARKER /private/prompt"
        response = SimpleNamespace(
            type="assistant.message",
            data=SimpleNamespace(content="analysis complete"),
        )
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.active_session.send_and_wait.side_effect = Exception(
            f"Session not found -32603 {marker}"
        )
        self.replacement_session.send_and_wait.return_value = response

        with self.assertLogs("dh", level="INFO") as captured:
            result = await self.host.handle_analyze_error(self.payload)

        observed = str(result) + "\n".join(captured.output) + (self.host.last_session_error or "")
        for root, _dirs, files in os.walk(self.root):
            for filename in files:
                with open(os.path.join(root, filename), "r", encoding="utf-8") as stream:
                    observed += stream.read()
        self.assertNotIn(marker, observed)
        self.assertEqual(result["status"], "success")

    async def test_process_exit_clears_client_and_next_analyze_reinitializes(self):
        self.host._refresh_session = NativeHost._refresh_session.__get__(
            self.host,
            NativeHost,
        )
        self.host.current_prompt_fingerprint = "v1:old"
        dead_client = self.host.client
        dead_client.resume_session.side_effect = RuntimeError("not found")
        dead_client.create_session.side_effect = ProcessExitedError("CLI exited")
        dead_client.stop.side_effect = RuntimeError("process already exited")

        failed_restart = MagicMock()
        failed_restart.start = AsyncMock(
            side_effect=ProcessExitedError("restart exited")
        )
        healthy_client = MagicMock()
        healthy_client.start = AsyncMock()
        healthy_client.resume_session = AsyncMock(
            return_value=self.replacement_session
        )
        healthy_client.get_auth_status = AsyncMock(
            return_value=SimpleNamespace(isAuthenticated=True)
        )

        with (
            patch("host.dh_native_host.RuntimeConnection.for_stdio"),
            patch(
                "host.dh_native_host.CopilotClient",
                side_effect=[failed_restart, healthy_client],
            ) as client_class,
        ):
            first_result = await self.host.handle_analyze_error(self.payload)
            self.assertEqual(first_result["status"], "error")
            dead_client.stop.assert_awaited_once()
            self.assertIsNone(self.host.client)
            self.assertIsNone(self.host.session)
            self.assertIsNone(self.host.current_prompt_fingerprint)

            second_result = await self.host.handle_analyze_error(self.payload)

        self.assertEqual(second_result["status"], "success")
        self.assertEqual(client_class.call_count, 2)
        healthy_client.start.assert_awaited_once()
        healthy_client.resume_session.assert_awaited_once()
        self.active_session.send_and_wait.assert_not_awaited()
        self.replacement_session.send_and_wait.assert_awaited_once()

    async def test_send_process_exit_clears_all_active_session_state(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        marker = "SEND-TRANSPORT-SECRET-MARKER /private/prompt"
        self.active_session.send_and_wait.side_effect = ProcessExitedError(marker)
        dead_client = self.host.client
        stop_marker = "STOP-SECRET-MARKER /private/prompt"
        dead_client.stop.side_effect = RuntimeError(stop_marker)

        with self.assertLogs("dh", level="INFO") as captured:
            result = await self.host.handle_analyze_error(self.payload)

        self.assertEqual(
            result,
            {
                "status": "error",
                "error": "Copilot request failed (ProcessExitedError).",
            },
        )
        observed = str(result) + "\n".join(captured.output) + (self.host.last_session_error or "")
        self.assertNotIn(marker, observed)
        self.assertNotIn(stop_marker, observed)
        dead_client.stop.assert_awaited_once()
        self.assertIsNone(self.host.client)
        self.assertIsNone(self.host.client_working_directory)
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_session_id)
        self.assertIsNone(self.host.current_case_id)
        self.assertIsNone(self.host.current_session_root_path)
        self.assertIsNone(self.host.current_prompt_fingerprint)

    async def test_ordinary_send_error_retains_healthy_active_state(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        marker = "SEND-SECRET-MARKER /private/prompt"
        self.active_session.send_and_wait.side_effect = RuntimeError(marker)
        healthy_client = self.host.client

        with self.assertLogs("dh", level="INFO") as captured:
            result = await self.host.handle_analyze_error(self.payload)

        self.assertEqual(
            result,
            {"status": "error", "error": "Copilot request failed (RuntimeError)."},
        )
        observed = str(result) + "\n".join(captured.output) + (self.host.last_session_error or "")
        for root, _dirs, files in os.walk(self.root):
            for filename in files:
                with open(os.path.join(root, filename), "r", encoding="utf-8") as stream:
                    observed += stream.read()
        self.assertNotIn(marker, observed)
        healthy_client.stop.assert_not_awaited()
        self.assertIs(self.host.client, healthy_client)
        self.assertIs(self.host.session, self.active_session)
        self.assertEqual(self.host.current_session_id, self.session_id)
        self.assertEqual(self.host.current_case_id, self.case_id)
        self.assertEqual(self.host.current_session_root_path, self.root)
        self.assertEqual(
            self.host.current_prompt_fingerprint,
            self.snapshot.fingerprint,
        )

    async def test_configuration_failure_retains_healthy_client(self):
        self.host._refresh_session = NativeHost._refresh_session.__get__(
            self.host,
            NativeHost,
        )
        healthy_client = self.host.client
        healthy_client.resume_session.side_effect = RuntimeError("not found")
        healthy_client.create_session.side_effect = RuntimeError(
            "Model does not support reasoning effort configuration"
        )

        success = await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )

        self.assertFalse(success)
        self.assertIs(self.host.client, healthy_client)
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_prompt_fingerprint)

    async def test_PS_I9_custom_user_prompt_is_only_user_content(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        await self.host.handle_analyze_error(self.payload)
        sent_prompt = self.host.session.send_and_wait.await_args.args[0]
        system_message = NativeHost._build_system_message(
            self.snapshot,
            self.session_id,
        )["content"]
        self.assertIn("CUSTOM-USER-PROMPT", sent_prompt)
        self.assertNotIn("CUSTOM-USER-PROMPT", system_message)

    async def test_PS_I9_host_appends_canonical_file_prompt_when_payload_has_none(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.payload["text"] = "CASE BODY"
        prompt_path = os.path.join(self.root, "user_prompt.md")
        with open(prompt_path, "w", encoding="utf-8", newline="") as stream:
            stream.write("HOST FILE PROMPT")
        with patch.object(dhm, "USER_DATA_DIR", self.root):
            await self.host.handle_analyze_error(self.payload)
        sent_prompt = self.host.session.send_and_wait.await_args.args[0]
        self.assertIn("CASE BODY\n\n## User Prompt\n\nHOST FILE PROMPT", sent_prompt)
        self.assertEqual(sent_prompt.count("HOST FILE PROMPT"), 1)

    async def test_PS_I9_file_prompt_is_the_user_turn_when_payload_text_is_empty(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.payload["text"] = None
        with open(os.path.join(self.root, "user_prompt.md"), "w", encoding="utf-8") as stream:
            stream.write("FILE-ONLY PROMPT")
        with patch.object(dhm, "USER_DATA_DIR", self.root):
            result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["status"], "success")
        sent_prompt = self.host.session.send_and_wait.await_args.args[0]
        self.assertTrue(sent_prompt.startswith("## User Prompt\n\nFILE-ONLY PROMPT"))
        self.assertEqual(sent_prompt.count("FILE-ONLY PROMPT"), 1)

    async def test_PS_I9_host_replaces_stale_and_duplicate_payload_sections(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.payload["text"] = (
            "CASE BODY\n\n## User Prompt\n\nSTALE ONE\n\n"
            "## User Prompt\n\nSTALE TWO"
        )
        with open(os.path.join(self.root, "user_prompt.md"), "w", encoding="utf-8") as stream:
            stream.write("CURRENT HOST PROMPT")
        with patch.object(dhm, "USER_DATA_DIR", self.root):
            await self.host.handle_analyze_error(self.payload)
        sent_prompt = self.host.session.send_and_wait.await_args.args[0]
        self.assertNotIn("STALE ONE", sent_prompt)
        self.assertNotIn("STALE TWO", sent_prompt)
        self.assertEqual(sent_prompt.count("## User Prompt"), 1)
        self.assertEqual(sent_prompt.count("CURRENT HOST PROMPT"), 1)

    async def test_PS_I9_empty_file_removes_stale_payload_prompt(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.payload["text"] = "CASE BODY\n\n## User Prompt\n\nSTALE"
        open(os.path.join(self.root, "user_prompt.md"), "w", encoding="utf-8").close()
        with patch.object(dhm, "USER_DATA_DIR", self.root):
            await self.host.handle_analyze_error(self.payload)
        sent_prompt = self.host.session.send_and_wait.await_args.args[0]
        self.assertIn("CASE BODY", sent_prompt)
        self.assertNotIn("## User Prompt", sent_prompt)
        self.assertNotIn("STALE", sent_prompt)

    async def test_PS_I9_final_prompt_is_scrubbed_and_reread_each_analyze(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        prompt_path = os.path.join(self.root, "user_prompt.md")
        observed: list[str] = []

        def scrub(value):
            observed.append(value)
            return value.replace("user@example.com", "[EMAIL]")

        self.host.scrubber.scrub.side_effect = scrub
        with open(prompt_path, "w", encoding="utf-8") as stream:
            stream.write("FIRST user@example.com")
        original_read = self.host._read_prompt_source
        with (
            patch.object(dhm, "USER_DATA_DIR", self.root),
            patch.object(
                self.host,
                "_read_prompt_source",
                wraps=original_read,
            ) as read_source,
        ):
            await self.host.handle_analyze_error(self.payload)
            first_prompt_reads = [
                call for call in read_source.call_args_list
                if call.args and call.args[0] == prompt_path
            ]
            self.assertEqual(len(first_prompt_reads), 1)
            with open(prompt_path, "w", encoding="utf-8") as stream:
                stream.write("SECOND user@example.com")
            await self.host.handle_analyze_error(self.payload)
            all_prompt_reads = [
                call for call in read_source.call_args_list
                if call.args and call.args[0] == prompt_path
            ]
            self.assertEqual(len(all_prompt_reads), 2)

        first_sent = self.active_session.send_and_wait.await_args_list[0].args[0]
        second_sent = self.active_session.send_and_wait.await_args_list[1].args[0]
        self.assertIn("FIRST [EMAIL]", first_sent)
        self.assertNotIn("SECOND", first_sent)
        self.assertIn("SECOND [EMAIL]", second_sent)
        self.assertNotIn("FIRST", second_sent)
        self.assertTrue(any("## User Prompt\n\nFIRST user@example.com" in value for value in observed))
        self.assertTrue(any("## User Prompt\n\nSECOND user@example.com" in value for value in observed))

    async def test_PS_I9_unreadable_prompt_blocks_send_without_path_or_content_logs(self):
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        marker = "USER-PROMPT-SECRET-MARKER"
        prompt_path = os.path.join(self.root, "user_prompt.md")
        with open(prompt_path, "wb") as stream:
            stream.write(b"\xff" + marker.encode("ascii"))
        with (
            patch.object(dhm, "USER_DATA_DIR", self.root),
            self.assertLogs("dh", level="ERROR") as captured,
        ):
            result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error_code"], "user_prompt_unreadable")
        self.active_session.send_and_wait.assert_not_awaited()
        observed_output = str(result) + "\n".join(captured.output)
        self.assertNotIn(marker, observed_output)
        self.assertNotIn(prompt_path, observed_output)

    async def test_response_diagnostics_never_log_or_report_raw_event_content(self):
        secret = "SDK-RESPONSE-SECRET-MARKER"

        class SecretData:
            content = None

            def __repr__(self):
                return f"SecretData({secret})"

        class SecretEvent:
            type = "assistant.message"
            data = SecretData()

            def __repr__(self):
                return f"SecretEvent({secret}, data={self.data!r})"

        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.active_session.send_and_wait.return_value = SecretEvent()

        with (
            patch("host.dh_native_host.logger.debug") as debug,
            patch("host.dh_native_host.logger.warning") as warning,
        ):
            result = await self.host.handle_analyze_error(self.payload)

        self.assertEqual(result["status"], "success")
        self.assertIn("No content received", result["data"]["markdown"])
        self.assertIn("event_type=assistant.message", result["data"]["markdown"])
        observable = "\n".join(
            [str(result), str(debug.call_args_list), str(warning.call_args_list)]
        )
        with open(result["data"]["saved_to"], encoding="utf-8") as report:
            observable += report.read()
        self.assertNotIn(secret, observable)

    async def test_response_metadata_logging_preserves_ordinary_model_output(self):
        output = "ordinary model output"
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.active_session.send_and_wait.return_value = SimpleNamespace(
            type="assistant.message",
            data=SimpleNamespace(content=output),
        )

        with patch("host.dh_native_host.logger.debug") as debug:
            result = await self.host.handle_analyze_error(self.payload)

        self.assertEqual(result["data"]["markdown"], output)
        logs = str(debug.call_args_list)
        self.assertIn("event_type=assistant.message", logs)
        self.assertIn(f"content_length={len(output)}", logs)
        self.assertNotIn(output, logs)

    async def test_unusable_absolute_root_fails_before_instruction_resolution(self):
        missing_root = os.path.join(self.root, "missing")
        original_session = self.host.session
        self.payload["rootPath"] = missing_root
        self.config = {
            **self.config,
            "_effective_root": missing_root,
            "_use_workspace_only": True,
            "working_directory": missing_root,
        }
        self.host._get_session_config.return_value = self.config
        self.host._resolve_prompt_snapshot.reset_mock()
        result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(
            result,
            {
                "status": "error",
                "error": "Configured Root Path does not exist or is not a directory.",
            },
        )
        self.host._resolve_prompt_snapshot.assert_not_called()
        original_session.send_and_wait.assert_not_awaited()
        self.assertIsNone(self.host.session)


if __name__ == "__main__":
    unittest.main()
