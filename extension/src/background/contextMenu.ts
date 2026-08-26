import { getTranslation, resolveLanguage, LanguageCode } from '../utils/translations';
import {
    buildContextMenuAnalyzePayload,
    type ContextMenuAnalyzePayload,
} from '../utils/analyzeRequest';
import { ownDataProperty } from '../utils/ownData';

export interface ContextMenuClickDeps {
    readPreferences: () => Promise<unknown>
    executeInTab: (tabId: number) => Promise<void>
    sendToTab: (
        tabId: number,
        message: { type: 'TRIGGER_ANALYZE'; payload: ContextMenuAnalyzePayload },
    ) => Promise<void>
}

export async function handleContextMenuAnalyzeClick(
    info: { selectionText?: unknown },
    tabId: number | undefined,
    deps: ContextMenuClickDeps,
): Promise<'sent' | 'ignored' | 'failed'> {
    if (!Number.isInteger(tabId) || (tabId as number) <= 0) return 'ignored'
    try {
        const storedPreferences = await deps.readPreferences()
        await deps.executeInTab(tabId as number)
        const selection = ownDataProperty(info, 'selectionText')
        const payload = buildContextMenuAnalyzePayload(
            selection.kind === 'value' ? selection.value : undefined,
            storedPreferences,
        )
        await deps.sendToTab(tabId as number, {
            type: 'TRIGGER_ANALYZE',
            payload,
        })
        return 'sent'
    } catch {
        console.error('[DH-BG] Context menu Analyze failed')
        return 'failed'
    }
}

const productionContextMenuDeps: ContextMenuClickDeps = {
    readPreferences: () => new Promise((resolve, reject) => {
        chrome.storage.local.get('dh_prefs', result => {
            if (chrome.runtime.lastError) {
                reject(new Error('Context menu preferences read failed'))
                return
            }
            const prefs = ownDataProperty(result, 'dh_prefs')
            resolve(prefs.kind === 'value' ? prefs.value : undefined)
        })
    }),
    executeInTab: async tabId => {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => true,
        })
    },
    sendToTab: (tabId, message) => new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            if (chrome.runtime.lastError) {
                reject(new Error('Context menu Analyze delivery failed'))
                return
            }
            resolve()
        })
    }),
}

async function getMenuTitle(): Promise<string> {
    const result = await chrome.storage.local.get("dh_prefs");
    const prefs = result.dh_prefs as any;
    const prefLang = (prefs && prefs.language) ? (prefs.language as LanguageCode) : 'auto';
    const lang = resolveLanguage(prefLang);
    return getTranslation('analyzeError', lang);
}

/**
 * Sets up the context menu items for the extension.
 */
export function setupContextMenu() {
    chrome.runtime.onInstalled.addListener(async () => {
        const title = await getMenuTitle();
        chrome.contextMenus.create({
            id: "dh-analyze-selection",
            title: title,
            contexts: ["selection"]
        });
    });

    // Update title when language changes
    chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area === 'local' && changes.dh_prefs) {
            const title = await getMenuTitle();
            chrome.contextMenus.update("dh-analyze-selection", { title: title }, () => {
                // Ignore error if item doesn't exist yet
                const err = chrome.runtime.lastError; 
            });
        }
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "dh-analyze-selection") {
            void handleContextMenuAnalyzeClick(
                info,
                tab?.id,
                productionContextMenuDeps,
            );
        }
    });
}
