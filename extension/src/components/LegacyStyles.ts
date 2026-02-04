// Imports from legacy CSS logic to ensure 1:1 match
// import { css } from 'styled-components'; // Conceptual, using raw string for Shadow DOM

export const LEGACY_CSS = `
/* Dynamics Helper - isolated styles with \`dh-\` prefix to avoid collisions */

/* Import font */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

.dh-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647; /* ensure above Dynamics overlays */
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Segoe UI Emoji", "Segoe UI Symbol";
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
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0D9488; /* Primary Teal */
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto; /* Re-enable clicks */
  font-size: 16px;
  z-index: 2;
}

.dh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  background: #0F766E; /* Darker Teal */
}

.dh-btn:active {
  transform: translateY(0);
  background: #115E59;
}

.dh-btn:focus-visible {
  outline: 2px solid #0D9488;
  outline-offset: 2px;
}

/* Menu panel */
.dh-menu {
  position: absolute;
  right: 0;
  bottom: 72px; /* show above the button */
  min-width: 280px;
  max-width: 320px;
  background: #ffffff;
  color: #134E4A; /* Dark Teal Text */
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 0;
  display: block; /* Managed by React */
  pointer-events: auto; /* Re-enable clicks */
  margin-bottom: 8px;
  animation: dh-fade-in-up 0.2s ease-out;
  overflow: hidden;
}

@keyframes dh-fade-in-up {
    from { opacity: 0; transform: translateY(10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Menu items */
.dh-item {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  user-select: none;
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  text-align: left;
  border: none;
  background: transparent;
  width: 100%;
  color: #334155;
  font-weight: 500;
}

.dh-item-icon {
  margin-right: 12px;
  font-size: 18px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0D9488;
}

.dh-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dh-item:hover {
  background: #F0FDFA; /* Light Teal bg */
  color: #0F766E;
}

.dh-item:active {
  background: #CCFBF1;
}

.dh-item:focus-visible {
  outline: 2px solid #0D9488;
  outline-offset: -2px;
  background: #F0FDFA;
}

/* Type affordances */
.dh-item[data-type="folder"]::after {
  content: '›';
  float: right;
  color: #94A3B8; /* slate-400 */
  font-weight: 600;
  margin-left: 8px;
  font-size: 18px;
}

/* Header actions */
.dh-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #F8FAFC;
    border-bottom: 1px solid #F1F5F9;
}

.dh-title {
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
    letter-spacing: -0.01em;
}

.dh-settings-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    color: #64748B;
    transition: all 150ms;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dh-settings-btn:hover {
    background: #E2E8F0;
    color: #0F172A;
}

/* Back button specific */
.dh-back-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    margin-right: 8px;
    border-radius: 4px;
    color: #64748B;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dh-back-btn:hover {
    background: #E2E8F0;
    color: #0F172A;
}

/* AI Tools Footer */
.dh-footer {
    border-top: 1px solid #F1F5F9;
    padding: 12px;
    background: #F8FAFC;
}

.dh-context-box {
    margin-bottom: 12px;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow: hidden;
    background: #FFFFFF;
}

.dh-context-header {
    padding: 8px 12px;
    background: #F1F5F9;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #475569;
    font-weight: 600;
    transition: background 150ms;
}

.dh-context-header:hover {
    background: #E2E8F0;
}

.dh-textarea {
    width: 100%;
    min-height: 120px;
    font-size: 12px;
    line-height: 1.6;
    padding: 8px 12px;
    border: none;
    color: #334155;
    resize: vertical;
    font-family: monospace;
    background: #FFFFFF;
    outline: none;
}

.dh-textarea:focus {
    background: #F8FAFC;
}

/* Action Buttons Container - ensures proper spacing */
.dh-actions-row {
    display: flex;
    gap: 8px;
    position: relative; /* important for tooltip positioning contexts */
}

/* Action Buttons */
.dh-action-btn {
    flex: 1;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 150ms;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.dh-btn-secondary {
    background: #FFFFFF;
    border-color: #E2E8F0;
    color: #475569;
}

.dh-btn-secondary:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    color: #0F172A;
}

.dh-btn-primary {
    background: #0D9488;
    color: #FFFFFF;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dh-btn-primary:hover {
    background: #0F766E;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dh-btn-primary:disabled {
    background: #94A3B8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

/* Error Message */
.dh-error-msg {
    margin-top: 12px;
    padding: 8px 12px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
    border-radius: 6px;
    font-size: 11px;
    line-height: 1.4;
    display: flex;
    gap: 6px;
    align-items: flex-start;
}

/* Status Bar (Unified) */
.dh-status-bar {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 11px;
    line-height: 1.4;
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 500;
}

.dh-status-bar.error {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
}

.dh-status-bar.running {
    background: #FFFBEB; /* Amber-50 */
    border: 1px solid #FDE68A;
    color: #B45309; /* Amber-700 */
}

.dh-status-bar.info {
    background: #F0FDFA; /* Teal-50 */
    border: 1px solid #CCFBF1;
    color: #0F766E; /* Teal-700 */
}

/* Status Bubble for Main FAB */
.dh-status-bubble {
    position: absolute;
    bottom: 72px; /* Similar to menu bottom */
    right: 0;
    background: #1E293B;
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 2147483646; /* Just below menu/popover */
}

.dh-status-bubble.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.dh-status-bubble.success {
    background: #0D9488; /* Teal */
}

.dh-status-bubble.error {
    background: #DC2626; /* Red */
}
`;
