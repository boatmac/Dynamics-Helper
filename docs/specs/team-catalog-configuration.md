# Team Catalog Configuration

Status: Implemented. Current configuration, cache, and synchronization contract.

## 1. Problem

Team bookmarks are an opt-in subscription to a user-supplied manifest, not a
build-time organizational URL. Personal-only users need no catalog endpoint.
Asynchronous fetches must not publish another URL/team's cached data.

## 2. Goals / Non-goals

### Goals

- Default off, one manifest URL, and at most one selected team.
- Each manifest entry supplies its own full bookmark URL.
- Preferences survive browser-cache loss through Host mirroring, subject to the
  DPAPI credential portability boundary.
- Refresh uses ETags where available and preserves only identity-matching cache.
- Personal bookmarks are independent of all team cache operations.

### Non-goals (YAGNI)

No separate SAS-token field, configurable authentication headers, hardcoded
private endpoint, multi-team subscription, periodic polling, or content-hash
fallback for ETag-less servers. Team items are not locally editable.

## 3. Design

### 3.1 UI changes (Options.tsx)

Team Catalog progressively reveals the toggle, manifest URL, team selection,
and sync status/Refresh controls. An empty URL is unconfigured, not a network
failure. The dropdown uses the current manifest cache, not another URL's list.

Instant persistence has no Save button. Toggle and team selection persist
on `onChange`; URL typing updates local state and marks the field touched, while
`onBlur` validates with `new URL(...)` before persistence-triggered fetching.
Invalid or half-typed input must not launch a manifest request. Clear/disable
intents use the same owned synchronization path, not direct Options cache writes.

### 3.2 Manifest format

The supported entry shape uses `url`, not a relative `file` field:

```json
{
  "version": 1,
  "teams": [
    {
      "id": "support",
      "label": "Support",
      "url": "https://example.com/support.json"
    }
  ]
}
```

Publishers supply string `id`, `label`, and full `url` values. The current fetch
parser skips entries with a missing/falsy `url`; it is not a comprehensive
runtime schema validator for every manifest field. There is no fallback from
`file` to a base URL. `version: 1` describes the manifest shape, not version
negotiation. Bookmark bodies use the supported menu parser and team source marking.

### 3.3 Storage

| Location/key | Meaning |
|---|---|
| `dh_prefs.teamCatalogEnabled` | Master preference, default `false` |
| `dh_prefs.teamManifestUrl` | User URL, default empty |
| `dh_prefs.team`, `teamLabel` | Selected team preference and display label |
| `dh_team_manifest` | Cached parsed manifest |
| `dh_team_manifest_url` | Cache URL identity stamp, not the user preference |
| `dh_team_manifest_etag` | Manifest ETag |
| `dh_team`, `dh_team_items` | Cached selected-team identity and items |
| `dh_team_etag`, `dh_team_synced` | Bookmark ETag and successful sync timestamp |

The four preferences mirror to Host `extension_preferences` as
`team_catalog_enabled`, `team_manifest_url`, `team`, and `team_label`. Host holds
them for restore parity, not catalog fetching. On disk only the URL's
`team_manifest_url_encrypted` DPAPI form is permitted. Browser storage and IPC
remain plaintext. Copying config across Windows accounts/machines does not
provide a portable credential; users must re-enter an undecryptable URL.

### 3.4 Update check mechanism

Service Worker startup/install hooks and explicit Options actions use the same
Worker-owned sync path. Hydrated Options may request a manifest for its current
enabled URL; opening Options is not a blanket prohibition on fetching. URL blur,
enable, team selection, and Refresh follow identity and hydration gates.

Every Options `SYNC_TEAM_CATALOG` request captures immutable
`{enabled, manifestUrl, teamId}` plus request generation. Optional team comparisons
normalize as `(team || '')`. Preference writes use the single-flight coalescing
mirror queue: no carried action or Host send runs before the successful latest
`dh_prefs` commit. Compatible actions carry forward; identity changes cancel them.

The Service Worker is the sole mutation owner for manifest, team items, ETags,
identity stamps, timestamps, selection clears, and Reset clears. It allocates a
generation synchronously on acceptance, validates identity before any clear or
fetch and after awaited preference reads, and serializes validation plus awaited
storage mutation through `teamCatalog.ts`.

Reset cleanup additionally requires the latest default-derived mirror commit
and matching tokenized Host durable acknowledgment. Cleanup retry resumes that
transaction without resending acknowledged defaults and protects newer edits.

### 3.5 ETag handling and fallback

| Result | Contract |
|---|---|
| Manifest 304 | Reuse manifest only for the same URL stamp |
| Bookmark 304 | Reuse valid matching items; commit an updated sync timestamp |
| 200 with ETag | Parse and commit body plus ETag under current identity |
| 200 without ETag | Commit body without a reusable ETag; later fetch downloads again |
| HTTP/network/parse failure | Classified failure; do not claim successful sync |
| Storage callback failure | `failed`, never `committed`; queue remains usable |

ETags are not transferred across manifest URLs or selected teams. Cached fallback
is not permission to render data whose identity no longer matches preferences.

### 3.6 Code changes by file

`Options.tsx` owns intent and UI; `serviceWorker.ts` owns sync dispatch;
`teamCatalog.ts` owns fetch/result and serialized cache operations.
`MenuLogic.ts` and Options generation-gate initial/storage-change reads before
applying manifest lists, items, timestamps, or navigation state.

### 3.7 Migration / backward compat

Missing enable preference means off: old cached team data stays invisible when
disabled. This preserves the meaning of the `MenuLogic.ts` reference to §3.7.
There is no automatic migration from a hardcoded endpoint or old `file` entries.
An enabled catalog uses only cache whose URL and selected team match current
preferences; changing identity cannot expose stale data while a fetch is pending.

### 3.8 Error handling

Options keeps last successful manifest URL separate from tokenized in-flight URL.
Only a current identity-matching `committed` or `unchanged` callback marks success,
including a successful manifest-only request with no team. Failed, stale, skipped,
or transport outcomes release their own token, not a newer request's token.

An empty team list is valid. A selected ID absent from the manifest cannot be
fetched; the sync can be skipped without claiming fresh bookmark data. Same-
identity cached items may remain available. Errors appear in Options rather than
being silently represented as an empty successful list.

### 3.9 Telemetry

Manifest and bookmark URLs may be credentials. Never log complete URLs, query
text, `sig`, HTTP status text, or thrown objects/messages that can echo them.
Diagnostics use classified failure kind, numeric HTTP status, and fixed safe
parse/network descriptions. A URL-saved event contains no URL.

## 4. Testing

Coverage concerns default-off behavior, URL validation, manifest parsing, ETags,
identity switches, stale callbacks/reads, no-team success, retry after failure,
storage errors, and Reset/newer-edit ordering. Assertions must distinguish a
successful initiation from a committed result. This document grants no test or
network execution; documentation cleanup uses static checks only.

Related contracts: [flat merge](team-catalog-merge-policy.md),
[Host mirror](team-preferences-persistence.md), and
[DPAPI](team-manifest-url-encryption.md).
