# Dynamics Helper Development Handoff

Updated: 2026-09-09. This is the single active task and authorization record.
Read [AGENTS.md](../AGENTS.md) for evergreen rules and
[test safety](test-safety.md) for execution policy. Historical permissions below
are evidence only; the current user instruction and its limits control this work.

## Repository Identity

- Checkout: `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`.
- Branch: `hardening/plan-d-runtime-installer`.
- Pre-checkpoint baseline: `70fcdbd`. Local checkpoint commits follow that baseline;
  use `git log` and `git status` for exact current identity, not this baseline hash.
- The separate `Dynamics-Helper` checkout is not this task's development root.
- Installed product state is independent of source state; development remains local.

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
  builds, installation and dependency provisioning remain outside this package.
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
- No corrected PowerShell harness run has occurred. Do not relabel its earlier FAIL.
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

Resume in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec` on
`hardening/plan-d-runtime-installer`, reading this handoff and `AGENTS.md` first.
The task is installer test-safety remediation: determine the remaining review and
execution scope for the checked-in plain installer harness, then complete bounded
qualification under applicable user authorization. The corrected harness has not
been rerun; preserve the earlier failure as a failure. Do not perform a real install.

Do not expand into `pii-core`, SDK upgrade or new testing frameworks as prerequisites.
PowerShell terminal transport is not a separate authorization blocker. Existing
process-attempt budgets do not renew automatically. No product build, installation,
push or release follows from the checkpoint. Preserve the archive and original
incident evidence unchanged.
