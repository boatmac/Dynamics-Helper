# Analysis Result Persistence Contract

## 1. Purpose

Preserve the latest accepted Analyze request's result across page navigation and
Service Worker restarts. This document describes current source behavior, not an
execution plan. Section 5 retains the P-I1..P-I4 and R-I1..R-I6 identifiers used by
source and regression fixtures.

## 2. Goal

A fresh, unseen result is available when the user returns to its case. Immediate
Host outcomes remain usable even if completion persistence fails.

## 3. Non-Goals

No multi-case history, desktop notifications, or global in-progress dashboard.
The singleton is latest-started-owned, not a last-response-wins history.

## 4. Storage and Ownership

### 4.1 Storage schema

| Key | Value and owner |
|---|---|
| `dh_last_analysis` | SW-owned `LastAnalysis`: string case/title/content, `success` or `error`, finite timestamp, boolean legacy `seen`; optional request ID, duration, saved path, error code, separate `attachmentNotice` |
| `dh_latest_analysis_owner` | SW-owned `{caseNumber, requestId, startTime}`; string identities and finite start time |
| `dh_pending_analysis:<encoded-requestId>` | SW-owned request-scoped `{caseNumber, requestId, startTime}` |
| `dh_seen_analysis:request:<encoded-case>:<encoded-requestId>` | Separate identity-only acknowledgment written by FAB |
| `dh_seen_analysis:legacy:<encoded-case>:<timestamp>` | Separate acknowledgment for a legacy result without request ID |

Historical singleton `dh_pending_analysis` and `dh_seen_analysis` are compatibility
read inputs, never new-write targets. Matching legacy pending can be cleaned with
its completion. Reset removes legacy and prefixed keys, result, and latest owner.
Readers validate own data properties and primitive types before rendering,
identity construction, or arithmetic; malformed values are never coerced.

### 4.2 Write paths

1. The SW validates the Analyze request and `_persist` metadata before effects.
   `_persist` contains case number and pretranslated success/error titles; the
   sole request ID is the top-level `requestId`. Neither `_persist` nor
   `extension_warnings` reaches the Host.
2. `recordAnalyzeStart` commits pending and `dh_latest_analysis_owner` in one
   serialized storage set before Host dispatch. Failure prevents dispatch.
   Latest accepted start means this durable queue order, not callback arrival or
   timestamp comparison.
3. `completeAnalyzePersistence` rereads and parses the durable owner inside the
   same mutation queue. Only equality of both case and request authorizes writing
   `dh_last_analysis`. Missing, malformed, unreadable, or different ownership
   never authorizes a singleton write.
4. Success, Host error, and transport rejection all obey that owner gate. Host
   errors preserve safe string fallback and optional raw `errorCode`; an inner
   Analyze code wins over an outer code. Transport rejection fabricates no code.
5. Completion always attempts only its matching pending cleanup. The latest
   owner survives completion and Worker restart, until a newer start or Reset.
   Clearing a newer pending marker cannot return ownership to an older request.

Result write is attempted once. Pending cleanup has at most three attempts with
50 ms and 200 ms delays. The normalized Host outcome is returned even when
completion persistence fails, with ordered, extension-only warning codes
`analysis_result_not_persisted` and `analysis_pending_cleanup_failed` as applicable.
The UI separates durability warnings from Analyze success/failure. Reset shares
the serialized mutation queue; a pre-Reset response cannot restore a cleared result.

### 4.3 Read paths

`useAnalysisHydration(caseNumber)` obtains one `chrome.storage.local.get(null)`
snapshot on mount/case change and when pending storage changes. It generation-
gates application, selects the newest matching pending (request ID breaks equal
start-time ties), and derives result/seen identity from the same snapshot.
It is not a general subscription to every result or seen-key change.

Reading alone does not mark seen. FAB consumption/dismissal records only the
displayed identity through its deterministic acknowledgment key, never a
read-modify-write of the singleton. Legacy `last.seen=true` and exact legacy or
prefixed acknowledgment matches suppress replay. Preserve `popoverIsAnalyze`
discrimination in the shared close handler.

Analyze progress is separate request-local state, never pending/result storage.
Hydration restores a spinner, not phase/activity/session-copy details; the panel
reports details unavailable. Closing the menu retains local progress, but reload
does not replay it. See the authoritative
[progress contract](native-message-snapshot.md#analyze-progress-contract).

### 4.4 Ages

| Constant | Meaning |
|---|---|
| `STALE_WINDOW_MS` = 1 hour | Older results do not automatically reopen; reading does not delete them |
| `MAX_PENDING_DISPLAY_AGE_MS` = 15 minutes | Hydrated spinner cutoff, with mounted expiry/removal handling |
| `MAX_PENDING_AGE_MS` = 2 hours | Stale pending GC threshold in `setLastAnalysis` |

The current completion path uses `completeAnalyzePersistence`, not
`setLastAnalysis`; do not claim every completion runs global pending GC. The
15-minute UI policy is not the configurable Host execution timeout. Hydrated
expiry clears only the mirror, never a locally active Analyze request.

### 4.5 Error display

Titles are translated at request time. Error bodies persist the raw safe Host
fallback plus optional code. `ResultPopover` localizes known prompt-source codes
at render time for both immediate and hydrated results. Unknown/absent codes
retain that path's fallback; immediate FAB text may include a safe prefix while
hydration supplies the stored raw fallback. No rejected object is serialized for
display. See the [prompt contract](prompt-source-isolation.md#8-error-contract).

### 4.6 Attachment notices

**Implemented-source; focused offline milestones passed, runtime UNVERIFIED:** Host notice output and Extension parsing,
persistence, hydration and rendering of optional `attachmentNotice` exist.
The initial 13-file frontend run passed 519/524, all five failures in
`FAB.pageIdentity.test.tsx`. Premature progress settlement now waits for terminal
page revalidation. The affected four complete files passed 98/98 with two new
cases, making 526 selected tests in aggregate, not a full 526-test run. Both new
cases failed under the expected early-settle mutation (2/2 RED); mutation removed,
restored GREEN confirmed with 2 passed, 45 skipped, exit 0, and FAB's raw hash
matching the pre-RED ownership-fixed bytes (prefix `D5DF`). Final TypeScript
(`attachments-final`) exited 0 with sources unchanged. Pure-Host 21/21 used
mocked filesystem/readers and SDK-shaped RPCs, not real attachment I/O or Host/SDK
runtime. At that milestone, production was not built, installed or live-verified and no actual
attachment model inputs were exercised. Historical standalone download completion
does not qualify this path or production Analyze. See the
[milestone results](../dtm-attachment-investigation.md#initial-verification-status).

The wire contract uses `attachment_notice` in success `data` beside `markdown`,
or beside the Analyze error fields. `analyzeBridge.ts` maps it to
`attachmentNotice`. `parseAttachmentNotice` accepts only an own data property
containing a nonblank primitive string of at most 2048 characters; malformed
optional values are ignored without getter invocation or coercion. Legacy results
without a notice remain valid. The same latest-owner gate applies to notice and
result persistence; there is no separate notice writer or stale-write authority.

FAB and `useAnalysisHydration` carry the separate field to `ResultPopover`, which
renders it independently beside localized known prompt errors, so localization
does not replace the notice. It is product-generated input-completeness text,
not model-generated Markdown, transient progress, or an extension durability
warning. Known omitted files warrant a skipped-input warning; unknown inventory
must say completeness/existence cannot be confirmed, not assert attachments exist.

The later UI-only precision fix is confined to `ResultPopover`: it translates
exactly `> **Attachment status:** ` or `> **附件状态：** ` once at the start of
the notice into a plain heading, preserving the remaining body. Rendering stays
React text, not HTML or Markdown image/link nodes. Wire, stored and report text
remain raw and unchanged; existing hydrated records receive the same display fix.
This source change is not in `dist`; a future approved build/reload is required.
See the [night offline follow-up](../dtm-attachment-investigation.md#night-offline-follow-up)
for confirmed restored GREEN (6 passed, 214 skipped, actual exit 0, sources
unchanged) and TypeScript (`attachment-night`: exit 0, `changedSources: []`).
`ResultPopover` and `attachmentPortal` raw hashes exactly match first GREEN
(prefixes `2368` and `F39F`, respectively), separate from the earlier milestone.

Host now emits a nonempty `attachment_notice` in success `data` beside `markdown`
or beside the inner Analyze error fields. `handle_attachment_analyze` no longer
prefixes errors, and `handle_analyze_error` leaves returned `full_response`
unprefixed. The saved report writes the notice in its own `## Attachment Status`
section before `## AI Explanation`. This closes the source-level embedded-notice
gap without relying on error-body localization to retain attachment status.

Before each model send attempt, Host derives a fixed product input-status summary
from frozen preparation and that attempt's qualified-image count, appending it
when nonempty. The model is asked not to repeat the separately displayed status
or claim omitted inputs were reviewed. Host does not itself duplicate the notice
in returned Markdown/error text; model compliance and end-to-end delivery remain
UNVERIFIED, not established by source inspection or the focused offline milestones.

## 5. Invariants

P-I2..P-I4 include the common durable latest-owner gate in section 4.2. These
identifiers continue to describe their original success/error/rejection paths;
they do not authorize stale writes.

| ID | Invariant |
|---|---|
| **P-I1** | Pending and latest owner commit together before SW prepares/forwards Analyze, including private `analyze_with_attachments`; start-write failure sends nothing. |
| **P-I2** | Host success writes `dh_last_analysis` only for the matching durable owner and cleans only its matching pending. |
| **P-I3** | An owned Host error writes `status='error'`, the safe string error, and optional raw code; inner Analyze code takes precedence. Non-owner completion cannot replace the singleton. |
| **P-I4** | An owned transport rejection writes a code-free safe error; every rejection cleans only its matching pending, never another request's state. |
| **R-I1** | Mount with a matching unseen result inside the stale window opens the popover. |
| **R-I2** | Dismissal/consumption acknowledges only the displayed identity; legacy seen state and exact acknowledgment matches suppress replay, and A/B acknowledgments coexist. |
| **R-I3** | A non-matching case does not open the result. |
| **R-I4** | A result older than `STALE_WINDOW_MS` does not open. |
| **R-I5** | Hydration selects the newest fresh matching pending; independent request keys survive Worker restart, and removal/expiry clears only the hydrated mirror. |
| **R-I6** | Known prompt codes localize at immediate/rehydrated display time; unknown/absent codes preserve each path's safe fallback. |

## 6. Edge Cases

### 6.1 Multiple views

Multiple FABs may display the same result before an acknowledgment is observed.
Each writes the same deterministic identity, without overwriting the result.
Pending-change hydration is supported; universal live cross-tab result delivery
is not promised.

### 6.2 Navigation away

An accepted request may finish after its original FAB disappears. If it still
owns the durable singleton, returning to its case can rehydrate the result.
Progress is delivered only to the captured originating document and is not
recovered with that result or redirected to the currently active tab.

### 6.3 A starts, then B starts

A/B pending markers coexist. Once B's start commits, A's completion cannot write
the singleton, whether it arrives before or after B's completion or after Worker
restart. A cleans only A's pending; B remains owner after its pending is removed.
Reset removes ownership, so neither old response can resurrect reset state.

### 6.4 Privacy

Stored output can contain sensitive analysis data. Host PII scrubbing applies to
case text, context and canonical Custom User Prompt, not eligible raw attachment
bytes. It is not a guarantee that model output is PII-free. Never persist private
attachment download descriptors in result/progress storage or log raw attachment
URLs, credentials, contents, reports, errors containing rejected values or prompts.

## 7. Implementation Boundaries

Persistence belongs in SW-side helpers and hydration in the dedicated hook, not
new ad hoc mutations in `serviceWorker.ts` or `FAB.tsx`. Local FAB request IDs,
timers, page identity, and post-await checks independently prevent stale UI.

### Implementation Map

The [section 5 invariant IDs](#5-invariants) define P-I1..P-I4 and R-I1..R-I6.

- [analysisStore.ts](../../extension/src/utils/analysisStore.ts) owns schemas,
  serialized storage, request pending, identity acknowledgments, and Reset.
  `recordAnalyzeStart` writes pending plus durable `dh_latest_analysis_owner`
  together before dispatch. Only completion matching both owner identities may
  replace `dh_last_analysis`; owner survives completion and Worker restart.
- [analyzeBridge.ts](../../extension/src/background/analyzeBridge.ts) parses
  requests/outcomes, strips Extension metadata, preserves safe error/code data,
  and returns ordered durability warnings without changing the Host outcome.
- [analyzeRequestHandler.ts](../../extension/src/background/analyzeRequestHandler.ts)
  separates parsing and authorized transport from persistence and send.
- [useAnalysisHydration.ts](../../extension/src/hooks/useAnalysisHydration.ts)
  reads a coherent snapshot, generation-gates application, and handles pending
  storage changes/expiry. Reading alone does not acknowledge a result.
- [FAB.tsx](../../extension/src/components/FAB.tsx) consumes/dismisses the exact
  displayed identity and maintains local request/page ownership through awaits.

Pending and seen keys are request/identity-scoped. Legacy singleton records are
read compatibility inputs; Reset clears legacy/prefixed state and latest owner,
so old responses cannot restore the singleton. Pending display freshness is
15 minutes; GC age is 2 hours. These are distinct from the Host timeout, and the
current completion path does not promise a global GC pass on every result.

## 8. References

- [Storage schemas and mutations](../../extension/src/utils/analysisStore.ts)
- [Analyze parsing and completion bridge](../../extension/src/background/analyzeBridge.ts)
- [Request authorization](../../extension/src/background/analyzeRequestHandler.ts)
- [Hydration](../../extension/src/hooks/useAnalysisHydration.ts)
- [Request/data boundaries](runtime-transaction-data-boundaries.md)
