# Plan E Task 9 Evidence Correction Design

**Status:** Accepted
**Date:** 2026-08-24
**Authorized during:** Plan E Task 9 execution

## Purpose

Replace the overengineered Plan E evidence-executor workflow with the smallest
honest verification process that supports the actual product change.

The abandoned executor architecture introduced thousands of lines of planning,
106 executor tests, custom receipts, leases, worktrees, manifests, and Git
finalization. Repeated independent reviews found that this machinery remained
internally inconsistent and did not recover any additional historical truth.
It is not required to implement or verify the Windows preparing-promotion retry.

## Superseded Requirements

This design supersedes only Task 9 evidence orchestration from:

- `2026-08-19-plan-e-evidence-loss-amendment-design.md`;
- `2026-08-21-plan-e-executor-boundary-correction-design.md`;
- `2026-08-22-plan-e-scripted-evidence-executor-design.md`;
- `2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md`.

It also supersedes the current `## Task 9` section in
`docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md`; that section
must be replaced in place before further product edits.

Specifically superseded:

- Task 6/7 replacement audit JSONs;
- evidence producer/receipt/lease/retirement state;
- the scripted evidence CLI and its 106-test suite;
- promotion transcript/map/ledger requirements;
- fixed 58-artifact and 60-path evidence inventories;
- reviewed/final path-count gates;
- custom `commit-tree`/`update-ref` finalization;
- claims that those mechanisms prove historical execution order.

The dual-review procedure from the evidence-loss amendment is replaced by the
one fresh independent review below. The historical exact 759-line promotion
test payload requirement is replaced by behavior-complete tests with the same
eight accepted selector names. The retry design's custom transcript/map/ledger
evidence requirements are replaced by observed command results summarized in
the concise report. Its product behavior, focused test matrix, full Host/update
verification, and prohibition on erasing historical failures remain required.

The public default asset correction remains valid and completed. The Windows
preparing-promotion retry design remains fully authoritative for product
behavior and tests.

## Historical Evidence Boundary

Preserve these exact accepted report identities:

```text
Task 6: 3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef
Task 7: 49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f
```

The corresponding report files are `UNRECOVERABLE` from examined sources.
Never synthesize replacement reports or claim that current tests reconstruct
historical RED, GREEN, mutation, review, edit-order, or TDD chronology.

Current-state tests may prove only that the committed Task 6/7 implementations
still satisfy their required behavior.

## Abandoned Executor Commit

Commit `ed06da102e3c11cfe53ec17ef50e97252037f624` is an abandoned RED attempt for
the superseded evidence-executor architecture. It never reached GREEN and does
not test the Windows retry.

Delete `plan_e_evidence.py` and `host/test_plan_e_evidence.py` in one normal
forward commit. Do not reset, rebase, amend, squash, or hide the abandoned
attempt. The final report records its SHA and the deletion commit and excludes
it from Plan E completion evidence.

## Required Product TDD

The remaining product change is limited to:

```text
host/test_update_engine_resume.py
host/update_engine.py
```

Test first in `host/test_update_engine_resume.py`. Preserve the accepted eight
test names, but the implementation may use a compact shared fixture rather than
the historical 759-line evidence payload.

Required behavior:

- retry only on Windows;
- retry only `OSError` with exact integer `winerror` 5, 32, or 33;
- at most three total `os.replace` attempts;
- exact delays `0.05`, then `0.2` seconds;
- complete candidate validation initially, after each retryable failure before
  sleep, and after sleep immediately before retry;
- destination remains absent at every validation;
- `os.replace(preparing_root, transaction_root)` remains the sole publication;
- no copy/delete/non-atomic fallback;
- operation hooks wrap the logical promotion once, not each attempt;
- exhaustion retains the final `OSError` as the cause of the existing fixed
  `PreparedTransactionConflict`;
- active state is written only after promotion succeeds;
- constructor signature remains unchanged.

Run each of the seven behavioral selectors independently and observe assertion
RED before editing production. The constructor selector is the passing control.
Commit tests alone, then implement production and commit production alone.

After GREEN, temporarily break and restore these five behaviors, one at a time:

```text
classification
attempt bound
initial validation
pre-sleep validation
post-sleep validation
```

Each matching focused test must fail for the intended reason; restore exact
source bytes before continuing. Mutation output is summarized in the final
report, not retained as a custom artifact tree.

## Verification

At the final reviewed product head, run:

1. Public default asset contract and production Extension build.
2. Task 6 current-state focused tests and TypeScript check.
3. Task 7 Extension and Host current-state focused tests.
4. Windows retry focused tests and all update-engine tests.
5. All Extension tests and production build.
6. Full isolated Host discovery with the existing authorized frozen-runtime
   skip only.
7. Python compile checks and `git diff --check`.
8. Existing Native-message structural safety scans: descriptor-safe
   no-coercion boundaries, non-Analyze snapshot ownership, reserved metadata
   protection, sender routing through the reviewed wire helper, and rejection
   of direct unguarded Native port sends.

Tests use disposable profile/temp roots and never real AppData, registry,
browser, update, install, publish, network, or authenticated model state.

## Independent Review

Obtain one fresh independent review of the complete current Plan E product/test
range. Findings focus on bugs, security/trust boundaries, regressions, and
missing tests. Resolve every Critical/Important finding through focused TDD,
then rerun verification and review.

This is current-state review only. Final whole-branch/release-readiness review
still waits for Plan D.

## Final Report

Create and commit only:

```text
.superpowers/sdd/plan-e-extension-hardening-report.md
```

The report is ignored by `.superpowers/sdd/.gitignore`, so stage it explicitly
with `git add -f`. Before commit, require the staged set to contain exactly that
one path and pass `git diff --cached --check`. After commit, verify the committed
blob equals the working bytes. Do not leave the report as ignored-only state.

The concise report records:

- actual relevant commit SHAs and subjects;
- the abandoned executor RED and its forward deletion commit;
- exact commands and observed test/build totals;
- Windows retry RED, GREEN, and five temporary mutation results;
- Task 6/7 expected hashes, `UNRECOVERABLE`, and
  `HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`;
- independent review disposition and any residual risks;
- Plan D/final release-readiness still pending;
- confirmation that no push, release, install, registry, AppData, browser,
  network, real update, or authenticated model operation occurred.

Use these final verdicts:

```text
PLAN E CURRENT-STATE VERIFICATION: PASS
TASK 6/7 HISTORICAL EVIDENCE: UNRECOVERABLE; NOT RECONSTRUCTED
RELEASE READINESS: NOT CLAIMED
```

## Acceptance Criteria

- The evidence executor and its tests are removed by visible forward commit.
- No historical report or chronology is fabricated.
- Windows retry follows genuine RED/GREEN and focused mutation proof.
- Required focused/full tests and builds pass at the reviewed head.
- Independent review has no open Critical/Important findings.
- One concise committed report records observed facts without prospective or
  release-readiness claims.
- No unsafe real-user or release operation is performed.
