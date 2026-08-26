# Dynamics Helper Prompt Scope Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DH analysis sessions use one explicit, deterministic instruction source, extend Repository ONLY to instructions, and surface prompt-source failures consistently without changing MyCases orchestration.

**Architecture:** The Python Host owns prompt-source resolution, strict file errors, immutable byte snapshots, SHA-256 fingerprints, and SDK session kwargs. The Extension owns source-selection UX, sparse instruction writes, localization, and preservation of machine-readable errors through Service Worker storage and FAB hydration. Host and Extension ship atomically because the new health and error envelopes couple them.

**Tech Stack:** Python 3.13, `github-copilot-sdk==1.0.5`, `unittest`, React 19, TypeScript 5.9, Chrome Manifest V3, Vitest 3, Testing Library, Vite 7.

## Global Constraints

- Implement against accepted spec `docs/superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md` and baseline `v2.0.74-beta.4`.
- Every SDK `create_session` and `resume_session` call sets `skip_custom_instructions=True`.
- Every session gets DH Core plus exactly one editable system source: DH-specific or Root `.github/copilot-instructions.md`.
- Custom User Prompt remains PII-scrubbed user-role content on every Analyze.
- Repository ONLY remains generic to any absolute Root; this plan does not add Standalone, Auto, or MyCases-integrated modes.
- Do not modify `host/system_prompt.md`, UUIDv5 identity, Stage 0/1 contracts, MyCases canonical files, version fields, or release tags.
- Do not log instruction contents, Custom User Prompt contents, or prompt-source paths.
- Preserve Native Messaging stdout discipline and headless permission auto-approval.
- All new invariant tests require a recorded break-and-fail proof before their task is committed.
- Do not push, publish, tag, or run `release_helper.py --publish` without a separate explicit user instruction.

---

## File Structure

### Host

- Modify `host/dh_native_host.py`: prompt snapshot/error types, explicit source resolver, fingerprint state, SDK kwargs, strict/soft config paths, update responses, safe logging.
- Create `host/test_prompt_sources.py`: PS-I2..PS-I12 source, file, health, and clear-semantics tests.
- Create `host/test_prompt_session.py`: PF-I1..PF-I6 session refresh and create/resume parity tests.
- Modify `host/test_session_workspace.py`: adapt existing Root/session tests to snapshot and fingerprint state.
- Modify `host/test_sdk_compat.py`: lock the SDK `skip_custom_instructions` keyword contract.

### Extension

- Create `extension/src/utils/promptSourceErrors.ts`: normalize and localize prompt-source error codes.
- Create `extension/src/utils/promptSourceErrors.test.ts`: known/unknown code and bilingual copy tests.
- Create `extension/src/utils/configUpdateResult.ts`: pure update-response classification and instruction revision acknowledgement.
- Create `extension/src/utils/configUpdateResult.test.ts`: outer/inner response and overlapping-save race tests.
- Modify `extension/src/utils/translations.ts`: renamed labels, source descriptions, five error messages, update-result messages.
- Modify `extension/src/utils/analysisStore.ts`: optional persisted `errorCode`.
- Modify `extension/src/background/analyzeBridge.ts`: preserve native error codes and store them with analysis errors.
- Modify `extension/src/background/analyzeBridge.test.ts`: transport and storage invariants.
- Modify `extension/src/background/serviceWorker.ts`: preserve outer error codes and redact full Host messages from logs.
- Modify `extension/src/hooks/useAnalysisHydration.ts`: hydrate `errorCode`.
- Modify `extension/src/hooks/useAnalysisHydration.test.ts`: coded and legacy error hydration.
- Modify `extension/src/components/FAB.tsx`: render-time localization for immediate and hydrated errors.
- Modify `extension/src/components/Options.tsx`: effective mode matrix, prompt health, sparse instruction writes, inspected update responses.
- Modify `extension/src/components/Options.test.tsx`: UI-I1..UI-I7 and hydration compatibility.

### Documentation

- Modify `AGENTS.md`, `USER_GUIDE.md`, `DEVELOPER_GUIDE.md`, and `ARCHITECTURE.md`.
- Modify `docs/session-handoff-2026-07-15.md` and the two 2026-07-14 research documents with supersession/status notes.
- Modify `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md` for optional error-code persistence.
- Create `releases/notes-prompt-scope-cleanup-draft.md`; it remains unversioned until the user approves a release version.

## Invariant Coverage

| Accepted invariant | Implementation/test task |
|---|---|
| PS-I1 | Task 2 SDK signature, resume, create fallback, and retry tests |
| PS-I2..PS-I8 | Task 1 source-mode, strict-file, unselected-file, and empty-file tests |
| PS-I9 | Task 2 user-message versus system-message marker test |
| PS-I10..PS-I11 | Task 3 explicit clear, get-config round trip, and strict DH-file tests |
| PS-I12 | Task 1 one-open immutable snapshot and exact-byte tests |
| PF-I1 | Task 1 framed fingerprint component tests |
| PF-I2..PF-I5 | Task 2 Analyze reuse, refresh ordering, commit/failure, and reconnect tests |
| PF-I6 | Task 2 exact resume/create kwargs parity test |
| UI-I1..UI-I5 | Task 5 three-state Options matrix and bilingual translation tests |
| UI-I6 | Task 4 Host-response normalization, storage, hydration, and render-time localization tests |
| UI-I7 | Task 6 structured update response, saved-value preservation, and warning-state tests |

## Execution Preflight

- [ ] **Verify the isolated branch and clean worktree**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
```

Expected: branch `docs/prompt-scope-cleanup-design`, no unexpected changes, and HEAD containing accepted spec commit `441d0db` plus the subsequent plan commit once this document is committed.

- [ ] **Verify Python is available before installing anything**

Run:

```powershell
python --version
```

Expected: Python 3.13.x. If Windows reports the Microsoft Store alias or no executable, stop and ask the user before installing Python; do not silently alter the VM.

- [ ] **Create the Host venv and install the pinned SDK environment**

Run:

```powershell
python -m venv host\venv
& "host\venv\Scripts\python.exe" -m pip install -r host\requirements.txt
& "host\venv\Scripts\python.exe" -m pip install github-copilot-sdk==1.0.5
& "host\venv\Scripts\python.exe" -c "import importlib.metadata as m; print(m.version('github-copilot-sdk'))"
```

Expected final output: `1.0.5`.

- [ ] **Install Extension dependencies**

Run:

```powershell
npm install --prefix extension
```

Expected: exit 0 with `extension/node_modules` present.

- [ ] **Capture the clean product baseline**

Run:

```powershell
& "host\venv\Scripts\python.exe" -m unittest discover host
npm run test:run --prefix extension
npm run build --prefix extension
python dev_switch.py status
```

Expected: Host 109 tests pass, Extension 43 tests pass, build exits 0, and VM registry status is reported without changing it. If any baseline differs, stop and investigate before implementation.

---

### Task 1: Deterministic Host Prompt Snapshot

**Files:**
- Modify: `host/dh_native_host.py:113-140,405-428,546-555,891-1276`
- Create: `host/test_prompt_sources.py`

**Interfaces:**
- Produces: `PromptSnapshot`, `PromptSourceError`, `NativeHost._resolve_prompt_snapshot()`, `_build_system_message()`, and `_compute_prompt_fingerprint()`.
- Consumed by: Tasks 2 and 3.

- [ ] **Step 1: Write the failing source-selection tests**

Create `host/test_prompt_sources.py` with isolated temporary install, user, and Root directories. Use this fixture and assertions:

```python
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
```

Add `TestPromptSourceErrors` in the same file. Each case asserts the exact safe code and that `str(error)` contains no absolute path:

```python
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
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources -v
```

Expected: import errors for `PromptSnapshot` / `PromptSourceError` or missing helper attributes.

- [ ] **Step 3: Add the immutable snapshot and strict resolver**

In `host/dh_native_host.py`, add `dataclass` and `hashlib` imports and this module-level surface:

```python
from dataclasses import dataclass
import hashlib


_PROMPT_ERROR_MESSAGES = {
    "dh_core_prompt_missing": (
        "DH Core System Prompt is missing. Repair or reinstall Dynamics Helper."
    ),
    "dh_core_prompt_unreadable": (
        "DH Core System Prompt cannot be read as UTF-8. "
        "Repair the installation or file permissions."
    ),
    "dh_specific_instructions_unreadable": (
        "DH-specific Instructions cannot be read as UTF-8. "
        "Repair or replace them in Options."
    ),
    "repository_instructions_missing": (
        "Repository Instructions are missing. Add "
        ".github/copilot-instructions.md under Root Path or disable Repository ONLY."
    ),
    "repository_instructions_unreadable": (
        "Repository Instructions cannot be read as UTF-8. "
        "Repair the file or disable Repository ONLY."
    ),
}


@dataclass(frozen=True)
class PromptSnapshot:
    mode: str
    effective_root: str | None
    core_bytes: bytes
    core_text: str
    selected_bytes: bytes
    selected_text: str
    fingerprint: str


class PromptSourceError(RuntimeError):
    def __init__(self, error_code: str) -> None:
        self.error_code = error_code
        super().__init__(_PROMPT_ERROR_MESSAGES[error_code])

    def to_result(self) -> dict[str, str]:
        return {
            "status": "error",
            "error_code": self.error_code,
            "error": str(self),
        }
```

Add these methods to `NativeHost` near `_normalize_root_path`:

```python
@staticmethod
def _get_install_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

@staticmethod
def _prompt_source_mode(
    effective_root: str | None,
    use_workspace_only: bool,
) -> str:
    return (
        "repository-only"
        if effective_root and use_workspace_only
        else "dh-specific"
    )

@staticmethod
def _validate_effective_root(effective_root: str | None) -> None:
    if effective_root and not os.path.isdir(effective_root):
        raise ValueError(
            "Configured Root Path does not exist or is not a directory."
        )

@staticmethod
def _read_prompt_source(
    path: str,
    *,
    missing_error_code: str | None,
    unreadable_error_code: str,
) -> tuple[bytes, str]:
    try:
        with open(path, "rb") as stream:
            raw = stream.read()
    except FileNotFoundError as error:
        if missing_error_code is None:
            return b"", ""
        raise PromptSourceError(missing_error_code) from error
    except OSError as error:
        raise PromptSourceError(unreadable_error_code) from error
    try:
        return raw, raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise PromptSourceError(unreadable_error_code) from error

@staticmethod
def _compute_prompt_fingerprint(
    mode: str,
    core_bytes: bytes,
    selected_bytes: bytes,
) -> str:
    digest = hashlib.sha256()
    for part in (
        b"dh-prompt-fingerprint-v1",
        mode.encode("utf-8"),
        core_bytes,
        selected_bytes,
    ):
        digest.update(len(part).to_bytes(8, "big"))
        digest.update(part)
    return f"v1:{digest.hexdigest()}"

def _resolve_prompt_snapshot(
    self,
    effective_root: str | None,
    use_workspace_only: bool,
) -> PromptSnapshot:
    mode = self._prompt_source_mode(effective_root, use_workspace_only)
    core_bytes, core_text = self._read_prompt_source(
        os.path.join(self._get_install_dir(), "system_prompt.md"),
        missing_error_code="dh_core_prompt_missing",
        unreadable_error_code="dh_core_prompt_unreadable",
    )
    if mode == "repository-only":
        selected_path = os.path.join(
            effective_root or "", ".github", "copilot-instructions.md"
        )
        missing_code = "repository_instructions_missing"
        unreadable_code = "repository_instructions_unreadable"
    else:
        selected_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")
        missing_code = None
        unreadable_code = "dh_specific_instructions_unreadable"
    selected_bytes, selected_text = self._read_prompt_source(
        selected_path,
        missing_error_code=missing_code,
        unreadable_error_code=unreadable_code,
    )
    return PromptSnapshot(
        mode=mode,
        effective_root=effective_root,
        core_bytes=core_bytes,
        core_text=core_text,
        selected_bytes=selected_bytes,
        selected_text=selected_text,
        fingerprint=self._compute_prompt_fingerprint(
            mode, core_bytes, selected_bytes
        ),
    )

@staticmethod
def _build_system_message(
    snapshot: PromptSnapshot,
    session_id: str | None,
) -> dict[str, str]:
    sections = [snapshot.core_text]
    if snapshot.selected_text.strip():
        sections.append(snapshot.selected_text)
    if session_id:
        sections.append(
            f"## Session Info\n\nSession Name: {session_id}"
        )
    return {"mode": "append", "content": "\n\n".join(sections)}
```

Delete the old prompt assembly and manual workspace append at current lines 1163-1240. Keep user-prompt file handling unchanged. Surface `_effective_root` and `_use_workspace_only` in the internal `session_config` so later tasks do not infer Root from `working_directory`:

```python
session_config["_effective_root"] = current_root
session_config["_use_workspace_only"] = bool(use_workspace_only)
```

- [ ] **Step 4: Run source tests and existing Root tests**

Run:

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources host.test_session_workspace -v
```

Expected: both modules pass. If an existing Root test asserted the removed duplicate `system_message` assembly, update that test in this task to assert `_effective_root`, `_use_workspace_only`, Skills, MCP, or working-directory behavior instead; do not commit a failing suite and do not restore duplicate prompt assembly.

- [ ] **Step 5: Perform break-and-fail proofs for Task 1**

Temporarily apply each mutation, run the named test, confirm failure, then restore the correct line manually:

| Temporary mutation | Test that must fail |
|---|---|
| Return `"dh-specific"` unconditionally from `_prompt_source_mode` | `test_PS_I4_repository_mode_selects_core_and_repository_only` |
| Decode with `utf-8-sig` | `test_snapshot_preserves_bom_crlf_and_trailing_whitespace` |
| Reopen selected files from `_build_system_message` | `test_PS_I12_snapshot_reads_selected_sources_once` |
| Remove mode bytes from fingerprint | `test_PF_I1_fingerprint_frames_mode_core_and_selected_bytes` |
| Treat missing repository file as empty | `test_PS_I7_missing_repository_does_not_fallback` |
| Append both selected files | `test_PS_I5_editable_sources_never_coexist` |

Run each focused test with:

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources.TestPromptSourceSelection.test_PF_I1_fingerprint_frames_mode_core_and_selected_bytes -v
```

Expected during each temporary mutation: FAIL. After restoring all mutations, rerun `host.test_prompt_sources` and expect PASS.

- [ ] **Step 6: Commit Task 1**

```powershell
git add host/dh_native_host.py host/test_prompt_sources.py
git commit -m "feat(prompt): add deterministic prompt source resolver"
```

---

### Task 2: SDK Isolation and Fingerprint Session Lifecycle

**Files:**
- Modify: `host/dh_native_host.py:405-428,722-781,1414-1643,1932-2203,2304-2316`
- Create: `host/test_prompt_session.py`
- Modify: `host/test_session_workspace.py:19-464`
- Modify: `host/test_sdk_compat.py:1-168`

**Interfaces:**
- Consumes: `PromptSnapshot` and resolver methods from Task 1.
- Produces: `_refresh_session(session_id=None, case_id=None, working_directory_override=_WORKING_DIRECTORY_UNSET, session_config=None, prompt_snapshot=None)`, `current_prompt_fingerprint`, and centralized `_invalidate_active_session()`.
- Consumed by: Task 3 Host config updates.

- [ ] **Step 1: Lock the Python SDK keyword contract**

Add this test to `host/test_sdk_compat.py`:

```python
class TestCustomInstructionIsolation(unittest.TestCase):
    def test_session_methods_accept_skip_custom_instructions(self):
        import inspect
        from copilot import CopilotClient

        for name in ("create_session", "resume_session"):
            with self.subTest(name=name):
                signature = inspect.signature(getattr(CopilotClient, name))
                self.assertIn("skip_custom_instructions", signature.parameters)
```

Run:

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_sdk_compat.TestCustomInstructionIsolation -v
```

Expected: PASS on SDK 1.0.5. If it fails, stop; do not invent a CLI flag or monkey-patch without revising the design.

- [ ] **Step 2: Write failing create/resume and fingerprint tests**

Create `host/test_prompt_session.py` with this shared fixture, then add the exact behaviors below:

```python
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
            "mcp_servers": {"fixture": {"type": "stdio", "command": "cmd", "args": []}},
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
        self.assertEqual(retry_kwargs["skill_directories"], self.config["skill_directories"])
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
```

Add Analyze lifecycle tests with a mocked `_get_session_config`, `_resolve_prompt_snapshot`, `_refresh_session`, `scrubber`, client auth, and `send_and_wait`:

```python
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
        self.host._resolve_prompt_snapshot.side_effect = PromptSourceError(
            "repository_instructions_missing"
        )
        result = await self.host.handle_analyze_error(self.payload)
        self.assertEqual(result["error_code"], "repository_instructions_missing")
        self.host.session.send_and_wait.assert_not_awaited()
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
        self.host.client.create_session.side_effect = RuntimeError("failed")
        success = await self.host._refresh_session(
            session_id=self.session_id,
            case_id=self.case_id,
            session_config=self.config,
            prompt_snapshot=self.snapshot,
        )
        self.assertFalse(success)
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
```

- [ ] **Step 3: Run session tests and verify RED**

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_session -v
```

Expected: failures for missing `session_config` / `prompt_snapshot` parameters, missing fingerprint state, and missing `skip_custom_instructions` kwargs.

- [ ] **Step 4: Add centralized session invalidation**

Initialize in `NativeHost.__init__`:

```python
self.current_prompt_fingerprint: str | None = None
self.last_session_error: str | None = None
self.last_prompt_source_error: PromptSourceError | None = None
```

Add:

```python
def _invalidate_active_session(self, *, clear_client: bool = False) -> None:
    self.session = None
    self.current_session_id = None
    self.current_case_id = None
    self.current_session_root_path = None
    self.current_prompt_fingerprint = None
    if clear_client:
        self.client = None
        self.client_working_directory = None
```

Use it in Root client discard, startup failure, refresh/retry failure, no-active-case config update, Analyze refresh failure, timeout, and broken-pipe paths. Do not delete persisted Copilot session history.

- [ ] **Step 5: Pass one snapshot through every SDK refresh path**

Change the signature to:

```python
async def _refresh_session(
    self,
    session_id: str | None = None,
    case_id: str | None = None,
    working_directory_override=_WORKING_DIRECTORY_UNSET,
    session_config: dict | None = None,
    prompt_snapshot: PromptSnapshot | None = None,
) -> bool:
```

At method start, validate an effective Root before reading Repository Instructions:

```python
self.last_session_error = None
self.last_prompt_source_error = None
try:
    full_config = session_config or self._get_session_config(
        root_path_override=working_directory_override
    )
    self._validate_effective_root(full_config.get("_effective_root"))
    snapshot = prompt_snapshot or self._resolve_prompt_snapshot(
        full_config.get("_effective_root"),
        bool(full_config.get("_use_workspace_only")),
    )
except PromptSourceError as error:
    self.last_prompt_source_error = error
    self.last_session_error = str(error)
    self._invalidate_active_session()
    return False
except Exception as error:
    self.last_session_error = str(error)
    self._invalidate_active_session()
    return False
```

Build shared kwargs once:

```python
sdk_kwargs = {
    "on_permission_request": self._permission_handler,
    "hooks": {"on_pre_tool_use": self._pre_tool_use_hook},
    "skip_custom_instructions": True,
    "system_message": self._build_system_message(snapshot, session_id),
}
```

Retain existing MCP, Root, Skills, and model/performance additions. Use the same dict for resume, create fallback, and OSError retry. Commit `snapshot.fingerprint` only after a successful SDK resume/create; every failure invalidates without committing it.

- [ ] **Step 6: Resolve and compare the snapshot before every Analyze**

Refactor `handle_analyze_error` so both explicit and fallback Root paths load one config, validate Root usability, and only then resolve one snapshot:

```python
try:
    if isinstance(payload_root_value, str) and payload_root_value.strip():
        payload_root_path = self._normalize_root_path(payload_root_value)
        full_config = self._get_session_config(
            root_path_override=payload_root_path
        )
    else:
        full_config = self._get_session_config()
        payload_root_path = full_config.get("_effective_root")
    self._validate_effective_root(full_config.get("_effective_root"))
    snapshot = self._resolve_prompt_snapshot(
        full_config.get("_effective_root"),
        bool(full_config.get("_use_workspace_only")),
    )
except PromptSourceError as error:
    self._invalidate_active_session()
    return error.to_result()
except ValueError as error:
    self._invalidate_active_session()
    return {"status": "error", "error": str(error)}
```

Add this test to `TestPromptFingerprintLifecycle`:

```python
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
    self.assertEqual(result, {
        "status": "error",
        "error": "Configured Root Path does not exist or is not a directory.",
    })
    self.host._resolve_prompt_snapshot.assert_not_called()
    original_session.send_and_wait.assert_not_awaited()
    self.assertIsNone(self.host.session)
```

Then add fingerprint mismatch to `needs_refresh`, pass `full_config` and `snapshot` into `_refresh_session`, and pass the same objects to the Session-not-found reconnect. On failed refresh, return `last_prompt_source_error.to_result()` when present; otherwise retain the existing generic session-refresh message.

- [ ] **Step 7: Adapt existing Root/session regression fixtures**

In every `NativeHost.__new__` shell in `host/test_session_workspace.py`, initialize:

```python
host.current_prompt_fingerprint = None
host.last_prompt_source_error = None
```

Where tests expect no refresh, give the shell a snapshot whose fingerprint matches `current_prompt_fingerprint`. Where tests assert `_refresh_session` arguments, add `session_config=...` and `prompt_snapshot=...`. Extend failure assertions to require fingerprint clearing.

- [ ] **Step 8: Run focused and adjacent Host tests**

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_session -v
& "host\venv\Scripts\python.exe" -m unittest host.test_session_workspace -v
& "host\venv\Scripts\python.exe" -m unittest host.test_sdk_compat -v
```

Expected: all pass.

- [ ] **Step 9: Perform Task 2 break-and-fail proofs**

| Temporary mutation | Test that must fail |
|---|---|
| Remove `skip_custom_instructions` from resume kwargs | PS-I1 resume test |
| Build create kwargs independently without skip flag | PS-I1 create-fallback test |
| Commit fingerprint before awaiting SDK | PF-I4 failure test |
| Remove fingerprint from `needs_refresh` | PF-I3 changed-fingerprint test |
| Re-resolve files during Session-not-found retry | same-snapshot-object test |
| Keep stale session on resolver failure | PF-I5 no-turn test |

Restore every mutation manually and rerun all three focused modules.

- [ ] **Step 10: Commit Task 2**

```powershell
git add host/dh_native_host.py host/test_prompt_session.py host/test_session_workspace.py host/test_sdk_compat.py
git commit -m "feat(session): isolate and refresh prompt sources"
```

---

### Task 3: Host Config Health, Explicit Clear, and Safe Responses

**Files:**
- Modify: `host/dh_native_host.py:891-1276,1659-1810,1847-1858,1932-2069,2404-2410`
- Modify: `host/test_prompt_sources.py`

**Interfaces:**
- Produces: `prompt_source_status`, sparse `user_instructions` semantics, structured `update_config` result, and safe Host logging.
- Consumed by: Options tasks 5 and 6.

- [ ] **Step 1: Write failing clear and health tests**

Add these tests to `host/test_prompt_sources.py`:

```python
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
```

Continue inside `TestPromptConfigApi` with synchronous health tests:

```python
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
```

Continue in the same class with these tests:

```python
    def test_get_config_missing_dh_specific_returns_raw_empty(self):
        os.remove(self.dh_path)
        config = self.host._get_session_config(include_prompt_status=True)
        self.assertEqual(config["_user_instructions_raw"], "")

    def test_get_config_without_health_does_not_read_prompt_files(self):
        with patch.object(
            self.host,
            "_get_prompt_source_config_fields",
        ) as inspect_health:
            self.host._get_session_config(include_prompt_status=False)
        inspect_health.assert_not_called()

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
```

- [ ] **Step 2: Run config tests and verify RED**

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources -v
```

Expected: failures for current truthiness clear bug, absent health field, and old refresh-error shape.

- [ ] **Step 3: Add non-strict prompt health inspection**

Change `_get_session_config` to:

```python
def _get_session_config(
    self,
    root_path_override=_WORKING_DIRECTORY_UNSET,
    *,
    include_prompt_status: bool = False,
) -> dict:
```

Add `_get_prompt_source_config_fields(effective_root, use_workspace_only)` with this exact behavior. It never returns or commits a `PromptSnapshot`, and it never raises a `PromptSourceError`:

```python
def _get_prompt_source_config_fields(
    self,
    effective_root: str | None,
    use_workspace_only: bool,
) -> dict:
    status: dict[str, str] = {"status": "ok"}
    dh_raw: str | None = None
    dh_error: PromptSourceError | None = None

    try:
        self._read_prompt_source(
            os.path.join(self._get_install_dir(), "system_prompt.md"),
            missing_error_code="dh_core_prompt_missing",
            unreadable_error_code="dh_core_prompt_unreadable",
        )
    except PromptSourceError as error:
        status = error.to_result()

    try:
        _, dh_raw = self._read_prompt_source(
            os.path.join(USER_DATA_DIR, "copilot-instructions.md"),
            missing_error_code=None,
            unreadable_error_code="dh_specific_instructions_unreadable",
        )
    except PromptSourceError as error:
        dh_error = error

    selected_error: PromptSourceError | None = None
    if effective_root and use_workspace_only:
        try:
            self._read_prompt_source(
                os.path.join(
                    effective_root,
                    ".github",
                    "copilot-instructions.md",
                ),
                missing_error_code="repository_instructions_missing",
                unreadable_error_code="repository_instructions_unreadable",
            )
        except PromptSourceError as error:
            selected_error = error

    if status["status"] == "ok" and selected_error is not None:
        status = selected_error.to_result()
    if status["status"] == "ok" and dh_error is not None:
        status = dh_error.to_result()

    fields: dict = {"prompt_source_status": status}
    if dh_raw is not None:
        fields["_user_instructions_raw"] = dh_raw
    return fields
```

For soft health only, do not call `_validate_effective_root`; a missing Root produces the selected Repository Instructions health error while keeping Options usable. `PromptSourceError.to_result()` includes `status:error`; readable DH editor text remains present even when Core or Repository status is unhealthy. Omit `_user_instructions_raw` only when the DH-specific file itself is unreadable. Call this helper only when `include_prompt_status=True`. Change `process_message` get-config dispatch to call `_get_session_config(include_prompt_status=True)`.

Add two assertions to the health tests: Core missing plus readable DH returns `_user_instructions_raw == "DH-SPECIFIC"`; Repository missing plus readable DH returns the same raw editor text.

- [ ] **Step 4: Fix presence-based instruction writes and structured update results**

Replace truthiness selection with:

```python
if "user_instructions" in payload:
    new_instr = payload["user_instructions"]
elif "system_instructions" in payload:
    new_instr = payload["system_instructions"]
else:
    new_instr = None
```

Immediately validate both optional text values before any write:

```python
new_prompt = payload.get("user_prompt")
if new_prompt is None:
    ext = payload.get("config", {}).get("extension_preferences", {})
    if "user_prompt" in ext:
        new_prompt = ext["user_prompt"]

for field_name, value in (
    ("user_instructions", new_instr),
    ("user_prompt", new_prompt),
):
    if value is not None and not isinstance(value, str):
        return {
            "success": False,
            "config_saved": False,
            "error": f"{field_name} must be a string.",
        }
```

Add one small writer:

```python
@staticmethod
def _write_utf8_text(path: str, value: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as stream:
        stream.write(value)
```

Extract the current JSON-config block into this complete helper; add `import copy`
near the other stdlib imports:

```python
def _write_user_config(self, incoming_config: dict) -> dict:
    user_config_path = os.path.join(USER_DATA_DIR, "config.json")
    current_data: dict = {}
    if os.path.exists(user_config_path):
        try:
            with open(user_config_path, "r", encoding="utf-8") as stream:
                current_data = json.load(stream)
        except (OSError, json.JSONDecodeError):
            current_data = {}

    config_to_write = copy.deepcopy(incoming_config)
    ext_prefs = config_to_write.get("extension_preferences")
    if isinstance(ext_prefs, dict):
        ext_prefs.pop("user_prompt", None)
    current_ext = current_data.get("extension_preferences")
    if isinstance(current_ext, dict):
        current_ext.pop("user_prompt", None)

    if "skill_directories" in config_to_write:
        incoming_skills = config_to_write["skill_directories"]
        workspace_skill = (
            os.path.normpath(
                os.path.join(self.root_path, ".github", "skills")
            )
            if self.root_path
            else None
        )
        config_to_write["skill_directories"] = [
            skill
            for skill in incoming_skills
            if workspace_skill is None
            or os.path.normpath(skill) != workspace_skill
        ]

    self._encrypt_secrets_before_write(config_to_write)
    current_data.update(config_to_write)
    with open(user_config_path, "w", encoding="utf-8") as stream:
        json.dump(current_data, stream, indent=2)

    saved_ext = current_data.get("extension_preferences", {})
    _apply_log_level(saved_ext.get("log_level", "INFO"))
    try:
        raw_timeout = int(saved_ext.get("analyze_timeout_seconds", 1200))
    except (TypeError, ValueError):
        raw_timeout = 1200
    self.analyze_timeout_seconds = max(60, min(3600, raw_timeout))
    return current_data
```

Replace the old inline JSON block and the old instruction/prompt writes with this
exact boundary, then leave the existing case-preserving refresh block immediately
after it:

```python
config_saved = False
try:
    if "config" in payload:
        incoming_config = payload["config"]
        if not isinstance(incoming_config, dict):
            raise TypeError("config must be an object")
        self._write_user_config(incoming_config)
    if new_instr is not None:
        self._write_utf8_text(
            os.path.join(USER_DATA_DIR, "copilot-instructions.md"),
            new_instr,
        )
    if new_prompt is not None:
        self._write_utf8_text(
            os.path.join(USER_DATA_DIR, "user_prompt.md"),
            new_prompt,
        )
    config_saved = True
except secret_store.EncryptError as error:
    logger.error(
        "Secret encryption failed; configuration was not saved: %s",
        type(error).__name__,
    )
    return {
        "success": False,
        "config_saved": False,
        "error": "Configuration was not saved.",
    }
except Exception as error:
    logger.error("Configuration write failed: %s", type(error).__name__)
    return {
        "success": False,
        "config_saved": False,
        "error": "Configuration was not saved.",
}
```

If one durable write fails after another succeeded, return `config_saved=false`;
this means the complete requested operation did not finish, not that an automatic
rollback occurred. The Extension revision remains unacknowledged and retries the
newest instruction text.

Return these exact shapes:

```python
{"success": True, "config_saved": True,
 "message": "Configuration updated and session refreshed."}
```

```python
{"success": False, "config_saved": True,
 "error_code": prompt_error.error_code, "error": str(prompt_error)}
```

```python
{"success": False, "config_saved": False,
 "error": "Configuration was not saved."}
```

For a non-prompt refresh failure, omit `error_code` and use the existing safe generic refresh message.

- [ ] **Step 5: Stop logging prompt values and prompt-source paths**

Replace `send_message` full JSON logging with metadata:

```python
logger.debug(
    "Sending message: requestId=%r status=%r action=%r error=%r error_code=%r data_type=%s",
    message_content.get("requestId"),
    message_content.get("status"),
    message_content.get("action"),
    message_content.get("error"),
    message_content.get("error_code"),
    type(message_content.get("data")).__name__,
)
```

Remove `logger.debug(f"Scrubbed Prompt content: {prompt}")`. Resolver logs may include source mode, file basename, and a short fingerprint prefix, but never full paths or content.

- [ ] **Step 6: Run Host config and full Host suites**

```powershell
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources -v
& "host\venv\Scripts\python.exe" -m unittest discover host
```

Expected: all tests pass.

- [ ] **Step 7: Perform Task 3 break-and-fail proofs**

| Temporary mutation | Test that must fail |
|---|---|
| Restore `primary or legacy` selection | explicit-empty tests |
| Let get-config call strict snapshot resolver | soft-health/no-snapshot test |
| Return old `{error: ...}` refresh failure | structured-result test |
| Restore full JSON send logging | safe-logging test |
| Represent unreadable DH file as `""` | unreadable-omits-raw test |

Restore and rerun `host.test_prompt_sources` plus full Host discovery.

- [ ] **Step 8: Commit Task 3**

```powershell
git add host/dh_native_host.py host/test_prompt_sources.py
git commit -m "fix(config): surface prompt source health and clears"
```

---

### Task 4: Extension Error Transport, Persistence, and FAB Display

**Files:**
- Create: `extension/src/utils/promptSourceErrors.ts`
- Create: `extension/src/utils/promptSourceErrors.test.ts`
- Modify: `extension/src/utils/translations.ts:88-126,175-187`
- Modify: `extension/src/utils/analysisStore.ts:17-27,186-204`
- Modify: `extension/src/background/analyzeBridge.ts:18-93`
- Modify: `extension/src/background/analyzeBridge.test.ts:34-251`
- Modify: `extension/src/background/serviceWorker.ts:121-203`
- Modify: `extension/src/hooks/useAnalysisHydration.ts:23-29,87-96`
- Modify: `extension/src/hooks/useAnalysisHydration.test.ts:157-180`
- Modify: `extension/src/components/FAB.tsx:33-42,231-237,308-324,449-481,975-990`
- Create: `extension/src/components/FAB.promptSourceErrors.test.tsx`

**Interfaces:**
- Produces: `normalizeErrorCode()`, `localizePromptSourceError()`, optional `LastAnalysis.errorCode`, and normalized native response preservation.
- Consumed by: Task 6 Options warnings.

- [ ] **Step 1: Write failing localization tests**

Create `extension/src/utils/promptSourceErrors.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
    localizePromptSourceError,
    normalizeErrorCode,
} from './promptSourceErrors'

const copy: Record<string, string> = {
    promptErrorDhCoreMissing: 'core missing',
    promptErrorDhCoreUnreadable: 'core unreadable',
    promptErrorDhSpecificUnreadable: 'DH instructions unreadable',
    promptErrorRepositoryMissing: 'repository instructions missing',
    promptErrorRepositoryUnreadable: 'repository instructions unreadable',
}
const t = (key: string) => copy[key] ?? key

describe('prompt source error localization', () => {
    it.each([
        ['dh_core_prompt_missing', 'core missing'],
        ['dh_core_prompt_unreadable', 'core unreadable'],
        ['dh_specific_instructions_unreadable', 'DH instructions unreadable'],
        ['repository_instructions_missing', 'repository instructions missing'],
        ['repository_instructions_unreadable', 'repository instructions unreadable'],
    ])('maps %s and ignores fallback', (code, expected) => {
        expect(localizePromptSourceError(code, 'HOST FALLBACK', t)).toBe(expected)
    })

    it('returns fallback for unknown or missing codes', () => {
        expect(localizePromptSourceError('future_code', 'fallback', t)).toBe('fallback')
        expect(localizePromptSourceError(undefined, 'fallback', t)).toBe('fallback')
    })

    it('preserves only non-empty string codes', () => {
        expect(normalizeErrorCode('future_code')).toBe('future_code')
        expect(normalizeErrorCode('')).toBeUndefined()
        expect(normalizeErrorCode(42)).toBeUndefined()
    })

    it.each([
        'dh_core_prompt_missing',
        'dh_core_prompt_unreadable',
        'dh_specific_instructions_unreadable',
        'repository_instructions_missing',
        'repository_instructions_unreadable',
    ])('has real English and Chinese copy for %s', code => {
        const english = localizePromptSourceError(
            code,
            'fallback',
            key => getTranslation(key, 'en'),
        )
        const chinese = localizePromptSourceError(
            code,
            'fallback',
            key => getTranslation(key, 'zh'),
        )
        expect(english).not.toBe('fallback')
        expect(chinese).not.toBe('fallback')
        expect(english).not.toBe(chinese)
        expect(`${english} ${chinese}`.toLowerCase()).not.toMatch(
            /re-auth|authenticate|重新登录/,
        )
    })
})
```

Import `getTranslation` from `./translations` in this test file.

- [ ] **Step 2: Run localization test and verify RED**

```powershell
npm run test:run --prefix extension -- src/utils/promptSourceErrors.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement shared error normalization/localization and translations**

Create `promptSourceErrors.ts`:

```typescript
export type KnownPromptSourceErrorCode =
    | 'dh_core_prompt_missing'
    | 'dh_core_prompt_unreadable'
    | 'dh_specific_instructions_unreadable'
    | 'repository_instructions_missing'
    | 'repository_instructions_unreadable'

export type Translate = (key: string) => string

const TRANSLATION_KEYS: Record<KnownPromptSourceErrorCode, string> = {
    dh_core_prompt_missing: 'promptErrorDhCoreMissing',
    dh_core_prompt_unreadable: 'promptErrorDhCoreUnreadable',
    dh_specific_instructions_unreadable: 'promptErrorDhSpecificUnreadable',
    repository_instructions_missing: 'promptErrorRepositoryMissing',
    repository_instructions_unreadable: 'promptErrorRepositoryUnreadable',
}

export function normalizeErrorCode(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined
}

export function localizePromptSourceError(
    errorCode: unknown,
    fallback: string,
    t: Translate,
): string {
    const normalized = normalizeErrorCode(errorCode)
    if (normalized && normalized in TRANSLATION_KEYS) {
        return t(TRANSLATION_KEYS[normalized as KnownPromptSourceErrorCode])
    }
    return fallback
}
```

Add English and Chinese translations for all five codes. Messages must be actionable and must not mention authentication. Add the renamed DH-specific and Repository ONLY labels later in Task 5.

- [ ] **Step 4: Write failing bridge and hydration tests**

Extend `analyzeBridge.test.ts`:

```typescript
it('UI-I6: persists inner prompt error_code unchanged', async () => {
    const send = vi.fn(async () => ({
        status: 'success',
        data: {
            status: 'error',
            error_code: 'repository_instructions_missing',
            error: 'safe fallback',
        },
    }))
    const response = await handleAnalyzeForward(
        { action: 'analyze_error' }, CTX, { send },
    )
    const stored = await readStorage('dh_last_analysis')
    expect(stored.errorCode).toBe('repository_instructions_missing')
    expect(stored.content).toBe('safe fallback')
    expect(response.data.error_code).toBe('repository_instructions_missing')
})

it('UI-I6: normalizes outer error and preserves error_code', () => {
    expect(normalizeNativeHostResponse({
        status: 'error',
        error_code: 'dh_core_prompt_missing',
        error: 'safe outer fallback',
    })).toEqual({
        status: 'error',
        error_code: 'dh_core_prompt_missing',
        error: 'safe outer fallback',
    })
})

it('UI-I6: persists unknown codes unchanged', async () => {
    const send = vi.fn(async () => ({
        status: 'success',
        data: {
            status: 'error',
            error_code: 'future_code',
            error: 'future fallback',
        },
    }))
    await handleAnalyzeForward(
        { action: 'analyze_error' }, CTX, { send },
    )
    const stored = await readStorage('dh_last_analysis')
    expect(stored.errorCode).toBe('future_code')
    expect(stored.content).toBe('future fallback')
})

it('send rejection stores no fabricated errorCode', async () => {
    const send = vi.fn(async () => {
        throw new Error('disconnected')
    })
    await expect(handleAnalyzeForward(
        { action: 'analyze_error' }, CTX, { send },
    )).rejects.toThrow('disconnected')
    const stored = await readStorage('dh_last_analysis')
    expect(stored.errorCode).toBeUndefined()
})

it('safe summary excludes prompt-bearing data', () => {
    const summary = summarizeNativeHostMessage({
        requestId: 'r1',
        status: 'success',
        data: {
            _user_instructions_raw: 'DO-NOT-LOG-INSTRUCTIONS',
            extension_preferences: {
                user_prompt: 'DO-NOT-LOG-USER-PROMPT',
            },
        },
    })
    const rendered = JSON.stringify(summary)
    expect(rendered).not.toContain('DO-NOT-LOG-INSTRUCTIONS')
    expect(rendered).not.toContain('DO-NOT-LOG-USER-PROMPT')
})
```

Import `normalizeNativeHostResponse` and `summarizeNativeHostMessage` alongside
`handleAnalyzeForward`. Extend `useAnalysisHydration.test.ts`:

```typescript
it('UI-I6: hydrates coded prompt errors', async () => {
    seedStorage({
        dh_last_analysis: makeLast({
            status: 'error',
            content: 'safe fallback',
            errorCode: 'repository_instructions_missing',
        }),
    })
    const { result } = renderHook(() => useAnalysisHydration(CASE_A))
    await waitFor(() => expect(result.current.popover).not.toBeNull())
    expect(result.current.popover).toMatchObject({
        content: 'safe fallback',
        errorCode: 'repository_instructions_missing',
    })
})
```

- [ ] **Step 5: Run bridge/hydration tests and verify RED**

```powershell
npm run test:run --prefix extension -- src/background/analyzeBridge.test.ts src/hooks/useAnalysisHydration.test.ts
```

Expected: failures because `LastAnalysis` and hydrated popovers do not expose `errorCode`.

- [ ] **Step 6: Preserve codes through storage and Native Messaging**

Add `errorCode?: string` to `LastAnalysis` and `HydratedPopover`. Change:

```typescript
export async function recordAnalyzeError(
    ctx: AnalyzePersistContext,
    errorMessage: string,
    errorCode?: string,
): Promise<void>
```

Store raw fallback plus raw normalized code. In `handleAnalyzeForward`, extract `inner?.error_code` first and outer `response?.error_code` second.

Export these pure helpers from `analyzeBridge.ts` and use them from `serviceWorker.ts`:

```typescript
export function normalizeNativeHostResponse(msg: any): any {
    if (msg?.status === 'success') {
        return { status: 'success', data: msg.data }
    }
    const errorCode = normalizeErrorCode(msg?.error_code)
    return {
        status: 'error',
        error: msg?.error || msg?.message,
        ...(errorCode ? { error_code: errorCode } : {}),
    }
}

export function summarizeNativeHostMessage(msg: any): {
    requestId?: string
    status?: string
    action?: string
    errorCode?: string
} {
    return {
        requestId: typeof msg?.requestId === 'string' ? msg.requestId : undefined,
        status: typeof msg?.status === 'string' ? msg.status : undefined,
        action: typeof msg?.action === 'string' ? msg.action : undefined,
        errorCode: normalizeErrorCode(
            msg?.error_code ?? msg?.data?.error_code,
        ),
    }
}
```

Add a test that passes markers under `msg.data._user_instructions_raw` and
`msg.data.extension_preferences.user_prompt`, stringifies the summary, and
asserts neither marker appears. Replace the Service Worker full-message console
log with `console.log('[DH-SW] Received host message:',
summarizeNativeHostMessage(msg))`.

- [ ] **Step 7: Wire one render-time localization path in FAB**

Export `ResultPopover` for focused rendering tests, then create `extension/src/components/FAB.promptSourceErrors.test.tsx`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { installChromeMock, resetChromeMock, seedStorage } from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

vi.mock('../utils/telemetry', () => ({
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    hashCaseId: vi.fn().mockResolvedValue('hash'),
}))

import { ResultPopover } from './FAB'

describe('ResultPopover prompt-source localization', () => {
    beforeEach(() => {
        resetChromeMock()
        installChromeMock()
        seedStorage({ dh_prefs: { language: 'en' } })
    })

    it('UI-I6: known code localizes immediate fallback at render time', () => {
        render(
            <PrefsLanguageProvider language="en">
                <ResultPopover
                    isOpen
                    onClose={() => undefined}
                    title="Analysis Failed"
                    content="HOST FALLBACK"
                    errorCode="repository_instructions_missing"
                />
            </PrefsLanguageProvider>,
        )
        expect(screen.queryByText('HOST FALLBACK')).toBeNull()
        expect(screen.getByText(/Repository Instructions are missing/i)).toBeTruthy()
    })

    it('UI-I6: unknown code displays stored fallback', () => {
        render(
            <PrefsLanguageProvider language="en">
                <ResultPopover
                    isOpen
                    onClose={() => undefined}
                    title="Analysis Failed"
                    content="HOST FALLBACK"
                    errorCode="future_code"
                />
            </PrefsLanguageProvider>,
        )
        expect(screen.getByText('HOST FALLBACK')).toBeTruthy()
    })
})
```

Add a full-FAB hydration wiring test in the same file, with module mocks declared
before importing `FAB`:

```typescript
vi.mock('../utils/pageReader', () => ({
    PageReader: {
        scanForErrors: vi.fn().mockResolvedValue({
            caseNumber: '1234567890123456',
            ticketTitle: 'fixture',
        }),
    },
}))
vi.mock('../hooks/useAnalysisHydration', () => ({
    useAnalysisHydration: () => ({
        popover: {
            isOpen: true,
            status: 'error',
            title: 'Analysis Failed',
            content: 'HYDRATED HOST FALLBACK',
            errorCode: 'repository_instructions_missing',
        },
        isAnalyzing: false,
        dismissPopover: vi.fn().mockResolvedValue(undefined),
    }),
}))
vi.mock('./MenuLogic', () => ({
    useMenuLogic: () => ({
        currentItems: [],
        canGoBack: false,
        navigateTo: vi.fn(),
        navigateBack: vi.fn(),
    }),
    resolveDynamicUrl: (value: string) => value,
}))

import FAB from './FAB'

it('UI-I6: full FAB copies hydrated errorCode into localized popover state', async () => {
    render(<FAB />)
    expect(await screen.findByText(
        /Repository Instructions are missing/i,
    )).toBeTruthy()
    expect(screen.queryByText('HYDRATED HOST FALLBACK')).toBeNull()
})
```

Keep all `vi.mock` declarations above both FAB imports. This test fails if the
hydration effect omits `errorCode` while the direct ResultPopover test continues
to pass, providing the required wiring proof.

Add `errorCode?: string` to ResultPopover props and state. Compute:

```typescript
const displayContent = localizePromptSourceError(errorCode, content, t)
```

Render `displayContent`, not `content`. Copy hydrated `errorCode` into state. Change:

```typescript
const showAnalysisError = (
    fallback: string,
    caseNumberOfRun?: string,
    errorCode?: string,
) => {
    const isStillOnRunCase =
        !caseNumberOfRun ||
        !currentCaseRef.current ||
        currentCaseRef.current === caseNumberOfRun
    if (isStillOnRunCase) {
        setResultPopover({
            isOpen: true,
            title: `❌ ${t('analysisFailed')}`,
            content: fallback,
            errorCode,
        })
        popoverIsAnalyze.current = true
        showStatusBubble(t('analysisFailed'), 'error', 4000)
        return
    }
    showStatusBubble(
        `${t('analysisFailed')} — Case ${caseNumberOfRun}`,
        'error',
        5000,
    )
}
```

Pass `analysisData?.error_code`, `nativeResp?.error_code`, or `response?.error_code` from the three existing error branches. Telemetry records `errorCode ?? 'unclassified'`, never raw prompt-source fallback text.

The existing hydration test proves a stored code reaches `HydratedPopover`; this focused ResultPopover test proves that both hydrated and immediate state use the same render-time localization component.

- [ ] **Step 8: Run focused Extension tests and build**

```powershell
npm run test:run --prefix extension -- src/utils/promptSourceErrors.test.ts src/background/analyzeBridge.test.ts src/hooks/useAnalysisHydration.test.ts src/components/FAB.promptSourceErrors.test.tsx
npm run build --prefix extension
```

Expected: tests pass and TypeScript/Vite build exits 0.

- [ ] **Step 9: Perform Task 4 break-and-fail proofs**

| Temporary mutation | Test that must fail |
|---|---|
| Drop inner `error_code` in bridge | coded persistence test |
| Translate before storage | stored-fallback assertion |
| Omit hydrated `errorCode` | hydration test |
| Omit `errorCode` from FAB hydration-to-state copy | full-FAB hydration wiring test |
| Treat unknown code as known | unknown fallback test |
| Return `msg.data` from `summarizeNativeHostMessage` | summary redaction test |

Restore and rerun focused tests plus build.

- [ ] **Step 10: Commit Task 4**

```powershell
git add extension/src/utils/promptSourceErrors.ts extension/src/utils/promptSourceErrors.test.ts extension/src/utils/translations.ts extension/src/utils/analysisStore.ts extension/src/background/analyzeBridge.ts extension/src/background/analyzeBridge.test.ts extension/src/background/serviceWorker.ts extension/src/hooks/useAnalysisHydration.ts extension/src/hooks/useAnalysisHydration.test.ts extension/src/components/FAB.tsx extension/src/components/FAB.promptSourceErrors.test.tsx
git commit -m "feat(extension): preserve prompt source errors"
```

---

### Task 5: Options Prompt Source Matrix and Labels

**Files:**
- Modify: `extension/src/components/Options.tsx:501-675,716-950,2312-2454`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/utils/translations.ts:17,88-116,175`

**Interfaces:**
- Consumes: Host `prompt_source_status` from Task 3 and localization helper from Task 4.
- Produces: `hasRootPath`, `effectiveRepositoryOnly`, root-aware disabled controls, and accurate bilingual labels.
- Consumed by: Task 6 persistence behavior.

- [ ] **Step 1: Extend Options test imports/helpers and write matrix tests**

Change the existing imports to include `screen`, `seedStorage`, `DEFAULT_PREFS`,
and `getTranslation`:

```typescript
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react'
import {
    installChromeMock,
    resetChromeMock,
    deferNextResponse,
    seedStorage,
    chromeMockSpies,
} from '../test/chromeMock'
import { DEFAULT_PREFS } from '../utils/prefs'
import { getTranslation } from '../utils/translations'
```

Then add:

```typescript
const openCopilotSection = async () => {
    const nav = await waitFor(() => {
        const element = document.querySelector(
            '[data-section="copilot"]',
        ) as HTMLButtonElement | null
        if (!element) throw new Error('copilot nav not rendered')
        return element
    })
    fireEvent.click(nav)
}
```

Add component tests:

```typescript
it('UI-I1: empty Host Root disables Repository ONLY without rewriting stored true', async () => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
        dh_prefs: {
            ...DEFAULT_PREFS,
            rootPath: 'C:\\StaleChromeRoot',
            useWorkspaceOnly: true,
        },
    })
    render(<Options />)
    await act(async () => deferred.resolve({
        status: 'success',
        data: {
            root_path: '',
            prompt_source_status: { status: 'ok' },
            extension_preferences: { use_workspace_only: true },
        },
    }))
    await openCopilotSection()
    const toggle = screen.getByRole('checkbox', {
        name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    expect(toggle.disabled).toBe(true)
    expect(toggle.checked).toBe(true)
    expect((document.querySelector(
        'input[name="rootPath"]',
    ) as HTMLInputElement).value).toBe('')
    expect(countUpdateConfigCalls()).toBe(0)
})

it('UI-I2/UI-I3: non-empty Root reapplies stored true and disables only repository-selected inputs', async () => {
    const deferred = deferNextResponse('get_config')
    render(<Options />)
    await act(async () => deferred.resolve({
        status: 'success',
        data: {
            root_path: 'C:\\MyCases',
            _user_instructions_raw: 'KEEP-ME',
            prompt_source_status: { status: 'ok' },
            extension_preferences: {
                use_workspace_only: true,
                user_prompt: 'USER-PROMPT',
            },
        },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1])
    const toggle = screen.getByRole('checkbox', {
        name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    const dhInstructions = screen.getByLabelText(
        /DH-specific Instructions/i,
    ) as HTMLTextAreaElement
    const userPrompt = screen.getByLabelText(
        /Custom User Prompt/i,
    ) as HTMLTextAreaElement
    expect(toggle.disabled).toBe(false)
    expect(toggle.checked).toBe(true)
    expect(dhInstructions.disabled).toBe(true)
    expect(dhInstructions.value).toBe('KEEP-ME')
    expect(userPrompt.disabled).toBe(false)
    expect(userPrompt.value).toBe('USER-PROMPT')
    expect((document.querySelector(
        'input[name="skillDirectories"]',
    ) as HTMLInputElement).disabled).toBe(true)
    expect((document.querySelector(
        'input[name="mcpConfigPath"]',
    ) as HTMLInputElement).disabled).toBe(true)
})

it('UI-I3: disabling Repository ONLY restores retained DH text', async () => {
    const getConfig = deferNextResponse('get_config')
    const update = deferNextResponse('update_config')
    render(<Options />)
    await act(async () => getConfig.resolve({
        status: 'success',
        data: {
            root_path: 'C:\\MyCases',
            _user_instructions_raw: 'KEEP-ME',
            prompt_source_status: { status: 'ok' },
            extension_preferences: { use_workspace_only: true },
        },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    const toggle = screen.getByRole('checkbox', {
        name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    fireEvent.click(toggle)
    await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
    }))
    const dhInstructions = screen.getByLabelText(
        /DH-specific Instructions/i,
    ) as HTMLTextAreaElement
    expect(dhInstructions.disabled).toBe(false)
    expect(dhInstructions.value).toBe('KEEP-ME')
})

it('UI-I5: renamed scope copy exists in English and Chinese', () => {
    expect(getTranslation('userInstructions', 'en')).toBe(
        'DH-specific Instructions',
    )
    expect(getTranslation('userInstructions', 'zh')).toBe('DH 专用指令')
    expect(getTranslation('useWorkspaceOnly', 'en')).toContain(
        'instructions ONLY',
    )
    expect(getTranslation('useWorkspaceOnly', 'zh')).toContain('指令')
})

it.each([
    { root: '', repositoryOnly: true },
    { root: 'C:\\MyCases', repositoryOnly: false },
    { root: 'C:\\MyCases', repositoryOnly: true },
])('UI-I4: Custom User Prompt stays enabled for %#', async state => {
    const deferred = deferNextResponse('get_config')
    render(<Options />)
    await act(async () => deferred.resolve({
        status: 'success',
        data: {
            root_path: state.root,
            prompt_source_status: { status: 'ok' },
            extension_preferences: {
                use_workspace_only: state.repositoryOnly,
                user_prompt: 'USER-PROMPT',
            },
        },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i }).at(-1)!)
    const prompt = screen.getByLabelText(
        /Custom User Prompt/i,
    ) as HTMLTextAreaElement
    expect(prompt.disabled).toBe(false)
    expect(prompt.value).toBe('USER-PROMPT')
})
```

Import `getTranslation` from `../utils/translations`. Add `name="skillDirectories"`, `name="mcpConfigPath"`, and localized `aria-label` attributes where the current JSX lacks testable/accessible identifiers.

- [ ] **Step 2: Run Options tests and verify RED**

```powershell
npm run test:run --prefix extension -- src/components/Options.test.tsx
```

Expected: checkbox is currently enabled with empty Root, Skills/MCP remain incorrectly disabled, and DH-specific editor remains enabled in repository mode.

- [ ] **Step 3: Implement the effective mode matrix**

Near Options state derivation add:

```typescript
const hasRootPath = Boolean(prefs.rootPath?.trim())
const effectiveRepositoryOnly =
    hasRootPath && prefs.useWorkspaceOnly !== false
```

Use `effectiveRepositoryOnly` to disable Skills, MCP, and the DH-specific textarea. Disable the checkbox only with `!hasRootPath`; keep its checked value bound to persisted preference. Do not write a preference when Root becomes empty.

Make Host Root hydration presence-aware:

```typescript
if ('root_path' in hostConfig && !touched.has('rootPath')) {
    const incomingRoot =
        typeof hostConfig.root_path === 'string' ? hostConfig.root_path : ''
    if (incomingRoot !== prev.rootPath) {
        newPrefs.rootPath = incomingRoot
        changed = true
    }
}
```

Add `name="rootPath"` to the Root input. Add `name` and localized `aria-label`
to both instruction textareas so tests and assistive technology can distinguish
them.

- [ ] **Step 4: Rename and explain prompt scopes in both languages**

Update translations:

- `userInstructions`: **DH-specific Instructions** / **DH 专用指令**.
- `useWorkspaceOnly`: **Use repository SKILLS, MCP, and instructions ONLY** / **仅使用仓库的 SKILLS、MCP 和指令**.
- Add `useWorkspaceOnlyDesc` stating the exact Root file and that Core/User Prompt remain active.
- Add `dhSpecificInstructionsInactive` explaining content is retained but inactive.
- Update reset copy and placeholders to use DH-specific terminology.

Render the new description under the checkbox and inactive explanation under the disabled editor.

- [ ] **Step 5: Run Options tests and break-and-fail proofs**

```powershell
npm run test:run --prefix extension -- src/components/Options.test.tsx
```

Temporary mutations and required failures:

| Mutation | Test |
|---|---|
| Derive mode from persisted toggle only | UI-I1 empty-Root test |
| Restore truthy-only Root hydration | Host-empty Root test |
| Keep DH editor enabled | UI-I3 test |
| Disable Custom User Prompt | UI-I4 test |
| Remove Chinese renamed copy | UI-I5 translation test |

Restore and rerun.

- [ ] **Step 6: Commit Task 5**

```powershell
git add extension/src/components/Options.tsx extension/src/components/Options.test.tsx extension/src/utils/translations.ts
git commit -m "feat(options): expose deterministic prompt source mode"
```

---

### Task 6: Options Health and Inspected Sparse Writes

**Files:**
- Modify: `extension/src/components/Options.tsx:516-604,716-950,1039-1218,1221-1255,1882-1894`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/utils/translations.ts`
- Create: `extension/src/utils/configUpdateResult.ts`
- Create: `extension/src/utils/configUpdateResult.test.ts`

**Interfaces:**
- Consumes: Host structured get/update results and `localizePromptSourceError()`.
- Produces: sparse `user_instructions`, retry-safe explicit clear, persistent prompt issue UI, and UI-I7 behavior.

- [ ] **Step 1: Write failing health, sparse-write, and update-result tests**

Create `extension/src/utils/configUpdateResult.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
    acknowledgeInstructionRevision,
    classifyConfigUpdateResponse,
    shouldIncludeUserInstructions,
} from './configUpdateResult'

describe('config update results', () => {
    it('classifies inner success as acknowledged', () => {
        expect(classifyConfigUpdateResponse({
            status: 'success',
            data: { success: true, config_saved: true },
        })).toEqual({ acknowledged: true, issue: null })
    })

    it('classifies saved refresh failure and preserves code', () => {
        expect(classifyConfigUpdateResponse({
            status: 'success',
            data: {
                success: false,
                config_saved: true,
                error_code: 'repository_instructions_missing',
                error: 'safe fallback',
            },
        })).toEqual({
            acknowledged: true,
            issue: {
                configSaved: true,
                errorCode: 'repository_instructions_missing',
                fallback: 'safe fallback',
            },
        })
    })

    it('classifies outer error as not saved', () => {
        expect(classifyConfigUpdateResponse({
            status: 'error',
            error_code: 'future_code',
            error: 'transport fallback',
        })).toEqual({
            acknowledged: false,
            issue: {
                configSaved: false,
                errorCode: 'future_code',
                fallback: 'transport fallback',
            },
        })
    })

    it('does not let an older response acknowledge a newer edit', () => {
        let editRevision = 1
        let ackRevision = 0
        const sentRevision = editRevision
        editRevision = 2
        ackRevision = acknowledgeInstructionRevision(
            ackRevision,
            sentRevision,
            true,
        )
        expect(ackRevision).toBe(1)
        expect(shouldIncludeUserInstructions(editRevision, ackRevision)).toBe(true)
    })

    it('does not acknowledge transport or unsaved failures', () => {
        expect(acknowledgeInstructionRevision(0, 1, false)).toBe(0)
    })
})
```

Add these helpers and integration tests to `Options.test.tsx`:

```typescript
const hydrateOptions = async (data: Record<string, unknown>) => {
    const deferred = deferNextResponse('get_config')
    render(<Options />)
    await act(async () => deferred.resolve({ status: 'success', data }))
    await openCopilotSection()
}

const openDhInstructionsEditor = async (): Promise<HTMLTextAreaElement> => {
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    return screen.getByLabelText(
        /DH-specific Instructions/i,
    ) as HTMLTextAreaElement
}

it('retains mirrored text when modern Host reports unreadable DH file', async () => {
    seedStorage({
        dh_prefs: { ...DEFAULT_PREFS, userInstructions: 'KEEP-MIRROR' },
    })
    await hydrateOptions({
        root_path: '',
        system_message: { content: 'DO-NOT-HYDRATE-CORE' },
        prompt_source_status: {
            status: 'error',
            error_code: 'dh_specific_instructions_unreadable',
            error: 'fallback',
        },
        extension_preferences: { use_workspace_only: false },
    })
    expect((await openDhInstructionsEditor()).value).toBe('KEEP-MIRROR')
    expect(screen.queryByText('DO-NOT-HYDRATE-CORE')).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(
        /DH-specific Instructions/i,
    )
})

it('hydrates an explicit empty DH instruction value', async () => {
    seedStorage({
        dh_prefs: { ...DEFAULT_PREFS, userInstructions: 'STALE' },
    })
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
    })
    expect((await openDhInstructionsEditor()).value).toBe('')
})

it('omits user_instructions from unrelated preference updates', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: 'UNCHANGED',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
    }))
    const call = chromeMockSpies.sendMessage.mock.calls
        .map(entry => entry[0] as any)
        .find(message => message?.payload?.action === 'update_config')
    expect(Object.prototype.hasOwnProperty.call(
        call.payload.payload,
        'user_instructions',
    )).toBe(false)
})

it('sends explicit empty user_instructions when editor is cleared', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: 'CLEAR-ME',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
    })
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: '' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
    }))
    const calls = chromeMockSpies.sendMessage.mock.calls
        .map(entry => entry[0] as any)
        .filter(message => message?.payload?.action === 'update_config')
    expect(calls.at(-1).payload.payload.user_instructions).toBe('')
})

it('UI-I7: saved refresh failure preserves value and shows localized warning', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: 'KEEP',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
    })
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'SAVED-TEXT' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
        status: 'success',
        data: {
            success: false,
            config_saved: true,
            error_code: 'repository_instructions_missing',
            error: 'DO-NOT-SHOW-FALLBACK',
        },
    }))
    expect(editor.value).toBe('SAVED-TEXT')
    const alert = screen.getByRole('alert').textContent || ''
    expect(alert).toMatch(/saved/i)
    expect(alert).toMatch(/Repository Instructions/i)
    expect(alert).not.toContain('DO-NOT-SHOW-FALLBACK')
})

it('UI-I7: outer/unsaved errors show not-saved fallback', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
        status: 'error',
        error: 'OUTER-FALLBACK',
    }))
    const alert = screen.getByRole('alert').textContent || ''
    expect(alert).toMatch(/not saved/i)
    expect(alert).toContain('OUTER-FALLBACK')
})

it('unknown config error code uses Host fallback', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
        status: 'success',
        data: {
            success: false,
            config_saved: false,
            error_code: 'future_code',
            error: 'FUTURE HOST FALLBACK',
        },
    }))
    expect(screen.getByRole('alert').textContent).toContain(
        'FUTURE HOST FALLBACK',
    )
})

it('hydration catch-up inspects structured refresh errors', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => getConfig.resolve({
        status: 'success',
        data: {
            root_path: '',
            prompt_source_status: { status: 'ok' },
            extension_preferences: { use_workspace_only: false },
        },
    }))
    await act(async () => catchUp.resolve({
        status: 'success',
        data: {
            success: false,
            config_saved: true,
            error_code: 'dh_core_prompt_missing',
            error: 'fallback',
        },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
})

it('successful unrelated update does not erase prompt health warning', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
        root_path: '',
        _user_instructions_raw: 'KEEP',
        prompt_source_status: {
            status: 'error',
            error_code: 'dh_core_prompt_missing',
            error: 'fallback',
        },
        extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
})
```

Add this overlapping callback integration test:

```typescript
it('keeps revision 2 pending when revision 1 succeeds late', async () => {
    const getConfig = deferNextResponse('get_config')
    const firstUpdate = deferNextResponse('update_config')
    const secondUpdate = deferNextResponse('update_config')
    const thirdUpdate = deferNextResponse('update_config')
    render(<Options />)
    await act(async () => getConfig.resolve({
        status: 'success',
        data: {
            root_path: '',
            _user_instructions_raw: 'initial',
            prompt_source_status: { status: 'ok' },
            extension_preferences: { use_workspace_only: false },
        },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    const editor = screen.getByLabelText(
        /DH-specific Instructions/i,
    ) as HTMLTextAreaElement

    fireEvent.change(editor, { target: { value: 'revision-1' } })
    fireEvent.blur(editor)
    fireEvent.change(editor, { target: { value: 'revision-2' } })
    fireEvent.blur(editor)

    await act(async () => firstUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
    }))
    await act(async () => secondUpdate.resolve({
        status: 'error',
        error: 'retry revision 2',
    }))

    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => thirdUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
    }))

    const updateCalls = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls.at(-1).payload.payload.user_instructions).toBe(
        'revision-2',
    )
})
```

Use this assertion for sparse writes:

```typescript
const update = chromeMockSpies.sendMessage.mock.calls
    .map(call => call[0])
    .find(message => message?.payload?.action === 'update_config')
expect(
    Object.prototype.hasOwnProperty.call(
        update.payload.payload,
        'user_instructions',
    ),
).toBe(false)
```

- [ ] **Step 2: Run pure and Options tests and verify RED**

```powershell
npm run test:run --prefix extension -- src/utils/configUpdateResult.test.ts src/components/Options.test.tsx
```

Expected: pure helper module is missing; current builder always includes instructions, modern health is ignored, and update responses are fire-and-forget.

- [ ] **Step 3: Implement pure update classification and revision helpers**

Create `extension/src/utils/configUpdateResult.ts`:

```typescript
import { normalizeErrorCode } from './promptSourceErrors'

export interface ConfigUpdateIssue {
    configSaved: boolean
    errorCode?: string
    fallback?: string
}

export interface ConfigUpdateDecision {
    acknowledged: boolean
    issue: ConfigUpdateIssue | null
}

export function shouldIncludeUserInstructions(
    editRevision: number,
    acknowledgedRevision: number,
): boolean {
    return editRevision > acknowledgedRevision
}

export function acknowledgeInstructionRevision(
    acknowledgedRevision: number,
    sentRevision: number,
    acknowledged: boolean,
): number {
    return acknowledged
        ? Math.max(acknowledgedRevision, sentRevision)
        : acknowledgedRevision
}

export function classifyConfigUpdateResponse(
    response: any,
): ConfigUpdateDecision {
    if (response?.status !== 'success') {
        return {
            acknowledged: false,
            issue: {
                configSaved: false,
                errorCode: normalizeErrorCode(response?.error_code),
                fallback: String(
                    response?.error ||
                    response?.message ||
                    '',
                ),
            },
        }
    }
    const result = response.data
    if (result?.success === true) {
        return { acknowledged: true, issue: null }
    }
    if (result?.success === false || result?.error) {
        const configSaved = result?.config_saved === true
        return {
            acknowledged: configSaved,
            issue: {
                configSaved,
                errorCode: normalizeErrorCode(result?.error_code),
                fallback: String(
                    result?.error || '',
                ),
            },
        }
    }
    return {
        acknowledged: false,
        issue: {
            configSaved: false,
        },
    }
}
```

- [ ] **Step 4: Add raw prompt issue state and safe Host hydration**

Add:

```typescript
type PromptSourceIssue = {
    errorCode?: string
    fallback: string
}
const [promptHealthIssue, setPromptHealthIssue] =
    useState<PromptSourceIssue | null>(null)
const [configUpdateIssue, setConfigUpdateIssue] =
    useState<ConfigUpdateIssue | null>(null)
const userInstructionsEditRevisionRef = useRef(0)
const userInstructionsAckRevisionRef = useRef(0)
const configUpdateRequestRevisionRef = useRef(0)
```

Import `ConfigUpdateIssue`, `acknowledgeInstructionRevision`,
`classifyConfigUpdateResponse`, and `shouldIncludeUserInstructions` from
`../utils/configUpdateResult`.

When `prompt_source_status.status === 'error'`, store raw code/fallback in `promptHealthIssue`. When healthy, clear only `promptHealthIssue`. Hydrate `_user_instructions_raw` when the property exists, including `""`. Use legacy `system_message` only when `prompt_source_status` is entirely absent, indicating an old Host. Config-update success or failure updates only `configUpdateIssue`; it must never erase a still-valid get-config health warning.

Remove full Host config console logging; log only Host version and prompt-source status/error code.

- [ ] **Step 5: Make instruction persistence explicit and retry-safe**

Change the payload builder to:

```typescript
const buildHostConfigPayload = (
    nextPrefs: Preferences,
    options: { includeUserInstructions: boolean },
) => {
    const payload: Record<string, unknown> = {
        user_prompt: nextPrefs.userPrompt,
        config: {
            root_path: nextPrefs.rootPath,
            skill_directories: nextPrefs.skillDirectories
                ? nextPrefs.skillDirectories
                    .split(',')
                    .map(value => value.trim())
                    .filter(Boolean)
                : [],
            mcp_config_path: nextPrefs.mcpConfigPath,
            extension_preferences: {
                auto_analyze_mode: nextPrefs.autoAnalyzeMode,
                user_prompt: nextPrefs.userPrompt,
                enable_status_bubble: nextPrefs.enableStatusBubble,
                beta_channel_enabled: nextPrefs.betaChannelEnabled,
                use_workspace_only: nextPrefs.useWorkspaceOnly,
                log_level: nextPrefs.logLevel,
                language: nextPrefs.language,
                primary_color: nextPrefs.primaryColor,
                button_text: nextPrefs.buttonText,
                offset_bottom: nextPrefs.offsetBottom,
                offset_right: nextPrefs.offsetRight,
                team_catalog_enabled: nextPrefs.teamCatalogEnabled,
                team_manifest_url: nextPrefs.teamManifestUrl,
                team: nextPrefs.team,
                team_label: nextPrefs.teamLabel,
                analyze_timeout_seconds: nextPrefs.analyzeTimeoutSeconds,
                model: nextPrefs.model,
                reasoning_effort: nextPrefs.reasoningEffort,
                context_tier: nextPrefs.contextTier,
            },
        },
    }
    if (options.includeUserInstructions) {
        payload.user_instructions = nextPrefs.userInstructions ?? ''
    }
    return { action: 'update_config', payload }
}
```

Increment `userInstructionsEditRevisionRef.current` on every DH-specific textarea change and Reset. Do not increment during Host hydration. At the start of `persistPrefs`, before `chrome.storage.local.set`, capture:

```typescript
const instructionRevision = userInstructionsEditRevisionRef.current
```

Pass that captured value through the storage callback to `sendHostConfigUpdate`.
A Host update includes instructions only when captured `editRevision >
ackRevision`. On `success === true` or `config_saved === true`, acknowledge only
the captured revision with `ackRevision = Math.max(ackRevision,
instructionRevision)`; never read the current edit revision inside an
asynchronous callback. Transport and unsaved failures do not advance
acknowledgement, so a later update retries the newest text.

- [ ] **Step 6: Centralize and inspect every update_config response**

Add:

```typescript
const sendHostConfigUpdate = (
    nextPrefs: Preferences,
    options: {
        suppressTransportWarning?: boolean
        instructionRevision?: number
    } = {},
) => {
    const instructionRevision =
        options.instructionRevision ?? userInstructionsEditRevisionRef.current
    const includeUserInstructions =
        shouldIncludeUserInstructions(
            instructionRevision,
            userInstructionsAckRevisionRef.current,
        )
    const requestRevision = ++configUpdateRequestRevisionRef.current
    chrome.runtime.sendMessage({
        type: 'NATIVE_MSG',
        payload: buildHostConfigPayload(nextPrefs, {
            includeUserInstructions,
        }),
    }, (response) => {
        if (chrome.runtime.lastError) {
            if (
                !options.suppressTransportWarning &&
                requestRevision === configUpdateRequestRevisionRef.current
            ) {
                setConfigUpdateIssue({
                    fallback: chrome.runtime.lastError.message || t('configNotSaved'),
                    configSaved: false,
                })
            }
            return
        }
        const decision = classifyConfigUpdateResponse(response)
        if (includeUserInstructions) {
            userInstructionsAckRevisionRef.current =
                acknowledgeInstructionRevision(
                    userInstructionsAckRevisionRef.current,
                    instructionRevision,
                    decision.acknowledged,
                )
        }
        if (requestRevision === configUpdateRequestRevisionRef.current) {
            setConfigUpdateIssue(decision.issue)
        }
    })
}
```

Replace the normal persistence call with:

```typescript
sendHostConfigUpdate(nextPrefs, { instructionRevision })
```

Replace each of the three hydration catch-up `chrome.runtime.sendMessage`
blocks (Host-unreachable, successful get-config, and non-success get-config)
with:

```typescript
sendHostConfigUpdate(currentPrefs, {
    suppressTransportWarning: true,
    instructionRevision: userInstructionsEditRevisionRef.current,
})
```

The successful get-config updater uses its local `merged` variable instead:

```typescript
sendHostConfigUpdate(merged, {
    suppressTransportWarning: true,
    instructionRevision: userInstructionsEditRevisionRef.current,
})
```

Do not leave any direct `update_config` send in those four sites. The suppress
option applies only to `chrome.runtime.lastError`; a resolved outer/inner error
still goes through `classifyConfigUpdateResponse` and is shown.

Render the issue as a persistent alert. Localize at render time:

```typescript
const activeIssue = configUpdateIssue ?? promptHealthIssue
const issueDetail = activeIssue
    ? localizePromptSourceError(
        activeIssue.errorCode,
        activeIssue.fallback || t('configNotSaved'),
        t,
      )
    : ''
```

Prefix with `configSavedRefreshFailed` when `configUpdateIssue?.configSaved === true`, otherwise `configNotSaved` when `configUpdateIssue` exists and was not saved. A `promptHealthIssue` displayed without a config-update issue has no saved/not-saved prefix. Add a regression test: start with `dh_core_prompt_missing`, complete an unrelated successful update, and assert the Core warning remains visible.

- [ ] **Step 7: Run Options focused tests and full Extension suite**

```powershell
npm run test:run --prefix extension -- src/utils/configUpdateResult.test.ts src/components/Options.test.tsx
npm run test:run --prefix extension
npm run build --prefix extension
```

Expected: all tests and build pass.

- [ ] **Step 8: Perform Task 6 break-and-fail proofs**

| Mutation | Test |
|---|---|
| Always include `user_instructions` | unrelated-update sparse test |
| Acknowledge current revision instead of captured revision | overlapping-edit generation test |
| Use legacy system message on modern health error | retained-editor test |
| Ignore `config_saved` | saved-but-refresh-failed test |
| Bypass central sender in catch-up | catch-up inspection test |

Restore and rerun focused/full Extension tests.

- [ ] **Step 9: Commit Task 6**

```powershell
git add extension/src/components/Options.tsx extension/src/components/Options.test.tsx extension/src/utils/translations.ts extension/src/utils/configUpdateResult.ts extension/src/utils/configUpdateResult.test.ts
git commit -m "fix(options): inspect prompt config persistence"
```

---

### Task 7: Product and Developer Documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `USER_GUIDE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Modify: `docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md`
- Modify: `docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md`
- Modify: `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md`

**Interfaces:**
- Consumes: final implemented behavior from Tasks 1-6.
- Produces: durable operator/developer rules with no unverified test totals.

- [ ] **Step 1: Update user-facing documentation with the exact matrix**

In `USER_GUIDE.md`, document:

```text
Root empty, Repository ONLY ignored:
  DH Core + DH-specific Instructions + Custom User Prompt

Root non-empty, Repository ONLY off:
  DH Core + DH-specific Instructions + Custom User Prompt

Root non-empty, Repository ONLY on:
  DH Core + <Root>/.github/copilot-instructions.md + Custom User Prompt
```

State that CLI-global and other auto-discovered instruction files do not enter DH sessions, Core is always active, empty repository instruction files are valid, missing/unreadable selected files block Analyze, and existing Repository ONLY `true` values immediately gain instruction-selection semantics.

- [ ] **Step 2: Update developer and agent contracts**

In `DEVELOPER_GUIDE.md` and `ARCHITECTURE.md`, document immutable byte snapshots, strict UTF-8, fingerprint framing, Analyze-time comparison, same-UUID refresh, create/resume parity, soft get-config health, structured update result, and optional stored `errorCode`.

In `AGENTS.md`, add the critical rules:

- Never remove `skip_custom_instructions=True` from DH create/resume.
- Never inject DH-specific and Repository Instructions together.
- Never log prompt content or prompt-source paths.
- Every active-session invalidation clears `current_prompt_fingerprint`.
- Explicit empty `user_instructions` means truncate; omitted means no write.
- Options must inspect `update_config`; it is no longer universally fire-and-forget.
- Service Worker persistence preserves optional prompt `error_code` through hydration.

- [ ] **Step 3: Mark old research language as superseded**

Add a dated note to both 2026-07-14 research documents stating that the accepted 2026-07-15 prompt-scope spec supersedes the earlier recommendation to rely on CLI automatic workspace instruction discovery. Do not alter Stage 0/1 contract research.

Update `docs/session-handoff-2026-07-15.md` with the accepted spec/plan and implementation commit IDs. Preserve the historical beta.4 baseline counts as historical evidence; do not add new implementation totals until Task 8 has run them.

- [ ] **Step 4: Extend analysis-persistence schema documentation**

Update `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md` so `LastAnalysis` includes optional `errorCode?: string`, errors store raw Host fallback plus code, and localization occurs at immediate/rehydrated display time.

- [ ] **Step 5: Run documentation/static checks**

```powershell
git diff --check
git grep -n "Custom User Instructions\|Use repository SKILLS and MCP ONLY" -- AGENTS.md USER_GUIDE.md DEVELOPER_GUIDE.md ARCHITECTURE.md extension/src
git grep -n "skip_custom_instructions" -- AGENTS.md DEVELOPER_GUIDE.md host/dh_native_host.py
```

Expected: no unintended old user-facing labels; required isolation rule appears in code and docs; `git diff --check` exits 0.

- [ ] **Step 6: Commit Task 7**

```powershell
git add AGENTS.md USER_GUIDE.md DEVELOPER_GUIDE.md ARCHITECTURE.md docs/session-handoff-2026-07-15.md docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md
git commit -m "docs(prompt): document deterministic instruction scopes"
```

---

### Task 8: Full Verification and Review Gate

**Files:**
- Modify only if verification exposes a defect in files already listed above.
- Modify: `docs/session-handoff-2026-07-15.md`
- Create: `releases/notes-prompt-scope-cleanup-draft.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: evidence for implementation completion; no release or publication.

- [ ] **Step 1: Run Python syntax and focused Host tests**

```powershell
& "host\venv\Scripts\python.exe" -m compileall -q host
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources -v
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_session -v
& "host\venv\Scripts\python.exe" -m unittest host.test_session_workspace -v
& "host\venv\Scripts\python.exe" -m unittest host.test_sdk_compat -v
```

Expected: all exit 0.

- [ ] **Step 2: Run the full Host suite**

```powershell
& "host\venv\Scripts\python.exe" -m unittest discover host
```

Expected: all tests pass; record the exact total rather than assuming 109.

- [ ] **Step 3: Run focused and full Extension tests**

```powershell
npm run test:run --prefix extension -- src/utils/promptSourceErrors.test.ts src/background/analyzeBridge.test.ts src/hooks/useAnalysisHydration.test.ts src/components/Options.test.tsx
npm run test:run --prefix extension
```

Expected: all pass; record the exact full total rather than assuming 43.

- [ ] **Step 4: Build and run static Git checks**

```powershell
npm run build --prefix extension
git diff --check
git status --short
```

Expected: build exits 0, no whitespace errors, and only intended files are modified.

- [ ] **Step 5: Perform an authenticated marker smoke when available**

This is recommended evidence, not a completion gate. Create temporary distinct markers in the DH-specific, CLI-global, and Root instruction files; run a non-destructive SDK analysis in each source mode; verify only the selected marker affects the response; then restore all VM-local files from backups. Do not run this if Copilot authentication or a safe scratch Root is unavailable. Never use a real customer case or write MyCases canonical files.

- [ ] **Step 6: Request an independent code review**

Reviewer scope:

- Compare implementation against every PS-I, PF-I, and UI-I invariant.
- Check no automatic CLI instruction source can leak in.
- Check prompt errors never fall back to stale sessions.
- Check omitted versus empty `user_instructions` semantics.
- Check Host/Extension wire shapes and legacy optional-field behavior.
- Check no prompt contents or source paths reach logs/telemetry.
- Check MyCases integration remains out of scope.

Fix every Critical/Important finding, rerun affected focused tests, then rerun the full gates.

- [ ] **Step 7: Write final verification evidence and release draft**

Append the exact fresh Host/Extension totals, build result, static-check result, and optional-smoke status to `docs/session-handoff-2026-07-15.md`.

Create `releases/notes-prompt-scope-cleanup-draft.md` with complete prose and no blank sections:

```markdown
# Prompt Scope Cleanup (Next Beta Draft)

## Deterministic instruction sources

DH now disables Copilot CLI automatic custom-instruction discovery for DH sessions. Every analysis receives DH Core plus exactly one selected instruction source.

## Repository ONLY now includes instructions

With a non-empty Root Path, Repository ONLY selects Root `.github/copilot-instructions.md` together with repository Skills and MCP. When disabled, DH-specific Instructions are used instead. Custom User Prompt remains active for every Analyze.

## Existing-setting migration behavior

Existing `use_workspace_only=true` values take on the expanded behavior immediately. A selected but missing/unreadable Root instruction file blocks Analyze with an actionable error; an existing empty file is valid.

## Actionable prompt-source errors

Core, DH-specific, and Repository instruction read failures retain machine-readable error codes through immediate and rehydrated browser results.

## Verification

- The complete Host unittest suite passed.
- The complete Extension Vitest suite passed.
- The Extension production build passed.
- Python compileall and `git diff --check` passed.

## Upgrade notes

No instruction file or preference-key migration is performed. Existing DH-specific and Custom User Prompt content remains in `%LOCALAPPDATA%\DynamicsHelper`.
```

Create this draft only after Steps 1-4 have produced the stated evidence. Record the exact test totals and optional-smoke status in the handoff document, not in this concise release draft. Do not choose a version, alter version fields, tag, or publish. A later explicitly approved release task will rename the draft to the approved SemVer note filename.

Then run a stale-marker scan and commit:

```powershell
git grep -n "TBD\|TODO\|REPLACE_WITH_" -- docs/session-handoff-2026-07-15.md releases/notes-prompt-scope-cleanup-draft.md
git add docs/session-handoff-2026-07-15.md releases/notes-prompt-scope-cleanup-draft.md
git commit -m "docs(verification): record prompt scope test evidence"
```

Expected grep output: empty. Do not commit while any stale marker remains.

- [ ] **Step 8: Stop before integration or release actions**

Report branch, commits, exact test/build results, optional-smoke status, and remaining Stage 0/1 contract work. Do not merge, push, tag, package, change versions, or publish without a new explicit user instruction.
