"""Inert profile fixtures: no real filesystem reads, creation, links or processes.

Only stdlib and scripts.test_profile_state are imported. Reader calls are patched
before invocation; fake paths are lexical objects, not temporary directories.
"""
import copy
import json
from pathlib import Path
import stat
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from scripts.test_profile_state import (
    PROFILE_KEYS, capture_profile_state, validate_profile_state,
)


class ProfileStateTests(unittest.TestCase):
    def empty(self):
        return {key: [] for key in PROFILE_KEYS}

    def baseline(self):
        snapshot = self.empty()
        snapshot['USERPROFILE'] = [
            {'path': 'AppData', 'kind': 'directory'},
            {'path': 'AppData/Roaming', 'kind': 'directory'},
        ]
        return snapshot

    def capture(self, tree=None, overrides=None):
        # Absolute on either platform without resolve(), cwd() or disk access.
        run = Path('C:/synthetic/profile-run' if Path('C:/').is_absolute()
                   else '/synthetic/profile-run')
        tree, overrides = tree or {}, overrides or {}

        def lstat(path):
            value = overrides.get(path.as_posix(), (stat.S_IFDIR, 0))
            if isinstance(value, Exception):
                raise value
            return SimpleNamespace(st_mode=value[0], st_file_attributes=value[1])

        def iterdir(path):
            relative = path.relative_to(run).as_posix()
            value = tree.get(relative, [])
            if isinstance(value, Exception):
                raise value
            return iter(path / name for name in value)

        with patch.object(Path, 'lstat', autospec=True, side_effect=lstat), \
                patch.object(Path, 'iterdir', autospec=True, side_effect=iterdir) as listing:
            snapshot = capture_profile_state(run)
        return snapshot, [call.args[0].relative_to(run).as_posix() for call in listing.call_args_list]

    def test_empty_and_exact_baseline_are_allowed_without_mutation(self):
        for snapshot in (self.empty(), self.baseline()):
            original = copy.deepcopy(snapshot)
            self.assertTrue(validate_profile_state(snapshot))
            self.assertEqual(snapshot, original)
            self.assertEqual(json.loads(json.dumps(snapshot)), snapshot)
        snapshot = self.baseline()
        snapshot['USERPROFILE'].reverse()
        self.assertTrue(validate_profile_state(snapshot))

    def test_wrong_root_keys_and_snapshot_shapes_fail(self):
        for snapshot in (None, [], {}, {**self.empty(), 'EXTRA': []},
                         {key: [] for key in PROFILE_KEYS if key != 'HOME'},
                         {**self.empty(), 'home': []}):
            with self.subTest(snapshot=snapshot), self.assertRaises(ValueError):
                validate_profile_state(snapshot)

    def test_wrong_entry_shapes_fail(self):
        for entries in (None, (), {}, ['AppData'], [None],
                        [{'path': 'AppData'}], [{'path': 'AppData', 'kind': 'directory', 'extra': 0}],
                        [{'path': 1, 'kind': 'directory'}], [{'path': 'AppData', 'kind': []}]):
            snapshot = self.empty()
            snapshot['USERPROFILE'] = entries
            with self.subTest(entries=entries), self.assertRaises(ValueError):
                validate_profile_state(snapshot)

    def test_files_or_non_directory_kinds_at_either_baseline_path_fail(self):
        for index in (0, 1):
            for kind in ('file', 'other', 'symlink', 'reparse', 'Directory'):
                snapshot = self.baseline()
                snapshot['USERPROFILE'][index]['kind'] = kind
                with self.subTest(index=index, kind=kind), self.assertRaises(ValueError):
                    validate_profile_state(snapshot)

    def test_any_other_root_change_fails(self):
        for key in PROFILE_KEYS:
            if key == 'USERPROFILE':
                continue
            for kind in ('file', 'directory'):
                snapshot = self.baseline()
                snapshot[key] = [{'path': 'AppData', 'kind': kind}]
                with self.subTest(key=key, kind=kind), self.assertRaises(ValueError):
                    validate_profile_state(snapshot)

    def test_partial_duplicate_extra_and_grandchild_entries_fail(self):
        baseline = self.baseline()['USERPROFILE']
        for entries in (baseline[:1], baseline[1:], baseline + baseline[:1],
                        baseline + [{'path': 'extra', 'kind': 'directory'}],
                        baseline + [{'path': 'AppData/Roaming/child', 'kind': 'file'}]):
            snapshot = self.empty()
            snapshot['USERPROFILE'] = entries
            with self.subTest(entries=entries), self.assertRaises(ValueError):
                validate_profile_state(snapshot)

    def test_case_and_path_aliases_fail(self):
        for path in ('appdata', 'APPDATA', './AppData', 'AppData/', 'AppData\\Roaming',
                     'AppData/../AppData', '/AppData'):
            snapshot = self.baseline()
            snapshot['USERPROFILE'][0]['path'] = path
            with self.subTest(path=path), self.assertRaises(ValueError):
                validate_profile_state(snapshot)

    def test_capture_empty_and_baseline_lists_roaming(self):
        snapshot, listed = self.capture()
        self.assertEqual(snapshot, self.empty())
        self.assertEqual(set(listed), set(PROFILE_KEYS))
        snapshot, listed = self.capture({'USERPROFILE': ['AppData'], 'USERPROFILE/AppData': ['Roaming']})
        self.assertEqual(snapshot, self.baseline())
        self.assertIn('USERPROFILE/AppData/Roaming', listed)

    def test_capture_never_descends_unexpected_directories(self):
        tree = {key: ['unexpected'] for key in PROFILE_KEYS}
        snapshot, listed = self.capture(tree)
        self.assertEqual(set(listed), set(PROFILE_KEYS))
        with self.assertRaises(ValueError):
            validate_profile_state(snapshot)
        tree = {'USERPROFILE': ['AppData'], 'USERPROFILE/AppData': ['Roaming'],
                'USERPROFILE/AppData/Roaming': ['child']}
        snapshot, listed = self.capture(tree)
        self.assertNotIn('USERPROFILE/AppData/Roaming/child', listed)
        with self.assertRaises(ValueError):
            validate_profile_state(snapshot)

    def test_capture_rejects_links_reparse_and_non_directory_roots_before_listing(self):
        run = Path('C:/synthetic/profile-run' if Path('C:/').is_absolute()
                   else '/synthetic/profile-run')
        for target in (*reversed(run.parents), run, *(run / key for key in PROFILE_KEYS)):
            for mode, flags in ((stat.S_IFLNK, 0), (stat.S_IFDIR, 0x400), (stat.S_IFREG, 0)):
                def lstat(path):
                    return SimpleNamespace(st_mode=mode if path == target else stat.S_IFDIR,
                                           st_file_attributes=flags if path == target else 0)
                with self.subTest(target=target, mode=mode, flags=flags), \
                        patch.object(Path, 'lstat', autospec=True, side_effect=lstat), \
                        patch.object(Path, 'iterdir', autospec=True) as listing:
                    with self.assertRaises(ValueError):
                        capture_profile_state(run)
                    listing.assert_not_called()

    def test_capture_child_links_reparse_and_files(self):
        run = 'C:/synthetic/profile-run' if Path('C:/').is_absolute() else '/synthetic/profile-run'
        tree = {'USERPROFILE': ['AppData'], 'USERPROFILE/AppData': ['Roaming']}
        for relative in ('USERPROFILE/AppData', 'USERPROFILE/AppData/Roaming'):
            for mode, flags in ((stat.S_IFLNK, 0), (stat.S_IFDIR, 0x400)):
                with self.subTest(relative=relative, mode=mode), self.assertRaises(ValueError):
                    self.capture(tree, {run + '/' + relative: (mode, flags)})
            snapshot, listed = self.capture(tree, {run + '/' + relative: (stat.S_IFREG, 0)})
            self.assertNotIn(relative, listed)
            with self.assertRaises(ValueError):
                validate_profile_state(snapshot)

    def test_entry_limit_and_read_errors_fail_without_suppression(self):
        snapshot, _ = self.capture({'HOME': [str(i) for i in range(64)]})
        self.assertEqual(len(snapshot['HOME']), 64)
        with self.assertRaises(ValueError):
            self.capture({'HOME': [str(i) for i in range(65)]})
        snapshot['USERPROFILE'] = [{'path': 'AppData', 'kind': 'directory'}] * 65
        with self.assertRaises(ValueError):
            validate_profile_state(snapshot)
        for relative in ('HOME', 'USERPROFILE/AppData', 'USERPROFILE/AppData/Roaming'):
            tree = {'USERPROFILE': ['AppData'], 'USERPROFILE/AppData': ['Roaming']}
            tree[relative] = PermissionError('synthetic read failure')
            with self.subTest(relative=relative), self.assertRaises(PermissionError):
                self.capture(tree)
        run = 'C:/synthetic/profile-run' if Path('C:/').is_absolute() else '/synthetic/profile-run'
        with self.assertRaises(OSError):
            self.capture(overrides={run + '/TMP': OSError('synthetic stat failure')})
