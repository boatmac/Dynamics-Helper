// Team Bookmark Catalog — fetch, cache, and sync utilities
//
// Fetches a user-supplied manifest URL and the per-team bookmark JSON
// it points to. ETag-based conditional GET; graceful degradation on
// failure (cached data preserved). Detailed error surface (2026-07-03)
// so callers can distinguish 304 / auth-expired / not-found / network /
// parse failure and show actionable UX. Prior to the error-surface
// refactor, all failures were silently console.warn'd and coerced to
// null — a SAS token expiry looked identical to a successful 304.

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

/**
 * Classified failure reason from a manifest / bookmark fetch. Callers use
 * `kind` to pick localised UX copy; `httpStatus` / `message` provide detail
 * for developer console + advanced diagnostics.
 *
 *   - `auth`     — HTTP 401/403; SAS token expired, private URL, wrong scope
 *   - `notFound` — HTTP 404/410; URL typo, blob deleted, container renamed
 *   - `http`     — Any other non-ok HTTP status (5xx server, 4xx other)
 *   - `network`  — fetch() threw (DNS failure, CORS, offline, TLS)
 *   - `parse`    — Response body was not valid JSON
 */
export type FetchFailureKind = 'auth' | 'notFound' | 'http' | 'network' | 'parse';

export interface FetchFailure {
    kind: FetchFailureKind;
    httpStatus?: number;
    /** Human-readable one-line reason for logs / dev console. Not user-facing;
     * UI should translate `kind` via i18n. */
    message: string;
}

function classifyHttpStatus(status: number, statusText: string): FetchFailure {
    if (status === 401 || status === 403) {
        return { kind: 'auth', httpStatus: status, message: `HTTP ${status} ${statusText} — auth (SAS/token expired or insufficient permissions)` };
    }
    if (status === 404 || status === 410) {
        return { kind: 'notFound', httpStatus: status, message: `HTTP ${status} ${statusText} — URL not found` };
    }
    return { kind: 'http', httpStatus: status, message: `HTTP ${status} ${statusText}` };
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
 * Returns a discriminated union so callers can distinguish successful
 * fetches, unchanged (304) responses, and specific failure modes:
 *   - `{ ok: true, changed: true, manifest, etag }`  — new manifest data
 *   - `{ ok: true, changed: false, etag }`           — 304, use cached manifest
 *   - `{ ok: false, failure: FetchFailure }`         — auth/notFound/http/network/parse
 *   - `null`                                          — URL was empty (caller misuse)
 *
 * The `ok: false` path is what fixed the SAS-expiry silent failure — the
 * SW layer used to see `null` and blindly report success, leaving the user
 * with no indication that their manifest URL had stopped working.
 * Entries that are missing the `url` field are dropped (with a console.warn)
 * - migration guard for old `file`-shaped manifests.
 */
export type ManifestFetchResult =
    | { ok: true; changed: true; manifest: TeamManifest; etag: string }
    | { ok: true; changed: false; etag: string }
    | { ok: false; failure: FetchFailure };

export async function fetchManifest(
    url: string,
    currentEtag?: string,
): Promise<ManifestFetchResult | null> {
    if (!url) return null;
    try {
        const headers: HeadersInit = {};
        if (currentEtag) {
            headers['If-None-Match'] = currentEtag;
        }
        const res = await fetch(url, { headers, cache: 'no-cache' });

        if (res.status === 304) {
            return { ok: true, changed: false, etag: currentEtag || '' };
        }
        if (!res.ok) {
            const failure = classifyHttpStatus(res.status, res.statusText);
            console.warn(`[DH] Failed to fetch team manifest from ${url}: ${failure.message}`);
            return { ok: false, failure };
        }

        let raw: TeamManifest;
        try {
            raw = await res.json() as TeamManifest;
        } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            console.warn(`[DH] Manifest JSON parse failed for ${url}:`, parseErr);
            return { ok: false, failure: { kind: 'parse', message: `JSON parse failed: ${msg}` } };
        }
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

        return { ok: true, changed: true, manifest, etag };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[DH] Network error fetching team manifest from ${url}:`, e);
        return { ok: false, failure: { kind: 'network', message: msg } };
    }
}

/**
 * Fetch a team's bookmarks file from the entry's absolute URL.
 * Uses ETag caching.
 *
 * Returns a discriminated union mirroring fetchManifest:
 *   - `{ ok: true, changed: true, items, etag }` — new data
 *   - `{ ok: true, changed: false, etag }`       — 304, cached still valid
 *   - `{ ok: false, failure }`                    — classified failure
 *   - `null`                                       — url was empty
 */
export type TeamBookmarksFetchResult =
    | { ok: true; changed: true; items: any[]; etag: string }
    | { ok: true; changed: false; etag: string }
    | { ok: false; failure: FetchFailure };

export async function fetchTeamBookmarks(
    url: string,
    currentEtag?: string,
): Promise<TeamBookmarksFetchResult | null> {
    if (!url) return null;
    try {
        const headers: HeadersInit = {};
        if (currentEtag) {
            headers['If-None-Match'] = currentEtag;
        }
        const res = await fetch(url, { headers, cache: 'no-cache' });

        if (res.status === 304) {
            return { ok: true, changed: false, etag: currentEtag || '' };
        }
        if (!res.ok) {
            const failure = classifyHttpStatus(res.status, res.statusText);
            console.warn(`[DH] Failed to fetch team bookmarks from ${url}: ${failure.message}`);
            return { ok: false, failure };
        }

        let data: any;
        try {
            data = await res.json();
        } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            console.warn(`[DH] Team bookmarks JSON parse failed for ${url}:`, parseErr);
            return { ok: false, failure: { kind: 'parse', message: `JSON parse failed: ${msg}` } };
        }
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

        return { ok: true, changed: true, items, etag };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[DH] Network error fetching team bookmarks from ${url}:`, e);
        return { ok: false, failure: { kind: 'network', message: msg } };
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

    if (manifestResult === null || !manifestResult.ok) {
        // Manifest fetch failed entirely — fall back to cached team items.
        // syncTeamBookmarks is called by the SW startup hook where there is
        // no UI to surface the error; we log for debug and degrade silently.
        // The Options-page path (SW's SYNC_TEAM_CATALOG handler with
        // manifestOnly=true) has its own error surface for the user.
        if (manifestResult && !manifestResult.ok) {
            console.warn(`[DH] Manifest fetch failure (${manifestResult.failure.kind}): ${manifestResult.failure.message}`);
        } else {
            console.warn('[DH] Team catalog manifest fetch returned null; using cached team data');
        }
        return cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    }

    if (manifestResult.changed) {
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

    if (bookmarksResult === null || !bookmarksResult.ok) {
        if (bookmarksResult && !bookmarksResult.ok) {
            console.warn(`[DH] Bookmark fetch for team '${teamId}' failed (${bookmarksResult.failure.kind}): ${bookmarksResult.failure.message}`);
        } else {
            console.warn(`[DH] Bookmark fetch for team '${teamId}' returned null; using cached items.`);
        }
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
