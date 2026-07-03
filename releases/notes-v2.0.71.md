# v2.0.71

Two headline features and a targeted fix, promoted to stable after a month of beta soak (beta.1 + beta.2, no regressions reported).

## ✨ Highlights

### Analysis results now survive page reloads and cross-tab navigation

Before this release, an analyze result lived only in React state. Refresh the D365 page, switch browser tabs mid-analysis, or click into another case while one was running — the result was gone. No popover. No error. Just silence. A transient 4-second bubble was the only feedback and easy to miss.

Now every analyze run is journaled to `chrome.storage.local`. On FAB mount, the extension reads that state and re-opens the popover automatically — success or error — as long as the result is still fresh (< 15 min for display, garbage-collected after 2 h).

**User-visible behaviour:**

- **Reload during analysis** → on return, the FAB hydrates the in-flight state and shows the popover when the result lands. No more "did it actually run?" guessing.
- **Reload after analysis** → the popover pops back on the next visit to that case, one-shot per result. Dismissing marks it seen; won't re-open.
- **Switch to another D365 tab mid-flight** → the originating tab still records the result. When you come back, the popover appears with the persisted content. The away-tab sees a non-disruptive 5-second bubble labelled `Analysis Complete — Case {n}` / `Analysis Failed — Case {n}` — cross-case results never silently hijack the popover of the case you're currently looking at.
- **Bookmark popovers and analyze popovers share the same UI component**, but are discriminated internally — closing a bookmark popover never accidentally marks an analyze result as seen.

**Errors get the same treatment.** Failed analyses (timeout, host error, RPC failure) now show a persistent popover instead of a flash bubble. Same one-shot semantics as success results.

Options → Reset clears the persistence keys alongside the other 9 storage keys, so if the state ever gets weird you have an escape hatch.

### Analyze timeout is now user-configurable, default raised 600 → 1200 s

The hardcoded 600 s analyze timeout has been the single biggest source of confusing failures. A complex case with many MCP tool calls (PowerShell + view + grep + create rounds) easily runs past 10 minutes, gets sliced at exactly the 600 s mark, and the user sees an error message blaming **authentication** — which sent people on pointless re-auth troubleshooting because that's what the old wording literally said.

Root cause was confirmed from a real `native_host.log`: the SDK was actively writing the final report (7 consecutive `create` tool hooks fired in the last second before cut-off) when `asyncio.wait_for` killed it. Not a hang. Not an auth issue. Just a budget mismatch.

**What changes:**

- **New Options field — Analyze Timeout (seconds)** under General. Range 60–3600, default 1200. Clamped client-side on blur AND host-side on every config read.
- **Default raised 600 → 1200 s.** Cold MCP starts plus deep tool chains routinely need >10 min on complex cases; 600 was leaving capability on the table.
- **Live update.** Change the value, click away from the field — next analyze uses the new budget. No host restart required.
- **Error message rewritten.** Instead of "waiting for authentication or approval", the host now says it truthfully: `Copilot did not finish within Ns (M min) timeout while actively processing your request. Consider increasing the timeout in Options → Analyze Timeout if your cases need more time.` Auth is demoted to a tail hint that only appears if you're already at the 3600 s max.
- **Progress bubble copy is dynamic.** Used to say "this may take up to 2 mins"; now reflects the actual configured value: `Copilot is analyzing (max N min)…`
- **FAB safety timeout is derived,** not hardcoded. Was `610000` ms forever; now `(analyzeTimeoutSeconds + 10) * 1000`. The 10 s grace guarantees the host's truthful error fires before FAB's generic fallback.

### Status bubble no longer hijacked by SAP/clipboard notifications

The status bubble is a single-slot UI element — whoever wrote last won. The SAP textarea watcher polls every 3 s and fires a notification + toast when "Azure/Mooncake Support Escalation" appears, both routed through the same bubble slot the analyze flow uses. Result: an analyze on a case page that also had the SAP keyword would see its "analyzing" bubble wiped after a few seconds, and the subsequent "Analysis Complete (Xs)" confirmation could also be overwritten.

Fixed by protecting the analyze-flow bubble lifecycle: SAP/clipboard bubbles are silenced while an analyze is running or within 6 s of completion (covers the 5 s cross-case bubble plus a 1 s race margin). The visual signal SAP actually cares about — red textarea outline, pulse, scrollIntoView — is unaffected. Only the redundant bubble notification is suppressed.

## 🔬 Under the hood

### Host logger scoped to `dh` namespace

`native_host.log` used to be the dumping ground for every third-party library (Copilot SDK, httpx, asyncio, urllib3) because the rotating file handler was attached to `logging.root` at DEBUG. Test runs polluted the production log; real symptoms got buried under pages of SDK pings.

The file handler now hangs off `logging.getLogger('dh')` with `propagate=False`. All 125 `logging.{...}` sites in `dh_native_host.py` plus 20 in `updater.py` were converted to a module-level logger.

Numbers from a clean test run: ~2.5 KB pollution → 966 bytes, 9 lines, no duplicates. Production behaviour unchanged — same messages, same file, same levels, just without third-party tag-alongs.

Side effect to know: Options `log_level=DEBUG` no longer enables SDK DEBUG output. If you need SDK internals, attach a handler to `logging.getLogger('copilot')` manually.

### Test coverage

- **16 new tests for the persistence layer** — 6 for the Service Worker bridge (`analyzeBridge.test.ts`), 10 for the FAB re-hydration hook (`useAnalysisHydration.test.ts`).
- **7 new host tests for the timeout contract** (`test_analyze_timeout.py`) — clamp bounds, defaults, source-inspection regression guards on `_get_session_config` + `handle_update_config`.

Totals: **host 72/72**, **extension 42/42**. All persistence tests break-and-fail verified per AGENTS.md § 2.

### Documentation

AGENTS.md § 4.2 (Timeouts) and § 4.9 (Persistence) rewritten to pin the new contracts as critical rules. DEVELOPER_GUIDE.md and USER_GUIDE.md brought up to date. Full design spec: `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md`.

## Installation

1. Download `DynamicsHelper_v2.0.71.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions` if you're already running an older version. Existing D365 tabs need a refresh (F5) to pick up the new content script — service-worker reload alone won't propagate it.

## Upgrading from v2.0.70

Zero migration steps. New storage keys (`dh_pending_analysis`, `dh_last_analysis`) initialise empty and populate on first analyze. Existing `config.json` without `analyze_timeout_seconds` gets the new 1200 s default. Existing prefs without `analyzeTimeoutSeconds` in `chrome.storage.local` get 1200 s too. First time you open Options, the new Analyze Timeout field appears pre-filled — no action required unless you want a different value.

If you were on the v2.0.71 betas (beta.1 or beta.2), this is identical code. The stable tag exists so you're no longer opted into unfinished pre-releases via the beta channel.

## Known issues / follow-ups

- **SAP/Mooncake keyword detector double-fires** on D365 tab return. The extra bubble is now suppressed by the analyze-flow protection above, but the underlying double-invocation of the SAP watcher is still there. Cosmetic only; deferred to backlog.
- **Team folder collapse state still ephemeral.** Expanded folders reset on Options reload. Small annoyance, carried from beta.5.
- **No telemetry coverage yet for the new persistence + timeout paths.** Considered for a future release once we have hard data on which invariants actually fire in the wild.
