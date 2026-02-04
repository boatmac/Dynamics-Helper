# Dynamics Helper - AGENTS.md

This file defines the operational rules, development workflows, and coding standards for AI agents working on the "Dynamics Helper" project.

## 1. Project Overview & Architecture
**Dynamics Helper** is a Chrome extension that integrates with a Python Native Host (`dh_native_host.exe`) to interface with the GitHub Copilot SDK.
*   **Frontend:** Chrome Extension (React 19, TypeScript, Vite, Tailwind).
*   **Backend:** Python Native Host (Asyncio, Native Messaging, PyInstaller).
*   **Communication:** Standard Input/Output (Native Messaging protocol) with length-prefixed JSON.

## 2. Build, Test, and Lint Commands

### Extension (`extension/`)
*   **Install Dependencies:**
    ```bash
    cd extension && npm install
    ```
*   **Build (Production):**
    ```bash
    cd extension && npm run build
    ```
    *   Outputs to `extension/dist`.
    *   **Important:** After building, reload the extension in `chrome://extensions`.
*   **Dev Server:**
    ```bash
    cd extension && npm run dev
    ```
*   **Linting:**
    *   No explicit lint script is configured. Follow standard ESLint/Prettier patterns for React/TS.

### Host (`host/`)
*   **Install Dependencies:**
    ```bash
    pip install -r host/requirements.txt
    ```
*   **Run Locally (Dev):**
    ```bash
    python host/dh_native_host.py
    ```
    *   *Note:* Running directly only works for testing logic. For browser integration, it must be launched by Chrome via the manifest.
*   **Build Executable (PyInstaller):**
    ```bash
    pyinstaller --onefile --name dh_native_host host/dh_native_host.py
    ```
*   **Run Tests:**
    *   **Run All Tests:**
        ```bash
        python -m unittest discover host
        ```
    *   **Run Single Test File:**
        ```bash
        python -m unittest host/test_pii_scrubber.py
        ```
    *   **Run Single Test Case:**
        ```bash
        python -m unittest host.test_pii_scrubber.TestPiiScrubber.test_email_redaction
        ```

## 3. Code Style & Standards

### Frontend (TypeScript / React)
*   **Structure:**
    *   Use Functional Components with Hooks (`useState`, `useEffect`, `useRef`).
    *   Keep components small and focused (e.g., `FAB.tsx` handles the UI, `MenuLogic.ts` handles navigation state).
*   **Performance (Critical):**
    *   **DOM Scraping:** Use `PageReader.ts` which is now **ASYNC**.
    *   **Yielding:** Long-running loops in the content script must `await yieldToMain()` to prevent freezing the browser tab.
    *   **Debounce:** Use `MutationObserver` with debounce for auto-scanning.
*   **Styling:**
    *   **Hybrid Approach:** The project uses a mix of inline styles (`style={{...}}`) and utility classes (`clsx`, `tailwind-merge`).
    *   **Preference:** New UI elements should prefer Tailwind classes via `className` where possible, but consistency with existing inline styles is acceptable for complex dynamic positioning.
*   **Icons:** Use `lucide-react` for all icons.
*   **Telemetry:**
    *   Import `trackEvent`, `trackException` from `../utils/telemetry`.
    *   Wrap async operations in `try/catch` and log errors to telemetry.
    *   *Example:* `trackEvent('Analyze Clicked', { ... })`.
*   **State Management:**
    *   Use local state for UI components.
    *   Use `chrome.storage.local` for persistent user preferences.

### Backend (Python)
*   **Asyncio:**
    *   The host runs an asyncio event loop.
    *   Input is read in a separate daemon thread (`start_input_thread`) to avoid blocking the loop.
    *   All I/O bound operations (SDK calls) must be `async`.
*   **Type Hinting:**
    *   Use Python type hints extensively (e.g., `def func(a: int) -> str:`).
    *   Import types from `copilot.types`.
*   **Logging:**
    *   **CRITICAL:** Do NOT print to `stdout` (used for Native Messaging).
    *   Use `logging.info()`, `logging.error()`, etc.
    *   Logs are written to `%APPDATA%\DynamicsHelper\native_host.log` (Windows) or `~/.config/dynamics_helper/` (Linux/Mac).
*   **Error Handling:**
    *   Catch exceptions in the main loop to prevent the process from crashing.
    *   Return error responses to the extension: `{"status": "error", "message": "..."}`.

## 4. Critical Rules & Safety

### 1. Headless Operation & Permissions
*   **The Golden Rule:** The Native Host runs **headless** (no UI).
*   **Permission Handler:** You **MUST** maintain the `_permission_handler` in `dh_native_host.py` that auto-approves requests.
*   **Why?** If the Copilot SDK asks for permission (e.g., "Allow Read File?"), the process will hang indefinitely if not auto-approved, as the user cannot see the prompt.
*   **Do Not Modify:** `config["on_permission_request"] = self._permission_handler`.

### 2. Timeouts
*   **Sync:** Frontend and Backend timeouts must match.
*   **Current Value:** **600 seconds (10 minutes)**.
*   If you change the timeout in `dh_native_host.py`, you must update the fallback timeout in `FAB.tsx`.

### 3. PII Redaction
*   **Scrubber:** All text sent to the LLM must pass through `PiiScrubber` (`host/pii_scrubber.py`).
*   **Tests:** Ensure `host/test_pii_scrubber.py` passes after any changes to redaction logic.

### 4. Path Handling
*   **Absolute Paths:** Always use absolute paths for file operations.
*   **AppData:** Use `os.environ["APPDATA"]` (Windows) or `~/.config` (Linux) for logs and config. Never write to the program directory (Program Files) as it requires Admin privileges.

## 5. Debugging Workflow
Since you cannot see the browser or console:
1.  **Check Host Logs:** Read `C:\Users\%USERNAME%\AppData\Roaming\DynamicsHelper\native_host.log` for backend errors.
2.  **Check Telemetry:** Look for `trackEvent` calls in `FAB.tsx` to verify frontend flow.
3.  **Mocking:** When adding new "Skills" or SDK features, verify they work in `dh_native_host.py` using `logging` before hooking them up to the UI.

## 6. Copilot SDK Instructions
(From `dist/copilot-instructions.md`)
*   **Context:** The AI is analyzing support cases.
*   **Tools:** It has access to `kusto_mcp`, `filesystem`, `workiq`.
*   **Format:** Responses should be in Markdown.
*   **Safety:** Do not output real customer PII in the final report.

## 7. Common Tasks
*   **Adding a new UI Button:**
    1.  Add icon to `lucide-react` imports in `FAB.tsx`.
    2.  Add handler function (e.g., `handleNewAction`).
    3.  Add button to JSX.
    4.  Add `trackEvent` call.
*   **Adding a new Backend Action:**
    1.  Update `process_message` in `dh_native_host.py` to handle new `action`.
    2.  Implement handler method (e.g., `handle_new_action`).
    3.  Ensure it returns a JSON-serializable response.
