import React from 'react';
import { createRoot } from 'react-dom/client';
import FAB from '../components/FAB';
import { startClipboardListener, setupSapTextAreaWatcher } from '../utils/legacyFeatures';
import { LEGACY_CSS } from '../components/LegacyStyles';

console.log("[DH] Content Script Loaded");

// Listen for broadcasted Native Progress updates from Background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "NATIVE_PROGRESS") {
        // Dispatch a custom DOM event so the React component (FAB) can listen to it
        // We use window because the React app is in Shadow DOM, but the script runs in the main context (mostly)
        // Actually, custom events on window are the easiest bridge.
        const event = new CustomEvent("dh-native-progress", { 
            detail: { 
                requestId: msg.requestId, 
                payload: msg.payload 
            } 
        });
        window.dispatchEvent(event);
    }
    else if (msg.type === "TRIGGER_ANALYZE") {
        console.log("[DH] Received TRIGGER_ANALYZE from Context Menu");
        const event = new CustomEvent("dh-trigger-analyze", { 
            detail: msg.payload 
        });
        window.dispatchEvent(event);
    }
    else if (msg.type === "NATIVE_UPDATE_AVAILABLE") {
        console.log("[DH] Dispatching Update Event");
        const event = new CustomEvent("dh-update-available", { 
            detail: msg.payload 
        });
        window.dispatchEvent(event);
    }
});

// Create a container for our React app (Shadow DOM to isolate styles)
const CONTAINER_ID = "dh-extension-root";

function mount() {
    // 1. Initialize Legacy Features (Global Watchers)
    try {
        startClipboardListener(); 
        setupSapTextAreaWatcher();
    } catch (e) {
        console.error("[DH] Failed to init legacy features:", e);
    }

    // 2. Mount React App
    if (document.getElementById(CONTAINER_ID)) return;

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    
    // The Host Container:
    // Fixed to viewport, covers entire screen but lets clicks pass through (pointer-events: none).
    // This allows us to position the FAB absolutely within it.
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '2147483647'; // Max z-index
    container.style.pointerEvents = 'none'; // CRITICAL: Let clicks pass through to the page

    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: 'open' });
    
    // 3. Inject Styles (The Fix)
    const styleSheet = document.createElement('style');
    styleSheet.textContent = LEGACY_CSS;
    shadowRoot.appendChild(styleSheet);
    
    // Also inject generic base styles that might be missing in shadow DOM
    const baseStyle = document.createElement('style');
    baseStyle.textContent = `
        :host { all: initial; }
    `;
    shadowRoot.appendChild(baseStyle);

    // 4. React Root
    const reactRoot = document.createElement('div');
    reactRoot.id = "root";
    shadowRoot.appendChild(reactRoot);

    const root = createRoot(reactRoot);
    root.render(<FAB />);
    
    console.log("[DH] React App Mounted in Shadow DOM with Inline CSS");
}

// Wait for body
if (document.body) {
    mount();
} else {
    document.addEventListener('DOMContentLoaded', mount);
}
