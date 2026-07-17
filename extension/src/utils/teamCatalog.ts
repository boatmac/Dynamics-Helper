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
 *   - `storage`  — Chrome rejected a local cache mutation
 */
export type FetchFailureKind = 'auth' | 'notFound' | 'http' | 'network' | 'parse' | 'storage';

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

export interface TeamSyncIdentity {
    enabled: boolean;
    manifestUrl: string;
    teamId: string;
}

export interface SyncResult {
    status: SyncStatus;
    identity: TeamSyncIdentity;
    items: any[];
    syncedAt?: string;
    failure?: FetchFailure;
    failureStage?: 'manifest' | 'bookmarks';
}

export const TEAM_CACHE_KEYS = [
    'dh_team',
    'dh_team_items',
    'dh_team_etag',
    'dh_team_manifest',
    'dh_team_manifest_etag',
    'dh_team_manifest_url',
    'dh_team_synced',
] as const;

let teamMutationQueue: Promise<void> = Promise.resolve();
let teamSyncGeneration = 0;

export function beginTeamSyncGeneration(): number {
    teamSyncGeneration += 1;
    return teamSyncGeneration;
}

export function teamSyncGenerationIsCurrent(expectedGeneration: number): boolean {
    return expectedGeneration === teamSyncGeneration;
}

function queueTeamMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const run = teamMutationQueue.then(mutation, mutation);
    teamMutationQueue = run.then(() => undefined, () => undefined);
    return run;
}

function readStorage(keys: string | string[]): Promise<any> {
    return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function setStorage(values: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) {
            reject(new Error('Team catalog storage mutation failed'));
            return;
        }
        resolve();
    }));
}

function removeStorage(keys: readonly string[]): Promise<void> {
    return new Promise((resolve, reject) => chrome.storage.local.remove([...keys], () => {
        if (chrome.runtime.lastError) {
            reject(new Error('Team catalog storage removal failed'));
            return;
        }
        resolve();
    }));
}

function storageFailureResult(
    identity: TeamSyncIdentity,
    failureStage: 'manifest' | 'bookmarks',
): SyncResult {
    return {
        status: 'failed',
        identity,
        items: [],
        failure: {
            kind: 'storage',
            message: 'Team catalog storage mutation failed',
        },
        failureStage,
    };
}

function storedIdentityMatches(
    prefs: {
        teamCatalogEnabled?: boolean;
        teamManifestUrl?: string;
        team?: string;
    } | undefined,
    identity: TeamSyncIdentity,
): boolean {
    return prefs?.teamCatalogEnabled === identity.enabled
        && (prefs.teamManifestUrl || '') === identity.manifestUrl
        && (prefs.team || '') === identity.teamId;
}

export async function currentTeamIdentityMatches(
    identity: TeamSyncIdentity,
    expectedGeneration: number,
): Promise<boolean> {
    const current = await readStorage('dh_prefs');
    if (!teamSyncGenerationIsCurrent(expectedGeneration)) return false;
    const prefs = current.dh_prefs as {
        teamCatalogEnabled?: boolean;
        teamManifestUrl?: string;
        team?: string;
    } | undefined;
    return storedIdentityMatches(prefs, identity);
}

async function commitForIdentity(
    identity: TeamSyncIdentity,
    expectedGeneration: number,
    values: Record<string, unknown>,
): Promise<boolean> {
    return queueTeamMutation(async () => {
        if (!teamSyncGenerationIsCurrent(expectedGeneration)) return false;
        if (!await currentTeamIdentityMatches(identity, expectedGeneration)) return false;
        if (!teamSyncGenerationIsCurrent(expectedGeneration)) return false;
        await setStorage(values);
        return true;
    });
}

export async function writeTeamManifestForUrl(
    identity: TeamSyncIdentity,
    manifest: TeamManifest,
    etag: string,
    expectedGeneration: number,
): Promise<boolean> {
    return commitForIdentity(identity, expectedGeneration, {
        dh_team_manifest: manifest,
        dh_team_manifest_etag: etag,
        dh_team_manifest_url: identity.manifestUrl,
    });
}

export async function readTeamManifestState(
    identity: TeamSyncIdentity,
    expectedGeneration: number,
): Promise<{
    etag?: string;
    current: boolean;
}> {
    const data = await readStorage([
        'dh_team_manifest_etag',
        'dh_team_manifest_url',
    ]);
    const current = teamSyncGenerationIsCurrent(expectedGeneration);
    if (!current) return { current: false };
    const identityCurrent = await currentTeamIdentityMatches(identity, expectedGeneration);
    return {
        etag: identityCurrent && data.dh_team_manifest_url === identity.manifestUrl
            ? data.dh_team_manifest_etag as string | undefined
            : undefined,
        current: identityCurrent,
    };
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
    identityOrUrl: TeamSyncIdentity | string,
    teamIdOrGeneration?: string | number,
    capturedGeneration?: number,
): Promise<SyncResult> {
    const identity: TeamSyncIdentity = typeof identityOrUrl === 'string'
        ? {
            enabled: true,
            manifestUrl: identityOrUrl,
            teamId: typeof teamIdOrGeneration === 'string' ? teamIdOrGeneration : '',
        }
        : identityOrUrl;
    const generation = capturedGeneration
        ?? (typeof teamIdOrGeneration === 'number' ? teamIdOrGeneration : beginTeamSyncGeneration());
    const { manifestUrl, teamId } = identity;
    if (!manifestUrl || !teamId) return { status: 'skipped', identity, items: [] };

    const cache = await new Promise<any>((resolve) => {
        chrome.storage.local.get(
            [
                'dh_team_items',
                'dh_team_etag',
                'dh_team_manifest_etag',
                'dh_team_manifest_url',
                'dh_team',
            ],
            resolve,
        );
    });
    if (!teamSyncGenerationIsCurrent(generation)) {
        return { status: 'stale', identity, items: [] };
    }
    if (!await currentTeamIdentityMatches(identity, generation)) {
        return { status: 'stale', identity, items: [] };
    }
    const cacheMatchesUrl = cache.dh_team_manifest_url === manifestUrl;

    const cachedItemsForTeam = (): any[] =>
        cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    const staleResult = (): SyncResult => ({ status: 'stale', identity, items: [] });
    const preferencesStillMatch = () => currentTeamIdentityMatches(identity, generation);

    // Step 1: refresh the manifest
    const manifestResult = await fetchManifest(
        manifestUrl,
        cacheMatchesUrl ? cache.dh_team_manifest_etag : undefined,
    );
    let manifest: TeamManifest | null = null;

    if (manifestResult === null) {
        // Empty URL (defensive; guarded above). Return quietly.
        return {
            status: 'skipped',
            identity,
            items: cacheMatchesUrl ? cachedItemsForTeam() : [],
        };
    }
    if (!await preferencesStillMatch()) return staleResult();
    if (!manifestResult.ok) {
        warnFetchFailure('manifest', manifestResult.failure);
        return {
            status: 'failed',
            identity,
            items: cacheMatchesUrl ? cachedItemsForTeam() : [],
            failure: manifestResult.failure,
            failureStage: 'manifest',
        };
    }

    if (manifestResult.changed) {
        manifest = manifestResult.manifest;
        // Persist the new manifest + its ETag
        try {
            if (!await commitForIdentity(identity, generation, {
                dh_team_manifest: manifest,
                dh_team_manifest_etag: manifestResult.etag,
                dh_team_manifest_url: manifestUrl,
            })) return staleResult();
        } catch {
            return storageFailureResult(identity, 'manifest');
        }
    } else {
        // 304 — reuse cached manifest
        const cached = await new Promise<any>((resolve) => {
            chrome.storage.local.get(
                ['dh_team_manifest', 'dh_team_manifest_url'],
                resolve,
            );
        });
        manifest = cached.dh_team_manifest_url === manifestUrl
            ? cached.dh_team_manifest || null
            : null;
    }
    if (!await preferencesStillMatch()) return staleResult();

    if (!manifest) {
        return {
            status: 'skipped',
            identity,
            items: cacheMatchesUrl ? cachedItemsForTeam() : [],
        };
    }

    // Step 2: find the entry for the currently-selected team
    const entry = manifest.teams.find(t => t.id === teamId);
    if (!entry) {
        console.warn('[DH] Selected team not found in manifest; using cached items if any.');
        return {
            status: 'skipped',
            identity,
            items: cacheMatchesUrl ? cachedItemsForTeam() : [],
        };
    }

    // Step 3: fetch the team's bookmark JSON
    // If we switched team since last sync, ignore old ETag
    const currentEtag = cacheMatchesUrl && cache.dh_team === teamId
        ? cache.dh_team_etag
        : undefined;
    const bookmarksResult = await fetchTeamBookmarks(entry.url, currentEtag);
    if (!await preferencesStillMatch()) return staleResult();

    if (bookmarksResult === null) {
        return {
            status: 'skipped',
            identity,
            items: cacheMatchesUrl ? cachedItemsForTeam() : [],
        };
    }
    if (!bookmarksResult.ok) {
        warnFetchFailure('bookmarks', bookmarksResult.failure);
        return {
            status: 'failed',
            identity,
            items: cacheMatchesUrl ? cachedItemsForTeam() : [],
            failure: bookmarksResult.failure,
            failureStage: 'bookmarks',
        };
    }

    if (!bookmarksResult.changed) {
        // 304 — refresh sync timestamp only
        const syncedAt = new Date().toISOString();
        try {
            if (!await commitForIdentity(identity, generation, { dh_team_synced: syncedAt })) {
                return staleResult();
            }
        } catch {
            return storageFailureResult(identity, 'bookmarks');
        }
        return {
            status: 'unchanged',
            identity,
            items: cacheMatchesUrl && Array.isArray(cache.dh_team_items)
                ? cache.dh_team_items
                : [],
            syncedAt,
        };
    }

    // New bookmarks — persist
    const syncedAt = new Date().toISOString();
    try {
        if (!await commitForIdentity(identity, generation, {
            dh_team: teamId,
            dh_team_items: bookmarksResult.items,
            dh_team_etag: bookmarksResult.etag,
            dh_team_synced: syncedAt,
        })) return staleResult();
    } catch {
        return storageFailureResult(identity, 'bookmarks');
    }

    return {
        status: 'committed',
        identity,
        items: bookmarksResult.items,
        syncedAt,
    };
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
    const generation = beginTeamSyncGeneration();
    await clearTeamSelectionAtGeneration(generation);
}

export async function clearTeamSelectionAtGeneration(
    generation: number,
    identity?: TeamSyncIdentity,
): Promise<boolean> {
    return queueTeamMutation(async () => {
        if (!teamSyncGenerationIsCurrent(generation)) return false;
        if (identity && !await currentTeamIdentityMatches(identity, generation)) return false;
        if (!teamSyncGenerationIsCurrent(generation)) return false;
        await removeStorage(['dh_team', 'dh_team_items', 'dh_team_etag', 'dh_team_synced']);
        return true;
    });
}

/**
 * Clear ALL team catalog data from storage, including the manifest
 * cache. Use this for hard resets (e.g. the Options "Reset Settings"
 * button). For "user picked No team" use clearTeamSelection() instead
 * - the manifest survives and the dropdown remains populated.
 */
export async function clearTeamBookmarks(): Promise<void> {
    const generation = beginTeamSyncGeneration();
    await clearTeamBookmarksAtGeneration(generation);
}

export async function clearTeamBookmarksAtGeneration(
    generation: number,
    identity?: TeamSyncIdentity,
): Promise<boolean> {
    return queueTeamMutation(async () => {
        if (!teamSyncGenerationIsCurrent(generation)) return false;
        if (identity && !await currentTeamIdentityMatches(identity, generation)) return false;
        if (!teamSyncGenerationIsCurrent(generation)) return false;
        await removeStorage(TEAM_CACHE_KEYS);
        return true;
    });
}

export async function clearTeamSelectionIfChanged(
    identity: TeamSyncIdentity,
    generation: number,
): Promise<boolean> {
    return queueTeamMutation(async () => {
        if (!teamSyncGenerationIsCurrent(generation)) return false;
        if (!await currentTeamIdentityMatches(identity, generation)) return false;
        const cached = await readStorage('dh_team');
        if (!teamSyncGenerationIsCurrent(generation)) return false;
        if (cached.dh_team && cached.dh_team !== identity.teamId) {
            if (!await currentTeamIdentityMatches(identity, generation)) return false;
            await removeStorage(['dh_team', 'dh_team_items', 'dh_team_etag', 'dh_team_synced']);
        }
        return true;
    });
}
