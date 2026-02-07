
// Ported from legacy_backup/contentScript.js

import { getTranslation, resolveLanguage, LanguageCode } from './translations';

let currentLang: 'en' | 'zh' = 'en';

// Helper to keep language in sync
function updateLanguage() {
    chrome.storage.local.get("dh_prefs", (result) => {
        const prefs = result.dh_prefs as any;
        const prefLang = (prefs && prefs.language) ? (prefs.language as LanguageCode) : 'auto';
        currentLang = resolveLanguage(prefLang);
    });
}
// Initial load
updateLanguage();

// Listen for changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.dh_prefs) {
        updateLanguage();
    }
});

function t(key: string): string {
    return getTranslation(key, currentLang);
}

// --- Types ---
interface AzureResource {
    subscription: string;
    resourceGroup: string;
    provider: string;
    resourceName: string;
}

// --- Notification Helpers (Simple fallback if UI not present) ---
function showToast(text: string) {
    // We'll create a simple toast in the Shadow DOM or main DOM if needed
    // For now, let's log it, or we could dispatch an event to our React App
    console.log("[DH] Toast:", text);
    
    // Dispatch event for React to handle if possible, otherwise simple DOM append
    const event = new CustomEvent('DH_TOAST', { detail: { text } });
    window.dispatchEvent(event);
}

function showNotification(text: string, type: 'info' | 'error' = 'error') {
    console.log(`[DH] Notification (${type}):`, text);
    const event = new CustomEvent('DH_NOTIFICATION', { detail: { text, type } });
    window.dispatchEvent(event);
}

// --- Clipboard Listener ---
let lastClipboardContent = "";

function parseAzureResourceId(text: string): AzureResource | null {
    // Regex to match Azure Resource ID
    // /subscriptions/{sub}/resourceGroups/{rg}/providers/{providerNamespace}/{resourceType}/{resourceName}
    const regex = /subscriptions\/([^\/]+)\/resourceGroups\/([^\/]+)\/providers\/([^\/]+)\/([^\/]+)\/([^\/]+)/i;
    const match = text.match(regex);

    if (match) {
        return {
            subscription: match[1],
            resourceGroup: match[2],
            provider: `${match[3]}/${match[4]}`,
            resourceName: match[5]
        };
    }
    return null;
}

export async function checkClipboard() {
    if (!document.hasFocus()) return;

    try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboardContent) {
            lastClipboardContent = text;
            const azureResource = parseAzureResourceId(text);

            if (azureResource) {
                const msg = `${t('azureResourceDetected')}:\n\n${t('subscription')}: ${azureResource.subscription}\n${t('resourceGroup')}: ${azureResource.resourceGroup}\n${t('provider')}: ${azureResource.provider}\n${t('name')}: ${azureResource.resourceName}`;
                showNotification(msg, 'info');
                // Also trigger a toast
                showToast(t('clipboardToast'));
            }
        }
    } catch (err) {
        // Clipboard access denied or other error
        // console.debug("[DH] Clipboard access failed/denied", err);
    }
}

export function startClipboardListener() {
    // Check every 2 seconds
    setInterval(checkClipboard, 2000);
    // Also check on window focus
    window.addEventListener("focus", checkClipboard);
    console.log("[DH] Clipboard listener started");
}

// --- SAP TextArea Watcher ---

const TARGET_ID = "sapTextAreaId";
const KEYWORD = "Azure/Mooncake Support Escalation";
const monitoredElements = new WeakSet<HTMLElement>();
const checkedElements = new WeakMap<HTMLElement, string>();
const detectedElements = new WeakSet<HTMLElement>();

// Simple debounce implementation
function debounce(func: Function, wait: number) {
    let timeout: any;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function highlight(el: HTMLElement) {
    if (!el) return;
    console.log("[DH] Applying RED highlight to element:", el);
    el.style.cssText += "; outline: 4px solid #dc2626 !important; outline-offset: 2px !important; background-color: #fef2f2 !important; border: 3px solid #ef4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.2) !important;";
    
    // Pulse animation (injected via JS style since we are in main DOM here)
    if (!document.getElementById("dh-pulse-style")) {
        const style = document.createElement("style");
        style.id = "dh-pulse-style";
        style.textContent = `
            @keyframes dh-pulse {
                0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
                100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
            }
        `;
        document.head.appendChild(style);
    }
    el.style.animation = "dh-pulse 2s infinite";

    try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (_) {}
}

function checkValue(el: HTMLElement): boolean {
    try {
        if (detectedElements.has(el)) return true;

        const val = (el as HTMLTextAreaElement).value || el.textContent || "";
        
        if (val.includes(KEYWORD)) {
            console.log("[DH] ✓✓✓ KEYWORD DETECTED! ✓✓✓");
            detectedElements.add(el);
            highlight(el);
            showNotification(`⚠️ ${t('escalationDetected')}`);
            showToast(`${t('escalationToast')} "${KEYWORD}"`);
            return true;
        }
        return false;
    } catch (e) {
        console.error("[DH] Error checking value:", e);
        return false;
    }
}


function setupMonitoring(el: HTMLElement) {
    if (monitoredElements.has(el)) {
        checkValue(el);
        return;
    }

    monitoredElements.add(el);
    console.log("[DH] Setting up NEW monitoring on element:", el.id);

    if (checkValue(el)) return;

    // Show indicator that we are watching
    el.style.outline = "2px dashed #3b82f6";
    
    ["input", "change", "blur", "paste", "focus"].forEach(eventType => {
        el.addEventListener(eventType, () => checkValue(el));
    });

    // Poll for a while
    let pollCount = 0;
    const pollInterval = setInterval(() => {
        if (!document.contains(el) || detectedElements.has(el)) {
            clearInterval(pollInterval);
            return;
        }

        pollCount++;
        const currentValue = (el as HTMLTextAreaElement).value || "";
        const lastValue = checkedElements.get(el) || "";

        if (currentValue !== lastValue) {
            checkedElements.set(el, currentValue);
            if (checkValue(el)) {
                clearInterval(pollInterval);
                return;
            }
        }

        if (pollCount >= 100) clearInterval(pollInterval); // Stop after ~5 mins
    }, 3000);
}

function findTextarea() {
    // 1. ID Check (Fastest)
    const el = document.getElementById(TARGET_ID);
    if (el && el.tagName === "TEXTAREA") setupMonitoring(el);

    // 2. Query All (Reasonably fast)
    document.querySelectorAll("textarea").forEach(ta => {
        if (ta.id === TARGET_ID) setupMonitoring(ta as HTMLElement);
    });

    // 3. Shadow DOM (Optimized)
    // REMOVED: document.querySelectorAll("*") as it causes severe performance regression on large pages.
    // Only check explicit custom elements if needed in the future.
}

export function setupSapTextAreaWatcher() {
    console.log("[DH] SAP Watcher Initialized");
    
    // Initial checks
    [0, 500, 2000].forEach(d => setTimeout(findTextarea, d));

    // Debounced Observer
    const debouncedFind = debounce(findTextarea, 1000); // Check at most once per second

    const observer = new MutationObserver((mutations) => {
        debouncedFind();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Periodic (reduced frequency)
    setInterval(findTextarea, 10000); // Check every 10s instead of 5s
}
