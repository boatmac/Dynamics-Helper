# Analysis Result Persistence — Design

**Date:** 2026-06-03
**Status:** Implemented; amended 2026-07-15 for optional prompt error codes and 2026-07-17 for serialized mutations, coherent hydration, per-identity acknowledgment keys, and request-scoped FAB spinner/timers
**Author:** opencode session 2026-06-03

## 1. Historical Pre-Implementation Context (2026-06-03)

Before C2a+ was implemented, the Analyze UI lifetime was bound to one `FAB`
React instance in the content script. A Host response rendered a success popover
or briefly flashed an error status bubble; navigation or tab closure could lose
the signal:

| Scenario | Historical pre-implementation behavior |
|---|---|
| Switch tab, return | ✅ popover persists (React tree still mounted) |
| Navigate to another URL in same tab, hit Back | ❌ FAB unmounted, state lost |
| Close tab, reopen case URL | ❌ React state gone |
| Error: bubble shows briefly after a long wait | ❌ User can miss it after leaving the active FAB |

The old `errorMsg` state had writers but no reader. It was historical evidence of
the gap and was removed when C2a+ routed Analyze errors through persistent
`ResultPopover` state; it is not part of the current implementation.

The initiating report on 2026-06-03 recorded a historical 600-second Host
timeout in `native_host.log` with no durable browser error after the user walked
away. Current timeout defaults and UI behavior are documented elsewhere; this
paragraph records why persistence was introduced.

## 2. Goal

When an analysis completes (success or error) during a period when the user is not actively viewing the case page in the active FAB instance, surface the result the next time the user opens or returns to the case page.

## 3. Non-Goals

- Desktop notifications (Chrome `notifications` permission) — re-prompt at install would alarm users; cost > value for now.
- Multi-case result history. We keep only the latest result.
- Cross-case visibility ("you have results for case X waiting on tab Y") — keeps the schema simple.
- A global or cross-case in-progress dashboard. The implemented hook rehydrates a matching case's pending marker, but does not provide cross-case visibility.

## 4. Design

### 4.1 Storage schema

The implementation uses three keys in `chrome.storage.local`:

```ts
// Persisted analysis result. Overwritten on every new analysis.
type LastAnalysis = {
  caseNumber: string;       // 16-digit case ID
  requestId?: string;       // Analyze request identity; absent on legacy records
  status: 'success' | 'error';
  title: string;            // popover title (already i18n'd at write time)
  content: string;          // markdown body (success: full report; error: host message)
  timestamp: number;        // Date.now() at write
  seen: boolean;            // legacy compatibility; new acknowledgments do not rewrite it
  durationSec?: number;     // success only
  savedTo?: string;         // success only, file path
  errorCode?: string;       // error only, raw Host machine-readable code
};

// Request-scoped pending marker. Cleared only by its request or reset.
type PendingAnalysis = {
  caseNumber: string;
  requestId: string;        // matches FAB's latestRequestId
  startTime: number;        // Date.now() when SW forwarded to host
};

// Identity-only one-shot acknowledgment value. It never contains/replaces a result.
type LastAnalysisIdentity = {
  caseNumber: string;
  requestId?: string;        // new records
  timestamp?: number;        // exact legacy identity
};
```

Storage keys: `dh_last_analysis`, one `dh_pending_analysis:<encoded-requestId>` per request, and one deterministic acknowledgment key per identity: `dh_seen_analysis:request:<encoded-case>:<encoded-requestId>` or `dh_seen_analysis:legacy:<encoded-case>:<timestamp>`. Historical singleton pending/seen keys remain read-only compatibility until Reset removes them.

### 4.2 Write paths (Service Worker owns writes)

The Service Worker is the right owner because:
- It outlives any individual content-script lifetime
- Native-host responses arrive at the SW first
- The originating tab may be dead by the time the response arrives

The implemented Service Worker bridge wraps `NATIVE_MSG` requests whose action
is `analyze_error` with these storage operations:

1. **Before forwarding to host:** write request-scoped pending with `caseNumber`, `requestId`, `startTime`.
2. **After host responds (success path):** write `dh_last_analysis` with status `success` and the request-scoped `requestId`, then delete that request's pending key.
3. **After Host responds (Host returned `{status: 'error', error, error_code?}`):** write the error result and delete only that request's pending key. For double-wrapped responses, an inner Analyze code takes precedence.
4. **SW-side rejection** (`sendNativeMessage` Promise rejects, e.g., disconnected pipe): write `dh_last_analysis` with status `error`, `content` equal to the exception message, and no fabricated `errorCode`.

### 4.3 Read paths (FAB)

`useAnalysisHydration(caseNumber)` reads storage on mount and whenever the case
identity changes:

1. **FAB mount** — perform one `chrome.storage.local.get(null)` and derive the latest result, newest matching request-scoped pending, and current result acknowledgment from one generation.
2. **Case identity change** — rerun the same checks when `caseNumber` changes.
3. **Pending check** — from the batched snapshot select the newest fresh request-scoped pending matching the current case; observe pending removal/expiry while mounted.
4. **Consumption/dismissal** — write only the displayed identity to its deterministic key. Never read-modify-write `dh_last_analysis`; acknowledgments for A and B coexist and neither can overwrite a result.
5. **Request isolation** — starts/completions use distinct keys, so no in-memory queue is required for A/B correctness across Service Worker restarts. The queue still orders writes within one worker; Host RPC remains outside it.

### 4.4 Constants

```ts
const STALE_WINDOW_MS = 60 * 60 * 1000;   // 1 hour
```

If a result is older than `STALE_WINDOW_MS`, it is ignored on read but remains
in `dh_last_analysis`. It is removed only when the next analysis result
overwrites it or when Options Reset explicitly removes the storage key. The
garbage-collection pass in 4.6 applies only to stale pending markers.

### 4.5 Error display in popover (replaces the 4-second-bubble-only UX)

The existing `ResultPopover` component already supports markdown content with title. We re-use it for errors with an error-themed title (e.g., `❌ ${t('analysisFailed')}`). No new component, no new state machine.

The status bubble remains a brief visual signal, while the popover carries the
durable message.

The stored error body is not prelocalized. Persistence keeps the raw safe Host
fallback plus optional code. Both immediate and rehydrated popovers localize a
known prompt-source code in `ResultPopover` at render time, so the current UI
language wins. The immediate FAB path may prefix its safe fallback before
opening the popover (for example, `Analysis failed:` or the Host-error label),
whereas rehydration supplies the raw stored fallback. Unknown codes and legacy
records without a code display the fallback supplied by their own path.

### 4.6 Garbage collection

On FAB unmount: no cleanup. The next mount handles expiry on read.

On every successful write of `dh_last_analysis`, `setLastAnalysis()` also removes
request-scoped pending markers older than `MAX_PENDING_AGE_MS` (2 hours). This
prevents an orphaned marker, such as one left by a Service Worker failure, from
blocking later pending-state behavior indefinitely. This GC does not inspect or
delete `dh_last_analysis`; stale results remain until overwritten by a later
analysis or removed by Options Reset.

## 5. Invariants

These are testable assertions the implementation must satisfy.

| ID | Invariant |
|---|---|
| **P-I1** | When SW forwards `analyze_error`, its request-scoped pending key is written before `postMessage`. |
| **P-I2** | Host success writes `dh_last_analysis` and deletes only that request's pending key. |
| **P-I3** | When Host responds with `{status: 'error', error, error_code?}`, `dh_last_analysis` is written with `status='error'`, `content === error`, and the optional raw code; an inner Analyze code wins over an outer code. |
| **P-I4** | Transport rejection writes a code-free error result and deletes only that request's pending key. |
| **R-I1** | FAB mount with matching unseen result inside stale window opens the popover automatically. |
| **R-I2** | Immediate dismissal or hydrated-result consumption writes only the displayed identity's deterministic key. Hydration suppresses legacy `last.seen=true`, the legacy singleton match, or an exact prefixed-key match. A/B acknowledgments remain independently seen. |
| **R-I3** | FAB mount with non-matching `caseNumber` does NOT open the popover. |
| **R-I4** | FAB mount with result older than `STALE_WINDOW_MS` does NOT open the popover. |
| **R-I5** | Hydration selects the newest fresh request-scoped pending for the current case; A/B starts/completions remain independent across worker restarts; removal/expiry clears only the hydrated mirror, never active local Analyze. |
| **R-I6** | Immediate and rehydrated prompt-source errors localize a known `errorCode` at display time; unknown/absent codes retain the immediate path's safe fallback or the rehydrated raw stored fallback respectively. |

## 6. Edge cases

### 6.1 Two FAB instances on different tabs for same case

User opens case A on tab 1, initiates analysis, switches to a separate window where they also have case A open in tab 2 (different FAB instance). When the response arrives:

- SW writes storage (single source of truth, no contention).
- Tab 1 (originating FAB): receives `sendResponse` from SW → renders the popover with the outgoing request identity. Dismissal writes that identity's deterministic `dh_seen_analysis:*` key without touching the result.
- Tab 2 (passive FAB): the implemented hydration hook reads on mount/case change, not via a live `chrome.storage.onChanged` subscription. If it mounts after tab 1 wrote the matching acknowledgment, it does not reopen the result. This preserves one-shot semantics.

**Possible follow-up:** add a live storage-change subscription if cross-tab
same-case updates become a product requirement.

### 6.2 User starts analysis, immediately navigates away to non-case page

The request-scoped pending key lingers. When the result arrives, SW writes `dh_last_analysis`; returning to that case rehydrates the result.

### 6.3 User starts analysis on case A, before it completes navigates to case B and starts another analysis

- Pending for A and B coexist under separate request-scoped keys.
- When A's response arrives, it writes A's result and removes only A's pending key.

**Decision:** each response removes only `dh_pending_analysis:<its requestId>`. B is independent of A even after Service Worker restart.

- When B's response arrives: writes `dh_last_analysis` for B (overwrites A's result). User loses A's result.

**Trade-off:** acceptable. Multi-case history is non-goal. User can re-trigger A.

### 6.4 Spinner shown for stale pending

If user closes tab mid-analysis and SW never receives a response, that request's pending key remains. Hydration stops displaying it after 15 minutes and GC removes it after 2 hours on a later result.

**Implemented mitigation:** garbage collection deletes pending markers older than
2 hours on a later result write. Independently,
`useAnalysisHydration` ignores a pending marker older than
`MAX_PENDING_DISPLAY_AGE_MS` (15 minutes) for UI display. The display cutoff is
a product staleness policy, not a claim that it exceeds the configurable Host
timeout.

### 6.5 Storage quota

Markdown bodies for a full analysis report can be 5-50 KB. `chrome.storage.local` has a 10 MB quota for unpacked extensions. One result occupies < 1% of quota. Non-issue.

### 6.6 Privacy

`dh_last_analysis.content` contains the analysis output. Per PII rules (AGENTS.md § 4.3), the host scrubs PII before sending. Storing post-scrub content in `chrome.storage.local` is no worse than the existing in-memory `resultPopover.content`. Same posture.

## 7. Out of scope / follow-ups

- **Cross-tab live updates** (`chrome.storage.onChanged` listener in FAB). Could be quick win post-v1.
- **Multi-case result list** ("you have 3 unread results"). Bigger schema change; not needed unless users actually request.
- **Desktop notifications** (chrome.notifications). Permission re-prompt risk; not worth it for v1.
- **Pending-state cross-tab visibility** (other tabs see "analyzing in progress" for case X). Tied to C2b health UI.
- **Invariant coverage:** focused `analyzeBridge`, `useAnalysisHydration`, and prompt-source FAB suites cover the persistence and display boundaries. Test counts are intentionally not part of this durable contract.

## 8. Implemented References

- `extension/src/utils/analysisStore.ts` — canonical `LastAnalysis` /
  `PendingAnalysis` / `LastAnalysisIdentity` schema, raw fallback + optional
  `errorCode`, optional result `requestId`, separate identity-only seen writes,
  age constants, and request-ID-safe pending clear.
- `extension/src/background/analyzeBridge.ts` — pre-forward pending write,
  success/error persistence, inner-code precedence, and transport-error
  behavior.
- `extension/src/background/serviceWorker.ts` — strips `_persist`, invokes the
  bridge, and logs Native Host metadata rather than prompt-bearing payloads.
- `extension/src/hooks/useAnalysisHydration.ts` — case/age/seen checks, pending
  hydration, optional code transport, displayed identity, and race-safe one-shot
  dismissal.
- `extension/src/components/FAB.tsx` — immediate safe fallback prefixes,
  hydrated state mirroring, `showAnalysisError`, `popoverIsAnalyze`, and
  `ResultPopover` render-time localization.
- `extension/src/utils/promptSourceErrors.ts` — known-code localization and
  unknown-code fallback behavior.
- `host/dh_native_host.py` — Analyze error envelopes and configurable timeout
  behavior.
- `AGENTS.md` analysis-persistence and timeout rules — durable agent contracts.
