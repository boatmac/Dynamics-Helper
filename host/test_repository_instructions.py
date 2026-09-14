"""Offline filesystem contract; never imports Host or SDK."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from repository_instructions import read_repository_instructions


class RepositoryInstructionsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.agents = self.root / 'AGENTS.md'
        self.legacy = self.root / '.github' / 'copilot-instructions.md'
        self.legacy.parent.mkdir()
        self.legacy.write_bytes(b'LEGACY')

    def test_primary_wins_without_opening_legacy(self):
        self.agents.write_bytes(b'PRIMARY')
        original_open = open
        with patch('builtins.open', side_effect=original_open) as read:
            self.assertEqual(read_repository_instructions(str(self.root)), (b'PRIMARY', 'PRIMARY'))
        read.assert_called_once_with(self.agents, 'rb')

    def test_absent_primary_selects_legacy(self):
        original_open = open
        with patch('builtins.open', side_effect=original_open) as read:
            self.assertEqual(read_repository_instructions(str(self.root)), (b'LEGACY', 'LEGACY'))
        read.assert_called_once_with(self.legacy, 'rb')

    def test_empty_primary_does_not_fallback(self):
        self.agents.write_bytes(b'')
        self.assertEqual(read_repository_instructions(str(self.root)), (b'', ''))

    def test_exact_bytes_are_preserved(self):
        raw = b'\xef\xbb\xbfPRIMARY\r\n \t\n'
        self.agents.write_bytes(raw)
        self.assertEqual(read_repository_instructions(str(self.root)), (raw, raw.decode('utf-8')))

    def test_missing_both(self):
        self.legacy.unlink()
        with self.assertRaises(FileNotFoundError):
            read_repository_instructions(str(self.root))

    def test_invalid_utf8_does_not_fallback(self):
        for path in (self.agents, self.legacy):
            with self.subTest(entry=path.name):
                path.write_bytes(b'\xff')
                with self.assertRaises(UnicodeDecodeError):
                    read_repository_instructions(str(self.root))
                path.unlink()

    def test_directory_does_not_fallback(self):
        self.agents.mkdir()
        with self.assertRaises(OSError):
            read_repository_instructions(str(self.root))

    def test_access_error_does_not_fallback(self):
        self.agents.write_bytes(b'PRIMARY')
        with patch('builtins.open', side_effect=PermissionError('synthetic')) as read:
            with self.assertRaises(PermissionError):
                read_repository_instructions(str(self.root))
            read.assert_called_once_with(self.agents, 'rb')

    def test_broken_link_or_disappearing_selected_entry_is_unreadable(self):
        self.agents.write_bytes(b'PRIMARY')
        with patch('builtins.open', side_effect=FileNotFoundError('synthetic')) as read:
            with self.assertRaises(OSError) as caught:
                read_repository_instructions(str(self.root))
            read.assert_called_once_with(self.agents, 'rb')
        self.assertNotIsInstance(caught.exception, FileNotFoundError)

    def test_metadata_failure_does_not_fallback(self):
        with patch('repository_instructions.os.lstat', side_effect=PermissionError('synthetic')):
            with self.assertRaises(PermissionError):
                read_repository_instructions(str(self.root))
