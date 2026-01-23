import React from 'react';
import { createRoot } from 'react-dom/client';
import FAB from '../components/FAB';
import { startClipboardListener, setupSapTextAreaWatcher } from '../utils/legacyFeatures';
import { LEGACY_CSS } from '../components/LegacyStyles';

console.log("[DH] Content Script Loaded");

// Create a container for our React app (Shadow DOM to isolate styles)
const CONTAINER_ID = "dh-extension-root";

function mount() {
    // 1. Initialize Legacy Features (Global Watchers)
    try {
        // startClipboardListener(); // Disabled to prevent permission popups during local testing
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
