# v2.0.72-beta.2

Follow-up fix for a hole in beta.1's manifest error surface. Same day, so grouping into one beta cycle.

## 🐛 Fix

### Options "Refresh" button now surfaces manifest fetch failures

**Symptom (user-reported):** beta.1 fixed the "paste new URL" path — auth failures now show a red error. But if you already had a working URL, then the SAS token expired later, clicking Options → Team Catalog → **Refresh** would just update the sync timestamp without any warning. Same silent-failure behaviour as before, in a different code path.

**Root cause:** beta.1 only fixed the paste-new-URL entry point (which goes through the Service Worker with `manifestOnly:true`). The Refresh button uses a different entry point — it calls `syncTeamBookmarks()` directly from `Options.tsx`. That function returned a bare `any[]` and swallowed every HTTP failure with cache-fallback. The caller could not distinguish "nothing changed" (304) from "auth broke" (401/403).

**Fix:** `syncTeamBookmarks` now returns a discriminated result object:

```typescript
{ items: any[], failure?: FetchFailure, failureStage?: 'manifest' | 'bookmarks' }
```

- `items` is always populated (cached array on failure) so the UI keeps rendering — no empty-list flash.
- `failure` carries the same classified `kind` / `httpStatus` surface as the underlying `fetchManifest` / `fetchTeamBookmarks` calls.
- `failureStage` distinguishes a manifest fetch failure (user's URL is wrong) from a bookmark fetch failure (manifest is fine but a team entry's URL is stale — different action).

Options' `handleTeamRefresh`:
- Renders `result.items` unconditionally (cache-on-failure preserved).
- On failure: sets the classified error banner, fires the auth toast for auth-specifically, and — critically — **does NOT bump the synced-at timestamp**. The pre-fix behaviour of updating the timestamp on a failing refresh was the exact user symptom.
- On success: existing flow (bump timestamp + refresh team dropdown).

**Considered alternative and why rejected:** an initial approach was to have `handleTeamRefresh` call `fetchManifest` as a probe first and skip `syncTeamBookmarks` on probe failure. Rejected because it only fixes the manifest side — a bookmark-URL auth failure would still degrade silently. The A option (extending the discriminated union all the way through `syncTeamBookmarks`) fixes both surfaces uniformly.

## 🔬 Under the hood

3 call-sites of `syncTeamBookmarks` migrated:

1. `Options.tsx::handleTeamRefresh` — new error branch (this is the user-visible fix)
2. `serviceWorker.ts::SYNC_TEAM_CATALOG` non-manifestOnly branch — forwards `errorKind` / `httpStatus` / `failureStage` on the RPC response. Currently no non-Options caller, but the contract is now consistent with the `manifestOnly:true` branch fixed in beta.1.
3. `serviceWorker.ts::syncTeamCatalogOnStartup` — logs the classified failure. No UI to notify from the background context; cached items still returned so popup / FAB render normally.

## Installation

1. Download `DynamicsHelper_v2.0.72-beta.2.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from beta.1

Zero migration. Same storage keys, same wire protocol. If your team catalog was set up on beta.1, it keeps working — the change only affects the outcome shown when Refresh hits a failing URL.

## Known issues / follow-ups

(Unchanged from beta.1.)

- **MyCasesKit B81 RFC § D1 matcher update pending** for the `dhco-` prefix.
- **Copilot SDK 1.x upgrade deferred** (currently 0.3.0; PyPI latest 1.0.5).
- **Custom session-name prefix** deferred.
- **Team folder collapse state still ephemeral** (B1).
- **No telemetry** on new persistence + timeout + manifest-error paths.
