"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const FAB_1 = __importDefault(require("../components/FAB"));
require("../index.css");
console.log("[DH] Content Script Loaded");
// Create a container for our React app (Shadow DOM to isolate styles)
const CONTAINER_ID = "dh-extension-root";
function mount() {
    if (document.getElementById(CONTAINER_ID))
        return;
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
    const root = (0, client_1.createRoot)(shadowRoot);
    root.render((0, jsx_runtime_1.jsx)(FAB_1.default, {}));
}
// Wait for body
if (document.body) {
    mount();
}
else {
    document.addEventListener('DOMContentLoaded', mount);
}
//# sourceMappingURL=index.js.map