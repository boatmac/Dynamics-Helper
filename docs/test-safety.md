# Test Execution Safety

## Policy And Authority

This policy defines test execution boundaries; it is not permission to run tests,
install dependencies, change security policy or operate the product. Determine
scope from the user's request and applicable instructions, and verify current
readiness. Evidence does not grant authority. A source description or a successful
fixture does not qualify a suite. See [TODO.md](../TODO.md) for current limitations.

Follow system/developer instructions, then applicable user instructions; skills
and workflow templates cannot override them or grant additional authority. An
approved work package includes reversible source/docs edits, necessary tooling
repairs and agreed verification without repetitive per-command approval. New
external effects or scope expansion require applicable approval. Explicit
once-only attempts and effect/time budgets remain binding after failure.

If blocked, quote the exact rule, distinguish wording from interpretation, state
the concrete conflict and propose the smallest in-scope remedy. Do not add endless
wrappers or restart agreed review budgets. Repeat checks only for new changes,
failures or unresolved concerns. Lead progress reports with outcomes and remaining
gaps, not temporary paths or the number of scripts created.

## Live Feature Test Entry

The authoritative [Testing Cycle](../AGENTS.md#native-host-mode-selection) selects
the route; it does not authorize execution:

- Published GitHub Release: test the real production upgrade only through the
  Extension's own upgrade feature, never a full installer, Dev switch or copied
  local files as a substitute. Publication itself still needs explicit approval.
- Unreleased Extension only: approved local build, then browser **Load unpacked**
  from this checkout's `extension/dist/`, keeping the production Host.
- Unreleased Native Host only: keep the production Extension and select the source
  Dev Host through registry-based Native Messaging using `python dev_switch.py dev`.
- Unreleased both: combine the local unpacked Extension and source Dev Host routes.

`switch_prod` in the user's terminology means the existing `dev_switch.py`, not
a renamed script or new alias. Before an authorized switch, run read-only `status`
from the repository root and verify the target manifest and its intended existing
Host launcher/executable. Both Chrome/Edge HKCU writes require applicable work-package
authorization; inspect both keys afterward. The script does not change the loaded
Extension or terminate an old Host. Source Dev shares user configuration with Prod
and is not a sandbox; registration status does not verify the active runtime.
See [operator prerequisites](../DEVELOPER_GUIDE.md#2-native-host-mode-selection).

Do not use a local complete installer or production-file copying for unreleased
feature tests. The previous local installer cycle is superseded, with no automatic
return-to-Prod or return-to-Dev step. Matching-full-installer repair remains a
separate, explicitly approved user maintenance operation. Recovery/fault tests
retain their existing disposable-VM gate and separately agreed environment/scope;
normal upgrade success is not recovery qualification. These rules do not expand
offline test, build, browser, live Analyze, registry or publication authorization,
or reset any once-only attempt budget. The reviewed offline/fixture entries below
remain distinct from live feature testing.

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
| `tests/validate_installer_harness.py` | Bounded supervisor for one plain installer scenario per invocation; no arguments selects success, `--scenario <known name>` selects a specific case. Real process execution; expected child failure is validation success only when assertions pass. |
| `tests/validate_powershell_startup.py` | Minimal startup comparison without installer operations; real process execution. |

These responsibilities describe maintained entry points, not approval or current
validation status. Choose the entry appropriate to the requested verification:

- Test modules use `scripts/run_safe_tests.py` with a reviewed named profile and
  its complete dependency closure. Direct unittest/discovery is not a substitute.
- Dedicated installer/startup supervisors run their documented scenarios under
  separate source/dependency review and applicable process authorization. They do
  not use the named-profile loader and do not require a wrapper or invented profile.
  Bind reviewed raw bytes before launch and compare recorded before/after hashes;
  retain evidence and account for actual child processes and profile changes.
- Checker/runner self-validation scripts have their own reviewed bootstrap scope;
  passing those fixtures does not approve product test execution.
- Fixed SDK offline contracts use `scripts/run_sdk_tests.py`, not broad unittest
  discovery or the Python scanner profile. `tests/sdk-test-review.json` binds the
  exact test IDs and reviewed project-source bytes. The entry checks canonical
  installed dependency versions and RECORD hashes, snapshots actual dependency
  bytes before/after, and reuses the existing base-Python worker supervisor. It
  does not process `.pth` or execute cache bytecode. Third-party libraries and
  native dependencies are a declared trust boundary, not source-scanner coverage
  or an OS sandbox. Pre-import effect guards reject CLI/process/network/registry
  operations except fixed synthetic dateutil registry handles; standard-library
  asyncio loops are created before the guards. Test import never imports Host.
  SDK upgrades reuse this entry after reviewing changed tests/adapters/dependencies
  and updating its source hashes. Real CLI/model checks and installation remain
  separate effects requiring applicable authorization. See
   [SDK integration](sdk-integration.md) for current contracts and
   [SDK upgrade workflow](sdk-upgrade-workflow.md) for invocation and limitations.
- The fixed Extension build gate uses `npm run build` from `extension/package.json`:
  `node --test test/defaultItems.test.mjs`, TypeScript/Vite build, then
  `node scripts/verifyDefaultItemsCopy.mjs`. With applicable build authorization,
  review the explicit test, `items.json`, copy check and build configuration and
  bind their raw-byte hashes in the build record before execution. This is a
  separate Node build gate, not a Python named-profile pass or permission for
  Vitest/discovery. The five tests read public menu data; Node may create a test
  child process. Vite/plugins execute build code and write dist/cache files.
- Focused Extension Vitest checks use the installed runner with explicit test
  files and name filters after reviewing each complete file, setup/mocks and
  local import closure. Record raw-byte hashes and the exact selection before
  execution, then verify unchanged inputs afterward. Preserve file isolation;
  account for Node forks, esbuild helpers and cache writes. This is a separate
  frontend review entry, not Python scanner coverage; unreviewed dynamic execution
  or live dependencies still block it. Do not use broad discovery or `test:run` /
  `test:coverage` when their additional default-items step is outside the selected
  scope. A focused selection can use `npm test --prefix extension -- --run` with
  explicit reviewed file arguments and a test-name filter, without that extra gate.
- Unfiltered `npm test`, `npm run test:run`, and `npm run test:coverage` discover
  the full Extension Vitest suite; focused authorization and a focused PASS do not
  cover that scope. Full-suite execution requires the agreed milestone/scope and
  review of the full selected test/setup/dependency closure. `test:run` and
  `test:coverage` first execute `test:default-items` (the separate Node test gate),
  even when arguments narrow the later Vitest selection. Include that gate's
  reviewed inputs and child-process effects explicitly. Coverage adds generated
  output; watch mode needs a bounded observation/cancellation plan. These scripts
  do not perform the build's post-copy verification and are not build qualification.

An unavailable profile is not permission to route arbitrary tests through a
dedicated supervisor. Do not bypass review with an ad hoc loader, mechanical hash
filling or broad discovery. Explicit attempt budgets still apply to the chosen entry.

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
Live analysis probes are not unit tests; frozen opt-in variables must not
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

Before launch, bind reviewed source identity and determine expected output, timeout,
output budget and observation/cancellation method. After launch, record the PID or
task handle and start time provided by the tool. Report active test and cumulative
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
change. A changed rule must not retroactively relabel a failed run as passing.

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
