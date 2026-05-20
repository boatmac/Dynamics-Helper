# Team Catalog: User-Configurable Manifest URL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the build-time hardcoded `TEAM_CATALOG_BASE_URL` with a user-supplied manifest URL configured per-install, gated by an explicit opt-in toggle. Manifest entries carry their own absolute URLs.

**Architecture:** Two new `Preferences` fields (`teamCatalogEnabled: boolean`, `teamManifestUrl: string`) live in `chrome.storage.local` only — **not** mirrored to host `config.json` because the host process never reads team data. `teamCatalog.ts` refactors so every fetch takes the URL as a parameter; the manifest URL flows from `dh_team_manifest_url` storage key to the fetch call. ETag-based conditional GET on both manifest and per-team JSONs. Service worker startup (`onStartup` + `onInstalled`) is the auto-fetch trigger; Options page is reactive (reads cached state, no auto-fetch).

**Tech Stack:** TypeScript / React 19 / Vite. Chrome `runtime.onStartup`/`onInstalled` + `chrome.storage.local`. No backend / Python changes.

**Spec:** `docs/superpowers/specs/2026-05-20-team-catalog-user-config-design.md`

**Repo conventions:**
- Extension build: `cd extension && npm run build` (outputs to `extension/dist/`)
- After every commit, working tree must be clean
- One commit per task
- TypeScript strict — no `any` unless mirroring existing helpers
- i18n strings live in `extension/src/utils/translations.ts` (`{[key]: {en, zh}}` shape)
- Telemetry events: `trackEvent('Name', { props })` from `../utils/telemetry`, wrap in `try/catch` to never block UX

---

## File Structure

| File | Responsibility |
|---|---|
| `extension/src/utils/constants.ts` | Delete `TEAM_CATALOG_BASE_URL` and `TEAM_CATALOG_SAS_TOKEN`. |
| `extension/src/utils/teamCatalog.ts` | Refactor: drop `buildUrl()`. `fetchManifest(url, etag?)` takes URL+ETag, returns `{ manifest, etag, changed }`. `fetchTeamBookmarks(url, etag?)` already takes URL but currently spelled `teamId`; rename parameter for clarity. New `syncTeamBookmarks(manifestUrl, teamId)` signature reads `dh_team_manifest_etag` + `dh_team_etag`, fetches both, writes back to storage. Change `TeamManifestEntry` interface (drop `file`, add `url`). |
| `extension/src/components/Options.tsx` | Add `Preferences.teamCatalogEnabled` + `teamManifestUrl`. Defaults `false` / `""`. Render toggle + URL input + progressive reveal. Remove the auto `fetchManifest()` on Options mount; instead read `dh_team_manifest` (cached) from storage. Update `handleTeamRefresh` to call new `syncTeamBookmarks(manifestUrl, teamId)`. Inline error UI when last fetch failed. |
| `extension/src/background/serviceWorker.ts` | Update `syncTeamCatalogOnStartup`: read `dh_team_catalog_enabled` + `dh_team_manifest_url` from storage; skip if disabled or no URL. Add `chrome.runtime.onStartup` listener (currently only `onInstalled` is wired). |
| `extension/src/utils/translations.ts` | Add 5 new keys (`enableTeamCatalog`, `enableTeamCatalogHint`, `manifestUrl`, `manifestUrlPlaceholder`, `manifestFetchFailed`) in `en` + `zh`. |
| `USER_GUIDE.md` | Replace existing "Team Bookmark Catalog" section to describe the new opt-in flow + user-supplied URL. |
| `AGENTS.md` | One-line note in "User Edit Protection" listing the two new prefs as plain user preferences (no `isUserEdited` guard needed, no host mirror). |

Out of scope per spec § 2: multi-URL, auth headers, local override of team items, multi-team selection, host mirroring, content-hash fallback.

---

## Tasks

### Task 1: Update manifest entry interface (breaking)

**Files:**
- Modify: `extension/src/utils/teamCatalog.ts:9-13`

- [ ] **Step 1: Replace `TeamManifestEntry`**

Find:

```typescript
export interface TeamManifestEntry {
    id: string;
    label: string;
    file: string;
}
```

Replace with:

```typescript
export interface TeamManifestEntry {
    id: string;
    label: string;
    url: string;  // Absolute URL to the team's bookmark JSON (was: relative `file`)
}
```

- [ ] **Step 2: Run the build to find dangling refs**

```powershell
cd extension; npm run build; cd ..
```

Expected: TypeScript errors at any callsite that reads `.file` from a manifest entry. Note the lines — they'll be fixed in Task 2.

- [ ] **Step 3: Commit**

```powershell
git add extension/src/utils/teamCatalog.ts
git commit -m "refactor(extension): TeamManifestEntry uses url (was file)

Breaking change to the team catalog manifest schema. Each entry now
carries an absolute URL instead of a filename relative to a baked-in
base URL. Build will now flag callers that still read .file - those
get fixed in the next commit."
```

---

### Task 2: Refactor `teamCatalog.ts` to use entry URLs

**Files:**
- Modify: `extension/src/utils/teamCatalog.ts` (rewrite most of the file)

- [ ] **Step 1: Read the existing file to confirm baseline**

```powershell
Get-Content extension/src/utils/teamCatalog.ts | Measure-Object -Line
```

Expected: 149 lines.

- [ ] **Step 2: Replace the file with the new implementation**

Replace the **entire** `extension/src/utils/teamCatalog.ts` file with:

```typescript
// Team Bookmark Catalog — fetch, cache, and sync utilities
//
// Fetches a user-supplied manifest URL and the per-team bookmark JSON
// it points to. ETag-based conditional GET; graceful degradation on
// failure (cached data preserved, console.warn on errors). No build-time
// URL constants — every fetch takes the URL as a parameter.

// --- Types ---

export interface TeamManifestEntry {
    id: string;
    label: string;
    url: string;  // Absolute URL to the team's bookmark JSON
}

export interface TeamManifest {
    version: number;
    teams: TeamManifestEntry[];
}

export interface TeamCatalogFile {
    version: number;
    team: string;
    items: any[]; // MenuItem[] — kept as `any` to avoid circular dependency
}

// --- Internal Helpers ---

/**
 * Recursively stamp all items with `source: 'team'`.
 */
function stampTeamSource(items: any[]): any[] {
    return items.map(item => ({
        ...item,
        source: 'team' as const,
        children: item.children ? stampTeamSource(item.children) : undefined,
    }));
}

// --- Public API ---

/**
 * Fetch the team manifest from the user-supplied URL. Uses ETag to
 * skip re-parsing when the server returns 304.
 *
 * Returns:
 *   - { manifest, etag, changed: true }  - new data, caller should persist
 *   - { manifest: null, etag, changed: false } - 304, caller uses cached manifest
 *   - null - network/4xx/5xx/parse failure; caller falls back to cached state
 *
 * Entries that are missing the `url` field are dropped (with a console.warn)
 * - migration guard for old `file`-shaped manifests.
 */
export async function fetchManifest(
    url: string,
    currentEtag?: string,
): Promise<{ manifest: TeamManifest | null; etag: string; changed: boolean } | null> {
    if (!url) return null;
    try {
        const headers: HeadersInit = {};
        if (currentEtag) {
            headers['If-None-Match'] = currentEtag;
        }
        const res = await fetch(url, { headers, cache: 'no-cache' });

        if (res.status === 304) {
            return { manifest: null, etag: currentEtag || '', changed: false };
        }
        if (!res.ok) {
            console.warn(`[DH] Failed to fetch team manifest from ${url}: ${res.status} ${res.statusText}`);
            return null;
        }

        const raw = await res.json() as TeamManifest;
        const etag = res.headers.get('ETag') || res.headers.get('etag') || '';

        // Drop entries missing url (migration guard for old `file`-shaped manifests)
        const validTeams = (raw.teams || []).filter(t => {
            if (!t.url) {
                console.warn(`[DH] Manifest entry '${t.id || '(no id)'}' missing 'url' field; skipping.`);
                return false;
            }
            return true;
        });
        const manifest: TeamManifest = { version: raw.version, teams: validTeams };

        return { manifest, etag, changed: true };
    } catch (e) {
        console.warn(`[DH] Error fetching team manifest from ${url}:`, e);
        return null;
    }
}

/**
 * Fetch a team's bookmarks file from the entry's absolute URL.
 * Uses ETag caching.
 *
 * Returns:
 *   - { items, etag, changed: true } - new data
 *   - { items: [], etag, changed: false } - 304, cached version still valid
 *   - null - failure; caller uses cached data
 */
export async function fetchTeamBookmarks(
    url: string,
    currentEtag?: string,
): Promise<{ items: any[]; etag: string; changed: boolean } | null> {
    if (!url) return null;
    try {
        const headers: HeadersInit = {};
        if (currentEtag) {
            headers['If-None-Match'] = currentEtag;
        }
        const res = await fetch(url, { headers, cache: 'no-cache' });

        if (res.status === 304) {
            return { items: [], etag: currentEtag || '', changed: false };
        }
        if (!res.ok) {
            console.warn(`[DH] Failed to fetch team bookmarks from ${url}: ${res.status}`);
            return null;
        }

        const data: TeamCatalogFile = await res.json();
        const etag = res.headers.get('ETag') || res.headers.get('etag') || '';
        const items = stampTeamSource(data.items || []);

        return { items, etag, changed: true };
    } catch (e) {
        console.warn(`[DH] Error fetching team bookmarks from ${url}:`, e);
        return null;
    }
}

/**
 * One full sync pass:
 *   1. Read current ETags from storage
 *   2. Fetch manifest (with ETag)
 *   3. Find the currently-selected team in manifest.teams
 *   4. Fetch that team's bookmark JSON (with ETag)
 *   5. Persist whatever changed
 *
 * Silently returns cached data on any failure. Used both by the
 * service-worker startup hook and by the Options "Refresh" button.
 *
 * Returns the (potentially cached) team items array.
 */
export async function syncTeamBookmarks(
    manifestUrl: string,
    teamId: string,
): Promise<any[]> {
    if (!manifestUrl) return [];

    const cache = await new Promise<any>((resolve) => {
        chrome.storage.local.get(
            ['dh_team_items', 'dh_team_etag', 'dh_team_manifest_etag', 'dh_team'],
            resolve,
        );
    });

    // Step 1: refresh the manifest
    const manifestResult = await fetchManifest(manifestUrl, cache.dh_team_manifest_etag);
    let manifest: TeamManifest | null = null;

    if (manifestResult === null) {
        // Manifest fetch failed entirely — fall back to cached team items
        console.warn('[DH] Team catalog manifest fetch failed; using cached team data');
        return cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    }

    if (manifestResult.changed && manifestResult.manifest) {
        manifest = manifestResult.manifest;
        // Persist the new manifest + its ETag
        await new Promise<void>((resolve) => {
            chrome.storage.local.set({
                dh_team_manifest: manifest,
                dh_team_manifest_etag: manifestResult.etag,
            }, resolve);
        });
    } else {
        // 304 — reuse cached manifest
        const cached = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['dh_team_manifest'], resolve);
        });
        manifest = cached.dh_team_manifest || null;
    }

    if (!manifest) {
        return cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    }

    // Step 2: find the entry for the currently-selected team
    if (!teamId) return [];
    const entry = manifest.teams.find(t => t.id === teamId);
    if (!entry) {
        console.warn(`[DH] Selected team '${teamId}' not found in manifest; using cached items if any.`);
        return cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    }

    // Step 3: fetch the team's bookmark JSON
    // If we switched team since last sync, ignore old ETag
    const currentEtag = cache.dh_team === teamId ? cache.dh_team_etag : undefined;
    const bookmarksResult = await fetchTeamBookmarks(entry.url, currentEtag);

    if (!bookmarksResult) {
        console.warn(`[DH] Bookmark fetch for team '${teamId}' failed; using cached items.`);
        return cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    }

    if (!bookmarksResult.changed) {
        // 304 — refresh sync timestamp only
        await new Promise<void>((resolve) => {
            chrome.storage.local.set({ dh_team_synced: new Date().toISOString() }, resolve);
        });
        return Array.isArray(cache.dh_team_items) ? cache.dh_team_items : [];
    }

    // New bookmarks — persist
    await new Promise<void>((resolve) => {
        chrome.storage.local.set({
            dh_team: teamId,
            dh_team_items: bookmarksResult.items,
            dh_team_etag: bookmarksResult.etag,
            dh_team_synced: new Date().toISOString(),
        }, resolve);
    });

    return bookmarksResult.items;
}

/**
 * Clear all team catalog data from storage.
 * Called when the user disables the toggle or signs out of a team.
 */
export async function clearTeamBookmarks(): Promise<void> {
    await new Promise<void>((resolve) => {
        chrome.storage.local.remove(
            ['dh_team', 'dh_team_items', 'dh_team_etag', 'dh_team_manifest', 'dh_team_manifest_etag', 'dh_team_synced'],
            resolve,
        );
    });
}
```

- [ ] **Step 3: Build to verify TypeScript compiles**

```powershell
cd extension; npm run build; cd ..
```

Expected: build succeeds. There **will** be downstream type errors in Options.tsx (`fetchManifest` signature changed from no-args to `(url, etag?)`). Those are fixed in Task 4. If the build error shows ONLY callsites in Options.tsx, this task is done.

- [ ] **Step 4: Commit**

```powershell
git add extension/src/utils/teamCatalog.ts
git commit -m "refactor(extension): teamCatalog takes URLs as parameters

Drop the buildUrl() helper and the hardcoded base URL pattern.
fetchManifest now takes (url, etag?) and returns
{manifest, etag, changed}. fetchTeamBookmarks now takes (url, etag?)
- url is the entry's absolute URL from the manifest, not a
team-id-to-filename mapping.

syncTeamBookmarks takes (manifestUrl, teamId): refreshes manifest
with ETag, finds the entry, fetches the bookmarks file with ETag,
persists. Falls back to cached data on any failure.

clearTeamBookmarks now clears the manifest cache too. Callers in
Options.tsx and serviceWorker.ts will get TypeScript errors -
fixed in the next two commits."
```

---

### Task 3: Delete dead constants

**Files:**
- Modify: `extension/src/utils/constants.ts`

- [ ] **Step 1: Read the file to see what's there**

```powershell
Get-Content extension/src/utils/constants.ts
```

Expected: file shows `TEAM_CATALOG_BASE_URL` (line 8) and `TEAM_CATALOG_SAS_TOKEN` (line 9), plus their leading comment block (lines 3-7).

- [ ] **Step 2: Delete the entire Team Bookmark Catalog block**

Open `extension/src/utils/constants.ts`. Delete the block that starts at the `// --- Team Bookmark Catalog ---` comment and ends at the closing line of `export const TEAM_CATALOG_SAS_TOKEN = ...`. Leave any other constants in the file alone.

- [ ] **Step 3: Confirm no other code imports the deleted constants**

```powershell
Get-ChildItem extension/src -Recurse -Include "*.ts","*.tsx" | Select-String "TEAM_CATALOG_BASE_URL|TEAM_CATALOG_SAS_TOKEN"
```

Expected: zero matches.

- [ ] **Step 4: Build to verify**

```powershell
cd extension; npm run build; cd ..
```

Expected: no new errors from this commit alone (Options.tsx errors from Task 2 still pending).

- [ ] **Step 5: Commit**

```powershell
git add extension/src/utils/constants.ts
git commit -m "refactor(extension): delete hardcoded TEAM_CATALOG_* constants

The base URL and SAS token are no longer build-time concerns - the
user supplies the manifest URL through Options. Embedded auth (e.g.
Azure Blob SAS token) goes directly in the user's URL as a query
string. No code references these constants anymore (verified by grep)."
```

---

### Task 4: Add the two new Preferences fields + persist them

**Files:**
- Modify: `extension/src/components/Options.tsx`

- [ ] **Step 1: Add to the `Preferences` interface**

Open `extension/src/components/Options.tsx`. Locate the `Preferences` interface (around line 51). Find the existing `team?: string;` field (around line 66). Add two siblings:

```typescript
    team?: string;                  // Selected team catalog ID (e.g. "dnai")
    teamCatalogEnabled?: boolean;   // Master toggle for the Team Catalog feature
    teamManifestUrl?: string;       // User-supplied manifest URL
```

(Only the bottom two lines are new; the `team?:` line shows context.)

- [ ] **Step 2: Add defaults to `DEFAULT_PREFS`**

Locate `DEFAULT_PREFS` (around line 70). Find the existing `team` line (typically not present in DEFAULT_PREFS since it's optional, but `language: 'auto'` is around line 84). Add two new keys at the end of the const, before the closing `};`:

```typescript
    language: 'auto',
    teamCatalogEnabled: false,
    teamManifestUrl: ''
};
```

(Only the middle two lines are new.)

- [ ] **Step 3: Build to confirm types compile**

```powershell
cd extension; npm run build; cd ..
```

Expected: still has the Options.tsx fetchManifest call-site errors from Task 2; this commit doesn't fix them. New errors from this commit alone should be zero.

- [ ] **Step 4: Commit**

```powershell
git add extension/src/components/Options.tsx
git commit -m "feat(extension): add teamCatalogEnabled + teamManifestUrl prefs

State + defaults only. UI wiring follows in the next commit. These
fields stay in chrome.storage.local (via handleSave's existing
write) and are NOT mirrored to host config.json - team catalog is a
purely extension feature; the host process never reads team data."
```

---

### Task 5: Add translation keys

**Files:**
- Modify: `extension/src/utils/translations.ts`

- [ ] **Step 1: Find the existing `statusBubble` entry as the visual template**

```powershell
Select-String -Path extension/src/utils/translations.ts -Pattern "statusBubble:"
```

Note the line number — new entries go near it (same "Options Page" logical block).

- [ ] **Step 2: Add the five new entries**

Open `extension/src/utils/translations.ts`. Below the `statusBubble` entry, add:

```typescript
    enableTeamCatalog: { en: "Enable Team Catalog", zh: "启用团队目录" },
    enableTeamCatalogHint: {
        en: "Subscribe to a shared list of bookmarks from a manifest URL hosted by your team admin. Off by default - no network requests are made to fetch team data when disabled.",
        zh: "订阅团队管理员托管的共享书签列表（通过 manifest URL）。默认关闭——关闭时不会发出任何团队相关的网络请求。",
    },
    manifestUrl: { en: "Manifest URL", zh: "Manifest URL" },
    manifestUrlPlaceholder: {
        en: "https://example.com/team-manifest.json",
        zh: "https://example.com/team-manifest.json",
    },
    manifestFetchFailed: {
        en: "Could not fetch manifest. Check the URL and try Refresh.",
        zh: "无法获取 manifest。请检查 URL 并尝试刷新。",
    },
```

- [ ] **Step 3: Verify UTF-8**

```powershell
$line = (Get-Content extension/src/utils/translations.ts -Encoding UTF8 | Select-String "enableTeamCatalog:").Line
"$line"
([regex]::Matches($line, "[\u4e00-\u9fff]")).Count
```

Expected: line printed, regex Match count ≥ 4 (Chinese characters in "启用团队目录").

- [ ] **Step 4: Commit**

```powershell
git add extension/src/utils/translations.ts
git commit -m "feat(extension): add team-catalog translation keys (en + zh)"
```

---

### Task 6: Render the Team Catalog toggle + URL input + progressive reveal

**Files:**
- Modify: `extension/src/components/Options.tsx`

- [ ] **Step 1: Find the existing Team Catalog UI section**

```powershell
Select-String -Path extension/src/components/Options.tsx -Pattern "selectTeam|teamList\.map" | Select-Object LineNumber, Line
```

Note the line range — the existing "Select team" dropdown lives around lines 1380-1417.

- [ ] **Step 2: Read the surrounding block to find the wrapper boundaries**

```powershell
Get-Content extension/src/components/Options.tsx | Select-Object -Skip 1370 -First 60
```

Identify the outer `<div>` that wraps the entire Team Catalog section. The new layout will be placed inside this same wrapper.

- [ ] **Step 3: Replace the inner UI with the progressive-reveal layout**

Find the existing block that starts with `<label className="...">{t('selectTeam')}</label>` and ends with the `</button>` of the Refresh button + its closing `</div>` (around line 1416). Replace the WHOLE inner block with this new structure:

```tsx
{/* Toggle: Enable Team Catalog */}
<div className="mt-2 flex items-center gap-2">
    <input
        type="checkbox"
        id="teamCatalogEnabled"
        checked={prefs.teamCatalogEnabled === true}
        onChange={(e) => {
            const enabled = e.target.checked;
            setPrefs(prev => ({ ...prev, teamCatalogEnabled: enabled }));
            try {
                trackEvent('Team Catalog Toggled', { enabled });
            } catch { /* telemetry never blocks UX */ }
        }}
        className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
    />
    <label htmlFor="teamCatalogEnabled" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
        {t('enableTeamCatalog')}
    </label>
</div>
<p className="text-[10px] text-slate-500 mt-1 ml-6 leading-snug">
    {t('enableTeamCatalogHint')}
</p>

{/* Manifest URL input (revealed when toggle is on) */}
{prefs.teamCatalogEnabled && (
    <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('manifestUrl')}</label>
        <input
            type="text"
            value={prefs.teamManifestUrl || ''}
            placeholder={t('manifestUrlPlaceholder')}
            onChange={(e) => setPrefs(prev => ({ ...prev, teamManifestUrl: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
        />
        {teamFetchError && (
            <p className="text-[11px] text-red-600 mt-1">{t('manifestFetchFailed')}</p>
        )}
    </div>
)}

{/* Team dropdown (revealed when URL is non-empty) */}
{prefs.teamCatalogEnabled && prefs.teamManifestUrl && (
    <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('selectTeam')}</label>
        <select
            value={prefs.team || ''}
            onChange={(e) => handleTeamChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm bg-white"
        >
            <option value="">{t('noTeam')}</option>
            {teamList.map(team => (
                <option key={team.id} value={team.id}>{team.label}</option>
            ))}
        </select>
    </div>
)}

{/* Last synced + Refresh (revealed when team is selected) */}
{prefs.teamCatalogEnabled && prefs.teamManifestUrl && prefs.team && (
    <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
            {teamSynced ? (
                <span>{t('lastSynced')}: {new Date(teamSynced).toLocaleString()}</span>
            ) : (
                <span>{t('neverSynced')}</span>
            )}
            <span className="ml-2 text-slate-400">({teamItems.length} {t('items')})</span>
        </div>
        <button
            onClick={handleTeamRefresh}
            disabled={isSyncingTeam}
            className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
        >
            <RefreshCw size={12} className={isSyncingTeam ? 'animate-spin' : ''} />
            {isSyncingTeam ? t('syncing') : t('refresh')}
        </button>
    </div>
)}
```

- [ ] **Step 4: Add the `teamFetchError` state variable**

Near the other `useState` declarations in the component (around line 517-520, where `teamList`, `teamSynced`, `isSyncingTeam`, `teamItems` are declared), add:

```typescript
    const [teamFetchError, setTeamFetchError] = useState<boolean>(false);
```

- [ ] **Step 5: Build**

```powershell
cd extension; npm run build; cd ..
```

Expected: still failing because `handleTeamRefresh` and the Options-mount `fetchManifest()` call still use old signatures. Task 7 fixes those.

- [ ] **Step 6: Commit**

```powershell
git add extension/src/components/Options.tsx
git commit -m "feat(extension): render team catalog progressive-reveal UI

Toggle controls everything. URL input appears when toggle is on.
Dropdown appears when URL is non-empty (even before any fetch -
shows just the '-- select --' placeholder if no manifest has been
loaded yet). Last-synced + Refresh row appears when a team is
selected. Inline error appears under the URL input when the most
recent fetch failed (teamFetchError state).

Fetch wiring follows in the next commit - this commit just lays
out the controls."
```

---

### Task 7: Wire fetch on Options mount + on Refresh

**Files:**
- Modify: `extension/src/components/Options.tsx`

- [ ] **Step 1: Find the existing on-mount `fetchManifest()` call**

```powershell
Select-String -Path extension/src/components/Options.tsx -Pattern "fetchManifest\(" | Select-Object LineNumber, Line
```

Note the line range (around 678-684).

- [ ] **Step 2: Replace the on-mount block with a "read from cache" version**

Find this block (approximately lines 670-685):

```typescript
chrome.storage.local.get(['dh_team_synced', 'dh_team_items'], (data: any) => {
    if (data.dh_team_synced) setTeamSynced(data.dh_team_synced);
    if (Array.isArray(data.dh_team_items)) setTeamItems(data.dh_team_items);
});

// Fetch team list from manifest
import('../utils/teamCatalog').then(({ fetchManifest }) => {
    fetchManifest().then(manifest => {
        if (manifest && Array.isArray(manifest.teams)) {
            setTeamList(manifest.teams.map(t => ({ id: t.id, label: t.label })));
        }
    });
});
```

Replace with:

```typescript
chrome.storage.local.get(
    ['dh_team_synced', 'dh_team_items', 'dh_team_manifest'],
    (data: any) => {
        if (data.dh_team_synced) setTeamSynced(data.dh_team_synced);
        if (Array.isArray(data.dh_team_items)) setTeamItems(data.dh_team_items);
        // Populate dropdown from cached manifest. No fetch here - the service
        // worker startup hook is the only auto-fetch trigger (spec § 3.4).
        // To force a refresh, the user clicks the Refresh button below.
        if (data.dh_team_manifest && Array.isArray(data.dh_team_manifest.teams)) {
            setTeamList(
                data.dh_team_manifest.teams.map((t: any) => ({ id: t.id, label: t.label })),
            );
        }
    },
);
```

- [ ] **Step 3: Find `handleTeamRefresh`**

```powershell
Select-String -Path extension/src/components/Options.tsx -Pattern "handleTeamRefresh" | Select-Object LineNumber, Line
```

Note the line where it's defined (~line 776).

- [ ] **Step 4: Rewrite `handleTeamRefresh` to use the new sync signature**

Find the function:

```typescript
const handleTeamRefresh = () => {
    // ... existing body that calls syncTeamBookmarks somehow
};
```

Replace its body with:

```typescript
const handleTeamRefresh = async () => {
    if (!prefs.teamManifestUrl || !prefs.team) return;
    setIsSyncingTeam(true);
    setTeamFetchError(false);
    try {
        const { syncTeamBookmarks } = await import('../utils/teamCatalog');
        const items = await syncTeamBookmarks(prefs.teamManifestUrl, prefs.team);
        setTeamItems(items);
        setTeamSynced(new Date().toISOString());
        // Refresh the dropdown if the manifest changed during this sync
        const cached = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['dh_team_manifest'], resolve);
        });
        if (cached.dh_team_manifest && Array.isArray(cached.dh_team_manifest.teams)) {
            setTeamList(
                cached.dh_team_manifest.teams.map((t: any) => ({ id: t.id, label: t.label })),
            );
        }
    } catch (e) {
        console.warn('[Options] Team refresh failed:', e);
        setTeamFetchError(true);
    } finally {
        setIsSyncingTeam(false);
    }
};
```

- [ ] **Step 5: Build**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 6: Commit**

```powershell
git add extension/src/components/Options.tsx
git commit -m "feat(extension): wire team catalog fetch on Refresh + read cache on mount

Mount reads dh_team_manifest from storage (set by the service
worker startup sync) to populate the dropdown. No fetch on mount -
the only auto-fetch triggers are service-worker startup (handled
elsewhere) and the Refresh button (handled here).

handleTeamRefresh now uses the new syncTeamBookmarks(manifestUrl,
teamId) signature. Sets teamFetchError on failure so the inline
error message appears under the URL input."
```

---

### Task 8: Update service worker to honor the toggle

**Files:**
- Modify: `extension/src/background/serviceWorker.ts`

- [ ] **Step 1: Read the existing sync function**

```powershell
Get-Content extension/src/background/serviceWorker.ts | Select-Object -Skip 280 -First 30
```

Expected: shows `syncTeamCatalogOnStartup`, called twice (line 299 and inside `chrome.runtime.onInstalled.addListener` around line 302).

- [ ] **Step 2: Rewrite `syncTeamCatalogOnStartup`**

Find the function and replace its body with:

```typescript
async function syncTeamCatalogOnStartup() {
    try {
        const data = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['dh_prefs'], resolve);
        });
        const prefs = data.dh_prefs || {};
        const enabled = prefs.teamCatalogEnabled === true;
        const manifestUrl = prefs.teamManifestUrl || '';
        const teamId = prefs.team;

        if (!enabled) {
            // Toggle off - do not touch network. This is the default state.
            return;
        }
        if (!manifestUrl) {
            // Toggle on but URL not yet configured - no-op.
            return;
        }
        if (!teamId) {
            // No team selected - still refresh manifest so the dropdown gets
            // populated next time the user opens Options.
            const { fetchManifest } = await import('../utils/teamCatalog');
            const cached = await new Promise<any>((resolve) => {
                chrome.storage.local.get(['dh_team_manifest_etag'], resolve);
            });
            const result = await fetchManifest(manifestUrl, cached.dh_team_manifest_etag);
            if (result && result.changed && result.manifest) {
                await new Promise<void>((resolve) => {
                    chrome.storage.local.set({
                        dh_team_manifest: result.manifest,
                        dh_team_manifest_etag: result.etag,
                    }, resolve);
                });
            }
            return;
        }

        const { syncTeamBookmarks } = await import('../utils/teamCatalog');
        const items = await syncTeamBookmarks(manifestUrl, teamId);
        console.log(`[DH-SW] Team catalog synced: ${items.length} items for team '${teamId}'`);
    } catch (e) {
        console.warn('[DH-SW] Team catalog sync failed:', e);
    }
}
```

- [ ] **Step 3: Add the `onStartup` listener**

After the existing `chrome.runtime.onInstalled.addListener(...)` call (around line 302), add:

```typescript
// Also sync on browser startup (when service worker is woken up cold)
chrome.runtime.onStartup.addListener(() => {
    syncTeamCatalogOnStartup();
});
```

- [ ] **Step 4: Build**

```powershell
cd extension; npm run build; cd ..
```

Expected: clean build.

- [ ] **Step 5: Commit**

```powershell
git add extension/src/background/serviceWorker.ts
git commit -m "feat(extension): service worker sync honors team-catalog toggle

Reads dh_prefs.teamCatalogEnabled + teamManifestUrl + team. Bails
silently if toggle off or URL missing - default state means zero
team-related network traffic.

Adds chrome.runtime.onStartup listener (previously only onInstalled
was wired). Both events trigger the same sync function. Per spec,
this is the only auto-fetch trigger - the Options page is reactive
(reads cached state, no auto-fetch on mount)."
```

---

### Task 9: Manual end-to-end verification

**Files:** none modified — verification only.

- [ ] **Step 1: Deploy the new build to prod extension dir**

```powershell
$src = (Resolve-Path "extension/dist").Path
$dst = "$env:LOCALAPPDATA\DynamicsHelper\extension"
robocopy "$src" "$dst" /MIR /NFL /NDL /NJH /NJS /NP /NC /NS 2>&1 | Out-Null
"deployed"
```

- [ ] **Step 2: Reload extension in browser**

Open Edge → `edge://extensions` → reload Dynamics Helper.

- [ ] **Step 3: Default-off path**

Open Options → "Team Catalog" section. Confirm:
- Only the toggle is visible (no URL input, no dropdown, no refresh)
- Toggle is OFF
- Open Edge DevTools → Network panel. Reload Options. Confirm no team-related fetches.

- [ ] **Step 4: Toggle on, no URL**

Toggle ON → confirm URL input appears, but dropdown does NOT appear yet (URL still empty).

- [ ] **Step 5: Provide a test manifest**

Use the `mcdyhelper-team-test` Gist (or any small manifest you control). Example minimal manifest:

```json
{
    "version": 1,
    "teams": [
        {
            "id": "test-team",
            "label": "Test Team",
            "url": "https://raw.githubusercontent.com/<owner>/<repo>/main/test-team.json"
        }
    ]
}
```

And a matching `test-team.json`:

```json
{
    "version": 1,
    "team": "test-team",
    "items": [
        { "type": "url", "label": "Test bookmark", "url": "https://example.com" }
    ]
}
```

Paste the manifest URL into the input. Click **Save Changes** (the URL field follows the same Save-Changes pattern as every other Options pref — `handleSave` writes the full `prefs` object to `chrome.storage.local`). Click **Refresh** (this triggers the fetch).

Expected:
- Dropdown populates with "Test Team"
- Last synced timestamp appears
- "(1 items)" shows

- [ ] **Step 6: ETag re-fetch confirmation**

Click Refresh again. In DevTools Network panel, confirm the manifest + team JSON requests carry `If-None-Match` headers and the server (if it supports ETag) returns 304 Not Modified.

- [ ] **Step 7: Toggle off**

Toggle OFF. Confirm:
- All team UI hides (URL input, dropdown, refresh row)
- FAB no longer shows the team folder
- Cached data is preserved (`chrome.storage.local` should still contain `dh_team`, `dh_team_items`)

- [ ] **Step 8: Toggle back on**

Toggle ON. Confirm:
- URL input shows the previously-saved URL
- Dropdown still shows "Test Team" (from cached `dh_team_manifest`)
- Selecting it shows the previously-cached bookmarks immediately

- [ ] **Step 9: No commit needed (verification only)**

---

### Task 10: Docs touch-up

**Files:**
- Modify: `USER_GUIDE.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update USER_GUIDE.md**

Open `USER_GUIDE.md`. Find the existing "Team Bookmark Catalog" section (around line 167). Replace its body with:

```markdown
### Team Bookmark Catalog

The extension can subscribe to a shared list of bookmarks ("team catalog") published by your team. **The feature is off by default** — no team-related network requests are made until you enable it.

To enable:

1. Open the extension **Options** page.
2. Tick **"Enable Team Catalog"**.
3. Paste your team's **Manifest URL** into the input. This URL is provided by your team admin and points to a JSON file (e.g. on GitHub raw, Azure Blob, SharePoint).
4. Click **Save Changes**.
5. Click **Refresh** to fetch the manifest and populate the dropdown.
6. Pick your team from the dropdown.

The manifest format your admin needs to publish:

```json
{
    "version": 1,
    "teams": [
        { "id": "sales", "label": "Sales", "url": "https://example.com/sales-bookmarks.json" }
    ]
}
```

Each team's bookmark file at its `url`:

```json
{
    "version": 1,
    "team": "sales",
    "items": [
        { "type": "url", "label": "Sales Dashboard", "url": "https://..." }
    ]
}
```

**Update behaviour**: the manifest and the selected team's bookmarks are re-fetched once per browser session (on extension startup), with ETag-based conditional requests to skip bandwidth when nothing changed. You can also click **Refresh** at any time for an immediate update.

**Disabling** the toggle hides team data and stops all team-related network requests, but does not delete the local cache — turning it back on restores your previous selection.
```

- [ ] **Step 2: Update AGENTS.md**

Open `AGENTS.md`. Find the "User Edit Protection (Critical Pattern)" section (around line 109). Find the existing bullet about `prefs.betaChannelEnabled`. Immediately after it, add a sibling bullet:

```markdown
  * **Team catalog preferences** (`prefs.teamCatalogEnabled`, `prefs.teamManifestUrl`): plain user preferences, no `isUserEdited` guard needed. These are NOT mirrored to host `config.json` — team catalog is a purely extension-side feature; the host process never reads team data. See `docs/superpowers/specs/2026-05-20-team-catalog-user-config-design.md`.
```

- [ ] **Step 3: Commit**

```powershell
git add USER_GUIDE.md AGENTS.md
git commit -m "docs: document team catalog opt-in flow for users and agents

USER_GUIDE.md gets a rewritten Team Bookmark Catalog section
covering the new toggle, manifest URL field, and the example
manifest + per-team JSON schemas.

AGENTS.md gets a new bullet under User Edit Protection noting
that the two new prefs are plain (no isUserEdited guard) and
deliberately NOT mirrored to host config.json - team catalog is
extension-only."
```

---

### Task 11: Final cross-check

**Files:** none modified — checklist only.

- [ ] **Step 1: Extension build clean**

```powershell
cd extension; npm run build; cd ..
```

Expected: builds with no TypeScript errors. No warnings about unused imports.

- [ ] **Step 2: Working tree clean and commit list reviewed**

```powershell
git status
git log --oneline -12
```

Expected: nothing to commit. The 10 new feature/doc commits sit on top of whatever HEAD was at plan-start time.

- [ ] **Step 3: Confirm no leftover references to the old constants**

```powershell
Get-ChildItem extension/src -Recurse -Include "*.ts","*.tsx" | Select-String "TEAM_CATALOG_BASE_URL|TEAM_CATALOG_SAS_TOKEN|buildUrl"
```

Expected: zero matches.

- [ ] **Step 4: Confirm no leftover references to the old `file` field on manifest entries**

```powershell
Get-ChildItem extension/src -Recurse -Include "*.ts","*.tsx" | Select-String "TeamManifestEntry|manifest\.teams" -Context 0,1 | Where-Object { $_.Line -match "\.file\b" }
```

Expected: zero matches.

- [ ] **Step 5: Confirm host code wasn't touched**

```powershell
git diff <plan-start-sha>..HEAD --stat -- host/
```

Expected: empty output (no host files in the diff).

---

## Self-Review

(Reviewer applied per writing-plans skill.)

**Spec coverage:**

| Spec section | Implemented in task |
|---|---|
| § 2 Goal 1: opt-in toggle | Task 4 (state), Task 6 (UI) |
| § 2 Goal 2: user-supplied URL, no defaults | Task 3 (delete constants), Task 4 (pref field), Task 6 (input UI) |
| § 2 Goal 3: per-entry `url` | Task 1 (interface), Task 2 (uses entry.url) |
| § 2 Goal 4: once per session via service worker startup | Task 8 (onStartup + onInstalled) |
| § 2 Goal 5: graceful ETag-less fallback | Task 2 (fetchManifest/fetchTeamBookmarks always fall through to 200) |
| § 2 Non-goals: no host mirror | Task 4 (deliberately NOT in update_config), Task 10 (AGENTS.md notes it) |
| § 3.1 Progressive reveal UI | Task 6 (4-level reveal) |
| § 3.2 Manifest breaking change | Task 1 (interface), Task 2 (drop entries missing url with warn) |
| § 3.3 Storage keys | Task 4 (Preferences), Task 2 (dh_team_manifest_etag, dh_team_manifest) |
| § 3.4 Trigger sources (startup + Refresh) | Task 8 (service worker), Task 7 (Refresh) |
| § 3.5 ETag handling | Task 2 (If-None-Match in both fetchers) |
| § 3.6 Code changes by file | Tasks 1-8 each map to a file in this table |
| § 3.7 Migration / backward compat | Task 10 USER_GUIDE.md mentions toggle restores previous selection |
| § 3.8 Error handling matrix | Task 2 (fetch fallbacks), Task 7 (teamFetchError state), Task 6 (inline error UI) |
| § 3.9 Telemetry | Task 6 (`Team Catalog Toggled` event); other events deferred — confirm in Task 9 verification |
| § 4 Testing scenarios 1-9 | Task 9 covers scenarios 1-8 explicitly; 9 covered implicitly (toggle off preserves cache) |

**Placeholder scan:** none found. Every code step shows complete code blocks. Test inputs (`test-team` ID, example URLs) are concrete.

**Type consistency:**
- `TeamManifestEntry` has `id, label, url` consistently across Task 1 (interface) and Task 2 (filter, map).
- `fetchManifest(url, etag?)` signature matches between Task 2 (definition) and Task 8 (caller).
- `fetchTeamBookmarks(url, etag?)` signature matches between Task 2 (definition) and Task 2's `syncTeamBookmarks` (caller).
- `syncTeamBookmarks(manifestUrl, teamId)` signature matches between Task 2 (definition), Task 7 (Refresh handler), Task 8 (service worker).
- `chrome.storage.local` keys consistent: `dh_team_catalog_enabled` (Task 4 default + Task 8 read), `dh_team_manifest_url` (Task 4 default + Task 8 read), `dh_team_manifest` (Task 2 write + Task 7 read + Task 8 write), `dh_team_manifest_etag` (Task 2 write + Task 8 read).

**Note on Task 9 Step 5 wording** — said "Click Save Changes (this stores the URL — see § 7.4 explanation; the URL field follows the same Save-Changes pattern as every other Options pref)". There's no § 7.4 in this plan. Fix: remove the dangling reference.

---

## Notes for the executor

- Extension has no automated test infrastructure; all verification is manual (Task 9). The plan deliberately doesn't ask for unit tests — see the open follow-up in `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`.
- Host code (`host/`) is NOT touched in any task. If you find yourself editing a `host/*.py` file, stop and re-read the plan — you're likely confused.
- The two new prefs (`teamCatalogEnabled`, `teamManifestUrl`) follow the same chrome.storage.local pattern as `enableStatusBubble`. They are deliberately omitted from the `update_config` push (Options.tsx line ~716) — adding them there would be a regression of the design.
- If the manifest URL the user pastes is reachable but returns garbage (not a JSON object), `fetchManifest` returns `null` and the dropdown stays empty. The error UI says "Could not fetch manifest" — that's the right message even for parse failures; users don't need finer-grained errors.

## Follow-up nits (not blocking — recorded by post-implementation final review)

- **Telemetry scope reduction**: spec § 3.9 listed 4 events but only `Team Catalog Toggled` was implemented. The missing ones (`Team Catalog Manifest URL Saved`, `Team Selected`, `Team Catalog Sync` with success/source props) would make it possible to distinguish "user enabled but never configured URL" vs "configured but no team chosen" vs "syncing failing in the field". Defer until adoption data shows it's worth the wire-protocol work.
- **Client-side URL validation**: any string accepted as manifest URL today; failure surfaces only as a generic fetch error via `teamFetchError`. A pre-fetch URL parse (`new URL(prefs.teamManifestUrl)`) would let us show "Invalid URL" before the fetch even tries. Cheap UX polish; defer.
- **SYNC_TEAM_CATALOG message handler vs direct dynamic import**: there are now two paths into `syncTeamBookmarks` — the message handler at `serviceWorker.ts:258` (called from `handleTeamChange`'s team-pick/clear path in Options.tsx) and a direct `import('../utils/teamCatalog')` from `handleTeamRefresh`. The split is intentional (avoid cross-context call when Options can do it directly) but worth a one-line comment in the handler explaining why both exist.
- **`teamCatalog.ts` polish** (from Task 2 code review): (a) redundant `&& manifestResult.manifest` defensive check given the function's narrower-than-typed invariant; (b) three sequential `chrome.storage.local.set` round-trips that could be coalesced; (c) one avoidable storage round-trip on the 304 path (read `dh_team_manifest` alongside the other 4 keys at the top of `syncTeamBookmarks`). All cosmetic; suitable for a future polish pass.
