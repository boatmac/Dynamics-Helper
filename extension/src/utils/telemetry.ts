import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { createBrowserHistory } from 'history';
import { TELEMETRY_CONNECTION_STRING } from './constants';

// Initialize the React Plugin
const reactPlugin = new ReactPlugin();

// Create a history object for the plugin to track page views automatically (though less relevant for extension popups/content scripts, good practice)
const browserHistory = createBrowserHistory({ window: window });

// Define the connection string. In a real production app, this might come from a config file or env var.
// For now, we'll use a placeholder or the actual key if provided.
// IMPORTANT: Replace with your actual Connection String
const CONNECTION_STRING = TELEMETRY_CONNECTION_STRING;

const appInsights = new ApplicationInsights({
    config: {
        connectionString: CONNECTION_STRING,
        extensions: [reactPlugin],
        extensionConfig: {
            [reactPlugin.identifier]: { history: browserHistory }
        },
        // Extension specific settings
        disableFetchTracking: false,
        enableAutoRouteTracking: true,
        // Optional: reduce telemetry noise in dev
        // loggingLevelConsole: 2, 
    }
});

// Initialize App Insights
// Only load if we have a valid key placeholder replaced, or valid key structure
// AND if we are running in an extension page (Options/Popup) to avoid blocking errors in Content Scripts
const isExtensionPage = typeof window !== 'undefined' && window.location && window.location.protocol === 'chrome-extension:';

if (CONNECTION_STRING && !CONNECTION_STRING.includes("REPLACE_ME") && isExtensionPage) {
    appInsights.loadAppInsights();
    console.log("[Dynamics Helper] Telemetry Service Initialized (Extension Context)");
} else if (!isExtensionPage) {
    // console.log("[Dynamics Helper] Telemetry Service: Initialization skipped in Content Script (Delegating to Background)");
} else {
    console.warn("Azure Application Insights not initialized: Missing Connection String.");
}

export { appInsights, reactPlugin };

/**
 * Helper to track custom events with standard properties
 * @param name Event name (e.g., 'Analyze Clicked')
 * @param properties Custom properties object
 */
export const trackEvent = (name: string, properties: Record<string, any> = {}) => {
    // Force sending to background script for now to bypass potential content script network restrictions
    // or race conditions in initialization
    const forceBackground = true;

    // Check if we are in the background service worker or a regular page
    if (forceBackground || typeof window === 'undefined' || typeof document === 'undefined') {
         // We are in the background worker (likely) or forcing it
         if (chrome && chrome.runtime) {
            console.log(`[Dynamics Helper] Delegating event '${name}' to Background Service Worker`);
            chrome.runtime.sendMessage({
                type: "TELEMETRY_EVENT",
                payload: { name, properties }
            }).catch(() => { /* Ignore errors if background isn't listening yet */ });
         }
    } else {
        if (appInsights) {
            console.log(`[Dynamics Helper] Tracking Event: ${name}`, properties);
            appInsights.trackEvent({ name }, properties);
        }
    }
};

/**
 * Helper to track exceptions
 * @param error Error object
 * @param severityLevel Optional severity level
 */
export const trackException = (error: Error, severityLevel?: number) => {
    const forceBackground = true;

    // Check if we are in the background service worker or a regular page
    if (forceBackground || typeof window === 'undefined' || typeof document === 'undefined') {
        // We are in the background worker
        if (chrome && chrome.runtime) {
             chrome.runtime.sendMessage({
                 type: "TELEMETRY_EXCEPTION",
                 payload: { error: { name: error.name, message: error.message, stack: error.stack }, severityLevel }
             }).catch(() => { /* Ignore errors */ });
        }
    } else {
        if (appInsights) {
            appInsights.trackException({ error, severityLevel });
        }
    }
};
