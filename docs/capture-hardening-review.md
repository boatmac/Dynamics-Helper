# Capture Hardening Review

## Scope And Status

### September 14 Customer Wrapper Follow-Up

The published 2.0.78 retained the Customer reader, but a read-only local Edge
inspection found layout wrappers between the canonical record owner, selected
Summary tablist and Customer content panel. The reader's direct-parent checks
rejected this structure before reading the name. The inspection returned only
structural tokens, booleans and counts, not customer values. This is a confirmed
rejection condition, not evidence of source loss during rollback.

The unreleased fix permits bounded wrapper ancestry within the same record.
Independent main/header/tablist/panel boundaries remain rejected. Explicit
`aria-controls` remains authoritative; absent linkage requires one selected
record-level tab and a unique visible same-record panel with matching nonempty
labels, not an English `Summary` literal. Nested widget tabs do not provide
record-level authority. Customer text extraction, full 16/19-digit identity,
editing protection and scroll timing are unchanged.

Verification: the first 60-second metadata test attempt stopped after Vitest
startup without results; owned observed processes were terminated and evidence
retained under `pageReader-metadata-red-20260914T070103855Z-11c330d182664c52bf5e74f469aa1ee6`
in the existing local temp evidence parent. This is not RED. A subsequent
three-case selection against the old implementation failed 3/3 as expected
(English, non-English and explicit-link wrappers; 144 unrelated cases skipped).
After the fix, `D365 case metadata` passed 72/72 with 75 unrelated cases skipped
in 25.02 seconds. Twelve synthetic cases were added, including foreign/hidden
ownership, incorrect explicit linkage and duplicate tab/panel rejection.
TypeScript `--noEmit` exited 0. These are focused offline results, not a full
Extension run or browser verification of the fix. No build, reload, installation,
commit, push or new release was performed for this follow-up.

The subsequent explicitly requested Extension-only build passed on September 14:
default-items 5/5, TypeScript, Vite and default-menu source/dist byte equality;
exit 0, no timeout and unchanged build inputs. Evidence is
`dh-customer-extension-build-da0473566ea643b58f2cc3101e904deb` under the local temp
parent. Output is this checkout's `extension/dist`, still labeled 2.0.78 but
containing the unreleased fix; it is not the published ZIP. Browserslist reported
stale browser data; no dependency update was performed. Host build, browser
loading/reload, installation and publication were not performed.

After this local build, the user reported both observed viewport paths working:
Customer is captured immediately when visible in the large-screen initial view,
and captured after scrolling when absent from the small-screen initial view.
This is user-reported runtime confirmation, not an independent loaded-byte check,
proof across all languages/layouts, or qualification of the unchanged published
2.0.78 ZIP. No additional code or timing changes were made in response.

### September 13 Historical Milestone

September 13, 2026: this is the single persistent review record for the ten
capture-hardening findings below. All ten source issues are addressed, with
scoped offline verification complete as detailed below. This is a bounded
hardening pass, not completion of a unified capture coordinator or a full capture
refactor. No API was introduced and
no OData migration was made. Work limits are defensive bounds, not benchmarks or
evidence of real-world performance improvement.

The prior documentation commit `b78afd5` was pushed by a delegated assistant;
the main assistant verified it against Git, not a user report. The user approved
committing and pushing the reviewed fixes before API investigation. Documentation
subtasks do not independently authorize Git operations. The publication version
still requires user confirmation and no new release has been published.
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
- Final complete selected run: **10/10 files, 509/509 tests passed, zero failures
  or skips, 112.30 seconds**, **exit 0**, `changedSources: []`. Existing evidence
  was read from
  `%LOCALAPPDATA%/Temp/opencode/dh-analyze-progress-capture-hardening-final-milestone/`:
  `arguments.json` identifies the ten complete files, `stdout.log` records the
  totals and duration, and `result.json` confirms exit and exact source-byte
  stability against `source-before.json`.

The initial **491** plus **18** new tests was previously aggregate inventory;
the final milestone now establishes an actual **full selected 509-test run**,
not a whole-Extension-suite PASS. The initial 475/491, later 247/247, 301/301 and
restored 19 results remain distinct historical executions with overlapping
scopes and must not be summed as distinct coverage.
Earlier source/build results remain historical, not qualification of these bytes.

The final milestone's `source-before.json` records these raw source SHA-256 values;
`changedSources: []` confirms they were unchanged through that run:

| Source | SHA-256 |
| --- | --- |
| `extension/src/components/FAB.tsx` | `D52BD10D8D1D7CDCC6A8AEAA06FAF94172EC917A0762E7F98D7EF710E594B663` |
| `extension/src/utils/pageReader.ts` | `FBD51EEA5B58E0845E9AF9D4D933A17AEFDAD313D52F10BA950635CB2350874B` |
| `extension/src/utils/createdOnModel.ts` | `CB30DAFF6AB39D3ACA24AE5C7EF648CBEA2E65594907FBCA749910ABAD324B26` |
| `extension/src/utils/irSla.ts` | `574C228035407F9FFA002B115450902EEC5CF8AC4B127A211DE80DF200879BD1` |

- [x] Record all ten source fixes and the supplied scoped offline results.
- [x] Read the existing final TypeScript result without rerunning verification.
- [x] Record the existing final ten-file 509/509 execution and exact source identity.
- [x] DTM wait-label localization passed 42/42 tests across three complete files.
  The wire message remains fixed; English/Chinese rendering uses translations.
- [x] Local Extension build passed five default-items tests, TypeScript, Vite and
  source/dist menu identity checks. Evidence:
  `dh-local-extension-2077-capture-hardening-20260913`. All 409 inventoried sources
  and selected toolchain bytes were unchanged. Thirteen artifacts were recorded;
  artifact inventory SHA-256 is
  `E2823212B9AF8FCBA52570CF6836D94D376114F8274D56D66BE5957BFBF0EFA5`.
- [ ] Qualify runtime only under a separately approved entry; no performance
  measurement, current-browser, frozen build or production qualification is
  established here. Test duration is not a runtime benchmark.
- [ ] Confirm the Release version separately after that sequence; none is selected.

This document records the separately executed tests and build above. It does not
grant authority for browser operations, model calls, installation or publication.
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
