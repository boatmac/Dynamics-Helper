# Project TODO

## Capture Hardening

The ten prior-review fixes are implemented in current source; their single
persistent inventory and scoped offline results are in
[Capture Hardening Review](docs/capture-hardening-review.md). Initial **475/491,
16 failed** is retained; affected files passed **247/247**, final readers
**301/301**, and mutation restoration **19 passed, 472 skipped** with exact raw
restoration. Final TypeScript `capture-final` exit **0**, sources unchanged, is
confirmed from the existing result. The final milestone now confirms **10/10
files, 509/509 tests passed, zero failures or skips, 112.30 seconds**, exit **0**
and exact source bytes unchanged (`changedSources: []`), from existing evidence
under `%LOCALAPPDATA%/Temp/opencode/dh-analyze-progress-capture-hardening-final-milestone/`.
This is a **full selected 509-test run, not the whole Extension suite**; earlier
overlapping executions remain distinct history. The review records full source
SHA-256 values from `source-before.json`: FAB `D52BD10D...`, pageReader
`FBD51EEA...`, createdOnModel `CB30DAFF...`, and irSla `574C2280...`.

- [x] Record all ten addressed source issues and scoped offline verification.
- [x] Record the final complete selected 509/509 run without rerunning tests.
- [x] Prior documentation commit `b78afd5` was already pushed by the prior agent,
  as reported by the user. This follow-up explicitly performs no staging, commit
  or push, regardless of broader sequence approval.
- [ ] Record build evidence separately through the main agent; it remains pending.
- [ ] Confirm a Release version with the user; none has been selected or published.
- [ ] Keep running Dev/source snapshot identity distinct from frozen artifacts.
  The production entry is quarantined. Runtime entry remains separately scoped;
  no automatic Prod restoration, installation, Host restart or registry change.

This is not a completed unified-coordinator/full capture refactor, new API or
OData migration. No runtime benchmarks, real-performance gains or current-browser
qualification are established; test duration is not a runtime benchmark. Preserve
earlier source/build history and architecture changes; existing security records
remain separate and customer details must not be replicated here.

## New Repository Setup

- [ ] Confirm the company GitHub host and target private repository under the
  managed user account, including enterprise permission to create personal repos.
- [ ] Choose the product/repository name and default branch for the new start.
- [ ] Decide release distribution and update authentication before replacing URLs.
  The current updater uses anonymous requests to a public repository; a private
  source repository is not automatically a working software distribution channel.
- [ ] Establish a clean initial commit from the reviewed current files. Exclude
  `archive/`, prior Git objects/refs, external records, dependencies and generated
  binaries. The old repository retains its archive; ordinary directory copies
   must explicitly exclude it, even when files are ignored by Git.
   Verify the export tree: `git archive HEAD` does not include uncommitted cleanup
   or new documents, and staging alone does not change HEAD.
- [ ] Update active support, privacy, documentation and release links together
  with the corresponding public-menu tests after the destination is chosen.
- [ ] Decide whether installed extension/native identities remain compatible.
  Do not regenerate keys, reset storage or change session identity incidentally.

## Maintenance

- [ ] Retire the three unsupported SDK debug scripts together with their dedicated
  source-inspection test, preserving meaningful prompt-isolation coverage.
- [ ] Complete applicable test inventory/source reviews when those test scopes
  are selected; do not treat pending entries or old results as current approval.
- [ ] Assess optional timezone-data packaging and browser-compatibility data
  warnings within a scoped dependency maintenance change.

## Attachment Analysis

Production helpers and current SW/Host integration are **implemented-source;
focused offline milestones passed, production runtime UNVERIFIED**. The initial
13-file frontend run passed 519/524; all five failures were in
`FAB.pageIdentity.test.tsx`. FAB's premature progress settlement before terminal
page revalidation was fixed. The affected four complete files passed 98/98,
including two new ownership cases: the selected inventory is now 526 in aggregate,
not a full 526-test run. The early-settle mutation produced the expected 2/2 RED;
mutation removed, restored GREEN confirmed: 2 passed, 45 skipped, exit 0, with
FAB's raw hash matching the pre-RED ownership-fixed bytes (prefix `D5DF`). Final
TypeScript (`attachments-final`) exited 0 with sources unchanged. Pure-Host `analysis-attachments`
passed 21/21, exit 0, confirmed from `dh-safe-tests-b5tyucw3/results.jsonl` and
`result.json`. Filesystem/readers and SDK-shaped RPCs are mocked, not real
attachment I/O or Host/SDK runtime. At that milestone, production was not built,
installed or live-verified; no actual attachment model inputs were exercised. No historical
harness result qualifies production Analyze. See
[source status and historical evidence](docs/dtm-attachment-investigation.md).

The later [local build/install record](docs/attachment-local-install-verification.md)
records SDK/build/package results, but no installation or live Analyze. Its pending
complete-installer plan is **superseded by the user's testing-route rule**, not
waiting for browser/Host shutdown or another installer attempt. Existing artifacts
are historical evidence, not installed-runtime qualification; this documentation
update does not reverify them or perform any runtime operation.

September 12 night [offline follow-up](docs/dtm-attachment-investigation.md#night-offline-follow-up):
the `ResultPopover`-only fix translates one exact leading Host Markdown notice
prefix to a plain heading, preserving body text without HTML/image/link nodes;
raw wire/storage/report text is unchanged, including existing hydrated records.
Production empty-inventory logic is unchanged; strengthened tests cover recognized
empty `tbody` complete zero, pagination incomplete/unknown, unrecognized placeholders
never confirming zero, and source `0`/`null` not overriding unknown inventory.
First GREEN: three complete files, 220/220 (23 popover, 124 portal, 73 preparation).
Mutation proof: expected 6/6 failures (four heading, two pagination), mutations
restored; main restored GREEN **confirmed**: 6 passed, 214 skipped, actual exit 0,
sources unchanged. `ResultPopover` and `attachmentPortal` raw hashes exactly
match first GREEN (prefixes `2368` and `F39F`, respectively). TypeScript
(`attachment-night`) **confirmed**: result exit 0, `changedSources: []`.
Earlier user-observed Dev screenshots (`Included 1, skipped 0`) and model image
description establish a positive path only, not all-production qualification or
independent raw-byte audit; actual empty DOM remains not live-verified. No builds,
downloads, model/browser operations, registry switches, release or commit tonight.
Updated UI source is not in `dist`; a future approved build/reload is required.

September 12 [source-check retry follow-up](docs/dtm-attachment-investigation.md#source-check-retry-follow-up):
user reports attachments unavailable without a DTM tab, then working after manually
opening DTM. A pre-opened tab is not a product requirement; live cause is
**UNCONFIRMED**. The reported previous-success/notice-fix comparison found
preparation/portal/download/SW sources byte-identical, with only notice UI changed;
no new packaging regression is established. The source/test-only fix adds bounded
`sourceCheck` read retries (3 seconds, 200 ms polling, clipped to 30-second portal
and 89-second work deadlines), not action retries; mismatch/owner loss/malformed
results fail immediately and `finally` cannot renew an exhausted window.
Reported preparation GREEN: **91/91**; null/throw RED: **3 failed, 2 passed,
86 skipped**. Restored GREEN **confirmed**: **5 passed, 86 skipped**, exit 0;
raw preparation hash (prefix `C48B`) equals first GREEN. TypeScript (`source-retry`)
exited 0 with sources unchanged. Local Extension build
`dh-local-extension-2077-source-retry-20260912` **passed** all five default-items
checks and TypeScript/Vite/copy steps; all source/tool inputs stayed unchanged.
The 13-artifact inventory hash is
`107744E2EE3C6BBBC98701F00F8736DEE57D71D5F872A23863968DDA727ECAD5`.
`extension/dist/` is ready for user reload. No Host or registration modification;
registration stays **Dev**. No actual Analyze by the agent, and no live-cause or
actual-browser fix confirmation.

September 12 [stage diagnostics follow-up](docs/dtm-attachment-investigation.md#stage-diagnostics-follow-up):
the user still reports `unknown/0` after the 3-second source-check retry change.
All four actual read-only source checks passed (`matches: true`, `count: null`,
55 nodes); this establishes current source-check success, not the historical
failure stage. No pre-opened DTM tab is required; runtime root cause remains
**UNRESOLVED**, not fixed. Terminal diagnostics now use the fixed console warning
`[DH] Attachment preparation incomplete` with only closed `{stage, reason}` values,
no customer keys and no preparation behavior change. Reported verification:
**107/107** tests passed, including 16 diagnostics tests; TypeScript and the local
Extension build passed, including all five default-items gates, with source/tool
inputs unchanged. Evidence: `dh-local-extension-2077-stage-diagnostics-20260912`;
dist bundle identifier `BF6Y6A2h`, bundle SHA-256 prefix `C504`.
At that milestone, user reload and failure stage/reason collection were pending;
no new Analyze by the agent. Dev registration remained unchanged; no Host build
or permissions changes. These supplied results were recorded docs-only, without
new tests, investigation or review.

September 12 [portal wait diagnostics follow-up](docs/dtm-attachment-investigation.md#portal-wait-diagnostics-follow-up):
user-supplied actual console evidence reports `portal_wait` / `unavailable`, with
text Analyze succeeding. Initial source validation and owned-tab creation passed,
but no valid inventory was obtained. Authentication is not established: the
manifest does not permit reading the login-origin URL. The earlier 100 ms source
hypothesis is not a proven root cause. The new diagnostic-only fixed wait summary
has counts capped at 256, `lastOutcome`, and allowlisted `portalDetail`; no URLs,
raw errors or secrets. Inspect-helper diagnostics are optional, default `false`;
Host wire, retries, permissions and the 30-second deadline are unchanged.
Reported results: **278/278** (23 ResultPopover, 121 preparation, 134 portal),
TypeScript passed, local build and all five default-items gates passed, with
source/tool inputs unchanged. Worker identifier `DImdQwBH`, reported SHA-256
prefix `B34`. Root cause remains **UNRESOLVED**; no root-cause fix is claimed.
- [ ] Await user reload of the latest diagnostics build and its diagnostic line.
  No actual Analyze by the agent; this entry records supplied results only, with
  static diff checks and no new execution of tests, builds or runtime probes.

September 12 [tabs metadata permission follow-up](docs/dtm-attachment-investigation.md#tabs-metadata-permission-follow-up):
subsequent user-supplied actual wait counters are `urlUnavailable: 107`,
`tabReadFailed: 0`, `injectionFailed: 0`, `portalUnavailable: 6`, and
`lastOutcome: url_unavailable`, not proof of authentication failure. The user
approved adding only `tabs` for this change to address the documented cross-origin
metadata gap, not a guaranteed root-cause fix or automatic SSO. The permission
allows extension-wide URL/title/`pendingUrl` metadata access; attachment code
reads only its owned tab and logs no raw URLs. D365/DTM host permissions remain
unchanged; no login-host or `cookies` permission, login injection, automatic focus
or approval is added. The 30-second deadline and independent harness manifest
permissions remain unchanged. Root cause remains **UNRESOLVED**.
- [x] Record assistant-run `tabs` addition verification: **122/122** preparation tests
  passed (permission contract and auth/missing-URL boundaries), TypeScript exit 0,
  and full local Extension build PASS including all five default-items gates and
  tsc/Vite/copy; raw source/tool inputs unchanged. Evidence:
  `dh-local-extension-2077-tabs-permission-20260912`; output
  `extension/dist/manifest.json` SHA-256:
  `79C55E07391C3BA73BA9C01E746831386C43083A58D05471842030BA66C918EE`.
  These checks alone do not establish runtime behavior or the historical cause.
- [x] Record the subsequent user-operated Dev result: DTM authentication appeared,
  manual account selection allowed download, and the final result reported
  `Included: 1; skipped: 0` (74.2s). Notice formatting was clean. This qualifies
  the observed success path, not all historical causes or model interpretation.
- [ ] Verify confirmed-empty inventory and unattended 30-second authentication
  expiry under a separately applicable live scope; do not repeat the successful
  Analyze just to record its result.

- [ ] Re-scope the pending attachment runtime verification under the applicable
  work package using [the authoritative Testing Cycle](AGENTS.md#native-host-mode-selection).
  These unreleased changes affect both components: local `extension/dist/` via
  **Load unpacked** plus source Dev Host via `dev_switch.py dev`, not a complete
  installer. No installation or live Analyze has been performed in the recorded
  attempt. Preserve the prior single-Analyze limit; changing the route does not
  authorize browser/registry actions or renew an attempt budget. After a separately
  authorized GitHub Release, test upgrades only through the Extension's own feature.

September 12 [workspace-missing and late Customer follow-up](docs/dtm-attachment-investigation.md#workspace-missing-and-late-customer-follow-up):
the user-observed missing-workspace failure now has an implemented source fix,
not a live-verified resolution. Exact same-case modal inspection never clicks
Create/Cancel; non-conflicting evidence returns known-empty without a yellow
warning, while a positive D365 count keeps inventory unknown. Returning to the
portal clears historical auth-wait classification. Customer-only enrichment has
a fixed five-second/250 ms window, lookup-scoped observation, same-case/generation
and user-edit/empty protections, and frozen active Analyze input. Repeated scans
do not extend the epoch; explicit refresh resets it. Menu-open background scans
may rebind Customer-only authority after revalidation, not replace the full
preview. No auto-scroll or guarantee that a lazy field materializes before expiry.
- [x] Read retained offline results: **555/555 across 10 files**, exit 0,
  `changedSources: []`; TypeScript exit 0, `changedSources: []`. Evidence under
  `dh-analyze-progress-workspace-customer-initial-green` and
  `dh-analyze-progress-types-workspace-customer` in the approved Temp directory.
  No tests were rerun for this docs-only update.
- [x] Mutation proof: disabling portal workspace handling and the Customer reader
  produced **8 failed, 37 passed, 334 skipped**. Restored GREEN passed **45 tests,
  334 skipped, across three files**, exit 0; raw FAB/portal hashes match initial
  GREEN exactly. Full hashes and restored-run evidence remain in the linked
  investigation. This focused run is not another full 555-test run.
- [ ] Live verification of these fixes remains pending. This docs-only scope does
  not build, load/reload the browser, Analyze, automatically switch Host, or
  publish a release. Source fixes are not established as ready in `dist`; real
  modal markup and truly virtualized Customer fields remain live-unverified, with
  no guarantee Customer is available before Analyze. Any later user-load/live work needs its applicable scope;
  prior production/Defender records remain unchanged.

September 13 Customer scroll follow-up (Customer-only update to the history above):
the user confirmed that Customer DOM materializes after scrolling and reopening DH
then reads the name. New source adds a passive capture-phase scroll listener only
with the menu open, missing Customer, unedited context, and no active or hydrated
Analyze pending. It debounces one field read by 200 ms, with pending-scan gating
bounded to one second from the latest scroll. Expected-case/generation checks and
frozen Analyze payloads remain intact; the original five-second polling window is
unchanged. The listener never auto-scrolls or starts a full scan. Sparse same-case
scans preserve known names without a cross-case cache. Unmaterialized names cannot
be read before render; initial Customer availability without user scrolling is not
guaranteed. The user observation does not establish new-listener runtime success.
- [x] Record supplied focused results: **112/112 across two files**; **17 scroll
  cases**. Scroll mutation RED: **3 failed, 14 passed, 95 skipped**. These are
  supplied results, not executions or independent confirmations by this docs task.
- [x] Supplied restored GREEN confirmed: **17 passed, 95 skipped, 0 failed**;
  raw FAB hash prefix `7B06...` equals initial GREEN. TypeScript `customer-scroll`
  exited 0 with sources unchanged. This is focused synthetic source coverage,
  not a full 112-test restoration rerun or actual new-listener runtime confirmation.
- [x] Approved local Extension build **PASS**: all five default-items gates plus
  tsc/Vite/copy, 13 artifacts, 408 sources and selected tooling unchanged. Evidence:
  `dh-local-extension-2077-customer-scroll-20260913`; manifest SHA-256:
  `A57DF1988EF204EA41AAB1021053F5BB818B4314C8BA3E9977F765F47BB2E701`.
- [ ] Actual user verification of the new listener remains unconfirmed. The user
  can reload local `extension/dist/`, refresh D365, keep the DH menu open and scroll
  until the Customer field appears. With the documented guards satisfied, the
  expected preview update needs neither reopening nor Analyze; no unrendered-name
  availability is promised. This docs-only finalization performs static diff checks
  only, with no new review, source/test, build, browser, API, Host, or registry
  operations. Prior histories and IR observations remain unchanged.

Historical [External folder-unavailable follow-up](docs/dtm-attachment-investigation.md#external-folder-unavailable-follow-up), superseded by the reason/notice follow-up below:
the actual screenshot verifies the exact text "No files under this folder. You may
not have permission to access this folder." with no table; `portal_wait` diagnostics
record an inventory count of 104. The inspect-only `folder_unavailable` helper
requires matching case identity, a unique External folder, the exact text and no
visible table/file rows. The coordinator immediately returns unknown/unavailable,
without the full 30-second wait or Create/Cancel/download actions. That first fix
changed only the wait, not the notice text: it added no wire reason or Host change.
Empty versus permission-denied could not be inferred, and still cannot be. This
historical result is not a confirmed-zero or live-verified fix.
- [x] Record supplied focused evidence: **93 passed, 259 skipped across two files**,
  not a full run; RED **2 failed**, restored PASS and matching raw hashes.
  Evidence is limited: the first test attempt timed out at 60 seconds with no PID
  captured; later foreground logs lack dedicated-supervisor records. Do not claim
  full workflow compliance from these results.
- [x] Supplied supervised TypeScript (`typesfolder-unavailable`) confirmed exit 0,
  sources unchanged. Local build `dh-local-extension-2077-folder-unavailable-20260913`
  **passed** all five default-items checks and tsc/Vite/copy; 404 sources and selected
  tool bytes were unchanged, with 13 artifacts. Worker: `T3iltI0_`; SHA-256:
  `23EB2A2E45496A63439D15D6EB43A4EF0E64AB1B2880FBA373BE0DB192A81C71`.
  These results do not repair the limited test-process record or establish a full
  suite or live verification.
- [ ] Treat the folder as known-empty only with future authoritative evidence of
  an accessible, empty folder, not an automatic API query. The shortened notice
  below does not establish this evidence.

Latest [folder-reason and notice follow-up](docs/dtm-attachment-investigation.md#folder-reason-and-notice-follow-up):
SW now preserves `reason: 'folder_unavailable'` with unknown inventory, and Host
adds it to the strict reason schema. Zero supplied files, no images and zero skips
use a short English/Chinese notice: DTM did not list accessible files; the folder
may be empty or access restricted; this analysis uses the case text. This is not
known-empty. Positive supplied/skipped counts keep count/completeness and omission
warnings; this supersedes the previous wait-only, unchanged-text behavior.
- [x] Existing frontend evidence confirms **376/376 across three complete selected
  files**, exit 0 and `changedSources: []`, not the entire frontend suite.
- [x] Existing safe `analysis-attachments` profile confirms exit 0; main-agent
  inspection of its retained final event confirms **21/21**, successful, with no
  failures/errors/skips. Helper filesystem operations and SDK-shaped RPCs are
  fakes, not real attachment I/O or Host/SDK runtime verification.
- [x] Existing TypeScript result confirms exit 0 and unchanged sources. Local build
  `dh-local-extension-2077-folder-reason-20260913` passed all five default-items
  gates and tsc/Vite/copy, with 404 sources and selected tool bytes unchanged and
  13 artifacts. The new local `extension/dist` is ready, not runtime-qualified.
- [ ] Before later authorized runtime verification, the already-running Dev Host
  must restart normally to load the changed `analysis_attachments.py` reason
  schema; otherwise strict validation rejects `folder_unavailable`. Refreshing
  only the Extension/page is insufficient. No Host EXE build, restoration,
  installation, registry change or agent-run live Analyze occurred in this
  follow-up; this docs-only update executes no new tests or runtime operations.
- [x] Historical documentation gap resolved: the closed reason list in
  `docs/specs/native-message-snapshot.md` now includes `folder_unavailable` and
  explicitly retains unknown inventory. The earlier omission remains investigation
  history, not an outstanding wire-contract gap.

**Host import caller-wait follow-up:**

- [x] Implement source for one owned import task per Host with a cooperative
  5-second caller wait. Validate all metadata before any I/O or busy fallback;
  empty input starts no thread. Busy calls immediately receive a fresh fallback
  counting their selected files as skipped, with no queue or reuse of prior
  inputs. Timeout also skips the invocation's selected files. Discard late
  completion without a model send; propagate caller cancellation while retaining
  the owned worker.
- [x] Complete the source-plus-focused-offline milestone. Main-agent confirmation:
  **31/31**, zero failures/errors/skips, runner exit 0 and unchanged sources;
  `dh-safe-tests-5ukf7zga/results.jsonl` ends with `finished: 31`.
  `cleanupErrors: []`, `capture_errors: []`, `reader_pending: false` and
  `child_unreaped: false`. Broader supervisor
  `dh-analyze-progress-host-attachments-import-deadline`: result 0,
  `changedSources: []`. Current `host/dh_native_host.py` SHA-256:
  `fefd0ccef620e54c5c06a04c3e37d9a31fb79e685f1e4ed3c5e4b0592187a160`.
  SDK review binding refreshed for source only; fixed SDK tests were not rerun.
  The historical 25-pass SDK result does not qualify this new hash. Historical
  checks above remain historical, not verification of this change. This milestone
  is not real attachment I/O or live runtime qualification.
  This documentation update runs no tests, builds, browser/registry operations,
  actual attachment file reads or model calls.
- [ ] Future authorized live verification needs a normal restart of an
  already-running source Dev Host, not an automatic restart or registry switch.
  This follow-up changes only Host source; no new Extension build/reload is
  required for it. OS reads and executor shutdown remain unbounded by timeout or
  caller cancellation; event-loop starvation can delay the 5-second timer, which
  is not a hard real-time deadline. DTM's separate 30-second deadline, file limits
  and FAB's 120-second preparation allowance remain unchanged.

- [x] Implement and verify the isolated full-request URI correlation helper
  (historical 109/109 synthetic tests and TypeScript passed). This milestone alone
  does not verify current integration, freshness, file bytes or browser completion.
- [x] Verify the standalone browser adapter against Edge's initial download URL:
  the authorized single-click run matched one download ID and reported completion.
  This controlled observation does not prove exclusive provenance against an
  identical concurrent request or verify file bytes. Current production integration
  and Host import remain UNVERIFIED; no filename/time fallback is permitted.
- [x] Build an isolated, single-use browser download harness without changing DH
  runtime permissions or Host. Latest offline tests passed 161/161 and harness
  TypeScript passed; version 1.0.2 built and passed the controlled Edge download
  observation. Its single-click allowance is consumed; production verification
  remains pending, not authorized by that result.
- [ ] Verify current production preparation/dispatch: automatic before the first
  model send of every valid document-bound Analyze, including repeat Analyze on
  the same case; private SW `analyze_with_attachments`, page/generic denial,
  latest-started ownership and updater send gates. Source is implemented.
- [ ] Verify the implemented 30-second DTM create-to-ready/auth deadline separately
  from the model wait, transient read-only retries only, user-controlled sign-in
  and browser approvals, and automatic continuation without unavailable files on
  expiry. No automatic approval/focus or uncertain selection/download retry.
- [ ] Verify implemented frozen invocation bytes and late-event exclusion;
  ending preparation does not cancel browser downloads. Correlation is not proof
  of exclusive provenance against concurrent identical requests.
- [ ] Verify implemented raw attachment input without PII scrubbing, while case,
  context and canonical Custom User Prompt retain redaction. Limits: four files,
  2 MiB each, 8 MiB total; `.png`, `.jpg`, `.jpeg`, `.txt`, `.log`, `.json`, `.xml`,
  `.csv`, `.md`; strict UTF-8 text retaining BOM/newlines. Verify unsupported/failed
  skips and effective-model image vision/media/count/size checks, with no autoswitch.
- [ ] Verify implemented Host import of SW-selected completed download paths only,
  observed link/reparse rejection and bounded-size in-memory reads. No page paths,
  raw URL/content/credential logs, Root staging or changed Root/report paths;
  downloads remain in the browser default destination. Not an OS sandbox or
  guarantee against filesystem races. The cooperative 5-second import caller wait
  is now implemented as recorded above; OS reads/executor shutdown are not
  cancellation-bounded, and event-loop starvation can delay the timer.
- [ ] Verify implemented Host separate `attachment_notice` output and Extension
  `attachmentNotice` persistence/hydration/rendering alongside known prompt codes.
  Host now emits notices in success `data`/inner errors, writes its own report
  section and no longer prefixes returned Markdown/error text. Fixed input-status
  summaries are prepared before each send attempt from frozen inputs and qualified
  images when nonempty. Preserve cautious unknown-inventory wording; the model is
  asked not to repeat status or claim omitted files were reviewed, not guaranteed
  to comply. Do not rely on model output for the product notice.
- [x] Record the affected four-file 98/98 rerun and pure-Host 21/21 offline
  milestone, retaining the initial 519-pass/5-fail history and mocked-I/O limits.
- [x] Confirm restored GREEN (`green-restored`) after removing the expected
  2/2-failing early-settle mutation: 2 passed, 45 skipped, exit 0; FAB raw hash
  matches the pre-RED ownership-fixed bytes (prefix `D5DF`). Final TypeScript
  (`attachments-final`) separately exited 0 with sources unchanged. These focused
  results do not establish a full 526-test run or production qualification.
- [ ] Determine any remaining SDK/full-build verification from the current bytes
  and applicable scope, accounting for the later results in the local build record
  above rather than repeating them automatically. At the earlier offline milestone,
  the Host source review hash was updated in `tests/sdk-test-review.json` to
  `32736e8b912ebf54b51de265932e3baa856aa353f43bb2be560edde486fd018e`;
  fixed SDK tests had not been rerun and this hash was not runtime qualification.
  Prior standalone-harness build approval does not authorize production builds.
- [ ] Verify the implemented FAB fallback `(clampedModelSeconds + 120 + 10) * 1000`
  ms (120 seconds preparation, 10 seconds grace), with unchanged Host model timeout.
  Existing startup/session refresh and the cooperative import caller wait do not
  establish an end-to-end or guaranteed Host-first deadline.
- [ ] Qualify a matching updated Host/Extension runtime within separately approved
  scope. No attachment capability negotiation was added; old Host private-action
  failure has no legacy fallback. Current source and unchanged version metadata
  do not establish frozen-build, installed-runtime or live model compatibility.

## IR SLA Snapshot

The [first bounded milestone](docs/specs/ir-sla-snapshot.md) is **implemented in
source**: only the observed exact `Succeeded` terminal label is recognized, with
strict active Summary ownership, full-record before/after checks, a typed
status/capture-time pair, and current accepted-scan metadata replacing the reserved
IR section in outgoing Analyze. Missing root omits the pair and renders
`Unknown` / capture `unavailable`; recognized but unsupported/ambiguous evidence
returns `unknown` with scan-time ISO UTC. Countdown/deadline remain unknown.
The earlier bounded source/offline milestone is **complete**, not all IR field
support. Confirmed Profile 1 read-only inspection found no `aria-controls` on the
selected Summary tab, explaining the earlier source-version rejection. The source
fix permits only absent-attribute fallback through the actual record-pane and
matching full 16/19-digit canonical-header structure; present invalid controls
still reject. That earlier source required `expectedCase` only for fallback;
the later capture hardening requires canonical full-record ownership on both
explicit and fallback paths, with scoped offline verification in the review above.
Exact section ownership and CSS/
`assignedSlot` ancestry remain required. **Read-only DOM source evidence and the
source fix are complete, focused offline checks and the local build passed;
compiled runtime preview remains unqualified.** Support is partial Succeeded only.

- [x] Implement the bounded Succeeded snapshot and outgoing reserved-section
  integration without overwriting other editor content or frozen Analyze input.
  This checkbox records source implementation, not a test or runtime PASS.
- [x] Record confirmed `initial-green`: **297/297 across seven complete test
  files**; TypeScript `ir-sla` actual exit 0, sources unchanged. RED mutations
  disabling Succeeded capture and outgoing accepted-snapshot use produced
  **4 failed, 3 passed, 109 skipped**. Mutations removed; `green-restored`
  confirmed **7 passed, 109 skipped, actual exit 0**, with raw `FAB.tsx` and
  `irSla.ts` bytes matching `initial-green`. This is focused restoration, not a
  second full 297-test run. These prior results were not rerun this turn.
- [x] Record historical user-confirmed Extension build **PASS**, version **2.0.77**:
  `dh-local-extension-2077-ir-sla-20260913`; five default items,
  TypeScript/Vite/copy checks, 13 artifacts, 407 source files and selected tooling
  unchanged. Inventory SHA-256:
  `97493B28EECA5CFFB625F748ACBD04A65349AD6B80246FF6468BE616F9C7C219`.
  This closes the build milestone only, not browser/model runtime qualification.
- [x] Record earlier seven-file run: **350 passed, 1 failed (351 total)**. The new
  slot fixture hit jsdom's cached opacity; fixture host attribute mutation
  invalidated the cache, with production checks unchanged. The two affected full
  files passed **187/187**; disabling case comparison yielded **3 failed, 184
  passed**; restored **187/187**, hashes matching fixed source (`irSla.ts` prefix
  `24D7`). Final TypeScript exit **0**, sources unchanged. This is not a full
  351-test GREEN rerun and does not erase the earlier source-version failure.
- [x] Record earlier local Extension **2.0.77** build PASS: five-item gate,
  TypeScript/Vite/copy, **13 artifacts**, **408 source files and selected tooling
  unchanged**. Evidence `dh-local-extension-2077-ir-record-pane-20260913`;
  manifest SHA-256 `CC88CAB04810FD826F17052DA11FAD9216B016213B64EA0B9BFD1C19939B40F1`;
  content artifact `index.tsx-B5TB3eTu`, reported SHA-256 prefix `B6369`.
- [ ] Complete IR field support only after observing an authoritative active
  countdown/status/duration source. A user-provided new running case is needed for
  that later scoped investigation, not required this turn. Do not guess `Paused`,
  `Expired`, deadline, or duration from Severity, Created On or static labels.
- [ ] Live-qualify IR only through a separately approved runtime entry. The
  production entry is quarantined; do not assume the installed Host is usable or
  the historical build contains current capture hardening. The reported current
  state is source Dev with shared real configuration; preserve it unless a later
  registry switch is authorized. No automatic Prod restoration or installation.
  The next user test can inspect Case Context preview without Analyze or a model
  call. The built fix awaits user Extension reload and D365 refresh; the preview
  should show `Succeeded` if all
  confirmed structure/rendering checks match; otherwise `Unknown`. This expected
  result is not a runtime qualification.
  This turn is static documentation only: no new tests/review, product/build-tool
  edits, build, browser load/test, Analyze, Host restart, registry mutation,
  publication. Documentation commit/push is now authorized; main research/MCP work
  remains separate, not duplicated.

Prior browser identity verification reported by the user was **TSEWork / Profile
1**, checked through `edge://version` plus the same context. It was not reverified
here. Store no private endpoints, target IDs, emails or case/customer data; use
synthetic fixtures only. Cleanup of the new direct CDP connections was confirmed;
Host and registry remained unchanged, with no model execution. Existing results
for other fields do not qualify IR.

## Product Limitations

- IR SLA extraction is partial: the terminal `Succeeded` snapshot and scan-time
  capture metadata are implemented; other statuses and active countdown/duration
  remain TODO. The earlier bounded offline milestone and Extension build passed;
  the earlier ownership fix has focused offline and local build PASS evidence,
  not a full 351-test GREEN rerun. Later capture hardening has scoped offline results in the
  [review record](docs/capture-hardening-review.md). Compiled runtime preview awaits user reload and
  D365 refresh as recorded above. Countdown/deadline
  are unknown, not inferred from Severity or Created On. This snapshot is not a
  live execution budget or percentage; Core guidance remains conditional on
  supplied data, and the model cannot read Options timeout settings or maintain
  a reliable live countdown on its own.
- Per-service MCP controls remain unimplemented. [The scoped SDK assessment](docs/mcp-auth-control-assessment.md)
  found experimental per-server status and pending OAuth cancellation interfaces
  in installed SDK 1.0.13, with gaps in its pinned narrative documentation. These
  have not been exercised in DH's runtime. No general per-tool cancellation or
  coverage of server-internal WAM/browser login was established. Prompt text and
  local timeouts do not interrupt an outstanding remote operation or prove it
  never executed. The DTM 30-second policy does not automatically apply to MCP.
- Personal bookmark items are browser-local and are not backed up in Host config.
- [Analyze progress](docs/specs/native-message-snapshot.md#analyze-progress-contract)
  provides local phases and safe tool activity, not initialization-complete events,
  meaningful operation labels, live elapsed/ETA/percent, persisted replay or a
  concurrent CLI view. Copilot auth status does not close the MCP auth/cancel gap above.
- Repository-only mode selects instructions, Skills and MCP; it does not initialize
  external case-management workflows or provide automatic workflow integration.
- Automatic rollback does not provide per-write power-loss atomicity. Extreme
  interruption may require the matching full installer; preserve recovery evidence.
- Update/rollback qualification must identify exact source, package and runtime
  conditions. A normal update success does not establish every recovery scenario.

Items describe current needs and limitations, not authorization to install,
operate accounts, publish, change security settings or execute live workloads.
