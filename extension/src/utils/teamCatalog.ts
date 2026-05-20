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

        const data = await res.json();
        const etag = res.headers.get('ETag') || res.headers.get('etag') || '';
        // Accept two shapes:
        //   - Wrapped: { version, team, items: [...] }  (spec-canonical)
        //   - Raw array: [...]                         (matches DH's own export
        //     format - see handleExport in Options.tsx which writes plain
        //     JSON.stringify(items))
        // The wrapped form is preferred for new manifests because it carries
        // a version field for forward compatibility, but team admins frequently
        // host a DH-exported backup directly. Accept either to keep the user
        // experience friction-free.
        const rawItems = Array.isArray(data)
            ? data
            : (Array.isArray(data?.items) ? data.items : []);
        const items = stampTeamSource(rawItems);

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
 * Clear only the user's team SELECTION + the selected team's cached
 * bookmarks. Preserves the manifest cache (`dh_team_manifest`,
 * `dh_team_manifest_etag`) so the dropdown stays populated and the
 * user can re-select a team without re-fetching the manifest.
 *
 * Use this when the user picks "No team" from the dropdown.
 */
export async function clearTeamSelection(): Promise<void> {
    await new Promise<void>((resolve) => {
        chrome.storage.local.remove(
            ['dh_team', 'dh_team_items', 'dh_team_etag', 'dh_team_synced'],
            resolve,
        );
    });
}

/**
 * Clear ALL team catalog data from storage, including the manifest
 * cache. Use this for hard resets (e.g. the Options "Reset Settings"
 * button). For "user picked No team" use clearTeamSelection() instead
 * - the manifest survives and the dropdown remains populated.
 */
export async function clearTeamBookmarks(): Promise<void> {
    await new Promise<void>((resolve) => {
        chrome.storage.local.remove(
            ['dh_team', 'dh_team_items', 'dh_team_etag', 'dh_team_manifest', 'dh_team_manifest_etag', 'dh_team_synced'],
            resolve,
        );
    });
}
