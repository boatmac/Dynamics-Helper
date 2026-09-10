# Team Catalog: User-Configurable Manifest URL

> Status: spec drafted 2026-05-20.
> Implementation will follow via writing-plans after user approves.

## 1. Problem

The Team Bookmark Catalog feature currently has three pain points:

1. **Hardcoded host URL.** `extension/src/utils/constants.ts` ships with
   `TEAM_CATALOG_BASE_URL = "https://yourstorageaccount.blob.core.windows.net/bookmarks"`
   — a placeholder. Any fresh install is broken until someone forks DH and
   replaces the URL at build time. Per-user / per-team configuration is
   impossible.
2. **Always-on fetch.** Even when a user has no interest in team
   bookmarks, the Options page calls `fetchManifest()` on load and
   silently fails against the placeholder URL. Personal-only users pay
   for a feature they don't use.
3. **No opt-in surface.** There is no toggle, only an implicit "team
   selected" / "team blank" state via the dropdown. The flow is
   inverted: the feature is on by default and the user opts out by
   selecting "No team", instead of opting in.

## 2. Goals / Non-goals

### Goals

1. Users opt into the team-catalog feature via an explicit toggle on the
   Options page. Off by default.
2. Users configure the manifest URL themselves — single URL input. No
   build-time defaults, no SAS token field, no auth headers.
3. Manifest format moves to per-entry full URLs (`url` field) instead of
   filename-relative-to-base. Each team's bookmark JSON can live on a
   different host.
4. Auto-refresh once per browser session (service worker startup). No
   periodic background polling.
5. Graceful degradation when the manifest host doesn't support ETag.

### Non-goals (YAGNI)

- Multiple manifest URLs (one user → one manifest).
- Authentication headers / SAS token fields (users embed any required
  auth directly in the URL; e.g. an Azure Blob SAS token as
  `?sv=...&sig=...`).
- Locally hiding or renaming team-provided items.
- Subscribing to multiple teams at once.
- Mirroring the new preferences to the host's `config.json`. The team
  catalog is purely an extension feature; the host process never reads
  or writes team data. Sending these prefs to the host would be dead
  plumbing.
- Client-side content-hash fallback for ETag-less servers (we accept
  the extra bandwidth — see § 3.5).

## 3. Design

### 3.1 UI changes (Options.tsx)

Progressive-reveal layout — each control gates the next:

```
[☐] Enable Team Catalog              ← default OFF

(toggle ON)
  Manifest URL: [_______________]    ← user-filled, single line

  (URL filled — any fetch attempted, success or fail)
    Team: [-- select --       ▾]    ← populated from manifest.teams (empty if fetch failed)
          [ Sales — China        ]
          [ Sales — North America ]
    (if last fetch failed)
      "Could not fetch manifest. Check the URL and try Refresh."

    (team selected)
      Last synced: 2026-05-20 14:32        [⟳ Refresh]
      (12 items)
```

**Reveal semantics**: the dropdown row appears as soon as the URL input
is non-empty, regardless of fetch state. If no fetch has happened yet
(fresh URL, before user clicks Refresh and before any startup sync), the
dropdown shows only the "-- select --" placeholder. The inline error
text appears below the URL input whenever the most recent fetch attempt
failed (whether triggered by service worker startup or by Refresh).

Visual style: matches the existing `enableStatusBubble` toggle row
pattern (peer in Options.tsx). Hint text under the toggle explains
"Team Catalog lets you subscribe to a shared list of bookmarks from a
manifest URL hosted by your team admin."

The manifest URL input is `<input type="text">` with placeholder
`https://example.com/team-manifest.json`. Inline error text appears
below the input when the most-recent fetch failed (e.g. "Could not
fetch manifest. Check the URL and try Refresh.").

### 3.2 Manifest format (breaking)

Old format (deprecated):

```jsonc
{
  "version": 1,
  "teams": [
    { "id": "sales", "label": "Sales", "file": "sales.json" }
  ]
}
```

New format (only supported shape):

```jsonc
{
  "version": 1,
  "teams": [
    {
      "id": "sales",
      "label": "Sales — China",
      "url": "https://my-storage.example.com/sales.json"
    },
    {
      "id": "support",
      "label": "Support",
      "url": "https://raw.githubusercontent.com/my-org/bookmarks/main/support.json"
    }
  ]
}
```

Entries missing `url` are skipped with a single `console.warn` per
entry. No fallback to the old `file`-relative pattern. Catalog
maintainers must migrate.

### 3.3 Storage

`chrome.storage.local` adds:

| Key | Type | Default | Purpose |
|---|---|---|---|
| `dh_team_catalog_enabled` | `boolean` | `false` | Master toggle. |
| `dh_team_manifest_url` | `string` | `""` | User-supplied manifest URL. |
| `dh_team_manifest_etag` | `string` | `""` | ETag for the manifest (separate from `dh_team_etag` which is for the per-team bookmarks file). |

Existing keys unchanged: `dh_team` (selected team id), `dh_team_items`,
`dh_team_etag`, `dh_team_synced`.

`host/config.json` is **not** touched. None of the new prefs are mirrored
to the host. The Preferences interface in Options.tsx adds the two new
fields, but the `update_config` payload does not include them (see § 2
non-goals).

### 3.4 Update check mechanism

Trigger sources:

1. **Service worker startup** — `chrome.runtime.onStartup` AND
   `chrome.runtime.onInstalled`. Both fire when the extension loads at
   browser start or after an update / reinstall. Either event triggers
   one sync pass.
2. **Explicit user action** — the existing "Refresh" button in Options
   triggers the same sync pass synchronously.

Options page opening does **not** trigger a fetch. The page reads
whatever is in `chrome.storage.local` and renders. This is a behavioural
change from current — but if the user wants fresh data they click
Refresh.

Editing the URL field in Options does **not** trigger a fetch either.
The user types the URL, then clicks Refresh (or waits for next startup).
Until then the dropdown shows whatever the previously-cached manifest
contained (or empty if none).

Sync pass logic:

```
if not dh_team_catalog_enabled: return
if not dh_team_manifest_url:    return

manifest = fetchManifest(dh_team_manifest_url, dh_team_manifest_etag)
  // → If-None-Match send. 304 → keep existing dropdown content.
  // → 200 → parse, update manifest cache + etag.
  // → fail → console.warn, return (keep cached state)

selected_id = dh_team
selected_entry = manifest.teams.find(t => t.id === selected_id)
if not selected_entry: return  // team no longer in manifest, leave cached data

bookmarks = fetchTeamBookmarks(selected_entry.url, dh_team_etag)
  // existing function. mirrors above behaviour.
  // 304 → just bump dh_team_synced timestamp.
  // 200 → write dh_team_items, dh_team_etag, dh_team_synced.
  // fail → console.warn.
```

### 3.5 ETag handling and fallback

`fetch()` calls send `If-None-Match` when an ETag is known. Server
behaviour matrix:

| Server returns | Client behaviour |
|---|---|
| `304 Not Modified` | Reuse cached body. No write. |
| `200 OK` with `ETag` header | Parse, store body + ETag. |
| `200 OK` without `ETag` header | Parse, store body. ETag stays empty; next fetch always re-downloads. |
| Any non-OK (4xx/5xx/network) | `console.warn`, return null. Caller falls back to existing cached data. |

No client-side content-hash fallback. Users hosting on ETag-less servers
pay one extra full download per browser session (~10-50 KB). Acceptable.

### 3.6 Code changes by file

| File | Changes |
|---|---|
| `extension/src/utils/constants.ts` | Delete `TEAM_CATALOG_BASE_URL` and `TEAM_CATALOG_SAS_TOKEN`. |
| `extension/src/utils/teamCatalog.ts` | Delete `buildUrl()`. `fetchManifest(url)` now takes URL+ETag, fetches that exact URL, returns `{ manifest, etag }`. `fetchTeamBookmarks` already takes a URL via its `teamId` parameter — refactor to take an explicit `url` arg (entry.url from manifest). Update `TeamManifestEntry` interface: drop `file`, add `url`. Add `dh_team_manifest_etag` to all storage-touching paths. |
| `extension/src/components/Options.tsx` | Add `Preferences.teamCatalogEnabled` + `teamManifestUrl`. Default `false` / `""`. Render toggle + URL input + progressive reveal. Wire the URL input through to fetch on Refresh. Inline error UI when manifest fetch fails. Drop the auto-`fetchManifest()` on Options open. |
| `extension/src/background/serviceWorker.ts` | Add a `runTeamSync()` async function. Bind to `chrome.runtime.onStartup` and `chrome.runtime.onInstalled`. Function reads storage, runs the sync pass per § 3.4. Silent-on-error. |
| `extension/src/components/MenuLogic.ts` | No change — it already reads `dh_team_items` from storage; the upstream layer just stops populating it when toggle is OFF. |
| `extension/src/utils/translations.ts` | Add keys: `enableTeamCatalog`, `enableTeamCatalogHint`, `manifestUrl`, `manifestUrlPlaceholder`, `manifestFetchFailed`. Both `en` and `zh`. |

### 3.7 Migration / backward compat

Existing users (with the old hardcoded URL) will, after upgrading:

1. Open Options.
2. See the new `Enable Team Catalog` toggle defaulted to OFF.
3. Find their old team selection still cached in `chrome.storage.local`
   (`dh_team`, `dh_team_items`), but invisible because the toggle is OFF.
4. To restore behaviour: toggle ON, paste the manifest URL.

There is no auto-migration of the placeholder constant to the new
storage key, because the placeholder constant was never a real value —
no fresh install ever had working team catalog out of the box.

For users on a forked DH with a working hardcoded URL (e.g. an internal
distribution): they need to:

1. Update their manifest JSON to the new `url` field format.
2. After upgrading their fork to this version, run a one-time
   migration step (documented in release notes): paste the previous
   hardcoded URL into the new Options field. Toggle on. Save.

### 3.8 Error handling

| Failure | Behaviour |
|---|---|
| Toggle ON, URL empty | Show URL input only. No fetch. No error. |
| URL filled, fetch returns 4xx/5xx | Inline error under input. Dropdown remains empty (or shows previous cached state). Cached `dh_team_items` for any previously-selected team is left untouched. |
| URL filled, manifest is invalid JSON | Same as above. `console.warn` the parse error. |
| URL filled, manifest valid but `teams` array empty | Dropdown populates with the "No team" placeholder only. Not an error. |
| Selected team disappears from new manifest | Dropdown still shows the team id as a fallback label, but the entry is unfetchable. Refresh button reveals fetch error. User can pick a different team or clear selection. |
| Network error / fetch throws | `console.warn`, sync pass returns. UI shows previously-cached state. |

### 3.9 Telemetry

Per existing convention (see beta-channel feature):

| Event | Properties |
|---|---|
| `Team Catalog Toggled` | `{ enabled: boolean }` |
| `Team Catalog Manifest URL Saved` | none (URL itself stays out of telemetry — could be PII) |
| `Team Selected` | `{ team_id: string }` (existing event? confirm during impl) |
| `Team Catalog Sync` | `{ success: boolean, source: 'startup' | 'refresh' }` |

URLs are intentionally never logged to telemetry — they may contain
SAS tokens or other secrets.

## 4. Testing

Manual verification (extension has no unit test infra — see follow-up in
`docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`):

1. **Default-off path**: fresh install → Options shows only the toggle
   in the Team Catalog section. No fetch in network panel.
2. **Toggle on, no URL**: shows URL input. No fetch. No error.
3. **Valid manifest with one team**: fill URL, click Refresh. Dropdown
   populates. Pick team. `dh_team_items` written. FAB displays team
   folder.
4. **Valid manifest with multiple teams**: same as above; verify
   dropdown shows all entries.
5. **Manifest URL 404**: inline error appears. Cached state preserved.
6. **Manifest entry missing `url`**: that entry skipped with
   `console.warn`. Other entries still appear.
7. **ETag flow**: open Edge, see one fetch on startup (network panel).
   Reload extension. Next startup fetch sends `If-None-Match`,
   receives 304, skips re-render.
8. **ETag-less host (e.g. raw IP file server)**: same flow but always
   200. No crash. `dh_team_manifest_etag` stays empty string.
9. **Toggle off after configured**: stored state preserved (`dh_team`,
   `dh_team_items`). Toggle back on without re-entering URL → previous
   state restored.

## 5. Rollout

Feature ships in the next stable release (v2.0.71). No special
sequencing needed — the placeholder URL never worked, so this is a
purely additive fix for the broken-out-of-the-box state.

Release notes must call out the manifest format breaking change
(`file` → `url`) for any teams that had set up catalog hosting on
their fork.

## 6. Open questions / deferred

- **Discovery / sharing of manifest URLs**: today the URL is found
  out-of-band (team chat, shared doc). A future feature could be
  "Team admin links" — pre-shared URLs the user picks from a list.
  Out of scope.
- **Versioned manifest schema**: `version: 1` exists today but is
  unused. If we add new entry fields in the future we should bump and
  read the version. Defer until needed.
- **Conflict resolution for cached team selection**: if user changes
  manifest URL, their `dh_team` may not exist in the new manifest.
  Currently we leave it in storage as a dangling reference; UI shows
  it but fetch fails. Could auto-clear `dh_team` when manifest URL
  changes — but that loses preference unnecessarily. Defer.
