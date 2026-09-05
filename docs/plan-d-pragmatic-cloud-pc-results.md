# Plan D Pragmatic Cloud PC Results

## Scope

This is a single-user pragmatic gate. Exhaustive cloud-PC fault injection and both
legacy mixed-install directions were not run; existing automated tests cover
those boundaries.

## Artifact Identity

| Artifact | Version | Source commit | ZIP SHA-256 | Result |
|---|---|---|---|---|
| A | `2.0.74-beta.4` | `c77bd3a722259b098a8b8f4a4d1c941cc714e0cd` | `f605720d22fdc18be37673ac19b843d063e929a8a46f1132f54014f830aff6b5` | BUILT |
| B1 (historical, disqualified) | `2.0.76-beta.1` | `5abe35ab2ab2262d5a7abdf1d21fefe81ebeacf0` | `77fbace3562e9052378ce025dbc6e2994fcb13989a391a5996abbc7856f06b54` | BUILT |
| B2 | `2.0.76-beta.2` | PENDING | PENDING | PENDING |

Artifact A remains historical evidence exactly as recorded. B1 remains exact
technical build/transaction evidence but is disqualified. Task 5 replaces the
B2 artifact and current-gate placeholders after its immutable build and fresh
verification.

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
terminal state is one of these exact outcomes. A row containing `PENDING` or
`Not recorded` cannot be `PASS`.

- Uninterrupted B1 to B2: `complete/committed B2`, followed by the one-shot
  authoritative ACK transition to `idle` with no candidate URL.
- Interrupted recovery: `complete/committed B2` or
  `complete/rolled-back B1`; rolled-back acknowledgment must restore B2 as
  ordinary Retry.
- Matching-installer repair: `installer-repaired B2`.

`Versions/integrity` must record matching Host/Extension `2.0.76-beta.2` and
verified integrity for B2, or matching `2.0.76-beta.1` and verified integrity for
Scenario 2's allowed B1 rollback. Completion acceptance also requires the result
to run with status bubbles enabled; the terminal banner and FAB completion bubble
must remain visible through 7,999 ms of mounted time, transition only through the
authoritative ACK/broadcast at or after 8,000 ms, and remain absent after both FAB
and Options refresh. Committed final public/stored state is `idle` with no URL;
rolled-back final state is B2 `available` with ordinary Retry and no rollback
replay.

Matching-installer repair may record `N/A - no terminal completion notice` only
when it produces no terminal completion state; all other lifecycle fields remain
mandatory.

| Scenario | Baseline | Transaction ID | Terminal state | Versions/integrity | Completion lifecycle | Analyze | Options | Result |
|---|---|---|---|---|---|---|---|---|
| Uninterrupted B1 to B2 | `plan-d-b1` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Interrupted recovery | `plan-d-b1` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Matching-installer repair | `plan-d-b1` | N/A | Not recorded | Not recorded | PENDING | Not recorded | Not recorded | PENDING |

## Environment Handoff

| Step | Result |
|---|---|
| Keep old beta1 workstation unchanged | PENDING |
| Confirm displayed `v2.0.75-beta.1` on old workstation | PENDING |
| Confirm selected beta-updates or Extension control is disabled | PENDING |
| Explicit B2 tag/push/publish approval | PENDING |
| Verify published B2 asset hash | PENDING |
| Migrate workload to qualified cloud PC | PENDING |

No private URL, query string, customer content, prompt content, token, or full
log belongs in this file.
