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
 * `kind` to pick localised UX copy; `httpStatus` / `message` provide fixed,
 * credential-safe diagnostics. They must never echo a URL or thrown value.
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

function classifyHttpStatus(status: number): FetchFailure {
    if (status === 401 || status === 403) {
        return { kind: 'auth', httpStatus: status, message: `HTTP ${status} authentication or authorization failure` };
    }
    if (status === 404 || status === 410) {
        return { kind: 'notFound', httpStatus: status, message: `HTTP ${status} resource not found` };
    }
    return { kind: 'http', httpStatus: status, message: `HTTP ${status} request failure` };
}

function warnFetchFailure(stage: 'manifest' | 'bookmarks', failure: FetchFailure): void {
    console.warn(`[DH] Team ${stage} fetch failed`, {
        kind: failure.kind,
        ...(failure.httpStatus === undefined ? {} : { httpStatus: failure.httpStatus }),
    });
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
            const failure = classifyHttpStatus(res.status);
            warnFetchFailure('manifest', failure);
            return { ok: false, failure };
        }

        let raw: TeamManifest;
        try {
            raw = await res.json() as TeamManifest;
        } catch {
            const failure: FetchFailure = { kind: 'parse', message: 'JSON parse failed' };
            warnFetchFailure('manifest', failure);
            return { ok: false, failure };
        }
        const etag = res.headers.get('ETag') || res.headers.get('etag') || '';

        // Drop entries missing url (migration guard for old `file`-shaped manifests)
        const validTeams = (raw.teams || []).filter(t => {
            if (!t.url) {
                console.warn('[DH] Manifest entry missing url; skipping.');
                return false;
            }
            return true;
        });
        const manifest: TeamManifest = { version: raw.version, teams: validTeams };

        return { ok: true, changed: true, manifest, etag };
    } catch {
        const failure: FetchFailure = { kind: 'network', message: 'Network request failed' };
        warnFetchFailure('manifest', failure);
        return { ok: false, failure };
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
            const failure = classifyHttpStatus(res.status);
            warnFetchFailure('bookmarks', failure);
            return { ok: false, failure };
        }

        let data: any;
        try {
            data = await res.json();
        } catch {
            const failure: FetchFailure = { kind: 'parse', message: 'JSON parse failed' };
            warnFetchFailure('bookmarks', failure);
            return { ok: false, failure };
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
    } catch {
        const failure: FetchFailure = { kind: 'network', message: 'Network request failed' };
        warnFetchFailure('bookmarks', failure);
        return { ok: false, failure };
    }
}

/**
 * Result of a `syncTeamBookmarks` pass. `items` uses the selected team's
 * cache on ordinary failures. A stale pass returns an empty current-safe list
 * that consumers must ignore. `failure` is present when either manifest fetch
 * OR the bookmark fetch failed — callers that care about the distinction
 * (Options refresh button showing an error banner) should check
 * `failure` before treating the pass as a successful sync.
 *
 * `failureStage` tells the UI where the failure originated so error copy
 * can be phrased accurately (a `notFound` on the manifest means the
 * user's URL is wrong; a `notFound` on the bookmarks means the manifest
 * entry's URL is wrong — different user actions).
 */
export type SyncStatus = 'committed' | 'unchanged' | 'failed' | 'skipped' | 'stale';

export interface SyncResult {
    status: SyncStatus;
    items: any[];
    failure?: FetchFailure;
    failureStage?: 'manifest' | 'bookmarks';
}

/**
 * One full sync pass:
 *   1. Read current ETags from storage
 *   2. Fetch manifest (with ETag)
 *   3. Find the currently-selected team in manifest.teams
 *   4. Fetch that team's bookmark JSON (with ETag)
 *   5. Persist whatever changed
 *
 * Returns a status-discriminated result. On failure `items` is the
 * cached array (possibly empty) so the UI keeps rendering; callers should
 * check `failure` to decide whether to show a banner and/or refresh the
 * synced-at timestamp. Prior to 2026-07-03 this function returned a bare
 * `any[]` and silently swallowed 401/403/404 errors, which caused the
 * Options "Refresh" button to update the sync timestamp on a failing
 * SAS token without warning the user.
 */
export async function syncTeamBookmarks(
    manifestUrl: string,
    teamId: string,
): Promise<SyncResult> {
    if (!manifestUrl) return { status: 'skipped', items: [] };

    const cache = await new Promise<any>((resolve) => {
        chrome.storage.local.get(
            ['dh_team_items', 'dh_team_etag', 'dh_team_manifest_etag', 'dh_team'],
            resolve,
        );
    });

    const cachedItemsForTeam = (): any[] =>
        cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    const staleResult = (): SyncResult => ({ status: 'stale', items: [] });
    const preferencesStillMatch = async (): Promise<boolean> => {
        const current = await chrome.storage.local.get('dh_prefs');
        const prefs = current.dh_prefs as {
            teamCatalogEnabled?: boolean;
            teamManifestUrl?: string;
            team?: string;
        } | undefined;
        return prefs?.teamCatalogEnabled === true
            && prefs.teamManifestUrl === manifestUrl
            && prefs.team === teamId;
    };

    // Step 1: refresh the manifest
    const manifestResult = await fetchManifest(manifestUrl, cache.dh_team_manifest_etag);
    let manifest: TeamManifest | null = null;

    if (manifestResult === null) {
        // Empty URL (defensive; guarded above). Return quietly.
        return { status: 'skipped', items: cachedItemsForTeam() };
    }
    if (!await preferencesStillMatch()) return staleResult();
    if (!manifestResult.ok) {
        warnFetchFailure('manifest', manifestResult.failure);
        return {
            status: 'failed',
            items: cachedItemsForTeam(),
            failure: manifestResult.failure,
            failureStage: 'manifest',
        };
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
    if (!await preferencesStillMatch()) return staleResult();

    if (!manifest) {
        return { status: 'skipped', items: cachedItemsForTeam() };
    }

    // Step 2: find the entry for the currently-selected team
    if (!teamId) return { status: 'skipped', items: [] };
    const entry = manifest.teams.find(t => t.id === teamId);
    if (!entry) {
        console.warn('[DH] Selected team not found in manifest; using cached items if any.');
        return { status: 'skipped', items: cachedItemsForTeam() };
    }

    // Step 3: fetch the team's bookmark JSON
    // If we switched team since last sync, ignore old ETag
    const currentEtag = cache.dh_team === teamId ? cache.dh_team_etag : undefined;
    const bookmarksResult = await fetchTeamBookmarks(entry.url, currentEtag);
    if (!await preferencesStillMatch()) return staleResult();

    if (bookmarksResult === null) {
        return { status: 'skipped', items: cachedItemsForTeam() };
    }
    if (!bookmarksResult.ok) {
        warnFetchFailure('bookmarks', bookmarksResult.failure);
        return {
            status: 'failed',
            items: cachedItemsForTeam(),
            failure: bookmarksResult.failure,
            failureStage: 'bookmarks',
        };
    }

    if (!bookmarksResult.changed) {
        // 304 — refresh sync timestamp only
        await new Promise<void>((resolve) => {
            chrome.storage.local.set({ dh_team_synced: new Date().toISOString() }, resolve);
        });
        return {
            status: 'unchanged',
            items: Array.isArray(cache.dh_team_items) ? cache.dh_team_items : [],
        };
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

    return { status: 'committed', items: bookmarksResult.items };
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
