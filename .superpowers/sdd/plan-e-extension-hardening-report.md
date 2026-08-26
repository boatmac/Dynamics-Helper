# Plan E Extension Data and Request Hardening Report

## Scope and Authority

Plan E was verified from integration base
`0dbb4852931b50153fb898b03129ae0092c46404` through reviewed product HEAD
`de63ef48f68940749018cbf48a11ee154b5e9ff8`.

The current Task 9 authority is
`b77deeec53e3ac8910e8f4542dad877248a5b12a`
(`docs(evidence): simplify Plan E verification`). Windows preparing-promotion
behavior remains governed by `249b1a3750b50db1336fb39661db9306355a1a18`.

This report records current-state verification only. It does not claim release
readiness or final whole-branch review; Plan D remains pending.

## Commit Map

- `bdfa2b4f68804fc041a1249ea70b2ee1459d7f4c` - `docs(update): simplify Plan E Task 9`
- `e26323820ed20d7077485e03afed102ca0413010` - `chore(evidence): remove abandoned Plan E executor`
- `2ca901d07b3981856fafe605bc8eb31ae9afdca2` - `docs(plan): record executor retirement verification`
- `845b9e00e1b6a38571e87d1bc4d6b1ca7298f297` - `test(update): cover locked preparing promotion`
- `6c72cfbdeab79b4766222591ad72c21895826b9f` through `d4763b6d23e7f1451d49b3cd0c33bd1aa8e07a70` - focused promotion/authority regression tests
- `7a5f6df04f86392dac44c0147de98e18d64fd03d` - `fix(update): retry locked preparing promotion`
- `c1a5359fea02e373943d77cc8b22bc2224691bf3` - Root isolation RED
- `0639470ce995d132b89a43becc25a771b61dd353` - `fix(host): keep request root out of persisted config`
- `ffd2ddc0abe2562ba848312550aec32259f45b54` - `fix(analysis): warn when owner read blocks persistence`
- `fecd7c5226b8b5f2622834eed73bd557eace8db3` - orphan reparse RED
- `0c8a1874aaee7562cb179204e43ba1845aa6d39f` - `fix(update): reject orphan reparse cleanup`
- `de63ef48f68940749018cbf48a11ee154b5e9ff8` - `docs(plan): align request root example`

## Historical Evidence Boundary

- Task 6 expected report SHA-256:
  `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef`
- Task 7 expected report SHA-256:
  `49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f`
- Availability: `UNRECOVERABLE`
- `HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`

Task 6/7 code and regression tests remain present. Their current tests passed;
that does not reconstruct their missing historical reports, RED/GREEN sequence,
mutation timeline, or review timeline.

## Abandoned Executor

`ed06da102e3c11cfe53ec17ef50e97252037f624` was an abandoned RED attempt for a
superseded evidence-executor architecture. It never reached GREEN and is not
Windows-retry or Plan E completion evidence.

The two executor files were visibly forward-deleted by `e26323820...`.
Retirement verification then passed in a new PowerShell process and in a clean
local clone. The clone compiled 69 Host Python files and a synthetic
`release_helper.stage_release` probe produced the exact expected package without
any executor path or reference. No executor process, lease, temporary state, or
extra worktree remained.

## Windows Retry RED

Before production changes, the constructor control passed and these seven
selectors each ran one test and failed one behavior assertion with no error or
skip:

- `test_windows_access_denied_retries_atomic_preparing_promotion`
- `test_windows_sharing_errors_32_and_33_are_retryable`
- `test_persistent_windows_promotion_lock_stops_after_three_attempts`
- `test_non_windows_or_unlisted_promotion_errors_are_not_retried`
- `test_preparing_promotion_revalidates_before_and_after_sleep`
- `test_preparing_promotion_revalidation_rejects_every_authority_mismatch`
- `test_preparing_promotion_hooks_wrap_the_logical_operation_once`

RED commit: `845b9e00e1b6a38571e87d1bc4d6b1ca7298f297`.

Later code-review findings were also reproduced by focused failing tests before
their fixes: validation/rename races, ancestor and nested reparse writes,
invalid active repair, forged seed authority, authority-file reads, target
replacement, and orphan reparse cleanup.

## Windows Retry GREEN

The final implementation uses `os.replace` as the sole preparing-workspace
publication, retries only Windows `OSError` values with exact integer
`winerror` 5, 32, or 33, makes at most three attempts, and waits exactly 0.05
then 0.2 seconds.

Complete workspace authority is revalidated initially, before sleep, after
sleep, after promotion, and before active publication. Preparation writes and
authority reads reject Windows reparse/symlink, containment, topology, journal,
ownership, probe, digest, and target replacement mismatches. Active repair uses
a trusted staging baseline. Hooks still wrap the logical operation once and the
public constructor remains unchanged.

GREEN commit: `7a5f6df04f86392dac44c0147de98e18d64fd03d`.

## Mutation Results

The final retry source caught and restored all five temporary mutations:

- classification: mutation FAIL, restored GREEN PASS
- attempt bound: mutation FAIL, restored GREEN PASS
- initial validation: mutation FAIL, restored GREEN PASS
- pre-sleep validation: mutation FAIL, restored GREEN PASS
- post-sleep validation: mutation FAIL, restored GREEN PASS

Each mutation changed only `host/update_engine.py`, ran one matching selector,
required exactly one assertion failure, restored exact source bytes, and reran
the selector GREEN. Final source SHA-256 at that checkpoint was
`6052b5c1b2dfead2c73a759b9a3bd7fe1506a2e955ca81227bcbe1402e6071ba`.

## Verification Results

- Public default asset contract: 5/5 PASS.
- Public source/dist asset SHA-256: both
  `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25`.
- Task 6 focused Extension: 4 files / 126 tests PASS.
- Task 7 focused Extension: 7 files / 94 tests PASS.
- Full Extension: 31 files / 767 tests PASS.
- TypeScript no-emit check: PASS.
- Production Extension build: PASS.
- Isolated Task 7 Host Root/Prompt run: 69 tests PASS.
- Final affected Host Root/Prompt run: 70 tests PASS.
- Analysis persistence/bridge: 124 tests PASS.
- Retry/ownership focused run: 32 tests PASS after final hardening.
- Related update-engine host/extension/rollback run: 28 tests PASS.
- MatrixCoverage: 4 tests PASS.
- Forward fault matrix: all 5 methods PASS in bounded foreground runs.
- Rollback fault matrix: 4 tests PASS.
- General isolated Host batch: 229 tests PASS.
- Update/package/recovery isolated Host batch: 272 tests PASS with exactly one
  authorized skip for
  `FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation`
  because `DH_PLAN_C_FROZEN_ONEDIR` was not set.
- Native-message structural safety scan: PASS.
- Host source compilation and `git diff --check`: PASS.
- Reviewed product worktree: clean; no lingering repository-bound test process
  or owned temporary root.

Existing React test output included `act(...)` warnings and the build reported
stale Browserslist metadata. Neither produced a test or build failure.

## Independent Review

Reviewed product HEAD: de63ef48f68940749018cbf48a11ee154b5e9ff8

Review base: `0dbb4852931b50153fb898b03129ae0092c46404`

- Critical: None.
- Important: None.
- Minor: None.
- Testing Gaps: None.
- Review disposition: PASS

The first full-range review identified three Important findings. They were
independently reproduced, fixed through focused TDD, and rereviewed. The final
rereview reported no open findings.

## Residual Risks

- Task 6/7 historical reports remain unavailable.
- The retry handles bounded transient Windows locking; it is not intended to
  defeat an arbitrary same-user or administrator process continuously racing
  filesystem operations.
- The frozen onedir integration test remains environment-gated.
- React `act(...)` and Browserslist metadata warnings remain non-blocking test
  hygiene/maintenance items.
- Plan D and final whole-branch/release-readiness review remain pending.

## Forbidden Operations

No push, tag, release, publish, install, registry mutation, real AppData write,
browser operation, network operation, real update, MyCases operation,
authenticated model operation, history rewrite, or recovery-source deletion was
performed. Tests used disposable roots and injected or synthetic update state.

## Verdicts

PLAN E CURRENT-STATE VERIFICATION: PASS
TASK 6/7 HISTORICAL EVIDENCE: UNRECOVERABLE; NOT RECONSTRUCTED
RELEASE READINESS: NOT CLAIMED
