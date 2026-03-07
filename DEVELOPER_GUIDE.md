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

* **`src/components/FAB.tsx`**: The main UI component. It contains the "Analyze" logic, the safety timeout configuration (currently 600s), and the `isUserEdited` ref pattern for protecting user edits from background scans.
* **`src/components/Options.tsx`**: The extension settings page. Handles preferences, Root Path, MCP/Skill directory config, team catalog sync, and update checking.
* **`src/utils/pageReader.ts`**: Logic for scraping Dynamics/Azure Portal pages to extract case numbers, error text, and context. Uses a 4-strategy cascade (header controls, label search, header container regex, ticket title fallback).
* **`src/background/serviceWorker.ts`**: Service worker handling telemetry (with stable anonymous UUID via `chrome.storage.local`), native messaging relay, and extension version injection.
* **`src/utils/telemetry.ts`**: Azure Application Insights integration for anonymous telemetry.
* **`manifest.json`**: Defines permissions (`nativeMessaging`) and background scripts.
* **`dist/`**: The build output directory. Load the extension from here (`extension/dist`).

### `host/` (Backend)

* **`dh_native_host.py`**: The core backend script.
  * **Loop:** Reads messages from `stdin` (from Chrome) and writes to `stdout`.
  * **Timeout:** Has a hard timeout (currently 600s) for Copilot requests.
  * **Logging:** Writes to `%LOCALAPPDATA%\DynamicsHelper\native_host.log`.
  * **Config Loading:** Prioritizes `%LOCALAPPDATA%` config over the local directory.
  * **Session Persistence:** Uses deterministic session IDs (`dh-{caseId}`) for Copilot `/resume` support.
  * **Case ID Validation:** `_extract_case_id()` validates 16-digit case IDs and 19-digit task IDs.
* **`updater.py`**: Self-update mechanism. Downloads updates from GitHub releases, handles locked `.exe` files by renaming to `.exe.old` (with `.old2`, `.old3` fallback for antivirus locks).
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
    * A deterministic session ID `dh-{caseId}` is derived from the validated case ID.
    * Smart refresh: the session is only recreated when the case ID or workspace root path changes.
    * On session creation, `resume_session()` is tried first (restores conversation history, tool state). Falls back to `create_session()` with `session_id` in config.
5. **SDK Execution (`send_and_wait`):**
    * The backend sends the prompt with a **600s timeout**.

### 2. Session Persistence

The host maintains persistent sessions so users can continue analysis in the Copilot CLI.

* **Session ID Format:** `dh-{caseId}` (e.g., `dh-2601190030003106`).
* **SDK Mechanism:** `client.resume_session(session_id)` restores state from `~/.copilot/session-state/{session_id}/`.
* **Graceful Fallback:** If the SDK version doesn't support `resume_session()`, an `AttributeError` is caught and a new session is created instead.
* **Report Integration:** `dh_case_report.md` includes the session ID and a resume command: `copilot /resume dh-{caseId}`.
* **Response Payload:** The `session_id` is returned to the extension in the analysis response for frontend visibility.

### 3. Instruction Hierarchy (The Context)

The "System Prompt" is built from three layers, merged at runtime in `_get_session_config`:

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

---

## Self-Update Mechanism

The extension checks for updates on startup (via `health_check` action) and displays an "Update Available" notification in the Options page and FAB.

### Flow

1. **Check:** `NativeHost.check_for_updates()` queries the GitHub Releases API.
2. **Notify:** If a newer version exists, sends `NATIVE_UPDATE_AVAILABLE` message to the extension.
3. **Download:** User clicks "Update Now" → `updater.download_update()` fetches the release zip.
4. **Apply:** The updater extracts files, handles locked `.exe` via rename-to-`.old` strategy.
5. **Restart:** The host process exits; Chrome relaunches it on the next native message.

### Locked File Handling

When replacing `dh_native_host.exe`, the file may be locked by the OS or antivirus:

1. Try `rename → .exe.old`
2. If locked: try `.exe.old2`, `.exe.old3` as fallback
3. Log errors for debugging

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
