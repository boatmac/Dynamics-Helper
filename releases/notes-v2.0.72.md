# v2.0.72

Two targeted fixes for silent-failure surfaces reported after v2.0.71 shipped. No new features — both remove failure modes that were previously invisible to the user.

## 🐛 Fixes

### MCP authentication no longer blocked by session-name length

**Symptom:** Any analyze that touched an AAD-protected MCP tool would fail sign-in with `AADSTS901001: Invalid request. The client_session request parameter value ... is invalid.` — the AAD error page copying the invalid value back and stating "must be 20-50 characters and contain only alphanumeric characters, hyphens, underscores, periods, and tildes."

**Root cause:** MCP servers pass the Copilot SDK session id straight through to the OAuth `client_session` parameter on the AAD sign-in redirect. The session-id format was `co-<case>` (19 characters), one short of AAD's 20-character minimum. AAD didn't care until an MCP tool tried to authenticate on your behalf, at which point sign-in silently died.

**Fix:** Session names are now `dhco-<case>` (21 characters). Sits comfortably inside the 20-50 window; character set is a subset of AAD's allow-list.

**Cross-repo state:** This is a DH-side extension of MyCasesKit's B81 RFC § D1 matcher (`^(cc|co)-<case-num>$`), which is being updated to `^(cc|co|dhco)-<case-num>$` in a sibling-repo PR. Until that lands, MyCasesKit shell-CLI sessions and DH-launched sessions for the same case are distinct in the shared `copilot --resume` pool. Impact scope: myself only (sole known cross-CLI user).

**Guarded by:** two new host tests (`test_length_satisfies_aad_minimum`, `test_uses_only_aad_legal_chars`) that fail loudly and cite `AADSTS901001` if a future maintainer shortens the prefix.

### Team Manifest fetch errors are no longer silent

**Symptom:** Team catalog manifest URL (typically an Azure Blob SAS URL) works fine at first. Later — hours, days — the SAS token expires. Nothing appears to change. Team bookmarks silently go stale. No toast, no red text, no visible warning. Even clicking the **Refresh** button under Team Catalog would update the sync timestamp as if the refresh had succeeded — the exact opposite of what the timestamp should indicate.

**Root cause:** The team catalog fetch pipeline coerced every failure (`401` SAS expired, `403` permission, `404` URL typo, network error, non-JSON body, `5xx`) into a `null` return value or an empty-cache fallback. Consumers — both the "paste new URL" path and the Refresh button — interpreted `null` as "304 Not Modified" and reported success.

**Fix:** Both `fetchManifest` / `fetchTeamBookmarks` and the higher-level `syncTeamBookmarks` now return a discriminated result carrying a classified failure surface:

- **`kind`**: `'auth' | 'notFound' | 'http' | 'network' | 'parse'` — mapped from HTTP status
- **`httpStatus`**: raw HTTP status code where meaningful
- **`failureStage`** (sync-level): `'manifest'` vs `'bookmarks'` so the UX can guide the user to the right action (fix the URL vs regenerate a token vs contact the manifest owner)

Options page changes:

- Below the URL field, a red banner shows the classified error message per kind, with the HTTP status appended.
- For `auth` failures specifically (the highest-signal case — SAS expiry), a toast also fires because users typically aren't watching the URL field when it happens.
- **The Refresh button no longer updates the sync timestamp on a failing refresh.** Cache-fallback rendering is preserved so the user doesn't see an empty list, but the timestamp accurately reflects the last successful sync.
- Successful refresh clears any stale error banner.

**Test coverage:** none added for the fetch classification (5 kinds × 2 functions × 3 consumers), but the behaviour is a trivial `switch` from HTTP status to translation key. If `teamCatalog.test.ts` lands later the mapping is easy to cover with a fetch mock.

## 🔬 Under the hood

### Docs alignment

- **AGENTS.md § 4.6 (Session Persistence)** documents the 21-char AAD boundary and cites the new test as the regression guard.
- **ARCHITECTURE.md** system-message-injection section updated with the DH-side extension of the B81 RFC.
- **DEVELOPER_GUIDE.md** three call-outs updated (session name, report integration, system message).

### Test totals

- **Host: 74/74** (was 72/72 in v2.0.71; +2 new AAD guards)
- **Extension: 42/42** (unchanged)

## Installation

1. Download `DynamicsHelper_v2.0.72.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.71

Zero migration steps.

- **Existing session state:** any DH-created Copilot session from v2.0.71 kept its `co-<case>` name. It resumes normally from the shell CLI as long as MyCasesKit's matcher accepts the old form (it always has). New sessions created under v2.0.72 use `dhco-<case>`. There is no attempt to auto-migrate — the session pool naturally rolls forward as users hit new cases.
- **Team catalog storage** unchanged. If your manifest URL was working, it keeps working. If it was silently failing (e.g. SAS token quietly expired), you'll now see the error and can regenerate the URL.

If you were on the v2.0.72 betas (beta.1 or beta.2), this is identical code — the stable tag exists so you're no longer opted into unfinished pre-releases via the beta channel.

## Known issues / follow-ups

- **MyCasesKit B81 RFC § D1 matcher update pending** for the `dhco-` prefix.
- **Copilot SDK 1.x upgrade deferred** (currently 0.3.0; PyPI latest 1.0.5). Independent effort scoped for a later release with its own design doc.
- **Custom session-name prefix.** Considered but deferred — would be a per-team or per-user Options setting so different teams' sessions never collide on the same case in the shared Copilot CLI pool.
- **Team folder collapse state still ephemeral** (B1, still carried).
- **No telemetry** for the new persistence + timeout + manifest-error paths.
