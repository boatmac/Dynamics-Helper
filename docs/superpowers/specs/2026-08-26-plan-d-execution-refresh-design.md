# Plan D Execution Refresh Design

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
   blocked only until the revised plan is reviewed/committed and exact local
   PyInstaller `6.18.0` is available.
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
9. Capture `.superpowers/sdd/plan-d-base.txt` only after the revised plan is
   reviewed and committed. The final whole-branch review base remains
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
  `install_root`. The Host-side barrier and `engine.create_prepared` remain
  separate mutex acquisitions but share one serialized update-service operation
  queue plus installation-mutex discipline. Finalization uses that same service
  serialization. Tests pause after the last barrier and race finalization
  against creation: either finalization wins and preparation creates nothing,
  or preparation wins and finalization observes the new active authority; a
  cursor and a newer prepared transaction may never both be established.
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

No Plan D production task starts until the user separately authorizes installing
exact PyInstaller `6.18.0` into `host/venv`. Provisioning must be one explicit
environment step; source, tests, build scripts, and release scripts must never
auto-install or upgrade it. After provisioning, the self-contained preflight
must verify exact output `6.18.0` before capturing the Plan D base.

## Verification And Completion

- Review the revised Plan D plan before Task 1 and resolve every Critical or
  Important finding.
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
