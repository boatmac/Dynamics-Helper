# Hardening Plan C Detached Recovery Report

## Scope and Authoritative Heads

- Plan C base: `07099ab6b892808a468cd1d1ca70ba3726a74439`.
- Consumed Plan A implementation head: `909e08759897d5ab235211e65a72856ce8066dfe`.
- Consumed Plan B implementation head after exact hook-contract correction:
  `c9fbd94d81dace2b4723dd7c5da8c5167e0090a5`.
- Plan C implementation/test head after broad-review durability correction:
  `01b68e6`.
- Scope is detached recovery infrastructure. No update click, installer route,
  capability cutover, real install/update, registry/AppData product mutation,
  publish, push, tag, or version change was performed.

## Consumed Signatures and Fields

The isolated signature probe exited `0`. Observed signatures:

```text
load_update_manifest(path: Path) -> UpdateManifest
parse_transaction_id(value: object) -> str
read_active_transaction(path: Path) -> ActiveTransaction
resolve_active_journal(updates_root: Path, active: ActiveTransaction) -> Path
read_journal(path: Path) -> UpdateJournal
TransactionPaths.for_install(install_root: Path, transaction_id: object) -> TransactionPaths
terminal_version(journal: UpdateJournal) -> TerminalVersion
terminal_version_to_value(value: TerminalVersion) -> dict[str, object]
parse_terminal_version(value: object) -> TerminalVersion
UpdateEngine.activate_prepared(self, transaction_id: str, process_identity: InitiatingProcessIdentity | None) -> UpdateJournal
UpdateEngine.resume(self, transaction_id: str) -> UpdateJournal
UpdateEngine.rollback(self, transaction_id: str, failure_code: JournalReason) -> UpdateJournal
UpdateEngine.finalize_terminal_evidence(self, transaction_id: str) -> bool
read_ownership_plan(path: Path) -> OwnershipPlan
ownership_plan_sha256(plan: OwnershipPlan) -> str
UpdateEngineHooks(before_live_phase: Callable[[JournalPhase, TransactionPaths, OwnershipPlan], None], wait_for_initiating_host_exit: Callable[[InitiatingProcessIdentity], None], probe_installed_product: Callable[[Path, OwnershipPlan], None], before_filesystem_operation: Callable[[str], None] = _ignore_operation, after_filesystem_operation: Callable[[str], None] = _ignore_operation, after_journal_transition: Callable[[JournalPhase], None] = _ignore_transition) -> None
```

Observed field order:

```text
UpdateManifest: schema_version, package_version, required_capabilities, provided_capabilities, chrome_version, chrome_version_name, entries
InitiatingProcessIdentity: pid, creation_token
TerminalVersion: version, fresh_install
TransactionPaths: install_root, updates_root, active, transactions_root, preparing_root, preparing_staged_root, preparing_staged_host, preparing_staged_extension, preparing_probe_manifest, preparing_ownership, preparing_journal, transaction_root, staged_root, staged_host, staged_extension, backup_root, host_backup, extension_backup, metadata_backup, failed_new_root, probe_root, probe_manifest, ownership, journal
UpdateJournal: schema_version, transaction_id, phase, initiator, target_version, prior_version, fresh_install, ownership_path, ownership_sha256, initiating_process, seed_receipt, reason_code, original_failure_code, rollback_from
UpdateEngineHooks: before_live_phase, wait_for_initiating_host_exit, probe_installed_product, before_filesystem_operation, after_filesystem_operation, after_journal_transition
```

## Commit Map

- `daf03b6` `feat(update): isolate native message framing`
- `bcc1448` `feat(host): unify native registration modes`
- `b18d0bf` `feat(update): add identity-safe Windows adapters`
- `2632d26` `feat(update): install complete recovery runtime`
- `7d5763b` `feat(update): orchestrate detached crash recovery`
- `ff226b8` `feat(update): add read-only update status host`
- `38c0a2f` `feat(update): atomically acknowledge finalization`
- `2e4c269` `feat(update): dispatch recovery before host startup`
- `dff7ed0` `build(update): include detached recovery modules`
- `a0d7409` `test(update): strengthen detached recovery gates`
- `8c8c3bb` `test(update): close recovery verification gaps`
- `c9fbd94` `fix(update): freeze recovery hook contract`
- `01b68e6` `fix(update): exhaust finalization crash recovery`

## RED Evidence

- Framing RED rejected missing shared little-endian codec behavior.
- Registration RED rejected absent source/frozen/status shared service.
- Process RED rejected PID-only public contracts, PID reuse, missing handle
  cleanup, unsafe inheritance, and noncanonical RunOnce commands.
- Recovery RED rejected incomplete/reparse onedir sources, recovery-tree writes
  before inventory, missing staged preflight, activation before preflight,
  installer process waiting, and wrong rollback lineage.
- Early-dispatch RED rejected incomplete role/arity/authority validation and
  construction before validation.
- Finalization RED rejected missing cursor reservation, non-atomic ack,
  unbounded artifacts, wrong terminal projection, and incomplete crash replay.
- Packaging RED rejected missing module-form hidden imports.
- Final Task 10 review RED found Plan B's first three `UpdateEngineHooks` fields
  incorrectly defaulted/untyped; the exact consumed-contract selector exited
  `1`, then passed after `c9fbd94` made them mandatory typed callables.

```text
host/venv/Scripts/python.exe -m unittest host.test_update_engine_host.ExceptionContractTests.test_update_engine_hooks_consumed_contract_is_exact -v
Ran 1 test in 0.001s
FAILED (failures=1)
HOOK_CONTRACT_RED_EXIT=1
```

- Broad final review RED exposed two production defects: acknowledgment left a
  receipt scratch behind while opening the start barrier, and receipt authority
  resolved past a lexical reparse parent. Both exact selectors failed (`2/2`).
- Follow-up RED exposed cursor-scratch precedence with an older ack slot,
  record-specific error leaks from receipt/ack entry types, and missing exact
  error mapping at the public acknowledgment boundary.

## GREEN Evidence

- Committed-head checkpoint: documentation commit `d6d83ff`; product/test head
  `c9fbd94`. Focused Plan C command, exit `0`:

```text
host/venv/Scripts/python.exe -m unittest host.test_native_messaging host.test_native_registration host.test_update_platform host.test_update_recovery host.test_update_status_host host.test_update_entrypoint host.test_early_update_dispatch host.test_release_helper -v
```

- Final focused Plan C command: `Ran 182 tests in 62.450s`, `OK (skipped=1)`.
  The only skip was `FrozenStagedProbeIntegrationTests` with
  `DH_PLAN_C_FROZEN_ONEDIR` unset; the same selector passed separately when set.
- Exact framing gate, exit `0`, selectors:

```text
host.test_native_messaging.NativeMessagingTests.test_little_endian_writer_round_trips_through_little_endian_reader
host.test_native_messaging.NativeMessagingTests.test_reader_accepts_a_little_endian_peer_frame
host.test_native_messaging.NativeMessagingTests.test_default_reader_accepts_analyze_payload_larger_than_one_mib
host.test_native_messaging.NativeHostFramingIntegrationTests.test_native_host_ping_response_uses_little_endian_frame
host.test_native_messaging.NativeHostFramingIntegrationTests.test_little_endian_peer_ping_round_trips_through_native_host
host.test_native_messaging.NativeHostFramingIntegrationTests.test_main_host_accepts_analyze_payload_larger_than_one_mib
host.test_update_status_host.StatusProtocolTests.test_rejects_more_than_64_kib_before_reading_body
Ran 7 tests in 0.693s
OK
```

- Plan A/B regression command, exit `0`:

```text
host/venv/Scripts/python.exe -m unittest host.test_product_info host.test_package_manifest host.test_package_archive host.test_install_integrity host.test_early_cli host.test_host_integrity_actions host.test_update_journal host.test_update_ownership host.test_update_mutex host.test_update_engine_host host.test_update_engine_extension host.test_update_engine_rollback host.test_update_engine_resume -v
Ran 134 tests in 594.766s
OK
```
- Full Host discovery command, exit `0` with `PYTHONPATH` removed:
  `host/venv/Scripts/python.exe -m unittest discover host -v`. Result:
  `Ran 523 tests in 700.089s`, `OK (skipped=1)`. The only skip was the same
  environment-gated frozen selector, which passed separately below.
- Finalization classes after strengthened gates: 35 tests, `OK`.
- Hook targeted GREEN, exit `0`:

```text
host/venv/Scripts/python.exe -m unittest host.test_update_engine_host.ExceptionContractTests.test_update_engine_hooks_consumed_contract_is_exact host.test_update_engine_host host.test_update_recovery.FinalizationTests host.test_update_recovery.FrozenStagedProbeIntegrationTests -v
Ran 39 tests in 19.648s
OK (skipped=1)
```

- Plan B hook-contract regression, exit `0`:

```text
host/venv/Scripts/python.exe -m unittest host.test_update_journal host.test_update_ownership host.test_update_mutex host.test_update_engine_host host.test_update_engine_extension host.test_update_engine_rollback host.test_update_engine_resume -v
Ran 77 tests in 401.673s
OK
```

- Final exact hook selectors, exit `0`:

```text
host/venv/Scripts/python.exe -m unittest host.test_update_engine_host.ExceptionContractTests.test_update_engine_hooks_consumed_contract_is_exact host.test_update_recovery.FinalizationTests.test_cursor_precedes_receipt_unregister_and_engine_cleanup -v
Ran 2 tests in 0.779s
OK
```
- Extension command `npm.cmd run test:run --prefix extension --
  --reporter=dot` exited `0`: 19 files and 340 tests passed in 50.34s.
  Production command `npm.cmd run build --prefix extension` exited `0`,
  transformed 2,218 modules, and built in 16.96s.
- Source command `host/venv/Scripts/python.exe -m compileall -q -x
  "[\\/]venv[\\/]" host release_helper.py` exited `0` with no diagnostics.

## Restored Mutation Evidence

Every listed mutation command ran with isolated profile/temp values, exited `1`
(nonzero), was immediately restored, and its named selector exited `0`:

| Area | Restored break-and-fail evidence |
|---|---|
| Framing | writer/reader big-endian, default 1 MiB inbound cap, omitted status 64 KiB cap |
| Process | wait reopened PID, parent process handle omitted |
| Recovery tree | stable active bytes changed, tree install moved before preflight |
| Staged preflight | RunOnce before preflight, bare staged Host execution, post-probe staged revalidation removed |
| Recovery lineage | retry used current `rollback_failed` instead of persisted original |
| Entrypoint | normal Chrome main rejected, parent-window `0` rejected, metadata required for normal main, source used interpreter path, role matrix widened, runtime bit ignored |
| Validation boundary | production/injected dependency or low-level adapter constructed before validation; identity constructed before authority; malformed/wrong-role probe bypassed Plan A fixed tuple |
| Finalization projection | fresh rollback null or committed-fresh target rejected |
| Finalization order | receipt before reserved cursor; actual directory fsync removed; engine cleanup completion omitted |
| Finalization replay | second receipt write, Plan B authority reread after cleanup, pre-existing cursor removed on receipt failure |
| Acknowledgment | copy/delete or separate ack write, more than one replace, missing write-through, pre/post-move replay disabled, ack durability omitted |
| Barrier/bounds | cursor/scratch ignored, random scratch, receipt scan, pending cursor replaced, old ack removed before newer acknowledgment, delayed old replay mutated/rejected too early |

Exact child command form for each row was
`host/venv/Scripts/python.exe -m unittest <selectors> -v`. Observed selectors
and exits:

| Mutation | Selectors | Mutated / restored exit |
|---|---|---|
| Writer endian | `host.test_native_messaging.NativeMessagingTests.test_little_endian_writer_round_trips_through_little_endian_reader` | `1 / 0` |
| Reader endian | `host.test_native_messaging.NativeMessagingTests.test_reader_accepts_a_little_endian_peer_frame` | `1 / 0` |
| Default reader cap | `host.test_native_messaging.NativeMessagingTests.test_default_reader_accepts_analyze_payload_larger_than_one_mib`, `host.test_native_messaging.NativeHostFramingIntegrationTests.test_main_host_accepts_analyze_payload_larger_than_one_mib` | `1 / 0` |
| Status cap omitted | `host.test_update_status_host.StatusProtocolTests.test_rejects_more_than_64_kib_before_reading_body` | `1 / 0` |
| Wait reopens PID | `host.test_update_platform.ProcessAdapterTests.test_retained_handle_defeats_pid_reuse` | `1 / 0` |
| Parent process handle not closed | `host.test_update_platform.ProcessAdapterTests.test_detached_launch_closes_parent_thread_and_process_handles` | `1 / 0` |
| Recovery touches active | `host.test_update_recovery.RecoveryTreeTests.test_install_replaces_only_recovery_child_and_preserves_stable_active` | `1 / 0` |
| Recovery install before preflight | `host.test_update_recovery.RecoveryRunnerTests.test_prepare_runtime_order_and_browser_registry_contract` | `1 / 0` |
| RunOnce before activation preflight | `host.test_update_recovery.RecoveryRunnerTests.test_failed_staged_preflight_never_arms_or_activates` | `1 / 0` |
| Bare staged Host probe | `host.test_update_recovery.StagedHostPreflightTests.test_preflight_starts_combined_staged_frozen_target_before_activation` | `1 / 0` |
| Post-probe revalidation removed | `host.test_update_recovery.StagedHostPreflightTests.test_probe_time_staged_mutation_fails_before_any_activation_mutation` | `1 / 0` |
| Wrong rollback lineage | `host.test_update_recovery.RecoveryRunnerTests.test_rollback_failed_retry_uses_persisted_original_failure` | `1 / 0` |
| Parent window zero rejected | `host.test_update_status_host.StatusArgTests.test_accepts_allowlisted_origin_and_optional_decimal_parent`, `host.test_update_entrypoint.EntrypointSelectionTests.test_normal_main_source_and_frozen_continue_without_factory` | `1 / 0` |
| Normal main requires metadata | `host.test_update_entrypoint.EntrypointSelectionTests.test_historical_main_classification_ignores_metadata` | `1 / 0` |
| Source uses interpreter path | `host.test_early_update_dispatch.EarlyDispatchIsolationTests.test_host_bootstrap_order_and_entrypoint_source_are_exact` | `1 / 0` |
| Role matrix widened | `host.test_update_entrypoint.EntrypointDispatchTests.test_recognized_command_wrong_role_cross_product_is_rejected` | `1 / 0` |
| Dependency constructed before validation | `host.test_update_entrypoint.EntrypointDispatchTests.test_malformed_modes_never_construct_dependencies`, `host.test_update_entrypoint.EntrypointDependencyTests.test_dependency_construction_occurs_after_validated_invocation` | `1 / 0` |
| Runtime bit ignored | `host.test_update_entrypoint.EntrypointSelectionTests.test_runtime_bits_are_not_caller_selectable` | `1 / 0` |
| Malformed probe bypasses Plan A | `host.test_early_update_dispatch.EarlyDispatchIsolationTests.test_integrated_source_probe_is_rejected_canonically_before_startup`, `host.test_update_entrypoint.EntrypointDispatchTests.test_malformed_probe_uses_fixed_plan_a_tuple_without_dependencies` | `1 / 0` |
| Wrong-role probe tuple widened | `host.test_update_entrypoint.EntrypointDispatchTests.test_probe_wrong_role_uses_canonical_failure_without_probe_or_factories` | `1 / 0` |
| Low-level workspace constructed early | `host.test_update_entrypoint.EntrypointDispatchTests.test_malformed_modes_never_construct_dependencies`, `host.test_update_entrypoint.EntrypointDispatchTests.test_probe_wrong_role_uses_canonical_failure_without_probe_or_factories` | `1 / 0` |
| Identity constructed before authority | `host.test_update_entrypoint.EntrypointDispatchTests.test_complete_update_invalid_authority_never_constructs_dependencies` | `1 / 0` |
| Normal Chrome main rejected | `host.test_update_entrypoint.EntrypointSelectionTests.test_normal_main_source_and_frozen_continue_without_factory` | `1 / 0` |
| Fresh rollback null rejected | `host.test_update_recovery.FinalizationTests.test_record_constructor_and_four_terminal_projection_table` | `1 / 0` |
| Committed fresh rejected | `host.test_update_recovery.FinalizationTests.test_record_constructor_and_four_terminal_projection_table` | `1 / 0` |
| Receipt before cursor or publication fsync removed | `host.test_update_recovery.FinalizationTests.test_cursor_precedes_receipt_unregister_and_engine_cleanup` | `1 / 0` |
| Second receipt on reserved replay | `host.test_update_recovery.FinalizationTests.test_same_id_finalize_replays_cursor_without_second_receipt` | `1 / 0` |
| Plan B authority reread after cleanup | `host.test_update_recovery.FinalizationTests.test_lost_finalize_response_replays_stable_receipt_after_engine_cleanup` | `1 / 0` |
| Cursor removed on receipt failure | `host.test_update_recovery.FinalizationTests.test_same_id_replay_receipt_error_retains_preexisting_cursor` | `1 / 0` |
| Pending cursor ID ignored | `host.test_update_recovery.FinalizationTests.test_different_transaction_is_blocked_while_cursor_pending`, `host.test_update_recovery.FinalizationTests.test_different_id_cursor_precedence_skips_registry_and_engine_factory` | `1 / 0` |
| Separate/copy-delete ack | `host.test_update_recovery.FinalizationTests.test_finalization_source_has_no_random_or_receipt_scan_or_direct_ack_write`, `host.test_update_recovery.FinalizationTests.test_finalization_test_class_map_and_move_owner_are_exact` | `1 / 0` |
| Copy-delete instead of one replace | `host.test_update_recovery.FinalizationWindowsDurabilityTests.test_acknowledgment_uses_one_os_replace_from_receipt_to_fixed_slot`, `host.test_update_recovery.FinalizationTests.test_finalization_source_has_no_random_or_receipt_scan_or_direct_ack_write` | `1 / 0` |
| Pre/post-move replay disabled | `host.test_update_recovery.FinalizationTests.test_ack_atomically_moves_receipt_to_fixed_slot_then_opens_barrier` | `1 / 0` |
| Ack replay durability removed | `host.test_update_recovery.FinalizationTests.test_post_move_replay_refsyncs_ack_and_both_parents_before_cursor` | `1 / 0` |
| Cursor-scratch replay disabled | `host.test_update_recovery.FinalizationTests.test_cursor_scratch_with_matching_ack_replays_cleanup` | `1 / 0` |
| Start barrier ignored | `host.test_update_recovery.FinalizationTests.test_ack_atomically_moves_receipt_to_fixed_slot_then_opens_barrier`, `host.test_update_recovery.FinalizationTests.test_cursor_scratch_blocks_start_and_newer_finalization` | `1 / 0` |
| Write-through removed | `host.test_update_recovery.FinalizationWindowsDurabilityTests.test_replace_uses_replace_existing_and_write_through` | `1 / 0` |
| Random scratch or receipt scan | `host.test_update_recovery.FinalizationTests.test_finalization_source_has_no_random_or_receipt_scan_or_direct_ack_write` | `1 / 0` |
| Older ack deleted during newer finalize | `host.test_update_recovery.FinalizationTests.test_ack_slot_replays_same_id_until_later_transaction_replaces_it` | `1 / 0` |
| Delayed old ack cannot replay read-only | `host.test_update_recovery.FinalizationTests.test_ack_slot_replays_same_id_until_later_transaction_replaces_it`, `host.test_update_recovery.FinalizationTests.test_older_ack_replay_is_read_only_while_newer_cursor_exists` | `1 / 0` |

The first cursor-order and same-ID receipt mutations initially exposed weak tests;
the tests were strengthened, re-mutated to nonzero, restored, and independently
reviewed with no Critical/Important findings.

## Process Identity and Handle Lifecycle

- Public `ProcessAdapter` methods accept complete identities or retained handles;
  semantic AST evidence found bare PID only in the mandated low-level
  `Win32ProcessApi.open_process` and `CtypesWin32ProcessApi.open_process` seams.
- Creation token format is `win-create-time-<unsigned-decimal-FILETIME>`.
- Retained-handle PID-reuse, absent/mismatched identity, wait timeout/failure,
  and exactly-once close tests passed.
- Detached launch tests proved `CreateProcessW`, one inherited `NUL` allowlist,
  exact detached/process-group/extended-startup flags, canonical transaction
  `cwd`, and parent thread/process/NUL cleanup.

## Recovery Tree and Active Preservation

- Complete executable plus `_internal` inventory is validated before copy;
  source ancestors and descendants reject symlink/reparse/unsupported entries.
- Recovery replacement touches only sibling `updates/recovery` and preserves
  `updates/active.json` byte-for-byte.
- Copy/verify/rename failure retains the prior recovery tree; stale deterministic
  scratch blocks replacement.

## Staged Runtime Preflight and Installed Commit Probe

- Preflight builds one temporary exact combined Host/Extension/metadata view
  outside install/transaction roots, invokes its copied frozen executable, then
  removes the view before returning.
- Copy, process, cleanup, metadata/capability/version mismatch, and staged-byte
  TOCTOU mutations all returned fixed `staged_probe_failed`, retained
  `PREPARED`, and produced no RunOnce/controller/live mutation.
- Browser and installer activation each invoke a fresh staged preflight before
  RunOnce and `activate_prepared`.
- Plan B's installed-product probe remains after live mutation and is the sole
  commit gate.

## Early Argument Validation and Canonical Probe Failure

- Exact role matrix, arity, runtime bit, path authority, active/journal linkage,
  identity text, and complete executable chain tests passed.
- The full no-construction ledger poisoned imported and defining-module registry,
  controller, process, workspace, RunOnce, clock, mutex, dependency, status,
  installer, and identity constructors on both production and injected paths.
- Non-probe mismatch bytes: stdout `b""`; stderr
  `b"invalid_early_invocation\n"`; exit `2`.
- Malformed/wrong-role probe bytes: stdout
  `b'{"error_code":"package_probe_failed","status":"error"}\n'`; stderr
  `b""`; exit `2`. Plan A received exactly `(absolute_entrypoint,
  "--update-probe")`; direct `run_update_probe` remained uncalled.

## RunOnce and Original Failure Lineage

- Store/key/value/type/260-character bound and readback tests passed for exact
  `DynamicsHelperUpdateRecovery` `REG_EXPAND_SZ` command.
- Staged rejection performs no RunOnce operation. Safe post-arm interruption
  re-arms; terminal/manual-recovery-required removes.
- Recovery-required rollback retry passed persisted `original_failure_code`; the
  current `rollback_failed` mutation exited nonzero.

## Status Read-Only Evidence

- Static mutation scan over `update_status_host.py` found no engine, mutex,
  registry, RunOnce, unlink/rmtree/replace, or write operation.
- Status request framing passes exactly 64 KiB and rejects an oversized prefix
  before body read.
- Status projection exposes only transaction ID, phase, target version, and
  current reason; no original failure, process identity, path, hash, or exception.

## Finalization and Bounded Acknowledgment

- Plan B public fixtures froze all four terminal identities, including committed
  fresh target and rolled-back fresh null.
- Observed publication order was reserved cursor directory fsync, receipt
  directory fsync, receipt-ready cursor directory fsync, status unregister, then
  successful `finalize_terminal_evidence`.
- Same-ID reserved-cursor plus durable-receipt replay wrote only the cursor
  transition; injected receipt creation failure retained the reserved cursor.
- Acknowledgment uses one same-volume `os.replace(receipt_path, ack_path)`, then
  file/source-parent/target-parent durability and cursor removal.
- Pre-move source replay, post-move slot replay, cursor-scratch replay, lost
  cursor-unlink response, start barrier, old-slot read-only replay, and later
  slot replacement tests passed.
- Production finalization contains no receipt enumeration, random scratch,
  per-transaction ack, separate ack serializer, or direct Plan B cleanup.
- Broad-review correction at `01b68e6` adds lexical-before-resolve record path
  validation, record-specific `exists/read/move/scratch` errors, receipt-scratch
  normalization before the ack move, and cursor-scratch precedence that permits
  a valid newer active authority while retaining the older pending barrier.
- Exact crash model now freezes 15 finalize and 12 acknowledgment events. It
  runs `InjectedCrash` and ordinary `OSError` at every boundary, asserts actual
  partial prefixes, models both pre/post replace and unlink namespace outcomes,
  covers acknowledgment-time receipt normalization, and rejects unknown/orphan
  artifacts.
- Concurrency tests use deterministic waiter counts and two independent Plan B
  terminal workspaces. Complete wrong-ID precedence and directory/symlink/
  reparse/unsupported entry-type tables assert exact safe errors.
- Final corrected finalization command: `Ran 54 tests in 110.650s`, `OK` from
  root `dh-plan-c-finalization-final-green-352b18e6df084727bf7f1c7fc0eae7de`.
- Static plan typo adjudication: `_same_finalization_volume` correctly requires
  `type(source_device) is int`; the plan's final command accidentally asserted
  `is not int`, contrary to its implementation section and durability tests.

## PyInstaller CLI, Module Graph, and Frozen Staged Probe

```text
PLAN_C_FROZEN_GATE_STATUS=PASS
```

- Exact preflight command `host/venv/Scripts/python.exe -m PyInstaller
  --version` exited `0`: `PYINSTALLER_VERSION=6.18.0`.
- Committed-head source argv/hidden-import command, exit `0`:

```text
host/venv/Scripts/python.exe -m unittest host.test_release_helper.PlanCPackagingTests.test_source_build_argv_uses_venv_python_module_and_every_hidden_import -v
Ran 1 test in 0.010s
OK
```

- Frozen build command, exit `0`:

```text
host/venv/Scripts/python.exe -c "import release_helper; release_helper.build_host()"
```

The emitted command began
`host/venv/Scripts/python.exe -m PyInstaller --onedir --clean -y --name
dh_native_host --paths <absolute-host>` and included the exact 15 hidden imports
before `host/dh_native_host.py`. It performed no provisioning, bare executable,
spec input, or Plan C data bundling.

- Onedir inventory command, exit `0`:

```text
host/venv/Scripts/python.exe -c "from pathlib import Path; from update_recovery import inventory_onedir; root=Path('dist/dh_native_host').resolve(strict=True); inventory=inventory_onedir(root); assert (root/'dh_native_host.exe').is_file(); assert inventory.internal_files; print(f'ONEDIR_INTERNAL_FILES={len(inventory.internal_files)}'); print(f'ONEDIR_INTERNAL_DIRS={len(inventory.internal_directories)}')"
ONEDIR_INTERNAL_FILES=73
ONEDIR_INTERNAL_DIRS=10
```

- Module graph command, exit `0`:

```text
host/venv/Scripts/python.exe -c "from pathlib import Path; required=('early_cli','install_integrity','native_messaging','native_registration','package_archive','package_manifest','product_info','update_engine','update_entrypoint','update_journal','update_mutex','update_ownership','update_platform','update_recovery','update_status_host'); text=Path('build/dh_native_host/xref-dh_native_host.html').read_text(encoding='utf-8'); missing=[name for name in required if name not in text]; assert not missing, missing; print('Plan C module graph complete: 15/15')"
Plan C module graph complete: 15/15
```
- Real frozen command with absolute `DH_PLAN_C_FROZEN_ONEDIR`:
  `host/venv/Scripts/python.exe -m unittest
  host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation -v`.
  Exit `0`: `Ran 1 test in 11.396s`, `OK`, no skip.
- One diagnostic run used the non-plan prefix
  `dh-plan-c-committed-frozen-probe-<guid>` and failed during synthetic staging
  with Windows `WinError 3`. The failure did not reproduce with either a short
  root or the plan-mandated exact `dh-plan-c-process-<guid>` harness above; the
  canonical committed frozen gate is the passing result recorded here.
- `dh_native_host.spec`, `build/`, `dist/`, and `extension/dist/` were ignored;
  generated spec was untracked.

## Six-Variable Isolation Roots

Every Python/Node child received fresh existing `LOCALAPPDATA`, `APPDATA`,
`USERPROFILE`, `HOME`, `TEMP`, and `TMP` directories. Recorded roots include:

- Focused Plan C: `dh-plan-c-process-f210ec11f9984f989b8d9cf5a4e1c51e`.
- Seven framing selectors: `dh-plan-c-process-ec63907fb657470f8b80a15dbc5c1c58`.
- Plan A/B regressions: `dh-plan-c-process-cf730e3eec4846cf80f815822a6d076e`.
- Host discovery: `dh-plan-c-process-a293b24cdac64f2e925e92f76dcaa0b1`.
- Frozen build: `dh-plan-c-process-dd36115ae30147aeb9569415ed77af61`.
- Frozen staged probe: `dh-plan-c-process-22499f7f0b7c4b9987e163295fc7345d`.
- Final focused test-only review:
  `dh-plan-c-process-f210ec11f9984f989b8d9cf5a4e1c51e`.
- Constructor-ledger final gate:
  `dh-plan-c-ledger-final-cb814cde33f74879b69e2406230a0378`.
- Compile: `dh-plan-c-process-29c0c55d53ec4475abfa2a64ec00b5bb`.
- Extension tests: `dh-plan-c-process-2e3a85cf979a495ca4e248c992719c85`.
- Extension build: `dh-plan-c-process-f82e7e11135c4f949487f02d627f5f40`.
- Source packaging: `dh-plan-c-process-5d6379c6dfdf440f84174d99bca01669`.
- PyInstaller preflight: `dh-plan-c-process-208a9136bc6640a1b09436552f4a6a44`.
- Onedir inventory: `dh-plan-c-process-745c232435c14fe29cbf5b37650d0bb0`.
- Module graph: `dh-plan-c-process-c0341b7e4a854134b1b52f5690b8ad33`.
- Interface/role matrix: `dh-plan-c-process-eeda9545415f47de8b7e132f53a1cf4d`.
- Public identity boundary: `dh-plan-c-process-661d51b3b29b489e8a6672703e928bcd`.
- Recovery preflight order: `dh-plan-c-process-bd98e2e093a84cc186d38c229e196a56`.
- Recovery primitive ownership: `dh-plan-c-process-500320c8f6fd48deb2bd217ae52af098`.
- Framing signature/limits: `dh-plan-c-process-464787c4e01a43089f797c6b41401a51`.
- Validate-before-factories: `dh-plan-c-process-18d19b035e56449d9ed69ace3003d090`.
- Bounded finalization AST: `dh-plan-c-process-c5f3a29156e14b6bad0be69bd4fccec2`.
- Final consumed-interface probe:
  `dh-plan-c-interface-evidence-5f4588c390ee4d2bb63576acbb3847b8`.
- Hook-contract RED: `dh-plan-c-hook-red-5ce513d1833d4ec7ba66f3f500b9fde6`.
- Hook targeted GREEN: `dh-plan-c-hook-green-299ab5dca6e24822ae5e559493e65199`.
- Hook Plan B regression: `dh-plan-c-hook-regression-c941d6c09b8a4ce9ba84e7fdc8dd671d`.
- Hook exact signature: `dh-plan-c-hook-signature-547b9a51647c423086c66fbb8a57921d`.
- Hook final selectors: `dh-plan-c-hook-final-2169d3fc831842649fc6fde4155b7d48`.
- Current Plan A/B command: `dh-plan-c-ab-current-05c13799b260437d82e634185f4960ea`.
- Current entrypoint AST: `dh-plan-c-ast-entry-2ab5aa06f5e04bdeb69a739a75652d47`.
- Current finalization AST:
  `dh-plan-c-ast-finalization-454ff2f4f3df479a88582100d3686b9b`.
- Current recovery AST: `dh-plan-c-ast-recovery-8591d301ead8436a9f2d35098c19c200`.
- Current complete signature probe:
  `dh-plan-c-signature-current-b845eedf2d0445419ce5b0a2f275576d`.
- Committed focused: `dh-plan-c-committed-focused-a122c348975d4cc2bfda534f08a6494a`.
- Committed framing: `dh-plan-c-committed-framing-fedd4bbec7fc48e28421779c24d25366`.
- Committed Plan A/B: `dh-plan-c-committed-ab-f24a7c33bd154da9bbc6079b4a001239`.
- Committed discovery:
  `dh-plan-c-committed-discovery-298b018b3d3f4f66b189d0cfdef4603f`.
- Committed compile: `dh-plan-c-committed-compile-0e7bb27fd4924ebebd886934c25904c3`.
- Committed Extension tests:
  `dh-plan-c-committed-extension-test-807bbb0c817e49d3b59cd3c6dfd82dcf`.
- Committed Extension build:
  `dh-plan-c-committed-extension-build-b055ea9337294acb9fd5bd36421af613`.
- Committed source packaging:
  `dh-plan-c-committed-source-package-eb9ebe12fb3243609fb866ddb71bb434`.
- Committed PyInstaller preflight:
  `dh-plan-c-committed-pyinstaller-3576e9a870254711a1b137a0c079fb64`.
- Committed frozen build:
  `dh-plan-c-committed-frozen-build-cbba45e0dbc24a53b1e30ef8a8f1f26e`.
- Committed inventory:
  `dh-plan-c-committed-inventory-5a88fca7220247b89c55a21aad349a1e`.
- Committed graph: `dh-plan-c-committed-graph-0f80a087eca54936926709dbeaac8361`.
- Committed canonical frozen probe:
  `dh-plan-c-process-269144baa6014bb19ab4be73c80b1fad`.
- Committed interface matrix: `dh-plan-c-process-3965f258f5dd44a19c9c92df85a01edf`.

Focused imports set `PYTHONPATH=host`; discovery and compile removed it.

## Static and Scope Gates

- Exact interface probe command, exit `0`:

```text
host/venv/Scripts/python.exe -c "import inspect; from package_manifest import load_update_manifest; from update_engine import UpdateEngineHooks; print('load_update_manifest', inspect.signature(load_update_manifest)); print('UpdateEngineHooks', inspect.signature(UpdateEngineHooks)); print('UpdateEngineHooks.fields', tuple(UpdateEngineHooks.__dataclass_fields__))"
```

- Exact negative scan commands returned no matches (the shell treated an empty
  result as PASS):

```text
git grep -n -E "manifest\.inventory|OwnershipInventory|initiating_host_pid|TransactionPaths\.recovery_root|recovery[/\\]active\.json|activate_prepared\([^,]+,[[:space:]]*[A-Za-z_]*pid|rollback\([^,]+,[[:space:]]*JournalReason\.ROLLBACK_FAILED" -- host/native_messaging.py host/native_registration.py host/update_platform.py host/update_recovery.py host/update_status_host.py host/update_entrypoint.py release_helper.py
git grep -n -E "transition\(|write_journal_atomic|write_active_transaction_atomic|write_probe_manifest|remove_transaction_tree|remove_matching_active" -- host/update_platform.py host/update_recovery.py host/update_status_host.py host/update_entrypoint.py
git grep -n -E "Popen.*close|\.close\(\).*Popen|subprocess\.Popen" -- host/update_platform.py host/update_recovery.py host/update_entrypoint.py
git grep -n -E "package_probe_failed|canonical_json_bytes|json\.dumps|_write_probe" -- host/update_entrypoint.py
git grep -n -E "UpdateEngine|update_mutex|winreg|RunOnce|unlink|rmtree|os\.replace|write_text|write_bytes|open\(.+[wa]" -- host/update_status_host.py
```

- Exact positive/static command forms, each exit `0`:

```text
git grep -n -E "activate_prepared\(" -- host/update_recovery.py
git grep -n -F -- "result = dispatch_early_cli(probe_argv)" host/update_entrypoint.py
git grep -n -- "launch_host.bat" host/native_registration.py host/test_native_registration.py
git grep -n -- "host_manifest.json" host/native_registration.py host/test_native_registration.py
git grep -n -F -- 'struct.pack("<I"' host/native_messaging.py
git grep -n -F -- 'struct.unpack("<I"' host/native_messaging.py
git diff --check 07099ab6b892808a468cd1d1ca70ba3726a74439..HEAD
git diff --name-only 07099ab6b892808a468cd1d1ca70ba3726a74439..HEAD
```

- Required Win32/static symbol command, exit `0`:

```powershell
$required = @(
  "CreateProcessW", "OpenProcess", "GetProcessTimes",
  "QueryFullProcessImageNameW", "WaitForSingleObject", "CloseHandle",
  "PROC_THREAD_ATTRIBUTE_HANDLE_LIST", "MoveFileExW",
  "MOVEFILE_WRITE_THROUGH"
)
foreach ($symbol in $required) {
  $targets = if ($symbol -in @("MoveFileExW", "MOVEFILE_WRITE_THROUGH")) {
    @("host/update_recovery.py")
  } else {
    @("host/update_platform.py")
  }
  git grep -n -- $symbol -- $targets | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Missing Win32 symbol: $symbol" }
}
```

- Three current custom AST commands ran as isolated
  `host/venv/Scripts/python.exe -c <verbatim-script>` processes. The exact
  script bodies and outputs were:

```python
# root dh-plan-c-ast-entry-2ab5aa06f5e04bdeb69a739a75652d47
import ast, pathlib
source = pathlib.Path("host/update_entrypoint.py").read_text(encoding="utf-8")
t = ast.parse(source)
f = {n.name: n for n in t.body if isinstance(n, ast.FunctionDef)}
called = lambda n: n.func.id if isinstance(n.func, ast.Name) else n.func.attr if isinstance(n.func, ast.Attribute) else ""
d = f["dispatch_early_mode"]
calls = [n for n in ast.walk(d) if isinstance(n, ast.Call)]
forbidden = {
    "production_early_mode_dependencies", "EarlyModeDependencies",
    "WindowsRegistryBackend", "registry_factory", "register_main_host",
    "create_production_recovery_controller", "RecoveryController",
    "recovery_factory", "CtypesWin32ProcessApi", "WindowsProcessAdapter",
    "SubprocessProbeAdapter", "TemporaryStagedProbeWorkspace",
    "WindowsRunOnceStore", "SystemClock", "create_windows_mutation_mutex",
    "default_install_root", "install_package", "status_server",
}
validates = [n for n in calls if called(n) == "validate_early_invocation"]
factories = [n for n in calls if called(n) in forbidden]
production = [n for n in calls if called(n) == "production_early_mode_dependencies"]
injected = [n for n in calls if called(n) == "dependencies_factory"]
assert len(validates) == len(production) == len(injected) == 1
assert all(validates[0].lineno < n.lineno for n in (*factories, *injected))
owners = ("classify_entrypoint", "validate_probe_invocation", "validate_early_invocation", "resolve_active_command", "resolve_journal_command")
assert not [(owner, called(n)) for owner in owners for n in ast.walk(f[owner]) if isinstance(n, ast.Call) and called(n) in forbidden]
classify = ast.get_source_segment(source, f["classify_entrypoint"]) or ""
probe = ast.get_source_segment(source, f["_validate_frozen_probe_host_root"]) or ""
assert "release-integrity.json" not in classify and "installed-product.json" not in classify
assert "release-integrity.json" in probe and "installed-product.json" in probe
print("VALIDATE_BEFORE_FACTORIES=PASS")
print("NORMAL_MAIN_METADATA_INDEPENDENT=PASS")
```

```text
VALIDATE_BEFORE_FACTORIES=PASS
NORMAL_MAIN_METADATA_INDEPENDENT=PASS
```

```python
# root dh-plan-c-ast-finalization-454ff2f4f3df479a88582100d3686b9b
import ast, pathlib
source = pathlib.Path("host/update_recovery.py").read_text(encoding="utf-8")
t = ast.parse(source)
f = {n.name: n for n in t.body if isinstance(n, ast.FunctionDef)}
called = lambda n: n.func.id if isinstance(n.func, ast.Name) else n.func.attr if isinstance(n.func, ast.Attribute) else ""
owners = ("finalize_update_status", "acknowledge_update_finalization", "require_no_pending_finalization")
banned = {"iterdir", "glob", "rglob", "walk", "mkstemp", "NamedTemporaryFile", "uuid4", "remove_receipt", "_write_and_verify_ack"}
assert not [(owner, called(n)) for owner in owners for n in ast.walk(f[owner]) if isinstance(n, ast.Call) and called(n) in banned]
assert ".{target.name}.tmp" in (ast.get_source_segment(source, f["_scratch_path"]) or "")
finalization = "\n".join(ast.get_source_segment(source, f[name]) or "" for name in owners)
assert "uuid" not in finalization and "FinalizationAck" not in source and "_write_and_verify_ack" not in source
replace_source = ast.get_source_segment(source, f["_replace_finalization_file"]) or ""
assert "WinDLL" in replace_source and "MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH" in replace_source
same = ast.get_source_segment(source, f["_same_finalization_volume"]) or ""
assert "st_dev" in same and "follow_symlinks=False" in same and "type(source_device) is int" in same
fs = next(n for n in t.body if isinstance(n, ast.ClassDef) and n.name == "OSFinalizationFilesystem")
move = ast.get_source_segment(source, next(n for n in fs.body if isinstance(n, ast.FunctionDef) and n.name == "move_receipt_to_ack")) or ""
assert "os.replace(receipt_path, ack_path)" in move and source.count("os.replace(receipt_path, ack_path)") == 1
print("BOUNDED_FINALIZATION_AST=PASS")
print("ATOMIC_RECEIPT_TO_ACK_REPLACE=1")
print("SAME_VOLUME_INTEGER_DEVICE_IDENTITY=PASS")
```

```text
BOUNDED_FINALIZATION_AST=PASS
ATOMIC_RECEIPT_TO_ACK_REPLACE=1
SAME_VOLUME_INTEGER_DEVICE_IDENTITY=PASS
```

```python
# root dh-plan-c-ast-recovery-8591d301ead8436a9f2d35098c19c200
import ast, pathlib
files = ("host/update_recovery.py", "host/update_entrypoint.py", "host/dh_native_host.py", "release_helper.py")
targets = {"install_recovery_tree", "register_status_host"}
trees = {name: ast.parse(pathlib.Path(name).read_text(encoding="utf-8")) for name in files}
called = lambda n: n.func.id if isinstance(n.func, ast.Name) else n.func.attr if isinstance(n.func, ast.Attribute) else None
definitions = {(name, node.name) for name, tree in trees.items() for node in ast.walk(tree) if isinstance(node, ast.FunctionDef) and node.name in targets}
calls = {(name, called(call), owner.name) for name, tree in trees.items() for owner in ast.walk(tree) if isinstance(owner, ast.FunctionDef) for call in ast.walk(owner) if isinstance(call, ast.Call) and called(call) in targets}
assert definitions == {("host/update_recovery.py", "install_recovery_tree"), ("host/update_recovery.py", "register_status_host")}
assert calls == {("host/update_recovery.py", "install_recovery_tree", "prepare_recovery_runtime"), ("host/update_recovery.py", "register_status_host", "prepare_recovery_runtime")}
source = pathlib.Path("host/update_recovery.py").read_text(encoding="utf-8")
t = ast.parse(source)
c = next(n for n in t.body if isinstance(n, ast.ClassDef) and n.name == "RecoveryController")
funcs = {n.name: n for n in c.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
cname = lambda x: x.func.attr if isinstance(x.func, ast.Attribute) else x.func.id if isinstance(x.func, ast.Name) else None
find = lambda name, target: [x for x in ast.walk(funcs[name]) if isinstance(x, ast.Call) and cname(x) == target]
for name in ("run_complete_update", "run_installer_update"):
    assert len(find(name, "preflight_prepared_target")) == len(find(name, "activate_prepared")) == 1
    assert find(name, "preflight_prepared_target")[0].lineno < find(name, "activate_prepared")[0].lineno
prepare = "prepare_recovery_runtime"
assert len(find(prepare, "preflight_prepared_target")) == len(find(prepare, "install_recovery_tree")) == len(find(prepare, "register_status_host")) == 1
assert find(prepare, "preflight_prepared_target")[0].lineno < find(prepare, "install_recovery_tree")[0].lineno < find(prepare, "register_status_host")[0].lineno
print("RECOVERY_PRIMITIVE_OWNERSHIP=PASS")
print("RECOVERY_PREFLIGHT_ORDER=PASS")
```

```text
RECOVERY_PRIMITIVE_OWNERSHIP=PASS
RECOVERY_PREFLIGHT_ORDER=PASS
```
- The exact interface signature command above, focused role/no-factory selectors,
  and three verbatim AST scripts provide the interface, validation-order,
  preflight-order, primitive-ownership, and bounded-finalization evidence.
- The five exact negative `git grep` commands above had no matches.
- The positive `activate_prepared` grep returned exactly two call sites.
- The required Win32/static symbol loop completed without throwing.
- Plan C committed production range changed only the documented Host/release
  files except `c9fbd94`, the reviewed prerequisite correction that makes Plan
  B's consumed hook interface match its frozen Plan B/C contract. No Extension,
  installer, version, or checked-spec production drift occurred. The range
  contained 27 tracked files and ignored only build/spec/dist outputs.
- Static plan typo adjudication: the plan's broad bare-PID regex matches its own
  required low-level `Win32ProcessApi.open_process(pid: int)` seam. The semantic
  AST gate proved no public `ProcessAdapter`/recovery/entrypoint API accepts a
  bare PID.

## Plan D Handoff

- Plan D must call `require_no_pending_finalization(install_root)` before any
  coordinator or Host-side ID/runtime/package/Plan B authority side effect and
  close the check-to-create race through its serialized service boundary.
- Plan D must call only `prepare_recovery_runtime` for recovery tree/status setup,
  pass complete browser identity, and pass installer identity `None`.
- Finalization error mapping must include distinct `finalization_ack_pending` and
  preserve `finalization_not_current`; there is no `FinalizationAck` model.
- Ordinary product actions remain available while the cursor blocks only a new
  update start.
- Plan C frozen evidence is PASS, but Plan D routing remains intentionally
  inactive until its own implementation/gates. The approved execution sequence
  proceeds through Plan E before Plan D only after the corrective evidence commit
  receives the final clean-HEAD Step 12 rerun.
- `PLAN_C_PRE_FINALIZATION_FIX_GATE_STATUS=PASS` for source, full Host, compile,
  Extension, frozen build/module/probe, interface, static, and scope gates.
- `PLAN_C_FINAL_CLEAN_HEAD_GATE_STATUS=PENDING` until `01b68e6` receives the
  full focused/full/frozen/interface/static/scope rerun and a clean broad review.

## Deferred Disposable-VM Gate

DISPOSABLE-VM SMOKE REQUIRED BEFORE RELEASE, NOT RUN

Deferred real-machine cases: inherited-handle isolation; real RunOnce launch,
re-arm, and removal; forced installed-probe rollback; Chrome status launch argv;
interrupted installer resume; browser registration; antivirus/file-lock races;
and end-to-end terminal finalization. Backups/evidence must be retained for any
`recovery-required` result.
