// Background Service Worker
// Handles communication with the Native Host and Telemetry

import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { TELEMETRY_CONNECTION_STRING } from '../utils/constants';

const NATIVE_HOST_NAME = "com.dynamics.helper.native";

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

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NATIVE_MSG") {
        sendNativeMessage(message.payload)
            .then(response => sendResponse({ status: "success", data: response }))
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
});

// Helper to send message to Native Host
function sendNativeMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendNativeMessage(
                NATIVE_HOST_NAME,
                message,
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                }
            );
        } catch (e: any) {
            reject(e);
        }
    });
}

console.log("[DH] Background Service Worker Loaded");
