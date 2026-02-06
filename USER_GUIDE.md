# Dynamics Helper - User Guide

## Introduction

Dynamics Helper is a browser extension designed to assist Technical Support Engineers. It acts as a bridge between your browser (Edge/Chrome) and a powerful local AI Agent (GitHub Copilot), allowing you to analyze support cases, error logs, and telemetry securely and efficiently.

## Prerequisites

Before installing, ensure you have the following software installed on your Windows machine:

1. **Python 3.10+**: [Download Here](https://www.python.org/downloads/) (Ensure "Add Python to PATH" is checked during install).
2. **Node.js (LTS)**: [Download Here](https://nodejs.org/).
3. **GitHub Copilot CLI**:
    * Open PowerShell or Command Prompt.
    * Run: `npm install -g @githubnext/github-copilot-cli`
    * Authenticate: `github-copilot-cli auth` (Follow the login prompt in your browser).

## Installation

### 1. Install the Native Host (Backend)

The "Host" is the bridge that allows the browser to talk to the AI.

1. Navigate to the `host` folder in the repository.
2. Right-click `install.bat` and select **Run as Administrator**.
    * This script installs Python dependencies and registers the host in the Windows Registry.
    * *Note: You may see a command window pop up and close. This is normal.*

### 2. Install the Browser Extension

1. Open Microsoft Edge or Google Chrome.
2. Navigate to `edge://extensions` or `chrome://extensions`.
3. Toggle **Developer mode** (usually a switch in the sidebar or top right).
4. Click **Load unpacked**.
5. Select the `extension/dist` folder from this repository.
    * *Note: If `dist` does not exist, ask your developer to run `npm run build` in the `extension` folder.*
6. **Important:** Copy the **ID** string generated for the extension (e.g., `abcdefghijklmnop...`).

### 3. Connect Extension to Host

1. Open the file `host/register.py` in a text editor (Notepad is fine).
2. Look for the line: `ALLOWED_ORIGINS = [...]`.
3. Add your Extension ID to the list. Example:

    ```python
    ALLOWED_ORIGINS = [
        "chrome-extension://YOUR_COPIED_ID_HERE/",
        "chrome-extension://kpggjbdloiifmmebbaljbefmcfhegnnc/" 
    ]
    ```

4. Run `install.bat` as Administrator **again** to update the registry with the new ID.

---

## Configuration

The extension uses configuration files stored in your User directory. This ensures your settings are safe even if you update the tool.

**Location:** `%APPDATA%\DynamicsHelper` (Paste this into Windows File Explorer address bar).

* **`config.json`**: Controls MCP servers, skills, and model settings.
* **`copilot-instructions.md`**: The "Persona" of the AI. You can edit this file to change how the AI responds (e.g., change the tone, add new rules).
* **`native_host.log`**: The log file for troubleshooting.

---

## Security & Privacy

This extension is designed with "Privacy First" principles for handling support data.

### Data Flow

1. **Browser (Local)**: The extension scrapes case details from your active tab.
2. **Native Host (Local)**: Data is passed to the Python Host running on your machine.
3. **PII Scrubbing (Local)**: Before leaving your machine, the Host attempts to redact sensitive entities (see below).
4. **GitHub Copilot (Cloud)**: The *sanitized* text is sent to the GitHub Copilot API (Microsoft) for analysis.
5. **Return**: The AI response is sent back to your local machine.

### Automatic Redaction

The tool includes a built-in "PII Scrubber" that attempts to remove the following before sending data to the AI:

* **Emails**: Replaced with `[REDACTED_EMAIL]`
* **IPv4 Addresses**: Replaced with `[REDACTED_IP]`
* **GUIDs/UUIDs** (e.g., Subscription IDs): Replaced with `[REDACTED_GUID]`
* **US Phone Numbers**: Replaced with `[REDACTED_PHONE]`

*Note: While robust, no regex is perfect. Always review the `native_host.log` if you are concerned about what was sent.*

### Auditing

* All data sent to the AI and all responses are logged locally.
* **Log Location**: `%APPDATA%\DynamicsHelper\native_host.log`
* You can inspect this file at any time to verify what data is being processed.

---

## Usage

1. **Open a Ticket:** Navigate to a support ticket in Dynamics 365 or Azure Portal.
2. **Open Dynamics Helper:** Click the "DH" floating button or the extension icon.
3. **Analyze:** Click the **Analyze** button.
    * The tool will scrape the page for error messages, case numbers, and descriptions.
    * It sends this context to the local AI Agent.
    * **Wait:** Deep analysis can take **2-5 minutes** if the agent needs to search logs or run database queries.
4. **View Results:**
    * A summary will appear in a popup window.
    * A full detailed Markdown report (`dh_case_report.md`) is saved to your **Workbench Directory** (or `dh_error_analysis.md` in your **Downloads** folder if no directory is configured).

---

## Troubleshooting & Getting Help

If the tool isn't working, follow these steps to collect information for the developer.

### Common Issues

* **"Analysis Timed Out"**: The Agent is taking too long. This usually means it's doing a lot of work (good!) but hit the 5-minute safety limit. Try narrowing down your request or checking the logs.
* **"Host error" / "Native host disconnected"**: The browser cannot find the Python script.
  * Verify you ran `install.bat` as Administrator.
  * Verify your Extension ID is correct in `register.py`.
  * Restart your browser.

### How to Collect Logs (Debug Info)

If you need to report a bug, please provide the **Native Host Log**.

1. Open File Explorer.
2. In the address bar, type `%APPDATA%\DynamicsHelper` and press Enter.
3. Find the file named **`native_host.log`**.
4. Send this file to the developer.
    * *Warning: This log contains details about what the AI analyzed. Please check for sensitive info before sharing if dealing with highly confidential cases.*
