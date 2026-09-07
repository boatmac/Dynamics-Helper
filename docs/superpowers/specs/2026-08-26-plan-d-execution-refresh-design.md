# Plan D Execution Refresh Design

> **Historical Plan D architecture:** The September 1 reliable-auto-update
> design supersedes this execution model, including its C-D0/registration and
> exact-blob workflow requirements. Retain prerequisite provenance, not an active
> task list. This notice does not authorize changing branch/PR topology or remove
> implemented recovery guarantees. Current entry: `docs/session-handoff-2026-07-15.md`.

## Purpose

Refresh the approved Plan D runtime/installer plan against the reviewed A/B/C/E
implementation at `f60911ed6c9eee45aff5f478d4d43f43e180c905` before any Plan D
production task begins. The existing Plan D document predates Plan E's exact
transport lease/final-wire contract and contains stale path, evidence, and
finalization assumptions. This design corrects the execution authority without
replacing Plan D's 14-task architecture.

## Branch And Review Model

- Freeze `docs/prompt-scope-cleanup-design` and Draft PR #1 at
  `f60911ed6c9eee45aff5f478d4d43f43e180c905`.
- Execute this design and Plan D on child branch
  `hardening/plan-d-runtime-installer`.
- The child Draft PR targets `docs/prompt-scope-cleanup-design`, not `master`.
- Plan D remains dependent on A/B/C/E. The child branch must not be retargeted to
  `master` while the parent PR is unmerged.
- Creating the child branch, committing this approved design, pushing that child,
  and opening its stacked Draft PR are actions authorized by the user's explicit
  branch-strategy and design approvals in the execution session. This document
  does not independently authorize any Git or GitHub mutation.
- No parent-branch fast-forward, merge, PR retarget, or `master` merge occurs
  without separate user approval after Plan D and the final whole-branch review
  pass.

## Frozen Prerequisite Authority

The revised Plan D preflight pins and verifies these committed ancestors:

- Plan A evidence: `00fff06741f3c8a575fd3c6eba45c4d7cd1b1a62`.
- Plan B evidence: `07099ab6b892808a468cd1d1ca70ba3726a74439`.
- Plan C product/evidence: `f71ff334eb93c5c0cf0eb04acac7a1951ad1a5da`
  and `0dbb4852931b50153fb898b03129ae0092c46404`.
- Plan E reviewed product/evidence: `de63ef48f68940749018cbf48a11ee154b5e9ff8`
  and `a0fcf618e4c0d6e3e7693207df47cf5c7d0982b0`.
- Public-default merge and post-merge evidence:
  `cac76cb95743f3bb1ab810b8030db8a1953d0e7d` and
  `f60911ed6c9eee45aff5f478d4d43f43e180c905`.

The Plan C report's historical
`PLAN_C_POST_EVIDENCE_NO_DRIFT_STATUS=PENDING` remains an immutable historical
statement. It is superseded for Plan D entry by the committed Plan E ancestry,
Plan E evidence, post-master verification, and fresh Plan D preflight; the
historical report is not edited retroactively.

The revised preflight must validate all of Plan C's frozen evidence, not only
one marker: `PLAN_C_FROZEN_GATE_STATUS=PASS`, PyInstaller `6.18.0`, exact onedir
inventory `73` internal files and `10` internal directories, module graph
`15/15`, and exact selector
`host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation`
with exit `0`, `Ran 1 test`, `OK`, and no skip.

## Plan Revision Scope

Before Task 1, revise
`docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md` in place:

1. Replace the obsolete temporary worktree path with
   `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec` and require the
   child branch/base above.
2. Replace the obsolete implementation-prerequisite blocker. A/B/C/E and the
   historical Plan C frozen gate are complete; current execution remains
   blocked until this design amendment is committed, the revised plan and its
   exact-blob review are committed, C-D0 product/review/evidence commits pass,
   exact local PyInstaller `6.18.0` is separately authorized and verified, and
   the C-D0 evidence HEAD is captured as the Plan D base.
3. Remove the false claim that Plan B's public transaction-ID generator is
   missing. `generate_transaction_id` already exists and remains the sole Python
   generator consumed by the installer.
4. Add exact prerequisite commit/report checks and the complete frozen-evidence
   checks above.
5. Refresh interface signatures against current source instead of preserving
   stale return annotations or constructor requirements.
6. Add the Plan E Native wire contract to the interface ledger, file map, task
   steps, tests, static scans, and final gates.
7. Add the current Plan C finalization cursor/ack-slot contract and complete
   terminal-version matrix.
8. Preserve the tracked public-default-menu build/test/hash contract in every
   Extension build and release gate.
9. Capture `.superpowers/sdd/plan-d-base.txt` only after the revised plan/review
   commit and all C-D0 product/review/evidence commits are complete. The captured
   SHA is the C-D0 evidence HEAD. The final whole-branch review base remains
   `0040b1de1bc196b203014a8e4f94a53babb7e9aa`.

The revision does not renumber or wholesale-replace the architecture of the 14
implementation tasks. It makes the minimum necessary edits to their interfaces,
steps, tests, static scans, and final gates so stale assumptions become
executable contracts.

## Analyze And Native Wire Contract

Plan D preserves Plan E's exact order:

1. `handleAnalyzeRequest` parses and constructs one frozen sanitized
   `AnalyzeNativeAction`.
2. `acquireAuthorizedTransport` acquires one main Native port lease and gates
   that same lease.
3. The Analyze bridge records persistence start.
4. The returned transport sends on that exact lease without reconnect or
   reacquisition.

Invalid Analyze metadata opens no port. A denied gate records no persistence
start. Disconnect rejects without authorizing another port under the old gate.
Main-suppressed coordinator state returns its existing fixed typed denial through
the provider without opening a port. Raw gate, integrity, transport, exception,
or Host values never enter an Analyze denial response.

Gate failure maps only to these exact fixed response tuples:

- `host_protocol_incompatible` / `Dynamics Helper Host is incompatible. Retry the update or run the manual installer.`
- `installation_integrity_failed` / `Dynamics Helper installation is incomplete. Retry the update or run the manual installer.`
- `host_unavailable` / `Dynamics Helper Host is unavailable. Run the manual installer if retry does not recover it.`

The parser-owned Analyze action retains identity through acquisition and the
transport call. The object posted to Chrome Native Messaging does not retain
top-level identity: `postNativeMessageWire` descriptor-copies allowed data into
a new frozen final wire object, registers before posting, creates at most one
request ID, installs inert non-enumerable `toJSON`, and unregisters exactly once
when posting fails.

Non-Analyze input first passes `guardNonAnalyzeNativeMessage`. Lease acquisition
receives only `guarded.forwarded`; inherited/source identity is irrelevant and
must not be asserted. Its final post uses the same `postNativeMessageWire`
contract. Plan D adds no alternate spread, `Object.assign`, direct request-ID
augmentation, or second pending-map cleanup path.

## Finalization Contract

- `FINALIZATION_CURSOR_STATES` is exactly
  `frozenset({"reserved", "receipt-ready"})`.
- Browser `UPDATE_START`, Host `UpdateService.prepare`, and synchronous
  `run_install_package` when authoritative active state is absent call
  `require_no_pending_finalization(install_root)` before ID generation, runtime
  persistence, URL validation, package open/preparation, Plan B workspace/active
  creation, recovery setup, or any other new-update side effect. Resume of the
  matching existing terminal authority remains allowed so it can finish
  finalization/acknowledgment.
- Coordinator readiness and Host preparation both use the same canonical
  `install_root` through two Host-owned operation-mutex scopes. The readiness RPC
  acquires/releases once, reconciles pending browser finalization, and returns
  before TypeScript allocates an ID or persists runtime state. `UpdateService.prepare`
  independently reacquires, repeats reconciliation/barrier/classification, and
  holds the operation mutex through `engine.create_prepared`. If the second scope
  resolves an older receipt, it returns fixed retry state without attributing the
  receipt to the newly persisted ID; that same ID remains persisted for prepare
  retry. TypeScript never owns or retains a Python mutex across an RPC.
- Preparation, finalization, and acknowledgment use the same operation-mutex
  naming/factory, not a process-local queue. A concurrent loser receives
  `UpdateAlreadyInProgress` without mutation; a later retry observes the winner's
  durable authority. Tests pause after the last barrier and race finalization
  against creation, then verify the winner completes and the retry sees its
  result. A cursor and a newer prepared transaction may never both be
  established.
- The synchronous installer absent-authority path participates in the same
  serialization and barrier. It cannot generate an ID or prepare a package
  around an old cursor. Existing-authority resume paths do not generate a new
  ID.
- The single cursor is `updates/finalization-cursor.json`; the fixed
  `updates/finalization-ack.json` is a moved receipt slot, not a cursor or a new
  acknowledgment schema.
- A valid cursor or its deterministic scratch returns distinct
  `finalization_ack_pending`. A malformed or unsafe cursor remains
  `invalid_finalization_cursor`; corruption is never disguised as pending. The
  ack slot alone does not block a later update.
- Acknowledgment moves the exact receipt to the fixed slot with `os.replace`,
  verifies durability, then removes the matching cursor. It does not unlink the
  receipt or write per-transaction tombstones.
- The exhaustive Plan C-to-wire mapping is exact:
  `transaction_not_terminal -> update_not_terminal`;
  `active_transaction_mismatch`, `invalid_finalization_receipt`,
  `invalid_finalization_cursor`, `invalid_finalization_acknowledgment`,
  `finalization_cleanup_failed`, `finalization_cleanup_incomplete`, and
  `finalization_record_round_trip_failed -> update_cleanup_failed`;
  `finalization_ack_pending -> finalization_ack_pending`; and
  `finalization_not_current -> finalization_not_current`. Tests compare the map
  against the complete current `FinalizationError._ALLOWED` set. No raw
  exception, path, or OS text reaches the wire.
- Wire receipts keep nested
  `terminal_version: {fresh_install: boolean, version: string | null}` and state
  `finalized-awaiting-ack`. Cover committed existing, committed fresh,
  rolled-back existing, and rolled-back fresh (`version: null`) rows.

## Public Default Asset Contract

Every revised Extension test/build/release gate preserves:

- tracked `extension/items.json`;
- five Node asset-contract tests;
- `npm run test:run` and `npm run build` fail-closed preflight;
- post-build source/dist byte equality;
- SHA-256
  `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25`;
- non-destructive bookmark semantics: valid empty `dh_items` wins, malformed
  storage is reported without replacement, absent storage loads defaults, and
  Reset explicitly reloads defaults.

Plan D may change build/release wiring only if these checks remain active and
pass at every cutover gate.

Because `release_helper.py` currently commits and tags before invoking its own
build, an operator must begin from a clean worktree and successfully run
`npm run build --prefix extension` before invoking the release helper. That
source/dist identity check is the pre-tag gate; the helper's later build is a
second check, not a substitute.

## Environment And Authorization Gate

The historical Plan C frozen gate proved PyInstaller `6.18.0`, but the current
`host/venv` has no `PyInstaller` module. Authoring and reviewing the plan revision
does not require provisioning. Any commit, push, or Draft PR action still
requires explicit user authorization outside this document.

No C-D0 or Plan D production task starts until the user separately authorizes
that implementation. Exact PyInstaller `6.18.0` installation into `host/venv`
requires another explicit authorization. Provisioning must be one explicit
environment step; source, tests, build scripts, and release scripts must never
auto-install or upgrade it. After provisioning and C-D0 completion, the
self-contained preflight must verify exact output `6.18.0` before capturing the
C-D0 evidence HEAD as the Plan D base.

## Plan C-D0 Finalization Recovery Prerequisite

The execution sequence is fixed: commit this design amendment; commit the
reviewed Plan D plan plus its exact-blob review as the amendment's direct child;
implement/review/commit C-D0 in forward commits; record a C-D0 evidence commit;
then run the Plan D preflight and capture that C-D0 evidence HEAD in
`.superpowers/sdd/plan-d-base.txt`. The preflight verifies the plan/review commit
as an unchanged ancestor rather than requiring it to remain current `HEAD`.
Plan D Task 1 starts only after this sequence and the separately authorized
PyInstaller gate pass.

Plan C adds this sole public recovery composition:

```python
FINALIZATION_OWNER_SCHEMA_VERSION = 1

@dataclass(frozen=True)
class FinalizationOwner:
    schema_version: int
    transaction_id: str
    initiator: UpdateInitiator
    outcome: str
    terminal_version: TerminalVersion

def resolve_pending_finalization(
    install_root: Path,
    registry: RegistryBackend,
    engine_factory: Callable[[Path], UpdateEngine],
    *,
    expected_initiator: UpdateInitiator,
    expected_outcome: str | None = None,
    filesystem: FinalizationFilesystem | None = None,
    mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
) -> FinalizationReceipt | None

def finalize_update_status(
    install_root: Path,
    transaction_id: str,
    registry: RegistryBackend,
    engine_factory: Callable[[Path], UpdateEngine],
    *,
    expected_initiator: UpdateInitiator | None = None,
    expected_outcome: str | None = None,
    filesystem: FinalizationFilesystem | None = None,
    mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
) -> FinalizationReceipt

def acknowledge_update_finalization(
    install_root: Path,
    transaction_id: str,
    *,
    expected_initiator: UpdateInitiator | None = None,
    expected_outcome: str | None = None,
    filesystem: FinalizationFilesystem | None = None,
    mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
) -> bool
```

Its contract is exact:

- It is Plan C-owned. Plan D never imports owner/cursor/ack/receipt loaders, reads
  finalization paths, parses owner/cursor scratch, or scans receipts/
  transactions.
- Plan C persists exactly one canonical owner at
  `updates/finalization-owner.json` with exact JSON keys `schema_version`,
  `transactionId`, `initiator`, `outcome`, and `terminal_version`.
  `schema_version` is exact integer `1`, the ID is strict lowercase 32-hex,
  initiator is exactly `browser|installer`, outcome is exactly
  `committed|rolled-back`, and terminal version is the complete strict Plan B
  object.
- The owner is atomically written and round-trip verified before any cursor
  target or cursor scratch can exist. Finalization cannot begin Plan B cleanup
  until a stable matching owner exists.
- Owner-scratch-only authority is recoverable only from matching terminal active
  journal authority. Scratch bytes are never read because they may be empty,
  partial, or complete. Owner scratch without matching terminal active authority
  fails `invalid_finalization_cursor`; an old ack can never authorize it.
- A stable owner is the sole pending transaction-ID/initiator authority across
  reserved cursor, receipt-ready cursor, partial Plan B cleanup, receipt-to-ack
  move, and cursor-removal replay.
- While terminal active authority remains, owner ID, initiator, outcome, and
  terminal version must match that journal. Expected initiator/outcome guards run
  before owner-scratch normalization or any mutation; a foreign caller leaves
  every artifact byte-identical. Initiator mismatch returns
  `finalization_ack_pending`; expected-outcome mismatch returns
  `finalization_not_current`.
- Resolver `expected_initiator` is mandatory and must be an exact
  `UpdateInitiator`; only known-ID finalize/acknowledge permit `None`. Every
  `expected_outcome` is validated as `None`, `"committed"`, or `"rolled-back"`
  before registry, filesystem, mutex, or engine construction. Known-ID browser
  and installer callers pass their exact initiator; installer terminal calls
  also pass their exact outcome.
- The current cursor and current source receipt must match the owner. A preexisting
  older fixed ack or malformed regular-file ack contents are ignored while the
  current source receipt exists because the current acknowledgment will
  atomically replace that slot. An unsafe ack entry type, symlink, reparse point,
  or noncanonical path remains an error. Only when the current source receipt is
  absent and the receipt-to-ack move is the replay authority must the fixed ack
  match the owner exactly and terminal cleanup be complete.
- Acknowledgment removes the cursor first, fsyncs that namespace, then removes
  the owner and fsyncs the `updates` directory. A crash after cursor removal
  leaves owner plus matching ack as bounded replay authority. Owner target/
  scratch therefore blocks `require_no_pending_finalization`; ack-only after
  owner removal is complete and does not block or get read.
- No owner target/scratch and no cursor target/scratch returns `None`. Any cursor
  without owner authority is invalid generated state, not backward compatibility
  input.
- For a stable owner, the resolver strict-loads it and validates expected
  initiator plus expected outcome before any mutation. For owner-scratch-only
  state, it derives trusted ID/initiator/outcome/terminal version from terminal
  active journal authority, validates both expected guards, then truncates and
  rewrites the existing scratch in place from that trusted authority without
  unlinking it. It never reads scratch bytes, and every crash leaves either the
  scratch marker or the stable owner.
  The resolver performs this selection under the Plan C mutation mutex, captures
  the ID, and releases that mutex. Only after release does it reuse
  `finalize_update_status(install_root, id,
  expected_initiator=expected_initiator,
  expected_outcome=expected_outcome, ...)` and
  `acknowledge_update_finalization(install_root, id,
  expected_initiator=expected_initiator,
  expected_outcome=expected_outcome, ...)`. It returns the
  canonical receipt only after acknowledgment returns `True` and owner/cursor
  targets plus deterministic scratches are gone. There is never a nested
  mutation-mutex acquisition.
- An owner for another initiator returns `finalization_ack_pending` unchanged;
  browser and installer flows never settle each other's unknown-ID operation.
- It preserves the existing `FinalizationError` allowlist, fixed receipt/cursor/
  ack schemas, one additional fixed owner, bounded artifacts, no-scan rule,
  active/workspace cleanup matrix, and same-ID/later-slot replay behavior. Owner
  corruption maps through existing `invalid_finalization_cursor`; no new wire
  error is added.
- `require_no_pending_finalization` remains read-only and continues returning no
  identity. It validates owner/cursor authority and reports pending while either
  owner target/scratch or cursor target/scratch remains.
- The resolver is called only at an unknown-ID/new-operation boundary. Known-ID
  browser `finalize_update_status(id, expected_initiator=BROWSER)` returns the
  receipt without acknowledging; the Extension persists that receipt first,
  then known-ID `acknowledge_update_finalization(id,
  expected_initiator=BROWSER)` runs separately. Acquiring an operation mutex
  never implicitly invokes the resolver.
- Known-ID acknowledgment for an older ID that still matches the fixed ack slot
  remains read-only even while a newer owner/cursor exists. It returns the
  existing replay result and never removes, rewrites, or validates-away the newer
  owner. `remove_owner` is allowed only when the requested ID equals the current
  owner ID and that owner's cursor settlement is complete.

`FinalizationFilesystem` and `OSFinalizationFilesystem` add exact owner support:

- `_finalization_path_kind` and strict path validation accept only fixed
  `updates/finalization-owner.json` as kind `owner`, mapped to existing
  `invalid_finalization_cursor` failures.
- `atomic_write(owner_path, value)` canonicalizes and round-trip verifies the
  owner. If an owner scratch exists, it verifies only that the entry is a plain
  regular file, opens that same scratch for truncating rewrite from trusted
  terminal authority without reading old bytes, flushes/fsyncs it, atomically
  replaces the owner, and calls `fsync_directory(updates_root)`. A crash before
  replace always leaves a scratch marker; a crash after replace leaves a stable
  owner. There is no unlink gap.
- `remove_owner(owner_path)` removes only a plain stable owner and then calls
  `fsync_directory(updates_root)`. Directory fsync is required where supported
  and remains the documented no-op on Windows. No owner acknowledgment schema or
  owner directory is introduced.
- `_FINALIZATION_FS_METHODS` includes `remove_owner`; tests lock the exact method
  order as `atomic_write`, `read`, `exists`, `has_atomic_scratch`,
  `move_receipt_to_ack`, `remove_cursor`, `remove_owner`, `fsync_file`,
  `fsync_directory`, and reject reparse/noncanonical owner paths.

The exact new fault labels are:

```text
owner-scratch:truncate
owner-scratch:write
owner-scratch:file-fsync
owner-scratch:replace
owner-scratch:dir-fsync
owner-write:scratch-create
owner-write:scratch-write
owner-write:file-fsync
owner-write:replace
owner-write:dir-fsync
owner-remove:unlink
owner-remove:dir-fsync
```

Each label receives ordinary-fault and crash-after coverage. Owner-scratch
replace, owner-write replace, and owner-remove unlink tests each assert both
namespace outcomes explicitly. The obsolete `owner-scratch:unlink` label is not
implemented.

The C-D0 tests replay every existing finalization crash family through the new
API: all 15 finalize events, 12 acknowledgment events, 3 receipt-directory
events, and 3 external-cleanup events, including ordinary `OSError` injection
and both namespace outcomes for replace/unlink-style operations. It adds every
owner atomic-write/removal crash boundary; all four terminal identity rows;
empty/partial/complete owner scratch; stable-owner precedence; owner/cursor/ack
conflicts; active-present/workspace-absent rejection; owner plus matching ack
after cleanup; older-ack/current-owner coexistence; stable-owner versus active
initiator conflict; wrong-initiator scratch immutability; unanchored owner/cursor
scratch; resolver ack-only and malformed ack-only without reads; known-ID
ack-only replay; owner path/reparse/protocol-method checks; lost resolver
response; and no directory scan/path leakage. The task updates bounded-artifact
assertions, reruns complete Plan C finalization tests, and reruns exact
PyInstaller `6.18.0`, `73/10`, `15/15` module graph, and real staged-target
frozen probe before Plan D base capture.

For all three public APIs, tests pass invalid `expected_initiator` and
`expected_outcome` values and require rejection before registry, filesystem,
mutex, engine, or path construction. Stable-owner and owner-scratch tests cover
initiator mismatch and outcome mismatch separately and require every artifact
byte-identical.

## Cross-Process Operation Mutex

Plan D introduces a distinct outer Windows named mutex, not an in-memory queue
or the Plan B/C mutation mutex:

```text
Plan B/C mutation mutex:
Local\DynamicsHelper.Update.<sha256(canonical install identity)>

Plan D operation mutex:
Local\DynamicsHelper.UpdateOperation.<sha256(canonical install identity)>
```

It is implemented in new focused module `host/update_operation.py`:

```python
OPERATION_MUTEX_PREFIX = "Local\\DynamicsHelper.UpdateOperation."

def operation_mutex_name(install_root: Path) -> str

def create_windows_operation_mutex(install_root: Path) -> MutationMutex
```

The module reuses `canonical_install_identity` and `WindowsNamedMutex`; it does
not duplicate Win32 bindings or mutation-mutex naming.

- The operation mutex name uses the existing canonical install identity and a
  separate fixed prefix. Independently constructed live-Host, staged-installer,
  and post-registration adapters therefore contend across processes.
- Lock order is always operation mutex, then Plan B/C mutation mutex. Plan B and
  Plan C never acquire the operation mutex themselves. Reusing the mutation
  mutex name is forbidden to prevent recursive acquisition and preserve a
  verifiable lock hierarchy.
- Browser `prepare`, `finalize`, and `acknowledge`; synchronous installer pending
  recovery plus absent-authority creation; rolled-back settlement; and
  post-registration committed settlement hold the operation mutex for their
  complete operation. Known-ID browser finalize/ack do not call unknown-ID
  resolution.
- Contention fails fast as `UpdateAlreadyInProgress`. Native routing maps it to
  fixed `update_already_in_progress`; installer routing returns existing exit
  `31`. At new-operation boundaries, every successful acquisition, whether
  ordinary or abandoned, performs durable pending-finalization reconciliation
  before authority classification; correctness never depends on observing
  `WAIT_ABANDONED` later. Known-ID finalize/ack operations skip unknown-ID
  reconciliation and use their explicit transaction ID.
- Outer operation-mutex `UpdateAlreadyInProgress` propagates unchanged to the
  Plan D boundary and maps to exact Native text `Another Dynamics Helper update
  operation is already in progress. Try again shortly.` Plan C's existing inner
  mutation-mutex translation remains `finalization_ack_pending`; a foreign owner
  has the same safe pending semantics. Installer paths map either pending form to
  exit `31` and do not claim to distinguish them.
- Tests use independently constructed mutex adapters and a Windows subprocess
  gate to prove cross-process contention, distinct names, abandonment handling,
  release on exception, one lock scope across reconciliation/classification/
  selected operation, and operation-before-mutation lock order. Static tests
  prove every production path follows that order and none reverse it.
- Browser `DH_UPDATE_START` invokes a readiness RPC. That Host scope acquires the
  operation mutex, calls `resolve_pending_finalization(...,
  expected_initiator=UpdateInitiator.BROWSER)`, performs the read-only barrier,
  and releases. If
  it resolves an old browser receipt, readiness returns fixed
  `update_already_in_progress`; TypeScript persists no new runtime state and asks
  the user to retry. If readiness succeeds, TypeScript allocates/persists the new
  ID and calls prepare. Prepare independently acquires the operation mutex,
  repeats resolver/barrier/classification, and holds through `create_prepared`.
  If this second scope resolves an older receipt, it returns retry state while
  retaining the same persisted ID for prepare retry; it never attributes the old
  receipt to that ID. Known-ID browser finalize and acknowledge acquire their own
  operation-mutex scopes but invoke only their explicit-ID Plan C primitive.

Synchronous installer terminal outcomes are settled as follows:

- Committed but registration-unverified retains Plan B authority and returns
  registration-pending `11`.
- After live registration and frozen-install verification, Python finalizes and
  acknowledges the exact committed installer transaction under the operation
  mutex; exit `0` is allowed only after acknowledgment returns `True`.
- Rolled-back existing or fresh transactions skip registration, finalize and
  acknowledge under the operation mutex, and return `20` only after
  acknowledgment returns `True`.
- Finalization/acknowledgment failure returns `50` with bounded replay evidence;
  recovery-required retains recovery authority and returns `30`.
- Every `--install-package` entry holds one operation-mutex scope while it calls
  `resolve_pending_finalization(...,
  expected_initiator=UpdateInitiator.INSTALLER)`, classifies active authority,
  and executes the selected branch. No mutation occurs between reconciliation
  and classification.
- If `--install-package` resolves a prior unknown-ID installer finalization, it
  returns `31` without opening or claiming the newly supplied package. The next
  invocation is a new install. This is safe retry behavior, not replay of an old
  `0` or `20` onto an unrelated package.
- If no pending owner exists, known rolled-back installer authority is finalized
  and acknowledged before returning `20`; known committed authority returns
  `11` without finalization so registration can run. Recovery-required returns
  `30` with recovery evidence.
- Frozen `--register` acquires the operation mutex, verifies frozen installation,
  performs registration and reads both registry values back, then settles known
  or recovered installer finalization with `expected_initiator=INSTALLER` and
  `expected_outcome='committed'`. It returns `0` only after acknowledgment
  `True`. A rolled-back owner fails the outcome guard before settlement and
  returns `50` with artifacts unchanged. Source `--register` never enters this
  operation/finalization path.
- Every active authority branch validates exact `UpdateInitiator.INSTALLER`
  before resume/finalize. Browser or otherwise foreign active authority remains
  byte-identical and returns `31` from `--install-package`; frozen registration
  may register the current product but never settles foreign artifacts.
- Frozen registration classifies any stable active installer journal before
  known-ID settlement. Only `INSTALLER + COMMITTED` may call known-ID finalization.
  `INSTALLER + ROLLED_BACK` active authority with no owner returns `50` after
  registration and leaves update artifacts unchanged; it cannot bypass the
  committed-only resolver guard.
- After successful ack and owner removal, ack-slot-only state is complete. A
  later `--install-package` is a new invocation and does not replay the old exit.
  This closes crashes after Plan B active/workspace cleanup but before cursor/
  owner acknowledgment without adding a Plan D locator file.

The exact early-mode behavior is:

| Mode/state | Action | Exit | stdout | stderr |
|---|---|---:|---|---|
| Malformed/wrong-role `--update-probe` | Delegate only Plan A's fixed malformed tuple | `2` | Exact `{"error_code":"package_probe_failed","status":"error"}\n` | Empty |
| Any other invalid role/argv/path/arity | Reject before dependency construction | `2` | Empty | Exact `invalid_early_invocation\n` |
| Main startup `CONTINUE` | Continue into ordinary Native Host startup | `None` | Native protocol only after startup | Empty before protocol startup |
| Main startup `RECOVERY_LAUNCHED` | Exit immediately after fixed detached launch | `0` | Empty | Empty |
| Main startup `MANUAL_RECOVERY_REQUIRED` | Exit before `NativeHost` construction | `30` | Empty | Exact `manual_recovery_required\n` |
| Status Host clean EOF | Preserve bounded read-only status serving | `0` | Native status protocol only | Empty |
| Status Host malformed framing | Preserve status protocol failure | `2` | Any already-completed Native status replies only | Empty |
| `--update-probe` success | Preserve Plan A probe success | `0` | Exact canonical success JSON plus LF | Empty |
| `--update-probe` validated probe failure | Preserve Plan A fixed failure JSON | `40` | Exact `{"error_code":"package_probe_failed","status":"error"}\n` | Empty |
| Detached `--complete-update` committed | Preserve controller result | `0` | Empty | Empty |
| Detached `--complete-update` rolled back | Preserve controller result | `20` | Empty | Empty |
| Detached `--complete-update` any other phase, including prepared/recovery-required | Preserve current `_journal_exit` mapping | `30` | Empty | Empty |
| Detached `--recover-active` / `--recover-update` committed | Preserve controller result | `0` | Empty | Empty |
| Detached `--recover-active` / `--recover-update` rolled back | Preserve controller result | `20` | Empty | Empty |
| Detached `--recover-active` / `--recover-update` any other phase, including prepared/recovery-required | Preserve current `_journal_exit` mapping | `30` | Empty | Empty |
| Any valid early mode operation- or mutation-mutex contention | Preserve no-mutation contention result | `31` | Empty | Empty |
| Source `--register` | Existing source registration only; no operation/finalization path | `0` | Empty | Empty |
| Frozen `--register`, no installer authority/owner | Verify frozen install, register and round-trip, no settlement | `0` | Empty | Empty |
| Frozen `--register`, committed installer active/owner | Verify/register first; settle committed known ID or owner; require ack `True` | `0` | Empty | Empty |
| Frozen `--register`, rolled-back installer owner | Register current product; committed-only guard preserves artifacts | `50` | Empty | Exact `early_mode_failed\n` |
| Frozen `--register`, rolled-back installer active and no owner | Register current product; strict classification preserves artifacts | `50` | Empty | Exact `early_mode_failed\n` |
| Frozen `--register`, strict browser/foreign active authority and no owner | Register current product; leave foreign update artifacts byte-identical | `0` | Empty | Empty |
| Frozen `--register`, foreign pending owner or inner finalization contention | Register current product; leave update artifacts byte-identical and require retry | `31` | Empty | Empty |
| Frozen `--register`, malformed installer authority or settlement failure | Retain bounded evidence | `50` | Empty | Exact `early_mode_failed\n` |
| `--install-package`, callback not bound | Retain historical compatibility result | `10` | Empty | Empty |
| `--install-package`, operation-mutex contention | No package-content validation or mutation | `31` | Empty | Empty |
| `--install-package`, prior unknown-ID installer finalization resolved | Do not claim or Plan-A-validate the new package; require retry | `31` | Empty | Empty |
| `--install-package`, foreign pending owner or foreign active authority | Leave artifacts unchanged | `31` | Empty | Empty |
| `--install-package`, known installer `PREPARED` then committed | Resume same ID through preparation/activation; preserve for registration | `11` | Empty | Empty |
| `--install-package`, known installer `PREPARED` then rolled back | Resume same ID, then finalize/ack rollback | `20` | Empty | Empty |
| `--install-package`, known installer `PREPARED` then recovery-required | Resume same ID and retain recovery evidence | `30` | Empty | Empty |
| `--install-package`, known installer post-activation nonterminal then committed | Recover same ID without staged preflight; preserve for registration | `11` | Empty | Empty |
| `--install-package`, known installer post-activation nonterminal then rolled back | Recover same ID without staged preflight; finalize/ack rollback | `20` | Empty | Empty |
| `--install-package`, known installer post-activation nonterminal then recovery-required | Recover same ID without staged preflight; retain recovery evidence | `30` | Empty | Empty |
| `--install-package`, known committed installer authority | Preserve ID/authority for registration | `11` | Empty | Empty |
| `--install-package`, known rolled-back installer authority | Finalize/ack known ID; require ack `True` | `20` | Empty | Empty |
| `--install-package`, recovery-required | Preserve recovery evidence | `30` | Empty | Empty |
| `--install-package`, absent authority then committed | Reconcile, barrier, stop/wait, validate package, allocate one ID, prepare/activate | `11` | Empty | Empty |
| `--install-package`, absent authority then rolled back | Same creation path, then finalize/ack rollback | `20` | Empty | Empty |
| `--install-package`, absent authority then recovery-required | Same creation path; retain recovery evidence | `30` | Empty | Empty |
| Any package probe failure after callback entry | Fixed probe failure | `40` | Empty | Empty |
| Any other safe internal failure | Retain applicable evidence | `50` | Empty | Exact `early_mode_failed\n` |

Ordinary main startup runs its pre-Native recovery decision before emergency/file
logging, SDK/config imports, `NativeHost` construction, or Native input. A
`CONTINUE` result proceeds. `RECOVERY_LAUNCHED` exits `0` immediately after the
fixed detached launch; `MANUAL_RECOVERY_REQUIRED` exits `30` immediately with
fixed safe diagnostics. Neither non-continue result constructs `NativeHost` or
starts the Copilot client.

The table freezes exit values and output ownership. Probe paths retain Plan A's
JSON stdout contract. Non-probe invalid invocations and safe internal early-mode
failures retain fixed stderr-only diagnostics. Successful main continuation and
status/native modes never emit diagnostic text into the Native stdout channel.

Entrypoint validation necessarily validates the supplied package root and staged
executable before callback dispatch. When a prior finalization is resolved, no
Plan A archive/package-content validation, process stop, transaction-ID
generation, package claim, or product mutation occurs for the newly supplied
package.

## Native Request Handle And Progress

Plan D preserves request-scoped progress while exposing the final-wire request ID
to strict response parsers. `NativePortLease.request` returns one immutable handle
synchronously:

```ts
export interface NativeProgress {
    readonly requestId: string
    readonly payload: string
}

export interface NativePendingRequest {
    readonly requestId: string
    readonly response: Promise<unknown>
}

request(message: Readonly<Record<string, unknown>>): NativePendingRequest

export interface NativePortClientHooks {
    onProgress?: (lease: NativePortLease, progress: NativeProgress) => void
    onUnsolicited?: (lease: NativePortLease, value: unknown) => void
    onDisconnect?: (portId: number) => void
}

export class NativeProtocolError extends Error {
    readonly code = 'invalid_native_response'
    constructor() {
        super('Dynamics Helper received an invalid Native Host response.')
    }
}
```

- `postNativeMessageWire` remains the sole ID/final-wire authority and returns the
  exact supplied/generated ID synchronously. Callers never generate a second
  correlation ID.
- The pending response entry is created before the helper registers/posts. The
  deferred is created first, but the pending-map entry is created only by
  `postNativeMessageWire`'s `register` callback. The returned handle is frozen
  and uses the helper's returned ID. `request()`
  returns only after successful posting. Validation, disconnected lease,
  duplicate ID, registration, or post failures throw synchronously and return no
  handle; a later asynchronous disconnect or safely correlated protocol failure
  rejects an existing `response`.
- A matching exact `{requestId,status:"progress",data:string}` invokes one
  `onProgress(lease, frozenProgress)` callback and leaves the pending response
  unresolved and registered.
- One descriptor-safe transport classifier reads only own data `requestId` and
  `status`. For an active ID, exact `status:"progress"` additionally requires the
  exact progress key set plus nonempty string `data`; it invokes progress and
  retains pending. Active-ID `status:"success"|"error"` removes pending and
  resolves the raw envelope regardless of action-specific extra keys; Analyze or
  update parsers own final-envelope validation. Any other safely correlated
  status/shape removes and rejects with `NativeProtocolError`. Stale IDs are
  dropped. Missing, empty, accessor-backed, or non-string IDs are dropped and
  never routed unsolicited. Only an absent own `requestId` can enter the
  unsolicited parser.
- Analyze transport returns `lease.request(action).response`, preserving Plan E's
  parser-owned action identity and request ID. The transport classifier is the
  Analyze response-ID authority; Analyze's existing bridge continues consuming
  only the raw final Promise. Non-Analyze guarded sends do the same. Update
  coordinator calls retain the full handle and pass `pending.requestId` plus
  `await pending.response` to `parseNativeActionResponse`.
- Main-client progress is forwarded exactly as
  `{type:'NATIVE_PROGRESS',requestId,payload}` through the existing content/FAB
  path; progress never advances update state or completes Analyze. The Service
  Worker, content bridge, and FAB each use exact own-data parsers, accept only
  nonempty primitive request/payload strings, reconstruct/freeze the next-hop object/detail, and
  ignore malformed/page-injected values without logging or coercion.
- Synchronous `onProgress` exceptions are contained; they never remove/settle the
  pending entry and never log raw progress payloads.
- Disconnect rejects all pending responses and permanently invalidates the lease.
  Registration/post failure cleanup remains solely in `postNativeMessageWire`.

Tests cover supplied/generated IDs, immutable handles, register-before-post,
progress-then-final, progress callback failure isolation, wrong/stale progress,
matching success/error, malformed correlated traffic, no-ID unsolicited events,
disconnect, and strict parser correlation.

## Development Runtime Update Policy

Transactional and legacy self-update execution is packaged/frozen-only.

- `PROVIDED_PROTOCOL_CAPABILITIES` remains the full product/package tuple after
  cutover, but runtime `get_capabilities`, `health_check`, and `get_config`
  responses filter out `transactional-update-v1` when `source_runtime=True`.
- `HostGateResult` exposes
  `updateProtocol: 'transactional' | 'legacy' | 'disabled'`, not a boolean.
  Packaged + transactional capability selects `transactional`; older packaged
  Host selects `legacy`; explicit development integrity always selects
  `disabled`, even if an otherwise valid capability envelope also advertises
  transactional. Any malformed capability or integrity envelope remains gate
  failure.
- Source mode keeps check-for-update/available-version UI, but disables Update
  Now with fixed Host code `source_update_disabled`, exact error envelope
  `{requestId:'<original-request-id>',status:'error',error_code:'source_update_disabled',error:'Dynamics Helper
  self-update is disabled while the source Host is registered. Switch to the
  packaged Host to update.'}`, and typed UI state
  `{kind:'source-update-disabled',update:PendingUpdate,error:NormalizedUpdateError}`.
  Both Options and FAB disable update execution controls while retaining update
  checking and availability display. It
  never allocates an update ID,
  writes `dh_update_runtime`, sends any of the five update actions, invokes the
  legacy updater, polls status, finalizes, or reloads.
- Host source mode rejects all five update actions before constructing
  `UpdateService`, opening a package, or touching filesystem/registry/network.
  Analyze/config/health remain available.
- The five actions are exactly `check_update_ready`, `perform_update`,
  `activate_update`, `finalize_update_status`, and
  `acknowledge_update_finalization`. Each returns the request-correlated envelope
  above, emits no progress, and maps through the strict
  `source_update_disabled` normalized error-code/message entry.
- Plan D does not search or borrow ignored `dist/` as a source-mode runner and
  never weakens Plan C's install-root/current-runtime equality.
- If switched to source mode during a persisted transaction, retain recovery
  state and direct the developer back to packaged mode; do not mutate it from
  source mode. The resume matrix is exact: `preparing|prepared` probes main mode
  before prepare/activation effects; `activating` always queries status first and
  probes main only when status confirms exact `prepared`; `waiting-for-host-exit`
  through all detached nonterminal phases never reconnects main and uses only
  status Host; terminal observation first persists `terminal-reload-pending` and
  reloads without a main probe; only the fresh Worker probes before disposition,
  finalize, or acknowledge. `legacy-reload-pending` has no transaction ID and
  derives `{kind:'legacy-update-paused-in-development',update}` when its fresh
  Worker sees development mode. From `waiting-for-host-exit` through all detached nonterminal phases,
  never reconnect/probe the main Host; poll only the status Host so the packaged
  executable is not relaunched or locked during replacement.
  Explicit development at a safe probe point yields
  `{kind:'recovery-paused-in-development',update,transactionId}`, leaves
  `dh_update_runtime` and `pending_update` byte-equivalent, and makes zero main
  update/status-reload/finalization effects after that probe. Returning to
  packaged mode resumes unchanged state. Detached Plan C recovery may progress
  independently; source code never substitutes itself or `dist` as runner
  authority.

The valid gate matrix is exact: malformed capability or integrity is gate
failure; valid development integrity always produces `disabled` regardless of an
otherwise valid transactional capability bit; verified packaged plus the bit is
`transactional`; verified packaged without it is `legacy`.

Source startup skips legacy updater cleanup/migration code that can rename or
replace the venv interpreter. Tests instantiate source startup and prove no
  updater cleanup or any update-owned product, transaction, recovery, registry,
or runner mutation.
Network update checking and `pending_update` availability persistence remain
allowed; “zero side effects” refers specifically to update execution,
transaction, registry, runner, status, reload, and finalization effects.

Tests cover source/frozen capability envelopes, development overriding an
erroneous transactional bit, packaged legacy versus transactional selection,
zero source update side effects, retained availability UI, and no `dist` search.

## Non-Moving PR Metadata Evidence

Final PR metadata is captured only after all tracked work and final substantive
review are complete and the exact final HEAD `H` is separately authorized and
pushed. No tracked commit follows this evidence.

- Write append-only ignored artifacts under
  `.scratch/final-review/plan-d/<H>/<YYYYMMDDTHHMMSSZ>/pr-metadata-receipt.json`
  and sibling `final-findings.md`. Create the timestamp directory exclusively;
  never overwrite or adopt an existing path. Serialize JSON/frontmatter as
  UTF-8 without BOM and LF only.
- The strict receipt has exact top-level keys `schema`, `repository`,
  `observedAtUtc`, `authorization`, `collector`, `subject`, `preQuery`,
  `postQuery`, `expected`, `observed`, `assertions`, `review`, `verdict`. Schema is
  `dynamics-helper.plan-d.pr-metadata-receipt/v1`. Collector has exact tool,
  version, and ordered queried fields. Subject has full `headOid`, first
  `parentOid`, `treeOid`, branch, remote, remoteRef, and observed remoteOid.
  Expected values are captured before network
  output; observed stores exact PR #1/#2 JSON fields. Assertions have fixed
  ordered IDs and boolean PASS. Review stores SHA-256 of the already-complete
  substantive review body. Verdict is exact `PASS`.
- Canonical JSON uses the following complete ordered shape, ASCII escaping,
  separators `(',', ':')`, no insignificant whitespace, one trailing LF, UTF-8
  without BOM, and exclusive file creation:

```json
{
  "schema":"dynamics-helper.plan-d.pr-metadata-receipt/v1",
  "repository":"boatmac/Dynamics-Helper",
  "observedAtUtc":"YYYY-MM-DDTHH:MM:SSZ",
  "authorization":{"scope":"push-exact-head-and-read-pr-metadata","confirmed":true},
  "collector":{"tool":"gh","version":"NONEMPTY","fields":["number","state","isDraft","baseRefName","baseRefOid","headRefName","headRefOid","url"]},
  "subject":{"headOid":"H","parentOid":"FIRST_PARENT","treeOid":"TREE","branch":"hardening/plan-d-runtime-installer","remote":"origin","remoteRef":"refs/heads/hardening/plan-d-runtime-installer","remoteOid":"H"},
  "preQuery":{"headOid":"H","parentOid":"FIRST_PARENT","treeOid":"TREE","branch":"hardening/plan-d-runtime-installer","clean":true},
  "postQuery":{"headOid":"H","parentOid":"FIRST_PARENT","treeOid":"TREE","branch":"hardening/plan-d-runtime-installer","clean":true},
  "expected":{"pr1":{"number":1,"state":"OPEN","isDraft":true,"baseRefName":"master","headRefName":"docs/prompt-scope-cleanup-design","headRefOid":"f60911ed6c9eee45aff5f478d4d43f43e180c905"},"pr2":{"number":2,"state":"OPEN","isDraft":true,"baseRefName":"docs/prompt-scope-cleanup-design","baseRefOid":"f60911ed6c9eee45aff5f478d4d43f43e180c905","headRefName":"hardening/plan-d-runtime-installer","headRefOid":"H"}},
  "observed":{"pr1":{"number":1,"state":"OPEN","isDraft":true,"baseRefName":"master","baseRefOid":"OID","headRefName":"docs/prompt-scope-cleanup-design","headRefOid":"f60911ed6c9eee45aff5f478d4d43f43e180c905","url":"https://github.com/boatmac/Dynamics-Helper/pull/1"},"pr2":{"number":2,"state":"OPEN","isDraft":true,"baseRefName":"docs/prompt-scope-cleanup-design","baseRefOid":"f60911ed6c9eee45aff5f478d4d43f43e180c905","headRefName":"hardening/plan-d-runtime-installer","headRefOid":"H","url":"https://github.com/boatmac/Dynamics-Helper/pull/2"}},
  "assertions":[{"id":"authorization-confirmed","pass":true},{"id":"exact-head-pushed","pass":true},{"id":"local-head-unchanged","pass":true},{"id":"local-tree-unchanged","pass":true},{"id":"worktree-remains-clean","pass":true},{"id":"pr1-frozen-draft","pass":true},{"id":"pr1-head-exact","pass":true},{"id":"pr2-stacked-draft","pass":true},{"id":"pr2-base-exact","pass":true},{"id":"pr2-head-exact","pass":true}],
  "review":{"path":"SUBSTANTIVE_REVIEW_PATH","sha256":"REVIEW_SHA256"},
  "verdict":"PASS"
}
```

`H`, parent/tree/OID, review path/hash, timestamp, and collector version are
strict runtime values with the types/lengths implied above, never literal
placeholders in the emitted receipt.
- PR #1 must remain OPEN Draft, base `master`, head
  `docs/prompt-scope-cleanup-design`, head OID
  `f60911ed6c9eee45aff5f478d4d43f43e180c905`. PR #2 must remain OPEN
  Draft, base that parent branch, head `hardening/plan-d-runtime-installer`, and
  head OID exact `H`.
- Capture pre-query HEAD/first-parent/tree/branch and clean index/worktree. The
  separately authorized exact non-force push and repository-qualified PR queries
  are one bracketed operation. Re-read all four local values and clean state after
  query; any mismatch blocks without editing PRs. The network read requires the
  same explicit authorization or a separate one. `authorization.confirmed=true`
  records that both exact non-force push and metadata-read authority were granted,
  whether jointly or separately.
- Freeze/hash the substantive review body before querying. After PASS, hash exact
  receipt bytes. Final ignored findings use exact frontmatter schema
  `dynamics-helper.plan-d.final-findings/v1` binding `H`, `H^`, review-body hash,
  receipt path/hash, PR gate PASS, blocking count zero, and completion UTC, then
  append the unchanged review body. Verification recomputes both hashes, parses
  every named assertion/verdict, and requires both paths ignored/untracked.
- The substantive review body is complete before the query at canonical
  repository-relative ignored path
  `.scratch/final-review/plan-d/<H>/substantive-review.md`. It must already be
  UTF-8 without BOM, LF-only, and end in exactly one LF. Its exact raw-byte
  SHA-256 is stored in `review.sha256`. Sibling
  `final-findings.md` is exclusive-created as UTF-8/no-BOM/LF with exact
  frontmatter keys/order `schema`, `subject_head_oid`, `subject_parent_oid`,
  `subject_tree_oid`, `review_body_sha256`, `review_verdict`,
  `blocking_findings`, `pr_metadata_gate`, `pr_metadata_receipt`,
  `pr_metadata_receipt_sha256`, `completed_at_utc`. Exact bytes are opening
  `---\n`, one `key: JSON-string-or-integer` line per key in that order, closing
  `---\n`, then the byte-identical substantive review body with no additional
  separator or trailing conversion. OIDs/hashes are lowercase strings, verdicts
  are JSON strings, blocking count is integer `0`, receipt path is the canonical
  repository-relative path, and completion time is `YYYY-MM-DDTHH:MM:SSZ`.
- Verification requires current and recorded HEAD/first-parent/tree/branch/clean
  state, exact recorded `subject.remoteOid` and live remote ref OID `H`, every expected/observed PR field, exact ordered
  assertion IDs/all `true`, receipt/review hashes, canonical path grammar, and
  both files/directories ignored and untracked.
- C-D0 and committed Plan D reports may describe this future gate but never claim
  its outcome. Any tracked review fix invalidates prior ignored evidence and
  restarts push/review/receipt from the new HEAD.
- The seal point is after both files are exclusive-created and the complete
  read-only verifier passes. After sealing, only read-only verification is
  allowed: no tracked/untracked worktree edit, `git add`/index edit, receipt or
  findings replacement/deletion, commit, amend, rebase, merge, retarget, push,
  checkout, reset, cherry-pick, tag/ref mutation, or PR state/draft/base/head
  mutation. Any mutation invalidates the evidence and requires a new directory
  and complete sequence.

## Verification And Completion

- Review the revised Plan D plan before Task 1 and resolve every Critical or
  Important finding.
- Commit/review the revised plan first; then complete/review C-D0 in forward
  commits before capturing the C-D0 evidence HEAD as the Plan D base or executing
  Task 1.
- Use TDD and the plan's independent commits for all production tasks.
- Run tests with fresh six-variable state/temp roots and bounded foreground
  batches; do not substitute one opaque monolithic timeout for the recorded
  update matrices.
- Preserve PR #1 at `f60911e` throughout child-branch implementation.
- At final Plan D HEAD, rerun complete committed-head source, Extension, Host,
  installer, package, frozen build/module/probe, static, and documentation
  gates.
- Run the exact final whole-branch review from
  `0040b1de1bc196b203014a8e4f94a53babb7e9aa` to the literal final Plan D SHA.
  Critical and Important findings must both be `None` for PASS.
- Release readiness is not claimed until that review and all Plan D gates pass.
  Disposable-VM smoke remains a separate pre-release gate.

No unapproved commit, push, PR operation, branch integration, version, tag,
publish, release, install, registry, real update, real AppData, browser, MyCases,
or authenticated-model operation is authorized by this design.
