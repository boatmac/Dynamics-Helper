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

* **`src/components/FAB.tsx`**: The main UI component. It contains the "Analyze" logic and the safety timeout configuration (currently 600s).
* **`src/utils/pageReader.ts`**: Logic for scraping Dynamics/Azure Portal pages to extract case numbers, error text, and context.
* **`manifest.json`**: Defines permissions (`nativeMessaging`) and background scripts.
* **`dist/`**: The build output directory. Load the extension from here (`extension/dist`).

### `host/` (Backend)

* **`dh_native_host.py`**: The core backend script.
  * **Loop:** Reads messages from `stdin` (from Chrome) and writes to `stdout`.
  * **Timeout:** Has a hard timeout (currently 600s) for Copilot requests.
  * **Logging:** Writes to `%APPDATA%\DynamicsHelper\native_host.log`.
  * **Config Loading:** Prioritizes `%APPDATA%` config over the local directory.
* **`install.bat`**: Sets up the Python environment and registry keys.
* **`system_prompt.md`**: The base persona for the AI Agent.

### `%LOCALAPPDATA%\DynamicsHelper\` (User Configuration)

* **`config.json`**: Defines the MCP servers (Kusto, WorkIQ, etc.) and Skill directories the Agent can use.
  * *Note:* In Production mode, this file is shared between the installed app and the user's overrides.
* **`native_host.log`**: The primary debug log.
* **`copilot-instructions.md`**: The active system prompt (User overrides).

---

## The Copilot Integration Pipeline

Understanding how a user request becomes an AI response.

### 1. The Prompt Pipeline

1.  **User Input:** The user provides error text, context, and case metadata via the Extension UI.
2.  **Native Messaging:** This data is sent to the `dh_native_host.exe` as a JSON payload (`analyze_error` action).
3.  **PII Scrubbing (`pii_scrubber.py`):**
    *   Before sending to the LLM, the `text` and `context` are scrubbed using regex.
    *   **Removes:** Emails, IPv4 Addresses, US Phone Numbers.
    *   **Masks:** GUIDs (Subscription IDs) are replaced with `[REDACTED_GUID]` to prevent ID leakage, though this limits specific resource querying.
4.  **SDK Execution (`send_and_wait`):**
    *   The backend initializes a `CopilotSession` with the specific configuration.
    *   It sends the prompt with a **600s timeout**.

### 2. Instruction Hierarchy (The Context)

The "System Prompt" is built from three layers, merged at runtime in `_get_session_config`:

1.  **Layer 1: System Instructions (Immutable)**
    *   Source: `host/system_prompt.md` (or beside exe).
    *   Content: Base persona, core capabilities, safety rules.

2.  **Layer 2: User Instructions (Customizable)**
    *   Source: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`.
    *   Content: User-specific preferences managed via the Extension Options Page.

3.  **Layer 3: Workspace Instructions (Project-Specific)**
    *   Source: `[Root Path]/.github/copilot-instructions.md`.
    *   Content: Project-specific rules (if a Root Path is configured in the extension).

**Repository ONLY Logic:** If "Repo Only" is enabled, Layer 2 (User) and Layer 1 (System) might be ignored or handled differently depending on specific implementation details, but generally workspace instructions are prioritized.

### 3. Skills Configuration

Capabilities (Skills) are loaded based on the following precedence:

1.  **Base Skills:**
    *   **User Skills:** Defined in `%LOCALAPPDATA%\config.json`.
    *   **Default Skills:** Bundled with the application.
    *   *Rule:* User Settings **override** Default Settings. If `skill_directories` exists in User Config, Default is ignored.

2.  **Workspace Skills:**
    *   **Source:** `[Root Path]/.github/skills` directory.
    *   *Rule:* Workspace skills are **appended** to Base Skills.

3.  **Repository ONLY Mode:**
    *   If enabled: The AI uses **ONLY** Workspace Skills. Base Skills (User + Default) are ignored.

### 4. MCP Configuration

Model Context Protocol (MCP) servers follow similar logic:

1.  **Base MCP:**
    *   **User Config:** Defined in `%LOCALAPPDATA%\config.json` (legacy) or `~/.copilot/mcp-config.json` (standard).
    *   **Default Config:** Bundled `mcp-config.json` (if any).
    *   *Rule:* User Settings **override** Default Settings.

2.  **Workspace MCP:**
    *   **Source:** `[Root Path]/.github/mcp-config.json`.
    *   *Rule:* Workspace MCP servers are **merged** into Base MCP servers.

3.  **Repository ONLY Mode:**
    *   If enabled: The AI uses **ONLY** Workspace MCP servers. Base MCP servers are ignored.

---

## Debugging Guide

### 1. "Host Disconnected" or "No Response"

* **Check:** Is the Host running? Chrome spawns it automatically.
* **Log:** Check `%LOCALAPPDATA%\DynamicsHelper\native_host.log`.
* **Common Cause:** Registry key mismatches or PowerShell encoding bugs.
* **Fix:**
    *   Run `installer_core.ps1` (or `install.bat`) again.
    *   Verify `manifest.json` in `%LOCALAPPDATA%\DynamicsHelper` is valid JSON and points to `dh_native_host.exe`.

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

* **Stable Release:** `python release_helper.py 2.0.18 --publish`
* **Beta Release:** `python release_helper.py 2.0.19-beta --publish --prerelease`

### 2. The "Safe Switch" Workflow

To test the production build without breaking your dev environment, use `dev_switch.py`.

* **Mode: Dev** (`python dev_switch.py dev`): Runs local Python source.
* **Mode: Prod** (`python dev_switch.py prod`): Runs installed `.exe` (verifies installer logic).
