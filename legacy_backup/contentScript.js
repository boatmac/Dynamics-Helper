// Expose test function globally FIRST - try both window and top
try {
  window.__DH_testTextAreaSearch = function() {
  console.log("[DH TEST] Manual search triggered");
  console.log("[DH TEST] Looking for textarea with id: sapTextAreaId");
  
  const el = document.getElementById("sapTextAreaId");
  console.log("[DH TEST] Found element:", el);
  
  if (el) {
    console.log("[DH TEST] Element tag:", el.tagName);
    console.log("[DH TEST] Element type:", el.type);
    console.log("[DH TEST] Element value:", el.value);
    console.log("[DH TEST] Element text:", el.textContent);
  } else {
    console.log("[DH TEST] Element with id 'sapTextAreaId' NOT FOUND");
  }
  
  // Search all textareas
  const allTextareas = document.querySelectorAll("textarea");
  console.log("[DH TEST] All textareas on page:", allTextareas.length);
  allTextareas.forEach((ta, i) => {
    console.log(`[DH TEST] Textarea ${i}:`, {
      id: ta.id,
      name: ta.name,
      className: ta.className,
      valueLength: (ta.value || "").length,
      valuePreview: (ta.value || "").substring(0, 100)
    });
  });
  
  // Also check for elements with similar IDs
  const allElements = document.querySelectorAll("[id*='sap'], [id*='SAP'], [id*='text'], [id*='area']");
  console.log("[DH TEST] Elements with sap/text/area in ID:", allElements.length);
  allElements.forEach((elem, i) => {
    if (i < 20) { // Limit to first 20
      console.log(`[DH TEST] Element ${i}:`, {
        id: elem.id,
        tag: elem.tagName,
        type: elem.type
      });
    }
  });
  
  return { element: el, totalTextareas: allTextareas.length };
  };
  if (window.top && window.top !== window) {
    try { window.top.__DH_testTextAreaSearch = window.__DH_testTextAreaSearch; } catch (_) {}
  }
  console.log("[DH] Test function registered: window.__DH_testTextAreaSearch()");
} catch (e) {
  console.error("[DH] Failed to register test function:", e);
}

(() => {
  console.log("[DH] Content script loaded on:", window.location.href);
  console.log("[DH] Script start time:", new Date().toISOString());
  
  try {
    // Guard against running in iframes
    if (window.top !== window.self) {
      console.log("[DH] Running in iframe, exiting");
      return;
    }

    console.log("[DH] Main frame detected, continuing initialization");

    const CONTAINER_ID = "dh-container";

    // Singleton mount: do not mount twice
    if (document.getElementById(CONTAINER_ID)) {
      console.log("[DH] Container already exists, skipping duplicate mount");
      return;
    }

    console.log("[DH] Starting mount process...");

    // Clipboard monitoring for Azure Resources
    let lastClipboardContent = "";

    function parseAzureResourceId(text) {
      // Regex to match Azure Resource ID
      // /subscriptions/{sub}/resourceGroups/{rg}/providers/{providerNamespace}/{resourceType}/{resourceName}
      const regex = /subscriptions\/([^\/]+)\/resourceGroups\/([^\/]+)\/providers\/([^\/]+)\/([^\/]+)\/([^\/]+)/i;
      const match = text.match(regex);
      
      if (match) {
        return {
          subscription: match[1],
          resourceGroup: match[2],
          provider: `${match[3]}/${match[4]}`,
          resourceName: match[5]
        };
      }
      return null;
    }

    async function checkClipboard() {
      if (!document.hasFocus()) return;

      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboardContent) {
          lastClipboardContent = text;
          const azureResource = parseAzureResourceId(text);
          
          if (azureResource) {
            const msg = `Azure Resource Detected:\n\nSubscription: ${azureResource.subscription}\nResource Group: ${azureResource.resourceGroup}\nProvider: ${azureResource.provider}\nName: ${azureResource.resourceName}`;
            showNotification(msg, 'info');
            console.log("[DH] Azure Resource found in clipboard:", azureResource);
          }
        }
      } catch (err) {
        // Clipboard access denied or other error
      }
    }

    function startClipboardListener() {
      // Check every 2 seconds
      setInterval(checkClipboard, 2000);
      
      // Also check on window focus
      window.addEventListener("focus", checkClipboard);
    }

      const mount = async () => {
      if (!document.body) {
        setTimeout(mount, 50);
        return;
      }

      startClipboardListener();

      // Container
      const container = document.createElement("div");
      container.id = CONTAINER_ID;
      container.className = "dh-container";
      container.setAttribute("role", "region");
      container.setAttribute("aria-label", "Dynamics Helper");

      // Floating Button
      const button = document.createElement("button");
      button.className = "dh-btn";
      button.type = "button";
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", "Open helper menu");
      button.setAttribute("aria-expanded", "false");
      button.tabIndex = 0;
      button.textContent = "DH";

      // Menu
      const menu = document.createElement("div");
      menu.className = "dh-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-hidden", "true");

      // Preferences and items loading (storage first, then packaged fallback)
      const defaults = { buttonText: "DH", primaryColor: "#2563eb", offsetBottom: 24, offsetRight: 24 };
      function mergePrefs(p) {
        return {
          buttonText: p && typeof p.buttonText === "string" && p.buttonText.trim() ? p.buttonText.trim() : defaults.buttonText,
          primaryColor: p && typeof p.primaryColor === "string" && p.primaryColor ? p.primaryColor : defaults.primaryColor,
          offsetBottom: p && Number.isFinite(Number(p.offsetBottom)) ? Number(p.offsetBottom) : defaults.offsetBottom,
          offsetRight: p && Number.isFinite(Number(p.offsetRight)) ? Number(p.offsetRight) : defaults.offsetRight,
        };
      }
      async function loadPrefs() {
        try {
          if (chrome?.storage?.local) {
            const obj = await new Promise((resolve) => {
              try { chrome.storage.local.get("dh_prefs", (res) => resolve(res || {})); } catch (_) { resolve({}); }
            });
            return mergePrefs(obj?.dh_prefs || {});
          }
        } catch (_) {}
        return { ...defaults };
      }

      const navStack = [];
      async function loadItems() {
        // 1) Try stored items
        try {
          if (chrome?.storage?.local) {
            const obj = await new Promise((resolve) => {
              try { chrome.storage.local.get("dh_items", (res) => resolve(res || {})); } catch (_) { resolve({}); }
            });
            if (Array.isArray(obj?.dh_items)) return obj.dh_items;
          }
        } catch (_) {}
        // 2) Fallback to packaged items.json
        try {
          const url = chrome.runtime?.getURL ? chrome.runtime.getURL("items.json") : "items.json";
          const res = await fetch(url, { cache: "no-cache" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        } catch (err) {
          console.warn("[Dynamics Helper] Failed to load items.json:", err);
          // 3) Last resort: demo items
          return [
            { type: "folder", label: "Favorites", children: [
              { type: "link", label: "Dynamics Admin Center", url: "https://admin.powerplatform.microsoft.com/" },
              { type: "markdown", label: "Tips", content: "Use Ctrl+S often. Keep entities tidy." }
            ]},
            { type: "link", label: "Docs", url: "https://learn.microsoft.com/dynamics365/" },
            { type: "markdown", label: "About", content: "# Dynamics Helper\nA quick launcher panel." }
          ];
        }
      }

      function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

      function createItemEl(label, onActivate, opts = {}) {
        const item = document.createElement("div");
        item.className = "dh-item";
        item.setAttribute("role", "menuitem");
        if (opts.type === "folder") {
          item.setAttribute("aria-haspopup", "menu");
        }
        if (opts.type) {
          item.dataset.type = opts.type;
        }
        item.tabIndex = 0;
        const icon = opts.icon ? opts.icon + " " : "";
        item.textContent = icon + label;
        // Prevent document-level click handler from firing after re-render by stopping propagation
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          onActivate(e);
        });
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onActivate(e);
          }
        });
        return item;
      }

      function showMarkdownModal(markdown) {
        try {
          // Simple modal (no external libs). Very light Markdown: only line breaks and basic headings.
          const overlay = document.createElement("div");
          overlay.className = "dh-modal-overlay";
          const modal = document.createElement("div");
          modal.className = "dh-modal";
          const close = document.createElement("button");
          close.className = "dh-modal-close";
          close.type = "button";
          close.textContent = "×";
          close.setAttribute("aria-label", "Close");

          const content = document.createElement("div");
          content.className = "dh-modal-content";
          // naive markdown: convert headings starting '# ' and newlines to <br>
          const html = (markdown || "")
            .replace(/^### (.*$)/gim, "<h3>$1<\/h3>")
            .replace(/^## (.*$)/gim, "<h2>$1<\/h2>")
            .replace(/^# (.*$)/gim, "<h1>$1<\/h1>")
            .replace(/\*\*(.*?)\*\*/gim, "<strong>$1<\/strong>")
            .replace(/\*(.*?)\*/gim, "<em>$1<\/em>")
            .replace(/\n/g, "<br/>");
          content.innerHTML = html;

          function remove() { overlay.remove(); }
          close.addEventListener("click", remove);
          overlay.addEventListener("click", (e) => { if (e.target === overlay) remove(); });
          document.addEventListener("keydown", function onEsc(e) {
            if (e.key === "Escape") { remove(); document.removeEventListener("keydown", onEsc); }
          });

          modal.appendChild(close);
          modal.appendChild(content);
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
        } catch (_) {}
      }

      function applyPrefs(p) {
        try {
          button.textContent = p.buttonText || defaults.buttonText;
          button.style.background = p.primaryColor || defaults.primaryColor;
          container.style.bottom = (p.offsetBottom ?? defaults.offsetBottom) + "px";
          container.style.right = (p.offsetRight ?? defaults.offsetRight) + "px";
        } catch (_) {}
      }

      let isOpen = false;

      function ensureMenuOpen() {
        if (!isOpen) {
          isOpen = true;
          container.classList.add("dh-open");
          button.setAttribute("aria-expanded", "true");
          menu.setAttribute("aria-hidden", "false");
        }
      }

      function getEntryType(entry) {
        const t = (entry && entry.type ? String(entry.type) : "").toLowerCase();
        if (t) return t;
        if (entry && Array.isArray(entry.children)) return "folder";
        if (entry && typeof entry.url === "string") return "link";
        if (entry && typeof entry.content === "string") return "markdown";
        return "unknown";
      }

      // Dynamic URL resolution with placeholder support ("%s")
      async function resolveDynamicUrl(rawUrl) {
        try {
          if (!rawUrl || typeof rawUrl !== "string" || rawUrl.indexOf("%s") === -1) {
            return rawUrl;
          }
          const u = new URL(rawUrl, location.href);
          const sp = u.searchParams;
          const keys = [];
          sp.forEach((v, k) => {
            if (typeof v === "string" && v.includes("%s")) keys.push(k);
          });
          for (const key of keys) {
            const resolver = getParamResolver(key);
            if (resolver) {
              const real = await resolver();
              if (!real) {
                showToast(`No value found for parameter "${key}"`);
                return null;
              }
              const current = sp.get(key) || "";
              sp.set(key, current.replaceAll("%s", real));
            }
          }
          return u.toString();
        } catch (_) {
          return rawUrl;
        }
      }

      function getParamResolver(name) {
        switch (String(name || "").toLowerCase()) {
          case "sr":
            return extractSixteenDigitFromPage;
          default:
            return null;
        }
      }

      function extractSixteenDigitFromPage() {
        try {
          const body = document.body;
          if (!body) return null;
          const text = body.innerText || "";
          if (!text) return null;
          const lower = text.toLowerCase();
          const anchors = ["case number / service name", "case number", "service name"];
          for (const a of anchors) {
            const idx = lower.indexOf(a);
            if (idx !== -1) {
              const start = Math.max(0, idx - 300);
              const end = Math.min(text.length, idx + 300);
              const nearby = text.slice(start, end);
              const m = nearby.match(/\b\d{16}\b/);
              if (m) return m[0];
            }
          }
          const m2 = text.match(/\b\d{16}\b/);
          return m2 ? m2[0] : null;
        } catch (_) {
          return null;
        }
      }

      function renderMenu(items) {
        clear(menu);
        if (navStack.length) {
          const back = createItemEl("Back", () => {
            navStack.pop();
            renderMenu(navStack.length ? navStack[navStack.length - 1] : rootItems);
          }, { type: "back" });
          menu.appendChild(back);
        }
        (items || []).forEach((entry) => {
          const t = getEntryType(entry);
          const label = entry.label || "(no label)";
          const icon = t === "folder" ? "📁" : t === "link" ? "🔗" : t === "markdown" ? "📝" : "❓";

          if (t === "folder") {
            const el = createItemEl(label, () => {
              navStack.push(entry.children || []);
              renderMenu(entry.children || []);
              ensureMenuOpen(); // keep menu open when navigating into folder
            }, { icon, type: "folder" });
            menu.appendChild(el);
          } else if (t === "link") {
            const el = createItemEl(label, async () => {
              try {
                const target = entry.target || "_blank";
                const resolved = await resolveDynamicUrl(entry.url);
                if (!resolved) return; // toast already shown if missing value
                window.open(resolved, target, "noopener,noreferrer");
              } catch (_) {}
              showToast(`${label}`);
              closeMenu();
            }, { icon, type: "link" });
            menu.appendChild(el);
          } else if (t === "markdown") {
            const el = createItemEl(label, () => {
              closeMenu();
              showMarkdownModal(entry.content || "");
            }, { icon, type: "markdown" });
            menu.appendChild(el);
          } else {
            const el = createItemEl(label, () => {
              showToast(`${label}`);
              closeMenu();
            }, { icon, type: t });
            menu.appendChild(el);
          }
        });
      }

      let rootItems = [];
      loadItems().then((data) => {
        rootItems = data;
        navStack.length = 0;
        renderMenu(rootItems);
      });

      container.appendChild(button);
      container.appendChild(menu);
      document.body.appendChild(container);

      // Load and apply preferences
      try {
        const prefs = await loadPrefs();
        applyPrefs(prefs);
      } catch (_) {}

      const openMenu = () => {
        if (isOpen) return;
        isOpen = true;
        container.classList.add("dh-open");
        button.setAttribute("aria-expanded", "true");
        menu.setAttribute("aria-hidden", "false");
      };

      const closeMenu = () => {
        if (!isOpen) return;
        isOpen = false;
        container.classList.remove("dh-open");
        button.setAttribute("aria-expanded", "false");
        menu.setAttribute("aria-hidden", "true");
      };

      const toggleMenu = () => {
        if (isOpen) closeMenu();
        else openMenu();
      };

      button.addEventListener("click", toggleMenu);

      // Keyboard: Enter/Space toggles, Escape closes
      button.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleMenu();
        } else if (e.key === "Escape") {
          closeMenu();
        }
      });

      // Track hover inside floating UI and close shortly after leaving it
      let hoverInside = false;
      let closeTimer = null;
      const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
      const scheduleClose = () => {
        cancelClose();
        closeTimer = setTimeout(() => {
          if (!hoverInside) closeMenu();
        }, 180);
      };
      const onEnter = () => { hoverInside = true; cancelClose(); };
      const onLeave = () => { hoverInside = false; scheduleClose(); };

      button.addEventListener("pointerenter", onEnter);
      button.addEventListener("pointerleave", onLeave);
      menu.addEventListener("pointerenter", onEnter);
      menu.addEventListener("pointerleave", onLeave);

      // Escape closes menu
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeMenu();
        }
      });

      // Listen for storage changes to update UI live
      try {
        if (chrome?.storage?.onChanged?.addListener) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local") {
              if (changes?.dh_prefs) {
                const p = mergePrefs(changes.dh_prefs.newValue || {});
                applyPrefs(p);
              }
              if (changes?.dh_items) {
                const v = changes.dh_items.newValue;
                if (Array.isArray(v)) {
                  rootItems = v;
                  navStack.length = 0;
                  renderMenu(rootItems);
                }
              }
            }
          });
        }
      } catch (_) {}

      console.log("[DH] About to call setupSapTextAreaWatcher()...");
      setupSapTextAreaWatcher();
      console.log("[DH] setupSapTextAreaWatcher() completed");

      console.log("[DH] Floating UI mounted successfully!");
    };

    function setupSapTextAreaWatcher() {
      try {
        const TARGET_ID = "sapTextAreaId";
        const KEYWORD = "Azure/Mooncake Support Escalation";
        const monitoredElements = new WeakSet(); // Track which elements we've set up monitoring for
        const checkedElements = new WeakMap(); // Track last checked values

        console.log("[DH] SAP TextArea Watcher initialized for dynamic tabs, looking for:", TARGET_ID);

        function highlight(el) {
          if (!el) return;
          console.log("[DH] Applying RED highlight to element:", el);
          el.style.cssText += "; outline: 4px solid #dc2626 !important; outline-offset: 2px !important; background-color: #fef2f2 !important; border: 3px solid #ef4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.2) !important; animation: dh-pulse 2s infinite !important;";
          try {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          } catch (_) {}
        }

        const detectedElements = new WeakSet(); // Track elements where keyword was detected

        function checkValue(el) {
          try {
            // Skip if already detected for this element
            if (detectedElements.has(el)) {
              return true;
            }

            const value = el.value != null ? String(el.value) : String(el.textContent || "");
            
            if (value.includes(KEYWORD)) {
              console.log("[DH] ✓✓✓ KEYWORD DETECTED! ✓✓✓");
              detectedElements.add(el); // Mark as detected
              highlight(el);
              showNotification(`⚠️ Azure/Mooncake Support Escalation Detected!`);
              showToast(`Detected "${KEYWORD}"`);
              return true;
            }
            return false;
          } catch (e) {
            console.error("[DH] Error checking value:", e);
            return false;
          }
        }

        function setupMonitoring(el) {
          // Check if we've already set up monitoring for this element
          if (monitoredElements.has(el)) {
            console.log("[DH] Already monitoring this element, re-checking value");
            checkValue(el);
            return;
          }
          
          monitoredElements.add(el);
          console.log("[DH] Setting up NEW monitoring on element:", el.id);
          
          // Check immediately
          if (checkValue(el)) return;
          
          // Show blue outline to indicate found
          el.style.outline = "2px dashed #3b82f6";
          showToast("Monitoring textarea for keyword...");
          
          // Listen to multiple events
          ["input", "change", "blur", "paste", "focus"].forEach(eventType => {
            el.addEventListener(eventType, function() {
              console.log(`[DH] Event '${eventType}' triggered on`, el.id);
              checkValue(el);
            });
          });
          
          // Poll every 3 seconds while element is in DOM
          let pollCount = 0;
          const pollInterval = setInterval(() => {
            try {
              // Check if element still in DOM
              if (!document.contains(el)) {
                console.log("[DH] Element removed from DOM, stopping poll");
                clearInterval(pollInterval);
                return;
              }
              
              // Stop if keyword already detected for this element
              if (detectedElements.has(el)) {
                console.log("[DH] Keyword already detected, stopping poll");
                clearInterval(pollInterval);
                return;
              }
              
              pollCount++;
              const currentValue = el.value || "";
              const lastValue = checkedElements.get(el) || "";
              
              if (currentValue !== lastValue) {
                console.log("[DH] Value changed in poll #" + pollCount);
                checkedElements.set(el, currentValue);
                if (checkValue(el)) {
                  clearInterval(pollInterval);
                  return;
                }
              }
              
              if (pollCount >= 100) { // ~5 minutes
                clearInterval(pollInterval);
                console.log("[DH] Stopped polling after 100 checks");
              }
            } catch (e) {
              console.error("[DH] Error in poll:", e);
              clearInterval(pollInterval);
            }
          }, 3000);
        }

        function findTextarea() {
          let foundAny = false;

          // Method 1: Direct getElementById
          let el = document.getElementById(TARGET_ID);
          if (el && el.tagName === "TEXTAREA") {
            console.log("[DH] ✓ Found via getElementById!");
            setupMonitoring(el);
            foundAny = true;
          }

          // Method 2: Query all textareas and check IDs (might find multiple in different tabs)
          const allTextareas = document.querySelectorAll("textarea");
          for (const ta of allTextareas) {
            if (ta.id === TARGET_ID) {
              if (!monitoredElements.has(ta)) {
                console.log("[DH] ✓ Found new instance via querySelectorAll!");
                setupMonitoring(ta);
              }
              foundAny = true;
            }
          }

          // Method 3: Check in shadow DOMs
          const allElements = document.querySelectorAll("*");
          for (const elem of allElements) {
            if (elem.shadowRoot) {
              const shadowTextarea = elem.shadowRoot.getElementById(TARGET_ID);
              if (shadowTextarea && shadowTextarea.tagName === "TEXTAREA") {
                if (!monitoredElements.has(shadowTextarea)) {
                  console.log("[DH] ✓ Found new instance in shadow DOM!");
                  setupMonitoring(shadowTextarea);
                }
                foundAny = true;
              }
            }
          }

          return foundAny;
        }

        // Try immediately and repeatedly
        console.log("[DH] Starting continuous search for dynamic tabs...");
        
        // Initial attempts with delays (sometimes DOM isn't ready)
        const initialChecks = [0, 100, 500, 1000, 2000, 3000];
        initialChecks.forEach(delay => {
          setTimeout(() => {
            console.log(`[DH] Initial check at ${delay}ms`);
            findTextarea();
          }, delay);
        });

        // Start mutation observer - throttled to avoid performance issues
        if (document.body && window.MutationObserver) {
          let mutationTimeout = null;
          const observer = new MutationObserver((mutations) => {
            // Throttle: only check once per 500ms even if many mutations occur
            if (mutationTimeout) return;
            
            mutationTimeout = setTimeout(() => {
              mutationTimeout = null;
              findTextarea();
            }, 500);
          });

          observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['id', 'aria-selected', 'data-is-focusable']
          });

          console.log("[DH] MutationObserver started - throttled monitoring for tab changes");
        }

        // Also watch for tab clicks specifically
        document.addEventListener('click', function(e) {
          const target = e.target;
          if (target && target.getAttribute) {
            const role = target.getAttribute('role');
            const ariaLabel = target.getAttribute('aria-label');
            
            // Detect tab clicks
            if (role === 'tab' || target.closest('[role="tab"]')) {
              console.log("[DH] Tab click detected, searching for textarea...");
              setTimeout(() => findTextarea(), 100);
              setTimeout(() => findTextarea(), 500);
              setTimeout(() => findTextarea(), 1000);
            }
            
            // Detect session-id clicks
            if (target.id && target.id.includes('session-id')) {
              console.log("[DH] Session tab detected, searching for textarea...");
              setTimeout(() => findTextarea(), 100);
              setTimeout(() => findTextarea(), 500);
              setTimeout(() => findTextarea(), 1000);
            }
          }
        }, true);

        // Periodic interval check every 5 seconds (keep searching for new tabs)
        const intervalCheck = setInterval(() => {
          try {
            console.log("[DH] Periodic search for textareas...");
            findTextarea();
          } catch (e) {
            console.error("[DH] Error in interval check:", e);
          }
        }, 5000);

        console.log("[DH] Continuous monitoring active - will detect textareas in new/switched tabs");

      } catch (e) {
        console.error("[DH] Error in setupSapTextAreaWatcher:", e);
      }
    }

    function showToast(text) {
      try {
        const existing = document.querySelector(".dh-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "dh-toast";
        toast.textContent = text;
        document.body.appendChild(toast);

        // Auto-hide with a simple fade
        setTimeout(() => {
          toast.classList.add("dh-toast-hide");
        }, 1500);
        setTimeout(() => {
          toast.remove();
        }, 2200);
      } catch (_) {
        // Non-blocking
      }
    }

    function showNotification(text, type = 'error') {
      try {
        const existing = document.querySelector(".dh-notification");
        if (existing) existing.remove();

        const notification = document.createElement("div");
        notification.className = "dh-notification";
        if (type === 'info') {
          notification.classList.add("dh-notification-info");
        }
        
        const icon = document.createElement("span");
        icon.className = "dh-notification-icon";
        icon.textContent = type === 'info' ? "📋" : "⚠️";
        
        const message = document.createElement("span");
        message.textContent = text.replace("⚠️ ", "");
        
        notification.appendChild(icon);
        notification.appendChild(message);
        document.body.appendChild(notification);

        // Auto-hide after 8 seconds
        setTimeout(() => {
          notification.style.opacity = "0";
          notification.style.transform = "translateX(-50%) translateY(-20px)";
          notification.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        }, 8000);
        setTimeout(() => {
          notification.remove();
        }, 8500);
      } catch (_) {
        // Non-blocking
      }
    }

    mount();

  } catch (err) {
    console.error("[DH] Initialization error:", err);
    console.error("[DH] Error stack:", err.stack);
  }
})();
