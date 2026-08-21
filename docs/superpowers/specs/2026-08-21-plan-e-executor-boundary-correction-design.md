# Plan E Executor Boundary Correction Design

**Status:** Accepted
**Date:** 2026-08-21
**Authorized during:** Plan E Task 9 execution recovery

## Purpose

Make the Plan E Task 9 execution contract truthful and executable on OpenCode.
Each terminal tool call runs in a separate process, so a PowerShell mutex,
process-local variables, open handles, or environment scope cannot survive code
edits, Git commits, subagent reviews, or later tool calls.

This correction changes only orchestration and evidence ownership. It does not
change the accepted Windows promotion retry behavior, Task 6/7 product behavior,
test requirements, report-loss claim boundary, or final evidence contents.

## Execution Phases

### 1. Git/TDD Phase

The RED and implementation commits do not hold an evidence mutex or lease.
They are protected by committed-state gates:

- clean worktree and empty index before RED;
- exact one-path RED edit and commit;
- the RED commit is the direct child of the committed Plan E plan;
- exact observed assertion RED before production edits;
- exact one-path implementation edit and commit;
- the implementation commit is the direct child of the RED commit;
- exact source blobs and subjects are reread from Git after each commit.

RED/GREEN transcripts generated during this phase are diagnostic only. The
later RED evidence producer replays the exact selector at the immutable RED
commit and records that reproducible failure. The direct commit chain proves
that the production implementation is absent from the RED commit. The final
report labels the later execution as `RED commit replay` and records the
original RED-before-production execution only as a narrow process attestation;
it does not claim cryptographic proof of wall-clock execution order. No ignored
artifact from a separate process is trusted merely because it exists.

### 2. Verification And Review Phase

Focused/full tests, static checks, current-state mutations, audit generation,
and review package generation may run as separate foreground tool calls. Every
producer is one complete invocation that acquires the same fixed repository
mutex, fails closed on an abandoned mutex or existing producer lease, creates
and rereads its own canonical token-bearing lease and owner record, starts from
an explicit immutable reviewed head, validates a clean tracked source tree,
writes only to its registered token-scoped paths, waits for all child processes,
and atomically promotes a closed result artifact plus a canonical producer
receipt. It then validates and removes only its own worktree/temporary state,
removes its lease, and releases the mutex last.

Every receipt binds one locked producer ID, reviewed head, exact command/argv,
working directory, source blobs, candidate paths and SHA-256 values, and any
mutation worktree registration. Receipts live at fixed ignored paths outside
the 58-artifact set. A crash leaves the lease, owner, token paths, and any exact
worktree registration in place. Every producer and finalizer checks for any
retained producer state and stops without adoption, reset, prune, force-removal,
or deletion. Successful receipts bound to the selected current reviewed head
are consumed only by the final transaction and are removed after successful
post-commit validation. A succeeded receipt bound to an older reviewed head has
exactly one other authorized consumer: the owner-safe retirement invocation
below. Crash-retained or incomplete receipts have no automated consumer.

A reviewed-head change does not permit overwriting fixed-path candidates. A
separate retirement invocation acquires the mutex and accepts only a completed
producer receipt whose closed status is `succeeded`, whose lease/owner cleanup
is already complete, whose candidate hashes match exact files, and whose old
reviewed head is an ancestor of the newly selected clean head. It writes a
canonical retirement receipt, removes only that receipt's exact candidate and
producer receipt paths, verifies absence, then removes the retirement receipt
and releases the mutex. Missing/malformed receipts, crash-retained leases,
owner/worktree/temp state, hash drift, unrelated paths, or non-ancestor heads
remain blocking and are never retired automatically. The new producer runs
only after successful owner-safe retirement.

Each result records the reviewed head, exact command/argv, source blobs, and
output hash. A later aggregation step accepts it only after strict receipt
validation and independent recomputation of those bindings. A reviewed-head
change invalidates every result and requires regeneration.

Current-state mutation producers may use a linked worktree only when their
closed owner record explicitly owns the exact Git common-directory worktree
registration as an external metadata exception. The same invocation creates,
uses, restores, verifies, and removes that exact registration without `--force`
or `prune`. A retained registration blocks all later execution. No other
producer writes Git common-directory metadata.

Task 6/7 audit producers create the exact canonical audit bytes before review.
Reviews bind those hashes. The final transaction must stage those same bytes
byte-for-byte; it never regenerates, edits, or replaces a reviewed audit.

Review records are process evidence, not a cross-process lock. They retain the
existing narrow claim: different declared orchestration session identifiers do
not prove identity, independence, dispatch, or absence of collusion.

Each review result is accepted through its own one-shot ingestion producer, not
controller memory. The controller passes the returned text and observed opaque
session identifier as input to one mutex/lease-owned invocation. That invocation
strictly validates the exact review kind, package/diff hashes, reviewed head and
range, both frozen audit hashes, required headings, criterion decisions,
Critical/Important emptiness, and exact `PASS` or
`INTERIM PASS THROUGH PLAN E` disposition. It creates the canonical findings
file and producer receipt atomically, records the declared identifier, and then
performs normal owner cleanup. Malformed, stale-head, mismatched-audit, or
blocked review text creates no findings candidate. The final transaction trusts
only both validated review-ingestion receipts and their exact findings hashes.

### 3. Final Evidence Transaction

One single PowerShell invocation owns the final evidence transaction from mutex
acquisition through release. It:

1. Acquires the fixed repository mutex.
2. Fails closed on an abandoned mutex or an existing lease.
3. Creates and rereads one canonical token-bearing lease.
4. Validates the immutable reviewed head, committed chronology, clean tracked
   source, all producer receipts/candidate bindings, reviewed audit bytes, and
   exact artifact inventory.
5. Creates only the manifest and final report through token-scoped or registered
   same-directory temporaries; all reviewed artifacts remain byte-identical.
6. Atomically advances the closed lease checkpoint from `started` to
   `candidates-validated`.
7. Stages the exact 60 paths, validates the complete index path/blob set, and
   advances the checkpoint to `staged`.
8. Creates the exact final evidence commit and advances the checkpoint to
   `committed`, recording its SHA.
9. Runs post-commit validation against committed blobs and the literal Plan E
   base, without relying on ignored files or local `plan-e-base.txt`.
10. Advances the checkpoint to `post-validated`, removes only its own exact
    temporary files and successful producer receipts, removes the lease, then
    releases the mutex last.

The transaction launches no detached/background process. Every child is
foreground and fully terminated before cleanup. Any mismatch or failure leaves
the lease, its exact checkpoint, index/HEAD state, producer receipts, and owned
temporary evidence in place and stops. The outer `finally` releases the mutex
even when retained state blocks cleanup. A blocked-start invocation may inspect
and report exact retained paths/checkpoint while holding the mutex, then releases
it without mutation. Later automation does not adopt, unstage, reset, prune,
force-remove, rewrite HEAD, or delete retained state; recovery requires separate
human authorization and inspection.

## Evidence Rules

- The fixed 58-artifact manifest and exact 60-path final evidence commit remain
  unchanged. This correction spec adds one reviewed-range path, so the reviewed
  product range is exactly 62 paths and the base-to-final union is exactly 122
  paths.
- Original Task 6/7 report hashes remain locked; report paths remain absent.
- Task 6/7 audits prove only current immutable commit state and never historical
  RED/GREEN/mutation/TDD chronology.
- Six surviving historical reports remain byte-exact and are committed in the
  final evidence set.
- Final clean-clone validation relies only on committed bytes and Git history.
- No push, publish, tag, install, release, registry, browser, AppData, real
  update, network, or authenticated model operation is authorized.

## Plan Revision Requirements

Revise `docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md` so:

- no command assumes a mutex, lease, function, variable, handle, or environment
  survives another fenced command or OpenCode tool call;
- RED and implementation commands are independent Git/TDD blocks;
- every verification producer is one independently executable, mutex-owned,
  lease/owner/receipt-bound invocation;
- only the final evidence transaction spans mutex acquisition through release;
- the final transaction performs all final-evidence staging, commit,
  post-validation, receipt cleanup, and owner cleanup itself;
- all existing chronology, audit, review, artifact, and fail-closed gates remain
  intact.

The correction spec and revised plan are separate one-path commits. The revised
plan commit is the direct child of this spec commit. The promotion RED commit is
the direct child of that revised plan commit, and the implementation commit is
the direct child of the RED commit.

## Acceptance Criteria

- No cross-process mutex/lease fiction remains.
- Every fenced command is independently executable or explicitly one complete
  single-invocation transaction.
- Every separate evidence producer has closed crash ownership and a validated
  receipt; retained producer state blocks later automation.
- RED is observed before production code changes.
- Later RED replay is labelled as replay and does not overclaim timing proof.
- Git direct-child and one-path gates protect both code commits.
- Final evidence aggregation is one mutex-owned invocation.
- Final transaction checkpoints make staged/committed failure states explicit
  and fail-stop without automatic index or HEAD rollback.
- Failures never trigger broad or unowned cleanup.
- Existing product behavior and final evidence arithmetic are unchanged.
