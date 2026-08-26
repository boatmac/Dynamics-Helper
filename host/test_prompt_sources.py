import copy
import os
import tempfile
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import host.dh_native_host as dhm
from host.dh_native_host import NativeHost, PromptSourceError


class _FailingTextWriter:
    def __init__(self, stream, failure_mode: str):
        self.stream = stream
        self.failure_mode = failure_mode

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.stream.close()
        if self.failure_mode == "exit" and exc_type is None:
            raise OSError("test close failure")
        return False

    def write(self, value: str):
        if self.failure_mode == "write":
            prefix_length = max(1, len(value) // 2)
            self.stream.write(value[:prefix_length])
            self.stream.flush()
            raise OSError("test partial write failure")
        return self.stream.write(value)


class PromptSourceFixture:
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = self.temp.name
        self.install_dir = os.path.join(self.base, "install")
        self.user_dir = os.path.join(self.base, "user")
        self.root = os.path.join(self.base, "root")
        os.makedirs(os.path.join(self.root, ".github"))
        os.makedirs(self.install_dir)
        os.makedirs(self.user_dir)
        self.core_path = os.path.join(self.install_dir, "system_prompt.md")
        self.dh_path = os.path.join(self.user_dir, "copilot-instructions.md")
        self.repo_path = os.path.join(
            self.root, ".github", "copilot-instructions.md"
        )
        self._write(self.core_path, b"CORE")
        self._write(self.dh_path, b"DH-SPECIFIC")
        self._write(self.repo_path, b"REPOSITORY")
        self.host = NativeHost.__new__(NativeHost)
        self.user_patch = patch.object(dhm, "USER_DATA_DIR", self.user_dir)
        self.install_patch = patch.object(
            NativeHost, "_get_install_dir", return_value=self.install_dir
        )
        self.user_patch.start()
        self.install_patch.start()
        self.host.current_case_id = None
        self.host.current_session_id = None
        self.host.current_session_root_path = None
        self.host.current_prompt_fingerprint = None
        self.host.last_session_error = None
        self.host.last_prompt_source_error = None
        self.host.session = None
        self.host.client = None
        self.host.root_path = None
        self.host.analyze_timeout_seconds = 1200
        self.host._decrypt_secrets_in_memory = MagicMock()
        self.host._encrypt_secrets_before_write = MagicMock()

    def tearDown(self):
        self.install_patch.stop()
        self.user_patch.stop()
        self.temp.cleanup()

    @staticmethod
    def _write(path: str, value: bytes) -> None:
        with open(path, "wb") as stream:
            stream.write(value)

    def _write_user_config(
        self,
        *,
        root: str | None = None,
        repository_only: bool = False,
    ) -> None:
        with open(
            os.path.join(self.user_dir, "config.json"),
            "w",
            encoding="utf-8",
        ) as stream:
            json.dump(
                {
                    "root_path": root or "",
                    "extension_preferences": {
                        "use_workspace_only": repository_only,
                    },
                },
                stream,
            )

    def _deny_open(self, denied_path: str):
        original_open = open
        normalized_denied = os.path.normcase(os.path.normpath(denied_path))

        def guarded_open(path, *args, **kwargs):
            normalized = os.path.normcase(os.path.normpath(os.fspath(path)))
            if normalized == normalized_denied:
                raise PermissionError("denied by test")
            return original_open(path, *args, **kwargs)

        return patch("builtins.open", side_effect=guarded_open)

    def _fail_text_writer(self, failed_path: str, failure_mode: str):
        original_open = open
        normalized_failed = os.path.normcase(os.path.normpath(failed_path))

        def guarded_open(path, *args, **kwargs):
            stream = original_open(path, *args, **kwargs)
            mode = args[0] if args else kwargs.get("mode", "r")
            normalized = os.path.normcase(os.path.normpath(os.fspath(path)))
            if normalized == normalized_failed and "w" in mode:
                return _FailingTextWriter(stream, failure_mode)
            return stream

        return patch("builtins.open", side_effect=guarded_open)


class TestPromptSourceSelection(PromptSourceFixture, unittest.TestCase):
    def test_PS_I2_empty_root_makes_repository_only_ineffective(self):
        snapshot = self.host._resolve_prompt_snapshot(None, True)
        self.assertEqual(snapshot.mode, "dh-specific")
        self.assertEqual(snapshot.selected_text, "DH-SPECIFIC")

    def test_PS_I3_dh_mode_selects_core_and_dh_only(self):
        snapshot = self.host._resolve_prompt_snapshot(self.root, False)
        message = self.host._build_system_message(snapshot, "session-id")
        self.assertIn("CORE", message["content"])
        self.assertIn("DH-SPECIFIC", message["content"])
        self.assertNotIn("REPOSITORY", message["content"])

    def test_PS_I4_repository_mode_selects_core_and_repository_only(self):
        snapshot = self.host._resolve_prompt_snapshot(self.root, True)
        message = self.host._build_system_message(snapshot, "session-id")
        self.assertIn("CORE", message["content"])
        self.assertIn("REPOSITORY", message["content"])
        self.assertNotIn("DH-SPECIFIC", message["content"])

    def test_PS_I5_editable_sources_never_coexist(self):
        for repository_only, expected, excluded in (
            (False, "DH-SPECIFIC", "REPOSITORY"),
            (True, "REPOSITORY", "DH-SPECIFIC"),
        ):
            with self.subTest(repository_only=repository_only):
                snapshot = self.host._resolve_prompt_snapshot(
                    self.root, repository_only
                )
                content = self.host._build_system_message(snapshot, None)["content"]
                self.assertIn(expected, content)
                self.assertNotIn(excluded, content)

    def test_unselected_source_is_not_opened(self):
        with self._deny_open(self.repo_path):
            dh_snapshot = self.host._resolve_prompt_snapshot(self.root, False)
        self.assertEqual(dh_snapshot.mode, "dh-specific")
        with self._deny_open(self.dh_path):
            repo_snapshot = self.host._resolve_prompt_snapshot(self.root, True)
        self.assertEqual(repo_snapshot.mode, "repository-only")

    def test_PS_I8_empty_repository_file_is_valid_core_only(self):
        self._write(self.repo_path, b"")
        snapshot = self.host._resolve_prompt_snapshot(self.root, True)
        self.assertEqual(snapshot.selected_text, "")
        self.assertEqual(
            self.host._build_system_message(snapshot, None)["content"],
            "CORE",
        )

    def test_PS_I12_snapshot_reads_selected_sources_once(self):
        original_open = open
        opened: list[str] = []

        def tracked_open(path, *args, **kwargs):
            opened.append(os.path.normcase(os.path.normpath(os.fspath(path))))
            return original_open(path, *args, **kwargs)

        with patch("builtins.open", side_effect=tracked_open):
            snapshot = self.host._resolve_prompt_snapshot(self.root, True)
            message = self.host._build_system_message(snapshot, "session-id")
        self.assertIn("REPOSITORY", message["content"])
        self.assertEqual(
            opened.count(os.path.normcase(os.path.normpath(self.core_path))),
            1,
        )
        self.assertEqual(
            opened.count(os.path.normcase(os.path.normpath(self.repo_path))),
            1,
        )
        self.assertNotIn(
            os.path.normcase(os.path.normpath(self.dh_path)),
            opened,
        )

    def test_snapshot_preserves_bom_crlf_and_trailing_whitespace(self):
        self._write(self.core_path, b"\xef\xbb\xbfCORE\r\n")
        self._write(self.repo_path, b"REPOSITORY  \r\n")
        snapshot = self.host._resolve_prompt_snapshot(self.root, True)
        self._write(self.repo_path, b"CHANGED")
        self.assertEqual(snapshot.core_bytes, b"\xef\xbb\xbfCORE\r\n")
        self.assertEqual(snapshot.selected_bytes, b"REPOSITORY  \r\n")
        self.assertTrue(snapshot.core_text.startswith("\ufeff"))
        self.assertTrue(snapshot.selected_text.endswith("  \r\n"))

    def test_PF_I1_fingerprint_frames_mode_core_and_selected_bytes(self):
        baseline = self.host._compute_prompt_fingerprint(
            "dh-specific", b"a", b"bc"
        )
        self.assertTrue(baseline.startswith("v1:"))
        self.assertNotEqual(
            baseline,
            self.host._compute_prompt_fingerprint("dh-specific", b"ab", b"c"),
        )
        self.assertNotEqual(
            baseline,
            self.host._compute_prompt_fingerprint("repository-only", b"a", b"bc"),
        )
        self.assertNotEqual(
            baseline,
            self.host._compute_prompt_fingerprint("dh-specific", b"a", b"bd"),
        )
        self.assertNotEqual(
            baseline,
            self.host._compute_prompt_fingerprint("dh-specific", b"z", b"bc"),
        )


class TestPromptSourceErrors(PromptSourceFixture, unittest.TestCase):
    def _assert_code(self, expected: str, call) -> None:
        with self.assertRaises(PromptSourceError) as raised:
            call()
        self.assertEqual(raised.exception.error_code, expected)
        self.assertNotIn(self.base, str(raised.exception))

    def test_PS_I6_missing_core_blocks_resolution(self):
        os.remove(self.core_path)
        self._assert_code(
            "dh_core_prompt_missing",
            lambda: self.host._resolve_prompt_snapshot(None, False),
        )

    def test_PS_I6_invalid_utf8_core_is_unreadable(self):
        self._write(self.core_path, b"\xff")
        self._assert_code(
            "dh_core_prompt_unreadable",
            lambda: self.host._resolve_prompt_snapshot(None, False),
        )

    def test_missing_dh_specific_is_valid_empty_content(self):
        os.remove(self.dh_path)
        snapshot = self.host._resolve_prompt_snapshot(None, False)
        self.assertEqual(snapshot.selected_bytes, b"")

    def test_PS_I11_invalid_utf8_dh_specific_is_unreadable(self):
        self._write(self.dh_path, b"\xff")
        self._assert_code(
            "dh_specific_instructions_unreadable",
            lambda: self.host._resolve_prompt_snapshot(None, False),
        )

    def test_PS_I7_missing_repository_does_not_fallback(self):
        os.remove(self.repo_path)
        self._assert_code(
            "repository_instructions_missing",
            lambda: self.host._resolve_prompt_snapshot(self.root, True),
        )

    def test_PS_I7_invalid_utf8_repository_is_unreadable(self):
        self._write(self.repo_path, b"\xff")
        self._assert_code(
            "repository_instructions_unreadable",
            lambda: self.host._resolve_prompt_snapshot(self.root, True),
        )

    def test_permission_errors_map_to_unreadable_codes(self):
        cases = (
            (
                self.core_path,
                "dh_core_prompt_unreadable",
                lambda: self.host._resolve_prompt_snapshot(None, False),
            ),
            (
                self.dh_path,
                "dh_specific_instructions_unreadable",
                lambda: self.host._resolve_prompt_snapshot(None, False),
            ),
            (
                self.repo_path,
                "repository_instructions_unreadable",
                lambda: self.host._resolve_prompt_snapshot(self.root, True),
            ),
        )
        for denied_path, expected_code, call in cases:
            with self.subTest(expected_code=expected_code):
                with self._deny_open(denied_path):
                    self._assert_code(expected_code, call)


class TestPromptConfigApi(
    PromptSourceFixture,
    unittest.IsolatedAsyncioTestCase,
):
    async def test_PS_I10_explicit_empty_truncates_file(self):
        with open(self.dh_path, "w", encoding="utf-8") as stream:
            stream.write("old")
        result = await self.host.handle_update_config(
            {"user_instructions": ""}
        )
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"")
        self.assertTrue(result["success"])

    async def test_PS_I10_empty_primary_ignores_legacy_alias(self):
        await self.host.handle_update_config(
            {"user_instructions": "", "system_instructions": "legacy"}
        )
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"")

    async def test_explicit_null_user_instructions_is_rejected_before_writes(self):
        self._write(self.dh_path, b"preserved instructions")
        self.host._write_user_config = MagicMock()
        self.host._write_utf8_text = MagicMock()

        result = await self.host.handle_update_config({
            "user_instructions": None,
            "config": {"extension_preferences": {"language": "zh"}},
        })

        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "user_instructions must be a string.",
        })
        self.host._write_user_config.assert_not_called()
        self.host._write_utf8_text.assert_not_called()
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"preserved instructions")

    async def test_absent_user_instructions_does_not_write_instruction_file(self):
        self._write(self.dh_path, b"preserved instructions")
        original_write = self.host._write_utf8_text
        self.host._write_utf8_text = MagicMock(wraps=original_write)

        result = await self.host.handle_update_config({})

        self.assertTrue(result["config_saved"])
        self.host._write_utf8_text.assert_not_called()
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"preserved instructions")

    async def test_missing_primary_uses_legacy_alias(self):
        await self.host.handle_update_config(
            {"system_instructions": "legacy"}
        )
        with open(self.dh_path, "r", encoding="utf-8") as stream:
            self.assertEqual(stream.read(), "legacy")

    async def test_saved_refresh_failure_returns_structured_prompt_error(self):
        self.host.current_case_id = "2601190030003106"
        self.host._refresh_session = AsyncMock(return_value=False)
        self.host.last_prompt_source_error = PromptSourceError(
            "repository_instructions_missing"
        )
        result = await self.host.handle_update_config({})
        self.assertEqual(result, {
            "success": False,
            "config_saved": True,
            "error_code": "repository_instructions_missing",
            "error": str(self.host.last_prompt_source_error),
        })

    def test_get_config_healthy_includes_prompt_status_and_raw_dh_text(self):
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(config["prompt_source_status"], {"status": "ok"})
        self.assertEqual(config["_user_instructions_raw"], "DH-SPECIFIC")

    def test_get_config_repository_missing_is_soft_health_error(self):
        os.remove(self.repo_path)
        self._write_user_config(root=self.root, repository_only=True)
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(
            config["prompt_source_status"]["error_code"],
            "repository_instructions_missing",
        )
        self.assertEqual(config["_user_instructions_raw"], "DH-SPECIFIC")

    def test_get_config_core_missing_keeps_readable_dh_editor_text(self):
        os.remove(self.core_path)
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(
            config["prompt_source_status"]["error_code"],
            "dh_core_prompt_missing",
        )
        self.assertEqual(config["_user_instructions_raw"], "DH-SPECIFIC")

    def test_get_config_unreadable_dh_omits_raw_field(self):
        self._write(self.dh_path, b"\xff")
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertNotIn("_user_instructions_raw", config)
        self.assertEqual(
            config["prompt_source_status"]["error_code"],
            "dh_specific_instructions_unreadable",
        )

    def test_get_config_unreadable_user_prompt_omits_value_and_reports_health(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"\xff\xfe")

        config = self.host._get_session_config(include_prompt_status=True)

        self.assertEqual(
            config["prompt_source_status"]["error_code"],
            "user_prompt_unreadable",
        )
        self.assertNotIn(
            "user_prompt",
            config.get("extension_preferences", {}),
        )

    async def test_unrelated_update_preserves_unreadable_user_prompt_bytes(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        original = b"\xff\xfeDO-NOT-TRUNCATE"
        self._write(prompt_path, original)

        result = await self.host.handle_update_config({
            "config": {
                "extension_preferences": {"language": "zh"},
            },
        })

        self.assertTrue(result["config_saved"])
        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), original)

    async def test_explicit_user_prompt_replacement_repairs_health(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"\xff")

        result = await self.host.handle_update_config({
            "user_prompt": "replacement prompt",
        })
        config = self.host._get_session_config(include_prompt_status=True)

        self.assertTrue(result["config_saved"])
        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), b"replacement prompt")
        self.assertEqual(config["prompt_source_status"], {"status": "ok"})
        self.assertEqual(
            config["extension_preferences"]["user_prompt"],
            "replacement prompt",
        )

    async def test_explicit_empty_user_prompt_clears_file(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"old prompt")

        result = await self.host.handle_update_config({"user_prompt": ""})

        self.assertTrue(result["config_saved"])
        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), b"")

    async def test_top_level_user_prompt_presence_wins_over_legacy_nested_value(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")

        await self.host.handle_update_config({
            "user_prompt": "",
            "config": {
                "extension_preferences": {"user_prompt": "legacy value"},
            },
        })

        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), b"")

    async def test_explicit_null_user_prompt_is_rejected_before_writes(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"preserved prompt")

        result = await self.host.handle_update_config({"user_prompt": None})

        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "user_prompt must be a string.",
        })
        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), b"preserved prompt")

    def test_get_config_missing_dh_specific_returns_raw_empty(self):
        os.remove(self.dh_path)
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(config["_user_instructions_raw"], "")

    def test_get_config_without_health_does_not_read_prompt_files(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"must not be read")
        original_read = self.host._read_prompt_source
        with (
            patch.object(
                self.host,
                "_get_prompt_source_config_fields",
            ) as inspect_health,
            patch.object(
                self.host,
                "_read_prompt_source",
                wraps=original_read,
            ) as read_source,
        ):
            self.host._get_session_config(include_prompt_status=False)
        inspect_health.assert_not_called()
        prompt_reads = [
            call for call in read_source.call_args_list
            if call.args and call.args[0] == prompt_path
        ]
        self.assertEqual(prompt_reads, [])

    def test_get_config_with_health_reads_user_prompt_once(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"options prompt")
        original_read = self.host._read_prompt_source
        with patch.object(
            self.host,
            "_read_prompt_source",
            wraps=original_read,
        ) as read_source:
            config = self.host._get_session_config(include_prompt_status=True)
        prompt_reads = [
            call for call in read_source.call_args_list
            if call.args and call.args[0] == prompt_path
        ]
        self.assertEqual(len(prompt_reads), 1)
        self.assertEqual(
            config["extension_preferences"]["user_prompt"],
            "options prompt",
        )

    async def test_config_write_failure_reports_not_saved_and_skips_refresh(self):
        self.host._encrypt_secrets_before_write = MagicMock(
            side_effect=dhm.secret_store.EncryptError("test failure")
        )
        self.host.current_case_id = "2601190030003106"
        self.host._refresh_session = AsyncMock()
        result = await self.host.handle_update_config({
            "config": {
                "extension_preferences": {"team_manifest_url": "secret"},
            },
        })
        self.assertEqual(result["success"], False)
        self.assertEqual(result["config_saved"], False)
        self.assertEqual(result["error"], "Configuration was not saved.")
        self.host._refresh_session.assert_not_awaited()

    async def test_config_failure_does_not_partially_write_prompt_files(self):
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        self._write(prompt_path, b"old prompt")
        self.host._encrypt_secrets_before_write = MagicMock(
            side_effect=dhm.secret_store.EncryptError("test failure")
        )
        result = await self.host.handle_update_config({
            "user_instructions": "new instructions",
            "user_prompt": "new prompt",
            "config": {
                "extension_preferences": {"team_manifest_url": "secret"},
            },
        })
        self.assertEqual(result["config_saved"], False)
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"DH-SPECIFIC")
        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), b"old prompt")

    async def test_late_prompt_write_failure_invalidates_after_config_saved(self):
        healthy_client = object()
        stale_session = object()
        self.host.client = healthy_client
        self.host.client_working_directory = self.root
        self.host.session = stale_session
        self.host.current_case_id = "2601190030003106"
        self.host.current_session_id = "stale-session"
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = "v1:stale"
        self.host._refresh_session = AsyncMock(return_value=True)

        with self._deny_open(self.dh_path):
            result = await self.host.handle_update_config({
                "config": {"root_path": self.root},
                "user_instructions": "new instructions",
            })

        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "Configuration was not saved.",
        })
        with open(
            os.path.join(self.user_dir, "config.json"),
            "r",
            encoding="utf-8",
        ) as stream:
            self.assertEqual(json.load(stream)["root_path"], self.root)
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"DH-SPECIFIC")
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_session_id)
        self.assertIsNone(self.host.current_case_id)
        self.assertIsNone(self.host.current_session_root_path)
        self.assertIsNone(self.host.current_prompt_fingerprint)
        self.assertIs(self.host.client, healthy_client)
        self.assertEqual(self.host.client_working_directory, self.root)
        self.host._refresh_session.assert_not_awaited()

    async def test_prompt_writer_failure_after_mutation_invalidates_attempt(self):
        for failure_mode in ("write", "exit"):
            with self.subTest(failure_mode=failure_mode):
                healthy_client = object()
                self._write(self.dh_path, b"old instructions")
                self.host.client = healthy_client
                self.host.client_working_directory = self.root
                self.host.session = object()
                self.host.current_case_id = "2601190030003106"
                self.host.current_session_id = "stale-session"
                self.host.current_session_root_path = self.root
                self.host.current_prompt_fingerprint = "v1:stale"
                self.host._refresh_session = AsyncMock(return_value=True)

                with self._fail_text_writer(self.dh_path, failure_mode):
                    result = await self.host.handle_update_config({
                        "user_instructions": "new instructions",
                    })

                self.assertEqual(result, {
                    "success": False,
                    "config_saved": False,
                    "error": "Configuration was not saved.",
                })
                with open(self.dh_path, "rb") as stream:
                    changed = stream.read()
                self.assertNotEqual(changed, b"old instructions")
                self.assertTrue(changed.startswith(b"new"))
                self.assertIsNone(self.host.session)
                self.assertIsNone(self.host.current_session_id)
                self.assertIsNone(self.host.current_case_id)
                self.assertIsNone(self.host.current_session_root_path)
                self.assertIsNone(self.host.current_prompt_fingerprint)
                self.assertIs(self.host.client, healthy_client)
                self.assertEqual(self.host.client_working_directory, self.root)
                self.host._refresh_session.assert_not_awaited()

    async def test_config_writer_close_failure_invalidates_attempt(self):
        config_path = os.path.join(self.user_dir, "config.json")
        original_config = b'{"preserved": true}\n'
        self._write(config_path, original_config)
        healthy_client = object()
        self.host.client = healthy_client
        self.host.client_working_directory = self.root
        self.host.session = object()
        self.host.current_case_id = "2601190030003106"
        self.host.current_session_id = "stale-session"
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = "v1:stale"
        self.host._refresh_session = AsyncMock(return_value=True)

        with self._fail_text_writer(config_path, "exit"):
            result = await self.host.handle_update_config({
                "config": {"root_path": self.root},
            })

        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "Configuration was not saved.",
        })
        with open(config_path, "r", encoding="utf-8") as stream:
            self.assertEqual(json.load(stream)["root_path"], self.root)
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_session_id)
        self.assertIsNone(self.host.current_case_id)
        self.assertIsNone(self.host.current_session_root_path)
        self.assertIsNone(self.host.current_prompt_fingerprint)
        self.assertIs(self.host.client, healthy_client)
        self.assertEqual(self.host.client_working_directory, self.root)
        self.host._refresh_session.assert_not_awaited()

    async def test_post_config_apply_failure_invalidates_after_durable_write(self):
        healthy_client = object()
        self.host.client = healthy_client
        self.host.client_working_directory = self.root
        self.host.session = object()
        self.host.current_case_id = "2601190030003106"
        self.host.current_session_id = "stale-session"
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = "v1:stale"
        self.host._refresh_session = AsyncMock(return_value=True)

        with patch.object(
            dhm,
            "_apply_log_level",
            side_effect=RuntimeError("test apply failure"),
        ):
            result = await self.host.handle_update_config({
                "config": {
                    "root_path": self.root,
                    "extension_preferences": {"log_level": "INFO"},
                },
            })

        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "Configuration was not saved.",
        })
        with open(
            os.path.join(self.user_dir, "config.json"),
            "r",
            encoding="utf-8",
        ) as stream:
            self.assertEqual(json.load(stream)["root_path"], self.root)
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_session_id)
        self.assertIsNone(self.host.current_case_id)
        self.assertIsNone(self.host.current_session_root_path)
        self.assertIsNone(self.host.current_prompt_fingerprint)
        self.assertIs(self.host.client, healthy_client)
        self.assertEqual(self.host.client_working_directory, self.root)
        self.host._refresh_session.assert_not_awaited()

    async def test_invalid_extension_preferences_is_rejected_before_writes(self):
        config_path = os.path.join(self.user_dir, "config.json")
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        original_config = b'{"preserved": true}\n'
        self._write(config_path, original_config)
        self._write(prompt_path, b"old prompt")
        healthy_client = object()
        stale_session = object()
        self.host.client = healthy_client
        self.host.client_working_directory = self.root
        self.host.session = stale_session
        self.host.current_case_id = "2601190030003106"
        self.host.current_session_id = "stale-session"
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = "v1:stale"
        self.host._refresh_session = AsyncMock(return_value=True)

        result = await self.host.handle_update_config({
            "config": {"extension_preferences": None},
            "user_instructions": "new instructions",
            "user_prompt": "new prompt",
        })

        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "Configuration was not saved.",
        })
        with open(config_path, "rb") as stream:
            self.assertEqual(stream.read(), original_config)
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"DH-SPECIFIC")
        with open(prompt_path, "rb") as stream:
            self.assertEqual(stream.read(), b"old prompt")
        self.assertIs(self.host.session, stale_session)
        self.assertEqual(self.host.current_session_id, "stale-session")
        self.assertEqual(self.host.current_case_id, "2601190030003106")
        self.assertEqual(self.host.current_session_root_path, self.root)
        self.assertEqual(self.host.current_prompt_fingerprint, "v1:stale")
        self.assertIs(self.host.client, healthy_client)
        self.assertEqual(self.host.client_working_directory, self.root)
        self.host._encrypt_secrets_before_write.assert_not_called()
        self.host._refresh_session.assert_not_awaited()

    async def test_invalid_skill_directories_is_rejected_before_writes(self):
        config_path = os.path.join(self.user_dir, "config.json")
        prompt_path = os.path.join(self.user_dir, "user_prompt.md")
        original_config = b'{"preserved": true}\n'
        for invalid_skills in ("not-a-list", [self.root, 42]):
            with self.subTest(invalid_skills=invalid_skills):
                self._write(config_path, original_config)
                self._write(self.dh_path, b"DH-SPECIFIC")
                self._write(prompt_path, b"old prompt")
                self.host.current_case_id = "2601190030003106"
                self.host._refresh_session = AsyncMock(return_value=True)

                result = await self.host.handle_update_config({
                    "config": {"skill_directories": invalid_skills},
                    "user_instructions": "new instructions",
                    "user_prompt": "new prompt",
                })

                self.assertEqual(result, {
                    "success": False,
                    "config_saved": False,
                    "error": "Configuration was not saved.",
                })
                with open(config_path, "rb") as stream:
                    self.assertEqual(stream.read(), original_config)
                with open(self.dh_path, "rb") as stream:
                    self.assertEqual(stream.read(), b"DH-SPECIFIC")
                with open(prompt_path, "rb") as stream:
                    self.assertEqual(stream.read(), b"old prompt")
                self.host._encrypt_secrets_before_write.assert_not_called()
                self.host._refresh_session.assert_not_awaited()
                self.host._encrypt_secrets_before_write.reset_mock()

    def test_write_user_config_encrypts_copy_without_mutating_input(self):
        incoming = {
            "extension_preferences": {
                "team_manifest_url": "https://example.test/secret",
                "log_level": "INFO",
            },
        }
        original = copy.deepcopy(incoming)
        self.host._encrypt_secrets_before_write = (
            NativeHost._encrypt_secrets_before_write.__get__(
                self.host,
                NativeHost,
            )
        )

        with patch.object(
            dhm.secret_store,
            "encrypt",
            return_value="DETERMINISTIC-BLOB",
        ) as encrypt:
            self.host._write_user_config(incoming)

        with open(
            os.path.join(self.user_dir, "config.json"),
            "r",
            encoding="utf-8",
        ) as stream:
            on_disk = json.load(stream)
        saved_ext = on_disk["extension_preferences"]
        self.assertNotIn("team_manifest_url", saved_ext)
        self.assertEqual(
            saved_ext["team_manifest_url_encrypted"],
            "DETERMINISTIC-BLOB",
        )
        self.assertEqual(incoming, original)
        encrypt.assert_called_once_with("https://example.test/secret")

    async def test_invalid_instruction_is_rejected_before_any_write(self):
        config_path = os.path.join(self.user_dir, "config.json")
        self._write(config_path, b'{"preserved": true}')
        result = await self.host.handle_update_config({
            "user_instructions": ["invalid"],
            "config": {"root_path": self.root},
        })
        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "user_instructions must be a string.",
        })
        with open(config_path, "rb") as stream:
            self.assertEqual(stream.read(), b'{"preserved": true}')
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"DH-SPECIFIC")

    async def test_invalid_prompt_is_rejected_before_instruction_write(self):
        result = await self.host.handle_update_config({
            "user_instructions": "new instructions",
            "config": {
                "extension_preferences": {"user_prompt": 42},
            },
        })
        self.assertEqual(result, {
            "success": False,
            "config_saved": False,
            "error": "user_prompt must be a string.",
        })
        with open(self.dh_path, "rb") as stream:
            self.assertEqual(stream.read(), b"DH-SPECIFIC")

    async def test_success_returns_structured_saved_result(self):
        result = await self.host.handle_update_config({})
        self.assertEqual(result, {
            "success": True,
            "config_saved": True,
            "message": "Configuration updated and session refreshed.",
        })

    async def test_non_prompt_refresh_failure_omits_error_code(self):
        self.host.current_case_id = "2601190030003106"
        self.host._refresh_session = AsyncMock(return_value=False)
        self.host.last_session_error = "private internal detail"
        result = await self.host.handle_update_config({})
        self.assertEqual(result, {
            "success": False,
            "config_saved": True,
            "error": "Configuration saved but session refresh failed.",
        })

    async def test_refresh_failure_keeps_successfully_saved_instruction(self):
        self.host.current_case_id = "2601190030003106"
        self.host.current_session_id = "stale-session"
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = "v1:stale"
        self.host.session = object()
        self.host._refresh_session = AsyncMock(return_value=False)
        self.host.last_prompt_source_error = PromptSourceError(
            "repository_instructions_missing"
        )
        result = await self.host.handle_update_config({
            "user_instructions": "saved instructions",
        })
        self.assertEqual(result["config_saved"], True)
        with open(self.dh_path, "r", encoding="utf-8") as stream:
            self.assertEqual(stream.read(), "saved instructions")
        self.assertIsNone(self.host.session)
        self.assertIsNone(self.host.current_session_id)
        self.assertIsNone(self.host.current_case_id)
        self.assertIsNone(self.host.current_session_root_path)
        self.assertIsNone(self.host.current_prompt_fingerprint)

    def test_soft_health_inspection_does_not_resolve_snapshot(self):
        with patch.object(
            self.host,
            "_resolve_prompt_snapshot",
            side_effect=AssertionError("strict resolver called"),
        ) as resolve:
            config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(config["prompt_source_status"], {"status": "ok"})
        resolve.assert_not_called()

    def test_soft_health_reports_missing_repository_under_missing_root(self):
        missing_root = os.path.join(self.base, "missing-root")
        self._write_user_config(root=missing_root, repository_only=True)
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(
            config["prompt_source_status"]["error_code"],
            "repository_instructions_missing",
        )

    async def test_get_config_dispatch_includes_soft_prompt_health(self):
        os.remove(self.repo_path)
        self._write_user_config(root=self.root, repository_only=True)
        self.host.send_message = MagicMock()
        await self.host.process_message({
            "action": "get_config",
            "requestId": "r1",
        })
        response = self.host.send_message.call_args.args[0]
        self.assertEqual(response["status"], "success")
        self.assertEqual(
            response["data"]["prompt_source_status"]["error_code"],
            "repository_instructions_missing",
        )
        self.assertEqual(
            response["data"]["_user_instructions_raw"],
            "DH-SPECIFIC",
        )

    def test_send_message_log_omits_prompt_values(self):
        marker = "DO-NOT-LOG-PROMPT-CONTENT"
        with self.assertLogs("dh", level="DEBUG") as captured:
            with patch.object(dhm, "NATIVE_STDOUT", MagicMock()):
                self.host.send_message({
                    "requestId": "r1",
                    "status": "success",
                    "data": {"_user_instructions_raw": marker},
                })
        self.assertNotIn(marker, "\n".join(captured.output))

    async def test_analyze_log_omits_text_and_context_contents(self):
        text_marker = "DO-NOT-LOG-SCRUBBED-PROMPT"
        context_marker = "DO-NOT-LOG-RAW-CONTEXT"
        case_id = "2601190030003106"
        session_id = self.host._case_to_session_id(case_id)
        snapshot = self.host._resolve_prompt_snapshot(self.root, False)
        self.host.root_path = self.root
        self.host.current_case_id = case_id
        self.host.current_session_id = session_id
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = snapshot.fingerprint
        self.host.current_request_id = None
        self.host.send_progress = MagicMock()
        self.host.scrubber = MagicMock()
        self.host.scrubber.scrub.side_effect = lambda value: value
        self.host._get_session_config = MagicMock(return_value={
            "_effective_root": self.root,
            "_use_workspace_only": False,
            "working_directory": self.root,
        })
        self.host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)
        self.host.client = MagicMock()
        self.host.client.get_auth_status = AsyncMock(
            return_value=SimpleNamespace(isAuthenticated=True)
        )
        self.host.session = MagicMock()
        self.host.session.send_and_wait = AsyncMock(
            return_value=SimpleNamespace(
                type="assistant.message",
                data=SimpleNamespace(content="analysis complete"),
            )
        )
        with self.assertLogs("dh", level="DEBUG") as captured:
            result = await self.host.handle_analyze_error({
                "text": text_marker,
                "context": context_marker,
                "product": "General",
                "caseNumber": case_id,
                "rootPath": self.root,
            })
        self.assertEqual(result["status"], "success")
        logs = "\n".join(captured.output)
        self.assertNotIn(text_marker, logs)
        self.assertNotIn(context_marker, logs)

    async def test_analyze_log_uses_short_prompt_fingerprint_prefixes(self):
        case_id = "2601190030003106"
        old_fingerprint = f"v1:{'a' * 64}"
        new_fingerprint = f"v1:{'b' * 64}"
        snapshot = dhm.PromptSnapshot(
            mode="dh-specific",
            effective_root=self.root,
            core_bytes=b"CORE",
            core_text="CORE",
            selected_bytes=b"DH-SPECIFIC",
            selected_text="DH-SPECIFIC",
            fingerprint=new_fingerprint,
        )
        self.host.root_path = self.root
        self.host.current_case_id = case_id
        self.host.current_session_id = self.host._case_to_session_id(case_id)
        self.host.current_session_root_path = self.root
        self.host.current_prompt_fingerprint = old_fingerprint
        self.host.session = object()
        self.host.client = object()
        self.host._get_session_config = MagicMock(return_value={
            "_effective_root": self.root,
            "_use_workspace_only": False,
            "working_directory": self.root,
        })
        self.host._resolve_prompt_snapshot = MagicMock(return_value=snapshot)
        self.host._refresh_session = AsyncMock(return_value=False)
        self.host.last_session_error = "test refresh failure"
        with self.assertLogs("dh", level="INFO") as captured:
            result = await self.host.handle_analyze_error({
                "text": "test",
                "caseNumber": case_id,
                "rootPath": self.root,
            })
        logs = "\n".join(captured.output)
        self.assertEqual(result["status"], "error")
        self.assertIn(old_fingerprint[:11], logs)
        self.assertIn(new_fingerprint[:11], logs)
        self.assertNotIn(old_fingerprint, logs)
        self.assertNotIn(new_fingerprint, logs)
