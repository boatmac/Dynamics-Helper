# v2.0.71-beta.1

Headline feature: **Analysis results now survive page reloads and cross-tab navigation.** Plus the A1 log-pollution cleanup tracked in beta.5's known-issues list.

## ✨ Highlights

### Analyze results persist across reloads and tab switches (C2a+)

Before this release, an analyze result lived only in React state. If you refreshed the D365 page, switched browser tabs mid-analysis, or clicked into another case while one was running, the result was gone — no popover, no error message, just silence. The only feedback was a transient 4-second bubble that you could miss.

Now every analyze run is journaled to `chrome.storage.local` (`dh_pending_analysis` while in-flight, `dh_last_analysis` after success/failure). On FAB mount the new `useAnalysisHydration` hook reads that state and re-opens the popover automatically — success or error — as long as the result is fresh (< 15 min for display, GC'd after 2 h).

**User-visible behaviour:**

- **Reload during analysis** → on return the FAB hydrates the in-flight state and shows the popover when the result lands. No more "did it actually run?" guessing.
- **Switch to another D365 tab mid-flight** → originating tab still records the result. When you come back, the popover appears with the persisted content. The away-tab sees a non-disruptive 5-second bubble labelled `Analysis Complete — Case {n}` / `Analysis Failed — Case {n}` so cross-case results never silently hijack the popover of the case you're currently looking at.
- **Close the popover** → marked seen, won't re-open on next mount. One-shot per result.
- **Bookmark popovers and analyze popovers share one component** but are discriminated internally — closing a bookmark popover never marks an analyze result as seen.

**Errors get the same treatment.** Failed analyses (timeout, host error, RPC failure) now show a persistent popover instead of a flash bubble. The popover is dismissable and shares the same one-shot semantics as success results.

**Reset clears it.** Options → Reset now wipes `dh_pending_analysis` and `dh_last_analysis` alongside the other 9 keys.

**Architecture:** the Service Worker owns all storage writes — FAB only reads. Pure helpers (`extension/src/utils/analysisStore.ts`, `extension/src/background/analyzeBridge.ts`, `extension/src/hooks/useAnalysisHydration.ts`) keep the persistence logic unit-testable without a real Chrome port. Spec: `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md` (9 invariants P-I1..P-I4 + R-I1..R-I5). Critical pattern documented in AGENTS.md § 4.9.

## 🔬 Under the hood

### Host logger scoped to `dh` namespace (A1 follow-up)

`native_host.log` used to be the dumping ground for every third-party library (Copilot SDK, httpx, asyncio, urllib3) because the rotating file handler was attached to `logging.root` at DEBUG. Test runs polluted the production log file; real `handle_update_config` symptoms got buried under pages of SDK pings; stray bare imports doubled every line.

The file handler now hangs off `logging.getLogger('dh')` with `propagate=False` and an idempotent attach guard. All 125 `logging.{info,debug,warning,error}` sites in `dh_native_host.py` plus 20 in `updater.py` were converted to `logger.{...}` against the new module-level logger. Test-file imports normalised to `from host.dh_native_host import X` so `unittest discover` doesn't register the module twice.

**Numbers from a clean test run:** ~2.5 KB pollution → 966 bytes, 9 lines, no duplicates, no SDK noise. Production behaviour unchanged: same messages reach the same file at the same levels — just without third-party tag-alongs.

Side effect to know: Options `log_level=DEBUG` no longer enables SDK DEBUG output. If you need SDK internals, attach a handler to `logging.getLogger('copilot')` manually. A "verbose SDK" Options toggle is tracked as a future item.

### 16 new tests for the persistence layer

- `extension/src/background/analyzeBridge.test.ts` — 6 tests covering the SW-side bridge (`_persist` stripping, success/error journal writes, payload forwarding).
- `extension/src/hooks/useAnalysisHydration.test.ts` — 10 tests covering the FAB-side hook (pending hydration, completed hydration, seen-state suppression, dismissPopover semantics, staleness GC).

Total extension suite: 42 tests / 4 files (was 26 at beta.5). All break-and-fail verified per AGENTS.md § 2.

## Installation

1. Download `DynamicsHelper_v2.0.71-beta.1.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions` if you're already running an older version. Existing D365 tabs need a refresh (F5) to pick up the new content script — service-worker reload alone won't propagate it.

## Upgrading from beta.5

No migration steps. New storage keys (`dh_pending_analysis`, `dh_last_analysis`) initialise empty and populate on first analyze. Existing `config.json` and `chrome.storage.local` state carry forward untouched.

## Known issues / follow-ups

- **C2b deferred to v2.0.72**: host-side analyze queue + progress feedback + user-configurable timeout (60–3600 s) + raising host backend timeout to 1200 s + cleaning the stale `# 310 seconds` comment at `dh_native_host.py:1750-1751`. Out of scope for this release to keep the change surface focused on persistence.
- **SAP/Mooncake keyword detector double-fires** on D365 tab return, producing a brief unreadable toast obscured by the hydration popover. Pre-existing bug, unrelated to C2a+, deferred to backlog.
- **Team folder collapse state still ephemeral** (B1, carried from beta.5).
