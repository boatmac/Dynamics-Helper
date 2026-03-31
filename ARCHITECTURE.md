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

* Copies `dh_native_host.exe` to `%LOCALAPPDATA%/DynamicsHelper`.
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
* **Invalid case numbers** result in a generic session (no persistence, no resume).
* **System Message Injection:** Before calling `create_session()` or `resume_session()`, the session ID is appended to the `system_message` content as a `## Session Info` section. This makes the session ID available to the AI for use in generated files (e.g., `context.md` frontmatter).

### Session Lifecycle

1. **First analysis for a case:** `resume_session(uuid)` is tried first. If no prior session exists, falls back to `create_session(session_id=uuid)`.
2. **Subsequent analyses for same case:** Session is reused (no refresh needed). Smart-refresh compares `current_case_id`, not the session ID.
3. **Case change or root path change:** Session is recreated with a new `resume_session()` attempt for the new case.
4. **SDK compatibility:** `AttributeError` is caught gracefully if the SDK version doesn't support `resume_session()`.

### Storage

* SDK stores session state at `~/.copilot/session-state/{session_id}/`.
* The report (`dh_case_report.md`) includes the server-assigned session ID and a resume command.

## 6. Case ID Pipeline

How case numbers flow from the browser to the host:

1. **PageReader** (`pageReader.ts`): Scrapes case numbers using a 4-strategy cascade (header controls, label search, header container regex, ticket title fallback). Regex: `/(\b\d{16}\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/`.
2. **FAB.tsx**: Passes `caseNumber` in the analyze payload to the service worker.
3. **serviceWorker.ts**: Transparent relay — passes the payload through to the native host.
4. **dh_native_host.py**: `payload.get("caseNumber", "Unspecified")` extracts the value. `_extract_case_id()` validates the format. Invalid numbers fall back to generic (non-persistent) sessions.
