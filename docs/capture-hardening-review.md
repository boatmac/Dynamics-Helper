# Capture Hardening Review

## Scope And Status

September 13, 2026: this is the single persistent review record for the ten
capture-hardening findings below. All ten source issues are addressed, with
scoped offline verification complete as detailed below. This is a bounded
hardening pass, not completion of a unified capture coordinator or a full capture
refactor. No API was introduced and
no OData migration was made. Work limits are defensive bounds, not benchmarks or
evidence of real-world performance improvement.

The user approved fixing the prior review findings, then commit/push before
confirming a Release version. The current documentation commit/push is authorized;
publication version still requires user confirmation and no release is published.
The running Dev state and the source snapshots under review are not a frozen
Host build, nor proof that the current checkout is loaded in the browser. Do not
restore Prod, install a package, restart Host or change registration automatically.
The production entry is quarantined; a future runtime entry requires an explicit
approved route, not automatic restoration or an assumption that Prod is usable.

## Implemented Findings

| # | Finding | Current Source Fix |
| --- | --- | --- |
| 1 | Open-menu identity changes retained stale authority | Identity-only scans invalidate accepted context and Customer enrichment when identity changes, even while the editable preview is protected. |
| 2 | Raw edits did not reliably establish user intent | Every context textarea change marks edit intent and advances the edit revision, including raw text and explicit empty values. |
| 3 | A pending refresh could overwrite a newer edit | Refresh replacement is conditional on the captured edit revision still matching, including terminal revalidation participation. |
| 4 | Visibility scan timers outlived their owner | The scan effect owns its visibility timer, clears it on visibility changes and cleanup, and prevents stopped effects from scanning. |
| 5 | Scheduled auto-Analyze could lose context ownership | Scheduled work owns its context and timer; replacement/transfer uses the current accepted context, cancels superseded work and rechecks ownership before dispatch. |
| 6 | Customer lookup lacked sufficiently narrow ownership and bounded visible reads | Customer reads require a canonical-header-owned record pane and associated visible content; bounded live text traversal excludes hidden/control content without cloning the subtree. Ambiguous or exhausted reads return no name. |
| 7 | Hidden header evidence could contaminate capture | Header readers ignore non-rendered evidence and validate visible ownership rather than aggregating hidden record headers. |
| 8 | XPath iterators could be invalidated across a yield | Yielding label scans use ordered XPath snapshots rather than mutation-sensitive iterators; snapshot membership alone does not establish current identity. |
| 9 | Created On traversal had incomplete work accounting | MAIN header validation budgets traversal attempts, overlapping roots, slot text and visibility ancestry; final `PageReader.readCreatedOn` budgeting also closes the remaining unbounded DOM fallback. Exhaustion fails closed. Existing origin, full-record, before/after and UTC rules remain. |
| 10 | Explicit IR linkage bypassed canonical record ownership | Both explicit `aria-controls` and absent-attribute fallback require `expectedCase`, a unique visible main and outer record pane, and the matching canonical full-record header. Invalid explicit linkage never enables fallback. |

Implementation locations: `extension/src/components/FAB.tsx`,
`extension/src/utils/pageReader.ts`, `extension/src/utils/createdOnModel.ts` and
`extension/src/utils/irSla.ts`. Source inspection for documentation alignment is
not an independent test result or a new full review.

## Scoped Offline Verification

The supplied results retain the failure history and distinguish each execution:

- Initial run: **10 files, 491 tests: 475 passed, 16 failed**.
- After two fixture corrections and strengthened valid-B-request assertions, the
  three affected complete files passed **247/247**.
- The final `readCreatedOn` budget fix closed the remaining unbounded fallback.
  The three complete reader files passed **301/301**: `pageReader` **135**,
  `createdOnModel` **50**, and `irSla` **116**.
- RED with three FAB guards disabled: **6 failed, 13 passed, 472 skipped**.
  After removing the mutations: **19 passed, 472 skipped**, with restored raw
  source bytes exactly matching the original pre-RED bytes. This is focused
  mutation/restoration evidence, not a complete selection rerun.
- Final TypeScript `capture-final`: **exit 0**, `changedSources: []`, confirmed
  by reading `%LOCALAPPDATA%/Temp/opencode/dh-analyze-progress-types-capture-final/result.json`.

The initial **491** plus **18** new tests gives **509 in aggregate**, not an
executed 509-test run or full-suite PASS. The 247/247, 301/301 and restored 19
results have overlapping scopes and must not be summed as distinct coverage.
Earlier source/build results remain historical, not qualification of these bytes.

- [x] Record all ten source fixes and the supplied scoped offline results.
- [x] Read the existing final TypeScript result without rerunning verification.
- [ ] Qualify runtime only under a separately approved entry; no performance
  measurement, frozen build or production qualification is established here.
- [ ] Confirm the Release version separately after that sequence; none is selected.

No tests, builds, browser operations, model calls or runtime mutations
were performed by this documentation update; commit/push is separately authorized.
Earlier source history and architecture
changes remain intact. Existing security-investigation records remain separate;
this record contains no customer data, private endpoints or copied incident details.

## User Contract

No new controls or UI contract are introduced beyond preserving editor intent:
background capture cannot overwrite edits, and an edit made after starting a
refresh survives that pending refresh. Existing reserved IR and canonical Custom
User Prompt send-time rules remain unchanged. Active Analyze input stays frozen.
IR support remains partial (`Succeeded` only); absent or unsupported evidence is
not an inferred countdown, deadline or API-backed status.
