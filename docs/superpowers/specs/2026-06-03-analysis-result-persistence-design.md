# Analysis Result Persistence — Design

**Date:** 2026-06-03
**Status:** Draft → ready for review
**Author:** opencode session 2026-06-03

## 1. Context

Today the analyze flow's UI lifetime is bound to a single React component (`FAB` in the content script). When the host replies, the FAB renders a `ResultPopover` (success) or fires a 4-second status bubble (error). If the user leaves the case page in any way between initiating analysis and receiving the response, the UI signal is lost:

| Scenario | Today's behavior |
|---|---|
| Switch tab, return | ✅ popover persists (React tree still mounted) |
| Navigate to another URL in same tab, hit Back | ❌ FAB unmounted, state lost |
| Close tab, reopen case URL | ❌ React state gone |
| Error: bubble shows for 4 seconds during a 10-minute wait | ❌ User misses it; `errorMsg` state is write-only (no consumer) |

The `errorMsg` state in `FAB.tsx` has 9 writers and 0 readers — dead code confirming the gap.

The most visible symptom: a user reported on 2026-06-03 that `native_host.log` recorded `Copilot request timed out after 600.0 seconds.` but no error appeared in the browser. They had walked away during the 10-minute wait. The error bubble flashed for 4 seconds while they were on another tab/window and was gone by the time they returned.

## 2. Goal

When an analysis completes (success or error) during a period when the user is not actively viewing the case page in the active FAB instance, surface the result the next time the user opens or returns to the case page.

## 3. Non-Goals

- Desktop notifications (Chrome `notifications` permission) — re-prompt at install would alarm users; cost > value for now.
- Multi-case result history. We keep only the latest result.
- Cross-case visibility ("you have results for case X waiting on tab Y") — keeps the schema simple.
- Showing in-progress analysis state outside the originating tab. Pending state is local to the FAB that triggered it. (Re-hydrating "in progress" across tabs is a future C2b concern.)

## 4. Design

### 4.1 Storage schema

Two new keys in `chrome.storage.local`:

```ts
// Persisted analysis result. Overwritten on every new analysis.
type LastAnalysis = {
  caseNumber: string;       // 16-digit case ID
  status: 'success' | 'error';
  title: string;            // popover title (already i18n'd at write time)
  content: string;          // markdown body (success: full report; error: host message)
  timestamp: number;        // Date.now() at write
  seen: boolean;            // false until user dismisses popover
  durationSec?: number;     // success only
  savedTo?: string;         // success only, file path
};

// Pending-analysis marker. Cleared when result arrives or expires.
type PendingAnalysis = {
  caseNumber: string;
  requestId: string;        // matches FAB's latestRequestId
  startTime: number;        // Date.now() when SW forwarded to host
};
```

Storage keys: `dh_last_analysis`, `dh_pending_analysis`.

### 4.2 Write paths (Service Worker owns writes)

The Service Worker is the right owner because:
- It outlives any individual content-script lifetime
- Native-host responses arrive at the SW first
- The originating tab may be dead by the time the response arrives

Two new SW hooks inside `chrome.runtime.onMessage` handler for `NATIVE_MSG` with `action === 'analyze_error'`:

1. **Before forwarding to host:** write `dh_pending_analysis` with `caseNumber`, `requestId`, `startTime`.
2. **After host responds (success path):** write `dh_last_analysis` with status `success`, then delete `dh_pending_analysis`.
3. **After host responds (host returned `{status: 'error', error: '...'}`):** write `dh_last_analysis` with status `error`, content = host's `error` field, then delete `dh_pending_analysis`.
4. **SW-side rejection** (`sendNativeMessage` Promise rejects, e.g., disconnected pipe): write `dh_last_analysis` with status `error`, content = exception message.

### 4.3 Read paths (FAB)

Three triggers in `FAB.tsx`:

1. **FAB mount** — on initial mount, read `dh_last_analysis`. If matches current page case AND `!seen` AND `(Date.now() - timestamp) < STALE_WINDOW`, open popover. Set `seen: true` in storage when popover is closed.
2. **Case identity change** — when `targetData.caseNumber` changes (user navigated between cases), re-run the same check.
3. **Pending check** — on mount, read `dh_pending_analysis`. If matches current case, set the local `isAnalyzing` state so the FAB shows the "analyzing" spinner.

### 4.4 Constants

```ts
const STALE_WINDOW_MS = 60 * 60 * 1000;   // 1 hour
```

If a result is older than `STALE_WINDOW_MS`, it is ignored on read (treated as expired). It is NOT deleted from storage on the read path — only overwritten by the next analysis or evicted by an explicit garbage-collection pass (4.6).

### 4.5 Error display in popover (replaces the 4-second-bubble-only UX)

The existing `ResultPopover` component already supports markdown content with title. We re-use it for errors with an error-themed title (e.g., `❌ ${t('analysisFailed')}`). No new component, no new state machine.

Status bubble is kept as a brief visual flash (still 4 seconds), but the popover carries the full message and persists until dismissed.

Same code path for both immediate display (when FAB is alive at response time) and re-hydrated display (when FAB mounts later).

### 4.6 Garbage collection

On FAB unmount: no cleanup. The next mount handles expiry on read.

On every successful write of `dh_last_analysis`: also check if a previous `dh_pending_analysis` is stale (older than `STALE_WINDOW_MS * 2`, e.g. 2 hours). If so, delete it. This prevents an orphaned pending marker (e.g., SW crashed mid-flight) from blocking the spinner indefinitely.

## 5. Invariants

These are testable assertions the implementation must satisfy.

| ID | Invariant |
|---|---|
| **P-I1** | When SW forwards `analyze_error` to host, `dh_pending_analysis` is written before `postMessage`. |
| **P-I2** | When host responds successfully, `dh_last_analysis` is written with `status='success'` AND `dh_pending_analysis` is deleted. |
| **P-I3** | When host responds with `{status: 'error', error}`, `dh_last_analysis` is written with `status='error'` AND `content === error`. |
| **P-I4** | When `sendNativeMessage` Promise rejects, `dh_last_analysis` is written with `status='error'` AND `dh_pending_analysis` is deleted. |
| **R-I1** | FAB mount with matching unseen result inside stale window opens the popover automatically. |
| **R-I2** | After user dismisses popover, `seen` is set to `true` in storage; subsequent re-mounts on the same case do NOT auto-open. |
| **R-I3** | FAB mount with non-matching `caseNumber` does NOT open the popover. |
| **R-I4** | FAB mount with result older than `STALE_WINDOW_MS` does NOT open the popover. |
| **R-I5** | FAB mount with matching `dh_pending_analysis` sets `isAnalyzing = true`. |

## 6. Edge cases

### 6.1 Two FAB instances on different tabs for same case

User opens case A on tab 1, initiates analysis, switches to a separate window where they also have case A open in tab 2 (different FAB instance). When the response arrives:

- SW writes storage (single source of truth, no contention).
- Tab 1 (originating FAB): receives `sendResponse` from SW → renders popover immediately. Sets `seen: true` when dismissed.
- Tab 2 (passive FAB): may pick up the storage change via `chrome.storage.onChanged` listener (we should add one). For v1: if user navigates back to tab 1 first and dismisses (`seen: true`), tab 2 will respect that. If tab 2 mounts after tab 1 dismissed: no popover (`seen=true`). Acceptable — user has already seen it once.

**Optional:** add `chrome.storage.onChanged` listener in FAB to react to writes made by SW for the current case. Defer to follow-up.

### 6.2 User starts analysis, immediately navigates away to non-case page

`dh_pending_analysis` lingers. When the result arrives, SW writes `dh_last_analysis` for that case but user is not viewing it. Next time user opens that case, popover appears. ✅ correct behavior.

### 6.3 User starts analysis on case A, before it completes navigates to case B and starts another analysis

- Pending for case A is overwritten by pending for case B.
- When A's response arrives: SW writes `dh_last_analysis` with case A's content. But `dh_pending_analysis.caseNumber === 'B'` — does the SW still clear it?

**Decision:** SW clears `dh_pending_analysis` only if `dh_pending_analysis.requestId === responseRequestId`. This prevents B's pending from being wiped by A's late response.

- When B's response arrives: writes `dh_last_analysis` for B (overwrites A's result). User loses A's result.

**Trade-off:** acceptable. Multi-case history is non-goal. User can re-trigger A.

### 6.4 Spinner shown for stale pending

If user closes tab mid-analysis and SW process is unloaded before response arrives, the response is never received and `dh_pending_analysis` is never cleared. Next FAB mount sees the marker and shows "analyzing" forever.

**Mitigation:** garbage collection in 4.6 (delete pending older than 2 hours on next successful write). Plus FAB mount can check `Date.now() - pending.startTime > MAX_REASONABLE_WAIT_MS` (e.g., 15 minutes — comfortably more than 600s host timeout) and ignore the marker.

### 6.5 Storage quota

Markdown bodies for a full analysis report can be 5-50 KB. `chrome.storage.local` has a 10 MB quota for unpacked extensions. One result occupies < 1% of quota. Non-issue.

### 6.6 Privacy

`dh_last_analysis.content` contains the analysis output. Per PII rules (AGENTS.md § 4.3), the host scrubs PII before sending. Storing post-scrub content in `chrome.storage.local` is no worse than the existing in-memory `resultPopover.content`. Same posture.

## 7. Out of scope / follow-ups

- **Cross-tab live updates** (`chrome.storage.onChanged` listener in FAB). Could be quick win post-v1.
- **Multi-case result list** ("you have 3 unread results"). Bigger schema change; not needed unless users actually request.
- **Desktop notifications** (chrome.notifications). Permission re-prompt risk; not worth it for v1.
- **Pending-state cross-tab visibility** (other tabs see "analyzing in progress" for case X). Tied to C2b health UI.
- **Spec test scaffolding**: 9 invariants in §5 should each map to a Vitest test, mirroring the Options 6-invariant pattern. Spec'd here, planned separately.

## 8. References

- `extension/src/components/FAB.tsx:237` — write-only `errorMsg` state (proof of UX gap)
- `extension/src/components/FAB.tsx:709-719` — current 4-second status bubble error path
- `extension/src/components/FAB.tsx:820-825` — host error handler that calls `setErrorMsg` but message never reaches user's eyes
- `extension/src/background/serviceWorker.ts:251-257` — current `NATIVE_MSG` handler (where the SW write hooks need to plug in)
- `host/dh_native_host.py:1832-1846` — host timeout response shape `{status: 'error', error: '...'}`
- AGENTS.md § 4.2 — frontend/backend timeout sync rule (600s/610s, documented stale in code, separate fix)
