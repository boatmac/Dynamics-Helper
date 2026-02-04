# Project Specification: Dynamics Helper Extension

> **Role for the Code Agent:** You are an expert Full-Stack Developer specializing in Browser Extensions (Manifest V3), Python System Programming, and Azure Cloud Services. You are building a productivity tool for Technical Support Engineers.

## 1. Project Overview

We are building a **Chrome/Edge Browser Extension** designed for Technical Support Engineers (TSEs). The tool helps engineers analyze support tickets and error logs on a web portal (built with Microsoft Fluent UI) by leveraging their **local AI tools** (GitHub Copilot CLI / Local MCP Servers).

**Core Philosophy:**

1. **Distributed & Local-First:** The extension runs on the engineer's machine and uses *their* local AI environment. No central AI API billing.
2. **Native Bridge:** Uses "Native Messaging" to break out of the browser sandbox to execute local CLI commands.
3. **Cloud Sync:** Uses Azure only for syncing user preferences/bookmarks and anonymous telemetry.

## 2. System Architecture

The system consists of three distinct parts:

### Part A: The Browser Extension (Frontend)

* **Tech:** React, Vite, TypeScript, Tailwind CSS, Manifest V3.
* **Responsibility:**
  * Inject a Floating Action Button (FAB) into specific support portal URLs.
  * Scrape page content (handling complex Fluent UI structures).
  * Send structured messages to the Native Host.
  * Display AI responses in a sidebar UI.

### Part B: The Native Messaging Host (Pure Python Strategy)

* **Deployment:** Source code distribution (No .exe packaging).
* **Wrapper Mechanism:**
  * Browser calls `start_dhnativehost.bat`.
  * `start_dhnativehost.bat` sets `PYTHONUNBUFFERED=1` and calls the system/venv Python to run `dh_native_host.py`.
* **Execution Flow:** `Browser -> manifest.json -> start_dhnativehost.bat -> Python -> dh_native_host.py`
* **Prerequisites:** The user must have Python installed. The `install.bat` script should set up a virtual environment (venv) to isolate dependencies.

### Part C: Azure Backend (Auxiliary)

* **Tech:** Azure Functions (Python V2 Model) + Azure Cosmos DB + App Insights.
* **Responsibility:**
  * **Store:** User bookmarks, prompt templates, and tags.
  *   **Telemetry:** Track feature usage (e.g., "Analyze Error" clicked 50 times) via Azure Application Insights.
  *   **Privacy Rule:** NEVER send PII or raw customer ticket data to Azure. Only metadata.

### Part D: Monitoring & Telemetry

* **Tooling:** Azure Application Insights (npm package `@microsoft/applicationinsights-web`).
* **Implementation:**
    * Initialized in the Extension frontend.
    * Uses a configurable or hardcoded Instrumentation Key / Connection String.
    * Tracks: Page Views (Extension Loads), Custom Events (Button Clicks, Feature Usage), Exceptions.
    * **CSP Compliance:** `manifest.json` must allow connections to `https://*.monitor.azure.com`.

## 3. Critical Technical Strategies

### 3.1. Fluent UI Data Extraction Strategy

The target website uses **Microsoft Fluent UI (React)**. CSS class names are dynamic hashes (e.g., `.css-109`, `ms-Button-root-42`) and **must not be used**.

**Rules for DOM Interaction:**

1. **Stable Selectors Only:** Prioritize `data-testid`, `data-automation-id`, `aria-label`, `role`, or stable attributes like `data-selection-key`.
2. **React Fiber Traversal (Mandatory):**
    * Do not scrape `innerText` or parse HTML strings, as the DOM structure is complex and nested.
    * **Implementation Pattern:** Access the React Internal Instance directly from the DOM node.
    * Use the following helper function logic to extract raw data:

    ```javascript
    // Reference Implementation for reading React Props
    function getReactProps(domElement) {
        // React 17/18 internal keys start with __reactProps$ or __reactFiber$
        const key = Object.keys(domElement).find(k => k.startsWith("__reactProps$"));
        return key ? domElement[key] : null;
    }

    // Example usage in PageReader service:
    // const container = document.querySelector('[data-automation-id="error-list"]');
    // const data = getReactProps(container)?.children; 
    ```

3. **Mutation Observers:** The page is a SPA. Use `MutationObserver` to detect when error logs or ticket details are fully rendered before attempting to read.
4. **Debug/Fallback Mode:** Implement a fallback that dumps a simplified DOM snapshot to the console if React internal keys (`__reactProps$`) are not found. This aids in rapid debugging if the target site updates.

### 3.2. Native Messaging Protocol

* **Format:** JSON.
* **Message Structure (Extension -> Host):**

    ```json
    {
      "action": "analyze_error",
      "payload": {
        "text": "Error: Connection timeout at port 443...",
        "context": "Azure AKS Log"
      },
      "requestId": "uuid-123"
    }
    ```

* **Message Structure (Success Response):**

    ```json
    {
      "status": "success",
      "data": "Here is the explanation from GitHub Copilot...",
      "requestId": "uuid-123"
    }
    ```

* **Message Structure (Error Response):**

    ```json
    {
      "status": "error",
      "error": "gh_cli_not_found",
      "message": "GitHub CLI not found in PATH. Please install it.",
      "requestId": "uuid-123"
    }
    ```

## 4. Development Roadmap

### Phase 1: The "Pure Python" Bridge (Priority)

1. **Directory Setup:** Create `/host`.
2. **The Wrapper (`start_dhnativehost.bat`):**
    * Must use absolute paths (dynamically derived from `%~dp0`).
    * **CRITICAL:** Must execute the **virtual environment's Python executable** explicitly (e.g., `%~dp0venv\Scripts\python.exe`) to ensure dependencies are found.
    * Must execute Python with unbuffered IO (pass `-u` flag or set `PYTHONUNBUFFERED=1`).
    * *Example:* `"%~dp0venv\Scripts\python.exe" -u "%~dp0dh_native_host.py"`
3. **The Logic (`dh_native_host.py`):**
    * Read 4 bytes from `sys.stdin.buffer` (blocking).
    * Decode JSON, verify payload, echo back response.
4. **The Installer (`register.py` + `install.bat`):**
    * `install.bat`: Creates a local `venv` (optional but recommended) and installs requirements. Then calls `register.py`.
    * `register.py`: Generates the `host_manifest.json` dynamically with the **exact absolute path** to `start_dhnativehost.bat`.
    * **Browser Support:** Writes registry keys for **both** Chrome (`HKCU\Software\Google\Chrome\NativeMessagingHosts\...`) and Edge (`HKCU\Software\Microsoft\Edge\NativeMessagingHosts\...`).
5. **Extension Test:** Verify the extension can verify the "Ping".

### Phase 2: Extension UI & Fluent UI Adapter

1. Setup Vite + React CRXJS.
2. Implement the **Floating Action Button (FAB)** using Shadow DOM to isolate styles.
3. Create a `PageReader` service implementing the **Fluent UI Strategy** (finding `data-automation-id`, reading React props).

### Phase 3: Local AI Integration

1. Update `dh_native_host.py` to handle the `analyze_error` action.
2. **Pre-flight Check:** Implement a startup health check to verify `gh` is in PATH and authenticated (`gh auth status`). Return an error to the UI if this fails.
3. Implement `subprocess` calls to `gh copilot explain`.
    * **Security:** Use `subprocess.run(["gh", ...], shell=False)` with an argument list to prevent shell injection. Do not use `os.system` or `shell=True`.
4. *Constraint:* Ensure the environment variables for `gh` CLI are accessible to the script.

### Phase 4: Azure Sync (Optional/Later)

1. Create an Azure Function to CRUD Bookmarks.
2. Connect Extension to Azure:
    * **Auth Strategy:** Use a user-configurable API Key (entered in Options page) or Azure AD (MSAL). Do not hardcode API keys.

## 5. Security & Constraints

* **No PII Leakage:** The `PageReader` must attempt to redact obvious IP addresses or PII before sending to Azure Telemetry (sending to local AI CLI is acceptable as it stays on machine).
* **Input Validation:** The Python Host must sanitize all inputs to prevent Command Injection.
* **Performance:** The extension Content Script must use `requestIdleCallback` to avoid slowing down the support portal.

## 6. Directory Structure

```text
/project-root
├── /extension              # Frontend (React + Vite + CRXJS)
│   ├── /src
│   │   ├── /content        # Content Scripts (The FAB & PageReader)
│   │   ├── /background     # Background Service Worker (Msg Passing)
│   │   ├── /components     # React UI (Shadow DOM)
│   │   └── /utils          # Helper for React Fiber traversal
│   ├── manifest.json
│   └── vite.config.ts
├── /host                   # Backend (Native Messaging Bridge)
│   ├── dh_native_host.py      # Main Python entry point
│   ├── requirements.txt    # Python dependencies
│   ├── host_manifest.json  # Browser native messaging manifest
│   ├── register.bat        # Windows installer script
│   └── register.sh         # Mac/Linux installer script
├── /azure-functions        # Cloud Sync API (Optional)
│   └── /api                # Python Functions
└── TECH_SPEC.md            # This blueprint file
