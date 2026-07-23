# Hardening Plan B Journal Engine Report

## Scope/Base/Prerequisite Signatures

- Reviewed Plan A/documentation base: `00fff06741f3c8a575fd3c6eba45c4d7cd1b1a62`.
- Plan B implementation head before this evidence commit: `9ca3fadfb6edabad2285bad42ea95e5fab7a4f73`.
- Plan A `ValidatedPackage`, `UpdateManifest.entries`, `ReleaseIntegrity`, `InstalledProduct`, `validate_staged_package(..., *, expected_version=None)`, ownership constants, canonical serializers, and hashes matched the frozen Plan B contract before implementation.
- Scope is a dormant standard-library transaction engine. No routing, capability advertisement, detached recovery, installer cutover, registry, RunOnce, real update, release, version, tag, push, or publish was activated.

## Commit Map

- `3bfb1fa` `feat(update): add strict transaction journal`
- `b1158a4` `feat(update): persist exact product ownership`
- `1f26277` `feat(update): serialize installation mutation`
- `0fce143` `feat(update): prepare and replace host under mutex`
- `d91698c` `feat(update): install extension metadata and fresh seed`
- `41d7ccf` `fix(update): verify installed ownership before mutation`
- `2e41229` `feat(update): preserve rollback failure lineage`
- `9ca3fad` `test(update): exhaust journal fault matrix`

## Plan A Alignment

Plan B validates N+1 packages with the caller's selected `expected_version`, never the importing Host `VERSION`. It filters exact `UpdateManifest.entries`, revalidates physical hashes, package/capability links, Chrome `version`/`version_name`, Host/Extension bijections, metadata hashes, ownership/legacy schema versions, and old installed product hashes. Package-only files affect package ownership but are not installed.

## Durable Schemas

Transaction IDs are lowercase 32-hex from exactly 16 random bytes. Strict canonical journal and active JSON reject duplicate keys, non-finite numbers, noncanonical bytes, unknown keys, invalid phases, and escaping paths. Stable `updates/active.json` selects `updates/transactions/<id>/journal.json`; `TransactionPaths` has no recovery root. Ownership sidecars persist exact fresh/installed/legacy source, prior/new product hashes, presence facts, and seed rows. Terminal version supports committed target, rolled-back prior, and fresh rollback null version.

## Exceptions

Journal, ownership, mutex, and engine exceptions expose fixed codes only. Permission and Windows sharing violations map to `locked_path`. Forward failures persist allowlisted reasons. Reverse unsafe mismatch uses `manual_recovery_required`; ordinary reverse failure uses `rollback_failed`. If recovery journal persistence also fails, `ExceptionGroup("rollback_and_journal_persistence_failed", ...)` contains fixed-message engine/journal exceptions with raw errors only as causes.

## RED

- Missing journal, ownership, mutex, and engine APIs failed their initial focused suites.
- Preparation RED exposed coarse/unhooked staging, absent atomic replay recognition, and wrong live operation labels.
- Rollback RED showed forward exceptions escaping, prior metadata never backed up, reverse mismatch after partial mutation, non-idempotent retry, and raw recovery-write failure.
- Matrix RED showed missing per-file preparation labels, missing terminal labels/replay, and absent operation/transition axes.
- Review REDs rejected inconsistent old installed hashes, corrupt staged seed, corrupt prepared workspace on both active and active-repair paths, staged-absent/live-exact metadata replay, missing required seed receipt, and post-probe live corruption.

## GREEN

- Strict canonical journal/active parsing, atomic replacement, transition graph, process identity, failure lineage, and terminal projection pass.
- Exact Plan A ownership for fresh, installed, and legacy-v1 passes.
- Windows named mutex identity/contention/abandonment/cleanup passes.
- Preparation, activation, Host/Extension/seed/metadata/probe, rollback, recovery-required retry, and terminal cleanup pass under mutex with exact state recognition.
- Final exact Plan B focused gate: **76/76 passed in 528.913s**.
- Final full isolated Host discovery: **349/349 passed in 543.192s**, no skips.

## Mutations

- Carrying `rollback_failed` into recovery retry failed lineage tests.
- Performing one reverse move before whole-operation preflight failed zero-mutation tests.
- Removing legacy from the ownership-mode loop failed the frozen mode count.
- Removing one literal operation label failed its exact tuple count.
- All mutations were restored before final gates.

## Five-Mode Matrix and Literal Counts

Modes are installed, legacy, fresh-seeded, fresh-preexisting, and fresh-post-plan-user-creation. Literal preparation cases total 82, orphan recovery 5, forward 56, rollback 53, and terminal finalization 20, for 216 operation-label cases. Each runs before-operation fault, after-operation crash, and independently synthesized post-operation state: **648 operation-axis cases**. Thirteen phase labels across five modes give 65 phase-transition crashes, plus two durable seed-receipt transition crashes, for **67 transition cases**. Browser identity covers all five modes; installer null identity/no-wait covers installed, legacy, fresh-seeded, and fresh-preexisting.

## Mutex Evidence

Every workspace/active mutation, preparation/replay, activation, nonterminal resume, rollback/retry, and terminal evidence cleanup acquires one installation mutex and rereads strict authority under lock. Test hooks assert the fake mutex is held for every filesystem operation and phase callback. Read-only terminal/status consumers may use strict readers without mutating authority.

## Preservation

The engine owns only declared product Host files/roots, whole Extension, packaged metadata, and its matching transaction workspace/active record. It preserves `config.json`, `copilot-instructions.md`, `user_prompt.md`, logs/rotations, generated `manifest.json`, unknown top-level paths, and unrelated `updates/**`. Fresh seed move, post-plan user creation, later edit, and deletion are represented by an immutable receipt and are never reversed as product data.

## Focused/Full/Compile/Static Gates

- Focused exact command: 76 tests, 528.913s, OK.
- Full Host discovery with `PYTHONPATH` removed: 349 tests, 543.192s, OK, no skips.
- `python -m compileall -q -x "venv" host`: passed.
- Stale-contract scan: only the intentionally nullable seed observed digest exists; no stale Plan A/B symbol/path/version coupling.
- Scope scan for subprocess, registry, RunOnce, Chrome runtime, or legacy `Updater` use in Plan B production modules: no matches.
- Plan A field/signature probe: passed.
- Production transaction writers: definitions only in `update_journal.py`; calls only in `update_engine.py`.
- `git diff --check`: passed.

## Scope Exclusions

Plan B does not modify `dh_native_host.py`, `updater.py`, Extension production files, installer scripts, release/version files, package assets, registry, RunOnce, browser state, or network behavior. It does not advertise `transactional-update-v1`; the legacy updater remains active.

## Plan C/D Handoff

Plan C/D consume `parse_transaction_id`, `generate_transaction_id`, strict active/journal readers/resolver, `TransactionPaths.for_install`, `UpdateEngine.create_prepared`, `activate_prepared`, `resume`, `rollback`, `finalize_terminal_evidence`, and terminal-version helpers exactly. Browser activation passes immutable `{pid, creation_token}`; installer activation passes `None`. Plan C uses Plan B's `probe_manifest`, never writes transitions/active/workspace, retries with `original_failure_code`, and calls terminal cleanup only after receipt durability/status unregister. Plan D passes browser selected target/current prior and preserves installer null-target semantics. No second Python ID generator is allowed.

## Residual VM Risks

Disposable-VM tests remain required for real process locks, antivirus races, crash/power-loss durability, frozen executable replacement, registry/RunOnce integration, detached status Host behavior, installer re-entry, and end-to-end browser finalization. Plans C/D remain blocked from capability cutover until their frozen gates pass.
