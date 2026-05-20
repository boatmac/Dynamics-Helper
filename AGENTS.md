# Dynamics Helper - AGENTS.md

This file defines the operational rules, development workflows, and coding standards for AI agents working on the "Dynamics Helper" project.

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
    pyinstaller --onedir --clean -y --name dh_native_host host/dh_native_host.py
    ```

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
  * **Team catalog preferences** (`prefs.teamCatalogEnabled`, `prefs.teamManifestUrl`): plain user preferences, no `isUserEdited` guard needed. These are NOT mirrored to host `config.json` — team catalog is a purely extension-side feature; the host process never reads team data. See `docs/superpowers/specs/2026-05-20-team-catalog-user-config-design.md`.
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
  * Import types from `copilot` (top-level: `CopilotClient`, `SubprocessConfig`) and `copilot.session` (`PermissionRequestResult`, `PreToolUseHookOutput`). `copilot.types` was removed in SDK 0.3.0; `CopilotClientOptions`, `MessageOptions`, and `SessionConfig` were removed in 0.2.0. WARNING: `copilot.generated.rpc.PermissionRequestResult` is a different internal RPC type (`success: bool`) — always import the session version. Full migration notes: `docs/sdk-upgrade-2026-05-0.3.0.md`.
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
  * `--register`: Registers the Native Host manifest and registry keys. Used by the installer.
  * CLI flags are checked via raw `sys.argv` membership (no `argparse`).

## 4. Critical Rules & Safety

### 1. Headless Operation & Permissions

* **The Golden Rule:** The Native Host runs **headless** (no UI).
* **Permission Handler:** You **MUST** maintain the `_permission_handler` in `dh_native_host.py` that auto-approves requests.
* **Why?** If the Copilot SDK asks for permission (e.g., "Allow Read File?"), the process will hang indefinitely if not auto-approved, as the user cannot see the prompt.
* **Do Not Modify:** `on_permission_request=self._permission_handler` is passed as a keyword argument to `create_session()` and `resume_session()`. This ensures all SDK permission prompts are auto-approved.

### 2. Timeouts

* **Sync:** Frontend and Backend timeouts must match.
* **Current Value:** **600 seconds (10 minutes)**.
* If you change the timeout in `dh_native_host.py`, you must update the fallback timeout in `FAB.tsx`.

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

* **Session Names:** The host derives a stable session-name string from each 16-digit case ID via `_case_to_session_id()`, returning `co-<case>`. This string is used as the `session_id` for both SDK `create_session()` and `resume_session()`, AND as the shell-CLI handle for `copilot --resume co-<case>`. Contract: MyCasesKit B81 RFC § D1 (`^(cc|co)-<case-num>$`). B82 (2026-05-11) replaced the prior UUID v5 derivation after the CLI's `--resume <custom-name>` corruption bug was verified fixed (see `host/test_case_id.py::TestCaseToSessionId` regression guard).
* **Tracking:** `self.current_session_id` (Python field name retained for diff economy) holds the session-name string `co-<case>` used in reports and `--resume`. `self.current_case_id` tracks which case the session belongs to (used for smart-refresh comparison).
* **Resume:** The host tries `resume_session(name)` first (where `name` is `co-<case>`). If that fails, falls back to `create_session(session_id=name)`. Handles `AttributeError` gracefully if the SDK version doesn't support resume.
* **Smart Refresh:** Sessions are only recreated when `current_case_id` or workspace root path actually changes — not on every analyze request.
* **Report:** `dh_case_report.md` includes the session name and a `copilot --resume <name>` command.
* **System Message Injection:** The session name is appended to the `system_message` content as a `## Session Info` section before session creation (labelled `Session Name: co-<case>`), so the AI can reference it during the conversation (e.g., for `context.md` frontmatter — MyCasesKit `session_name:` field per B81 RFC § D1).

### 7. Self-Update Mechanism

* **Updater:** `host/updater.py` handles downloading and applying updates from GitHub releases.
* **--onedir Layout:** The release zip contains a `host/` folder with the exe, `_internal/` directory (Python runtime, DLLs), and config files. The updater copies all files to the install directory, protecting user files (`config.json`, `copilot-instructions.md`, log files) via `_USER_FILES` set.
* **Locked File Handling:** When replacing `dh_native_host.exe`, the old file may be locked by the OS or antivirus. The updater renames it to `.exe.old` (or `.exe.old2`, `.exe.old3` as fallback). Other files (`_internal/`, `system_prompt.md`) are overwritten directly.
* **Do Not Break:** The `--register` CLI flag and the self-update flow are critical for production users. Test changes carefully.

## 5. Debugging Workflow

Since you cannot see the browser or console:

1. **Check Host Logs:** Read `%LOCALAPPDATA%\DynamicsHelper\native_host.log` for backend errors.
2. **Check Telemetry:** Look for `trackEvent` calls in `FAB.tsx` to verify frontend flow.
3. **Mocking:** When adding new "Skills" or SDK features, verify they work in `dh_native_host.py` using `logging` before hooking them up to the UI.

## 6. Copilot SDK Instructions

(From `copilot-instructions.md` in user's `%LOCALAPPDATA%\DynamicsHelper\`)

* **Context:** The AI is analyzing support cases.
* **Tools:** It has access to `kusto_mcp`, `filesystem`, `workiq`.
* **Format:** Responses should be in Markdown.
* **Safety:** Do not output real customer PII in the final report.

## 7. Definition of Done (DoD)

To ensure long-term maintainability and consistency, a task is only considered "Done" when the following criteria are met:

1. **Code Functional:** The feature or bug fix is implemented and verified.
2. **No "Split Brain":** Changes to the Host architecture are compatible with both **Dev Mode** (Python script) and **Prod Mode** (Compiled Exe).
3. **Tests Pass:** All existing tests pass (`python -m unittest discover host` and `npm run build`).
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

* **Stable Release:**

    ```bash
    python release_helper.py 2.0.57 --publish
    ```

* **Beta/Pre-release:**

    ```bash
    python release_helper.py 2.0.58-beta --publish --prerelease
    ```

**What it does:**

1. Updates version in `package.json`, `manifest.json`, and `dh_native_host.py`.
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
2. Build release (`python release_helper.py 2.x.x`).
3. Run installer (`releases/DynamicsHelper_v2.x.x/install.bat`).
4. Switch to **Prod** mode -> Test in Browser.
5. Switch back to **Dev** mode.

## 9. Troubleshooting & Known Issues

### 1. "Native Host disconnected unexpectedly"

This error means the Host process crashed during startup or failed to establish the communication pipe.

* **Cause 1: Stdout Corruption**
  * **Reason:** Native Messaging relies on `stdout` for JSON communication. Any `print()` statement (from libraries or debug code) will corrupt the stream.
  * **Fix:** `dh_native_host.py` has a protection block at the very top that redirects `sys.stdout` to `sys.stderr`. **DO NOT REMOVE IT.**
* **Cause 2: Manifest Encoding Bugs ("Jose")**
  * **Reason:** PowerShell's `Out-File` or `Set-Content` can introduce BOMs or incorrect encoding, causing Chrome to fail parsing the `manifest.json`.
  * **Fix (v2.0.39+):** The installer now delegates registration to the Python executable (`dh_native_host.exe --register`). This ensures strict UTF-8 (No BOM) generation.

### 2. Changes not reflecting

* **Runtime Source:** The extension loads from `extension/dist` (dev) or `%LOCALAPPDATA%\DynamicsHelper\extension` (prod).
* **Fix:** After building (`npm run build`), reload the extension in `chrome://extensions`. For production, run the installer or `release_helper.py`.

### 3. Self-update fails silently

* **Cause:** Antivirus software (e.g., Windows Defender) may lock the `.exe` file, preventing rename/replace.
* **Fix:** The updater (`host/updater.py`) falls back to `.exe.old2`, `.exe.old3` naming for the exe. Other host files (`_internal/`, `system_prompt.md`) are overwritten directly. Check `native_host.log` for "locked" or "PermissionError" entries.

### 4. MCP server config still uses legacy `type: "local"` / `"remote"`

* **Cause:** SDK 0.3.0 renamed MCP `type` values: `"local"` → `"stdio"`, `"remote"` → `"http"`. SDK 0.3.0 silently accepts the legacy values, so behaviour is undefined.
* **Symptom:** `native_host.log` shows lines like `MCP server 'foo' uses legacy type='local'; remapping in-memory to 'stdio'`.
* **Fix:** DH performs an in-memory remap inside `start_session()` so existing user configs keep working, but the user should update their `mcp.json` (global `~/.copilot/mcp-config.json` or workspace `.github/mcp-config.json`) to silence the warning. See `docs/sdk-upgrade-2026-05-0.3.0.md` § 7 (B-4).

### 5. SDK ↔ CLI wire drift (Copilot CLI changes, SDK lags)

**Architecture context.** `github-copilot-sdk` (PyPI) is **not** a self-contained library — it is a JSON-RPC client for the Copilot CLI (`npm install -g @github/copilot`). At runtime the SDK spawns `copilot.cmd --headless ...` as a subprocess; all LLM inference, auth, and tool execution happen inside the CLI process. SDK ↔ CLI talk over stdio JSON-RPC against a generated schema (`copilot/generated/rpc.py` on the Python side mirrors `copilot-sdk/generated/rpc.d.ts` on the CLI side).

The SDK has **no version pin on the CLI** in its package metadata. The only runtime check is `_verify_protocol_version()` calling `PingResponse`, comparing `SDK_PROTOCOL_VERSION` (3) against the CLI's reported version. This only catches **major** protocol bumps, NOT field-level type drift.

**Why this matters for DH.** DH's `requirements.txt` pins the SDK version, but Copilot CLI is whatever the user has installed (and `copilot.cmd` auto-updates itself by re-extracting newer versions into `%LOCALAPPDATA%\copilot\pkg\<version>\` on each invocation). So DH ships with `SDK pinned + CLI wildcard`. Any field-level wire change in the CLI between DH's released SDK version and the user's current CLI will surface as a crash inside `CopilotClient.start()` or `create_session()`.

**Known incident (2026-05-20):** CLI 1.0.46+ changed `PingResponse.timestamp` from `int` (epoch ms) to ISO 8601 string. SDK 0.3.0 does `int(timestamp)` in `client.py:204` and crashes with `ValueError: invalid literal for int() with base 10: '2026-05-20T...Z'`. Fix: monkey-patch `copilot.client.PingResponse.from_dict` at SDK-import time (see `host/dh_native_host.py:244-287`, commit `b4bb6ab`). Delete the shim once SDK ships a release with native ISO support.

**Response playbook when this recurs:**

1. Reproduce in dev mode with a 5-line probe:
   ```python
   import asyncio
   from copilot import CopilotClient, SubprocessConfig
   asyncio.run(CopilotClient(SubprocessConfig(cli_path=r"C:\Users\<u>\AppData\Roaming\npm\copilot.cmd")).start())
   ```
2. Grep the traceback for the SDK file and line: `from_dict`, `int(...)`, `str(...)` casts on RPC dict fields are the usual suspects.
3. Add a startup-time monkey-patch in `dh_native_host.py` mirroring the PingResponse shim pattern (read raw obj, normalise, fall through to original).
4. Verify with `& "host/venv/Scripts/python.exe" -c "..."` before rebuilding.
5. Record the patch in `docs/superpowers/plans/<latest>.md` follow-ups so the shim gets deleted when the SDK release catches up.

**Do NOT pin the user's CLI version.** Bundling a CLI binary inside DH (~100 MB), pinning npm install version (CLI auto-updates anyway by extracting into `%LOCALAPPDATA%\copilot\pkg\`), or wrapping `copilot.cmd` are all worse than per-incident shims. The Copilot CLI is a moving target by design.
