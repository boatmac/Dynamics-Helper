# DTM Attachment Integration Investigation

## Status

September 11, 2026: production attachment helpers and current SW/Host integration
are **implemented-source; focused offline milestones passed, production runtime
UNVERIFIED**. Restored GREEN is confirmed (2 passed, 45 skipped, exit 0); final
TypeScript exited 0 with sources unchanged.
At that milestone, production was not built, installed or live-verified and no actual attachment model
inputs were exercised. The standalone diagnostic's historical `complete`
result below is not production Analyze, file-import or model qualification.
Remaining gaps are tracked in [TODO.md](../TODO.md#attachment-analysis).
This record does not authorize tests, builds, live operations or another download.

Later capture-hardening fixes and their scoped offline results are maintained in
the single [capture hardening review](capture-hardening-review.md), including
Customer ownership, editor intent and the final Created On fallback budget.
The earlier source/build evidence below remains historical; it does not qualify
current hardening, runtime performance or production. The production entry is
quarantined, with no automatic restoration or runtime-entry change.

### Initial Verification Status

Frontend milestones below were supplied by the user; Host count/exit were
confirmed by reading retained results, not rerunning tests. Current FAB source
confirms the post-revalidation settlement placement. No tests or builds were
executed by this documentation update.

- Initial frontend run: 13 complete files, 524 tests, 519 passed and five failed,
  all in `FAB.pageIdentity.test.tsx`. Preserve this initial failure history.
- The actual defect was premature progress settlement before terminal page
  revalidation. FAB now settles progress only inside the post-revalidation
  terminal publication gate shared with the result UI. The affected four complete
  files then passed 98/98, including two new ownership cases. The original
  selection now has 526 tests in aggregate; this is not a full 526-test run.
- RED verification: the two new cases failed 2/2 as expected under an early-settle
  mutation. The mutation was removed. The `green-restored` evidence confirms
  2 passed, 45 skipped, exit 0. FAB's raw hash equals the pre-RED ownership-fixed
  hash (prefix `D5DF`), confirming restoration of those bytes. This post-mutation
  check is separate from the earlier 98/98 result.
- Prior corrected TypeScript passed; the final `attachments-final` TypeScript
  result also confirms exit 0 and sources unchanged. This is a confirmed final
  result, not an exit code inferred from the earlier PASS.
- The `analysis-attachments` pure-Host profile passed exactly 21/21 with no
  failures, errors or skips. Under
  `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-b5tyucw3`,
  `results.jsonl` ends with `completed: 21`, `total: 21`, `successful: true`;
  `result.json` records exit 0 and unchanged sources. The fixtures mock readers
  and every filesystem operation (including open) and use SDK-shaped RPC mocks.
  This is not real attachment file I/O, Host integration or SDK runtime qualification.
- `tests/sdk-test-review.json` now records Host source SHA-256
  `32736e8b912ebf54b51de265932e3baa856aa353f43bb2be560edde486fd018e`.
  That is an updated source review, not a fixed-SDK rerun; fixed SDK tests were
  not rerun and the hash does not qualify SDK runtime behavior.
- Production is not built, installed or live-verified, and no actual attachment
  model inputs were exercised. Historical standalone harness PASS covers only
  controlled browser metadata correlation, not production Analyze or file bytes.
  Broader SDK/full-build verification requires applicable user approval; prior
  standalone-harness scope does not authorize a production build or live inputs.

### Night Offline Follow-Up

September 12, 2026, user-supplied evidence: earlier actual Dev screenshots showed
`Included 1, skipped 0`, and the model described the image. This is a
user-observed positive path, not qualification of all production behavior or an
independent audit of raw attachment bytes. It does not replace the earlier
UNVERIFIED boundaries. Actual empty DTM DOM behavior remains not live-verified.

Tonight's UI precision fix changes only `ResultPopover`: translate the exact Host
Markdown prefix `> **Attachment status:** ` or `> **附件状态：** ` once at the
start into a plain heading, preserving the body as React text, with no HTML or
image/link nodes. Wire/storage/report raw text is unchanged, including for existing
hydrated records. No production empty-inventory logic changed; only tests were
strengthened: a recognized empty `tbody` supports complete zero, pagination is
incomplete/unknown, an unrecognized placeholder never confirms zero, and source
counts `0`/`null` cannot override unknown inventory.

The first GREEN passed all three complete files, 220/220: `ResultPopover` 23,
`attachmentPortal` 124, and `attachmentPreparation` 73. Mutation proof failed all
six selected cases as expected (four heading, two pagination). Mutations were
restored; post-restoration main GREEN is **confirmed**: 6 passed, 214 skipped,
actual exit 0, sources unchanged. `ResultPopover` and `attachmentPortal` raw
hashes exactly match first GREEN (prefixes `2368` and `F39F`, respectively).
TypeScript (`attachment-night`) is **confirmed**: result exit 0,
`changedSources: []`. These are supplied final results, not inferred from first
GREEN or earlier milestones. Tonight is source/offline only: no
builds, downloads, model/browser operations, registry switches, release or commit.
The updated UI source is not in `dist`; a future approved build/reload is needed.

### Source Check Retry Follow-Up

September 12, 2026, user-reported behavior: Analyze reports attachments unavailable
with no DTM tab open, but works after manually opening DTM. The product does not
require a pre-opened DTM tab; the specific live cause remains **UNCONFIRMED**.
The reported comparison of the previous successful build with the notice fix
found preparation, portal, download and Service Worker sources byte-identical;
only notice UI changed. This does not establish a new packaging regression.

Source inspection found no transient retry in `sourceCheck`. The source/test
change adds a bounded 3-second window per check, polling at 200 ms, only for
canonical `null` or injection/read rejection or timeout. Each window is clipped
to the applicable 30-second portal and 89-second work deadlines. Explicit identity
mismatch, owner loss and malformed results fail immediately. The `finally` check
does not renew an exhausted window. No action retries are added.

Reported offline results: the complete preparation file passed **91/91**.
The null/throw RED mutation produced **3 failed, 2 passed, 86 skipped**, proving
the three affected cases fail under the mutation. Restored GREEN is **confirmed**:
**5 passed, 86 skipped**, exit 0; the raw preparation hash (prefix `C48B`) equals
first GREEN. TypeScript (`source-retry`) exited 0 with sources unchanged.

Local Extension build `dh-local-extension-2077-source-retry-20260912` **passed**:
all five default-items checks and TypeScript/Vite/copy steps passed, with all
source/tool inputs unchanged. The 13-artifact inventory hash is
`107744E2EE3C6BBBC98701F00F8736DEE57D71D5F872A23863968DDA727ECAD5`.
`extension/dist/` is ready for user reload. No Host or registration was modified;
registration stays **Dev**. No actual Analyze was performed by the agent, and
these results do not confirm the live cause or a fix in the actual browser.
This docs-only entry records supplied final results without rerunning verification
or rewriting history.

### Stage Diagnostics Follow-Up

September 12, 2026: the user still reports `unknown/0` after the 3-second
source-check retry change. All four actual read-only source checks passed with
`matches: true`, `count: null` and 55 nodes. This establishes current source-check
success only, not the stage or cause of the historical runtime failure. A
pre-opened DTM tab is not a prerequisite. Runtime root cause remains
**UNRESOLVED**; do not mark the issue fixed.

Terminal diagnostics now emit the fixed console warning
`[DH] Attachment preparation incomplete` with only closed `{stage, reason}` values,
no customer keys and no preparation behavior change. Reported verification:
**107/107** tests passed, including 16 diagnostics tests; TypeScript passed. The
local Extension build passed, including all five default-items gates, with
source/tool inputs unchanged. Evidence directory:
`dh-local-extension-2077-stage-diagnostics-20260912`; dist bundle identifier
`BF6Y6A2h`, bundle SHA-256 prefix `C504`.

At that milestone, user reload of this diagnostics build and failure stage/reason
collection were pending. No new Analyze by the agent; Dev registration remains unchanged,
with no Host build or permissions changes. This docs-only update records supplied
results without new tests, investigation or review; runtime resolution remains
pending that diagnostic evidence.

### Portal Wait Diagnostics Follow-Up

September 12, 2026: user-supplied actual console evidence reports `portal_wait` /
`unavailable`, while text Analyze succeeds. Initial source validation and owned-tab
creation passed, but no valid attachment inventory was obtained. This is not
attachment-input success and does not establish authentication as the cause: the
manifest does not permit reading the login-origin URL. The earlier 100 ms source
hypothesis is not a proven root cause. Runtime root cause remains **UNRESOLVED**.

The new diagnostic-only fixed wait summary records counts capped at 256 and
`lastOutcome`; `portalDetail` validates only allowed fields. Diagnostics contain
no URLs, raw errors or secrets. Inspect-helper diagnostics are optional and
default to `false`. Host wire, retries, permissions and the 30-second deadline
are unchanged; this is not a root-cause fix.

Reported verification: **278/278** tests passed (23 ResultPopover, 121 preparation,
134 portal); TypeScript passed. The local build and all five default-items gates
passed, with source/tool inputs unchanged. Worker identifier: `DImdQwBH`;
reported SHA-256 prefix: `B34` (not a supplied full hash).

Await user reload of the latest diagnostics build and its diagnostic line. No
actual Analyze was performed by the agent. This docs-only entry records supplied
results with static diff checks only, without new tests, builds or runtime probes;
prior milestone descriptions remain historical evidence, not current qualification.

### Tabs Metadata Permission Follow-Up

September 12, 2026: subsequent user-supplied actual wait diagnostics report
`urlUnavailable: 107`, `tabReadFailed: 0`, `injectionFailed: 0`,
`portalUnavailable: 6`, and `lastOutcome: url_unavailable`. These counters show
unavailable URL metadata, not proof of authentication failure; runtime root cause
remains **UNRESOLVED**.

The user approved adding only `tabs` for this change to the production Extension
manifest to address the documented cross-origin metadata gap, not to guarantee a
root-cause fix or automatic SSO. `tabs` grants extension-wide URL, title and
`pendingUrl` metadata access, not only owned-tab access. Attachment code reads
only its owned tab and does not log raw URLs. D365/DTM `host_permissions` remain
unchanged, with no login-host or `cookies` permission, login-page injection,
automatic focus or approval. The 30-second deadline is unchanged. The independent
download harness and its manifest permissions remain unchanged and correct for
their separate scope.

Assistant-run offline verification for this permission addition: **122/122** preparation
tests passed, including the permission contract and auth/missing-URL boundaries;
TypeScript exited 0. The full local Extension build passed all five default-items
gates and tsc/Vite/copy, with raw source/tool inputs unchanged. Evidence directory:
`dh-local-extension-2077-tabs-permission-20260912`. Output `extension/dist/manifest.json`
SHA-256: `79C55E07391C3BA73BA9C01E746831386C43083A58D05471842030BA66C918EE`.
These supplied results do not establish runtime verification; the cause remains
unknown. Browser reload/update may display a new permission
warning requiring the user's manual acceptance only; source-change approval is
not browser consent. This docs-only follow-up performs static diff checks, no
tests, builds, browser/registry actions or file-sample collection, and does not
claim runtime success from these offline results.

Subsequent user-operated Dev verification on September 12 showed the DTM
authentication page; the user selected their account and reported that the
attachment downloaded. The supplied final-result screenshot shows
`Attachments prepared. Included: 1; skipped: 0` and a completed analysis duration
of 74.2 seconds. The attachment notice heading is displayed without raw Markdown
decoration. This is user-observed evidence for the authentication-to-download-to-
analysis path after the permission change, not an independently captured input
trace or proof that every earlier failure had the same cause. No additional
Analyze, download or browser operation was performed to record this outcome.
Live confirmed-empty inventory and unattended authentication-timeout fallback
remain unverified by this result; their offline coverage remains separate.

## Current Production Source

### Workspace Missing And Late Customer Follow-Up

September 12, 2026: the user observed the same-case "No workspace exists" modal.
That identifies the missing-workspace failure's cause; current source now handles
it rather than waiting for an inventory the dialog prevents. This is an
implemented source fix, **not an actually live-verified resolution**, and does
not retroactively resolve every earlier metadata/authentication failure above.

`readAttachmentPortal` accepts only the exact visible modal for the full matching
16/19-digit case, during inspection. A readable background case header must agree;
an absent/hidden one is allowed. The closed `workspace_missing` response does not
click Create or Cancel. `prepareAttachments` retains document/ownership checks and
returns known-empty with no yellow attachment warning when no positive D365 count
conflicts. A conflicting positive count, including at final source revalidation,
keeps inventory unknown/unavailable. `tabOrigin` now replaces historical auth
evidence with the latest successfully read URL: once the portal returns, a later
readiness failure is not an auth timeout merely because login appeared earlier.
A failed tab read retains the last observation; the original 30-second deadline
is not extended.

For late Customer data, `PageReader.readCustomerName(expectedCaseNumber)` performs
a targeted lookup read. FAB polls every 250 ms for at most a fixed five-second
epoch and observes only the lookup, guarding full same-case identity, accepted
snapshot, current generation, missing Customer and user edits (including an empty
edited context). Sparse same-case scans preserve a known Customer. Repeated scans
do not extend the epoch; explicit refresh resets it, and identity changes discard
the old epoch. A menu-open background scan may revalidate and rebind only Customer
enrichment to the new generation, without applying its full snapshot. An active
Analyze keeps its frozen input. No auto-scroll is added: a genuinely lazy field
that never materializes cannot be captured, and appearance before expiry is not
guaranteed.

Retained offline evidence was read, not rerun here: **555/555 tests across 10
files**, exit 0 and `changedSources: []`, from
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-analyze-progress-workspace-customer-initial-green`
(`stdout.log`, `result.json`). TypeScript's sibling
`dh-analyze-progress-types-workspace-customer/result.json` also records exit 0 and
`changedSources: []`. These describe the recorded run, not later source mutations.
The user subsequently supplied the RED result: disabling portal workspace handling
and the Customer reader produced **8 failed, 37 passed, 334 skipped**. Together
with the restored GREEN and exact restoration evidence below, mutation proof is
no longer pending; no tests were rerun for this documentation update.

The existing supervisor was subsequently invoked exactly once with
`-Phase workspace-customer-regression -Label green-restored`, using a 330000 ms
tool timeout and its unchanged 300-second child-process limit. Actual restored
GREEN: **45 passed, 334 skipped (379 total), three files passed**, exit 0,
21.83 seconds. This is the focused selection, not another 555-test run. Evidence:
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-analyze-progress-workspace-customer-regression-green-restored`
(`stdout.log`, `result.json`, `process.json`, `source-before.json`). The recorded
child PID was `13132`, started at `2026-09-12T16:51:21.1210932+08:00`; a subsequent
process query confirmed that PID absent after exit. `changedSources: []` confirms
the supervisor's snapshotted inputs remained unchanged during this run.

Raw SHA-256 comparisons before and after restored GREEN exactly matched the
initial-green `source-before.json` for both restored files:

| Source | Exact initial-green / pre-run / post-run SHA-256 |
| --- | --- |
| `extension/src/components/FAB.tsx` | `1BAAC349AD019009C074F75DABDBA813CBF7A79F519040D8E144A9EC9AD3D578` |
| `extension/src/utils/attachmentPortal.ts` | `37600BC7D2878ED28C5AB1FF0599D6E25A3E6E21E2B1F6F9209F6AC88990B7B5` |

This follow-up made no source edits and read no customer-file data. It establishes
exact restoration of both files and the focused GREEN outcome, not the earlier
RED mutation results, which were not inspected here. No test expansion, build,
browser load/live Analyze, automatic Host switch or release occurred. Only this
document was updated after verification. Later user-load/runtime work requires
its applicable scope. Earlier production and Defender records are unchanged.

These are source fixes, not established as ready in `dist`: no new build or browser
verification was performed. Real modal markup and truly virtualized Customer
fields remain live-unverified. The five-second window performs no auto-scroll and
does not guarantee Customer availability before Analyze.

### External Folder Unavailable Follow-Up

User-supplied actual screenshot evidence verifies the External-folder text exactly:
"No files under this folder. You may not have permission to access this folder."
No table is present; the supplied `portal_wait` diagnostics record an inventory
count of 104. This evidence does not distinguish an accessible empty folder from
missing permission, and is separate from the missing-workspace modal above.

The initial inspect-only `folder_unavailable` helper outcome requires matching case
identity, a unique External folder, the exact text and no visible table/file rows.
The coordinator immediately returns unknown/unavailable rather than waiting the
full 30 seconds, with no Create/Cancel or download actions. **Historical,
superseded:** that first fix changed only the wait, not the notice text, and added
no wire reason or Host change. The reason/notice follow-up below supersedes that
limitation, but does not establish confirmed zero files or a live-verified fix.
Treating this as known-empty still requires future authoritative evidence that
the folder is accessible and empty, not an automatic API query.

Supplied targeted results: **93 passed, 259 skipped across two files**, not a full
run. RED produced **2 failures**; restored tests passed and raw hashes matched.
Preserve the procedural record gap: the first test attempt timed out at 60 seconds
without a captured PID, and later foreground logs have no dedicated-supervisor
records. These are limited offline results, not evidence of full workflow
compliance.

Subsequent supplied supervised TypeScript (`typesfolder-unavailable`) is
**confirmed**: exit 0, sources unchanged. Local Extension build
`dh-local-extension-2077-folder-unavailable-20260913` **passed** all five
default-items checks and tsc/Vite/copy. All 404 sources and selected tool bytes
were unchanged; the output inventory contains 13 artifacts. Worker identifier:
`T3iltI0_`; worker SHA-256:
`23EB2A2E45496A63439D15D6EB43A4EF0E64AB1B2880FBA373BE0DB192A81C71`.
These confirmed results do not repair the earlier test-process record gap or
establish full-suite or live verification.

That docs-only follow-up recorded supplied evidence with patch/diff checks only;
it performed no new tests, review, browser operations or Host writes. Earlier
histories and their verification limits remain unchanged.

### Folder Reason and Notice Follow-Up

September 13, 2026: current SW preparation preserves `reason: 'folder_unavailable'`
instead of collapsing the inspect-only outcome into `unavailable`. Inventory
remains unknown. `host/analysis_attachments.py` now includes `folder_unavailable`
in both its reason type and strict accepted-reason list, preserving it for notice
generation. This supersedes the earlier wait-only fix and unchanged notice text;
it does not change inspection guards or establish an accessible empty folder.

For this reason with zero supplied files, no images and zero skipped files, Host
returns the short localized notice:

- English: "DTM did not list accessible files (the folder may be empty or access
  may be restricted); this analysis uses the case text."
- Chinese: "DTM 未列出可访问文件（目录可能为空或无访问权限），本次按工单文本分析。"

This is a nonempty product notice, not a known-empty classification. Positive
supplied/skipped counts continue through the count/completeness and omission
warning path; shortening the zero-count notice must not hide known omissions.

Existing evidence was inspected without executing new tests:

- Frontend: **376/376**, three complete selected files, exit 0, with
  `changedSources: []`; not the whole frontend suite. Evidence:
  `dh-analyze-progress-attachment-night-folder-reason`.
- Safe Host `analysis-attachments` profile: exit 0 and unchanged sources. Main-agent
  inspection of `dh-safe-tests-d0538mk0/results.jsonl` confirms the final successful
  **21/21** event and zero failures/errors/skips. Parent evidence:
  `dh-analyze-progress-host-attachments-folder-reason`. These are helper tests with
  fake filesystem operations and SDK-shaped RPCs, not real attachment file I/O,
  SDK integration or Host runtime qualification.
- TypeScript: exit 0 and `changedSources: []`. Evidence:
  `dh-analyze-progress-types-folder-reason`.
- Local Extension build: **PASS**, exit 0, all five default-items gates and
  tsc/Vite/copy passed. Evidence: `dh-local-extension-2077-folder-reason-20260913`.
  All 404 checked sources and selected tool bytes were unchanged; 13 artifacts.
  Artifact identity SHA-256:
  `4561F34D0583B9BA49CC4575754D87E1013B30FC763FAFA81704A6DE75079DB0`.

Evidence directories above are under `%LOCALAPPDATA%/Temp/opencode/`. These later
complete selected-file results do not retroactively repair the earlier limited
test-process record. The new local `extension/dist` is ready, but build success
does not qualify runtime behavior. An already-running Dev Host must restart
normally to load the changed `analysis_attachments.py` reason schema; otherwise
its old strict validator rejects the new reason. Refreshing only the
Extension/page is insufficient. No Host EXE build, restoration, installation,
registry change or agent-run live Analyze occurred in this follow-up. This
documentation update performs only static source/evidence and patch/diff checks,
not new test execution or runtime operations.

Historical documentation gap, now resolved: the closed reason list in
[the wire contract](specs/native-message-snapshot.md#private-attachment-analyze)
includes `folder_unavailable` and its unknown-inventory semantics. The earlier
three-document update reported the omission without changing the spec; it is no
longer outstanding. This cleanup does not change the protocol or earlier results.

### Host Import Caller-Wait Follow-Up

Current Host source replaces the previously unbounded import caller await with
`AttachmentImportOwner`: one owned import task per Host and a cooperative
5-second caller wait. All metadata is validated and frozen before any I/O or
busy fallback. Empty input starts no thread. While a prior import remains owned,
a new call immediately receives a fresh fallback counting its selected files as
skipped; it neither queues nor reuses earlier inputs. Timeout likewise returns
a fresh skip fallback. Late completion is discarded and cannot trigger a model
send. Caller cancellation propagates while retaining the owned worker.

This bounds cooperative caller waiting, not underlying OS reads or executor
shutdown, which timeout/caller cancellation do not cancel or bound. Event-loop
starvation can delay the 5-second timer; it is not a hard real-time deadline.
DTM's separate 30-second readiness/auth deadline, file limits, configured model
timeout and FAB's 120-second preparation allowance are unchanged.

Status: **source-plus-focused-offline milestone complete**. Main-agent-confirmed
evidence supplied for this documentation finalization:

- `dh-safe-tests-5ukf7zga/results.jsonl`: final `finished: 31`, **31/31**, zero
  failures/errors/skips; runner exit 0 and unchanged sources.
- Cleanup/capture state: `cleanupErrors: []`, `capture_errors: []`,
  `reader_pending: false`, `child_unreaped: false`.
- Broader supervisor `dh-analyze-progress-host-attachments-import-deadline`:
  result 0, `changedSources: []`.
- Current `host/dh_native_host.py` SHA-256:
  `fefd0ccef620e54c5c06a04c3e37d9a31fb79e685f1e4ed3c5e4b0592187a160`.
  The SDK review binding was refreshed for source only; fixed SDK tests were not
  rerun. The historical 25-pass SDK result remains historical and does not qualify
  this new hash.

Evidence directories are under `%LOCALAPPDATA%/Temp/opencode/`. Preserve the
earlier test/build results above as historical evidence, not qualification of
this change. The completed milestone is focused offline verification, not real
attachment I/O, fixed SDK or live runtime qualification. Only Host source changed
for this follow-up: no new Extension build/reload is required for it. An
already-running source Dev Host needs a normal restart before future live
verification within authorized scope; no automatic restart or registry switch.
This documentation finalization performs static diff checks only, with no new
tests/builds, Extension reload, Host restart, browser/registry operations, actual
attachment file reads or model calls.

### Integration Boundaries

- `extension/src/background/attachmentPreparation.ts` now uses production
  `attachmentPortal.ts` and `attachmentDownload.ts`. The SW invokes preparation
  automatically before the first model send of every valid document-bound Analyze,
  including repeat Analyze on the same case, not once per case. Durable latest-started
  ownership, source identity and updater send authorization remain required.
- The SW alone constructs private `analyze_with_attachments` with
  `{analysis, attachments}`. Generic/page forwarding is denied. Host validates the
  envelope and reads only SW-selected completed browser-download paths, never
  page-provided paths. An updated matching Host is necessary: no attachment
  capability was added to `get_capabilities`, and an old runtime fails without
  a legacy-action fallback. Source/version metadata is not live qualification.
- DTM preparation has a 30-second create-to-ready/auth deadline separate from
  model execution. It opens an inactive owned tab, retries only transient
  read-only inspection, and never retries uncertain selection/download clicks.
  Sign-in and browser safety approvals need the user; no automatic focus or
  approval. Expiry skips unavailable files and automatically continues the
  still-current Analyze. Late auth/files cannot join the frozen invocation;
  already-started browser downloads are not cancelled.
- The coordinator correlates the full initial request URI to a unique download
  ID, waits a complete 10-second observation window per selected file, then checks
  safe/completed/existing metadata. Filename and timing alone never authorize a
  file. This is not exclusive provenance against identical concurrent requests.
  Browser work has an 89-second budget plus up to one second of cleanup.
- `host/analysis_attachments.py` enforces four files, 2 MiB each, 8 MiB total;
  `.png`, `.jpg`, `.jpeg`, `.txt`, `.log`, `.json`, `.xml`, `.csv`, `.md` only.
  Text is strict UTF-8 with BOM/newlines retained. Unsupported/unreadable/oversized
  inputs are skipped with notice accounting. PNG/JPEG signature checks are not
  full image sanitization; effective-session-model vision/media/count/size
  qualification is required before image send, with no automatic model switching.
- Raw attachment bytes intentionally bypass PII scrubbing; case text, context
  and canonical Custom User Prompt retain their scrub path. Host rejects observed
  links/reparse points and uses bounded-size reads into frozen in-memory bytes,
  not an OS sandbox or proof against filesystem races. No raw attachment URLs,
  credentials or contents may be logged. Downloads remain in the browser's normal
  destination, with no staging in Root and no Root/report-path change.

### Notice Source And Remaining Limits

Host now emits a nonempty `attachment_notice` in success `data` or the inner
Analyze error. The Extension maps it to persisted/rendered `attachmentNotice`,
including alongside localized known prompt codes. Host no longer prefixes returned
Markdown/error text and writes its own `## Attachment Status` section in the
saved report before `## AI Explanation`.

Before each send attempt, after image qualification, Host derives a fixed product
input-status summary from frozen preparation and the qualified-image count. It
appends the summary when nonempty to that attempt's prompt, asking the model not
to repeat status or claim omitted files were reviewed. The prompt starts afresh
from `safe_prompt`, so retries do not accumulate summaries. This is implemented
source, not verified model compliance or end-to-end delivery. Unknown inventory
retains cautious completeness wording, not a claim that attachments exist or
were all reviewed.

FAB now uses `(clampedModelSeconds + 120 + 10) * 1000` milliseconds, with 120
seconds of preparation allowance and 10 seconds of fallback grace. The configured
Host model timeout is unchanged. The import caller now has the cooperative
5-second wait described above; OS reads/executor shutdown and existing
startup/session refresh are not fully bounded. Event-loop starvation can delay
the timer. Do not infer a guaranteed end-to-end or Host-first timeout from browser
budgets or FAB's allowance. The earlier Host inline timeout-comment correction
alone did not add an import deadline or establish runtime verification; the
caller-wait implementation is the separate follow-up above.

## Historical Investigation

The following observations and test counts describe the standalone milestones at
their recorded source/artifact identities, not verification of current production
helpers or a renewal of the consumed live-effect allowance.

## Observed Flow

- The D365 attachment list opens an attachment metadata detail form, not the
  file download. The visible list was observed in the main D365 document.
- Open DTM Portal opens a case-number-based Home entry. The tested entry required
  manual account selection before displaying the portal. A workspace-based entry
  also exists; it is not evidence of an authentication bypass.
- After authentication, the portal displayed the expected case and External
  attachment list. A prior portal click triggered a browser multiple-download
  permission prompt; the user reported successful download after granting it.
  Automated download-completion correlation was not established by that report.
- Legacy CDP Page download events did not provide completion evidence in these
  probes. A Chromium-internal downloads-page observer did not match this Edge
  implementation. Neither is an appropriate product dependency.

## Download Handler Evidence

Read-only inspection of the already-loaded portal found a Knockout binding:
`click: $root.downloadFileClicked`. Its display bindings use
`$data.friendlyName || fileName` and `title: fileName`.

The loaded entry handler prevents the default link action and passes
`self.filesGrid.downloadFile`, the selected row, and a downloading status to
`makeRequest`. Static source inspection shows that `makeRequest` obtains an
access credential and supplies it to the callback.

A unique matching download function definition in the same loaded script builds
a URL from `viewModel.filePathUri`, appends `partnerid` and `access_token`, and
assigns the result to `window.location.href`. The callback definition was matched
statically, not verified through its runtime function reference. No handler was
invoked during this inspection. No credential value, customer row object,
download URL or attachment content was collected into this record.

## Unresolved Source Contract

An additional authorized narrow read confirmed that the selected row exposes
`filePathUri` as an own data property. Its URL uses a fixed DTM API host, includes
the matching workspace as a complete path segment, and has a `filename` query
parameter. That base value contained no credential-like query fields, user-info
or fragment. Dynamic path segments and parameter values are not recorded here.
No separate stable file ID or cross-time identity contract was confirmed.

Cross-time stable identity is not required to correlate one frozen invocation's
request URI. It would be required before claiming reliable cross-run cache reuse.
The initial helper therefore compares the complete captured base request with
the browser's initial download URL, removing only the two observed portal-added
authentication fields. This is not permission to accept arbitrary origins or to
infer file ownership from a filename. The production adapter must supply the
fixed allowed API origin and validated case/workspace/source-document binding.

The official [downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads)
provides an ID when the extension initiates a download. Its documented
`DownloadItem` does not supply a source tab ID for arbitrary portal downloads.
Filename and timing alone cannot authorize reading a downloaded file for model
input. A portal click followed by an unrelated same-name download must never
select that file.

At this investigation stage, wiring Analyze required a bounded mapping from the
selected case/attachment to the download request and completed file. Current source
now implements that mapping and Host preparation, with verification still pending.
Authentication stays in the browser; no generic page-provided local-path reader,
token transfer to Host, or credential-bearing URL logging is permitted.

## Offline Correlation Milestone

`extension/src/utils/attachmentDownload.ts` captures an invocation-local URI,
matches a browser candidate and rejects ambiguous distinct download IDs. It
rejects changed paths/query values, foreign origins/workspaces, extra or duplicate
parameters, unsafe URL forms and malformed UTF-8 query encoding. Only the known
portal-added `partnerid` and `access_token` fields are removed for comparison.
Candidates do not expose credentials through the helper's result or logs.

The matching helper alone does not enforce request freshness, distinguish replay
of the same URI, verify a downloaded file, check model capabilities or declare
download completion. At this historical milestone it was not imported by Analyze
and no manifest/Host attachment interface existed. Current production integration
is described above; the historical result does not verify those additions.

The explicit `attachmentDownload.test.ts` selection passed 109/109 synthetic
tests; TypeScript also exited 0. Both supervisors reported unchanged inputs.
The focused review caught a lossy URLSearchParams UTF-8 normalization case, which
was fixed and included in those tests. This is offline fixture evidence, not a
real Edge download qualification. Evidence under the approved local temp parent:
`dh-analyze-progress-attachment-uri-green` and
`dh-analyze-progress-types-attachment-uri`.

The controlled Extension-context verification below confirmed the initial URL,
download ID and completion relationship for one run. If another runtime does not
provide the required initial URI, fail closed rather than substitute filename or
timing. That gate preceded the current Host-import/Analyze source integration;
the latter remains UNVERIFIED. No live model request was performed in that observation.

## Standalone Browser Harness

The isolated `extension/tools/attachment-download-harness/` implements a
user-selected, document-bound portal adapter, the shared URI matcher, an ID-only
download observer, and a persisted once-only click latch protected by Web Locks.
It has no Host connection, telemetry, product key, background worker or automatic
analysis. Its 30-second observation window is not the planned authentication wait.
It never imports downloaded file bytes or approves browser safety prompts.

Three explicit offline files passed 134/134 tests. The separate harness TypeScript
check passed. The authorized esbuild 0.27.2 build succeeded with unchanged source
and toolchain bytes and wrote only the fresh independent output directory:
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-attachment-download-harness-v1`.
Source/tool hashes and output hashes are packaged with the harness. Build stdout
and stderr were captured; stderr was empty. Evidence directories are
`dh-analyze-progress-harness-initial`,
`dh-analyze-progress-harness-types-initial`, and
`dh-analyze-progress-harness-build-v1` under the approved temp parent.

This is not a DH product build, installer or release. The successful v3 browser
observation below establishes metadata correlation in this controlled run, not exclusive provenance
against concurrent identical requests or verification of downloaded file bytes.

### First Browser Inspection And Fix

The loaded v1 manifest and bundled script hash were verified before operating its
UI. The selected portal matched the approved record, but Inspect failed before
Run; no download click or spent-marker consumption occurred. A narrow live DOM
check found one visual External tab represented by both a selected presentation
`li` and its selected inner `a[role="tab"]`. Their same-link/same-list-item
relationship was confirmed without recording customer values.

The adapter now folds only that specific wrapper relationship and still rejects
independent selected tabs or different links. Portal tests passed 81/81, including
three new regressions; the harness TypeScript check passed. Version 1.0.1 was
built into the fresh `dh-attachment-download-harness-v2` temp directory; v1 was
preserved. Source snapshots remained unchanged during these checks. A follow-up
read-only browser connection timed out before attaching and performed no click;
later portal guards remain unverified live. The v2 package awaits user loading.
No spent marker was cleared, and the approved single download is still unused.

### Remaining Portal Format Fixes

The v2 bundle hash and manifest were verified; Inspect still failed and Run was
not invoked. Subsequent scoped structural reads confirmed all three remaining
format issues before rebuilding: table header indentation exceeded the raw
100-character budget despite short labels; static Knockout keys were quoted;
the one query key was case-sensitive `fileName`, not lowercase `filename`.
The filename value itself matched the selected control. Case/workspace, origin,
path and encoding checks passed in the diagnostic projection; this was not a
download-completion test.

Header normalization now has independent raw, node-count and normalized-length
bounds; identity text handling was not changed. Binding parsing accepts paired
quotes only around known keys and keeps fixed expressions. Portal and controller
both accept exactly `fileName` or `filename`, with one exact matching value.
Three explicit test files passed 161/161 (observer 29, portal 101, page 31), and
the separate TypeScript check passed. Version 1.0.2 built successfully into the
fresh `dh-attachment-download-harness-v3` directory with unchanged inputs. Old
packages and markers were preserved. Evidence labels are `portal-shape-fixed`
and `v3` in the same supervisor directories as prior checks. User loading and
the approved single download remain pending; no attachment contents or tokens
were read or sent to a model.

### Controlled Edge Download Passed

On September 11, 2026, the loaded harness manifest version 1.0.2 and bundled
`page.js` SHA-256
`dd7d584b051b114b18c757e9db51498b2178a8def72edeff3f5c65b1de72bdaf`
were verified before operating its UI. The unique Home portal was selected and
Inspect passed. Run was clicked exactly once. After the full observation window,
the harness reported `complete`, `matchedCount: 1`: its full initial-URI matcher
identified one download ID, and browser metadata reported safe, complete and a
non-negative file size. This was not a file-content or exclusive-origin proof.

Helper PID 50024 started at `2026-09-11T12:32:16.294Z` and finished in 40.605
seconds. It reported successful detach and socket closure, zero pending requests
and zero remaining timers; the subsequent process check confirmed exit. The
previous connection timeout performed no Inspect or Run. No download retry was
performed, no spent marker was cleared, and the single authorized click is now
consumed. The user-owned diagnostic and portal pages were left open.

No attachment body was read, no model call or Host import was made, and no URL,
credential or local download path was included in diagnostic output. This
qualifies the controlled browser metadata correlation only. Production Analyze
integration, bounded-size file import, supported-model input and the 30-second
authentication fallback now exist in source. The focused offline milestones above
passed, including confirmed restored GREEN and final TypeScript. Production
runtime verification remains pending. The runtime and timing limits above remain open.

## Investigation Limits

The final handler inspection used two sequential direct CDP connections rather
than the intended single maintained connection. Both helpers reported successful
handle release, Debugger disable, detach and socket closure; process checks
confirmed exit. No Network/Fetch interception, download, API invocation or model
request occurred in that inspection. No additional browser probing should be
treated as authorized merely by this record.
