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

* **`src/components/FAB.tsx`**: The main UI component. It contains the Analyze logic, derives its safety timeout from the Host preference with a 10-second grace period, localizes prompt-source errors at render time, and uses the `isUserEdited` ref pattern to protect user edits from background scans. All user-facing strings use `t()` from `useTranslation()` for i18n support.
* **`src/components/Options.tsx`**: The extension settings page. Handles preferences, Root Path, MCP/Skill directory config, team catalog sync, and update checking. DH-specific Instructions and Custom User Prompt textareas include an Edit/Preview toggle for rendered Markdown preview.
* **`src/components/MarkdownPreview.tsx`**: Shared Markdown renderer using `react-markdown` + `remark-gfm`. Provides styled GFM rendering (headings, code blocks, tables, links, lists, blockquotes). Used by Options.tsx for preview toggles.
* **`src/utils/pageReader.ts`**: Logic for scraping Dynamics/Azure Portal pages to extract case numbers, error text, and context. Uses a 4-strategy cascade (header controls, label search, header container regex, ticket title fallback).
* **`src/background/serviceWorker.ts`**: Service worker handling telemetry (with stable anonymous UUID via `chrome.storage.local`), native messaging relay, analysis-result persistence, and extension version injection. Native-message logging is metadata-only; it must not log prompt-bearing payloads.
* **`src/background/teamManifestSync.ts`**: Manifest-only fetch/commit boundary. It re-reads `dh_prefs` after fetch and writes manifest/ETag only when Team Catalog remains enabled and the URL still exactly matches the captured URL.
* **`src/utils/analysisPrompt.ts`**: Idempotent send-time Custom User Prompt assembly for both constructed and preformatted FAB context.
* **`src/utils/telemetry.ts`**: Azure Application Insights integration for anonymous telemetry.
* **`manifest.json`**: Defines permissions (`nativeMessaging`) and background scripts.
* **`dist/`**: The build output directory. Load the extension from here (`extension/dist`).

### `host/` (Backend)

* **`dh_native_host.py`**: The core backend script.
  * **Loop:** Reads messages from `stdin` (from Chrome) and writes to `stdout`.
  * **Timeout:** User-configurable timeout for Copilot requests via Options → Analyze Timeout (range 60–3600s, default 1200s). Stored as `extension_preferences.analyze_timeout_seconds` in `config.json`. Live-updated on `update_config`. See `AGENTS.md` § 4.2 for the three-site sync contract.
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

* **`config.json`**: Defines Root Path, Repository ONLY, MCP, Skills, model/performance settings, and mirrored extension preferences. Ships with a minimal default; additional capabilities are user-configured.
  * *Note:* In Production mode, this file is shared between the installed app and the user's overrides.
* **`native_host.log`**: The primary debug log.
* **`copilot-instructions.md`**: DH-specific Instructions. This is one editable system source, selected only when Repository ONLY is not effective.
* **`user_prompt.md`**: Custom User Prompt backup/source, inserted into every PII-scrubbed Analyze user turn.

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
    * A stable deterministic UUIDv5 is derived via `_case_to_session_id()` from the bare case number and the shared MyCasesKit namespace. The same UUID is the SDK `session_id` argument and the shell-CLI resume handle.
    * Before every Analyze, the Host validates the effective Root and resolves an immutable prompt snapshot containing exact DH Core bytes plus exactly one selected editable source. Strict UTF-8 decode or source-availability failures stop before any model turn.
    * Smart refresh compares `current_case_id` plus `current_session_root_path` (the root actually applied to the active session), not just the desired `self.root_path` config value.
    * Smart refresh also compares `current_prompt_fingerprint` with the snapshot's versioned fingerprint. A changed source mode, Core bytes, or selected-source bytes resumes/creates the same UUIDv5 session before sending the turn.
    * On session creation or refresh, `resume_session(uuid, ...)` is tried first and falls back to `create_session(session_id=uuid, ...)`. Resume, create fallback, and transport retry receive equivalent Root, prompt, isolation, Skills, MCP, hook, permission, and model/performance kwargs.
    * The session UUID is injected into the `system_message` content as `## Session Info` / `Session Name: <uuid>`, making it available for `context.md` frontmatter `session_name:`.
5. **SDK Execution (`send_and_wait`):**
    * The backend sends the prompt as a plain string (SDK 0.2.0+, still applies in 1.0.5) with a **user-configurable timeout** (default 1200s, range 60–3600s, set via Options → Analyze Timeout). The FAB safety timeout is derived as `(value + 10) * 1000` ms so the host's truthful "Copilot did not finish within Ns" error always fires first.

### 2. Session Persistence

The host maintains persistent sessions so users can continue analysis in the Copilot CLI.

* **Session ID:** A deterministic UUID v5 derived from the case ID via `_case_to_session_id()`. The same case always produces the same UUID, enabling resume across restarts. The Copilot CLI requires session IDs to be valid UUIDs (not arbitrary strings like `dh-{caseId}`).
* **Server Verification:** After `create_session()`, the session ID is read from `session.session_id` and stored in `self.current_session_id`.
* **Case Tracking:** `self.current_case_id` tracks which case the current session belongs to, used for smart-refresh comparison (not the session ID itself).
* **SDK Mechanism:** `client.resume_session(session_id, working_directory=root, skip_custom_instructions=True, ...)` restores state from `~/.copilot/session-state/{session_id}/` and explicitly applies the configured Root. `CopilotClient` also receives the same Root so its CLI subprocess never falls back to the Native Host install cwd. Every create/resume/retry path keeps `skip_custom_instructions=True`.
* **Graceful Fallback:** If the SDK version doesn't support `resume_session()`, an `AttributeError` is caught and a new session is created instead.
* **Report Integration:** `dh_case_report.md` includes the UUID and `copilot -C '<root>' --resume=<uuid>`. `-C` applies the correct Root before the interactive CLI continuation resolves workspace capabilities even if an old session persisted the wrong cwd. DH's SDK session does not rely on CLI automatic instruction discovery.
* **Response Payload:** The session name is returned to the extension as `session_name` in the analysis response for frontend visibility (renamed from `session_id` in B82 to match the B81 cross-CLI naming RFC).
* **System Message Injection:** The UUID is appended to the `system_message` content as a `## Session Info` section (labelled `Session Name: <uuid>`) before session creation. This ensures the AI can reference it (e.g., for `context.md` frontmatter `session_name:` field) without relying on a fallback value.
* **Lifecycle:** Startup initializes only the SDK client; session creation is lazy until Analyze supplies a case. Config updates preserve an active deterministic case session and never replace it with a generic UUIDv4 session. Root changes restart the client and refresh the session. `update_config` is authoritative for clearing root; a missing/empty Analyze `rootPath` reloads host config so a pre-hydration extension default cannot overwrite the canonical disk value.

### 3. Deterministic Prompt Sources

DH owns instruction selection. Every SDK `create_session()` and `resume_session()` call, including fallback/retry paths, sets `skip_custom_instructions=True`. The spawned Copilot CLI therefore does not automatically add CLI-global instructions, Root/ancestor `AGENTS.md`, path-specific `.instructions.md` files, agent instruction files, or automatically discovered `.github/copilot-instructions.md` to a DH session.

The Host explicitly injects DH Core plus exactly one editable system source. Custom User Prompt remains separate PII-scrubbed user-role content on every Analyze:

| Root Path | Persisted Repository ONLY | Effective system sources | Analyze user content |
|---|---:|---|---|
| Empty | false or true | DH Core + DH-specific Instructions | Case payload + Custom User Prompt |
| Non-empty | false | DH Core + DH-specific Instructions | Case payload + Custom User Prompt |
| Non-empty | true | DH Core + `<Root>/.github/copilot-instructions.md` | Case payload + Custom User Prompt |

`effective_repository_only = bool(effective_root) and use_workspace_only`. A non-empty Root does not select Repository Instructions by itself. DH-specific and Repository Instructions are mutually exclusive, and only the Root-level `.github/copilot-instructions.md` is supported. Repository ONLY still controls Skills and MCP according to their existing rules; DH Core, SDK built-ins, Session Info, hooks, tool definitions, and Custom User Prompt remain active.

#### Immutable Snapshot and Fingerprint

`_resolve_prompt_snapshot()` reads DH Core and the selected editable source exactly once in binary mode. It stores the exact bytes and strict UTF-8 decoded strings in frozen `PromptSnapshot`; it performs no BOM, newline, or whitespace normalization. `_build_system_message()` uses only that snapshot, in this order:

1. DH Core System Prompt.
2. The selected editable source, omitted from assembly only when its decoded content is empty/whitespace.
3. Deterministic Session Info.

The snapshot fingerprint is `v1:` plus SHA-256 over length-framed version marker, source mode, exact Core bytes, and exact selected bytes. Root identity remains a separate refresh condition. Before each Analyze, an unchanged case/Root/fingerprint reuses the active session; any change refreshes the same UUIDv5 session. The candidate fingerprint is committed only after awaited SDK resume/create succeeds. `_invalidate_active_session()` always clears `current_prompt_fingerprint`, so resolution, refresh, timeout, transport, and uncertain durable-write failures cannot reuse stale prompt state.

#### Source Errors and Config Health

Strict Analyze/session resolution fails closed:

* Missing or unreadable/invalid-UTF-8 DH Core blocks Analyze.
* A missing DH-specific file is valid empty content; an existing unreadable/invalid-UTF-8 file blocks Analyze when selected.
* An existing empty Repository Instructions file is valid; a missing or unreadable/invalid-UTF-8 selected Repository file blocks Analyze.
* The Host never falls back to the unselected DH-specific, Repository, or CLI-global source, and no user turn is sent on failure.

`get_config` is intentionally softer. `_get_session_config(include_prompt_status=True)` returns normal configuration plus `prompt_source_status` without creating or committing a session snapshot. It returns readable `_user_instructions_raw`, including explicit empty content; if that file is unreadable, the raw field is omitted so Options retains its Chrome mirror and shows the safe health warning.

After the latest `update_config` intent is durably acknowledged, Options sends one additional health-only `get_config`. This callback changes only `promptHealthIssue`; it never re-enters the full hydration merge. Both config and health generations must still match before applying a response, so an older health result cannot replace newer state. Transport/non-success responses leave the existing health issue unchanged.

Prompt-source errors carry a stable `error_code` and safe English fallback. Options/FAB preserve unknown non-empty codes, localize the five known codes only at render time, and never tell users to re-authenticate for a source/configuration error. Logs may include safe source mode, classified code, or a short fingerprint prefix, but never instruction contents, Custom User Prompt contents, or prompt-source paths.

FAB applies Custom User Prompt immediately before every send. It removes an existing trailing `## User Prompt` section from either preformatted or freshly assembled context, then appends the current non-empty value once; an empty current value leaves the stale section removed. The resulting complete text still enters the Host's existing PII scrub path unchanged.

Team manifest and bookmark URLs are credential-bearing data because Azure SAS values commonly live in their query strings. `teamCatalog.ts` returns fixed safe parse/network messages and logs only failure kind plus numeric HTTP status. It must not log URL/status-text/exception values. Manifest-only Service Worker commits also re-read `dh_prefs` after fetch to prevent Reset or a URL change from being overwritten by a stale response.

Analysis result dismissal is identity-qualified. New `LastAnalysis` records carry their Analyze `requestId`; legacy records are identified by exact `caseNumber + timestamp`. Hydration passes that identity to FAB, and `markSeen` re-reads storage before writing. If a newer Service Worker record replaced the displayed one, dismissal is a no-op so the new record stays unseen with its complete error metadata.

The standalone `host/debug_auth.py`, `host/debug_bisect.py`, and `host/debug_sdk_direct.py` files are historical pre-1.0.5 probes. They retain `skip_custom_instructions=True` on session creation, but other imports, constructor arguments, and message shapes are obsolete; they are explicitly outside supported diagnostics until separately migrated. Use `host/venv` tests or the SDK 1.0.5 wire-drift probe documented in `AGENTS.md` instead.

### 4. Skills Configuration

Capabilities (Skills) are loaded based on the following precedence:

1. **Base Skills:**
    * **User Skills:** Defined in `%LOCALAPPDATA%\DynamicsHelper\config.json`.
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
    * **User Config:** Defined in `%LOCALAPPDATA%\DynamicsHelper\config.json` (legacy) or `~/.copilot/mcp-config.json` (standard).
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

### Analysis Result Persistence (C2a+)

Analyze runs are long (often 60-300 s). The user can navigate away from the case page or close the popover and miss the result. C2a+ (v2.0.71+) makes the result survive a page reload via `chrome.storage.local`, with one-shot semantics so a dismissed result does not re-appear.

**Storage schema** (`extension/src/utils/analysisStore.ts`):

* `dh_pending_analysis` — `{caseNumber, requestId, startTime}` written by SW before forwarding the host RPC, cleared on success/error/timeout/edge-6.3.
* `dh_last_analysis` — `{status: 'success'|'error', caseNumber, requestId?, title, content, timestamp, seen, durationSec?, savedTo?, errorCode?}` written by SW on Host response. New records use `requestId` as result identity; legacy records use exact `caseNumber + timestamp`. Dismissal/consumption marks it seen only when that displayed identity still matches storage. `errorCode` is an optional raw machine-readable Host code; legacy records omit both optional fields.

**Two ages, do not confuse them:**

* `MAX_PENDING_AGE_MS = 2h` — GC threshold; pending markers older than this are treated as orphans (likely SW crash mid-flight).
* `MAX_PENDING_DISPLAY_AGE_MS = 15min` — UI threshold for `useAnalysisHydration`; older pending markers are not surfaced as "Analyzing…" because the user has likely abandoned the run.
* `STALE_WINDOW_MS = 1h` — rehydration window for `dh_last_analysis`; older results are not popped open on mount.

**Wire protocol — `_persist` field on outgoing NATIVE_MSG:**

FAB attaches a `_persist: {caseNumber, successTitle, errorTitle}` to the analyze payload. The SW reads this, calls `recordAnalyzeStart` before forwarding, calls `recordAnalyzeSuccess`/`recordAnalyzeError` on response, and **strips `_persist` before sending to the Host** (the Host has never seen this field and will reject unknown keys). Titles are pre-translated by FAB because the SW has no `t()` access.

For errors, persistence stores the raw safe Host fallback in `content` and preserves a non-empty `error_code` as optional `errorCode`; an inner Analyze code takes precedence over an outer wrapper code, and transport rejection does not fabricate one. Both immediate and rehydrated popovers localize known codes in `ResultPopover` at render time. The immediate path may prefix its safe fallback before opening the popover (for example, `Analysis failed:` or the Host-error label); rehydration supplies the raw stored fallback. Unknown or absent codes therefore display the fallback from their own path rather than a shared prelocalized string.

**Pure-helper boundary:**

* `extension/src/background/analyzeBridge.ts` exposes `handleAnalyzeForward(payload, ctx, deps)` with DI'd `send`. Its focused suite covers P-I1..P-I4, error-code transport, and edge 6.3 without spinning up a real Chrome port; the test count is not a contract.
* `extension/src/hooks/useAnalysisHydration.ts` exposes `{popover, isAnalyzing, dismissPopover(identity)}`. Its focused suite covers result/pending hydration, identity-safe one-shot dismissal, and optional `errorCode` using only a mocked `chrome.storage.local`; the test count is not a contract.
* FAB calls `useAnalysisHydration(scrapedData?.caseNumber || '')` once at the top of the component, then mirrors `popover`/`isAnalyzing` into local state in two `useEffect` hooks. The mirror is one-way (storage → local); user dismissal passes the displayed identity through `hydration.dismissPopover(identity)`, which re-reads storage before writing `seen=true`.

**popoverIsAnalyze ref discriminator:**

`ResultPopover` is shared between analyze flow and bookmark markdown previews. `popoverIsAnalyze.current` is set `true` whenever an analyze success/error opens the popover, and the close handler only calls `hydration.dismissPopover(resultPopover.identity)` when this flag and an analysis identity are present — otherwise dismissing a bookmark popover would spuriously acknowledge analysis state.

**Edge cases handled:**

* **Start-before-send ordering:** `handleAnalyzeForward` awaits `recordAnalyzeStart(ctx)` before calling `deps.send(payload)`. The Host request is not dispatched until the pending marker write completes.
* **Late response versus newer pending (edge 6.3):** Analysis A can remain in flight while analysis B starts and replaces the single-slot pending marker with B's request ID. When A's response arrives, A's result is persisted, but `clearPendingIfMatches(A.requestId)` rereads the pending marker and leaves B's marker intact because the request IDs differ. A late response therefore cannot clear a newer analysis's pending state.
* **Stale pending on mount:** `useAnalysisHydration` checks `Date.now() - startTime > MAX_PENDING_DISPLAY_AGE_MS` and ignores pending markers older than 15 min. The marker stays on disk until GC; this is intentional (the user might still want to know if the run eventually completes).
* **Case mismatch on pending:** if the on-disk pending marker is for case A but the FAB is mounted on case B, the hook ignores the pending row entirely (no false "Analyzing…").
* **Options Reset:** the Reset button also removes `dh_last_analysis` and `dh_pending_analysis` so a user-initiated reset wipes persisted analysis state.

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

Only `Options.tsx::persistPrefs(nextPrefs, opts?)` writes user preference changes. It creates an immutable `ConfigUpdateIntent` containing a generation, a frozen preference snapshot, and, only when needed, a frozen `{revision, value}` DH-instruction token. Other React components do **not** write `dh_prefs`.

The persistence path is ordered and inspected:

1. Write the captured preference snapshot to the `dh_prefs` Chrome mirror. Generation checks converge delayed/out-of-order callbacks back to the newest snapshot.
2. After Host hydration, send one `update_config` payload built only from that captured intent. Stale storage callbacks do not dispatch older Host updates.
3. Inspect the outer Native Messaging envelope and the inner Host result with `classifyConfigUpdateResponse()`; this RPC is not universally fire-and-forget.
4. Flush a requested team-manifest fetch only after the latest matching mirror commits and only for the still-active URL.

`user_instructions` is sparse. It is included only while an instruction edit revision remains unacknowledged. An explicit empty string from editor clear or Reset is a real write and truncates `copilot-instructions.md`; omission means no instruction-file write. The Host retains `system_instructions` only as a legacy fallback when the primary field is absent, never when `user_instructions` is present and empty.

Host update outcomes separate persistence from active-session refresh:

* `success: true` acknowledges the captured instruction revision and clears the newest update warning.
* `success: false, config_saved: true` means all requested persistent writes completed but session refresh failed. Options acknowledges exactly the revision that was sent, keeps the saved UI values, and shows a persistent localized warning.
* `config_saved: false`, malformed responses, and transport failures do not acknowledge the instruction revision, so it remains pending for a later intent. The Host conservatively invalidates active session/fingerprint state after any attempted durable write that raises because truncation or partial output may already have occurred; it does not claim rollback.

Get-config health and update warnings are separate state. The newest update warning takes precedence; after a later successful update, any still-current prompt health warning becomes visible again. Known prompt codes are localized at render time, while unknown codes use the safe Host fallback.

#### Hydration guard (v2.0.70-beta.4+)

`prefsHydratedRef` starts `false` and flips to `true` after the Host's `get_config` response is merged, or on host-unreachable/non-success fallback so the user is not deadlocked. While it is false, `persistPrefs` still records the captured user state in the ordered `dh_prefs` mirror, but it gates the Host RPC and manifest fetch. Once hydration settles, an epoch-driven post-render catch-up sends committed user-touched values through the same inspected update path. It does not perform Host side effects inside the React state-updater closure, which is important under React StrictMode replay.

Why: between OptionsInner mount and the host's `get_config` response (≈100ms typical, multi-second if host is cold-starting or crashed), `prefs` holds `DEFAULT_PREFS` merged with `chrome.storage.local.dh_prefs`. If both are empty (fresh install, Remove+Load Unpacked, or any cache clear), fields like `rootPath` / `teamManifestUrl` / `team` / `userPrompt` are empty strings. A fast user click on a Language dropdown / toggle in that window would call `persistPrefs(DEFAULT_PREFS-merged)` and shallow-merge those empty values into `config.json` + truncate `user_prompt.md` (because the host's `handle_update_config` does `current_data.update(payload["config"])` and writes `user_prompt.md` whenever `user_prompt is not None` — empty string is not None).

If you add a new path that writes before hydration finishes, route it through `updatePref`/`persistPrefs` and mark its keys touched. Do not call the Host directly, bypass immutable intent creation, or move catch-up into a React updater. Passive Host-hydration mirrors capture their own snapshot and user-generation value; they must skip when newer user persistence has started so they cannot suppress the user's Host update.

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
