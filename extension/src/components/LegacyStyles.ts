// Imports from legacy CSS logic to ensure 1:1 match
// import { css } from 'styled-components'; // Conceptual, using raw string for Shadow DOM

export const LEGACY_CSS = `
/* Dynamics Helper - isolated styles with \`dh-\` prefix to avoid collisions */
.dh-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647; /* ensure above Dynamics overlays */
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Segoe UI Emoji", "Segoe UI Symbol";
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none; /* Let clicks pass through container, children re-enable */
}

/* Floating button */
.dh-btn {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #2563eb; /* blue */
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
  pointer-events: auto; /* Re-enable clicks */
  font-size: 16px;
  z-index: 2;
}

.dh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.18), 0 3px 8px rgba(0,0,0,0.14);
  background: #1e56d6;
}

.dh-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.12);
  background: #184abe;
}

.dh-btn:focus {
  outline: 3px solid rgba(37, 99, 235, 0.35);
  outline-offset: 2px;
}

/* Menu panel */
.dh-menu {
  position: absolute;
  right: 0;
  bottom: 60px; /* show above the button */
  min-width: 220px;
  max-width: 280px;
  background: #ffffff;
  color: #1f2937; /* gray-800 */
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.12);
  padding: 8px;
  display: block; /* Managed by React */
  pointer-events: auto; /* Re-enable clicks */
  margin-bottom: 8px;
  animation: dh-fade-in-up 0.2s ease-out;
}

@keyframes dh-fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Menu items */
.dh-item {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.25;
  user-select: none;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  display: flex;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  width: 100%;
  color: inherit;
}

.dh-item-icon {
    margin-right: 8px;
    font-size: 16px;
    width: 20px;
    text-align: center;
}

.dh-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dh-item:hover {
  background: #f3f6fb;
}

.dh-item:active {
  background: #e9eef8;
}

.dh-item:focus {
  outline: 2px solid rgba(37, 99, 235, 0.45);
  outline-offset: 2px;
}

/* Type affordances */
.dh-item[data-type="folder"]::after {
  content: '›';
  float: right;
  color: #6b7280; /* gray-500 */
  font-weight: 700;
  margin-left: 8px;
}

.dh-item[data-type="back"] {
  color: #374151; /* gray-700 */
  border-bottom: 1px solid #eee;
  margin-bottom: 4px;
  padding-bottom: 8px;
}

.dh-item[data-type="back"] .dh-item-icon {
    display: none;
}
.dh-item[data-type="back"]::before {
  content: '← ';
  margin-right: 8px;
  font-weight: bold;
}

/* Header actions */
.dh-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px 8px 8px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 4px;
}
.dh-title {
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.dh-settings-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;
    color: #9ca3af;
}
.dh-settings-btn:hover {
    background: #f3f4f6;
    color: #4b5563;
}
`;
