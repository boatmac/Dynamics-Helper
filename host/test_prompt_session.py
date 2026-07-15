import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

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


class TestPromptFingerprintLifecycle(
    PromptSessionFixture,
    unittest.IsolatedAsyncioTestCase,
):
    def setUp(self):
        super().setUp()
        self.host.session = MagicMock()
        self.host.session.send_and_wait = AsyncMock(
            return_value=SimpleNamespace(
                type="assistant.message",
                data=SimpleNamespace(content="analysis complete"),
            )
        )
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
        self.host._refresh_session = AsyncMock(return_value=True)
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

        async def refresh(**_kwargs):
            order.append("refresh")
            return True

        async def send(*_args, **_kwargs):
            order.append("send")
            return SimpleNamespace(
                type="assistant.message",
                data=SimpleNamespace(content="analysis complete"),
            )

        self.host._refresh_session.side_effect = refresh
        self.host.session.send_and_wait.side_effect = send
        result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["status"], "success")
        self.host._refresh_session.assert_awaited_once_with(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertEqual(order, ["refresh", "send"])

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

    async def test_session_not_found_retry_reuses_same_snapshot_object(self):
        response = SimpleNamespace(
            type="assistant.message",
            data=SimpleNamespace(content="analysis complete"),
        )
        self.host.current_prompt_fingerprint = self.snapshot.fingerprint
        self.host.session.send_and_wait.side_effect = [
            Exception("Session not found"),
            response,
        ]
        await self.host.handle_analyze_error(self.payload)
        call = self.host._refresh_session.await_args
        self.assertIs(call.kwargs["prompt_snapshot"], self.snapshot)
        self.assertIs(call.kwargs["session_config"], self.config)
        self.host._resolve_prompt_snapshot.assert_called_once_with(self.root, False)

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
