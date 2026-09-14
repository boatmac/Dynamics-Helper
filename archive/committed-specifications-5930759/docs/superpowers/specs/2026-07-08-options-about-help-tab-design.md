# Options "About & Help" Tab — Design

- **Date:** 2026-07-08
- **Status:** Approved (scope B)
- **Scope:** Frontend-only (extension). No host changes, no new host RPC, no version-format impact.

## 1. Problem / Motivation

The Options page shows extension + host versions and update controls in its **header** (`Options.tsx` ~L1839-1860), but the page has **no discoverable links**:

- The `USER_GUIDE.md` we maintain is not reachable from the UI.
- There is no report-a-bug path.
- A user (TSE) who hits trouble has no in-app route to help, and no guided way to find the log file support needs.

## 2. Goal

Add a 7th Options sidebar tab, **"About & Help"**, that consolidates app/version info, external links (User Guide, GitHub releases, report a bug), a log-collection helper, brief troubleshooting, and a one-line privacy note. The tab is **read-only**: no new preferences, no persistence, no host RPC.

## 3. Non-goals (YAGNI)

- In-app changelog viewer.
- A host "open logs folder" RPC / button (deferred; v1 uses a copyable path).
- Contributors list / full license text.
- Moving the header version/update controls. The **update-available indicator must stay in the header** so it is visible from every tab; the About tab only adds a secondary entry point.

## 4. Design

### 4.1 Navigation

- Add `'about'` to the `SectionId` union.
- Append to the nav array (`Options.tsx` ~L1885), after `bookmarks`, preceded by a `__sep__` separator so the meta item is visually distinct from settings groups:
  ```
  ['__sep__', null, ''],
  ['about', <Info size={16} />, t('aboutHelp')],
  ```
  (Icon: lucide `Info`.)
- Add a gated block `{activeSection === 'about' && ( ... )}` in the content pane, following the existing section pattern (`<h2>` header with icon, slate/teal styling).

### 4.2 Content blocks

1. **About**
   - App name + one-line description (`t('aboutTagline')`).
   - `Extension v{getExtensionVersion()}`; `Host v{hostVersion}` shown only when `hostVersion` is non-empty (same guard as header L1840).
   - A **"Check for updates"** button (`t('checkForUpdates')`) reusing the existing `handleCheckUpdates` handler. When `updateAvailable` is truthy, also render the "Update Now" button here (reuse `handleUpdate`); this duplicates the header control by design — the About tab is a legitimate second home for it.

2. **Links** (each opens in a new tab, `target="_blank" rel="noopener noreferrer"`, with a lucide icon):
   - **User Guide** → `https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md` (icon `BookOpen`)
   - **GitHub / Releases** → `https://github.com/boatmac/Dynamics-Helper/releases` (icon `Github`)
   - **Report a bug** → `https://github.com/boatmac/Dynamics-Helper/issues/new` (icon `Bug`)

3. **Help / Troubleshooting**
   - Two most-common issues (concise):
     - Analysis timed out → raise **Options → General → Analyze Timeout**.
     - "Native host disconnected" → restart the browser / reinstall.
   - **Collect-logs helper:** display the log location `%LOCALAPPDATA%\DynamicsHelper` and file `native_host.log`, with a **"Copy path"** button (icon `Copy`). Clicking copies the literal `%LOCALAPPDATA%\DynamicsHelper` string (Explorer expands it), matching `USER_GUIDE.md` §"How to Collect Logs". Shows a transient "Copied!" confirmation.

4. **Privacy note** (one line): `t('privacyNote')` — "Data is PII-scrubbed locally before it is analyzed." with a link to the guide's Security & Privacy section (`.../USER_GUIDE.md#security--privacy`).

### 4.3 State / persistence

- **None.** `activeSection === 'about'` is transient UI state only. No `prefs`, no `chrome.storage`, no `update_config`. The hydration guard and 6-invariant model are untouched.
- The "Copy path" confirmation uses `navigator.clipboard.writeText(...)` on the button click (extension pages are secure contexts) plus a local 2s "Copied!" state, or reuse of the existing `showSuccess()` toast helper.

### 4.4 i18n

- All strings via `t()`; add en + zh keys to `translations.ts`.
- **Reuse existing keys:** `hostVersion`, `updateAvailable`, `updateNow`, `updating`, `checkingForUpdates`, `updateSuccess`, `updateFailed`, `availableForUpdate`.
- **New keys:** `aboutHelp`, `aboutTagline`, `checkForUpdates`, `openUserGuide`, `viewOnGitHub`, `reportABug`, `helpTroubleshooting`, `issueTimeout`, `issueDisconnected`, `collectLogs`, `collectLogsDesc`, `copyPath`, `copied`, `privacyNote`.

### 4.5 Styling

Follow existing section conventions: `<h2>` section header with icon; rows/cards with `border-slate-200`, teal accents; link rows and buttons styled like the existing import/export/refresh buttons (`bg-white hover:bg-slate-50 border border-slate-200 rounded-lg`). lucide icons: `Info`, `BookOpen`, `Github`, `Bug`, `Copy`.

## 5. Testing

- `npm run build` clean + existing **42** tests pass. The About tab is an independent section; `findLanguageSelect` and the hydration invariants are unaffected.
- **Optional additive test:** assert the `data-section="about"` nav button exists and that activating it renders `Extension v…`. This is not a hydration invariant, so it does not extend the 6-invariant model — purely additive.

## 6. Docs (Definition of Done)

- **USER_GUIDE.md:** extend the "The Options Page" tab list from six to seven, adding an "About & Help" bullet.
- **AGENTS.md:** no rule change (read-only tab, no new pattern).
- **ARCHITECTURE.md:** no change.

## 7. Rollout

Frontend-only; rides the next release on the v2.0.74 line. No host rebuild semantics beyond the normal version bump.
