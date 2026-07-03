# v2.0.72-beta.1

Two targeted fixes shaken loose by real-usage feedback. Neither ships a new feature — both remove failure modes that were previously invisible to the user.

## 🐛 Fixes

### Session name renamed `co-<case>` → `dhco-<case>` to unblock AAD auth

**Symptom:** Any analyze that touched an AAD-protected MCP tool would fail sign-in with `AADSTS901001: Invalid request. The client_session request parameter value ... is invalid.` — with the AAD error page copying the invalid value back and stating "must be 20-50 characters and contain only alphanumeric characters, hyphens, underscores, periods, and tildes."

**Root cause:** MCP servers pass the Copilot SDK session id straight through to the OAuth `client_session` parameter on the AAD sign-in redirect. Our session-id format has been `co-<case>` (19 chars) since v2.0.70. That's below AAD's 20-character minimum. AAD didn't care until an MCP tool tried to authenticate on your behalf.

**Fix:** `_case_to_session_id()` now returns `dhco-<case>` (21 chars). The extra `dh` prefix pushes it into the AAD-legal window while keeping the character set inside AAD's allow list (`[A-Za-z0-9\-_.~]`).

**Cross-repo state:** This session-name form is a DH-side extension of MyCasesKit's B81 RFC § D1 matcher (`^(cc|co)-<case-num>$`), which will be updated to `^(cc|co|dhco)-<case-num>$` in a sibling-repo PR. Until that lands, MyCasesKit shell-CLI-launched sessions (`copilot -n co-<case>`) and DH-launched sessions (`copilot -n dhco-<case>`) for the same case are distinct sessions and do NOT round-trip through `copilot --resume`. Accepted temporary regression — DH is the sole user affected and the AAD block is worse than the namespace split.

**Guarded by:** two new host tests. `test_length_satisfies_aad_minimum` fails loudly with a message citing `AADSTS901001` if a future maintainer shortens the prefix; `test_uses_only_aad_legal_chars` catches accidental additions of illegal characters.

### Team Manifest fetch errors are no longer silent

**Symptom:** Configure a Team Catalog manifest URL (typically an Azure Blob SAS URL). It works fine. Later — hours, days — the SAS token expires. Nothing appears to change. Team bookmarks silently go stale. There is no toast, no red text, no console warning that the user can see. The Options page shows the URL as if it's still valid.

**Root cause:** `teamCatalog.ts::fetchManifest` was coercing every failure mode (`401` SAS expired, `403` permission denied, `404` URL typo, network error, non-JSON body, `5xx` server) into `return null`. The Service Worker then interpreted `null` as "304 Not Modified" — the exact same code path a genuinely-cached manifest takes — and responded `status:success` to the Options page. Users had no way to distinguish "nothing changed" from "auth broke".

**Fix:** `fetchManifest` and `fetchTeamBookmarks` now return a discriminated union:

- `{ ok: true, changed: true, manifest, etag }` — new data
- `{ ok: true, changed: false, etag }` — genuine 304
- `{ ok: false, failure: { kind, httpStatus?, message } }` — classified failure

`kind` is one of `'auth' | 'notFound' | 'http' | 'network' | 'parse'`. Options.tsx picks the right localised message per kind, appends the HTTP status when meaningful, and — for the `auth` case specifically — also fires a toast, since SAS expiry is high-signal and users are unlikely to be actively looking at the URL field when it happens.

**Test coverage:** none added. The behavioural surface is a trivial `switch` from HTTP status to translation key; the existing test infra doesn't have a fetch mock. If a `teamCatalog.test.ts` file lands later, the 5 kinds map 1:1 to 5 test cases per fetch function.

## 🔬 Under the hood

### Docs alignment

- **AGENTS.md § 4.6 (Session Persistence)** rewritten to document the 21-char AAD boundary and cite the new test as the regression guard.
- **ARCHITECTURE.md** system-message-injection section updated with the DH-side extension of the B81 RFC.
- **DEVELOPER_GUIDE.md** three call-outs updated (session name, report integration, system message).

The `sdk-upgrade-2026-05-0.3.0.md` document intentionally keeps its historical `co-<case>` reference — it records the state at that upgrade.

## Installation

1. Download `DynamicsHelper_v2.0.72-beta.1.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5 to pick up the new content script.

## Upgrading from v2.0.71

Zero migration.

- **Existing session state:** any DH-created Copilot session from v2.0.71 kept its `co-<case>` name. It will still resume from the shell CLI (`copilot --resume co-<case>`) as long as MyCasesKit's matcher accepts the old form (it always has). New sessions created under v2.0.72-beta.1 use `dhco-<case>`. There is no attempt to auto-migrate — the session pool naturally rolls forward as users hit new cases.
- **Team catalog storage** (`dh_team_manifest`, `dh_team_manifest_etag`, `dh_team_items`) unchanged in shape.

## Known issues / follow-ups

- **MyCasesKit B81 RFC § D1 matcher update pending.** Until the sibling-repo PR lands, DH-launched and shell-launched sessions for the same case are distinct. Sole user impact: myself (per user report).
- **Copilot SDK 1.x upgrade deferred.** Currently on 0.3.0; PyPI latest is 1.0.5. Independent effort scoped for a later release with its own design doc (`docs/sdk-upgrade-2026-05-0.3.0.md` template).
- **Custom session-name prefix.** Considered but deferred — would be a per-team or per-user Options setting so different teams' sessions never collide on the same case in the shared Copilot CLI pool.
- **Team folder collapse state still ephemeral** (B1, still carried).
- **No telemetry** for the new persistence + timeout + manifest-error paths.
