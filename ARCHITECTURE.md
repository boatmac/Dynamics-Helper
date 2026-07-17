# Dynamics Helper - Native Host Architecture

## 1. The Dual-Mode Deployment Strategy

To prevent "Split Brain" (developing on source while running the installed exe), the system supports two mutually exclusive modes.

| Feature | **DEV Mode** (Source Code) | **PROD Mode** (End User / Release) |
| :--- | :--- | :--- |
| **Use Case** | Developing python logic (`host/`) | Final installation (`%LOCALAPPDATA%`) |
| **Executable** | `host/launch_host.bat` (Wrapper) | `dh_native_host.exe` (Compiled) |
| **Manifest File** | `host/host_manifest.json` | `%LOCALAPPDATA%/DynamicsHelper/manifest.json` |
| **Path Strategy** | **ABSOLUTE** (e.g., `C:\Repo\host\launch_host.bat`) | **RELATIVE** (e.g., `dh_native_host.exe`) |
| **Why?** | Browser needs full path to find the repo. | Bypass encoding bugs (e.g., `Jose`) by keeping path local. |

## 2. Critical Technical Constraints

### A. Manifest Encoding (The "Jose" Rule)

* **Rule:** The `manifest.json` MUST be written as **UTF-8 WITHOUT BOM**.
* **Reason:** Chrome/Edge Native Messaging hosts fail to parse JSON if a Byte Order Mark (BOM) is present.
* **Implementation:**
  * **PowerShell:** Do NOT use `Out-File -Encoding UTF8` (Adds BOM). Use `[System.IO.File]::WriteAllText`.
  * **Python:** Use `open(path, 'w', encoding='utf-8')` (Default is No-BOM).

### B. Registry Keys

The browser looks up the Host ID (`com.dynamics.helper.native`) in the Registry.

* **Key:** `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.dynamics.helper.native` (and Edge equivalent).
* **Value:** The **Absolute Path** to the Manifest File.
  * **Dev:** Points to `.../Repository/host/host_manifest.json`
  * **Prod:** Points to `%LOCALAPPDATA%/DynamicsHelper/manifest.json`

### C. Stdout Protection

* The Native Host communicates via `stdout` using length-prefixed JSON.
* **Any `print()` to stdout (from code or libraries) will corrupt the communication pipe** and cause "Native Host disconnected" errors.
* `dh_native_host.py` redirects `sys.stdout` to `sys.stderr` at the very top of the file. **DO NOT REMOVE THIS.**

## 3. Tooling Responsibilities

### `host/register.py` (Dev Registration)

* Calculates the absolute path of `launch_host.bat`.
* Writes `host_manifest.json` (UTF-8 No BOM).
* Updates Registry to point to `host/host_manifest.json`.

### `installer_core.ps1` (Prod Installation)

* Copies host files (exe + `_internal/` runtime from `--onedir` build) to `%LOCALAPPDATA%/DynamicsHelper`.
* Writes `manifest.json` with `"path": "dh_native_host.exe"` (Relative).
* **CRITICAL:** Uses `[System.IO.File]::WriteAllText` to ensure No-BOM.
* Updates Registry to point to `%LOCALAPPDATA%/DynamicsHelper/manifest.json`.
* **Preserves user data:** `copilot-instructions.md` and `config.json` are NEVER deleted or overwritten by the installer.

### `dev_switch.py` (Mode Toggler)

* Does NOT modify files.
* Only updates the **Registry Key** to toggle between the Dev Manifest path and the Prod Manifest path.

## 4. Self-Update Architecture

The host supports in-place updates without requiring the user to re-download and re-install.

### Flow

1. **Check:** On startup (`health_check` action), `NativeHost.check_for_updates()` queries the GitHub Releases API.
2. **Notify:** If a newer version exists, sends `NATIVE_UPDATE_AVAILABLE` message to the extension with version and download URL.
3. **Download:** When user clicks "Update Now", `updater.download_update()` fetches the release zip.
4. **Apply:** The updater extracts files to the install directory (`%LOCALAPPDATA%\DynamicsHelper`).
5. **Locked File Handling:** When replacing `dh_native_host.exe`:
   * Try renaming old file to `.exe.old`
   * If locked (antivirus): fall back to `.exe.old2`, `.exe.old3`
   * Other host files (`_internal/`, `system_prompt.md`) are overwritten directly
   * User files (`config.json`, `copilot-instructions.md`, logs) are protected via `_USER_FILES` set
   * Log errors for debugging
6. **Reload:** The FAB calls `chrome.runtime.reload()` to reload the extension with the new code. The `pending_update` key is cleared from `chrome.storage.local` on success; the Options page uses version guards to dismiss stale banners.
7. **Restart:** The host process exits; Chrome relaunches it on the next native message.

### Key Files

* **`host/updater.py`** (~208 lines): The `Updater` class handling download, extraction, and locked-file fallback.
* **`extension/src/components/Options.tsx`**: Displays update status and "Update Now" button.

## 5. Session Persistence Architecture

The host maintains Copilot sessions so users can continue analysis in the Copilot CLI.

### Session ID Strategy

* **Session ID:** A deterministic UUID v5 derived from the case ID via `_case_to_session_id()`. The same case always produces the same UUID. The Copilot CLI requires session IDs to be valid UUIDs (not arbitrary strings).
* **Server Verification:** After `create_session()`, the real session ID is captured from `session.session_id`. This is stored in `self.current_session_id` and used in reports and `/resume` commands.
* **Case Tracking:** `self.current_case_id` holds the 16-digit case ID for smart-refresh comparison. This is separate from the session ID.
* **Validation:** `_extract_case_id()` accepts 16-digit (main case) or 19-digit (task ID, maps to parent 16 digits).
* **Invalid case numbers** may use a generic session only when an analysis is explicitly requested; startup never pre-creates one.
* **System Message Injection:** Before calling `create_session()` or `resume_session()`, the deterministic UUIDv5 session name is appended to the `system_message` content as `## Session Info` / `Session Name:`. This makes it available for generated files such as `context.md` frontmatter `session_name:`.

### Session Lifecycle

1. **First analysis for a case:** `resume_session(uuid)` is tried first. If no prior session exists, falls back to `create_session(session_id=uuid)`.
2. **Subsequent analyses for same case:** Session is reused only when `current_case_id` and `current_session_root_path` still match and the client/session are available.
3. **Case or root change:** The client is restarted when its process cwd differs from the configured root; the deterministic session is then resumed with explicit `working_directory=root` (or created under that root). Analyze payloads with missing/empty `rootPath` use host `config.json`; only `update_config` can clear the canonical root.
4. **SDK compatibility:** `AttributeError` is caught gracefully if the SDK version doesn't support `resume_session()`.
5. **Shell resume:** Reports print `copilot -C '<root>' --resume=<uuid>`, applying the Root before the interactive CLI continuation resolves workspace capabilities and overriding stale cwd metadata in sessions created by older DH versions. DH SDK sessions separately disable CLI automatic custom-instruction discovery and supply their selected instructions explicitly.

### Storage

* SDK stores session state at `~/.copilot/session-state/{session_id}/`.
* The report (`dh_case_report.md`) includes the server-assigned session ID and a resume command.

## 6. Case ID Pipeline

How case numbers flow from the browser to the host:

1. **PageReader** (`pageReader.ts`): Scrapes case numbers using a 4-strategy cascade (header controls, label search, header container regex, ticket title fallback). Regex: `/(\b\d{16}\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/`.
2. **FAB.tsx**: Passes `caseNumber` in the analyze payload to the service worker.
3. **serviceWorker.ts**: Transparent relay — passes the payload through to the native host.
4. **dh_native_host.py**: `payload.get("caseNumber", "Unspecified")` extracts the value. `_extract_case_id()` validates the format. Invalid numbers fall back to generic (non-persistent) sessions.

## 7. Deterministic Prompt Architecture

### Source Selection Boundary

The Native Host, not Copilot CLI discovery, owns every configurable instruction source used by DH. Every SDK `create_session()` and `resume_session()` call, including create fallback and transport retry, sets `skip_custom_instructions=True`. This excludes CLI-global instructions, `AGENTS.md`/related agent files, path-specific instruction files, and automatically discovered repository instructions from all DH sessions.

DH explicitly assembles system content from:

1. Product-managed DH Core (`host/system_prompt.md` in development or beside the installed Host executable).
2. Exactly one editable source selected by `effective_repository_only = bool(effective_root) and use_workspace_only`:
   * false: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (DH-specific Instructions);
   * true: `<Root>/.github/copilot-instructions.md` (Repository Instructions).
3. Deterministic Session Info containing the UUIDv5 session name.

Custom User Prompt (`%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`) never enters system content. The Host rereads this canonical source for each Analyze, replaces/removes any Extension-provided `## User Prompt` section, and then PII-scrubs the final user content. The only supported repository instruction path is the Root-level `.github/copilot-instructions.md`; DH does not reproduce the CLI's parent, agent-file, or path-specific discovery rules.

### Snapshot and Refresh Boundary

`PromptSnapshot` is frozen and contains source mode, effective Root, exact Core/selected bytes, strict UTF-8 decoded strings, and a `v1:` SHA-256 fingerprint. Core and the selected source are each opened once per resolution attempt. The fingerprint length-frames the version marker, source mode, Core bytes, and selected bytes, preventing ambiguous concatenation and ensuring assembly and comparison observe the same bytes.

Analyze resolves a fresh snapshot before every turn. The active session is reused only when client/session, case identity, active Root, and fingerprint all match. Any source-mode or byte change refreshes/resumes the same UUIDv5 session, preserving persisted history. The candidate fingerprint becomes active only after awaited SDK resume/create succeeds. All active-session invalidation routes use `_invalidate_active_session()`, which clears session identity, active Root, and `current_prompt_fingerprint`; transport failures may also clear the client.

Prompt resolution is fail-closed. Missing/unreadable Core, unreadable selected DH-specific Instructions, and missing/unreadable selected Repository Instructions return stable safe errors and send no model turn. A missing DH-specific file and an existing empty Repository file are valid empty editable layers. There is no fallback to an unselected source.

### Config and Error Boundary

`get_config` uses a soft health projection rather than creating a strict session snapshot. It returns normal configuration plus `prompt_source_status`; Options therefore remains available to repair a bad source. Readable DH-specific text is returned separately as `_user_instructions_raw`, and readable Custom User Prompt as `extension_preferences.user_prompt`, including explicit empty strings. An unreadable/invalid-UTF-8 file omits its content property; Custom User Prompt uses `user_prompt_unreadable`, so neither editor is overwritten with a false empty value. Session-refresh `_get_session_config` calls do not read/migrate/hydrate `user_prompt.md`; Analyze reads it once through its separate canonicalization boundary.

`update_config` distinguishes sparse field omission from explicit empty content for both `user_instructions` and top-level `user_prompt`. Omission performs no file write; explicit `""` truncates the selected file. Options carries immutable revision/value tokens only on explicit edit/clear/Reset, acknowledges matching saved revisions, and retries unacknowledged values. Its structured result separates durable persistence (`config_saved`) from session refresh (`success`). The Host does not roll back uncertain partial writes; it invalidates stale active prompt state once a durable writer was attempted.

Options serializes and coalesces `dh_prefs` mirror writes. Host updates and
typed team/Reset actions are post-commit work of only the latest successful
snapshot; storage failure retains unsettled intent and exposes a warning. Reset
is a tokenized Service Worker transaction whose response is
`committed|stale|failed`; only matching committed truth permits local cleanup.
FAB similarly owns an Analyze request through all asynchronous response
processing, including case hashing, so stale requests have no UI or telemetry
authority.

Analyze errors may carry optional `error_code`. The Service Worker persists raw safe fallback text plus optional `LastAnalysis.errorCode`, preserving an inner Analyze code over an outer wrapper code. Immediate and rehydrated FAB display use the same render-time localization helper for known codes; immediate unknown-code fallbacks may include a safe UI prefix, while rehydrated unknown/legacy codes retain the raw stored fallback. Instruction contents, Custom User Prompt contents, and prompt-source paths are excluded from normal logs and telemetry.

Service Worker persistence has two ownership domains. Team requests carry captured enabled/URL/team identity plus request generation; `teamCatalog.ts` synchronously invalidates older generations and queues validation with awaited manifest/item/ETag/timestamp/clear mutations. `analysisStore.ts` uses request-scoped pending and identity-scoped seen keys, so A/B remain independent across worker restarts; hydration derives last, newest matching pending, and acknowledgment from one snapshot. Options issues Service Worker messages and does not mutate owned keys directly.

Options' ordered preference mirror attaches stable post-commit action IDs to
user intents. Compatible newer snapshots inherit unsettled actions, incompatible
team identities cancel them, and settlement precedes dispatch so recursive
repair writes remain exactly once. Options and Menu team UI reads separately
generation-gate asynchronous cache snapshots. FAB local Analyze ownership and
safety timers are request-ID scoped and reconcile with the hook's full hydrated
pending identity rather than a boolean mirror.

### Product Scope

Repository ONLY selects repository Skills, MCP, and the single Root instruction file while DH Core and Custom User Prompt remain active. This architecture is generic to any absolute Root. It does not implement MyCases detection, Stage 0 coordination, Stage 1 persistence, MyCases file writes, or an Auto/Standalone/Integrated mode.
