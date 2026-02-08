# Dynamics Helper - Native Host Architecture

## 1. The Dual-Mode Deployment Strategy
To prevent "Split Brain" (developing on source while running the installed exe), the system supports two mutually exclusive modes.

| Feature | **DEV Mode** (Source Code) | **PROD Mode** (End User / Release) |
| :--- | :--- | :--- |
| **Use Case** | Developing python logic (`host/`) | Final installation (`%LOCALAPPDATA%`) |
| **Executable** | `host/launch_host.bat` (Wrapper) | `dh_native_host.exe` (Compiled) |
| **Manifest File** | `host/host_manifest.json` | `%LOCALAPPDATA%/DynamicsHelper/manifest.json` |
| **Path Strategy** | **ABSOLUTE** (e.g., `C:\Repo\host\launch_host.bat`) | **RELATIVE** (e.g., `dh_native_host.exe`) |
| **Why?** | Browser needs full path to find the repo. | Bypass encoding bugs (e.g., `José`) by keeping path local. |

## 2. Critical Technical Constraints

### A. Manifest Encoding (The "José" Rule)
*   **Rule:** The `manifest.json` MUST be written as **UTF-8 WITHOUT BOM**.
*   **Reason:** Chrome/Edge Native Messaging hosts fail to parse JSON if a Byte Order Mark (BOM) is present.
*   **Implementation:**
    *   **PowerShell:** Do NOT use `Out-File -Encoding UTF8` (Adds BOM). Use `[System.IO.File]::WriteAllText`.
    *   **Python:** Use `open(path, 'w', encoding='utf-8')` (Default is No-BOM).

### B. Registry Keys
The browser looks up the Host ID (`com.dynamics.helper.native`) in the Registry.
*   **Key:** `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.dynamics.helper.native` (and Edge equivalent).
*   **Value:** The **Absolute Path** to the Manifest File.
    *   **Dev:** Points to `.../Repository/host/host_manifest.json`
    *   **Prod:** Points to `%LOCALAPPDATA%/DynamicsHelper/manifest.json`

## 3. Tooling Responsibilities

### `host/register.py` (Dev Registration)
*   Calculates the absolute path of `launch_host.bat`.
*   Writes `host_manifest.json` (UTF-8 No BOM).
*   Updates Registry to point to `host/host_manifest.json`.

### `installer_core.ps1` (Prod Installation)
*   Copies `dh_native_host.exe` to `%LOCALAPPDATA%/DynamicsHelper`.
*   Writes `manifest.json` with `"path": "dh_native_host.exe"` (Relative).
*   **CRITICAL:** Uses `[System.IO.File]::WriteAllText` to ensure No-BOM.
*   Updates Registry to point to `%LOCALAPPDATA%/DynamicsHelper/manifest.json`.

### `dev_switch.py` (Mode Toggler)
*   Does NOT modify files.
*   Only updates the **Registry Key** to toggle between the Dev Manifest path and the Prod Manifest path.
