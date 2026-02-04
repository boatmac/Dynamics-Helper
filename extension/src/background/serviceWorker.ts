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

try {
    // Initialize App Insights for Service Worker environment
    // Note: We disable automatic tracking features that rely on DOM/Window
    appInsights = new ApplicationInsights({
        config: {
            connectionString: CONNECTION_STRING,
            disableAjaxTracking: true,
            disableFetchTracking: true,
            disableExceptionTracking: true,
        }
    });

    // Verify if we can load it (handling potential missing window/document issues in SW)
    appInsights.loadAppInsights();
    console.log("[DH-SW] Telemetry Service Initialized in Background");
} catch (e) {
    console.warn("[DH-SW] Failed to initialize Telemetry in Background:", e);
}

function trackBackgroundEvent(name: string, properties: any = {}) {
    if (appInsights) {
        try {
            console.log(`[DH-SW] Received and tracking event: ${name}`);
            appInsights.trackEvent({ name }, properties);
        } catch (e) {
            console.error("[DH-SW] Track Event Failed:", e);
        }
    }
}

function trackBackgroundException(error: any, severityLevel?: number) {
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

    if (message.action === "update_host_config") {
         sendNativeMessage({ 
             action: "update_config", 
             payload: message.payload 
         })
            .then(response => sendResponse({ status: "success", data: response }))
            .catch(error => sendResponse({ status: "error", error: error.message }));
        return true;
    }

    if (message.action === "get_host_config") {
        sendNativeMessage({ action: "get_config" })
           .then(response => sendResponse(response))
           .catch(error => sendResponse({ status: "error", error: error.message }));
       return true;
   }

    if (message.type === "TELEMETRY_EVENT") {
        trackBackgroundEvent(message.payload.name, message.payload.properties);
        return false;
    }

    if (message.type === "TELEMETRY_EXCEPTION") {
        trackBackgroundException(message.payload.error, message.payload.severityLevel);
        return false;
    }
});

console.log("[DH] Background Service Worker Loaded");
