// Ported logic from legacy contentScript.js
// Handles menu state, recursive rendering, and actions

import { useEffect, useRef, useState } from 'react';
import {
    collapseBookmarkFolders,
    loadBookmarkItems,
    parseOwnBookmarkItems,
    writeStoredItems,
    type MenuItem,
} from '../utils/bookmarkItems';
export type { MenuItem } from '../utils/bookmarkItems';

export type BookmarkLoadIssue =
    | 'bookmark_storage_invalid'
    | 'bookmark_storage_read_failed'
    | 'bookmark_defaults_unreadable'
    | null;

type LoadedMenuSnapshot = {
    items: MenuItem[] | null;
    source: 'saved' | 'defaults' | null;
    issue: BookmarkLoadIssue;
};

async function readMenuSnapshot(): Promise<LoadedMenuSnapshot> {
    const loaded = await loadBookmarkItems();
    if (loaded.kind !== 'loaded') {
        return { items: null, source: null, issue: loaded.code };
    }
    return { items: loaded.items, source: loaded.source, issue: null };
}

/**
 * Flat-merge personal and team items at the top level.
 *
 * Order: personal first (preserves user order), then team items in their
 * manifest order. Team items whose top-level label matches any personal
 * item's top-level label are dropped entirely (including their subtree).
 * No deep merge - if both have a "Favorite" folder, the team's Favorite
 * and all its children are silently omitted (per spec § 2 non-goals).
 *
 * Important invariant: personal items always occupy the first
 * `personal.length` slots of the result. Callers that index into the
 * merged array using personal-only paths (e.g. setItems(prev =>
 * updateItemAt(path, ...))) remain correct without translation.
 *
 * Pure function: no I/O, no side effects.
 */
export function mergeMenus(personal: MenuItem[], team: MenuItem[]): MenuItem[] {
    const personalLabels = new Set(personal.map(item => item.label));
    const teamFiltered = team.filter(item => !personalLabels.has(item.label));
    return [...personal, ...teamFiltered];
}

export function teamCacheIsCurrent(data: {
    dh_team_manifest_url?: string;
    dh_team?: string;
    dh_prefs?: {
        teamCatalogEnabled?: boolean;
        teamManifestUrl?: string;
        team?: string;
    };
}): boolean {
    return data.dh_prefs?.teamCatalogEnabled === true
        && data.dh_team_manifest_url === data.dh_prefs.teamManifestUrl
        && data.dh_team === data.dh_prefs.team;
}

export function useMenuLogic() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [navStack, setNavStack] = useState<MenuItem[][]>([]);
    const [currentItems, setCurrentItems] = useState<MenuItem[]>([]);
    const [bookmarkLoadIssue, setBookmarkLoadIssue] = useState<BookmarkLoadIssue>(null);
    const loadGenerationRef = useRef(0);

    // Load Items
    useEffect(() => {
        let cancelled = false;
        const loadLatest = async () => {
            const generation = ++loadGenerationRef.current;
            const isCurrent = () => !cancelled
                && generation === loadGenerationRef.current;
            const loaded = await readMenuSnapshot();
            if (!isCurrent()) return;
            if (!loaded.items) {
                setBookmarkLoadIssue(loaded.issue);
                return;
            }
            const personalItems = collapseBookmarkFolders(
                loaded.items,
                isCurrent,
            );
            if (!personalItems || !isCurrent()) return;
            if (loaded.source === 'defaults') {
                try {
                    const writeResult = await writeStoredItems(
                        personalItems,
                        isCurrent,
                    );
                    if (writeResult !== 'committed' || !isCurrent()) return;
                } catch {
                    if (isCurrent()) {
                        setBookmarkLoadIssue('bookmark_storage_read_failed');
                    }
                    return;
                }
            }
            setItems(personalItems);
            setNavStack([]);
            setCurrentItems(personalItems);
            setBookmarkLoadIssue(null);
            const teamItems = await loadTeamItems();
            if (!isCurrent()) return;
            const data = mergeMenus(personalItems, teamItems);
            setItems(data);
            setNavStack([]);
            setCurrentItems(data);
        };
        void loadLatest();
        
        // Listen for changes
        if (chrome?.storage?.onChanged) {
            const listener = (changes: any, area: string) => {
                if (
                    area === "local"
                    && (
                        changes.dh_items
                        || changes.dh_team_items
                        || changes.dh_team_manifest_url
                        || changes.dh_team
                        || changes.dh_prefs
                    )
                ) {
                    // Reload everything when either personal or team items change
                    void loadLatest();
                }
            };
            chrome.storage.onChanged.addListener(listener);
            return () => {
                cancelled = true;
                loadGenerationRef.current += 1;
                chrome.storage.onChanged.removeListener(listener);
            };
        }
        return () => {
            cancelled = true;
            loadGenerationRef.current += 1;
        };
    }, []);

    const navigateTo = (folder: MenuItem) => {
        if (folder.children) {
            setNavStack(prev => [...prev, currentItems]);
            setCurrentItems(folder.children);
        }
    };

    const navigateBack = () => {
        if (navStack.length > 0) {
            const previous = navStack[navStack.length - 1];
            setCurrentItems(previous);
            setNavStack(prev => prev.slice(0, -1));
        }
    };

    return {
        currentItems,
        canGoBack: navStack.length > 0,
        navigateTo,
        navigateBack,
        bookmarkLoadIssue,
    };
}

async function loadTeamItems(): Promise<MenuItem[]> {
    try {
        if (chrome?.storage?.local) {
            const wrappedTeamData = await new Promise<{ value: unknown }>((resolve) => {
                chrome.storage.local.get([
                    'dh_team_items',
                    'dh_team_manifest_url',
                    'dh_team',
                    'dh_prefs',
                ], value => resolve({ value }));
            });
            const teamData = wrappedTeamData.value;
            const parsedItems = parseOwnBookmarkItems(
                teamData,
                'dh_team_items',
            );
            // Respect the team-catalog toggle: when disabled, do not surface
            // cached team data in the FAB even if dh_team_items still exists.
            // Spec 2026-05-20-team-catalog-user-config-design.md § 3.7.
            if (
                parsedItems
                && teamCacheIsCurrent(
                    teamData as Parameters<typeof teamCacheIsCurrent>[0],
                )
            ) {
                return parsedItems;
            }
        }
    } catch (_) { }
    return [];
}

export async function resolveDynamicUrl(rawUrl: string): Promise<string | null> {
    if (!rawUrl || !rawUrl.includes("%s")) return rawUrl;
    
    // Simple placeholder logic for now
    // In legacy, this used specific DOM scraping (extractSixteenDigitFromPage)
    // We can port that helper if needed. 
    return rawUrl.replace("%s", ""); 
}
