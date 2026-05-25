# v2.0.70-beta.5

Hardening + polish cycle since v2.0.70-beta.3. Two user-facing wins, one security improvement, plus extensive test infrastructure under the hood.

## ✨ Highlights

### Team manifest URL now encrypted at rest (DPAPI)

The team manifest URL — which often contains an Azure Blob SAS token — is now encrypted on disk in `%LOCALAPPDATA%\DynamicsHelper\config.json` using Windows DPAPI (per-user, per-machine binding).

**What changed on disk:**

- Plaintext `team_manifest_url` is no longer written to `config.json`. Ever.
- New key: `team_manifest_url_encrypted` (base64-encoded DPAPI blob, looks like `AQAAANC...`).
- Encryption boundary lives in the host. `chrome.storage.local`, IPC payloads, and host in-memory state continue to use plaintext (DPAPI is a disk-only concern).

**Failure modes:**

- **Cross-machine copy or admin password reset** → blob can't be decrypted → host treats the field as empty + logs a warning. User repastes URL in Options → re-encrypts. Self-healing.
- **Encryption failure during write** → entire `update_config` aborts with an error. **There is no plaintext fallback under any circumstance** — the host fails closed rather than leaking a SAS token to disk.

**Note on portability:** DPAPI blobs are intentionally not portable across machines or Windows accounts. SAS tokens are not portable credentials, so this matches the threat model. If you switch machines or accounts, repaste your URL in Options.

Implementation: see `host/secret_store.py` (ctypes binding to `Crypt32.dll`, no `pywin32` dependency) and AGENTS.md § 4.8 for the boundary rule.

### Options Reset now shows what it will clear

The Reset confirmation used to say "this will clear your custom bookmarks" — which severely understated what actually happens. The new confirmation lists all 5 categories that get wiped:

- All custom bookmarks (returns to default menu)
- Team Catalog config (URL, selected team, cached items)
- All preferences (colors, button position, language, log level, paths)
- User Instructions (`copilot-instructions.md` is wiped)
- User Prompt (`user_prompt.md` is wiped)

Plus an explicit "this action cannot be undone" warning. Available in both English and 中文.

## 🐛 Fixes

### Reset no longer renders default folders fully expanded

After clicking Reset, every default folder (Favorites / Case Review / Tools / Dashboard / IcM) used to render fully expanded with every nested child visible. The mount-time load did not have this problem — folders rendered collapsed on first open.

Root cause: the `collapseFolders` helper that defaults `collapsed: true` was inlined inside the mount `useEffect`. Reset's own `loadItems().then(setItems)` skipped it entirely, and `items.json` ships no `collapsed` keys, so every folder resolved to `undefined` (= expanded) on the Reset path.

Fix: extracted `collapseFolders` to module scope and called from both mount and Reset. 5 unit tests pin the helper contract, including a regression case mirroring the `items.json` default shape.

### Options hydration window — user edits during cold start no longer get clobbered

When you opened Options before the host had finished cold-starting (a few hundred ms typical, multi-second for cold starts), any field you edited in that window used to get overwritten when the host's `get_config` finally returned. Affected fields: root path, manifest URL, team selection, user prompt — these would silently revert to their pre-edit values.

Fix is a 6-invariant guarded merge: `userTouchedFieldsRef` tracks which keys you've edited, host hydration merges only un-touched keys, and a post-hydration catch-up RPC pushes your edits to the host once it's ready. Spec: `docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md`.

6 dedicated tests pin the invariants. Break-and-fail verified — removing the guard makes each test fail individually.

### Service Worker telemetry guard

App Insights initialization could throw inside the Service Worker on cold start when the properties plugin hadn't finished registering yet. Telemetry events would either crash silently or, worse, crash the SW init path. Guarded so missing-plugin states fail soft.

### Reset / clear paths cover all 9 storage keys

Previously some team-state keys (`dh_team_collapsed_labels`, `dh_team_manifest_etag`) were not in the Reset clearance list, so stale state could leak across resets. All 9 keys now go in one `chrome.storage.local.remove([...])` call.

## 🔬 Under the hood

### Vitest test infrastructure for the extension

Stood up Vitest 3 + Testing Library + jsdom with a standalone `vitest.config.ts` (does not extend `vite.config.ts` — CRXJS plugin breaks jsdom). New `src/test/chromeMock.ts` supports callback-style AND Promise-style chrome APIs, with `deferNextResponse()` for race-condition tests.

26 tests across 4 files at the time of beta.5:
- `pageReader.test.ts` — ID_REGEX accept/reject
- `Options.test.tsx` — 6 hydration-window invariants
- `Options.collapseFolders.test.ts` — 5 collapseFolders helper invariants
- `FAB.rootPathOverride.test.ts` — 4 FAB rootPathOverride invariants

All new tests must be break-and-fail verified per AGENTS.md § 2. Each invariant maps 1:1 to a spec line.

### Single source of truth for Preferences

Extracted `Preferences` interface and `DEFAULT_PREFS` from `Options.tsx` to `src/utils/prefs.ts`. New `usePrefs()` hook subscribes to `chrome.storage.local` and lives at the FAB / Options / i18n boundary. Removed three duplicate `useState<LanguageCode>` + `chrome.storage.onChanged` listeners that all reinvented the same wheel.

### release_helper.py --notes-file

The release helper script now accepts `--notes-file <path>` to pass markdown release notes to `gh release create --notes-file`. Without this flag it falls back to the 4-line hardcoded template. This release is the first to use it.

### SDK PingResponse ISO-timestamp shim

Copilot CLI 1.0.46+ changed the `PingResponse.timestamp` wire format from epoch-ms int to ISO 8601 string. SDK 0.3.0 still does `int(timestamp)` directly, which crashes `client.start()` before any RPC works. Monkey-patched the from_dict at host startup to detect ISO strings and convert. The shim is documented for removal once SDK ships a fix (re-verified still needed 2026-05-25; PyPI confirms 0.3.0 is still the only release).

## Installation

1. Download `DynamicsHelper_v2.0.70-beta.5.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions` if you're already running an older version

## Upgrading from beta.3 or earlier

**One-time action required if you use Team Catalog.**

If your existing `config.json` has a plaintext `team_manifest_url` from beta.3 or earlier, the host will **discard it on first launch** (logged as a warning in `native_host.log`) — plaintext SAS tokens on disk are treated as stale/tampered state and never auto-promoted to the encrypted form. The Team Catalog URL field in Options will appear empty.

**Fix:** open Options → Team Catalog → paste your manifest URL again. The new write path encrypts it into `team_manifest_url_encrypted` and removes the plaintext key. You only do this once per machine.

The same flow applies if you ever see decryption warnings in the log (cross-machine copy, key reset, etc.) — re-paste to self-heal.

## Known issues / follow-ups

- Team folder collapse state is ephemeral (resets on SW sync). Tracked as B1 for a future release.
- `items.json` default content is gitignored (contains internal company URLs). Default menu shipping policy is under review.
- Test-time logging still writes to `%LOCALAPPDATA%\DynamicsHelper\native_host.log` because `_SafeRotatingFileHandler` is mounted on root logger. Scoped-logger refactor tracked as A1.
