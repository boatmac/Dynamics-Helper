// Ported logic from legacy contentScript.js
// Handles menu state, recursive rendering, and actions

import { useEffect, useState } from 'react';

export interface MenuItem {
    type: 'folder' | 'link' | 'markdown' | 'back' | 'unknown';
    label: string;
    url?: string;
    content?: string;
    children?: MenuItem[];
    target?: string;
    icon?: string;
    tags?: string[];
    source?: 'team' | 'personal';
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

export function useMenuLogic() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [navStack, setNavStack] = useState<MenuItem[][]>([]);
    const [currentItems, setCurrentItems] = useState<MenuItem[]>([]);

    // Load Items
    useEffect(() => {
        loadItems().then(data => {
            setItems(data);
            setCurrentItems(data);
        });
        
        // Listen for changes
        if (chrome?.storage?.onChanged) {
            const listener = (changes: any, area: string) => {
                if (area === "local" && (changes.dh_items || changes.dh_team_items)) {
                    // Reload everything when either personal or team items change
                    loadItems().then(data => {
                        setItems(data);
                        setNavStack([]);
                        setCurrentItems(data);
                    });
                }
            };
            chrome.storage.onChanged.addListener(listener);
            return () => chrome.storage.onChanged.removeListener(listener);
        }
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
        navigateBack
    };
}

async function loadItems(): Promise<MenuItem[]> {
    // 1. Load personal items
    let personalItems: MenuItem[] = [];
    try {
        if (chrome?.storage?.local) {
            const obj = await new Promise<{ dh_items?: MenuItem[] }>((resolve) => {
                chrome.storage.local.get("dh_items", (items) => resolve(items as { dh_items?: MenuItem[] }));
            });
            if (Array.isArray(obj.dh_items) && obj.dh_items.length > 0) {
                personalItems = obj.dh_items;
            }
        }
    } catch (_) { }

    // Fallback to items.json if no personal items saved
    if (personalItems.length === 0) {
        try {
            const url = chrome.runtime.getURL("items.json");
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                if (text.trim().startsWith("<")) {
                    throw new Error("Received HTML instead of JSON");
                }
                const data = JSON.parse(text);
                personalItems = Array.isArray(data) ? data : (data.items || []);
            }
        } catch (e) {
            console.warn("[DH] Failed to load items.json", e);
        }
    }

    // Ultimate fallback
    if (personalItems.length === 0) {
        personalItems = [
            { type: "folder", label: "Favorites", children: [
                { type: "link", label: "Dynamics Admin Center", url: "https://admin.powerplatform.microsoft.com/" },
            ]},
            { type: "markdown", label: "About", content: "# Dynamics Helper\nLoaded defaults." }
        ] as MenuItem[];
    }

    // 2. Load team items from cache
    let teamItems: MenuItem[] = [];
    try {
        if (chrome?.storage?.local) {
            const teamData = await new Promise<any>((resolve) => {
                chrome.storage.local.get(['dh_team_items', 'dh_prefs'], resolve);
            });
            // Respect the team-catalog toggle: when disabled, do not surface
            // cached team data in the FAB even if dh_team_items still exists.
            // Spec 2026-05-20-team-catalog-user-config-design.md § 3.7.
            const enabled = teamData.dh_prefs?.teamCatalogEnabled === true;
            if (enabled && Array.isArray(teamData.dh_team_items)) {
                teamItems = teamData.dh_team_items;
            }
        }
    } catch (_) { }

    // 3. Flat-merge: personal first, team appended, label collisions
    // resolved by personal-wins (team's same-label item dropped entirely).
    // See mergeMenus() docstring + spec § 3.1.
    return mergeMenus(personalItems, teamItems);
}

export async function resolveDynamicUrl(rawUrl: string): Promise<string | null> {
    if (!rawUrl || !rawUrl.includes("%s")) return rawUrl;
    
    // Simple placeholder logic for now
    // In legacy, this used specific DOM scraping (extractSixteenDigitFromPage)
    // We can port that helper if needed. 
    return rawUrl.replace("%s", ""); 
}
