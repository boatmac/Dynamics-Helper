import { PageReader } from '../utils/pageReader';

/**
 * Sets up the context menu items for the extension.
 */
export function setupContextMenu() {
    chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            id: "dh-analyze-selection",
            title: "Analyze Error",
            contexts: ["selection"]
        });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "dh-analyze-selection" && tab?.id) {
            handleContextMenuClick(info, tab);
        }
    });
}

/**
 * Handles the context menu click event.
 * Injects a script to scrape the page (or use selection) and then sends the analyze message.
 */
async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) {
    if (!tab.id) return;

    // We need to get the full context, not just the selection text.
    // So we inject a content script function to run PageReader.
    try {
        // 1. Get Preferences (Root Path)
        const prefs = await chrome.storage.local.get("dh_prefs");
        const rootPath = (prefs.dh_prefs as any)?.rootPath || "";

        // 2. Execute Script in Tab to get data
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // We need to access PageReader logic. 
                // Since PageReader is a module, we can't easily inject it via 'func'.
                // Instead, we should send a message to the EXISTING Content Script (FAB.tsx / index.tsx).
                return true; 
            }
        });

        // 3. Send message to Content Script to trigger analysis
        // The Content Script (FAB) is already running and has the "handleAnalyze" logic.
        // We just need to tell it to start.
        chrome.tabs.sendMessage(tab.id, {
            type: "TRIGGER_ANALYZE",
            payload: {
                selectionText: info.selectionText,
                rootPath: rootPath
            }
        });

    } catch (e) {
        console.error("[DH-BG] Context Menu Error:", e);
    }
}
