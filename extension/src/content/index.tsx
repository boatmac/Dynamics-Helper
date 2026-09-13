import React from 'react';
import { createRoot } from 'react-dom/client';
import FAB from '../components/FAB';
import { startClipboardListener, setupSapTextAreaWatcher } from '../utils/legacyFeatures';
import { LEGACY_CSS } from '../components/LegacyStyles';
import { forwardNativeUpdateErrorToWindow } from './updateErrorBridge';
import { parseAnalyzeProgress, type AnalyzeProgressEvent } from '../utils/analyzeProgress';
import { ownDataProperty } from '../utils/ownData';
import { publishAnalyzeProgress } from '../utils/analyzeProgressChannel';

function exactProgressMessage(value: unknown): Readonly<{
    requestId: string;
    payload: AnalyzeProgressEvent | string;
}> | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) return null;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (
            Reflect.ownKeys(descriptors).length !== 3
            || !['type', 'requestId', 'payload'].every(key => {
                if (!Object.hasOwn(descriptors, key)) return false;
                const descriptor = descriptors[key];
                return descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
            })
            || descriptors.type.value !== 'NATIVE_PROGRESS'
            || typeof descriptors.requestId.value !== 'string'
            || descriptors.requestId.value.length === 0
        ) return null;
        const payload = parseAnalyzeProgress(descriptors.payload.value);
        if (payload === null) return null;
        return Object.freeze({
            requestId: descriptors.requestId.value,
            payload,
        });
    } catch {
        return null;
    }
}

console.log("[DH] Content Script Loaded");

// Listen for broadcasted Native Progress updates from Background
chrome.runtime.onMessage.addListener((msg) => {
    if (forwardNativeUpdateErrorToWindow(msg)) {
        return;
    }
    const type = ownDataProperty(msg, 'type')
    if (type.kind !== 'value' || typeof type.value !== 'string') return
    if (type.value === "NATIVE_PROGRESS") {
        const detail = exactProgressMessage(msg);
        if (!detail) return;
        publishAnalyzeProgress(detail);
    }
    else if (type.value === "TRIGGER_ANALYZE") {
        console.log("[DH] Received TRIGGER_ANALYZE from Context Menu");
        const event = new CustomEvent("dh-trigger-analyze", { 
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
        #root { display: contents; }
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
