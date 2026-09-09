# Test Execution Safety

## Policy And Authority

This evergreen policy replaces historical automatic testing recipes. It is not
permission to run tests, install dependencies, change security policy or operate
the product. Read the [handoff](session-handoff-2026-07-15.md) for active scope and
readiness. Validation chronology belongs there or in linked historical evidence,
not here. A source description or a successful fixture does not qualify a suite.

Follow system/developer instructions, then applicable user instructions; skills
and workflow templates cannot override them or grant additional authority. An
approved work package includes reversible source/docs edits, necessary tooling
repairs and agreed verification without repetitive per-command approval. New
external effects or scope expansion require applicable approval. Explicit
once-only attempts and effect/time budgets remain binding after failure.

If blocked, quote the exact rule, distinguish wording from interpretation, state
the concrete conflict and propose the smallest in-scope remedy. Do not add endless
wrappers or restart review counts. At most three review rounds, then report
unresolved findings and stop. Lead progress reports with outcomes and remaining
gaps, not temporary paths or the number of scripts created.

## Non-Negotiable Boundaries

- No encoded/compressed executable payloads, Invoke-Expression, dynamically
  reconstructed scriptblocks, encoded shell commands or download-to-execute
  pipelines in tests or launchers. A different encoding does not make them safe.
- Use checked-in readable physical scripts and explicit bounded argument arrays.
  Data files are data only. PowerShell scenarios use `-File`, not generated code.
- No blanket exception permits a forbidden execution sink. Ordinary encoded data
  and assertions that dangerous commands are absent are not executable payloads.
- No execution-policy bypass, Defender exclusions, restoration/allowlisting,
  broad process-name termination, sample uploads or suppressed security logging.
- Mocks, temporary directories, Python audit hooks and Node vm are not OS security
  sandboxes. They do not confine arbitrary native calls or descendant processes.
- Flags, filenames and inherited environment variables never grant approval.
- Preserve original incident scripts, commands and logs unmodified. Do not decode,
  execute, delete or repurpose private incident payloads as regression fixtures.
  Follow security-team evidence-handling direction; do not infer false positives.

## Maintained Components

| Component | Responsibility |
| --- | --- |
| `scripts/check_test_safety.py` | Static source inspection without importing tests, decoding payloads, launching shells or network access. |
| `tests/test-safety-manifest.json` | Inventory, meaningful profiles, dependency closure and exact-source review records. A hash alone is not review. |
| `scripts/run_safe_tests.py` | Gate before imports in parent/worker, explicit selection, isolated environment, bounded progress/output and retained evidence. |
| `tests/validate_test_safety.py` | Narrow plain Python bootstrap for inert checker/profile fixtures, not broad discovery or product qualification. |
| `tests/validate_safe_runner.py` | Finite synthetic runner outcomes, distinct from qualification of product integrations. |
| `scripts/test_profile_state.py` | Shared bounded snapshots and exact profile-directory delta checks. |
| `tests/validate_installer_harness.py` | Bounded supervisor for the plain installer harness; real process execution. |
| `tests/validate_powershell_startup.py` | Minimal startup comparison without installer operations; real process execution. |

These responsibilities describe the maintained entry points, not their validation
status. Confirm the selected profile, supported interface and reviewed source
before execution; the handoff records readiness. Do not bypass an unavailable
profile with an ad hoc loader or mechanical hash filling.

`installer_core.ps1` keeps the package path and definitions-only dot-source
boundary. `Invoke-InstallerWorkflow` requires a complete explicit operations table;
missing operations never fall back to real ones. `New-InstallerOperations` supplies
production adapters only at the normal installer entry point.

`tests/harnesses/installer_safety.ps1` calls that same workflow with recording
fakes, never the real adapter factory. Structured events cover refusal, copying,
validation, settlement and registration. `host/test_install_integrity.py` invokes
the known harness with `-File` and retains partial output on timeout. Its
`DH_TEST_ALLOW_POWERSHELL_HARNESS` opt-in is local to the approved process scope,
never global. Reading/dot-sourcing source is real execution even with fake adapters.

## Audit And Profiles

Full-inventory audit answers whether all declared roots and execution paths have
been classified and reviewed. Named-profile execution answers whether one explicit
test selection and its dependencies are reviewed and runnable within approval.
Keep these questions separate. A scoped PASS is not full-inventory qualification;
an unrelated full-audit gap must not silently broaden the selected execution.
Forbidden patterns remain non-exempt regardless of profile or scan-root placement.

A meaningful profile names a behavior or verification purpose, selects explicit
test files/cases and records their complete reviewed import/dependency closure.
Do not relabel a single bootstrap fixture as product coverage. Review local helpers,
startup hooks, fixtures and dynamically loaded inputs before imports. Unresolved
closure, missing classification, pending hashes and changed bytes block the
affected selection. Do not switch to broad unittest/pytest discovery to evade it.

| Class | Scope after applicable approval |
| --- | --- |
| `pure_mock` | Reviewed pure logic with explicitly mocked integration boundaries. |
| `process` | Reviewed child-process/native-API cases with explicit process opt-in. |
| `live_probe` | Real SDK, browser, network or product operations; never automatic selection. |
| `observational_helper` | Explicit operational diagnostics; never test discovery. |

Classify effects, not names. Importing `dh_native_host` performs logging/profile
access, so isolation must exist before discovery/import, not only in `setUp`.
Legacy analysis probes are not unit tests; frozen opt-in variables must not
silently enable another execution class. A pure-only runner must reject process
or live dependencies rather than assume mocks will intercept them later.

## Review Records

Bind inventory and dependencies to lowercase SHA-256 of complete raw file bytes.
Do not normalize CRLF/LF, BOMs, whitespace or encoding before hashing. Line-ending
changes invalidate a raw-byte review even if parsed logic is unchanged. Bind the
manifest and selected closure again at execution; review is not a race-free lock.

Reviewable callsite records must identify exact path, dotted Python class/function
scope (PowerShell `<file>`), kind, exact source, purpose and full-file SHA-256.
Use this non-executable checklist when preparing a record, not as approval:

| Review field | Placeholder to resolve from actual reviewed source |
| --- | --- |
| Profile/purpose | `<behavior and approved verification scope>` |
| Selected tests | `<explicit paths/cases>` |
| Dependency closure | `<all imported/local execution inputs and hashes>` |
| Path/scope/kind | `<exact file, callsite scope, reviewable operation kind>` |
| Source | `<exact AST call segment or PowerShell line>` |
| SHA-256 | `<lowercase raw-byte file hash after review>` |
| Evidence/limits | `<review rationale, validation scope, known limitations>` |

Missing/null/placeholder hashes are never approvals. Changed selected or dependency
bytes require affected review to be refreshed, not a global exemption. Forbidden
execution cannot be exempted. Do not classify every test as `pure_mock` to get PASS.

## Runner And Evidence

Use the actual base Python executable with `-I -B -S`, not a Windows venv
redirector, PATH alias or launcher. Verify executable/base and prefix/base_prefix
identity. Establish fresh existing `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`,
`TEMP` and `TMP` before workers start. Supply minimal system environment, not
inherited credentials, integration flags, PYTHONPATH or SDK settings.

Record reviewed script/source identity, process identity/start time, expected
output, timeout, output budget, cancellation method, active test and cumulative
`N/total`. Inspect owned progress/logs if stalled; do not silently wait or rerun
the entire suite. Duration alone does not add an approval gate to approved work.
Preserve evidence on success, failure, interruption and alerts, including partial
stdout/stderr and fixed timeout/failure records. Report potential survivors.

Terminate/reap only owned handles; direct-worker ownership does not guarantee
descendant confinement. Each subprocess fixture needs its own lifecycle review.
Do not log environment secrets, encoded payloads, raw model results or credentials.
Keep actual process/file operations separate from mocked integrations. A passing
test is not proof of no endpoint alert or no external side effect.

## Exact Profile Baseline

The dedicated installer-harness supervisor implements this post-run baseline
check through `scripts/test_profile_state.py`. The separate PowerShell-startup
supervisor records observations with its own bounded inventory implementation;
it does not use the shared exact-allowance checker. The general
`scripts/run_safe_tests.py` and synthetic `tests/validate_safe_runner.py` create
fresh profile directories but do not compare their post-run contents or report
`profiles_empty` / `profile_delta_allowed`. Their success cannot establish that
profile directories remained unchanged; baseline-sensitive execution needs the
dedicated reviewed check.

Pre-launch profiles must be completely empty. For a reviewed environment baseline,
the shared rule accepts either all roots empty or only `USERPROFILE/AppData` and
`USERPROFILE/AppData/Roaming` as directories with no further entries. It rejects
files, additional/partial/duplicate paths, case aliases, symlinks/reparse points
and changes in other roots. Check root ancestors before listing, never traverse
unknown directories, propagate read errors and enforce the 64-entry-per-root cap.

This is an exact allowance, not permission for an arbitrary AppData subtree or a
universal Windows startup guarantee. Record factual `profiles_empty` separately
from `profile_delta_allowed`. An allowed delta is still an observed filesystem
change. A later corrected rule must never relabel a historical failed run.

## Verification And Limits

Use focused regression checks for behavior changes and required break-and-fail
verification for new invariants. Tooling changes need affected-profile validation,
including rejection behavior. Docs-only changes need diff/link/state checks, not
product tests. Full suites/builds belong at agreed milestones or justified scope
changes, not after every minor review edit. State exact scope and skipped checks.

Synthetic pass/fail, hash rejection, timeout and output-limit outcomes qualify
only their tested seams. Expected nonzero exits can be verification successes,
not passing fixture results. Finite fixtures with no descendants do not prove
arbitrary cleanup. Process harnesses, frozen packaging and live integration are
distinct verification scopes, never consequences of a pure fixture passing.

Python AST/basic alias checks are not interprocedural proof. PowerShell scanning
is conservative and line-oriented, not a PowerShell parser. Complex/unresolved
execution blocks selection. Frontend reviewer records are not frontend scanner
coverage. Bootstrap code, interpreter and transitive imports remain trust
boundaries; path/reparse checks and hashes have race limits. Report these limits
without inventing a new framework, security product or endless validation loop.
