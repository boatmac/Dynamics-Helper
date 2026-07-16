"""Regression tests for root-bound Copilot sessions.

These tests never launch Copilot. They lock the lifecycle rules that keep a
DH-created session anchored to Options.rootPath so a later CLI resume can
discover workspace skills, MCP config, and instructions from that directory.
"""

import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace
import json
import os
import tempfile

from copilot._jsonrpc import ProcessExitedError

import host.dh_native_host as dhm
from host.dh_native_host import NativeHost, PromptSnapshot


def make_snapshot(root_path: str | None, fingerprint: str = "v1:workspace"):
    return PromptSnapshot(
        mode="dh-specific",
        effective_root=root_path,
        core_bytes=b"CORE",
        core_text="CORE",
        selected_bytes=b"DH",
        selected_text="DH",
        fingerprint=fingerprint,
    )


def make_session_config(root_path: str) -> dict:
    return {
        "_effective_root": None,
        "_use_workspace_only": False,
        "working_directory": root_path,
    }


def initialize_prompt_state(host: NativeHost) -> None:
    host.current_prompt_fingerprint = None
    host.last_prompt_source_error = None


class TestClientWorkspaceInitialization(unittest.IsolatedAsyncioTestCase):
    def _host_shell(self, root_path: str, *, mock_refresh: bool = True):
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.client = None
        host.session = None
        host.root_path = None
        host.find_copilot_cli = MagicMock(return_value=None)
        host._get_session_config = MagicMock(
            return_value=make_session_config(root_path)
        )
        host._resolve_prompt_snapshot = MagicMock(
            return_value=make_snapshot(root_path)
        )
        if mock_refresh:
            host._refresh_session = AsyncMock(return_value=True)
        return host

    async def test_client_process_uses_configured_root(self):
        root_path = r"C:\My Workbench\MyCases"
        host = self._host_shell(root_path, mock_refresh=False)
        connection = object()
        client = MagicMock()
        client.start = AsyncMock()

        with (
            patch.object(
                dhm.RuntimeConnection, "for_stdio", return_value=connection
            ),
            patch.object(dhm, "CopilotClient", return_value=client) as client_cls,
        ):
            await host.initialize_sdk()

        client_cls.assert_called_once_with(
            connection=connection,
            working_directory=root_path,
        )

    async def test_initialization_does_not_create_generic_session(self):
        host = self._host_shell(r"C:\MyWorkbench\MyCases")
        client = MagicMock()
        client.start = AsyncMock()

        with (
            patch.object(dhm.RuntimeConnection, "for_stdio", return_value=object()),
            patch.object(dhm, "CopilotClient", return_value=client),
        ):
            await host.initialize_sdk()

        host._refresh_session.assert_not_awaited()

    async def test_initial_client_start_exception_does_not_log_raw_text(self):
        marker = "INITIAL-START-SECRET-MARKER /private/prompt"
        host = self._host_shell(r"C:\MyWorkbench\MyCases")
        client = MagicMock()
        client.start = AsyncMock(side_effect=RuntimeError(marker))

        with (
            patch.object(dhm.RuntimeConnection, "for_stdio", return_value=object()),
            patch.object(dhm, "CopilotClient", return_value=client),
            self.assertLogs("dh", level="INFO") as captured,
        ):
            await host.initialize_sdk()

        self.assertNotIn(marker, "\n".join(captured.output))
        self.assertIsNone(host.client)

    async def test_refresh_reinitializes_client_in_configured_root(self):
        root_path = r"C:\MyWorkbench\MyCases"
        host = self._host_shell(root_path, mock_refresh=False)
        host.last_session_error = None
        host.current_session_id = None
        host.current_case_id = None
        client = MagicMock()
        client.start = AsyncMock()
        client.create_session = AsyncMock(
            return_value=SimpleNamespace(session_id="generic-session")
        )

        with (
            patch.object(dhm.RuntimeConnection, "for_stdio", return_value=object()),
            patch.object(dhm, "CopilotClient", return_value=client) as client_cls,
        ):
            success = await host._refresh_session()

        self.assertTrue(success)
        client_cls.assert_called_once_with(
            connection=unittest.mock.ANY,
            working_directory=root_path,
        )

    async def test_oserror_retry_reinitializes_client_in_configured_root(self):
        root_path = r"C:\MyWorkbench\MyCases"
        host = self._host_shell(root_path, mock_refresh=False)
        host.last_session_error = None
        host.current_session_id = None
        host.current_case_id = None
        broken_client = MagicMock()
        broken_client.create_session = AsyncMock(side_effect=OSError("broken pipe"))
        host.client = broken_client
        replacement_client = MagicMock()
        replacement_client.start = AsyncMock()
        replacement_client.create_session = AsyncMock(
            return_value=SimpleNamespace(session_id="generic-session")
        )

        with (
            patch.object(dhm.RuntimeConnection, "for_stdio", return_value=object()),
            patch.object(
                dhm, "CopilotClient", return_value=replacement_client
            ) as client_cls,
        ):
            success = await host._refresh_session()

        self.assertTrue(success)
        client_cls.assert_called_once_with(
            connection=unittest.mock.ANY,
            working_directory=root_path,
        )

    async def test_refresh_restarts_client_when_configured_root_changes(self):
        root_path = r"C:\MyWorkbench\MyCases"
        host = self._host_shell(root_path, mock_refresh=False)
        old_client = MagicMock()
        old_client.stop = AsyncMock()
        host.client = old_client
        host.client_working_directory = r"C:\OldRoot"
        host.last_session_error = None
        host.current_session_id = None
        host.current_case_id = None
        host.current_session_root_path = r"C:\OldRoot"
        replacement_client = MagicMock()
        replacement_client.start = AsyncMock()
        replacement_client.create_session = AsyncMock(
            return_value=SimpleNamespace(session_id="generic-session")
        )

        with (
            patch.object(dhm.RuntimeConnection, "for_stdio", return_value=object()),
            patch.object(
                dhm, "CopilotClient", return_value=replacement_client
            ) as client_cls,
        ):
            success = await host._refresh_session()

        self.assertTrue(success)
        old_client.stop.assert_awaited_once()
        client_cls.assert_called_once_with(
            connection=unittest.mock.ANY,
            working_directory=root_path,
        )

    async def test_oserror_retry_failure_clears_replacement_client_state(self):
        root_path = r"C:\MyWorkbench\MyCases"
        host = self._host_shell(root_path, mock_refresh=False)
        host.last_session_error = None
        host.current_session_id = "stale-session"
        host.current_case_id = "2601190030003106"
        host.current_session_root_path = root_path
        host.current_prompt_fingerprint = "v1:stale"
        broken_client = MagicMock()
        broken_client.create_session = AsyncMock(side_effect=OSError("broken pipe"))
        host.client = broken_client
        host.client_working_directory = root_path
        replacement_client = MagicMock()
        replacement_client.start = AsyncMock()
        replacement_client.stop = AsyncMock()
        replacement_client.create_session = AsyncMock(
            side_effect=ProcessExitedError("retry process exited")
        )

        with (
            patch.object(dhm.RuntimeConnection, "for_stdio", return_value=object()),
            patch.object(dhm, "CopilotClient", return_value=replacement_client),
        ):
            success = await host._refresh_session(
                session_id="stale-session",
                case_id="2601190030003106",
            )

        self.assertFalse(success)
        replacement_client.stop.assert_awaited_once()
        self.assertIsNone(host.client)
        self.assertIsNone(host.client_working_directory)
        self.assertIsNone(host.session)
        self.assertIsNone(host.current_session_id)
        self.assertIsNone(host.current_case_id)
        self.assertIsNone(host.current_session_root_path)
        self.assertIsNone(host.current_prompt_fingerprint)


class TestSessionIdentityLifecycle(unittest.IsolatedAsyncioTestCase):
    async def test_resume_existing_session_overrides_persisted_cwd_with_root(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        root_path = r"C:\MyWorkbench\MyCases"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.client = MagicMock()
        host.client.resume_session = AsyncMock(
            return_value=SimpleNamespace(session_id=session_id)
        )
        host.session = None
        host.root_path = root_path
        host.client_working_directory = root_path
        host.current_session_id = None
        host.current_case_id = None
        host.current_session_root_path = None
        host.last_session_error = None
        host._get_session_config = MagicMock(
            return_value=make_session_config(root_path)
        )
        host._resolve_prompt_snapshot = MagicMock(
            return_value=make_snapshot(root_path)
        )

        success = await host._refresh_session(
            session_id=session_id,
            case_id=case_id,
        )

        self.assertTrue(success)
        _, kwargs = host.client.resume_session.await_args
        self.assertEqual(kwargs["working_directory"], root_path)
        self.assertEqual(host.current_session_root_path, root_path)

    async def test_analyze_root_override_is_not_replaced_by_disk_config(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        payload_root = r"C:\MyWorkbench\PayloadRoot"
        disk_root = r"C:\MyWorkbench\DiskRoot"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.client = MagicMock()
        host.client.resume_session = AsyncMock(
            return_value=SimpleNamespace(session_id=session_id)
        )
        host.session = None
        host.root_path = payload_root
        host.client_working_directory = payload_root
        host.current_session_id = None
        host.current_case_id = None
        host.current_session_root_path = None
        host.last_session_error = None
        host._get_session_config = MagicMock(
            side_effect=lambda *, root_path_override: make_session_config(
                root_path_override or os.getcwd()
            )
        )
        host._resolve_prompt_snapshot = MagicMock(
            return_value=make_snapshot(payload_root)
        )

        success = await host._refresh_session(
            session_id=session_id,
            case_id=case_id,
            working_directory_override=payload_root,
        )

        self.assertTrue(success)
        host._get_session_config.assert_called_once_with(
            root_path_override=payload_root
        )
        _, kwargs = host.client.resume_session.await_args
        self.assertEqual(kwargs["working_directory"], payload_root)
        self.assertEqual(host.current_session_root_path, payload_root)

    async def test_config_refresh_preserves_current_case_session(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.current_case_id = case_id
        host.current_session_id = session_id
        host.session = object()
        host._refresh_session = AsyncMock(return_value=True)

        result = await host.handle_update_config({})

        self.assertTrue(result["success"])
        host._refresh_session.assert_awaited_once_with(
            session_id=session_id,
            case_id=case_id,
        )

    async def test_refresh_failure_clears_stale_session_and_returns_error(self):
        case_id = "2601190030003106"
        root_path = r"C:\MyWorkbench\MyCases"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.current_case_id = "2601190030003105"
        host.current_session_id = "stale-session"
        host.current_prompt_fingerprint = "v1:stale"
        host.root_path = root_path
        host.session = object()
        host.client = object()
        host.last_session_error = "refresh Copilot session failed (RuntimeError)."
        host._refresh_session = AsyncMock(return_value=False)
        host.current_request_id = None
        host.send_progress = MagicMock()
        host.scrubber = MagicMock()
        host.scrubber.scrub.side_effect = lambda value: value
        config = make_session_config(root_path)
        snapshot = make_snapshot(root_path)
        host._get_session_config = MagicMock(return_value=config)
        host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)

        result = await host.handle_analyze_error(
            {
                "text": "error body",
                "caseNumber": case_id,
                "rootPath": root_path,
            }
        )

        self.assertEqual(result["status"], "error")
        self.assertEqual(
            result["error"],
            "refresh Copilot session failed (RuntimeError).",
        )
        self.assertIsNone(host.session)
        self.assertIsNone(host.current_session_id)
        self.assertIsNone(host.current_case_id)
        self.assertIsNone(host.current_prompt_fingerprint)

    async def test_missing_session_for_same_case_forces_refresh(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        root_path = r"C:\MyWorkbench\MyCases"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.current_case_id = case_id
        host.current_session_id = session_id
        host.current_session_root_path = root_path
        host.root_path = root_path
        host.session = None
        host.client = object()
        host._refresh_session = AsyncMock(return_value=True)
        config = make_session_config(root_path)
        snapshot = make_snapshot(root_path)
        host._get_session_config = MagicMock(return_value=config)
        host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)

        result = await host.handle_analyze_error(
            {
                "text": None,
                "caseNumber": case_id,
                "rootPath": root_path,
            }
        )

        self.assertEqual(result["error"], "No text provided for analysis.")
        host._refresh_session.assert_awaited_once_with(
            session_id=session_id,
            case_id=case_id,
            session_config=config,
            prompt_snapshot=snapshot,
        )

    async def test_session_root_mismatch_for_same_case_forces_refresh(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        root_path = r"C:\MyWorkbench\MyCases"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.current_case_id = case_id
        host.current_session_id = session_id
        host.current_session_root_path = r"C:\OldRoot"
        host.root_path = root_path
        host.session = object()
        host.client = object()
        host._refresh_session = AsyncMock(return_value=True)
        config = make_session_config(root_path)
        snapshot = make_snapshot(root_path)
        host._get_session_config = MagicMock(return_value=config)
        host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)

        result = await host.handle_analyze_error(
            {
                "text": None,
                "caseNumber": case_id,
                "rootPath": root_path,
            }
        )

        self.assertEqual(result["error"], "No text provided for analysis.")
        host._refresh_session.assert_awaited_once_with(
            session_id=session_id,
            case_id=case_id,
            session_config=config,
            prompt_snapshot=snapshot,
        )

    async def test_missing_root_payload_preserves_configured_root(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        root_path = r"C:\MyWorkbench\MyCases"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.current_case_id = case_id
        host.current_session_id = session_id
        host.current_session_root_path = root_path
        host.root_path = root_path
        host.session = object()
        host.client = object()
        host._refresh_session = AsyncMock(return_value=True)
        snapshot = make_snapshot(root_path)
        host.current_prompt_fingerprint = snapshot.fingerprint
        config = {
            **make_session_config(root_path),
            "_effective_root": root_path,
        }
        host._get_session_config = MagicMock(
            return_value=config
        )
        host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)
        host._validate_effective_root = MagicMock()

        result = await host.handle_analyze_error(
            {
                "text": None,
                "caseNumber": case_id,
                # Older extension payloads may omit rootPath entirely.
            }
        )

        self.assertEqual(result["error"], "No text provided for analysis.")
        self.assertEqual(host.root_path, root_path)
        host._get_session_config.assert_called_once_with()
        host._refresh_session.assert_not_awaited()

    async def test_empty_analyze_root_falls_back_to_host_config(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        configured_root = r"C:\MyWorkbench\MyCases"
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.current_case_id = case_id
        host.current_session_id = session_id
        host.current_session_root_path = configured_root
        host.root_path = configured_root
        host.session = object()
        host.client = object()
        host._refresh_session = AsyncMock(return_value=True)
        snapshot = make_snapshot(configured_root)
        host.current_prompt_fingerprint = snapshot.fingerprint
        host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)
        host._validate_effective_root = MagicMock()

        def load_config():
            host.root_path = configured_root
            return {
                **make_session_config(configured_root),
                "_effective_root": configured_root,
            }

        host._get_session_config = MagicMock(side_effect=load_config)

        result = await host.handle_analyze_error(
            {
                "text": None,
                "caseNumber": case_id,
                # FAB may send its pre-hydration default before prefs load.
                "rootPath": "",
            }
        )

        self.assertEqual(result["error"], "No text provided for analysis.")
        self.assertEqual(host.root_path, configured_root)
        host._get_session_config.assert_called_once_with()
        host._refresh_session.assert_not_awaited()

    async def test_session_not_found_retry_keeps_analyze_root_override(self):
        case_id = "2601190030003106"
        session_id = NativeHost._case_to_session_id(case_id)
        response_event = SimpleNamespace(
            type="assistant.message",
            data=SimpleNamespace(content="analysis complete"),
        )

        with tempfile.TemporaryDirectory() as root_path:
            host = NativeHost.__new__(NativeHost)
            initialize_prompt_state(host)
            host.current_case_id = case_id
            host.current_session_id = session_id
            host.current_session_root_path = root_path
            host.root_path = root_path
            host.session = MagicMock()
            original_session = host.session
            original_session.send_and_wait = AsyncMock(
                side_effect=Exception("Session not found")
            )
            replacement_session = MagicMock()
            replacement_session.send_and_wait = AsyncMock(
                return_value=response_event
            )
            host.client = MagicMock()
            host.client.get_auth_status = AsyncMock(
                return_value=SimpleNamespace(isAuthenticated=True)
            )
            async def refresh(**_kwargs):
                host.session = replacement_session
                return True

            host._refresh_session = AsyncMock(side_effect=refresh)
            config = {
                "_effective_root": root_path,
                "_use_workspace_only": False,
                "working_directory": root_path,
            }
            snapshot = make_snapshot(root_path)
            host.current_prompt_fingerprint = snapshot.fingerprint
            host._get_session_config = MagicMock(return_value=config)
            host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)
            host.current_request_id = None
            host.send_progress = MagicMock()
            host.scrubber = MagicMock()
            host.scrubber.scrub.side_effect = lambda value: value
            host.analyze_timeout_seconds = 60

            result = await host.handle_analyze_error(
                {
                    "text": "error body",
                    "context": "context",
                    "product": "General",
                    "caseNumber": case_id,
                    "rootPath": root_path,
                }
            )

        self.assertEqual(result["status"], "success")
        host._refresh_session.assert_awaited_once_with(
            session_id=session_id,
            case_id=case_id,
            session_config=config,
            prompt_snapshot=snapshot,
        )
        original_session.send_and_wait.assert_awaited_once()
        replacement_session.send_and_wait.assert_awaited_once()


class TestRootPathNormalization(unittest.TestCase):
    def test_empty_root_clears_previous_value(self):
        self.assertIsNone(NativeHost._normalize_root_path(""))
        self.assertIsNone(NativeHost._normalize_root_path(None))

    def test_nonempty_root_is_expanded_and_normalized(self):
        root = NativeHost._normalize_root_path(r"C:\MyWorkbench\MyCases\..\MyCases")
        self.assertEqual(root, r"C:\MyWorkbench\MyCases")

    def test_relative_root_is_rejected_not_resolved_under_host_cwd(self):
        with self.assertRaisesRegex(ValueError, "absolute path"):
            NativeHost._normalize_root_path("relative\\workspace")

    def test_config_empty_root_clears_previous_host_root(self):
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.root_path = r"C:\OldRoot"
        host.analyze_timeout_seconds = 1200
        host._decrypt_secrets_in_memory = MagicMock()

        with tempfile.TemporaryDirectory() as user_dir:
            with open(os.path.join(user_dir, "config.json"), "w", encoding="utf-8") as f:
                json.dump({"root_path": "", "extension_preferences": {}}, f)
            with patch.object(dhm, "USER_DATA_DIR", user_dir):
                config = host._get_session_config()

        self.assertIsNone(host.root_path)
        self.assertEqual(config["working_directory"], os.getcwd())

    def test_config_override_drives_workspace_discovery_not_disk_root(self):
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.root_path = None
        host.analyze_timeout_seconds = 1200
        host._decrypt_secrets_in_memory = MagicMock()

        with tempfile.TemporaryDirectory() as user_dir, tempfile.TemporaryDirectory() as base:
            disk_root = os.path.join(base, "disk-root")
            payload_root = os.path.join(base, "payload-root")
            os.makedirs(os.path.join(disk_root, ".github", "skills"))
            payload_skills = os.path.join(payload_root, ".github", "skills")
            os.makedirs(payload_skills)
            with open(os.path.join(user_dir, "config.json"), "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "root_path": disk_root,
                        "extension_preferences": {"use_workspace_only": True},
                    },
                    f,
                )
            with patch.object(dhm, "USER_DATA_DIR", user_dir):
                config = host._get_session_config(root_path_override=payload_root)

        self.assertEqual(host.root_path, os.path.normpath(payload_root))
        self.assertEqual(config["working_directory"], os.path.normpath(payload_root))
        self.assertEqual(config["skill_directories"], [os.path.normpath(payload_skills)])

    def test_corrupt_user_config_does_not_fallback_to_host_cwd(self):
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.root_path = None
        host.analyze_timeout_seconds = 1200
        host._decrypt_secrets_in_memory = MagicMock()

        with tempfile.TemporaryDirectory() as user_dir:
            with open(os.path.join(user_dir, "config.json"), "w", encoding="utf-8") as f:
                f.write("{not valid json")
            with patch.object(dhm, "USER_DATA_DIR", user_dir):
                with self.assertRaisesRegex(RuntimeError, "Failed to load config"):
                    host._get_session_config()

class TestResumeCommand(unittest.TestCase):
    def test_root_bound_resume_command_handles_spaces(self):
        command = NativeHost._build_resume_command(
            "ce0ec286-26e6-5095-8b30-46143e9f437f",
            r"C:\My Workbench\MyCases",
        )
        self.assertEqual(
            command,
            r"copilot -C 'C:\My Workbench\MyCases' "
            "--resume=ce0ec286-26e6-5095-8b30-46143e9f437f",
        )

    def test_resume_command_without_root_keeps_plain_fallback(self):
        command = NativeHost._build_resume_command(
            "ce0ec286-26e6-5095-8b30-46143e9f437f",
            None,
        )
        self.assertEqual(
            command,
            "copilot --resume=ce0ec286-26e6-5095-8b30-46143e9f437f",
        )

    def test_root_bound_resume_command_quotes_powershell_metacharacters(self):
        command = NativeHost._build_resume_command(
            "ce0ec286-26e6-5095-8b30-46143e9f437f",
            r"C:\Cases\$special & user's files",
        )
        self.assertEqual(
            command,
            "copilot -C 'C:\\Cases\\$special & user''s files' "
            "--resume=ce0ec286-26e6-5095-8b30-46143e9f437f",
        )

    def test_markdown_code_span_handles_backticks_in_path(self):
        command = "copilot -C 'C:\\Cases\\with`tick' --resume=session-id"
        rendered = NativeHost._markdown_code_span(command)
        self.assertEqual(rendered, f"``{command}``")


class TestHealthCheck(unittest.IsolatedAsyncioTestCase):
    async def test_started_client_without_case_session_is_healthy(self):
        host = NativeHost.__new__(NativeHost)
        initialize_prompt_state(host)
        host.client = object()
        host.session = None
        host.loop = None
        host.current_request_id = None
        host.send_progress = MagicMock()
        host.send_message = MagicMock()

        await host.process_message({"action": "health_check", "requestId": "req"})

        response = host.send_message.call_args.args[0]
        self.assertEqual(response["data"]["status"], "healthy")


if __name__ == "__main__":
    unittest.main()
