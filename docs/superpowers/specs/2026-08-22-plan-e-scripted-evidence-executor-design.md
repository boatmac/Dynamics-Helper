# Plan E Scripted Evidence Executor Design

**Status:** Accepted
**Date:** 2026-08-22
**Authorized during:** Plan E Task 9 executor correction

## Purpose

Replace the large, repeatedly failing PowerShell executor embedded in the Plan E
Markdown plan with a tracked, unit-tested Python CLI. The plan remains the
human-readable contract and sequence; executable receipt, state, retirement,
review-ingestion, report, and finalization behavior lives in normal source code
that can be tested before use.

This design changes only internal Plan E evidence tooling. It does not change
the Windows preparing-promotion retry, Task 6/7 product behavior, historical
report-loss boundary, release contents, or any user/runtime state.

## Authority And Precedence

This accepted design supersedes only the executor/orchestration requirements of
`2026-08-21-plan-e-executor-boundary-correction-design.md`, including its
PowerShell finalizer, direct-child plan subject, and `62/122` path counts. The
new tracked CLI, commit sequence, subject, and `65/125` counts below are the
authority. The earlier design's principles remain in force: no cross-process
state fiction, exact Git/TDD chronology, independently owned producers,
fail-stop retained state, and one final evidence transaction.

The Task 6/7 evidence-loss amendment and Windows preparing-promotion retry
design remain authoritative except where their plan path counts are necessarily
expanded by the three new scripted-executor paths. This design also supersedes
the evidence-loss amendment's orchestration-only rule that every retained lease
must remain permanently unautomatable. The only automated exceptions are the
strict same-token finalizer checkpoint resume and clean terminal `rejected`
review cleanup defined here. Incomplete/malformed producer, owner, worktree, or
unknown retained state still blocks and requires human inspection. Historical
claim boundaries, audit contents, review criteria, and artifact durability from
that amendment are unchanged.

## Files

Create exactly:

```text
plan_e_evidence.py
host/test_plan_e_evidence.py
```

`plan_e_evidence.py` is a root-level internal maintenance CLI, following the
existing `release_helper.py` convention. Its tests live under `host/` so the
documented `python -m unittest discover host` command includes them.

The Host runtime must not import this CLI. It must not appear in PyInstaller
hidden imports, `extension/dist`, `dist/dh_native_host`, or release staging.
`release_helper.py` already stages explicit paths, so no packaging change is
required. Tests lock this exclusion.

The implementation uses only the Python standard library. It resolves the
repository from `Path(__file__).resolve().parent`, never from an ambient current
directory.

## Commit Sequence

The committed sequence is exact and single-parent. This design commit must be a
one-path direct child of
`d237ab2ea7aee73114476b3eb19db620321d349f` with subject
`docs(evidence): define scripted Plan E executor`:

1. This one-path design commit.
2. One-path revised Plan E plan commit with subject
   `docs(update): use scripted Plan E evidence executor`.
3. Two-path executor RED commit with subject
   `test(evidence): define Plan E executor contracts`.
   It contains the full tests plus a compile-only CLI shell. Behavioral tests
   collect and fail assertions; import/collection failure is invalid RED.
4. One-path executor implementation commit with subject
   `feat(evidence): add Plan E evidence executor`.
5. One-path promotion RED commit with the existing subject
   `test(update): cover locked preparing promotion`.
6. One-path promotion implementation commit with the existing subject
   `fix(update): retry locked preparing promotion`.
7. Optional focused review-fix descendants. Each requires a separately accepted
   correction spec before editing, a closed path allowlist and fixed subject,
   test-first RED/GREEN/mutation evidence, and full evidence regeneration. A fix
   may change only existing reviewed-range paths; adding a path requires a new
   path-count amendment before work begins.
8. Exact 60-path final evidence commit with the existing subject
   `docs(verification): record Plan E hardening evidence`.

The executor tests follow RED/GREEN and current mutation proof before the
promotion RED begins.

## Path Arithmetic

At design time, the literal Plan E base-to-current-HEAD range contains 60 unique
paths. The reviewed product/tool head adds exactly five unique paths:

```text
docs/superpowers/specs/2026-08-22-plan-e-scripted-evidence-executor-design.md
plan_e_evidence.py
host/test_plan_e_evidence.py
host/test_update_engine_resume.py
host/update_engine.py
```

Therefore:

- reviewed range: exactly 65 paths;
- final evidence commit: exactly 60 new paths;
- base-to-final union: exactly 125 paths;
- final artifact manifest: unchanged at 58 paths;
- manifest plus report final evidence commit: unchanged at 60 paths.

Every repeated plan inventory and validator uses those exact counts. The root
CLI is added to tested-source roots; `host/test_plan_e_evidence.py` is already
under the tracked Host root.

## CLI Surface

The CLI exposes only fixed subcommands and fixed producer kinds:

```text
preflight
produce --kind <promotion|focused-extension|full-extension|host|static|task-audits|plan-e-review-package|whole-review-package> --reviewed-head <40hex>
ingest-review --kind <plan-e|whole> --reviewed-head <40hex> --session-id <opaque> --input <path>
retire --old-head <40hex> --new-head <40hex>
finalize --reviewed-head <40hex>
verify-final --final-head <40hex>
status
```

No command accepts an arbitrary executable, arbitrary candidate path, arbitrary
Git operation, or arbitrary cleanup root. Producer IDs, commands, cwd values,
candidate paths, schemas, report headings, review grammar, test selectors,
skip rules, and final path inventories are code constants validated by tests.

Every command is one complete foreground process. No Python object, mutex,
environment mutation, handle, or working-directory assumption spans CLI calls.

Every invocation writes exactly one canonical JSON object to stdout and no other
stdout text. It contains `schema_version`, `command`, `status`, `code`, and
closed command-specific fields. Exit codes are fixed:

```text
0 success
2 usage or CLI grammar error
3 blocked retained/incompatible state
4 evidence/test/review validation failure
5 internal execution or I/O failure
```

`preflight` and `status` are read-only and never acquire the mutation mutex,
create directories, or modify Git. `preflight` validates repository identity,
committed chronology, tracked cleanliness, fixed prerequisites, and the absence
of incompatible state. `status` strict-reads known state when present and
reports only fixed classifications and exact authority paths; malformed or
unknown state returns exit 3 without coercing or logging file contents.

Every pre-lease/read-only Git command uses `git --no-optional-locks` and a closed
environment with `GIT_OPTIONAL_LOCKS=0`. Tests snapshot relevant Git metadata,
including the index, and require byte identity after `preflight` and `status`.
Before any worktree-reading pre-lease Git command, direct config-file parsing
must prove `core.fsmonitor` is absent/false and no fsmonitor hook is effective;
otherwise the CLI blocks without invoking `git status`. The CLI never starts or
configures the fsmonitor daemon.

## State Model

Internal pre-final state lives only below the Git common directory:

```text
<git-common>/plan-e-evidence-v1.lease.json
<git-common>/plan-e-evidence-v1/
  heads/<reviewed-head>/<producer-id>/
    owner.json
    candidates/
    receipt.json
  retirements/
  finalizer/
```

Candidate directories are immutable and head-scoped, so a new reviewed head
never overwrites old reviewed bytes. Fixed `.superpowers/sdd/*` artifact paths
are materialized only by `finalize`.

The six surviving historical reports are explicit immutable read-only
exceptions: they already exist at their locked `.superpowers/sdd/task-N-report.md`
paths before finalization. Producers and finalizer may hash and read them but
never write, move, retire, or delete them. Finalization force-adds those exact
bytes.

Canonical JSON is UTF-8 without BOM, sorted keys, compact separators, no CR,
and exactly one final LF. Parsers reject duplicate keys, non-finite values,
unknown/missing keys, bool-as-int, malformed hashes, wrong order/cardinality,
and noncanonical bytes.

Every state path is selected from a closed constant map, resolved under its
fixed authority root, and checked for containment and reparse/symlink hazards.
Receipt-provided strings never become deletion or write authorities.

## Mutual Exclusion And Failure

The fixed lease is a sibling of the state root in the already existing Git
common directory. After acquiring the mutex, a mutating command exclusively
creates and durably rereads that lease as its first filesystem write. Only then
may it create the exact `plan-e-evidence-v1` root or a producer child. A present
root without a compatible succeeded-state inventory, or a present lease, blocks.
This gives every state-root creation a pre-existing lease authority without a
directory-before-lease bootstrap window.

Every mutating command acquires one fixed Windows named mutex through a small
standard-library `ctypes` adapter. Tests inject a fake adapter. An abandoned
mutex, existing incompatible lease, unsupported state entry, partial owner, or
unknown worktree registration blocks before mutation.

A retained finalizer lease has one explicit exception: only `finalize` may
resume it, and only after acquiring a non-abandoned mutex and validating the
exact finalizer kind, token, reviewed head, owner, checkpoint, candidate/index
maps, expected HEAD/ref, and every retained path. No producer, retirement,
ingestion, status, or different finalizer token may adopt it. An abandoned mutex
always blocks even when the lease is otherwise valid.

The command creates a canonical token-bearing lease before its first write and
removes it only after all child processes terminate and owned cleanup succeeds.
Children run with `subprocess.run(..., shell=False)` using absolute executable
paths, exact cwd, and a closed receipt-bound environment. The environment
contains only fixed system variables required for process startup plus
command-specific values. It removes `PYTHONPATH`, `PYTHONHOME`, `NODE_OPTIONS`,
`NPM_CONFIG_*`, unapproved `GIT_*`, `DH_PROMOTION_EVIDENCE`,
`DH_PLAN_C_FROZEN_ONEDIR`, and all `PLAN_E_*` values unless a fixed producer
explicitly supplies a reviewed safe value. Git commands use a fixed validated
system Git executable. Preflight rejects any configured `core.hooksPath`, any
non-sample repository hook, commit signing side effect, credential/helper
invocation, or filter/attributes rule that is effective for any reviewed or
evidence path. Unused global filters, including LFS filters not selected by
attributes, are recorded but do not block. Hook/signing/filter/helper
effectiveness is revalidated immediately before every hook-capable or
ref-mutating Git operation. Git hooks are not bypassed or disabled. Receipts
bind the exact sorted environment and subprocess options. The parent process
environment is never mutated.

Every Host subprocess additionally receives fresh existing disposable
directories for `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and
`TMP` before process start. The CLI verifies containment and deletes those
directories only after the child terminates and its evidence is promoted.

On failure, the command preserves its lease, owner, candidates, worktree
registration, and checkpoint for inspection. Later automation reports exact
retained paths and stops. It never adopts, resets, prunes, force-removes,
unstages, rewrites HEAD, or broadly deletes retained state.

## Producer Receipts

Each producer has one closed definition containing:

- exact producer ID and reviewed-head requirements;
- exact ordered child command records;
- executable, argv, cwd, exit code, stdout/stderr hash, and output path/hash;
- exact source blob map;
- exact candidate relative-path allowlist;
- exact test files, selectors, counts, skip policy, and assertion titles;
- optional exact linked-worktree authority.

Receipts are generated from the same command objects passed to
`subprocess.run`, not descriptive placeholders. Finalization validates each
receipt against the producer definition and independently hashes every
candidate.

Unknown producer IDs, unknown state entries, candidate extras/missing files,
or receipt/path drift block all later producers and finalization.

## Atomic Candidates And Retirement

Candidate bytes are written to token-named files in the candidate directory,
flushed and reread, then published with same-directory `os.link(temp, target)`.
Hard-link creation is atomic and fails if `target` exists; after target
bytes/inode are verified, the temporary link is removed. Unsupported filesystems
or any collision fail closed. `os.replace` is forbidden for immutable candidate
publication. Collision and concurrent-publication tests lock no-clobber
behavior. A fixed artifact path is never written by a producer.

`retire` accepts only one complete dependency closure for `old-head` in which
every expected producer has exactly one closed terminal record whose status is
`succeeded` or `rejected`. Every `succeeded` record has exact candidates; every
`rejected` record has no candidate. It requires no unexpected producer, no
missing dependency, no lease/owner/worktree/temp crash state, and
`old-head` to be an ancestor of `new-head`. It prevalidates the entire state
before mutation, atomically renames the whole old-head directory to one
token-owned quarantine, then attempts deletion only inside that quarantine.
Failure before rename changes nothing. Failure after rename may leave a
partially deleted quarantine; the lease records the quarantine path and cleanup
status, and all later automation blocks. The contract guarantees atomic
authority movement, not atomic recursive deletion. It never deletes
receipt-supplied paths individually.

Retirement operates on a dependency-closed producer subset. A rejected review
or failed downstream producer does not require a succeeded receipt: the CLI may
retire only succeeded upstream candidates whose receipts are exact and whose
dependency closure has no retained crash state, plus exact failed-validation
inputs that never produced a candidate. Any lease/owner/worktree/temp crash
state remains blocked and requires the separately authorized human inspection
path. This permits reviewed-head regeneration after review findings without
weakening crash preservation.

A review validation failure is not a crash. `ingest-review` writes one closed
terminal `rejected` record containing only fixed classifications and input
hashes, promotes no findings candidate, removes its owned temporary/lease state,
and exits 4. Retirement may remove a dependency-closed head containing exact
`succeeded` and `rejected` terminal records; an incomplete record or retained
lease/owner/worktree/temp remains blocking. Subset selection is computed from a
closed producer dependency graph in code, never from receipt-provided paths.

## Linked Worktrees

Only `promotion` and `task-audits` may create detached linked worktrees. Their
closed owner records bind the lease token, producer ID, normalized absolute
path, exact detached head, allowed mutation paths, original blobs, and expected
mutated hashes.

Git porcelain paths and local paths are normalized through `Path.resolve()` and
Windows case-insensitive comparison before use. Immediately before removal, the
CLI verifies exact registration, detached head, restored blobs, and clean
status. After non-force removal it verifies path, registration, and owner
absence. It never runs `git worktree prune` or force-removal. Retained metadata
blocks later automation.

## Fixed Producer Requirements

### Promotion

Replays exact selectors at the immutable RED commit and labels them
`RED commit replay`. It verifies seven assertion failures plus one constructor
pass, then exact GREEN and the five current mutation checks at the reviewed
head. Multiline source mutations operate on normalized text and restore exact
Git blobs. Original RED-before-production execution remains a narrow process
attestation, not cryptographic timing proof.

### Extension And Static

Vitest JSON uses one canonical title field and requires each exact title once.
Focused/full file inventories and count relationships are exact. TypeScript,
build, static scans, diff checks, and tested-source blobs bind the reviewed head.

### Host

The fixed Host command matrix enforces positive test counts and exact skips:
only the frozen staged-probe selector/reason may skip in full/recovery; focused,
update-engine, package, executor, and compile phases have zero skips. The new
executor test module is included in standard Host discovery.

### Task 6/7 Audits

Creates the exact canonical current-state audits before reviews. It preserves
the original unavailable report hashes and proves only current immutable state.
Its linked-worktree mutations are current-state checks, never reconstructed
historical RED/GREEN/mutation/TDD evidence.

### Reviews

Review-package producers bind exact package/diff bytes, base, head, range, and
both audit hashes. `ingest-review` consumes the entire input from byte zero to
EOF under an exact heading grammar; rejects prefix/suffix/duplicate/extra/hidden
sections, controls and bidi/format text; validates exact findings syntax with
file/line where required; and enforces `PASS` versus
`INTERIM PASS THROUGH PLAN E`.

The recorded opaque session IDs remain declarations only and do not prove
identity, dispatch, independence, or absence of collusion.

The two normalized declared session IDs must be non-empty printable ASCII,
contain no control/format/bidi characters, be at most 128 characters, and differ
exactly. Normalization is identity after strict UTF-8 decoding: surrounding
whitespace is rejected, not trimmed; no Unicode normalization or case folding
is performed. Both review records require all five evidence-loss criteria to be
`PASS`, exact empty `Critical` and `Important` sections, and no unmatched text.
The exact empty section body is `None.`.
Any criterion failure or open Critical/Important finding produces no succeeded
candidate and reports `BLOCKED`. Overall dispositions remain exactly `PASS` for
Plan-E-only and `INTERIM PASS THROUGH PLAN E` for whole-branch interim review.

## Finalization

`finalize` is one mutex-owned process with a closed checkpoint lease:

```text
started -> candidates-validated -> staged -> committed -> post-validated
```

It validates the reviewed head, direct commit chronology, clean tracked source,
all selected receipts/candidates, six historical report hashes, Task 6/7 report
absence, two frozen audits, two review findings, and the exact 58-artifact set.
It creates only the manifest and complete final report. The report retains all
required Task 1-5/8 RED/mutation details, Task 6/7 unavailable/current-state
statements, exact Extension/Host totals and skips, compile/build/static/diff
results, complete commit map, audit hashes, both full review summaries, residual
risks, forbidden-operation record, and post-Plan-D rerun requirement.

It materializes selected candidate bytes atomically to fixed artifact paths,
stages exactly 60 paths, records and validates every staged blob, commits with
the fixed subject, then compares every committed blob with the staged map.
Post-commit validation uses committed bytes and literal base only. It validates
the exact 125-path union.

Every non-historical fixed artifact is materialized with the same no-clobber
hard-link publication used for candidates and must be absent beforehand. A
collision blocks without replacement. The six historical reports are the only
pre-existing final paths and are verified byte-exact rather than published.

Before successful cleanup it atomically renames the complete selected head-state
directory to a finalizer quarantine and updates the lease. Deletion failure
leaves quarantine plus checkpoint and blocks. Any failure after staging or
commit preserves the index/HEAD, lease, state, and exact checkpoint; automation
does not roll back. The mutex is released in `finally`.

`finalize` is checkpoint-resumable by the same command. On entry with a retained
finalizer lease, it validates the complete closed lease, token, owner,
checkpoint, candidate hashes, index map, and HEAD before continuing only the
next deterministic transition. It never repeats commit, rewrites an earlier
checkpoint, or infers missing state. Any mismatch returns blocked. A separate
human-authorized recovery path remains available for states that cannot satisfy
automatic resume; it is not implemented as broad cleanup.

Before updating the branch, finalization writes the index/tree, creates the
exact commit object with `git commit-tree`, and records the prospective commit
SHA in the durable `staged` lease. It then performs one compare-and-swap
`git update-ref <branch> <new-sha> <reviewed-head>`. Resume reconciles only the
two exact states: ref still at reviewed head (perform the one update) or ref at
the recorded prospective SHA (advance to `committed`). Any other ref/HEAD/index
state blocks. This removes the commit-success/checkpoint crash ambiguity and
does not invoke or bypass commit hooks; hook absence and signing configuration
were revalidated immediately before object/ref creation.

`verify-final` is read-only and clean-clone runnable. It does not depend on
ignored files, `.superpowers/sdd/.gitignore`, or local `plan-e-base.txt`.

## Test Contract

`host/test_plan_e_evidence.py` uses disposable directories and disposable Git
repositories only. It never touches the real repository state, registry,
AppData, browser, network, releases, or installed product.

Tests cover at least:

- CLI grammar and fixed producer maps;
- canonical JSON adversarial cases;
- path containment, traversal, case/separator normalization, and reparse seams;
- mutex/lease/checkpoint state transitions and abandoned-state blocking;
- real Windows subprocess tests for named-mutex contention, abandonment,
  ownership, release, and handle closure using a unique isolated test name;
- actual command-record binding and explicit child environments;
- atomic candidate promotion and crash retention;
- unknown receipt/state/candidate rejection;
- retirement prevalidation, atomic authority quarantine, and partial-quarantine
  failure reporting;
- exact worktree owner/create/restore/remove lifecycle;
- Vitest title/count uniqueness;
- Host skip identity/reason/count policy;
- review full-text grammar, hidden-prefix/suffix/control/bidi cases;
- audit immutability across review/finalization;
- complete final report headings and required facts;
- exact staged-versus-committed blob comparison;
- fixed-artifact no-clobber collisions and six-report read-only exceptions;
- final cleanup quarantine and checkpoint failures;
- checkpoint resume before/after compare-and-swap ref update and every mismatch;
- fixed exit codes and canonical stdout for every command, including malformed
  and retained-state `preflight`/`status` cases;
- Git hook/signing/filter/helper rejection without bypassing hooks;
- full six-directory Host subprocess isolation and environment receipt binding;
- 58/60/65/125 inventories;
- release/PyInstaller exclusion;
- forbidden network, registry, AppData, browser, install, publish, and real
  update operations.

After GREEN, mutation proof temporarily breaks receipt allowlisting, retirement
prevalidation, candidate atomicity, worktree head validation, review whole-text
coverage, skip policy, and staged/committed blob comparison. Each matching test
must fail before exact restoration.

## Plan Revision

The revised Plan E plan removes the embedded Task 9 PowerShell/Python executor,
keeping only:

- the behavioral/evidence contract;
- exact TDD edit and test commands;
- exact calls to the tracked CLI;
- expected outputs and commit allowlists;
- review dispatch instructions;
- final completion checks.

No fenced command may duplicate receipt, retirement, report, or finalization
implementation. Commands pass literal CLI arguments in one physical command and
do not require external environment injection or prior shell state.

## Acceptance Criteria

- Executor behavior is tracked, reviewable Python with passing unit tests.
- The Markdown plan no longer contains a second executor implementation.
- All known prior runtime defects have regression tests.
- TDD and direct-child commit chronology are preserved and extended to the CLI.
- Windows retry behavior remains unchanged.
- Task 6/7 historical evidence is not fabricated.
- Final evidence remains 58 artifacts in an exact 60-path commit.
- Reviewed/final ranges are exactly 65/125.
- Clean-clone final verification uses committed evidence only.
- No real user, runtime, release, network, registry, browser, AppData, install,
  publish, or update state is touched by executor tests.
