"""Read-only profile checks for the observed current-environment PS baseline.

Not a universal Windows allowance or a concurrent-filesystem sandbox. Call only
with a caller-owned fresh temporary run directory, never the live environment.
Snapshots contain relative path/kind entries, not contents or absolute paths.
"""
from pathlib import Path
import stat


PROFILE_KEYS = ('LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME', 'TEMP', 'TMP')
CURRENT_ENV_POWERSHELL_DIRS = ('AppData', 'AppData/Roaming')
MAX_ENTRIES_PER_ROOT = 64


def validate_profile_state(snapshot: dict) -> bool:
    """Accept empty roots or exactly the observed two USERPROFILE directories."""
    if type(snapshot) is not dict or set(snapshot) != set(PROFILE_KEYS):
        raise ValueError('invalid profile roots')
    for key in PROFILE_KEYS:
        entries = snapshot[key]
        if type(entries) is not list or len(entries) > MAX_ENTRIES_PER_ROOT:
            raise ValueError('invalid profile entries')
        for entry in entries:
            if (type(entry) is not dict or set(entry) != {'path', 'kind'}
                    or type(entry['path']) is not str or type(entry['kind']) is not str):
                raise ValueError('invalid profile entry')
        expected = ([{'path': path, 'kind': 'directory'}
                     for path in CURRENT_ENV_POWERSHELL_DIRS] if key == 'USERPROFILE' else [])
        if entries and sorted(entries, key=lambda entry: entry['path']) != expected:
            raise ValueError('profile delta outside current-environment baseline')
    return True


def _checked_kind(path: Path) -> str:
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
        raise ValueError('profile reparse path refused')
    if stat.S_ISDIR(info.st_mode):
        return 'directory'
    return 'file' if stat.S_ISREG(info.st_mode) else 'other'


def capture_profile_state(run: Path) -> dict:
    """Capture at most 64 entries/root; never descend into unexpected directories.

    All six roots and their ancestors are checked before listing anything. Read
    failures propagate. Only the two exact baseline paths may be traversed, and
    Roaming is listed too so a captured allowance proves no grandchildren.
    """
    if not run.is_absolute() or '..' in run.parts:
        raise ValueError('absolute canonical temporary run path required')
    roots = {key: run / key for key in PROFILE_KEYS}
    for root in roots.values():
        for part in (*reversed(root.parents), root):
            if _checked_kind(part) != 'directory':
                raise ValueError('profile root or ancestor is not a directory')
    snapshot = {}
    for key, root in roots.items():
        entries, pending = [], [root]
        while pending:
            directory = pending.pop()
            if _checked_kind(directory) != 'directory':
                raise ValueError('profile directory changed type')
            for child in directory.iterdir():
                if len(entries) >= MAX_ENTRIES_PER_ROOT:
                    raise ValueError('profile inventory limit')
                relative = child.relative_to(root).as_posix()
                kind = _checked_kind(child)
                entries.append({'path': relative, 'kind': kind})
                if (key == 'USERPROFILE' and kind == 'directory'
                        and relative in CURRENT_ENV_POWERSHELL_DIRS):
                    pending.append(child)
        snapshot[key] = sorted(entries, key=lambda entry: entry['path'])
    return snapshot
