# Analyze Progress Verification

## Scope And State

Source work on `hardening/plan-d-runtime-installer`, based on `7217399`.
The feature and the earlier repository-instruction/Core changes remain
uncommitted. This record is evidence, not execution or release authorization.

The progress contract is documented in
[Native message snapshots](specs/native-message-snapshot.md#analyze-progress-contract).
Remaining product gaps are in [TODO.md](../TODO.md).

## September 11, 2026 Checks

- Nine explicit frontend files passed 261/261 tests in 209.68 seconds. Selection
  included progress parsing/state/UI, Analyze forwarding, Worker routing, content
  delivery and FAB request/spinner/update regressions. This was not the full
  Extension suite or the separate default-items build gate.
- The `analyze-progress` safe Host profile passed 25/25 tests, with no failures,
  errors or skips. It tests the standard-library-only event projector, not Host
  import, SDK integration or real browser/model execution.
- TypeScript initially rejected a minimal Chrome tab fixture. An explicit
  `chrome.tabs.Tab` assertion corrected its static type without changing runtime
  data. TypeScript then exited 0; the affected originating-document routing test
  passed 1/1 (48 unselected tests skipped) in a focused rerun.
- Raw-byte snapshots included tracked and untracked files. Each execution's
  before/after comparison reported no changed inputs during that run.
- Targeted Host source review found three progress calls incompatible with the
  existing SDK AST test's single-statement terminal-handler contract. Those
  redundant calls were removed; the request finalizer already marks running
  phases failed before deactivation. Narrow static follow-up confirmed the
  terminal returns and cleanup ordering. SDK test assertions were not weakened.
- The reviewed Host SHA-256 is
  `b1f5f2b2d54817477207aef76bca9d86dd75d1ce73157e6ef835998c6d314b58`.
  `tests/sdk-test-review.json` binds these bytes as source review only. The fixed
  SDK suite was not rerun and its earlier result does not qualify these bytes.
- User/developer guides, the wire/persistence specs, AGENTS guidance and TODO
  were updated. No build, installation, registration, live analysis, commit,
  push or publication was performed for this feature.

## Local Evidence

Evidence is retained outside the repository under
`C:\Users\zhaobo\AppData\Local\Temp\opencode`:

| Directory | Evidence |
|---|---|
| `dh-analyze-progress-frontend-first` | Exact nine-file selection, raw hashes, process record, logs, exit 0 |
| `dh-safe-tests-ng6550vy` | Gated Host selection, source hashes, cumulative 25/25 results, cleanup record |
| `dh-analyze-progress-types-first` | Initial fixture type diagnostic |
| `dh-analyze-progress-types-fixture-fixed` | TypeScript exit 0, unchanged inputs |
| `dh-analyze-progress-fixture-corrected` | Focused routing regression exit 0, unchanged inputs |

Initial shell launch calls reported a 10-second transport timeout; retained
results confirmed the already-launched checks completed. They were not restarted
because of that transport timeout. Initial monitor PIDs 5724, 37108 and 5372 and
their direct children were absent at closeout inspection; focused Vitest PID
21288 and reachable descendants were also absent. These observations are not
general descendant confinement or proof against orphaned descendants.

## Remaining Verification

Full Host wiring/runtime, fixed SDK contracts for the current source, complete
Extension suite, frozen packaging, browser integration and real model/tool
behavior remain unverified in this work package. Progress is informational;
it does not establish MCP authentication control, cancellation, initialization
completion, ETA, or a concurrent CLI viewing capability.
