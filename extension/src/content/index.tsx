import React from 'react';
import { createRoot } from 'react-dom/client';
import FAB from '../components/FAB';
import '../index.css';

console.log("[DH] Content Script Loaded");

// Create a container for our React app (Shadow DOM to isolate styles)
const CONTAINER_ID = "dh-extension-root";

function mount() {
    if (document.getElementById(CONTAINER_ID)) return;

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: 'open' });
    
    // Inject Tailwind styles into Shadow DOM
    // In production build, we need to manually inject the CSS content
    // For dev, Vite HMR handles it differently, but for now we'll try a simple approach
    // Note: With CRXJS, we might need to import the CSS file as a string or use a specific loader
    
    // Create a style element for our app
    const styleElement = document.createElement('style');
    // We will populate this later or rely on CRXJS to inject styles
    shadowRoot.appendChild(styleElement);

    const root = createRoot(shadowRoot);
    root.render(<FAB />);
}

// Wait for body
if (document.body) {
    mount();
} else {
    document.addEventListener('DOMContentLoaded', mount);
}
