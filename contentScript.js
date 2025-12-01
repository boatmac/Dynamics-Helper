(() => {
  try {
    // Guard against running in iframes
    if (window.top !== window.self) {
      return;
    }

    const CONTAINER_ID = "dh-container";

    // Singleton mount: do not mount twice
    if (document.getElementById(CONTAINER_ID)) {
      return;
    }

      const mount = async () => {
      if (!document.body) {
        setTimeout(mount, 50);
        return;
      }

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

      console.log("[Dynamics Helper] Floating UI mounted.");
    };

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

    mount();
  } catch (err) {
    console.warn("[Dynamics Helper] Initialization error:", err);
  }
})();
