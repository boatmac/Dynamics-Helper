# Dynamics Helper

A productivity tool for Technical Support Engineers (TSEs) to analyze support tickets from the browser using GitHub Copilot through a local Native Host.

## Features

* **AI-Powered Analysis:** Uses GitHub Copilot SDK to analyze error logs, ticket descriptions, and telemetry.
* **Native Host Integration:** Securely communicates with a local Python backend via Chrome Native Messaging.
* **Privacy Focused:** Selected PII patterns are redacted from Analyze content locally. System instructions follow a separate exact-source path without redaction; review those files and Case Context before Analyze.
* **Dynamics 365 Context:** Scrapes case context on `https://onesupport.crm.dynamics.com/*`. Azure Portal and arbitrary websites are not supported.
* **Session Persistence:** Continue investigations with the root-bound Copilot CLI command written into each report; conversation history and tool state are preserved.
* **Reliable Self-Updating:** One-click transactional updates verify the whole
  Host/Extension product, survive restarts, and automatically roll back ordinary
  failures.
* **Team Bookmark Catalog:** Shared bookmark collections synced via Azure Blob, with personal bookmarks and drag-and-drop support.
* **Right-Click Analysis:** Analyze selected text on supported pages where the extension content script is already loaded.
* **Auto-Analyze:** Optionally trigger analysis automatically when navigating to a new case.

## Installation

### Prerequisites

* **Windows and Edge/Chrome**, with unpacked extensions permitted by your organization.
* **GitHub Copilot CLI**, installed and authenticated under the same Windows account that runs the browser, with Copilot access. Node.js LTS is needed when using the npm-based CLI installation.
* **No separate Python installation is required for the release ZIP**; the compiled Host includes its runtime. Source development requires Python **3.11+**.

### Complete Release ZIP

Download releases from [boatmac/Dynamics-Helper Releases](https://github.com/boatmac/Dynamics-Helper/releases), the configured product distribution source.

1. Download the complete release ZIP asset, not the GitHub source-code archive, and extract the entire package to a folder.
2. Close the browser and Dynamics Helper normally so the Host can exit. The installer refuses a running Host; it does not restart or force-terminate it.
3. Double-click the extracted package's root `install.bat` under the same Windows account used by the browser. It installs the Host and Extension under `%LOCALAPPDATA%\DynamicsHelper` and registers the Host in **HKCU**; do not use **Run as administrator**.
4. After successful installation, open `chrome://extensions` or `edge://extensions`, enable **Developer Mode**, and choose **Load unpacked** for `%LOCALAPPDATA%\DynamicsHelper\extension`.
5. Keep the packaged extension key and fixed Extension ID unchanged. If the browser ID differs from the product's expected identity, stop and check the loaded folder/package; do not hand-edit `allowed_origins` or re-register an arbitrary ID.

For Beta builds, choose the desired pre-release ZIP from the same Releases page. **Options > General > Receive beta updates** controls future update checks and saves automatically. See the [User Guide](USER_GUIDE.md#installation) for installation and recovery boundaries.

### For Developers (Build from Source)

Development is separate from release installation. After dependencies have been provisioned within an approved development scope, build from the repository root:

```powershell
npm run build --prefix extension
```

Then load **`extension/dist`**, not `extension/`, in the browser and verify that its ID matches the fixed source/product identity. Preserve `extension/manifest.json`'s `key`; do not customize Native Messaging origins to accommodate a different ID.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for runtime and verification guidance. `host/install.bat` is a legacy development helper that creates a venv, installs `host/requirements.txt`, and registers the source Host. It is not the complete release installer or an automatic approval to install dependencies or change registration. Source registration and mode switching need their own applicable scope.

## Usage

1. Open a support ticket on `https://onesupport.crm.dynamics.com/`.
2. Click the **DH** Floating Action Button (FAB) in the bottom right.
3. Review the scraped Case Context and remove anything you do not want sent.
4. Click **Analyze** to get an AI-generated Root Cause Analysis.
5. The result is saved as a Markdown report and displayed in a popover.
6. Continue with the report command: `copilot -C '<root>' --resume=<uuid>`, or `copilot --resume=<uuid>` when no Root is configured.

## Reliable Updates

Update progress is durable across Service Worker and Extension restarts. A
terminal update or rollback is re-verified and finalized before success is
reported. Its result is consumed only after eight continuous visible seconds in
an open FAB terminal menu, its exact transaction-bound completion Status bubble,
or foreground Options. Switching tabs or closing the only qualifying surface
starts the full interval over; the closed-FAB red dot and unrelated messages do
not count, and Status bubble is never forced on. A rollback then returns to the
ordinary Retry action. Mixed or unrecoverable
installations show persistent guidance to run the matching full installer.
Standalone bootstrap and per-write power-loss guarantees remain deferred, so an
extreme interruption may still require that installer. See [TODO.md](TODO.md) for current limitations and planned work.

## Development

* **Frontend:** React 19, Vite, TypeScript, Tailwind CSS.
* **Backend:** Python 3.11+, Native Messaging API, asyncio, PyInstaller; releases bundle the Host runtime.
* **Telemetry:** Azure Application Insights receives operational events, not Case Context or prompt content.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for internal architecture details, and [AGENTS.md](AGENTS.md) for AI agent coding standards.
