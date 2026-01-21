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
                if (area === "local" && changes.dh_items) {
                    const newItemList = changes.dh_items.newValue;
                    if (Array.isArray(newItemList)) {
                        setItems(newItemList);
                        // Reset nav stack on update to avoid inconsistencies
                        setNavStack([]);
                        setCurrentItems(newItemList);
                    }
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
    // 1. Try local storage
    try {
        if (chrome?.storage?.local) {
            const obj = await new Promise<{ dh_items?: MenuItem[] }>((resolve) => {
                chrome.storage.local.get("dh_items", (items) => resolve(items as { dh_items?: MenuItem[] }));
            });
            if (Array.isArray(obj.dh_items) && obj.dh_items.length > 0) return obj.dh_items;
        }
    } catch (_) { }

    // 2. Fallback to items.json (packaged)
    try {
        const url = chrome.runtime.getURL("items.json");
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : (data.items || []);
        }
    } catch (e) {
        console.warn("[DH] Failed to load items.json", e);
    }

    // 3. Fallback defaults (if JSON missing)
    return [
        { type: "folder", label: "Favorites", children: [
            { type: "link", label: "Dynamics Admin Center", url: "https://admin.powerplatform.microsoft.com/" },
        ]},
        { type: "markdown", label: "About", content: "# Dynamics Helper\nLoaded defaults." }
    ] as MenuItem[];
}

export async function resolveDynamicUrl(rawUrl: string): Promise<string | null> {
    if (!rawUrl || !rawUrl.includes("%s")) return rawUrl;
    
    // Simple placeholder logic for now
    // In legacy, this used specific DOM scraping (extractSixteenDigitFromPage)
    // We can port that helper if needed. 
    return rawUrl.replace("%s", ""); 
}
