Dynamics Helper Edge/Chrome Extension

Overview
- Manifest V3 Chromium extension targeting https://onesupport.crm.dynamics.com/*
- Injects a floating button (bottom-right). Clicking toggles a menu rendered from configurable items.
- Options page lets you customize UI preferences and edit items (overrides packaged items.json via chrome.storage).
- Minimal permissions: only "storage" in addition to content scripts.

Files
- manifest.json
- contentScript.js
- contentStyle.css
- items.json (packaged default items; read-only at runtime)
- options.html (Options UI)
- options.js (Options logic: load/save to chrome.storage, import/export)
- icons/
  - README.md
  - 16.png, 32.png, 48.png, 128.png (placeholders or branded icons)

Key Implementation Notes
- Guard against iframes: content script exits if window.top !== window.self.
- Singleton mount: only one container is added; re-runs do nothing.
- Unique class prefixes: dh-container, dh-btn, dh-menu, dh-item, dh-toast to avoid Dynamics CSS conflicts.
- z-index: 2147483647 for visibility above CRM overlays.
- Accessibility basics: role="button", role="menu", keyboard toggle (Enter/Space opens/closes; Escape closes).
- Items source resolution order in contentScript.js:
  1) chrome.storage.local.dh_items (if present)
  2) Packaged items.json via chrome.runtime.getURL('items.json')
  3) Hardcoded demo fallback
- Preferences (chrome.storage.local.dh_prefs) affect:
  - Button text (default "DH")
  - Primary color (button background)
  - Button position: bottom/right offsets (px)
- Live updates: content script listens for chrome.storage.onChanged to re-apply preferences and re-render items instantly.

Options Page
- Open: Edge/Chrome > Extensions > Details on "Dynamics Helper" > Extension options
- UI Preferences
  - Button Text
  - Primary Color
  - Position: Bottom and Right offsets (px)
  - Save Preferences or Reset to Defaults
- Items Configuration
  - A textarea to edit items JSON directly
  - Import JSON (from file)
  - Export JSON (download current content)
  - Load from packaged items.json (copy defaults into the editor)
  - Clear Stored Items (removes override; extension falls back to packaged items.json)

Important: Editing items.json
- Browser extensions cannot modify packaged files at runtime.
- This options page saves your edited items to chrome.storage.local as an override (dh_items).
- The content script will prefer stored dh_items; if absent, it loads the packaged items.json.

Install in Microsoft Edge (Load Unpacked)
1) Open Edge and navigate to: edge://extensions
2) Enable Developer mode (toggle at the bottom-left).
3) Click the “Load unpacked” button.
4) Select the folder containing this extension (the directory with manifest.json).
5) Confirm the extension appears in the list, with name “Dynamics Helper”.

Testing
1) Navigate to: https://onesupport.crm.dynamics.com/
2) Verify a circular button appears at bottom-right with configured text.
3) Click the button to toggle the menu. Confirm items render from stored overrides if set; otherwise from packaged items.json.
4) Options:
   - Open the Options page (Extensions > Details > Extension options).
   - Change Button Text / Primary Color / Position, click Save. Switch back to the Dynamics tab and see changes instantly.
   - Paste new items JSON into the Items area and Save Items. Switch back to the Dynamics tab; menu re-renders immediately.
   - Use Import/Export to move item sets between machines.
5) Keyboard: Enter/Space to toggle; Escape to close; Back item navigates up within folders.

Icons
- Place PNG icons at exact sizes in icons/ as:
  - icons/16.png
  - icons/32.png
  - icons/48.png
  - icons/128.png
- The manifest already references these icon paths.

Troubleshooting
- Button not visible:
  - Ensure page URL matches https://onesupport.crm.dynamics.com/*
  - Confirm Developer mode is enabled and extension is loaded.
  - Check console for “[Dynamics Helper] Floating UI mounted.” from the content script.
  - Verify no errors related to CSS/JS loading in manifest.
- Items not updating after saving in Options:
  - Ensure JSON is valid. Errors show below the editor.
  - The content script listens for storage changes; reloading the Dynamics tab is usually not required.
- CSS color hover differences:
  - The primary color is applied inline to the button background; default hover/active shades may be subdued when using a custom color.
- Iframe behavior:
  - The script exits in iframes; only main/top frame injects the UI.

Uninstall/Reload
- edge://extensions -> Turn off or Remove the extension.
- To apply code changes, click the “Reload” button for the extension after editing files.
