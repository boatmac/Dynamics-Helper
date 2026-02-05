# Dynamics Helper - Developer Documentation

## Overview
This document explains the internal architecture and file responsibilities of the Dynamics Helper project. Use this to understand how the pieces fit together when debugging or adding new features.

## Architecture
The project consists of three main components:
1.  **Browser Extension (Frontend):** A Chrome/Edge extension written in React/TypeScript. It handles the UI, page scraping, and user interaction.
2.  **Native Host (Backend):** A Python script (`dh_native_host.py`) running locally on the user's machine. It acts as a bridge between the browser and the AI Agent.
3.  **AI Agent (Copilot):** The GitHub Copilot CLI SDK, which performs the actual intelligence tasks (RAG, analysis, query generation).

## Directory Structure

### `extension/` (Frontend)
*   **`src/components/FAB.tsx`**: The main UI component. It contains the "Analyze" logic and the safety timeout configuration (currently 600s).
*   **`src/utils/pageReader.ts`**: Logic for scraping Dynamics/Azure Portal pages to extract case numbers, error text, and context.
*   **`manifest.json`**: Defines permissions (`nativeMessaging`) and background scripts.
*   **`dist/`**: The build output directory. Load the extension from here (`extension/dist`).

### `host/` (Backend)
*   **`dh_native_host.py`**: The core backend script.
    *   **Loop:** Reads messages from `stdin` (from Chrome) and writes to `stdout`.
    *   **Timeout:** Has a hard timeout (currently 600s) for Copilot requests.
    *   **Logging:** Writes to `%APPDATA%\DynamicsHelper\native_host.log`.
    *   **Config Loading:** Prioritizes `%APPDATA%` config over the local directory.
*   **`install.bat`**: Sets up the Python environment and registry keys.
*   **`register.py`**: Helper script called by `install.bat` to write the Native Messaging manifest to the Windows Registry.
*   **`copilot-instructions.md`**: The system prompt for the AI Agent. Defines its role, tools, and privacy rules.

### `%APPDATA%\DynamicsHelper\` (User Configuration)
*   **`config.json`**: Defines the MCP servers (Kusto, WorkIQ, etc.) and Skill directories the Agent can use.
*   **`native_host.log`**: The primary debug log.
*   **`copilot-instructions.md`**: The active system prompt. (Overrides the one in `host/` if present).

## Debugging Guide

### 1. "Host Disconnected" or "No Response"
*   **Check:** Is the Host running? Chrome spawns it automatically.
*   **Log:** Check `%APPDATA%\DynamicsHelper\native_host.log`.
*   **Common Cause:** Python path issues or Registry key mismatches.
*   **Fix:** Re-run `install.bat` as Administrator. Check `register.py` has the correct Extension ID (`fkemelmlolmdnldpofiahmnhngmhonno`).

### 2. "Analysis Timeout"
*   **Check:** Does the log show `Copilot request timed out after X seconds`?
*   **Cause:** The Agent is doing too much (heavy RAG, many Kusto queries).
*   **Fix:**
    *   **Temporary:** The user just needs to wait/retry.
    *   **Permanent:** Increase timeouts in `FAB.tsx` (Frontend) AND `dh_native_host.py` (Backend). Frontend timeout must always be > Backend timeout.

### 3. Agent outputting PII or missing Technical IDs
*   **Check:** `%APPDATA%\DynamicsHelper\copilot-instructions.md`.
*   **Fix:** Edit the instructions file to clarify redaction rules. (We recently updated this to whitelist GUIDs/Resource IDs).

### 4. Agent failing to run Kusto queries
*   **Check:** Logs for `Permission requested`.
*   **Check:** `config.json` in `%APPDATA%` to ensure the `kusto` MCP server is defined correctly.
*   **Check:** Does the user have `Use-AzureChina` or relevant credentials? The Agent runs as the user.

## Security & Compliance

### PII Redaction (`pii_scrubber.py`)
To minimize data leakage, the Native Host employs a regex-based scrubber (`host/pii_scrubber.py`) *before* sending any prompt to the Copilot SDK.
*   **Trigger:** Called in `handle_analyze_error` inside `dh_native_host.py`.
*   **Entities Redacted:**
    *   Emails
    *   IPv4 Addresses
    *   GUIDs (Note: This includes Subscription/Tenant IDs, which effectively anonymizes the request but prevents the AI from querying specific resources by ID).
    *   US Phone Numbers
*   **Developer Note:** If you need to enable specific resource targeting (e.g., Kusto queries on a specific SubID), you may need to relax the GUID regex in `pii_scrubber.py` or implement a whitelist strategy.

### Native Messaging Security
*   **Origins:** The `host/register.py` script restricts communication to *only* the specific Extension IDs defined in `ALLOWED_ORIGINS`.
*   **Auto-Approval:** The `dh_native_host.py` implements a `_permission_handler` that returns `{"kind": "approved"}` for all SDK permission requests.
    *   **Reason:** The host runs headless (no terminal UI). Without this, any tool use (reading files, running queries) would hang indefinitely waiting for user 'y/n' input.
    *   **Risk:** This grants the AI full access to the defined tools (File System, Kusto, etc.). Ensure only trusted Skills/MCP servers are configured.

## Release Process
1.  **Frontend:** `cd extension` -> `npm run build`.
2.  **Backend:** No build needed (Python), but ensure `install.bat` is up to date if dependencies change.
3.  **Documentation:** Update `USER_GUIDE.md` if installation steps change.
