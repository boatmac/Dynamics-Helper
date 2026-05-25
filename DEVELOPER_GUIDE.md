# Dynamics Helper - Developer Documentation

## Overview

This document explains the internal architecture and file responsibilities of the Dynamics Helper project. Use this to understand how the pieces fit together when debugging or adding new features.

## Architecture

The project consists of three main components:

1. **Browser Extension (Frontend):** A Chrome/Edge extension written in React/TypeScript. It handles the UI, page scraping, and user interaction.
2. **Native Host (Backend):** A Python script (`dh_native_host.py`) running locally on the user's machine. It acts as a bridge between the browser and the AI Agent.
3. **AI Agent (Copilot):** The GitHub Copilot CLI SDK, which performs the actual intelligence tasks (RAG, analysis, query generation).

## Directory Structure

### `extension/` (Frontend)

* **`src/components/FAB.tsx`**: The main UI component. It contains the "Analyze" logic, the safety timeout configuration (currently 600s), and the `isUserEdited` ref pattern for protecting user edits from background scans. All user-facing strings use `t()` from `useTranslation()` for i18n support.
* **`src/components/Options.tsx`**: The extension settings page. Handles preferences, Root Path, MCP/Skill directory config, team catalog sync, and update checking. User Instructions and User Prompt textareas include an Edit/Preview toggle for rendered Markdown preview.
* **`src/components/MarkdownPreview.tsx`**: Shared Markdown renderer using `react-markdown` + `remark-gfm`. Provides styled GFM rendering (headings, code blocks, tables, links, lists, blockquotes). Used by Options.tsx for preview toggles.
* **`src/utils/pageReader.ts`**: Logic for scraping Dynamics/Azure Portal pages to extract case numbers, error text, and context. Uses a 4-strategy cascade (header controls, label search, header container regex, ticket title fallback).
* **`src/background/serviceWorker.ts`**: Service worker handling telemetry (with stable anonymous UUID via `chrome.storage.local`), native messaging relay, and extension version injection.
* **`src/utils/telemetry.ts`**: Azure Application Insights integration for anonymous telemetry.
* **`manifest.json`**: Defines permissions (`nativeMessaging`) and background scripts.
* **`dist/`**: The build output directory. Load the extension from here (`extension/dist`).

### `host/` (Backend)

* **`dh_native_host.py`**: The core backend script.
  * **Loop:** Reads messages from `stdin` (from Chrome) and writes to `stdout`.
  * **Timeout:** Has a hard timeout (currently 600s) for Copilot requests.
  * **Logging:** Uses `_SafeRotatingFileHandler` (5 MB max, 3 backups) writing to `%LOCALAPPDATA%\DynamicsHelper\native_host.log`. Log level is configurable via the Options UI (DEBUG/INFO/WARNING/ERROR) and is applied at startup from `config.json`, then live-updated on `update_config`.
  * **Config Loading:** Prioritizes `%LOCALAPPDATA%` config over the local directory.
  * **Session Persistence:** Uses deterministic UUID v5 session IDs (derived from case IDs via `_case_to_session_id()`) for Copilot `/resume` support.
  * **Case ID Validation:** `_extract_case_id()` validates 16-digit case IDs and 19-digit task IDs.
* **`updater.py`**: Self-update mechanism. Downloads updates from GitHub releases. Copies all host files (exe, `_internal/` runtime, `system_prompt.md`) while protecting user files (`config.json`, `copilot-instructions.md`, logs) via `_USER_FILES` set. Handles locked `.exe` files by renaming to `.exe.old` (with `.old2`, `.old3` fallback for antivirus locks).
* **`pii_scrubber.py`**: PII redaction utility for sanitizing text before sending to the LLM.
* **`system_prompt.md`**: The base persona for the AI Agent.

### Test Files (`host/`)

* **`test_pii_scrubber.py`** — PII redaction tests.
* **`test_case_id.py`** — Case ID extraction/validation tests (16-digit, 19-digit, edge cases).
* **`test_analyze_flow.py`**, **`test_analyze_full.py`**, **`test_analyzer.py`** — Analysis pipeline tests.

### `%LOCALAPPDATA%\DynamicsHelper\` (User Configuration)

* **`config.json`**: Defines the MCP servers and Skill directories the Agent can use. Ships with a minimal default (`fetch` server); additional servers (Kusto, WorkIQ, etc.) are user-configured.
  * *Note:* In Production mode, this file is shared between the installed app and the user's overrides.
* **`native_host.log`**: The primary debug log.
* **`copilot-instructions.md`**: The active system prompt (User overrides).

---

## The Copilot Integration Pipeline

Understanding how a user request becomes an AI response.

### 1. The Prompt Pipeline

1. **User Input:** The user provides error text, context, and case metadata via the Extension UI.
2. **Native Messaging:** This data is sent to the `dh_native_host.exe` as a JSON payload (`analyze_error` action).
3. **PII Scrubbing (`pii_scrubber.py`):**
    * Before sending to the LLM, the `text` and `context` are scrubbed using regex.
    * **Removes:** Emails, IPv4 Addresses, US Phone Numbers.
    * **Note:** GUID redaction is currently disabled to preserve technical identifiers needed for troubleshooting (e.g., Subscription IDs, Resource IDs).
4. **Session Management:**
    * The backend validates the case number via `_extract_case_id()` (accepts 16 or 19 digits).
    * A stable session-name `co-<case>` is derived via `_case_to_session_id()` (B82 / MyCasesKit B81 RFC § D1) — the same string is the SDK `session_id` argument AND the shell-CLI `copilot --resume <name>` handle. History: prior UUID v5 derivation was retired 2026-05-11 after CLI `--resume <name>` corruption was verified fixed.
    * Smart refresh: the session is only recreated when `current_case_id` or workspace root path changes.
    * On session creation, `resume_session(name)` is tried first (restores conversation history, tool state). Falls back to `create_session(session_id=name)`.
    * The session name is injected into the `system_message` content as a `## Session Info` section (labelled `Session Name: co-<case>`), making it available to the AI during the conversation (e.g., for writing `context.md` frontmatter `session_name:` field).
5. **SDK Execution (`send_and_wait`):**
    * The backend sends the prompt as a plain string (SDK 0.2.0+, still applies in 0.3.0) with a **600s timeout**.

### 2. Session Persistence

The host maintains persistent sessions so users can continue analysis in the Copilot CLI.

* **Session ID:** A deterministic UUID v5 derived from the case ID via `_case_to_session_id()`. The same case always produces the same UUID, enabling resume across restarts. The Copilot CLI requires session IDs to be valid UUIDs (not arbitrary strings like `dh-{caseId}`).
* **Server Verification:** After `create_session()`, the session ID is read from `session.session_id` and stored in `self.current_session_id`.
* **Case Tracking:** `self.current_case_id` tracks which case the current session belongs to, used for smart-refresh comparison (not the session ID itself).
* **SDK Mechanism:** `client.resume_session(session_id)` restores state from `~/.copilot/session-state/{session_id}/`.
* **Graceful Fallback:** If the SDK version doesn't support `resume_session()`, an `AttributeError` is caught and a new session is created instead.
* **Report Integration:** `dh_case_report.md` includes the session name (`co-<case>`) and a `copilot --resume <name>` command.
* **Response Payload:** The session name is returned to the extension as `session_name` in the analysis response for frontend visibility (renamed from `session_id` in B82 to match the B81 cross-CLI naming RFC).
* **System Message Injection:** The session name is appended to the `system_message` content as a `## Session Info` section (labelled `Session Name: co-<case>`) before session creation. This ensures the AI can reference it (e.g., for `context.md` frontmatter `session_name:` field) without relying on a fallback value.

### 3. Instruction Hierarchy (The Context)

The "System Prompt" is built from three layers, merged at runtime in `_get_session_config`. The resulting dict is unpacked into keyword-only arguments for `create_session()` (SDK 0.2.0 no longer accepts a single config dict; 0.3.0 also requires keyword-only — see `docs/sdk-upgrade-2026-05-0.3.0.md`). After the three layers are merged, the session ID is appended as a `## Session Info` section (runtime augmentation in `_refresh_session`):

1. **Layer 1: System Instructions (Immutable)**
    * Source: `host/system_prompt.md` (or beside exe).
    * Content: Base persona, core capabilities, safety rules.

2. **Layer 2: User Instructions (Customizable)**
    * Source: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`.
    * Content: User-specific preferences managed via the Extension Options Page.

3. **Layer 3: Workspace Instructions (Project-Specific)**
    * Source: `[Root Path]/.github/copilot-instructions.md`.
    * Content: Project-specific rules (if a Root Path is configured in the extension).

**Repository ONLY Logic:** If "Repo Only" is enabled (`useWorkspaceOnly = true`) and a Root Path is configured, only Workspace Instructions (Layer 3) are used. Layer 2 (User) and Layer 1 (System) instructions are still loaded, but Workspace Skills and MCP servers completely replace their global counterparts.

### 4. Skills Configuration

Capabilities (Skills) are loaded based on the following precedence:

1. **Base Skills:**
    * **User Skills:** Defined in `%LOCALAPPDATA%\config.json`.
    * **Default Skills:** The `host/skills/` directory is reserved for bundled skills but currently ships empty. Skills are user-configured.
    * *Rule:* User Settings **override** Default Settings. If `skill_directories` exists in User Config, Default is ignored.

2. **Workspace Skills:**
    * **Source:** `[Root Path]/.github/skills` directory.
    * *Rule:* Workspace skills are **appended** to Base Skills.

3. **Repository ONLY Mode:**
    * If enabled: The AI uses **ONLY** Workspace Skills. Base Skills (User + Default) are ignored.

### 5. MCP Configuration

Model Context Protocol (MCP) servers follow similar logic:

1. **Base MCP:**
    * **User Config:** Defined in `%LOCALAPPDATA%\config.json` (legacy) or `~/.copilot/mcp-config.json` (standard).
    * **Default Config:** Bundled `mcp-config.json` (if any).
    * *Rule:* User Settings **override** Default Settings.

2. **Workspace MCP:**
    * **Source:** `[Root Path]/.github/mcp-config.json`.
    * *Rule:* Workspace MCP servers are **merged** into Base MCP servers.

3. **Repository ONLY Mode:**
    * If enabled: The AI uses **ONLY** Workspace MCP servers. Base MCP servers are ignored.

---

## Frontend Patterns

### User Edit Protection (`isUserEdited` Pattern)

Background scans (MutationObserver, `useEffect` on `isOpen`) continuously scrape the page and update `scrapedData`. Without protection, these overwrites any user edits to the Case Context textarea.

**Implementation (see `FAB.tsx`):**

1. A `useRef<boolean>` flag `isUserEdited` tracks whether the user has manually edited the textarea.
2. The textarea's `onChange` handler sets `isUserEdited.current = true`.
3. All `setScrapedData` calls from background scans check `isUserEdited.current` before overwriting.
4. The flag resets to `false` only on:
   * **Identity change:** New case number or ticket title detected (SPA navigation).
   * **Explicit refresh:** User clicks the refresh button (`handleRefreshContext`).

**Rule:** Any new code path that calls `setScrapedData` from a background process MUST check `isUserEdited.current` first.

### Telemetry

* **Anonymous Identity:** Stable UUID generated via `chrome.storage.local` in `serviceWorker.ts`. Do NOT use cookies/localStorage (unavailable in service workers).
* **Extension Version:** Injected automatically in `trackBackgroundEvent`. Do NOT rely on `item.data` for version stamping.
* **Querying:** Use `dcount(user_Id)` in App Insights for unique user counts. The `user_Id` fix only works from v2.0.56+; older versions have empty user IDs.

### Internationalization (i18n)

* **Hook:** `useTranslation()` from `src/utils/i18n.ts` returns a `t(key)` function.
* **Dictionary:** `src/utils/translations.ts` maps keys to `{ en, zh }` string pairs.
* **Rule:** All user-facing strings in FAB.tsx and Options.tsx must use `t('key')` lookups. Do not hardcode English strings in UI code.
* **Status messages:** Timeout comparisons that use `setStatus(prev => prev === "..." ? "..." : prev)` must capture the translated string into a local variable before the `setTimeout` closure (see the `checkingMsg` / `timedOutMsg` pattern in Options.tsx).

---

## Extension Testing

The extension test suite uses **Vitest 3 + Testing Library (React 16) + jsdom**. Tests live next to source as `*.test.ts` / `*.test.tsx`.

### Running

```bash
cd extension && npm run test:run        # CI mode (one-shot)
cd extension && npm test                # watch mode (dev)
cd extension && npm run test:coverage   # with V8 coverage
```

### Config (`vitest.config.ts`)

Standalone config — **does NOT extend `vite.config.ts`**. The CRXJS plugin used for the extension build is incompatible with jsdom (it tries to resolve `chrome.runtime.getManifest()` at evaluate-time and crashes). The test config only enables the React plugin + jsdom environment.

`pool: 'forks'` is used instead of the default threads pool because some chrome mock state is module-level and benefits from per-worker isolation.

### Chrome API Mock (`src/test/chromeMock.ts`)

Provides a complete mock of the chrome.runtime + chrome.storage surfaces used by the extension. Public API:

* `installChromeMock()` — call in `beforeEach`. Wires `globalThis.chrome` to the mock.
* `resetChromeMock()` — clears storage, pending responses, message log, **and spy call counts**.
* `seedStorage({ ... })` — pre-populate `chrome.storage.local` before render.
* `deferNextResponse(action)` — pause the next outgoing message with the given `action`. Returns a controller with `.resolve(response)` / `.reject(error)`. Used to hold `get_config` open while the test simulates user edits inside the hydration window.
* `chromeMockSpies` — `{ sendMessage, storageGet, storageSet, storageRemove }`, each a `vi.fn()`. Used for call-count assertions and inspecting outgoing payloads.

The mock supports **both callback-style** (`chrome.runtime.sendMessage(msg, cb)`) and **Promise-style** (`await chrome.runtime.sendMessage(msg)`) APIs. Pick the matching style for the code under test — the production code uses callback style for `sendMessage` and Promise style for `chrome.storage.local`.

**Spy reset is mandatory.** `resetChromeMock()` calls `.mockClear()` on all four spies. Without this, spy counts accumulate across tests in the same file because the spy objects themselves are module-level singletons. The 6-invariant `Options.test.tsx` suite depends on per-test call counting and will silently report false positives if spies leak.

### The 6-Invariant Pattern for `Options.test.tsx`

The Options page hydration window has 6 distinct invariants documented in `docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md` (§ 4 + § 5 test matrix). Each invariant gets exactly one test:

| ID | What it asserts | Failure mode it catches |
|---|---|---|
| Inv1 | storage.set succeeds during hydration window (segment 1 ungated) | Adding a hydration gate to segment 1 breaks fast local persistence |
| Inv2 | host RPC is gated during hydration window (segment 2 gated) | Removing the gate clobbers `config.json` with DEFAULT_PREFS values |
| Inv3 | hydration merge skips user-touched fields | Removing `!touched.has('X')` overwrites user edits |
| Inv4 | catch-up RPC at hydration COMPLETE sends user value | Reading stale outer-closure `prefs` instead of `merged` (the React 19 race fixed in `0265a74`) |
| Inv5 | no catch-up RPC fires when nothing touched during window | Catch-up running unconditionally spams the host every Options open |
| Inv6 | Reset during window survives the late hydration merge | `handleReset` not marking DEFAULT_PREFS keys as touched lets late host response un-reset the user |

**Adding new tests:** Map 1:1 to a spec invariant. Don't write the same invariant twice with different fields (e.g., one test for `language`, one for `logLevel`, one for `enableStatusBubble`) — they all verify Inv3 with different payloads. Pick the field that exercises the path most cleanly.

**Break-and-fail verification** (required for new invariant tests): After the test passes, **temporarily break** the corresponding source code in `Options.tsx` and re-run the test to confirm it fails with a useful message. Then revert. This proves the test catches the regression named in its title. Commit `673b5aa` records the canonical break-and-fail table for all 6 invariants. Future invariants must include the same verification in the commit message.

### Race-Fix Regression Test (Inv4)

Inv4 specifically guards commit `0265a74`. The pre-fix bug: the post-hydration catch-up RPC was reading `mergedPrefs` from an outer-scope variable assigned **inside** a `setPrefs(prev => ...)` updater. React 19 sometimes schedules the updater on a later microtask tick, so the catch-up RPC ran before the assignment and silently sent stale state. Production "worked" because chrome IPC latency masked the race in the common case.

The fix relocates the catch-up RPC + `prefsHydratedRef.current = true` flip **inside** the success-branch `setPrefs` updater closure, reading `merged = changed ? newPrefs : prev` directly. Inv4 verifies this by deferring `get_config`, simulating a `language` edit during the window, then asserting the catch-up payload carries the user's new value.

If a future refactor moves the catch-up RPC back outside the updater closure (because "it looks cleaner") Inv4 will fail and tell you not to.

### Test File Conventions

* Tests live next to source: `Options.tsx` → `Options.test.tsx`, `pageReader.ts` → `pageReader.test.ts`.
* Use `installChromeMock()` + `resetChromeMock()` in `beforeEach` — every test must start with a clean chrome surface.
* Use `import.meta.env.DEV` checks sparingly in source code being tested; jsdom doesn't set MV3 service-worker globals so anything gated on those will throw.
* The `items.json` fetch warnings in test output are harmless (`unknown scheme` errors from jsdom's fetch implementation). Don't try to silence them in source — they're a jsdom limitation, not a real bug.

---

## Preferences State Management

All extension preferences (the `dh_prefs` chrome.storage.local key) are typed and managed through `extension/src/utils/prefs.ts`:

- **`Preferences` interface** — the canonical type. Add new fields here, never in component-local state declarations.
- **`DEFAULT_PREFS`** — single source of truth for default values. Components must not declare their own default dictionaries.
- **`usePrefs()` hook** — read-only React hook returning `{ prefs }`. Subscribes to `chrome.storage.onChanged` and re-renders consumers on any `dh_prefs` change.

### Reading prefs

Any component (FAB, future overlays, etc.) calls `usePrefs()`:

```typescript
import { usePrefs } from '../utils/prefs';

const MyComponent = () => {
    const { prefs } = usePrefs();
    return <div>{prefs.buttonText}</div>;
};
```

Do **not** call `chrome.storage.local.get('dh_prefs')` directly inside a React component. That bypasses the hook's onChanged subscription and creates the same two-sided default-value drift the refactor eliminated.

### Writing prefs

Only `Options.tsx::persistPrefs(nextPrefs, opts?)` writes. It (a) calls `chrome.storage.local.set({ dh_prefs })`, (b) fires `update_config` RPC to the host so `config.json` is mirrored (see AGENTS.md § 3 "Options config persistence principle"), (c) optionally re-fetches the team manifest if `opts.fetchManifest` is set. Other components do **not** write to `dh_prefs`.

#### Hydration guard (v2.0.70-beta.4+)

`persistPrefs` checks `prefsHydratedRef.current` at entry and **no-ops if false**. The ref starts `false` at mount and flips to `true` only after the host's `get_config` response is merged into state (success branch). It also flips to `true` on the `chrome.runtime.lastError` branch and the non-success-response branch — those are "host down / broken" fallbacks so the user can still operate Options without deadlocking, accepting that `dh_prefs` is the only source of truth in that session.

Why: between OptionsInner mount and the host's `get_config` response (≈100ms typical, multi-second if host is cold-starting or crashed), `prefs` holds `DEFAULT_PREFS` merged with `chrome.storage.local.dh_prefs`. If both are empty (fresh install, Remove+Load Unpacked, or any cache clear), fields like `rootPath` / `teamManifestUrl` / `team` / `userPrompt` are empty strings. A fast user click on a Language dropdown / toggle in that window would call `persistPrefs(DEFAULT_PREFS-merged)` and shallow-merge those empty values into `config.json` + truncate `user_prompt.md` (because the host's `handle_update_config` does `current_data.update(payload["config"])` and writes `user_prompt.md` whenever `user_prompt is not None` — empty string is not None).

If you add a new code path that writes prefs before hydration finishes — e.g. an effect that calls `updatePref` based on URL params — you must either wait for hydration or accept that the write will be silently dropped. The guard does not retry queued writes; the next user-triggered `persistPrefs` after hydration is what will sync state. UI local state is unaffected by the guard, so the user still sees their click take effect — only the disk write is suppressed.

### Documented exception — runtime overrides

FAB derives `rootPath` from the active D365 page URL at runtime. This override is a component-local `useState` (not a write to storage) and intentionally does not propagate to Options or to `config.json`. Pattern:

```typescript
const { prefs } = usePrefs();
const [rootPathOverride, setRootPathOverride] = useState<string | null>(null);
const effectivePrefs = rootPathOverride !== null
    ? { ...prefs, rootPath: rootPathOverride }
    : prefs;
```

Any future runtime-only override (a value that's component-derived rather than user-configured) must follow the same pattern: separate local state + merged `effectivePrefs` view. Do **not** call any setter on the hook's state — the hook is read-only by design.

### Service workers

`serviceWorker.ts` cannot use React hooks. If a service worker ever needs prefs, it reads `chrome.storage.local.get('dh_prefs')` directly. The "use the hook" convention applies to React-rendered contexts only.

---

## Secret encryption (DPAPI)

The host encrypts certain `extension_preferences` fields before persisting them to `%LOCALAPPDATA%\DynamicsHelper\config.json`. Currently this applies only to `team_manifest_url` (Azure Blob SAS URL containing an HMAC signature). The threat being mitigated is accidental disclosure: screenshots of `config.json`, backup-tool uploads of `%LOCALAPPDATA%`, and corporate DLP scans for secret patterns.

### Where the boundary lives

- **Extension side (`chrome.storage.local`, IPC payloads, UI):** plaintext. Encryption is not extended here because the extension needs plaintext to perform fetches, and chrome.storage.local lives in a different filesystem path than `config.json` (different scan/screenshot risk).
- **Host in-memory state (`self._get_session_config` return value, `get_config` response):** plaintext. Downstream code reads `extension_preferences.team_manifest_url` and is oblivious to whether it came from an encrypted blob.
- **`config.json` on disk:** encrypted. The plaintext key `team_manifest_url` MUST NEVER appear on disk. Only `team_manifest_url_encrypted` (base64 DPAPI blob) is persisted.

### Modules

- **`host/secret_store.py`** — ctypes wrapper around `Crypt32.dll`'s `CryptProtectData` / `CryptUnprotectData`. Exposes `encrypt(str) -> str`, `decrypt(str) -> str`, `EncryptError`, `DecryptError`. No new dependencies.
- **`NativeHost._decrypt_secrets_in_memory`** — called inside `_get_session_config` after `load_config_file` returns the user config. Replaces encrypted keys with plaintext; on DecryptError sets the plaintext to `""` and leaves the bad blob on disk for self-healing.
- **`NativeHost._encrypt_secrets_before_write`** — called inside `handle_update_config` before merging the payload into `current_data`. Replaces plaintext with encrypted form; empty-string plaintext clears both keys (Reset semantics).

### DPAPI key management

Zero application-level work. Windows LSA derives a per-user Master Key from the user's logon credentials; OS-managed rotation every 90 days (with old keys retained); user-initiated password changes re-wrap the key transparently. The application never reads, writes, or backs up key material.

Properties relevant to debugging:

| Scenario | Effect |
|---|---|
| Same user, same machine | Always decrypts. |
| Same user, different machine | DecryptError (unless corporate AD Credential Roaming is enabled). Self-heal: repaste URL. |
| Different user, same machine | DecryptError. Self-heal: repaste URL. |
| Admin resets user password (not user self-service) | May destroy Master Key → DecryptError. Self-heal: repaste URL. |
| Disk image restored to same hardware | Works (Master Key restored with `%APPDATA%`). |

### Adding a new encrypted field

1. Spec the field in a design doc; confirm DPAPI is appropriate (it's right for credentials that shouldn't be portable; wrong for fields that need to roundtrip across machines).
2. Add the field name to both `_decrypt_secrets_in_memory` and `_encrypt_secrets_before_write` (consider extracting a `_SECRET_FIELDS` list if there are 3+ fields).
3. Add unit tests to `host/test_config_secrets.py` mirroring CS-T1..T8 for the new field.
4. Update AGENTS.md § 4.8 with the new field name.

### Failure mode debugging

Look for these log lines in `%LOCALAPPDATA%\DynamicsHelper\native_host.log`:

- `WARNING ... Failed to decrypt team_manifest_url ...` → DecryptError on startup. Expected after cross-machine copy or password reset.
- `WARNING ... Discarding stale plaintext team_manifest_url ...` → legacy plaintext key found in config.json. Should only appear once per user (during the first run on a pre-existing config).
- `ERROR ... Failed to encrypt secret field; aborting config write` → DPAPI service is broken. The user's Windows session likely needs to be restarted; this should be effectively impossible during a healthy session.

---

## Self-Update Mechanism

The extension checks for updates on startup (via `health_check` action) and displays an "Update Available" notification in the Options page and FAB.

### Flow

1. **Check:** `NativeHost.check_for_updates()` queries the GitHub Releases API.
2. **Notify:** If a newer version exists, sends `NATIVE_UPDATE_AVAILABLE` message to the extension.
3. **Download:** User clicks "Update Now" → `updater.download_update()` fetches the release zip.
4. **Apply:** The updater extracts files. The exe is swapped via rename-to-`.old` strategy. Other host files (`_internal/`, `system_prompt.md`) are overwritten directly. User files (`config.json`, `copilot-instructions.md`, logs) are protected.
5. **Reload:** After a successful update, the FAB calls `chrome.runtime.reload()` to reload the extension (not just the page). The `pending_update` entry in `chrome.storage.local` is cleared on success. The Options page also includes version guards to dismiss stale update banners.
6. **Restart:** The host process exits; Chrome relaunches it on the next native message.

### Locked File Handling

When replacing `dh_native_host.exe`, the file may be locked by the OS or antivirus:

1. Try `rename → .exe.old`
2. If locked: try `.exe.old2`, `.exe.old3` as fallback
3. Other host files (`_internal/` directory, `system_prompt.md`) are overwritten directly
4. User files (`config.json`, `copilot-instructions.md`, log files) are never overwritten
5. Log errors for debugging

---

## Debugging Guide

### 1. "Host Disconnected" or "No Response"

* **Check:** Is the Host running? Chrome spawns it automatically.
* **Log:** Check `%LOCALAPPDATA%\DynamicsHelper\native_host.log`.
* **Common Cause:** Registry key mismatches or PowerShell encoding bugs.
* **Fix:**
  * Run `installer_core.ps1` (or `install.bat`) again.
  * Verify `manifest.json` in `%LOCALAPPDATA%\DynamicsHelper` is valid JSON and points to `dh_native_host.exe`.

### 2. "Analysis Timeout"

* **Check:** Does the log show `Copilot request timed out after X seconds`?
* **Cause:** The Agent is doing too much (heavy RAG, many Kusto queries).
* **Fix:** Increase timeouts in `FAB.tsx` (Frontend) AND `dh_native_host.py` (Backend).

### 3. Agent failing to run Kusto queries

* **Check:** Logs for `Permission requested`.
* **Check:** `config.json` in `%LOCALAPPDATA%` to ensure the `kusto` MCP server is defined correctly.
* **Check:** Does the user have `Use-AzureChina` or relevant credentials? The Agent runs as the user.

---

## Release Process & Testing

### 1. Release Automation

We use `release_helper.py` to manage versions and builds.

* **Stable Release:** `python release_helper.py 2.0.57 --publish`
* **Beta Release:** `python release_helper.py 2.0.58-beta --publish --prerelease`

### 2. The "Safe Switch" Workflow

To test the production build without breaking your dev environment, use `dev_switch.py`.

* **Mode: Dev** (`python dev_switch.py dev`): Runs local Python source.
* **Mode: Prod** (`python dev_switch.py prod`): Runs installed `.exe` (verifies installer logic).
