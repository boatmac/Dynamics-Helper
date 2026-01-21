(() => {
  'use strict';

  // Guard against running in iframes
  if (window.top !== window.self) {
    return;
  }

  // Check options to see if automation is enabled (default: enabled)
  async function isAutomationEnabled() {
    try {
      const obj = await new Promise((resolve) => {
        try {
          chrome.storage.local.get('dh_prefs', (res) => resolve(res || {}));
        } catch (_) {
          resolve({});
        }
      });
      const prefs = obj.dh_prefs || {};
      return prefs.zebraAutomationEnabled !== false; // default true
    } catch (_) {
      return true;
    }
  }

  // Configuration (selectors for Fluent UI controls)
  const selectors = {
    searchInput: 'fluent-search',
    searchInputInner: 'input.control#control[type="search"]',
    searchButtonToolbar: 'fluent-toolbar',
    searchButton: 'button.control',
    fluentButton: 'fluent-button',
    dataGrid: '[aria-label="Search Results"].fluent-data-grid',
    headerCell: 'th.select-all[col-index="1"]',
    headerCellAlt: 'th.select-all',
    headerCheckbox: 'fluent-checkbox',
    headerSvg: 'svg',
    headerInnerControl: '.control, [part="control"], input, [role="checkbox"]',
    headerRoleCheckbox: '[role="checkbox"]',
    thSelector: 'th',
    submitButton: 'fluent-button#cmdSubmit',
    submitButtonControl: 'button.control',
    dataGridRow: 'fluent-data-grid-row, [role="row"]'
  };

  // Debugging helpers: enable detailed runtime logs and a small overlay
  const DEBUG = true;
  const __DH_logs = [];

  function dhPush(level, message, meta) {
    try {
      const entry = { ts: new Date().toISOString(), level: level || 'info', message };
      if (meta !== undefined) entry.meta = meta;
      __DH_logs.push(entry);
      if (level === 'error') console.error('[DH ZebraAI]', message, meta);
      else if (level === 'warn') console.warn('[DH ZebraAI]', message, meta);
      else console.log('[DH ZebraAI]', message, meta);
      if (DEBUG && typeof updateDebugOverlay === 'function') updateDebugOverlay(`${entry.ts} ${entry.level}: ${entry.message}`);
    } catch (_) {}
  }

  window.__DH_getLogs = function() {
    return __DH_logs.slice();
  };

  window.__DH_downloadLogs = function() {
    try {
      const blob = new Blob([JSON.stringify(__DH_logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dh_zebra_logs.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to download logs', e);
    }
  };

  // Bridge: allow the page console to request the content-script to download logs
  try {
    window.addEventListener('DH_REQUEST_DOWNLOAD_LOGS', function _dh_request_download_logs() {
      try {
        __DH_downloadLogs();
        dhPush('info', 'Logs download triggered by page event');
      } catch (e) {
        dhPush('warn', 'Failed to download logs from page event', { err: String(e) });
      }
    });

    // Inject a tiny script into the page context so DevTools console can call it.
    // Use a Blob -> objectURL approach to avoid CSP blocking inline scripts.
    try {
      const pageCode = `(() => {
        try {
          window.__DH_downloadLogs = function() { window.dispatchEvent(new Event('DH_REQUEST_DOWNLOAD_LOGS')); };
          console.log('DH ZebraAI: page bridge injected - __DH_downloadLogs available');
        } catch (e) { console.warn('DH ZebraAI: page bridge injection failed', e); }
      })();`;

      const blob = new Blob([pageCode], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const injector = document.createElement('script');
      injector.src = url;
      injector.onload = function() {
        try { URL.revokeObjectURL(url); } catch (_) {}
        try { injector.remove(); } catch (_) {}
      };
      (document.head || document.documentElement).appendChild(injector);
      dhPush('info', 'Injected page bridge for __DH_downloadLogs via blob');
    } catch (e) {
      dhPush('warn', 'Injection of page bridge failed', { err: String(e) });
    }
    // Also listen for postMessage from page so DevTools can trigger downloads even under strict CSP
    try {
      window.addEventListener('message', function _dh_message_listener(evt) {
        try {
          const d = evt && evt.data;
          if (!d) return;
          if (d && d.__DH === 'download_logs') {
            try {
              __DH_downloadLogs();
              dhPush('info', 'Logs download triggered via postMessage from page');
            } catch (e) {
              dhPush('warn', 'Failed to download logs via postMessage', { err: String(e) });
            }
          }
        } catch (e) {
          /* ignore */
        }
      });
      dhPush('info', 'Registered postMessage bridge for log download');
    } catch (e) {
      dhPush('warn', 'Failed to register postMessage bridge', { err: String(e) });
    }
  } catch (e) {
    /* ignore */
  }

  // small on-page overlay for quick debugging
  let __dh_overlay;
  function createDebugOverlay() {
    try {
      if (__dh_overlay) return __dh_overlay;
      const d = document.createElement('div');
      d.id = 'dh-debug-overlay';
      d.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;max-width:360px;max-height:180px;overflow:auto;background:rgba(0,0,0,0.7);color:#fff;font-size:12px;padding:8px;border-radius:6px;backdrop-filter:blur(2px);';
      d.innerText = 'DH ZebraAI: debug overlay';
      document.documentElement.appendChild(d);
      __dh_overlay = d;
      return d;
    } catch (_) { return null; }
  }

  function updateDebugOverlay(text) {
    try {
      const d = createDebugOverlay();
      if (!d) return;
      d.textContent = text || '';
    } catch (_) {}
  }

  // Function to get a parameter from the URL
  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  // Function to trigger input events
  function triggerInputEvents(inputElement, value) {
    inputElement.value = value;
    console.log('[DH ZebraAI] Setting input value:', value);

    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles: true });
    inputElement.dispatchEvent(changeEvent);
  }

  // Generic: wait for an element by selector, with timeout
  function waitForElement(selector, options = {}) {
    const { root = document, timeoutMs = 10000 } = options;
    console.log(`[DH ZebraAI] Waiting for element with selector: ${selector}`);

    return new Promise((resolve) => {
      const searchRoot = root === document ? document : root;
      const query = () => {
        try {
          return searchRoot.querySelector(selector) || null;
        } catch (_) {
          return null;
        }
      };

      const existing = query();
      if (existing) {
        console.log(`[DH ZebraAI] Element already present: ${selector}`);
        resolve(existing);
        return;
      }

      let observer;
      try {
        observer = new MutationObserver(() => {
          const found = query();
          if (found) {
            console.log(`[DH ZebraAI] Element found for selector: ${selector}`);
            try {
              observer.disconnect();
            } catch (_) {}
            resolve(found);
          }
        });
        const observeTarget =
          searchRoot === document ? document.body || document.documentElement : searchRoot;
        if (observeTarget) {
          observer.observe(observeTarget, {
            childList: true,
            subtree: true
          });
        }
      } catch (_) {
        // If observer fails, just fall back to timeout lookup
      }

      if (timeoutMs > 0) {
        setTimeout(() => {
          if (observer) {
            try {
              observer.disconnect();
            } catch (_) {}
          }
          const found = query();
          if (!found) {
            console.warn(`[DH ZebraAI] Timeout while waiting for selector: ${selector}`);
          }
          resolve(found);
        }, timeoutMs);
      }
    });
  }

  // Function to set the value in the search input
  function setValueInSearchInput(searchElement, value) {
    if (searchElement && searchElement.shadowRoot) {
      const inputElement = searchElement.shadowRoot.querySelector(selectors.searchInputInner);
      if (inputElement) {
        triggerInputEvents(inputElement, value);
      } else {
        console.error('[DH ZebraAI] Input element not found in shadow DOM');
      }
    } else {
      console.error('[DH ZebraAI] shadowRoot not found in fluent-search element');
    }
  }

  // Low-level pointer + keyboard event sequence to emulate a real user interaction
  function simulatePointerSequence(el) {
    if (!el) return;

    try {
      el.focus && el.focus();
    } catch (_) {}

    const dispatchPtrOrMouse = (type, init) => {
      try {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
          ...(init || {})
        });
        el.dispatchEvent(ev);
      } catch (_) {
        try {
          const ev = new MouseEvent(type.replace('pointer', 'mouse'), {
            bubbles: true,
            cancelable: true,
            ...(init || {})
          });
          el.dispatchEvent(ev);
        } catch (_) {}
      }
    };

    try {
      dispatchPtrOrMouse('pointerdown');
      dispatchPtrOrMouse('mousedown');
      dispatchPtrOrMouse('pointerup');
      dispatchPtrOrMouse('mouseup');
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (e) {
      console.warn('[DH ZebraAI] simulatePointerSequence: mouse sequence failed', e);
    }

    try {
      const kdown = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ' ',
        code: 'Space',
        keyCode: 32
      });
      const kup = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: ' ',
        code: 'Space',
        keyCode: 32
      });
      el.dispatchEvent(kdown);
      el.dispatchEvent(kup);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (_) {}
  }

  // Ensure a Fluent button host and its inner control are enabled
  function ensureEnabled(el) {
    if (!el) return;
    try {
      el.disabled = false;
    } catch (_) {}
    try {
      el.removeAttribute('disabled');
    } catch (_) {}
    try {
      el.setAttribute('aria-disabled', 'false');
    } catch (_) {}
    try {
      el.inert = false;
    } catch (_) {}
    try {
      el.removeAttribute('inert');
    } catch (_) {}
    try {
      if (el.style) el.style.pointerEvents = 'auto';
    } catch (_) {}
    try {
      el.tabIndex = 0;
    } catch (_) {}
  }

  // Helper: attempt multiple toggle strategies until checkbox becomes checked or attempts exhausted
  function toggleCheckboxWithRetries(host, tries = 5, delay = 200) {
    return new Promise((resolve) => {
      if (!host) return resolve(false);

      let attemptsLeft = tries;

      const checkChecked = () => {
        try {
          return (
            (host.getAttribute &&
              (host.getAttribute('aria-checked') === 'true' ||
                host.getAttribute('current-checked') === 'true')) ||
            host.checked === true ||
            host.hasAttribute('checked')
          );
        } catch (_) {
          return false;
        }
      };

      const attemptOnce = () => {
        if (checkChecked()) return resolve(true);

        // Strategy A: host.click() or dispatch click
        try {
          if (typeof host.click === 'function') {
            host.click();
            console.log('[DH ZebraAI] toggle: called host.click()');
          } else {
            host.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
            );
            console.log('[DH ZebraAI] toggle: dispatched MouseEvent to host');
          }
        } catch (_) {
          try {
            host.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
            );
          } catch (_) {}
        }

        // Strategy B: set .checked property if available
        try {
          if ('checked' in host) {
            host.checked = true;
            console.log('[DH ZebraAI] toggle: set host.checked = true');
          }
        } catch (_) {}

        // Strategy C: set attributes + aria
        try {
          host.setAttribute && host.setAttribute('aria-checked', 'true');
          host.setAttribute && host.setAttribute('current-checked', 'true');
          host.setAttribute && host.setAttribute('checked', '');
        } catch (_) {}

        // Strategy D: shadowRoot internals
        try {
          if (host.shadowRoot) {
            const inner = host.shadowRoot.querySelector(selectors.headerInnerControl) || null;
            if (inner) {
              try {
                inner.click();
                console.log('[DH ZebraAI] toggle: clicked inner control');
              } catch (_) {
                try {
                  inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  console.log('[DH ZebraAI] toggle: dispatched click to inner control');
                } catch (_) {}
              }
            } else {
              const slottedSvg =
                host.shadowRoot.querySelector('slot[name="indeterminate-indicator"] svg') ||
                host.shadowRoot.querySelector('svg');
              if (slottedSvg) {
                try {
                  slottedSvg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  console.log('[DH ZebraAI] toggle: clicked slotted svg');
                } catch (_) {}
              }
            }
          }
        } catch (e) {
          console.warn('[DH ZebraAI] toggle: shadowRoot interaction failed', e);
        }

        // Strategy E: pointer fallback
        try {
          const innerCandidate =
            (host.shadowRoot && host.shadowRoot.querySelector(selectors.headerInnerControl)) ||
            (host.querySelector &&
              host.querySelector(`${selectors.headerSvg}, ${selectors.headerRoleCheckbox}, input`));
          const targetForPointer = innerCandidate || host;
          if (targetForPointer) {
            simulatePointerSequence(targetForPointer);
            console.log('[DH ZebraAI] toggle: attempted low-level pointer/keyboard sequence');
          }
        } catch (e) {
          console.warn('[DH ZebraAI] toggle: pointer fallback failed', e);
        }

        // Notify input/change
        try {
          host.dispatchEvent && host.dispatchEvent(new Event('input', { bubbles: true }));
          host.dispatchEvent && host.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {}

        setTimeout(() => {
          if (checkChecked()) return resolve(true);
          attemptsLeft -= 1;
          if (attemptsLeft <= 0) return resolve(false);
          attemptOnce();
        }, delay);
      };

      attemptOnce();
    });
  }

  // Robust submit success detector
  // Wait for signs that the submit succeeded: href change, host removed/disabled,
  // live region success text, or a change in the data grid rows (if provided).
  function waitForSubmitSuccess(host, options = {}) {
    const { timeoutMs = 2500, startHref = location.href, dataGrid = null } = options;
    let initialRows = null;
    try {
      if (dataGrid) {
        const rows = dataGrid.querySelectorAll && dataGrid.querySelectorAll(selectors.dataGridRow);
        initialRows = rows ? rows.length : null;
      }
    } catch (_) {
      initialRows = null;
    }

    return new Promise((resolve) => {
      let done = false;
      const check = () => {
        if (done) return;
        try {
          if (location.href !== startHref) {
            done = true;
            return resolve(true);
          }
        } catch (_) {}
        try {
          if (!document.contains(host)) {
            done = true;
            return resolve(true);
          }
        } catch (_) {}
        try {
          if (host.disabled || (host.getAttribute && host.getAttribute('aria-disabled') === 'true')) {
            done = true;
            return resolve(true);
          }
        } catch (_) {}
        try {
          const live = document.querySelector('[role="status"], [aria-live]');
          if (live && /success|sent|submitted|created|completed|done|added/i.test((live.textContent || '').trim())) {
            done = true;
            return resolve(true);
          }
        } catch (_) {}

        // If a dataGrid was supplied, check if the number of rows has decreased or grid removed
        try {
          if (dataGrid) {
            if (!document.contains(dataGrid)) {
              done = true;
              return resolve(true);
            }
            if (initialRows !== null) {
              const nowRows = (dataGrid.querySelectorAll && dataGrid.querySelectorAll(selectors.dataGridRow)) || [];
              if (nowRows.length < initialRows) {
                done = true;
                return resolve(true);
              }
            }
          }
        } catch (_) {}
      };

      // initial check
      check();

      if (done) return;
      const iv = setInterval(check, 300);
      setTimeout(() => {
        try { clearInterval(iv); } catch (_) {}
        if (!done) return resolve(false);
      }, timeoutMs);
    });
  }

  async function clickSubmitWithRetries(host, tries = 3, delay = 700, context = {}) {
    if (!host) return false;
    const startHref = location.href;
    const dataGrid = context.dataGrid || null;

    for (let attempt = 1; attempt <= tries; attempt += 1) {
      try {
        ensureEnabled(host);

        // Prefer inner control first when available
        let inner = null;
        try {
          if (host && host.shadowRoot) {
            inner = host.shadowRoot.querySelector(selectors.submitButtonControl) || host.shadowRoot.querySelector('button');
          }
        } catch (_) { inner = null; }

        if (inner) {
          try {
            ensureEnabled(inner);
            inner.click();
            dhPush('info', `Submit: inner.click() attempted (attempt ${attempt})`, { inner: inner.tagName });
          } catch (e) {
            try { inner.dispatchEvent(new MouseEvent('click', { bubbles: true })); dhPush('info', `Submit: inner dispatched click (attempt ${attempt})`); }
            catch (e2) { dhPush('warn', `Submit: inner click dispatch failed (attempt ${attempt})`, { err: String(e2) }); }
          }

          // Wait to see if that was enough
          const okInner = await waitForSubmitSuccess(host, { timeoutMs: Math.max(400, Math.floor(delay * 1.2)), startHref, dataGrid });
          if (okInner) {
            dhPush('info', `Submit detected success after inner click (attempt ${attempt})`);
            return true;
          }
        } else {
          // Try host.click() as the first action if no inner control
          try {
            if (typeof host.click === 'function') {
              host.click();
              dhPush('info', `Submit: host.click() attempted (attempt ${attempt})`, { host: host.tagName });
            }
          } catch (e) {
            dhPush('warn', `Submit: host.click() threw (attempt ${attempt})`, { error: String(e) });
          }

          const okHost = await waitForSubmitSuccess(host, { timeoutMs: Math.max(400, Math.floor(delay * 1.2)), startHref, dataGrid });
          if (okHost) {
            dhPush('info', `Submit detected success after host.click() (attempt ${attempt})`);
            return true;
          }
        }

        // If we reached here, try more forceful fallbacks: pointer, keyboard, form
        try { simulatePointerSequence(host); dhPush('info', `Submit: pointer sequence attempted (attempt ${attempt})`, { host: host.tagName }); } catch (e) { dhPush('warn', `Submit: pointer sequence failed (attempt ${attempt})`, { err: String(e) }); }

        try {
          if (host && host.dispatchEvent) {
            host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
            host.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', code: 'Enter' }));
            dhPush('info', `Submit: keyboard Enter events dispatched (attempt ${attempt})`);
          }
        } catch (e) { dhPush('warn', `Submit: keyboard events failed (attempt ${attempt})`, { err: String(e) }); }

        try {
          const form = host.closest && host.closest('form');
          if (form && typeof form.requestSubmit === 'function') {
            try { form.requestSubmit(); dhPush('info', `Submit: form.requestSubmit() (attempt ${attempt})`); }
            catch (e) { dhPush('warn', `Submit: form.requestSubmit() failed (attempt ${attempt})`, { err: String(e) }); }
          }
        } catch (e) { dhPush('warn', `Submit: form submit attempt failed (attempt ${attempt})`, { err: String(e) }); }

        // Wait again for a shorter period after fallbacks
        const ok = await waitForSubmitSuccess(host, { timeoutMs: Math.max(300, Math.floor(delay * 0.8)), startHref, dataGrid });
        if (ok) {
          dhPush('info', `Submit detected success after fallback actions (attempt ${attempt})`);
          return true;
        }
      } catch (_) {}

      if (attempt >= tries) break;
      await new Promise((r) => setTimeout(r, delay));
    }
    dhPush('warn', `Submit: exhausted ${tries} attempts without detected success`);
    return false;
  }

  // Wait for rows to render in the data grid
  function waitForRows(grid, min = 1, timeoutMs = 7000) {
    return new Promise((resolve) => {
      if (!grid) return resolve(false);

      const haveRows = () => {
        try {
          const rows = grid.querySelectorAll(selectors.dataGridRow);
          return rows && rows.length >= min;
        } catch (_) {
          return false;
        }
      };

      if (haveRows()) return resolve(true);

      let obs;
      try {
        obs = new MutationObserver(() => {
          if (haveRows()) {
            try {
              obs.disconnect();
            } catch (_) {}
            resolve(true);
          }
        });
        obs.observe(grid, { childList: true, subtree: true });
      } catch (_) {
        // ignore observer failures
      }

      setTimeout(() => {
        if (obs) {
          try {
            obs.disconnect();
          } catch (_) {}
        }
        resolve(haveRows());
      }, timeoutMs);
    });
  }

  // Find the header cell that contains the "select all" checkbox
  function findHeaderCellNow(dataGrid) {
    if (!dataGrid) return null;

    // Primary selector
    let thHeader = dataGrid.querySelector(selectors.headerCell);
    if (thHeader) return thHeader;

    // Checkbox -> closest th
    const anyCheckbox = dataGrid.querySelector(selectors.headerCheckbox);
    if (anyCheckbox && anyCheckbox.closest) {
      thHeader = anyCheckbox.closest('th');
      if (thHeader) return thHeader;
    }

    // Alt header selector
    thHeader = dataGrid.querySelector(selectors.headerCellAlt);
    if (thHeader) return thHeader;

    // Fallback: scan all th for checkbox/svg/role=checkbox
    const ths = dataGrid.querySelectorAll(selectors.thSelector || 'th');
    for (const t of ths) {
      if (
        t.querySelector &&
        t.querySelector(
          `${selectors.headerCheckbox}, ${selectors.headerSvg}, ${selectors.headerRoleCheckbox}`
        )
      ) {
        return t;
      }
    }

    return null;
  }

  // Wait for header cell to appear
  function waitForHeaderCell(dataGrid, timeoutMs = 5000) {
    const existing = findHeaderCellNow(dataGrid);
    if (existing) return Promise.resolve(existing);

    console.warn(
      '[DH ZebraAI] Header cell not found yet. Observing data grid for header rendering...'
    );

    return new Promise((resolve) => {
      if (!dataGrid) return resolve(null);

      let headerObserver;
      try {
        headerObserver = new MutationObserver(() => {
          const found = findHeaderCellNow(dataGrid);
          if (found) {
            console.log('[DH ZebraAI] Header cell appeared during observation.');
            try {
              headerObserver.disconnect();
            } catch (_) {}
            resolve(found);
          }
        });
        headerObserver.observe(dataGrid, { childList: true, subtree: true });
      } catch (_) {
        // ignore observer failure; rely on timeout check
      }

      setTimeout(() => {
        if (headerObserver) {
          try {
            headerObserver.disconnect();
          } catch (_) {}
        }
        if (!document.contains(dataGrid)) return resolve(null);
        const finalCheck = findHeaderCellNow(dataGrid);
        if (finalCheck) {
          console.log('[DH ZebraAI] Header found on final check.');
          resolve(finalCheck);
        } else {
          console.error('[DH ZebraAI] Header cell still not found after waiting.');
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  // Function to find and click the search button inside a toolbar
  function findCorrectToolbar() {
    const toolbars = document.querySelectorAll(selectors.searchButtonToolbar);
    for (const toolbar of toolbars) {
      try {
        if (toolbar.shadowRoot) {
          const fluentButton = toolbar.querySelector(selectors.fluentButton);
          if (fluentButton && fluentButton.shadowRoot) {
            const searchButton = fluentButton.shadowRoot.querySelector(selectors.searchButton);
            if (searchButton && fluentButton.textContent && fluentButton.textContent.includes('Search')) {
              dhPush('info', 'Found correct fluent-toolbar containing the search button');
              return toolbar;
            }
          }
        }
      } catch (_) {}
    }
    dhPush('warn', 'Correct fluent-toolbar containing the search button not found');
    return null;
  }

  // Function to find and click the search button
  function findAndClickSearchButton() {
    const toolbarElement = findCorrectToolbar();
    if (toolbarElement) {
      const fluentButton = toolbarElement.querySelector(selectors.fluentButton);
      if (fluentButton && fluentButton.shadowRoot) {
        const searchButton = fluentButton.shadowRoot.querySelector(selectors.searchButton);
        if (searchButton) {
          dhPush('info', 'Found search button in nested shadow DOM');
          try {
            searchButton.click();
            dhPush('info', 'Clicked search button');
          } catch (e) {
            dhPush('warn', 'Failed to click search inner control', { err: String(e) });
            try { simulatePointerSequence(fluentButton); dhPush('info', 'Simulated pointer sequence for search button'); } catch (_) {}
          }
        } else {
          dhPush('warn', 'Search button not found in nested shadow DOM');
        }
      } else {
        dhPush('warn', 'fluent-button element or its shadowRoot not found');
      }
    } else {
      dhPush('warn', 'Correct fluent-toolbar not found');
    }
  }

  // Try to locate a submit/send control anywhere in the document (including inside shadow roots)
  function findSubmitHostAnywhere() {
    try {
      // 1) Direct host by id
      const hostById = document.querySelector('fluent-button#cmdSubmit');
      if (hostById) return hostById;

      // 2) Any fluent-button that contains an inner button with id or recognizable text
      const fluentButtons = Array.from(document.querySelectorAll('fluent-button'));
      for (const fb of fluentButtons) {
        try {
          if (fb.id === 'cmdSubmit') return fb;
          if (fb.shadowRoot) {
            const innerById = fb.shadowRoot.querySelector('#cmdSubmit, button#cmdSubmit');
            if (innerById) return fb;
            const innerButton = fb.shadowRoot.querySelector('button');
            if (innerButton) {
              const txt = (innerButton.textContent || '') + ' ' + (fb.textContent || '');
              if (/send|submit|create|ok|apply/i.test(txt)) return fb;
            }
          } else {
            const txt = fb.textContent || '';
            if (/send|submit|create|ok|apply/i.test(txt)) return fb;
          }
        } catch (_) {}
      }

      // 3) Any plain button with id or obvious text (in light DOM)
      const plainButtons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      for (const b of plainButtons) {
        try {
          if (b.id && /submit|send|cmdSubmit/i.test(b.id)) return b;
          const txt = (b.textContent || '') + ' ' + (b.getAttribute && b.getAttribute('aria-label') || '');
          if (/^\s*$/.test(txt)) continue;
          if (/\b(send|submit|create|ok|apply)\b/i.test(txt)) return b;
        } catch (_) {}
      }

      // 4) Last resort: any fluent-toolbar's fluent-button
      const toolbars = Array.from(document.querySelectorAll('fluent-toolbar'));
      for (const tb of toolbars) {
        try {
          if (tb.shadowRoot) {
            const fb = tb.shadowRoot.querySelector('fluent-button');
            if (fb) return fb;
          }
          const fbLight = tb.querySelector('fluent-button');
          if (fbLight) return fbLight;
        } catch (_) {}
      }
    } catch (e) {
      console.warn('[DH ZebraAI] findSubmitHostAnywhere failed', e);
    }
    return null;
  }

  // Function to select the first column in the data grid and click the send button
  async function selectRecordAndClickSend(dataGrid) {
    if (!dataGrid) {
      console.error('[DH ZebraAI] Data grid not found');
      return;
    }

    console.log('[DH ZebraAI] Found data grid.');

    const thHeader = await waitForHeaderCell(dataGrid);
    if (thHeader) {
      const checkboxHost = thHeader.querySelector(selectors.headerCheckbox);
      if (checkboxHost) {
        console.log('[DH ZebraAI] Found `fluent-checkbox` host in header. Trying to toggle it...');
        const success = await toggleCheckboxWithRetries(checkboxHost, 15, 250);
        if (success) {
          console.log('[DH ZebraAI] Header checkbox is now checked.');
        } else {
          console.warn('[DH ZebraAI] Failed to toggle header checkbox after retries.');
        }
      } else {
        const svgElement =
          thHeader.querySelector(selectors.headerSvg) ||
          dataGrid.querySelector(`${selectors.headerCell} ${selectors.headerSvg}`) ||
          thHeader.querySelector(selectors.headerRoleCheckbox);

        if (svgElement) {
          console.log('[DH ZebraAI] Found fallback element in header, dispatching click.');
          try {
            svgElement.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
            );
            console.log('[DH ZebraAI] Dispatched mouse event for SVG click (fallback).');
          } catch (e) {
            console.warn('[DH ZebraAI] Fallback click failed', e);
          }
        } else {
          console.error(
            '[DH ZebraAI] No `fluent-checkbox` host or SVG found within the header cell.'
          );
        }
      }
    }

    // Ensure rows present before clicking submit, then robust retries on submit
    await waitForRows(dataGrid, 1, 7000);
    let submitHost = await waitForElement(selectors.submitButton, { timeoutMs: 10000 });
    if (!submitHost) {
      console.warn('[DH ZebraAI] submit selector failed; searching more broadly...');
      submitHost = findSubmitHostAnywhere();
    }

    if (submitHost) {
      console.log('[DH ZebraAI] Found submit button host (broad search).');

      // If the host is a fluent-button with an inner control in shadow DOM,
      // prefer enabling and clicking that inner control (this matches the
      // working approach used in `zberaaiautomation.js`).
      try {
        const inner =
          (submitHost.shadowRoot &&
            (submitHost.shadowRoot.querySelector(selectors.submitButtonControl) ||
              submitHost.shadowRoot.querySelector('button'))) ||
          null;

        let target = submitHost;
        if (inner) {
          // Ensure the inner control is enabled and clickable
          try {
            ensureEnabled(inner);
          } catch (_) {}
          try {
            inner.disabled = false;
          } catch (_) {}
          try {
            inner.removeAttribute && inner.removeAttribute('disabled');
          } catch (_) {}
          try {
            inner.classList && inner.classList.remove('disabled');
          } catch (_) {}
          try {
            if (inner.style) inner.style.pointerEvents = 'auto';
          } catch (_) {}

          target = inner;
          dhPush('info', 'Using inner submit control inside shadowRoot as target', { inner: inner.tagName });
        }

        await clickSubmitWithRetries(target, 6, 500);
        dhPush('info', 'Submit click attempts finished', { target: target.tagName });
      } catch (e) {
        dhPush('warn', 'Submit click flow failed; falling back to host', { err: String(e) });
        await clickSubmitWithRetries(submitHost, 6, 500);
      }
    } else {
      console.error('[DH ZebraAI] Submit button host not found after broad search');
    }
  }

  // Main initialization
  (async function init() {
    if (!(await isAutomationEnabled())) {
      console.log('[DH ZebraAI] Automation disabled by preferences; skipping.');
      return;
    }

    const paramValue = getParameterByName('sr');
    console.log('[DH ZebraAI] URL param "sr" value:', paramValue);

    if (!paramValue) {
      console.log('[DH ZebraAI] No "sr" parameter; automation will not run.');
      return;
    }

    // 1. Wait for and populate the search input
    const searchElement = await waitForElement(selectors.searchInput, { timeoutMs: 15000 });
    if (searchElement) {
      setValueInSearchInput(searchElement, paramValue);
    } else {
      console.error('[DH ZebraAI] Search input element not found; aborting automation step.');
      return;
    }

    // 2. Wait for toolbar and trigger search
    const toolbarElement = await waitForElement(selectors.searchButtonToolbar, {
      timeoutMs: 15000
    });
    if (toolbarElement) {
      await findAndClickSearchButton(toolbarElement);
    } else {
      console.error('[DH ZebraAI] Toolbar element not found; search may not be triggered.');
    }

    // 3. Wait for data grid, select record, and click send
    const dataGrid = await waitForElement(selectors.dataGrid, { timeoutMs: 20000 });
    if (dataGrid) {
      await selectRecordAndClickSend(dataGrid);
    } else {
      console.error('[DH ZebraAI] Data grid element not found; cannot complete automation.');
    }
  })();
})();
