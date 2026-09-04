# Plan D Pragmatic Cloud PC Results

## Scope

This is a single-user pragmatic gate. Exhaustive cloud-PC fault injection and both
legacy mixed-install directions were not run; existing automated tests cover
those boundaries.

## Artifact Identity

| Artifact | Version | Source commit | ZIP SHA-256 | Result |
|---|---|---|---|---|
| A | `2.0.74-beta.4` | `c77bd3a722259b098a8b8f4a4d1c941cc714e0cd` | `f605720d22fdc18be37673ac19b843d063e929a8a46f1132f54014f830aff6b5` | BUILT |
| B | `2.0.76-beta.1` | `5abe35ab2ab2262d5a7abdf1d21fefe81ebeacf0` | `77fbace3562e9052378ce025dbc6e2994fcb13989a391a5996abbc7856f06b54` | BUILT |

## Automated Gates

Cloud-PC work is blocked until both artifact rows have complete source commits
and ZIP SHA-256 values and all five rows below are exactly `PASS`. `PENDING` or
`Not recorded` fails the runbook's entry gate.

| Gate | Result | Evidence |
|---|---|---|
| Host full suite | PASS | `666` tests in five isolated partitions (`324+141+58+98+45`): `665` passed and the sole allowed environment-gated frozen selector skipped. |
| Extension full suite | PASS | `894/894` tests passed across `35` test files. |
| Extension production build | PASS | The single accepted detached B build transformed `2228` modules; all `5` default-item checks and the copy check passed. |
| Frozen Host build/probe | PASS | Exact PyInstaller `6.22.2`; frozen probe `1/1` with no skip; hidden-import graph `17/17`; onedir inventory `35` internal files and `10` directories. |
| Static/reachability checks | PASS | Python compileall, TypeScript no-emit, PowerShell installer parse, and diff check passed; legacy updater reachability is limited to `host/updater.py` and legacy-specific tests. |

## Cloud PC Scenarios

Set `Result` to `PASS` only when every other field in that row is complete,
`Analyze` and `Options` are each `PASS`, and the terminal state is one of these
exact outcomes. A row containing `PENDING` or `Not recorded` cannot be `PASS`.

- Uninterrupted A to B: `complete/committed B`.
- Interrupted recovery: `complete/committed B` or `complete/rolled-back A`.
- Matching-installer repair: `installer-repaired B`.

`Versions/integrity` must record matching Host/Extension `2.0.76-beta.1` and
verified integrity for B, or matching `2.0.74-beta.4` and verified integrity for
Scenario 2's allowed A rollback.

| Scenario | Baseline | Transaction ID | Terminal state | Versions/integrity | Analyze | Options | Result |
|---|---|---|---|---|---|---|---|
| Uninterrupted A to B | `plan-d-a` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Interrupted recovery | `plan-d-a` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Matching-installer repair | `plan-d-a` | N/A | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |

## Environment Handoff

| Step | Result |
|---|---|
| Keep old beta1 workstation unchanged | PENDING |
| Confirm displayed `v2.0.75-beta.1` on old workstation | PENDING |
| Confirm selected beta-updates or Extension control is disabled | PENDING |
| Explicit publish approval | PENDING |
| Verify published B asset hash | PENDING |
| Migrate workload to qualified cloud PC | PENDING |

No private URL, query string, customer content, prompt content, token, or full
log belongs in this file.
