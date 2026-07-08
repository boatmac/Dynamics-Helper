# v2.0.74-beta.2

Headline: **New "About & Help" tab in the Options page.** Building on the sidebar-nav layout from beta.1, the Options page gains a seventh tab that gathers version info, useful links, and self-service support tools in one place. This is a **frontend-only, read-only** addition — no backend/host behaviour changes.

## ℹ️ About & Help tab

Open **Options → About & Help** (the bottom item in the left navigation rail). It brings together things that were previously scattered or missing entirely:

- **About** — app name, extension + host version, and a **Check for updates** button (plus the "Update Now" button when an update is waiting).
- **Links** (open in a new tab):
  - **User Guide** — the full guide, which until now had no link anywhere in the UI.
  - **GitHub & Releases** — the releases page.
  - **Report a Bug** — opens a new GitHub issue.
- **Help & Troubleshooting** — the two most common issues (analysis timeout, "native host disconnected") and a **log-collection helper**: it shows the log folder path (`%LOCALAPPDATA%\DynamicsHelper`) with a **Copy path** button, so attaching `native_host.log` to a bug report is one click away.
- **Privacy** — a one-line reminder that your data is PII-scrubbed locally before analysis, linked to the guide's Security & Privacy section.

Everything here is read-only — no new settings, no persistence, no host calls. The version/update controls in the page header are unchanged; this tab is an additional, more discoverable home for them.

## 🛠️ Quality notes

This tab shipped through a full spec → plan → implement → review cycle. Issues caught and fixed before release: a React duplicate-key warning from the new nav separator, one hardcoded English string routed through i18n, Chinese punctuation aligned to the app's full-width convention, and the "Copied!" toast now auto-dismisses after 2 seconds. A new render test covers the tab (suite: 43 passing).

## Installation

1. Download `DynamicsHelper_v2.0.74-beta.2.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.74-beta.1 (or v2.0.73)

Zero migration steps. This release is frontend-only — your config, prefs, team catalog, model settings, and session state carry forward untouched. After installing, reload the extension so the new tab appears.

## Known issues / follow-ups

- **Resize height is ephemeral** — resized instruction/bookmark areas reset to their default height on the next Options load (carried from beta.1).
- **Team folder collapse state still ephemeral** (carried).
