"""Read exactly one Root instruction entry without implicit discovery."""
import os
from pathlib import Path


def read_repository_instructions(root: str) -> tuple[bytes, str]:
    for path in (Path(root) / 'AGENTS.md', Path(root) / '.github' / 'copilot-instructions.md'):
        try:
            os.lstat(path)
        except FileNotFoundError:
            continue
        # A present entry owns selection, even if empty, a directory or a broken link.
        try:
            with open(path, 'rb') as stream:
                raw = stream.read()
        except FileNotFoundError as error:
            raise OSError('Selected repository instructions are unreadable') from error
        return raw, raw.decode('utf-8')
    raise FileNotFoundError('Repository instructions are missing')
