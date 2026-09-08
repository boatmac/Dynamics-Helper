# Dynamics Helper - AGENTS.md

This file defines the operational rules, development workflows, and coding standards for AI agents working on the "Dynamics Helper" project.

## Development Entry And Execution Rules

- Read `docs/session-handoff-2026-07-15.md` first for the current branch, product
  state, authorization boundary, and next action. Beta3 basic use was restored
  through an approved Cloud PC product install; development remains local. Read
  Current Milestone Summary and Next Single Action, not historical pause points.
  Development-checkout migration remains deferred.
- Current work is documentation closeout; no new product operations, tests,
  builds or Git writes are authorized by that task. Commands below are reference,
  not instructions to install dependencies, test, build, register, or release
  automatically. Verify the checkout before acting; installed product state is
  separate from Git state and does not migrate with the repository.
- User instructions override workflow templates. No coding-agent plugin or skill
  is required to work on this project. In historical plans, Superpowers/OpenCode
  tool names and unchecked boxes are not current execution requirements.
- The user explicitly applied the global OpenCode Superpowers removal decision
  to this project on 2026-09-07. Do not reload it, repeat its uninstall, change
  other tools' skills, or install replacements. Restart OpenCode with a new
  session to discard already injected instructions; see the recovery entry.
- Keep one bounded task active. Do not turn a finding into a new requirement or
  architecture project without user approval. Preserve complete working units;
  an acceptable limitation is not permission to leave a half-applied feature.
- At most three review rounds, then report unresolved findings and stop. Do not
  silently restart the count with another reviewer, subtask, or exception loop.
- Estimate long commands, but duration over five minutes is not an additional
  approval gate for already authorized work. Record PID/start time, log path,
  expected output, timeout, and a means to inspect/cancel owned work before launch.
  Do not delegate long work to tools that cannot expose intermediate progress.
- Full suites must report cumulative `N/total`; give the active test and elapsed
  time for long cases. If progress stops, inspect the owned process/log rather
  than waiting silently or restarting the entire suite. Report interruptions and
  surviving processes; a stored task status is not proof of a live process.
- Use focused tests for behavior edits. Run full suites at agreed milestones or
  when the changed scope justifies them, not after every review comment. Pure
  documentation cleanup uses diff/link/state checks, not product tests/builds.
- Distinguish user quotations/approvals from assistant promises, subagent
  instructions, and synthetic/compact summaries. Prior approvals are scoped;
  commit, push, tag, publication, cloud/product/security mutations and dependency
  installation need applicable explicit authorization.
- Before compaction or stopping, update the authorized recovery entry with the
  exact pause point. After compaction or a new session, reread it; never resume
  product work from a summary or old plan alone.
- Reply in the user's language. User-facing shell commands must be independently
  copyable in fenced blocks, one physical line per command or explicit continuation.

## 1. Project Overview & Architecture

**Dynamics Helper** is a Chrome extension that integrates with a Python Native Host (`dh_native_host.exe`) to interface with the GitHub Copilot SDK.

* **Frontend:** Chrome Extension (React 19, TypeScript, Vite, Tailwind).
* **Backend:** Python Native Host (Asyncio, Native Messaging, PyInstaller).
* **Communication:** Standard Input/Output (Native Messaging protocol) with length-prefixed JSON.

### Directory Structure & Runtime

* `extension/`: Source code AND build output for the frontend.
* `host/`: Source code for the backend.
* `dist/`: Contains the PyInstaller `--onedir` build output (`dist/dh_native_host/` folder with exe + `_internal/` runtime) used for releases.

### Critical Runtime Instructions

* **Extension (Frontend):** Load unpacked in Chrome from **`extension/dist/`**.
* **Host (Backend):**
  * **Development:** Chrome launches `host/dh_native_host.py` via `host/launch_host.bat`.
  * **Production:** The installer uses the compiled `dh_native_host.exe`.

## 2. Build, Test, and Lint Commands

### Extension (`extension/`)

* **Install Dependencies:**

    ```bash
    cd extension && npm install
    ```

* **Build:**

    ```bash
    cd extension && npm run build
    ```

  * Outputs to `extension/dist`.
  * **Action:** Reload the extension in `chrome://extensions` (pointing to `extension/dist`) after building.
* **Dev Server:**

    ```bash
    cd extension && npm run dev
    ```

* **Linting:**
  * No explicit lint script is configured. Follow standard ESLint/Prettier patterns for React/TS.
* **Run Tests:**
  * **Run All Tests (CI mode):**

    ```bash
    cd extension && npm run test:run
    ```

  * **Watch Mode (dev):**

    ```bash
    cd extension && npm test
    ```

  * **Coverage:**

    ```bash
    cd extension && npm run test:coverage
    ```

  * **Test Stack:** Vitest 3 + Testing Library (React 16) + jsdom. Standalone `vitest.config.ts` (does NOT extend `vite.config.ts` — CRXJS plugin breaks jsdom).
  * **Chrome API Mock:** `src/test/chromeMock.ts` provides `installChromeMock()`, `resetChromeMock()`, `deferNextResponse(action)`, deferred storage get/set/remove helpers, `seedStorage()`, `emitStorageChanges()`, and `chromeMockSpies` (runtime/storage operations plus storage-listener registration). Supports both callback and Promise-style chrome APIs. Rejected deferred set/remove calls expose `chrome.runtime.lastError` only for the matching callback, like Chrome. Storage writes retain their historical non-emitting default; tests call `emitStorageChanges()` only when they need a deterministic `storage.onChanged` event. **`resetChromeMock()` clears listeners, scoped errors, and spy call counts** — without this, state leaks across tests in the same file.
  * **Current Test Files:**
    * `src/utils/pageReader.test.ts` — `ID_REGEX` accept/reject behavior (case ID extraction).
    * `src/components/Options.test.tsx` — 6 hydration-window invariants (T-Inv1…T-Inv6) per `docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md` § 4 + § 5.
  * **Adding New Tests for `Options.tsx`:** Follow the 6-invariant model. Each test must map 1:1 to a spec invariant — don't duplicate one invariant across multiple fields. Use `deferNextResponse('get_config')` to control hydration timing, then `fireEvent.change` between `render()` and `resolveHostConfig(...)` to simulate edits inside the window.
  * **Break-and-Fail Verification (Required for new spec invariant tests):** After a new test passes, temporarily break the corresponding source code (e.g., remove a gate, change a closure variable) and re-run the test to confirm it fails. Then revert. This proves the test catches the regression it's named after. See commit `673b5aa` for the canonical 6-invariant break-and-fail table.

### Host (`host/`)

* **Install Dependencies:**

    ```bash
    pip install -r host/requirements.txt
    ```

* **Run Locally (Dev):**

    ```bash
    python host/dh_native_host.py
    ```

  * *Note:* Running directly only works for testing logic. For browser integration, it must be launched by Chrome via the manifest.
* **Build Executable (PyInstaller):**

    ```bash
    host/venv/Scripts/python.exe -c "import release_helper; release_helper.build_host()"
    ```

  * The release helper requires exact PyInstaller `6.22.2` and invokes it only
    as `host/venv/Scripts/python.exe -m PyInstaller` with the reviewed hidden
    imports. Exclude the development-only `pydantic.mypy` and `pydantic.v1.mypy`
    plugins; collecting them pulled setuptools and its vendored runtime/data into
    the Host. Do not broadly exclude runtime dependencies instead. It never
    provisions pip/PyInstaller. Installing or upgrading the
    toolchain requires separate user approval.

* **Run Tests:**
  * **Run All Tests:**

        ```bash
        python -m unittest discover host
        ```

  * **Run Single Test File:**

        ```bash
        python -m unittest host/test_pii_scrubber.py
        ```

  * **Run Single Test Case:**

        ```bash
        python -m unittest host.test_pii_scrubber.TestPiiScrubber.test_email_redaction
        ```

  * **Test Files:**
    * `host/test_pii_scrubber.py` — PII redaction tests.
    * `host/test_case_id.py` — Case ID extraction/validation tests.
    * `host/test_analyze_flow.py`, `host/test_analyze_full.py`, `host/test_analyzer.py` — Analysis pipeline tests.

## 3. Code Style & Standards

### Frontend (TypeScript / React)

* **Structure:**
  * Use Functional Components with Hooks (`useState`, `useEffect`, `useRef`).
  * Keep components small and focused (e.g., `FAB.tsx` handles the UI, `MenuLogic.ts` handles navigation state).
* **Performance (Critical):**
  * **DOM Scraping:** Use `PageReader.ts` which is now **ASYNC**.
  * **Yielding:** Long-running loops in the content script must `await yieldToMain()` to prevent freezing the browser tab.
  * **Debounce:** Use `MutationObserver` with debounce for auto-scanning.
* **User Edit Protection (Critical Pattern):**
  * When background scans (`MutationObserver`, `useEffect`) update scraped data, **always guard against overwriting user edits**.
  * Use a `useRef` flag (e.g., `isUserEdited`) that is set `true` in `onChange` handlers and checked before any `setScrapedData` call.
  * The flag should reset only on: (a) identity change (new case number/ticket), (b) explicit user-triggered refresh.
  * See `FAB.tsx` for the canonical implementation of this pattern.
  * **Beta channel preference** (`prefs.betaChannelEnabled`): plain user preference, no `isUserEdited` guard needed — there is no background refresh path that overwrites it. Mirrored to host `config.json` as `extension_preferences.beta_channel_enabled`.
* **Team catalog preferences** (`prefs.teamCatalogEnabled`, `prefs.teamManifestUrl`, `prefs.team`, `prefs.teamLabel`): plain user preferences, no `isUserEdited` guard needed. Mirrored to host `config.json` as `extension_preferences.team_catalog_enabled` / `team_manifest_url` / `team` / `team_label`. Host treats these as passive holders (does not read them) — purpose is backup/restore parity. See `docs/superpowers/specs/2026-05-21-team-prefs-config-mirror-design.md`.
* **Team Catalog storage ownership:** The Service Worker is the single mutation owner for manifest, selected-team items, ETags, URL identity stamp, sync timestamp, selection clears, and Reset clears. Every Options `SYNC_TEAM_CATALOG` message carries an immutable `{enabled, manifestUrl, teamId}` identity plus request generation; Options normalizes every optional team comparison as `(team || '')`. Reset also carries a reset token and dispatches only after the latest default-derived `dh_prefs` snapshot commits and the matching tokenized Host `update_config` reports durable acknowledgment. The Service Worker allocates its storage generation synchronously on acceptance, validates captured identity before any clear/fetch and after every awaited pref read, and serializes validation plus awaited storage mutation through `teamCatalog.ts`. Callback-style set/remove wrappers reject on callback-scoped `chrome.runtime.lastError`; mutation failure returns `failed`, never `committed`, while the queue remains usable for later work. Options never calls `syncTeamBookmarks` or cache-clear helpers directly. Consumers render cached team state only when `dh_team_manifest_url`, `dh_team`, and current `dh_prefs` match.
* **Options config persistence principle:**
  * `%LOCALAPPDATA%\DynamicsHelper\config.json` is the canonical backing store for Options page configuration. It is the file users back up, copy across machines, or restore after clearing browser cache.
  * **Persistence timing — Plan A (instant persistence, v2.0.70+):** There is **no Save button**. All Options fields persist immediately:
    * **Selects / checkboxes / toggles** (language, autoAnalyzeMode, enableStatusBubble, betaChannelEnabled, logLevel, teamCatalogEnabled, useWorkspaceOnly, team dropdown): persist on `onChange` via `updatePref({ ... })`.
    * **Text / number / color inputs** (buttonText, primaryColor, offsetBottom, offsetRight, rootPath, skillDirectories, mcpConfigPath, userInstructions, userPrompt): persist on `onBlur` via `handlePrefBlur()`. onChange only mutates React state (avoids storage / host RPC storms during typing or color-picker drag).
    * **Team manifest URL**: also onBlur, with `new URL(...)` format validation before triggering a fetch (avoids burning a 404 on half-typed input).
    * **Bookmark editor items (`dh_items`)**: every personal add/edit/delete/move/import/collapse and Reset intent increments one bookmark generation through `mutatePersonalItems`. Writes and Reset removal share one serialized storage queue; do not add raw personal `setItems` or direct `dh_items` mutation sites. A failed set/remove retains the newest complete intent for a later mutation retry, keeps a localized persistence warning visible, and clears that warning only after a later successful mutation.
    * **Reset button**: still exists. A normal click intentionally creates a fresh `ResetTransaction`, applies `DEFAULT_PREFS`, and starts a new Host phase. The transaction stores one token, default Team identity, request/bookmark generations, retry action, and phase (`host-pending|host-committed|sw-pending|local-cleanup-pending|complete`) independently of preference-mirror actions. The matching Host `update_config` must durably acknowledge before `RESET_EXTENSION_STATE`; `config_saved: true` with refresh failure counts as Host commit while retaining its current warning. Once committed, that token never resends Host or rewrites defaults. The incomplete warning's **Retry cleanup** control resumes only the stored SW/local phase; the normal Reset button does not. SW clears shared state only while default identity is safe, and local team/bookmark cleanup is generation-scoped so newer preference/bookmark edits survive.
    * The single entry point for all prefs writes is `persistPrefs(nextPrefs, opts?)` in `Options.tsx`. It writes the ordered `dh_prefs` mirror, then sends an immutable `update_config` intent after Host hydration and **inspects the structured result**. `update_config` is not universally fire-and-forget: `config_saved: true` acknowledges the values sent even when active-session refresh failed, while unsaved/transport failures remain pending for retry and surface a warning. With `opts.fetchManifest=true`, the latest matching intent triggers a manifest fetch unless that URL is already in flight or is the last `committed`/`unchanged` URL. Failed/stale/skipped/transport outcomes remain retryable.
    * **Sparse prompt-file writes:** Explicit empty `user_instructions` or top-level `user_prompt` truncates its canonical markdown file; omitted means no write. Unrelated preference updates omit both fields. Options attaches immutable revision/value tokens to explicit edit, clear, and Reset intents; acknowledgements and retries advance only the matching saved revision.
    * **Hydration guard (v2.0.70-beta.4+):** Before Host hydration completes, `persistPrefs` still updates the local `dh_prefs` mirror, but it does not send DEFAULT_PREFS-derived values to the Host or fetch a manifest. User-touched fields are caught up through one immutable intent routed through the same single-flight `writePrefsMirror` queue; its inspected Host send runs only from the successful latest-commit callback (including host-down/non-success fallback handling). **Do not bypass the Host-RPC gate or write from a React state-updater closure.** See `DEVELOPER_GUIDE.md` § "Hydration guard (v2.0.70-beta.4+)" for the failure mode and ordering contract.
  * **Default rule:** New Options fields are mirrored to `extension_preferences` in `config.json` unless explicitly excluded.
  * **Model & Performance (v2.0.73+):** `extension_preferences.model` / `reasoning_effort` / `context_tier` decouple DH's analyze sessions from the Copilot CLI's global `~/.copilot/settings.json`. Empty (the default) means "inherit the CLI default" — the host only adds them to `create_session`'s `sdk_kwargs` when non-empty (`_refresh_session`). The host validates `reasoning_effort` ∈ `{low,medium,high,xhigh}` and `context_tier` ∈ `{default,long_context}` in `_get_session_config`, dropping illegal hand-edited values. The Options model dropdown is populated dynamically by the **`list_models` host RPC** (`handle_list_models` → `client.list_models()`), cached in `chrome.storage.local` (`dh_model_list` + `dh_model_list_fetched_at`, 24 h staleness, manual Refresh). **Critical:** the effort dropdown must only offer the SELECTED model's `supported_reasoning_efforts` — some models (e.g. Claude Sonnet 4.5) support NONE, and passing an effort they reject makes `session.create` fail (`Model X does not support reasoning effort configuration`), which then surfaces as the generic "session/client not initialized" on every analyze until the config is corrected. `list_models` failures are classified (`auth`/`unavailable`/`unknown`) and surfaced in Options, never a silent empty dropdown. Spec: `docs/superpowers/specs/2026-07-03-configurable-model-performance-design.md`.
  * **Current exclusions (3):**
    * `userInstructions` — stored separately in `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (markdown file).
    * `userPrompt` — stored separately in `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`.
    * `dh_items` (bookmark menu) — only in `chrome.storage.local`, not currently persisted to host.
  * **Naming convention:** Field keys inside `extension_preferences` use **snake_case** (matches Python host PEP 8 style). The TypeScript-side `prefs` object uses camelCase; `buildHostConfigPayload()` in Options.tsx translates between them. Historical camelCase keys (`useWorkspaceOnly`, `primaryColor`, `buttonText`, `offsetBottom`, `offsetRight`) were normalized to snake_case in v2.0.70; pre-normalization config files lose those 5 values until the next field-edit triggers `persistPrefs` and rewrites them with the new names.
* **Styling:**
  * **Hybrid Approach:** The project uses a mix of inline styles (`style={{...}}`) and utility classes (`clsx`, `tailwind-merge`).
  * **Preference:** New UI elements should prefer Tailwind classes via `className` where possible, but consistency with existing inline styles is acceptable for complex dynamic positioning.
* **Icons:** Use `lucide-react` for all icons.
* **Internationalization (i18n):**
  * Use `useTranslation()` from `src/utils/i18n.ts`. All user-facing strings must use `t('key')` lookups.
  * Translations are defined in `src/utils/translations.ts` (supports `en` and `zh`).
  * When adding new UI text, add the translation key to `translations.ts` first, then reference it with `t()`.
* **Telemetry:**
  * Import `trackEvent`, `trackException` from `../utils/telemetry`.
  * Wrap async operations in `try/catch` and log errors to telemetry.
  * *Example:* `trackEvent('Analyze Clicked', { ... })`.
  * **User Identity:** Stable anonymous UUID is generated via `chrome.storage.local` in `serviceWorker.ts`. Do NOT use cookies or localStorage (unavailable in service workers).
  * **Extension Version:** Injected automatically via `trackBackgroundEvent` — do NOT rely on `item.data` for version stamping.
* **State Management:**
  * Use local state for UI components.
  * Use `chrome.storage.local` for persistent user preferences.

### Backend (Python)

* **Asyncio:**
  * The host runs an asyncio event loop.
  * Input is read in a separate daemon thread (`start_input_thread`) to avoid blocking the loop.
  * All I/O bound operations (SDK calls) must be `async`.
* **Type Hinting:**
  * Use Python type hints extensively (e.g., `def func(a: int) -> str:`).
  * Import types from `copilot` (top-level: `CopilotClient`, `RuntimeConnection`) and `copilot.session` (`PermissionRequestResult`, `PreToolUseHookOutput`, `PermissionDecisionApproveOnce`). **SDK 1.0.5 (2026-07-03):** `SubprocessConfig` was removed — the stdio connection is now `RuntimeConnection.for_stdio(path=...)` passed as `CopilotClient(connection=...)`. `PermissionRequestResult` became a Union (annotation-only, NOT constructible) — the headless auto-approve handler returns the concrete `PermissionDecisionApproveOnce()` variant. `copilot.types` was removed back in 0.3.0. WARNING: `copilot.generated.rpc.PermissionRequestResult` is a different internal RPC type (`success: bool`) — always import the session version. Full migration notes: `docs/sdk-upgrade-2026-07-1.0.5.md` (latest), `docs/sdk-upgrade-2026-05-0.3.0.md` (prior).
* **Logging:**
  * **CRITICAL:** Do NOT print to `stdout` (used for Native Messaging).
  * Use `logging.info()`, `logging.error()`, etc.
  * Logs are written to `%LOCALAPPDATA%\DynamicsHelper\native_host.log` (Windows) or `~/.config/dynamics_helper/` (Linux/Mac).
  * **Rotation:** `_SafeRotatingFileHandler` rotates at 5 MB, keeps 3 backups (~20 MB max). Catches `PermissionError` on Windows when files are locked.
  * **Configurable Level:** User sets log level (DEBUG/INFO/WARNING/ERROR) in Options UI. Applied at startup from `config.json` and live-updated on `update_config`. Default: `INFO`.
* **Error Handling:**
  * Catch exceptions in the main loop to prevent the process from crashing.
  * Return error responses to the extension: `{"status": "error", "message": "..."}`.
* **CLI Flags:**
  * `update_entrypoint.py` owns exact source/frozen main, registration,
    install-package, probe, detached completion/recovery, and status-host
    invocation grammars. Do not add raw `sys.argv` membership checks after the
    early dispatcher.
  * `--register` remains available in canonical source and frozen main modes.

## 4. Critical Rules & Safety

### 1. Headless Operation & Permissions

* **The Golden Rule:** The Native Host runs **headless** (no UI).
* **Permission Handler:** You **MUST** maintain the `_permission_handler` in `dh_native_host.py` that auto-approves requests.
* **Why?** If the Copilot SDK asks for permission (e.g., "Allow Read File?"), the process will hang indefinitely if not auto-approved, as the user cannot see the prompt.
* **Do Not Modify:** `on_permission_request=self._permission_handler` is passed as a keyword argument to `create_session()` and `resume_session()`. This ensures all SDK permission prompts are auto-approved.

### 2. Timeouts

* **Sync:** Frontend safety timeout MUST be derived from the same `analyzeTimeoutSeconds` preference that the host reads, with a small grace buffer. The host must always be the one that times out first; the FAB safety timeout is only a fallback in case the host crashes/disconnects.
* **User-configurable (v2.0.71+):** `extension_preferences.analyze_timeout_seconds` in `config.json` (mirrored as `prefs.analyzeTimeoutSeconds` in extension). Range **[60, 3600] seconds**, **default 1200** (was hardcoded 600 pre-v2.0.72). Clamped by the host on every config load and on every `update_config` RPC. Clamped client-side in Options on field blur so the displayed value matches what is actually stored.
* **FAB safety timeout:** Computed at analyze-time as `(prefs.analyzeTimeoutSeconds + 10) * 1000` ms — the 10s grace ensures the host's truthful "Copilot did not finish within Ns" error branch always fires before FAB's generic fallback popover.
* **Three sites that must stay in sync** if you ever refactor:
  1. `host/dh_native_host.py::NativeHost.__init__` — initial value (1200)
  2. `host/dh_native_host.py::_get_session_config` + `handle_update_config` — config read + clamp
  3. `extension/src/components/FAB.tsx::handleAnalyze` — safety timeout derivation
* **Error message contract:** The host's timeout error message MUST mention the configured budget value and direct users to Options → Analyze Timeout, NOT to re-authenticate. Pre-v2.0.71 the error said "waiting for authentication or approval" which was a guess and caused users to chase non-existent auth issues. Do not regress to that wording.

### 3. PII Redaction

* **Scrubber:** All text sent to the LLM must pass through `PiiScrubber` (`host/pii_scrubber.py`).
* **Tests:** Ensure `host/test_pii_scrubber.py` passes after any changes to redaction logic.

### 4. Path Handling

* **Absolute Paths:** Always use absolute paths for file operations.
* **AppData:** Use `os.environ.get("LOCALAPPDATA")` (Windows) or `~/.config` (Linux) for logs and config. Never write to the program directory (Program Files) as it requires Admin privileges.

### 5. Case ID Validation

* **Format:** Valid case IDs are exactly **16 digits** (main case) or exactly **19 digits** (task ID). Task IDs map to their parent case (first 16 digits).
* **Validation:** Use `_extract_case_id()` in `dh_native_host.py` (regex: `^\d{16}(\d{3})?$`).
* **Tests:** Ensure `host/test_case_id.py` passes after any changes to case ID logic.

### 6. Session Persistence

* **Session Names:** The host derives a stable session-name string from each 16-digit case ID via `_case_to_session_id()`, returning a **deterministic UUIDv5**: `str(uuid.uuid5(_NAMESPACE_MYCASE, case_id))` where the input is the **bare** case number (no prefix/salt) and `_NAMESPACE_MYCASE = 816bee4e-8eee-4c0b-ae69-70879d032f4d`. E.g. case `2601190030003106` → `ce0ec286-26e6-5095-8b30-46143e9f437f`. This string is the `session_id` for both SDK `create_session()` and `resume_session()`, AND the shell-CLI handle for `copilot --resume <uuid>`. **Cross-repo contract:** MyCasesKit computes the IDENTICAL value from the same namespace + bare case number, so both repos agree with no handshake — `_NAMESPACE_MYCASE` and the bare-case input MUST stay byte-identical across repos forever (do NOT add a salt). Authoritative spec: MyCasesKit `docs/dh-uuid5-change-spec.md`. **Why UUID (reverted from `dhco-<case>` on 2026-07-03):** the session id is consumed by external validators DH doesn't control — notably AAD's `client_session` (20-50 chars); the `AADSTS901001` incident proved custom formats are exposed to such constraints. A 36-char UUID is always AAD-legal regardless of case-number length AND stays deterministic (resume works with no stored map). Golden values are locked in `host/test_case_id.py::TestCaseToSessionId.test_known_answer` — **if your computed value differs from a golden value, the namespace or input is wrong; fix the code, never the golden value.**
* **Tracking:** `self.current_session_id` holds the UUIDv5 session id used in reports and `--resume`. `self.current_case_id` tracks which case the session belongs to. `self.current_session_root_path` tracks the root actually applied to the active session; do not substitute `self.root_path` (the desired config value) when deciding whether a refresh is required.
* **Resume:** The host tries `resume_session(name, working_directory=root)` first (where `name` is the UUIDv5). The explicit root updates old session metadata whose cwd predates root-path support. If resume fails, the host falls back to `create_session(session_id=name, working_directory=root)`. Handles `AttributeError` gracefully if the SDK version doesn't support resume.
* **Client & Session Working Directory:** Load config before constructing `CopilotClient`, pass `working_directory=root` at both client and session levels, and restart the client when root changes. The client process otherwise inherits Chrome Native Messaging's Host install cwd, which can be persisted into a session and later restored by CLI `/resume`. An explicit empty root in `update_config` clears the configured root. A missing or empty Analyze `rootPath` falls back to host `config.json` (the extension may send its empty default before prefs hydrate); it MUST NOT clear the host root.
* **Lazy Session Creation:** `initialize_sdk()` starts only the client. It MUST NOT create a generic session before Analyze provides a case identity. Options updates preserve the current deterministic case session; with no active case they clear/defer the session rather than creating a UUIDv4 generic session.
* **Smart Refresh:** Sessions are recreated when `current_case_id`, active-session root, or session/client availability changes — not on every analyze request. A failed refresh must invalidate the old session and return an error; never analyze a new case through stale state.
* **Report:** `dh_case_report.md` includes the session name and a root-bound PowerShell command: `copilot -C '<root>' --resume=<uuid>` (plain `copilot --resume=<uuid>` only when no root is configured). `-C` applies the root before an interactive CLI continuation resolves workspace capabilities and safely overrides stale cwd metadata from old sessions. DH's SDK create/resume path separately disables CLI automatic custom-instruction discovery and injects its selected instruction source explicitly.
* **System Message Injection:** The session name is appended to the `system_message` content as a `## Session Info` section before session creation (labelled `Session Name: <uuid>`), so the AI can reference it during the conversation (e.g., for `context.md` frontmatter — MyCasesKit `session_name:` field, now treated as an opaque UUID; case identity lives in the separate `case_number` field).

#### Prompt Source Isolation

* **Disable implicit discovery:** Never remove `skip_custom_instructions=True` from any DH SDK `create_session()` or `resume_session()` path, including create fallback and transport retry. CLI-global instructions, `AGENTS.md`, path-specific instruction files, and other CLI auto-discovered instruction files must not enter DH sessions.
* **Exactly one editable system source:** DH always injects the product-managed Core plus exactly one editable source: DH-specific Instructions, or `<Root>/.github/copilot-instructions.md` when a non-empty Root and Repository ONLY are both effective. Never inject DH-specific and Repository Instructions together. No other repository instruction path is supported.
* **Immutable snapshot:** Resolve Core and the selected editable source once as exact bytes, decode with strict UTF-8, and build both system text and the versioned, length-framed SHA-256 fingerprint from that frozen snapshot. Do not normalize BOMs, newlines, or whitespace, and do not reopen files during one refresh attempt.
* **Fail closed:** Missing/unreadable Core, unreadable selected DH-specific Instructions, and missing/unreadable selected Repository Instructions block Analyze without fallback or a model turn. Existing empty Repository Instructions are valid.
* **Refresh identity:** A mode or selected-byte change refreshes/resumes the same deterministic UUIDv5 session. Every active-session invalidation must clear `current_prompt_fingerprint`; commit a candidate fingerprint only after SDK create/resume succeeds.
* **Logging boundary:** Never log instruction contents, Custom User Prompt contents, or prompt-source paths. Safe source mode, classified error code, and a short fingerprint prefix are sufficient diagnostics.
* **SDK response diagnostics:** Never log a full SDK response event, event data object, content, or object representation. Log only event type, data type, content presence, and content length. If an event has no usable content, the generated diagnostic report must contain the same safe metadata summary, never the raw event.
* **Team catalog credential logging:** Manifest and bookmark URLs may contain SAS credentials. Console diagnostics must never include a complete URL, query text, `sig`, response status text, or thrown object/message that could echo the URL. Log only a classified failure kind, numeric HTTP status, and fixed safe parse/network diagnostics.
* **Config health:** `get_config` prompt health is soft and must keep Options usable; strict immutable resolution belongs to Analyze/session refresh. Options must inspect every `update_config` response because saved values and refresh success are separate outcomes.
* **Post-save health:** The latest acknowledged Options update performs one generation-gated, health-only `get_config` check. It updates only `promptHealthIssue`; it must not re-run preference hydration, write config, or create an update/get-config loop.
* **Persistence boundary:** Service Worker persistence preserves optional prompt `error_code` as `LastAnalysis.errorCode` through storage and hydration while retaining the raw safe Host fallback. Known codes are localized only when immediate or rehydrated UI is rendered.
* **Custom User Prompt at send time:** `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` is the canonical Analyze-time source. FAB still removes/replaces the first authoritative line-level `## User Prompt` section as a UX preview, but the Host rereads the file for every Analyze, removes payload content from the first marker, appends current non-empty file content exactly once, and only then applies PII scrubbing. Empty content removes stale sections; unreadable/invalid UTF-8 fails closed with `user_prompt_unreadable`. Never log its content or path.
* **Prompt/config error table:**

| Code | Condition | Required handling |
|---|---|---|
| `dh_core_prompt_missing` | DH Core is missing | Block Analyze; repair/reinstall |
| `dh_core_prompt_unreadable` | DH Core cannot be read/decoded | Block Analyze; repair install/permissions |
| `dh_specific_instructions_unreadable` | Selected DH-specific Instructions cannot be read/decoded | Block Analyze; preserve omitted editor value in Options |
| `repository_instructions_missing` | Selected Root instructions are missing | Block Analyze; add file or disable Repository ONLY |
| `repository_instructions_unreadable` | Selected Root instructions cannot be read/decoded | Block Analyze; repair file or disable Repository ONLY |
| `user_prompt_unreadable` | Custom User Prompt cannot be read/decoded | Block Analyze; `get_config` omits `user_prompt`; explicit edit/clear repairs |
* **Preference mirror actions:** Team sync, cache clear, and manifest fetch are user-intent actions, not storage-callback closures. Carry an unsettled action into compatible newer `dh_prefs` snapshots, settle it before dispatch so repair recursion cannot duplicate it, and cancel team actions when enabled/URL/team identity changes. Reset uses a mirror action only for its initial default-mirror/Host dispatch; its phased transaction and cleanup retry ownership are stored separately and must never be carried or canceled as an ordinary preference action.
* **Preference mirror durability:** `dh_prefs` writes, including hydration catch-up, are single-flight and coalescing. Inspect `chrome.runtime.lastError`; no Host update or carried action may run until the latest intended snapshot commits. Failed writes remain visibly pending with unsettled actions for later user-driven retry.
* **Reset truth:** Reset requests carry immutable default identity, request/bookmark generations, one token, phase, and retry action. Persist durable Host acknowledgment into the transaction before checking whether a newer preference callback superseded UI/local continuation. Never dispatch SW cleanup before Host acknowledgment (`success: true` or `config_saved: true`), and never resend Host/default preferences after it. Matching SW `committed` truth advances to scoped local cleanup; stale/failed/transport callbacks retain same-token SW retry. Superseded local continuation retains local-only retry. Retry may skip unsafe newer-owned state but must never clear or revert newer preferences/bookmarks.
* **String-only error fallback:** `safeErrorText(candidates, fallback)` is the single extension selector for reviewed Host/SW error display and persistence paths. It accepts only non-empty strings and never invokes `String`, `toString`, interpolation, or serialization on candidate objects, arrays, functions, symbols, or null. Analyze inner/outer/rejection persistence, Native response normalization, config-update inner/outer results, Options health/immediate warnings, FAB nested/outer/catch display, and Service Worker immediate normalization use it. Preserve normalized `error_code`, string `errorKind`, finite numeric `httpStatus`, and unchanged success `data`; unknown/malformed values use fixed/localized safe fallbacks.
* **Manifest retry truth:** Options keeps last successful manifest URL separate from tokenized in-flight URL and normalizes optional team identity as `(team || '')` in current checks and response matching. Only current identity-matching `committed`/`unchanged` callbacks mark success, including no-team requests; every failure/stale/skipped/transport callback releases its own in-flight token, and an old URL callback cannot release or complete a newer URL.
* **Async team UI reads:** Options and `useMenuLogic()` must generation-gate initial and storage-change cache reads. Capture enabled/manifest URL/team identity before each read and revalidate it before applying manifest list, items, timestamp, or navigation state.
* **FAB Analyze ownership:** Create `requestId` before local ownership and the safety timer. Derive analyzing state from the current local request ID or hydrated pending identity. Timers, responses, catches, and `finally` blocks may clear/show state only for their matching request; a new single-active request cancels the old timer.
* **FAB response processing:** Retain ownership through every await after the Host response, including `hashCaseId`, and recheck afterward. A stale request cannot render, close menus, update duration, or emit outcome telemetry.
* **Prompt file reads and presence:** `_get_session_config` reads/migrates/hydrates `user_prompt.md` only with `include_prompt_status=True` (`get_config`). Analyze performs one separate canonical read; session refresh config performs none. Absent editable prompt fields mean no write; present null/non-string fields fail before every persistent write.
* **Scope:** Repository ONLY extends instruction selection alongside existing Skills/MCP behavior. It does not implement MyCases integration, workspace detection, Stage 0 coordination, or Stage 1 persistence.

### 7. Self-Update Mechanism

* **Production updater:** `host/update_service.py` composes package validation,
  transaction ownership, detached recovery, rollback, and finalization. Ordinary
  Host construction must not import, overwrite, or delete sibling/nested Extension
  trees. Product replacement belongs to the transaction or matching installer;
  verified legacy `.old*` cleanup remains separate. The
  historical `Updater.apply_update` path is not production reachable;
  `host/updater.py` remains only for verified legacy `.old*` cleanup.
* **--onedir Layout:** The release zip contains a complete `host/` tree (exe,
  `_internal/`, prompts, and metadata) plus the complete Extension. Transactions
  replace product-owned trees while preserving user-owned config, prompts, logs,
  generated registration manifests, unknown top-level paths, and unrelated
  `updates/**`.
* **Do Not Break:** The `--register` CLI flag and the self-update flow are critical for production users. Test changes carefully.
* **Plan A package boundary:** Every packaged regular file is represented once
  in `update-manifest.json` with one ownership class and a lowercase SHA-256;
  `host/release-integrity.json` inventories product bytes and
  `host/installed-product.json` links that inventory. Hashes detect incomplete
  or mixed packages; they are not signatures.
* **Archive safety:** New package code must use `stage_and_validate_archive`.
  Never use `ZipFile.extract()` or `extractall()`. Reject traversal, duplicate
  and case-colliding paths, directory entries, links/reparse points, encrypted
  entries, unsupported types, and missing/extra/hash-mismatched files before
  accepting a stage.
* **Capability timing:** Plan A originally advertised only `prompt-scope-v1`.
  The atomic Plan D cutover adds `transactional-update-v1`; candidate acceptance
  and execution require that capability plus matching Host/Extension versions
  and verified packaged integrity.
* **Production coordination:** The Service Worker is the only update
  coordinator, state/storage owner, and serialized transition owner. It owns
  strict parsing, `dh_update_state`, persistence-before-effect ordering, the
  30-second alarm, restart resume, terminal reload, installation verification,
  receipt persistence, and acknowledgment. Every transition is persisted before
  the in-memory projection changes or `DH_UPDATE_STATE` is broadcast. FAB and
  Options only request/project state; they never own update storage, Host update
  payloads, reload, or a completion transition.
* **Completion identity and acknowledgment:** Every `complete` state requires its
  originating `transactionId` as exact lowercase 32-hex. Completion consumption
  accepts only the exact own-data-property message
  `{type:'DH_UPDATE_ACK_COMPLETE',transactionId}`. Extra/missing/accessor/symbol
  keys or malformed identity return `handled: false` without getter execution or
  state effects. A matching committed ACK persists `idle` and removes the private
  candidate URL; a matching rolled-back ACK persists `available` with the same
  candidate so ordinary Retry remains. Wrong, stale, and duplicate ACKs are
  idempotent no-ops.
* **Completion UI authority:** FAB and Options render terminal completion
  immediately, but acknowledge only after eight continuous visible seconds in a
  foreground document. FAB eligibility is the open terminal banner OR an
  actually visible Status bubble bound to the current completion transaction;
  the closed red dot and unrelated bubbles never count. Options eligibility is
  its rendered `complete` status while the document is visible. Hiding the
  document or the last qualifying surface ends the epoch and discards elapsed
  time; an aggregate-visible menu/bubble hand-off and equivalent same-ID state
  do not restart it. Each epoch attempts one exact ACK; transport failure may
  retry only after a later fresh epoch. The UI never owns update storage,
  optimistically hides completion, or applies the ACK response. Only the Service
  Worker's persisted `DH_UPDATE_STATE` broadcast is live authority.
* **Host action boundary:** Exactly `perform_update`, `activate_update`,
  `finalize_update_status`, and `acknowledge_update_finalization` route to
  `UpdateService` with strict request-correlated envelopes. Generic
  `NATIVE_MSG` forwarding of these actions is denied.
* **Operation serialization:** `update_operation.py` owns the distinct
  cross-process `Local\DynamicsHelper.UpdateOperation.<hash>` mutex. Plan D
  prepare/activate/finalize/ack hold it for the complete operation; lock order is
  always operation mutex before the existing Plan B/C mutation mutex. Never use
  a process-local lock or recursively reuse the mutation mutex.
* **Candidate and suppression boundary:** Accept only a strictly newer normalized
  release. Manual `check_updates` requests are permitted only in hydrated
  `idle`, `available`, or `complete` states, rechecked in the serialized Worker
  authorization path. The initiation reply is not a discovery result. Fixed
  shared `DH_UPDATE_CHECK_RESULT` outcomes contain no URLs and settle the Options
  check; discovery notifications lack per-request correlation. Do not turn manual
  discovery into `DH_UPDATE_START`. Accept a candidate only from a normalized
  release containing exactly one direct HTTPS ZIP. Once activation starts, use
  only the detached status Host plus the one recovery kick; ordinary main-Host
  Analyze/config/health traffic stays suppressed until a verified safe
  disposition.
* **Mixed-install boundary:** Capability, version, or integrity disagreement
  persists transactionless matching-full-installer guidance. It clears only
  after startup verifies the complete matching product. Transaction-backed
  recovery evidence is never cleared by this shortcut.
* **Matching installer repair:** `installer_core.ps1` refuses a running Host or
  legacy Roaming data before mutating the installation. Never force
  termination, migrate/delete Roaming user data, unblock downloaded files, bypass
  execution policy, add Defender exclusions, or claim a detection is a false
  positive. Installation failures return nonzero through `install.bat`. It removes
  the `_internal` runtime tree before copying the packaged runtime, so stale files
  cannot survive a full-installer repair. Preserve user-owned files and
  `updates/**` evidence. Before mutation it probes a temporary combined product
  plus the exact release inventory. After copy it probes the live product and
  runs frozen-only `--settle-installer-repair`; compatible authority becomes the
  matching target/prior terminal state, while contradiction fails without
  deleting evidence.
* **Main action liveness:** Prepare/activate/finalize/ack leases are bounded and
  cancellable. Cleanup errors remain in `reload-pending` / `ack-pending` with an
  `errorCode`, so retry repeats the same idempotent phase.
* **Fresh-Worker finalization:** A per-Worker instance token prevents the Worker
  that requested reload from finalizing its own `reload-pending` state. A newly
  loaded Worker must perform terminal verification/finalization.
* **Transaction authority:** IDs are lowercase 32-hex from exactly 16 random
  bytes. Stable authority is `updates/active.json` plus
  `updates/transactions/<id>/journal.json`; `TransactionPaths` intentionally
  has no `recovery_root`. `UpdateEngine` exclusively owns journal transitions,
  active/workspace mutation, nonterminal resume, rollback, and terminal evidence
  cleanup under the installation mutex.
* **Preparation and ownership:** N may validate an internally consistent N+1
  package using the caller's trusted `expected_version`; never compare it with
  the importing Host's `VERSION`. Filter `UpdateManifest.entries`, require
  manifest/integrity Chrome identity and metadata links, stage only in
  `<id>.preparing`, and atomically promote it. Preserve `config.json`,
  `copilot-instructions.md`, `user_prompt.md`, logs, generated `manifest.json`,
  unknown top-level paths, and unrelated `updates/**`.
* **Activation and failure lineage:** Browser activation requires immutable
  `{pid, creation_token}`; installer activation requires `None` and never waits
  on itself. `reason_code` is current status, while `original_failure_code` and
  `rollback_from` remain immutable. Retry recovery with the original forward
  code. Fresh seed ownership is recorded durably and user-created/edited config
  always wins. `finalize_terminal_evidence` runs only after Plan C receipt
  durability/status unregister and removes active before the matching terminal
  workspace.
* **Host test isolation:** Every Host subprocess receives fresh existing
  `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP`
  directories before process start. Automated tests never use the real install,
  registry, browser registration, updater network, or release publication.
* **Active Plan C recovery:** `native_messaging.py`, `native_registration.py`,
  `update_platform.py`, `update_recovery.py`, `update_status_host.py`, and
  `update_entrypoint.py` provide the detached runtime consumed by Plan D. Frozen
  startup launches active recovery before normal initialization; unrecoverable
  startup exits `30`, emits no stdout, and writes exactly
  `manual_recovery_required\n` to stderr.
* **Validate before construction:** A special invocation must validate its exact
  executable role, source/frozen bit, arity, full argv, identity text, fixed
  executable chain, and path authority before constructing any dependency,
  registry, controller, process adapter, default root, installer, or status
  server. Non-probe mismatches are exit `2`, empty stdout, and exact stderr
  `invalid_early_invocation\n`. Probe mismatches delegate only Plan A's fixed
  malformed tuple; never add a second probe serializer.
* **Process identity and launch:** Public Plan C APIs use complete
  `InitiatingProcessIdentity(pid, creation_token)`, never a bare PID. The
  injected low-level Win32 `open_process(pid)` seam is the only PID-only layer.
  Wait on the retained handle; never reopen the PID, use `Popen.close`, or use
  `subprocess.Popen` for detached recovery. Detached runners use canonical
  transaction-root `cwd`, `CreateProcessW`, an explicit `NUL` handle allowlist,
  and close parent thread/process handles exactly once.
* **Plan B owns transaction state:** Plan C must not write transitions,
  journals, `updates/active.json`, probe manifests, or transaction workspaces,
  and must not directly remove active/workspace evidence. Use Plan B readers,
  `TransactionPaths`, engine methods, and `finalize_terminal_evidence` only.
* **Preflight and recovery topology:** Before recovery-tree/status/RunOnce/live
  mutation, materialize and probe the exact combined staged Host, Extension, and
  metadata view; repeat immediately before activation. Never bypass
  `prepare_recovery_runtime`, activation-time preflight, or Plan D's required
  `require_no_pending_finalization` start barrier. `updates/recovery` replacement
  must preserve sibling `updates/active.json` byte-for-byte.
* **Bounded finalization:** Reserve the one `finalization-cursor.json`, write at
  most one matching receipt, advance the cursor to `receipt-ready`, then let Plan
  B clean terminal evidence. Acknowledgment moves the receipt with one
  same-volume `os.replace` to fixed `finalization-ack.json` and only then removes
  the cursor. Never scan receipts, use random scratch names, write a separate ack
  object, overwrite a pending cursor, or unlink/copy-delete a receipt.
* **Recovery test safety:** Automated Plan C tests use injected process,
  registry, probe, clock, filesystem, and mutex adapters only. Do not run a real
  update/install, registry/AppData mutation, browser registration, PID wait,
  RunOnce action, publish, tag, or release outside the disposable-VM gate.
* **Residual boundary:** Standalone bootstrap and per-write power-loss atomicity
  remain deferred. Automatic rollback covers ordinary update failures, but an
  extreme interruption may still require the matching full installer. Preserve
  transaction backups and `updates/**` evidence; never advise deleting them.

### 8. Secret Field Persistence

* **Boundary:** Sensitive fields (currently: `team_manifest_url`) are encrypted on disk in `%LOCALAPPDATA%\DynamicsHelper\config.json` using Windows DPAPI. Encryption happens **only at the host process boundary** — `chrome.storage.local`, IPC payloads, and host in-memory state continue to use plaintext.
* **Implementation:** `host/secret_store.py` (ctypes binding to `Crypt32.dll`; no `pywin32` dependency) plus `_decrypt_secrets_in_memory` / `_encrypt_secrets_before_write` on `NativeHost`. See `docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md`.
* **On-disk schema:** Encrypted form is `extension_preferences.team_manifest_url_encrypted` (base64 DPAPI blob). The plaintext key `team_manifest_url` MUST NEVER appear in `config.json` on disk.
* **DPAPI properties:** Per-user, per-machine binding. Copying `config.json` to another machine or another Windows account renders the blob unreadable. This is intentional: SAS tokens are not portable credentials.
* **Failure modes:**
  * **DecryptError on startup** (cross-machine copy, corrupt blob, admin password reset) → host logs a warning, treats the field as empty, leaves the bad blob on disk. User repastes URL in Options → new encrypted blob overwrites the bad one. Self-heal.
  * **EncryptError on write** → entire `update_config` is aborted with an error response. **No plaintext fallback under any circumstance.**
* **DO NOT** log plaintext URLs in `_decrypt_secrets_in_memory` / `_encrypt_secrets_before_write` or anywhere else.
* **DO NOT** add new sensitive fields without applying the same pattern. If you persist a credential to `config.json`, encrypt it.

### 9. Analysis Result Persistence (C2a+)

* **Pattern:** Analyze results survive page reload via `chrome.storage.local` (`dh_pending_analysis:<encoded-requestId>` + `dh_last_analysis`), with one-shot acknowledgments under deterministic `dh_seen_analysis:*` per-identity keys. The legacy singleton pending/seen keys remain read-only compatibility and are removed by Reset. The Service Worker owns result/pending/reset writes; FAB reads through `useAnalysisHydration` and writes the separate seen identity via `dismissPopover()`.
* **Wire contract:** FAB attaches `_persist: {caseNumber, successTitle, errorTitle}` to outgoing `analyze_error` NATIVE_MSG payloads. The SW strips this field before forwarding to the host. **DO NOT** forward `_persist` to the host — it will be treated as an unknown key.
* **Error persistence:** Error records keep the raw safe Host fallback in `content` and may keep a non-empty machine-readable code in `errorCode`. The Service Worker must preserve an inner Analyze `error_code` in preference to an outer code and must not fabricate one for transport failures. Legacy records without a code remain valid.
* **Display localization:** Titles are pre-translated in FAB and passed through `_persist`; the SW has no `useTranslation()`. Prompt-source error bodies are different: store the raw fallback plus code, then localize known codes in `ResultPopover` at immediate or rehydrated render time so the current language wins. Unknown codes display the stored fallback.
* **One-shot and request scope:** New results persist `requestId`; legacy records use exact `caseNumber + timestamp`. Pending and seen keys are request/identity scoped, so A/B never compete even across Service Worker restarts. Hydration uses one `chrome.storage.local.get(null)` snapshot, selects the newest fresh pending for the current case, and mirrors storage removal/expiry. A result removes only its own pending key. **DO NOT** bypass `popoverIsAnalyze.current` discrimination in the shared `ResultPopover` close handler.
* **Two ages:** `MAX_PENDING_DISPLAY_AGE_MS = 15min` (UI re-hydration cutoff) vs `MAX_PENDING_AGE_MS = 2h` (GC cutoff). Do not collapse these — they encode different user-intent assumptions.
* **Pure-helper boundary:** New analyze-persistence behaviour goes into `analyzeBridge.ts` (SW side) or `useAnalysisHydration.ts` (FAB side), NOT directly into `serviceWorker.ts`/`FAB.tsx`. The boundary makes the persistence invariants testable without a real Chrome port. See `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md` for invariant numbering (P-I1..P-I4, R-I1..R-I6).

## 5. Debugging Workflow

For Edge/D365 field extraction, follow
`docs/edge-d365-debugging-workflow.md` after checking current task authorization.
Use an approved existing browser session, scoped structural evidence and one
maintained CDP connection; do not export customer values or repeatedly reconnect
for each query. D365 internal case tabs, frames, and loaded panels are distinct.
Use observed field containers and synthetic regression fixtures. MCP registration
does not prove browser attachment; never infer unavailable data from a wrong
frame or a failed connection. This tooling is not a product dependency or permission
to install plugins, bypass company policy, operate cases, or publish changes.

Since you cannot see the browser or console:

1. **Check Host Logs:** Read `%LOCALAPPDATA%\DynamicsHelper\native_host.log` for backend errors.
2. **Check Telemetry:** Look for `trackEvent` calls in `FAB.tsx` to verify frontend flow.
3. **Mocking:** When adding new "Skills" or SDK features, verify they work in `dh_native_host.py` using `logging` before hooking them up to the UI.

`host/debug_auth.py`, `host/debug_bisect.py`, and `host/debug_sdk_direct.py` are retained historical probes and are not supported SDK 1.0.5 diagnostics: they still use removed constructor/import/message shapes. Their session calls keep `skip_custom_instructions=True`, but do not rely on these scripts until they are separately migrated. Use the SDK 1.0.5 probe in the wire-drift playbook below instead.

## 6. DH-Specific Instruction Source

`%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` is user-managed, so its contents and referenced tools vary by installation. It is selected only when Repository ONLY is not effective; otherwise it is retained but inactive. Do not copy assumptions from one user's file into product code, DH Core, or repository workflow. Product safety requirements remain in DH Core and code, not solely in this editable file.

## 7. Definition of Done (DoD)

To ensure long-term maintainability and consistency, a task is only considered "Done" when the following criteria are met:

1. **Code Functional:** The feature or bug fix is implemented and verified.
2. **No "Split Brain":** Changes to the Host architecture are compatible with both **Dev Mode** (Python script) and **Prod Mode** (Compiled Exe).
3. **Verification Matches Scope:** Behavior changes require relevant tests;
   milestone/release verification includes the agreed full Host/Extension suites
   and build. Documentation-only work requires static document checks, not a
   full product run. State exact code/artifact identity and any skipped checks.
4. **Documentation Updated:**
    * If the **Architecture** changed (e.g., Registry keys, Manifest logic), update `ARCHITECTURE.md`.
    * If the **User Workflow** changed (e.g., new installation step, new UI feature), update `USER_GUIDE.md`.
    * If the **Internal Logic** changed significantly (e.g., new Copilot pipeline, new state management pattern), update `DEVELOPER_GUIDE.md`.
    * If **Agent rules** changed (e.g., new critical rules, new code patterns), update `AGENTS.md`.
    * If the **public-facing overview** changed (e.g., new major feature, installation steps), update `README.md`.
5. **Clean Repository:** No temporary debug scripts or backup folders are left behind.

## 8. Release Workflow

**CRITICAL RULE:** Do not automatically publish a release to GitHub without the user's explicit approval or confirmation. Always ask before running the script with the `--publish` flag.

### Automation Script (`release_helper.py`)

This script automates version bumping, git operations, building, and publishing.

Its main entry point also commits/tags and cleans release outputs. Do not use it
for a local-only build or handoff cleanup. The examples below require a separately
approved release operation; historical plans do not supply that authorization.

* **Stable Release:**

    ```bash
    python release_helper.py 2.0.57 --publish
    ```

* **Beta/Pre-release:**

    ```bash
    python release_helper.py 2.0.58-beta --publish --prerelease
    ```

* **Release with markdown notes (recommended for major/beta releases):**

    ```bash
    python release_helper.py 2.0.71 --publish --prerelease --notes-file releases/notes-v2.0.71.md
    ```

    The `--notes-file` flag passes the markdown file to `gh release create --notes-file`, so the GitHub release body matches the file's content verbatim. Without this flag the script falls back to a 4-line hardcoded template ("Release vX.X.X / Installation / ..."). Place the notes file under `releases/` — the build step's clean phase now preserves it (only `*.zip` and `DynamicsHelper_v*` staging dirs are deleted).

**Required packaged assets:** Every manifest-referenced release input must be tracked or reproducibly generated before a release tag is created. `extension/items.json` is a tracked public-only product asset; never replace it with an ignored local/private menu. `release_helper.py` currently commits and tags before invoking its own build, so the operator MUST start from a clean worktree and successfully run `npm run build --prefix extension` before invoking the helper. That preflight must pass the source/dist `items.json` byte-identity check and is the pre-tag gate; the helper's later build is a second check, not the pre-tag gate.

**What it does:**

1. Updates version in `package.json`, `manifest.json`, and `host/product_info.py`.
2. **Commits & Tags:** Creates a `chore: release vX.X.X` commit and a `vX.X.X` git tag.
3. **Builds:** Runs `npm build` and `pyinstaller --onedir`.
4. **Packages:** Creates `DynamicsHelper_vX.X.X.zip` in `releases/` (contains `extension/`, `host/` with exe + `_internal/`, installer scripts).
5. **Publishes:** Uses `gh` CLI to upload the release to GitHub.

### Pre-Release Documentation Checklist

Before publishing any release, verify that all project documents are up to date:

1. **`AGENTS.md`** — Do any new rules, patterns, or critical constraints need to be added?
2. **`DEVELOPER_GUIDE.md`** — Are new pipelines, state management patterns, or debugging tips documented?
3. **`USER_GUIDE.md`** — Are new user-facing features, settings, or workflows documented?
4. **`ARCHITECTURE.md`** — Did the deployment model, registry keys, or file layout change?
5. **`README.md`** — Does the public overview reflect the current feature set and install steps?

If any document is stale, update it **before** running the release script. This checklist is part of the DoD (Section 7).

### Testing Workflow (The Safe Switch)

To prevent environment corruption, use `dev_switch.py` to toggle between testing source code (Dev) and the installed executable (Prod).

1. **Check Status:** `python dev_switch.py status`
2. **Switch to Prod:** `python dev_switch.py prod` (Uses installed `dh_native_host.exe`)
3. **Switch to Dev:** `python dev_switch.py dev` (Uses local `host/dh_native_host.py`)

**Testing Cycle:**

1. Work in **Dev** mode.
2. Build only through the separately approved build/release entry point.
3. Install only through the separately approved complete-installer procedure.
4. Switch to **Prod** mode -> Test in Browser.
5. Switch back to **Dev** mode.

## 9. Troubleshooting & Known Issues

### 1. "Native Host disconnected unexpectedly"

This error means the Host process crashed during startup or failed to establish the communication pipe.

* **Cause 1: Stdout Corruption**
  * **Reason:** Native Messaging relies on `stdout` for JSON communication. Any `print()` statement (from libraries or debug code) will corrupt the stream.
  * **Fix:** After early dispatch/startup recovery, `dh_native_host.py` redirects
    `sys.stdout` to `sys.stderr` before normal logging/config/SDK initialization.
    **DO NOT REMOVE IT.**
* **Cause 2: Manifest Encoding Bugs ("Jose")**
  * **Reason:** PowerShell's `Out-File` or `Set-Content` can introduce BOMs or incorrect encoding, causing Chrome to fail parsing the `manifest.json`.
  * **Fix (v2.0.39+):** The installer now delegates registration to the Python executable (`dh_native_host.exe --register`). This ensures strict UTF-8 (No BOM) generation.

### 2. Changes not reflecting

* **Runtime Source:** The extension loads from `extension/dist` (dev) or `%LOCALAPPDATA%\DynamicsHelper\extension` (prod).
* **Fix:** After building (`npm run build`), reload the extension in `chrome://extensions`. For production, run the installer or `release_helper.py`.

### 3. Update requires recovery or a matching installer

* **Automatic handling:** Durable `dh_update_state`, the detached recovery
  runner, and complete rollback resume ordinary interrupted updates.
* **Manual boundary:** Persistent matching-installer guidance or startup stderr
  `manual_recovery_required` means automatic recovery cannot safely finish. Run
  the complete installer for the matching release. Do not mix individual files
  or delete `%LOCALAPPDATA%\DynamicsHelper\updates` evidence.

### 4. MCP server config still uses legacy `type: "local"` / `"remote"`

* **Cause:** SDK 0.3.0 renamed MCP `type` values: `"local"` → `"stdio"`, `"remote"` → `"http"`. SDK 0.3.0 silently accepts the legacy values, so behaviour is undefined.
* **Symptom:** `native_host.log` shows lines like `MCP server 'foo' uses legacy type='local'; remapping in-memory to 'stdio'`.
* **Fix:** DH performs an in-memory remap inside `start_session()` so existing user configs keep working, but the user should update their `mcp.json` (global `~/.copilot/mcp-config.json` or workspace `.github/mcp-config.json`) to silence the warning. See `docs/sdk-upgrade-2026-05-0.3.0.md` § 7 (B-4).

### 5. SDK ↔ CLI wire drift (Copilot CLI changes, SDK lags)

**Architecture context.** `github-copilot-sdk` (PyPI) is **not** a self-contained library — it is a JSON-RPC client for the Copilot CLI (`npm install -g @github/copilot`). At runtime the SDK spawns `copilot.cmd --headless ...` as a subprocess; all LLM inference, auth, and tool execution happen inside the CLI process. SDK ↔ CLI talk over stdio JSON-RPC against a generated schema (`copilot/generated/rpc.py` on the Python side mirrors `copilot-sdk/generated/rpc.d.ts` on the CLI side).

The SDK has **no version pin on the CLI** in its package metadata. The only runtime check is `_verify_protocol_version()` calling `PingResponse`, comparing `SDK_PROTOCOL_VERSION` (3) against the CLI's reported version. This only catches **major** protocol bumps, NOT field-level type drift.

**Why this matters for DH.** DH's `requirements.txt` pins the SDK version, but Copilot CLI is whatever the user has installed (and `copilot.cmd` auto-updates itself by re-extracting newer versions into `%LOCALAPPDATA%\copilot\pkg\<version>\` on each invocation). So DH ships with `SDK pinned + CLI wildcard`. Any field-level wire change in the CLI between DH's released SDK version and the user's current CLI will surface as a crash inside `CopilotClient.start()` or `create_session()`.

**Known incident (2026-05-20, RESOLVED by 1.0.5 upgrade):** CLI 1.0.46+ changed `PingResponse.timestamp` from `int` (epoch ms) to ISO 8601 string. SDK 0.3.0 did `int(timestamp)` and crashed with `ValueError: invalid literal for int() with base 10: '2026-05-20T...Z'`. The original fix was a monkey-patch of `copilot.client.PingResponse.from_dict` at SDK-import time (commit `b4bb6ab`). **That shim was DELETED on 2026-07-03 during the SDK 0.3.0 → 1.0.5 upgrade** — 1.0.5's `from_dict` handles ISO timestamps natively (`isinstance(int,float) ? epoch : from_datetime()`), verified by a live `client.start()` on clean 1.0.5 + CLI 1.0.69. This incident is the canonical example of the shim pattern below, kept for reference even though the specific shim is gone.

**Response playbook when this recurs:**

1. Reproduce in dev mode with a 5-line probe (**SDK 1.0.5+ API** — note `RuntimeConnection`, NOT the removed `SubprocessConfig`):
   ```python
   import asyncio
   from copilot import CopilotClient, RuntimeConnection
   conn = RuntimeConnection.for_stdio(path=r"C:\Users\<u>\AppData\Roaming\npm\copilot.cmd")
   asyncio.run(CopilotClient(connection=conn).start())
   ```
2. Grep the traceback for the SDK file and line: `from_dict`, `int(...)`, `str(...)` casts on RPC dict fields are the usual suspects.
3. Add a startup-time monkey-patch in `dh_native_host.py` mirroring the (now-deleted) PingResponse shim pattern (read raw obj, normalise, fall through to original). The deleted shim's git history (`b4bb6ab` .. the 1.0.5-upgrade commit) is the reference implementation.
4. Verify with `& "host/venv/Scripts/python.exe" -c "..."` before rebuilding.
5. Record the patch in `docs/sdk-upgrade-*.md` follow-ups so the shim gets deleted when the SDK release catches up (as was done for the PingResponse one).

**Do NOT pin the user's CLI version.** Bundling a CLI binary inside DH (~100 MB), pinning npm install version (CLI auto-updates anyway by extracting into `%LOCALAPPDATA%\copilot\pkg\`), or wrapping `copilot.cmd` are all worse than per-incident shims. The Copilot CLI is a moving target by design.
