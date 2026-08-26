# Hardening Plan D Runtime And Installer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the reviewed Plan A/B/C transaction engine through one crash-safe Service Worker coordinator and the synchronous installer while preserving Plan E's exact Analyze and update-error boundaries.

**Architecture:** `host/update_service.py` is a dormant facade over the exact Plan A package, Plan B engine, and Plan C recovery/finalization APIs until the final cutover. In the Extension, immutable `NativePortLease` objects prevent authorization reuse across ports, `hostGate.ts` owns one capability/integrity decision per lease, `updateProtocol.ts` owns strict wire/storage parsing, and `updateCoordinator.ts` is the sole update state machine. The Service Worker composes Plan E's `handleAnalyzeRequest` with a same-lease gate/transport provider; Options, FAB, and content code render typed state only. Python owns installer process wait, transaction activation, probe, intent application, registration verification, and finalization; PowerShell owns only external intent creation, `--install-package` invocation, exit interpretation, and the committed `--register` invocation.

**Tech Stack:** Python 3.13 standard library and `unittest`, PyInstaller exactly 6.18.0 `--onedir`, PowerShell 7-compatible verification plus Windows PowerShell 5.1-compatible installer scripts, React 19, TypeScript 5.9 strict mode, Chrome Manifest V3, Vitest 3, and Testing Library/jsdom

## Global Constraints

- Execution order is fixed: `A -> B -> C -> E -> D`. Plan D starts only from reviewed, committed, green A/B/C/E implementations and evidence commits.
- Work only in `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-prompt-scope-spec`. Do not adapt around a prerequisite mismatch; stop and revise the owning prerequisite plan/result first.
- Plan B owns the exact Python generator `generate_transaction_id(random_bytes: Callable[[int], bytes] = secrets.token_bytes) -> str`. The synchronous installer imports it; no Plan D Python module defines another generator. Browser TypeScript separately uses the production `crypto.getRandomValues` adapter specified in Task 7 and validates its lowercase 32-hex output.
- **Frozen hard blocker:** Plan C's committed report must contain `PLAN_C_FROZEN_GATE_STATUS=PASS`, exact `host/venv/Scripts/python.exe -m PyInstaller --version` output `6.18.0`, a complete onedir/module-graph PASS, and the one real frozen staged-target probe PASS. Missing, skipped, or failed evidence means `PLAN_D_EXECUTION_STATUS=BLOCKED`.
- Provisioning PyInstaller is a separate venv/network mutation. If exact 6.18.0 is absent, run `-m ensurepip --upgrade` and `-m pip install pyinstaller==6.18.0` only after explicit user approval. No source, test, installer, or release path provisions it automatically.
- Plan A remains the only package, ownership, release-document, archive, integrity, version, and probe authority. Plan D calls `validate_staged_package`/`stage_and_validate_archive`; it does not duplicate hashes, schemas, ownership, or extraction.
- Plan B remains the only journal, active record, transaction workspace, mutex, phase transition, rollback, resume, and terminal-evidence authority. Plan D never writes/deletes `journal.json`, `active.json`, `updates/transactions/**`, or calls Plan B transition/writer internals.
- Plan C remains the only staged-target preflight, recovery-tree installation, status registration, browser runner launch, process-identity wait, RunOnce, status Host, finalization receipt, and bounded acknowledgment authority. Plan D calls high-level `RecoveryController` methods, exactly `launch_complete_update`/`launch_active_recovery`, and finalization functions only. Production Plan D code must not import or call `install_recovery_tree` or `register_status_host`.
- Plan E remains the only `nativeUpdateError.ts`, Analyze parser, Analyze persistence-start/completion, and exact three-key Analyze action authority. Plan D does not create, replace, or duplicate `nativeUpdateError.ts`, `analyzeRequestHandler.ts`, `parseAnalyzeForwardRequest`, or `handleAnalyzeForward`.
- Browser preparation uses the exact 32-lowercase-hex ID generated and persisted by the Service Worker. The Host validates/echoes it and never substitutes another ID.
- Synchronous installer preparation obtains its ID only from the reviewed Plan B Python generator, passes `initiator=UpdateInitiator.INSTALLER`, and activates through `run_installer_update(transaction_id)`. The resulting Plan B call is `activate_prepared(transaction_id, process_identity=None)` and never opens/waits on the installer's own process.
- Browser activation uses one complete `InitiatingProcessIdentity(pid, creation_token)`. No Plan D interface accepts a bare PID. `launch_complete_update` and `launch_active_recovery` retain Plan C's canonical transaction-root `cwd` contract.
- `perform_update` only prepares. It may create transaction state, preflight/install the reusable recovery tree, and register the status Host through `prepare_recovery_runtime`; it never starts the runner or mutates the live product.
- `activate_update` responds only after `wait_until_ready` sees the matching complete identity durably recorded at `waiting-for-host-exit` or later. The Host writes and flushes `update_activated`, then stops its Native loop and exits normally.
- The Service Worker is the sole runtime compatibility/update coordinator. Options, FAB, and content code never connect to Native Hosts, poll status, mutate update storage, finalize/acknowledge, or call `chrome.runtime.reload()`.
- Persist exactly one browser transaction key, `dh_update_runtime`. `pending_update` remains the separately normalized available-update record. No phase-specific storage keys or unbounded transaction/acknowledgment sets are added.
- Poll only `com.dynamics.helper.update_status` with delays `250`, `500`, `1000`, then capped `2000` ms for at most `120000` ms per wake. A disconnect consumes the current interval. Timeout retains state and restarts at 250 ms on the next wake.
- Terminal order is exact: status evidence -> persist `terminal-reload-pending` -> reload -> verify the newly loaded Extension version -> run packaged main-Host capability/integrity/version gate -> persist `cleanup-pending` -> receive exact Plan C receipt -> persist full receipt-backed completion marker -> acknowledge through Plan C -> allow one durable announcement claim. Product use does not wait for receipt deletion.
- Plan C receipt identity is always nested `terminal_version: {fresh_install:boolean, version:string|null}`. Plan D never invents scalar receipt `version`. A fresh rollback null is accepted by the parser even though browser self-update is non-fresh.
- Plan C uses one active cursor at `<install>/updates/finalization-cursor.json`, at most one matching receipt under `updates/receipts/<id>.json`, and one fixed last-ack receipt slot at `<install>/updates/finalization-ack.json`. `UPDATE_START` calls `require_no_pending_finalization` before generating an ID or performing any update side effect. A cursor/scratch returns `finalization_ack_pending`; the ack slot alone does not block a later update. Plan D creates no tombstone list or per-ID acknowledgment key.
- The shipped unsolicited availability payload permits `is_prerelease`. Preserve its display version, normalize one leading `v` only for comparison, and never coerce malformed values. `update_available`, `update_not_available`, and `update_error` are discriminated and reduced separately.
- Legacy `perform_update` success creates only `legacy-reload-pending`, retains `pending_update`, and reloads. The fresh Worker runs capability/integrity verification. It creates no transaction ID, status poll, terminal phase, receipt, or transactional success announcement.
- Unsolicited update events use a dedicated reducer callback, not the serialized operation queue. An operation awaiting an unsolicited event can never block that event behind itself.
- Analyze routing is exactly: Plan E parse -> D acquire one main lease and gate that same lease -> Plan E persistence start -> Plan E sends the sanitized three-key action on that lease. Invalid metadata opens no port. Lease disconnect rejects without reconnect/reacquisition under the prior authorization.
- PowerShell never stops/waits on the live Host, mutates product files, edits packaged `host/config.json`, performs transaction/probe/finalization work, or writes registry keys directly. Python owns those operations. PowerShell may invoke the committed live `--register` only after the install callback returns the fixed registration-pending result.
- Installer intent is canonical JSON containing exactly `{"beta_channel_enabled":<boolean>}` in a wrapper-owned temporary directory outside package/install roots. It is supplied by a process-scoped environment path, removed in the same `finally`, and never becomes a package entry.
- Keep `host/updater.py` and the historical `Updater.apply_update` production route active through Tasks 1-12. Task 13 is the only cutover. It may run only after current-head Host, Worker, UI, installer, release, full-suite, TypeScript/build, and real frozen rebuild/staged-probe gates pass.
- Use TDD for every production task. Record named RED, GREEN, and restored mutation evidence in `.superpowers/sdd/hardening-d-runtime-installer-report.md`.
- Every Host/Python child gets fresh existing `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` directories before process start. Tests use injected ports, process controls, registry, clocks, probes, reload, storage, filesystem, and network adapters only.
- Do not touch the real registry, installed product, real AppData, live processes, browser registration, update network, release assets, or authenticated model sessions in automated verification.
- Do not version, install, publish, tag, push, create a release asset, or run a real self-update. Disposable-VM smoke remains a separate pre-release gate.
- Every standalone TypeScript check runs with `extension/` as working directory using exactly `npm exec tsc -- --noEmit -p tsconfig.json`.
- Every PowerShell block is self-contained and fail-fast. It initializes every variable it uses, checks native exit codes, and performs its own environment/temp cleanup in `finally`.
- Each task ends in one independently reviewable commit. Stage only the task's listed files and inspect the exact cached set before committing. Force-add ignored evidence only where explicitly required.

---

## Execution Precondition And Interface Ledger

### Current Planning Status

```text
PLAN_D_EXECUTION_STATUS=BLOCKED
PLAN_D_BLOCKER=prerequisite_implementations_and_plan_c_frozen_gate_not_yet_complete
```

This is an execution prerequisite, not an interface mismatch. The plan documents can be committed now, but Task 1 does not begin until A/B/C/E are implemented/reviewed/committed and Plan C's approval-gated PyInstaller 6.18.0 frozen gate is PASS. Do not provision PyInstaller or begin partial Plan D execution without explicit user approval.

### Exact Current A/B/C Interfaces

Plan D consumes these current symbols without aliases or adapters:

```python
# Plan A
from product_info import (
    PROVIDED_PROTOCOL_CAPABILITIES,
    REQUIRED_PROTOCOL_CAPABILITIES,
    VERSION,
    get_host_capabilities,
)
from package_archive import (
    ValidatedPackage,
    stage_and_validate_archive,
    validate_staged_package,
)
from package_manifest import load_update_manifest
from install_integrity import (
    InstallationVerification,
    InstallationVerifier,
    UpdateProbeResult,
)

# Plan B
from update_engine import UpdateEngine, UpdateEngineHooks
from update_journal import (
    generate_transaction_id,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
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
    create_windows_mutation_mutex,
)

# Plan C
from native_registration import (
    MainHostRuntime,
    RegistryBackend,
    WindowsRegistryBackend,
    register_main_host,
)
from update_platform import (
    CtypesWin32ProcessApi,
    ProcessAdapter,
    WindowsProcessAdapter,
)
from update_recovery import (
    FinalizationCursor,
    FinalizationFilesystem,
    FinalizationReceipt,
    RecoveryController,
    RunnerSource,
    acknowledge_update_finalization,
    create_production_recovery_controller,
    finalize_update_status,
    launch_active_recovery,
    launch_complete_update,
    require_no_pending_finalization,
    select_runner_source,
)
from update_status_host import (
    STATUS_MAX_REQUEST_BYTES,
    project_update_status,
    serve_status_host,
)
```

Freeze signatures:

```text
validate_staged_package(stage_root: Path, *, expected_version: str | None = None) -> ValidatedPackage
stage_and_validate_archive(archive_path: Path, stage_root: Path, *, expected_version: str | None = None) -> ValidatedPackage
InstallationVerifier(install_root: Path, *, frozen: bool | None = None).verify() -> InstallationVerification
parse_transaction_id(value: object) -> str
generate_transaction_id(random_bytes: Callable[[int], bytes] = secrets.token_bytes) -> str
TransactionPaths.for_install(install_root: Path, transaction_id: object) -> TransactionPaths
UpdateEngine(install_root: Path, *, mutex_factory: Callable[[Path], MutationMutex], hooks: UpdateEngineHooks)
UpdateEngine.create_prepared(package: ValidatedPackage, transaction_id: str, *, expected_version: str | None, prior_version: str | None, initiator: UpdateInitiator) -> UpdateJournal
UpdateEngine.activate_prepared(transaction_id: str, process_identity: InitiatingProcessIdentity | None) -> UpdateJournal
UpdateEngine.resume(transaction_id: str) -> UpdateJournal
UpdateEngine.rollback(transaction_id: str, failure_code: JournalReason) -> UpdateJournal
UpdateEngine.finalize_terminal_evidence(transaction_id: str) -> bool
ProcessAdapter.capture_current_identity(expected_executable: Path) -> InitiatingProcessIdentity
ProcessAdapter.launch_detached(executable: Path, args: Sequence[str], cwd: Path) -> InitiatingProcessIdentity
RecoveryController.preflight_prepared_target(transaction_id: str) -> UpdateProbeResult
RecoveryController.prepare_recovery_runtime(transaction_id: str, runner_source: Path, registry: RegistryBackend | None) -> Path
RecoveryController.run_complete_update(transaction_id: str, process_identity: InitiatingProcessIdentity) -> UpdateJournal
RecoveryController.run_installer_update(transaction_id: str) -> UpdateJournal
RecoveryController.wait_until_ready(transaction_id: str, process_identity: InitiatingProcessIdentity, timeout_seconds: float) -> UpdateJournal
RecoveryController.recover_active() -> UpdateJournal
RecoveryController.recover_journal(journal_path: Path) -> UpdateJournal
launch_complete_update(process: ProcessAdapter, recovery_root: Path, paths: TransactionPaths, process_identity: InitiatingProcessIdentity) -> InitiatingProcessIdentity
launch_active_recovery(process: ProcessAdapter, install_root: Path) -> InitiatingProcessIdentity
project_update_status(journal: UpdateJournal) -> dict[str, object]
serve_status_host(input_stream: BinaryIO, output_stream: BinaryIO, install_root: Path, journal_reader: Callable[[Path], UpdateJournal] = read_journal) -> int
finalize_update_status(install_root: Path, transaction_id: str, registry: RegistryBackend, engine_factory: Callable[[Path], UpdateEngine], *, filesystem: FinalizationFilesystem | None = None, mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex) -> FinalizationReceipt
acknowledge_update_finalization(install_root: Path, transaction_id: str, *, filesystem: FinalizationFilesystem | None = None, mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex) -> bool
require_no_pending_finalization(install_root: Path, *, filesystem: FinalizationFilesystem | None = None, mutex_factory: Callable[[Path], MutationMutex] = create_windows_mutation_mutex) -> None
```

Exact durable fields:

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
class FinalizationReceipt:
    transaction_id: str
    outcome: str
    terminal_version: TerminalVersion
    state: str = "finalized-awaiting-ack"

@dataclass(frozen=True)
class FinalizationCursor:
    transaction_id: str
    outcome: str
    terminal_version: TerminalVersion
    state: str
```

`TransactionPaths` has no recovery-root field. Stable active state is `<install>/updates/active.json`; reusable recovery is its sibling `<install>/updates/recovery`. Status registration names `com.dynamics.helper.update_status` and launches exactly `<install>/updates/recovery/dh_update_status_host.exe` with the allowlisted Chrome origin and optional decimal parent-window argument. Browser activation launches `<install>/updates/recovery/dh_update_runner.exe --complete-update <id> <pid> <creation-token>` with canonical `<install>/updates/transactions/<id>` as `cwd`; startup recovery launches the same runner with `--recover-active` and the active-derived matching transaction root as `cwd`. Neither browser argv nor inherited cwd supplies a path or ID.

### Exact Current Plan E Interfaces

Plan D imports these from their Plan E-owned files and leaves their implementation/tests intact:

```ts
import {
    guardNonAnalyzeNativeMessage,
    handleAnalyzeRequest,
    type NonAnalyzeNativeMessageDecision,
    type AnalyzeRequestHandlerDeps,
    type AuthorizedAnalyzeTransport,
} from './analyzeRequestHandler'
import type {
    AnalyzeForwardResponse,
    AnalyzeNativeAction,
} from './analyzeBridge'
import { isAnalyzePayload } from './analyzeBridge'
import {
    handleNativeUpdateError,
    normalizeNativeUpdateError,
    type NativeUpdateErrorDeliveryDeps,
    type NativeUpdateErrorEvent,
} from '../utils/nativeUpdateError'

export interface AuthorizedAnalyzeTransport {
    send(forwarded: AnalyzeNativeAction): Promise<unknown>
}

export interface AnalyzeRequestHandlerDeps {
    acquireAuthorizedTransport(
        forwarded: Readonly<AnalyzeNativeAction>,
    ): Promise<
        | { allowed: false; response: AnalyzeForwardResponse }
        | { allowed: true; transport: AuthorizedAnalyzeTransport }
    >
}

export async function handleAnalyzeRequest(
    inner: unknown,
    deps: AnalyzeRequestHandlerDeps,
): Promise<AnalyzeForwardResponse>

export function guardNonAnalyzeNativeMessage(
    inner: unknown,
): NonAnalyzeNativeMessageDecision

export function normalizeNativeUpdateError(value: unknown): NativeUpdateErrorEvent
export function handleNativeUpdateError(
    raw: unknown,
    deps: NativeUpdateErrorDeliveryDeps,
): Promise<void>
```

Plan E's `AnalyzeNativeAction` has exactly `action`, `requestId`, and `payload`; its parser/persistence tests remain authoritative. D's provider receives the already frozen sanitized action, acquires/gates one lease, and returns a transport that captures that lease. Every non-Analyze message first calls `guardNonAnalyzeNativeMessage`; a denial returns before lease acquisition and ordinary allowed objects retain identity.

### Self-Contained Preflight

Run only after the A/B/C/E implementation/evidence and Plan C frozen gate prerequisites above are complete:

```powershell
$ErrorActionPreference='Stop'
$plans=@(
  'docs/superpowers/plans/2026-07-18-hardening-a-package-integrity.md',
  'docs/superpowers/plans/2026-07-18-hardening-b-journal-engine.md',
  'docs/superpowers/plans/2026-07-18-hardening-c-detached-recovery.md',
  'docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md',
  'docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md'
)
if (@(git status --porcelain=v1).Count -ne 0) { throw 'Plan D requires a clean worktree/index' }
foreach ($plan in $plans) {
  & git ls-files --error-unmatch -- $plan | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Reviewed plan is not committed: $plan" }
}
$reports=@(
  '.superpowers/sdd/package-integrity-plan-a-report.md',
  '.superpowers/sdd/hardening-b-journal-engine-report.md',
  '.superpowers/sdd/hardening-c-detached-recovery-report.md',
  '.superpowers/sdd/plan-e-extension-hardening-report.md'
)
foreach ($report in $reports) {
  & git cat-file -e "HEAD:$report"
  if ($LASTEXITCODE -ne 0) { throw "Committed prerequisite evidence missing: $report" }
}
$cReport=& git show 'HEAD:.superpowers/sdd/hardening-c-detached-recovery-report.md'
if ($LASTEXITCODE -ne 0) { throw 'Could not read Plan C evidence' }
if ($cReport -notmatch '(?m)^PLAN_C_FROZEN_GATE_STATUS=PASS\r?$') {
  throw 'Plan C committed frozen status is not PASS'
}
$requiredProducts=@(
  'host/package_archive.py',
  'host/update_engine.py',
  'host/update_recovery.py',
  'extension/src/background/analyzeRequestHandler.ts',
  'extension/src/utils/nativeUpdateError.ts'
)
foreach ($path in $requiredProducts) {
  & git cat-file -e "HEAD:$path"
  if ($LASTEXITCODE -ne 0) { throw "Committed prerequisite product missing: $path" }
}

$profileRoot=Join-Path ([IO.Path]::GetTempPath()) ('dh-plan-d-preflight-' + [guid]::NewGuid().ToString('N'))
$envNames=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH')
$savedEnv=@{}
try {
  New-Item -ItemType Directory -Path $profileRoot | Out-Null
  foreach ($name in $envNames) {
    $savedEnv[$name]=[Environment]::GetEnvironmentVariable($name,'Process')
  }
  foreach ($name in $envNames[0..5]) {
    $value=Join-Path $profileRoot $name.ToLowerInvariant()
    New-Item -ItemType Directory -Path $value | Out-Null
    [Environment]::SetEnvironmentVariable($name,$value,'Process')
  }
  $env:PYTHONPATH='.;host'
  $versionOutput=@(& 'host/venv/Scripts/python.exe' -m PyInstaller --version 2>&1)
  $versionExit=$LASTEXITCODE
  $version=($versionOutput -join "`n").Trim()
  if ($versionExit -ne 0 -or $version -ne '6.18.0') {
    throw "PyInstaller module preflight is not exact 6.18.0: $version"
  }
  $pythonProbe=@'
import inspect
from install_integrity import InstallationVerifier
from package_archive import stage_and_validate_archive, validate_staged_package
from update_engine import UpdateEngine
from update_journal import InitiatingProcessIdentity, TerminalVersion, TransactionPaths, generate_transaction_id, parse_terminal_version, parse_transaction_id
from update_platform import ProcessAdapter
from update_recovery import FinalizationCursor, FinalizationReceipt, RecoveryController, acknowledge_update_finalization, finalize_update_status, launch_active_recovery, launch_complete_update, require_no_pending_finalization
from update_status_host import project_update_status, serve_status_host

expected_parameters = {
    validate_staged_package: ('stage_root', 'expected_version'),
    stage_and_validate_archive: ('archive_path', 'stage_root', 'expected_version'),
    UpdateEngine.create_prepared: ('self', 'package', 'transaction_id', 'expected_version', 'prior_version', 'initiator'),
    UpdateEngine.activate_prepared: ('self', 'transaction_id', 'process_identity'),
    UpdateEngine.resume: ('self', 'transaction_id'),
    UpdateEngine.rollback: ('self', 'transaction_id', 'failure_code'),
    UpdateEngine.finalize_terminal_evidence: ('self', 'transaction_id'),
    RecoveryController.preflight_prepared_target: ('self', 'transaction_id'),
    RecoveryController.prepare_recovery_runtime: ('self', 'transaction_id', 'runner_source', 'registry'),
    RecoveryController.run_complete_update: ('self', 'transaction_id', 'process_identity'),
    RecoveryController.run_installer_update: ('self', 'transaction_id'),
    RecoveryController.wait_until_ready: ('self', 'transaction_id', 'process_identity', 'timeout_seconds'),
    finalize_update_status: ('install_root', 'transaction_id', 'registry', 'engine_factory', 'filesystem', 'mutex_factory'),
    acknowledge_update_finalization: ('install_root', 'transaction_id', 'filesystem', 'mutex_factory'),
    require_no_pending_finalization: ('install_root', 'filesystem', 'mutex_factory'),
    launch_complete_update: ('process', 'recovery_root', 'paths', 'process_identity'),
    launch_active_recovery: ('process', 'install_root'),
    project_update_status: ('journal',),
    serve_status_host: ('input_stream', 'output_stream', 'install_root', 'journal_reader'),
}
for symbol, expected in expected_parameters.items():
    actual = tuple(inspect.signature(symbol).parameters)
    assert actual == expected, (symbol.__qualname__, actual, expected)
    print(symbol.__qualname__, inspect.signature(symbol))
assert tuple(InitiatingProcessIdentity.__dataclass_fields__) == ('pid', 'creation_token')
assert tuple(TerminalVersion.__dataclass_fields__) == ('version', 'fresh_install')
assert tuple(FinalizationReceipt.__dataclass_fields__) == ('transaction_id', 'outcome', 'terminal_version', 'state')
assert tuple(FinalizationCursor.__dataclass_fields__) == ('transaction_id', 'outcome', 'terminal_version', 'state')
assert 'recovery_root' not in TransactionPaths.__dataclass_fields__
assert tuple(inspect.signature(parse_transaction_id).parameters) == ('value',)
assert tuple(inspect.signature(generate_transaction_id).parameters) == ('random_bytes',)
assert tuple(inspect.signature(parse_terminal_version).parameters) == ('value',)
assert tuple(inspect.signature(ProcessAdapter.capture_current_identity).parameters) == ('self', 'expected_executable')
assert tuple(inspect.signature(ProcessAdapter.launch_detached).parameters) == ('self', 'executable', 'args', 'cwd')
assert tuple(inspect.signature(InstallationVerifier).parameters) == ('install_root', 'frozen')
'@
  & 'host/venv/Scripts/python.exe' -c $pythonProbe
  if ($LASTEXITCODE -ne 0) { throw 'A/B/C interface probe failed' }
  & 'host/venv/Scripts/python.exe' -c 'import release_helper; release_helper.build_host()'
  if ($LASTEXITCODE -ne 0) { throw 'Prerequisite current-head frozen rebuild failed' }
  & 'host/venv/Scripts/python.exe' -c "from pathlib import Path; from update_recovery import inventory_onedir; root=Path('dist/dh_native_host').resolve(strict=True); value=inventory_onedir(root); assert (root/'dh_native_host.exe').is_file() and value.internal_files"
  if ($LASTEXITCODE -ne 0) { throw 'Prerequisite current-head onedir inventory failed' }
  & 'host/venv/Scripts/python.exe' -c "from pathlib import Path; required=('early_cli','install_integrity','native_messaging','native_registration','package_archive','package_manifest','product_info','update_engine','update_entrypoint','update_journal','update_mutex','update_ownership','update_platform','update_recovery','update_status_host'); text=Path('build/dh_native_host/xref-dh_native_host.html').read_text(encoding='utf-8'); missing=[name for name in required if name not in text]; assert not missing, missing; print('Plan C module graph complete')"
  if ($LASTEXITCODE -ne 0) { throw 'Prerequisite current-head module graph failed' }
  $savedFrozen=[Environment]::GetEnvironmentVariable('DH_PLAN_C_FROZEN_ONEDIR','Process')
  try {
    $env:DH_PLAN_C_FROZEN_ONEDIR=(Resolve-Path -LiteralPath 'dist/dh_native_host').Path
    $frozenProbe=@(& 'host/venv/Scripts/python.exe' -m unittest host.test_update_recovery.FrozenStagedProbeIntegrationTests -v 2>&1)
    $frozenProbeExit=$LASTEXITCODE
    $frozenProbeText=$frozenProbe -join [Environment]::NewLine
    $frozenProbe
    if (
      $frozenProbeExit -ne 0
      -or $frozenProbeText -notmatch 'Ran 1 test'
      -or $frozenProbeText -notmatch '(?m)^OK\r?$'
      -or $frozenProbeText -match '(?i)skipped'
    ) { throw 'Prerequisite real frozen staged-target probe failed, skipped, or did not run exactly one test' }
  } finally {
    [Environment]::SetEnvironmentVariable('DH_PLAN_C_FROZEN_ONEDIR',$savedFrozen,'Process')
  }
} finally {
  foreach ($name in $envNames) {
    [Environment]::SetEnvironmentVariable($name,$savedEnv[$name],'Process')
  }
  if (Test-Path -LiteralPath $profileRoot) {
    Remove-Item -LiteralPath $profileRoot -Recurse -Force
  }
}

$tsProbePath='extension/src/planDInterfaceProbe.ts'
if (Test-Path -LiteralPath $tsProbePath) { throw 'TypeScript interface probe path already exists' }
$tsProbe=@'
import {
    guardNonAnalyzeNativeMessage,
    handleAnalyzeRequest,
    type NonAnalyzeNativeMessageDecision,
    type AnalyzeRequestHandlerDeps,
    type AuthorizedAnalyzeTransport,
} from './background/analyzeRequestHandler'
import {
    type AnalyzeForwardResponse,
    type AnalyzeNativeAction,
    isAnalyzePayload,
} from './background/analyzeBridge'
import {
    handleNativeUpdateError,
    normalizeNativeUpdateError,
    type NativeUpdateErrorDeliveryDeps,
    type NativeUpdateErrorEvent,
} from './utils/nativeUpdateError'

const handler: (inner: unknown, deps: AnalyzeRequestHandlerDeps) => Promise<AnalyzeForwardResponse> = handleAnalyzeRequest
const guard: (inner: unknown) => NonAnalyzeNativeMessageDecision = guardNonAnalyzeNativeMessage
const normalizer: (value: unknown) => NativeUpdateErrorEvent = normalizeNativeUpdateError
const delivery: (raw: unknown, deps: NativeUpdateErrorDeliveryDeps) => Promise<void> = handleNativeUpdateError
const detector: (payload: unknown) => boolean = isAnalyzePayload
const transport: AuthorizedAnalyzeTransport = {
    send: async (_forwarded: AnalyzeNativeAction): Promise<unknown> => undefined,
}
void [handler, guard, normalizer, delivery, detector, transport]
'@
try {
  [IO.File]::WriteAllText(
    (Join-Path (Get-Location) $tsProbePath),
    $tsProbe + "`n",
    [Text.UTF8Encoding]::new($false)
  )
  Push-Location -LiteralPath 'extension'
  try {
    & npm exec tsc -- --noEmit -p tsconfig.json
    if ($LASTEXITCODE -ne 0) { throw 'Plan E interface probe failed' }
  } finally { Pop-Location }
} finally {
  if (Test-Path -LiteralPath $tsProbePath) { Remove-Item -LiteralPath $tsProbePath -Force }
}

$base=(& git rev-parse HEAD).Trim()
if ($base -notmatch '^[0-9a-f]{40}$') { throw 'Invalid Plan D base' }
if (Test-Path -LiteralPath '.superpowers/sdd/plan-d-base.txt') { throw 'Plan D base evidence already exists' }
New-Item -ItemType Directory -Path '.superpowers/sdd' -Force | Out-Null
[IO.File]::WriteAllText(
  (Join-Path (Get-Location) '.superpowers/sdd/plan-d-base.txt'),
  $base + "`n",
  [Text.UTF8Encoding]::new($false)
)
```

Expected: clean committed prerequisites, all four reports present, Plan C frozen and real-probe evidence PASS, ignored immutable base file written, and exact version output `6.18.0`. Any other result is `BLOCKED`; do not continue partially.

## File Map

| File | Change | Responsibility |
|---|---|---|
| `host/run_isolated_python.ps1` | Create | Fresh six-variable Python process wrapper. |
| `host/test_isolated_python.py` | Create | `IsolatedPythonLauncherTests`. |
| `host/update_service.py` | Create | Dormant browser prepare/activate/finalize facade over exact A/B/C APIs. |
| `host/test_update_service.py` | Create | `UpdateServicePreparationTests`, `UpdateServiceActivationTests`, `UpdateServiceFinalizationTests`, `StartupRecoveryTests`. |
| `host/update_installer.py` | Create | Synchronous installer transaction, process control, intent, registration-resume, verification/finalization. |
| `host/test_update_installer.py` | Create | `InstallIntentTests`, `InstallerProcessOwnershipTests`, `InstallerTransactionTests`, `InstallerRegistrationResumeTests`. |
| `host/update_entrypoint.py` | Modify | Bind Plan D install callback and post-registration finalizer without changing Plan C command grammar/dependency fields. |
| `host/dh_native_host.py` | Modify | Dormant action builder/startup recovery first; final action/capability cutover only in Task 13. |
| `host/test_update_actions.py` | Create | `UpdateActionParserTests`, `UpdateActionDispatchTests`, `UpdateActivationFlushTests`, `UpdateCutoverTests`. |
| `extension/src/background/nativePortClient.ts` | Create | Named clients and immutable non-rebinding port leases. |
| `extension/src/background/nativePortClient.test.ts` | Create | `NativePortClient` and `NativePortLease` suites. |
| `extension/src/background/hostGate.ts` | Create | Per-lease capability/integrity/expected-version gate and Analyze provider composition. |
| `extension/src/background/hostGate.test.ts` | Create | `HostGate` and `AuthorizedAnalyzeTransportProvider` suites. |
| `extension/src/background/updateProtocol.ts` | Create | Strict availability, runtime-state, status, receipt, finalization, and UI protocols. |
| `extension/src/background/updateProtocol.test.ts` | Create | `UpdateProtocol` suite. |
| `extension/src/background/updateCoordinator.ts` | Create | Sole operation state machine plus independent unsolicited event reducer. |
| `extension/src/background/updateCoordinator.test.ts` | Create | `UpdateCoordinatorNonterminal`, `UpdateCoordinatorTerminal`, and `LegacyUpdateFlow` suites. |
| `extension/src/background/serviceWorker.ts` | Modify | Composition only: startup gate, Plan E Analyze handler, protected calls, coordinator requests/events. |
| `extension/src/background/serviceWorker.update.test.ts` | Create | `ServiceWorkerUpdateRuntime` suite without importing the side-effectful worker for Analyze unit behavior. |
| `extension/src/test/chromeMock.ts` | Modify | Named ports/leases, startup/install lifecycle, manifest version, reload, and storage-failure controls. |
| `extension/src/content/index.tsx` | Modify | Typed coordinator state bridge only after UI conversion. |
| `extension/src/content/updateStateBridge.ts` | Create | Pure typed coordinator event-to-DOM boundary with descriptor-safe validation. |
| `extension/src/content/updateStateBridge.test.ts` | Create | `UpdateStateBridge` valid/malformed/accessor/proxy tests. |
| `extension/src/components/Options.tsx` | Modify | Typed update client and gate-failure hydration suppression. |
| `extension/src/components/Options.update.test.tsx` | Create | `OptionsUpdateClient` suite. |
| `extension/src/components/Options.test.tsx` | Modify | Replace only obsolete Plan E baseline update-error listener expectations with typed coordinator expectations. |
| `extension/src/components/FAB.tsx` | Modify | Typed update client/one-time announcement only. |
| `extension/src/components/FAB.update.test.tsx` | Create | `FabUpdateClient` suite. |
| `extension/src/components/FAB.spinner.test.tsx` | Modify | Replace only obsolete Plan E baseline update-error listener expectations; retain all Analyze regressions. |
| `extension/src/utils/translations.ts` | Modify | Fixed localized update/gate/recovery/legacy messages. |
| `installer_core.ps1` | Modify | Invoke staged Python install mode and committed live registration only. |
| `dyhelper_installer.ps1` | Modify | Download/extract, external intent, core invocation, and same-block cleanup only. |
| `install.bat` | Modify | Preserve installer result. |
| `test_installer_scripts.py` | Create | `InstallerScriptContractTests`. |
| `release_helper.py` | Modify | Add dormant D hidden imports and preserve Plan A staging/hash authority. |
| `host/test_release_helper.py` | Modify | `PlanDPackagingTests` plus existing Plan A/C classes. |
| `host/product_info.py` | Modify in Task 13 only | Advertise transactional capability at final cutover. |
| `host/test_product_info.py`, `host/test_package_manifest.py`, `host/test_package_archive.py`, `host/test_install_integrity.py`, `host/test_early_cli.py`, `host/test_host_integrity_actions.py`, `host/test_release_helper.py` | Modify in Task 13 only | Lock exact post-cutover capability tuple and generated/probe contracts. |
| `host/updater.py` | Retain | Historical first-upgrade code, unimported after Task 13. |
| `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `USER_GUIDE.md`, `README.md`, `docs/session-handoff-2026-07-15.md`, `releases/notes-prompt-scope-cleanup-draft.md` | Modify | Final runtime, installer, recovery, legacy-risk, and release-gate contracts. |
| `.superpowers/sdd/hardening-d-runtime-installer-report.md` | Create | Actual RED/GREEN/mutation/frozen/scope evidence; force-add in Task 14. |

Plan E-owned `extension/src/utils/nativeUpdateError.ts`, `nativeUpdateError.test.ts`, `background/analyzeRequestHandler.ts`, `analyzeRequestHandler.test.ts`, and `analyzeBridge.ts` are consumed and rerun, not created or redefined by D. No checked `*.spec` file is added.

---

### Task 1: Add The Reusable Six-Variable Python Harness

**Files:**
- Create: `host/run_isolated_python.ps1`
- Create: `host/test_isolated_python.py`

**Interfaces:**
- Produces: `run_isolated_python.ps1 [-HostPath] <python arguments>`; each invocation creates six distinct existing directories, starts exactly one child, restores caller environment, removes only its own root, and returns the child exit code.

- [ ] **Step 1: Write launcher RED tests**

Create `IsolatedPythonLauncherTests` that invokes the script from a parent environment containing sentinel values. Child code writes the six values and existence flags to a test-owned output path. Cover successful exit, exit 23 propagation, paths with spaces, `-HostPath` producing `PYTHONPATH=.;host`, default removal of `PYTHONPATH`, caller restoration, and root removal after child exit.

- [ ] **Step 2: Run RED in a manually isolated process**

```powershell
$ErrorActionPreference='Stop'
$root=Join-Path ([IO.Path]::GetTempPath()) ('dh-plan-d-harness-red-' + [guid]::NewGuid().ToString('N'))
$names=@('LOCALAPPDATA','APPDATA','USERPROFILE','HOME','TEMP','TMP','PYTHONPATH')
$saved=@{}
try {
  New-Item -ItemType Directory -Path $root | Out-Null
  foreach ($name in $names) { $saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
  foreach ($name in $names[0..5]) {
    $value=Join-Path $root $name.ToLowerInvariant()
    New-Item -ItemType Directory -Path $value | Out-Null
    [Environment]::SetEnvironmentVariable($name,$value,'Process')
  }
  $env:PYTHONPATH='.;host'
  & 'host/venv/Scripts/python.exe' -m unittest host.test_isolated_python -v
  if ($LASTEXITCODE -eq 0) { throw 'Harness RED unexpectedly passed' }
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') }
  if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
```

Expected: named tests execute and fail because `host/run_isolated_python.ps1` is absent.

- [ ] **Step 3: Implement the launcher**

The script must use `$PSScriptRoot\venv\Scripts\python.exe`, allocate one GUID root under the caller's current `TEMP`, create six children, optionally set `PYTHONPATH='.;host'`, invoke Python with the untouched remaining argv array, capture `$LASTEXITCODE`, and restore/delete in `finally`. It must end with `exit $childExit`; no cleanup command depends on a later shell.

- [ ] **Step 4: Run GREEN and mutation**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_isolated_python -v`

Expected: `OK`. Temporarily omit `TMP` creation; `test_child_receives_six_existing_directories` must fail. Restore and rerun GREEN.

- [ ] **Step 5: Commit exact files**

```powershell
$ErrorActionPreference='Stop'
git add -- host/run_isolated_python.ps1 host/test_isolated_python.py
if ($LASTEXITCODE -ne 0) { throw 'Task 1 staging failed' }
$actual=@(git diff --cached --name-only | Sort-Object)
$expected=@('host/run_isolated_python.ps1','host/test_isolated_python.py') | Sort-Object
if (Compare-Object $actual $expected) { throw 'Task 1 cached set mismatch' }
git commit -m 'test(host): isolate plan d Python processes'
if ($LASTEXITCODE -ne 0) { throw 'Task 1 commit failed' }
```

### Task 2: Build The Dormant Browser Update Service On Exact A/B/C APIs

**Files:**
- Create: `host/update_service.py`
- Create: `host/test_update_service.py`

**Interfaces:**
- Consumes: exact A/B/C ledger, injected package loader, `UpdateEngine`, `RecoveryController`, `ProcessAdapter`, registry, and one shared mutex/engine factory.
- Produces: `PreparedUpdate`, `ActivatedUpdate`, `UpdateServiceDependencies`, `UpdateService.prepare`, `activate`, `finalize`, `acknowledge`, and `launch_startup_recovery_if_needed`.

```python
class UpdatePackageSource(Protocol):
    def open_validated(
        self,
        url: str,
        expected_version: str,
    ) -> AbstractContextManager[ValidatedPackage]:
        raise AssertionError("package source protocol")

@dataclass(frozen=True)
class UpdateServiceDependencies:
    install_root: Path
    current_runtime_root: Path
    packages: UpdatePackageSource
    engine: UpdateEngine
    controller: RecoveryController
    process: ProcessAdapter
    registry: RegistryBackend
    engine_factory: Callable[[Path], UpdateEngine]
    mutex_factory: Callable[[Path], MutationMutex]

@dataclass(frozen=True)
class PreparedUpdate:
    state: Literal["update_prepared"]
    transaction_id: str
    target_version: str
    prior_version: str

@dataclass(frozen=True)
class ActivatedUpdate:
    state: Literal["update_activated"]
    transaction_id: str

class StartupRecoveryResult(StrEnum):
    CONTINUE = "continue"
    RECOVERY_LAUNCHED = "recovery-launched"
    MANUAL_RECOVERY_REQUIRED = "manual-recovery-required"

class UpdateService:
    def require_start_ready(self) -> None:
        raise AssertionError("update start readiness interface")

    def prepare(
        self,
        url: str,
        transaction_id: str,
        expected_version: str,
    ) -> PreparedUpdate:
        raise AssertionError("update service interface")

    def activate(self, transaction_id: str) -> ActivatedUpdate:
        raise AssertionError("update service interface")

    def finalize(self, transaction_id: str) -> FinalizationReceipt:
        raise AssertionError("update service interface")

    def acknowledge(self, transaction_id: str) -> bool:
        raise AssertionError("update service interface")

def create_update_service(
    install_root: Path,
    current_runtime_root: Path,
) -> UpdateService:
    raise AssertionError("production composition interface")

def launch_startup_recovery_if_needed(
    install_root: Path,
    process: ProcessAdapter,
) -> StartupRecoveryResult:
    raise AssertionError("startup recovery interface")
```

- [ ] **Step 1: Write preparation/finalization RED tests**

`UpdateServicePreparationTests` must prove strict nonempty HTTPS URL, exact selected target, exact browser ID, `create_prepared(package,id,expected_version=target,prior_version=VERSION,initiator=BROWSER)`, Plan B probe-manifest equality, `select_runner_source(RunnerSource.CURRENT,current_root,paths.staged_host)`, and exactly one `controller.prepare_recovery_runtime(id,source,registry)`. Snapshot install/user/main-registration paths before/after and allow only Plan B workspace plus Plan C recovery/status preparation changes. Same-ID retry may redownload into a new temporary package context; Plan B accepts it only when candidate ownership bytes, expected/target/prior versions, and initiator exactly match persisted authority. The test asserts one new isolated download and no duplicate live/recovery mutation, rather than inventing a cache.

Before URL validation, package opening, temporary download creation, or `engine.create_prepared`, both `require_start_ready()` and `prepare()` call Plan C `require_no_pending_finalization(install_root, mutex_factory=deps.mutex_factory)`. A pending cursor returns fixed `finalization_ack_pending` with zero package/transaction/recovery events. The double check closes the gap between the Worker's readiness probe and Host prepare. The fixed ack slot alone passes. Add a race test where readiness succeeds, a cursor appears, then `prepare` rejects before package open.

`UpdateServiceFinalizationTests` assert direct calls to current C signatures, same mutex factory in `engine_factory`/finalization, exact receipt replay, nested fresh-rollback terminal version, acknowledgment `True` replay, and wrong ID `finalization_not_current`. Inspect source and forbid direct receipt/cursor/workspace mutation and lower C primitive imports.

- [ ] **Step 2: Write activation/startup RED tests**

`UpdateServiceActivationTests` assert order:

```text
parse ID -> resolve TransactionPaths -> validate prepared browser journal/recovery
-> capture_current_identity(<install>/dh_native_host.exe)
-> launch_complete_update(process,recovery_root,paths,identity)
-> wait_until_ready(id,identity,timeout_seconds=30.0)
-> return update_activated
```

Require complete identity equality and canonical `paths.transaction_root` passed by Plan C's launch helper. A launch/readiness failure returns no activation result. `StartupRecoveryTests` prove absent/prepared/terminal returns `CONTINUE`; post-ready nonterminal calls only `launch_active_recovery(process,install_root)` before SDK/config construction and returns `RECOVERY_LAUNCHED`; manual recovery-required returns `MANUAL_RECOVERY_REQUIRED` without launching or invoking the engine. Malformed active/journal state fails closed with the manual result and fixed diagnostics only.

- [ ] **Step 3: Run RED**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_service -v`

Expected: missing `update_service`.

- [ ] **Step 4: Implement exact high-level composition**

`require_start_ready` calls only Plan C's barrier. `prepare` repeats that barrier first, then uses a production `UpdatePackageSource` context that creates a fresh canonical temporary root under isolated `TEMP`, proves it is outside the install/updates trees, downloads only the validated HTTPS URL to a fixed archive child, and calls Plan A `stage_and_validate_archive(archive, stage, expected_version=expected_version)`. Cleanup runs in the context's `finally`. It then calls Plan B `create_prepared`, strict `load_update_manifest(paths.probe_manifest) == package.manifest`, and only C `prepare_recovery_runtime`. It never calls C tree/registration primitives.

`activate` creates one `InitiatingProcessIdentity` through the injected Plan C process adapter and passes that same object to launch/readiness. `finalize` returns C's `FinalizationReceipt` unchanged. `acknowledge` returns C's boolean unchanged. Safe `UpdateServiceError` constructors accept only allowlisted fixed codes; raw URL, path, Native value, and exception text never cross the wire.

- [ ] **Step 5: Run GREEN and restored mutations**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_service host.test_update_recovery.StagedHostPreflightTests host.test_update_recovery.FinalizationTests -v`

Expected: `OK`. Mutate browser initiator to installer; preparation test fails. Mutate activation to pass only `identity.pid`; type/order test fails. Mutate preparation to call `install_recovery_tree`; static ownership test fails. Restore each and rerun GREEN.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- host/update_service.py host/test_update_service.py
if ($LASTEXITCODE -ne 0) { throw 'Task 2 staging failed' }
$actual=@(git diff --cached --name-only | Sort-Object)
$expected=@('host/test_update_service.py','host/update_service.py') | Sort-Object
if (Compare-Object $actual $expected) { throw 'Task 2 cached set mismatch' }
git commit -m 'feat(update): add dormant runtime update service'
if ($LASTEXITCODE -ne 0) { throw 'Task 2 commit failed' }
```

### Task 3: Add Dormant Host Action Parsing, Flush Handshake, And Startup Recovery

**Files:**
- Modify: `host/dh_native_host.py`
- Create: `host/test_update_actions.py`
- Modify: `host/test_early_update_dispatch.py`

**Interfaces:**
- Produces pure `parse_update_action(action,payload)`, `build_transactional_update_response(service,action,payload,request_id) -> UpdateDispatchResult`, and `flush_update_response(host,result)`. Production `process_message` still uses `Updater.apply_update` until Task 13.

```python
@dataclass(frozen=True)
class ParsedPerformUpdate:
    url: str
    transaction_id: str
    target_version: str

@dataclass(frozen=True)
class ParsedTransactionAction:
    transaction_id: str

@dataclass(frozen=True)
class ParsedUpdateReadinessAction:
    pass

ParsedUpdateAction = (
    ParsedPerformUpdate
    | ParsedTransactionAction
    | ParsedUpdateReadinessAction
)

@dataclass(frozen=True)
class UpdateDispatchResult:
    response: dict[str, object]
    stop_after_flush: bool

def parse_update_action(
    action: object,
    payload: object,
) -> ParsedUpdateAction:
    raise AssertionError("update action parser interface")

def build_transactional_update_response(
    service: UpdateService,
    action: str,
    payload: object,
    request_id: object,
) -> UpdateDispatchResult:
    raise AssertionError("update dispatch interface")

def flush_update_response(
    host: NativeHost,
    result: UpdateDispatchResult,
) -> None:
    raise AssertionError("strict flush interface")
```

Allowed wire error codes are exactly `invalid_update_request`, `update_prepare_failed`, `update_transaction_mismatch`, `update_activation_failed`, `update_not_terminal`, `update_cleanup_failed`, `finalization_ack_pending`, and `finalization_not_current`; wire text is selected from a fixed map and never from exception text. Map Plan C errors exhaustively: `transaction_not_terminal -> update_not_terminal`; `active_transaction_mismatch`, `invalid_finalization_receipt`, `invalid_finalization_cursor`, `invalid_finalization_acknowledgment`, `finalization_cleanup_failed`, `finalization_cleanup_incomplete`, and `finalization_record_round_trip_failed -> update_cleanup_failed`; `finalization_ack_pending -> finalization_ack_pending`; `finalization_not_current -> finalization_not_current`. The Host never consults browser markers. Coordinator acknowledgment replay is success only when Plan C `acknowledge_update_finalization(install_root, transaction_id)` returns `True`. Tests compare the mapping keys to every current Plan C `FinalizationError._ALLOWED` member and fail if either side drifts.

Exact payloads and success data:

```json
{"action":"check_update_ready","payload":{}}
{"state":"update_ready"}
{"action":"perform_update","payload":{"url":"https://example.invalid/release.zip","transactionId":"0123456789abcdef0123456789abcdef","targetVersion":"2.0.75"}}
{"state":"update_prepared","transactionId":"0123456789abcdef0123456789abcdef","targetVersion":"2.0.75","priorVersion":"2.0.74-beta.4"}
{"action":"activate_update","payload":{"transactionId":"0123456789abcdef0123456789abcdef"}}
{"state":"update_activated","transactionId":"0123456789abcdef0123456789abcdef"}
```

Finalization returns `receipt.to_dict()` exactly, including nested `terminal_version`. Acknowledgment returns exactly `{"transactionId":id,"acknowledged":true}` only when C returned `True`.

- [ ] **Step 1: Write action/flush/startup RED tests**

Test exact key sets/types, wrong/extra/missing values, safe error codes, no `asdict` scalarization of terminal version, wrong-ID finalization/ack rejection, and no double send. `check_update_ready` requires exact empty payload, invokes only `service.require_start_ready`, and returns fixed ready data; pending finalization maps to the fixed pending code before package/transaction calls. Activation order is service result -> strict response write -> strict flush success -> `running=False`; write/flush exception propagates to the dispatcher, leaves `running=True`, and records no activation acknowledgment.

Add source assertions that the production `perform_update` branch still imports/calls `Updater.apply_update`, `PROVIDED_PROTOCOL_CAPABILITIES` still omits `transactional-update-v1`, and the dormant builder is not reachable from `process_message` yet. Add early-startup subprocess tests proving `launch_startup_recovery_if_needed` runs after Plan C CLI dispatch but before logging, SDK, config, Native input, or update checks.

- [ ] **Step 2: Run RED**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_actions host.test_early_update_dispatch -v`

Expected: named action-builder/startup tests fail while historical routing assertions pass.

- [ ] **Step 3: Implement dormant helpers and startup seam**

Use exact built-in dict/string validation; do not reuse raw payload objects. Add `NativeHost.send_message_strict(message)`: it calls Plan C `write_message` directly on `getattr(self,'_native_output_stream',NATIVE_STDOUT)` and lets write/flush exceptions propagate. Keep existing best-effort `send_message` behavior for progress/legacy traffic. `flush_update_response` calls `send_message_strict` once and stops only after it returns for an activated result. Add startup recovery before `NativeHost` construction; it may launch fixed C recovery or block manual recovery, never run mutation engine code in the loaded live Host.

- [ ] **Step 4: Run GREEN/mutation**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_actions host.test_early_update_dispatch host.test_native_messaging -v`

Expected: `OK`, including the explicit assertion that legacy route/capability remain active. Move `running=False` before send; `UpdateActivationFlushTests` fails. Restore and rerun.

- [ ] **Step 5: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- host/dh_native_host.py host/test_update_actions.py host/test_early_update_dispatch.py
if ($LASTEXITCODE -ne 0) { throw 'Task 3 staging failed' }
git commit -m 'feat(native): prepare transactional action handshake'
if ($LASTEXITCODE -ne 0) { throw 'Task 3 commit failed' }
```

### Task 4: Extract Named Native Clients And Immutable Port Leases

**Files:**
- Create: `extension/src/background/nativePortClient.ts`
- Create: `extension/src/background/nativePortClient.test.ts`
- Modify: `extension/src/test/chromeMock.ts`

**Interfaces:**

```ts
export interface NativeRequest extends Record<string, unknown> {
    action: string
    requestId?: string
}

export interface NativePortLease {
    readonly hostName: string
    readonly portId: number
    readonly connected: boolean
    request<T>(message: NativeRequest): Promise<T>
    disconnect(): void
}

export interface NativePortClient {
    acquireLease(): NativePortLease
    disconnect(): void
}

export class NativePortDisconnectedError extends Error {}
export function createNativePortClient(
    hostName: string,
    hooks?: {
        onUnsolicited?: (lease: NativePortLease, value: unknown) => void
        onDisconnect?: (portId: number) => void
    },
): NativePortClient
```

- [ ] **Step 1: Write lease/client RED tests**

Extend the Chrome mock with queued named ports and explicit `emitMessage`/`emitDisconnect`. Test monotonically increasing `portId`, supplied request-ID preservation, generated IDs only when absent on eligible non-Analyze requests, duplicate active-ID rejection, response correlation, unsolicited routing with originating lease, main/status independence, rejection of all pending requests on disconnect, stale old-port message isolation, explicit disconnect, and a lease that never silently rebinds. For Plan E's frozen Analyze action, assert `port.postMessage` receives the same object identity and unchanged `requestId`; the client must not copy/wrap it. A later `acquireLease()` may open a new port, but an existing lease always rejects after disconnect.

- [ ] **Step 2: Run RED**

```powershell
$ErrorActionPreference='Stop'
Push-Location -LiteralPath 'extension'
try {
  & npm run test:run -- src/background/nativePortClient.test.ts --reporter=verbose
  if ($LASTEXITCODE -eq 0) { throw 'Native lease RED unexpectedly passed' }
} finally { Pop-Location }
```

Expected: missing module only.

- [ ] **Step 3: Implement correlation and non-rebinding leases**

Each lease closes over exactly one `chrome.runtime.Port` and one immutable `portId`. It preserves an own nonempty supplied request ID byte-for-byte; it may generate a UUID only when an eligible non-Analyze call omits one. It rejects duplicate active IDs, removes pending entries on settlement, ignores stale messages after close, and never reconnects from `request`. Reconnect exists only in a later explicit `acquireLease` call.

- [ ] **Step 4: Run GREEN/mutation**

Run from `extension/`: `npm run test:run -- src/background/nativePortClient.test.ts --reporter=verbose`.

Expected: PASS. Mutate lease request to reacquire after disconnect; `fails a disconnected lease without rebinding` fails. Restore.

- [ ] **Step 5: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/nativePortClient.ts extension/src/background/nativePortClient.test.ts extension/src/test/chromeMock.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 4 staging failed' }
git commit -m 'refactor(extension): add immutable native port leases'
if ($LASTEXITCODE -ne 0) { throw 'Task 4 commit failed' }
```

### Task 5: Add The Same-Lease Host Gate And Plan E Analyze Provider

**Files:**
- Create: `extension/src/background/hostGate.ts`
- Create: `extension/src/background/hostGate.test.ts`

**Interfaces:**
- Consumes: `NativePortLease`, `getExtensionVersion`, Plan E `AnalyzeRequestHandlerDeps`/types.
- Produces: `HostGate.inspectCapabilities`, `ensureProtected`, `ensureExpectedInstallation`, `clear`, `actionPolicy`, and `createAnalyzeRequestHandlerDeps`.

```ts
export type HostGateResult =
    | {
          ok: true
          portId: number
          hostVersion: string
          mode: 'packaged' | 'development'
          transactionalUpdate: boolean
      }
    | {
          ok: false
          code: 'host_protocol_incompatible'
              | 'installation_integrity_failed'
              | 'host_unavailable'
      }

export interface HostGate {
    inspectCapabilities(lease: NativePortLease): Promise<HostGateResult>
    ensureProtected(lease: NativePortLease, action: string): Promise<HostGateResult>
    ensureExpectedInstallation(
        lease: NativePortLease,
        expectedVersion: string,
    ): Promise<HostGateResult>
    clear(portId: number): void
}

export function parseCapabilitiesResponse(value: unknown): HostGateResult
export function parseInstallationVerification(value: unknown): HostGateResult

export type HostActionPolicy =
    | { kind: 'protected'; requiredCapability: 'prompt-scope-v1' }
    | { kind: 'recovery' }
    | { kind: 'coordinator-only' }
    | { kind: 'status-only' }
    | { kind: 'unknown' }

export function actionPolicy(action: unknown): HostActionPolicy

export function createAnalyzeRequestHandlerDeps(
    acquireMainLease: () => Promise<NativePortLease>,
    gate: HostGate,
    isMainSuppressed: () => boolean,
): AnalyzeRequestHandlerDeps
```

- [ ] **Step 1: Write strict parser/action matrix RED tests**

Cover malformed/throwing capability and integrity envelopes without coercion/logging. Protected actions are exactly Analyze/update-config/get-config/list-models. Diagnostics/update actions are ungated; terminal actions are coordinator-only; status is never main. Concurrent protected requests on one lease send exactly `get_capabilities` then `verify_installation`; another lease probes again. `prompt-scope-v1` is required; transactional capability only selects protocol. Packaged requires verified integrity and Extension version equality. Development passes ordinary protected calls only for explicit development response and never satisfies terminal expected installation.

- [ ] **Step 2: Write Plan E provider RED tests**

Call `handleAnalyzeRequest` with D's provider and assert exact order `parse inside E -> acquire lease -> gate same portId -> E storage start -> lease request`. Invalid metadata never calls `acquireLease`. Gate denials use Plan E's three exact fixed responses. Provider receives the frozen action; returned transport sends that same object on the captured lease. Disconnect rejects; provider/client acquisition count remains one and a decoy second lease sends zero messages.

- [ ] **Step 3: Run RED**

Run from `extension/`: `npm run test:run -- src/background/hostGate.test.ts src/background/analyzeRequestHandler.test.ts --reporter=verbose` and require nonzero due only to missing `hostGate`.

- [ ] **Step 4: Implement gate/provider**

Cache one in-flight gate promise by `lease.portId`, clear on disconnect/rejection, and never retain raw responses. `createAnalyzeRequestHandlerDeps` checks coordinator suppression before opening a port, acquires once, gates that lease, and returns:

```ts
{
    allowed: true,
    transport: {
        send: action => lease.request(action),
    },
}
```

It does not call E parsing/persistence functions itself.

- [ ] **Step 5: Run GREEN and exact Plan E regression set**

Run from `extension/`:

```text
npm run test:run -- src/background/hostGate.test.ts src/background/nativePortClient.test.ts src/background/analyzeRequestHandler.test.ts src/background/analyzeBridge.test.ts --reporter=verbose
```

Expected: PASS. Mutate transport to acquire a new lease in `send`; the same-lease/disconnect tests fail. Restore.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/hostGate.ts extension/src/background/hostGate.test.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 5 staging failed' }
git commit -m 'feat(extension): gate protected actions on one lease'
if ($LASTEXITCODE -ne 0) { throw 'Task 5 commit failed' }
```

### Task 6: Define Strict Update Wire, Storage, Receipt, And UI Protocols

**Files:**
- Create: `extension/src/background/updateProtocol.ts`
- Create: `extension/src/background/updateProtocol.test.ts`

**Interfaces:**
- Produces strict parsers and these core types. It imports `NativeUpdateErrorEvent` from Plan E rather than redeclaring it.

```ts
export const UPDATE_STORAGE_KEY = 'dh_update_runtime' as const
export const STATUS_HOST_NAME = 'com.dynamics.helper.update_status' as const
export type TransactionId = string & { readonly __transactionId: unique symbol }

export interface PendingUpdate {
    version: string
    comparableVersion: string
    url: string
    isPrerelease: boolean
}

export interface UpdateStatusEvidence {
    transactionId: TransactionId
    phase: 'staging' | 'prepared' | 'waiting-for-host-exit'
        | 'host-backed-up' | 'host-installed' | 'extension-backed-up'
        | 'extension-installed' | 'metadata-installed' | 'probing'
        | 'committed' | 'rolling-back' | 'rolled-back'
        | 'recovery-required'
    targetVersion: string
    reasonCode: 'host_exit_wait_failed' | 'host_backup_failed'
        | 'host_install_failed' | 'extension_backup_failed'
        | 'extension_install_failed' | 'metadata_install_failed'
        | 'startup_probe_failed' | 'locked_path' | 'rollback_failed'
        | 'manual_recovery_required' | null
}

export interface TerminalVersion {
    fresh_install: boolean
    version: string | null
}

export interface FinalizationReceipt {
    transactionId: TransactionId
    outcome: 'committed' | 'rolled-back'
    terminal_version: TerminalVersion
    state: 'finalized-awaiting-ack'
}

export type UpdateErrorCode =
    | 'host_protocol_incompatible'
    | 'installation_integrity_failed'
    | 'host_unavailable'
    | 'update_state_invalid'
    | 'invalid_update_request'
    | 'update_prepare_failed'
    | 'update_transaction_mismatch'
    | 'update_activation_failed'
    | 'update_status_timeout'
    | 'manual_recovery_required'
    | 'update_cleanup_failed'
    | 'finalization_ack_pending'
    | 'finalization_not_current'
    | 'legacy_update_unverified'
    | 'update_check_failed'

export interface NormalizedUpdateError {
    code: UpdateErrorCode
    message: string
    recoverableByUpdate: boolean
    manualInstallerRequired: boolean
}

export type NativeUpdateEvent =
    | { kind: 'available'; update: PendingUpdate }
    | { kind: 'not-available'; currentVersion: string }
    | { kind: 'error'; event: NativeUpdateErrorEvent }

export type UpdateUiState =
    | { kind: 'idle' }
    | { kind: 'available'; update: PendingUpdate }
    | { kind: 'preparing'; update: PendingUpdate }
    | { kind: 'activating'; update: PendingUpdate }
    | { kind: 'updating'; update: PendingUpdate; phase: UpdateStatusEvidence['phase'] }
    | { kind: 'still-updating'; update: PendingUpdate }
    | { kind: 'cleanup-warning'; update: PendingUpdate; error: NormalizedUpdateError }
    | { kind: 'recovery-required'; update?: PendingUpdate; error: NormalizedUpdateError }
    | { kind: 'host-incompatible'; error: NormalizedUpdateError }
    | { kind: 'legacy-verification'; update: PendingUpdate; error: NormalizedUpdateError }
    | { kind: 'check-error'; error: NormalizedUpdateError }
    | { kind: 'announcement-ready'; announcementId: string }

export type UpdateUiRequest =
    | { type: 'DH_UPDATE_GET_STATE' }
    | { type: 'DH_UPDATE_CHECK' }
    | { type: 'DH_UPDATE_START' }
    | { type: 'DH_UPDATE_CLAIM_ANNOUNCEMENT'; announcementId: string }

export type UpdateUiEvent =
    | { type: 'DH_UPDATE_STATE'; state: UpdateUiState }
    | { type: 'DH_UPDATE_ANNOUNCEMENT'; announcementId: string }

export interface UpdateAnnouncement {
    id: string
    outcome: 'committed' | 'rolled-back'
    terminalVersion: TerminalVersion
}

export type AnnouncementClaimResult =
    | { kind: 'claimed'; announcement: UpdateAnnouncement }
    | { kind: 'absent' }

export type UpdateRuntimeState =
    | { kind: 'idle' }
    | { kind: 'preparing'; transactionId: TransactionId; update: PendingUpdate; priorVersion: string }
    | { kind: 'prepared'; transactionId: TransactionId; update: PendingUpdate; targetVersion: string; priorVersion: string }
    | { kind: 'activating'; transactionId: TransactionId; update: PendingUpdate; targetVersion: string; priorVersion: string; activationRetryUsed: boolean }
    | { kind: 'polling'; transactionId: TransactionId; update: PendingUpdate; targetVersion: string; priorVersion: string }
    | { kind: 'terminal-reload-pending'; transactionId: TransactionId; update: PendingUpdate; outcome: 'committed' | 'rolled-back'; targetVersion: string; priorVersion: string }
    | { kind: 'cleanup-pending'; transactionId: TransactionId; update: PendingUpdate; outcome: 'committed' | 'rolled-back'; targetVersion: string; priorVersion: string }
    | { kind: 'completion-pending'; receipt: FinalizationReceipt; update: PendingUpdate; announcementId: string; pendingDispositionApplied: boolean; receiptAcknowledged: boolean; announcementClaimed: boolean }
    | { kind: 'legacy-reload-pending'; update: PendingUpdate; priorExtensionVersion: string }
    | { kind: 'recovery-required'; code: UpdateErrorCode; transactionId?: TransactionId; update?: PendingUpdate; targetVersion?: string; priorVersion?: string }

export function parseTransactionId(value: unknown): TransactionId
export function parsePendingUpdate(value: unknown): PendingUpdate | null
export function parsePreparedResponse(
    value: unknown,
    expectedId: TransactionId,
): { transactionId: TransactionId; targetVersion: string; priorVersion: string }
export function parseActivatedResponse(
    value: unknown,
    expectedId: TransactionId,
): { transactionId: TransactionId }
export function parseUpdateStatusResponse(
    value: unknown,
    expectedId: TransactionId,
): UpdateStatusEvidence
export function parseFinalizationReceipt(
    value: unknown,
    expectedId: TransactionId,
): FinalizationReceipt
export function parseFinalizationAck(
    value: unknown,
    expectedId: TransactionId,
): true
export function parseUpdateRuntime(value: unknown): UpdateRuntimeState
export function parseNativeUpdateEvent(value: unknown): NativeUpdateEvent
export function pollDelayMs(attempt: number): 250 | 500 | 1000 | 2000
export function expectedVersionForTerminal(
    state: Extract<UpdateRuntimeState, { kind: 'terminal-reload-pending' }>,
): string
export function toUpdateUiState(state: UpdateRuntimeState): UpdateUiState
export function readUpdateRuntime(): Promise<UpdateRuntimeState>
export function writeUpdateRuntime(state: UpdateRuntimeState): Promise<void>
export function readPendingUpdate(): Promise<PendingUpdate | null>
export function writePendingUpdate(update: PendingUpdate): Promise<void>
export function removePendingIfCurrent(expected: PendingUpdate): Promise<boolean>
```

Runtime UI requests are strict exact-key discriminants: `DH_UPDATE_GET_STATE`, `DH_UPDATE_CHECK`, payload-free `DH_UPDATE_START`, and `DH_UPDATE_CLAIM_ANNOUNCEMENT` with one `announcementId`. Start always uses the coordinator's current parsed `pending_update`; stale/untrusted UI data cannot select a URL or version. Events are `DH_UPDATE_STATE` or `DH_UPDATE_ANNOUNCEMENT` only.

`finalization_ack_pending` is a start-specific recoverable state: retain the available update, request the coordinator's existing completion/ack resume path, and do not generate an ID or begin preparation. `finalization_not_current` is a fixed cleanup error for a mismatched stale finalization request. Neither code is collapsed into generic `update_cleanup_failed`, because tests must distinguish “finish current acknowledgment first” from “wrong transaction.”

- [ ] **Step 1: Write parser/storage RED tables**

Test exact 32-hex parsing; malformed/uppercase IDs; strict own data descriptors; cycles/proxies/accessors; every union state and illegal mixed keys; callback `lastError`; malformed persisted state becoming safe retained `recovery-required/update_state_invalid`; no raw deletion. Freeze exact outer unsolicited parsers: own exact `action:'update_available'` plus own non-array payload containing exactly `version`, `url`, and optional `is_prerelease`; own exact `action:'update_not_available'` plus payload exactly `{version}`; own exact `action:'update_error'` delegated to Plan E normalizer. Availability accepts nonempty version, HTTPS URL, and optional boolean prerelease; absent prerelease defaults false. Preserve display and strip exactly one leading `v`/`V` only into `comparableVersion`. Unknown keys, wrappers, arrays, accessors, revoked/throwing proxies, and malformed fields return fixed `update_check_failed` without raw log/storage/forwarding.

`PendingUpdate.version` is display-only. Every transactional exact-version field and Host request uses `PendingUpdate.comparableVersion`: `perform_update.payload.targetVersion`, runtime `targetVersion`, expected package validation, post-reload Extension comparison, Host integrity expected version, receipt comparison, and legacy verification. A leading `v`/`V` never reaches Plan A `expected_version`. Add a transactional `v2.0.75-beta.1` test asserting Host receives `2.0.75-beta.1` while UI/storage retains the original display tag.

Test status four-field shape/current reason allowlist, prepared/terminal response ID matching, exact nested receipt, committed nonnull version, rolled-back nonfresh nonnull or fresh null, and acknowledgment `{transactionId,acknowledged:true}`. Wrong IDs reject. No scalar receipt version is accepted.

- [ ] **Step 2: Run RED**

Run from `extension/`: `npm run test:run -- src/background/updateProtocol.test.ts --reporter=verbose` and require missing-module failure.

- [ ] **Step 3: Implement from-scratch parsers and storage adapters**

Never spread untrusted values or call `String`, template conversion, `toString`, or `JSON.stringify` on rejected input. The exported parsers above are the only wire/storage decoders used by Tasks 7-10; no coordinator-local parser is added. `readUpdateRuntime` reads only `dh_update_runtime`; `writeUpdateRuntime` writes/removes only that key. `pending_update` has its own parser/writer and is never silently removed on malformed read.

- [ ] **Step 4: Run GREEN/typecheck/mutation**

Run from `extension/`:

```text
npm run test:run -- src/background/updateProtocol.test.ts src/utils/nativeUpdateError.test.ts --reporter=verbose
npm exec tsc -- --noEmit -p tsconfig.json
```

Expected: PASS. Temporarily accept scalar receipt `version`; receipt rejection test fails. Restore.

- [ ] **Step 5: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/updateProtocol.ts extension/src/background/updateProtocol.test.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 6 staging failed' }
git commit -m 'feat(update): define strict runtime protocol'
if ($LASTEXITCODE -ne 0) { throw 'Task 6 commit failed' }
```

### Task 7: Implement Prepare, Activate, Polling, Restart, And Independent Event Reduction

**Files:**
- Create: `extension/src/background/updateCoordinator.ts`
- Create: `extension/src/background/updateCoordinator.test.ts`

**Interfaces:**
- Produces `UpdateCoordinator.start`, `check`, `resume`, `snapshot`, `claimAnnouncement`, `reduceNativeUpdateEvent`, and `dispose`. Only operation methods use the serialized operation queue; `reduceNativeUpdateEvent` has its own persistence chain and never enqueues behind the operation that triggered it.

```ts
export interface UpdateStorage {
    readRuntime(): Promise<UpdateRuntimeState>
    writeRuntime(state: UpdateRuntimeState): Promise<void>
    readPending(): Promise<PendingUpdate | null>
    writePending(update: PendingUpdate): Promise<void>
    removePendingIfCurrent(expected: PendingUpdate): Promise<boolean>
}

export function createChromeUpdateStorage(): UpdateStorage

export interface UpdateCoordinatorDependencies {
    mainClient: NativePortClient
    statusClient: NativePortClient
    gate: HostGate
    storage: UpdateStorage
    randomBytes: (length: 16) => Uint8Array
    now: () => number
    sleep: (milliseconds: number) => Promise<void>
    getExtensionVersion: () => string
    reload: () => void
    broadcast: (event: UpdateUiEvent) => Promise<void>
}

export function productionRandomBytes(length: 16): Uint8Array

export interface UpdateCoordinator {
    start(): Promise<UpdateUiState>
    check(): Promise<UpdateUiState>
    resume(): Promise<UpdateUiState>
    snapshot(): UpdateUiState
    claimAnnouncement(announcementId: string): Promise<AnnouncementClaimResult>
    reduceNativeUpdateEvent(
        lease: NativePortLease,
        raw: unknown,
    ): Promise<void>
    dispose(): void
}

export function createUpdateCoordinator(
    deps: UpdateCoordinatorDependencies,
): UpdateCoordinator
```

- [ ] **Step 1: Write prepare/activate crash-window RED tests**

Assert exact durable-before-effect order:

```text
storage preparing -> main perform_update(same ID/target)
-> storage prepared -> storage activating
-> main activate_update(same ID) -> close main
-> storage polling -> status polling
```

Cover crashes before/after every write/send/reply. Preparing restart reissues only same-ID prepare. Prepared activates. Activating polls first and may persist `activationRetryUsed:true` then open one activation-only main lease only when status is still prepared. Waiting or later never opens main.

Add start-barrier/CSPRNG tests. `start()` first acquires a recovery-only main lease, invokes the Host readiness action backed by `UpdateService.require_start_ready`, and closes that lease. A pending finalization returns `finalization_ack_pending` before `randomBytes`, runtime storage, package open, or update action. On success, `productionRandomBytes(16)` allocates `new Uint8Array(16)`, calls `crypto.getRandomValues` exactly once on that same array, returns it, and rejects any requested length other than literal 16. Stub crypto with bytes `00..0f` and require ID `000102030405060708090a0b0c0d0e0f`; malformed/injected adapter output never reaches storage/Host. A race after readiness is caught by the Host's repeated barrier test in Task 2.

- [ ] **Step 2: Write polling/deadlock RED tests**

Use fake clock to require `250,500,1000,2000`, then only `2000`, a 120000-ms wake budget, disconnect interval consumption, retained timeout state, and next-wake reset to 250. Add exact deadlock regression:

```ts
it('reduces update_available while check operation is awaiting that event', async () => {
    const check = coordinator.check()
    await main.emitUnsolicited(AVAILABLE_EVENT)
    await expect(check).resolves.toMatchObject({ kind: 'available' })
    expect(log).toEqual([
        'main:check_updates',
        'event:available:persisted',
        'check:resolved',
    ])
})
```

The fake `check_updates` request resolves only after the reducer's persistence callback. If event handling uses the operation queue, this test hangs under a short fake timeout and fails. Add race tests in which update B becomes current while update A is preparing, activating, and cleanup-pending: delayed A `update_not_available`, `update_error`, pending removal, and committed disposition cannot remove or replace B. Each check owns a monotonically increasing in-memory event epoch bound to one lease; only the first terminal unsolicited event for the current epoch settles it. The event persistence chain is serial, and every operation captures the full `(version,comparableVersion,url,isPrerelease)` identity and rechecks it before mutating `pending_update`. Restart uses the full persisted identity rather than an in-memory epoch.

- [ ] **Step 3: Run RED**

Run from `extension/`: `npm run test:run -- src/background/updateCoordinator.test.ts -t 'prepare|activate|poll|awaiting that event' --reporter=verbose` and require missing-module failure.

- [ ] **Step 4: Implement nonterminal state machine/event reducer**

Production composition sets `storage: createChromeUpdateStorage()` and `randomBytes: productionRandomBytes`; tests may inject deterministic adapters. `start()` is payload-free and reads the current parsed `pending_update`, performs the Host readiness barrier, then calls `deps.randomBytes(16)`, requires an actual `Uint8Array` of length 16, renders lowercase two-digit hex, and parses through `parseTransactionId`; never use this browser generator for installer code. Validate every echoed/status ID through the exact protocol parsers. Main-suppressed state rejects protected calls without a port. Update event routing calls `parseNativeUpdateEvent` then uses a strict switch: available persists/broadcasts, not-available uses `storage.removePendingIfCurrent(capturedIdentity)` and broadcasts idle only when it removed the same update, error uses Plan E's normalized event and maps its trusted string into fixed `check-error` state. Keep Plan E `handleNativeUpdateError` exported and its tests green; Task 9 temporarily invokes its baseline delivery in addition to this reducer, and Task 10 removes that delivery only after typed UI conversion.

- [ ] **Step 5: Run GREEN/mutation**

Run from `extension/`: `npm run test:run -- src/background/updateCoordinator.test.ts src/background/updateProtocol.test.ts src/background/nativePortClient.test.ts --reporter=verbose`.

Expected: PASS. Route event reducer through operation queue; exact deadlock test fails. Restore.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/updateCoordinator.ts extension/src/background/updateCoordinator.test.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 7 staging failed' }
git commit -m 'feat(update): coordinate durable update activation'
if ($LASTEXITCODE -ne 0) { throw 'Task 7 commit failed' }
```

### Task 8: Add Terminal Reload, Exact C Finalization, Announcement, And Legacy Flow

**Files:**
- Modify: `extension/src/background/updateCoordinator.ts`
- Modify: `extension/src/background/updateCoordinator.test.ts`

**Interfaces:**
- Completes terminal and legacy branches without adding storage keys.

- [ ] **Step 1: Write terminal RED matrix**

On terminal status, require only:

```text
status terminal -> persist terminal-reload-pending with outcome/target/prior -> chrome.runtime.reload
```

No main gate/finalize/announcement occurs in that Worker. A fresh Worker checks its own effective manifest version, acquires a main lease, requires packaged expected Host/Extension version, persists `cleanup-pending`, finalizes, validates exact receipt ID/outcome/nested terminal version, then persists `completion-pending` before acknowledgment.

Test finalize lost response/replay, cleanup failure, malformed/wrong receipt, committed pending removal, rolled-back pending retention, marker write failure, ack lost response/replay `True`, wrong ack ID, delayed old ID, one announcement claim, and restart at every state. No browser tombstone collection is permitted.

- [ ] **Step 2: Write legacy RED matrix**

When capability inspection lacks `transactional-update-v1`, legacy perform success persists `legacy-reload-pending` then reloads. Fresh Worker first requires its own effective Extension version equals `update.comparableVersion`, then calls `ensureExpectedInstallation(lease, update.comparableVersion)` and requires explicit packaged/verified Host and Extension versions equal that target. Development mode, no-op old version, mixed/partial/unavailable results retain update and show fixed retry/manual-installer guidance. A complete matching target restores protected use but emits no transactional success announcement. Assert zero generated IDs, status ports, finalization calls, receipts, or fake terminal phases.

Availability cases include `version:'v2.0.75-beta.1'` and `is_prerelease:true`; display stays unchanged while comparison uses `2.0.75-beta.1`.

- [ ] **Step 3: Run RED**

Run from `extension/`: `npm run test:run -- src/background/updateCoordinator.test.ts -t 'terminal|receipt|announcement|legacy' --reporter=verbose` and require assertion failures.

- [ ] **Step 4: Implement exact state transitions**

Completion marker stores the complete C receipt plus three booleans: pending disposition, receipt acknowledged, and announcement claimed. Persist marker before calling ack. Apply each fact idempotently and persist after it. Claim writes `announcementClaimed:true` before returning announcement so a lost UI response cannot repeat it. Clear `dh_update_runtime` only when all three facts are durable. Product actions are enabled after post-reload gate, independent of ack/claim cleanup.

- [ ] **Step 5: Run GREEN/mutations**

Run from `extension/`: `npm run test:run -- src/background/updateCoordinator.test.ts src/background/updateProtocol.test.ts src/background/hostGate.test.ts --reporter=verbose`.

Expected: PASS. Announce before receipt marker; ordering test fails. Replace nested terminal version comparison with target scalar; fresh-rollback parser/receipt test fails. Restore.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/updateCoordinator.ts extension/src/background/updateCoordinator.test.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 8 staging failed' }
git commit -m 'feat(update): finalize terminal updates after reload'
if ($LASTEXITCODE -ne 0) { throw 'Task 8 commit failed' }
```

### Task 9: Compose The Service Worker With Plan E Analyze Ownership

**Files:**
- Modify: `extension/src/background/serviceWorker.ts`
- Create: `extension/src/background/serviceWorker.update.test.ts`
- Modify: `extension/src/test/chromeMock.ts`

**Interfaces:**
- Produces one pure `createServiceWorkerUpdateRuntime` seam owned and exported by `updateCoordinator.ts`; `serviceWorker.ts` only wires Chrome lifecycle/listeners. Analyze unit tests import the pure seam, never side-effectful `serviceWorker.ts`.

```ts
export interface ServiceWorkerUpdateRuntime {
    readonly ready: Promise<void>
    routeRuntimeMessage(message: unknown): Promise<unknown>
    routeNativeMessage(inner: unknown): Promise<AnalyzeForwardResponse | unknown>
    onStartup(): Promise<void>
    onInstalled(): Promise<void>
    dispose(): void
}

export interface ServiceWorkerUpdateRuntimeDependencies {
    coordinator: UpdateCoordinator
    createAnalyzeDeps: () => AnalyzeRequestHandlerDeps
    legacyErrorDelivery: NativeUpdateErrorDeliveryDeps
}

export function createServiceWorkerUpdateRuntime(
    deps: ServiceWorkerUpdateRuntimeDependencies,
): ServiceWorkerUpdateRuntime
```

- [ ] **Step 1: Write cold-start/routing RED tests**

Require persisted runtime read before any main connection, resume on initial load/onStartup/onInstalled, strict update UI request union including payload-free `DH_UPDATE_START`, coordinator-only update actions, nonterminal main suppression, shared protected gate, gate clear on disconnect, recovery actions available, and Options hydration typed denial before `get_config`/`update_config` forwarding. A start message with `update`, URL, version, or any extra key is rejected before storage/port access.

- [ ] **Step 2: Write exact Plan E Analyze adapter RED tests**

Every Analyze `NATIVE_MSG.payload` goes directly to `handleAnalyzeRequest(inner,{acquireAuthorizedTransport})`. Invalid metadata acquires no lease. Valid order is parse/acquire+same-lease gate/start/same-lease send. Do not call `handleAnalyzeForward`, `parseAnalyzeForwardRequest`, or wrap the inner action again. Main-suppressed state returns fixed denial without opening a port. Disconnect never reacquires.

- [ ] **Step 3: Run RED**

Run from `extension/`:

```text
npm run test:run -- src/background/serviceWorker.update.test.ts src/background/analyzeRequestHandler.test.ts --reporter=verbose
```

Expected: service-worker integration assertions fail; Plan E handler remains GREEN.

- [ ] **Step 4: Replace raw composition**

Create coordinator and await `resume()` before routing messages. Analyze uses only Plan E `handleAnalyzeRequest` with `createAnalyzeRequestHandlerDeps`, so parse precedes same-lease acquisition/gate, persistence start, and send. For every non-Analyze Native message, call Plan E `guardNonAnalyzeNativeMessage(inner)` before acquiring a lease; denial returns its fixed response with no port. Allowed messages retain object identity, then acquire one lease, apply `actionPolicy`/gate, and send on that same lease. Delete old local `pendingRequests`/raw reconnect ownership after all paths use clients. Every unsolicited event calls the independent reducer directly. Until Task 10 converts Options/FAB/content, `update_error` additionally calls Plan E `handleNativeUpdateError(raw,legacyErrorDelivery)` once; available/not-available keep their existing baseline UI delivery while the coordinator also persists typed state. Tests prove this temporary dual route contains only normalized values and is removed, not retained, in Task 10.

- [ ] **Step 5: Run GREEN and Plan E regressions**

Run from `extension/`:

```text
npm run test:run -- src/background/serviceWorker.update.test.ts src/background/analyzeRequestHandler.test.ts src/background/analyzeBridge.test.ts src/utils/nativeUpdateError.test.ts src/background/resetExtensionState.test.ts src/background/teamManifestSync.test.ts --reporter=verbose
npm exec tsc -- --noEmit -p tsconfig.json
```

Expected: PASS. Static scan requires `handleAnalyzeRequest` and forbids production `handleAnalyzeForward`/`parseAnalyzeForwardRequest` imports in `serviceWorker.ts`.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/serviceWorker.ts extension/src/background/serviceWorker.update.test.ts extension/src/test/chromeMock.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 9 staging failed' }
git commit -m 'feat(extension): compose sole update coordinator'
if ($LASTEXITCODE -ne 0) { throw 'Task 9 commit failed' }
```

### Task 10: Convert Options, FAB, And Content To Typed UI Clients

**Files:**
- Modify: `extension/src/background/updateCoordinator.ts`
- Modify: `extension/src/background/updateCoordinator.test.ts`
- Modify: `extension/src/content/index.tsx`
- Create: `extension/src/content/updateStateBridge.ts`
- Create: `extension/src/content/updateStateBridge.test.ts`
- Modify: `extension/src/components/Options.tsx`
- Create: `extension/src/components/Options.update.test.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/FAB.tsx`
- Create: `extension/src/components/FAB.update.test.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/utils/translations.ts`

**Interfaces:**
- Consumes only strict `UpdateUiRequest`, `UpdateUiEvent`, `UpdateUiState`, normalized errors, and announcement claim result.
- Removes production use of Plan E's temporary `NATIVE_UPDATE_ERROR` runtime/tab/DOM route while retaining the Plan E helper/bridge tests and exports.

- [ ] **Step 1: Write Options RED tests**

Mount requests state/check; click sends one start intent. Render available/preparing/activating/updating/still-updating/cleanup/recovery/legacy states. Protocol/integrity/unavailable errors preserve local edits and update controls. Typed gate failure prevents hydration catch-up `update_config`. Options never sends update Native actions, polls, touches update storage, or reloads.

- [ ] **Step 2: Write FAB/content RED tests**

FAB requests state, sends payload-free start intent, renders typed state, claims announcement once, and reports completion telemetry only from claimed receipt-backed announcement. `updateStateBridge.test.ts` asserts a valid exact `DH_UPDATE_STATE` runtime message becomes one typed DOM event, while extra-key, malformed, accessor-backed, throwing/revoked-proxy, and direct DOM injection values are rejected or reduced to fixed safe state without coercion. Content forwards only values accepted by that pure bridge. Neither UI owns Native update actions, polling, storage, finalize/ack, or reload.

- [ ] **Step 3: Run RED**

Run from `extension/`: `npm run test:run -- src/components/Options.update.test.tsx src/components/FAB.update.test.tsx --reporter=verbose` and require current direct ownership failures.

- [ ] **Step 4: Implement typed clients and atomic E-route replacement**

Remove component/direct Worker update storage and reload code. Remove production FAB `dh-update-error` listener, Options baseline runtime listener, content baseline delivery, and Worker `legacyErrorDelivery` dual route only after typed coordinator error state and `updateStateBridge` are wired in the same edit. In the same task, remove `legacyErrorDelivery` from `ServiceWorkerUpdateRuntimeDependencies` and update its coordinator tests, proving no production baseline delivery remains. Update only the now-obsolete update-listener assertions in `Options.test.tsx` and `FAB.spinner.test.tsx`; retain every unrelated bookmark/Reset/config/Analyze assertion. Keep `nativeUpdateError.ts`, `nativeUpdateError.test.ts`, and pure `updateErrorBridge` source/tests unchanged and green. Add fixed English/Chinese copy for protocol, integrity, unavailable, check error, preparing, activating, still updating, rollback, recovery, cleanup, legacy verification, and manual installer.

- [ ] **Step 5: Run GREEN/full E-facing regressions**

Run from `extension/`:

```text
npm run test:run -- src/components/Options.update.test.tsx src/components/FAB.update.test.tsx src/components/Options.test.tsx src/components/FAB.spinner.test.tsx src/content/updateStateBridge.test.ts src/content/updateErrorBridge.test.ts src/utils/nativeUpdateError.test.ts src/background/analyzeRequestHandler.test.ts --reporter=verbose
npm exec tsc -- --noEmit -p tsconfig.json
```

Expected: PASS. Static production scan under components/content finds no Native update action, status polling, update storage mutation, or reload.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- extension/src/background/updateCoordinator.ts extension/src/background/updateCoordinator.test.ts extension/src/content/index.tsx extension/src/content/updateStateBridge.ts extension/src/content/updateStateBridge.test.ts extension/src/components/Options.tsx extension/src/components/Options.update.test.tsx extension/src/components/Options.test.tsx extension/src/components/FAB.tsx extension/src/components/FAB.update.test.tsx extension/src/components/FAB.spinner.test.tsx extension/src/utils/translations.ts
if ($LASTEXITCODE -ne 0) { throw 'Task 10 staging failed' }
git commit -m 'feat(ui): render coordinated update lifecycle'
if ($LASTEXITCODE -ne 0) { throw 'Task 10 commit failed' }
```

### Task 11: Integrate The Python-Owned Synchronous Installer

**Files:**
- Create: `host/update_installer.py`
- Create: `host/test_update_installer.py`
- Modify: `host/update_entrypoint.py`
- Modify: `installer_core.ps1`
- Modify: `dyhelper_installer.ps1`
- Modify: `install.bat`
- Create: `test_installer_scripts.py`

**Interfaces:**
- Consumes Plan B `generate_transaction_id`, A `validate_staged_package`, B `create_prepared`, C high-level controller/finalization, existing Plan C command grammar `--install-package <absolute-package-root>`, and process-scoped `DYNAMICS_HELPER_INSTALL_INTENT`.
- Produces `InstallIntent`, `InstallerDependencies`, `run_install_package`, `finalize_registered_installer_transaction`, and fixed `EXIT_REGISTRATION_PENDING = 11`; other exits retain Plan C values 20/30/31/40/50.

```python
@dataclass(frozen=True)
class InstallIntent:
    beta_channel_enabled: bool

class InstalledHostProcessManager(Protocol):
    def stop_and_wait(
        self,
        expected_executable: Path,
        *,
        timeout_seconds: float,
    ) -> Sequence[InitiatingProcessIdentity]:
        raise AssertionError("process manager protocol")

class InstalledHostProcessApi(Protocol):
    def enumerate_process_ids(self) -> Sequence[int]: ...
    def open_process_for_stop(self, pid: int) -> int | None: ...
    def query_image(self, handle: int) -> Path: ...
    def creation_ticks(self, handle: int) -> int: ...
    def terminate(self, handle: int) -> None: ...
    def wait(self, handle: int, timeout_milliseconds: int) -> int: ...
    def close_handle(self, handle: int) -> None: ...

class WindowsInstalledHostProcessManager:
    def __init__(self, process_api: InstalledHostProcessApi) -> None:
        self._process_api = process_api

    def stop_and_wait(
        self,
        expected_executable: Path,
        *,
        timeout_seconds: float,
    ) -> Sequence[InitiatingProcessIdentity]:
        raise AssertionError("implemented through injected installed-host API")

@dataclass(frozen=True)
class InstallerDependencies:
    default_install_root: Callable[[], Path]
    validate_package: Callable[[Path], ValidatedPackage]
    generate_transaction_id: Callable[[], str]
    process_manager: InstalledHostProcessManager
    engine_factory: Callable[[Path], UpdateEngine]
    recovery_factory: Callable[[Path], RecoveryController]
    registry: RegistryBackend
    mutex_factory: Callable[[Path], MutationMutex]

def run_install_package(
    package_root: Path,
    install_root: Path,
    dependencies: InstallerDependencies,
    intent: InstallIntent,
) -> int:
    raise AssertionError("installer interface")

def install_package_from_environment(
    package_root: Path,
    install_root: Path,
    dependencies: InstallerDependencies,
) -> int:
    raise AssertionError("Plan C callback adapter interface")

def finalize_registered_installer_transaction(
    install_root: Path,
    dependencies: InstallerDependencies,
) -> bool:
    raise AssertionError("installer finalization interface")
```

- [ ] **Step 1: Write intent/process/transaction RED tests**

Intent path must be absolute, canonical, regular, outside package/install, exact canonical JSON with one boolean, no symlink/reparse, and absent means false. The wrapper workspace is exact: `<temp>/DynamicsHelper_Install_<nonce>/package` contains only extracted package bytes and sibling `<temp>/DynamicsHelper_Install_<nonce>/intent/install-intent.json` contains intent. `DYNAMICS_HELPER_INSTALL_INTENT` names only that sibling file. Test fresh, installed metadata, legacy Extension-version prior, missing trustworthy prior, active nonterminal recovery, prepared conflict, terminal committed registration resume, rollback, recovery-required, and registration failure retry. Capture package tree bytes before reading intent and require byte-identical package contents after every result.

Freeze operation order: validate package/intent and inspect authoritative active/journal state without mutation; enumerate every process whose canonical image equals `<install>/dh_native_host.exe`; stop each captured full identity; open each identity once, wait at most 30 seconds, close every retained handle; then act on the previously detected authority. A prepared installer transaction resumes with its existing ID; a post-activation nonterminal uses recovery; committed returns registration-pending after guarded intent verification; rolled-back returns 20 with evidence; recovery-required returns 30 with evidence. A new ID may be generated/prepared/activated only when active authority is absent. Fresh install with no executable yields an empty identity tuple and no stop/wait. Timeouts/failures return fixed 50 before new preparation. PowerShell contains no process stop/sleep. New transaction calls the Plan B generator exactly once, then `create_prepared(package,id,expected_version=None,prior_version=derived,initiator=INSTALLER)`, `prepare_recovery_runtime(id,select_runner_source(RunnerSource.STAGED,current_runtime_root,paths.staged_host),None)`, and `run_installer_update(id)`. Assert no process open/wait inside controller activation and Plan B receives null identity.

Create `CtypesInstalledHostProcessApi` in `host/update_installer.py`; it is the one production implementation of `InstalledHostProcessApi`. It wraps `EnumProcesses`, `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION|PROCESS_TERMINATE|SYNCHRONIZE)`, `QueryFullProcessImageNameW`, `GetProcessTimes`, `TerminateProcess`, `WaitForSingleObject`, and `CloseHandle` through lazy `ctypes.WinDLL` initialization. It returns fixed typed failures and never logs image paths. The production `WindowsInstalledHostProcessManager` uses only that injected API: enumerate process IDs, open query/terminate/synchronize handles, resolve each image path, capture creation FILETIME into `InitiatingProcessIdentity`, retain only canonical case-insensitive matches to the expected executable, request termination, wait at most the remaining shared deadline, reread creation ticks after wait to reject PID reuse, and close every handle in `finally`. Unit tests use a fake API and assert no real process enumeration/termination. Plan C's narrower `CtypesWin32ProcessApi` remains unchanged and is reused conceptually, not called for capabilities it does not expose.

Derive `prior_version` exactly once before preparation:

1. If verified `installed-product.json` and `verify_installation` agree, use its nonempty package version and classify installed.
2. Else if the canonical live Host executable or Extension exists, parse the live Extension manifest effective version through the same strict version normalizer and classify legacy; missing/malformed/Host-Extension disagreement returns fixed manual-recovery failure before preparation.
3. Else classify true fresh and pass `prior_version=None`.

Never derive prior version from the incoming package, display tag, unverified config, filename, or current source constant. Tests cover installed, legacy, fresh, and every disagreement.

For a fresh installation only, Plan B first installs the package seed byte-for-byte and commits/probes it under the ordinary seed receipt contract. Before returning registration-pending, Python rereads the committed journal and requires `fresh_install`, `seed_receipt.seed_installed is True`, exact seed path `config.json`, and the current live digest equal to the receipt's package-seed digest. Only then does Python atomically set `extension_preferences.beta_channel_enabled` from `InstallIntent`, using sibling write/flush/fsync/replace and read-back. If any guard or write fails, return fixed internal failure with the committed transaction retained for retry; never register or finalize. Installed/legacy, fresh-preexisting, and post-plan user-created configs remain byte-identical. No path mutates package bytes/hashes.

- [ ] **Step 2: Write PowerShell RED tests**

Static/controlled-child tests require wrapper intent under `$TempDir`, process-scoped environment handoff restored in `finally`, package path untouched, core invokes staged `dh_native_host.exe --install-package <package-root>`, exit 11 invokes committed live `--register`, and all other exits skip registration. `install.bat` preserves final code. Reject live `Copy-Item`/`Remove-Item`, packaged config reads/writes, registry commands, `Stop-Process`, `Get-Process`, and fixed sleeps.

- [ ] **Step 3: Run RED**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_installer test_installer_scripts host.test_update_entrypoint -v`

Expected: missing installer module and current unsafe script assertions fail.

- [ ] **Step 4: Implement Python transaction and registration completion**

`install_package_from_environment(package_root,install_root,deps)` is the exact two-argument Plan C callback adapter after dependency binding: it reads `DYNAMICS_HELPER_INSTALL_INTENT`, strict-loads the sibling intent or uses `InstallIntent(False)` when absent, then delegates to pure `run_install_package(package_root,install_root,deps,intent)`. Production composition injects Plan B `generate_transaction_id` directly and `WindowsInstalledHostProcessManager(CtypesInstalledHostProcessApi())`. `run_install_package` validates package/intent, derives prior version by the exact algorithm above, and inspects authoritative active state before live action; it then stops/waits through the injected Python process manager and dispatches the previously detected authority exactly as frozen above. A detected `PREPARED` installer transaction is completed through `prepare_recovery_runtime(transaction_id, runner_source, None)` plus `run_installer_update(transaction_id)`; a post-activation nonterminal transaction uses `recover_active` and never reruns staged preflight; committed/rolled-back/recovery-required never create a new ID. Only absent authority calls the Plan B generator and prepares a new transaction. After committed activation, it applies the guarded fresh-seed intent rule above and returns 11 only when registration remains pending. A committed retry rereads the same terminal journal/seed receipt and idempotently applies or verifies the same intent before returning 11. Rolled-back/recovery codes retain evidence.

Extend Plan C's production `install_package` callback only; do not change `EarlyModeDependencies` fields or command grammar. Extend the existing `--register` branch after successful `register_main_host`: verify frozen installation, detect a matching committed installer transaction, call C finalization, immediately call C acknowledgment, and return success. Wrong/browser/nonterminal active transactions are not finalized.

- [ ] **Step 5: Rewrite scripts as thin orchestration**

Core logic is exactly staged install -> switch on exit -> live register only for 11. Wrapper creates canonical intent, sets/restores `DYNAMICS_HELPER_INSTALL_INTENT`, invokes core, captures exit, and cleans its known temp root in the same `finally`. No package file is edited.

- [ ] **Step 6: Run GREEN/mutations**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_installer test_installer_scripts host.test_update_entrypoint host.test_update_recovery.InstallerRecoveryTests -v`.

Expected: `OK`. Mutate installer activation to pass its own identity; null-identity/no-wait test fails. Move register before exit 11; script order test fails. Restore.

- [ ] **Step 7: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- host/update_installer.py host/test_update_installer.py host/update_entrypoint.py installer_core.ps1 dyhelper_installer.ps1 install.bat test_installer_scripts.py
if ($LASTEXITCODE -ne 0) { throw 'Task 11 staging failed' }
git commit -m 'feat(installer): reuse journaled transaction engine'
if ($LASTEXITCODE -ne 0) { throw 'Task 11 commit failed' }
```

### Task 12: Integrate Release Inputs And Pass Pre-Cutover Frozen Gates

**Files:**
- Modify: `release_helper.py`
- Modify: `host/test_release_helper.py`

**Interfaces:**
- Extends Plan C's module-form PyInstaller hidden imports with `update_service` and `update_installer`; preserves Plan A `stage_release`/`create_zip` and package hashes; adds no checked spec/provisioning/publish path.

- [ ] **Step 1: Write source-level packaging RED tests**

`PlanDPackagingTests` requires exact venv module command, PyInstaller 6.18.0 preflight, all A-C hidden imports plus D modules, no `.spec` argument, no `--add-data` duplicate product files, intent exclusion, installer scripts exactly package-only, and unchanged deterministic stage validation. Mock subprocess/git/version/publish and fail on any side effect.

- [ ] **Step 2: Run RED**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_release_helper.PlanDPackagingTests -v`

Expected: D hidden-import assertions fail.

- [ ] **Step 3: Extend existing build command/staging tests**

Add only `update_service`/`update_installer` to existing sorted hidden imports. `stage_release` continues consuming exported capabilities (still prompt-scope-only), Plan A document generation/validation, complete onedir, Extension dist, `installer_core.ps1`, and `install.bat`. Intent and wrapper downloader are not package entries.

- [ ] **Step 4: Run all current-head pre-cutover source gates**

Run Task 14 Step 3's exact Host/Extension/build commands at the current pre-cutover head. Then run:

```powershell
$ErrorActionPreference='Stop'
$source=[IO.File]::ReadAllText((Join-Path (Get-Location) 'host/dh_native_host.py'))
if ($source -notmatch 'apply_update') { throw 'Historical updater was retired before the frozen cutover gate' }
& 'host/run_isolated_python.ps1' -HostPath -c "from product_info import PROVIDED_PROTOCOL_CAPABILITIES; assert PROVIDED_PROTOCOL_CAPABILITIES == ('prompt-scope-v1',)"
if ($LASTEXITCODE -ne 0) { throw 'Pre-cutover capability is not prompt-scope-only' }
```

Expected: every current-head source/build gate passes, legacy `Updater.apply_update` remains active, and transactional capability remains absent.

- [ ] **Step 5: Run the actual frozen rebuild and real staged-target probe**

First require `host/venv/Scripts/python.exe -m PyInstaller --version` exactly `6.18.0` through the six-variable harness; no provisioning here. Invoke only `release_helper.build_host()`, validate complete onedir, then read `build/dh_native_host/xref-dh_native_host.html` and require every Plan A-C hidden import plus `update_service` and `update_installer`. Rerun Plan C's `FrozenStagedProbeIntegrationTests` with `DH_PLAN_C_FROZEN_ONEDIR` pointing to the newly built absolute onedir in a self-contained isolated process; require exactly `Ran 1 test`, `OK`, and no skip. Do not execute a real install/update or create an archive.

Expected: actual current-head frozen build and real staged-target probe PASS. Otherwise Task 13 is blocked and historical updater remains active.

- [ ] **Step 6: Commit**

```powershell
$ErrorActionPreference='Stop'
git add -- release_helper.py host/test_release_helper.py
if ($LASTEXITCODE -ne 0) { throw 'Task 12 staging failed' }
git commit -m 'build(update): include runtime installer modules'
if ($LASTEXITCODE -ne 0) { throw 'Task 12 commit failed' }
```

### Task 13: Perform The Final Runtime Cutover Only After All Gates Pass

**Files:**
- Modify: `host/dh_native_host.py`
- Modify: `host/product_info.py`
- Modify: `host/test_update_actions.py`
- Modify: `host/test_product_info.py`
- Modify: `host/test_package_manifest.py`
- Modify: `host/test_package_archive.py`
- Modify: `host/test_install_integrity.py`
- Modify: `host/test_early_cli.py`
- Modify: `host/test_host_integrity_actions.py`
- Modify: `host/test_release_helper.py`
- Retain: `host/updater.py` unmodified unless only a historical-module comment is needed

**Interfaces:**
- Activates the dormant builder and advertises exact `('prompt-scope-v1','transactional-update-v1')` only in the same tested source state.

- [ ] **Step 1: Re-prove the cutover gate before editing**

Read `.superpowers/sdd/plan-d-base.txt`, require clean current head through Task 12, rerun Task 12 Steps 4-5 exactly, and store the observed outputs in the evidence report draft. Any failure stops before cutover tests/source edits.

- [ ] **Step 2: Write final cutover RED tests**

Require production `perform_update`/activate/finalize/ack to use the Task 3 builder, flush activation before stop, no `Updater` import/call, exact capability tuple, and generated release/integrity/probe declarations matching it. Verify historical updater source remains available only for legacy migration characterization.

- [ ] **Step 3: Run RED**

Run: `& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_actions host.test_product_info host.test_package_manifest host.test_package_archive host.test_install_integrity host.test_early_cli host.test_host_integrity_actions host.test_release_helper -v`

Expected: cutover/capability tests fail while prior task suites remain green.

- [ ] **Step 4: Activate route and capability atomically**

Replace only the historical production branch with strict builder/flush-and-return dispatch for four update actions. Remove production `Updater` import. Set provided capabilities to exact ordered tuple. Update Plan A tests/fixtures that intentionally froze the dormant tuple; use an unrelated future capability such as `unknown-update-v9` for rejection tests. Do not weaken generic N-to-N+1 package validation.

- [ ] **Step 5: Run final-head complete source and frozen gates**

Run Task 14 Steps 3-5 exactly against the cutover source before staging. A skip/failure blocks commit/completion; fix the cutover until all pass. No publish/archive/install occurs.

- [ ] **Step 6: Run retirement scans and commit**

Require no production import/call of `Updater.apply_update`, both capabilities in runtime/generated contracts, and no direct C primitive/D-owned E helper. The production scan is an explicit list of runtime modules (`host/dh_native_host.py`, `host/update_service.py`, `host/update_installer.py`, `host/update_entrypoint.py`) and excludes tests, `host/updater.py`, and tracked historical backup `host/dh_native_host.py.bak`. The `.bak` file is not imported or packaged and is not a production cutover owner; do not delete unrelated historical material merely to satisfy a broad grep. Stage exact cutover/test files and commit only after the final frozen rerun passes.

```powershell
$ErrorActionPreference='Stop'
git add -- host/dh_native_host.py host/product_info.py host/test_update_actions.py host/test_product_info.py host/test_package_manifest.py host/test_package_archive.py host/test_install_integrity.py host/test_early_cli.py host/test_host_integrity_actions.py host/test_release_helper.py
if ($LASTEXITCODE -ne 0) { throw 'Task 13 staging failed' }
git commit -m 'feat(update): activate transactional runtime protocol'
if ($LASTEXITCODE -ne 0) { throw 'Task 13 commit failed' }
```

### Task 14: Document, Record Evidence, And Run Final Committed-Head Gates

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `USER_GUIDE.md`
- Modify: `README.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Create: `.superpowers/sdd/hardening-d-runtime-installer-report.md`
- Create ignored: `.superpowers/sdd/final-original-whole-branch-review-package.txt`
- Create ignored: `.superpowers/sdd/final-original-whole-branch-review.diff`
- Create ignored: `.superpowers/sdd/final-original-whole-branch-review-findings.md`

**Interfaces:**
- Produces reproducible committed-head evidence and the disposable-VM handoff.

- [ ] **Step 1: Write documentation RED assertions**

Require docs to state Service Worker sole ownership, same-lease Analyze order, independent event reducer, exact poll schedule, terminal reload/gate/finalization order, bounded C cursor, Python/PowerShell installer ownership, first historical-upgrade limitation, PyInstaller 6.18.0 gate, and disposable-VM smoke not run.

- [ ] **Step 2: Update docs and report actual evidence**

Report headings:

```markdown
# Hardening Plan D Runtime And Installer Report
## Scope And Prerequisite Heads
## Plan B Generator And Plan C Frozen Preconditions
## Commit Map
## Consumed A/B/C/E Interfaces
## RED Evidence
## GREEN Evidence
## Restored Mutation Evidence
## Browser Crash Windows And Poll Timing
## Same-Lease Analyze Evidence
## Independent Event Reducer Evidence
## Terminal Receipt And Bounded Cursor Evidence
## Installer Process, Intent, Registration, And Resume Evidence
## Legacy Upgrade Evidence
## Pre-Cutover Frozen Build
## Final-Cutover Frozen Build
## Static Ownership And Scope Gates
## Deferred Disposable-VM Gate
```

Include actual command outputs/counts/hashes only. State `PLAN_D_FROZEN_GATE_STATUS=PASS` only after both Task 12 and Task 13 actual rebuild/probe runs pass. State `DISPOSABLE-VM SMOKE REQUIRED BEFORE RELEASE, NOT RUN` and list real handle inheritance, RunOnce launch/re-arm/removal, forced installed-probe rollback, Chrome status launch argv, interrupted installer resume/registration, and first real transactional browser update.

- [ ] **Step 3: Run final Host/Extension/build/installer/release gates**

Run these self-contained commands separately so each Python child receives a fresh six-variable root:

```powershell
$ErrorActionPreference='Stop'
& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_product_info host.test_package_manifest host.test_package_archive host.test_install_integrity host.test_early_cli host.test_host_integrity_actions host.test_update_journal host.test_update_ownership host.test_update_mutex host.test_update_engine_host host.test_update_engine_extension host.test_update_engine_rollback host.test_update_engine_resume host.test_native_messaging host.test_native_registration host.test_update_platform host.test_update_recovery host.test_update_status_host host.test_update_entrypoint host.test_early_update_dispatch host.test_update_service host.test_update_actions host.test_update_installer host.test_release_helper test_installer_scripts -v
if ($LASTEXITCODE -ne 0) { throw 'Focused Host/installer/release gate failed' }
& 'host/run_isolated_python.ps1' -m unittest discover host -v
if ($LASTEXITCODE -ne 0) { throw 'Full Host discovery failed' }
& 'host/run_isolated_python.ps1' -m compileall -q -x '[\\/]venv[\\/]' host release_helper.py test_installer_scripts.py
if ($LASTEXITCODE -ne 0) { throw 'Source compile gate failed' }
```

Run the Extension gates with `extension/` as working directory:

```powershell
$ErrorActionPreference='Stop'
Push-Location -LiteralPath 'extension'
try {
  & npm run test:run -- src/background/nativePortClient.test.ts src/background/hostGate.test.ts src/background/updateProtocol.test.ts src/background/updateCoordinator.test.ts src/background/serviceWorker.update.test.ts src/background/analyzeRequestHandler.test.ts src/background/analyzeBridge.test.ts src/utils/nativeUpdateError.test.ts src/content/updateErrorBridge.test.ts src/components/Options.update.test.tsx src/components/FAB.update.test.tsx src/components/Options.test.tsx src/components/FAB.spinner.test.tsx --reporter=verbose
  if ($LASTEXITCODE -ne 0) { throw 'Focused Extension D/E gate failed' }
  & npm run test:run -- --reporter=dot
  if ($LASTEXITCODE -ne 0) { throw 'Full Extension gate failed' }
  & npm exec tsc -- --noEmit -p tsconfig.json
  if ($LASTEXITCODE -ne 0) { throw 'TypeScript gate failed' }
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Production Extension build failed' }
} finally { Pop-Location }
```

Record exact totals and outputs; zero tests or skipped named gates are failures.

- [ ] **Step 4: Repeat actual final frozen gate**

Run in one self-contained block; the environment variable exists only for the probe child:

```powershell
$ErrorActionPreference='Stop'
$version=@(& 'host/run_isolated_python.ps1' -m PyInstaller --version 2>&1)
if ($LASTEXITCODE -ne 0 -or (($version -join "`n").Trim()) -ne '6.18.0') {
  throw 'Final frozen gate requires exact PyInstaller 6.18.0'
}
& 'host/run_isolated_python.ps1' -HostPath -c 'import release_helper; release_helper.build_host()'
if ($LASTEXITCODE -ne 0) { throw 'Final frozen build failed' }
& 'host/run_isolated_python.ps1' -HostPath -c "from pathlib import Path; from update_recovery import inventory_onedir; root=Path('dist/dh_native_host').resolve(strict=True); value=inventory_onedir(root); assert (root/'dh_native_host.exe').is_file() and value.internal_files"
if ($LASTEXITCODE -ne 0) { throw 'Final onedir inventory gate failed' }
& 'host/run_isolated_python.ps1' -HostPath -c "from pathlib import Path; required=('early_cli','install_integrity','native_messaging','native_registration','package_archive','package_manifest','product_info','update_engine','update_entrypoint','update_journal','update_mutex','update_ownership','update_platform','update_recovery','update_status_host','update_service','update_installer'); text=Path('build/dh_native_host/xref-dh_native_host.html').read_text(encoding='utf-8'); missing=[name for name in required if name not in text]; assert not missing, missing; print('Plan D module graph complete')"
if ($LASTEXITCODE -ne 0) { throw 'Final module graph gate failed' }
$frozenRoot=(Resolve-Path -LiteralPath 'dist/dh_native_host').Path
$savedFrozen=[Environment]::GetEnvironmentVariable('DH_PLAN_C_FROZEN_ONEDIR','Process')
try {
  $env:DH_PLAN_C_FROZEN_ONEDIR=$frozenRoot
  $probe=@(& 'host/run_isolated_python.ps1' -HostPath -m unittest host.test_update_recovery.FrozenStagedProbeIntegrationTests -v 2>&1)
  $probeExit=$LASTEXITCODE
  $probeText=$probe -join [Environment]::NewLine
  $probe
  if (
    $probeExit -ne 0
    -or $probeText -notmatch 'Ran 1 test'
    -or $probeText -notmatch '(?m)^OK\r?$'
    -or $probeText -match '(?i)skipped'
  ) { throw 'Real frozen staged-target probe failed, skipped, or did not run exactly one test' }
} finally {
  [Environment]::SetEnvironmentVariable('DH_PLAN_C_FROZEN_ONEDIR',$savedFrozen,'Process')
}
$generated=@('dh_native_host.spec','build','dist','extension/dist')
foreach ($path in $generated) {
  & git check-ignore -q -- $path
  if ($LASTEXITCODE -ne 0) { throw "Generated frozen/build output is not ignored: $path" }
}
if (@(git ls-files -- dh_native_host.spec build dist extension/dist).Count -ne 0) {
  throw 'Generated frozen/build output became tracked'
}
```

Do not package, publish, register, or install.

- [ ] **Step 5: Run static and scope audits**

Run this fail-fast static gate from the root:

```powershell
$ErrorActionPreference='Stop'
$dProduction=@(
  'host/update_service.py','host/update_installer.py','host/dh_native_host.py','host/update_entrypoint.py',
  'extension/src/background/nativePortClient.ts','extension/src/background/hostGate.ts',
  'extension/src/background/updateProtocol.ts','extension/src/background/updateCoordinator.ts',
  'extension/src/background/serviceWorker.ts'
)
$directC=@(& git grep -n -E 'install_recovery_tree\(|register_status_host\(' -- $dProduction)
if ($directC.Count -ne 0) { $directC; throw 'Plan D directly calls low-level Plan C recovery primitives' }
$writers=@(& git grep -n -E 'write_journal_atomic|write_active_transaction_atomic|transition\(|remove_transaction|remove_matching_active' -- $dProduction)
if ($writers.Count -ne 0) { $writers; throw 'Plan D bypasses Plan B journal/workspace ownership' }
$barePid=@(& git grep -n -E 'initiating[_]host[_]pid|def [A-Za-z_]+\([^)]*pid: int|activate_prepared\([^,]+,[[:space:]]*[A-Za-z_]*pid' -- host/update_service.py host/update_installer.py host/dh_native_host.py)
if ($barePid.Count -ne 0) { $barePid; throw 'Bare initiating PID contract found' }
$eDuplicates=@(& git grep -n -E 'function (normalizeNativeUpdateError|handleAnalyzeRequest|parseAnalyzeForwardRequest|handleAnalyzeForward)|interface NativeUpdateErrorEvent' -- extension/src/background/nativePortClient.ts extension/src/background/hostGate.ts extension/src/background/updateProtocol.ts extension/src/background/updateCoordinator.ts extension/src/background/serviceWorker.ts)
if ($eDuplicates.Count -ne 0) { $eDuplicates; throw 'Plan D duplicates a Plan E-owned interface' }
$serviceWorker=[IO.File]::ReadAllText((Join-Path (Get-Location) 'extension/src/background/serviceWorker.ts'))
if ($serviceWorker -notmatch 'handleAnalyzeRequest' -or $serviceWorker -match 'handleAnalyzeForward|parseAnalyzeForwardRequest') {
  throw 'Service Worker does not use only Plan E Analyze handler'
}
$uiOwners=@(& git grep -n -E 'connectNative|get_update_status|perform_update|activate_update|finalize_update_status|acknowledge_update_finalization|runtime[.]reload|storage[.]local[.](set|remove).*(pending_update|dh_update_runtime)' -- extension/src/components extension/src/content)
if ($uiOwners.Count -ne 0) { $uiOwners; throw 'UI retains direct update ownership' }
$scriptMutation=@(& git grep -n -E 'Stop-Process|Get-Process|Start-Sleep|New-ItemProperty|Set-ItemProperty|Remove-ItemProperty|ConvertTo-Json|Set-Content|Copy-Item.*DynamicsHelper|Remove-Item.*DynamicsHelper' -- installer_core.ps1 dyhelper_installer.ps1)
if ($scriptMutation.Count -ne 0) { $scriptMutation; throw 'PowerShell retains process/registry/package/live-product mutation' }
$activeUpdater=@(& git grep -n -E 'from updater import Updater|Updater\(|apply_update\(' -- host/dh_native_host.py host/update_service.py host/update_installer.py host/update_entrypoint.py)
if ($activeUpdater.Count -ne 0) { $activeUpdater; throw 'Historical updater remains active in production' }
$storageMatches=@(& git grep -n -- 'dh_update_runtime' -- extension/src/background ':!extension/src/background/*.test.ts')
$storageOwners=@($storageMatches | ForEach-Object { ($_ -split ':',2)[0] } | Sort-Object -Unique)
$allowedStorageOwners=@('extension/src/background/updateProtocol.ts')
if (Compare-Object $storageOwners $allowedStorageOwners) { $storageMatches; throw 'Unexpected browser transaction-key owner' }
$tombstones=@(& git grep -n -E 'acknowledged(Transaction|Update|Finalization)(s|Ids|Set)|tombstone' -- extension/src host/update_service.py host/update_installer.py)
if ($tombstones.Count -ne 0) { $tombstones; throw 'Unbounded acknowledgment tombstone found' }
$receiptSource=[IO.File]::ReadAllText((Join-Path (Get-Location) 'extension/src/background/updateProtocol.ts'))
if ($receiptSource -notmatch 'terminal_version' -or $receiptSource -match 'interface FinalizationReceipt[\s\S]{0,300}\n\s*version:') {
  throw 'Finalization receipt does not require nested terminal_version only'
}
$idGenerators=@(& git grep -n -E 'token_hex|token_bytes|secrets[.]|uuid4|randomUUID|getRandomValues' -- host/update_installer.py host/update_service.py extension/src/background/updateCoordinator.ts)
$pythonIdGenerators=@($idGenerators | Where-Object { $_ -match '^host/' })
if ($pythonIdGenerators.Count -ne 0) { $pythonIdGenerators; throw 'Plan D Python defines a transaction-ID generator' }
git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Whitespace audit failed' }
$placeholderPattern='T[B]D|T[O]DO|implement[ ]later|fill[ ]in|appropriate[ ]error[ ]handling|similar[ ]to[ ]Task|REPLACE[_]WITH'
$planText=[IO.File]::ReadAllText((Join-Path (Get-Location) 'docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md'))
$reportPath=Join-Path (Get-Location) '.superpowers/sdd/hardening-d-runtime-installer-report.md'
if (-not (Test-Path -LiteralPath $reportPath)) { throw 'Plan D evidence report is missing' }
$reportText=[IO.File]::ReadAllText($reportPath)
if ($planText -match $placeholderPattern -or $reportText -match $placeholderPattern) {
  throw 'Plan/report placeholder found'
}
$base=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/plan-d-base.txt'),[Text.UTF8Encoding]::new($false)).Trim()
if ($base -notmatch '^[0-9a-f]{40}$') { throw 'Invalid Plan D base evidence' }
$changed=@(& git diff --name-only "$base..HEAD")
$forbidden=@($changed | Where-Object { $_ -match '(^|/)(package-lock[.]json|requirements[.]txt)$|(^|/)releases/.*[.]zip$|[.]spec$|install-intent[.]json$' })
if ($forbidden.Count -ne 0) { $forbidden; throw 'Forbidden dependency/release/spec/intent artifact changed' }
```

Inspect `$changed` against the File Map and the Plan A capability test list. No version change, release asset, checked spec, intent file, registry export, or installed data may appear.

- [ ] **Step 6: Force-add evidence and inspect exact cached docs**

```powershell
$ErrorActionPreference='Stop'
git check-ignore -v -- .superpowers/sdd/hardening-d-runtime-installer-report.md
if ($LASTEXITCODE -ne 0) { throw 'Plan D report should be ignored before force-add' }
git add -- AGENTS.md ARCHITECTURE.md DEVELOPER_GUIDE.md USER_GUIDE.md README.md docs/session-handoff-2026-07-15.md releases/notes-prompt-scope-cleanup-draft.md
if ($LASTEXITCODE -ne 0) { throw 'Task 14 docs staging failed' }
git add -f -- .superpowers/sdd/hardening-d-runtime-installer-report.md
if ($LASTEXITCODE -ne 0) { throw 'Task 14 report force-add failed' }
$actual=@(git diff --cached --name-only | Sort-Object)
$expected=@(
  '.superpowers/sdd/hardening-d-runtime-installer-report.md',
  'AGENTS.md','ARCHITECTURE.md','DEVELOPER_GUIDE.md','README.md','USER_GUIDE.md',
  'docs/session-handoff-2026-07-15.md',
  'releases/notes-prompt-scope-cleanup-draft.md'
) | Sort-Object
if (Compare-Object $actual $expected) { throw 'Task 14 cached set mismatch' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Task 14 cached whitespace failure' }
git commit -m 'docs(verification): record hardening plan d evidence'
if ($LASTEXITCODE -ne 0) { throw 'Task 14 commit failed' }
```

- [ ] **Step 7: Repeat all final gates at committed HEAD**

Execute the complete command blocks in Steps 3-4 again from committed HEAD with new isolation roots, then execute every static requirement listed in Step 5. Run `git status --short`, `git diff --check HEAD^..HEAD`, and `git log --oneline -16`; require no tracked/unignored drift, `PLAN_D_FROZEN_GATE_STATUS=PASS`, and exact source/frozen totals recorded. If evidence changes, create a corrective commit; do not amend.

- [ ] **Step 8: Run the final original-base whole-branch review**

Run only after every Plan D product, documentation, evidence, and any corrective commit is complete and the tracked worktree/index are clean. This is the final review required by Plan E and the accepted spec; Plan E's interim review cannot satisfy it.

```powershell
$ErrorActionPreference='Stop'
$reviewBase='0040b1de1bc196b203014a8e4f94a53babb7e9aa'
$reviewHead=(& git rev-parse HEAD).Trim()
if ($reviewHead -notmatch '^[0-9a-f]{40}$') { throw 'Invalid final review head' }
if (@(& git status --porcelain=v1).Count -ne 0) { throw 'Final review requires a clean tracked worktree/index' }
$range="$reviewBase..$reviewHead"
$stat=@(& git diff --stat $range)
if ($LASTEXITCODE -ne 0) { throw 'Could not generate final whole-branch stat' }
$log=@(& git log --reverse --oneline $range)
if ($LASTEXITCODE -ne 0) { throw 'Could not generate final whole-branch log' }
$paths=@(& git diff --name-status $range)
if ($LASTEXITCODE -ne 0) { throw 'Could not generate final whole-branch path list' }
$package=@(
  'Review kind: final original whole-branch after Plan D',
  "Review base: $reviewBase",
  "Review head: $reviewHead",
  "Review range: $range",
  "Exact diff command: git diff --full-index --binary `"$range`"",
  '', 'Stat:', $stat, '', 'Commits:', $log, '', 'Paths:', $paths
) -join [Environment]::NewLine
[IO.File]::WriteAllText(
  (Join-Path (Get-Location) '.superpowers/sdd/final-original-whole-branch-review-package.txt'),
  $package + [Environment]::NewLine,
  [Text.UTF8Encoding]::new($false)
)
& git diff --full-index --binary $range --output='.superpowers/sdd/final-original-whole-branch-review.diff'
if ($LASTEXITCODE -ne 0) { throw 'Could not generate final whole-branch binary diff' }
```

Review the complete package/diff against the accepted Prompt Scope and Whole-Branch Hardening specs, not only Plan D files. Trace Host/Extension protocol alignment, update ownership and crash recovery, prompt-source isolation, bookmark/Analyze semantics, installer/release compatibility, security/privacy, tests, and documentation. Write `.superpowers/sdd/final-original-whole-branch-review-findings.md` with this exact Markdown structure:

```markdown
# Final Original Whole-Branch Review Findings
## Review Base
0040b1de1bc196b203014a8e4f94a53babb7e9aa
## Review Head
<exact 40-hex reviewed head>
## Review Range
<base>..<head>
## Critical
None
## Important
None
## Minor
<None or findings>
## Testing Gaps
<None or gaps>
## Disposition
PASS
```

`Disposition` is `PASS` only when Critical and Important are explicitly `None`. Any Critical/Important finding blocks completion: validate it, implement a focused TDD fix in a new commit, rerun all affected and full gates, regenerate all three review artifacts against the new HEAD, and review the entire new diff again. Do not narrow a rerun to the latest fix. Minor findings may be recorded without expanding this plan.

- [ ] **Step 9: Verify final review evidence without changing reviewed HEAD**

```powershell
$ErrorActionPreference='Stop'
$head=(& git rev-parse HEAD).Trim()
$package=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/final-original-whole-branch-review-package.txt'))
$findings=[IO.File]::ReadAllText((Join-Path (Get-Location) '.superpowers/sdd/final-original-whole-branch-review-findings.md'))
if ($package -notmatch "(?m)^Review head: $head$") { throw 'Final review package does not cover current HEAD' }
if ($package -notmatch '(?m)^Review base: 0040b1de1bc196b203014a8e4f94a53babb7e9aa$') { throw 'Final review base mismatch' }
if ($findings -notmatch '(?m)^## Critical\r?\nNone\r?$') { throw 'Final review Critical disposition is not None' }
if ($findings -notmatch '(?m)^## Important\r?\nNone\r?$') { throw 'Final review Important disposition is not None' }
if ($findings -notmatch '(?m)^## Disposition\r?\nPASS\r?$') { throw 'Final review did not pass' }
if (@(& git status --porcelain=v1).Count -ne 0) { throw 'Tracked state changed after final review' }
& git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Final whitespace gate failed' }
```

The three review files remain ignored and unstaged so the reviewed HEAD does not move after review. Return their exact paths and the reviewed commit in the completion handoff. Do not claim final whole-branch completion without this PASS.

## Final Acceptance Matrix

| Requirement | Owner | Evidence |
|---|---|---|
| A -> B -> C -> E -> D and frozen C PASS | Precondition | Ancestor/report/version/real-probe gate |
| B generator consumed once by installer; no duplicate Python generator | Precondition, Task 11 | Import/source/static proof |
| Browser uses SW ID; installer uses B generator | Tasks 2, 7, 11 | Exact call/ID tests |
| Browser full process identity and canonical cwd | Tasks 2-3 | C launch/readiness call-order tests |
| Installer null identity/no self-wait | Task 11 | Controller/Plan B recording test |
| C high-level preparation only | Task 2 | Static import/call scan |
| C nested receipt/bounded cursor exact replay | Tasks 2, 6, 8 | Receipt/wrong-ID/replay matrix |
| Shipped prerelease and leading-v handling | Tasks 6, 8 | Availability/legacy table |
| Independent event reducer prevents queue deadlock | Task 7 | Awaiting-event regression |
| E owns update-error helper/tests | Tasks 6-10 | Unchanged helper plus full E suite |
| E parse -> same lease gate -> start -> same lease send | Tasks 5, 9 | Order/identity/disconnect tests |
| Invalid Analyze opens no port | Tasks 5, 9 | Provider acquisition assertion |
| Exact action matrix and hydration suppression | Tasks 5, 9-10 | Gate/Worker/Options tests |
| One-key runtime union and crash windows | Tasks 6-8 | Strict parser/restart matrix |
| Exact status polling schedule/budget | Task 7 | Fake-clock test |
| Reload before new Extension/main gate | Task 8 | Fresh-Worker ordering test |
| Receipt marker before ack/one announcement | Task 8 | Lost-response/restart matrix |
| UI has no direct update ownership | Tasks 9-10 | Component tests/static scan |
| PowerShell external intent/no package mutation | Task 11 | Controlled script/static tests |
| Python owns stop/wait/commit/probe/finalize | Task 11 | Process/order/fake adapter tests |
| Registration only after committed result | Task 11 | Exit-11/register/resume tests |
| Release hashes and no publish preserved | Task 12 | Plan A stage validation/mocked side effects |
| Final original-base review has no Critical/Important findings | Task 14 | Exact `0040b1d..<final-D-head>` package, binary diff, and PASS findings |
| Old updater retired only after complete gates/build | Tasks 12-13 | Pre-cutover PASS then final cutover PASS |
| Final actual frozen rebuild/probe passes | Tasks 13-14 | Exact 6.18.0/build/module/probe output |
| No real machine/release side effects | Global, Task 14 | Isolation, mocks, scope/status audit |
| Disposable-VM smoke deferred | Task 14 | Explicit report/release gate |

Plan D is complete only when every acceptance row is evidenced at committed HEAD and `PLAN_D_FROZEN_GATE_STATUS=PASS`. Until Plan B owns the missing public generator and Plan C's committed frozen gate is PASS, this plan remains `BLOCKED` and no partial runtime route may be activated.
