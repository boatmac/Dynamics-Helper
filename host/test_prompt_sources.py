import os
import tempfile
import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import host.dh_native_host as dhm
from host.dh_native_host import NativeHost, PromptSourceError


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
