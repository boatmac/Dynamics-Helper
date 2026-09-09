# Dynamics Helper Development Handoff

Updated: 2026-09-09. This is the single active task and authorization record.
Read [AGENTS.md](../AGENTS.md) for evergreen rules and
[test safety](test-safety.md) for execution policy. Historical permissions below
are evidence only; the current user instruction and its limits control this work.

## Repository Identity

- Canonical development entry: `C:\MyWorkbench\Repository\Dynamics-Helper`.
- Migration source/reference: `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`.
- Branch: `hardening/plan-d-runtime-installer`.
- Pre-checkpoint baseline: `70fcdbd`. Local checkpoint commits follow that baseline;
  use `git log` and `git status` for exact current identity, not this baseline hash.
- The source checkout is retained as a reference and owns the alignment worktree;
  do not continue parallel development there after the canonical import.
- Installed product state is independent of source state; development remains local.

## Canonical Entry Migration

The user approved the local import/switch plan and confirmed no other session is
operating these repositories. This section supersedes historical checkout/next-step
directions below. Product builds and qualification are paused for this migration.

Execution sequence: save the source handoff in a local commit, fetch only the
hardening branch from the local source into the canonical repository, verify the
tip, then switch normally without force. Preserve canonical `master` at `bfedc9f`,
its origin, tags and Git directory; preserve all sibling directories, ignored files
and the source/alignment worktree relationship. No network fetch, push or deletion.
The source was at `7280454` before saving the 27-line product-readiness follow-up.

Migration status at this source checkpoint: import/switch pending. The active
handoff in the canonical checkout will record completion. This retained source
copy is not the ongoing status authority after that transition.

Source adoption does not refresh either repository's virtual environment, node
dependencies or built artifacts. Installed Chrome/Edge native-host registration
was observed pointing to the LocalAppData installed executable, not either checkout.
No registry/browser/runtime cutover is included. Correct the stale development
manifest and the supervisor's hardcoded checkout dependency in canonical source
before treating those entry points as portable; do not run installation tests here.

## Current Task

Implement the user's explicit stages 1-3 for test-safety source/tooling and docs,
with only the agreed pure-Python verification. Keep one bounded work package.
Documentation cleanup separates evergreen policy from temporary session state.
Source integration, limited Python validation and the subsequent user-requested
`safety-core` review/binding/gated execution are complete. Results and remaining
qualification gaps are recorded below.

## Active Authorization

- Approved: scoped source/docs changes and the parent's agreed pure-Python checks.
- Subsequent continuation: focused `safety-core` source/dependency review, hash
  binding after review, and gated Python verification; no process-test opt-in.
- Consumed docs exception: byte-identical archival copy using a new plain helper
  under the approved Temp root. This is not permission to repeat the operation.
- User clarification: the user did not prohibit new PowerShell processes. The
  earlier blanket prohibition was an assistant summary error, not user authority.
  PowerShell terminal transport alone does not require separate reapproval for
  already agreed Python checks. This clarification does not expand task scope.
- Corrected harness attempts, Host/SDK runs, browser operations, product suites,
  builds, installation and dependency provisioning were outside the original package.
  The user's subsequent continuation approved one corrected success harness attempt;
  that attempt is now consumed and passed as recorded below. Other scopes remain out.
- User approved local staging and logically split commits for this checkpoint.
  No amend, tag, push or publication is authorized.
- No payload decoding/execution, security-policy changes or original-incident
  Temp access/cleanup. Preserve original evidence and failed results unchanged.
- Earlier once-only process approvals are consumed; this package does not renew them.
- Approved tooling fixes and agreed tests do not need per-command reapproval.
  New effects or expanded scope do. Follow higher-priority instructions throughout.

## Current Milestone Summary

- Published stable product: `v2.0.76`; project/runtime SDK remains `1.0.5`.
- Isolated SDK `1.0.13` qualification executed 27 mock cases: 25 passed, 2 failed.
  This is not an upgrade qualification PASS. Further SDK work remains paused.
- Final limited Python checks: 55/55 mocked cases, 17 Python syntax checks and
  manifest JSON parsing; seven synthetic runner scenarios met expected outcomes.
  These replace neither product qualification nor the historical baseline records.
- One plain PowerShell success harness passed workflow assertions but FAILED its
  overall empty-profile postcondition. Empty AppData/Roaming appeared in USERPROFILE.
- One separate minimal PowerShell startup baseline reproduced exactly that empty
  directory shape without installer loading. This is environment-specific evidence.
- The shared exact-directory rule and pure mocked regressions are implemented.
  It rejects files, extra/partial paths, aliases, links/reparse points and changes
  in other roots; observed changes remain distinct from allowed baseline deltas.
- One corrected PowerShell success harness attempt has now passed. This is a new
  result with the exact directory allowance; the earlier overall FAIL stays failed.
- Manifest v2 `safety-core` now has three test files, 55 exact test IDs and three
  dependencies, with all six source hashes reviewed and bound. Its gated run passes.
  `pii-core` still uses whole-module selection and has pending test/helper hashes;
  it is not qualified. Full inventory review remains incomplete.

## Documentation Delivery

- Evergreen policy: `AGENTS.md`, `DEVELOPER_GUIDE.md`, `docs/test-safety.md`.
- Workflow integration: `docs/edge-d365-debugging-workflow.md`.
- Dated technical evidence: `docs/sdk-1.0.13-upgrade-assessment.md`; no live schedule.
- This short handoff is the only active authorization/status record.
- Preserve pre-existing dirty changes outside this assigned documentation scope.

## Historical Archive

The full pre-cleanup handoff is preserved byte-identically at
[Historical handoff through test safety](history/session-handoff-through-test-safety-2026-09-09.md).
That archive is historical evidence, NOT current instructions or authorization.
Its original header and superseded instructions remain unchanged for byte identity.

- Original/archive size: 99,058 bytes; 1,450 lines.
- SHA-256 before copy, source after copy, and archive all matched:
  `88371ce071c5301601d262b6424ff5c3ede56da83054e518eec180a0e31c6d12`.
- No archive header was prepended and no newline normalization was performed.
- Path-specific `.gitattributes` entries now disable text conversion for the archive
  and new safety inputs. No global line-ending normalization or Git config change.
- The archive contains local account paths, conversation metadata and security
  incident history. This checkpoint is local only; public disclosure needs separate
  review. A later sanitized revision would not remove the original from Git history.
- Detailed validation chronology, process IDs, private evidence pointers and older
  release/incident decisions remain there; do not run its retired procedures.
- Original incident scripts/logs were not changed or used for this archival copy.

## Verification And Remaining Gaps

- `tests/validate_test_safety.py`: 26 checker, 12 profile and 17 runner mocked tests
  passed, zero failures/errors/skips. It also parsed 17 Python sources and the
  manifest. Final console result: 55/55. Earlier intermediate run: 53/53.
- Review found missing post-wait input revalidation. Runner now rechecks manifest
  and recorded source hashes before success; mutation/read-failure regressions pass.
- `tests/validate_safe_runner.py`: 7/7 expected outcomes for repository rejection,
  passing, intentional failure, manifest rejection, selection rejection, timeout
  and stdout limit. These are synthetic cases, not product tests.
- New evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-runner-validation-2wiao9eo`.
  Summary records `source_unchanged=true` for its ten monitored inputs, not the
  whole checkout. Four nested worker records also report `sources_unchanged=true`.
- Seven direct children and four nested workers have recorded non-null exits,
  no unreaped child, no pending reader and no capture/cleanup errors. These are
  historical completion records, not current PID checks or descendant confinement.
- Authorization-record correction: the final Python checks used `functions.bash`
  with PowerShell transport, not a direct-process executor. The user explicitly
  clarified that they never prohibited new PowerShell processes. The assistant's
  earlier claim that these launches violated that user restriction is withdrawn;
  it relied on an inaccurate summary. No corrected installer harness was invoked.
- The general runner and synthetic supervisor do not compare post-run profile
  contents. Do not claim unchanged profiles or absence of external side effects.
  Exact baseline checking belongs to the dedicated harness supervisors.
- Long-term docs were checked for temporary status and stale runner instructions;
  direct unittest/Plan B PYTHONPATH recipes were replaced with reviewed-profile
  guidance, and the baseline-check limitation is explicit in `docs/test-safety.md`.
- Before the focused follow-up below, no production review hashes were filled.
  No full-inventory audit approval, product suite/build, SDK qualification,
  corrected PowerShell harness, installer production-path qualification or release
  was performed. No Git writes occurred.

## Safety-Core Gated Qualification

- Source review corrected the earlier summary: the initial profile had 38 tests,
  no explicit IDs, and omitted runner mocks. It now selects exactly 26 checker,
  12 profile-state and 17 runner tests. The profile-contract assertion was updated.
- Reviewed all six source files including checker/runner bootstrap effects. Bound
  their raw-byte hashes and 31 exact `unknown_execution` callsite records. These
  cover fixed stat-attribute access, lexical paths, in-memory hashes/JSON and test
  list operations; scanner policy was not weakened. Other inventory remains pending.
- Read-only selected-profile checker passed with no diagnostics. The maintained
  runner then passed 55/55, zero failures/errors/skips, with process tests disabled.
- Initial passing evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-i_3y2rsw`.
  After changing only manifest status to refer to this handoff, repeated the scoped
  run to bind the final manifest rather than claim verification of changed bytes.
- Final evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-_740087k`.
  Final manifest SHA-256:
  `0e40f79364f982cb97814e9a931ac3efdd7d85f5aa7d74ba05778a35d38c2aec`.
  `result.json` binds all six sources and all 55 IDs; exit 0, sources unchanged,
  no capture/cleanup errors, no pending reader, child reaped. Worker PID 53408 is
  historical evidence, not a claim about current PID identity. Parent elapsed 2.46s.
- Real effects: retained Temp evidence/profile directories and one owned Python
  worker per run. Tests mock process/filesystem integration seams. No profile-tree
  postcondition, OS sandbox, arbitrary descendant containment or alert-free claim.
- `git diff --check` passed for tracked changes, with existing LF/CRLF warnings;
  it does not cover untracked files. No source changes followed the bound run.
  Keep archive raw-byte preservation in mind before any future authorized commit.

## Local Checkpoint

- User requested logically split local commits and a clean handoff for a new session.
  Code/tooling and documentation are separate checkpoint units, not a release.
- Code/tooling commit: `4e8d0c0` (`fix: replace encoded installer tests with reviewed
  safety tooling`). This handoff and the evergreen rules form the following docs
  commit. No push, tag or release was performed.
- Before the code commit, all 19 new safety inputs matched their staged Git blobs
  byte-for-byte using raw hash-object comparison; staged whitespace checks passed.
- Precommit source inspection corrected one stale installer static assertion to
  match the checked-in `Join-Path` dot-source statement. The installer test module
  remains unqualified; no installer test or real PowerShell harness was run here.
- Manifest pending-review wording now points to execution evidence. The earlier
  manifest hash above identifies the earlier run, not the changed checkpoint bytes.
- Checkpoint verification: gated `safety-core` passed 55/55, no failures/errors/skips,
  exit 0, unchanged inputs and no capture/cleanup errors or unreaped worker.
  Evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-d5gpllcl`.
  Checkpoint manifest SHA-256:
  `eb82ce23143f52a3940a761f2bccf47d08c7f5a44eae1dd811d5935cdf0cc020`.
- Archive SHA-256 was independently recomputed before staging and matches the
  preserved value above. The archive was not edited. Tracked diff whitespace checks
  passed with line-ending warnings for existing text files.

## Next Single Action

### Authorized Failure-Scenario Package

The next user continuation approves the 14 remaining fake refusal/failure scenarios,
once each, stopping at the first unexpected outcome without automatic retry. The
existing supervisor now accepts exactly `--scenario <known name>`; no arguments
still select success. Only supervisor assertions/selection changed, not installer
or harness operations. Expected child exit is 1; supervisor exit 0 means the expected
failure and all safety postconditions passed. No real installation or new framework.

Reviewed supervisor SHA-256:
`3c1444e3ad618d12395bc18687fcd2015b4b2fdadc6086c726cc512b9029f0f6`.
The other three reviewed raw-byte hashes remain as in the success table below.
Names: running, roaming, preflight-throw, preflight-nonzero, live-throw, live-nonzero,
settle-throw, settle-nonzero, register-throw, register-nonzero,
register-generic-throw, missing-exe, missing-package, copy-throw.

Each launch retains its Python process handle, emits cumulative progress/PID/start
and log paths, uses a 40-second outer wait plus 5-second owned-handle cleanup, and
retains separate new stdout/stderr under `dh-installer-failure-20260909-<scenario>-1`.
Before each launch all four review hashes are rechecked. Existing output files stop
the package rather than overwrite evidence. The supervisor creates its own fresh
inner evidence and retains its existing profile/capture/PowerShell cleanup checks.
Outcome: **14/14 expected outcomes**, one launch each, no retries. All outer Python
processes exited 0; all PowerShell children returned expected exit 1. Each result
was read independently: correct scenario/arguments, passed assertions, four source
hashes matching the reviewed before/after identities, zero stderr/capture errors,
no pending readers, output cap or cleanup/finalization errors. All profiles started
empty; only the same two empty USERPROFILE directories appeared afterwards, with
`profiles_empty=false` and `profile_delta_allowed=true` in every case. The 27
invalid-table checks per invocation remain inferred, not separately reported tests.

Evidence directories under `C:\Users\zhaobo\AppData\Local\Temp\opencode`:

| Scenario | Inner evidence directory | Python PID | PowerShell PID |
| --- | --- | --- | --- |
| running | `dh-installer-validation-23wrv107` | 68660 | 62744 |
| roaming | `dh-installer-validation-fi32i2zt` | 46716 | 22972 |
| preflight-throw | `dh-installer-validation-c38xjkbn` | 46076 | 59748 |
| preflight-nonzero | `dh-installer-validation-yow3d9pf` | 59084 | 69048 |
| live-throw | `dh-installer-validation-lig0lg8v` | 27684 | 76760 |
| live-nonzero | `dh-installer-validation-653r9062` | 43660 | 2660 |
| settle-throw | `dh-installer-validation-2wt19ps6` | 29056 | 25708 |
| settle-nonzero | `dh-installer-validation-mypve_ar` | 73520 | 68124 |
| register-throw | `dh-installer-validation-e_2onmty` | 69996 | 52336 |
| register-nonzero | `dh-installer-validation-y5repbvv` | 27812 | 67256 |
| register-generic-throw | `dh-installer-validation-7z2biksu` | 77048 | 64572 |
| missing-exe | `dh-installer-validation-5nweyg0p` | 59596 | 3776 |
| missing-package | `dh-installer-validation-ceblxgen` | 31084 | 61384 |
| copy-throw | `dh-installer-validation-273_xy_x` | 67816 | 38840 |

PIDs are historical owned-process completion evidence, not current PID checks or
descendant enumeration. The launch window started `2026-09-09T12:58:28.6155644Z`;
last Python launch was `2026-09-09T12:58:46.4114242Z`. Success was not rerun.
Supervisor execution behavior and bytes remain at the reviewed hash above;
post-validation documentation describes its scenario interface separately.

### Authorized Success Attempt

The user's subsequent "continue" authorized one corrected success attempt via the
existing dedicated supervisor. It completed and passed; authorization is consumed.
No automatic retry or real installation. Reviewed
source identities before launch (SHA-256 of raw bytes):

| Source | SHA-256 |
| --- | --- |
| `tests/validate_installer_harness.py` | `6462b11ccfa729e83ae797a04929fde1e6c6eef53fd46c98bd1b2b78354775a0` |
| `scripts/test_profile_state.py` | `edcafb19545cb734f0508b3ef68807f5a01e421369667f9055623bb41dcb1152` |
| `tests/harnesses/installer_safety.ps1` | `fab6cd5af754b7f427765d09900924a59de8777f8bfdfda4c6e8d71174632c0f` |
| `installer_core.ps1` | `0c80c0218c6ed49dfa67d55c17ff09427afa4cac8dc7740b5b1ce45174d880d8` |

Launch uses absolute base Python 3.13 with `-I -B -S`; the supervisor selects
`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`. The caller retains
the Python process object, reports its PID/start time and redirected log paths,
waits up to 40 seconds, and on timeout terminates only that owned Python handle
with a further 5-second wait. This is not descendant-tree cleanup. Inner supervisor
owns its PowerShell handle and has its existing 20-second capture budget.

Outer logs are new files under the approved Temp root with prefix
`dh-installer-supervisor-20260909-success-1`; do not overwrite an existing file.
The supervisor reports its separate fresh `dh-installer-validation-*` evidence
directory. No retry or additional scenario is implied by this attempt.

Outcome: **PASS**, one invocation, no retry. Python supervisor PID 57120 started at
`2026-09-09T12:51:02.2503579Z` and exited 0 within the outer wait. Its stderr is empty.
The fresh inner evidence is
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-installer-validation-bjwkx785`.
`result.json` records PowerShell PID 43288, exit 0, `passed=true`, elapsed 1.58s,
`source_unchanged=true`, empty capture errors, no pending readers, no output-cap hit,
and no cleanup/finalization error fields. All four before/after hashes match the
reviewed values above. Output: 8,106 stdout bytes, zero stderr bytes.

All six profile roots started empty. Afterwards only USERPROFILE contained the
two empty directories `AppData` and `AppData/Roaming`; the other roots stayed empty.
Thus `profiles_empty=false`, `profile_delta_allowed=true`. This is an allowed
observed filesystem change, not absence of change. The 27 invalid-table calls are
inferred completed before the success report, not 27 separately reported test cases.
Only owned process completion is established; descendants were not enumerated and
absence of endpoint alerts is not established. Earlier failed evidence is untouched.

Continue in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec` on
`hardening/plan-d-runtime-installer`; a new session is not required. Local checkpoint
HEAD is `87bc044`; it follows code commit `4e8d0c0`. Neither was pushed.

The user started step 1 (static review) of installer test-safety qualification.
Review covered `installer_core.ps1`, `tests/harnesses/installer_safety.ps1`,
`tests/validate_installer_harness.py`, `scripts/test_profile_state.py`, and related
assertions/policy. No definite static blocker for one mocked success attempt was
found. No harness was executed and no attempt was consumed during this review.

- Dot-source defines functions and returns before the real operation factory or
  production entry. All nine supplied operations record events or mutate in-memory
  state. The harness performs invalid-table checks then one update-success workflow.
- The existing dedicated supervisor checks workflow assertions and the corrected
  exact profile allowance. It distinguishes `profiles_empty` from
  `profile_delta_allowed`; allowed empty AppData/Roaming is not unchanged state.
- A run would create fresh Temp evidence and six profile directories, start one
  real PowerShell child from base Python, and capture output with two reader threads.
  No real Host, copy/delete installation operation, registry or network call is
  reachable in the reviewed fake path. This is not an OS sandbox or alert guarantee.
- Supervisor interface: base Python `-I -B -S` plus the absolute existing
  `tests/validate_installer_harness.py` path. No script arguments select success;
  `--scenario <known name>` selects one case. Do not invent an installer profile or bypass
  the gate with broad discovery; this is the separately reviewed maintained entry.
- Before execution, explicitly establish the one-attempt scope, bind the four source
  files' raw-byte review hashes, verify absolute executable/evidence paths, and own
  the supervisor process with observable PID/progress and outer cancellation.
- Child capture budget is 20 seconds and 1 MiB per stream, plus cleanup/finalization;
  this is not a whole-supervisor deadline. Evidence finalization can itself fail,
  reader threads can remain pending, and descendants are not confined. Retain and
  report failures without automatic retry or a new wrapper/framework project.

The fake installer qualification now covers all 15 declared harness scenarios:
one success with the earlier supervisor and 14 expected refusal/failure outcomes
with scenario-aware assertions. Installer core/harness bytes were unchanged across
both packages. This is not a full Host test suite or production qualification.
No more scenario retries or new framework work is needed for this bounded milestone.
The user explicitly requested committing this supervisor/documentation follow-up
and proceeding to the next step. After the local commit, inspect the existing
product-qualification procedure and artifact readiness without running a build,
installer or live product. Real installation, packaged runtime and product
integration execution remain separate scopes; no push or release is authorized.
No real installation has been performed.

### Post-Commit Product Readiness

The follow-up was committed as `7280454` (`test: qualify plain installer refusal and
failure scenarios`); the worktree was clean immediately after that commit. No push.
The installer test-safety remediation milestone can close with the 15 fake scenarios;
real installation qualification is a separate, optional continuation, not another
prerequisite for that completed milestone.

Read-only readiness inspection found an existing frozen Host output and Extension
dist version `2.0.76`, but neither is bound to current source. The only local ZIP
found is `releases/DynamicsHelper_v2.0.76-beta.2.zip`; its historical ledger binds
source `6413dba`, predating changes to both installer scripts. Do not reuse it as a
current-installer qualification candidate. No binaries or installers were executed.

Existing prerequisites and matching-installer repair scenario are in
`docs/superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md`
(prerequisite checklist and Scenario 3). The old commands in
`docs/plan-d-pragmatic-cloud-pc-runbook.md` are retired, not execution authority.

Next bounded proposal: explicitly approve a local-only build/package work package
using existing build/staging functions, bind current source and package hashes,
then stop before installation. Do not run the normal `release_helper.py` CLI: it
cleans release outputs, changes versions and commits/tags even without publication.
No dependency installation, SDK upgrade, push or release is implied. Actual repair
qualification later requires an approved disposable environment and separate scope.
This readiness inspection did not build, probe, install, or mutate the product.

Do not expand into `pii-core`, SDK upgrade or new testing frameworks as prerequisites.
PowerShell terminal transport is not a separate authorization blocker. Existing
process-attempt budgets do not renew automatically. No product build, installation,
push or release follows from the checkpoint. Preserve the archive and original
incident evidence unchanged.
