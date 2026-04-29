// Background Service Worker
// Handles communication with the Native Host and Telemetry

import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { TELEMETRY_CONNECTION_STRING } from '../utils/constants';
import { setupContextMenu } from './contextMenu';

const NATIVE_HOST_NAME = "com.dynamics.helper.native";

// Initialize Context Menu
setupContextMenu();

// --- Telemetry Setup ---
const CONNECTION_STRING = TELEMETRY_CONNECTION_STRING;

let appInsights: ApplicationInsights | null = null;
let stableUserId: string | null = null;

// Initialize telemetry async so userId is ready before any events fire.
async function initTelemetry(): Promise<void> {
    try {
        // 1. Resolve stable anonymous user ID FIRST (before loading SDK).
        // Service workers lack cookies/localStorage, so the App Insights SDK
        // cannot persist a user_Id on its own. We use chrome.storage.local.
        const data = await chrome.storage.local.get("telemetryUserId");
        stableUserId = (data.telemetryUserId as string) || null;
        if (!stableUserId) {
            stableUserId = crypto.randomUUID();
            await chrome.storage.local.set({ telemetryUserId: stableUserId });
        }

        // 2. Create and load App Insights.
        appInsights = new ApplicationInsights({
            config: {
                connectionString: CONNECTION_STRING,
                disableAjaxTracking: true,
                disableFetchTracking: true,
                disableExceptionTracking: true,
            }
        });
        appInsights.loadAppInsights();

        // 3. Set user context so SDK populates user_Id in the schema.
        appInsights.context.user.id = stableUserId;
        appInsights.context.user.authenticatedId = stableUserId;

        // 4. Stamp every telemetry item with extensionVersion AND userId
        // as custom dimensions (backup — guarantees they appear even if
        // the SDK drops the context fields).
        const extVersion = chrome.runtime.getManifest().version;
        appInsights.addTelemetryInitializer((item) => {
            item.data = item.data || {};
            item.data.extensionVersion = extVersion;
            item.data.userId = stableUserId;
        });

        console.log("[DH-SW] Telemetry initialized, userId:", stableUserId);
    } catch (e) {
        console.warn("[DH-SW] Failed to initialize Telemetry in Background:", e);
    }
}

// Fire-and-forget but trackBackgroundEvent will queue until ready.
const telemetryReady = initTelemetry();

async function trackBackgroundEvent(name: string, properties: any = {}) {
    await telemetryReady;
    if (appInsights) {
        try {
            console.log(`[DH-SW] Received and tracking event: ${name}`);
            properties.extensionVersion = properties.extensionVersion || chrome.runtime.getManifest().version;
            appInsights.trackEvent({ name }, properties);
        } catch (e) {
            console.error("[DH-SW] Track Event Failed:", e);
        }
    }
}

async function trackBackgroundException(error: any, severityLevel?: number) {
    await telemetryReady;
    if (appInsights) {
        try {
            appInsights.trackException({ error, severityLevel });
        } catch (e) {
            console.error("[DH-SW] Track Exception Failed:", e);
        }
    }
}
// -----------------------

// --- Native Messaging (Persistent Port) ---
let nativePort: chrome.runtime.Port | null = null;
const pendingRequests = new Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>();

function connectToNativeHost() {
    try {
        console.log("[DH-SW] Connecting to Native Host...");
        nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
        
        nativePort.onMessage.addListener((msg) => {
            console.log("[DH-SW] Received message from host:", msg);
            
            // Handle Progress Updates (Streamed)
            if (msg.status === "progress") {
                // Broadcast progress to active tabs (Content Script/FAB)
                // We don't resolve the promise yet
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: "NATIVE_PROGRESS",
                            requestId: msg.requestId,
                            payload: msg.data // e.g., "Checking logs..."
                        }).catch(() => {
                            // Tab might be closed or not listening, ignore
                        });
                    }
                });
                return;
            }

            // Handle Update Available
            if (msg.action === "update_available") {
                console.log("[DH-SW] Update Available:", msg.payload);
                
                // Persist state so UI can pick it up later if not open
                chrome.storage.local.set({ pending_update: msg.payload });

                // 1. Notify Runtime (Options Page, Popup)
                chrome.runtime.sendMessage({
                    type: "NATIVE_UPDATE_AVAILABLE",
                    payload: msg.payload
                }).catch(() => {
                    // No runtime listeners (Options page closed), ignore
                });

                // 2. Notify Active Tabs (Content Scripts)
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: "NATIVE_UPDATE_AVAILABLE",
                            payload: msg.payload
                        }).catch(() => {});
                    }
                });
                return;
            }

            // Handle Update Error
            if (msg.action === "update_error") {
                console.warn("[DH-SW] Update Check Failed:", msg.payload);
                chrome.runtime.sendMessage({
                    type: "NATIVE_UPDATE_ERROR",
                    payload: msg.payload
                }).catch(() => {});
                return;
            }

            // Handle Update Not Available
            if (msg.action === "update_not_available") {
                console.log("[DH-SW] Update Not Available (User is up to date)");
                
                // Clear pending update since we are valid
                chrome.storage.local.remove("pending_update");

                chrome.runtime.sendMessage({
                    type: "NATIVE_UPDATE_NOT_AVAILABLE",
                    payload: msg.payload
                }).catch(() => {});
                return;
            }

            // Handle Final Responses (Success/Error)
            if (msg.requestId && pendingRequests.has(msg.requestId)) {
                const { resolve, reject } = pendingRequests.get(msg.requestId)!;
                pendingRequests.delete(msg.requestId);
                
                if (msg.status === "success") {
                    resolve({ status: "success", data: msg.data });
                } else {
                    // We resolve with error status to let frontend handle it gracefully
                    resolve({ status: "error", error: msg.error || msg.message });
                }
            }
        });

        nativePort.onDisconnect.addListener(() => {
            console.log("[DH-SW] Native Host Disconnected:", chrome.runtime.lastError?.message);
            nativePort = null;
            // Reject all pending
            for (const { reject } of pendingRequests.values()) {
                reject(new Error("Native Host disconnected unexpectedly"));
            }
            pendingRequests.clear();
        });

    } catch (e) {
        console.error("[DH-SW] Failed to connect to Native Host:", e);
    }
}

// Helper to send message via Port
function sendNativeMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!nativePort) {
            connectToNativeHost();
        }
        
        if (!nativePort) {
            reject(new Error("Could not establish connection to Native Host"));
            return;
        }

        const requestId = message.requestId || crypto.randomUUID();
        // Ensure requestId is in the payload for the host to echo back
        const msgWithId = { ...message, requestId };

        pendingRequests.set(requestId, { resolve, reject });
        
        try {
            nativePort.postMessage(msgWithId);
        } catch (e: any) {
            pendingRequests.delete(requestId);
            reject(e);
            // Retry connection next time
            nativePort = null;
        }
    });
}
// ------------------------------------------

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NATIVE_MSG") {
        sendNativeMessage(message.payload)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ status: "error", error: error.message }));
        return true; // Keep channel open for async response
    }
    
    if (message.type === "OPEN_OPTIONS") {
        chrome.runtime.openOptionsPage();
        return false;
    }


    if (message.type === "TELEMETRY_EVENT") {
        trackBackgroundEvent(message.payload.name, message.payload.properties);
        return false;
    }

    if (message.type === "TELEMETRY_EXCEPTION") {
        trackBackgroundException(message.payload.error, message.payload.severityLevel);
        return false;
    }

    // Team Bookmark Catalog: manual sync from Options page
    if (message.type === "SYNC_TEAM_CATALOG") {
        (async () => {
            try {
                const { syncTeamBookmarks, clearTeamBookmarks } = await import('../utils/teamCatalog');
                const teamId = message.payload?.teamId;
                if (!teamId) {
                    await clearTeamBookmarks();
                    sendResponse({ status: "success", data: { items: [] } });
                } else {
                    const items = await syncTeamBookmarks(teamId);
                    sendResponse({ status: "success", data: { items, teamId } });
                }
            } catch (e: any) {
                console.error('[DH-SW] Team catalog sync error:', e);
                sendResponse({ status: "error", error: e.message });
            }
        })();
        return true; // Keep channel open for async response
    }
});

console.log("[DH] Background Service Worker Loaded");

// --- Team Bookmark Catalog: Background Sync ---
async function syncTeamCatalogOnStartup() {
    try {
        const data = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['dh_prefs'], resolve);
        });
        const teamId = data.dh_prefs?.team;
        if (!teamId) return; // No team selected, skip

        const { syncTeamBookmarks } = await import('../utils/teamCatalog');
        const items = await syncTeamBookmarks(teamId);
        console.log(`[DH-SW] Team catalog synced: ${items.length} items for team '${teamId}'`);
    } catch (e) {
        console.warn('[DH-SW] Team catalog sync failed:', e);
    }
}

// Sync on service worker startup
syncTeamCatalogOnStartup();

// Also sync on install/update
chrome.runtime.onInstalled.addListener(() => {
    syncTeamCatalogOnStartup();
});
