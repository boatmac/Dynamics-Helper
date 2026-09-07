# Plan D Pragmatic Cloud PC Results

## Scope

This is a single-user pragmatic gate. Exhaustive cloud-PC fault injection and both
legacy mixed-install directions were not run; existing automated tests cover
those boundaries.

NOT EXECUTION READY; historical evidence and source tests do not satisfy current
B2 artifact gates or authorize operations. This ledger aligns only with the
approved [qualification design](superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md)
and reviewed [documentation plan](superpowers/plans/2026-09-07-pragmatic-visible-completion-qualification.md).
Use the [runbook](plan-d-pragmatic-cloud-pc-runbook.md) for current criteria and
remaining safety barriers, not as execution permission.

## Artifact Identity

| Artifact | Version | Source commit | ZIP SHA-256 | Result |
|---|---|---|---|---|
| A | `2.0.74-beta.4` | `c77bd3a722259b098a8b8f4a4d1c941cc714e0cd` | `f605720d22fdc18be37673ac19b843d063e929a8a46f1132f54014f830aff6b5` | BUILT |
| B1 (historical, disqualified) | `2.0.76-beta.1` | `5abe35ab2ab2262d5a7abdf1d21fefe81ebeacf0` | `77fbace3562e9052378ce025dbc6e2994fcb13989a391a5996abbc7856f06b54` | BUILT |
| B2 (local candidate) | `2.0.76-beta.2` | PENDING: `cf016b7` base plus uncommitted version changes | `33958f963de94fc223cacf7bce313d74d3f29e5b7f0845168b0eb552fd2a5614` | BUILT LOCALLY; cloud qualification PENDING |

Artifact A remains historical evidence exactly as recorded. B1 remains exact
technical build/transaction evidence but is disqualified. Only a separately
approved immutable B2 build and fresh artifact verification may replace the B2
artifact and current-gate placeholders. The local build below is not yet bound
to an immutable source commit and does not unlock the cloud entry gate.

## Local B2 Build Verification

On 2026-09-07 the user authorized the beta2 version change, local packaging, and
frozen Host verification only. No commit, tag, upload, installation, publication,
or workstation change was performed.

- ZIP: `releases/DynamicsHelper_v2.0.76-beta.2.zip`, 15,621,955 bytes; SHA-256 above.
- Source: `cf016b7` plus uncommitted changes to the three version carriers;
  pre-existing documentation edits remain uncommitted. This is not an immutable
  source-commit claim.
- Extension production build passed, including five default-item tests and the
  source/dist byte-identity check. Fresh full Extension suite: 997/997 passed.
- Frozen onedir built with exact PyInstaller 6.22.2. Frozen integration test:
  1/1 passed without a skip. Product-info/release-helper tests: 24/24 passed.
- Final ZIP passed `stage_and_validate_archive`: 57 files, 56 manifest hash
  entries, metadata/version/capability validation passed.
- A real frozen `--update-probe` on the validated final package returned matching
  Host/Extension `2.0.76-beta.2` and both required product capabilities. Probe
  exit was 0; product hashes were unchanged and isolated profile directories
  remained empty. No main-mode Host or SDK session was started.
- Warnings: stale BrowsersList data, PyInstaller missing hidden import
  `tzdata`, and React act warnings in the full Extension suite. No dependency or
  toolchain installation was attempted.
- Follow-up after authorization for private distribution and normal cloud
  validation: isolated Host full suite 666/666 passed, no skips, with the built
  frozen runtime enabled. Python compileall, TypeScript no-emit, parser-only
  installer checks, diff checks, and legacy-update reachability checks passed.
  The Host suite emitted one duplicate-ZIP-entry warning from a test fixture.
- Source-commit binding remains open. The user has connected the cloud PC and
  authorized a local commit; cloud commands require user-mediated execution.
  The combined artifact entry gate and cloud scenarios remain pending; local
  checks are not an installation, upload, or cloud verification claim.

## Historical B1 Automated Gate Evidence

These rows are immutable B1 history and cannot satisfy the B2 entry gate.

| Gate | Result | Evidence |
|---|---|---|
| Host full suite | PASS | `666` tests in five isolated partitions (`324+141+58+98+45`): `665` passed and the sole allowed environment-gated frozen selector skipped. |
| Extension full suite | PASS | `894/894` tests passed across `35` test files. |
| Extension production build | PASS | Historical detached B1 build transformed `2228` modules; all `5` default-item checks and the copy check passed. |
| Frozen Host build/probe | PASS | Exact PyInstaller `6.22.2`; frozen probe `1/1` with no skip; hidden-import graph `17/17`; onedir inventory `35` internal files and `10` directories. |
| Static/reachability checks | PASS | Python compileall, TypeScript no-emit, PowerShell installer parse, and diff check passed; legacy apply-update reachability is limited to `host/updater.py` and legacy-specific tests; production `cleanup_old_version` remains intentionally reachable. |

One-shot implementation development evidence reported by the implementers is
Extension `951/951`, update focused `181/181`, UI `55/55`, and TypeScript pass.
This is not a built B2 artifact identity and does not qualify or publish beta2.

## Visible Completion Source Verification

Source implementation ends at cf016b7: Extension 997 passed; focused tests 227
passed; TypeScript and local Extension build passed; isolated Host suite 666
total, 665 passed and one environment-gated frozen-runtime skip. The skip is not
PASS. Full-suite React act warnings and the stale Browserslist notice remain
disclosed. These are source-only results, not evidence for an unbuilt B2 ZIP.

## Guard Preparation Evidence

Preparation-only results reported from the completed independent reviews, not
rerun during this documentation sync:

- Per-attempt B1 rollback cleanup: prepared; isolated PS 54 passed and JS 75
  passed; independent review passed. The earlier 18 deferred-case RED checks were
  resolved by the 30-second deadline fix. Code: runbook
  [Per-Attempt B1 Rollback Cleanup Contract](plan-d-pragmatic-cloud-pc-runbook.md#per-attempt-b1-rollback-cleanup-contract),
  `DH-B1-ROLLBACK:PS` / `DH-B1-ROLLBACK:JS` BEGIN/END markers.
- Scenario 3 path/user-file/sentinel guards: prepared; 27 mock tests passed;
  independent static review APPROVED. Code: runbook
  [Scenario 3](plan-d-pragmatic-cloud-pc-runbook.md#scenario-3-matching-installer-repair),
  `DH-S3:HELPERS`, `CAPTURE`, `CREATE`, `ABSENCE`, `COMPARE` BEGIN/END markers.

Both test sets exist only as Temp files, not repeatable repository tests or CI
gates; code-location markers are not a test harness. Real Windows PowerShell 5.1,
reparse/ACL behavior, and OS Known Folder queries remain unverified. Quiescence
is a procedural TOCTOU constraint, not atomic filesystem/browser storage safety.
Real cleanup/repair and all three qualification scenarios remain PENDING.

NOT EXECUTION READY. Six blocking throws remain: Qualification Entry Gate,
B2 Artifact-Hash Placeholder, Complete B2 Installer Placeholder, One-Shot
Original-Runner Interruption, Zero-Executor Checkpoint, Recovery-Runner Witness.
B1/B2 versions, immutable source/ZIP identities, installed frozen Host, and fresh
B2 artifact gates remain required. Every artifact, distribution, process,
browser-cleanup, and installer mutation still requires independent explicit
authorization; preparation review does not grant it or operational closure.

## Current B2 Automated Gates

Beta2 cloud-PC work is blocked until B2 has a complete immutable artifact
identity and all five rows below are exact `PASS` with fresh evidence. `PENDING`,
`Not recorded`, or empty evidence fails the runbook entry gate.

| Gate | Result | Evidence |
|---|---|---|
| Host full suite | PENDING | PENDING |
| Extension full suite | PENDING | PENDING |
| Extension production build | PENDING | PENDING |
| Frozen Host build/probe | PENDING | PENDING |
| Static/reachability checks | PENDING | PENDING |

## Historical Cloud PC Baseline Evidence

The A baseline and preconditions passed on `2026-09-04 UTC`. They remain
historical evidence only and are not rerun for beta2. They do not qualify B1 or
B2, and every formal beta2 scenario below remains `PENDING`.

| Check | Result | Sanitized evidence |
|---|---|---|
| Qualification entry | PASS | The entry gate passed. |
| Azure authorization | PASS | Historical authorization covered a private test-only B1 transfer. No cloud target or user names or IDs are recorded; it does not authorize B2 work. |
| Cloud PC authorization and transfer | PASS | Historical authorization covered A/B1 transfer and installer/process work on the effectively empty cloud PC. Both local hashes matched their ledger identities. It does not authorize B2 execution. |
| Empty-machine marker | PASS | The exact cloud-PC marker check passed. |
| Prerequisites | PASS | Edge was present; Chrome was not installed and was not required. Copilot CLI stable `1.0.82` was installed with WinGet and OAuth-authenticated to the intended account. |
| A install and registration | PASS | The installer reported `SUCCESS: Installation Complete!` under the target LocalAppData and registration succeeded. Disk and Edge Native Messaging registration passed; Host and Extension were both `2.0.74-beta.4`. |
| A zero executor | PASS | Fresh evidence reported `ActiveAuthority: false`, `RunnerCount: 0`, `FinalizationCursor: false`, and `RunOnceArmed: false`. |
| Options and capabilities | PASS | The Options screenshot confirmed beta updates OFF. `get_capabilities` reported Host `2.0.74-beta.4` with `transactional-update-v1: true`. |
| Installed integrity | PASS | `verify_installation` reported packaged and verified, with Extension `2.0.74-beta.4`. |
| Coordinator state | PASS | Public and stored coordinator state were both `idle`, `hasUpdateUrl` was false, and no active update authority existed. |
| Smoke checks | PASS | The designated non-customer Analyze check passed without recording case content or identity. Options toggle persistence and restoration passed. |
| Private B1 delivery | PASS | Historical private delivery bytes matched B1's ledger hash. The private object is not a B2 candidate, and this evidence authorizes no later transaction. |

Investigation note: preflight attempts observed that Extension reload triggered
`onInstalled`; the normal update check cleared the manually seeded `available`
state. No transaction was allocated, no download began, and this was not
Scenario 1. The corrected procedure seeds first, then uses the normal Service
Worker **Stop** control before a public state request wakes the new Worker.

## Historical Private B1 Transaction

This transaction succeeded technically. It is separate from beta2 qualification
and must not be described as a failed update.

| Transaction ID | Outcome | Versions | Integrity | Residue | Finalization | Analyze | Options | Qualification result |
|---|---|---|---|---|---|---|---|---|
| `b1c2ad5ad2c4aeb59765302402450840` | committed | Matching Host/Extension `2.0.76-beta.1` | packaged/verified | Active authority, transaction workspace, finalization cursor, and receipt absent | Matching finalization ACK | PASS | PASS | DISQUALIFIED: completion notice replayed permanently |

The committed B1 product and finalization were technically successful. The
candidate alone is disqualified for publication because the browser completion
notice was permanent.

## Cloud PC Scenarios

Set `Result` to `PASS` only when every other field, including **Completion
lifecycle**, is complete, `Analyze` and `Options` are each `PASS`, and the
terminal state is one of these exact PASS outcomes. A row containing `PENDING` or
`Not recorded` cannot be `PASS`.

- Uninterrupted B1 to B2: `complete/committed B2`, matching finalization ACK,
  full allowed terminal residue checks, all product/smoke/visible-completion
  gates passing, and authoritative UI ACK transition to durable idle/no URL.
  Any other outcome fails.
- Interrupted recovery: `complete/committed B2` with exact original-runner
  interruption, zero-executor proof, recovery witness, and every common B2 gate
  passing. Safe verified B1 rollback is inconclusive, never PASS or new-protocol
  rollback-to-Retry evidence; B1 lacks the new ACK protocol.
- Matching-installer repair: `installer-repaired B2`, not updater commit. Use
  the same complete B2 installer twice; require exit `0` and
  `SUCCESS: Update Complete!`, sentinel absent, protected-file set/bytes unchanged,
  matching verified B2, idle/no URL, and smoke PASS. User-file/sentinel path guards
  are prepared with isolated checks and independent review passed; real-environment
  verification and separately authorized execution remain PENDING.

`Versions/integrity` must record matching Host/Extension `2.0.76-beta.2` and
verified integrity for a PASS. Inconclusive B1 rollback must separately record
matching verified `2.0.76-beta.1`, the captured transaction's exact rolled-back
ACK and full residue checks in the attempt record, without claiming B2 lifecycle.

Completion lifecycle: FAB menu observed, closed before eight seconds, foreground
Options observed for approximately eight continuous visible seconds, global
disappearance, refreshed FAB/Options non-replay, durable public/stored idle and no
URL; no manual ACK. Options is the intended winning surface. Do not foreground
Options for inspection/capability/integrity/smoke checks before this sequence;
keep other qualifying surfaces from winning. A closed red dot does not count;
record a missed winning surface honestly, never invent timing or seed completion.
Only the authoritative persisted state/broadcast, never the ACK response, governs
disappearance. No cold-start bubble or bubble preference change is required.

A scenario cannot be `PASS` unless both the automated exact-timing gate and the
real cloud integration lifecycle checks pass. Exact 7,999/8,000 ms, visibility
epochs, stale callbacks, transport failures, StrictMode cleanup, duplicate ACKs,
and new-protocol rollback-to-Retry are automated evidence, not cloud timing
measurements. Future artifact verification records actual fresh B2 counts;
source-only counts are not final artifact evidence.

Matching-installer repair may record `N/A - no terminal completion notice` only
when it produces no terminal completion state, not as lifecycle PASS. If a repair
does produce completion, perform the shared visible sequence before Options-based
inspection/smoke; all applicable lifecycle checks remain mandatory.

Before every cross-scenario or remaining-attempt baseline installer, the previous
transaction must already be safely settled and browser state must be durable
idle/no URL regardless of disposition. An installer does not clear Chrome
storage. If this cannot be proved, stop; recovery installation is separate,
explicitly approved guarded settlement, not a next baseline. Safe committed B2
with missing witnesses requires normal visible UI ACK first. Safe B1 rollback
requires the prepared/reviewed per-attempt old-shape cleanup guard, never the historical
committed-B1 guard. Failed settlement permits no new qualification start, and
settlement success after FAIL does not reopen qualification.

| Scenario | Baseline | Transaction ID | Terminal state | Versions/integrity | Completion lifecycle | Analyze | Options | Result |
|---|---|---|---|---|---|---|---|---|
| Uninterrupted B1 to B2 | `plan-d-b1` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Interrupted recovery | `plan-d-b1` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Matching-installer repair | `plan-d-b1` | N/A | Not recorded | Not recorded | PENDING | Not recorded | Not recorded | PENDING |

## Scenario 2 Allocated Attempts

Append only actually allocated transactions, at most three. Apply the runbook
disposition table and aggregate BLOCKED rules verbatim; FAIL stops and takes
precedence. Prepared/reviewed guards do not establish real cleanup readiness;
environment verification, separate authorization, and execution evidence remain PENDING.

Count at `DH_UPDATE_START` allocation with durably exposed transaction identity;
every allocated abort counts. Fix pre-allocation setup failures before start;
they do not count. Preparing/activating error, allocated abort, recovery-required,
mixed/integrity/residue failure, or B2 lifecycle/smoke failure is FAIL even with
missing witnesses. No next transaction after FAIL and never a fourth attempt.
After three inconclusive attempts, use `BLOCKED: SAFE_ROLLBACK_INCONCLUSIVE` only
if all three are exactly that disposition; otherwise use
`BLOCKED: INTERRUPTION_EVIDENCE_INCONCLUSIVE`. Never relabel FAIL as BLOCKED.

| Ordinal | Transaction ID | Interruption witnessed | Zero executor proved | Recovery witnessed | Terminal version/outcome | Gates | Disposition | Cleanup/baseline readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Private Distribution Closure

Status: PENDING; no operational closure claimed.

On PASS, FAIL, abort, or BLOCKED, record eventual outcome, ownership-check result,
run-owned access revocation, private object/container cleanup as applicable, and
separate product-settlement status. The distributing operator must verify
privately recorded ownership first. Keep ownership identifiers private, not in
ledger columns. Never delete shared resources or revoke unrelated access.
Uncertain ownership or cleanup failure means cleanup BLOCKED and no operational
closure, never broader deletion/retries. Distribution cleanup is separate from
recovery and preserves journals, backups, finalization evidence, and browser
state; any product settlement remains separately approved and guarded.

## Environment Handoff

Future handoff is outside this documentation task. These unchanged rows authorize
no operation, automatic release, or migration, even after qualification PASS.

| Step | Result |
|---|---|
| Keep old beta1 workstation unchanged | PENDING |
| Confirm displayed `v2.0.75-beta.1` on old workstation | PENDING |
| Confirm selected beta-updates or Extension control is disabled | PENDING |
| Explicit B2 tag/push/publish approval | PENDING |
| Verify published B2 asset hash | PENDING |
| Migrate workload to qualified cloud PC | PENDING |

No private URL/SAS, query string, cloud account/resource identifier, user-file
hash or content, case identity, customer content, prompt, token, screenshot, or
full log belongs in this file. Public evidence is immutable artifact identity
plus sanitized check results only.
