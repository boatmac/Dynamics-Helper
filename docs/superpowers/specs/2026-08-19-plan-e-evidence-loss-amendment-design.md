# Plan E Evidence-Loss Amendment Design

> **Partial supersession:** Task 9 evidence orchestration below was replaced by
> `2026-08-24-plan-e-task-9-evidence-correction-design.md`. Do not recreate its
> executor, receipts, or missing historical reports. Other implemented product
> requirements remain intact. Current entry: `docs/session-handoff-2026-07-15.md`.

**Status:** Accepted
**Date:** 2026-08-19
**Authorized during:** Plan E recovery before Task 9

## 1. Purpose

Permit Plan E final verification to continue after the exact accepted Task 6
and Task 7 narrative reports became unrecoverable, without fabricating those
reports or claiming to reconstruct their historical TDD chronology.

This amendment is evidence-only. It does not change Task 6 or Task 7 product
behavior, tests, commits, or accepted historical report identities. It replaces
two unavailable ignored artifacts with durable, reproducible current-state
audits whose narrower claim boundary is explicit and machine-validated.

## 2. Incident Boundary

The accepted historical report identities remain:

```text
Task 6: 3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef
Task 7: 49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f
```

The local recovery investigation found historical observations of both locked
hashes, but neither report was tracked by Git and neither exact file is present
in the recovered checkout. The available historical reads, recovery data, Git
objects, bundles, rescued workspaces, and filesystem evidence examined by that
investigation did not yield one complete version matching either accepted
hash. This amendment does not depend on a claimed deletion time or assign the
loss to a particular migration, handoff, or recovery operation.

The missing files are internal engineering evidence, not application data.
Task 6 and Task 7 implementation and test commits remain reachable. No user
configuration, Chrome storage, prompt file, case data, installed product file,
authentication state, or release artifact is affected by this amendment.

When present, the recovery record remains diagnostic evidence at exact SHA-256
`0c2905ea665ee190cd9725c63385e402dcdf490e71154097b2285fd674d1266f`:

```text
.superpowers/sdd/2026-07-18-hardening-e-extension-data/task-report-recovery.md
```

It must match that hash before it is cited, and it must not be promoted into a
substitute historical report. The final completion gate relies on the locked
historical hashes, report-path absence, committed lineage, and replacement
audits rather than on continued availability of this ignored diagnostic file.

## 3. Authority And Precedence

This accepted amendment narrowly supersedes requirements that make exact Task
6 and Task 7 report bytes the only possible Plan E completion evidence. In
particular, it narrows the application of:

- `docs/superpowers/specs/2026-07-24-plan-e-boundary-correction-design.md`
  section 7 and section 10's criterion
  `Every production behavior has valid test-first RED evidence`;
- the Plan E Task 9 historical-report preflight and final artifact inventories;
- any whole-branch evidence rule that requires the unavailable narrative files
  to prove the Task 6 or Task 7 historical RED/TDD sequence.

All other evidence, chronology, test-first, mutation, commit-scope, and
fail-closed requirements remain unchanged. This amendment does not establish
that historical TDD did not occur. It establishes only that the two missing
reports can no longer prove when it occurred.

If either exact historical report is later recovered and matches its locked
SHA-256, execution stops before combining it with substitute evidence. The Plan
E evidence contract must then be revised to restore the exact report as the
authority for that task.

## 4. Replacement Evidence

Create and commit these two files at final evidence time:

```text
.superpowers/sdd/task-6-audit-evidence.json
.superpowers/sdd/task-7-audit-evidence.json
```

They replace the unavailable Task 6 and Task 7 report slots in the fixed
58-artifact manifest inventory. The manifest inventories neither itself nor
the final report. Its inventory remains:

```text
24 fixed final-verification artifacts
6 recovered exact historical Task reports
2 durable current-state audit JSON files
26 promotion transcript leaves
58 total artifacts
```

The original Task 6 and Task 7 report paths must remain absent. The audit files
must be force-added despite `.superpowers/sdd/.gitignore`, together with the
two review findings files and final Plan E report. The findings already occupy
two of the 24 fixed manifest slots, so committing them does not change the 58
count. Leaving audits or findings only as ignored working-tree files is
forbidden because it would repeat the original evidence-loss mechanism.

## 5. Audit Claim Boundary

Each audit proves only the following at one recorded immutable reviewed head:

1. The recorded implementation lineage, commits, trees, parents, subjects,
   paths, and blobs agree with Git.
2. The current committed implementation passes the task's focused tests and
   required named assertions.
3. The recorded current-state mutations are caught in a disposable detached
   worktree and the original committed blobs are restored afterward.
4. The referenced reviewed-head machine evidence exists and matches its
   recorded SHA-256.
5. The final evidence set records two review records that declare different
   orchestration session identifiers and inspect the audit and relevant
   implementation.

An audit must not claim or imply that it recovered, recreated, replayed, or
proved:

- the missing historical report bytes;
- the historical RED output;
- the historical GREEN output;
- the historical mutation output;
- test-before-production edit ordering; or
- the original reviewer timeline.

The exact scope string is:

```text
current_immutable_commit_state_only
```

Both historical reconstruction booleans are exactly `false`.

## 6. Canonical Audit Schema

Both audit files use schema version 1 and the same exact top-level shape:

```json
{
  "audit_subject": {
    "commit": "<40-lowercase-hex>",
    "plan_blob": "<40-lowercase-hex>",
    "source_path_blobs": {
      "<repository-relative-path>": "<40-lowercase-hex-or-null>"
    },
    "tree": "<40-lowercase-hex>"
  },
  "claim_boundary": {
    "historical_report_reconstructed": false,
    "historical_tdd_timeline_reconstructed": false,
    "scope": "current_immutable_commit_state_only"
  },
  "evidence_kind": "plan_e_task_current_state_audit",
  "historical_report": {
    "availability": "unrecoverable",
    "expected_sha256": "<64-lowercase-hex>",
    "path": ".superpowers/sdd/task-N-report.md"
  },
  "implementation_lineage": {
    "base_commit": "<40-lowercase-hex>",
    "commits": [
      {
        "commit": "<40-lowercase-hex>",
        "parent": "<40-lowercase-hex>",
        "subject": "<exact-git-subject>",
        "tree": "<40-lowercase-hex>"
      }
    ],
    "declared_paths": ["<sorted-repository-relative-path>"],
    "diff_numstat": [
      {
        "added": 0,
        "deleted": 0,
        "path": "<repository-relative-path>"
      }
    ],
    "head_commit": "<40-lowercase-hex>",
    "head_path_blobs": {
      "<repository-relative-path>": "<40-lowercase-hex-or-null>"
    },
    "head_tree": "<40-lowercase-hex>",
    "range": "<base-commit>..<head-commit>",
    "related_commits": [
      {
        "after_blobs": {
          "<repository-relative-path>": "<40-lowercase-hex-or-null>"
        },
        "before_blobs": {
          "<repository-relative-path>": "<40-lowercase-hex-or-null>"
        },
        "commit": "<40-lowercase-hex>",
        "diff_numstat": [
          {
            "added": 0,
            "deleted": 0,
            "path": "<repository-relative-path>"
          }
        ],
        "parent": "<40-lowercase-hex>",
        "paths": ["<sorted-repository-relative-path>"],
        "subject": "<exact-git-subject>",
        "tree": "<40-lowercase-hex>"
      }
    ]
  },
  "required_independent_reviews": [
    "plan_e_only",
    "original_whole_branch_interim"
  ],
  "schema_version": 1,
  "task_number": 6,
  "verification": {
    "checks": [
      {
        "argv": ["<exact-argument>"],
        "cwd": "<repository-relative-directory>",
        "evidence_path": "<repository-relative-evidence-path>",
        "evidence_sha256": "<64-lowercase-hex>",
        "exit_code": 0,
        "id": "<locked-check-id>",
        "required_assertions": ["<exact-test-title>"],
        "required_files": ["<sorted-repository-relative-test-path>"],
        "result": "passed"
      }
    ],
    "current_mutations": [
      {
        "before_blob": "<40-lowercase-hex>",
        "failed_assertions": ["<exact-test-title>"],
        "failure_kind": "assertion_failure",
        "id": "<locked-mutation-id>",
        "mutated_sha256": "<64-lowercase-hex>",
        "observed_exit_code": 1,
        "restored_blob": "<same-40-lowercase-hex>",
        "restored_exit_code": 0,
        "result": "current_state_mutation_caught",
        "source_path": "<repository-relative-source-path>",
        "test_argv": ["<exact-argument>"],
        "test_title": "<exact-test-title>",
        "transformation": "<locked-transformation-id>"
      }
    ],
    "machine_evidence": {
      "focused_extension_results_sha256": "<64-lowercase-hex>",
      "host_test_results_sha256": null,
      "reviewed_head_verification_sha256": "<64-lowercase-hex>"
    }
  }
}
```

Task 7 uses `task_number: 7` and a non-null
`host_test_results_sha256`. Task 6 has an empty `related_commits` array. Task 7
has the one exact related cleanup record defined below. Every nested object and
check/mutation record is closed: the revised Plan E plan must define its exact
keys, enum values, order, and cardinality and reject missing or additional
keys. `required_files` is sorted bytewise; command arguments, assertions,
checks, mutations, commits, and related commits use the locked order declared
by the plan.

For this schema, `availability: "unrecoverable"` means only "not recovered
from the sources enumerated and examined by the accepted recovery investigation
as of audit generation." It does not claim that recovery from a previously
unknown source is logically impossible. Section 3's later-recovery stop rule
remains mandatory.

## 7. Immutable Task Lineage

The audit generator and validator bind these task-specific constants:

| Field | Task 6 | Task 7 |
|---|---|---|
| Historical report SHA-256 | `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef` | `49ee4fb0a4717f85767ed19caf5338eac1871b21deed2233d82d97337d32df2f` |
| Base commit | `ba34fb05719adeb8e5501827dc7a7398b8041aec` | `44fdea3e6b60fd975dc150436e08ba048a744c8c` |
| Task head commit | `44fdea3e6b60fd975dc150436e08ba048a744c8c` | `1ad75ea3891513db12a41b48ae5ccf35f32250ab` |
| Task head tree | `6feb60db2767d35a7886ac32b805c12174ff683f` | `541caa656ccce0c3e8b2acc896269337ceecd995` |
| Core commit count | 9 | 3 |
| Declared path count | 7 | 14 |

Each core range is exactly `(base_commit, head_commit]`, written as
`base_commit..head_commit`. It is a direct, single-parent chain. The revised
plan locks the ordered commit IDs, parents, trees, and subjects returned by Git,
plus the exact sorted name-status path set, exact numstat rows, and head blobs
for every declared path. A deleted path has a `null` head blob. No merge commit,
additional commit, path, or row is accepted.

Task 7's later commit `e163eb28492b32b3cf743b6700eebd0bda7504cb`
has parent `1ad75ea3891513db12a41b48ae5ccf35f32250ab`, tree
`0547bddb2968d3fd9d160a58d7ce74a67ad8b90c`, and exact subject
`test(fab): remove stale Root mock`. It changed only
`extension/src/components/FAB.pageIdentity.test.tsx`, with exact numstat
`0 1`, from blob `95476baad531c6c8a9e9e5022f1440d49a2e299c` to blob
`7eed2e5a8ad30ea30c9ecd51b33bfe32293979dd`. Record this in Task 7's
one-element `related_commits` array. Do not add it to the exact Task 7 core
range or the 14-path Task 7 allowlist.

The audit subject itself is the final reviewed product head, not the historical
task head. Its source blobs prove how the task's declared paths exist at the
reviewed head, while `implementation_lineage` separately proves the historical
task range without inventing report prose.

## 8. Canonical Encoding And Validation

Audit bytes are canonical JSON:

- UTF-8 without BOM;
- sorted object keys;
- compact separators;
- no CR characters;
- exactly one final LF;
- no duplicate keys or non-finite numbers.

The validator rejects unknown or missing keys, booleans where an integer is
required, negative counters, noncanonical path order, uppercase hashes,
malformed Git object IDs, malformed SHA-256 values, and noncanonical bytes.

The validator independently recomputes and checks:

1. Historical report path absence and locked hash declaration.
2. Every commit's parent, tree, exact subject, ancestry, range paths, numstat,
   and relevant blobs from Git.
3. `audit_subject.commit` equality with the reviewed head in
   `reviewed-head-verification.json`.
4. The Plan E plan blob and every source-path blob at the reviewed head.
5. Every referenced machine-evidence file hash.
6. Exact focused-test file inventories, positive suite/test/assertion counts,
   zero failures, and required named test assertions.
7. Exact current-state mutation names, expected failing selectors, restoration
   blobs, and successful post-restoration reruns.
8. Two review records with different declared orchestration session identifiers
   whose exact bytes, hashes, dispositions, and audit bindings are persisted in
   the final evidence commit and summarized by the committed report.

Any mismatch leaves Task 9 blocked. Narrative prose cannot override a failed
machine check.

## 9. Current-State Verification

At the recorded reviewed head, Task 6 reruns:

```text
extension/src/utils/pageIdentity.test.ts
extension/src/components/FAB.pageIdentity.test.tsx
extension/src/components/FAB.spinner.test.tsx
extension/src/hooks/useAnalysisHydration.test.ts
```

Its named assertions include:

```text
switches identity from A to B while Analyze is busy
contains throwing identity accessors
replaces a user-edited A textarea with B after busy Analyze completes
clears A hydration while deferred B hydration is pending
```

Task 7 reruns:

```text
extension/src/utils/analyzeRequest.test.ts
extension/src/background/contextMenu.test.ts
extension/src/components/FAB.analyzeRequest.test.tsx
extension/src/components/FAB.spinner.test.tsx
extension/src/components/FAB.promptSourceErrors.test.tsx
extension/src/components/FAB.userPrompt.test.tsx
extension/src/components/FAB.bookmarkTelemetry.test.tsx
host.test_session_workspace
host.test_prompt_session
```

Its named Extension assertion includes:

```text
applies an explicit empty Root to exactly one request
```

Its exact named Host assertions are:

```text
TestSessionIdentityLifecycle.test_explicit_empty_analyze_root_overrides_config_for_one_request
TestSessionIdentityLifecycle.test_request_after_explicit_empty_without_marker_uses_configured_root
TestSessionIdentityLifecycle.test_malformed_explicit_marker_uses_legacy_fallback
TestSessionIdentityLifecycle.test_explicit_marker_with_non_string_root_uses_legacy_fallback
```

Both audits also bind the reviewed-head TypeScript result. Task 7 binds the
fresh isolated Host result. These executions are labelled current-state checks,
never historical GREEN reruns.

## 10. Current-State Mutation Evidence

Mutations run only in a disposable detached worktree created from the recorded
audit subject. They must not modify the primary Plan E checkout.

Task 6 proves the current tests catch:

1. Disabling busy identity scanning.
2. Replacing descriptor-safe identity parsing with a direct accessor read.

Task 7 proves the current tests catch:

1. Treating explicit empty Root as absent/truthy-only.

Each mutation record includes the exact source path, before blob, deterministic
mutation identity and transformation, test selector, exact assertion-failure
title, observed exit code `1`, restored blob, and passing post-restoration exit
code `0`. The revised plan locks the exact argv arrays and requires the expected
title to be collected once and fail an assertion attributable to the mutation.
Arbitrary compile, import, setup, zero-match, timeout, signal, or unrelated
failures are rejected.

These records are named `current_state_mutation_caught`. They are not historical
mutation evidence and cannot satisfy a claim about original implementation
chronology.

## 11. Independent Reviews

After both audit JSON files are generated and frozen, dispatch two fresh review
sessions and create two review records that declare the different orchestration
session identifiers returned to the controller:

1. `plan_e_only` reviews the Plan E integration range, both audits, exact
   current-state tests, and the evidence-loss claim boundary.
2. `original_whole_branch_interim` independently reviews the original-base
   whole-branch range and both audits. It must not copy the Plan-E-only
   findings.

Each findings record contains a `Review Session` heading whose next line is one
non-empty opaque orchestration session identifier observed by the controller.
The two declared identifiers must differ. The committed records prove only that
two different identifiers were declared; they do not independently prove who
performed a review, that dispatch occurred, reviewer independence, or absence
of collusion. Those remain process requirements, not cryptographic claims.
Each record also contains the exact SHA-256 of both audit JSON files and an
explicit `PASS|FAIL` decision for:

- historical-report availability honesty;
- no reconstructed historical TDD claim;
- Git lineage and source-blob accuracy;
- current-state test and mutation sufficiency;
- artifact-durability contract adequacy and prospective 58-path inventory
  composition.

The reviews do not claim that the later evidence commit already exists or is
durable. Actual 60-path commit content, manifest correctness, and clean-clone
reproducibility are separate post-commit gates and cannot be satisfied by a
reviewer's prospective statement.

A review fix that changes product, test, plan, audit input, or reviewed head
invalidates both audits and both reviews. Regenerate from the new immutable head
and repeat both reviews.

The exact overall disposition enum is `PASS` for `plan_e_only` and
`INTERIM PASS THROUGH PLAN E` for `original_whole_branch_interim`; `BLOCKED` is
required when any criterion is `FAIL` or any Critical/Important finding remains.
The interim disposition must never be represented as final whole-branch review
completion.

Both findings files are force-added to the final evidence commit. The final
committed report additionally records, for each review, its kind, opaque
declared review-session identifier, review base, review head, review range, findings-file
SHA-256, both bound audit SHA-256 values, disposition, and zero open
Critical/Important findings. The final-report validator recomputes those values
from the exact staged findings files. The findings bytes and report summary are
therefore durable, while the audits do not circularly contain later review
outcomes.

## 12. Final Evidence Commit And Report Contract

The final Plan E report includes exactly these forms for each affected task:

```text
**Task 6 historical report expected SHA-256:** `3158a5795b768434e069e8ef59e488e0a9ff877939728f69d9293ab0c8b9c8ef`
**Task 6 historical report availability:** `UNRECOVERABLE`
**Task 6 audit scope:** `CURRENT IMMUTABLE COMMIT/STATE ONLY; HISTORICAL TDD TIMELINE NOT RECONSTRUCTED`
**Task 6 audit evidence SHA-256:** `<actual audit hash>`
```

Task 7 uses its own locked report hash and actual audit hash. The report must
not contain a Task 6 or Task 7 statement that historical RED, GREEN, mutation,
or TDD chronology was reproduced.

The final evidence commit contains exactly the complete 58-path canonical
artifact manifest inventory, the manifest file itself, and the final report: 60
paths total. The 58 paths are the exact sorted set defined in section 4,
including both audits, both findings files, six surviving historical reports,
all machine results, scripts, maps, ledgers, and 26 transcript leaves. The two
additional paths are:

```text
.superpowers/sdd/plan-e-extension-hardening-report.md
.superpowers/sdd/final-artifacts.sha256.json
```

All 60 paths are force-added and verified as the complete staged set before
commit. The manifest maps the exact 58 artifact paths to SHA-256 and is itself
canonical JSON. The report's manifest, audit, findings, and machine-evidence
hashes are computed from the exact staged blobs. A clean clone of the evidence
commit must therefore contain every byte needed to rerun the final validators;
no completion claim depends on ignored-only working-tree evidence.

Ignore checks apply only before commit, when the artifacts are intentionally
untracked. Post-commit and clean-clone validation must not require
`git check-ignore`, the ignored `.superpowers/sdd/.gitignore`, or local
`plan-e-base.txt`. It reads the literal integration base
`0dbb4852931b50153fb898b03129ae0092c46404` from the committed report and
validator contract, verifies that commit is an ancestor, and validates only
committed blobs plus Git history. The revised plan replaces every post-commit
ignore/base-file check accordingly while retaining pre-commit local safety
checks.

The final evidence commit is the one permitted head change after review. It has
exact subject `docs(verification): record Plan E hardening evidence`, exactly
one parent, and that parent equals both audit subjects and both review heads.
Its exact path set is the 60 paths above. After that commit, any further head
change invalidates final readiness. Final validation recomputes the committed
manifest and every listed artifact, then requires each committed audit,
findings, machine result, and report attestation to match.

## 13. Plan Revision Requirements

Before Task 9 product/test work begins, revise and commit
`docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md` alone. The
revision must:

1. Add this spec to planning authority and integration-range inventories.
2. Replace only Task 6/7 report requirements with the two canonical audits.
3. Preserve all eight original expected report hashes.
4. Define exact closed audit schemas, generators, validators, test commands,
   mutation commands, cleanup, and independent-review contracts.
5. Keep the final managed artifact count at 58 through slot replacement.
6. Change the final evidence commit allowlist from one path to exactly the 58
   manifest artifacts plus the manifest and report: 60 paths.
7. Update Task 9's planning-commit preflight so this spec commit and the new
   one-path plan commit are both immutable HEAD ancestors.
8. Supersede only the Windows retry design's 60-path integration count with
   exactly 61 paths: the prior 60 plus this evidence-loss amendment spec. The
   final evidence artifact count remains separately fixed at 58.
9. Require exact planning chronology: this spec is committed alone with subject
   `docs(evidence): define Plan E report-loss boundary`; the revised plan is its
   direct one-path child with subject
   `docs(update): integrate Plan E evidence-loss audit`; the promotion RED test
   commit is the plan commit's direct child; and the promotion implementation
   commit is the RED commit's direct child. Later controller-fix commits, if
   required, follow the existing review-fix flow and force audit/review
   regeneration.
10. Preserve the authorized Windows promotion retry TDD sequence and all other
   fail-closed Task 9 gates.

The revised plan defines safe regeneration before creating either audit.
Normal execution first acquires one fixed OS mutex and holds it continuously
through final verification and release. Its plan-locked name derives from
canonical repository identity, not mutable current-directory text. No reset,
lease operation, child launch, temporary write, worktree operation, or cleanup
occurs outside mutex ownership. An abandoned-mutex result or pre-existing lease
always stops with a fixed diagnostic; execution does not adopt or clean stale
state. This serializes normal runs without requiring destructive crash
recovery.

After acquiring the mutex, a normal run creates a fixed run-lease path outside
all artifact and worktree reset inventories through exclusive creation. Its
closed canonical record contains a random 128-bit lowercase hex token, reviewed
head, current PID, and current process creation timestamp in UTC ticks. If the
lease already exists, normal execution stops; it never steals or deletes it.
Every reset, temporary creation, audit promotion, and mutation worktree
operation rereads and matches that token. Normal release removes the lease only
after all owned temporary/worktree cleanup succeeds and exact primary-checkout
validation passes, then releases the mutex last. Specifically:

- include both audit paths in the mutable-current-run reset inventory, but
  exclude the run lease, token-scoped temporary root, mutation worktree roots,
  and all owner records from generic deletion;
- refuse reset when an audit or temporary is tracked or staged;
- create each canonical audit through a same-directory temporary whose exact
  name includes the lease token, using exclusive creation, flush, strict
  reread, and no-overwrite promotion;
- create mutation worktrees only under the approved temporary root, at the
  recorded audit subject, and reject symlink/reparse paths;
- restore all saved process environment values in `finally`;
- remove the detached worktree and its Git registration in `finally`;
- verify the primary checkout's exact status, HEAD, and affected source blobs
  are unchanged after every mutation, including failure paths.

Before creating a mutation worktree, inspect the fixed worktree path and exact
`git worktree list --porcelain` registration. If either already exists, stop for
explicit operator inspection; never adopt, clean, reset, or remove a worktree
not created by the current run. The current run creates an exclusive owner
record through no-overwrite atomic promotion before `git worktree add`. The
owner record contains the run-lease token, reviewed head, fixed worktree path,
mutation ID, allowed source path, before blob, and expected mutated SHA-256.
Normal cleanup removes only a path whose owner record still contains that exact
token, whose registration resolves to that exact path, whose detached HEAD
equals the recorded audit subject, and whose status is completely clean after
restoration. Cleanup uses exact-path `git worktree remove`, removes the owner
record only afterward, and verifies path, registration, and owner-record
absence; it never runs broad `git worktree prune`. A mismatch or failed cleanup
blocks audit promotion and final readiness for explicit operator inspection.

Every other temporary path is under one token-scoped temporary directory whose
exact parent and child-name allowlist are locked by the plan. Its closed
canonical owner record contains exactly the lease token, reviewed head,
canonical repository path, temporary-root path, and sorted allowed relative
paths. Same-directory audit promotion temporaries are the only exception; their
token-bearing exact names are also listed in the lease record. A temporary
outside the root, an unlisted child, reparse point, or token/path mismatch stops
cleanup. Recovery never infers ownership from an arbitrary filename.

All external Git, Node, npm, Python, TypeScript, test, and mutation writers used
by the evidence run are launched synchronously by the mutex/lease owner. The
controller retains every process handle, records fixed command identity before
launch, and waits for termination before validating or deleting any path the
writer could access. Normal cleanup begins only after every launched writer has
terminated and its handle has been closed. Direct background/detached writer
launch is forbidden.

There is deliberately no scripted stale-run cleanup. If the controller exits
before normal release, the retained lease, token-scoped temporary paths,
worktree owner record, and any worktree registration remain diagnostic evidence.
Every later run stops before mutation and reports their exact paths. It never
deletes, resets, prunes, adopts, or force-removes them, even when the recorded
PID appears dead. Recovery requires separate explicit human authorization and
inspection outside this Plan E executor, after confirming all possible writers
have terminated; defining or running such a recovery tool is out of scope.

On the normal path only, the still-running controller may clean resources whose
closed records match its live lease token and whose child process handles have
all terminated. It first restores and verifies the mutation worktree as clean
at the reviewed head, removes that exact registered worktree without `--force`,
removes its owner record, removes its exact token-scoped temporaries, revalidates
the primary checkout, removes the lease, and releases the mutex last. Any
mismatch stops cleanup and leaves evidence for operator inspection.

No Host or Extension path may be edited until the revised plan is committed,
clean, and reviewed.

## 14. Out Of Scope

- Reconstructing or approximating either missing narrative report.
- Claiming historical test-first chronology from current code and tests.
- Changing Task 6 or Task 7 product behavior.
- Changing the Windows promotion retry design.
- Changing Plan D, release, installer, registry, package, version, dependency,
  AppData, browser, or authenticated-service state.
- Deleting recovery databases, bundles, logs, legacy repositories, or partial
  historical evidence.
- Publishing, tagging, pushing, installing, or running a real update.

## 15. Acceptance Criteria

- Both locked historical report hashes remain verbatim and are labelled
  unrecoverable.
- Neither missing historical report is synthesized or represented as present.
- Two canonical audit JSON files prove only current immutable commit state.
- Audit generation and mutations run against an immutable reviewed head in
  disposable isolated locations.
- Every lineage, blob, test, mutation, and machine-evidence claim is
  independently recomputed by strict validators.
- Two review records with different declared orchestration session IDs bind the
  exact audit hashes. Their committed bytes and report summary preserve the
  declared IDs, findings hashes, ranges, heads, dispositions, and audit
  bindings without claiming to prove reviewer identity, independent dispatch,
  or absence of collusion.
- The fixed final artifact inventory remains exactly 58 entries.
- The Plan E integration range from `plan-e-base.txt` through the reviewed
  product head is exactly 61 paths after adding this spec. The exact 60-path
  evidence child adds 60 previously absent paths, making the
  base-to-final-head range 121 paths; this does not alter the separate
  58-artifact manifest inventory.
- The complete 58-artifact inventory, its manifest, and the final report are
  committed despite the ignore rule, preventing another ignored-only evidence
  loss and allowing clean-clone validation.
- The only permitted post-review head change is the exact 60-path evidence
  child of the reviewed audit subject. Any other later head change, mismatch,
  failed test, failed mutation, failed review, or recovered exact report stops
  execution for explicit contract revision.
- Task 9 may proceed to the authorized Windows retry TDD only after the revised
  Plan E plan is committed, reviewed, and clean.
