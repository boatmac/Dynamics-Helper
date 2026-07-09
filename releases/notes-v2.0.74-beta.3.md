# v2.0.74-beta.3

Headline: **A full localization (i18n) pass.** Chinese users now see Chinese across the whole UI — this release fixes every user-facing English string that was slipping through regardless of the language setting. **Frontend-only**, no backend/host changes.

## 🌐 Localization completeness

The Options and floating panel had a scattering of hardcoded English strings that ignored your language preference. A systematic audit found and fixed them all.

**Native dialogs** (previously always English):
- The **update confirmation** ("Update to version …? This will restart the extension.")
- The bookmark **delete confirmation**
- The **"Failed to parse JSON"** import error

**Bookmark Manager**: type dropdown (Link / Folder / Markdown Note), tree tooltips (Add Child, Edit, Delete, Team managed), the "Team" badge, the "Clear Selection" control, and the Markdown-note placeholder.

**Floating panel (FAB)**: the Settings and Refresh-Context tooltips, the Case Context placeholder, and the error-popover messages (Host Error / Error prefixes and the various "Unknown error" fallbacks).

**Elsewhere**: the custom-instructions placeholder, the markdown preview empty-state ("No content to preview"), and the manifest-fetch / team-sync status messages. Default new-bookmark labels ("New Item" / "New Link") are now localized too.

Chinese punctuation across these strings follows the app's full-width convention (？，：（）！。…).

**Deliberately left in English** (by design): configuration enum values (`default` / `long_context`, log levels), the domain term "Case", brand names, and version labels.

## 🛠️ Quality

Found via a codebase-wide audit, implemented against a fixed scope, and independently spec-reviewed (correct keys, no duplicates, no over-reach, composed messages read correctly). Build is clean (TypeScript strict) and the full test suite passes (43).

## Installation

1. Download `DynamicsHelper_v2.0.74-beta.3.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.74-beta.2 (or earlier)

Zero migration steps. Frontend-only — your config, prefs, team catalog, model settings, and session state carry forward untouched. Reload the extension after installing.

## Known issues / follow-ups

- **A few deep error strings in the service worker** (e.g. "Native Host disconnected") remain English — the service worker can't use the React translation hook, so these need the key-passing pattern; tracked as a follow-up.
- The item component's work is done, but the same **i18n key-passing** approach is the pattern for any future SW-surfaced messages.
- **Resize height is ephemeral** and **team folder collapse state is ephemeral** (both carried from earlier betas).
