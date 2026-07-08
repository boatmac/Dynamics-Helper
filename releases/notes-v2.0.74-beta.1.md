# v2.0.74-beta.1

Headline: **The Options page has been reorganized into a sidebar-navigation layout.** The single long scrolling settings page is now a left nav + wide content pane with six sections, and Model & Performance gets its own tab. Plus a few UX-polish items and one update-message fix. This is a **frontend-only** release — no backend/host behaviour changes.

## 🎛️ Settings reorganized into a sidebar

The Options page used to be one tall scrolling column. It's now a Vivaldi-style **left navigation rail + wide content pane**, with settings grouped into six sections:

- **General** — language, auto-analyze, status bubble, analyze timeout, log level
- **Appearance** — button text, colour, FAB offsets
- **Copilot** — workbench directory, skills, MCP config, custom instructions, user prompt
- **Model** — model / reasoning-effort / context-tier (see below)
- **Team** — team catalog, manifest URL
- **书签管理器 / Bookmark Manager** — the bookmark menu editor

**What moved and why:**

- **Model & Performance is now its own tab.** The v2.0.73 model/effort/context-tier controls were previously squeezed into the Copilot section; they now have a dedicated, less-cramped home.
- **The bookmark section is now labelled "书签管理器 / Bookmark Manager"** (was mislabelled "菜单编辑器 / Menu Editor").

Every setting from v2.0.73 is still here — nothing was removed, only regrouped. Field persistence, the hydration guard, and the host `config.json` mirror are all unchanged.

## 📐 Resizable instruction & bookmark areas

- **Custom Instructions and User Prompt now resize in both Edit *and* Preview modes.** Previously only the Edit-mode `<textarea>` had a drag handle; the Preview pane was a fixed-height read-only box. Both now drag-resize consistently (default view stays **Preview**).
- **The bookmark editor box is now drag-resizable**, and its default height was reduced (1200px → 900px) so it's less overwhelming on load. Drag the bottom-right corner to taste.

> Note: a resized height is not yet remembered across page reloads — the areas return to their default height when you reopen Options. Persisting the height is a possible follow-up.

## 🐛 Also fixed

**Double-"v" in update messages.** The "update available" and "downloading" toasts rendered `vv2.0.73` because they prefixed a `v` onto a version string that already carried one. Now normalized to a single `v`.

## Installation

1. Download `DynamicsHelper_v2.0.74-beta.1.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.73

Zero migration steps. This release is frontend-only — your config, prefs, team catalog, model settings, and session state carry forward untouched. After installing, reload the extension so the new Options layout loads.

## Known issues / follow-ups

- **Resize height is ephemeral** — resized instruction/bookmark areas reset to their default height on the next Options load (see note above).
- **USER_GUIDE screenshots not yet refreshed** for the new sidebar layout; to be updated before the stable v2.0.74.
- **Team folder collapse state still ephemeral** (carried).
