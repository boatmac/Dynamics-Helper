# Hardening Plan C Detached Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add staged-frozen-runtime preflight, detached frozen runners, identity-safe process waiting, RunOnce recovery, a read-only status Host, strict side-effect-free early dispatch, and bounded receipt-backed finalization around the authoritative Plan A package contract and Plan B transaction engine.

**Architecture:** Plan A remains the sole package/integrity/probe authority and Plan B remains the sole journal, active-record, workspace, mutex, transition, rollback, and terminal-evidence authority. Plan C first materializes an exact temporary Host-root view from Plan B's prepared staged Host, staged Extension, and package metadata, then executes that target frozen Host through Plan A's early `--update-probe`; only a matching result permits RunOnce arming or `activate_prepared`, while Plan B's installed-product probe remains the post-mutation commit gate. Plan C otherwise adds standard-library adapters around the frozen interfaces: `update_platform.py` owns injected Win32 process/RunOnce behavior, `update_recovery.py` owns staged preflight, reusable recovery-tree installation, and Plan B hook composition, `update_status_host.py` exposes read-only journal status, and `update_entrypoint.py` validates and selects special modes before constructing side-effecting dependencies or starting the normal Host.

**Tech Stack:** Python 3.13, standard library (`ctypes`, `dataclasses`, `json`, `pathlib`, `struct`, `subprocess`, `winreg`), PyInstaller 6.18.0 `--onedir` through `host/venv/Scripts/python.exe -m PyInstaller`, Native Messaging little-endian framing, `unittest`, and PowerShell 7

## Global Constraints

- Execute only after the reviewed implementations of Plans A and B are committed and green. Record both implementation heads and every consumed signature in `.superpowers/sdd/hardening-c-detached-recovery-report.md`; any mismatch blocks Plan C rather than permitting an adapter or duplicate schema.
- Consume `UpdateManifest.entries` exactly. There is no `manifest.inventory`, nullable manifest hash, or Plan C ownership model.
- Consume Plan B's exact `UpdateJournal`, `InitiatingProcessIdentity(pid, creation_token)`, `TerminalVersion`, and `TransactionPaths`. There is no `initiating_host_pid`, `TransactionPaths.recovery_root`, `recovery/active.json`, or Plan C transaction-path dataclass.
- Stable active state is exactly `<install>/updates/active.json`. The reusable recovery tree is its sibling `<install>/updates/recovery`; replacing that tree cannot move, copy, rewrite, or delete `active.json`.
- Plan B `UpdateEngine` exclusively owns all journal transitions and every write/removal under `updates/transactions/**` plus `updates/active.json`. Plan C never calls `transition`, `write_journal_atomic`, `write_active_transaction_atomic`, never writes Plan B's probe manifest, and never deletes a transaction workspace or active record directly.
- Plan B `create_prepared` has already written and verified `TransactionPaths.probe_manifest`. Plan C strict-loads that file for both the staged preflight and the installed commit probe but does not create, repair, replace, or copy it. Passing this external absolute manifest path to Plan A's subprocess is not a write: the running target derives its Host root from its own executable and treats the manifest as read-only comparison metadata.
- Before either browser or installer activation calls `UpdateEngine.activate_prepared`, Plan C strict-loads the prepared journal and ownership sidecar, verifies their exact linkage, materializes an ephemeral exact Host-root view from `TransactionPaths.staged_host`, `TransactionPaths.staged_extension`, and the persisted ownership inventory, and launches that copied staged `dh_native_host.exe --update-probe <absolute Plan-B-owned probe_manifest>`. The view includes the complete staged executable and `_internal` runtime, target metadata, staged seed when Plan B prepared one, and the target Extension at `<probe-root>/extension`; it is outside the transaction workspace and live install and is removed before activation continues.
- The staged probe must return Plan A's canonical success for the journal target and exact manifest provided/required capabilities. Missing/incomplete runtime, copy/materialization fault, process failure, malformed output, metadata/version/capability mismatch, or cleanup failure is fixed `staged_probe_failed`. The journal remains exactly `PREPARED`, the live product and registration remain untouched, no process identity is persisted, no RunOnce value is written, and `activate_prepared` is not called. Plan B's `probe_installed_product` hook still runs after Host, Extension, and metadata installation and remains the only commit gate.
- Browser activation passes a complete `InitiatingProcessIdentity`; no public Plan C API accepts or persists a bare PID. Installer activation is valid only for a persisted `initiator == UpdateInitiator.INSTALLER` and calls `activate_prepared(transaction_id, process_identity=None)` without opening or waiting on any process.
- The staged preflight itself is process-identity-free: it validates target runtime/package identity, not the current Host. Browser identity capture/open occurs only after preflight succeeds; installer preflight never creates, opens, or waits on a process identity.
- A process creation token is generated from `GetProcessTimes` creation `FILETIME` as `win-create-time-<unsigned-decimal-ticks>`. Initial activation, durable journal state, wait hooks, readiness checks, restart recovery, and CLI arguments compare the complete immutable identity.
- The retained initiating-process handle is opened once before browser activation. Restart recovery may open the persisted identity once while phase is `waiting-for-host-exit`; an absent process, image mismatch, or creation-token mismatch means the original process has exited. Later phases never reopen a process. Early dispatch only parses raw identity text and journal authority; it never opens/captures a process or constructs a process adapter before controller creation.
- Production detached launch uses injected `CreateProcessW`, not `subprocess.Popen`. It supplies only `NUL` standard handles through `PROC_THREAD_ATTRIBUTE_HANDLE_LIST`, sets `bInheritHandles=True` only for that allowlist, and uses `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | EXTENDED_STARTUPINFO_PRESENT`. Parent copies of the child thread/process handles and `NUL` handle are closed on every path after the child creation token is captured.
- Every detached runner launch uses the canonical `TransactionPaths.transaction_root` as `cwd`. Initial activation derives it from the validated requested ID. Startup recovery resolves stable `active.json`, then derives the same root from `TransactionPaths.for_install`; neither path comes from browser argv or the caller's current directory. A RunOnce-launched runner does not trust its inherited cwd and resolves active state itself. The staged preflight uses a fresh temporary root only for its byte-exact combined target view; it never executes from, writes into, or reparents the live Host.
- Detached status/runner executables are sibling copies of one complete preflighted PyInstaller onedir executable beside one byte-exact `_internal` tree. Source runtime, every ancestor used for copying, and every `_internal` descendant are rejected on symlink, junction/reparse, non-directory, or non-regular-file evidence before the first destination copy.
- RunOnce is HKCU `Software\Microsoft\Windows\CurrentVersion\RunOnce`, value `DynamicsHelperUpdateRecovery`, type `REG_EXPAND_SZ`, exact stored command `"%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe" --recover-active`, and at most 260 characters. Arm and read back before activation and before every live phase.
- Terminal `committed`/`rolled-back` removes RunOnce. Explicit `manual_recovery_required` removes it. After an activation attempt has successfully passed staged preflight and armed RunOnce, every other nonterminal return/interruption re-arms it. A staged-preflight rejection occurs before that policy begins and performs no RunOnce write/delete. Automatic `recovery-required` rollback retry passes persisted `journal.original_failure_code`; it never passes or promotes current `rollback_failed` as the original failure.
- Normal main Native Host launch accepts either no arguments or one allowlisted Chrome origin plus one optional nonnegative decimal `--parent-window=<handle>` argument; decimal `0` is Chrome's valid sentinel. It classifies the already-running Host from the canonical executable basename and Chrome argv only, never from the presence or contents of `release-integrity.json` or `installed-product.json`, and returns `None` so normal startup reaches Plan A's `verify_installation`. Missing, half-written, or malformed historical metadata therefore reports `installation_integrity_failed` through the normal Host instead of being rejected as an early invocation. The actual entrypoint passed to early dispatch is resolved `Path(sys.executable)` when frozen and resolved `Path(__file__)` in source development; it is never the source interpreter path. The exact basename `dh_update_status_host.exe` selects status mode only without a recognized command. A recognized command token still wins selection, but the command-to-entrypoint matrix then rejects a command on the wrong executable and validates that special mode's complete required executable/metadata chain.
- Early classification does not itself invoke `verify_installation`; returning `None` starts the existing Plan A-wired normal Native Host, which later serves that action. Tests distinguish early continuation from the exact integrity response.
- Parent-window decimal parsing is lexical ASCII decimal plus nonnegative integer conversion; it is unrelated to positive-PID validation used by `--complete-update`.
- Every recognized mode has one pure validator that consumes the canonical entrypoint and complete argv and returns a frozen validated command. `REGISTER`, `INSTALL_PACKAGE`, `RECOVER_UPDATE`, `COMPLETE_UPDATE`, `RECOVER_ACTIVE`, `UPDATE_PROBE`, and status mode all complete role/basename, exact arity, raw identity text, fixed-chain, and path-authority validation before `production_early_mode_dependencies`, `registry_factory`, `recovery_factory`, `default_install_root`, `install_package`, `status_server`, `WindowsRegistryBackend`, `create_production_recovery_controller`, `CtypesWin32ProcessApi`, or any other dependency/controller/registry/process object can be constructed. `InitiatingProcessIdentity` itself is constructed only as the final successful `COMPLETE_UPDATE` validator step. The exact role matrix and no-factory ledger are frozen below.
- Imports and default arguments obey the same boundary: no module-scope instance of a dependency/controller/registry/process class and no instance-valued dataclass default is permitted in the early import closure. Dataclass dependencies use `field(default_factory=...)`; production objects exist only inside `production_early_mode_dependencies` after a validated invocation.
- A Plan C-owned invocation mismatch has one observable result: `EXIT_INVALID_ARGUMENTS == 2`, empty stdout, and exact stderr `b"invalid_early_invocation\n"`. Probe syntax/path or probe-entrypoint mismatch also exits `2`, but remains the sole wire exception: it emits Plan A's exact `b'{"error_code":"package_probe_failed","status":"error"}\n'` on stdout and empty stderr. No dynamic value, path, exception, or executable name is written.
- Plan C validates the `UPDATE_PROBE` entrypoint role and complete argv before invoking Plan A. Only fully valid probe argv is delegated unchanged to `dispatch_early_cli((entrypoint, *argv))`. Any malformed argv or wrong-role entrypoint is rejected without running the probe by calling Plan A once with the fixed malformed tuple `(absolute_entrypoint, "--update-probe")`; Plan C never serializes probe JSON and `run_update_probe` remains uncalled.
- One registration service preserves both modes: source development writes `host/host_manifest.json` for the absolute `host/launch_host.bat`, while frozen production writes sibling `manifest.json` with relative `dh_native_host.exe`. `register.py`, `--register`, Chrome, and Edge do not duplicate registry/manifest logic. `register.py` remains the source convenience. Direct source `dh_native_host.py --register` is the sole command fallback; `launch_host.bat` forwarding keeps that path available when deliberately invoked, though Chrome itself normally supplies an origin rather than `--register`.
- Unknown/no-command runner invocations and every status invocation with a recognized command are invalid; no detached executable can fall through to the normal Host.
- Shared Native Messaging framing is a compatibility refactor. `read_native_message(stream, *, max_payload_bytes=None)` preserves the main Host's existing uncapped codec behavior for Analyze traffic, while the status Host passes an explicit `64 * 1024` byte limit because its request schema is tiny. The writer contract is unchanged.
- Status mode is strictly read-only after early dispatch validation: no `UpdateEngine`, mutation mutex, registry write, RunOnce, receipt write, unlink, rename, or tree removal. The early validator may `lstat`/resolve only the fixed status executable chain; the status server then reads only `TransactionPaths.for_install(install_root, validated_id).journal` and projects allowlisted current `reason_code`. It never exposes `original_failure_code`, process identity, paths, hashes, or exceptions.
- Terminal finalization first reserves the installation's single active slot with strict atomic `updates/finalization-cursor.json` state `reserved`, writes its matching strict receipt, then atomically advances the same cursor to `receipt-ready` before unregistering status and calling Plan B `engine.finalize_terminal_evidence(transaction_id)`. Plan C does not delete journal/workspace/active itself. Receipt terminal identity is exactly Plan B `terminal_version(journal)`: committed existing is `{fresh_install:false, version:target}`, committed fresh is `{fresh_install:true, version:target}`, rolled-back existing is `{fresh_install:false, version:prior}`, and rolled-back fresh is `{fresh_install:true, version:null}`.
- `UPDATE_START` is blocked whenever that cursor target or its deterministic scratch exists; no second active finalization cursor/receipt is permitted.
- Finalization acknowledgment is crash-safe and bounded by exactly one cursor, at most one matching active receipt, one fixed last-ack slot at `updates/finalization-ack.json`, and deterministic scratch siblings only for cursor/receipt atomic writes. UUID/random names, an independently written acknowledgment record, receipt unlink, directory scan, and per-transaction tombstones are forbidden. A matching acknowledgment validates terminal cleanup, derives `ack_path = updates_root / "finalization-ack.json"`, then atomically calls exact `os.replace(receipt_path, ack_path)` on the same volume, flushes/fsyncs the moved file and both parent directories where supported, verifies that the fixed slot contains the matching receipt, and only then removes the matching cursor idempotently. A crash before the replace leaves the receipt as replay source; a crash after it leaves the matching ack slot as replay proof. Slot-matching replay remains successful until a later acknowledgment replaces the slot; an ID matching neither slot nor active cursor returns `finalization_not_current`.
- The moved slot preserves exact receipt bytes, including `state:"finalized-awaiting-ack"`; acknowledgment is represented by the fixed path, not by mutating JSON state.
- Same-ID replay from the slot is accepted only after terminal cleanup remains complete; slot bytes alone cannot bypass Plan B evidence cleanup.
- A different-ID finalization may construct only the mutex/filesystem adapters needed to read the stable cursor; it must return `finalization_ack_pending` before `registry`, `engine_factory`, unregister, receipt, ack-slot replacement, or cleanup operations. No newer transaction or finalization may begin until the old cursor and its deterministic scratch are gone. Once they are gone, a later transaction may reserve the cursor while the prior fixed ack remains; its acknowledgment replaces that slot only by moving its own receipt. This cannot orphan the old receipt because the old source receipt was already atomically moved and old-cursor cleanup was a prerequisite to the later reservation.
- Cursor identity/pending error takes precedence over reading terminal authority for the requested newer ID; missing newer authority cannot obscure the old barrier.
- That precedence does not erase the explicit slot-matching acknowledgment replay guarantee; it only prevents mutation under the newer ID.
- Product use remains available while finalization acknowledgment is pending. The frozen Plan D handoff requires `UPDATE_START` to call Plan C's pending-finalization barrier before allocating an ID, persisting a new runtime transaction, opening a package, or creating Plan B transaction authority; it remains blocked until acknowledgment has removed the cursor and cursor scratch, even when the fixed ack slot already matches after an interrupted move. The ack slot alone never blocks a later update.
- “No newer transaction” means no generated ID, persisted runtime marker, package open, Plan B workspace/active authority, recovery setup, or finalization cursor for another ID before old cursor cleanup.
- Plan C remains dormant with respect to update clicks and routing. It exposes preparation/recovery/finalization primitives and an exact installer dispatch dependency; Plan D activates `perform_update`, `activate_update`, coordinator logic, and synchronous installer routing.
- Use TDD for every production task. Automated tests use temporary install/package/preflight trees and injected process/probe/registry/clock/mutex APIs only; they never access a real PID, real registry, real AppData install, network, browser, or updater. Staged-preflight RED/GREEN/fault tests snapshot the live tree and assert `PREPARED`, no RunOnce write, no controller activation, and no live operation on every failure path.
- Every Python or frozen-Host process in verification gets a newly created root and six explicit, existing values for `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` before that process starts. Focused imports additionally set `PYTHONPATH=host`; discovery removes it.
- PyInstaller availability is proved only by `host/venv/Scripts/python.exe -m PyInstaller --version` returning exact version `6.18.0`. A `pyinstaller.exe` file check, PATH lookup, or source-level argv test is not a frozen-build PASS. If the module is absent, check `host/venv/Scripts/python.exe -m ensurepip --version`; running `-m ensurepip --upgrade` and then `-m pip install pyinstaller==6.18.0` is a separate toolchain/network mutation that requires explicit user approval before execution. No Plan C code or release flow installs it automatically.
- Missing PyInstaller does not block Plan C source implementation, source/unit/mutation gates, or commits. It does block the frozen onedir/module-graph/staged-probe gate, full Plan C verification, every completion claim, and Plan D activation. Record that state as `BLOCKED`, never `PASS`, until the exact module-version command and complete frozen gate, including the one real frozen staged-target probe, succeed.
- Do not publish, tag, push, install, version, create a release asset, or run a real updater. The real Win32/Chrome/RunOnce smoke remains a disposable-VM release gate.

---

## Authoritative Plan A/B Interfaces

Plan C imports these symbols directly and does not redefine them:

```python
from install_integrity import UpdateProbeResult
from early_cli import dispatch_early_cli
from package_archive import ValidatedPackage
from package_manifest import (
    ManifestEntry,
    OwnershipClass,
    UpdateManifest,
    canonical_json_bytes,
    load_update_manifest,
    sha256_bytes,
    sha256_file,
    update_manifest_to_dict,
)
from update_engine import UpdateEngine, UpdateEngineHooks
from update_journal import (
    FORWARD_FAILURE_CODES,
    ActiveTransaction,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    JournalValidationError,
    TerminalVersion,
    TransactionPaths,
    UpdateInitiator,
    UpdateJournal,
    parse_terminal_version,
    parse_transaction_id,
    read_active_transaction,
    read_journal,
    resolve_active_journal,
    terminal_version,
    terminal_version_to_value,
)
from update_mutex import (
    MutationMutex,
    UpdateAlreadyInProgress,
    create_windows_mutation_mutex,
)
from update_ownership import (
    OwnershipPlan,
    OwnershipSource,
    ownership_plan_sha256,
    read_ownership_plan,
)
```

The exact Plan A package fields consumed here are:

```python
@dataclass(frozen=True, order=True)
class ManifestEntry:
    path: str
    ownership: OwnershipClass
    sha256: str


@dataclass(frozen=True)
class UpdateManifest:
    schema_version: int
    package_version: str
    required_capabilities: tuple[str, ...]
    provided_capabilities: tuple[str, ...]
    chrome_version: str
    chrome_version_name: str | None
    entries: tuple[ManifestEntry, ...]
```

The exact Plan B durable fields consumed here are:

```python
@dataclass(frozen=True)
class InitiatingProcessIdentity:
    pid: int
    creation_token: str


@dataclass(frozen=True)
class TerminalVersion:
    version: str | None
    fresh_install: bool


@dataclass(frozen=True)
class TransactionPaths:
    install_root: Path
    updates_root: Path
    active: Path
    transactions_root: Path
    preparing_root: Path
    preparing_staged_root: Path
    preparing_staged_host: Path
    preparing_staged_extension: Path
    preparing_probe_manifest: Path
    preparing_ownership: Path
    preparing_journal: Path
    transaction_root: Path
    staged_root: Path
    staged_host: Path
    staged_extension: Path
    backup_root: Path
    host_backup: Path
    extension_backup: Path
    metadata_backup: Path
    failed_new_root: Path
    probe_root: Path
    probe_manifest: Path
    ownership: Path
    journal: Path


@dataclass(frozen=True)
class UpdateJournal:
    schema_version: int
    transaction_id: str
    phase: JournalPhase
    initiator: UpdateInitiator
    target_version: str
    prior_version: str | None
    fresh_install: bool
    ownership_path: str
    ownership_sha256: str
    initiating_process: InitiatingProcessIdentity | None
    seed_receipt: SeedOperationReceipt | None
    reason_code: JournalReason | None
    original_failure_code: JournalReason | None
    rollback_from: JournalPhase | None
```

Freeze these consumed signatures exactly:

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
UpdateEngine.activate_prepared(transaction_id: str, process_identity: InitiatingProcessIdentity | None) -> UpdateJournal
UpdateEngine.resume(transaction_id: str) -> UpdateJournal
UpdateEngine.rollback(transaction_id: str, failure_code: JournalReason) -> UpdateJournal
UpdateEngine.finalize_terminal_evidence(transaction_id: str) -> bool
read_ownership_plan(path: Path) -> OwnershipPlan
ownership_plan_sha256(plan: OwnershipPlan) -> str
```

Plan B hook shape is exact:

```python
@dataclass(frozen=True)
class UpdateEngineHooks:
    before_live_phase: Callable[[JournalPhase, TransactionPaths, OwnershipPlan], None]
    wait_for_initiating_host_exit: Callable[[InitiatingProcessIdentity], None]
    probe_installed_product: Callable[[Path, OwnershipPlan], None]
    before_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_journal_transition: Callable[[JournalPhase], None] = _ignore_transition
```

Before Task 1, run the signature/field probe through the isolated-process helper defined below and save its exact output:

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import inspect; from package_manifest import UpdateManifest; from update_journal import InitiatingProcessIdentity,TerminalVersion,TransactionPaths,UpdateJournal,parse_transaction_id,read_active_transaction,resolve_active_journal,read_journal,terminal_version,terminal_version_to_value,parse_terminal_version; from update_engine import UpdateEngine,UpdateEngineHooks; from update_ownership import ownership_plan_sha256,read_ownership_plan; symbols=(parse_transaction_id,read_active_transaction,resolve_active_journal,read_journal,TransactionPaths.for_install,terminal_version,terminal_version_to_value,parse_terminal_version,UpdateEngine.activate_prepared,UpdateEngine.resume,UpdateEngine.rollback,UpdateEngine.finalize_terminal_evidence,read_ownership_plan,ownership_plan_sha256,UpdateEngineHooks); [print(getattr(s,'__qualname__',s.__name__),inspect.signature(s)) for s in symbols]; [print(t.__name__,tuple(t.__dataclass_fields__)) for t in (UpdateManifest,InitiatingProcessIdentity,TerminalVersion,TransactionPaths,UpdateJournal)]"
)
```

Expected: exact signatures and field order above. Any `initiating_host_pid`, `recovery_root` field, missing `original_failure_code`, or non-`entries` package inventory blocks implementation.

### Execution Precondition

Run after the reviewed Plan A/B implementations and all five reviewed plan documents are committed:

```powershell
$plans = @(
  "docs/superpowers/plans/2026-07-18-hardening-a-package-integrity.md",
  "docs/superpowers/plans/2026-07-18-hardening-b-journal-engine.md",
  "docs/superpowers/plans/2026-07-18-hardening-c-detached-recovery.md",
  "docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md",
  "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"
)
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { throw "Plan C requires an empty index." }
foreach ($plan in $plans) {
    git ls-files --error-unmatch -- $plan | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Reviewed plan is not committed: $plan" }
}
if (@(git status --porcelain=v1).Count -ne 0) {
    throw "Plan C requires a clean worktree and index."
}
$env:PLAN_C_BASE = (git rev-parse HEAD).Trim()
$env:PLAN_A_IMPLEMENTATION_HEAD = (
    git log -1 --format=%H -- host/install_integrity.py host/package_manifest.py
).Trim()
$env:PLAN_B_IMPLEMENTATION_HEAD = (
    git log -1 --format=%H -- host/update_engine.py host/update_journal.py
).Trim()
if (
    -not $env:PLAN_C_BASE `
    -or -not $env:PLAN_A_IMPLEMENTATION_HEAD `
    -or -not $env:PLAN_B_IMPLEMENTATION_HEAD
) {
    throw "Could not capture Plan C prerequisite heads."
}
```

Expected: exit 0, clean status, and three nonempty full commit hashes. Record all three before product edits and preserve `PLAN_C_BASE` for every range gate.

## Frozen Plan D Handoff

Plan D must consume the completed Plan C result through these exact calls; its older draft names are not compatibility requirements:

```python
# UPDATE_START barrier: before allocating/persisting a transaction ID, opening
# a package, or creating Plan B transaction authority. Existing service
# composition and ordinary product actions remain available.
require_no_pending_finalization(install_root)

# Browser preparation: Plan B already persists probe metadata.
journal = engine.create_prepared(
    package,
    transaction_id,
    expected_version=selected_target,
    prior_version=current_version,
    initiator=UpdateInitiator.BROWSER,
)
paths = TransactionPaths.for_install(install_root, journal.transaction_id)
if load_update_manifest(paths.probe_manifest) != package.manifest:
    raise UpdateServiceError("update_prepare_failed")
controller = create_production_recovery_controller(install_root)
source = select_runner_source(
    RunnerSource.CURRENT,
    current_runtime_root,
    paths.staged_host,
)
# This Plan C boundary preflights before recovery-tree/browser-registry/live mutation.
recovery_root = controller.prepare_recovery_runtime(
    journal.transaction_id,
    source,
    registry,
)

# Browser activation: one complete current-process identity, no bare PID.
identity = process.capture_current_identity(install_root / "dh_native_host.exe")
launch_complete_update(process, recovery_root, paths, identity)
# The detached runner repeats the same preflight immediately before RunOnce
# arming and activate_prepared; a prior result is never a durable attestation.
controller.wait_until_ready(
    transaction_id,
    identity,
    timeout_seconds=30.0,
)

# Terminal cleanup and acknowledgment.
receipt = finalize_update_status(
    install_root,
    transaction_id,
    registry,
    engine_factory,
)
if not acknowledge_update_finalization(install_root, transaction_id):
    raise UpdateServiceError("update_cleanup_failed")

# Synchronous installer: persisted installer journal only.
installer_journal = engine.create_prepared(
    package,
    transaction_id,
    expected_version=trusted_target_or_none,
    prior_version=prior_version_or_none_only_for_fresh,
    initiator=UpdateInitiator.INSTALLER,
)
installer_paths = TransactionPaths.for_install(
    install_root, installer_journal.transaction_id
)
installer_controller = create_production_recovery_controller(install_root)
installer_source = select_runner_source(
    RunnerSource.STAGED,
    current_runtime_root,
    installer_paths.staged_host,
)
installer_controller.prepare_recovery_runtime(
    installer_journal.transaction_id,
    installer_source,
    None,
)
installer_result = installer_controller.run_installer_update(
    installer_journal.transaction_id
)
```

`preflight_prepared_target` is read-only with respect to the install and transaction workspace. It creates only one fresh view under the isolated process `TEMP`, proves that view is outside `install_root`, removes it before returning, and returns only while the journal is still the same `PREPARED` record. `prepare_recovery_runtime` is the sole Plan D-facing boundary for recovery-tree/status preparation: it calls that preflight, rereads the same prepared authority, then and only then calls the lower-level Task 4 tree-install primitive; browser mode subsequently registers status, while installer mode explicitly performs no registration. Both `run_complete_update` and `run_installer_update` invoke preflight again themselves before process-handle open, RunOnce, or `activate_prepared`; callers cannot bypass the activation-time gate by omitting the preparation-time call. This ensures Plan D performs no recovery-tree replacement, browser status registration, or other live-install mutation for an unstartable target and closes staged-byte TOCTOU before activation. The `require_no_pending_finalization` call shown above is an additional precondition and occurs before `engine.create_prepared`; it does not replace either staged preflight.

Plan D must place that barrier in the coordinator's serialized
`DH_UPDATE_START` operation before its first durable runtime write and again in
`UpdateService.prepare` before package open/`engine.create_prepared`. The first
check prevents browser-side intent allocation; the second is the authoritative
Host-side race closure. Both use the same Plan C function, and tests inject an
acknowledgment between them to prove the second check either passes cleanly or
returns the same `finalization_ack_pending` code.

The Host-side barrier and subsequent `engine.create_prepared` use separate
mutex acquisitions. Plan D must close the check-to-create race at its
serialized update-service boundary: no finalization call may begin between the
last barrier check and `create_prepared`, and both paths share the same service
operation queue plus installation mutex discipline. Tests pause at that seam,
attempt concurrent finalization, and require either finalization wins and
preparation creates nothing, or preparation wins and finalization sees the new
active authority; never both cursor and a newer prepared transaction. Do not
treat two unrelated sequential checks as atomic by themselves.

The currently reviewed Plan D draft already consumes
`RecoveryController.prepare_recovery_runtime(transaction_id, source,
registry)` for browser and `(..., None)` for installer and its static gates
forbid direct `install_recovery_tree`/`register_status_host` calls. Preserve
that alignment. Its remaining blocker from this review is that it does not
block `UPDATE_START` on Plan C's cursor. This Plan C revision intentionally
does not edit Plan D. Plan D execution is blocked until its interface probe,
dependency protocol, service/coordinator call order, tests, error mapping, and
static scans invoke `require_no_pending_finalization` before any new
update-start allocation/persistence/package/transaction side effect at both
coordinator and Host prepare boundaries. Add
exact wire code `finalization_ack_pending` to Plan D's fixed allowlist and map
the Plan C error to that unchanged code. The coordinator retains
`dh_update_runtime` and resumes its pending completion/ack workflow; it does
not allocate or persist a new transaction. Keep ordinary product actions
enabled and retry/resume the prior acknowledgment rather than replacing its
cursor. This is required contract
alignment, not compatibility cleanup.

Its older prose that calls `finalization-ack.json` a cursor is wrong: the
cursor is `finalization-cursor.json`; `finalization-ack.json` is the fixed moved
receipt slot. Plan D must correct that terminology wherever it implements this
handoff.
Likewise, Plan D's phrase “product use does not wait for receipt deletion” must
be understood as “ordinary product actions remain enabled”; acknowledgment
does not delete the receipt, it moves it, and `UPDATE_START` still waits for
cursor cleanup.
Its statement that every “wrong/delayed” ID rejects is also too broad: a
delayed ID equal to the still-current fixed slot succeeds read-only until a
later acknowledgment replaces that slot; an ID matching neither slot nor
active cursor rejects.

Plan D must also update its exhaustive `FinalizationError._ALLOWED` mapping for
the revised Plan C set. Map `transaction_not_terminal -> update_not_terminal`;
map `active_transaction_mismatch`, `invalid_finalization_receipt`,
`invalid_finalization_cursor`, `invalid_finalization_acknowledgment`,
`finalization_cleanup_failed`, `finalization_cleanup_incomplete`, and
`finalization_record_round_trip_failed -> update_cleanup_failed`; preserve
`finalization_not_current`; keep `finalization_ack_pending` distinct. Remove
the obsolete acknowledged/ack-round-trip members from Plan D's map.
Plan D tests iterate the exact Plan C `_ALLOWED` set so no stale member or
unmapped future member is silently accepted.
`invalid_finalization_cursor` is included explicitly; Plan D's older mapping
omitted it.
No raw `OSError`, path, or exception text reaches the Plan D wire mapping.

Plan D's interface ledger imports `FinalizationReceipt`, `FinalizationCursor`,
`FINALIZATION_CURSOR_STATES`, and `require_no_pending_finalization`; there is no
`FinalizationAck` type. It asserts both finalization record field tuples, exact
cursor states, and the exact barrier signature.
It may import `load_finalization_ack` only in Python tests; production Plan D
never reads the slot directly.
`FinalizationCursor.state` is exactly `reserved|receipt-ready`; the fixed ack
slot contains moved canonical `FinalizationReceipt` bytes and has no separate
schema or acknowledged state. No cursor or ack-slot record is sent to the
Extension; the wire receipt remains exactly `finalized-awaiting-ack`.
Plan D's TypeScript parser continues to parse only that wire receipt; it does
not parse either internal cursor state or the ack-slot file.
The ack slot's bytes still contain wire state `finalized-awaiting-ack`; the
filename/location, not a rewritten state field, records acknowledgment.

Plan D's `UpdateServiceFinalizationTests` add reserved-cursor, receipt-ready
cursor+receipt, receipt-ready cursor+matching-ack/no-receipt, same-ID replay,
wrong-ID, later-transaction ack-slot replacement, and
`finalization_ack_pending` mappings. They do not hand-write Plan B
journal/active authority except through Plan C's injected finalization fixture.
They also assert acknowledgment invokes Plan C once with the persisted old ID
and never allocates a replacement ID while that call is pending/retrying.
Add an ack-only start fixture proving Plan D does not call acknowledgment or
remove the slot merely to start a later transaction.
Add a matching-ack-plus-cursor-scratch fixture proving `UPDATE_START` remains
blocked until Plan C acknowledgment replay normalizes/removes the cursor.
Its delayed-old-ID test must expect `True` while the slot still contains the old
receipt, then `finalization_not_current` after the newer acknowledgment replaces
the slot.
Likewise, Plan D's generic “wrong ID” cases must use an ID matching neither
cursor nor slot; a slot match is replay success, not a wrong ID.

Plan D tests are exact: either cursor state and cursor-scratch fixtures make
payload-free `DH_UPDATE_START` return `finalization_ack_pending` before ID
generation, `dh_update_runtime` preparation write, package open, or
`create_prepared`; Host `UpdateService.prepare` independently rejects before
its package source/engine/controller calls. After matching acknowledgment
has atomically moved the receipt into the fixed ack slot and removed the
cursor/scratch, the same start succeeds. An ack slot without a cursor does not
block start. Analyze/config/health actions remain allowed throughout.

A cursor-scratch fixture blocks regardless of whether the fixed slot exists;
matching acknowledgment replay is the only call allowed to settle that state.
An ack-slot-only fixture is not pending and `DH_UPDATE_START` succeeds without
Plan D deleting or rewriting the slot.

The Plan D race test must also pause acknowledgment immediately after the
receipt-to-slot replace and before cursor removal. Both coordinator and Host
prepare barriers still reject a newer start in that window. Only after replay
removes the old cursor may the newer start allocate/persist anything.

The coordinator-side and Host-side barriers must use the same canonical
`install_root` as Plan C finalization. No updates-root or browser-supplied path
argument is permitted.

Plan D removes every reference to the obsolete process-backend name, the obsolete bare initiating-PID field, any Plan C probe-manifest writer, any recovery-root field on `TransactionPaths`, scalar receipt `version`, an updates-root finalization argument, a `FinalizationAck` model, and a separately written ack record. Its wire receipt is exactly:

```json
{
  "transactionId": "0123456789abcdef0123456789abcdef",
  "outcome": "rolled-back",
  "terminal_version": {"fresh_install": true, "version": null},
  "state": "finalized-awaiting-ack"
}
```

The exact Plan B table is frozen in Plan D too: committed existing is
`{fresh_install:false,version:target}`, committed fresh is
`{fresh_install:true,version:target}`, rolled-back existing is
`{fresh_install:false,version:prior}`, and rolled-back fresh is
`{fresh_install:true,version:null}`. Plan D persists this complete nested
object in its browser completion marker before acknowledgment; it never
reconstructs terminal identity from a deleted workspace. Product use resumes
after the post-reload gate as already designed, but payload-free
`DH_UPDATE_START` fails safely while `require_no_pending_finalization` reports
`finalization_ack_pending`. The gate opens only after acknowledgment moves the
receipt to `finalization-ack.json` and removes `finalization-cursor.json`.
Analyze/config/health remain available in this window; only creation/preparation
of a newer update is barred.
This does not weaken Plan D's separate post-reload capability/integrity gate;
it narrows only the finalization barrier's scope.

Plan D must preserve the ack-slot barrier exactly. It cannot allocate or
persist a later transaction while the old cursor exists, even if the move has
already made the matching ack slot visible. After cursor cleanup, same-ID ack
replay succeeds from that fixed slot, including while a newer transaction or
cursor exists, until the newer acknowledgment replaces the slot; it is
read-only and never touches the newer cursor. An ID matching neither current
cursor nor slot rejects. A later
transaction may replace the slot only by atomically moving its own receipt
after it acquired the now-free cursor; this cannot orphan the older receipt,
because that older source was already moved and its cursor cleanup was the
prerequisite for starting the later transaction.
This barrier applies to browser and synchronous-installer creation paths alike;
neither may create a new Plan B transaction around an old cursor.
Plan D's `run_install_package` absent-authority branch must call the same barrier
before generator/package-preparation side effects; resume of the old matching
terminal transaction remains allowed so it can finalize/acknowledge.

Plan D's handoff terminology is exact: “cursor” always means
`finalization-cursor.json`; “ack slot” always means `finalization-ack.json`;
“receipt” means `updates/receipts/<id>.json` before it is moved.
Plan D must remove tests/text expecting the source receipt to be unlinked after
a separately written acknowledgment.

The service must treat `acknowledge_update_finalization(...) is True` as the
only acknowledgment success. It persists the complete receipt/completion
marker before that call, retains the marker and old transaction ID across any
exception or lost response, and retries the same ID. It never interprets an
ack-slot file in TypeScript or invents success from browser storage; Plan C is
the sole cursor/receipt/slot authority.
Plan D never waits for or deletes a receipt path itself; it only waits for Plan
C's boolean result and cursor barrier to clear.

Plan D's finalization tests freeze the same four terminal identities as Plan C,
including committed fresh `{fresh_install:true,version:target}`. Its parser
must not collapse all `fresh_install:true` values to null-version rollback.
Use one literal parser/serializer test row per identity, not only the browser
non-fresh subset plus a fresh-rollback fixture.
The committed-fresh row is relevant to synchronous installer finalization even
though browser self-update normally has a prior version.

Plan D does not expose `finalization_ack_pending` as a generic protected-action
gate: Analyze/config/health continue through their existing capability gate.
Only update-start allocation/prepare is denied; finalize/ack/recovery actions
remain callable so the condition can clear.

## File Map And Exact Test Classes

| File | Change | Responsibility |
|---|---|---|
| `host/native_messaging.py` | Create | Shared little-endian Native Messaging framing with a caller-selected inbound limit over injected streams. |
| `host/test_native_messaging.py` | Create, then modify in Task 8 | `NativeMessagingTests`, `NativeHostFramingIntegrationTests`. |
| `host/native_registration.py` | Create | One source/frozen/status manifest and injected HKCU registration service. |
| `host/test_native_registration.py` | Create | `NativeRegistrationTests`, `WindowsRegistrationSourceTests`. |
| `host/update_platform.py` | Create | Strict probe parser, injected Win32 process adapter, clock, command quoting, and RunOnce. |
| `host/test_update_platform.py` | Create | `ProbeProcessTests`, `ProcessAdapterTests`, `Win32ProcessApiTests`, `RunOnceTests`. |
| `host/update_recovery.py` | Create | Exact staged Host/Extension probe view, complete reusable runtime installation, Plan B hook composition, RunOnce recovery, and bounded finalization records. |
| `host/test_update_recovery.py` | Create | `RecoveryTreeTests`, `StagedHostPreflightTests`, `RecoveryRunnerTests`, `InstallerRecoveryTests`, `FinalizationTests`, `FinalizationWindowsDurabilityTests`. |
| `host/update_status_host.py` | Create | Chrome argv validation and read-only journal Native Host. |
| `host/test_update_status_host.py` | Create | `StatusArgTests`, `StatusProtocolTests`, `StatusReadOnlyTests`. |
| `host/update_entrypoint.py` | Create | Side-effect-free command/basename selection, full argument/path validation, Plan A probe delegation, then dependency dispatch. |
| `host/test_update_entrypoint.py` | Create | `EntrypointSelectionTests`, `EntrypointDispatchTests`, `EntrypointDependencyTests`, including malformed-command no-factory tests. |
| `host/test_early_update_dispatch.py` | Create | `EarlyDispatchIsolationTests`, including exact malformed-probe JSON/exit/no-side-effect process tests. |
| `host/test_early_cli.py` | Modify in Task 8 | Preserve Plan A pure `dispatch_early_cli` subprocess coverage through a test-only source shim after integrated source Host probe mode becomes invalid. |
| `host/dh_native_host.py` | Modify | Invoke one early dispatcher first and reuse framing/registration without changing legacy update routing. |
| `host/register.py` | Modify | Thin source-registration CLI over `native_registration`. |
| `host/launch_host.bat` | Modify | Preserve the source wrapper and forward Chrome argv to Python. |
| `release_helper.py` | Modify | Add explicit CLI hidden imports to the venv Python module-form PyInstaller flow; no checked spec and no provisioning side effect. |
| `host/test_release_helper.py` | Modify | `PlanCPackagingTests`, including a pure source-level build-argv/hidden-import test that runs when PyInstaller and pip are absent. |
| `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `docs/session-handoff-2026-07-15.md`, `releases/notes-prompt-scope-cleanup-draft.md` | Modify | Exact dormant Plan C behavior and Plan D handoff. |
| `.superpowers/sdd/hardening-c-detached-recovery-report.md` | Create | Heads, signatures, RED/GREEN/mutations/build/static evidence. |

No `*.spec` file is added. Repository `.gitignore` already ignores `*.spec`; PyInstaller's generated CLI spec remains ignored build output.
This plan revision changes only Plan C; the Plan D requirements above are its
handoff contract, not an edit to the Plan D document.

---

## Isolated Process Harness

Define these functions in each PowerShell session before running any command below. Every invocation creates all six profile/temp directories before starting exactly one child process, restores the caller environment, and removes that invocation's root afterward:

```powershell
function Invoke-IsolatedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [switch]$NoPythonPath,
        [switch]$ExpectFailure
    )
    $root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" (
        "dh-plan-c-process-" + [guid]::NewGuid().ToString("N")
    )
    $values = @{
        LOCALAPPDATA = Join-Path $root "local"
        APPDATA = Join-Path $root "roaming"
        USERPROFILE = Join-Path $root "profile"
        HOME = Join-Path $root "home"
        TEMP = Join-Path $root "temp"
        TMP = Join-Path $root "tmp"
    }
    $saved = @{}
    $savedPythonPath = $env:PYTHONPATH
    $priorExitCode = $global:LASTEXITCODE
    New-Item -ItemType Directory -Force $root | Out-Null
    foreach ($name in $values.Keys) {
        $saved[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
        New-Item -ItemType Directory -Force $values[$name] | Out-Null
        [Environment]::SetEnvironmentVariable($name, $values[$name], "Process")
    }
    if ($NoPythonPath) {
        Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
    } else {
        $env:PYTHONPATH = "host"
    }
    try {
        & $FilePath @ArgumentList
        $code = $LASTEXITCODE
        if ($ExpectFailure) {
            if ($code -eq 0) {
                throw "Expected child process failure, but it exited 0: $FilePath"
            }
        } elseif ($code -ne 0) {
            throw "Child process exited $code: $FilePath"
        }
    } finally {
        foreach ($name in $values.Keys) {
            [Environment]::SetEnvironmentVariable($name, $saved[$name], "Process")
        }
        if ($null -eq $savedPythonPath) {
            Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
        } else {
            $env:PYTHONPATH = $savedPythonPath
        }
        $global:LASTEXITCODE = $priorExitCode
        Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-IsolatedPython {
    param(
        [Parameter(Mandatory = $true)][string[]]$PythonArgs,
        [switch]$NoPythonPath,
        [switch]$ExpectFailure
    )
    Invoke-IsolatedCommand `
        -FilePath "host/venv/Scripts/python.exe" `
        -ArgumentList $PythonArgs `
        -NoPythonPath:$NoPythonPath `
        -ExpectFailure:$ExpectFailure
}
```

The harness itself is evidence: each child gets different absolute values for `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP`; no command relies on variables inherited from a prior test process.

### Task 1: Compatibility-Preserving Shared Native Messaging Framing

**Files:**
- Create: `host/native_messaging.py`
- Create: `host/test_native_messaging.py`

**Interfaces:**
- Produces `NativeMessageError`, `read_native_message(stream: BinaryIO, *, max_payload_bytes: int | None = None) -> dict[str, object] | None`, and the unchanged `write_message(stream: BinaryIO, message: dict[str, object], *, max_bytes: int = 1_048_576) -> None`.

- [ ] **Step 1: Write RED framing tests**

Create exact class `NativeMessagingTests` with clean EOF, truncated header/body, zero length, caller-limited oversize length, invalid UTF-8, duplicate key, non-finite value, non-object JSON, unchanged writer serialization/oversize behavior, one flush, and these peer-sensitive endian tests. Import `io`, `json`, `struct`, and `unittest`, plus `MAX_MESSAGE_BYTES`, `NativeMessageError`, `read_native_message`, and `write_message` from `native_messaging`. Reader oversize coverage passes an explicit limit; no test assumes a default inbound cap:

```python
class NativeMessagingTests(unittest.TestCase):
    def test_little_endian_writer_round_trips_through_little_endian_reader(self):
        output = FlushBytesIO()
        message = {"requestId": "r1", "status": "success"}
        write_message(output, message)
        raw = output.getvalue()
        self.assertEqual(struct.unpack("<I", raw[:4])[0], len(raw[4:]))
        self.assertEqual(read_native_message(io.BytesIO(raw)), message)
        self.assertEqual(output.flush_count, 1)

    def test_reader_accepts_a_little_endian_peer_frame(self):
        payload = b'{"action":"ping"}'
        frame = struct.pack("<I", len(payload)) + payload
        self.assertEqual(
            read_native_message(io.BytesIO(frame)),
            {"action": "ping"},
        )

    def test_default_reader_accepts_analyze_payload_larger_than_one_mib(self):
        message = {
            "action": "analyze_error",
            "requestId": "large-analyze",
            "payload": {"prompt": "x" * (MAX_MESSAGE_BYTES + 1)},
        }
        payload = json.dumps(
            message,
            ensure_ascii=True,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
        self.assertGreater(len(payload), MAX_MESSAGE_BYTES)
        frame = struct.pack("<I", len(payload)) + payload

        self.assertEqual(
            read_native_message(io.BytesIO(frame)),
            message,
        )

    def test_invalid_writer_writes_nothing(self):
        output = io.BytesIO()
        with self.assertRaisesRegex(NativeMessageError, "invalid_native_message"):
            write_message(output, {"value": object()})
        self.assertEqual(output.getvalue(), b"")
```

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_native_messaging","-v") -ExpectFailure`

Expected: nonzero with missing `native_messaging`.

- [ ] **Step 3: Implement shared framing without changing main inbound behavior**

Use exact built-in dict validation, duplicate-key rejection, `allow_nan=False`, no coercion, and these bodies:

```python
MAX_MESSAGE_BYTES = 1_048_576


class NativeMessageError(ValueError):
    def __init__(self, error_code: str) -> None:
        self.error_code = error_code
        super().__init__(error_code)


def _reject_constant(_value: str) -> object:
    raise ValueError("non_finite_json_number")


def _reject_duplicate_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_json_key")
        result[key] = value
    return result


def read_native_message(
    stream: BinaryIO,
    *,
    max_payload_bytes: int | None = None,
) -> dict[str, object] | None:
    header = stream.read(4)
    if header == b"":
        return None
    if len(header) != 4:
        raise NativeMessageError("truncated_native_header")
    size = struct.unpack("<I", header)[0]
    if size == 0:
        raise NativeMessageError("empty_native_message")
    if max_payload_bytes is not None and size > max_payload_bytes:
        raise NativeMessageError("native_message_too_large")
    payload = stream.read(size)
    if len(payload) != size:
        raise NativeMessageError("truncated_native_message")
    try:
        value = json.loads(
            payload.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
    except (UnicodeDecodeError, ValueError) as error:
        raise NativeMessageError("invalid_native_message") from error
    if type(value) is not dict:
        raise NativeMessageError("native_message_must_be_object")
    return value


def write_message(
    stream: BinaryIO,
    message: dict[str, object],
    *,
    max_bytes: int = MAX_MESSAGE_BYTES,
) -> None:
    if type(message) is not dict:
        raise NativeMessageError("native_message_must_be_object")
    try:
        payload = json.dumps(
            message,
            ensure_ascii=True,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
    except (TypeError, ValueError, OverflowError) as error:
        raise NativeMessageError("invalid_native_message") from error
    if len(payload) == 0 or len(payload) > max_bytes:
        raise NativeMessageError("native_message_too_large")
    stream.write(struct.pack("<I", len(payload)))
    stream.write(payload)
    stream.flush()
```

The `<I` prefix is explicitly little-endian and unsigned, so a decoded negative length is impossible and no signed-length branch is added. When `max_payload_bytes` is not `None`, the limit check occurs before `stream.read(size)`. Keep `write_message` exactly as shown, including its existing `MAX_MESSAGE_BYTES` default and serialization behavior; this revision changes only inbound limit selection.

- [ ] **Step 4: Run GREEN and real endian mutations**

Run the full class and expect `OK`. Then perform two separate restored mutations:

1. Change only writer `struct.pack("<I", len(payload))` to `struct.pack(">I", len(payload))`; leave reader `<I`; run `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_native_messaging.NativeMessagingTests.test_little_endian_writer_round_trips_through_little_endian_reader","-v") -ExpectFailure`, then restore.
2. Change only reader `struct.unpack("<I", header)` to `struct.unpack(">I", header)`; leave the peer frame `<I`; run `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_native_messaging.NativeMessagingTests.test_reader_accepts_a_little_endian_peer_frame","-v") -ExpectFailure`, then restore.

Rerun the full class and require `OK`. Do not use native `@I`, which is little-endian on the target machine and does not prove the framing contract.

- [ ] **Step 5: Commit**

```powershell
git add host/native_messaging.py host/test_native_messaging.py
git commit -m "feat(update): isolate native message framing"
```

### Task 2: One Source/Frozen Native Registration Service

**Files:**
- Create: `host/native_registration.py`
- Create: `host/test_native_registration.py`
- Modify: `host/register.py`
- Modify: `host/launch_host.bat`

**Interfaces:**
- Produces `MAIN_HOST_NAME`, `STATUS_HOST_NAME`, `ALLOWED_ORIGINS`, `MainHostRuntime`, `RegistryBackend`, `WindowsRegistryBackend`, `register_main_host(host_root: Path, registry: RegistryBackend, runtime: MainHostRuntime) -> Path`, `register_status_manifest(recovery_root: Path, registry: RegistryBackend) -> Path`, and `unregister_host(registry: RegistryBackend, name: str) -> None`; tests define `MemoryRegistryBackend` against that exact protocol.

- [ ] **Step 1: Write RED source/frozen/status tests**

Use exact class names and assertions:

```python
class NativeRegistrationTests(unittest.TestCase):
    def test_source_registration_preserves_batch_and_host_manifest(self):
        make_source_host(self.root)
        registry = MemoryRegistryBackend()
        path = register_main_host(self.root, registry, MainHostRuntime.SOURCE)
        value = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(path, (self.root / "host_manifest.json").resolve())
        self.assertEqual(value["path"], str((self.root / "launch_host.bat").resolve()))
        self.assertEqual(registry.get_native_host(MAIN_HOST_NAME), path)

    def test_frozen_registration_uses_relative_executable_and_manifest(self):
        make_frozen_host(self.root)
        registry = MemoryRegistryBackend()
        path = register_main_host(self.root, registry, MainHostRuntime.FROZEN)
        value = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(path, (self.root / "manifest.json").resolve())
        self.assertEqual(value["path"], "dh_native_host.exe")

    def test_runtime_mode_never_silently_falls_back(self):
        make_source_host(self.root)
        with self.assertRaisesRegex(RuntimeError, "main_host_executable_missing"):
            register_main_host(
                self.root, MemoryRegistryBackend(), MainHostRuntime.FROZEN
            )

    def test_source_wrapper_forwards_browser_arguments(self):
        source = Path("host/launch_host.bat").read_text(encoding="utf-8")
        invocation = next(
            line for line in source.splitlines()
            if "dh_native_host.py" in line and "python.exe" in line
        )
        self.assertIn('"%~dp0dh_native_host.py" %*', invocation)

    def test_status_registration_requires_two_executables_and_internal(self):
        make_complete_recovery_tree(self.root)
        path = register_status_manifest(self.root, MemoryRegistryBackend())
        self.assertEqual(
            json.loads(path.read_bytes())["path"], "dh_update_status_host.exe"
        )
```

Also test canonical ASCII JSON plus newline/no BOM, exact origins, Chrome/Edge split-brain rejection before writes, partial-write restoration, idempotent unregister, source missing `launch_host.bat`, status missing either executable, status empty `_internal`, and registry read-back mismatch. `WindowsRegistrationSourceTests` inspects the lazy adapter and requires HKCU, `REG_SZ`, both browser keys, and context-managed closure; it forbids HKLM.

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_native_registration","-v") -ExpectFailure`

Expected: nonzero with missing `native_registration`.

- [ ] **Step 3: Implement exact registration modes**

Freeze values and manifest selection:

```python
MAIN_HOST_NAME = "com.dynamics.helper.native"
STATUS_HOST_NAME = "com.dynamics.helper.update_status"
ALLOWED_ORIGINS = (
    "chrome-extension://aiimcjfjmibedicmckpphgbddankgdln/",
    "chrome-extension://fkemelmlolmdnldpofiahmnhngmhonno/",
)
BROWSER_KEY_PREFIXES = (
    r"Software\Google\Chrome\NativeMessagingHosts",
    r"Software\Microsoft\Edge\NativeMessagingHosts",
)


class MainHostRuntime(StrEnum):
    SOURCE = "source"
    FROZEN = "frozen"


class RegistryBackend(Protocol):
    def read_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> Path | None:
        raise AssertionError("registry protocol method")

    def write_native_host(
        self,
        key_prefix: str,
        name: str,
        manifest_path: Path,
    ) -> None:
        raise AssertionError("registry protocol method")

    def delete_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> None:
        raise AssertionError("registry protocol method")


class WindowsRegistryBackend:
    @staticmethod
    def _subkey(key_prefix: str, name: str) -> str:
        if key_prefix not in BROWSER_KEY_PREFIXES:
            raise ValueError("invalid_browser_registry_key")
        if name not in (MAIN_HOST_NAME, STATUS_HOST_NAME):
            raise ValueError("invalid_native_host_name")
        return f"{key_prefix}\\{name}"

    def read_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> Path | None:
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                self._subkey(key_prefix, name),
                0,
                winreg.KEY_QUERY_VALUE,
            ) as key:
                value, kind = winreg.QueryValueEx(key, "")
        except FileNotFoundError:
            return None
        if kind != winreg.REG_SZ or type(value) is not str or not value:
            raise RuntimeError("native_registration_invalid_value")
        return Path(value).resolve(strict=False)

    def write_native_host(
        self,
        key_prefix: str,
        name: str,
        manifest_path: Path,
    ) -> None:
        import winreg

        with winreg.CreateKeyEx(
            winreg.HKEY_CURRENT_USER,
            self._subkey(key_prefix, name),
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE,
        ) as key:
            winreg.SetValueEx(
                key, "", 0, winreg.REG_SZ, str(manifest_path.resolve())
            )

    def delete_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> None:
        import winreg

        try:
            winreg.DeleteKey(
                winreg.HKEY_CURRENT_USER,
                self._subkey(key_prefix, name),
            )
        except FileNotFoundError:
            return


def register_main_host(
    host_root: Path,
    registry: RegistryBackend,
    runtime: MainHostRuntime,
) -> Path:
    root = require_plain_root(host_root)
    if type(runtime) is not MainHostRuntime:
        raise ValueError("invalid_main_host_runtime")
    if runtime is MainHostRuntime.FROZEN:
        executable = root / "dh_native_host.exe"
        if not is_plain_regular_file(executable):
            raise RuntimeError("main_host_executable_missing")
        manifest = root / "manifest.json"
        host_path = executable.name
    else:
        executable = root / "launch_host.bat"
        if not is_plain_regular_file(executable):
            raise RuntimeError("source_host_launcher_missing")
        manifest = root / "host_manifest.json"
        host_path = str(executable.resolve(strict=True))
    return _register_manifest(
        registry,
        MAIN_HOST_NAME,
        manifest,
        host_path,
        "Dynamics Helper Native Host",
    )


def register_status_manifest(
    recovery_root: Path,
    registry: RegistryBackend,
) -> Path:
    root = require_plain_root(recovery_root)
    require_complete_status_runtime(root)
    return _register_manifest(
        registry,
        STATUS_HOST_NAME,
        root / "status-manifest.json",
        "dh_update_status_host.exe",
        "Dynamics Helper Update Status Host",
    )
```

Use these exact shared helpers:

```python
def _manifest_value(
    name: str,
    description: str,
    host_path: str,
) -> dict[str, object]:
    return {
        "name": name,
        "description": description,
        "path": host_path,
        "type": "stdio",
        "allowed_origins": list(ALLOWED_ORIGINS),
    }


def _write_atomic_json(path: Path, value: dict[str, object]) -> None:
    payload = (
        json.dumps(
            value,
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")
    sibling = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with sibling.open("xb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(sibling, path)
    except Exception:
        sibling.unlink(missing_ok=True)
        raise


def _read_values(
    registry: RegistryBackend,
    name: str,
) -> tuple[Path | None, Path | None]:
    return tuple(
        registry.read_native_host(prefix, name)
        for prefix in BROWSER_KEY_PREFIXES
    )


def _restore_values(
    registry: RegistryBackend,
    name: str,
    prior: tuple[Path | None, Path | None],
) -> None:
    for prefix, value in zip(BROWSER_KEY_PREFIXES, prior, strict=True):
        registry.delete_native_host(prefix, name)
        if value is not None:
            registry.write_native_host(prefix, name, value)
        if registry.read_native_host(prefix, name) != value:
            raise RuntimeError("native_registration_restore_failed")


def _register_manifest(
    registry: RegistryBackend,
    name: str,
    manifest_path: Path,
    host_path: str,
    description: str,
) -> Path:
    if name not in (MAIN_HOST_NAME, STATUS_HOST_NAME):
        raise ValueError("invalid_native_host_name")
    prior = _read_values(registry, name)
    if prior[0] != prior[1]:
        raise RuntimeError("native_registration_split_brain")
    existed = manifest_path.exists()
    prior_manifest = manifest_path.read_bytes() if existed else None
    _write_atomic_json(
        manifest_path,
        _manifest_value(name, description, host_path),
    )
    resolved = manifest_path.resolve(strict=True)
    try:
        for prefix in BROWSER_KEY_PREFIXES:
            registry.write_native_host(prefix, name, resolved)
            if registry.read_native_host(prefix, name) != resolved:
                raise RuntimeError("native_registration_round_trip_failed")
    except Exception as error:
        restore_errors: list[Exception] = []
        try:
            _restore_values(registry, name, prior)
        except Exception as restore_error:
            restore_errors.append(restore_error)
        try:
            if prior_manifest is None:
                manifest_path.unlink(missing_ok=True)
            else:
                _write_atomic_bytes(manifest_path, prior_manifest)
        except Exception as restore_error:
            restore_errors.append(restore_error)
        if restore_errors:
            raise ExceptionGroup(
                "native_registration_restore_failed",
                [error, *restore_errors],
            )
        raise RuntimeError("native_registration_failed") from error
    return resolved


def unregister_host(registry: RegistryBackend, name: str) -> None:
    if name not in (MAIN_HOST_NAME, STATUS_HOST_NAME):
        raise ValueError("invalid_native_host_name")
    prior = _read_values(registry, name)
    if prior[0] != prior[1]:
        raise RuntimeError("native_registration_split_brain")
    try:
        for prefix in BROWSER_KEY_PREFIXES:
            registry.delete_native_host(prefix, name)
            if registry.read_native_host(prefix, name) is not None:
                raise RuntimeError("native_unregistration_round_trip_failed")
    except Exception as error:
        try:
            _restore_values(registry, name, prior)
        except Exception as restore_error:
            raise ExceptionGroup(
                "native_registration_restore_failed",
                [error, restore_error],
            )
        raise RuntimeError("native_registration_failed") from error
```

`_write_atomic_bytes` is the same unique-sibling/flush/fsync/replace pattern without JSON serialization. `_register_manifest` writes canonical UTF-8/no-BOM JSON, updates both HKCU registrations, and requires equal read-back. `MemoryRegistryBackend` in tests implements the three protocol methods with per-browser state and failure injection. `require_plain_root`, `is_plain_regular_file`, and `require_complete_status_runtime` use `lstat` and reject Windows `FILE_ATTRIBUTE_REPARSE_POINT`; status requires both executable siblings and at least one plain regular `_internal` descendant before manifest mutation.

Replace `register.py` with a thin source CLI that calls `register_main_host(Path(__file__).resolve().parent, WindowsRegistryBackend(), MainHostRuntime.SOURCE)`. Production `--register` in Task 8 calls the same function with `FROZEN`. Preserve the existing source wrapper behavior but forward Chrome's normal launch arguments by changing only its Python invocation to:

```bat
"%~dp0venv\Scripts\python.exe" -u "%~dp0dh_native_host.py" %* 2>> "%USERPROFILE%\dhnativehost_error.log"
```

The source manifest continues to point to the absolute `launch_host.bat`; the frozen manifest continues to point to relative `dh_native_host.exe`. No registration logic remains in `register.py` or `dh_native_host.py`.

- [ ] **Step 4: Run GREEN and fallback mutation**

Run the full registration suite and `host.test_version_parse`; expect `OK`. Temporarily make frozen mode fall back to `launch_host.bat`, run `test_runtime_mode_never_silently_falls_back`, require nonzero, restore, and rerun.

- [ ] **Step 5: Commit**

```powershell
git add host/native_registration.py host/test_native_registration.py host/register.py host/launch_host.bat
git commit -m "feat(host): unify native registration modes"
```

### Task 3: Strict Probe Parsing, Injected Win32 Processes, And RunOnce

**Files:**
- Create: `host/update_platform.py`
- Create: `host/test_update_platform.py`

**Interfaces:**
- Produces `RetainedProcessHandle`, `ProcessAdapter`, `WindowsProcessAdapter`, `CtypesWin32ProcessApi`, `ProbeProcessAdapter`, `SubprocessProbeAdapter`, `Clock`, `SystemClock`, `RunOnceStore`, `WindowsRunOnceStore`, `parse_probe_process_result`, `validate_cli_process_identity_text`, `parse_cli_process_identity`, `argv_to_command_line`, `build_run_once_command`, and `arm_run_once`.

Freeze public signatures:

```text
parse_probe_process_result(exit_code: int, stdout: bytes) -> UpdateProbeResult
validate_cli_process_identity_text(pid_text: object, creation_token: object) -> tuple[int, str]
parse_cli_process_identity(pid_text: object, creation_token: object) -> InitiatingProcessIdentity
ProcessAdapter.capture_current_identity(expected_executable: Path) -> InitiatingProcessIdentity
ProcessAdapter.open_identity(identity: InitiatingProcessIdentity, expected_executable: Path) -> RetainedProcessHandle | None
ProcessAdapter.wait(handle: RetainedProcessHandle, timeout_seconds: float | None) -> bool
ProcessAdapter.close(handle: RetainedProcessHandle) -> None
ProcessAdapter.launch_detached(executable: Path, args: Sequence[str], cwd: Path) -> InitiatingProcessIdentity
ProbeProcessAdapter.run_probe(executable: Path, manifest_path: Path) -> UpdateProbeResult
argv_to_command_line(argv: Sequence[str], *, quote_first: bool = False) -> str
build_run_once_command() -> str
arm_run_once(store: RunOnceStore) -> str
```

- [ ] **Step 1: Write RED strict-probe tests**

`ProbeProcessTests` covers nonzero, timeout mapping, malformed/duplicate/noncanonical/extra output, wrong keys/types, duplicate/empty capability, oversize output, and exact success. Lock placement with direct import/compile:

```python
class ProbeProcessTests(unittest.TestCase):
    def test_exact_canonical_success_is_parsed(self):
        raw = (
            b'{"capabilities":["prompt-scope-v1"],'
            b'"extension_version":"2.0.75",'
            b'"host_version":"2.0.75","status":"success"}\n'
        )
        self.assertEqual(
            parse_probe_process_result(0, raw),
            UpdateProbeResult(
                status="success",
                host_version="2.0.75",
                extension_version="2.0.75",
                capabilities=("prompt-scope-v1",),
            ),
        )

    def test_nonzero_malformed_or_extra_output_is_fixed_failure(self):
        cases = (
            (1, b'{"error_code":"package_probe_failed","status":"error"}\n'),
            (0, b"not-json\n"),
            (0, b'{"status":"success"}\nextra\n'),
            (0, b'{"status":"success","status":"success"}\n'),
        )
        failure = UpdateProbeResult(
            status="error", error_code="package_probe_failed"
        )
        for exit_code, stdout in cases:
            with self.subTest(exit_code=exit_code, stdout=stdout):
                self.assertEqual(
                    parse_probe_process_result(exit_code, stdout), failure
                )

    def test_probe_process_invokes_installed_host_with_absolute_manifest(self):
        with mock.patch("update_platform.subprocess.run") as run:
            run.return_value = SimpleNamespace(
                returncode=0,
                stdout=(
                    b'{"capabilities":["prompt-scope-v1"],'
                    b'"extension_version":"2.0.75",'
                    b'"host_version":"2.0.75","status":"success"}\n'
                ),
                stderr=b"",
            )
            SubprocessProbeAdapter().run_probe(
                self.installed_host.resolve(),
                self.probe_manifest.resolve(),
            )
        self.assertEqual(run.call_args.args[0], [
            str(self.installed_host.resolve()),
            "--update-probe",
            str(self.probe_manifest.resolve()),
        ])
        self.assertTrue(run.call_args.kwargs["close_fds"])
        self.assertIs(run.call_args.kwargs["stdin"], subprocess.DEVNULL)
        self.assertEqual(
            run.call_args.kwargs["cwd"], self.installed_host.resolve().parent
        )
```

- [ ] **Step 2: Implement the complete compilable parser before any class using it**

Place this complete function after JSON helpers and before `SubprocessProbeAdapter`:

```python
MAX_PROBE_OUTPUT_BYTES = 65_536


def parse_probe_process_result(
    exit_code: int,
    stdout: bytes,
) -> UpdateProbeResult:
    failure = UpdateProbeResult(
        status="error",
        error_code="package_probe_failed",
    )
    if type(exit_code) is not int or type(stdout) is not bytes:
        return failure
    if exit_code != 0 or not stdout or len(stdout) > MAX_PROBE_OUTPUT_BYTES:
        return failure
    if not stdout.endswith(b"\n") or stdout.count(b"\n") != 1:
        return failure
    try:
        value = json.loads(
            stdout[:-1].decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        if type(value) is not dict or set(value) != {
            "status",
            "host_version",
            "extension_version",
            "capabilities",
        }:
            return failure
        if value["status"] != "success":
            return failure
        host_version = value["host_version"]
        extension_version = value["extension_version"]
        capabilities = value["capabilities"]
        if (
            type(host_version) is not str
            or not host_version
            or type(extension_version) is not str
            or not extension_version
            or type(capabilities) is not list
            or any(type(item) is not str or not item for item in capabilities)
            or len(set(capabilities)) != len(capabilities)
        ):
            return failure
        canonical = (
            json.dumps(
                value,
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
        if stdout != canonical:
            return failure
        return UpdateProbeResult(
            status="success",
            host_version=host_version,
            extension_version=extension_version,
            capabilities=tuple(capabilities),
        )
    except (TypeError, ValueError, UnicodeDecodeError):
        return failure
```

This parser is not a duplicate probe JSON emitter. It consumes untrusted subprocess stdout and returns Plan A's `UpdateProbeResult`; only Plan A `early_cli._write_probe_json` owns wire serialization.

Implement the synchronous probe adapter immediately after the parser:

```python
class SubprocessProbeAdapter:
    def run_probe(
        self,
        executable: Path,
        manifest_path: Path,
    ) -> UpdateProbeResult:
        failure = UpdateProbeResult(
            status="error", error_code="package_probe_failed"
        )
        if not executable.is_absolute() or not manifest_path.is_absolute():
            return failure
        try:
            completed = subprocess.run(
                [
                    str(executable.resolve(strict=True)),
                    "--update-probe",
                    str(manifest_path.resolve(strict=True)),
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=executable.parent,
                close_fds=True,
                shell=False,
                timeout=30,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            return failure
        return parse_probe_process_result(
            completed.returncode,
            completed.stdout,
        )
```

It never logs captured stderr/stdout or exposes a path. It sets `cwd` to `executable.parent`, so both staged and installed probes start in the exact Host root they validate rather than an inherited runner/browser directory; add this keyword assertion to `test_probe_process_invokes_installed_host_with_absolute_manifest`.

- [ ] **Step 3: Write RED process-identity and handle-lifecycle tests**

`ProcessAdapterTests` uses `FakeWin32ProcessApi` and exact Plan B identities. Required named cases are:

```python
class ProcessAdapterTests(unittest.TestCase):
    def test_retained_handle_defeats_pid_reuse(self):
        original = self.api.add_process(
            pid=41,
            creation_ticks=133801632000000000,
            image=self.host_executable,
        )
        identity = InitiatingProcessIdentity(
            pid=41,
            creation_token="win-create-time-133801632000000000",
        )
        handle = self.adapter.open_identity(identity, self.host_executable)
        self.assertIsNotNone(handle)
        self.api.exit(original)
        self.api.add_process(41, 133801632999999999, self.other_executable)
        self.assertTrue(self.adapter.wait(handle, None))
        self.assertEqual(handle.identity, identity)
        self.adapter.close(handle)
        self.adapter.close(handle)
        self.assertEqual(self.api.closed_retained, [original.native_handle])

    def test_token_or_image_mismatch_closes_and_returns_absent(self):
        self.api.add_process(41, 99, self.other_executable)
        identity = InitiatingProcessIdentity(41, "win-create-time-98")
        self.assertIsNone(self.adapter.open_identity(identity, self.host_executable))
        self.assertEqual(self.api.open_handle_count, 0)

    def test_detached_launch_closes_parent_thread_and_process_handles(self):
        identity = self.adapter.launch_detached(
            self.runner,
            ["--complete-update", TX_ID, "77", "win-create-time-123"],
            self.transaction_root,
        )
        self.assertEqual(identity.creation_token, "win-create-time-456")
        self.assertEqual(
            self.api.closed_created_handles,
            [self.api.created.thread_handle, self.api.created.process_handle],
        )
        self.assertEqual(self.api.inherited_handles, (self.api.nul_handle,))
        self.assertEqual(self.api.created.cwd, self.transaction_root.resolve())
```

Also require `test_capture_current_identity_closes_temporary_handle`, `test_open_absent_process_returns_none`, `test_wait_timeout_does_not_reopen`, `test_wait_failure_is_fixed`, `test_launch_rejects_relative_paths`, `test_launch_rejects_cwd_other_than_canonical_transaction_root`, `test_create_failure_closes_nul_and_attribute_list`, and `test_no_public_method_accepts_pid_without_creation_token`.

- [ ] **Step 4: Implement the injected Win32 adapter and precise ctypes wrapper**

Use mutable retained handles and exact identity parsing:

```python
@dataclass
class RetainedProcessHandle:
    identity: InitiatingProcessIdentity
    executable: Path
    native_handle: int
    closed: bool = False


@dataclass(frozen=True)
class CreatedProcess:
    pid: int
    process_handle: int
    thread_handle: int


_CREATION_TOKEN_RE = re.compile(r"^win-create-time-([1-9][0-9]*)$")


def parse_cli_process_identity(
    pid_text: object,
    creation_token: object,
) -> InitiatingProcessIdentity:
    pid, token = validate_cli_process_identity_text(
        pid_text, creation_token
    )
    return InitiatingProcessIdentity(pid=pid, creation_token=token)


def validate_cli_process_identity_text(
    pid_text: object,
    creation_token: object,
) -> tuple[int, str]:
    if (
        type(pid_text) is not str
        or not pid_text.isdecimal()
        or pid_text.startswith("0")
        or type(creation_token) is not str
        or _CREATION_TOKEN_RE.fullmatch(creation_token) is None
    ):
        raise ValueError("invalid_process_identity")
    pid = int(pid_text, 10)
    if pid <= 0 or pid > 0xFFFFFFFF:
        raise ValueError("invalid_process_identity")
    return pid, creation_token
```

`validate_cli_process_identity_text` is the raw no-construction parser used by
early dispatch. `parse_cli_process_identity` remains the public convenience
used by non-dispatch callers and constructs only after that parser succeeds.

`CtypesWin32ProcessApi` is initialized with `ctypes.WinDLL("kernel32", use_last_error=True)` and defines `FILETIME`, `SECURITY_ATTRIBUTES`, `STARTUPINFOW`, `STARTUPINFOEXW`, and `PROCESS_INFORMATION` as `ctypes.Structure` types. Set every `argtypes`/`restype` explicitly:

```python
kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel32.OpenProcess.restype = wintypes.HANDLE
kernel32.GetCurrentProcessId.argtypes = []
kernel32.GetCurrentProcessId.restype = wintypes.DWORD
kernel32.GetProcessTimes.argtypes = [
    wintypes.HANDLE,
    ctypes.POINTER(FILETIME),
    ctypes.POINTER(FILETIME),
    ctypes.POINTER(FILETIME),
    ctypes.POINTER(FILETIME),
]
kernel32.GetProcessTimes.restype = wintypes.BOOL
kernel32.QueryFullProcessImageNameW.argtypes = [
    wintypes.HANDLE,
    wintypes.DWORD,
    wintypes.LPWSTR,
    ctypes.POINTER(wintypes.DWORD),
]
kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
kernel32.WaitForSingleObject.restype = wintypes.DWORD
kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.CloseHandle.restype = wintypes.BOOL
kernel32.CreateFileW.argtypes = [
    wintypes.LPCWSTR,
    wintypes.DWORD,
    wintypes.DWORD,
    ctypes.POINTER(SECURITY_ATTRIBUTES),
    wintypes.DWORD,
    wintypes.DWORD,
    wintypes.HANDLE,
]
kernel32.CreateFileW.restype = wintypes.HANDLE
kernel32.InitializeProcThreadAttributeList.argtypes = [
    wintypes.LPVOID,
    wintypes.DWORD,
    wintypes.DWORD,
    ctypes.POINTER(ctypes.c_size_t),
]
kernel32.InitializeProcThreadAttributeList.restype = wintypes.BOOL
kernel32.UpdateProcThreadAttribute.argtypes = [
    wintypes.LPVOID,
    wintypes.DWORD,
    ctypes.c_size_t,
    wintypes.LPVOID,
    ctypes.c_size_t,
    wintypes.LPVOID,
    ctypes.POINTER(ctypes.c_size_t),
]
kernel32.UpdateProcThreadAttribute.restype = wintypes.BOOL
kernel32.DeleteProcThreadAttributeList.argtypes = [wintypes.LPVOID]
kernel32.DeleteProcThreadAttributeList.restype = None
kernel32.CreateProcessW.argtypes = [
    wintypes.LPCWSTR,
    wintypes.LPWSTR,
    ctypes.POINTER(SECURITY_ATTRIBUTES),
    ctypes.POINTER(SECURITY_ATTRIBUTES),
    wintypes.BOOL,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.LPCWSTR,
    ctypes.POINTER(STARTUPINFOW),
    ctypes.POINTER(PROCESS_INFORMATION),
]
kernel32.CreateProcessW.restype = wintypes.BOOL
```

Define the public adapter protocols before their concrete implementations:

```python
class ProcessAdapter(Protocol):
    def capture_current_identity(
        self,
        expected_executable: Path,
    ) -> InitiatingProcessIdentity:
        raise AssertionError("process protocol method")

    def open_identity(
        self,
        identity: InitiatingProcessIdentity,
        expected_executable: Path,
    ) -> RetainedProcessHandle | None:
        raise AssertionError("process protocol method")

    def wait(
        self,
        handle: RetainedProcessHandle,
        timeout_seconds: float | None,
    ) -> bool:
        raise AssertionError("process protocol method")

    def close(self, handle: RetainedProcessHandle) -> None:
        raise AssertionError("process protocol method")

    def launch_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> InitiatingProcessIdentity:
        raise AssertionError("process protocol method")


class ProbeProcessAdapter(Protocol):
    def run_probe(
        self,
        executable: Path,
        manifest_path: Path,
    ) -> UpdateProbeResult:
        raise AssertionError("probe process protocol method")


class Clock(Protocol):
    def monotonic(self) -> float:
        raise AssertionError("clock protocol method")

    def sleep(self, seconds: float) -> None:
        raise AssertionError("clock protocol method")


class RunOnceStore(Protocol):
    def write_expand_string(self, name: str, value: str) -> None:
        raise AssertionError("RunOnce protocol method")

    def read(self, name: str) -> tuple[str, str] | None:
        raise AssertionError("RunOnce protocol method")

    def delete(self, name: str) -> None:
        raise AssertionError("RunOnce protocol method")
```

These protocol methods have executable assertion bodies. This task supplies concrete `WindowsProcessAdapter`, `SubprocessProbeAdapter`, `SystemClock`, and `WindowsRunOnceStore` implementations and exercises them through injected fakes.

Freeze Win32 constants and the high-level API injected into `WindowsProcessAdapter`:

```python
SYNCHRONIZE = 0x00100000
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
WAIT_OBJECT_0 = 0x00000000
WAIT_TIMEOUT = 0x00000102
INFINITE = 0xFFFFFFFF
DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200
EXTENDED_STARTUPINFO_PRESENT = 0x00080000
STARTF_USESTDHANDLES = 0x00000100
PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3


class Win32ProcessApi(Protocol):
    def current_process_id(self) -> int:
        raise AssertionError("Win32 process API method")

    def open_process(self, pid: int) -> int | None:
        raise AssertionError("Win32 process API method")

    def creation_ticks(self, handle: int) -> int:
        raise AssertionError("Win32 process API method")

    def query_image(self, handle: int) -> Path:
        raise AssertionError("Win32 process API method")

    def wait(self, handle: int, milliseconds: int) -> int:
        raise AssertionError("Win32 process API method")

    def close_handle(self, handle: int) -> None:
        raise AssertionError("Win32 process API method")
    def create_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> CreatedProcess:
        raise AssertionError("Win32 process API method")
```

`CtypesWin32ProcessApi` implements those seven methods. `open_process` uses exactly `SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION`, returns `None` only for `ERROR_INVALID_PARAMETER`/absent process, and raises a fixed `ProcessAdapterError("process_open_failed")` chained from `ctypes.WinError()` otherwise. `creation_ticks` combines the creation `FILETIME` as `(high << 32) | low`. `query_image` starts with a 32,768-character buffer and returns a strict absolute `Path`; failure is fixed `process_query_failed`. `wait` returns the raw wait result. `close_handle` requires `CloseHandle` success.

`create_detached` performs this exact sequence:

1. Open inheritable `NUL` with `CreateFileW`, `GENERIC_READ | GENERIC_WRITE`, shared read/write, and `OPEN_EXISTING`.
2. Allocate a one-entry `STARTUPINFOEXW` attribute list and set only `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` to the `NUL` handle.
3. Set `STARTF_USESTDHANDLES`; assign the same `NUL` handle to stdin/stdout/stderr.
4. Build a mutable command line with `ctypes.create_unicode_buffer(subprocess.list2cmdline([str(executable), *args]))` and pass absolute `lpApplicationName`, absolute canonical `cwd`, no shell, and flags `0x00000008 | 0x00000200 | 0x00080000`.
5. Call `CreateProcessW` with `bInheritHandles=True`; the attribute list limits inheritance to `NUL`, so Native Messaging handles cannot be inherited.
6. Return `CreatedProcess` on success. Always delete the attribute list and close the parent `NUL` handle; do not close returned process/thread handles inside the wrapper.

The two-call attribute-list allocation is exact: first call `InitializeProcThreadAttributeList(None, 1, 0, byref(size))`, require `ERROR_INSUFFICIENT_BUFFER`, allocate `ctypes.create_string_buffer(size.value)`, call initialize again, create a one-element `wintypes.HANDLE` array containing `NUL`, and pass its address/size to `UpdateProcThreadAttribute`. Create an actual `SECURITY_ATTRIBUTES` instance whose `nLength` is `ctypes.sizeof(SECURITY_ATTRIBUTES)`, `lpSecurityDescriptor` is null, and `bInheritHandle` is true only for `CreateFileW("NUL", ...)`. Set `startup.StartupInfo.cb = ctypes.sizeof(STARTUPINFOEXW)`, `dwFlags |= STARTF_USESTDHANDLES`, and cast `byref(startup)` to `POINTER(STARTUPINFOW)` for `CreateProcessW`. Every failure is chained into a fixed `ProcessAdapterError` code; no raw Win32 text is returned or logged.

Implement the complete adapter methods over that API:

```python
class ProcessAdapterError(RuntimeError):
    _ALLOWED = frozenset({
        "process_open_failed",
        "process_query_failed",
        "process_wait_failed",
        "process_launch_failed",
        "process_close_failed",
        "process_identity_mismatch",
        "invalid_process_path",
        "invalid_process_timeout",
    })

    def __init__(self, error_code: str) -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_process_error")
        self.error_code = error_code
        super().__init__(error_code)


class ParentHandleCloseError(BaseException):
    def __init__(self) -> None:
        super().__init__("process_parent_handle_close_failed")


def _creation_token(ticks: int) -> str:
    if type(ticks) is not int or ticks <= 0:
        raise ProcessAdapterError("process_query_failed")
    return f"win-create-time-{ticks}"


def _canonical_image(path: Path) -> str:
    if not path.is_absolute():
        raise ProcessAdapterError("invalid_process_path")
    return str(path.resolve(strict=False)).replace("/", "\\").rstrip("\\").casefold()


class WindowsProcessAdapter:
    def __init__(self, api: Win32ProcessApi) -> None:
        self._api = api

    def capture_current_identity(
        self,
        expected_executable: Path,
    ) -> InitiatingProcessIdentity:
        expected = _canonical_image(expected_executable)
        pid = self._api.current_process_id()
        handle = self._api.open_process(pid)
        if handle is None:
            raise ProcessAdapterError("process_open_failed")
        identity: InitiatingProcessIdentity | None = None
        primary_error: BaseException | None = None
        try:
            if _canonical_image(self._api.query_image(handle)) != expected:
                raise ProcessAdapterError("process_identity_mismatch")
            identity = InitiatingProcessIdentity(
                pid=pid,
                creation_token=_creation_token(
                    self._api.creation_ticks(handle)
                ),
            )
        except BaseException as error:
            primary_error = error
        try:
            self._api.close_handle(handle)
        except Exception as close_error:
            if primary_error is not None:
                raise BaseExceptionGroup(
                    "process_capture_and_close_failed",
                    [primary_error, ParentHandleCloseError()],
                ) from close_error
            raise ProcessAdapterError("process_close_failed") from close_error
        if primary_error is not None:
            raise primary_error
        if identity is None:
            raise ProcessAdapterError("process_query_failed")
        return identity

    def open_identity(
        self,
        identity: InitiatingProcessIdentity,
        expected_executable: Path,
    ) -> RetainedProcessHandle | None:
        if type(identity) is not InitiatingProcessIdentity:
            raise ProcessAdapterError("process_identity_mismatch")
        expected = _canonical_image(expected_executable)
        native_handle = self._api.open_process(identity.pid)
        if native_handle is None:
            return None
        owned = True
        try:
            actual_token = _creation_token(
                self._api.creation_ticks(native_handle)
            )
            actual_image = _canonical_image(
                self._api.query_image(native_handle)
            )
            if actual_token != identity.creation_token or actual_image != expected:
                owned = False
                self._api.close_handle(native_handle)
                return None
            retained = RetainedProcessHandle(
                identity=identity,
                executable=expected_executable.resolve(strict=False),
                native_handle=native_handle,
            )
            owned = False
            return retained
        except Exception:
            if owned:
                self._api.close_handle(native_handle)
            raise

    def wait(
        self,
        handle: RetainedProcessHandle,
        timeout_seconds: float | None,
    ) -> bool:
        if handle.closed:
            raise ProcessAdapterError("process_wait_failed")
        if timeout_seconds is None:
            milliseconds = INFINITE
        elif (
            type(timeout_seconds) not in (int, float)
            or not math.isfinite(timeout_seconds)
            or timeout_seconds < 0
            or timeout_seconds * 1000 >= INFINITE
        ):
            raise ProcessAdapterError("invalid_process_timeout")
        else:
            milliseconds = math.ceil(timeout_seconds * 1000)
        result = self._api.wait(handle.native_handle, milliseconds)
        if result == WAIT_OBJECT_0:
            return True
        if result == WAIT_TIMEOUT:
            return False
        raise ProcessAdapterError("process_wait_failed")

    def close(self, handle: RetainedProcessHandle) -> None:
        if handle.closed:
            return
        self._api.close_handle(handle.native_handle)
        handle.closed = True

    def launch_detached(
        self,
        executable: Path,
        args: Sequence[str],
        cwd: Path,
    ) -> InitiatingProcessIdentity:
        if not executable.is_absolute() or not cwd.is_absolute():
            raise ProcessAdapterError("invalid_process_path")
        executable = executable.resolve(strict=True)
        cwd = cwd.resolve(strict=True)
        try:
            transaction_id = parse_transaction_id(cwd.name)
            install_root = cwd.parent.parent.parent
            paths = TransactionPaths.for_install(
                install_root, transaction_id
            )
        except (JournalValidationError, ValueError) as error:
            raise ProcessAdapterError("invalid_process_path") from error
        if (
            cwd != paths.transaction_root
            or executable
            != (paths.updates_root / "recovery" / "dh_update_runner.exe")
        ):
            raise ProcessAdapterError("invalid_process_path")
        allowed_args = tuple(args) == ("--recover-active",)
        if not allowed_args and (
            len(args) == 4
            and args[0] == "--complete-update"
            and args[1] == transaction_id
        ):
            try:
                parse_cli_process_identity(args[2], args[3])
                allowed_args = True
            except ValueError:
                allowed_args = False
        if not allowed_args:
            raise ProcessAdapterError("invalid_process_path")
        created = self._api.create_detached(executable, args, cwd)
        identity: InitiatingProcessIdentity | None = None
        primary_error: BaseException | None = None
        try:
            identity = InitiatingProcessIdentity(
                pid=created.pid,
                creation_token=_creation_token(
                    self._api.creation_ticks(created.process_handle)
                ),
            )
        except BaseException as error:
            primary_error = error
        close_errors: list[BaseException] = []
        for native_handle in (
            created.thread_handle,
            created.process_handle,
        ):
            try:
                self._api.close_handle(native_handle)
            except Exception as error:
                close_errors.append(
                    ParentHandleCloseError().with_traceback(
                        error.__traceback__
                    )
                )
        if primary_error is not None and close_errors:
            raise BaseExceptionGroup(
                "process_launch_and_close_failed",
                [primary_error, *close_errors],
            )
        if primary_error is not None:
            raise primary_error
        if close_errors:
            raise BaseExceptionGroup(
                "process_parent_handle_close_failed", close_errors
            )
        if identity is None:
            raise ProcessAdapterError("process_launch_failed")
        return identity
```

The `open_identity` mismatch branch closes once and clears local ownership before return, so exception cleanup cannot double-close. Tests cover mismatch, query exception, and successful retained ownership separately. `wait` calls only `WaitForSingleObject` on `handle.native_handle`; it never calls `OpenProcess`. `launch_detached` returns only immutable child identity, never a `Popen` object. There is no call to a nonexistent public `Popen.close()`.

- [ ] **Step 5: Implement RunOnce and test exact policy primitives**

Freeze constants and command:

```python
RUN_ONCE_KEY = r"Software\Microsoft\Windows\CurrentVersion\RunOnce"
RUN_ONCE_VALUE_NAME = "DynamicsHelperUpdateRecovery"
RUN_ONCE_LIMIT = 260
RUNNER_ENV_PATH = (
    r"%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe"
)


def build_run_once_command() -> str:
    return argv_to_command_line(
        [RUNNER_ENV_PATH, "--recover-active"], quote_first=True
    )


def arm_run_once(store: RunOnceStore) -> str:
    expected = build_run_once_command()
    if len(expected) > RUN_ONCE_LIMIT:
        raise ValueError("run_once_command_too_long")
    store.write_expand_string(RUN_ONCE_VALUE_NAME, expected)
    if store.read(RUN_ONCE_VALUE_NAME) != ("REG_EXPAND_SZ", expected):
        store.delete(RUN_ONCE_VALUE_NAME)
        raise RuntimeError("run_once_round_trip_failed")
    return expected
```

Implement Windows quoting and the concrete adapters:

```python
def argv_to_command_line(
    argv: Sequence[str],
    *,
    quote_first: bool = False,
) -> str:
    if not argv or any(type(value) is not str or not value for value in argv):
        raise ValueError("invalid_command_line")
    encoded = [subprocess.list2cmdline([value]) for value in argv]
    if quote_first:
        first = encoded[0]
        if not first.startswith('"'):
            encoded[0] = f'"{first}"'
    return " ".join(encoded)


class SystemClock:
    def monotonic(self) -> float:
        return time.monotonic()

    def sleep(self, seconds: float) -> None:
        time.sleep(seconds)


class WindowsRunOnceStore:
    def write_expand_string(self, name: str, value: str) -> None:
        import winreg

        with winreg.CreateKeyEx(
            winreg.HKEY_CURRENT_USER,
            RUN_ONCE_KEY,
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE,
        ) as key:
            winreg.SetValueEx(key, name, 0, winreg.REG_EXPAND_SZ, value)

    def read(self, name: str) -> tuple[str, str] | None:
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                RUN_ONCE_KEY,
                0,
                winreg.KEY_QUERY_VALUE,
            ) as key:
                value, kind = winreg.QueryValueEx(key, name)
        except FileNotFoundError:
            return None
        type_name = (
            "REG_EXPAND_SZ" if kind == winreg.REG_EXPAND_SZ else "unexpected"
        )
        return type_name, value

    def delete(self, name: str) -> None:
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                RUN_ONCE_KEY,
                0,
                winreg.KEY_SET_VALUE,
            ) as key:
                winreg.DeleteValue(key, name)
        except FileNotFoundError:
            return
```

`RunOnceTests` requires exact text/type, non-ASCII/spaced profile expansion without changing stored text, 260 bound before write, read-back cleanup, idempotent missing delete, and propagated permission failures. `WindowsRunOnceStore` imports `winreg` only on calls, uses HKCU only, and closes all keys through context managers.

- [ ] **Step 6: Run GREEN, compile, and handle mutations**

`Win32ProcessApiTests` are mandatory source/AST plus fake-kernel tests. Assert every listed `argtypes`/`restype`, the two-call attribute-list allocation, one-handle allowlist, `STARTF_USESTDHANDLES`, all three standard handles set to the same `NUL`, `bInheritHandles=True`, exact three creation flags, mutable command-line buffer, fixed `lpApplicationName`, exact cwd, and cleanup ordering on each injected failure. Source/AST tests require `CreateProcessW`, `OpenProcess`, `GetProcessTimes`, `QueryFullProcessImageNameW`, `WaitForSingleObject`, and `CloseHandle`; they forbid `subprocess.Popen` in `WindowsProcessAdapter`. No automated test calls real kernel32.

Run:

```powershell
Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_update_platform","-v")
Invoke-IsolatedPython -PythonArgs @("-m","py_compile","host/update_platform.py")
```

Expected: both exit 0. Mutate fake `wait` to reopen by PID; `test_retained_handle_defeats_pid_reuse` must exit nonzero. Mutate launch to omit either parent `CloseHandle`; `test_detached_launch_closes_parent_thread_and_process_handles` must exit nonzero. Restore each and rerun GREEN.

- [ ] **Step 7: Commit**

```powershell
git add host/update_platform.py host/test_update_platform.py
git commit -m "feat(update): add identity-safe Windows adapters"
```

### Task 4: Complete Recovery Tree Without Active-Record Movement

**Files:**
- Create: `host/update_recovery.py`
- Create: `host/test_update_recovery.py`

**Interfaces:**
- Consumes Plan B `TransactionPaths` only for transaction paths; consumes a current or staged complete onedir root explicitly.
- Produces `RunnerSource`, `OnedirInventory`, `select_runner_source`, `inventory_onedir`, `install_recovery_tree`, `validate_recovery_tree`, and `register_status_host`.

Freeze exact signatures:

```text
select_runner_source(kind: RunnerSource, current_runtime_root: Path, staged_host_root: Path) -> Path
inventory_onedir(source: Path) -> OnedirInventory
install_recovery_tree(source: Path, updates_root: Path) -> Path
validate_recovery_tree(recovery_root: Path, expected: OnedirInventory | None = None) -> OnedirInventory
register_status_host(recovery_root: Path, registry: RegistryBackend) -> Path
```

- [ ] **Step 1: Write RED preflight, exact-copy, and active-preservation tests**

Create `RecoveryTreeTests` with these core cases:

```python
class RecoveryTreeTests(unittest.TestCase):
    def test_install_replaces_only_recovery_child_and_preserves_stable_active(self):
        source = make_complete_onedir(self.root / "source")
        updates = self.root / "install" / "updates"
        updates.mkdir(parents=True)
        active = updates / "active.json"
        active.write_bytes(b"stable-active\n")
        unrelated = updates / "unrelated.bin"
        unrelated.write_bytes(b"keep")

        recovery = install_recovery_tree(source, updates)

        self.assertEqual(active.read_bytes(), b"stable-active\n")
        self.assertEqual(unrelated.read_bytes(), b"keep")
        self.assertEqual(recovery, (updates / "recovery").resolve())
        self.assertFalse((recovery / "active.json").exists())
        self.assertTrue((recovery / "dh_update_runner.exe").is_file())
        self.assertTrue((recovery / "dh_update_status_host.exe").is_file())

    def test_source_reparse_is_rejected_before_first_copy(self):
        source = make_complete_onedir(self.root / "source")
        with (
            mock.patch(
                "update_recovery._lstat_plain",
                side_effect=RecoveryError("unsupported_runner_entry"),
            ),
            mock.patch("update_recovery._copy_plain_file") as copied,
        ):
            with self.assertRaisesRegex(
                RecoveryError, "unsupported_runner_entry"
            ):
                install_recovery_tree(source, self.root / "updates")
        copied.assert_not_called()
        self.assertFalse((self.root / "updates").exists())

    def test_internal_is_defined_and_complete_before_copy(self):
        source = self.root / "source"
        source.mkdir()
        (source / "dh_native_host.exe").write_bytes(b"exe")
        with mock.patch("update_recovery._copy_plain_file") as copied:
            with self.assertRaisesRegex(
                RecoveryError, "incomplete_onedir_runtime"
            ):
                inventory_onedir(source)
        copied.assert_not_called()

    def test_copy_inventory_matches_every_internal_file_and_directory(self):
        source = make_complete_onedir(
            self.root / "source", include_empty_directory=True
        )
        expected = inventory_onedir(source)
        recovery = install_recovery_tree(source, self.root / "updates")
        self.assertEqual(validate_recovery_tree(recovery, expected), expected)
```

Add named tests for source-root reparse, `_internal` reparse, descendant file symlink/reparse/FIFO, descendant directory junction/reparse, missing/empty `_internal`, non-regular executable, pre-existing old recovery preservation on copy/verify/first-rename/second-rename failure, destination reparse rejection, byte mismatch, explicit `RunnerSource.CURRENT`/`STAGED`, invalid source enum, no source fallback, and status registration only after exact tree validation. Deterministic tests patch `Path.lstat()` results and do not depend on symlink privileges.

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_update_recovery.RecoveryTreeTests","-v") -ExpectFailure`

Expected: missing `update_recovery`.

- [ ] **Step 3: Implement complete source inventory before destination mutation**

Define the fixed exception and all filesystem guards before the first public tree function:

```python
class RecoveryError(RuntimeError):
    _ALLOWED = frozenset({
        "update_recovery_failed",
        "invalid_runner_source",
        "invalid_updates_root",
        "invalid_recovery_root",
        "incomplete_onedir_runtime",
        "unsupported_runner_entry",
        "unexpected_recovery_entry",
        "runner_copy_mismatch",
        "install_root_mismatch",
        "active_path_mismatch",
        "active_journal_mismatch",
        "transaction_path_mismatch",
        "initiating_process_identity_missing",
        "initiating_process_identity_mismatch",
        "initiating_process_handle_missing",
        "host_exit_wait_failed",
        "staged_probe_failed",
        "startup_probe_failed",
        "update_activation_failed",
        "journal_outside_updates",
    })

    def __init__(self, error_code: str = "update_recovery_failed") -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_recovery_error")
        self.error_code = error_code
        super().__init__(error_code)


def _require_absolute_path(path: Path, error_code: str) -> None:
    if not isinstance(path, Path) or not path.is_absolute() or ".." in path.parts:
        raise RecoveryError(error_code)


def _lstat_plain(
    path: Path,
    *,
    require_directory: bool | None,
):
    try:
        info = path.lstat()
    except OSError as error:
        raise RecoveryError("incomplete_onedir_runtime") from error
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if getattr(info, "st_file_attributes", 0) & reparse:
        raise RecoveryError("unsupported_runner_entry")
    if require_directory is True and not stat.S_ISDIR(info.st_mode):
        raise RecoveryError("unsupported_runner_entry")
    if require_directory is False and not stat.S_ISREG(info.st_mode):
        raise RecoveryError("unsupported_runner_entry")
    if require_directory is None and not (
        stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)
    ):
        raise RecoveryError("unsupported_runner_entry")
    return info


def _require_plain_ancestor_chain(directory: Path) -> None:
    _require_absolute_path(directory, "invalid_runner_source")
    current = Path(directory.anchor)
    for part in directory.parts[1:]:
        current = current / part
        if current.exists() or current.is_symlink():
            _lstat_plain(current, require_directory=True)


def _copy_plain_file(
    source: Path,
    destination: Path,
    expected_sha256: str,
) -> None:
    _lstat_plain(source, require_directory=False)
    _lstat_plain(destination.parent, require_directory=True)
    try:
        with source.open("rb") as input_stream, destination.open("xb") as output:
            shutil.copyfileobj(input_stream, output, length=1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
        _lstat_plain(destination, require_directory=False)
        if sha256_file(destination) != expected_sha256:
            raise RecoveryError("runner_copy_mismatch")
    except Exception:
        destination.unlink(missing_ok=True)
        raise
```

`_require_plain_ancestor_chain` is called only for directory paths, so every existing component it checks must be a plain directory.

Then define `internal` before every use and freeze the inventory:

```python
class RunnerSource(StrEnum):
    CURRENT = "current"
    STAGED = "staged"


@dataclass(frozen=True, order=True)
class RuntimeFile:
    path: str
    sha256: str


@dataclass(frozen=True)
class OnedirInventory:
    executable_sha256: str
    internal_directories: tuple[str, ...]
    internal_files: tuple[RuntimeFile, ...]


def _inventory_internal(
    internal: Path,
) -> tuple[tuple[str, ...], tuple[RuntimeFile, ...]]:
    _lstat_plain(internal, require_directory=True)
    root = internal.resolve(strict=True)
    directories: list[str] = []
    files: list[RuntimeFile] = []

    def visit(directory: Path) -> None:
        for child in sorted(directory.iterdir(), key=lambda path: path.name):
            info = _lstat_plain(child, require_directory=None)
            relative = child.relative_to(root).as_posix()
            if stat.S_ISDIR(info.st_mode):
                directories.append(relative)
                visit(child)
            else:
                files.append(RuntimeFile(relative, sha256_file(child)))

    visit(root)
    return tuple(sorted(directories)), tuple(sorted(files))


def select_runner_source(
    kind: RunnerSource,
    current_runtime_root: Path,
    staged_host_root: Path,
) -> Path:
    if type(kind) is not RunnerSource:
        raise RecoveryError("invalid_runner_source")
    source = (
        current_runtime_root
        if kind is RunnerSource.CURRENT
        else staged_host_root
    )
    inventory_onedir(source)
    return source.resolve(strict=True)


def inventory_onedir(source: Path) -> OnedirInventory:
    _require_absolute_path(source, "invalid_runner_source")
    _require_plain_ancestor_chain(source)
    _lstat_plain(source, require_directory=True)
    executable = source / "dh_native_host.exe"
    internal = source / "_internal"
    _lstat_plain(executable, require_directory=False)
    _lstat_plain(internal, require_directory=True)
    for child in sorted(source.iterdir(), key=lambda path: path.name):
        _lstat_plain(child, require_directory=None)
    directories, files = _inventory_internal(internal)
    if not files:
        raise RecoveryError("incomplete_onedir_runtime")
    return OnedirInventory(
        executable_sha256=sha256_file(executable),
        internal_directories=directories,
        internal_files=files,
    )
```

`_require_plain_ancestor_chain` walks every existing component from the path anchor through `source` with `lstat` and rejects a symlink/reparse or non-directory component before `resolve`. `_lstat_plain(path, require_directory)` calls `lstat`, rejects `FILE_ATTRIBUTE_REPARSE_POINT` before `resolve`/open, and requires exact directory/regular type when requested. `sha256_file` opens only after that check. The reusable runtime contract is exactly the PyInstaller executable plus its entire `_internal` tree; package/live sibling files and directories such as `config.json`, `system_prompt.md`, `register.py`, metadata, registration, logs, `extension`, and `updates` are deliberately excluded. Source root may contain those siblings, but before any copy `inventory_onedir` lstat-scans every immediate source-root child and rejects any symlink/reparse, FIFO/device, or other unsupported type; plain sibling files/directories are ignored by recovery copying and never traversed. Inventory includes empty `_internal` directories, so exact verification does not silently drop part of that tree. Source ancestors, source root, every source-root child type, executable, `_internal`, every internal directory, and every internal file are fully preflighted before `updates_root` is created or any copy begins.

- [ ] **Step 4: Implement exact sibling-tree replacement**

Use a unique same-parent new/old name; never use a path beneath `recovery` for active state:

```python
def install_recovery_tree(source: Path, updates_root: Path) -> Path:
    expected = inventory_onedir(source)
    source = source.resolve(strict=True)
    _require_absolute_path(updates_root, "invalid_updates_root")
    if updates_root.name.casefold() != "updates":
        raise RecoveryError("invalid_updates_root")
    active_bytes = None
    if updates_root.exists():
        _require_plain_ancestor_chain(updates_root)
        _lstat_plain(updates_root, require_directory=True)
        active_path = updates_root / "active.json"
        if active_path.exists() or active_path.is_symlink():
            _lstat_plain(active_path, require_directory=False)
            active_bytes = active_path.read_bytes()
    else:
        _require_plain_ancestor_chain(updates_root.parent)
        updates_root.mkdir(parents=True)
        _lstat_plain(updates_root, require_directory=True)
    updates = updates_root.resolve(strict=True)
    recovery = updates / "recovery"
    token = uuid.uuid4().hex
    new_root = updates / f".recovery.{token}.new"
    old_root = updates / f".recovery.{token}.old"
    try:
        new_root.mkdir()
        internal = new_root / "_internal"
        internal.mkdir()
        for relative in expected.internal_directories:
            internal.joinpath(*relative.split("/")).mkdir()
        for record in expected.internal_files:
            source_file = source / "_internal" / Path(*record.path.split("/"))
            destination = internal / Path(*record.path.split("/"))
            _copy_plain_file(source_file, destination, record.sha256)
        executable = source / "dh_native_host.exe"
        _copy_plain_file(
            executable,
            new_root / "dh_update_runner.exe",
            expected.executable_sha256,
        )
        _copy_plain_file(
            executable,
            new_root / "dh_update_status_host.exe",
            expected.executable_sha256,
        )
        validate_recovery_tree(new_root, expected)
        if recovery.exists():
            validate_recovery_tree(recovery)
            os.replace(recovery, old_root)
        try:
            os.replace(new_root, recovery)
        except Exception:
            if old_root.exists() and not recovery.exists():
                os.replace(old_root, recovery)
            raise
        if old_root.exists():
            shutil.rmtree(old_root, ignore_errors=False)
        active_path = updates / "active.json"
        if active_bytes is None:
            if active_path.exists() or active_path.is_symlink():
                raise RecoveryError("active_path_mismatch")
        else:
            _lstat_plain(active_path, require_directory=False)
            if active_path.read_bytes() != active_bytes:
                raise RecoveryError("active_path_mismatch")
        return recovery.resolve(strict=True)
    except Exception:
        if new_root.exists():
            shutil.rmtree(new_root)
        raise
```

`_copy_plain_file` rechecks source type/reparse immediately before copy, creates destination with exclusive binary open, flushes/fsyncs, verifies exact digest, and never copies metadata from the source. `validate_recovery_tree` is complete and uses the same `_inventory_internal` walker as `inventory_onedir`:

```python
def validate_recovery_tree(
    recovery_root: Path,
    expected: OnedirInventory | None = None,
) -> OnedirInventory:
    _require_absolute_path(recovery_root, "invalid_recovery_root")
    _require_plain_ancestor_chain(recovery_root)
    _lstat_plain(recovery_root, require_directory=True)
    runner = recovery_root / "dh_update_runner.exe"
    status = recovery_root / "dh_update_status_host.exe"
    internal = recovery_root / "_internal"
    _lstat_plain(runner, require_directory=False)
    _lstat_plain(status, require_directory=False)
    _lstat_plain(internal, require_directory=True)
    runner_sha256 = sha256_file(runner)
    if sha256_file(status) != runner_sha256:
        raise RecoveryError("runner_copy_mismatch")
    directories, internal_files = _inventory_internal(internal)
    if not internal_files:
        raise RecoveryError("incomplete_onedir_runtime")
    fixed = {
        "dh_update_runner.exe",
        "dh_update_status_host.exe",
        "_internal",
        "status-manifest.json",
    }
    for child in sorted(recovery_root.iterdir(), key=lambda path: path.name):
        if child.name in fixed:
            if child.name == "status-manifest.json":
                _lstat_plain(child, require_directory=False)
            continue
        raise RecoveryError("unexpected_recovery_entry")
    actual = OnedirInventory(
        executable_sha256=runner_sha256,
        internal_directories=directories,
        internal_files=internal_files,
    )
    if expected is not None and actual != expected:
        raise RecoveryError("runner_copy_mismatch")
    return actual
```

`_inventory_internal` returns globally sorted `(directories, RuntimeFile records)`, rejects every reparse/non-regular/non-directory child before descent/open, and includes empty directories. Thus verification requires the two fixed executable hashes, all `_internal` directory paths, all `_internal` file paths, and every digest. It rejects extra root entries except `status-manifest.json`, which registration creates after installation; when present that manifest must be a plain regular file and is not part of runtime equality.

The replacement touches only `updates/.recovery.<token>.*` and `updates/recovery`. It never reads, writes, renames, copies, or deletes `TransactionPaths.active == updates/active.json`. The active-preservation test snapshots exact bytes across successful replacement and every injected failure.

`register_status_host` calls `validate_recovery_tree` and then
`register_status_manifest`. This lower primitive is public only for Plan C's
isolated primitive tests, not a Plan D integration surface; Plan D imports only
`RecoveryController.prepare_recovery_runtime`. There is no
`write_probe_manifest`; callers strict-read Plan B's manifest.

- [ ] **Step 5: Run GREEN and preflight mutation**

Run the RecoveryTree class; expect `OK`. Temporarily begin creating `new_root` before `inventory_onedir(source)`, run `test_source_reparse_is_rejected_before_first_copy`, require nonzero, restore, and rerun.

- [ ] **Step 6: Commit**

```powershell
git add host/update_recovery.py host/test_update_recovery.py
git commit -m "feat(update): install complete recovery runtime"
```

### Task 5: Staged-Host Preflight, Plan B Hook Composition, Complete Identities, And Recovery Policy

**Files:**
- Modify: `host/update_recovery.py`
- Modify: `host/test_update_recovery.py`

**Interfaces:**
- Consumes Plan A's frozen probe executable contract and Plan B's strict prepared journal, ownership sidecar, staged paths, and probe manifest. Produces `StagedProbeWorkspace`, `TemporaryStagedProbeWorkspace`, `RecoveryDiagnostics`, `RecoveryDependencies`, `RecoveryController`, `create_production_recovery_controller`, `launch_complete_update`, and `launch_active_recovery`; `prepare_recovery_runtime` is the sole higher-level tree-install/status-registration boundary.

`StagedProbeWorkspace` is a frozen `pathlib.Path` boundary: concrete `WindowsPath`/`PosixPath` instances and genuine `Path` subclasses are valid, while strings and non-`Path` `os.PathLike` objects are rejected rather than coerced. Accepted subclasses are normalized once with `Path(os.fspath(value))` before canonical checks.

Freeze signatures:

```text
StagedProbeWorkspace.create(forbidden_roots: Sequence[Path]) -> Path
StagedProbeWorkspace.remove(root: Path) -> None
RecoveryController(install_root: Path, dependencies: RecoveryDependencies)
RecoveryController.preflight_prepared_target(transaction_id: str) -> UpdateProbeResult
RecoveryController.prepare_recovery_runtime(transaction_id: str, runner_source: Path, registry: RegistryBackend | None) -> Path
RecoveryController.run_complete_update(transaction_id: str, process_identity: InitiatingProcessIdentity) -> UpdateJournal
RecoveryController.run_installer_update(transaction_id: str) -> UpdateJournal
RecoveryController.wait_until_ready(transaction_id: str, process_identity: InitiatingProcessIdentity, timeout_seconds: float) -> UpdateJournal
RecoveryController.recover_active() -> UpdateJournal
RecoveryController.recover_journal(journal_path: Path) -> UpdateJournal
create_production_recovery_controller(install_root: Path) -> RecoveryController
launch_complete_update(process: ProcessAdapter, recovery_root: Path, paths: TransactionPaths, process_identity: InitiatingProcessIdentity) -> InitiatingProcessIdentity
launch_active_recovery(process: ProcessAdapter, install_root: Path) -> InitiatingProcessIdentity
```

- [ ] **Step 1: Write RED real-engine orchestration tests**

Use Plan B `host.test_update_support` only from tests. Build prepared browser and installer transactions through `UpdateEngine.create_prepared`; never hand-write journal, active, ownership, or probe files. Plan B already writes `paths.probe_manifest`, so assert its bytes exist immediately after preparation and do not call a Plan C writer.

Add exact class `StagedHostPreflightTests`. It uses a real Plan B prepared fixture, a recording `StagedProbeWorkspace`, and a fake `ProbeProcessAdapter` that inspects the executable and manifest paths before returning. The GREEN case proves the process receives the copied staged executable, not the live/recovery executable; its executable parent contains the exact target metadata, `_internal` inventory, and `extension` inventory; its manifest argument is the absolute byte-unchanged `TransactionPaths.probe_manifest`; the returned Host/Extension versions and capabilities equal the target; and the temporary view is absent before the method returns:

```python
class StagedHostPreflightTests(unittest.TestCase):
    def test_preflight_starts_combined_staged_frozen_target_before_activation(self):
        journal = self.make_prepared_browser_transaction()
        live_before = snapshot_tree(self.install_root)

        result = self.controller.preflight_prepared_target(TX_ID)

        self.assertEqual(result, UpdateProbeResult(
            status="success",
            host_version=journal.target_version,
            extension_version=journal.target_version,
            capabilities=self.manifest.provided_capabilities,
        ))
        call = self.probe.calls[0]
        self.assertEqual(call.executable.name, "dh_native_host.exe")
        self.assertNotEqual(call.executable.parent, self.paths.staged_host)
        self.assertFalse(call.executable.is_relative_to(self.install_root))
        self.assertEqual(call.manifest_path, self.paths.probe_manifest.resolve())
        self.assertEqual(
            inventory_files(call.executable.parent),
            expected_combined_probe_inventory(self.ownership),
        )
        self.assertFalse(self.workspace.last_root.exists())
        self.assertEqual(read_journal(self.paths.journal), journal)
        self.assertEqual(snapshot_tree(self.install_root), live_before)
        self.assertEqual(self.run_once.write_calls, [])
        self.assertEqual(self.engine_calls.activate_prepared, [])

    def test_failed_preflight_leaves_prepared_inert_for_browser_and_installer(self):
        failure = UpdateProbeResult(
            status="error", error_code="package_probe_failed"
        )
        for initiator in (UpdateInitiator.BROWSER, UpdateInitiator.INSTALLER):
            with self.subTest(initiator=initiator):
                fixture = self.fresh_prepared_fixture(initiator)
                fixture.probe.result = failure
                live_before = snapshot_tree(fixture.install_root)
                with self.assertRaisesRegex(
                    RecoveryError, "staged_probe_failed"
                ):
                    fixture.activate()
                self.assertEqual(
                    read_journal(fixture.paths.journal).phase,
                    JournalPhase.PREPARED,
                )
                self.assertEqual(snapshot_tree(fixture.install_root), live_before)
                self.assertEqual(fixture.run_once.write_calls, [])
                self.assertEqual(fixture.engine_calls.activate_prepared, [])
                self.assertFalse(fixture.workspace.last_root.exists())

    def test_installed_probe_remains_commit_gate_after_staged_probe_passes(self):
        fixture = self.fresh_prepared_fixture(UpdateInitiator.INSTALLER)
        fixture.probe.results = [
            fixture.success_result,
            UpdateProbeResult(
                status="error", error_code="package_probe_failed"
            ),
        ]

        result = fixture.controller.run_installer_update(TX_ID)

        self.assertEqual(len(fixture.probe.calls), 2)
        self.assertFalse(
            fixture.probe.calls[0].executable.is_relative_to(
                fixture.install_root
            )
        )
        self.assertEqual(
            fixture.probe.calls[1].executable,
            fixture.install_root / "dh_native_host.exe",
        )
        self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
        self.assertNotIn(JournalPhase.COMMITTED, fixture.journal_events)
```

`snapshot_tree` excludes only the recording workspace because production rejects a workspace inside `install_root`; it includes live Host, Extension, metadata, registration fixture, `updates/active.json`, transaction workspace, and RunOnce fake state. Add exact named tests for missing staged executable, incomplete `_internal`, missing/extra/hash-mismatched staged Host file, missing/extra/hash-mismatched staged Extension file, extra empty staged Host/Extension directory, malformed target metadata, package-manifest/ownership digest mismatch, Host version mismatch, Extension version mismatch, required/provided capability mismatch, probe timeout/exception, copy fault, and cleanup fault. Every ordinary failure is fixed `staged_probe_failed`, leaves the exact journal `PREPARED`, has zero RunOnce writes, zero `activate_prepared` calls, and no live/registration change. Copy and process faults remove the temporary view; cleanup failure remains a fixed failure and still cannot activate. Add an ordering assertion whose exact diagnostics/operation sequence is `create`, `copy`, `process`, `remove`, `runonce:arm`, `engine:activate`. Keep the staged and installed probe fakes distinct: the installed failure test must prove a staged success can never commit and that Plan B maps the post-mutation failure through rollback.

Add `test_staged_probe_workspace_receives_every_forbidden_root` and assert the recording workspace gets exactly `(install_root, updates_root, transaction_root, staged_root, probe_root)`. Add `test_temp_base_inside_install_fails_before_mkdtemp_or_mutation` and the same case for a transaction child. These tests prevent a hostile/misconfigured `TEMP` from turning an otherwise temporary preflight copy into a live-install mutation. Event callbacks are observational only: inject an ordinary exception from each callback and require fixed `staged_probe_failed`, cleanup of any created view, `PREPARED`, no RunOnce, and no engine/live mutation. Add `test_probe_time_staged_mutation_fails_before_any_activation_mutation`, table-driving Host, Extension, metadata, and added-path changes from the fake probe callback after temporary-view validation.

Add exact `test_windows_path_transaction_roots_pass_staged_workspace_boundary`. On Windows, assert every value in the exact forbidden-root tuple and the production workspace result is a `WindowsPath`, create and remove the workspace successfully, and prove the transaction/live snapshots are unchanged. Add exact table-driven `test_workspace_adapter_rejects_wrong_type_or_escaping_root_before_copy_or_cleanup`. Its adapter returns (a) a string naming an otherwise valid empty temp directory, (b) a non-`Path` `os.PathLike` naming that directory, and (c) `paths.staged_root / ".." / paths.probe_root.name`, whose canonical target is inside the transaction root. Every row must raise fixed `staged_probe_failed` before the `create` diagnostic, materialization, probe, RunOnce, engine, or live mutation; the untrusted result must not be passed to `workspace.remove`, and the exact transaction tree must remain unchanged.

```python
# Extend the existing test imports.
from dataclasses import replace
from pathlib import Path, WindowsPath


class NonPathPathLike(os.PathLike[str]):
    def __init__(self, value: Path) -> None:
        self.value = value

    def __fspath__(self) -> str:
        return os.fspath(self.value)


class ReturningStagedProbeWorkspace:
    def __init__(self, value: object) -> None:
        self.value = value
        self.remove_calls: list[Path] = []

    def create(self, _forbidden_roots: Sequence[Path]) -> Path:
        return self.value  # type: ignore[return-value]

    def remove(self, root: Path) -> None:
        self.remove_calls.append(root)
```

Insert these exact methods in the existing `StagedHostPreflightTests` class:

```python
    @unittest.skipUnless(os.name == "nt", "WindowsPath regression")
    def test_windows_path_transaction_roots_pass_staged_workspace_boundary(self):
        self.make_prepared_browser_transaction()
        forbidden = (
            self.paths.install_root,
            self.paths.updates_root,
            self.paths.transaction_root,
            self.paths.staged_root,
            self.paths.probe_root,
        )
        before = snapshot_tree(self.paths.install_root)
        self.assertTrue(all(isinstance(root, WindowsPath) for root in forbidden))
        self.assertTrue(all(isinstance(root, Path) for root in forbidden))
        workspace = TemporaryStagedProbeWorkspace()

        root = workspace.create(forbidden)
        self.assertIsInstance(root, WindowsPath)
        self.assertEqual(root, root.resolve(strict=True))
        workspace.remove(root)

        self.assertFalse(root.exists())
        self.assertEqual(snapshot_tree(self.paths.install_root), before)

    def test_workspace_adapter_rejects_wrong_type_or_escaping_root_before_copy_or_cleanup(
        self,
    ):
        for case in ("string", "pathlike", "escape"):
            with self.subTest(case=case):
                fixture = self.fresh_prepared_fixture(UpdateInitiator.BROWSER)
                outside = Path(tempfile.mkdtemp(prefix="dh-hostile-workspace-"))
                self.addCleanup(shutil.rmtree, outside, True)
                values = {
                    "string": os.fspath(outside),
                    "pathlike": NonPathPathLike(outside),
                    "escape": (
                        fixture.paths.staged_root
                        / ".."
                        / fixture.paths.probe_root.name
                    ),
                }
                workspace = ReturningStagedProbeWorkspace(values[case])
                events: list[str] = []
                dependencies = replace(
                    fixture.controller.dependencies,
                    staged_probe_workspace=workspace,
                    diagnostics=replace(
                        fixture.controller.dependencies.diagnostics,
                        after_staged_probe_event=events.append,
                    ),
                )
                controller = RecoveryController(fixture.install_root, dependencies)
                before = snapshot_tree(fixture.install_root)

                with patch(
                    "update_recovery._materialize_staged_probe_root"
                ) as materialize, self.assertRaisesRegex(
                    RecoveryError, "staged_probe_failed"
                ):
                    controller.preflight_prepared_target(TX_ID)

                materialize.assert_not_called()
                self.assertEqual(events, [])
                self.assertEqual(workspace.remove_calls, [])
                self.assertEqual(fixture.probe.calls, [])
                self.assertEqual(fixture.run_once.write_calls, [])
                self.assertEqual(fixture.engine_calls.activate_prepared, [])
                self.assertEqual(snapshot_tree(fixture.install_root), before)
```

Add `test_prepare_recovery_runtime_preflights_before_tree_or_registry_mutation`. Browser success with a registry has exact diagnostics sequence `create`, `copy`, `process`, `remove`, `tree-installed`, `status-registered`; installer success with explicit `registry=None` stops after `tree-installed` and has zero registry calls. Browser plus null/invalid registry and installer plus non-null registry fail before even starting staged preflight, tree installation, or registry mutation. Browser accepts only the current live onedir as recovery source; installer accepts only `paths.staged_host`; swapped/arbitrary sources fail before tree/registry mutation. On every staged-preflight fault, `install_recovery_tree` and `register_status_host` are uncalled and exact live/registry snapshots are unchanged. On a staged-byte mutation injected after the preparation boundary, the activation-time repeated preflight fails with the journal `PREPARED`, no RunOnce write, and no engine call; this locks both required placements without changing installer registration behavior.

Core browser identity cases:

```python
class RecoveryRunnerTests(unittest.TestCase):
    def test_activation_persists_complete_identity_before_retained_wait(self):
        identity = InitiatingProcessIdentity(
            pid=77,
            creation_token="win-create-time-133801632000000000",
        )
        self.process.add_process(identity, self.install_root / "dh_native_host.exe")
        journal = self.controller.run_complete_update(TX_ID, identity)
        self.assertEqual(journal.phase, JournalPhase.COMMITTED)
        waiting = next(
            value for value in self.journal_events
            if value.phase is JournalPhase.WAITING_FOR_HOST_EXIT
        )
        self.assertEqual(waiting.initiating_process, identity)
        self.assertEqual(self.process.opened_identities, [identity])
        self.assertEqual(self.process.waited_identities, [identity])

    def test_restart_opens_persisted_identity_once_only_while_waiting(self):
        identity = self.make_waiting_transaction()
        fresh = self.fresh_controller()
        fresh.recover_active()
        self.assertEqual(self.process.opened_identities, [identity])
        self.assertEqual(self.process.waited_identities, [identity])

    def test_restart_token_mismatch_treats_original_as_exited(self):
        identity = self.make_waiting_transaction()
        self.process.replace_pid(
            identity.pid,
            InitiatingProcessIdentity(
                identity.pid, "win-create-time-133801632999999999"
            ),
            self.install_root / "dh_native_host.exe",
        )
        result = self.fresh_controller().recover_active()
        self.assertIn(
            result.phase, (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK)
        )
        self.assertEqual(self.process.opened_identities, [identity])

    def test_installer_activation_uses_null_identity_and_never_opens_or_waits(self):
        self.make_prepared_installer_transaction(expected_version=None)
        journal = self.controller.run_installer_update(TX_ID)
        self.assertEqual(journal.phase, JournalPhase.COMMITTED)
        self.assertIsNone(journal.initiating_process)
        self.assertEqual(self.process.opened_identities, [])
        self.assertEqual(self.process.waited_identities, [])

    def test_interruption_while_prepared_rearms_run_once(self):
        self.make_prepared_browser_transaction()
        self.engine.activate_error = InjectedCrash()
        with self.assertRaises(InjectedCrash):
            self.controller.run_complete_update(TX_ID, self.identity)
        self.assertEqual(
            read_journal(self.paths.journal).phase,
            JournalPhase.PREPARED,
        )
        self.assertIsNotNone(self.run_once.read(RUN_ONCE_VALUE_NAME))

    def test_runonce_recovery_resets_inherited_cwd_to_active_transaction_root(self):
        self.make_waiting_transaction()
        self.fresh_controller().recover_active()
        self.assertEqual(
            self.cwd_calls,
            [self.paths.transaction_root.resolve(strict=True)],
        )
```

Add exact named tests for wrong browser identity, browser null impossible through type boundary, installer journal passed to browser method, browser journal passed to installer method, duplicate activation preserving original identity, absent original process before activation leaves `prepared`, wait failure maps through Plan B rollback, handle close once on success/failure/crash, no reopen after `host-backed-up`, probe exact target/capability match, probe failure/exception rollback, RunOnce arm/read-back before activation, every live phase refresh, interruption re-arm, terminal removal, manual-only removal, active path exactly `updates/active.json`, `recover_journal` containment, and no Plan C journal writer imports.

RunOnce lineage tests are exact:

```python
def test_rollback_failed_retry_uses_persisted_original_failure(self):
    journal = self.make_recovery_required(
        reason=JournalReason.ROLLBACK_FAILED,
        original=JournalReason.HOST_INSTALL_FAILED,
    )
    result = self.fresh_controller().recover_active()
    self.assertEqual(
        self.engine_calls.rollback,
        [(journal.transaction_id, JournalReason.HOST_INSTALL_FAILED)],
    )
    self.assertNotIn(
        (journal.transaction_id, JournalReason.ROLLBACK_FAILED),
        self.engine_calls.rollback,
    )
    self.assertIn(result.phase, (JournalPhase.ROLLED_BACK, JournalPhase.RECOVERY_REQUIRED))

def test_manual_recovery_required_removes_run_once_without_retry(self):
    self.make_recovery_required(
        reason=JournalReason.MANUAL_RECOVERY_REQUIRED,
        original=JournalReason.HOST_INSTALL_FAILED,
    )
    result = self.fresh_controller().recover_active()
    self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
    self.assertEqual(self.engine_calls.rollback, [])
    self.assertIsNone(self.run_once.read(RUN_ONCE_VALUE_NAME))
```

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_update_recovery.StagedHostPreflightTests","host.test_update_recovery.RecoveryRunnerTests","host.test_update_recovery.InstallerRecoveryTests","-v") -ExpectFailure`

Expected: missing staged-preflight/controller interfaces.

- [ ] **Step 3: Implement exact dependencies and hooks**

Define the temporary workspace boundary before the recovery dependencies. It creates only a fresh process-temp child; materialization separately rejects overlap with live and transaction roots. Removal must complete before a successful preflight can be returned:

```python
class StagedProbeWorkspace(Protocol):
    def create(self, forbidden_roots: Sequence[Path]) -> Path:
        raise AssertionError("staged probe workspace protocol method")

    def remove(self, root: Path) -> None:
        raise AssertionError("staged probe workspace protocol method")


def _canonical_forbidden_staged_probe_roots(
    forbidden_roots: Sequence[Path],
) -> tuple[Path, ...]:
    if not forbidden_roots or any(
        not isinstance(root, Path) for root in forbidden_roots
    ):
        raise RecoveryError("staged_probe_failed")
    try:
        normalized = tuple(
            Path(os.fspath(root)) for root in forbidden_roots
        )
        if any(not root.is_absolute() for root in normalized):
            raise ValueError("relative staged probe boundary")
        canonical = tuple(root.resolve(strict=True) for root in normalized)
        if any(root != resolved for root, resolved in zip(normalized, canonical)):
            raise ValueError("noncanonical staged probe boundary")
        return canonical
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise RecoveryError("staged_probe_failed") from error


def _canonical_staged_probe_root(
    value: object,
    forbidden_roots: Sequence[Path],
) -> Path:
    if not isinstance(value, Path):
        raise RecoveryError("staged_probe_failed")
    forbidden = _canonical_forbidden_staged_probe_roots(forbidden_roots)
    try:
        normalized = Path(os.fspath(value))
        if not normalized.is_absolute():
            raise ValueError("relative staged probe root")
        root = normalized.resolve(strict=True)
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise RecoveryError("staged_probe_failed") from error
    if normalized != root or any(
        root == forbidden_root
        or root.is_relative_to(forbidden_root)
        or forbidden_root.is_relative_to(root)
        for forbidden_root in forbidden
    ):
        raise RecoveryError("staged_probe_failed")
    try:
        _require_plain_ancestor_chain(root)
        _lstat_plain(root, require_directory=True)
    except RecoveryError as error:
        raise RecoveryError("staged_probe_failed") from error
    return root


class TemporaryStagedProbeWorkspace:
    def create(self, forbidden_roots: Sequence[Path]) -> Path:
        forbidden = _canonical_forbidden_staged_probe_roots(forbidden_roots)
        base = Path(tempfile.gettempdir())
        _require_plain_ancestor_chain(base)
        _lstat_plain(base, require_directory=True)
        base = base.resolve(strict=True)
        if any(base == root or base.is_relative_to(root) for root in forbidden):
            raise RecoveryError("staged_probe_failed")
        created = _canonical_staged_probe_root(
            Path(tempfile.mkdtemp(prefix="dh-staged-probe-", dir=base)),
            forbidden,
        )
        if (
            created.parent != base
            or not created.name.startswith("dh-staged-probe-")
        ):
            raise RecoveryError("staged_probe_failed")
        return created

    def remove(self, root: Path) -> None:
        if not isinstance(root, Path):
            raise RecoveryError("staged_probe_failed")
        try:
            normalized = Path(os.fspath(root))
            if not normalized.is_absolute():
                raise ValueError("relative staged probe root")
            canonical = normalized.resolve(strict=True)
        except (OSError, RuntimeError, TypeError, ValueError) as error:
            raise RecoveryError("staged_probe_failed") from error
        try:
            base = Path(tempfile.gettempdir()).resolve(strict=True)
        except (OSError, RuntimeError, TypeError, ValueError) as error:
            raise RecoveryError("staged_probe_failed") from error
        if (
            normalized != canonical
            or canonical.parent != base
            or not canonical.name.startswith("dh-staged-probe-")
        ):
            raise RecoveryError("staged_probe_failed")
        _lstat_plain(canonical, require_directory=True)
        shutil.rmtree(canonical)
        if canonical.exists() or canonical.is_symlink():
            raise RecoveryError("staged_probe_failed")
```

Add production-adapter tests proving the temp base is selected from the isolated `TEMP`/`TMP` environment, not the process cwd or live install, and that no directory is created before base/forbidden-root validation. The Windows regression must use ordinary `Path(...)` values, proving their concrete `WindowsPath` type passes both `isinstance` boundaries without test-only coercion.

Define these types once:

```python
@dataclass(frozen=True)
class RecoveryDiagnostics:
    after_staged_probe_event: Callable[[str], None] = _ignore_operation
    after_recovery_setup_event: Callable[[str], None] = _ignore_operation
    after_live_phase: Callable[[JournalPhase], None] = _ignore_phase
    after_wait: Callable[[InitiatingProcessIdentity], None] = _ignore_identity
    after_probe: Callable[[], None] = _ignore
    before_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_filesystem_operation: Callable[[str], None] = _ignore_operation
    after_journal_transition: Callable[[JournalPhase], None] = _ignore_phase


@dataclass(frozen=True)
class RecoveryDependencies:
    process: ProcessAdapter
    probe_process: ProbeProcessAdapter
    staged_probe_workspace: StagedProbeWorkspace
    run_once: RunOnceStore
    clock: Clock
    mutex_factory: Callable[[Path], MutationMutex]
    set_cwd: Callable[[Path], None]
    diagnostics: RecoveryDiagnostics = field(
        default_factory=RecoveryDiagnostics
    )
```

Use `field(default_factory=RecoveryDiagnostics)` so importing the module does
not construct even the diagnostics dependency object. `RecoveryController.__init__`
requires absolute plain `install_root`, stores the exact dependencies, derives
only `self.install_root` and `self.updates_root`, and keeps process attempt
state local. It defines no parallel path model. The production factory is
exact and must not instantiate a process API at module import time:

`RecoveryDiagnostics.after_staged_probe_event` receives only fixed strings `create|copy|process|remove`, and `after_recovery_setup_event` receives only `tree-installed|status-registered`; these are test/evidence seams and never receive paths, subprocess output, or exceptions. The exact ordering assertions use them rather than inferring order from mocks around private helpers.

```python
def create_production_recovery_controller(
    install_root: Path,
) -> RecoveryController:
    return RecoveryController(
        install_root,
        RecoveryDependencies(
            process=WindowsProcessAdapter(CtypesWin32ProcessApi()),
            probe_process=SubprocessProbeAdapter(),
            staged_probe_workspace=TemporaryStagedProbeWorkspace(),
            run_once=WindowsRunOnceStore(),
            clock=SystemClock(),
            mutex_factory=create_windows_mutation_mutex,
            set_cwd=os.chdir,
        ),
    )
```

`CtypesWin32ProcessApi()` appears only inside this factory and explicit Plan D launch composition. `TemporaryStagedProbeWorkspace()` has no constructor side effect; only `preflight_prepared_target` calls `create(forbidden_roots)`. Importing `update_platform`, `update_recovery`, `update_status_host`, or `update_entrypoint` on a non-Windows test process performs no `WinDLL`, temp-directory creation, registry call, or profile write; tests patch/call factories only with injected fakes.

Use Task 4's fixed `RecoveryError`; Task 5 adds no raw-message exception constructor. Internal OS/parser errors are chained as causes, and only its allowlisted codes cross Plan C boundaries.

Implement the staged preflight as one explicit read-only controller boundary. It must not call `_engine()`, arm/delete RunOnce, open the initiating process, register a Host, or mutate any `TransactionPaths` or live path:

```python
def preflight_prepared_target(
    self,
    transaction_id: str,
) -> UpdateProbeResult:
    root: Path | None = None
    try:
        tx = parse_transaction_id(transaction_id)
        paths = TransactionPaths.for_install(self.install_root, tx)
        active = read_active_transaction(paths.active)
        if (
            active.transaction_id != tx
            or resolve_active_journal(paths.updates_root, active)
            != paths.journal
        ):
            raise RecoveryError("staged_probe_failed")
        journal = read_journal(paths.journal)
        manifest = load_update_manifest(paths.probe_manifest)
        plan = read_ownership_plan(paths.ownership)
        if (
            journal.transaction_id != tx
            or journal.phase is not JournalPhase.PREPARED
            or journal.initiating_process is not None
            or journal.initiator
            not in (UpdateInitiator.BROWSER, UpdateInitiator.INSTALLER)
            or plan.transaction_id != tx
            or plan.target_version != journal.target_version
            or plan.prior_version != journal.prior_version
            or journal.fresh_install
            != (plan.source is OwnershipSource.FRESH)
            or journal.ownership_path != "ownership.json"
            or ownership_plan_sha256(plan) != journal.ownership_sha256
            or sha256_bytes(
                canonical_json_bytes(update_manifest_to_dict(manifest))
            ) != plan.package_ownership_sha256
            or manifest.package_version != journal.target_version
        ):
            raise RecoveryError("staged_probe_failed")

        forbidden_roots = (
            paths.install_root,
            paths.updates_root,
            paths.transaction_root,
            paths.staged_root,
            paths.probe_root,
        )
        created_root = self.dependencies.staged_probe_workspace.create(
            forbidden_roots
        )
        root = _canonical_staged_probe_root(created_root, forbidden_roots)
        self.dependencies.diagnostics.after_staged_probe_event("create")
        _materialize_staged_probe_root(root, paths, plan)
        self.dependencies.diagnostics.after_staged_probe_event("copy")
        result = self.dependencies.probe_process.run_probe(
            root / "dh_native_host.exe",
            paths.probe_manifest.resolve(strict=True),
        )
        if (
            result.status != "success"
            or result.host_version != journal.target_version
            or result.extension_version != journal.target_version
            or tuple(result.capabilities) != manifest.provided_capabilities
            or not set(manifest.required_capabilities).issubset(
                result.capabilities
            )
        ):
            raise RecoveryError("staged_probe_failed")
        self.dependencies.diagnostics.after_staged_probe_event("process")
        _require_staged_sources_exact(paths, plan)
        reread_journal = read_journal(paths.journal)
        reread_plan = read_ownership_plan(paths.ownership)
        reread_manifest = load_update_manifest(paths.probe_manifest)
        if (
            reread_journal != journal
            or reread_plan != plan
            or reread_manifest != manifest
            or ownership_plan_sha256(reread_plan)
            != reread_journal.ownership_sha256
            or sha256_bytes(
                canonical_json_bytes(
                    update_manifest_to_dict(reread_manifest)
                )
            ) != reread_plan.package_ownership_sha256
        ):
            raise RecoveryError("staged_probe_failed")
        return result
    except Exception as error:
        if (
            type(error) is RecoveryError
            and error.error_code == "staged_probe_failed"
        ):
            raise
        raise RecoveryError("staged_probe_failed") from error
    finally:
        if root is not None:
            try:
                self.dependencies.staged_probe_workspace.remove(root)
                self.dependencies.diagnostics.after_staged_probe_event(
                    "remove"
                )
            except Exception as cleanup_error:
                raise RecoveryError("staged_probe_failed") from cleanup_error
```

`_staged_probe_mapping(paths, plan)` builds the exact source/destination inventory from `plan.host_files`, `plan.extension_files`, `plan.metadata_files`, and `plan.seed_files`; it rejects duplicate/casefold-colliding destination paths. Every `host_files` record maps `paths.staged_host / record.path` to a probe-root-relative `record.path`; every Extension record maps `paths.staged_extension / record.path` to `extension/<record.path>`; every metadata record maps the same-named file from `paths.staged_host` to the root; and each staged seed maps to its live-relative root path. Require `plan.metadata_files` to be exactly `installed-product.json` and `release-integrity.json`; require Host inventory to include `dh_native_host.exe`, `system_prompt.md`, and at least one `_internal/` descendant; require Extension inventory to include `manifest.json`. Cross-check the mapping against the strict probe manifest: every Host/Extension product path and SHA-256 must match in both directions, and manifest package version must equal `plan.target_version`; this is in addition to the persisted manifest-digest link.

`_require_staged_sources_exact(paths, plan)` lstat-walks both staged roots, rejects every symlink/reparse/non-regular/non-directory entry, requires both complete regular-file sets and complete directory sets to equal the mapping and its implied ancestors, and verifies every source SHA-256. An added unowned file or empty directory is a failure. Before assigning cleanup ownership or emitting `create`, `_canonical_staged_probe_root` requires the adapter result to satisfy the frozen `Path` contract, be absolute and already canonical, resolve to a plain directory, and have no equality/ancestor overlap in either direction with canonical `paths.install_root`, `paths.updates_root`, `paths.transaction_root`, `paths.staged_root`, or `paths.probe_root`. `_materialize_staged_probe_root(root, paths, plan)` repeats the canonical overlap defense, requires the fresh root to be empty/plain, calls `_require_staged_sources_exact` before the first destination directory/copy, then creates directories and copies every mapped file with exclusive open, flush/fsync, exact destination hash verification, and no source metadata preservation. Finally enumerate the complete root and require exact file/directory path and digest equality with the expected combined inventory before starting the subprocess. No file is moved, hard-linked, junctioned, or read from live. Even when `config.json` is not a prepared seed, the probe remains complete because Plan A excludes `SEED_ONLY` from its product bijection; when fresh preparation did stage it, materialize and verify it without making it part of the probe's product comparison.

After the process result matches, call `_require_staged_sources_exact` again, then reread journal, ownership, and probe manifest and require semantic/link equality with the exact pre-process objects before cleanup/return. `prepare_recovery_runtime`, `run_complete_update`, and `run_installer_update` each perform one final `_require_staged_sources_exact` after their post-probe prepared reread and immediately before recovery-tree installation, process open/RunOnce, or engine activation. Plan B still performs its own under-mutex source/destination phase preflights. Tests mutate a staged Host byte, staged Extension byte, metadata byte, and add a staged path from inside the fake probe process after it has inspected the temporary view; each must become fixed `staged_probe_failed`, remove the view, retain `PREPARED`, and perform no recovery-tree/registry/RunOnce/engine/live mutation.

The `return result` above is provisional until `finally` completes: Python returns only after successful workspace removal. If removal fails, `staged_probe_failed` replaces the return and activation cannot continue. The controller assigns `root` only after validating the adapter result, so a wrong-type, relative, noncanonical, reparse-backed, or forbidden-overlap result is never trusted for materialization or cleanup. `TemporaryStagedProbeWorkspace.create` validates the existing temp base before `mkdtemp`; if `TEMP` resolves inside the live install or transaction roots, it fails before creating any directory. Tests set `TEMP` to the install root and a transaction child and assert `tempfile.mkdtemp`, RunOnce, engine, registry, and live paths are untouched. Tests also inject failure before each copy, after each copy, before process, after process, and during remove. No preflight success is persisted or cached; preparation-time validation and activation-time validation each run a fresh target process so staged bytes changed between those points fail closed. Interruption faults subclass `BaseException` and are not wrapped by the `except Exception`; `finally` still removes the validated view, and the activation caller has not yet armed RunOnce or mutated live state.

Implement the sole preparation boundary immediately after it:

```python
def prepare_recovery_runtime(
    self,
    transaction_id: str,
    runner_source: Path,
    registry: RegistryBackend | None,
) -> Path:
    _require_absolute_path(runner_source, "invalid_runner_source")
    if registry is not None and any(
        not callable(getattr(registry, name, None))
        for name in (
            "read_native_host", "write_native_host", "delete_native_host"
        )
    ):
        raise RecoveryError("staged_probe_failed")
    tx = parse_transaction_id(transaction_id)
    paths = TransactionPaths.for_install(self.install_root, tx)
    active = read_active_transaction(paths.active)
    if (
        active.transaction_id != tx
        or resolve_active_journal(paths.updates_root, active)
        != paths.journal
    ):
        raise RecoveryError("staged_probe_failed")
    before = read_journal(paths.journal)
    if (
        before.transaction_id != tx
        or before.phase is not JournalPhase.PREPARED
        or before.initiating_process is not None
        or (
            before.initiator is UpdateInitiator.BROWSER
            and registry is None
        )
        or (
            before.initiator is UpdateInitiator.INSTALLER
            and registry is not None
        )
    ):
        raise RecoveryError("staged_probe_failed")
    self.preflight_prepared_target(tx)
    # Close the external-process window before the first live-adjacent mutation.
    active_after = read_active_transaction(paths.active)
    journal = read_journal(paths.journal)
    if (
        active_after != active
        or resolve_active_journal(paths.updates_root, active_after)
        != paths.journal
        or journal != before
    ):
        raise RecoveryError("staged_probe_failed")
    plan = read_ownership_plan(paths.ownership)
    if ownership_plan_sha256(plan) != journal.ownership_sha256:
        raise RecoveryError("staged_probe_failed")
    _require_staged_sources_exact(paths, plan)
    expected_runner_source = (
        self.install_root
        if journal.initiator is UpdateInitiator.BROWSER
        else paths.staged_host.resolve(strict=True)
    )
    if runner_source.resolve(strict=True) != expected_runner_source:
        raise RecoveryError("invalid_runner_source")
    recovery = install_recovery_tree(runner_source, paths.updates_root)
    self.dependencies.diagnostics.after_recovery_setup_event(
        "tree-installed"
    )
    if registry is not None:
        register_status_host(recovery, registry)
        self.dependencies.diagnostics.after_recovery_setup_event(
            "status-registered"
        )
    return recovery
```

No production caller may compose `install_recovery_tree` and `register_status_host` directly. Their Task 4 public visibility exists for isolated primitive tests only. A static Plan C gate requires product call sites for both functions to be only `prepare_recovery_runtime`; the frozen Plan D handoff and Plan D's own later static gate require browser setup to call it with the registry and installer setup to call it with explicit `None`, rather than importing either primitive. Tests may call primitives directly.

Hook behavior is exact:

```python
def _before_live_phase(
    self,
    phase: JournalPhase,
    paths: TransactionPaths,
    _plan: OwnershipPlan,
) -> None:
    if paths.install_root != self.install_root:
        raise RecoveryError("install_root_mismatch")
    if paths.active != self.updates_root / "active.json":
        raise RecoveryError("active_path_mismatch")
    arm_run_once(self.dependencies.run_once)
    self.dependencies.diagnostics.after_live_phase(phase)


def _wait_for_host(self, identity: InitiatingProcessIdentity) -> None:
    if identity != self._expected_wait_identity:
        raise RecoveryError("initiating_process_identity_mismatch")
    if self._original_already_exited:
        return
    handle = self._host_handle
    if handle is None or handle.identity != identity:
        raise RecoveryError("initiating_process_handle_missing")
    if not self.dependencies.process.wait(handle, timeout_seconds=None):
        raise RecoveryError("host_exit_wait_failed")
    self.dependencies.diagnostics.after_wait(identity)


def _probe(self, install_root: Path, plan: OwnershipPlan) -> None:
    paths = TransactionPaths.for_install(install_root, plan.transaction_id)
    manifest = load_update_manifest(paths.probe_manifest)
    result = self.dependencies.probe_process.run_probe(
        install_root / "dh_native_host.exe",
        paths.probe_manifest,
    )
    if (
        manifest.package_version != plan.target_version
        or result.status != "success"
        or result.host_version != plan.target_version
        or result.extension_version != plan.target_version
        or tuple(result.capabilities) != manifest.provided_capabilities
        or not set(manifest.required_capabilities).issubset(result.capabilities)
    ):
        raise RecoveryError("startup_probe_failed")
    self.dependencies.diagnostics.after_probe()
```

`_engine()` constructs Plan B `UpdateEngine` with exactly these hooks and the injected mutex factory. It does not import a Plan B writer or transition function.

- [ ] **Step 4: Implement browser, installer, ready, and restart flows**

`run_complete_update` follows this exact order:

1. Validate ID and `type(process_identity) is InitiatingProcessIdentity`.
2. Derive `paths = TransactionPaths.for_install(self.install_root, id)` and require `paths.active == self.updates_root / "active.json"`.
3. Strict-read matching active/journal; require browser initiator, `PREPARED`, null journal process, complete recovery tree, and strict Plan B-owned `paths.probe_manifest` matching target.
4. Call `preflight_prepared_target(id)`. Any failure returns/raises while the journal remains `PREPARED`; do not apply `_finish_run_once`, because no RunOnce value was armed by this attempt.
5. Reread active/journal/ownership, require the same exact prepared facts, and call `_require_staged_sources_exact` after the external process returns and its temporary view is removed.
6. Call `process.open_identity(process_identity, live_executable)` once. If absent, raise `initiating_process_identity_missing` before RunOnce or engine mutation.
7. Store the retained handle/expected identity, arm/read-back RunOnce, and call `engine.activate_prepared(id, process_identity)`.
8. Apply `_finish_run_once` to the returned journal. Only exceptions after RunOnce arming enter the finish/re-arm policy: `PREPARED` is nonterminal and re-arms RunOnce, so a crash after arming but before activation remains automatically recoverable/idempotently inert; terminal/manual-only removes it. Close the retained handle exactly once in `finally`.

`run_installer_update` performs the same strict prepared/recovery/probe checks but requires installer initiator, calls `preflight_prepared_target(id)`, rereads the same active/journal/ownership facts, requires the ownership hash link, and calls `_require_staged_sources_exact` before any RunOnce write. It never touches `ProcessAdapter`, then arms RunOnce and calls `engine.activate_prepared(id, None)`. This is the only Plan C activation path that passes `None`, and it is rejected for a browser journal before preflight or the engine call.

Recovery of a journal already beyond `PREPARED` does not rerun staged preflight because activation already crossed the durable `WAITING_FOR_HOST_EXIT` boundary and staged sources may have been moved by Plan B. A direct `recover_active` invocation encountering a `PREPARED` journal returns it inert and performs no new RunOnce write or `resume`; explicit browser/installer activation must rerun staged preflight. An already-present RunOnce value can exist only after a prior attempt passed preflight and was interrupted after arming; this method does not create one for a preflight-rejected transaction.

`wait_until_ready` validates exact complete identity and nonnegative finite timeout. It repeatedly reads only `paths.journal`; `PREPARED` waits using injected clock, `WAITING_FOR_HOST_EXIT` or a later nonterminal phase returns only when `journal.initiating_process == process_identity`, and terminal/recovery/null/mismatched identity raises `update_activation_failed`.

`recover_active` reads `self.updates_root / "active.json"`, calls `resolve_active_journal(self.updates_root, active)`, requires the result equals `TransactionPaths.for_install(self.install_root, active.transaction_id).journal`, calls `dependencies.set_cwd(paths.transaction_root.resolve(strict=True))`, and delegates. It never looks below `recovery` for active state. `recover_journal` performs the same canonical `set_cwd` immediately after validating its exact `TransactionPaths.journal`. This repairs the inherited cwd of direct RunOnce/manual launches before any engine hook or subprocess executes; tests inject a recording setter and assert the active-derived canonical root.

`recover_journal` canonicalizes to exact `TransactionPaths.journal`, strict-reads journal and active, and applies:

```python
def _recover_loaded_journal(
    self: RecoveryController,
    transaction_id: str,
    journal: UpdateJournal,
) -> UpdateJournal:
    if journal.phase is JournalPhase.RECOVERY_REQUIRED:
        if (
            journal.reason_code is JournalReason.ROLLBACK_FAILED
            and journal.original_failure_code in FORWARD_FAILURE_CODES
        ):
            arm_run_once(self.dependencies.run_once)
            result = self._engine().rollback(
                transaction_id,
                journal.original_failure_code,
            )
        else:
            self.dependencies.run_once.delete(RUN_ONCE_VALUE_NAME)
            return journal
    else:
        result = self._engine().resume(transaction_id)
    return result
```

Before `resume` only when phase is `WAITING_FOR_HOST_EXIT`, require browser/non-null persisted identity and call `open_identity` once. A matching retained handle is stored; absent/mismatch sets `_original_already_exited=True`, so the engine wait hook returns without a second open. Installer waiting has null identity and Plan B skips its wait hook. Later phases never open a process. `finally` closes any retained handle.

`_finish_run_once` is invoked only after this attempt has armed RunOnce or while recovering a journal beyond `PREPARED`. Within that domain it is exact: delete only for `COMMITTED`, `ROLLED_BACK`, or `RECOVERY_REQUIRED` with `reason_code == MANUAL_RECOVERY_REQUIRED`. A `RECOVERY_REQUIRED` journal with `reason_code == ROLLBACK_FAILED` and `original_failure_code in FORWARD_FAILURE_CODES` remains automatically retryable and is re-armed. Every other post-arm nonterminal phase re-arms. Strict Plan B parsing permits no third recovery reason. In exception handling after arming, reread and apply the same policy before propagation, so an automatic original-failure rollback retry and every safe post-arm interruption retain RunOnce while explicit manual-only evidence does not loop at login. Staged-preflight exceptions never call this helper.

- [ ] **Step 5: Implement launch helpers with canonical transaction cwd**

```python
def launch_complete_update(
    process: ProcessAdapter,
    recovery_root: Path,
    paths: TransactionPaths,
    process_identity: InitiatingProcessIdentity,
) -> InitiatingProcessIdentity:
    validate_recovery_tree(recovery_root)
    if paths.transaction_root.parent != paths.transactions_root:
        raise RecoveryError("transaction_path_mismatch")
    return process.launch_detached(
        recovery_root / "dh_update_runner.exe",
        [
            "--complete-update",
            paths.transaction_root.name,
            str(process_identity.pid),
            process_identity.creation_token,
        ],
        paths.transaction_root.resolve(strict=True),
    )


def launch_active_recovery(
    process: ProcessAdapter,
    install_root: Path,
) -> InitiatingProcessIdentity:
    updates = install_root.resolve(strict=True) / "updates"
    active = read_active_transaction(updates / "active.json")
    journal_path = resolve_active_journal(updates, active)
    paths = TransactionPaths.for_install(install_root, active.transaction_id)
    if journal_path != paths.journal:
        raise RecoveryError("active_journal_mismatch")
    read_journal(paths.journal)
    recovery = updates / "recovery"
    validate_recovery_tree(recovery)
    return process.launch_detached(
        recovery / "dh_update_runner.exe",
        ["--recover-active"],
        paths.transaction_root.resolve(strict=True),
    )
```

Add tests proving both helpers pass exact canonical transaction root as cwd; recovery derives it from stable active before launch. The RunOnce registry value cannot specify cwd, so `--recover-active` ignores its inherited value, resolves active/journal/transaction root, and invokes the injected `set_cwd` before any engine action.

- [ ] **Step 6: Run GREEN and lineage/cwd mutations**

Run:

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_update_recovery.StagedHostPreflightTests",
  "host.test_update_recovery.RecoveryRunnerTests",
  "host.test_update_recovery.InstallerRecoveryTests",
  "host.test_update_engine_host",
  "host.test_update_engine_extension",
  "host.test_update_engine_rollback",
  "host.test_update_engine_resume",
  "-v"
)
```

Expected: `OK`. Mutate either `isinstance(root, Path)` boundary back to `type(root) is Path`; `test_windows_path_transaction_roots_pass_staged_workspace_boundary` must exit nonzero on Windows. Remove controller-side `_canonical_staged_probe_root`, or assign the adapter result to `root` before that validation; `test_workspace_adapter_rejects_wrong_type_or_escaping_root_before_copy_or_cleanup` must exit nonzero. Mutate activation to arm RunOnce before `preflight_prepared_target`; `test_failed_preflight_leaves_prepared_inert_for_browser_and_installer` and the exact event-order test must exit nonzero. Mutate staged preflight to execute `paths.staged_host / "dh_native_host.exe"` without the combined Extension/metadata view; `test_preflight_starts_combined_staged_frozen_target_before_activation` must exit nonzero. Remove the post-process `_require_staged_sources_exact`; `test_probe_time_staged_mutation_fails_before_any_activation_mutation` must exit nonzero. Inject a copy/process fault and require the matching fault-table test to exit nonzero if any RunOnce/activation/live event occurs. Mutate rollback retry to pass `journal.reason_code`; the original-failure test must exit nonzero. Mutate recovery launch cwd to `recovery_root`; the canonical-cwd test must exit nonzero. Restore each and rerun.

- [ ] **Step 7: Commit**

```powershell
git add host/update_recovery.py host/test_update_recovery.py
git commit -m "feat(update): orchestrate detached crash recovery"
```

### Task 6: Strict Read-Only Update Status Host

**Files:**
- Create: `host/update_status_host.py`
- Create: `host/test_update_status_host.py`

**Interfaces:**
- Produces `STATUS_MAX_REQUEST_BYTES = 64 * 1024`, `ChromeLaunch`, `parse_chrome_launch_args`, `project_update_status`, and `serve_status_host`.

Freeze signatures:

```text
parse_chrome_launch_args(argv: Sequence[str]) -> ChromeLaunch
project_update_status(journal: UpdateJournal) -> dict[str, object]
serve_status_host(input_stream: BinaryIO, output_stream: BinaryIO, install_root: Path, journal_reader: Callable[[Path], UpdateJournal] = read_journal) -> int
```

- [ ] **Step 1: Write RED argv, protocol, and read-only tests**

```python
class StatusArgTests(unittest.TestCase):
    def test_accepts_allowlisted_origin_and_optional_decimal_parent(self):
        origin = ALLOWED_ORIGINS[0]
        self.assertEqual(
            parse_chrome_launch_args([origin]),
            ChromeLaunch(origin=origin, parent_window=None),
        )
        self.assertEqual(
            parse_chrome_launch_args([origin, "--parent-window=123"]),
            ChromeLaunch(origin=origin, parent_window=123),
        )
        self.assertEqual(
            parse_chrome_launch_args([origin, "--parent-window=0"]),
            ChromeLaunch(origin=origin, parent_window=0),
        )
        self.assertEqual(
            parse_chrome_launch_args([origin, "--parent-window=00"]),
            ChromeLaunch(origin=origin, parent_window=0),
        )

    def test_rejects_path_id_unknown_origin_and_nondecimal_parent(self):
        origin = ALLOWED_ORIGINS[0]
        invalid = (
            [],
            ["chrome-extension://unknown/"],
            [origin, r"C:\journal.json"],
            [origin, TX_ID],
            [origin, "--parent-window=-1"],
            [origin, "--parent-window=0x10"],
            [origin, "--parent-window= 1"],
            [origin, "--parent-window=1", "--parent-window=2"],
        )
        for argv in invalid:
            with self.subTest(argv=argv), self.assertRaises(StatusHostArgumentError):
                parse_chrome_launch_args(argv)

    def test_direct_chrome_launch_accepts_zero_and_rejects_bool_or_negative(self):
        origin = ALLOWED_ORIGINS[0]
        self.assertEqual(ChromeLaunch(origin, 0).parent_window, 0)
        for value in (True, -1):
            with self.subTest(value=value), self.assertRaises(
                StatusHostArgumentError
            ):
                ChromeLaunch(origin, value)

```

`StatusProtocolTests` sends `ping`, exact-ID `get_update_status`, malformed/extra-key requests, other valid IDs, unknown transaction, malformed frame, and EOF through `BytesIO`. A successful status response is exactly:

```python
{
    "transactionId": TX_ID,
    "phase": "host-installed",
    "targetVersion": "2.0.75",
    "reasonCode": None,
}
```

Reason projection uses only current `journal.reason_code.value`; construct a recovery journal where `reason_code == rollback_failed` and `original_failure_code == host_install_failed` and assert output contains only `rollback_failed`. `StatusReadOnlyTests` parses the module AST and rejects imports/names/calls for `UpdateEngine`, `update_mutex`, `winreg`, `RunOnce`, `unlink`, `rmtree`, `replace`, `write_text`, `write_bytes`, or writable `open`.

Add this exact allocation-boundary test, importing `io` and `struct` in the test module. The synthetic stream supplies only an unsigned little-endian length prefix; any attempted body read fails the test, proving the status loop rejects the announced size before requesting or allocating a body buffer:

```python
class HeaderOnlyStream:
    def __init__(self, announced_size: int) -> None:
        self.announced_size = announced_size
        self.read_sizes: list[int] = []

    def read(self, size: int) -> bytes:
        self.read_sizes.append(size)
        if self.read_sizes == [4]:
            return struct.pack("<I", self.announced_size)
        raise AssertionError("status Host attempted to read an oversized body")


class StatusProtocolTests(unittest.TestCase):
    def test_rejects_more_than_64_kib_before_reading_body(self):
        input_stream = HeaderOnlyStream(STATUS_MAX_REQUEST_BYTES + 1)
        output_stream = io.BytesIO()

        result = serve_status_host(
            input_stream,
            output_stream,
            Path.cwd(),
            journal_reader=lambda _path: self.fail("journal read attempted"),
        )

        self.assertEqual(result, 2)
        self.assertEqual(input_stream.read_sizes, [4])
        self.assertEqual(output_stream.getvalue(), b"")
```

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_update_status_host","-v") -ExpectFailure`

Expected: missing `update_status_host`.

- [ ] **Step 3: Implement strict argv and projection**

```python
STATUS_MAX_REQUEST_BYTES = 64 * 1024
PARENT_WINDOW_RE = re.compile(r"^--parent-window=([0-9]+)$")
ALLOWED_PHASES = frozenset(phase.value for phase in JournalPhase)
ALLOWED_REASONS = frozenset(reason.value for reason in JournalReason)


@dataclass(frozen=True)
class ChromeLaunch:
    origin: str
    parent_window: int | None

    def __post_init__(self) -> None:
        if (
            type(self.origin) is not str
            or self.origin not in ALLOWED_ORIGINS
            or (
                self.parent_window is not None
                and (
                    type(self.parent_window) is not int
                    or self.parent_window < 0
                )
            )
        ):
            raise StatusHostArgumentError()


def parse_chrome_launch_args(argv: Sequence[str]) -> ChromeLaunch:
    if (
        len(argv) not in (1, 2)
        or type(argv[0]) is not str
        or argv[0] not in ALLOWED_ORIGINS
    ):
        raise StatusHostArgumentError()
    parent_window = None
    if len(argv) == 2:
        if type(argv[1]) is not str:
            raise StatusHostArgumentError()
        match = PARENT_WINDOW_RE.fullmatch(argv[1])
        if match is None:
            raise StatusHostArgumentError()
        parent_window = int(match.group(1), 10)
    return ChromeLaunch(argv[0], parent_window)


def project_update_status(journal: UpdateJournal) -> dict[str, object]:
    if journal.phase.value not in ALLOWED_PHASES:
        raise StatusHostProtocolError("invalid_journal_phase")
    reason = journal.reason_code
    if reason is not None and reason.value not in ALLOWED_REASONS:
        raise StatusHostProtocolError("invalid_journal_reason")
    return {
        "transactionId": journal.transaction_id,
        "phase": journal.phase.value,
        "targetVersion": journal.target_version,
        "reasonCode": reason.value if reason is not None else None,
    }
```

`PARENT_WINDOW_RE` accepts ASCII decimal digits only. Conversion is base 10;
`0` is the valid Chrome sentinel, while negative, signed, hexadecimal, spaced,
empty, duplicate, and extra-argument forms are rejected. Leading zeroes are
decimal and accepted because Chrome supplies a nonnegative decimal sentinel,
not a canonical integer serialization; `--parent-window=00` parses to `0`.
`ChromeLaunch.__post_init__` accepts `parent_window is None` or an exact built-in
nonnegative `int`; it rejects booleans and negatives so direct construction
cannot bypass the parser.
Both main and status validators call this same parser, so the sentinel grammar
cannot drift between matrix rows.
No upper bound is imposed here; Chrome's decimal handle grammar and Python's
integer conversion define the accepted range.
Positive coverage runs through the direct parser and full entrypoint dispatch
for both main and status modes.

Define safe errors and implement the complete status loop:

```python
class StatusHostArgumentError(ValueError):
    def __init__(self) -> None:
        super().__init__("invalid_status_host_arguments")


class StatusHostProtocolError(ValueError):
    _ALLOWED = frozenset({
        "invalid_request",
        "unknown_action",
        "unknown_transaction",
        "invalid_journal_phase",
        "invalid_journal_reason",
    })

    def __init__(self, error_code: str) -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_status_error")
        self.error_code = error_code
        super().__init__(error_code)


def _status_error(
    request_id: str | None,
    error_code: str,
) -> dict[str, object]:
    return {
        "requestId": request_id,
        "status": "error",
        "error_code": error_code,
    }


def _handle_status_request(
    message: dict[str, object],
    install_root: Path,
    journal_reader: Callable[[Path], UpdateJournal],
) -> dict[str, object]:
    if not set(message).issubset({"requestId", "action", "payload"}):
        raise StatusHostProtocolError("invalid_request")
    request_id = message.get("requestId")
    if request_id is not None and type(request_id) is not str:
        raise StatusHostProtocolError("invalid_request")
    action = message.get("action")
    if type(action) is not str:
        raise StatusHostProtocolError("invalid_request")
    if action == "ping":
        if set(message) not in ({"action"}, {"requestId", "action"}):
            raise StatusHostProtocolError("invalid_request")
        return {
            "requestId": request_id,
            "status": "success",
            "data": "pong",
        }
    if action != "get_update_status":
        raise StatusHostProtocolError("unknown_action")
    if set(message) not in (
        {"action", "payload"},
        {"requestId", "action", "payload"},
    ):
        raise StatusHostProtocolError("invalid_request")
    payload = message["payload"]
    if type(payload) is not dict or set(payload) != {"transactionId"}:
        raise StatusHostProtocolError("invalid_request")
    transaction_id = parse_transaction_id(payload["transactionId"])
    journal_path = TransactionPaths.for_install(
        install_root, transaction_id
    ).journal
    try:
        journal = journal_reader(journal_path)
    except (FileNotFoundError, JournalValidationError) as error:
        raise StatusHostProtocolError("unknown_transaction") from error
    if journal.transaction_id != transaction_id:
        raise StatusHostProtocolError("unknown_transaction")
    return {
        "requestId": request_id,
        "status": "success",
        "data": project_update_status(journal),
    }


def serve_status_host(
    input_stream: BinaryIO,
    output_stream: BinaryIO,
    install_root: Path,
    journal_reader: Callable[[Path], UpdateJournal] = read_journal,
) -> int:
    while True:
        try:
            message = read_native_message(
                input_stream,
                max_payload_bytes=STATUS_MAX_REQUEST_BYTES,
            )
        except NativeMessageError:
            return 2
        if message is None:
            return 0
        request_id = (
            message.get("requestId")
            if type(message.get("requestId")) is str
            else None
        )
        try:
            response = _handle_status_request(
                message, install_root, journal_reader
            )
        except StatusHostProtocolError as error:
            response = _status_error(request_id, error.error_code)
        except (JournalValidationError, ValueError, OSError):
            response = _status_error(request_id, "invalid_request")
        write_message(output_stream, response)
```

The loop validates exact built-in dict/string types and own-key sets. `ping` never reads disk. `get_update_status` accepts payload exactly `{"transactionId": <32hex>}`, derives only `TransactionPaths.for_install(install_root, id).journal`, reads it, requires embedded ID equality, and writes an allowlisted response through Task 1 framing. The explicit `64 KiB` inbound limit is checked from the unsigned prefix before a body read; framing desynchronization or oversize exits `2` without attempting a response. It never reads `active.json`, so any validated transaction ID is independently queryable. `write_message` and its limit remain unchanged.

- [ ] **Step 4: Run GREEN and static gate**

Run the status suite and:

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import inspect; from update_status_host import serve_status_host; assert tuple(inspect.signature(serve_status_host).parameters)==('input_stream','output_stream','install_root','journal_reader')"
)
git grep -n -E "UpdateEngine|update_mutex|winreg|RunOnce|unlink|rmtree|os\.replace|write_text|write_bytes|open\(.+[wa]" -- host/update_status_host.py
if ($LASTEXITCODE -eq 0) { throw "Status Host mutation dependency found." }
```

Expected: tests/probe exit 0 and grep has no output.

- [ ] **Step 5: Commit**

```powershell
git add host/update_status_host.py host/test_update_status_host.py
git commit -m "feat(update): add read-only update status host"
```

### Task 7: Cursor-Reserved Finalization And Atomic-Move Acknowledgment

**Files:**
- Modify: `host/update_recovery.py`
- Modify: `host/test_update_recovery.py`

**Interfaces:**
- Produces `FinalizationReceipt`, `FinalizationCursor`, `FinalizationFilesystem`, `OSFinalizationFilesystem`, `finalize_update_status`, `acknowledge_update_finalization`, and `require_no_pending_finalization`.

`FinalizationFilesystem` is a Plan C adapter protocol exposed through
keyword-only injection for Plan C tests/production composition; Plan D passes
no adapter and consumes the three public functions plus record dataclasses.
Scratch inspection does not expand Plan D's runtime responsibility.

The adapter protocol does not imply that an injected implementation may weaken
atomicity: `move_receipt_to_ack` has exactly the same atomic same-volume move
contract in fakes and production. Plan D never supplies an adapter.

`OSFinalizationFilesystem.atomic_write` remains for cursor/receipt creation and
state transitions only. The ack slot has exactly one producer:
`move_receipt_to_ack`.
`move_receipt_to_ack` is never called by finalize or the start barrier; only
matching acknowledgment crosses that commit point.

No public finalization API accepts an acknowledgment payload. The caller
supplies only the transaction ID; Plan C compares it to durable cursor/receipt
or slot bytes.

Plan D's existing `FinalizationFilesystem` type import in its prerequisite
ledger is retained only because the public function annotations expose it; no
Plan D implementation constructs or calls it.

This protocol is intentionally the only finalization filesystem seam. Do not
inject separate receipt/cursor stores whose states could diverge.

The protocol is synchronous. No finalization method returns an awaitable or
releases the installation mutex around record compare/write/remove steps.

Tests include two concurrent `finalize_update_status` calls for different IDs
against the same fake mutex: exactly one reserves the cursor; the other returns
`finalization_ack_pending` with no receipt/engine/registry event. They also
pause `UPDATE_START` at the Plan D service seam and prove no newer transaction
or finalization can begin until the old cursor and cursor scratch are gone.

All cursor/receipt/ack-slot operations are serialized by the installation
mutex. Calls to Plan B `finalize_terminal_evidence` occur after releasing that
mutex because Plan B reacquires it; acknowledgment cannot acquire the mutex and
move the receipt until that cleanup call returns or crashes. Plan D's service
operation queue provides the additional check-to-create ordering described in
the handoff.

The fixture establishes two independently valid terminal authorities only for
this concurrency test; production normally has one active authority. This
ensures the cursor, not missing authority, decides the loser.

The production implementation is required to be `OSFinalizationFilesystem`;
an injected adapter is accepted only through explicit tests/composition and is
validated structurally. No environment/config switch selects an adapter.

`OSFinalizationFilesystem` is stateless and constructor-side-effect-free. All
filesystem/Win32 work occurs in methods after validation and mutex acquisition;
tests assert `__init__` performs no work.

Because the required acknowledgment primitive is `os.replace`, Plan C requires
`updates/receipts` and `updates/finalization-ack.json` to share the same volume.
The fixed layout normally guarantees this under one install root; the adapter
still compares `os.stat(..., follow_symlinks=False).st_dev` for both parent
directories and fails closed before replacement if a mount/injected filesystem
violates it.

Production runs on one fixed install volume. If a filesystem cannot provide a
stable device identity for the two existing parent directories, acknowledgment
fails closed through the public `finalization_cleanup_failed` wrapper; it never
falls back to copy plus delete.

Although methods are synchronous, every write, move, and removal checks
interruption faults at explicit seams; no background worker owns finalization
state.

The default `create_windows_mutation_mutex` is a function reference; calling it
after path validation is the first allowed synchronization-object construction
for finalization APIs.

All three public APIs use one non-reentrant installation mutex acquisition per
call. `finalize_update_status` releases it before the Plan B cleanup call;
acknowledgment is a later call and acquires it independently.

Freeze `FinalizationFilesystem` method order for interface probes:
`atomic_write`, `read`, `exists`, `has_atomic_scratch`,
`move_receipt_to_ack`, `remove_cursor`, `fsync_file`, `fsync_directory`.

The protocol deliberately has no list/enumerate/delete-directory method.

No public finalization signature accepts a cursor/receipt path. Every path is
derived from canonical `install_root` plus validated transaction ID; injected
filesystem adapters receive only those derived paths.

`finalize_update_status` and acknowledgment require caller `install_root`
already equals `TransactionPaths.for_install(...).install_root`; the barrier
applies the equivalent canonical check. Relative/noncanonical roots fail before
mutex/filesystem construction.

The `filesystem` keyword-only parameter is an injected adapter instance for
tests and `mutex_factory` is an injected factory. Their defaults instantiate
nothing: with `filesystem=None`, Plan C creates `OSFinalizationFilesystem` only
after transaction/install path validation and mutex acquisition.

`finalize_update_status` is the exact existing Plan C/Plan D public terminal
finalizer referred to as `finalize_terminal` in review shorthand; do not add a
second alias or wrapper. Its different-transaction result is exactly
`FinalizationError("finalization_ack_pending")`.
Same-ID replay always returns the same `FinalizationReceipt`; no cursor or slot
path crosses the Plan D boundary.

The `filesystem` adapter never receives an arbitrary caller path. Every method
argument is one of the canonical paths derived in the public API after strict
root/ID validation.

`require_no_pending_finalization` is read-only. It never creates, rewrites,
moves, or removes a cursor, receipt, ack slot, active record, journal, registry
value, or engine/controller/process object. A cursor target or cursor scratch
always closes the start barrier; only explicit matching acknowledgment replay
may clear it. The fixed ack slot alone never closes start.

Freeze signatures:

```text
finalize_update_status(install_root: Path, transaction_id: str, registry: RegistryBackend, engine_factory: Callable[[Path], UpdateEngine], *, filesystem: FinalizationFilesystem | None = None, mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex) -> FinalizationReceipt
acknowledge_update_finalization(install_root: Path, transaction_id: str, *, filesystem: FinalizationFilesystem | None = None, mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex) -> bool
require_no_pending_finalization(install_root: Path, *, filesystem: FinalizationFilesystem | None = None, mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex) -> None
```

Freeze stable paths:

```text
at most one active receipt: <install>/updates/receipts/<current_transaction_id>.json
active finalization cursor: <install>/updates/finalization-cursor.json
fixed last-ack slot: <install>/updates/finalization-ack.json
active: <install>/updates/active.json
```

All path names are case-exact. Case variants are rejected rather than treated
as additional slots.
Containment/plain-ancestor checks precede record reads; valid-looking bytes
behind a symlink/reparse parent are rejected.

The invariant is exactly one active cursor per installation. A new finalizer
first publishes that cursor in `reserved` state, then writes one matching
receipt, then atomically rewrites the cursor to `receipt-ready`. Acknowledgment
is legal only for a matching `receipt-ready` cursor after Plan B terminal
evidence cleanup. It does not serialize a second acknowledgment object:
`move_receipt_to_ack` performs one same-volume
`os.replace(receipt_path, ack_path)`, so the fixed ack slot contains the exact
canonical receipt bytes. It fsyncs the moved file and both parent directories
where the platform supports those operations before cursor removal. There is
no per-transaction ack set and no receipt unlink.

Acknowledgment accepts only `receipt-ready`; a `reserved` cursor is incomplete
finalization and must be resumed through `finalize_update_status` first.
The public acknowledgment API never calls `engine_factory` or unregisters
status; it only verifies cleanup is complete and moves/cleans its own records.
Its frozen signature therefore contains neither dependency.
It never writes/recreates a receipt: before replace it consumes the existing
source, after replace it reads the slot, and ack+cursor-scratch replay writes
only the cursor derived from complete slot bytes.
No public finalization path uses `shutil.copy*`, `Path.replace`, or a temporary
ack file to acknowledge; the commit call is direct standard-library
`os.replace`.

No finalization function scans or enumerates `updates/receipts`. Atomic writes
for cursor and receipt use only `.<record-name>.tmp` beside each target. The ack
slot has no scratch because it is populated only by moving the receipt. A crash
can therefore leave at most one cursor scratch and one current receipt scratch;
same-ID finalization replay validates that exact scratch before retrying. It
never discovers scratch by enumeration and never creates a second scratch name.
`atomic_write(ack_path, ...)` is rejected, and artifact tests fail if a manual
`.finalization-ack.json.tmp` ever appears.
`has_atomic_scratch(ack_path)` returns `False` when that forbidden sibling is
absent and raises fixed ack corruption when present; identity is never derived
from ack scratch bytes.
The ack path itself may be absent or one plain regular file; it is never a
directory/symlink/reparse point.

Static ownership tests require exactly one production `os.replace` call whose
target is the ack slot, located in `move_receipt_to_ack`; no other function may
create/replace that path.

Receipt filenames are always the strict lower-hex transaction ID plus `.json`;
case variants cannot create a second source name for the active cursor.

When both stable target and scratch exist, the stable target is authoritative.
Scratch is never consulted to choose transaction identity; matching replay may
normalize it, and different-ID calls leave it untouched.

Matching ack+cursor-scratch replay is the one durability-completion case that
does not derive identity from scratch bytes: the explicit requested ID must
match the complete fixed ack. Replay uses that full receipt to normalize the
deterministic scratch into an exact receipt-ready cursor, re-fsyncs the ack, and
removes/fsyncs the cursor normally. The general start barrier remains closed
until that replay returns.

`updates/receipts` itself is one fixed directory. It is retained when empty.
Acknowledgment removes the matching source name only as the indivisible source
side of `os.replace`; it never unlinks a receipt or deletes the directory. At
the atomic namespace transition, observers see either source+old slot or
no-source+new matching slot, never an intermediate committed namespace with
neither. Power-loss durability before parent fsync is modeled separately in the
crash table and may restore either whole pre- or post-replace namespace.
No later transaction may create a receipt while any old cursor exists, so this
directory never accumulates stable receipts from multiple transactions.

- [ ] **Step 1: Write RED receipt, four-way terminal, engine ownership, and replay tests**

Use Plan B public engine APIs to create terminal fixtures. Do not manually delete or write workspace/active state. Core assertions:

```python
class FinalizationTests(unittest.TestCase):
    def setUp(self):
        self.addCleanup(
            self.assert_no_unknown_finalization_artifacts
        )

    def test_cursor_precedes_receipt_unregister_and_engine_cleanup(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        receipt = fixture.finalize(TX_ID)
        self.assertEqual(receipt.to_dict(), {
            "outcome": "committed",
            "state": "finalized-awaiting-ack",
            "terminal_version": {
                "fresh_install": False,
                "version": fixture.target_version,
            },
            "transactionId": TX_ID,
        })
        self.assertLess(
            fixture.events.index("cursor-reserved:dir-fsync"),
            fixture.events.index("receipt:dir-fsync"),
        )
        self.assertLess(
            fixture.events.index("receipt:dir-fsync"),
            fixture.events.index("cursor-receipt-ready:dir-fsync"),
        )
        self.assertLess(
            fixture.events.index("cursor-receipt-ready:dir-fsync"),
            fixture.events.index("status:unregister"),
        )
        self.assertLess(
            fixture.events.index("status:unregister"),
            fixture.events.index("engine:finalize-terminal-evidence"),
        )
        self.assertFalse(fixture.paths.active.exists())
        self.assertFalse(fixture.paths.transaction_root.exists())

    def test_finalization_filesystem_protocol_order_is_exact(self):
        self.assertEqual(
            tuple(
                name
                for name, value in FinalizationFilesystem.__dict__.items()
                if callable(value) and not name.startswith("_")
            ),
            (
                "atomic_write",
                "read",
                "exists",
                "has_atomic_scratch",
                "move_receipt_to_ack",
                "remove_cursor",
                "fsync_file",
                "fsync_directory",
            ),
        )

    def test_fresh_rollback_receipt_has_null_terminal_version(self):
        fixture = self.make_terminal_fixture(
            JournalPhase.ROLLED_BACK,
            fresh_install=True,
            prior_version=None,
        )
        self.assertEqual(
            fixture.finalize(TX_ID).terminal_version,
            TerminalVersion(version=None, fresh_install=True),
        )

    def test_plan_b_terminal_projection_table_is_frozen_exactly(self):
        cases = (
            (
                "committed-existing",
                JournalPhase.COMMITTED,
                False,
                "2.0.74",
                TerminalVersion(version="2.0.75", fresh_install=False),
            ),
            (
                "committed-fresh",
                JournalPhase.COMMITTED,
                True,
                None,
                TerminalVersion(version="2.0.75", fresh_install=True),
            ),
            (
                "rolled-back-existing",
                JournalPhase.ROLLED_BACK,
                False,
                "2.0.74",
                TerminalVersion(version="2.0.74", fresh_install=False),
            ),
            (
                "rolled-back-fresh",
                JournalPhase.ROLLED_BACK,
                True,
                None,
                TerminalVersion(version=None, fresh_install=True),
            ),
        )
        for label, phase, fresh_install, prior_version, expected in cases:
            with self.subTest(label=label):
                fixture = self.make_terminal_fixture(
                    phase,
                    fresh_install=fresh_install,
                    prior_version=prior_version,
                    target_version="2.0.75",
                )
                self.assertEqual(
                    fixture.finalize(TX_ID).terminal_version,
                    expected,
                )

    def test_finalization_record_constructor_table_matches_plan_b(self):
        valid = (
            ("committed", TerminalVersion(version="2.0.75", fresh_install=False)),
            ("committed", TerminalVersion(version="2.0.75", fresh_install=True)),
            ("rolled-back", TerminalVersion(version="2.0.74", fresh_install=False)),
            ("rolled-back", TerminalVersion(version=None, fresh_install=True)),
        )
        for outcome, version in valid:
            with self.subTest(outcome=outcome, version=version):
                self.assertEqual(
                    FinalizationReceipt(TX_ID, outcome, version).terminal_version,
                    version,
                )

        invalid = (
            ("committed", TerminalVersion(version=None, fresh_install=True)),
            ("committed", TerminalVersion(version=None, fresh_install=False)),
            ("rolled-back", TerminalVersion(version=None, fresh_install=False)),
            ("rolled-back", TerminalVersion(version="2.0.74", fresh_install=True)),
        )
        for outcome, version in invalid:
            with self.subTest(outcome=outcome, version=version), self.assertRaises(
                FinalizationError
            ):
                FinalizationReceipt(TX_ID, outcome, version)

    def test_committed_fresh_receipt_round_trips_canonical_json(self):
        fixture = self.make_terminal_fixture(
            JournalPhase.COMMITTED,
            fresh_install=True,
            prior_version=None,
            target_version="2.0.75",
        )
        receipt = FinalizationReceipt(
            TX_ID,
            "committed",
            TerminalVersion(version="2.0.75", fresh_install=True),
        )
        fixture.ensure_receipts_directory()
        fixture.filesystem.atomic_write(
            fixture.receipt_path(TX_ID), receipt.to_dict()
        )
        self.assertEqual(
            load_finalization_receipt(
                fixture.receipt_path(TX_ID), TX_ID, fixture.filesystem
            ),
            receipt,
        )

    def test_plan_c_never_directly_deletes_workspace_or_active(self):
        source = inspect.getsource(finalize_update_status)
        self.assertNotIn("unlink(", source)
        self.assertNotIn("rmtree(", source)
        self.assertNotIn("remove_transaction", source)
        self.assertNotIn("remove_matching_active", source)
        self.assertIn("finalize_terminal_evidence", source)

    def test_lost_finalize_response_replays_stable_receipt_after_engine_cleanup(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        first = fixture.finalize(TX_ID)
        second = fixture.finalize(TX_ID)
        self.assertEqual(second, first)
        self.assertEqual(fixture.filesystem.receipt_writes, 1)
        self.assertEqual(fixture.engine.finalize_calls, [TX_ID, TX_ID])

    def test_same_id_finalize_replays_cursor_without_second_receipt(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.filesystem.crash_after = "receipt:dir-fsync"
        with self.assertRaises(InjectedCrash):
            fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = None
        first_bytes = fixture.receipt_path(TX_ID).read_bytes()
        replay = fixture.finalize(TX_ID)
        self.assertEqual(fixture.receipt_path(TX_ID).read_bytes(), first_bytes)
        self.assertEqual(replay.transaction_id, TX_ID)

    def test_ack_atomically_moves_receipt_to_fixed_slot_then_removes_cursor(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        self.assertTrue(fixture.acknowledge(TX_ID))

    def test_ack_slot_is_exactly_one_fixed_path(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        self.assertEqual(
            fixture.ack_path,
            fixture.paths.updates_root / "finalization-ack.json",
        )
        source = inspect.getsource(acknowledge_update_finalization)
        filesystem_source = inspect.getsource(
            OSFinalizationFilesystem.move_receipt_to_ack
        )
        self.assertNotIn("acknowledgments", source)
        self.assertNotIn("transaction_id}.ack", source)
        self.assertIn("os.replace(receipt_path, ack_path)", filesystem_source)

    def test_ack_slot_contains_exact_moved_receipt_bytes_for_fresh_commit(self):
        fixture = self.make_terminal_fixture(
            JournalPhase.COMMITTED,
            fresh_install=True,
            prior_version=None,
            target_version="2.0.75",
        )
        receipt = fixture.finalize(TX_ID)
        source_bytes = fixture.receipt_path(TX_ID).read_bytes()
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertEqual(fixture.ack_path.read_bytes(), source_bytes)
        self.assertEqual(
            load_finalization_ack(fixture.ack_path, fixture.filesystem),
            receipt,
        )

    def test_only_acknowledgment_calls_receipt_move(self):
        source = Path(inspect.getsourcefile(acknowledge_update_finalization)).read_text(
            encoding="utf-8"
        )
        tree = ast.parse(source)
        owners = call_owners(tree, "move_receipt_to_ack")
        self.assertEqual(owners, ["acknowledge_update_finalization"])
        self.assertLess(
            fixture.events.index("ack-move:replace"),
            fixture.events.index("ack:file-fsync"),
        )
        self.assertLess(
            fixture.events.index("ack:file-fsync"),
            fixture.events.index("ack-move:source-dir-fsync"),
        )
        self.assertLess(
            fixture.events.index("ack-move:source-dir-fsync"),
            fixture.events.index("ack-move:target-dir-fsync"),
        )
        self.assertLess(
            fixture.events.index("ack-move:target-dir-fsync"),
            fixture.events.index("cursor:delete-dir-fsync"),
        )
        self.assertFalse(fixture.receipt_path(TX_ID).exists())
        self.assertFalse(fixture.cursor_path.exists())
        self.assertTrue(fixture.ack_path.exists())
        self.assertEqual(
            fixture.ack_path.read_bytes(),
            fixture.expected_receipt_bytes(TX_ID),
        )
        self.assertTrue(fixture.acknowledge(TX_ID))
        fixture.require_no_pending()

    def test_update_start_barrier_stays_closed_until_cursor_is_removed(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = "ack-move:target-dir-fsync"
        with self.assertRaises(InjectedCrash):
            fixture.acknowledge(TX_ID)
        with self.assertRaisesRegex(
            FinalizationError, "finalization_ack_pending"
        ):
            fixture.require_no_pending()
        self.assertTrue(fixture.acknowledge(TX_ID))
        fixture.require_no_pending()

    def test_cursor_scratch_alone_blocks_start_and_newer_finalization(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.filesystem.crash_after = "cursor-reserved:file-fsync"
        with self.assertRaises(InjectedCrash):
            fixture.finalize(TX_ID)
        with self.assertRaisesRegex(
            FinalizationError, "finalization_ack_pending"
        ):
            fixture.require_no_pending()
        fixture.assert_newer_finalize_blocked("f" * 32)
        fixture.filesystem.crash_after = None
        fixture.finalize(TX_ID)
        fixture.acknowledge(TX_ID)

    def test_cursor_scratch_with_matching_ack_replays_success(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = "cursor:delete-dir-fsync"
        with self.assertRaises(InjectedCrash):
            fixture.acknowledge(TX_ID)
        fixture.filesystem.persist_cursor_as_scratch_only()
        fixture.filesystem.crash_after = None

        self.assertTrue(fixture.acknowledge(TX_ID))
        fixture.require_no_pending()
        self.assertFalse(fixture.cursor_path.exists())
        self.assertFalse(fixture.cursor_scratch_path.exists())

    def test_cursor_scratch_with_wrong_id_ack_rejects(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.write_cursor_scratch_for(TX_ID)
        fixture.write_ack_receipt_for("f" * 32)
        before = fixture.finalization_snapshot()
        with self.assertRaisesRegex(
            FinalizationError, "finalization_not_current"
        ):
            fixture.acknowledge(TX_ID)
        self.assertEqual(fixture.finalization_snapshot(), before)

    def test_different_transaction_cannot_create_receipt_while_cursor_pending(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        cursor_before = fixture.cursor_path.read_bytes()
        with self.assertRaisesRegex(
            FinalizationError, "finalization_ack_pending"
        ):
            fixture.finalize("f" * 32)
        self.assertEqual(fixture.cursor_path.read_bytes(), cursor_before)
        self.assertFalse(fixture.receipt_path("f" * 32).exists())
        self.assertEqual(fixture.registry.events_after_last_call, [])
        self.assertEqual(fixture.engine_factory.calls_after_last_call, [])

    def test_same_id_replay_receipt_error_retains_preexisting_cursor(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.filesystem.crash_after = "cursor-reserved:replace"
        with self.assertRaises(InjectedCrash):
            fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = None
        fixture.filesystem.fail_ordinary_at = "receipt:scratch-create"
        with self.assertRaisesRegex(
            FinalizationError, "invalid_finalization_receipt"
        ):
            fixture.finalize(TX_ID)
        self.assertTrue(fixture.cursor_path.exists())
        self.assertFalse(fixture.receipt_path(TX_ID).exists())

    def test_crash_after_move_replays_from_matching_ack_slot(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = "ack-move:replace"
        with self.assertRaises(InjectedCrash):
            fixture.acknowledge(TX_ID)
        fixture.filesystem.crash_after = None
        self.assertFalse(fixture.receipt_path(TX_ID).exists())
        self.assertEqual(fixture.load_ack_receipt().transaction_id, TX_ID)
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertFalse(fixture.cursor_path.exists())

    def test_post_replace_replay_refsyncs_ack_before_cursor_cleanup(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = "ack-move:replace"
        with self.assertRaises(InjectedCrash):
            fixture.acknowledge(TX_ID)
        fixture.filesystem.crash_after = None

        self.assertTrue(fixture.acknowledge(TX_ID))

        self.assertLess(
            fixture.events.index("ack-replay:file-fsync"),
            fixture.events.index("cursor:unlink"),
        )
        self.assertLess(
            fixture.events.index("ack-replay:target-dir-fsync"),
            fixture.events.index("cursor:unlink"),
        )

    def test_post_replace_replay_settles_cursor_unlink_without_stable_cursor(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = "cursor:unlink"
        with self.assertRaises(InjectedCrash):
            fixture.acknowledge(TX_ID)
        fixture.filesystem.crash_after = None

        self.assertFalse(fixture.cursor_path.exists())
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertIn("cursor-replay:dir-fsync", fixture.events)

    def test_crash_before_move_replays_from_matching_receipt(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.crash_after = "ack-move:before-replace"
        with self.assertRaises(InjectedCrash):
            fixture.acknowledge(TX_ID)
        fixture.filesystem.crash_after = None
        self.assertTrue(fixture.receipt_path(TX_ID).exists())
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertEqual(fixture.load_ack_receipt().transaction_id, TX_ID)

    def test_wrong_id_rejects_without_changing_current_records(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        before = fixture.finalization_snapshot()
        with self.assertRaisesRegex(
            FinalizationError, "finalization_not_current"
        ):
            fixture.acknowledge("f" * 32)
        self.assertEqual(fixture.finalization_snapshot(), before)

    def test_ack_slot_replays_same_id_until_later_transaction_replaces_it(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertTrue(fixture.acknowledge(TX_ID))
        with self.assertRaisesRegex(
            FinalizationError, "finalization_not_current"
        ):
            fixture.acknowledge("f" * 32)

        next_id = "f" * 32
        fixture.create_next_terminal_fixture(next_id, JournalPhase.COMMITTED)
        fixture.require_no_pending()
        fixture.finalize(next_id)
        self.assertFalse(fixture.receipt_path(TX_ID).exists())
        self.assertEqual(fixture.load_ack_receipt().transaction_id, TX_ID)
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertTrue(fixture.acknowledge(next_id))
        self.assertEqual(fixture.load_ack_receipt().transaction_id, next_id)
        self.assertFalse(fixture.receipt_path(TX_ID).exists())
        self.assertFalse(fixture.receipt_path(next_id).exists())
        with self.assertRaisesRegex(
            FinalizationError, "finalization_not_current"
        ):
            fixture.acknowledge(TX_ID)

    def test_three_transactions_keep_one_ack_slot_and_no_old_receipts(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        transaction_ids = (TX_ID, "e" * 32, "f" * 32)
        for index, transaction_id in enumerate(transaction_ids):
            if index:
                fixture.create_next_terminal_fixture(
                    transaction_id, JournalPhase.COMMITTED
                )
            fixture.finalize(transaction_id)
            self.assertTrue(fixture.acknowledge(transaction_id))
            self.assertEqual(
                fixture.load_ack_receipt().transaction_id,
                transaction_id,
            )
            self.assertEqual(fixture.stable_ack_paths(), [fixture.ack_path])
            self.assertEqual(fixture.stable_receipt_paths(), [])

    def test_newer_finalize_preserves_older_ack_until_newer_acknowledgment(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.acknowledge(TX_ID)
        old_bytes = fixture.ack_path.read_bytes()
        next_id = "f" * 32
        fixture.create_next_terminal_fixture(next_id, JournalPhase.COMMITTED)

        fixture.finalize(next_id)

        self.assertEqual(fixture.ack_path.read_bytes(), old_bytes)
        self.assertTrue(fixture.receipt_path(next_id).exists())
        cursor_before = fixture.cursor_path.read_bytes()
        receipt_before = fixture.receipt_path(next_id).read_bytes()
        self.assertTrue(fixture.acknowledge(TX_ID))
        self.assertEqual(fixture.cursor_path.read_bytes(), cursor_before)
        self.assertEqual(fixture.receipt_path(next_id).read_bytes(), receipt_before)
        fixture.acknowledge(next_id)
        self.assertNotEqual(fixture.ack_path.read_bytes(), old_bytes)

    def test_delayed_old_ack_is_read_only_while_newer_cursor_exists(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.acknowledge(TX_ID)
        next_id = "f" * 32
        fixture.create_next_terminal_fixture(next_id, JournalPhase.COMMITTED)
        fixture.finalize(next_id)
        before = fixture.finalization_snapshot()

        self.assertTrue(fixture.acknowledge(TX_ID))

        self.assertEqual(fixture.finalization_snapshot(), before)

    def test_delayed_old_ack_fails_after_newer_slot_replacement(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.acknowledge(TX_ID)
        next_id = "f" * 32
        fixture.create_next_terminal_fixture(next_id, JournalPhase.COMMITTED)
        fixture.finalize(next_id)
        fixture.acknowledge(next_id)

        with self.assertRaisesRegex(
            FinalizationError, "finalization_not_current"
        ):
            fixture.acknowledge(TX_ID)

    def test_no_new_start_or_finalization_before_old_cursor_cleanup(self):
        fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
        fixture.finalize(TX_ID)
        fixture.filesystem.pause_after = "ack-move:replace"
        acknowledge = fixture.start_acknowledgment(TX_ID)
        fixture.filesystem.wait_until_paused()

        barrier = fixture.start_pending_barrier()
        newer = fixture.start_newer_finalize("f" * 32)
        self.assertFalse(barrier.completed_within(0.05))
        self.assertFalse(newer.completed_within(0.05))
        self.assertEqual(fixture.new_transaction_events, [])

        fixture.filesystem.resume()
        self.assertTrue(acknowledge.result())
        barrier.result()
        with self.assertRaises(FinalizationError):
            newer.result()
        fixture.require_no_pending()

    def test_crash_boundary_table_replays_same_id_without_orphan(self):
        finalize_events = (
            "cursor-reserved:scratch-create",
            "cursor-reserved:scratch-write",
            "cursor-reserved:file-fsync",
            "cursor-reserved:replace",
            "cursor-reserved:dir-fsync",
            "receipt:scratch-create",
            "receipt:scratch-write",
            "receipt:file-fsync",
            "receipt:replace",
            "receipt:dir-fsync",
            "cursor-receipt-ready:scratch-create",
            "cursor-receipt-ready:scratch-write",
            "cursor-receipt-ready:file-fsync",
            "cursor-receipt-ready:replace",
            "cursor-receipt-ready:dir-fsync",
        )
        acknowledge_events = (
            "ack-move:before-replace",
            "ack-move:replace",
            "ack:file-fsync",
            "ack-move:source-dir-fsync",
            "ack-move:target-dir-fsync",
            "ack-replay:file-fsync",
            "ack-replay:source-dir-fsync",
            "ack-replay:target-dir-fsync",
            "cursor-replay:scratch-normalize",
            "cursor-replay:dir-fsync",
            "cursor:unlink",
            "cursor:delete-dir-fsync",
        )
        for boundary in (*finalize_events, *acknowledge_events):
            with self.subTest(boundary=boundary):
                fixture = self.make_terminal_fixture(JournalPhase.COMMITTED)
                fixture.filesystem.crash_after = boundary
                if boundary in finalize_events:
                    with self.assertRaises(InjectedCrash):
                        fixture.finalize(TX_ID)
                else:
                    fixture.finalize(TX_ID)
                    with self.assertRaises(InjectedCrash):
                        fixture.acknowledge(TX_ID)
                fixture.assert_bounded_finalization_state()
                if fixture.cursor_or_cursor_scratch_exists():
                    fixture.assert_newer_finalize_blocked("f" * 32)
                else:
                    fixture.require_no_pending()
                fixture.filesystem.crash_after = None
                if boundary in finalize_events:
                    fixture.finalize(TX_ID)
                self.assertTrue(fixture.acknowledge(TX_ID))
                fixture.assert_bounded_finalization_state()
```

`make_terminal_fixture` passes the same `FakeMutationMutex` factory to Plan B
`UpdateEngine`, all three Plan C finalization functions, and every test helper.
Every cursor/receipt/ack-slot compare or mutation asserts the mutex is held;
`engine.finalize_terminal_evidence` asserts it acquires only after the Plan C
record section releases. The fake mutex is process-wide/reentrant-test-aware so
the pause test can prove a second thread blocks at acquisition rather than
reading partial state. This prevents nested mutex acquisition while keeping
cursor reservation and receipt creation one serialized operation.
The fake `has_atomic_scratch` matches production: querying the ack slot returns
`False` only when its forbidden scratch is absent and raises fixed ack
corruption if that scratch was manually introduced.

Fixture helpers such as `ensure_receipts_directory` invoke the same production
path guard under the fake mutex; they do not create alternate receipt stores or
hand-write Plan B authority. Low-level scratch/ack writers appear only in
corruption/restart-state tests and use strict production serializers.
The test module's local `call_owners` AST helper excludes protocol/adapter
definitions and reports only enclosing production call sites.

The pause/resume fixture uses synchronization events only in the test fake;
production finalization remains synchronous. Its `start_acknowledgment` helper
runs the ordinary synchronous API on a test thread solely to hold the injected
pause at the post-replace seam while the main test invokes the barrier and a
different-ID finalizer. Both calls must remain blocked on the mutex until
acknowledgment removes the cursor; after release, the barrier opens and the
different-ID call fails from absent/mismatched Plan B authority without ever
creating a newer transaction event.

`assert_no_unknown_finalization_artifacts` may enumerate only the isolated
test root after each case; production functions never enumerate. It permits
the cursor, fixed ack slot, current receipt, cursor scratch, and receipt scratch
only, and asserts count bounds. An ack scratch is always a failure. This catches
accidental random/orphan names independently of production no-scan tests.
At every point there is at most one stable active receipt and one receipt
scratch for the cursor ID; an older ack slot is not counted as an active
receipt.
After successful acknowledgment it additionally requires the receipts
directory is empty, cursor target/scratch are absent, and only the fixed ack
slot remains.

Test enumeration is explicitly excluded from the production no-scan AST gate;
there is no production cleanup path that discovers receipts by listing.

Add exact crash tests at every filesystem event, not only the durable
milestones:

```text
cursor-reserved:scratch-create, cursor-reserved:scratch-write,
cursor-reserved:file-fsync, cursor-reserved:replace,
cursor-reserved:dir-fsync,
receipt:scratch-create, receipt:scratch-write, receipt:file-fsync,
receipt:replace, receipt:dir-fsync,
cursor-receipt-ready:scratch-create, cursor-receipt-ready:scratch-write,
cursor-receipt-ready:file-fsync, cursor-receipt-ready:replace,
cursor-receipt-ready:dir-fsync,
ack-move:before-replace, ack-move:replace, ack:file-fsync,
ack-move:source-dir-fsync, ack-move:target-dir-fsync,
ack-replay:file-fsync, ack-replay:source-dir-fsync,
ack-replay:target-dir-fsync, cursor-replay:scratch-normalize,
cursor-replay:dir-fsync,
cursor:unlink, cursor:delete-dir-fsync
```

The fake filesystem restarts from each event's persisted snapshot and models
both allowed post-crash outcomes for replace/unlink before directory durability.
For the acknowledgment replace, those outcomes are exactly: old ack plus
matching source receipt, or new matching ack plus no source receipt. A generated
snapshot may never contain neither current source nor current ack. Before
durable cursor deletion, a different-ID finalization returns
`finalization_ack_pending` whenever the cursor/scratch is visible; no new
receipt/factory call occurs. Same-ID acknowledgment inspects cursor, source,
and ack slot and completes. After cursor deletion, same-ID ack replay succeeds
from the fixed slot and the start gate is open. The receipts directory never
has more than one stable receipt plus its fixed scratch; cursor/receipt/ack-slot
names are bounded; and finalization source contains no `uuid`, `mkstemp`,
`NamedTemporaryFile`, `iterdir`, `glob`, `rglob`, or `walk`.

The fake models receipts-directory and updates-root durability independently,
matching the two fsync calls even though one adapter method issues them.

The fake models `os.replace` as one atomic namespace transition: crash injection
is immediately before or after it, never during a partial copy.

Every generated durable state satisfies one of two implications while a cursor
exists: either the matching receipt source exists, or the receipt was moved and
the fixed slot contains matching bytes. There is no generated cursor state with
neither source nor matching slot.

Every crash-boundary fixture starts with no unrelated older ack unless the
case explicitly tests sequential transactions; this keeps expected authority
unambiguous.

The test's `finalize_events` and `acknowledge_events` tuples must equal the full
literal sequence listed above; do not generate or abbreviate away either cursor
write. Event-list equality is asserted so a newly added filesystem step requires
a new crash row.

Add `FinalizationWindowsDurabilityTests` with a fake kernel32. Require lazy
`MoveFileExW`, exact wide-string/DWORD signatures, exact flags
`MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH`, no module-import WinDLL,
and fixed failure. Mutating away `WRITE_THROUGH` must fail the named flags test.
The helper's keyword-only `windows_api` seam is test-only; `atomic_write`
omits it so production creates kernel32 lazily at the replace step.

```python
class FinalizationWindowsDurabilityTests(unittest.TestCase):
    def test_replace_uses_replace_existing_and_write_through(self):
        api = FakeMoveFileApi(success=True)
        with mock.patch("update_recovery.os.name", "nt"):
            _replace_finalization_file(
                self.source, self.target, windows_api=api
            )
        self.assertEqual(api.flags, 0x00000001 | 0x00000008)
        self.assertEqual(api.source, str(self.source))
        self.assertEqual(api.target, str(self.target))

    def test_replace_failure_is_fixed(self):
        api = FakeMoveFileApi(success=False)
        with mock.patch("update_recovery.os.name", "nt"), self.assertRaisesRegex(
            OSError, "finalization_replace_failed"
        ):
            _replace_finalization_file(
                self.source, self.target, windows_api=api
            )

    def test_acknowledgment_uses_one_os_replace_from_receipt_to_fixed_slot(self):
        fs = OSFinalizationFilesystem()
        self.receipt.parent.mkdir(parents=True, exist_ok=True)
        self.ack.parent.mkdir(parents=True, exist_ok=True)
        self.receipt.write_bytes(b"receipt\n")
        with (
            mock.patch("update_recovery.os.replace") as replace,
            mock.patch(
                "update_recovery._same_finalization_volume",
                return_value=True,
            ),
            mock.patch.object(fs, "fsync_file") as fsync_file,
            mock.patch.object(fs, "fsync_directory") as fsync_directory,
            mock.patch("update_recovery._lstat_plain"),
        ):
            fs.move_receipt_to_ack(self.receipt, self.ack)
        replace.assert_called_once_with(self.receipt, self.ack)
        fsync_file.assert_called_once_with(self.ack)
        self.assertEqual(
            fsync_directory.call_args_list,
            [mock.call(self.receipt.parent), mock.call(self.ack.parent)],
        )

    def test_same_volume_uses_device_identity(self):
        with mock.patch(
            "update_recovery.os.stat",
            side_effect=(mock.Mock(st_dev=7), mock.Mock(st_dev=7)),
        ):
            self.assertTrue(_same_finalization_volume(self.receipts, self.updates))
        with mock.patch(
            "update_recovery.os.stat",
            side_effect=(mock.Mock(st_dev=7), mock.Mock(st_dev=8)),
        ):
            self.assertFalse(_same_finalization_volume(self.receipts, self.updates))

    def test_same_volume_stat_uses_no_symlink_following(self):
        with mock.patch(
            "update_recovery.os.stat",
            side_effect=(mock.Mock(st_dev=7), mock.Mock(st_dev=7)),
        ) as stat:
            self.assertTrue(_same_finalization_volume(self.receipts, self.updates))
        self.assertEqual(
            stat.call_args_list,
            [
                mock.call(self.receipts, follow_symlinks=False),
                mock.call(self.updates, follow_symlinks=False),
            ],
        )
        with mock.patch(
            "update_recovery.os.stat",
            side_effect=(object(), object()),
        ):
            self.assertFalse(_same_finalization_volume(self.receipts, self.updates))

    def test_ack_slot_has_no_atomic_write_or_scratch_path(self):
        fs = OSFinalizationFilesystem()
        self.ack.parent.mkdir(parents=True, exist_ok=True)
        with self.assertRaises(FinalizationError):
            fs.atomic_write(self.ack, {"forbidden": True})
        self.assertFalse(fs.has_atomic_scratch(self.ack))

    def test_cross_volume_move_fails_before_replace(self):
        fs = OSFinalizationFilesystem()
        self.receipt.parent.mkdir(parents=True, exist_ok=True)
        self.receipt.write_bytes(b"receipt\n")
        with (
            mock.patch(
                "update_recovery._same_finalization_volume",
                return_value=False,
            ),
            mock.patch("update_recovery.os.replace") as replace,
            mock.patch("update_recovery._lstat_plain"),
            self.assertRaisesRegex(OSError, "finalization_replace_failed"),
        ):
            fs.move_receipt_to_ack(self.receipt, self.ack)
        replace.assert_not_called()

```

`FakeMoveFileApi.MoveFileExW` is a callable object exposing assignable
`argtypes`/`restype`, matching ctypes function objects; a plain bound method is
not sufficient for the cursor/receipt atomic-write test. The acknowledgment
test independently freezes the required direct `os.replace(receipt_path, ack_path)`
commit point and subsequent flush/fsync sequence; it must not route through a
separately serialized ack writer. Add a path-guard test that injects canonical
source/target parent `os.stat` results with different `st_dev` values and
asserts fixed `finalization_replace_failed` before the replacement helper; it must not
depend on a real second drive. Test `_same_finalization_volume` directly with
the two mocked stat results; test `move_receipt_to_ack` with that helper
returning `False` and assert replace is not called.

Add a pre-existing-slot type test: symlink/reparse/directory/FIFO ack targets
are rejected before `os.replace`; only absent or plain regular fixed-slot files
are replaceable. Drive entry-type evidence through the same injected `lstat`
helper used elsewhere so the test does not require platform-specific FIFO or
reparse creation.

Add `test_fsync_file_failure_is_not_reported_as_acknowledged`: patch `os.fsync`
to raise `OSError` after the mocked move and require the public acknowledgment
to fail with fixed `finalization_cleanup_failed`, retain the cursor, and replay
from whichever source/slot state the fake restart exposes. Directory fsync is
required off Windows and unsupported/no-op on Windows.

The test class uses one fresh temporary install root per method; no method
reuses a receipt source after `os.replace` consumed it.

`MOVEFILE_WRITE_THROUGH` therefore remains required for cursor/receipt scratch
publication on Windows. The acknowledgment commit itself is exactly the
requested same-volume `os.replace`; the following file fsync is required when
the platform exposes it, and directory fsync is required off Windows and a
documented no-op where unsupported on Windows. Replay correctness relies on observing either
the source receipt or the fixed target slot, never on a separately written
acknowledgment object.

The fake also models power-loss rollback of each replace/unlink at the next
restart; every modeled persisted state must satisfy the state/crash tables and
replay without creating a second scratch/receipt or any ack scratch.

Also test strict duplicate/noncanonical/unknown-key parsing independently for
receipt, cursor, and moved receipt bytes in the ack slot; semantic mismatch; nonterminal finalize; active
mismatch; cursor-only replay reconstructing one receipt from terminal Plan B
authority; same-ID lost response before/after Plan B cleanup; unregister and
engine failures retaining cursor/receipt; orphan receipt rejection; malformed
cursor blocking finalization and start; cleanup-incomplete active/workspace
blocking ack; delayed old ack succeeding read-only while its slot remains and
rejecting only after newer slot replacement; later
atomic replacement of the old fixed slot; retained
recovery tree; and no direct Plan B workspace/active deletion.

Add exact wrong-ID precedence tests for cursor+old-slot, ack-only, malformed
ack-only, cursor-scratch+ack, and no evidence. Each asserts a byte-for-byte
unchanged finalization snapshot.

Also assert `FinalizationCursor` rejects every state except exact built-in
strings `reserved` and `receipt-ready`; `FinalizationReceipt` accepts only exact
`finalized-awaiting-ack`; and the ack loader accepts only moved receipt bytes
with that same state.

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_update_recovery.FinalizationTests","-v") -ExpectFailure`

Expected: missing cursor states, atomic receipt-to-slot move, cursor removal,
pending barrier, and `finalization_ack_pending` semantics.

- [ ] **Step 3: Implement strict frozen records using Plan B terminal projection**

Use these complete record definitions. The ack slot deliberately reuses the
canonical receipt schema because acknowledgment moves those exact bytes; there
is no `FinalizationAck` dataclass or acknowledged-state serializer.
All snippets in Steps 3-5 are complete top-level Python definitions and must
compile as shown after the imports listed in this task; do not paste partial
indented branches.

```python
FINALIZATION_RECEIPT_STATE = "finalized-awaiting-ack"
FINALIZATION_CURSOR_STATES = frozenset({"reserved", "receipt-ready"})


class FinalizationError(RuntimeError):
    _ALLOWED = frozenset({
        "transaction_not_terminal",
        "active_transaction_mismatch",
        "invalid_finalization_receipt",
        "invalid_finalization_cursor",
        "invalid_finalization_acknowledgment",
        "finalization_cleanup_failed",
        "finalization_cleanup_incomplete",
        "finalization_record_round_trip_failed",
        "finalization_ack_pending",
        "finalization_not_current",
    })

    def __init__(self, error_code: str) -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown_finalization_error")
        self.error_code = error_code
        super().__init__(error_code)


def _validate_finalization_fields(
    transaction_id: str,
    outcome: str,
    version: TerminalVersion,
    *,
    error_code: str,
) -> None:
    try:
        parse_transaction_id(transaction_id)
        if type(outcome) is not str or outcome not in {
            "committed",
            "rolled-back",
        }:
            raise ValueError("invalid outcome")
        if (
            type(version) is not TerminalVersion
            or type(version.fresh_install) is not bool
        ):
            raise ValueError("invalid terminal version")

        # Freeze Plan B's exact four-row projection. A committed fresh install
        # is valid and keeps fresh_install=True with the non-null target.
        if outcome == "committed":
            valid = type(version.version) is str and bool(version.version)
        else:
            valid = (
                version.fresh_install
                and version.version is None
            ) or (
                not version.fresh_install
                and type(version.version) is str
                and bool(version.version)
            )
        if not valid:
            raise ValueError("invalid terminal version projection")
    except (JournalValidationError, TypeError, ValueError) as error:
        raise FinalizationError(error_code) from error


def _require_terminal_projection_matches_journal(
    journal: UpdateJournal,
    projected: TerminalVersion,
) -> None:
    if journal.phase is JournalPhase.COMMITTED:
        expected = TerminalVersion(
            version=journal.target_version,
            fresh_install=journal.fresh_install,
        )
    elif journal.phase is JournalPhase.ROLLED_BACK and journal.fresh_install:
        expected = TerminalVersion(version=None, fresh_install=True)
    elif journal.phase is JournalPhase.ROLLED_BACK:
        expected = TerminalVersion(
            version=journal.prior_version,
            fresh_install=False,
        )
    else:
        raise FinalizationError("transaction_not_terminal")
    if projected != expected:
        raise FinalizationError("invalid_finalization_receipt")


@dataclass(frozen=True)
class FinalizationReceipt:
    transaction_id: str
    outcome: str
    terminal_version: TerminalVersion
    state: str = FINALIZATION_RECEIPT_STATE

    def __post_init__(self) -> None:
        _validate_finalization_fields(
            self.transaction_id,
            self.outcome,
            self.terminal_version,
            error_code="invalid_finalization_receipt",
        )
        if (
            type(self.state) is not str
            or self.state != FINALIZATION_RECEIPT_STATE
        ):
            raise FinalizationError("invalid_finalization_receipt")

    def to_dict(self) -> dict[str, object]:
        return {
            "transactionId": self.transaction_id,
            "outcome": self.outcome,
            "terminal_version": terminal_version_to_value(
                self.terminal_version
            ),
            "state": self.state,
        }


@dataclass(frozen=True)
class FinalizationCursor:
    transaction_id: str
    outcome: str
    terminal_version: TerminalVersion
    state: str = "reserved"

    def __post_init__(self) -> None:
        _validate_finalization_fields(
            self.transaction_id,
            self.outcome,
            self.terminal_version,
            error_code="invalid_finalization_cursor",
        )
        if (
            type(self.state) is not str
            or self.state not in FINALIZATION_CURSOR_STATES
        ):
            raise FinalizationError("invalid_finalization_cursor")

    def to_dict(self) -> dict[str, object]:
        return {
            "transactionId": self.transaction_id,
            "outcome": self.outcome,
            "terminal_version": terminal_version_to_value(
                self.terminal_version
            ),
            "state": self.state,
        }


def receipt_from_terminal_journal(
    journal: UpdateJournal,
) -> FinalizationReceipt:
    if journal.phase not in (JournalPhase.COMMITTED, JournalPhase.ROLLED_BACK):
        raise FinalizationError("transaction_not_terminal")
    receipt = FinalizationReceipt(
        transaction_id=journal.transaction_id,
        outcome=journal.phase.value,
        terminal_version=terminal_version(journal),
    )
    _require_terminal_projection_matches_journal(
        journal, receipt.terminal_version
    )
    return receipt


def cursor_from_receipt(
    receipt: FinalizationReceipt,
    state: str,
) -> FinalizationCursor:
    return FinalizationCursor(
        receipt.transaction_id,
        receipt.outcome,
        receipt.terminal_version,
        state,
    )


def receipt_from_cursor(cursor: FinalizationCursor) -> FinalizationReceipt:
    return FinalizationReceipt(
        cursor.transaction_id,
        cursor.outcome,
        cursor.terminal_version,
    )
```

Freeze the table in both constructor and journal-fixture tests:

| Plan B terminal journal | Required `TerminalVersion` | Valid receipt |
|---|---|---|
| committed existing, `fresh_install=False`, `prior_version=prior` | `fresh_install=False`, `version=target` | yes |
| committed fresh, `fresh_install=True`, `prior_version=None` | `fresh_install=True`, `version=target` | yes |
| rolled-back existing, `fresh_install=False`, `prior_version=prior` | `fresh_install=False`, `version=prior` | yes |
| rolled-back fresh, `fresh_install=True`, `prior_version=None` | `fresh_install=True`, `version=None` | yes |

Here `target` and `prior` are the exact nonempty journal strings, not constants
from the running Host and not values reconstructed by Plan C.
Tests compare the table as four literal rows; no `fresh_install` truthiness
shortcut may replace it.
Those projection tests call Plan B's real `terminal_version`; they do not stub
or reimplement it.

`parse_terminal_version` already enforces null only with `fresh_install=True`.
Plan C additionally enforces that only rolled-back fresh may use null. Direct
construction with committed fresh plus a nonempty target must pass; committed
null, rolled-back existing null, and rolled-back fresh nonnull must fail with
the record-specific code. Strict parsers require canonical ASCII JSON with
sorted keys, compact separators, one trailing newline, exact keys, no duplicate
or non-finite values, and exact built-in types. Record equality covers every
semantic field.

That last rejection is deliberate: although Plan B's generic
`parse_terminal_version` permits a nonnull version with either fresh flag,
Plan C has the outcome and therefore narrows `rolled-back + fresh` to null.

This is copied from Plan B without reinterpretation. In particular,
`fresh_install=True` does not mean `version` must be null: committed fresh uses
the target string, and only rolled-back fresh uses null.

Define the filesystem boundary and strict record loaders completely:

```python
class FinalizationFilesystem(Protocol):
    def atomic_write(self, path: Path, value: dict[str, object]) -> None:
        raise AssertionError("finalization filesystem protocol method")

    def read(self, path: Path) -> bytes:
        raise AssertionError("finalization filesystem protocol method")

    def exists(self, path: Path) -> bool:
        raise AssertionError("finalization filesystem protocol method")

    def has_atomic_scratch(self, path: Path) -> bool:
        raise AssertionError("finalization filesystem protocol method")

    def move_receipt_to_ack(self, source: Path, target: Path) -> None:
        raise AssertionError("finalization filesystem protocol method")

    def remove_cursor(self, path: Path) -> None:
        raise AssertionError("finalization filesystem protocol method")

    def fsync_file(self, path: Path) -> None:
        raise AssertionError("finalization filesystem protocol method")

    def fsync_directory(self, path: Path) -> None:
        raise AssertionError("finalization filesystem protocol method")


def _scratch_path(target: Path) -> Path:
    return target.with_name(f".{target.name}.tmp")


# The eight protocol methods above are frozen exactly. Test fakes implement the
# same event names and deterministic scratch semantics as the OS adapter.
# Scratch methods address only the one deterministic sibling of the supplied
# validated target. They never enumerate or return a path.
def _canonical_finalization_bytes(value: dict[str, object]) -> bytes:
    return (
        json.dumps(
            value,
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


def _error_for_kind(kind: str) -> str:
    values = {
        "receipt": "invalid_finalization_receipt",
        "cursor": "invalid_finalization_cursor",
        "ack": "invalid_finalization_acknowledgment",
    }
    try:
        return values[kind]
    except KeyError as error:
        raise ValueError("invalid finalization path kind") from error


def _require_finalization_path(path: Path, *, kind: str) -> Path:
    if not isinstance(path, Path) or not path.is_absolute() or ".." in path.parts:
        raise FinalizationError(_error_for_kind(kind))
    resolved_parent = path.parent.resolve(strict=False)
    if kind == "receipt":
        transaction_id = parse_transaction_id(path.stem)
        if (
            path.suffix != ".json"
            or resolved_parent.name.casefold() != "receipts"
            or resolved_parent.parent.name.casefold() != "updates"
            or path.name != f"{transaction_id}.json"
        ):
            raise FinalizationError("invalid_finalization_receipt")
        _require_plain_ancestor_chain(resolved_parent.parent)
        if resolved_parent.exists() or resolved_parent.is_symlink():
            _lstat_plain(resolved_parent, require_directory=True)
    elif kind == "cursor":
        if (
            path.name != "finalization-cursor.json"
            or resolved_parent.name.casefold() != "updates"
        ):
            raise FinalizationError("invalid_finalization_cursor")
        _require_plain_ancestor_chain(resolved_parent)
    elif kind == "ack":
        if (
            path.name != "finalization-ack.json"
            or resolved_parent.name.casefold() != "updates"
        ):
            raise FinalizationError("invalid_finalization_acknowledgment")
        _require_plain_ancestor_chain(resolved_parent)
    else:
        raise ValueError("invalid finalization path kind")
    return resolved_parent / path.name


def _record_error_for_path(path: Path) -> str:
    if path.parent.name.casefold() == "receipts":
        return "invalid_finalization_receipt"
    if path.name == "finalization-cursor.json":
        return "invalid_finalization_cursor"
    if path.name == "finalization-ack.json":
        return "invalid_finalization_acknowledgment"
    raise ValueError("invalid finalization record path")


def _finalization_path_kind(path: Path) -> str:
    if not isinstance(path, Path) or not path.is_absolute():
        raise ValueError("invalid finalization record path")
    if path.parent.name.casefold() == "receipts":
        return "receipt"
    if path.name == "finalization-cursor.json":
        return "cursor"
    if path.name == "finalization-ack.json":
        return "ack"
    raise ValueError("invalid finalization record path")


MOVEFILE_REPLACE_EXISTING = 0x00000001
MOVEFILE_WRITE_THROUGH = 0x00000008


def _replace_finalization_file(
    source: Path,
    target: Path,
    *,
    windows_api: object | None = None,
) -> None:
    if os.name != "nt":
        os.replace(source, target)
        return
    try:
        kernel32 = windows_api or ctypes.WinDLL(
            "kernel32", use_last_error=True
        )
    except OSError as error:
        raise OSError("finalization_replace_failed") from error
    kernel32.MoveFileExW.argtypes = [
        wintypes.LPCWSTR,
        wintypes.LPCWSTR,
        wintypes.DWORD,
    ]
    kernel32.MoveFileExW.restype = wintypes.BOOL
    if not kernel32.MoveFileExW(
        str(source),
        str(target),
        MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
    ):
        raise OSError("finalization_replace_failed")


def _remove_finalization_file(
    path: Path,
) -> None:
    path.unlink()


def _same_finalization_volume(source_parent: Path, target_parent: Path) -> bool:
    source_stat = os.stat(source_parent, follow_symlinks=False)
    target_stat = os.stat(target_parent, follow_symlinks=False)
    source_device = getattr(source_stat, "st_dev", None)
    target_device = getattr(target_stat, "st_dev", None)
    if (
        type(source_device) is not int
        or type(target_device) is not int
    ):
        return False
    return source_device == target_device


class OSFinalizationFilesystem:
    def atomic_write(self, path: Path, value: dict[str, object]) -> None:
        kind = _finalization_path_kind(path)
        if kind == "ack":
            raise FinalizationError("invalid_finalization_acknowledgment")
        target = _require_finalization_path(path, kind=kind)
        expected = _canonical_finalization_bytes(value)
        _lstat_plain(target.parent, require_directory=True)
        sibling = _scratch_path(target)
        try:
            if sibling.exists() or sibling.is_symlink():
                _lstat_plain(sibling, require_directory=False)
                scratch = sibling.read_bytes()
                if not expected.startswith(scratch):
                    raise FinalizationError(
                        _record_error_for_path(target)
                    )
                sibling.unlink()
                self.fsync_directory(target.parent)
            with sibling.open("xb") as stream:
                stream.write(expected)
                stream.flush()
                os.fsync(stream.fileno())
            _replace_finalization_file(sibling, target)
            self.fsync_directory(target.parent)
        except FinalizationError:
            raise
        except Exception:
            # Preserve bounded scratch on ordinary error; replay validates its
            # exact canonical prefix before replacing it.
            raise

    def read(self, path: Path) -> bytes:
        target = _require_finalization_path(
            path, kind=_finalization_path_kind(path)
        )
        _lstat_plain(target, require_directory=False)
        return target.read_bytes()

    def exists(self, path: Path) -> bool:
        target = _require_finalization_path(
            path, kind=_finalization_path_kind(path)
        )
        if not target.exists():
            return False
        _lstat_plain(target, require_directory=False)
        return True

    def has_atomic_scratch(self, path: Path) -> bool:
        target = _require_finalization_path(
            path, kind=_finalization_path_kind(path)
        )
        if target.name == "finalization-ack.json":
            scratch = _scratch_path(target)
            if scratch.exists() or scratch.is_symlink():
                raise FinalizationError(
                    "invalid_finalization_acknowledgment"
                )
            return False
        scratch = _scratch_path(target)
        if not scratch.exists() and not scratch.is_symlink():
            return False
        _lstat_plain(scratch, require_directory=False)
        return True

    def move_receipt_to_ack(self, source: Path, target: Path) -> None:
        receipt_path = _require_finalization_path(source, kind="receipt")
        ack_path = _require_finalization_path(target, kind="ack")
        _lstat_plain(receipt_path, require_directory=False)
        _lstat_plain(receipt_path.parent, require_directory=True)
        _lstat_plain(ack_path.parent, require_directory=True)
        if ack_path.exists() or ack_path.is_symlink():
            _lstat_plain(ack_path, require_directory=False)
        if (
            receipt_path.parent.parent != ack_path.parent
            or not _same_finalization_volume(
                receipt_path.parent, ack_path.parent
            )
        ):
            raise OSError("finalization_replace_failed")
        # Required acknowledgment commit point: one fixed same-volume replace.
        os.replace(receipt_path, ack_path)
        self.fsync_file(ack_path)
        self.fsync_directory(receipt_path.parent)
        if ack_path.parent != receipt_path.parent:
            self.fsync_directory(ack_path.parent)

    def remove_cursor(self, path: Path) -> None:
        target = _require_finalization_path(path, kind="cursor")
        _lstat_plain(target, require_directory=False)
        _remove_finalization_file(target)
        self.fsync_directory(target.parent)

    def fsync_file(self, path: Path) -> None:
        target = _require_finalization_path(
            path, kind=_finalization_path_kind(path)
        )
        _lstat_plain(target, require_directory=False)
        with target.open("rb") as stream:
            os.fsync(stream.fileno())

    def fsync_directory(self, path: Path) -> None:
        if os.name == "nt":
            return
        descriptor = os.open(path, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


def _parse_finalization_value(
    raw: bytes,
    *,
    expected_state: str,
    error_code: str,
) -> tuple[str, str, TerminalVersion]:
    try:
        value = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        if type(value) is not dict or set(value) != {
            "transactionId", "outcome", "terminal_version", "state"
        }:
            raise ValueError("invalid_finalization_keys")
        transaction_id = parse_transaction_id(value["transactionId"])
        outcome = value["outcome"]
        version = parse_terminal_version(value["terminal_version"])
        _validate_finalization_fields(
            transaction_id,
            outcome,
            version,
            error_code=error_code,
        )
        if (
            type(value["state"]) is not str
            or value["state"] != expected_state
        ):
            raise ValueError("invalid_finalization_state")
        if raw != _canonical_finalization_bytes(value):
            raise ValueError("noncanonical_finalization_record")
        return transaction_id, outcome, version
    except (
        JournalValidationError,
        UnicodeDecodeError,
        ValueError,
        TypeError,
    ) as error:
        raise FinalizationError(error_code) from error


def load_finalization_receipt(
    path: Path,
    expected_id: str,
    filesystem: FinalizationFilesystem,
) -> FinalizationReceipt:
    try:
        raw = filesystem.read(path)
    except FinalizationError:
        raise
    except Exception as error:
        raise FinalizationError("invalid_finalization_receipt") from error
    transaction_id, outcome, version = _parse_finalization_value(
        raw,
        expected_state="finalized-awaiting-ack",
        error_code="invalid_finalization_receipt",
    )
    if transaction_id != expected_id:
        raise FinalizationError("invalid_finalization_receipt")
    return FinalizationReceipt(transaction_id, outcome, version)


def load_finalization_cursor(
    path: Path,
    filesystem: FinalizationFilesystem,
) -> FinalizationCursor:
    try:
        raw = filesystem.read(path)
    except FinalizationError:
        raise
    except Exception as error:
        raise FinalizationError("invalid_finalization_cursor") from error
    try:
        value = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        if type(value) is not dict or set(value) != {
            "transactionId", "outcome", "terminal_version", "state"
        }:
            raise ValueError("invalid_finalization_cursor_keys")
        transaction_id = parse_transaction_id(value["transactionId"])
        outcome = value["outcome"]
        version = parse_terminal_version(value["terminal_version"])
        cursor = FinalizationCursor(
            transaction_id, outcome, version, value["state"]
        )
        if raw != _canonical_finalization_bytes(value):
            raise ValueError("noncanonical_finalization_cursor")
        return cursor
    except (JournalValidationError, UnicodeDecodeError, TypeError, ValueError) as error:
        raise FinalizationError("invalid_finalization_cursor") from error


def load_finalization_ack(
    path: Path,
    filesystem: FinalizationFilesystem,
) -> FinalizationReceipt:
    try:
        raw = filesystem.read(path)
    except FinalizationError:
        raise
    except Exception as error:
        raise FinalizationError(
            "invalid_finalization_acknowledgment"
        ) from error
    transaction_id, outcome, version = _parse_finalization_value(
        raw,
        expected_state=FINALIZATION_RECEIPT_STATE,
        error_code="invalid_finalization_acknowledgment",
    )
    return FinalizationReceipt(transaction_id, outcome, version)
```

Despite its loader name, `load_finalization_ack` returns a strict
`FinalizationReceipt`; there is no acknowledgment record type. The name denotes
the fixed slot location only.

The fake adapter labels calls made inside the original move as `ack-move:*` and
the same protocol methods called from no-source replay as `ack-replay:*`.
Cursor normalization/removal durability reached from ack+scratch uses
`cursor-replay:*`. Production methods are identical; this diagnostic labeling
is test-only and does not add a protocol method or persisted state.
Post-replace replay never rewrites the ack slot from cursor data; it validates
the full moved bytes already there and only re-fsyncs/cleans cursor state.

`atomic_write` requires `target.parent` already exists as a validated plain
directory; it must not call `mkdir`. Receipt-directory creation, when first
needed, is a separate `_ensure_receipts_directory` step under the installation
mutex: validate plain `updates`, create only exact `updates/receipts`, then
revalidate it. Cursor writes never create parents, and no code calls
`atomic_write` for the ack path. Tests inject
before/after the one directory creation and prove no unknown path is touched.

The explicit parser error argument makes malformed receipt, cursor, and moved
ack-slot bytes map respectively to `invalid_finalization_receipt`,
`invalid_finalization_cursor`, and `invalid_finalization_acknowledgment`.
`FinalizationFilesystem` has no receipt-unlink, transaction-tree, or active
deletion method.
`_require_finalization_path` is lexical plus canonical and tests reject
symlink/reparse parents before mutation. `atomic_write` uses exactly one
deterministic sibling per cursor or receipt target, validates/removes and fsyncs
an interrupted prior scratch, then exclusive-create/write/flush/fsync/close,
replace, and parent fsync. The sole remover unlinks only the validated cursor.
`move_receipt_to_ack` validates both fixed paths and same-volume device IDs,
validates the existing target as a plain file when present, calls one replace,
fsyncs the moved file, then fsyncs source and target directories.
It must use local variable names `receipt_path` and `ack_path`, and the commit
line is literally `os.replace(receipt_path, ack_path)`; tests and static gates
freeze that required primitive.
It additionally requires `receipt_path.parent.parent == ack_path.parent`, so
both names are under the same canonical `updates_root` before device comparison.
The acknowledgment move is plain `os.replace` on every platform. Cursor and
receipt scratch publication uses plain `os.replace` plus parent fsync on
non-Windows; on Windows that separate atomic-write helper uses lazy `MoveFileExW` with
exact `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH` after file fsync.
Set exact `argtypes`/`restype`; return failure as fixed
`finalization_replace_failed` chained inside the record-specific public error.
No Win32 object is created at module import time. The replace is the
acknowledgment commit point: restart observes either the receipt source or the
ack target. Cursor deletion may reappear after power loss; matching ack-slot
replay removes it again. The disposable-VM gate exercises real persistence and
restart behavior.

Windows cursor deletion uses ordinary validated unlink; unlike replacement,
Python's standard library has no write-through delete primitive. Safety relies
on the durable matching ack slot preceding deletion. `_remove_finalization_file`
is the single stable-cursor unlink fault seam; deterministic scratch cleanup is
owned by atomic-write normalization. A stable cursor is validated/unlinked and
its directory fsynced. Ack+scratch-only replay never derives identity from
partial scratch bytes: the matching full ack supplies an exact receipt-ready
cursor, atomic-write normalization replaces the scratch, and ordinary cursor
cleanup removes/fsyncs it. Tests patch each call without bypassing validation.

Load/write helpers and public finalization functions catch expected
`OSError`/path guard failures and raise record-specific `FinalizationError`;
removal failures use `finalization_cleanup_failed`. The test fake enforces the
same boundary. Thus exists/scratch/read/write/remove failures never leak raw
path or OS text through a public finalization call.

Fault injection raises `InjectedCrash(BaseException)` at each named filesystem
event, so the ordinary `except Exception` cleanup cannot mask process-crash
state. Ordinary exceptions also preserve the one bounded scratch because
deletion failure could be ambiguous; replay explicitly normalizes it. Tests
inject ordinary `OSError` at each step and require no second scratch name. A
crash or ordinary error may leave zero bytes or any exact prefix of the canonical
cursor/receipt record. It replays only while a stable cursor/receipt or matching Plan B
terminal authority supplies the expected complete value. A non-prefix scratch is
record corruption and maps through `_record_error_for_path` to the exact
receipt/cursor parser error without deletion. The ack slot is always one whole
previous or current receipt created by atomic replacement. No random name can
accumulate across retries.

- [ ] **Step 4: Implement exact finalization order through Plan B**

`_terminal_receipt_from_authority(paths, tx)` strict-loads `active.json`,
requires its transaction and resolved journal equal `paths`, reads that
journal, and calls `receipt_from_terminal_journal`. If no active authority
remains, only a matching stable cursor, receipt, or moved ack-slot receipt can
drive replay; this helper never reconstructs deleted evidence.
`_write_and_verify_cursor` and `_write_and_verify_receipt` call `atomic_write`
and the corresponding strict loader, then require semantic equality or raise
`finalization_record_round_trip_failed`. No helper writes the ack slot.

The helper implementations contain no `return` inside a broad `try/finally`;
file and directory durability steps complete before the caller can observe
success. Tests inject after each event and assert no premature return.

`OSFinalizationFilesystem()` is created only after transaction/install path
validation and mutex acquisition succeed in each public function. Reorder the
first statements accordingly: validate `tx`/`paths` (or the barrier's canonical install root), then evaluate
`fs = filesystem`; after validating an injected adapter and constructing the mutex, instantiate
`OSFinalizationFilesystem()` inside the acquired mutex only when `fs is None`.
Tests patch the constructor and
prove malformed IDs/roots leave it uncalled.

The injected filesystem shape is checked after path validation, then the mutex
factory is called, then the default filesystem constructor runs inside the
mutex. Mutex construction failure maps to
`finalization_cleanup_failed`; no filesystem, registry, or engine object is
then created.

Callers that inject `filesystem` have already constructed a test adapter; the
public function cannot retroactively prevent that. Production and Plan D pass
`None`, and the constructor-order guarantee applies to every object Plan C
itself controls.

Every injected filesystem call occurs inside the acquired mutex. Static/order
tests reject any cursor/receipt/ack-slot read before `with mutex:` in the three
public functions.

`_terminal_receipt_from_authority` maps no ID: it requires exact current active
authority for the requested transaction. Callers that use it only to classify
a cursor scratch first read the active transaction; if its ID differs from the
request, they return `finalization_ack_pending` without touching scratch bytes.
Only a matching active ID may compare/recover the scratch.

`finalize_update_status` never releases a cursor after any interrupted or
ordinary receipt failure. Even a reserved cursor without receipt remains the
single replay authority and blocks newer work; same-ID replay reconstructs the
receipt from Plan B terminal authority. This deliberately favors a bounded,
repairable barrier over an ambiguous cursor removal.

A moved ack slot is accepted by finalize replay only when terminal workspace
and matching active authority are already absent. Ack bytes cannot be used to
bypass Plan B terminal-evidence cleanup. Ack-only finalize replay also fsyncs
the cursor directory before returning the prior receipt, completing any lost
cursor-unlink durability just like acknowledgment replay. It never moves or
rewrites the fixed slot.

All three public functions validate that an injected filesystem structurally
implements the eight protocol methods after path validation and before mutex
construction; wrong types
fail with the relevant fixed record error and no method call. This validation
uses `callable(getattr(...))` only and constructs nothing.

```python
_FINALIZATION_FS_METHODS = (
    "atomic_write", "read", "exists", "has_atomic_scratch",
    "move_receipt_to_ack", "remove_cursor", "fsync_file",
    "fsync_directory",
)


def _require_finalization_filesystem(value: object, error_code: str) -> None:
    if any(
        not callable(getattr(value, name, None))
        for name in _FINALIZATION_FS_METHODS
    ):
        raise FinalizationError(error_code)
```

The protocol shape probe and static call-owner gate together require
`move_receipt_to_ack` be called only from
`acknowledge_update_finalization`; `finalize_update_status` and
`require_no_pending_finalization` cannot move the receipt.

```python
def _write_and_verify_cursor(
    path: Path,
    value: FinalizationCursor,
    fs: FinalizationFilesystem,
) -> None:
    try:
        fs.atomic_write(path, value.to_dict())
        if load_finalization_cursor(path, fs) != value:
            raise FinalizationError("finalization_record_round_trip_failed")
    except FinalizationError:
        raise
    except Exception as error:
        raise FinalizationError("invalid_finalization_cursor") from error


def _ensure_receipts_directory(path: Path) -> None:
    if path.name != "receipts" or path.parent.name.casefold() != "updates":
        raise FinalizationError("invalid_finalization_receipt")
    _require_plain_ancestor_chain(path.parent)
    _lstat_plain(path.parent, require_directory=True)
    if not path.exists():
        try:
            path.mkdir()
        except FileExistsError:
            pass
    _lstat_plain(path, require_directory=True)


def _write_and_verify_receipt(
    path: Path,
    value: FinalizationReceipt,
    fs: FinalizationFilesystem,
) -> None:
    try:
        _ensure_receipts_directory(path.parent)
        fs.atomic_write(path, value.to_dict())
        if load_finalization_receipt(path, value.transaction_id, fs) != value:
            raise FinalizationError("finalization_record_round_trip_failed")
    except FinalizationError:
        raise
    except Exception as error:
        raise FinalizationError("invalid_finalization_receipt") from error
```

Before the cursor-state branches, handle its deterministic scratch under the
mutex. If `cursor_path` is absent but `fs.has_atomic_scratch(cursor_path)` is
true, compare requested ID to Plan B's active terminal authority before any
scratch mutation. A different requested ID returns
`finalization_ack_pending`; this check occurs under the already-created mutex
and filesystem adapter but precedes engine/registry work, and may not remove
the scratch. For the matching ID,
derive the expected cursor and let deterministic `atomic_write` accept only an
exact prefix of its canonical bytes, remove/fsync that scratch, and write the
cursor anew. If the cursor target already exists, its identity controls and
its stale scratch cannot affect a different-ID rejection; matching replay may
normalize it. Apply the same authority-plus-prefix rule to receipt writes.
There is no ack scratch. Arbitrary non-prefix cursor/receipt scratch is fixed
`invalid_finalization_cursor|receipt`, never silently discarded.

For a stable cursor, compare its ID before reading active/journal or any receipt
for the requested different ID. This guarantees the exact pending error wins
even after Plan B has already removed the prior transaction evidence.

That precedence governs mutation/finalization calls. Acknowledgment has one
bounded exception: after a different stable cursor is identified, it may compare
the single fixed valid ack slot and return read-only `True` when the requested
ID matches that slot. It never scans or derives another ID.
Malformed ack in this bounded exception propagates
`invalid_finalization_acknowledgment`; it is never treated as a nonmatch.

This finalization-specific mutex/filesystem read exception does not weaken the
Task 8 early-dispatch rule: finalization is a validated Native action, not an
early CLI mode. Its bounded cursor cannot be inspected without those adapters.

```python
def finalize_update_status(
    install_root: Path,
    transaction_id: str,
    registry: RegistryBackend,
    engine_factory: Callable[[Path], UpdateEngine],
    *,
    filesystem: FinalizationFilesystem | None = None,
    mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
) -> FinalizationReceipt:
    tx = parse_transaction_id(transaction_id)
    paths = TransactionPaths.for_install(install_root, tx)
    if install_root != paths.install_root:
        raise FinalizationError("active_transaction_mismatch")
    fs = filesystem
    receipt_path = paths.updates_root / "receipts" / f"{tx}.json"
    cursor_path = paths.updates_root / "finalization-cursor.json"
    ack_path = paths.updates_root / "finalization-ack.json"

    if fs is not None:
        _require_finalization_filesystem(fs, "invalid_finalization_receipt")
    try:
        mutex = mutex_factory(paths.install_root)
    except Exception as error:
        raise FinalizationError("finalization_cleanup_failed") from error
    with mutex:
        if fs is None:
            fs = OSFinalizationFilesystem()
        cursor_exists = fs.exists(cursor_path)
        cursor_scratch = fs.has_atomic_scratch(cursor_path)
        if not cursor_exists and cursor_scratch:
            try:
                active = read_active_transaction(paths.active)
            except Exception as error:
                raise FinalizationError("invalid_finalization_cursor") from error
            if active.transaction_id != tx:
                raise FinalizationError("finalization_ack_pending")
            receipt = _terminal_receipt_from_authority(paths, tx)
            _write_and_verify_cursor(
                cursor_path,
                cursor_from_receipt(receipt, "reserved"),
                fs,
            )
            cursor_exists = True

        acknowledged = False
        if cursor_exists:
            cursor = load_finalization_cursor(cursor_path, fs)
            if cursor.transaction_id != tx:
                raise FinalizationError("finalization_ack_pending")
            receipt = receipt_from_cursor(cursor)

            if cursor.state == "reserved":
                if fs.exists(receipt_path):
                    if load_finalization_receipt(
                        receipt_path, tx, fs
                    ) != receipt:
                        raise FinalizationError("invalid_finalization_receipt")
                else:
                    _write_and_verify_receipt(receipt_path, receipt, fs)
                _write_and_verify_cursor(
                    cursor_path,
                    cursor_from_receipt(receipt, "receipt-ready"),
                    fs,
                )
            else:
                if fs.has_atomic_scratch(cursor_path):
                    _write_and_verify_cursor(cursor_path, cursor, fs)
            if cursor.state == "receipt-ready" and fs.exists(receipt_path):
                if load_finalization_receipt(receipt_path, tx, fs) != receipt:
                    raise FinalizationError("invalid_finalization_receipt")
                if fs.has_atomic_scratch(receipt_path):
                    _write_and_verify_receipt(receipt_path, receipt, fs)
            elif (
                cursor.state == "receipt-ready"
                and fs.has_atomic_scratch(receipt_path)
            ):
                _write_and_verify_receipt(receipt_path, receipt, fs)
            elif cursor.state == "receipt-ready":
                if not fs.exists(ack_path):
                    raise FinalizationError("finalization_cleanup_incomplete")
                if load_finalization_ack(ack_path, fs) != receipt:
                    raise FinalizationError("invalid_finalization_acknowledgment")
                if not _terminal_cleanup_complete(paths, tx):
                    raise FinalizationError(
                        "invalid_finalization_acknowledgment"
                    )
                acknowledged = True
        else:
            if fs.exists(receipt_path) or fs.has_atomic_scratch(receipt_path):
                raise FinalizationError("invalid_finalization_receipt")
            receipt: FinalizationReceipt | None = None
            if fs.exists(ack_path):
                try:
                    prior = load_finalization_ack(ack_path, fs)
                except FinalizationError as ack_error:
                    try:
                        receipt = _terminal_receipt_from_authority(paths, tx)
                    except Exception:
                        raise ack_error
                else:
                    if prior.transaction_id == tx:
                        if not _terminal_cleanup_complete(paths, tx):
                            raise FinalizationError(
                                "invalid_finalization_acknowledgment"
                            )
                        try:
                            fs.fsync_directory(cursor_path.parent)
                        except Exception as error:
                            raise FinalizationError(
                                "finalization_cleanup_failed"
                            ) from error
                        return prior
            if receipt is None:
                receipt = _terminal_receipt_from_authority(paths, tx)
            _write_and_verify_cursor(
                cursor_path,
                cursor_from_receipt(receipt, "reserved"),
                fs,
            )
            _write_and_verify_receipt(receipt_path, receipt, fs)
            _write_and_verify_cursor(
                cursor_path,
                cursor_from_receipt(receipt, "receipt-ready"),
                fs,
            )

    if not acknowledged:
        try:
            unregister_host(registry, STATUS_HOST_NAME)
            engine_factory(paths.install_root).finalize_terminal_evidence(tx)
        except Exception as error:
            raise FinalizationError("finalization_cleanup_failed") from error
    return receipt
```

The reserved cursor, receipt write, and `receipt-ready` cursor transition share
the installation mutex. The
mutex is released before `engine.finalize_terminal_evidence` acquires it, so
there is no nested acquisition. `engine_factory` is not called for a different
transaction while a cursor exists, for moved-ack same-ID replay, or before the
matching receipt and `receipt-ready` state are durable. A crash after reserved
cursor fsync leaves a cursor-only resumable state. A crash after receipt fsync
but before the cursor transition replays the existing receipt and advances the
cursor. Every different-ID finalization gets `finalization_ack_pending`; only
acknowledgment may perform bounded read-only slot replay for an older ID. No receipt is ever
created before its cursor, and no acknowledgment can move a receipt until the
cursor is `receipt-ready` and Plan B evidence is gone. `InjectedCrash` derives
from `BaseException`, is never caught, and leaves the bounded state for replay.

- [ ] **Step 5: Implement exact bounded acknowledgment semantics**

```python
def _terminal_cleanup_complete(paths: TransactionPaths, tx: str) -> bool:
    transaction_exists = (
        paths.transaction_root.exists()
        or paths.transaction_root.is_symlink()
    )
    active_exists = paths.active.exists() or paths.active.is_symlink()
    if transaction_exists:
        return False
    if active_exists:
        try:
            active = read_active_transaction(paths.active)
        except Exception as error:
            raise FinalizationError("active_transaction_mismatch") from error
        if active.transaction_id != tx:
            raise FinalizationError("active_transaction_mismatch")
        return False
    return True


def acknowledge_update_finalization(
    install_root: Path,
    transaction_id: str,
    *,
    filesystem: FinalizationFilesystem | None = None,
    mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
) -> bool:
    tx = parse_transaction_id(transaction_id)
    paths = TransactionPaths.for_install(install_root, tx)
    if install_root != paths.install_root:
        raise FinalizationError("active_transaction_mismatch")
    fs = filesystem
    receipt_path = paths.updates_root / "receipts" / f"{tx}.json"
    cursor_path = paths.updates_root / "finalization-cursor.json"
    ack_path = paths.updates_root / "finalization-ack.json"

    if fs is not None:
        _require_finalization_filesystem(
            fs, "invalid_finalization_acknowledgment"
        )
    try:
        mutex = mutex_factory(paths.install_root)
    except Exception as error:
        raise FinalizationError("finalization_cleanup_failed") from error
    with mutex:
        if fs is None:
            fs = OSFinalizationFilesystem()
        cursor_exists = fs.exists(cursor_path)
        if not cursor_exists:
            if fs.has_atomic_scratch(cursor_path):
                if fs.exists(ack_path):
                    ack = load_finalization_ack(ack_path, fs)
                    if ack.transaction_id != tx:
                        raise FinalizationError("finalization_not_current")
                    if fs.exists(receipt_path) or fs.has_atomic_scratch(
                        receipt_path
                    ):
                        raise FinalizationError("invalid_finalization_receipt")
                    if not _terminal_cleanup_complete(paths, tx):
                        raise FinalizationError(
                            "finalization_cleanup_incomplete"
                        )
                    try:
                        _write_and_verify_cursor(
                            cursor_path,
                            cursor_from_receipt(ack, "receipt-ready"),
                            fs,
                        )
                        fs.fsync_file(ack_path)
                        fs.fsync_directory(receipt_path.parent)
                        fs.fsync_directory(ack_path.parent)
                        fs.remove_cursor(cursor_path)
                    except Exception as error:
                        raise FinalizationError(
                            "finalization_cleanup_failed"
                        ) from error
                    return True
                try:
                    active = read_active_transaction(paths.active)
                except Exception as error:
                    raise FinalizationError(
                        "invalid_finalization_cursor"
                    ) from error
                if active.transaction_id != tx:
                    raise FinalizationError("finalization_not_current")
                raise FinalizationError("finalization_cleanup_incomplete")
            if not fs.exists(ack_path):
                if fs.exists(receipt_path) or fs.has_atomic_scratch(receipt_path):
                    raise FinalizationError("invalid_finalization_receipt")
                raise FinalizationError("finalization_not_current")
            ack = load_finalization_ack(ack_path, fs)
            if ack.transaction_id != tx:
                raise FinalizationError("finalization_not_current")
            if fs.exists(receipt_path) or fs.has_atomic_scratch(receipt_path):
                raise FinalizationError("invalid_finalization_receipt")
            if not _terminal_cleanup_complete(paths, tx):
                raise FinalizationError("finalization_cleanup_incomplete")
            try:
                fs.fsync_directory(cursor_path.parent)
            except Exception as error:
                raise FinalizationError(
                    "finalization_cleanup_failed"
                ) from error
            return True

        cursor = load_finalization_cursor(cursor_path, fs)
        if cursor.transaction_id != tx:
            if fs.exists(ack_path):
                prior = load_finalization_ack(ack_path, fs)
                if prior.transaction_id == tx:
                    # Delayed old-ID replay is read-only; the newer cursor owns
                    # all pending mutation and remains untouched.
                    return True
            raise FinalizationError("finalization_not_current")
        if cursor.state != "receipt-ready":
            raise FinalizationError("finalization_cleanup_incomplete")
        # A stable cursor is authoritative; an interrupted older scratch is
        # harmless and disappears when the stable cursor is removed last.
        expected_receipt = receipt_from_cursor(cursor)

        moved_now = fs.exists(receipt_path)
        if moved_now:
            actual_receipt = load_finalization_receipt(receipt_path, tx, fs)
            if actual_receipt != expected_receipt:
                raise FinalizationError("invalid_finalization_receipt")
            if fs.has_atomic_scratch(receipt_path):
                _write_and_verify_receipt(
                    receipt_path, expected_receipt, fs
                )
            if not _terminal_cleanup_complete(paths, tx):
                raise FinalizationError("finalization_cleanup_incomplete")
            try:
                fs.move_receipt_to_ack(receipt_path, ack_path)
            except Exception as error:
                raise FinalizationError(
                    "finalization_cleanup_failed"
                ) from error
        else:
            # The only generated no-receipt state is a crash after replace.
            if not fs.exists(ack_path):
                raise FinalizationError("finalization_cleanup_incomplete")
            if not _terminal_cleanup_complete(paths, tx):
                raise FinalizationError("finalization_cleanup_incomplete")
        if load_finalization_ack(ack_path, fs) != expected_receipt:
            raise FinalizationError("invalid_finalization_acknowledgment")
        if not moved_now:
            try:
                fs.fsync_file(ack_path)
                fs.fsync_directory(receipt_path.parent)
                fs.fsync_directory(ack_path.parent)
            except Exception as error:
                raise FinalizationError(
                    "finalization_cleanup_failed"
                ) from error

        # Remove the stable cursor last and fsync its directory. A preexisting
        # scratch was normalized earlier; a scratch that reappears only because
        # the stable cursor unlink itself was lost is handled by ack replay.
        try:
            fs.remove_cursor(cursor_path)
        except Exception as error:
            raise FinalizationError("finalization_cleanup_failed") from error
        return True


def require_no_pending_finalization(
    install_root: Path,
    *,
    filesystem: FinalizationFilesystem | None = None,
    mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex,
) -> None:
    if not isinstance(install_root, Path) or not install_root.is_absolute():
        raise FinalizationError("invalid_finalization_cursor")
    try:
        root = install_root.resolve(strict=True)
    except OSError as error:
        raise FinalizationError("invalid_finalization_cursor") from error
    if root != install_root:
        raise FinalizationError("invalid_finalization_cursor")
    fs = filesystem
    cursor_path = root / "updates" / "finalization-cursor.json"
    if fs is not None:
        _require_finalization_filesystem(fs, "invalid_finalization_cursor")
    try:
        mutex = mutex_factory(root)
    except Exception as error:
        raise FinalizationError("finalization_cleanup_failed") from error
    with mutex:
        if fs is None:
            fs = OSFinalizationFilesystem()
        try:
            if fs.exists(cursor_path) or fs.has_atomic_scratch(cursor_path):
                if fs.exists(cursor_path):
                    load_finalization_cursor(cursor_path, fs)
                raise FinalizationError("finalization_ack_pending")
            return None
        except FinalizationError:
            raise
        except Exception as error:
            raise FinalizationError("finalization_cleanup_failed") from error
```

The start barrier intentionally checks only the fixed cursor and cursor scratch.
It does not enumerate receipts or read the ack slot. Generated-state tests prove
that a receipt is created only under its cursor and acknowledgment removes the
source name only by atomic move. While the cursor remains, the barrier blocks a
new update even when a matching ack slot is already durable after an interrupted
acknowledgment. Once cursor cleanup finishes, the ack slot alone does not block
a later transaction. Non-update product actions never call this barrier.

The barrier explicitly returns `None` when open; it never returns an ack ID or
boolean that Plan D could misinterpret as transaction authority.

A malformed cursor target still blocks with `invalid_finalization_cursor`, not
`finalization_ack_pending`; corruption must be repaired rather than hidden as
ordinary pending state. A well-formed cursor/scratch is the pending case.

The ack slot may contain an older valid receipt when a newer cursor is active.
Acknowledgment replaces it only through `move_receipt_to_ack` after validating
the new cursor, new receipt, and completed terminal cleanup. A malformed older
slot does not block that atomic replacement because the current cursor+receipt
is the sole active authority; if the move has already occurred, the slot must
strict-parse and exactly equal the current cursor projection before current-ID
cursor cleanup. A delayed old-ID request may still match the older valid slot
and succeeds read-only until replacement.
The replacement operation itself does not parse a malformed old target; it has
already validated the current source receipt and atomically overwrites the fixed
plain-file slot.

The older slot is never evidence for the newer cursor: only exact equality with
the current cursor projection permits no-source acknowledgment replay.
That replay never recreates the source receipt, because doing so would destroy
the atomic-move proof.

Conversely, a request matching the older slot but not the newer cursor is a
successful delayed replay until slot replacement. It returns `True` without
changing the newer cursor, receipt, active state, or workspace.

With no cursor, a valid different-ID slot yields `finalization_not_current`
without inspecting any per-ID receipt path. A malformed slot has unknowable
identity, so `invalid_finalization_acknowledgment` wins.
With a newer cursor plus a malformed old slot, a different requested ID cannot
prove delayed success and receives the same malformed-ack error without
mutation.

Freeze the complete state table:

| Durable state before call | Same-ID finalize | Different-ID finalize | Same-ID acknowledge | Wrong-ID acknowledge | Start barrier |
|---|---|---|---|---|---|
| no cursor/receipt; no or older valid ack; matching terminal authority | write reserved cursor, receipt, receipt-ready cursor; cleanup; return | same for its matching authority | matching ack -> `True`; different valid ack -> `finalization_not_current` | `finalization_not_current` | open |
| cursor scratch only; matching terminal authority | validate/recover fixed scratch and continue | `finalization_ack_pending`; no scratch mutation/factory | without ack: `finalization_cleanup_incomplete`; with matching moved ack and completed cleanup: rebuild exact receipt-ready cursor from ack, remove/fsync it, `True` | valid nonmatching ack: `finalization_not_current`; malformed ack: `invalid_finalization_acknowledgment` | `finalization_ack_pending` until replay completes cursor cleanup |
| reserved cursor only; terminal authority present | write receipt, advance receipt-ready, cleanup, return | `finalization_ack_pending`; no write/factory | `finalization_cleanup_incomplete` | if requested ID matches older valid slot, `True` read-only; otherwise `finalization_not_current` | `finalization_ack_pending` |
| reserved cursor + receipt | validate receipt, advance receipt-ready, cleanup, return | `finalization_ack_pending`; no write/factory | `finalization_cleanup_incomplete` | older-slot match -> `True` read-only; otherwise reject | `finalization_ack_pending` |
| receipt-ready cursor + receipt; terminal evidence remains | replay cleanup, return same receipt | `finalization_ack_pending`; no write/factory | `finalization_cleanup_incomplete`; no move | older-slot match -> `True` read-only; otherwise reject | `finalization_ack_pending` |
| receipt-ready cursor + receipt; terminal cleanup complete; ack absent/older/malformed | return same receipt without moving it | `finalization_ack_pending`; no write/factory | atomic move receipt over fixed slot, verify, remove cursor, `True` | older valid slot match -> `True` read-only; otherwise reject | `finalization_ack_pending` |
| receipt-ready cursor + matching ack; receipt absent | return same receipt projection without recreating source | `finalization_ack_pending`; no write/factory | verify slot, remove cursor, `True` | `finalization_not_current` | `finalization_ack_pending` |
| receipt-ready cursor + nonmatching ack; receipt absent | `invalid_finalization_acknowledgment` | `finalization_ack_pending` | `invalid_finalization_acknowledgment` | requested ID matching that valid old slot -> `True` read-only; otherwise `finalization_not_current` | `finalization_ack_pending` |
| no cursor + matching ack; receipt absent; terminal cleanup complete | return prior receipt projection | may reserve a later cursor; old slot remains until later acknowledgment | `True` | `finalization_not_current` | open |
| no cursor + matching ack but active/workspace remains | `invalid_finalization_acknowledgment` | no newer reservation | `finalization_cleanup_incomplete` | `finalization_not_current` | outside generated post-cleanup state |
| no cursor + different valid ack | finalize matching terminal authority may reserve; acknowledgment later replaces slot by moving its receipt | same | `finalization_not_current` | `finalization_not_current` | open |
| no cursor + valid ack + any receipt source | `invalid_finalization_receipt` | `invalid_finalization_receipt` | matching slot ID: `invalid_finalization_receipt` | nonmatching ID: `finalization_not_current` before unrelated source inspection | outside generated state; test invariant fails |
| receipt without cursor and no ack | `invalid_finalization_receipt` | `invalid_finalization_receipt` | `invalid_finalization_receipt` | `finalization_not_current` | outside generated state; invariant tests prove Plan C never creates it and production performs no directory scan |
| malformed cursor | `invalid_finalization_cursor` | `invalid_finalization_cursor` | `invalid_finalization_cursor` | `invalid_finalization_cursor` | `invalid_finalization_cursor` |
| no cursor + malformed stable ack | with valid matching terminal authority, may reserve and eventual move replaces malformed old slot; otherwise malformed error | same | `invalid_finalization_acknowledgment` | `invalid_finalization_acknowledgment` because slot identity cannot be safely classified | open |
| any ack scratch | impossible generated state; static/artifact tests fail | same | same | same | ack scratch does not exist in the protocol |
| non-prefix cursor/receipt scratch | record-specific invalid-finalization error; preserve | valid current cursor for another ID still wins `finalization_ack_pending` | record-specific fixed error | `finalization_not_current` | cursor scratch closes barrier |

A newer cursor is created only after acknowledgment removed the prior cursor.
The one-slot old ack may remain until newer acknowledgment atomically replaces
it with the newer source receipt. While the old slot remains, delayed old-ID
acknowledgment succeeds read-only even if a newer cursor exists; every mutation
still follows the newer cursor. Replacing the slot cannot orphan an older
receipt: the older source was already moved to that slot, and its cursor cleanup
was a prerequisite for the newer cursor.

The old fixed slot may coexist with one newer active receipt; this is still
bounded because the slot is not an active source receipt and is replaced, not
added to, at newer acknowledgment.

Newer finalization never rewrites or deletes an older valid ack slot. It may
reserve/write its cursor and receipt while that bounded prior slot remains; only
its later acknowledgment move replaces the slot.
`finalize_update_status` therefore ignores a different valid prior slot after
strict parsing; it does not mistake it for current acknowledgment.
Thus the prior ID's same-ID replay window lasts through newer preparation,
activation, and finalization, ending only at the newer acknowledgment replace.

For the malformed-old-slot row, “may reserve” requires valid matching Plan B
terminal authority for the requested newer transaction. Without that authority,
the existing malformed slot error remains visible; finalization does not invent
a transaction merely to overwrite corruption.

Freeze the exhaustive acknowledgment crash table separately. “Persisted after
restart” includes both filesystem-permitted visibility outcomes before a parent
directory fsync:

| Crash point | Persisted after restart | Same-ID replay | Different/wrong ID | Barrier |
|---|---|---|---|---|
| before `os.replace` | receipt-ready cursor + source receipt + old/absent ack | validate source, repeat move, verify slot, remove cursor, `True` | request matching old valid slot -> `True` read-only; IDs matching neither cursor nor slot reject; new finalize/start blocked | closed |
| replace call not committed | same as before replace | same as before replace | same as before replace | closed |
| replace committed, before return | receipt-ready cursor + no source + matching ack | detect matching slot, skip move, remove cursor, `True` | IDs not matching slot reject; new finalize/start blocked | closed |
| after replace, before moved-file fsync | either source+old ack or no source+matching ack | choose only by strict cursor/source/slot facts; finish move or cleanup | an ID matching the currently visible valid slot succeeds read-only; others reject | closed |
| after moved-file fsync, before source-dir fsync | either filesystem-visible outcome above | same deterministic replay | same visible-slot rule | closed |
| after source-dir fsync, before target-dir fsync | no source + matching ack | verify slot, remove cursor, `True` | IDs not matching slot reject | closed |
| after both directory fsyncs, before cursor unlink | no source + matching ack + cursor | verify slot, remove stable cursor, `True` | IDs not matching slot reject; later work blocked | closed |
| replay ack-file/source-dir/target-dir fsync | no source + matching ack + cursor | repeat remaining fsyncs, then remove cursor | IDs not matching slot reject | closed |
| cursor-scratch normalization replay | no source + matching ack + cursor scratch | derive receipt-ready cursor only from ack, normalize/remove cursor | IDs not matching slot reject without scratch mutation | closed until cursor cleanup finishes |
| after cursor unlink, before cursor-dir fsync | cursor may reappear or remain absent; matching ack persists | if cursor reappears, remove it; if absent, re-fsync cursor directory then `True` | IDs not matching slot reject | closed iff cursor/scratch reappears |
| after durable cursor removal | matching ack only | `True` without mutation | `finalization_not_current` | open |
| later transaction moves its receipt | newer matching ack replaces old slot atomically | newer ID succeeds; old ID becomes `finalization_not_current` | all other IDs reject | old cursor was already gone before later transaction began |

The later-transaction row's source receipt was created only after the newer
cursor reservation. Its old-slot replacement therefore cannot run while any
old cursor exists, and the old source receipt cannot still exist because the
old acknowledgment was itself the atomic source-to-slot move.

Add a three-transaction boundedness test, not just two: after each complete
acknowledgment, assert exactly one fixed slot exists and no prior receipt/source
name survives. The third transaction replaces the second slot in the same way;
artifact count never grows with transaction count.

“Without mutation” in the ack-only row means no namespace/content mutation;
same-ID replay may fsync the cursor/ack parent directory again before returning
to make an interrupted cursor unlink durable. Likewise, cursor+ack/no-source
replay re-fsyncs the ack file and both parent directories before removing the
cursor. These idempotent durability calls are part of the crash event table.

Same-ID finalize replay from ack-only state returns the prior
`FinalizationReceipt`; same-ID acknowledgment replay returns boolean `True`.
The two public return contracts are never conflated.

Freeze finalization creation/replay crashes as well:

| Finalize crash point | Persisted state | Same-ID replay | Different-ID/start |
|---|---|---|---|
| reserved-cursor scratch create/write/fsync | scratch may be absent/prefix/complete; no receipt | derive expected cursor from matching Plan B authority, normalize fixed scratch, continue | `finalization_ack_pending`; no factory or new ID |
| reserved-cursor replace before directory fsync | reserved cursor may be visible or only scratch survives | normalize reserved cursor, write receipt | blocked |
| reserved-cursor directory fsync | reserved cursor only | write receipt | blocked |
| receipt scratch create/write/fsync | reserved cursor plus absent/prefix scratch | derive receipt from cursor, normalize fixed scratch | blocked |
| receipt replace before directory fsync | reserved cursor plus receipt target or receipt scratch | validate/normalize receipt, advance cursor | blocked |
| receipt directory fsync | reserved cursor plus durable receipt | advance cursor | blocked |
| receipt-ready cursor scratch create/write/fsync | reserved cursor plus receipt plus state-transition scratch | normalize exact receipt-ready transition | blocked |
| receipt-ready cursor replace before directory fsync | reserved or receipt-ready cursor plus receipt | normalize exact state, then run cleanup | blocked |
| receipt-ready cursor directory fsync | receipt-ready cursor plus receipt | replay status unregister/Plan B cleanup, return same receipt | blocked until later ack removes cursor |
| after unregister, before/during Plan B cleanup | receipt-ready cursor plus receipt plus retained terminal evidence | rerun idempotent unregister and `finalize_terminal_evidence` | blocked |
| after Plan B cleanup, before finalize return | receipt-ready cursor plus receipt, no active/workspace | return same receipt without recreating evidence | blocked until acknowledgment |

Both crash tables are exhaustive over every named fake-filesystem seam and the
two external cleanup seams. Tests assert exact row/event equality; adding a
write, replace, fsync, unlink, unregister, or engine-cleanup step without a row
fails the suite.

- [ ] **Step 6: Run GREEN and ownership/order mutations**

Run:

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_update_recovery.FinalizationTests",
  "host.test_update_recovery.FinalizationWindowsDurabilityTests",
  "host.test_update_engine_resume",
  "-v"
)
```

Expected: `OK`, with all literal finalize/ack crash rows executed.

Separately mutate receipt
before cursor, allow different-ID cursor replacement, construct
`engine_factory` before the cursor check, omit the `receipt-ready` transition,
unlink the receipt instead of moving it, remove cursor before move durability,
skip ack-slot validation, open the start barrier while a cursor remains, replace
deterministic scratch with UUID names, omit Windows write-through, require a
nonnull fresh rollback version, reject committed fresh, and scan the receipt directory. The matching
named invariant test must fail for every mutation. Restore each and rerun.

Also mutate the operation queue/mutex to permit two concurrent reservations;
the exactly-one-winner concurrency test must fail.
Mutate the acknowledgment `os.replace` into `copy2` plus `unlink`; the direct
primitive test, crash table, and no-receipt-unlink AST gate must all fail.

- [ ] **Step 7: Commit**

```powershell
git add host/update_recovery.py host/test_update_recovery.py
git commit -m "feat(update): atomically acknowledge finalization"
```

### Task 8: Validate Complete Early Commands Before Dependency Construction

**Files:**
- Create: `host/update_entrypoint.py`
- Create: `host/test_update_entrypoint.py`
- Create: `host/test_early_update_dispatch.py`
- Modify: `host/dh_native_host.py`
- Modify: `host/test_native_messaging.py`
- Modify: `host/test_early_cli.py`

**Interfaces:**
- Consumes Plan A `dispatch_early_cli` only after Plan C validates the probe executable role and complete argv; Plan C neither injects a probe serializer nor duplicates its wire object. Produces exactly one `EarlyModeDependencies` type used by production and tests, plus `ExecutableRole`, `EntryMode`, `EntrySelection`, `ValidatedProbe`, `ValidatedEarlyInvocation`, `ValidatedMainHost`, `ValidatedStatusHost`, `ValidatedRegistration`, `ValidatedInstallPackage`, `ValidatedCompleteUpdate`, `ValidatedRecoveryCommand`, `classify_entrypoint`, `select_entry_mode`, `validate_probe_invocation`, `validate_early_invocation`, `parse_main_host_launch_args`, `validate_complete_update_command`, `resolve_recovery_install_root`, `resolve_active_command`, `resolve_journal_command`, and `dispatch_early_mode`.

Freeze signatures:

```text
classify_entrypoint(executable: Path) -> tuple[ExecutableRole, Path]
select_entry_mode(executable: Path, argv: Sequence[str]) -> EntrySelection
validate_probe_invocation(executable: Path, argv: Sequence[str], *, source_runtime: bool) -> ValidatedProbe
validate_early_invocation(executable: Path, argv: Sequence[str], *, source_runtime: bool) -> ValidatedEarlyInvocation
parse_main_host_launch_args(argv: Sequence[str]) -> ChromeLaunch | None
validate_complete_update_command(executable: Path, arguments: Sequence[str]) -> ValidatedCompleteUpdate
resolve_recovery_install_root(executable: Path, expected_basename: str) -> Path
resolve_active_command(install_root: Path) -> ValidatedRecoveryCommand
resolve_journal_command(journal_path: Path) -> ValidatedRecoveryCommand
dispatch_early_mode(executable: str, argv: Sequence[str], *, source_runtime: bool, dependencies_factory: Callable[[], EarlyModeDependencies] | None = None) -> int | None
```

Freeze exit constants:

```python
EXIT_SUCCESS = 0
EXIT_INVALID_ARGUMENTS = 2
EXIT_INSTALLER_UNAVAILABLE = 10
EXIT_ROLLED_BACK = 20
EXIT_RECOVERY_REQUIRED = 30
EXIT_ALREADY_IN_PROGRESS = 31
EXIT_PROBE_FAILED = 40
EXIT_INTERNAL_FAILURE = 50
INVALID_EARLY_INVOCATION = b"invalid_early_invocation\n"
```

Freeze the complete command-to-executable matrix. "Exact chain" means the
resolved executable is exactly the named leaf under the shown canonical
parents; a case-insensitive basename match alone is insufficient for runner
and status roles.

| Mode | Exact production entrypoint | Source-development exception | Complete argv after executable |
|---|---|---|---|
| `MAIN_HOST` | canonical plain `<host-root>/dh_native_host.exe`; basename plus Chrome argv only, no release-metadata existence/content check | `<repo>/host/dh_native_host.py` | empty, or allowlisted Chrome origin plus optional nonnegative decimal `--parent-window=<handle>`; `0` is valid |
| `REGISTER` | `<host-root>/dh_native_host.exe` | `<source-host-root>/dh_native_host.py` with sibling plain `launch_host.bat`; registers through `MainHostRuntime.SOURCE` | `--register` |
| `INSTALL_PACKAGE` | `<package-root>/host/dh_native_host.exe`; argument must resolve exactly to that `<package-root>` | none | `--install-package <absolute-canonical-package-root>` |
| `UPDATE_PROBE` | `<host-root>/dh_native_host.exe` | none; Plan A's pure dispatcher remains unit-testable, but integrated source launch is not a production probe role | `--update-probe <absolute-canonical-manifest.json>` |
| `COMPLETE_UPDATE` | `<install>/updates/recovery/dh_update_runner.exe` | none | `--complete-update <32-lower-hex-id> <positive-decimal-pid> <creation-token>` |
| `RECOVER_ACTIVE` | `<install>/updates/recovery/dh_update_runner.exe` | none | `--recover-active` |
| `RECOVER_UPDATE` | `<install>/updates/recovery/dh_update_runner.exe` | none | `--recover-update <absolute-canonical-transaction-journal>` |
| `STATUS_HOST` | `<install>/updates/recovery/dh_update_status_host.exe` | none | allowlisted Chrome origin plus optional nonnegative decimal `--parent-window=<handle>`; `0` is valid; no command token |

`REGISTER` is the only recognized command with a source-development
entrypoint exception. The existing standalone `register.py` remains a thin
source-registration convenience over the same service; it is not another
early command grammar. Recognized command tokens win mode selection over a
basename, then the matrix rejects the selected mode on the wrong role. Thus a
status executable carrying `--recover-active`, a runner carrying
`--register`, or the main executable carrying `--recover-update` never falls
through to another behavior.

Command matching is exact and case-sensitive (`--register`, not
`--REGISTER`); executable basenames use Windows case-insensitive equality only
after canonical path/type checks. Case variants of `--update-probe` are Plan
C mismatch (fixed stderr), not Plan A probe mode. Tests lock both distinctions.

The source fallback is available only when the actual process is not frozen.
The top-level bootstrap passes immutable `source_runtime = not
bool(getattr(sys, "frozen", False))`; validation requires `SOURCE_MAIN` iff that
value is true. This boolean is process-derived in production and test-injected
only at the pure function seam. A PyInstaller process still has
`sys.frozen=True` after its executable is copied/renamed to runner or status,
so those roles validate. A frozen executable renamed `dh_native_host.py`
cannot claim source registration, and source execution cannot claim a frozen
role.

For production main/status/runner roles, `source_runtime` must be false. For
source main/register it must be true. No matrix row permits caller choice to
override that equivalence.

Production-main role deliberately classifies any canonical plain
`<host-root>/dh_native_host.exe` from its basename and regular-file chain. It
does not require `release-integrity.json`, `installed-product.json`, `_internal`,
or Extension metadata merely to recognize normal `MAIN_HOST`; this lets a
startable historical or partially copied install reach normal startup and
Plan A `verify_installation`. Mode-specific authority narrows special modes:
`INSTALL_PACKAGE` binds the executable to the package argument; `UPDATE_PROBE`
requires the complete frozen runtime and metadata chain before Plan A; frozen
`REGISTER` validates only the executable/runtime chain required to register the
already-running Host. Detached runner and status roles always require their
fixed recovery chain.

For `MAIN_HOST`, `classify_entrypoint` therefore performs only canonical plain
file and exact-basename classification, and `validate_early_invocation` adds
only source/frozen-bit plus Chrome argv validation. `_internal`, Extension, and
release metadata are not early normal-start predicates.
The main branch must not call `_validate_frozen_main_runtime`; that helper is
used only by frozen registration, while probe uses the stronger probe helper.
Metadata independence does not permit a symlink/reparse point, fuzzy basename,
relative/noncanonical path, or interpreter path.

`validate_probe_invocation` first classifies the entrypoint, requires
non-source runtime plus `PRODUCTION_MAIN`, exact two-element argv, command
first/unique, and an absolute canonical manifest path without lexical `..`;
it then validates the complete frozen probe Host chain, including `_internal`
and both metadata files, and resolves the existing plain manifest without
parsing package contents.
It returns `ValidatedProbe(entrypoint, manifest_path)`; dispatch builds Plan
A's tuple only from those frozen canonical fields.
`validate_early_invocation` is the sole preconstruction gate for all other modes. It verifies all
argv values are exact strings; command position/uniqueness and arity; the
matrix role; package/manifest/journal canonicality; complete process identity;
active/journal linkage; and status/main Chrome argv. Only a successfully
returned frozen `ValidatedEarlyInvocation` may enter a dispatch branch. It
contains `entrypoint`, `role`, `selection`, and one already validated payload
(`ValidatedMainHost`, `ValidatedStatusHost`, `ValidatedRegistration`,
`ValidatedInstallPackage`, `ValidatedCompleteUpdate`, or
`ValidatedRecoveryCommand`); dispatch performs no raw argv/path parsing.

Every Plan C invocation mismatch returns `EXIT_INVALID_ARGUMENTS`, writes no
stdout, and writes exactly `INVALID_EARLY_INVOCATION` to stderr, without a
trailing second line. Probe mismatch is the one output exception: Plan C calls
Plan A once with a fixed malformed probe tuple, producing exact stdout
`b'{"error_code":"package_probe_failed","status":"error"}\n'`, empty
stderr, and exit `2`; `run_update_probe` is not called. No mismatch constructs
or calls any dependency, registry, controller, process, default-root,
installer, or status-server factory.

The no-construction test ledger is exact. The dispatch test seam accepts a
`Callable[[], EarlyModeDependencies]`, never an already constructed dependency
object. `EarlyModeDependencies` contains factories/callables only; it contains
no registry/controller/process instance. Its streams are existing process
handles, not constructed dependencies. Before successful validation, all
of these remain uncalled: `production_early_mode_dependencies`, the
`EarlyModeDependencies` constructor, `WindowsRegistryBackend`,
`registry_factory`, `register_main_host`,
`create_production_recovery_controller`, `RecoveryController`,
`recovery_factory`, `CtypesWin32ProcessApi`, `WindowsProcessAdapter`,
`SubprocessProbeAdapter`, `TemporaryStagedProbeWorkspace`,
`WindowsRunOnceStore`, `SystemClock`, `create_windows_mutation_mutex`,
`default_install_root`,
the injected dependencies factory, `install_package`, and `status_server`.
Invalid `COMPLETE_UPDATE` also leaves the `InitiatingProcessIdentity`
constructor uncalled. For probe mismatches,
`run_update_probe` is also uncalled; only Plan A's serializer-bearing
dispatcher may run with the fixed malformed tuple.
Valid probe mode likewise never constructs `EarlyModeDependencies`; only Plan
A's standard-library probe path runs.

- [ ] **Step 1: Write RED selection, normal Chrome, and exact-dependency tests**

`EntrypointSelectionTests` covers every Plan C-selected command, precedence, basename, and normal launch; probe selection is exercised only through Plan A delegation tests:

Its `setUp` creates `self.host_root`, a plain `self.main_executable`, nonempty
`_internal`, and valid metadata paths `self.release_integrity` and
`self.installed_product` through the existing Plan A package fixture. Historical
tests then remove/corrupt only those metadata paths; the executable stays
startable.

```python
class EntrypointSelectionTests(unittest.TestCase):
    def test_recognized_command_selects_then_role_matrix_rejects_status_executable(self):
        selected = select_entry_mode(
            Path("C:/fixed/dh_update_status_host.exe"),
            ["--recover-active"],
        )
        self.assertEqual(selected, EntrySelection(EntryMode.RECOVER_ACTIVE, ()))
        with self.assertRaisesRegex(ValueError, "invalid_early_invocation"):
            validate_early_invocation(
                self.status_executable,
                ["--recover-active"],
                source_runtime=False,
            )

    def test_only_exact_status_basename_selects_status(self):
        origin = ALLOWED_ORIGINS[0]
        self.assertEqual(
            select_entry_mode(
                Path("C:/fixed/DH_UPDATE_STATUS_HOST.EXE"), [origin]
            ).mode,
            EntryMode.STATUS_HOST,
        )
        self.assertEqual(
            select_entry_mode(
                Path("C:/fixed/prefix-dh_update_status_host.exe"), [origin]
            ).mode,
            EntryMode.MAIN_HOST,
        )

    def test_normal_main_accepts_chrome_origin_and_parent_and_continues(self):
        dependencies_factory = mock.Mock(
            side_effect=AssertionError("factory_called")
        )
        origin = ALLOWED_ORIGINS[0]
        self.assertIsNone(dispatch_early_mode(
            str(self.main_executable),
            [origin],
            source_runtime=False,
            dependencies_factory=dependencies_factory,
        ))
        self.assertIsNone(dispatch_early_mode(
            str(self.main_executable),
            [origin, "--parent-window=123"],
            source_runtime=False,
            dependencies_factory=dependencies_factory,
        ))
        self.assertIsNone(dispatch_early_mode(
            str(self.main_executable),
            [origin, "--parent-window=0"],
            source_runtime=False,
            dependencies_factory=dependencies_factory,
        ))
        dependencies_factory.assert_not_called()
        self.assertEqual(self.last_stdout_bytes(), b"")
        self.assertEqual(self.last_stderr_bytes(), b"")
        self.assertEqual(
            parse_main_host_launch_args([origin, "--parent-window=0"]),
            parse_chrome_launch_args([origin, "--parent-window=0"]),
        )

    def test_startable_partial_historical_main_reaches_normal_startup(self):
        self.release_integrity.unlink(missing_ok=True)
        self.installed_product.write_bytes(b'{"partial":true}\n')
        dependencies_factory = mock.Mock(
            side_effect=AssertionError("factory_called")
        )

        self.assertIsNone(dispatch_early_mode(
            str(self.main_executable),
            [ALLOWED_ORIGINS[0], "--parent-window=0"],
            source_runtime=False,
            dependencies_factory=dependencies_factory,
        ))

        dependencies_factory.assert_not_called()
        self.assertEqual(self.last_stdout_bytes(), b"")
        self.assertEqual(self.last_stderr_bytes(), b"")
        self.assertEqual(
            InstallationVerifier(self.host_root, frozen=True).verify(),
            InstallationVerification(
                mode="packaged",
                integrity="failed",
                error_code="installation_integrity_failed",
            ),
        )

    def test_startable_historical_main_with_both_metadata_files_missing_continues(self):
        self.release_integrity.unlink(missing_ok=True)
        self.installed_product.unlink(missing_ok=True)
        dependencies_factory = mock.Mock(
            side_effect=AssertionError("factory_called")
        )
        self.assertIsNone(dispatch_early_mode(
            str(self.main_executable),
            [ALLOWED_ORIGINS[0]],
            source_runtime=False,
            dependencies_factory=dependencies_factory,
        ))
        dependencies_factory.assert_not_called()
        self.assertEqual(self.last_stdout_bytes(), b"")
        self.assertEqual(self.last_stderr_bytes(), b"")
        self.assertEqual(
            InstallationVerifier(self.host_root, frozen=True).verify(),
            InstallationVerification(
                mode="packaged",
                integrity="failed",
                error_code="installation_integrity_failed",
            ),
        )

    def test_normal_main_classification_source_has_no_metadata_dependency(self):
        source = inspect.getsource(classify_entrypoint)
        self.assertNotIn("release-integrity.json", source)
        self.assertNotIn("installed-product.json", source)
        self.assertNotIn("_internal", source.split(
            'if basename == "dh_native_host.py"'
        )[0])

    def test_normal_main_accepts_empty_source_launch_and_continues(self):
        dependencies_factory = mock.Mock(
            side_effect=AssertionError("factory_called")
        )
        self.assertIsNone(dispatch_early_mode(
            str((self.repo_root / "host" / "dh_native_host.py").resolve()),
            [],
            source_runtime=True,
            dependencies_factory=dependencies_factory,
        ))
        dependencies_factory.assert_not_called()

```

The historical fixtures retain a plain startable `dh_native_host.exe`: one has
both metadata files absent and one has a missing/malformed pair. The early
dispatcher must return `None` for both; Plan A verifier assertions prove both
failures are reported through `verify_installation`, not converted to
`invalid_early_invocation`.
Neither fixture may construct `production_early_mode_dependencies` or write
early stdout/stderr.
Add a contrast case using the same partial executable with `--update-probe`:
its complete probe chain must fail before probe execution, proving metadata
independence is normal-main-only.

Add a table-driven positive test for every matrix row and a cross-product
negative test that places each recognized command on every non-allowed role.
Each positive row proves the exact expected factory/server call count; source
register asserts `SOURCE`, frozen register asserts `FROZEN`, and normal main
asserts zero dependency-factory calls.
The status positive row includes `--parent-window=0`; the main positive method
above already includes it.
Add exact arity, command-first, command uniqueness, unknown DH flag,
case-variant command tokens, unallowlisted origin, path-as-Chrome-argv, strict status argv, source main,
source register, and source rejection for every other special mode. Every
negative call asserts exit `2`, empty stdout, exact fixed safe stderr (or Plan
A's canonical probe stdout), and every factory sentinel uncalled.

Add `test_dependency_construction_occurs_after_validated_invocation` as an AST
lock. The non-probe branch of `dispatch_early_mode` must call
`validate_early_invocation` once before
the sole injected-or-production dependency factory expression; normal main
returns after validation and before that expression. Dispatch uses
only the returned payload. No factory or object constructor
appears in `classify_entrypoint`, `select_entry_mode`,
`validate_early_invocation`, `parse_main_host_launch_args`,
`validate_complete_update_command`, `resolve_recovery_install_root`,
`resolve_active_command`, or `resolve_journal_command`. The validator is the
only caller of those lower pure validators. Probe calls
`validate_probe_invocation` before Plan A. On any validation failure, dispatch
uses the fixed malformed tuple so Plan A emits canonical failure without any
probe execution.

Add an AST assertion that `classify_entrypoint` contains neither metadata
filename and that `_validate_frozen_probe_host_root` contains both. This keeps
normal startup metadata-independent while proving early probe still validates
its complete required chain. The production-main branch before source-main must
also contain no `_internal` check.

Add exact `test_frozen_process_cannot_claim_source_fallback` and
`test_source_process_cannot_claim_frozen_role`; both patch every constructor,
return fixed `2`, and leave factories uncalled. The top-level AST test requires
`source_runtime` derive only from `not bool(getattr(sys, "frozen", False))`.

Add `test_complete_update_constructs_identity_only_after_all_authority_reads`.
Patch `InitiatingProcessIdentity` to raise and provide malformed executable,
active, journal, and raw identity cases; every case must return fixed `2`
without invoking it. In the valid case, AST/order recording requires
`resolve_recovery_install_root`, `read_active_transaction`,
`resolve_active_journal`, and `read_journal` all precede the one identity
constructor, which is immediately before `ValidatedCompleteUpdate` return.

`EntrypointDependencyTests` locks one dataclass field set. Calling a test
factory here is intentional and occurs outside dispatch validation; separate
mismatch tests prove dispatch never calls it early:

```python
class EntrypointDependencyTests(unittest.TestCase):
    def test_exact_dependency_shape_is_shared_by_tests_and_production(self):
        self.assertEqual(tuple(EarlyModeDependencies.__dataclass_fields__), (
            "input_stream",
            "output_stream",
            "error_stream",
            "registry_factory",
            "recovery_factory",
            "default_install_root",
            "install_package",
            "status_server",
        ))
        dependencies_factory = fake_early_dependencies_factory()
        deps = dependencies_factory()
        self.assertIsInstance(deps, EarlyModeDependencies)
        self.assertIsInstance(
            production_early_mode_dependencies(), EarlyModeDependencies
        )

    def test_dispatch_signature_accepts_factory_not_dependency_instance(self):
        self.assertEqual(
            tuple(inspect.signature(dispatch_early_mode).parameters),
            (
                "executable", "argv", "source_runtime",
                "dependencies_factory",
            ),
        )

    def test_probe_validator_returns_frozen_canonical_authority(self):
        value = validate_probe_invocation(
            self.main_executable,
            ["--update-probe", str(self.manifest)],
            source_runtime=False,
        )
        self.assertEqual(
            value,
            ValidatedProbe(self.main_executable, self.manifest),
        )

    def test_validated_payload_dataclasses_have_exact_fields(self):
        self.assertEqual(tuple(ValidatedMainHost.__dataclass_fields__), ("launch",))
        self.assertEqual(
            tuple(ValidatedStatusHost.__dataclass_fields__),
            ("install_root", "launch"),
        )
        self.assertEqual(
            tuple(ValidatedRegistration.__dataclass_fields__),
            ("host_root", "runtime"),
        )
        self.assertEqual(
            tuple(ValidatedInstallPackage.__dataclass_fields__),
            ("package_root",),
        )
```

- [ ] **Step 2: Write RED full dispatch tests**

Use this exact single dataclass in tests and implementation:

```python
@dataclass(frozen=True)
class EarlyModeDependencies:
    input_stream: BinaryIO
    output_stream: BinaryIO
    error_stream: BinaryIO
    registry_factory: Callable[[], RegistryBackend]
    recovery_factory: Callable[[Path], RecoveryController]
    default_install_root: Callable[[], Path]
    install_package: Callable[[Path, Path], int]
    status_server: Callable[[BinaryIO, BinaryIO, Path], int]
```

`EntrypointDispatchTests` requires:

- Frozen `dh_native_host.exe --register` with `source_runtime=False` calls `register_main_host(entrypoint.parent, fake registry, FROZEN)` and returns `0`; source `host/dh_native_host.py --register` with `source_runtime=True` calls the same service with `entrypoint.parent` and `SOURCE`. Swapped runtime booleans and runner/status/interpreter/arbitrary-script entrypoints return fixed `2` before the registry factory.
- `--complete-update <id> <positive-decimal-pid> <creation-token>` derives the install from the fixed runner chain, strict-loads matching active/prepared journal authority and path containment before controller construction, passes exact `InitiatingProcessIdentity`, and maps the terminal journal.
- Missing token, extra arg, malformed/uppercase ID, `+1`, `01`, `0`, negative, hex, malformed token, bare PID, wrong executable basename, or runner path outside exact `<install>/updates/recovery` returns `2`, writes no dynamic error, and leaves `production_early_mode_dependencies`, `recovery_factory`, `CtypesWin32ProcessApi`, and the controller factory uncalled.
- `--install-package <absolute-package-root>` requires the entrypoint equal `<package-root>/host/dh_native_host.exe` before invoking only `dependencies.install_package(package_root, dependencies.default_install_root())`; Plan C production returns `10`, while Plan D binds the callback without changing grammar. Wrong package root, main installed executable, runner, status, or source script returns fixed `2` before `default_install_root` or `install_package`.
- The validated package root must be a plain non-reparse directory and its `host` child/executable chain must remain byte/path-identical between validation and callback entry; Plan D callback revalidates package integrity to close TOCTOU.
- `--update-probe <absolute-manifest>` first requires the production main executable role and complete argv, then calls imported Plan A `dispatch_early_cli((entrypoint, *argv))` unchanged. Plan A `0` maps to `0` and package validation failure `1` maps to fixed `40`. Any invocation validation failure calls Plan A only with the fixed malformed tuple, yielding `2` and exact canonical JSON without `run_update_probe`, dependencies, or factories.
- Normal `MAIN_HOST` classification must not inspect either metadata file. The `UPDATE_PROBE` validator separately requires a plain complete sibling `_internal` directory plus packaged `release-integrity.json` and `installed-product.json`; a renamed arbitrary `dh_native_host.exe` without that frozen Host-root shape is rejected before Plan A. `INSTALL_PACKAGE` separately validates the package root through Plan D's callback after early chain binding.
- Frozen `REGISTER` still validates its required `_internal` runtime chain, but does not use release metadata as a general executable-role classifier. Runner/status/recovery/probe/install modes retain every fixed-chain and metadata requirement stated in their matrix rows.
- `--recover-active` accepts no arguments, derives the fixed runner install root, strict-loads `<install>/updates/active.json`, validates its transaction ID and canonical contained journal through `resolve_active_command`, and only then constructs/calls the controller. Missing/extra args, wrong basename, runner path outside exact `<install>/updates/recovery`, malformed active ID/path, active traversal, mismatched embedded journal ID, or noncanonical transaction journal returns `2` before either dependency or controller factory.
- `--recover-update <absolute-canonical-journal>` validates exact `<install>/updates/transactions/<id>/journal.json`, embedded ID, and calls that install's controller.
- Manual `--recover-update` accepts terminal journals for idempotent RunOnce/cleanup policy as well as nonterminal journals; it does not require the stable active record to remain when Plan B's controller permits terminal replay. It still binds journal and runner to the same install before construction.
- Status mode validates the complete Chrome argv and exact status executable chain before constructing production dependencies, then calls only `status_server(input, output, install_root)`; malformed origin/parent/path argv or a status command token returns `2` before `production_early_mode_dependencies` and never creates recovery/process/registry/controller dependencies.
- Main mode validates exact source/production entrypoint, matching runtime boolean, and complete Chrome argv, returns `None`, and does not call either injected or production dependency factory.
- `UpdateAlreadyInProgress` maps to `31`; validator-classified journal/argument errors map to `2`; unexpected post-validation errors write only one fixed ASCII category line and return `50`.

The `2` mapping is owned exclusively by validators wrapping expected parser,
journal-reader, path, and Chrome-argv failures as `EarlyInvocationError`.
Dispatch does not broadly catch `ValueError`/`FileNotFoundError` after factory
construction; a bug or runtime failure after validation is fixed `50`, not
misreported as malformed invocation.

The fixed mismatch contract for every Plan C-owned mode is exit `2`, empty
stdout, and exactly `b"invalid_early_invocation\n"` on stderr. This includes
all malformed recognized non-probe commands and malformed status/main launch
argv. Probe mode instead has Plan A's exact canonical stdout and empty stderr.

Add `test_installer_callback_uses_plan_b_null_identity_path`: a successful
dispatch invokes a factory that returns dependencies whose installer callback
calls `controller.run_installer_update(id)`; the fake records no process
open/wait. This locks the Plan D installer handoff to Plan B's
installer/null-identity contract.

Add exact no-factory tests for every matrix mode. Patch
`production_early_mode_dependencies`, the supplied fake's `registry_factory`,
`recovery_factory`, `default_install_root`, `install_package`, and
`status_server` to raise `AssertionError("factory_called")`; patch
`WindowsRegistryBackend`, `create_production_recovery_controller`,
`CtypesWin32ProcessApi`, and the controller constructor as additional
sentinels. Each mismatch returns `EXIT_INVALID_ARGUMENTS`, writes the frozen
safe output, and never raises. Required named tests include:

```python
def test_malformed_complete_update_never_constructs_controller_dependencies(self):
    invalid = (
        ["--complete-update"],
        ["--complete-update", TX_ID, "77"],
        ["--complete-update", TX_ID, "77", "win-create-time-1", "extra"],
        ["--complete-update", "F" * 32, "77", "win-create-time-1"],
        ["--complete-update", TX_ID, "0", "win-create-time-1"],
        ["--complete-update", TX_ID, "77", "bad-token"],
    )
    for argv in invalid:
        with self.subTest(argv=argv):
            self.assert_invalid_before_factories(self.runner_executable, argv)

def test_complete_update_invalid_transaction_authority_never_constructs_controller(self):
    mutations = (
        self.write_active_for_other_transaction,
        self.write_active_with_traversal_journal,
        self.write_prepared_journal_with_mismatched_id,
        self.write_nonprepared_journal,
    )
    valid_argv = [
        "--complete-update", TX_ID, "77", "win-create-time-1"
    ]
    for mutate in mutations:
        with self.subTest(mutate=mutate.__name__):
            self.restore_valid_active_fixture()
            mutate()
            self.assert_invalid_before_factories(
                self.runner_executable, valid_argv
            )

def test_malformed_recover_active_never_constructs_controller_dependencies(self):
    for argv in (
        ["--recover-active", TX_ID],
        ["--recover-active", r"C:\\journal.json"],
    ):
        with self.subTest(argv=argv):
            self.assert_invalid_before_factories(self.runner_executable, argv)

def test_invalid_active_record_never_constructs_controller_dependencies(self):
    mutations = (
        self.write_active_with_uppercase_id,
        self.write_active_with_traversal_journal,
        self.write_active_with_mismatched_journal_id,
        self.remove_active_journal,
    )
    for mutate in mutations:
        with self.subTest(mutate=mutate.__name__):
            self.restore_valid_active_fixture()
            mutate()
            self.assert_invalid_before_factories(
                self.runner_executable, ["--recover-active"]
            )

def test_malformed_status_argv_never_constructs_any_dependency(self):
    for argv in (
        [],
        ["chrome-extension://unknown/"],
        [ALLOWED_ORIGINS[0], TX_ID],
        [ALLOWED_ORIGINS[0], "--parent-window=-1"],
        [ALLOWED_ORIGINS[0], "--parent-window=0x10"],
        [ALLOWED_ORIGINS[0], "--parent-window=1", "extra"],
    ):
        with self.subTest(argv=argv):
            self.assert_invalid_before_factories(self.status_executable, argv)

def test_register_wrong_entrypoint_never_constructs_registry(self):
    for executable in (
        self.runner_executable,
        self.status_executable,
        self.python_executable,
        self.arbitrary_script,
    ):
        with self.subTest(executable=executable):
            self.assert_invalid_before_factories(executable, ["--register"])

def test_install_package_chain_mismatch_never_calls_default_root_or_installer(self):
    for executable, package_root in self.invalid_install_package_chains():
        with self.subTest(executable=executable, package_root=package_root):
            self.assert_invalid_before_factories(
                executable, ["--install-package", str(package_root)]
            )

def test_recover_update_wrong_role_or_journal_never_constructs_controller(self):
    cases = (
        (self.main_executable, self.valid_journal),
        (self.status_executable, self.valid_journal),
        (self.runner_executable, self.noncanonical_journal),
        (self.runner_executable, self.other_install_journal),
    )
    for executable, journal in cases:
        with self.subTest(executable=executable, journal=journal):
            self.assert_invalid_before_factories(
                executable, ["--recover-update", str(journal)]
            )

def test_probe_wrong_role_uses_canonical_failure_without_probe_or_factories(self):
    for executable in (
        self.runner_executable,
        self.status_executable,
        self.source_entrypoint,
    ):
        with self.subTest(executable=executable):
            self.assert_probe_role_mismatch_before_factories(executable)

def assert_invalid_before_factories(
    self, executable, argv, *, source_runtime=False
):
    # All callers in this block use frozen roles; source mismatch tests pass
    # source_runtime=True explicitly in their dedicated methods.
    for dependencies_factory in (None, self.exploding_dependencies_factory()):
        with (
            self.subTest(injected=dependencies_factory is not None),
            mock.patch(
                "update_entrypoint.production_early_mode_dependencies",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_platform.CtypesWin32ProcessApi",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_entrypoint.EarlyModeDependencies",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_entrypoint.WindowsRegistryBackend",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_entrypoint.create_production_recovery_controller",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_recovery.RecoveryController",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_platform.WindowsProcessAdapter",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_platform.SubprocessProbeAdapter",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_recovery.TemporaryStagedProbeWorkspace",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_platform.WindowsRunOnceStore",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_platform.SystemClock",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_entrypoint.create_windows_mutation_mutex",
                side_effect=AssertionError("factory_called"),
            ),
            mock.patch(
                "update_entrypoint.InitiatingProcessIdentity",
                side_effect=AssertionError("factory_called"),
            ),
        ):
            self.assertEqual(
                dispatch_early_mode(
                    executable,
                    argv,
                    source_runtime=source_runtime,
                    dependencies_factory=dependencies_factory,
                ),
                EXIT_INVALID_ARGUMENTS,
            )
            self.assertEqual(self.last_stdout_bytes(), b"")
            self.assertEqual(
                self.last_stderr_bytes(), INVALID_EARLY_INVOCATION
            )
```

`assert_probe_role_mismatch_before_factories` applies the same sentinels plus a
patched `update_entrypoint.dispatch_early_cli` that records its tuple and
returns `2`, plus a poisoned `install_integrity.run_update_probe`; it requires
exact canonical Plan A failure bytes in the process-level companion test,
empty stderr, fixed malformed tuple, and zero probe execution. The fixed tuple
contains only the absolute entrypoint and `--update-probe`, never the rejected
manifest/path text.
`assert_invalid_before_factories` runs with no injected factory and with an
injected factory that raises before it can construct `EarlyModeDependencies`.
Successful special-mode tests inject a factory returning the exact dataclass;
mismatch tests require that factory uncalled. This proves both the production construction seam and every inner factory,
server, controller, registry adapter, and process adapter remain untouched.
Add an import-time AST/runtime test that patches every constructor in the
no-construction ledger, imports `update_entrypoint`, and succeeds. It rejects
module-level calls to those constructors and instance-valued dataclass
defaults; `RecoveryDependencies.diagnostics.default_factory` must be exactly
`RecoveryDiagnostics` and remain uncalled until a `RecoveryDependencies`
instance is explicitly constructed after validation.

Add a valid-probe factory sentinel test too: successful probe must leave both
production and injected dependency factories uncalled, not only malformed
probe cases.

For each malformed recognized mode, also patch `EarlyModeDependencies` itself;
the test must prove neither the production nor injected factory is called, so
the constructor patch remains untouched rather than merely failing later.

Add a separate direct-call type test for each mode using a non-string argv
object. It returns `2`, empty stdout, exact fixed stderr, and no factory call.
This tests `Sequence[str]` defensively without conflating it with malformed
probe JSON.

- [ ] **Step 3: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_update_entrypoint","-v") -ExpectFailure`

Expected: missing `update_entrypoint`.

- [ ] **Step 4: Implement exact selection and pure resolvers**

```python
class EntryMode(StrEnum):
    MAIN_HOST = "main-host"
    STATUS_HOST = "status-host"
    REGISTER = "register"
    COMPLETE_UPDATE = "complete-update"
    INSTALL_PACKAGE = "install-package"
    RECOVER_ACTIVE = "recover-active"
    RECOVER_UPDATE = "recover-update"


class ExecutableRole(StrEnum):
    PRODUCTION_MAIN = "production-main"
    SOURCE_MAIN = "source-main"
    DETACHED_RUNNER = "detached-runner"
    STATUS_HOST = "status-host"


class EarlyInvocationError(ValueError):
    def __init__(self) -> None:
        super().__init__("invalid_early_invocation")


@dataclass(frozen=True)
class EntrySelection:
    mode: EntryMode
    arguments: tuple[str, ...]

    def __post_init__(self) -> None:
        if (
            type(self.mode) is not EntryMode
            or type(self.arguments) is not tuple
            or any(type(value) is not str for value in self.arguments)
        ):
            raise ValueError("invalid_early_selection")


@dataclass(frozen=True)
class ValidatedEarlyInvocation:
    entrypoint: Path
    role: ExecutableRole
    selection: EntrySelection
    payload: object

    def __post_init__(self) -> None:
        if (
            not isinstance(self.entrypoint, Path)
            or not self.entrypoint.is_absolute()
            or type(self.role) is not ExecutableRole
            or type(self.selection) is not EntrySelection
        ):
            raise ValueError("invalid_early_invocation")


COMMANDS = {
    "--register": EntryMode.REGISTER,
    "--complete-update": EntryMode.COMPLETE_UPDATE,
    "--install-package": EntryMode.INSTALL_PACKAGE,
    "--recover-active": EntryMode.RECOVER_ACTIVE,
    "--recover-update": EntryMode.RECOVER_UPDATE,
}

COMMAND_ARITIES = {
    EntryMode.REGISTER: 0,
    EntryMode.COMPLETE_UPDATE: 3,
    EntryMode.INSTALL_PACKAGE: 1,
    EntryMode.RECOVER_ACTIVE: 0,
    EntryMode.RECOVER_UPDATE: 1,
}


def select_entry_mode(
    executable: Path,
    argv: Sequence[str],
) -> EntrySelection:
    if any(type(argument) is not str for argument in argv):
        raise ValueError("invalid_early_arguments")
    recognized_tokens = set(COMMANDS) | {"--update-probe"}
    matches = [
        (index, COMMANDS[argument])
        for index, argument in enumerate(argv)
        if argument in COMMANDS
    ]
    if any(
        argument.startswith("--")
        and argument not in recognized_tokens
        and not argument.startswith("--parent-window=")
        for argument in argv
    ):
        raise ValueError("unknown_dh_command")
    if len(matches) > 1:
        raise ValueError("multiple_dh_commands")
    if matches:
        index, mode = matches[0]
        if index != 0:
            raise ValueError("dh_command_must_be_first")
        return EntrySelection(mode, tuple(argv[1:]))
    basename = executable.name.casefold()
    if basename == "dh_update_status_host.exe":
        return EntrySelection(EntryMode.STATUS_HOST, tuple(argv))
    if basename == "dh_update_runner.exe":
        raise ValueError("runner_command_required")
    return EntrySelection(EntryMode.MAIN_HOST, tuple(argv))


def parse_main_host_launch_args(
    argv: Sequence[str],
) -> ChromeLaunch | None:
    if len(argv) == 0:
        return None
    return parse_chrome_launch_args(argv)


@dataclass(frozen=True)
class ValidatedMainHost:
    launch: ChromeLaunch | None

    def __post_init__(self) -> None:
        if self.launch is not None and type(self.launch) is not ChromeLaunch:
            raise ValueError("invalid_main_host_authority")


@dataclass(frozen=True)
class ValidatedStatusHost:
    install_root: Path
    launch: ChromeLaunch

    def __post_init__(self) -> None:
        if (
            not isinstance(self.install_root, Path)
            or not self.install_root.is_absolute()
            or type(self.launch) is not ChromeLaunch
        ):
            raise ValueError("invalid_status_authority")


@dataclass(frozen=True)
class ValidatedRegistration:
    host_root: Path
    runtime: MainHostRuntime

    def __post_init__(self) -> None:
        if (
            not isinstance(self.host_root, Path)
            or not self.host_root.is_absolute()
            or type(self.runtime) is not MainHostRuntime
        ):
            raise ValueError("invalid_registration_authority")


@dataclass(frozen=True)
class ValidatedProbe:
    entrypoint: Path
    manifest_path: Path

    def __post_init__(self) -> None:
        if (
            not isinstance(self.entrypoint, Path)
            or not isinstance(self.manifest_path, Path)
            or not self.entrypoint.is_absolute()
            or not self.manifest_path.is_absolute()
        ):
            raise ValueError("invalid_probe_authority")


@dataclass(frozen=True)
class ValidatedInstallPackage:
    package_root: Path

    def __post_init__(self) -> None:
        if (
            not isinstance(self.package_root, Path)
            or not self.package_root.is_absolute()
        ):
            raise ValueError("invalid_package_authority")


# Selection is syntactic only; validate_early_invocation owns authorization,
# fixed-chain checks, and all domain-object construction.
@dataclass(frozen=True)
class ValidatedCompleteUpdate:
    install_root: Path
    transaction_id: str
    process_identity: InitiatingProcessIdentity

    def __post_init__(self) -> None:
        if (
            not isinstance(self.install_root, Path)
            or not self.install_root.is_absolute()
        ):
            raise ValueError("invalid_complete_update_authority")
        parse_transaction_id(self.transaction_id)
        if type(self.process_identity) is not InitiatingProcessIdentity:
            raise ValueError("invalid_complete_update_authority")


@dataclass(frozen=True)
class ValidatedRecoveryCommand:
    install_root: Path
    transaction_id: str
    journal_path: Path

    def __post_init__(self) -> None:
        if (
            not isinstance(self.install_root, Path)
            or not isinstance(self.journal_path, Path)
            or not self.install_root.is_absolute()
            or not self.journal_path.is_absolute()
        ):
            raise ValueError("invalid_recovery_authority")
        parse_transaction_id(self.transaction_id)
        if self.journal_path != TransactionPaths.for_install(
            self.install_root, self.transaction_id
        ).journal:
            raise ValueError("invalid_recovery_authority")
```

Both frozen validated-command dataclasses enforce structural path/type
invariants. Add pure `classify_entrypoint` before them. It requires an
absolute, already canonical plain regular file and maps only exact leaves:
`dh_native_host.exe -> PRODUCTION_MAIN`, `dh_native_host.py -> SOURCE_MAIN`,
`dh_update_runner.exe -> DETACHED_RUNNER`, and
`dh_update_status_host.exe -> STATUS_HOST`. Source main additionally requires
sibling `launch_host.bat` and `dh_native_host.py` as the resolved `__file__`;
runner/status call `resolve_recovery_install_root` and require both executable
siblings plus nonempty plain `_internal`. No
interpreter, fuzzy basename, suffix, or symlink is accepted. A canonical plain
same-named production-main executable may reach normal launch classification;
special-mode validators then impose their own chain. `PRODUCTION_MAIN`
classification intentionally performs no release
metadata check. `_validate_frozen_main_runtime` owns the `_internal` check used
by frozen registration. `_validate_frozen_probe_host_root` adds both metadata
requirements and is called only by `validate_probe_invocation`.

To keep the early import closure acyclic, `update_entrypoint.py` defines its
own tiny read-only `_require_plain_entrypoint_file` using `Path.lstat`,
`stat.S_ISREG`, and `FILE_ATTRIBUTE_REPARSE_POINT`; it does not import
`update_recovery._lstat_plain`. Its directory counterpart requires `S_ISDIR`
and the same no-reparse rule for fixed-chain parents. A helper
`_require_nonempty_plain_directory` checks at least one child and validates
each immediate child type without constructing dependencies. The complete code
below uses those local names.

Freeze role permissions:

```python
MODE_ROLES = {
    EntryMode.MAIN_HOST: frozenset({
        ExecutableRole.PRODUCTION_MAIN,
        ExecutableRole.SOURCE_MAIN,
    }),
    EntryMode.REGISTER: frozenset({
        ExecutableRole.PRODUCTION_MAIN,
        ExecutableRole.SOURCE_MAIN,
    }),
    EntryMode.INSTALL_PACKAGE: frozenset({ExecutableRole.PRODUCTION_MAIN}),
    EntryMode.COMPLETE_UPDATE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.RECOVER_ACTIVE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.RECOVER_UPDATE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.STATUS_HOST: frozenset({ExecutableRole.STATUS_HOST}),
}
```

Implement the pure entrypoint and probe validators completely. The local
entrypoint check has the same regular-file and Windows reparse rules as the
recovery helper and performs no import-time or mutation side effect:

```python
def classify_entrypoint(
    executable: Path,
) -> tuple[ExecutableRole, Path]:
    try:
        if (
            not isinstance(executable, Path)
            or not executable.is_absolute()
            or ".." in executable.parts
        ):
            raise ValueError("invalid entrypoint path")
        canonical = executable.resolve(strict=True)
        if canonical != executable:
            raise ValueError("noncanonical entrypoint path")
        _require_plain_entrypoint_file(canonical)
        basename = canonical.name.casefold()
        if basename == "dh_native_host.exe":
            return ExecutableRole.PRODUCTION_MAIN, canonical
        if basename == "dh_native_host.py":
            launcher = canonical.parent / "launch_host.bat"
            _require_plain_entrypoint_file(launcher)
            return ExecutableRole.SOURCE_MAIN, canonical
        if basename == "dh_update_runner.exe":
            resolve_recovery_install_root(canonical, "dh_update_runner.exe")
            _require_nonempty_plain_directory(canonical.parent / "_internal")
            _require_plain_entrypoint_file(
                canonical.parent / "dh_update_status_host.exe"
            )
            return ExecutableRole.DETACHED_RUNNER, canonical
        if basename == "dh_update_status_host.exe":
            resolve_recovery_install_root(
                canonical, "dh_update_status_host.exe"
            )
            _require_nonempty_plain_directory(canonical.parent / "_internal")
            _require_plain_entrypoint_file(
                canonical.parent / "dh_update_runner.exe"
            )
            return ExecutableRole.STATUS_HOST, canonical
        raise ValueError("unknown entrypoint")
    except EarlyInvocationError:
        raise
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise EarlyInvocationError() from error


def _validate_frozen_main_runtime(entrypoint: Path) -> None:
    _require_nonempty_plain_directory(entrypoint.parent / "_internal")


def _validate_frozen_probe_host_root(entrypoint: Path) -> None:
    _validate_frozen_main_runtime(entrypoint)
    _require_plain_entrypoint_file(entrypoint.parent / "release-integrity.json")
    _require_plain_entrypoint_file(entrypoint.parent / "installed-product.json")


def validate_probe_invocation(
    executable: Path,
    argv: Sequence[str],
    *,
    source_runtime: bool,
) -> ValidatedProbe:
    try:
        role, canonical = classify_entrypoint(executable)
        recognized_count = sum(
            argument in ("--update-probe", *COMMANDS)
            for argument in argv
            if type(argument) is str
        )
        if (
            type(source_runtime) is not bool
            or source_runtime
            or role is not ExecutableRole.PRODUCTION_MAIN
            or len(argv) != 2
            or any(type(argument) is not str for argument in argv)
            or argv[0] != "--update-probe"
            or recognized_count != 1
        ):
            raise ValueError("invalid probe invocation")
        _validate_frozen_probe_host_root(canonical)
        manifest = Path(argv[1])
        if not manifest.is_absolute() or ".." in manifest.parts:
            raise ValueError("invalid probe manifest")
        resolved = manifest.resolve(strict=True)
        if resolved != manifest:
            raise ValueError("noncanonical probe manifest")
        _require_plain_entrypoint_file(resolved)
        return ValidatedProbe(canonical, resolved)
    except EarlyInvocationError:
        raise
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise EarlyInvocationError() from error
```

Implement `validate_early_invocation` as the sole caller that composes
`classify_entrypoint`, selection, arity, role, and the lower pure validators.
It returns a mode-specific frozen validated payload. Registration contains
`host_root` plus `MainHostRuntime.FROZEN|SOURCE`; install contains the canonical
package root and additionally requires `entrypoint == package_root / "host" /
"dh_native_host.exe"`; main/status contain parsed Chrome launch data; complete
and recovery contain their authority records. Dispatch never reparses raw argv.

For `STATUS_HOST`, the payload is the install root returned by the exact chain
resolver after `parse_chrome_launch_args` succeeds. For `RECOVER_ACTIVE`, call
`resolve_active_command` on that runner-derived install root. For
`RECOVER_UPDATE`, call `resolve_journal_command` and additionally require its
`install_root` equals the install root derived from the runner entrypoint; this
prevents one installation's runner from recovering another installation's
journal. For `COMPLETE_UPDATE`, `validate_complete_update_command` already
binds both authorities. Source and frozen `MAIN_HOST` both accept Chrome's
allowlisted launch argv because `launch_host.bat` forwards `%*` in development.

`RECOVER_ACTIVE` accepts every strictly parsed current phase because the Plan B
controller owns phase-specific resume/manual behavior. Dispatch validates
identity/path linkage only and does not duplicate the journal state machine.
`COMPLETE_UPDATE` alone requires `PREPARED` because it is the activation
boundary.

Use this complete outer validator shape; its single `if/elif` block implements
the exact payload rules immediately above and calls no factory:

```python
def validate_early_invocation(
    executable: Path,
    argv: Sequence[str],
    *,
    source_runtime: bool,
) -> ValidatedEarlyInvocation:
    try:
        if any(type(argument) is not str for argument in argv):
            raise ValueError("non-string early argument")
        role, entrypoint = classify_entrypoint(executable)
        if type(source_runtime) is not bool or (
            (role is ExecutableRole.SOURCE_MAIN) != source_runtime
        ):
            raise ValueError("runtime role mismatch")
        selection = select_entry_mode(entrypoint, argv)
        expected_arity = COMMAND_ARITIES.get(selection.mode)
        if (
            expected_arity is not None
            and len(selection.arguments) != expected_arity
        ):
            raise ValueError("invalid early arity")
        if role not in MODE_ROLES[selection.mode]:
            raise ValueError("entrypoint role mismatch")

        if selection.mode is EntryMode.MAIN_HOST:
            payload = ValidatedMainHost(
                launch=parse_main_host_launch_args(selection.arguments)
            )
        elif selection.mode is EntryMode.STATUS_HOST:
            launch = parse_chrome_launch_args(selection.arguments)
            payload = ValidatedStatusHost(
                install_root=resolve_recovery_install_root(
                    entrypoint, "dh_update_status_host.exe"
                ),
                launch=launch,
            )
        elif selection.mode is EntryMode.REGISTER:
            if role is ExecutableRole.PRODUCTION_MAIN:
                _validate_frozen_main_runtime(entrypoint)
            payload = ValidatedRegistration(
                host_root=entrypoint.parent,
                runtime=(
                    MainHostRuntime.SOURCE
                    if role is ExecutableRole.SOURCE_MAIN
                    else MainHostRuntime.FROZEN
                ),
            )
        elif selection.mode is EntryMode.INSTALL_PACKAGE:
            requested_package_root = Path(selection.arguments[0])
            if (
                not requested_package_root.is_absolute()
                or ".." in requested_package_root.parts
            ):
                raise ValueError("invalid package root")
            package_root = requested_package_root.resolve(strict=True)
            if package_root != requested_package_root:
                raise ValueError("noncanonical package root")
            _require_plain_entrypoint_directory(package_root)
            _require_plain_entrypoint_directory(package_root / "host")
            if entrypoint != package_root / "host" / "dh_native_host.exe":
                raise ValueError("package entrypoint mismatch")
            _validate_frozen_probe_host_root(entrypoint)
            payload = ValidatedInstallPackage(package_root=package_root)
        elif selection.mode is EntryMode.COMPLETE_UPDATE:
            payload = validate_complete_update_command(
                entrypoint, selection.arguments
            )
        elif selection.mode is EntryMode.RECOVER_ACTIVE:
            install_root = resolve_recovery_install_root(
                entrypoint, "dh_update_runner.exe"
            )
            payload = resolve_active_command(install_root)
        elif selection.mode is EntryMode.RECOVER_UPDATE:
            install_root = resolve_recovery_install_root(
                entrypoint, "dh_update_runner.exe"
            )
            payload = resolve_journal_command(Path(selection.arguments[0]))
            if payload.install_root != install_root:
                raise ValueError("journal entrypoint mismatch")
        else:
            raise ValueError("unsupported early mode")
        return ValidatedEarlyInvocation(
            entrypoint, role, selection, payload
        )
    except EarlyInvocationError:
        raise
    except (
        JournalValidationError,
        OSError,
        RuntimeError,
        TypeError,
        ValueError,
    ) as error:
        raise EarlyInvocationError() from error
```

This outer wrapping is intentional: expected I/O/parser/path failures become
the one fixed invocation failure. Unexpected programming exceptions remain
exit `50`; `BaseException` propagates. Nothing inside this function constructs a
dependency/controller/registry/process object or mutates state.

No fuzzy comparison is allowed. A runner without a recognized command cannot
fall through to main startup. Probe mode remains absent from `EntryMode`, but
its frozen role set is exactly `{PRODUCTION_MAIN}` and Plan C validates that
role plus `_validate_frozen_probe_host_root` before Plan A delegation. Plan A
still exclusively owns probe manifest semantics, canonical output, and `0|1|2`
result; Plan C owns complete invocation arity/path and executable-chain
prevalidation.

Missing metadata with `--update-probe` remains an early probe-chain failure;
metadata-independent classification applies only to normal `MAIN_HOST` startup.

Normal-main `None` is not an error exit code. The top-level Host bootstrap
continues imports/startup only for that return value; every integer exits early.

Pure fixed-chain resolvers:

```python
def resolve_recovery_install_root(
    executable: Path,
    expected_basename: str,
) -> Path:
    if not isinstance(executable, Path) or not executable.is_absolute():
        raise ValueError("invalid_recovery_executable")
    resolved = executable.resolve(strict=True)
    if resolved != executable:
        raise ValueError("noncanonical_recovery_executable")
    if type(expected_basename) is not str or expected_basename not in (
        "dh_update_runner.exe",
        "dh_update_status_host.exe",
    ):
        raise ValueError("invalid_recovery_executable")
    if resolved.name.casefold() != expected_basename.casefold():
        raise ValueError("invalid_recovery_executable")
    recovery = resolved.parent
    updates = recovery.parent
    install = updates.parent
    if recovery.name.casefold() != "recovery" or updates.name.casefold() != "updates":
        raise ValueError("invalid_recovery_executable")
    _require_plain_entrypoint_directory(recovery)
    _require_plain_entrypoint_directory(updates)
    _require_plain_entrypoint_directory(install)
    canonical_install = install.resolve(strict=True)
    if canonical_install != install:
        raise ValueError("noncanonical_recovery_install")
    return canonical_install


def validate_complete_update_command(
    executable: Path,
    arguments: Sequence[str],
) -> ValidatedCompleteUpdate:
    if any(type(argument) is not str for argument in arguments):
        raise ValueError("invalid_complete_update_arguments")
    if len(arguments) != COMMAND_ARITIES[EntryMode.COMPLETE_UPDATE]:
        raise ValueError("invalid_complete_update_arguments")
    install = resolve_recovery_install_root(
        executable, "dh_update_runner.exe"
    )
    _require_plain_entrypoint_file(executable)
    transaction_id = parse_transaction_id(arguments[0])
    pid, creation_token = validate_cli_process_identity_text(
        arguments[1], arguments[2]
    )
    paths = TransactionPaths.for_install(install, transaction_id)
    _require_plain_entrypoint_file(paths.active)
    active = read_active_transaction(paths.active)
    journal_path = resolve_active_journal(paths.updates_root, active)
    _require_plain_entrypoint_file(journal_path)
    journal = read_journal(journal_path)
    if (
        active.transaction_id != transaction_id
        or journal_path != paths.journal
        or journal.transaction_id != transaction_id
        or journal.phase is not JournalPhase.PREPARED
        or journal.initiator is not UpdateInitiator.BROWSER
        or journal.initiating_process is not None
    ):
        raise ValueError("invalid_complete_update_authority")
    identity = InitiatingProcessIdentity(pid, creation_token)
    return ValidatedCompleteUpdate(install, transaction_id, identity)


def resolve_active_command(
    install_root: Path,
) -> ValidatedRecoveryCommand:
    if not isinstance(install_root, Path) or not install_root.is_absolute():
        raise ValueError("invalid_active_recovery")
    install = install_root.resolve(strict=True)
    if install != install_root:
        raise ValueError("invalid_active_recovery")
    updates = install / "updates"
    _require_plain_entrypoint_file(updates / "active.json")
    active = read_active_transaction(updates / "active.json")
    transaction_id = parse_transaction_id(active.transaction_id)
    journal_path = resolve_active_journal(updates, active)
    _require_plain_entrypoint_file(journal_path)
    paths = TransactionPaths.for_install(install, transaction_id)
    journal = read_journal(journal_path)
    if (
        journal_path != paths.journal
        or journal.transaction_id != transaction_id
    ):
        raise ValueError("invalid_active_recovery")
    return ValidatedRecoveryCommand(install, transaction_id, journal_path)


def resolve_journal_command(
    journal_path: Path,
) -> ValidatedRecoveryCommand:
    if (
        not isinstance(journal_path, Path)
        or not journal_path.is_absolute()
        or ".." in journal_path.parts
    ):
        raise ValueError("invalid_recovery_journal")
    resolved = journal_path.resolve(strict=True)
    if resolved != journal_path:
        raise ValueError("noncanonical_recovery_journal")
    _require_plain_entrypoint_file(resolved)
    transaction_root = resolved.parent
    transactions = transaction_root.parent
    updates = transactions.parent
    install = updates.parent
    transaction_id = parse_transaction_id(transaction_root.name)
    paths = TransactionPaths.for_install(install, transaction_id)
    if (
        resolved != paths.journal
        or transactions != paths.transactions_root
        or read_journal(resolved).transaction_id != transaction_id
    ):
        raise ValueError("invalid_recovery_journal")
    return ValidatedRecoveryCommand(install, transaction_id, resolved)
```

`_require_plain_entrypoint_file` is also applied to `active.json` and every
resolved journal immediately before Plan B strict readers; fixed-chain parent
directories use the plain-directory guard. Plan B parsers provide schema and
containment checks, while Plan C prevents reparse/file-type substitution before
factory construction.

On case-insensitive Windows, compare canonical `Path` objects after resolution; tests use the actual platform path semantics and injected temporary roots, not string prefix checks. `validate_complete_update_command`, `resolve_active_command`, and `resolve_journal_command` import no controller/platform factory and perform no mutation; they use only Plan B strict readers/path resolvers. Their successful facts are revalidated by the controller after construction to close TOCTOU, but malformed state present at dispatch cannot reach that factory. Thus COMPLETE_UPDATE validates both argv identity and the requested transaction's canonical active/journal authority before controller construction; RECOVER_ACTIVE validates the active record's ID/path containment before controller construction.

`validate_complete_update_command` validates runner chain first, then raw
transaction/identity text, then active/journal authority, and only then
constructs `InitiatingProcessIdentity`. A wrong executable therefore cannot
construct a domain identity.

- [ ] **Step 5: Implement the full dispatch function**

Production dependencies are constructed by exactly one function:

```python
def production_early_mode_dependencies() -> EarlyModeDependencies:
    return EarlyModeDependencies(
        input_stream=sys.stdin.buffer,
        output_stream=sys.stdout.buffer,
        error_stream=sys.stderr.buffer,
        registry_factory=WindowsRegistryBackend,
        recovery_factory=create_production_recovery_controller,
        default_install_root=lambda: (
            Path(os.environ["LOCALAPPDATA"]) / "DynamicsHelper"
        ).resolve(),
        install_package=lambda _package, _install: EXIT_INSTALLER_UNAVAILABLE,
        status_server=serve_status_host,
    )
```

`production_early_mode_dependencies` is itself the only `EarlyModeDependencies`
constructor call in production. Static AST tests enforce this; test factories
are confined to test modules.

This function constructs only the dependency container. Its fields are
pre-existing streams, class/function references, and lambdas; invoking it does
not instantiate registry/controller/process adapters or read `LOCALAPPDATA`.
Those occur only when the validated branch calls the corresponding field.

Define the no-op hooks, exit projection, and fixed stderr completely:

```python
def _ignore() -> None:
    return None


def _ignore_phase(_phase: JournalPhase) -> None:
    return None


def _ignore_identity(_identity: InitiatingProcessIdentity) -> None:
    return None


def _ignore_operation(_operation: str) -> None:
    return None


def _write_fixed_error(stream: BinaryIO, payload: bytes) -> None:
    try:
        stream.write(payload)
        stream.flush()
    except Exception:
        return


def _journal_exit(journal: UpdateJournal) -> int:
    if type(journal) is not UpdateJournal:
        raise TypeError("invalid journal result")
    if journal.phase is JournalPhase.COMMITTED:
        return EXIT_SUCCESS
    if journal.phase is JournalPhase.ROLLED_BACK:
        return EXIT_ROLLED_BACK
    return EXIT_RECOVERY_REQUIRED


```

Fixed error writing is best-effort so a closed stderr cannot turn exit `2|50`
into another exception; tests inject write/flush failure and assert the numeric
exit remains fixed.

Implement the dispatcher around one validated invocation. `_write_fixed_error`
writes/flushes trusted ASCII literals only. Normal main launch does not inspect
active state in Plan C; after complete entrypoint/Chrome argv validation it
returns `None` so existing Host startup continues. Plan D may call
`launch_active_recovery` from its separately tested startup seam but preserves
this result when no interception applies:

```python
def dispatch_early_mode(
    executable: str,
    argv: Sequence[str],
    *,
    source_runtime: bool,
    dependencies_factory: Callable[[], EarlyModeDependencies] | None = None,
) -> int | None:
    deps: EarlyModeDependencies | None = None
    try:
        if (
            type(executable) is not str
            or not executable
            or type(source_runtime) is not bool
        ):
            _write_fixed_error(
                sys.stderr.buffer, INVALID_EARLY_INVOCATION
            )
            return EXIT_INVALID_ARGUMENTS
        if any(type(argument) is not str for argument in argv):
            _write_fixed_error(
                sys.stderr.buffer, INVALID_EARLY_INVOCATION
            )
            return EXIT_INVALID_ARGUMENTS
        entrypoint = Path(executable)
        if "--update-probe" in argv:
            try:
                probe = validate_probe_invocation(
                    entrypoint, argv, source_runtime=source_runtime
                )
                probe_argv = (
                    str(probe.entrypoint),
                    "--update-probe",
                    str(probe.manifest_path),
                )
            except EarlyInvocationError:
                absolute_entrypoint = entrypoint.absolute()
                if not absolute_entrypoint.is_absolute():
                    absolute_entrypoint = Path.cwd() / absolute_entrypoint
                probe_argv = (
                    str(absolute_entrypoint),
                    "--update-probe",
                )
            probe_exit = dispatch_early_cli(probe_argv)
            if probe_exit == 0:
                return EXIT_SUCCESS
            if probe_exit == 1:
                return EXIT_PROBE_FAILED
            return EXIT_INVALID_ARGUMENTS

        if any(
            type(argument) is str
            and argument.casefold() == "--update-probe"
            and argument != "--update-probe"
            for argument in argv
        ):
            raise EarlyInvocationError()

        invocation = validate_early_invocation(
            entrypoint, argv, source_runtime=source_runtime
        )
        selection = invocation.selection
        if selection.mode is EntryMode.MAIN_HOST:
            assert isinstance(invocation.payload, ValidatedMainHost)
            return None
        # This is the only production dependency-construction point. It runs
        # after every side-effecting mode's complete validator.
        deps = (
            dependencies_factory()
            if dependencies_factory is not None
            else production_early_mode_dependencies()
        )
        if not isinstance(deps, EarlyModeDependencies):
            raise TypeError("invalid early dependencies")

        if selection.mode is EntryMode.STATUS_HOST:
            command = invocation.payload
            assert isinstance(command, ValidatedStatusHost)
            return deps.status_server(
                deps.input_stream,
                deps.output_stream,
                command.install_root,
            )

        if selection.mode is EntryMode.REGISTER:
            command = invocation.payload
            assert isinstance(command, ValidatedRegistration)
            register_main_host(
                command.host_root,
                deps.registry_factory(),
                command.runtime,
            )
            return EXIT_SUCCESS

        if selection.mode is EntryMode.INSTALL_PACKAGE:
            command = invocation.payload
            assert isinstance(command, ValidatedInstallPackage)
            return deps.install_package(
                command.package_root,
                deps.default_install_root(),
            )

        if selection.mode is EntryMode.RECOVER_UPDATE:
            command = invocation.payload
            assert isinstance(command, ValidatedRecoveryCommand)
            return _journal_exit(
                deps.recovery_factory(command.install_root).recover_journal(
                    command.journal_path
                )
            )

        if selection.mode in (EntryMode.COMPLETE_UPDATE, EntryMode.RECOVER_ACTIVE):
            command = invocation.payload
            assert isinstance(
                command,
                (ValidatedCompleteUpdate, ValidatedRecoveryCommand),
            )
            controller = deps.recovery_factory(command.install_root)
            if selection.mode is EntryMode.RECOVER_ACTIVE:
                assert isinstance(command, ValidatedRecoveryCommand)
                return _journal_exit(controller.recover_active())
            assert isinstance(command, ValidatedCompleteUpdate)
            return _journal_exit(
                controller.run_complete_update(
                    command.transaction_id,
                    command.process_identity,
                )
            )

        return EXIT_INVALID_ARGUMENTS
    except UpdateAlreadyInProgress:
        # This can occur only after successful validation and dependency use.
        return EXIT_ALREADY_IN_PROGRESS
    except EarlyInvocationError:
        _write_fixed_error(
            sys.stderr.buffer, INVALID_EARLY_INVOCATION
        )
        return EXIT_INVALID_ARGUMENTS
    except Exception:
        stream = (
            deps.error_stream
            if isinstance(deps, EarlyModeDependencies)
            else sys.stderr.buffer
        )
        _write_fixed_error(stream, b"early_mode_failed\n")
        return EXIT_INTERNAL_FAILURE
```

Do not catch `BaseException`; interruption/crash injection propagates through
recovery so RunOnce policy executes. Production dependency construction
failure returns fixed `50` without exception text. `validate_early_invocation`
finishes the complete role/argv/identity/path/authority contract before the
first dependency expression. Probe performs role classification first, then
only Plan A's side-effect-free helper; wrong role receives the fixed malformed
tuple, so probe code cannot run.

Mismatch output always uses process stderr because no dependency object may
exist. After successful validation/construction, fixed internal failure may use
the injected dependency `error_stream`; tests assert both paths and no dynamic
text.

- [ ] **Step 6: Put dispatch first and reuse framing**

The first executable statements in `dh_native_host.py` become exactly:

```python
import sys
from pathlib import Path

from update_entrypoint import dispatch_early_mode  # noqa: E402

_source_runtime = not bool(getattr(sys, "frozen", False))
_early_entrypoint = (
    Path(sys.executable).resolve(strict=True)
    if not _source_runtime
    else Path(__file__).resolve(strict=True)
)
_early_exit = (
    dispatch_early_mode(
        str(_early_entrypoint),
        sys.argv[1:],
        source_runtime=_source_runtime,
    )
    if __name__ == "__main__"
    else None
)
if _early_exit is not None:
    raise SystemExit(_early_exit)
```

No other import or side effect precedes this block. `pathlib` is standard
library and its import has no filesystem side effect. The `__name__` guard is
mandatory. Source execution identifies `dh_native_host.py`, never
`python.exe`; `host/launch_host.bat` provides the source-development exception,
including Chrome argv and source `--register`. Frozen execution identifies the actual copied executable, so the
same bundle can be classified as production main, detached runner, or status
Host by exact basename/chain. Remove Plan A's separate top-level dispatch;
`update_entrypoint` delegates probe mode. Remove inline registration and reuse
Task 2. Preserve Native framing, input thread, `NATIVE_STDOUT`, progress, and
legacy update behavior; do not add Plan D Native action branches.

Resolving `_early_entrypoint` is the only pre-dispatch filesystem operation and
constructs no dependency object; failure stops before normal Host startup. All
profile/config/log/registry/process work remains after dispatch.

- [ ] **Step 7: Add exact NativeHost response/framing integration tests**

Append exact class `NativeHostFramingIntegrationTests` to `host/test_native_messaging.py`. It exercises the real `NativeHost._read_stdin_loop`, `NativeHost.process_message`, and `NativeHost.send_message` methods after Task 8 has delegated both framing directions to `native_messaging`; it uses `NativeHost.__new__` only to avoid constructor/SDK/filesystem side effects:

```python
class NativeHostFramingIntegrationTests(unittest.IsolatedAsyncioTestCase):
    def make_host(self, input_bytes: bytes = b"") -> NativeHost:
        host = NativeHost.__new__(NativeHost)
        host.input_queue = asyncio.Queue()
        host.current_request_id = None
        host.loop = asyncio.get_running_loop()
        host.running = True
        host.send_progress = lambda _message: None
        host._native_input_stream = io.BytesIO(input_bytes)
        host._native_output_stream = FlushBytesIO()
        return host

    async def test_native_host_ping_response_uses_little_endian_frame(self):
        host = self.make_host()
        await host.process_message({"action": "ping", "requestId": "host-r1"})
        raw = host._native_output_stream.getvalue()
        self.assertEqual(struct.unpack("<I", raw[:4])[0], len(raw[4:]))
        self.assertEqual(read_native_message(io.BytesIO(raw)), {
            "requestId": "host-r1",
            "status": "success",
            "data": "pong",
        })
        self.assertEqual(host._native_output_stream.flush_count, 1)

    async def test_little_endian_peer_ping_round_trips_through_native_host(self):
        peer = io.BytesIO()
        write_message(peer, {"action": "ping", "requestId": "peer-r1"})
        host = self.make_host(peer.getvalue())
        host._read_stdin_loop()
        request = await asyncio.wait_for(host.input_queue.get(), timeout=1.0)
        self.assertEqual(request, {"action": "ping", "requestId": "peer-r1"})
        await host.process_message(request)
        self.assertEqual(read_native_message(io.BytesIO(host._native_output_stream.getvalue())), {
            "requestId": "peer-r1",
            "status": "success",
            "data": "pong",
        })

    async def test_main_host_accepts_analyze_payload_larger_than_one_mib(self):
        message = {
            "action": "analyze_error",
            "requestId": "large-analyze",
            "payload": {"prompt": "x" * (MAX_MESSAGE_BYTES + 1)},
        }
        payload = json.dumps(
            message,
            ensure_ascii=True,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")
        frame = struct.pack("<I", len(payload)) + payload
        host = self.make_host(frame)

        host._read_stdin_loop()

        request = await asyncio.wait_for(host.input_queue.get(), timeout=1.0)
        self.assertEqual(request, message)
```

At the top of the test module import `asyncio` and `NativeHost` from `host.dh_native_host`; retain Task 1's `json`, `MAX_MESSAGE_BYTES`, `read_native_message`, and `write_message` imports. The `__name__` guard above makes the Host import ignore unittest argv. The complete compilable method bodies below replace the corresponding manual framing blocks; integrate them into `NativeHost` with the existing annotations/signatures and retain its existing logging/error wrappers:

```python
def _read_stdin_loop(self: NativeHost) -> None:
    while self.running:
        input_stream = getattr(self, "_native_input_stream", sys.stdin.buffer)
        message = read_native_message(input_stream, max_payload_bytes=None)
        if message is None:
            logger.info("Stdin closed. Stopping.")
            self.running = False
            self.loop.call_soon_threadsafe(self.input_queue.put_nowait, None)
            break
        self.loop.call_soon_threadsafe(self.input_queue.put_nowait, message)


def send_message(self: NativeHost, message_content: dict[str, object]) -> None:
    output_stream = getattr(self, "_native_output_stream", NATIVE_STDOUT)
    write_message(output_stream, message_content)
```

The optional instance streams are an injected binary-I/O seam; production instances do not set them and therefore retain `sys.stdin.buffer`/`NATIVE_STDOUT`. The explicit `None` preserves the main Host's existing inbound behavior and prevents the shared codec from adding a `1 MiB` Analyze cap. On framing/JSON failure, `_read_stdin_loop` retains the existing stop/error behavior. `send_message` continues to call the unchanged writer.

Run exactly these seven selectors in one process:

```powershell
$framingTests = @(
  "host.test_native_messaging.NativeMessagingTests.test_little_endian_writer_round_trips_through_little_endian_reader",
  "host.test_native_messaging.NativeMessagingTests.test_reader_accepts_a_little_endian_peer_frame",
  "host.test_native_messaging.NativeMessagingTests.test_default_reader_accepts_analyze_payload_larger_than_one_mib",
  "host.test_native_messaging.NativeHostFramingIntegrationTests.test_native_host_ping_response_uses_little_endian_frame",
  "host.test_native_messaging.NativeHostFramingIntegrationTests.test_little_endian_peer_ping_round_trips_through_native_host",
  "host.test_native_messaging.NativeHostFramingIntegrationTests.test_main_host_accepts_analyze_payload_larger_than_one_mib",
  "host.test_update_status_host.StatusProtocolTests.test_rejects_more_than_64_kib_before_reading_body"
)
$framingArgs = @("-m","unittest") + $framingTests + @("-v")
$framingOutput = Invoke-IsolatedPython -PythonArgs $framingArgs 2>&1
$framingOutput
$framingText = $framingOutput -join [Environment]::NewLine
if ($framingText -notmatch "Ran 7 tests" -or $framingText -notmatch "(?m)^OK\r?$") {
    throw "Native framing/Host integration gate did not run exactly 7 passing tests."
}
```

Expected: exit 0, all seven fully qualified tests report `ok`, summary is exactly `Ran 7 tests`, and final status is `OK`. A zero-test result or a module-only script such as `host.test_analyze_flow` is a hard failure. The first two tests prove independent writer/reader little-endian framing, the third proves the codec default has no new `1 MiB` inbound cap, the next two prove `NativeHost` request ingestion and ping response integration use that framing, the sixth proves the real main Host loop preserves >`1 MiB` Analyze-like ingestion, and the seventh proves the status Host rejects >`64 KiB` from the prefix before requesting the body.

- [ ] **Step 8: Add isolated early-import/process tests and run GREEN**

`EarlyDispatchIsolationTests` starts fresh processes for every matrix row and
wrong-role/runtime-bit cross-product: source/frozen register, package install, probe,
complete, recover-active, recover-update, status, source/frozen normal main.
Its helper creates all six environment directories before `subprocess.run`,
poisons SDK/config/auth/logging modules, and asserts special modes exit without
`NativeHost`, profile, or log creation. It records every production and inner
factory independently. Normal main cases call `dispatch_early_mode` from the
minimal early tree and prove `None`, including Chrome `--parent-window=0` and a
startable frozen historical Host with missing/partial metadata. That process
then reaches the real normal action path and `verify_installation` returns exact
packaged/failed `installation_integrity_failed`; it must not emit
`invalid_early_invocation`. A separate AST assertion proves
`dh_native_host.py` chooses `__file__` in source, `sys.executable` only when
frozen, and consumes the result before normal imports.

Add exact fresh-process malformed-probe tests using the copied Plan A early module set. Capture raw bytes, not parsed JSON, and assert every case writes exactly the same Plan A canonical bytes and creates no profile/config/log marker:

```python
PROBE_FAILURE_JSON = b'{"error_code":"package_probe_failed","status":"error"}\n'


def test_malformed_probe_missing_arg_uses_plan_a_canonical_failure(self):
    self.assert_malformed_probe(["--update-probe"])

def test_malformed_probe_extra_arg_uses_plan_a_canonical_failure(self):
    self.assert_malformed_probe(
        ["--update-probe", str(self.manifest), "extra"]
    )

def test_malformed_probe_bad_path_uses_plan_a_canonical_failure(self):
    cases = (
        ("relative", ["--update-probe", "update-manifest.json"]),
        ("traversal", ["--update-probe", str(self.root / "x" / ".." / "update-manifest.json")]),
    )
    for label, argv in cases:
        with self.subTest(label=label):
            self.assert_malformed_probe(argv)

def assert_malformed_probe(self, argv):
    completed, touched = self.run_host_with_access_audit(argv)
    self.assertEqual(completed.returncode, EXIT_INVALID_ARGUMENTS)
    self.assertEqual(completed.stdout, PROBE_FAILURE_JSON)
    self.assertEqual(completed.stderr, b"")
    self.assertEqual(touched.sdk_imports, [])
    self.assertEqual(touched.config_reads, [])
    self.assertEqual(touched.log_opens, [])
    self.assertEqual(touched.dependency_factories, [])
    self.assertFalse((self.localappdata / "DynamicsHelper").exists())
```

The subprocess helper copies the complete standard-library-only early import closure for `dh_native_host.py`, `update_entrypoint.py`, and Plan A's probe modules. Inject a tiny import finder/access-audit module ahead of that tree that records then raises if the Copilot SDK, legacy updater, config/auth loader, or logging setup is imported, or if known config/log paths are opened. Plan C recovery/platform/registration modules may be imported only if their import remains side-effect-free; patch `production_early_mode_dependencies` in the copied entrypoint to record then raise if called, which is the required construction boundary. Exact missing, extra, relative, and lexical-parent string-path cases must still exit `2`: Plan C rejects them first, then calls Plan A only with the fixed malformed tuple for canonical serialization. Add a malformed package validation case separately: valid invocation reaches Plan A validation, emits the same exact bytes, and exits `EXIT_PROBE_FAILED` (`40` after Plan A exit `1`). Assert one newline, one JSON object, no stderr, no `%LOCALAPPDATA%/DynamicsHelper`, no startup/emergency log, no config/auth read/open, and no dependency-factory call for every case. The three named missing/extra/bad-path tests remain separate exact selectors.

Add a wrong-entrypoint probe process test for source, runner, and status copies.
Patch/poison `install_integrity.run_update_probe`; each exits `2` with exact
`PROBE_FAILURE_JSON`, empty stderr, zero probe invocation, and zero factories.
For every non-probe mismatch, assert exact fixed stderr
`invalid_early_invocation\n`, empty stdout, and zero calls to all factories.

Plan A `host/test_early_cli.py` still needs pure source-process coverage for
`dispatch_early_cli` itself. Modify only its copied test shim: the copied
`dh_native_host.py` imports/calls `dispatch_early_cli(sys.argv)` directly, as
Plan A originally specified, rather than copying the production Plan C
entrypoint. This tests Plan A serializer/probe behavior without granting source
`dh_native_host.py --update-probe` in the integrated product. Add a separate
integrated production-host test proving the real source entrypoint rejects
probe with exact canonical failure and zero `run_update_probe`. Do not modify
Plan A production modules or expected JSON.

Run:

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_update_entrypoint",
  "host.test_early_update_dispatch",
  "host.test_early_cli",
  "host.test_native_messaging.NativeMessagingTests.test_little_endian_writer_round_trips_through_little_endian_reader",
  "host.test_native_messaging.NativeMessagingTests.test_reader_accepts_a_little_endian_peer_frame",
  "host.test_native_messaging.NativeMessagingTests.test_default_reader_accepts_analyze_payload_larger_than_one_mib",
  "host.test_native_messaging.NativeHostFramingIntegrationTests.test_native_host_ping_response_uses_little_endian_frame",
  "host.test_native_messaging.NativeHostFramingIntegrationTests.test_little_endian_peer_ping_round_trips_through_native_host",
  "host.test_native_messaging.NativeHostFramingIntegrationTests.test_main_host_accepts_analyze_payload_larger_than_one_mib",
  "host.test_update_status_host.StatusProtocolTests.test_rejects_more_than_64_kib_before_reading_body",
  "host.test_prompt_sources",
  "-v"
)
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import ast,pathlib; t=ast.parse(pathlib.Path('host/dh_native_host.py').read_text(encoding='utf-8')); names=[(type(n).__name__,getattr(n,'module',None)) for n in t.body[:3]]; assert names==[('Import',None),('ImportFrom','pathlib'),('ImportFrom','update_entrypoint')]; assigns=[n for n in t.body[:7] if isinstance(n,ast.Assign)]; assert len(assigns)==3; assert isinstance(assigns[0].value,ast.UnaryOp); assert isinstance(assigns[1].value,ast.IfExp); assert isinstance(assigns[2].value,ast.IfExp); assert isinstance(t.body[6],ast.If)"
)
```

Expected: exit 0 with a nonzero discovered test count; the separate
seven-selector gate reports exactly `Ran 7 tests` and `OK`. Mutate source
entrypoint back to `sys.executable`, fuzzy basename classification, each matrix
role permission, probe role validation, and dependency construction before
`validate_early_invocation`; the corresponding matrix/no-factory/process test
must fail. Mutate Plan A delegation away for malformed probe and require the
exact raw-output tests to fail. Restore each and rerun GREEN.

Also mutate `classify_entrypoint` to require either metadata file and require
both historical normal-main tests to fail; restore and rerun GREEN.

- [ ] **Step 9: Commit**

```powershell
git add host/update_entrypoint.py host/test_update_entrypoint.py host/test_early_update_dispatch.py host/test_early_cli.py host/dh_native_host.py host/test_native_messaging.py
git commit -m "feat(update): dispatch recovery before host startup"
```

### Task 9: Module-Form PyInstaller Inclusion And Frozen Staged-Probe Gate

**Files:**
- Modify: `release_helper.py`
- Modify: `host/test_release_helper.py`
- Modify: `host/test_update_recovery.py`

**Interfaces:**
- Preserves Plan A `stage_release`/`create_zip` and invokes PyInstaller only as a module of the release venv Python.
- Produces `VENV_PYTHON`, `PYINSTALLER_VERSION`, `PYINSTALLER_HIDDEN_IMPORTS`, `pyinstaller_build_command() -> list[str]`, and, only when the approval-gated toolchain exists, a complete frozen onedir containing all Plan A-C modules that passes the real staged-target `--update-probe` gate.

No checked spec is created. CLI PyInstaller may generate root `dh_native_host.spec`; repository `*.spec` ignore handles it, and release output remains `dist/dh_native_host`.

- [ ] **Step 1: Write RED command, ignored-spec, and unchanged-stage tests**

Add exact class `PlanCPackagingTests` to `host/test_release_helper.py`:

```python
PLAN_C_EARLY_MODULES = (
    "early_cli",
    "install_integrity",
    "native_messaging",
    "native_registration",
    "package_archive",
    "package_manifest",
    "product_info",
    "update_engine",
    "update_entrypoint",
    "update_journal",
    "update_mutex",
    "update_ownership",
    "update_platform",
    "update_recovery",
    "update_status_host",
)


class PlanCPackagingTests(unittest.TestCase):
    def test_source_build_argv_uses_venv_python_module_and_every_hidden_import(self):
        with mock.patch("release_helper.subprocess.run") as run:
            command = release_helper.pyinstaller_build_command()
        run.assert_not_called()
        self.assertEqual(Path(command[0]).resolve(), release_helper.VENV_PYTHON)
        self.assertEqual(command[1:3], ["-m", "PyInstaller"])
        self.assertEqual(command[3:8], [
            "--onedir", "--clean", "-y", "--name", "dh_native_host",
        ])
        self.assertIn("--paths", command)
        self.assertEqual(
            Path(command[command.index("--paths") + 1]).resolve(),
            release_helper.HOST_DIR.resolve(),
        )
        actual_hidden = tuple(
            command[index + 1]
            for index, value in enumerate(command)
            if value == "--hidden-import"
        )
        self.assertEqual(actual_hidden, PLAN_C_EARLY_MODULES)
        self.assertEqual(
            Path(command[-1]).resolve(),
            (release_helper.HOST_DIR / "dh_native_host.py").resolve(),
        )
        self.assertFalse(any(argument.endswith(".spec") for argument in command))

    def test_build_host_invokes_exact_cli_command(self):
        with mock.patch("release_helper.subprocess.run") as run:
            run.return_value.stdout = "6.18.0\n"
            release_helper.build_host()
        self.assertEqual(run.call_args_list[0].args[0], [
            str(release_helper.VENV_PYTHON), "-m", "PyInstaller", "--version"
        ])
        self.assertTrue(run.call_args_list[0].kwargs["capture_output"])
        self.assertTrue(run.call_args_list[0].kwargs["text"])
        self.assertEqual(
            run.call_args_list[1].args[0],
            release_helper.pyinstaller_build_command(),
        )
        self.assertEqual(
            Path(run.call_args_list[1].kwargs["cwd"]).resolve(),
            release_helper.ROOT_DIR.resolve(),
        )

    def test_build_host_never_provisions_or_uses_a_bare_pyinstaller(self):
        source = inspect.getsource(release_helper.build_host)
        self.assertNotIn("ensurepip", source)
        self.assertNotRegex(source, r"(?i)(?<!PyInstaller)\\bpip\\b")
        self.assertNotIn("pyinstaller.exe", source.casefold())

    def test_no_plan_c_data_is_implicitly_bundled_into_onedir(self):
        command = release_helper.pyinstaller_build_command()
        self.assertNotIn("--add-data", command)
        self.assertNotIn("--collect-data", command)

    def test_normal_plan_a_release_stage_remains_manifest_valid(self):
        stage = self.make_plan_a_release_stage()
        self.assertFalse((stage / "updates").exists())
        self.assertEqual(
            validate_staged_package(stage).manifest.entries,
            load_update_manifest(stage / "update-manifest.json").entries,
        )
```

`make_plan_a_release_stage` uses Plan A's existing synthetic source fixture and public `stage_release`, not repository `dist`. Add `import inspect` to this test module. Add a test that `.gitignore` contains a line exactly `*.spec`, and that `git check-ignore -q dh_native_host.spec` exits 0 without creating that file. Add a command-order test requiring hidden imports appear before the final script path.

Add exact `FrozenStagedProbeIntegrationTests` to `host/test_update_recovery.py`. It is skipped during ordinary source/unit discovery unless `DH_PLAN_C_FROZEN_ONEDIR` names an absolute existing root; Task 9 Step 8 treats a skip as failure and is the only gate allowed to set that variable. The test copies that complete onedir into a synthetic Plan A release source, adds fixed synthetic `host/config.json`, `host/system_prompt.md`, `host/register.py`, package-only installer files, and a minimal Extension whose `manifest.json` has the exact `VERSION`/Chrome projection, then calls public `release_helper.stage_release` and `validate_staged_package`. Using a fresh install root, a real Plan B `UpdateEngine.create_prepared(..., expected_version=VERSION, prior_version=None, initiator=INSTALLER)`, fake mutation mutex/hooks, a recording subclass of `SubprocessProbeAdapter` that still invokes the real process, and `TemporaryStagedProbeWorkspace`, it invokes only `controller.preflight_prepared_target(TX_ID)`.

The named test is exact:

```python
class FrozenStagedProbeIntegrationTests(unittest.TestCase):
    def test_complete_built_runtime_starts_and_matches_target_without_live_mutation(self):
        onedir_text = os.environ.get("DH_PLAN_C_FROZEN_ONEDIR")
        if not onedir_text:
            self.skipTest("DH_PLAN_C_FROZEN_ONEDIR not set")
        onedir = Path(onedir_text)
        if not onedir.is_absolute():
            self.fail("DH_PLAN_C_FROZEN_ONEDIR must be absolute")
        inventory_onedir(onedir.resolve(strict=True))
        package = self.make_plan_a_package_from_built_onedir(onedir)
        fixture = self.make_real_prepared_installer_fixture(package)
        before = snapshot_tree(fixture.install_root)

        result = fixture.controller.preflight_prepared_target(TX_ID)

        self.assertEqual(len(fixture.probe.calls), 1)
        self.assertEqual(result, UpdateProbeResult(
            status="success",
            host_version=VERSION,
            extension_version=VERSION,
            capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        ))
        self.assertEqual(snapshot_tree(fixture.install_root), before)
        self.assertEqual(
            read_journal(fixture.paths.journal).phase,
            JournalPhase.PREPARED,
        )
        self.assertEqual(fixture.run_once.write_calls, [])
        self.assertEqual(fixture.engine_calls.activate_prepared, [])
        self.assertFalse(fixture.workspace.last_root.exists())
        self.assertEqual(fixture.registry.events, [])
        self.assertEqual(
            fixture.probe.calls[0].cwd,
            fixture.probe.calls[0].executable.parent,
        )
        self.assertFalse(fixture.probe.calls[0].cwd.exists())
```

`make_plan_a_package_from_built_onedir` must use Plan A public release generation/validation, never hand-write metadata. `make_real_prepared_installer_fixture` must use Plan B's public `create_prepared`; only the process probe is real. The fixture provides a minimal pre-existing live source state acceptable to Plan B preparation; take the whole-install snapshot only after `create_prepared` has created the inert transaction/active records. Staged preflight creates its temporary view outside `install_root`, so every install-root byte and path must compare equal afterward and no registry call is permitted. The six isolated environment roots already exist before the test; snapshot their pre-existing contents, permit only the expected create-then-remove temp child during execution, then require exact pre-test contents and no SDK/config/log/profile marker afterward. Also assert the frozen subprocess cwd equals its temporary combined Host root. This gate therefore proves the full PyInstaller runtime starts, early dispatch wins before normal Host side effects, target Host/Extension metadata and capabilities match, and the live product/registration plus prepared transaction remain unchanged.

The no-data assertion is intentional and exact: Plan C adds Python modules only. Plan A's release stage continues to place `config.json`, `system_prompt.md`, and `register.py` as external manifest-owned files; bundling a second copy under `_internal` would change Plan A inventory and is forbidden. Third-party package data remains governed by existing PyInstaller hooks, not Plan C command flags.

- [ ] **Step 2: Run RED**

Run: `Invoke-IsolatedPython -PythonArgs @("-m","unittest","host.test_release_helper.PlanCPackagingTests.test_source_build_argv_uses_venv_python_module_and_every_hidden_import","-v") -ExpectFailure`

Expected: missing `PYINSTALLER_HIDDEN_IMPORTS`/`pyinstaller_build_command`.

- [ ] **Step 3: Extend the existing release-helper CLI command**

After Plan A's path bootstrap, add exact constants:

```python
VENV_PYTHON = (
    ROOT_DIR / "host" / "venv" / "Scripts" / "python.exe"
).resolve()
PYINSTALLER_VERSION = "6.18.0"
PYINSTALLER_HIDDEN_IMPORTS = (
    "early_cli",
    "install_integrity",
    "native_messaging",
    "native_registration",
    "package_archive",
    "package_manifest",
    "product_info",
    "update_engine",
    "update_entrypoint",
    "update_journal",
    "update_mutex",
    "update_ownership",
    "update_platform",
    "update_recovery",
    "update_status_host",
)


def pyinstaller_build_command() -> list[str]:
    command = [
        str(VENV_PYTHON),
        "-m",
        "PyInstaller",
        "--onedir",
        "--clean",
        "-y",
        "--name",
        "dh_native_host",
        "--paths",
        str(HOST_DIR.resolve()),
    ]
    for module in PYINSTALLER_HIDDEN_IMPORTS:
        command.extend(("--hidden-import", module))
    command.append(str((HOST_DIR / "dh_native_host.py").resolve()))
    return command
```

Replace `build_host()`'s executable-file check with an explicit `VENV_PYTHON.is_file()` check. Its first subprocess call is exactly `[str(VENV_PYTHON), "-m", "PyInstaller", "--version"]` with `check=True`, `capture_output=True`, and `text=True`; require `stdout.strip() == PYINSTALLER_VERSION`. A missing module, failed command, empty output, or any version other than `6.18.0` prints a fixed actionable error and exits nonzero without invoking pip. Only after that check, set `cmd = pyinstaller_build_command()` and run `subprocess.run(cmd, cwd=ROOT_DIR, check=True)`. Do not invoke a spec, bare/PATH `pyinstaller`, system Python, `ensurepip`, or pip from the release flow. Do not add or force-add a spec.

- [ ] **Step 4: Run unit GREEN and Plan A staging regressions**

Run:

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_release_helper.PlanCPackagingTests",
  "host.test_release_helper.TestReleaseStaging",
  "host.test_package_archive",
  "-v"
)
```

Expected: `OK` and no release ZIP created.

- [ ] **Step 5: Run the source-level argv/hidden-import gate without PyInstaller**

This gate is mandatory before the toolchain preflight and runs on the current environment even when both `PyInstaller` and `pip` modules are absent:

```powershell
$sourceBuildOutput = Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_release_helper.PlanCPackagingTests.test_source_build_argv_uses_venv_python_module_and_every_hidden_import",
  "-v"
) 2>&1
$sourceBuildOutput
$sourceBuildText = $sourceBuildOutput -join [Environment]::NewLine
if ($sourceBuildText -notmatch "Ran 1 test" -or $sourceBuildText -notmatch "(?m)^OK\r?$") {
    throw "Source build argv/hidden-import gate did not run exactly one passing test."
}
```

Expected: exact named test reports `ok`, summary is `Ran 1 test`, and final status is `OK`. The test calls only `pyinstaller_build_command()` under a mocked `subprocess.run`; it neither imports nor executes PyInstaller and does not provision anything.

- [ ] **Step 6: Preflight the frozen toolchain and encode the result**

Run this preflight after all Plan C modules exist. `Invoke-IsolatedPython` uses the exact executable `host/venv/Scripts/python.exe`, so the first command is exactly the required `host/venv/Scripts/python.exe -m PyInstaller --version` under the six-variable harness:

```powershell
$env:PLAN_C_FROZEN_GATE_STATUS = "BLOCKED"
$env:PLAN_C_FROZEN_GATE_REASON = "pyinstaller_preflight_not_run"
$pyinstallerReady = $false
try {
    $pyinstallerVersionOutput = @(
        Invoke-IsolatedPython -PythonArgs @("-m","PyInstaller","--version") 2>&1
    )
    $pyinstallerVersion = ($pyinstallerVersionOutput -join "`n").Trim()
    if ($pyinstallerVersion -ne "6.18.0") {
        $env:PLAN_C_FROZEN_GATE_REASON = "pyinstaller_version_mismatch:$pyinstallerVersion"
    } else {
        $pyinstallerReady = $true
        $env:PLAN_C_FROZEN_GATE_STATUS = "READY"
        $env:PLAN_C_FROZEN_GATE_REASON = "pyinstaller_6.18.0"
    }
} catch {
    $env:PLAN_C_FROZEN_GATE_REASON = "pyinstaller_module_missing_or_failed"
}

if (-not $pyinstallerReady) {
    try {
        $ensurepipOutput = @(
            Invoke-IsolatedPython -PythonArgs @("-m","ensurepip","--version") 2>&1
        )
        $env:PLAN_C_FROZEN_GATE_REASON += ";ensurepip_available:" + (
            ($ensurepipOutput -join "`n").Trim()
        )
    } catch {
        $env:PLAN_C_FROZEN_GATE_REASON += ";ensurepip_missing_or_failed"
    }
    "PLAN_C_FROZEN_GATE_STATUS=BLOCKED"
    "PLAN_C_FROZEN_GATE_REASON=$env:PLAN_C_FROZEN_GATE_REASON"
}
```

Current-environment baseline verified 2026-07-20: the PyInstaller command exits nonzero with `No module named PyInstaller`; `-m ensurepip --version` exits 0 and reports `pip 26.0.1`; `-m pip --version` is absent. Therefore the expected status before approval is exactly `PLAN_C_FROZEN_GATE_STATUS=BLOCKED`. Continue source implementation and source/unit gates, but do not run the frozen build, mark Plan C fully verified, or activate Plan D.

If PyInstaller is already available, `READY` permits Step 8. A bare `host/venv/Scripts/pyinstaller.exe` file, if present, is ignored as evidence; only the module command and exact version can produce `READY`.

- [ ] **Step 7: Provision only after separate explicit user approval**

This is a separate network/toolchain mutation, not part of preflight or `release_helper.py`. Do not execute either command until the user explicitly approves provisioning:

```powershell
# APPROVAL REQUIRED BEFORE EXECUTION.
Invoke-IsolatedPython -PythonArgs @("-m","ensurepip","--upgrade")
Invoke-IsolatedPython -PythonArgs @(
  "-m","pip","install","pyinstaller==6.18.0"
)
```

The pinned pip install may access the network. After approved provisioning, rerun Step 6 and require exact output `6.18.0` from `host/venv/Scripts/python.exe -m PyInstaller --version`; neither `pyinstaller.exe --version` nor file existence substitutes for this check. If approval is withheld or provisioning fails, leave the frozen gate and overall Plan C status `BLOCKED`.

- [ ] **Step 8: Run the complete frozen build/module/staged-probe gate only when preflight is READY**

When and only when `$env:PLAN_C_FROZEN_GATE_STATUS -eq "READY"`, invoke the existing release helper, not a second build path:

```powershell
if ($env:PLAN_C_FROZEN_GATE_STATUS -ne "READY") {
    throw "BLOCKED: frozen build requires approved PyInstaller 6.18.0 provisioning."
}
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import release_helper; release_helper.build_host()"
)
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "from pathlib import Path; from update_recovery import inventory_onedir; root=Path('dist/dh_native_host').resolve(strict=True); inventory=inventory_onedir(root); assert (root/'dh_native_host.exe').is_file(); assert inventory.internal_files; print(len(inventory.internal_files))"
)
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "from pathlib import Path; required=('early_cli','install_integrity','native_messaging','native_registration','package_archive','package_manifest','product_info','update_engine','update_entrypoint','update_journal','update_mutex','update_ownership','update_platform','update_recovery','update_status_host'); text=Path('build/dh_native_host/xref-dh_native_host.html').read_text(encoding='utf-8'); missing=[name for name in required if name not in text]; assert not missing, missing; print('Plan C module graph complete')"
)
$env:DH_PLAN_C_FROZEN_ONEDIR = (
    Resolve-Path "dist/dh_native_host"
).Path
try {
    $frozenProbeOutput = Invoke-IsolatedPython -PythonArgs @(
      "-m","unittest",
      "host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation",
      "-v"
    ) 2>&1
    $frozenProbeOutput
    $frozenProbeText = $frozenProbeOutput -join [Environment]::NewLine
    if (
        $frozenProbeText -notmatch "Ran 1 test" `
        -or $frozenProbeText -notmatch "(?m)^OK\r?$" `
        -or $frozenProbeText -match "skipped"
    ) {
        throw "Frozen staged-target probe did not run exactly one passing test."
    }
} finally {
    Remove-Item Env:DH_PLAN_C_FROZEN_ONEDIR -ErrorAction SilentlyContinue
}
git check-ignore -q -- dh_native_host.spec
if ($LASTEXITCODE -ne 0) { throw "Generated CLI spec is not ignored." }
$env:PLAN_C_FROZEN_GATE_STATUS = "PASS"
$env:PLAN_C_FROZEN_GATE_REASON = "pyinstaller_6.18.0_build_module_graph_and_staged_probe_passed"
```

Expected after approved provisioning: build exits 0; `dist/dh_native_host/dh_native_host.exe` and nonempty exact `_internal` pass `inventory_onedir`; xref prints `Plan C module graph complete`; the isolated integration selector reports exactly `Ran 1 test`/`OK` with no skip and executes only the frozen early `--update-probe` against the temporary combined target view; generated spec is ignored; status becomes `PASS`. Running this allowlisted, side-effect-free staged probe is required outside the VM. Do not execute normal Native Messaging, SDK, registration, update mutation, or recovery modes outside a disposable VM.

- [ ] **Step 9: Run hidden-import mutation and commit**

Remove `update_entrypoint` from `PYINSTALLER_HIDDEN_IMPORTS`; run `test_source_build_argv_uses_venv_python_module_and_every_hidden_import`, require nonzero, restore, and rerun GREEN. This mutation requires no PyInstaller installation.

```powershell
git add release_helper.py host/test_release_helper.py host/test_update_recovery.py
git commit -m "build(update): include detached recovery modules"
```

### Task 10: Documentation, Evidence, And Final Gates

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Create: `.superpowers/sdd/hardening-c-detached-recovery-report.md`

**Interfaces:**
- Produces exact Plan D handoff plus reproducible heads/signatures, RED/GREEN, mutation, build, and scope evidence.

- [ ] **Step 1: Run focused Plan C tests in one new isolated process**

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_native_messaging",
  "host.test_native_registration",
  "host.test_update_platform",
  "host.test_update_recovery",
  "host.test_update_status_host",
  "host.test_update_entrypoint",
  "host.test_early_update_dispatch",
  "host.test_release_helper",
  "-v"
)
```

Expected: `OK` with a nonzero observed test count; when PyInstaller is not provisioned, record the single expected `FrozenStagedProbeIntegrationTests` environment-gated skip separately and do not count it as frozen evidence. Any other skip fails the focused gate. Also rerun Task 8 Step 7's exact seven-selector framing gate and require exactly `Ran 7 tests` plus `OK`; a zero-test module is never evidence. The harness creates all six directories before this Python process starts.

- [ ] **Step 2: Run Plan A/B regressions in a second new isolated process**

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-m","unittest",
  "host.test_product_info",
  "host.test_package_manifest",
  "host.test_package_archive",
  "host.test_install_integrity",
  "host.test_early_cli",
  "host.test_host_integrity_actions",
  "host.test_update_journal",
  "host.test_update_ownership",
  "host.test_update_mutex",
  "host.test_update_engine_host",
  "host.test_update_engine_extension",
  "host.test_update_engine_rollback",
  "host.test_update_engine_resume",
  "-v"
)
```

Expected: `OK`; record observed totals. This is a different process and receives a different six-variable root.

- [ ] **Step 3: Run discovery and compile in separate fresh processes**

```powershell
Invoke-IsolatedPython -NoPythonPath -PythonArgs @(
  "-m","unittest","discover","host","-v"
)
Invoke-IsolatedPython -NoPythonPath -PythonArgs @(
  "-m","compileall","-q","-x","[\\/]venv[\\/]","host","release_helper.py"
)
```

Expected: discovery `OK`; compile exits 0 with no diagnostics. Discovery may contain only the one explicitly environment-gated frozen staged-probe skip when `DH_PLAN_C_FROZEN_ONEDIR` is unset; any other skip fails review. Discovery and compile each start with their own newly created six-variable root.

- [ ] **Step 4: Run Extension regressions/build in separate isolated processes**

```powershell
Invoke-IsolatedCommand `
  -FilePath "npm.cmd" `
  -ArgumentList @("run","test:run","--prefix","extension","--","--reporter=dot")
Invoke-IsolatedCommand `
  -FilePath "npm.cmd" `
  -ArgumentList @("run","build","--prefix","extension")
```

Expected: tests and production build exit 0. Each Node process also receives a fresh six-variable root; `extension/dist` remains ignored.

- [ ] **Step 5: Repeat source packaging and conditionally repeat the frozen gate**

Always repeat Task 9 Step 5 after all product commits and require the exact one-test source argv/hidden-import PASS. Then repeat Task 9 Step 6. If preflight remains `BLOCKED`, record the exact reason, skip commands that require PyInstaller, continue Steps 6-11, and do not represent Plan C as fully verified or activate Plan D. If preflight is `READY`, repeat Task 9 Step 8 in a fresh process, require `PASS`, then run:

```powershell
git status --short --ignored -- dh_native_host.spec build dist extension/dist
git ls-files --error-unmatch -- dh_native_host.spec
if ($LASTEXITCODE -eq 0) { throw "Generated spec must remain untracked." }
```

Expected when PyInstaller 6.18.0 is provisioned: build/module graph and exact one-test real frozen staged-target probe pass; generated spec/build/dist artifacts are ignored and untracked. Expected in the current unprovisioned environment: source packaging passes and frozen status remains `BLOCKED`, not `PASS`.

- [ ] **Step 6: Run exact interface, ownership, and stale-contract gates**

```powershell
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  @'
import inspect
from update_engine import UpdateEngine
from update_entrypoint import (
    COMMAND_ARITIES, COMMANDS, EarlyModeDependencies, EntryMode,
    EntrySelection,
    ExecutableRole, MODE_ROLES,
    ValidatedCompleteUpdate, ValidatedEarlyInvocation,
    ValidatedInstallPackage, ValidatedMainHost, ValidatedRecoveryCommand,
    ValidatedProbe, ValidatedRegistration, ValidatedStatusHost,
    classify_entrypoint,
    dispatch_early_mode,
    resolve_active_command, resolve_journal_command,
    validate_complete_update_command, validate_early_invocation,
    validate_probe_invocation,
)
from update_journal import InitiatingProcessIdentity, TransactionPaths, UpdateJournal
from update_platform import (
    ProcessAdapter, parse_probe_process_result,
    validate_cli_process_identity_text,
)
from update_recovery import (
    FinalizationCursor, FinalizationError, FinalizationFilesystem,
    FinalizationReceipt, FINALIZATION_CURSOR_STATES,
    RecoveryController, RecoveryDependencies, RecoveryDiagnostics,
    _replace_finalization_file,
    acknowledge_update_finalization, finalize_update_status,
    require_no_pending_finalization,
)
assert tuple(InitiatingProcessIdentity.__dataclass_fields__) == ('pid', 'creation_token')
assert 'recovery_root' not in TransactionPaths.__dataclass_fields__
assert 'original_failure_code' in UpdateJournal.__dataclass_fields__
assert tuple(EarlyModeDependencies.__dataclass_fields__) == ('input_stream', 'output_stream', 'error_stream', 'registry_factory', 'recovery_factory', 'default_install_root', 'install_package', 'status_server')
assert tuple(ValidatedCompleteUpdate.__dataclass_fields__) == ('install_root', 'transaction_id', 'process_identity')
assert tuple(EntrySelection.__dataclass_fields__) == ('mode', 'arguments')
assert tuple(ValidatedEarlyInvocation.__dataclass_fields__) == ('entrypoint', 'role', 'selection', 'payload')
assert tuple(ValidatedProbe.__dataclass_fields__) == ('entrypoint', 'manifest_path')
assert tuple(ValidatedMainHost.__dataclass_fields__) == ('launch',)
assert tuple(ValidatedStatusHost.__dataclass_fields__) == ('install_root', 'launch')
assert tuple(ValidatedRegistration.__dataclass_fields__) == ('host_root', 'runtime')
assert tuple(ValidatedInstallPackage.__dataclass_fields__) == ('package_root',)
assert tuple(ValidatedRecoveryCommand.__dataclass_fields__) == ('install_root', 'transaction_id', 'journal_path')
assert tuple(FinalizationReceipt.__dataclass_fields__) == ('transaction_id', 'outcome', 'terminal_version', 'state')
assert tuple(FinalizationCursor.__dataclass_fields__) == ('transaction_id', 'outcome', 'terminal_version', 'state')
assert FINALIZATION_CURSOR_STATES == frozenset({'reserved', 'receipt-ready'})
assert FinalizationError._ALLOWED == frozenset({
    'transaction_not_terminal', 'active_transaction_mismatch',
    'invalid_finalization_receipt', 'invalid_finalization_cursor',
    'invalid_finalization_acknowledgment', 'finalization_cleanup_failed',
    'finalization_cleanup_incomplete',
    'finalization_record_round_trip_failed',
    'finalization_ack_pending', 'finalization_not_current',
})
assert tuple(
    name for name, value in FinalizationFilesystem.__dict__.items()
    if callable(value) and not name.startswith('_')
) == ('atomic_write', 'read', 'exists', 'has_atomic_scratch', 'move_receipt_to_ack', 'remove_cursor', 'fsync_file', 'fsync_directory')
assert tuple(RecoveryDependencies.__dataclass_fields__) == ('process', 'probe_process', 'staged_probe_workspace', 'run_once', 'clock', 'mutex_factory', 'set_cwd', 'diagnostics')
assert RecoveryDependencies.__dataclass_fields__['diagnostics'].default_factory is RecoveryDiagnostics
assert tuple(RecoveryDiagnostics.__dataclass_fields__) == ('after_staged_probe_event', 'after_recovery_setup_event', 'after_live_phase', 'after_wait', 'after_probe', 'before_filesystem_operation', 'after_filesystem_operation', 'after_journal_transition')
assert tuple(inspect.signature(validate_complete_update_command).parameters) == ('executable', 'arguments')
assert tuple(inspect.signature(classify_entrypoint).parameters) == ('executable',)
assert tuple(inspect.signature(validate_probe_invocation).parameters) == ('executable', 'argv', 'source_runtime')
assert tuple(inspect.signature(validate_early_invocation).parameters) == ('executable', 'argv', 'source_runtime')
assert tuple(inspect.signature(resolve_active_command).parameters) == ('install_root',)
assert tuple(inspect.signature(resolve_journal_command).parameters) == ('journal_path',)
assert tuple(inspect.signature(RecoveryController.preflight_prepared_target).parameters) == ('self', 'transaction_id')
assert tuple(inspect.signature(RecoveryController.prepare_recovery_runtime).parameters) == ('self', 'transaction_id', 'runner_source', 'registry')
assert tuple(inspect.signature(UpdateEngine.activate_prepared).parameters) == ('self', 'transaction_id', 'process_identity')
assert tuple(inspect.signature(ProcessAdapter.launch_detached).parameters) == ('self', 'executable', 'args', 'cwd')
assert tuple(inspect.signature(parse_probe_process_result).parameters) == ('exit_code', 'stdout')
assert tuple(inspect.signature(validate_cli_process_identity_text).parameters) == ('pid_text', 'creation_token')
assert tuple(inspect.signature(dispatch_early_mode).parameters) == ('executable', 'argv', 'source_runtime', 'dependencies_factory')
assert tuple(inspect.signature(finalize_update_status).parameters) == ('install_root', 'transaction_id', 'registry', 'engine_factory', 'filesystem', 'mutex_factory')
assert tuple(inspect.signature(acknowledge_update_finalization).parameters) == ('install_root', 'transaction_id', 'filesystem', 'mutex_factory')
assert tuple(inspect.signature(require_no_pending_finalization).parameters) == ('install_root', 'filesystem', 'mutex_factory')
assert tuple(inspect.signature(_replace_finalization_file).parameters) == ('source', 'target', 'windows_api')
assert set(ExecutableRole) == {
    ExecutableRole.PRODUCTION_MAIN, ExecutableRole.SOURCE_MAIN,
    ExecutableRole.DETACHED_RUNNER, ExecutableRole.STATUS_HOST,
}
assert MODE_ROLES == {
    EntryMode.MAIN_HOST: frozenset({ExecutableRole.PRODUCTION_MAIN, ExecutableRole.SOURCE_MAIN}),
    EntryMode.REGISTER: frozenset({ExecutableRole.PRODUCTION_MAIN, ExecutableRole.SOURCE_MAIN}),
    EntryMode.INSTALL_PACKAGE: frozenset({ExecutableRole.PRODUCTION_MAIN}),
    EntryMode.COMPLETE_UPDATE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.RECOVER_ACTIVE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.RECOVER_UPDATE: frozenset({ExecutableRole.DETACHED_RUNNER}),
    EntryMode.STATUS_HOST: frozenset({ExecutableRole.STATUS_HOST}),
}
assert COMMANDS == {
    '--register': EntryMode.REGISTER,
    '--complete-update': EntryMode.COMPLETE_UPDATE,
    '--install-package': EntryMode.INSTALL_PACKAGE,
    '--recover-active': EntryMode.RECOVER_ACTIVE,
    '--recover-update': EntryMode.RECOVER_UPDATE,
}
assert COMMAND_ARITIES == {
    EntryMode.REGISTER: 0,
    EntryMode.COMPLETE_UPDATE: 3,
    EntryMode.INSTALL_PACKAGE: 1,
    EntryMode.RECOVER_ACTIVE: 0,
    EntryMode.RECOVER_UPDATE: 1,
}
'@
)

$stale = @(
  git grep -n -E "manifest\.inventory|OwnershipInventory|initiating_host_pid|TransactionPaths\.recovery_root|recovery[/\\]active\.json|activate_prepared\([^,]+,[[:space:]]*[A-Za-z_]*pid|rollback\([^,]+,[[:space:]]*JournalReason\.ROLLBACK_FAILED" -- `
    host/native_messaging.py `
    host/native_registration.py `
    host/update_platform.py `
    host/update_recovery.py `
    host/update_status_host.py `
    host/update_entrypoint.py `
    release_helper.py
)
if ($stale.Count -ne 0) { $stale; throw "Stale Plan C contract found." }

$barePid = @(
  git grep -n -E "def [A-Za-z_]+\([^)]*pid: int|Callable\[\[int\]|launch_detached\([^)]*\) -> int" -- `
    host/update_platform.py `
    host/update_recovery.py `
    host/update_entrypoint.py
)
if ($barePid.Count -ne 0) { $barePid; throw "Bare PID process contract found." }

$writers = @(
  git grep -n -E "transition\(|write_journal_atomic|write_active_transaction_atomic|write_probe_manifest|remove_transaction_tree|remove_matching_active" -- `
    host/update_platform.py `
    host/update_recovery.py `
    host/update_status_host.py `
    host/update_entrypoint.py
)
if ($writers.Count -ne 0) { $writers; throw "Plan C bypasses Plan B ownership." }

$popenClose = @(
  git grep -n -E "Popen.*close|\.close\(\).*Popen|subprocess\.Popen" -- `
    host/update_platform.py host/update_recovery.py host/update_entrypoint.py
)
if ($popenClose.Count -ne 0) { $popenClose; throw "Detached launch must use ProcessAdapter/CreateProcessW." }

$probeJsonDuplication = @(
  git grep -n -E 'package_probe_failed|canonical_json_bytes|json\.dumps|_write_probe' -- `
    host/update_entrypoint.py
)
if ($probeJsonDuplication.Count -ne 0) {
    $probeJsonDuplication
    throw "Plan C duplicated Plan A probe failure serialization."
}

$preflightBypass = @(
  git grep -n -E 'activate_prepared\(' -- host/update_recovery.py
)
if ($preflightBypass.Count -ne 2) {
    $preflightBypass
    throw "Expected exactly browser and installer activate_prepared call sites."
}
git grep -n -F -- 'probe_exit = dispatch_early_cli(probe_argv)' host/update_entrypoint.py
if ($LASTEXITCODE -ne 0) {
    throw "Plan C must delegate only its validated/fixed probe argv to Plan A."
}
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import ast,pathlib; source=pathlib.Path('host/update_entrypoint.py').read_text(encoding='utf-8'); t=ast.parse(source); f={n.name:n for n in t.body if isinstance(n,ast.FunctionDef)}; d=f['dispatch_early_mode']; calls=[n for n in ast.walk(d) if isinstance(n,ast.Call)]; name=lambda n:(n.func.id if isinstance(n.func,ast.Name) else n.func.attr if isinstance(n.func,ast.Attribute) else ''); forbidden={'production_early_mode_dependencies','EarlyModeDependencies','WindowsRegistryBackend','registry_factory','register_main_host','create_production_recovery_controller','RecoveryController','recovery_factory','CtypesWin32ProcessApi','WindowsProcessAdapter','SubprocessProbeAdapter','TemporaryStagedProbeWorkspace','WindowsRunOnceStore','SystemClock','create_windows_mutation_mutex','default_install_root','install_package','status_server'}; validates=[n for n in calls if name(n)=='validate_early_invocation']; factories=[n for n in calls if name(n) in forbidden]; production=[n for n in calls if name(n)=='production_early_mode_dependencies']; injected=[n for n in calls if name(n)=='dependencies_factory']; assert len(validates)==1 and len(production)==1 and len(injected)==1; assert all(validates[0].lineno<n.lineno for n in (*factories,*injected)); [(_ for _ in ()).throw(AssertionError((owner,name(n)))) for owner in ('classify_entrypoint','validate_probe_invocation','validate_early_invocation','resolve_active_command','resolve_journal_command') for n in ast.walk(f[owner]) if isinstance(n,ast.Call) and name(n) in forbidden]; classify=ast.get_source_segment(source,f['classify_entrypoint']) or ''; main_branch=classify.split('if basename == "dh_native_host.py"')[0]; probe_root=ast.get_source_segment(source,f['_validate_frozen_probe_host_root']) or ''; assert 'release-integrity.json' not in classify and 'installed-product.json' not in classify and '_internal' not in main_branch; assert 'release-integrity.json' in probe_root and 'installed-product.json' in probe_root; complete=f['validate_complete_update_command']; ordered=('resolve_recovery_install_root','parse_transaction_id','validate_cli_process_identity_text','read_active_transaction','resolve_active_journal','read_journal','InitiatingProcessIdentity','ValidatedCompleteUpdate'); lines={target:[n.lineno for n in ast.walk(complete) if isinstance(n,ast.Call) and name(n)==target] for target in ordered}; assert all(len(lines[target])==1 for target in ordered),lines; assert [lines[target][0] for target in ordered]==sorted(lines[target][0] for target in ordered); top_calls=[n for n in t.body if isinstance(n,(ast.Assign,ast.AnnAssign,ast.Expr)) and any(isinstance(x,ast.Call) and name(x) in forbidden for x in ast.walk(n))]; assert not top_calls,top_calls; host=ast.parse(pathlib.Path('host/dh_native_host.py').read_text(encoding='utf-8')); text=ast.unparse(host.body[:8]); assert "not bool(getattr(sys, 'frozen', False))" in text and 'source_runtime=_source_runtime' in text"
)
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import ast,pathlib; p=pathlib.Path('host/update_recovery.py'); source=p.read_text(encoding='utf-8'); t=ast.parse(source); f={n.name:n for n in t.body if isinstance(n,ast.FunctionDef)}; owners=('finalize_update_status','acknowledge_update_finalization','require_no_pending_finalization'); banned={'iterdir','glob','rglob','walk','mkstemp','NamedTemporaryFile','uuid4','remove_receipt','_write_and_verify_ack'}; called=lambda n:(n.func.id if isinstance(n.func,ast.Name) else n.func.attr if isinstance(n.func,ast.Attribute) else ''); hits=[(owner,called(n)) for owner in owners for n in ast.walk(f[owner]) if isinstance(n,ast.Call) and called(n) in banned]; assert not hits,hits; assert '.{target.name}.tmp' in (ast.get_source_segment(source,f['_scratch_path']) or ''); finalization_source='\n'.join(ast.get_source_segment(source,f[name]) or '' for name in owners); assert 'uuid' not in finalization_source; assert 'FinalizationAck' not in source and '_write_and_verify_ack' not in source; replace=f['_replace_finalization_file']; rcalls=[n for n in ast.walk(replace) if isinstance(n,ast.Call)]; assert any(called(n)=='WinDLL' for n in rcalls); assert 'MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH' in (ast.get_source_segment(source,replace) or ''); same_volume=ast.get_source_segment(source,f['_same_finalization_volume']) or ''; assert 'st_dev' in same_volume and 'follow_symlinks=False' in same_volume and 'type(source_device) is not int' in same_volume; fscls=next(n for n in t.body if isinstance(n,ast.ClassDef) and n.name=='OSFinalizationFilesystem'); methods={n.name:n for n in fscls.body if isinstance(n,ast.FunctionDef)}; move=methods['move_receipt_to_ack']; move_source=ast.get_source_segment(source,move) or ''; move_nodes=set(ast.walk(move)); move_calls=[called(n) for n in move_nodes if isinstance(n,ast.Call)]; ack_replaces=[n for n in ast.walk(t) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and isinstance(n.func.value,ast.Name) and n.func.value.id=='os' and n.func.attr=='replace' and len(n.args)==2 and isinstance(n.args[1],ast.Name) and n.args[1].id=='ack_path']; assert len(ack_replaces)==1 and ack_replaces[0] in move_nodes; assert move_calls.count('replace')==1 and 'os.replace(receipt_path, ack_path)' in move_source and 'copy2' not in move_source and '_replace_finalization_file' not in move_calls and '_same_finalization_volume' in move_calls and 'fsync_file' in move_calls and move_calls.count('fsync_directory')==2; barrier=f['require_no_pending_finalization']; barrier_source=ast.get_source_segment(source,barrier) or ''; assert 'ack_path' not in barrier_source and 'receipt' not in barrier_source; top_calls=[n for n in t.body if isinstance(n,(ast.Assign,ast.AnnAssign,ast.Expr)) and any(isinstance(x,ast.Call) and called(x) in {'WinDLL','OSFinalizationFilesystem'} for x in ast.walk(n))]; assert not top_calls,top_calls; init=[n for n in fscls.body if isinstance(n,ast.FunctionDef) and n.name=='__init__']; assert not init"
)
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import ast,pathlib; t=ast.parse(pathlib.Path('host/update_recovery.py').read_text(encoding='utf-8')); c=next(n for n in t.body if isinstance(n,ast.ClassDef) and n.name=='RecoveryController'); funcs={n.name:n for n in c.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))}; required=('run_complete_update','run_installer_update'); call_name=lambda x:(x.func.attr if isinstance(x.func,ast.Attribute) else x.func.id if isinstance(x.func,ast.Name) else None); calls=lambda name,target:[x for x in ast.walk(funcs[name]) if isinstance(x,ast.Call) and call_name(x)==target]; assert all(len(calls(name,'preflight_prepared_target'))==1 and len(calls(name,'activate_prepared'))==1 and calls(name,'preflight_prepared_target')[0].lineno<calls(name,'activate_prepared')[0].lineno for name in required); prepare='prepare_recovery_runtime'; assert len(calls(prepare,'preflight_prepared_target'))==1 and len(calls(prepare,'install_recovery_tree'))==1 and len(calls(prepare,'register_status_host'))==1 and calls(prepare,'preflight_prepared_target')[0].lineno<calls(prepare,'install_recovery_tree')[0].lineno<calls(prepare,'register_status_host')[0].lineno"
)

Invoke-IsolatedPython -PythonArgs @(
  "-c",
  @'
import ast
from pathlib import Path
files = (
    'host/update_recovery.py', 'host/update_entrypoint.py',
    'host/dh_native_host.py', 'release_helper.py',
)
targets = {'install_recovery_tree', 'register_status_host'}
definitions = []
calls = []
for name in files:
    tree = ast.parse(Path(name).read_text(encoding='utf-8'))
    parents = {}
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            parents[child] = parent
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name in targets:
            definitions.append((name, node.name))
        if isinstance(node, ast.Call):
            called = (
                node.func.id if isinstance(node.func, ast.Name)
                else node.func.attr if isinstance(node.func, ast.Attribute)
                else None
            )
            if called in targets:
                current = node
                owner = None
                while current in parents:
                    current = parents[current]
                    if isinstance(current, ast.FunctionDef):
                        owner = current.name
                        break
                calls.append((name, called, owner))
assert set(definitions) == {
    ('host/update_recovery.py', 'install_recovery_tree'),
    ('host/update_recovery.py', 'register_status_host'),
}
assert set(calls) == {
    ('host/update_recovery.py', 'install_recovery_tree', 'prepare_recovery_runtime'),
    ('host/update_recovery.py', 'register_status_host', 'prepare_recovery_runtime'),
}
'@
)

git diff --check "$env:PLAN_C_BASE..HEAD"
git diff --name-only "$env:PLAN_C_BASE..HEAD"
```

Expected: interface, dispatch-order, and preflight-call probes exit 0; stale,
bare-PID, writer, Popen, probe-JSON-duplication, and receipt-scan checks have no
output; validated/fixed Plan A probe delegation is found; exactly two engine
activation calls remain; recovery primitives are owned only by
`prepare_recovery_runtime`; diff check exits 0. Changed names match the File
Map with no installer, Extension, Plan A/B production, updater, version, or
checked-spec drift.

- [ ] **Step 7: Run static Win32, status-read-only, registration, and framing gates**

```powershell
$win32 = @(
  "CreateProcessW",
  "OpenProcess",
  "GetProcessTimes",
  "QueryFullProcessImageNameW",
  "WaitForSingleObject",
  "CloseHandle",
  "PROC_THREAD_ATTRIBUTE_HANDLE_LIST",
  "MoveFileExW",
  "MOVEFILE_WRITE_THROUGH"
)
foreach ($symbol in $win32) {
    $targets = if ($symbol -in @("MoveFileExW", "MOVEFILE_WRITE_THROUGH")) {
        @("host/update_recovery.py")
    } else {
        @("host/update_platform.py")
    }
    git grep -n -- $symbol -- $targets | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Missing Win32 adapter symbol: $symbol" }
}

$statusMutation = @(
  git grep -n -E "UpdateEngine|update_mutex|winreg|RunOnce|unlink|rmtree|os\.replace|write_text|write_bytes|open\(.+[wa]" -- host/update_status_host.py
)
if ($statusMutation.Count -ne 0) { $statusMutation; throw "Status Host is not read-only." }

git grep -n -- "launch_host.bat" host/native_registration.py host/test_native_registration.py
if ($LASTEXITCODE -ne 0) { throw "Source registration fallback missing." }
git grep -n -- "host_manifest.json" host/native_registration.py host/test_native_registration.py
if ($LASTEXITCODE -ne 0) { throw "Source manifest fallback missing." }

git grep -n -- 'struct.pack("<I"' host/native_messaging.py
if ($LASTEXITCODE -ne 0) { throw "Little-endian writer missing." }
git grep -n -- 'struct.unpack("<I"' host/native_messaging.py
if ($LASTEXITCODE -ne 0) { throw "Little-endian reader missing." }
Invoke-IsolatedPython -PythonArgs @(
  "-c",
  "import ast,inspect; from native_messaging import read_native_message; from update_status_host import STATUS_MAX_REQUEST_BYTES; p=inspect.signature(read_native_message).parameters; assert tuple(p)==('stream','max_payload_bytes'); assert p['max_payload_bytes'].default is None; assert STATUS_MAX_REQUEST_BYTES==64*1024; t=ast.parse(open('host/dh_native_host.py',encoding='utf-8').read()); calls=[n for n in ast.walk(t) if isinstance(n,ast.Call) and getattr(n.func,'id',None)=='read_native_message']; assert len(calls)==1; kw={x.arg:x.value for x in calls[0].keywords}; assert isinstance(kw.get('max_payload_bytes'),ast.Constant) and kw['max_payload_bytes'].value is None"
)
```

Expected: all required symbols/fallbacks/framing are found; the reader default and main Host call are explicitly uncapped, the status constant is exactly `64 KiB`, and no status mutation match exists.

- [ ] **Step 8: Re-run all required restored mutations and record nonzero evidence**

Apply one mutation at a time, use the named command with `-ExpectFailure`, record the failure, restore immediately with `apply_patch`, and rerun the original test without `-ExpectFailure`:

| Mutation | Required failing test |
|---|---|
| Writer `<I` to `>I`, peer reader unchanged | `NativeMessagingTests.test_little_endian_writer_round_trips_through_little_endian_reader` |
| Reader `<I` to `>I`, little-endian peer unchanged | `NativeMessagingTests.test_reader_accepts_a_little_endian_peer_frame` |
| Reader default changes from `None` to `1_048_576` | `NativeMessagingTests.test_default_reader_accepts_analyze_payload_larger_than_one_mib` and `NativeHostFramingIntegrationTests.test_main_host_accepts_analyze_payload_larger_than_one_mib` |
| Status limit check moves after body read or status omits `64 KiB` limit | `StatusProtocolTests.test_rejects_more_than_64_kib_before_reading_body` |
| Wait reopens current PID | `ProcessAdapterTests.test_retained_handle_defeats_pid_reuse` |
| Omit parent thread/process `CloseHandle` | `ProcessAdapterTests.test_detached_launch_closes_parent_thread_and_process_handles` |
| Recovery tree replacement touches `active.json` | `RecoveryTreeTests.test_install_replaces_only_recovery_child_and_preserves_stable_active` |
| Recovery-tree install/status registration occurs before staged preflight | `StagedHostPreflightTests.test_prepare_recovery_runtime_preflights_before_tree_or_registry_mutation` |
| RunOnce arm or `activate_prepared` occurs before staged preflight | `StagedHostPreflightTests.test_failed_preflight_leaves_prepared_inert_for_browser_and_installer` |
| Staged probe executes bare `staged_host` without combined Extension/metadata | `StagedHostPreflightTests.test_preflight_starts_combined_staged_frozen_target_before_activation` |
| Post-probe staged-source revalidation is removed | `StagedHostPreflightTests.test_probe_time_staged_mutation_fails_before_any_activation_mutation` |
| Recovery retry passes current `rollback_failed` | `RecoveryRunnerTests.test_rollback_failed_retry_uses_persisted_original_failure` |
| Normal Chrome main argv is rejected | `EntrypointSelectionTests.test_normal_main_accepts_chrome_origin_and_parent_and_continues` |
| Chrome decimal `--parent-window=0` is rejected | `StatusArgTests.test_accepts_allowlisted_origin_and_optional_decimal_parent` and `EntrypointSelectionTests.test_normal_main_accepts_chrome_origin_and_parent_and_continues` |
| Normal main classification requires release metadata | `EntrypointSelectionTests.test_startable_partial_historical_main_reaches_normal_startup` |
| Source dispatch uses `sys.executable` instead of `__file__` | source-main process/AST entrypoint test |
| Any command-to-executable matrix role is widened | matrix cross-product no-factory test for that mode |
| Malformed `REGISTER`, `INSTALL_PACKAGE`, `RECOVER_UPDATE`, `COMPLETE_UPDATE`, `RECOVER_ACTIVE`, or status constructs any dependency/object | matching named `EntrypointDispatchTests.test_*_never_*` |
| Plan C returns malformed probe without Plan A dispatch | exact `EarlyDispatchIsolationTests.test_malformed_probe_{missing_arg,extra_arg,bad_path}_uses_plan_a_canonical_failure` selectors |
| Wrong executable runs probe or constructs a factory | `EntrypointDispatchTests.test_probe_wrong_role_uses_canonical_failure_without_probe_or_factories` |
| Source/frozen runtime boolean is ignored | `EntrypointDispatchTests.test_frozen_process_cannot_claim_source_fallback` and `test_source_process_cannot_claim_frozen_role` |
| Receipt requires non-null rolled-back version | `FinalizationTests.test_fresh_rollback_receipt_has_null_terminal_version` |
| Committed fresh terminal identity is rejected or loses `fresh_install=True` | `FinalizationTests.test_plan_b_terminal_projection_table_is_frozen_exactly` |
| Receipt is written before cursor | `FinalizationTests.test_cursor_precedes_receipt_unregister_and_engine_cleanup` |
| Same-ID finalize writes a second receipt | `FinalizationTests.test_same_id_finalize_replays_cursor_without_second_receipt` |
| New finalization replaces a pending cursor or constructs engine first | `FinalizationTests.test_different_transaction_cannot_create_receipt_while_cursor_pending` |
| Acknowledgment writes a separate object or unlinks the receipt | `FinalizationTests.test_ack_atomically_moves_receipt_to_fixed_slot_then_removes_cursor` and finalization AST gate |
| Acknowledgment uses copy-plus-delete instead of one `os.replace` | `FinalizationWindowsDurabilityTests.test_acknowledgment_uses_one_os_replace_from_receipt_to_fixed_slot` |
| Crash before acknowledgment replace cannot replay from receipt | `FinalizationTests.test_crash_before_move_replays_from_matching_receipt` |
| Crash after acknowledgment replace cannot replay from fixed slot | `FinalizationTests.test_crash_after_move_replays_from_matching_ack_slot` |
| Ack-slot replay skips file/directory durability before cursor removal | `FinalizationTests.test_post_replace_replay_refsyncs_ack_before_cursor_cleanup` |
| Cursor-unlink lost response cannot settle from matching ack plus cursor-scratch state | `FinalizationTests.test_post_replace_replay_settles_cursor_unlink_without_stable_cursor` |
| Start gate opens before cursor removal | `FinalizationTests.test_update_start_barrier_stays_closed_until_cursor_is_removed` |
| Cursor scratch is ignored as pending authority | `FinalizationTests.test_cursor_scratch_alone_blocks_start_and_newer_finalization` |
| Same-ID replay removes a pre-existing cursor after ordinary receipt failure | `FinalizationTests.test_same_id_replay_receipt_error_retains_preexisting_cursor` |
| Later transaction starts before old cursor cleanup | `FinalizationTests.test_no_new_start_or_finalization_before_old_cursor_cleanup` |
| Later acknowledgment replacement can leave an older source receipt | `FinalizationTests.test_ack_slot_replays_same_id_until_later_transaction_replaces_it` |
| Newer finalize overwrites the older ack before acknowledgment | `FinalizationTests.test_newer_finalize_preserves_older_ack_until_newer_acknowledgment` |
| Delayed old-ID replay mutates the newer cursor/receipt | `FinalizationTests.test_delayed_old_ack_is_read_only_while_newer_cursor_exists` |
| Delayed old ID remains successful after newer slot replacement | `FinalizationTests.test_delayed_old_ack_fails_after_newer_slot_replacement` |
| Atomic scratch uses random/UUID names | bounded-artifact cleanup assertion and finalization AST scan |
| Finalization scans receipts | finalization AST no-scan test |
| Windows publication omits `MOVEFILE_WRITE_THROUGH` | `FinalizationWindowsDurabilityTests.test_replace_uses_replace_existing_and_write_through` |

Every mutated command must exit nonzero; every restored command must exit 0. Do not use a platform-native endian mutation that remains little-endian.

- [ ] **Step 9: Document exact behavior and Plan D handoff**

Document all of the following concrete contracts:

- `ARCHITECTURE.md`: stable active/recovery topology; exact entrypoint-role matrix; normal-main basename/Chrome classification independent of metadata; staged and installed probes; retained identity/handles/cwd/RunOnce; read-only status; reserved/receipt-ready cursor; atomic receipt-to-fixed-ack move.
- `DEVELOPER_GUIDE.md`: source versus frozen registration and entrypoint identity; every exact early command; nonnegative decimal parent-window including `0`; fixed mismatch output; validation-before-all-factories; malformed/wrong-role probe behavior; exhaustive acknowledgment crash table; `UPDATE_START` cursor barrier; harness/build/manual recovery commands.
- `AGENTS.md`: no bare PID or `Popen.close`; no Plan B path writes/direct cleanup; no dependency/controller/registry/process construction before full entrypoint+argv validation; no duplicate probe serializer; no receipt scan/new cursor overwrite; no bypass of preflight/start barrier; no real machine tests or automatic provisioning.
- `docs/session-handoff-2026-07-15.md`: Plan C interfaces and frozen evidence; exact role matrix; preserved `prepare_recovery_runtime` alignment; Plan D blocker for the missing `UPDATE_START` pending-finalization gate; installer null identity; all four Plan B terminal projections; full cursor/receipt/fixed-ack move replay table and later-transaction barrier. Any drift or blocked frozen gate forbids Plan D activation.
- `releases/notes-prompt-scope-cleanup-draft.md`: dormant detached recovery primitives and first historical-upgrade limitation without claiming transactional routing is active.

Manual commands are exactly:

```text
%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe --recover-active
%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe --recover-update <absolute-canonical-journal>
```

Never advise deleting backups for `recovery-required`.

- [ ] **Step 10: Write the ignored evidence report with actual output only**

Create `.superpowers/sdd/hardening-c-detached-recovery-report.md` with exact headings:

```markdown
# Hardening Plan C Detached Recovery Report

## Scope and Authoritative Heads
## Consumed Signatures and Fields
## Commit Map
## RED Evidence
## GREEN Evidence
## Restored Mutation Evidence
## Process Identity and Handle Lifecycle
## Recovery Tree and Active Preservation
## Staged Runtime Preflight and Installed Commit Probe
## Early Argument Validation and Canonical Probe Failure
## RunOnce and Original Failure Lineage
## Status Read-Only Evidence
## Finalization and Bounded Acknowledgment
## PyInstaller CLI, Module Graph, and Frozen Staged Probe
## Six-Variable Isolation Roots
## Static and Scope Gates
## Plan D Handoff
## Deferred Disposable-VM Gate
```

Record actual heads, signatures, commands, exit codes, test totals, temporary
roots, exact seven framing selectors, complete role-matrix/no-factory results,
fixed stderr and malformed/wrong-role probe raw bytes, every finalization crash
boundary and bounded-state assertion, staged preflight evidence, source build
gate, module graph, and frozen one-test probe when available. Under the frozen
heading record one exact status:

```text
PLAN_C_FROZEN_GATE_STATUS=PASS
```

only after exact PyInstaller 6.18.0 preflight and the complete onedir/module-graph/frozen-staged-probe gate, or:

```text
PLAN_C_FROZEN_GATE_STATUS=BLOCKED
PLAN_C_FROZEN_GATE_REASON=<actual preflight/provisioning reason>
PLAN_D_ACTIVATION=BLOCKED
```

when PyInstaller is unavailable, approval is not granted, provisioning fails, the build/module graph fails, or the frozen staged-target probe fails/skips. Source/unit PASS evidence remains valid but cannot override this blocker. State `DISPOSABLE-VM SMOKE REQUIRED BEFORE RELEASE, NOT RUN` and list real handle inheritance, real RunOnce launch/re-arm/removal, forced installed-probe rollback, Chrome status launch argv, and interrupted installer resume.

- [ ] **Step 11: Verify and commit only documentation/evidence**

```powershell
git diff --check
git status --short
git add `
  AGENTS.md `
  ARCHITECTURE.md `
  DEVELOPER_GUIDE.md `
  docs/session-handoff-2026-07-15.md `
  releases/notes-prompt-scope-cleanup-draft.md
git add -f -- .superpowers/sdd/hardening-c-detached-recovery-report.md
$actual = @(git diff --cached --name-only | Sort-Object)
$expected = @(
  ".superpowers/sdd/hardening-c-detached-recovery-report.md",
  "AGENTS.md",
  "ARCHITECTURE.md",
  "DEVELOPER_GUIDE.md",
  "docs/session-handoff-2026-07-15.md",
  "releases/notes-prompt-scope-cleanup-draft.md"
) | Sort-Object
if (Compare-Object $actual $expected) {
    throw "Unexpected staged documentation/evidence files."
}
git diff --cached --check
git commit -m "docs(update): record detached recovery evidence"
```

The `-f` is required because `.superpowers/sdd/.gitignore` contains `*`. Never use ordinary `git add` as evidence that the report is staged. Before the command above, run `git check-ignore -v -- .superpowers/sdd/hardening-c-detached-recovery-report.md` and require it identifies `.superpowers/sdd/.gitignore`; this proves forced staging is intentional.

- [ ] **Step 12: Run final committed-head gates with no post-evidence drift**

Repeat Steps 1-7 in fresh harness invocations, then run:

```powershell
git status --short
git diff --check HEAD^..HEAD
git log --oneline -10
```

Expected source-complete result: clean status, every source/unit/static gate exits 0, negative scans have no output, and one independently reviewable commit exists for each Task 1-10. Full Plan C verification additionally requires `PLAN_C_FROZEN_GATE_STATUS=PASS`. If it is `BLOCKED`, report source implementation complete but overall verification blocked and do not activate Plan D. If observed evidence changes, create a corrective documentation commit; do not amend.

## Plan C Completion Checklist

- [ ] Plan A `UpdateManifest.entries` and exact Plan B schemas/signatures are consumed without adapters.
- [ ] `parse_probe_process_result` is a complete importable function before its caller.
- [ ] Plan A remains the sole probe JSON serializer; Plan C validates the production-main role/complete argv first, delegates valid-role argv unchanged, uses a fixed malformed tuple for wrong-role canonical failure, and parses subprocess output.
- [ ] Staged preflight creates only beneath a validated isolated temp base outside all install/transaction roots and removes the exact view before success can return.
- [ ] A byte-exact combined staged Host/Extension/metadata view starts through Plan A `--update-probe` before recovery-tree/browser-status/RunOnce/`activate_prepared` mutation; activation repeats it and every fault leaves `PREPARED` inert with live bytes unchanged.
- [ ] Plan B's installed-product probe remains after mutation and is the only commit gate.
- [ ] Win32 process creation/open/times/wait/close are injected, identity-safe, and parent handles close exactly once.
- [ ] Recovery tree source/reparse/internal inventory completes before copy and preserves stable `updates/active.json` byte-for-byte.
- [ ] RunOnce is untouched on staged-preflight failure, re-arms every safe post-arm nonterminal path, and retries rollback with persisted `original_failure_code` only.
- [ ] Source main passes `__file__`, frozen main passes `sys.executable`; normal Chrome launch accepts nonnegative decimal parent-window including `0`, classifies without metadata, and returns `None` so partial historical installs reach `verify_installation`.
- [ ] The exact production-main/detached-runner/status/source-register matrix is frozen for `REGISTER`, `INSTALL_PACKAGE`, `RECOVER_UPDATE`, `COMPLETE_UPDATE`, `RECOVER_ACTIVE`, `UPDATE_PROBE`, status, and main modes.
- [ ] Complete entrypoint role, source/frozen runtime bit, argv, arity, identity, fixed chain, and path authority validate before every dependency/controller/registry/process/default-root/installer/status factory; every mismatch returns exit `2` with fixed safe output and all factories uncalled.
- [ ] Malformed/wrong-role probe emits Plan A's exact canonical failure with no probe, SDK/config/log, or dependency side effect; Plan C has no serializer.
- [ ] Source `launch_host.bat`/`host_manifest.json` and frozen executable registration share one service.
- [ ] Source-level release-helper argv test proves module-form venv Python invocation, exact hidden imports, and no provisioning side effect without requiring PyInstaller.
- [ ] Exact `host/venv/Scripts/python.exe -m PyInstaller --version` reports `6.18.0`, complete onedir/module graph and real one-test frozen staged-target probe pass, and no tracked ignored spec is introduced. If unchecked, skipped, or failed, Plan C is `BLOCKED`, not fully verified, and Plan D cannot activate.
- [ ] Every verification child process gets six existing isolated environment directories.
- [ ] Shared reader defaults to no inbound cap, the main Host passes explicit `None` and accepts an Analyze-like frame larger than `1 MiB`, while the status Host passes exactly `64 KiB` and rejects an oversized prefix before any body read; writer behavior is unchanged.
- [ ] Both true big-endian framing mutations exit nonzero and restored little-endian tests pass.
- [ ] Installer activation is null-identity only; the committed/rolled-back fresh/existing receipt table exactly matches Plan B, including committed fresh target and rolled-back fresh null; terminal cleanup uses Plan B engine only.
- [ ] Reserved cursor is durable before receipt and advances to receipt-ready before cleanup; acknowledgment atomically executes `os.replace(receipt_path, ack_path)` into the one fixed slot, then removes the cursor. Every crash row replays, an ID matching the fixed slot succeeds until later replacement, unrelated IDs reject, later work waits for old cursor cleanup, and no receipt scan/orphan is possible.
- [ ] Detached initial and recovery launches use canonical transaction root cwd.
- [ ] Plan D preserves `prepare_recovery_runtime` ownership and is not executed until coordinator `DH_UPDATE_START` and Host `UpdateService.prepare` both call `require_no_pending_finalization` before ID/runtime/package/transaction side effects, while existing service composition and ordinary product use remain enabled.
- [ ] Focused/full/compile/Extension/source-packaging/static/mutation evidence is recorded; frozen PyInstaller evidence is `PASS` or explicitly `BLOCKED`; disposable-VM smoke remains pending.

Plan C may be marked fully verified and Plan D may activate only when every item is checked, including the exact-version frozen onedir/module-graph/staged-probe item. Source/unit completion with that item blocked is not a Plan C PASS.
