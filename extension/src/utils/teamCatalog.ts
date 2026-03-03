// Team Bookmark Catalog — fetch, cache, and sync utilities
// Fetches team-specific bookmarks from a remote catalog (Azure Blob, etc.)
// with ETag-based caching and graceful degradation on failure.

import { TEAM_CATALOG_BASE_URL, TEAM_CATALOG_SAS_TOKEN } from './constants';

// --- Types ---

export interface TeamManifestEntry {
    id: string;
    label: string;
    file: string;
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
 * Build full URL with optional SAS token appended.
 */
function buildUrl(path: string): string {
    const base = `${TEAM_CATALOG_BASE_URL}/${path}`;
    if (TEAM_CATALOG_SAS_TOKEN) {
        return `${base}?${TEAM_CATALOG_SAS_TOKEN}`;
    }
    return base;
}

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
 * Fetch the team manifest (list of available teams).
 * Returns null on failure (network error, expired SAS, etc.)
 */
export async function fetchManifest(): Promise<TeamManifest | null> {
    try {
        const res = await fetch(buildUrl('manifest.json'), { cache: 'no-cache' });
        if (!res.ok) {
            console.warn(`[DH] Failed to fetch team manifest: ${res.status} ${res.statusText}`);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn('[DH] Error fetching team manifest:', e);
        return null;
    }
}

/**
 * Fetch a team's bookmarks file. Uses ETag caching to avoid
 * unnecessary re-downloads.
 *
 * Returns { items, etag, changed } or null on failure.
 * When `changed` is false, the cached version is still valid.
 */
export async function fetchTeamBookmarks(
    teamId: string,
    currentEtag?: string
): Promise<{ items: any[]; etag: string; changed: boolean } | null> {
    try {
        const headers: HeadersInit = {};
        if (currentEtag) {
            headers['If-None-Match'] = currentEtag;
        }

        const res = await fetch(buildUrl(`${teamId}.json`), {
            headers,
            cache: 'no-cache',
        });

        // 304 Not Modified — cached data is still fresh
        if (res.status === 304) {
            return { items: [], etag: currentEtag || '', changed: false };
        }

        if (!res.ok) {
            console.warn(`[DH] Failed to fetch team bookmarks for '${teamId}': ${res.status}`);
            return null;
        }

        const data: TeamCatalogFile = await res.json();
        const etag = res.headers.get('ETag') || res.headers.get('etag') || '';
        const items = stampTeamSource(data.items || []);

        return { items, etag, changed: true };
    } catch (e) {
        console.warn(`[DH] Error fetching team bookmarks for '${teamId}':`, e);
        return null;
    }
}

/**
 * Sync team bookmarks for the given team ID.
 * Reads cached ETag, fetches if stale, writes results to chrome.storage.local.
 * On fetch failure, gracefully degrades to cached data.
 * Returns the (potentially cached) team items array.
 */
export async function syncTeamBookmarks(teamId: string): Promise<any[]> {
    // Read current cache
    const cache = await new Promise<any>((resolve) => {
        chrome.storage.local.get(
            ['dh_team_items', 'dh_team_etag', 'dh_team_synced', 'dh_team'],
            resolve
        );
    });

    // If fetching a different team than cached, ignore old ETag
    const currentEtag = cache.dh_team === teamId ? cache.dh_team_etag : undefined;

    const result = await fetchTeamBookmarks(teamId, currentEtag);

    if (!result) {
        // Fetch failed — return cached items if available (graceful degradation)
        console.warn('[DH] Team catalog fetch failed, using cached data');
        return cache.dh_team === teamId && Array.isArray(cache.dh_team_items)
            ? cache.dh_team_items
            : [];
    }

    if (!result.changed) {
        // 304 — cached data is fresh, just update sync timestamp
        await new Promise<void>((resolve) => {
            chrome.storage.local.set({ dh_team_synced: new Date().toISOString() }, resolve);
        });
        return Array.isArray(cache.dh_team_items) ? cache.dh_team_items : [];
    }

    // New data — update everything
    await new Promise<void>((resolve) => {
        chrome.storage.local.set({
            dh_team: teamId,
            dh_team_items: result.items,
            dh_team_etag: result.etag,
            dh_team_synced: new Date().toISOString(),
        }, resolve);
    });

    return result.items;
}

/**
 * Clear all team catalog data from storage.
 * Called when the user deselects their team.
 */
export async function clearTeamBookmarks(): Promise<void> {
    await new Promise<void>((resolve) => {
        chrome.storage.local.remove(
            ['dh_team', 'dh_team_items', 'dh_team_etag', 'dh_team_synced'],
            resolve
        );
    });
}
