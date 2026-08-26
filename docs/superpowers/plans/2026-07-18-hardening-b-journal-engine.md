# Hardening Plan B Journal Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dormant, mutex-serialized Host/Extension filesystem transaction engine with strict durable journals, exact ownership, idempotent resume, and evidence-preserving rollback.

**Architecture:** `update_journal.py` owns strict transaction/active schemas and atomic JSON, `update_ownership.py` converts Plan A's frozen package documents into a persisted exact ownership plan, `update_mutex.py` owns installation identity and Windows named locking, and `update_engine.py` exclusively owns all workspace and live phase transitions. Plans C/D consume the frozen readers, paths, hooks, exceptions, and engine methods; they never write `journal.json` or `active.json`.

**Tech Stack:** Python 3.13 standard library, `dataclasses`, `enum.StrEnum`, `pathlib`, `json`, `hashlib`, `ctypes`, and `unittest`

## Global Constraints

- Implementation begins only after all five reviewed plan documents are tracked and committed, the worktree/index are clean, and reviewed Plan A is committed and green. Record the clean planning head and Plan A implementation head before product edits; a Plan A mismatch blocks Plan B rather than permitting an adapter. Known Plan C/D drift does not block Plan B implementation; it is explicitly frozen in Task 8 and must be revised before Plans C/D execute.
- This plan was authored in `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-prompt-scope-spec` from source head `e5910f4`; implementation starts from the later committed Plan A result.
- Use TDD for each production task. Retain exact RED, GREEN, and restored mutation evidence in `.superpowers/sdd/hardening-b-journal-engine-report.md`.
- Every Host Python process gets fresh isolated `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` before process start. Focused commands set `PYTHONPATH=host`; full discovery removes it.
- All updater tests use only `TemporaryDirectory` install/package/update trees and injected mutex/wait/probe/fault adapters. Never access real `%LOCALAPPDATA%\DynamicsHelper`, installed Extension, registry, RunOnce, browser, process, or network.
- Add no third-party dependency. Plan B production modules import only the standard library and frozen Plan A standard-library modules.
- Do not modify `host/dh_native_host.py`, `host/updater.py`, `release_helper.py`, installer scripts, Extension files, or Plan A modules. Do not activate update routing, process launch, registry, RunOnce, registration, cleanup receipts, packaging, release, version, tag, push, or install.
- Preserve byte-for-byte `config.json`, `copilot-instructions.md`, `user_prompt.md`, logs/rotations, generated `manifest.json`, and unknown top-level paths. Transaction operations never mutate unrelated `updates/**`; they mutate only `updates/transactions/` plus the validated 32-hex transaction ID and stable `updates/active.json`, and terminal receipt cleanup later removes only that matching workspace/active. `_internal` and `extension` are whole product directories, never merged.
- Install all Host roots before `dh_native_host.exe`; install the executable last. Install the metadata pair only after Host and Extension and advance `metadata-installed` only after both exact live hashes verify.
- Seed `config.json` only for `fresh`; installed and legacy-v1 plans always have `seed_files == ()`. Never overwrite post-plan user creation.
- `prepared` is inert. `resume`/`rollback` on terminal phases are no-ops that retain evidence; only the separately named receipt-triggered `finalize_terminal_evidence` cleanup mutates terminal workspace/active. Rollback failure writes `recovery-required` and retains active/journal/ownership/staged/backup/failed-new evidence.
- Every workspace mutation, active-record mutation, activation, nonterminal resume, and rollback is under the installation mutex and rereads active/journal/ownership under lock. Read-only status journal reads do not take the mutex.
- `UpdateEngine` exclusively owns every journal write/transition and every workspace/active mutation. Plans C/D may call only strict readers/path resolvers and `create_prepared`, `activate_prepared`, `resume`, `rollback`, and receipt-triggered `finalize_terminal_evidence`; no later plan writes/deletes journal, workspace, or active paths directly.
- `host/update_journal.py` is the only Python owner of transaction-ID generation. `generate_transaction_id()` obtains exactly 16 cryptographically random bytes and returns their 32-character lowercase hexadecimal representation. Browser code uses its own reviewed `crypto.getRandomValues` adapter; Plans C/D and installer code must not define another Python generator.

### Execution Precondition

Run before Task 1:

```powershell
$plans = @(
  "docs/superpowers/plans/2026-07-18-hardening-a-package-integrity.md",
  "docs/superpowers/plans/2026-07-18-hardening-b-journal-engine.md",
  "docs/superpowers/plans/2026-07-18-hardening-c-detached-recovery.md",
  "docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md",
  "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"
)
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { throw "Plan B requires an empty index." }
foreach ($plan in $plans) { git ls-files --error-unmatch -- $plan | Out-Null; if ($LASTEXITCODE -ne 0) { throw "Uncommitted plan: $plan" } }
if (@(git status --porcelain=v1).Count -ne 0) { throw "Plan B requires a clean worktree/index." }
$env:PLAN_B_BASE = (git rev-parse HEAD).Trim()
```

Expected: exit 0, empty status, and `PLAN_B_BASE` is the clean commit containing all reviewed plans.

### Isolated Focused Command

Use this wrapper, replacing only the final unittest selectors:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-b-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_update_journal -v
```

## Exact Plan A Contract

Consume these frozen symbols from Plan A exactly:

```python
from package_manifest import (
    FileRecord,
    generate_release_documents,
    InstalledProduct,
    LEGACY_PRODUCT_ALLOWLIST_VERSION,
    LEGACY_PRODUCT_PATHS,
    LIVE_ONLY_OWNERSHIP_CLASSES,
    ManifestEntry,
    OWNERSHIP_SCHEMA_VERSION,
    OwnershipClass,
    PACKAGED_METADATA_PATHS,
    PRODUCT_OWNERSHIP_CLASSES,
    RELEASE_INTEGRITY_SCHEMA_VERSION,
    ReleaseIntegrity,
    SERIALIZED_PACKAGE_ONLY_PATHS,
    INSTALLED_PRODUCT_SCHEMA_VERSION,
    UPDATE_MANIFEST_SCHEMA_VERSION,
    UPDATE_MANIFEST_PATH,
    UpdateManifest,
    canonical_json_bytes,
    installed_product_to_dict,
    load_installed_product,
    load_release_integrity,
    release_integrity_to_dict,
    sha256_bytes,
    sha256_file,
    update_manifest_to_dict,
    write_release_documents,
)
from package_archive import (
    ValidatedPackage,
    stage_and_validate_archive,
    validate_staged_package,
)
```

Exact relevant shapes:

```python
class OwnershipClass(str, Enum):
    WHOLE_PRODUCT_DIRECTORY = "whole_product_directory"
    HOST_PRODUCT_FILE = "host_product_file"
    SEED_ONLY = "seed_only"
    PACKAGED_METADATA = "packaged_metadata"
    GENERATED_REGISTRATION = "generated_registration"
    USER_OWNED = "user_owned"
    TRANSACTION_WORKSPACE = "transaction_workspace"
    PACKAGE_ONLY = "package_only"
    UNKNOWN_TOP_LEVEL = "unknown_top_level"

@dataclass(frozen=True, order=True)
class FileRecord:
    path: str
    sha256: str

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

@dataclass(frozen=True)
class ReleaseIntegrity:
    schema_version: int
    package_version: str
    required_capabilities: tuple[str, ...]
    provided_capabilities: tuple[str, ...]
    chrome_version: str
    chrome_version_name: str | None
    host_files: tuple[FileRecord, ...]
    extension_files: tuple[FileRecord, ...]

@dataclass(frozen=True)
class InstalledProduct:
    schema_version: int
    package_version: str
    required_capabilities: tuple[str, ...]
    provided_capabilities: tuple[str, ...]
    ownership_schema_version: int
    legacy_allowlist_version: int
    release_integrity_sha256: str

@dataclass(frozen=True)
class ValidatedPackage:
    stage_root: Path
    manifest: UpdateManifest
    release_integrity: ReleaseIntegrity
    installed_product: InstalledProduct

validate_staged_package(stage_root: Path, *, expected_version: str | None = None) -> ValidatedPackage
stage_and_validate_archive(archive_path: Path, stage_root: Path, *, expected_version: str | None = None) -> ValidatedPackage

OWNERSHIP_SCHEMA_VERSION = 1
UPDATE_MANIFEST_SCHEMA_VERSION = 1
RELEASE_INTEGRITY_SCHEMA_VERSION = 1
INSTALLED_PRODUCT_SCHEMA_VERSION = 1
LEGACY_PRODUCT_ALLOWLIST_VERSION = 1
PACKAGED_METADATA_PATHS = (
    "host/installed-product.json",
    "host/release-integrity.json",
)
SERIALIZED_PACKAGE_ONLY_PATHS = ("install.bat", "installer_core.ps1")
UPDATE_MANIFEST_PATH = "update-manifest.json"
PRODUCT_OWNERSHIP_CLASSES = (
    OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
    OwnershipClass.HOST_PRODUCT_FILE,
)
LIVE_ONLY_OWNERSHIP_CLASSES = (
    OwnershipClass.GENERATED_REGISTRATION,
    OwnershipClass.USER_OWNED,
    OwnershipClass.TRANSACTION_WORKSPACE,
    OwnershipClass.UNKNOWN_TOP_LEVEL,
)
```

Every `ManifestEntry.sha256` and `FileRecord.sha256` is non-null lowercase 64-hex. Derive package ownership only by filtering `UpdateManifest.entries`; there is no `manifest.inventory`. Plan A explicitly permits Host N to validate an internally consistent package N+1: Plan B never compares package version/capabilities to the importing Host's `VERSION` or capability constants. It calls `validate_staged_package(package.stage_root, expected_version=expected_version)`, where `expected_version` is either `None` or a trusted non-empty selected target, and requires the returned `ValidatedPackage` models to equal the supplied models. Browser-selected updates require a non-empty selected target; synchronous/manual installer preparation may pass `None` when no trusted target exists.

Plan B additionally validates before preparation: all three schema versions equal Plan A constants; manifest/integrity/installed package versions and capability tuples agree with one another; `manifest.chrome_version == integrity.chrome_version` and `manifest.chrome_version_name == integrity.chrome_version_name`; installed ownership/legacy versions equal Plan A constants; canonical `release-integrity.json` hash equals `InstalledProduct.release_integrity_sha256`; both metadata entry hashes equal exact staged canonical bytes; and manifest product sets equal `ReleaseIntegrity.host_files`/`extension_files` by path and hash in both directions. `InstalledProduct` has no Chrome fields, so do not invent any; its applicable equality axes are package version and required/provided capabilities.

Before Task 1 implementation, run this exact signature/field probe in the isolated focused environment and record output:

```powershell
& "host/venv/Scripts/python.exe" -c "import inspect; from package_archive import ValidatedPackage,stage_and_validate_archive,validate_staged_package; from package_manifest import FileRecord,InstalledProduct,ManifestEntry,UpdateManifest,load_installed_product,load_release_integrity; symbols=(validate_staged_package,stage_and_validate_archive,load_installed_product,load_release_integrity); [print(s.__name__,inspect.signature(s)) for s in symbols]; [print(t.__name__,tuple(t.__dataclass_fields__)) for t in (FileRecord,ManifestEntry,UpdateManifest,InstalledProduct,ValidatedPackage)]"
```

Expected fields exactly match the frozen shapes above; any mismatch stops Plan B.

## Exact File Map

| File | Action | Responsibility |
|---|---|---|
| `host/update_journal.py` | Create | Strict IDs/process identity/phases/failures/journal/active/path schemas and atomic JSON |
| `host/update_ownership.py` | Create | Plan A entry filtering, installed/legacy/fresh ownership, prior/new exact digests, canonical sidecar |
| `host/update_mutex.py` | Create | Canonical install identity, deterministic mutex name, fixed exceptions, Windows named mutex |
| `host/update_engine.py` | Create | Mutex-owned preparation/activation/phase operations/rollback/resume |
| `host/test_update_support.py` | Create | Real Plan A fixtures, fake mutex/hooks, snapshots, crashes/faults |
| `host/test_update_journal.py` | Create | Schema/path/transition/atomic/failure-lineage tests |
| `host/test_update_ownership.py` | Create | Plan A alignment, source modes, seed and strict parser tests |
| `host/test_update_mutex.py` | Create | Identity/name/contention/abandonment/cleanup tests |
| `host/test_update_engine_host.py` | Create | Mutex preparation, replay, active, Host state tables/order |
| `host/test_update_engine_extension.py` | Create | Whole Extension, fresh seed, metadata pair, probe, commit |
| `host/test_update_engine_rollback.py` | Create | Rollback lineage, exact restoration, recovery-required evidence |
| `host/test_update_engine_resume.py` | Create | Literal exhaustive matrix for installed, legacy, fresh-seeded, fresh-preexisting, and fresh-post-plan-user-creation |
| `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `docs/session-handoff-2026-07-15.md` | Modify | Dormant Plan B rules and C/D handoff |
| `.superpowers/sdd/hardening-b-journal-engine-report.md` | Create | Prerequisites, commits, RED/GREEN/mutations/matrix/gates |

### Exact Test Class Map

| File | Exact classes |
|---|---|
| `host/test_update_journal.py` | `TransactionIdTests`, `TransactionPathsTests`, `JournalParserTests`, `ActiveRecordTests`, `ExceptionContractTests`, `AtomicJsonTests`, `TransitionTests`, `FailureLineageTests` |
| `host/test_update_ownership.py` | `PlanAContractTests`, `ExceptionContractTests`, `OwnershipSerializationTests`, `BuildOwnershipPlanTests` |
| `host/test_update_mutex.py` | `ExceptionContractTests`, `MutexIdentityTests`, `WindowsNamedMutexTests` |
| `host/test_update_engine_host.py` | `ExceptionContractTests`, `MutexOwnershipTests`, `PreparedWorkspaceTests`, `HostPhaseTests`, `TerminalEvidenceTests` |
| `host/test_update_engine_extension.py` | `ExtensionPhaseTests`, `SeedPhaseTests`, `MetadataAndProbeTests` |
| `host/test_update_engine_rollback.py` | `RollbackRestorationTests`, `FailureLineageTests`, `RecoveryRequiredTests` |
| `host/test_update_engine_resume.py` | `MatrixCoverageTests`, `ForwardFaultMatrixTests`, `RollbackFaultMatrixTests`, `OwnershipBoundaryTests` |

---

### Task 1: Atomic Journal, Process Identity, Active Record, And Paths

**Files:**
- Create: `host/update_journal.py`
- Create: `host/test_update_journal.py`

**Interfaces:**
- Produces all strict durable schema types/readers/writers and legal transition validation used by Tasks 2-8 and Plans C/D.

- [ ] **Step 1: Write RED schema, exception, path, and invariant tests**

Use exact classes:

```python
class UpdateError(RuntimeError):
    error_code = "update_error"

    def __init__(self) -> None:
        super().__init__(self.error_code)

class JournalValidationError(UpdateError):
    error_code = "update_journal_invalid"

class JournalTransitionError(UpdateError):
    error_code = "update_journal_transition_invalid"
```

All instances use fixed safe messages equal to their code; constructors accept no raw message. Test `str(error) == error.error_code`, inheritance, and no rejected value appears in text.

Table-drive exact IDs, duplicate/noncanonical JSON, wrong keys/types, all phase invariants, failure lineage, active containment, and every path field. For install root `C:\isolated\DynamicsHelper` and ID `0123456789abcdef0123456789abcdef`, assert this exact layout:

In `TransactionIdTests`, freeze both parsing and generation:

```python
def test_generate_transaction_id_uses_exactly_sixteen_bytes(self):
    calls = []

    def random_bytes(length: int) -> bytes:
        calls.append(length)
        return bytes(range(16))

    self.assertEqual(
        generate_transaction_id(random_bytes),
        "000102030405060708090a0b0c0d0e0f",
    )
    self.assertEqual(calls, [16])

def test_generate_transaction_id_rejects_bad_random_output(self):
    for value in (b"short", bytearray(16), "0" * 16, None):
        with self.subTest(value_type=type(value).__name__):
            with self.assertRaisesRegex(
                JournalValidationError,
                "^update_journal_invalid$",
            ):
                generate_transaction_id(lambda _length, value=value: value)

def test_generate_transaction_id_keeps_lowercase_fixed_width(self):
    values = iter((b"\xff" * 16, b"\x00" * 15 + b"\x01"))
    first = generate_transaction_id(lambda _length: next(values))
    second = generate_transaction_id(lambda _length: next(values))
    self.assertRegex(first, r"^[0-9a-f]{32}$")
    self.assertRegex(second, r"^[0-9a-f]{32}$")
    self.assertNotEqual(first, second)
```

The injected callable is a test boundary, not an entropy fallback. If it raises, returns a non-`bytes` object, or returns any length other than 16, generation raises the fixed safe `JournalValidationError` without coercing or logging the rejected value.

Also patch `Path.lstat()` so each existing updates/transaction parent reports symlink or Windows reparse attributes and assert `JournalValidationError` before any mutation.

```text
install_root                     = C:/isolated/DynamicsHelper
updates_root                     = C:/isolated/DynamicsHelper/updates
active                           = C:/isolated/DynamicsHelper/updates/active.json
transactions_root                = C:/isolated/DynamicsHelper/updates/transactions
preparing_root                   = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing
preparing_staged_root            = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing/staged
preparing_staged_host            = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing/staged/host
preparing_staged_extension       = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing/staged/extension
preparing_probe_manifest         = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing/probe/update-manifest.json
preparing_ownership              = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing/ownership.json
preparing_journal                = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef.preparing/journal.json
transaction_root                 = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef
staged_root                      = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/staged
staged_host                      = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/staged/host
staged_extension                 = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/staged/extension
backup_root                      = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/backup
host_backup                      = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/backup/host
extension_backup                 = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/backup/extension
metadata_backup                  = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/backup/metadata
failed_new_root                  = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/failed-new
probe_root                       = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/probe
probe_manifest                   = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/probe/update-manifest.json
ownership                        = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/ownership.json
journal                          = C:/isolated/DynamicsHelper/updates/transactions/0123456789abcdef0123456789abcdef/journal.json
```

Assert `active.json` is directly under stable `updates`, never under `updates/recovery`.

- [ ] **Step 2: Run RED**

Run the isolated wrapper, replacing its unittest line with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_journal.TransactionIdTests host.test_update_journal.TransactionPathsTests host.test_update_journal.JournalParserTests host.test_update_journal.ActiveRecordTests host.test_update_journal.ExceptionContractTests -v
```

Expected: `ModuleNotFoundError: No module named 'update_journal'`.

- [ ] **Step 3: Implement exact durable types and phase invariants**

Add these imports and the single generator beside `parse_transaction_id`:

```python
import secrets
from collections.abc import Callable


def generate_transaction_id(
    random_bytes: Callable[[int], bytes] = secrets.token_bytes,
) -> str:
    try:
        raw = random_bytes(16)
    except Exception as error:
        raise JournalValidationError() from error
    if type(raw) is not bytes or len(raw) != 16:
        raise JournalValidationError()
    return parse_transaction_id(raw.hex())
```

Do not catch `BaseException`, retry entropy collection, truncate/pad output, or accept `bytearray`/`memoryview`. `raw.hex()` is lowercase and fixed-width for exactly 16 bytes; the final parser remains the canonical format check.

```python
class JournalPhase(StrEnum):
    STAGING = "staging"
    PREPARED = "prepared"
    WAITING_FOR_HOST_EXIT = "waiting-for-host-exit"
    HOST_BACKED_UP = "host-backed-up"
    HOST_INSTALLED = "host-installed"
    EXTENSION_BACKED_UP = "extension-backed-up"
    EXTENSION_INSTALLED = "extension-installed"
    METADATA_INSTALLED = "metadata-installed"
    PROBING = "probing"
    COMMITTED = "committed"
    ROLLING_BACK = "rolling-back"
    ROLLED_BACK = "rolled-back"
    RECOVERY_REQUIRED = "recovery-required"

JOURNAL_SCHEMA_VERSION = 1

class UpdateInitiator(StrEnum):
    BROWSER = "browser"
    INSTALLER = "installer"

class JournalReason(StrEnum):
    HOST_EXIT_WAIT_FAILED = "host_exit_wait_failed"
    HOST_BACKUP_FAILED = "host_backup_failed"
    HOST_INSTALL_FAILED = "host_install_failed"
    EXTENSION_BACKUP_FAILED = "extension_backup_failed"
    EXTENSION_INSTALL_FAILED = "extension_install_failed"
    METADATA_INSTALL_FAILED = "metadata_install_failed"
    STARTUP_PROBE_FAILED = "startup_probe_failed"
    LOCKED_PATH = "locked_path"
    ROLLBACK_FAILED = "rollback_failed"
    MANUAL_RECOVERY_REQUIRED = "manual_recovery_required"

FORWARD_FAILURE_CODES = frozenset({
    JournalReason.HOST_EXIT_WAIT_FAILED, JournalReason.HOST_BACKUP_FAILED,
    JournalReason.HOST_INSTALL_FAILED, JournalReason.EXTENSION_BACKUP_FAILED,
    JournalReason.EXTENSION_INSTALL_FAILED, JournalReason.METADATA_INSTALL_FAILED,
    JournalReason.STARTUP_PROBE_FAILED, JournalReason.LOCKED_PATH,
})
RECOVERY_REASON_CODES = frozenset({
    JournalReason.ROLLBACK_FAILED,
    JournalReason.MANUAL_RECOVERY_REQUIRED,
})

FAILURE_CODE_BY_COMPLETION_PHASE = {
    JournalPhase.WAITING_FOR_HOST_EXIT: JournalReason.HOST_EXIT_WAIT_FAILED,
    JournalPhase.HOST_BACKED_UP: JournalReason.HOST_BACKUP_FAILED,
    JournalPhase.HOST_INSTALLED: JournalReason.HOST_INSTALL_FAILED,
    JournalPhase.EXTENSION_BACKED_UP: JournalReason.EXTENSION_BACKUP_FAILED,
    JournalPhase.EXTENSION_INSTALLED: JournalReason.EXTENSION_INSTALL_FAILED,
    JournalPhase.METADATA_INSTALLED: JournalReason.METADATA_INSTALL_FAILED,
    JournalPhase.PROBING: JournalReason.STARTUP_PROBE_FAILED,
}

@dataclass(frozen=True)
class InitiatingProcessIdentity:
    pid: int
    creation_token: str

@dataclass(frozen=True)
class SeedOperationReceipt:
    path: str
    expected_sha256: str
    seed_installed: bool
    observed_live_sha256: str | None

@dataclass(frozen=True)
class TerminalVersion:
    version: str | None
    fresh_install: bool

@dataclass(frozen=True)
class ActiveTransaction:
    schema_version: int
    transaction_id: str
    journal_path: str

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

`JOURNAL_SCHEMA_VERSION` is exactly integer `1`; parser rejects booleans and every other integer. `creation_token` is a non-empty opaque string from Plan C's process adapter; Plan B stores/compares it without interpretation. Exact journal invariants:

| Phase | browser process | installer process | reason | original failure | rollback_from |
|---|---|---|---|---|---|
| staging/prepared | null | null | null | null | null |
| waiting through probing, committed | required positive PID/non-empty token | null | null | null | null |
| rolling-back | same immutable identity | null | equals original forward code | required forward code | required forward phase |
| recovery-required | same immutable identity | null | rollback/manual code | immutable forward code | immutable forward phase |
| rolled-back | same immutable identity | null | equals original forward code | immutable forward code | immutable forward phase |

`rollback_from` must be one of `waiting-for-host-exit`, `host-backed-up`, `host-installed`, `extension-backed-up`, `extension-installed`, `metadata-installed`, or `probing`; staging/prepared cannot fail into rollback because no live mutation has begun, and committed cannot roll back. Browser identity cannot be erased/changed after waiting. Installer identity is always null; this is valid only when `initiator == installer`, and activation skips the wait hook. `recovery-required -> rolling-back` sets `reason_code = original_failure_code`, never `rollback_failed`, while retaining original failure and rollback phase. `rolling-back -> recovery-required` changes only current reason. `rolling-back -> rolled-back` restores current reason to original. Parser rejects every incoherent combination.

Serialize process identity exactly as `{"creation_token":"win-create-time-133801632000000000","pid":1234}` under key `initiating_process`; parser accepts any non-empty string token and positive exact-int PID. Serialize `SeedOperationReceipt` with exact keys `path`, `expected_sha256`, `seed_installed`, `observed_live_sha256`. Exact journal keys are `schema_version`, `transaction_id`, `phase`, `initiator`, `target_version`, `prior_version`, `fresh_install`, `ownership_path`, `ownership_sha256`, `initiating_process`, `seed_receipt`, `reason_code`, `original_failure_code`, and `rollback_from`.

`fresh_install` is immutable. Fresh source requires `fresh_install == True` and `prior_version is None`; installed/legacy require `fresh_install == False` and a non-empty `prior_version`. Browser/installer callers therefore pass the current prior product version for every non-fresh transaction; installed metadata must equal it, while legacy uses this explicit caller value because metadata is absent.

Receipt/finalization consumers serialize `TerminalVersion` exactly as `{"fresh_install":false,"version":"2.0.74"}` or fresh rollback `{"fresh_install":true,"version":null}`. The stable finalization receipt must embed this object under exact key `terminal_version` rather than keeping a universally non-null scalar `version`; downstream terminal receipt schemas must carry both nested keys and accept null only for fresh rollback.

`fresh_install` is derived from `OwnershipPlan.source is FRESH` during engine creation; callers do not supply a separate boolean. Journal parser still validates the immutable serialized fact against `prior_version`, and engine cross-validates it against the ownership sidecar on every reread.

`ownership_path` is exactly normalized transaction-root-relative POSIX `ownership.json`. Reject absolute/drive/UNC paths, backslashes, empty/dot/parent segments, every other filename, and throwing/non-string values. Resolve it as `transaction_root / PurePosixPath(ownership_path)`, canonicalize with `strict=False`, and require it remains directly contained in the canonical transaction root.

Seed receipt is null before seed handling. It may first appear while phase is `extension-backed-up` and is immutable afterward. `observed_live_sha256` is null only when live config is absent after an already completed seed move/user deletion; otherwise it is lowercase 64-hex. Engine cross-validation requires a receipt exactly when a fresh plan has a seed and phase is `extension-installed` or later; installed, legacy, and fresh-preexisting plans always keep it null. `record_seed_receipt` writes the journal atomically without changing phase, calls `after_journal_transition(journal.phase)` only after durable replacement, and its operation label `journal:record-seed-receipt` participates in before/after-operation fault injection.

`TransactionPaths.for_install` resolves the install root, derives every fixed child above, and verifies containment. Preparation writes only under the validated transaction ID plus suffix `.preparing`; final `transaction_root` does not exist until one atomic `os.replace(preparing_root, transaction_root)` after prepared journal, ownership, probe manifest, and staged payload all verify. `probe_manifest` is included so no later plan invents or writes a transaction-workspace path outside the Plan B API.

All path checks are lexical plus canonical: resolve `install_root` once, derive children from validated ID only, and require `path.resolve(strict=False).is_relative_to(updates_root)` for update paths. Automated fixtures contain no symlink/junction; production rejects a pre-existing reparse/symlink component in `updates`, preparing/final transaction, staged, backup, probe, failed-new, or active parent before mutation. This does not broaden the spec into hostile-repository containment; it prevents the updater workspace from escaping its fixed root.

Freeze signatures:

```text
parse_transaction_id(value: object) -> str
generate_transaction_id(random_bytes: Callable[[int], bytes] = secrets.token_bytes) -> str
parse_journal(value: object) -> UpdateJournal
parse_journal_text(text: str) -> UpdateJournal
journal_to_value(journal: UpdateJournal) -> dict[str, object]
parse_active_transaction(value: object) -> ActiveTransaction
parse_active_transaction_text(text: str) -> ActiveTransaction
active_transaction_to_value(active: ActiveTransaction) -> dict[str, object]
read_journal(path: Path) -> UpdateJournal
read_active_transaction(path: Path) -> ActiveTransaction
write_journal_atomic(path: Path, journal: UpdateJournal) -> None
write_active_transaction_atomic(path: Path, active: ActiveTransaction) -> None
resolve_ownership_path(journal_path: Path, journal: UpdateJournal) -> Path
resolve_active_journal(updates_root: Path, active: ActiveTransaction) -> Path
TransactionPaths.for_install(install_root: Path, transaction_id: object) -> TransactionPaths
new_staging_journal(*, transaction_id: str, initiator: UpdateInitiator, target_version: str, prior_version: str | None, fresh_install: bool, ownership_sha256: str) -> UpdateJournal
transition(journal: UpdateJournal, next_phase: JournalPhase, *, initiating_process: InitiatingProcessIdentity | None = None, failure_code: JournalReason | None = None) -> UpdateJournal
record_seed_receipt(journal: UpdateJournal, receipt: SeedOperationReceipt) -> UpdateJournal
terminal_version(journal: UpdateJournal) -> TerminalVersion
terminal_version_to_value(value: TerminalVersion) -> dict[str, object]
parse_terminal_version(value: object) -> TerminalVersion
```

`resolve_ownership_path` requires journal path name `journal.json`, resolves its parent as the transaction root (including `.preparing` during preparation), joins exact relative `ownership.json`, and requires canonical direct-child containment. `read_journal` invokes this resolver before returning. Active exact JSON is `{"journal_path":"transactions/0123456789abcdef0123456789abcdef/journal.json","schema_version":1,"transaction_id":"0123456789abcdef0123456789abcdef"}`. Active text uses the same duplicate-key/non-finite/canonical-byte rules as journal text. Resolve only inside `updates/transactions`; reject absolute, backslash, parent, mismatched ID.

`terminal_version` accepts only committed/rolled-back. Committed returns `TerminalVersion(version=target_version, fresh_install=fresh_install)`. Rolled-back with prior version returns that version and `fresh_install=False`; rolled-back fresh returns `TerminalVersion(version=None, fresh_install=True)`. `terminal_version_to_value` emits exact keys `fresh_install`, `version`; `parse_terminal_version` accepts only a boolean plus non-empty string/null, requires null implies `fresh_install=True`, and permits a non-null version with either fresh flag. No downstream receipt parser may require a non-null rolled-back version when `fresh_install` is true.

For committed fresh installation, `terminal_version` returns the non-null target with `fresh_install=True`; null version is permitted only for rolled-back fresh. Tests cover all four combinations: committed upgrade, committed fresh, rolled-back upgrade/legacy, rolled-back fresh.

- [ ] **Step 4: Write RED atomic and transition lineage tests**

Assert sibling write/flush/fsync/close/replace, old-target survival on replace failure, exact `JOURNAL_SCHEMA_VERSION == 1`, strict relative `ownership_path` parsing/containment, adjacent graph, browser/installer identity invariants, immutable seed receipt, terminal-version projection, recovery retry lineage, and terminal rejection. Test `rolling-back(original=host_install_failed) -> recovery-required(reason=rollback_failed) -> rolling-back(reason=host_install_failed) -> rolled-back(reason=host_install_failed)` round-trip through disk after every transition. Test committed target version; rolled-back installed/legacy prior version; and rolled-back fresh `TerminalVersion(version=None, fresh_install=True)`.

- [ ] **Step 5: Run RED**

Run the isolated wrapper with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_journal.AtomicJsonTests host.test_update_journal.TransitionTests host.test_update_journal.FailureLineageTests -v
```

Expected: missing atomic/transition functions.

- [ ] **Step 6: Implement atomic JSON and legal graph**

Use canonical ASCII sorted compact JSON plus newline. Write unique same-directory sibling with exclusive create, flush/fsync/close, `os.replace`; failure removes only sibling. Implement the spec phase graph and invariants above. `new_staging_journal` validates initiator/prior/fresh combinations and returns staging with null process/seed/failure fields; it performs no I/O. The engine writes that snapshot in `.preparing` before staged files, then calls `transition(staging, PREPARED)` only after staged files and ownership are durable.

- [ ] **Step 7: Run GREEN/mutation**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_journal -v`. Mutate retry to retain `ROLLBACK_FAILED` as current reason; `FailureLineageTests` must fail; restore and rerun the same command to `OK`.

- [ ] **Step 8: Commit**

```powershell
git add host/update_journal.py host/test_update_journal.py
git commit -m "feat(update): add strict transaction journal"
```

### Task 2: Exact Plan A Ownership For Fresh, Installed, And Legacy-v1

**Files:**
- Create: `host/update_ownership.py`
- Create: `host/test_update_ownership.py`

**Interfaces:**
- Consumes: exact Plan A contract above and Task 1 atomic JSON/transaction ID.
- Produces: strict `OwnershipPlan`, Plan A link validation, source classification, read/write/digest APIs.

- [ ] **Step 1: Write RED Plan A alignment and exception tests**

Freeze safe exceptions:

```python
class OwnershipError(UpdateError):
    error_code = "update_ownership_invalid"

class OwnershipConflictError(OwnershipError):
    error_code = "update_ownership_conflict"
```

Construct tests with actual Plan A `ManifestEntry`, `FileRecord`, `UpdateManifest`, `ReleaseIntegrity`, `InstalledProduct`, and `ValidatedPackage`. Assert no `OwnershipInventory`, `.inventory`, nullable hash, or omitted InstalledProduct capability/legacy field is referenced. Use a fresh-process Plan A fixture whose target differs from the running Host and prove `validate_package_links(package, expected_version=target)` accepts N+1 while `expected_version=wrong` rejects. Test every Plan A link mismatch independently: package version; required/provided capabilities; `chrome_version`; `chrome_version_name` including `None` versus nonempty; ownership schema; legacy allowlist version; release-integrity canonical hash; each metadata `ManifestEntry` hash; Host product bijection; Extension product bijection; ownership class/path mismatch; and physical staged hash mismatch. All raise fixed safe `OwnershipError` without mutation.

- [ ] **Step 2: Run RED**

Run the isolated wrapper with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_ownership.PlanAContractTests host.test_update_ownership.ExceptionContractTests -v
```

Expected: missing `update_ownership`.

- [ ] **Step 3: Define exact persisted ownership schema**

```python
class OwnershipSource(StrEnum):
    FRESH = "fresh"
    INSTALLED = "installed"
    LEGACY_V1 = "legacy-v1"

@dataclass(frozen=True, order=True)
class FileDigest:
    path: str
    sha256: str

@dataclass(frozen=True)
class OwnershipPlan:
    schema_version: int
    transaction_id: str
    source: OwnershipSource
    expected_version: str | None
    target_version: str
    prior_version: str | None
    package_ownership_sha256: str
    host_backup_roots: tuple[str, ...]
    prior_host_files: tuple[FileDigest, ...]
    prior_extension_files: tuple[FileDigest, ...]
    prior_metadata_files: tuple[FileDigest, ...]
    extension_was_present: bool
    metadata_was_present: bool
    host_install_roots: tuple[str, ...]
    host_files: tuple[FileDigest, ...]
    extension_files: tuple[FileDigest, ...]
    seed_files: tuple[FileDigest, ...]
    metadata_files: tuple[FileDigest, ...]
```

`expected_version` persists the trusted selected target exactly, or null for the explicitly unpinned installer/manual case. `target_version` is always package manifest version. `package_ownership_sha256` is SHA-256 of Plan A's complete canonical `UpdateManifest` bytes, including all serialized package-only entry triples but excluding only the impossible self-hash by Plan A schema; it therefore serves as the required package ownership digest. Same-ID replay requires identical expected/target versions and digest, rejecting changed capabilities, Chrome version fields, ownership classes, paths, or hashes even when target text is equal.

Parser requires non-null `expected_version == target_version`; null is allowed only for a package already validated without a trusted target. Engine additionally requires browser initiator to use non-null expected target, while installer may use either form.

`validate_package_links` requires this exact package identity predicate and mutation tests break each conjunct independently:

```python
manifest.package_version == integrity.package_version == installed.package_version
manifest.required_capabilities == integrity.required_capabilities == installed.required_capabilities
manifest.provided_capabilities == integrity.provided_capabilities == installed.provided_capabilities
manifest.chrome_version == integrity.chrome_version
manifest.chrome_version_name == integrity.chrome_version_name
```

When `expected_version` is non-null, additionally require `manifest.package_version == expected_version`. Never compare any package declaration to running Host constants.

Use `OWNERSHIP_SCHEMA_VERSION = 1` from Plan A as `OwnershipPlan.schema_version`; do not create a second independently versioned ownership interpretation. The parser requires equality to that constant.

The exact ownership JSON keys are the dataclass field names above. A representative `FileDigest` is exactly `{"path":"system_prompt.md","sha256":"0000000000000000000000000000000000000000000000000000000000000000"}`. Calculate `package_ownership_sha256` exactly as:

```python
sha256_bytes(canonical_json_bytes(update_manifest_to_dict(package.manifest)))
```

The sidecar deliberately excludes package-only installer bytes from staged product trees but includes their manifest triples in this digest. `validate_package_links` still hashes the physical serialized package-only files before preparation. `UPDATE_MANIFEST_PATH` is canonical-parsed/serialized and persisted separately as probe metadata; it has no self-hash entry.

Freeze:

```text
validate_package_links(package: ValidatedPackage, *, expected_version: str | None) -> None
build_ownership_plan(package: ValidatedPackage, install_root: Path, transaction_id: str, *, expected_version: str | None, prior_version: str | None) -> OwnershipPlan
parse_ownership_plan(value: object) -> OwnershipPlan
parse_ownership_plan_text(text: str) -> OwnershipPlan
ownership_plan_to_value(plan: OwnershipPlan) -> dict[str, object]
ownership_plan_bytes(plan: OwnershipPlan) -> bytes
ownership_plan_sha256(plan: OwnershipPlan) -> str
read_ownership_plan(path: Path) -> OwnershipPlan
write_ownership_plan_atomic(path: Path, plan: OwnershipPlan) -> None
```

Strictly sort all path tuples, reject casefold collisions, Windows-invalid components, reserved user/generated/workspace paths, wrong roots, duplicate membership, and non-lowercase hashes. Source invariants:

| Source | prior version/data | seeds | metadata |
|---|---|---|---|
| fresh | prior version null; all prior tuples/backup roots empty | exactly `host/config.json` mapped live-relative `config.json` iff absent at planning | no prior metadata |
| installed | non-empty prior version; exact prior Host/Extension/metadata | empty | exact prior pair |
| legacy-v1 | explicit non-empty caller prior version; exact existing fixed allowlist Host/Extension | empty | no prior metadata |

Fresh requires both presence flags false and `prior_version is None`. Installed requires both true, nonempty prior Extension/metadata tuples, and `prior_version == old InstalledProduct.package_version`. Legacy requires caller-supplied non-empty prior version and `metadata_was_present == False`; `extension_was_present` reflects the fixed legacy Extension directory independently of tuple length. Parser rejects every inconsistent combination, so rollback restores original absence/presence without inference.

- [ ] **Step 4: Write RED source-mode tests**

Use Plan A `generate_release_documents`, `write_release_documents`, and `validate_staged_package(..., expected_version=...)` to build real package fixtures. Plan B's public preparation boundary carries the same `expected_version` plus explicit `prior_version`; do not recover either from running Host globals. Cases:

| Case | Required result |
|---|---|
| fresh empty | source fresh, config seed only |
| fresh config preexists | fresh with no seed; config preserved |
| installed valid pair | strict-load both; verify all InstalledProduct fields/link; derive prior files from old ReleaseIntegrity and exact metadata bytes |
| half/invalid metadata | `OwnershipError`; never legacy fallback |
| installed missing/mismatched declared product | `OwnershipError` before workspace/live mutation |
| legacy fixed roots | derive only Plan A `LEGACY_PRODUCT_PATHS`; whole Extension/internal |
| legacy unknown paths/old exe suffix | preserve; absent from plan |
| installed/legacy package config | `seed_files == ()` even when live config absent |
| unknown top-level and `updates/unrelated.bin` | snapshots byte-identical after plan construction, commit, and rollback |
| legacy Extension absent versus present | `extension_was_present` false/true respectively; rollback restores the corresponding state |
| running N, package N+1, trusted target N+1 | accepted; `target_version` is N+1, never running N |
| running N, package N+1, wrong trusted target | `OwnershipError` before workspace mutation |
| manifest/integrity Chrome version/name mismatch | each mutation rejected before workspace mutation |
| fresh with null prior | accepted and later journal has `fresh_install == true` |
| installed/legacy with null prior | rejected before workspace mutation |
| installed caller prior differs from InstalledProduct | rejected before workspace mutation |

For installed/legacy, inventory complete old `_internal` and Extension including stale children so rollback has exact hashes. Unknown top-level paths remain outside prior product tuples.

- [ ] **Step 5: Run RED**

Run the isolated wrapper with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_ownership.OwnershipSerializationTests host.test_update_ownership.BuildOwnershipPlanTests -v
```

Expected: missing schema/build APIs.

- [ ] **Step 6: Implement Plan A filtering and metadata links**

Filter `package.manifest.entries` by exact `OwnershipClass`:

- Host products: `HOST_PRODUCT_FILE` and `WHOLE_PRODUCT_DIRECTORY` entries below `host/`.
- Extension products: `WHOLE_PRODUCT_DIRECTORY` entries below `extension/`.
- Seed: exactly `SEED_ONLY host/config.json` and only persisted for fresh/absent.
- Metadata: exactly both `PACKAGED_METADATA_PATHS` entries.
- Package-only: exactly `SERIALIZED_PACKAGE_ONLY_PATHS`; ignore for installation but include every entry in `package_ownership_sha256` and validate its physical hash. Validate root `UPDATE_MANIFEST_PATH` as Plan A's implicit package-only singleton without inventing a `ManifestEntry` or self-hash.
- Reject live-only classes in a `ValidatedPackage` even though Plan A validation should already have done so.

First call Plan A generic validation with the explicit `expected_version`, never running `VERSION`; require returned canonical models equal the supplied `ValidatedPackage`. Then validate every staged entry hash, Chrome identity, metadata link, and exact manifest/integrity bijection again before plan construction. For old installed metadata, strict-load canonical files; require InstalledProduct package version and required/provided capabilities equal the paired old ReleaseIntegrity, and require only ownership/legacy schema integers equal Plan A supported constants. Never compare old or target capabilities/version to importing Host constants. Hash canonical integrity and exact metadata bytes; verify every old declared product path and complete whole-directory inventory before returning. Installed requires a live Extension. Persist exact SHA-256 records for all existing files beneath owned Host roots and the complete Extension, including stale children under `_internal`/Extension, plus both old metadata bytes. Legacy-v1 inventories only existing Plan A fixed Host roots and complete Extension; fresh prior tuples are empty. Derive new roots and all new file hashes only from filtered `package.manifest.entries`, cross-checked against `package.release_integrity`; strip exactly one `host/` or `extension/` prefix.

- [ ] **Step 7: Run GREEN/mutations**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_ownership -v`. Mutate to read `.inventory`, allow nullable hash, drop installed capabilities/legacy version, and seed legacy mode one at a time; the matching `PlanAContractTests`/`BuildOwnershipPlanTests` case must fail. Restore and rerun the same command to `OK`.

- [ ] **Step 8: Commit**

```powershell
git add host/update_ownership.py host/test_update_ownership.py
git commit -m "feat(update): persist exact product ownership"
```

### Task 3: Installation Mutation Mutex And Fixed Exceptions

**Files:**
- Create: `host/update_mutex.py`
- Create: `host/test_update_mutex.py`

**Interfaces:**
- Produces canonical installation mutex identity, injectable `MutationMutex`, and safe contention/platform exceptions.

- [ ] **Step 1: Write RED exception, identity, fake API, and abandoned-lock tests**

Freeze:

```python
class MutationMutexError(UpdateError):
    error_code = "update_mutex_failed"

class UpdateAlreadyInProgress(MutationMutexError):
    error_code = "update_already_in_progress"
```

Messages equal fixed codes; raw Win32 error number is chained as cause, not message. Test canonical path identity/name, `WAIT_OBJECT_0`, `WAIT_ABANDONED`, timeout, failed wait, body exception, double release, one close.

- [ ] **Step 2: Run RED**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_mutex -v`; expected missing module.

- [ ] **Step 3: Implement exact protocol/adapter**

Freeze `MutationMutex.acquire/release/context manager`, `canonical_install_identity`, `mutation_mutex_name`, `WindowsNamedMutex`, `create_windows_mutation_mutex`. For canonical identity `c:\users\example\dynamicshelper`, require exact name `Local\DynamicsHelper.Update.30b562b85ca769812ff2a63dea844f62693c1320b574e45b72e6b077f7410641`; wait timeout is zero. `WAIT_ABANDONED` succeeds. Timeout raises fixed contention; other failure raises fixed mutex error from an internal `OSError` cause. Close exactly once.

- [ ] **Step 4: Run GREEN/mutation**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_mutex -v`. Remove abandoned success; `WindowsNamedMutexTests` fails; restore and rerun the same command to `OK`.

- [ ] **Step 5: Commit**

```powershell
git add host/update_mutex.py host/test_update_mutex.py
git commit -m "feat(update): serialize installation mutation"
```

### Task 4: Mutex-Owned Preparation, Active Record, And Host Phases

**Files:**
- Create: `host/update_engine.py`
- Create: `host/test_update_support.py`
- Create: `host/test_update_engine_host.py`

**Interfaces:**
- Consumes: Tasks 1-3 and Plan A `ValidatedPackage`.
- Produces: final frozen engine/hooks/exceptions and prepared/Host behavior.

- [ ] **Step 1: Create exact test support and RED exception tests**

Implement this mutex/crash foundation, then add exact tree snapshots, the real Plan A package fixture, and `RecordingHooks` with before phase, before/after operation, after transition, wait, and probe:

```python
class InjectedCrash(BaseException):
    pass

class FakeMutationMutex:
    def __init__(self) -> None:
        self.held = False
        self.acquire_count = 0
        self.release_count = 0

    def acquire(self) -> None:
        if self.held:
            raise AssertionError("fake mutex already held")
        self.held = True
        self.acquire_count += 1

    def release(self) -> None:
        if self.held:
            self.held = False
            self.release_count += 1

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        self.release()
```

Every fake filesystem/hook method asserts `mutex.held` for a mutation. Freeze safe engine exceptions:

```python
class UpdateEngineError(UpdateError):
    error_code = "update_engine_failed"

class UpdateStateConflict(UpdateEngineError):
    error_code = "update_state_conflict"

class PreparedTransactionConflict(UpdateStateConflict):
    error_code = "update_transaction_conflict"
```

No constructor accepts arbitrary display text. Tests assert inheritance/code/fixed message and exception chaining for internal diagnostics.

- [ ] **Step 2: Write RED mutex/preparation/replay/Host tests**

Required cases:

| Case | Assertion |
|---|---|
| every create-prepared workspace/active write | happens while fake mutex held |
| same-ID first create | writes only `.preparing`, writes staging/ownership/prepared, atomically promotes to final root, then writes active |
| crash after `.preparing` mkdir before first journal write | live/final root untouched; same-ID retry safely removes/rebuilds only matching `.preparing` |
| stale `.preparing` plus different candidate target/digest | conflict; orphan is retained, not claimed/deleted |
| same ID/same target/same package ownership digest | exact replay returns verified prepared journal |
| same ID/different target or ownership digest | conflict; no workspace/live mutation |
| same ID/same target/digest but different live source mode/prior snapshot | conflict; no workspace/live mutation |
| other active nonterminal ID | conflict |
| matching terminal active | new preparation conflicts until Plan C receipt flow calls `finalize_terminal_evidence` |
| interrupted same-ID staging | under lock rebuild only that transaction's workspace |
| active write failure | live unchanged; prepared workspace retained for replay |
| staging journal replay without active | exact same-ID workspace is repaired under lock; different candidate digest conflicts |
| browser activation | rereads all under lock; stores immutable identity before wait; invokes wait hook |
| installer activation with null identity | rereads all under lock; persists installer waiting phase; skips wait hook and never self-waits |
| browser null identity / installer non-null identity | `UpdateStateConflict`; phase unchanged |
| activation after `.preparing` crash before promotion | rejected because no final prepared journal/active exists |
| nonterminal resume | mutex held and rereads under lock |
| Host backup/install | exact state tables below; executable removal first/install last |

- [ ] **Step 3: Run RED**

Run the isolated wrapper with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_host.ExceptionContractTests host.test_update_engine_host.MutexOwnershipTests host.test_update_engine_host.PreparedWorkspaceTests host.test_update_engine_host.HostPhaseTests host.test_update_engine_host.TerminalEvidenceTests -v
```

Expected: missing `update_engine`.

RED activation assertions use exact method calls:

```python
engine.create_prepared(
    package, TX_ID, expected_version=package.manifest.package_version,
    prior_version="2.0.74-beta.4", initiator=UpdateInitiator.BROWSER,
)
engine.activate_prepared(
    TX_ID,
    InitiatingProcessIdentity(pid=1234, creation_token="create-133801632000000000"),
)

installer.create_prepared(
    package, TX_ID, expected_version=None,
    prior_version="2.0.74-beta.4", initiator=UpdateInitiator.INSTALLER,
)
installer.activate_prepared(TX_ID, None)
self.assertEqual(installer_hooks.waited_processes, [])
```

- [ ] **Step 4: Implement final engine interface and locking contract**

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

Freeze exact signatures:

```text
UpdateEngine(install_root: Path, *, mutex_factory: Callable[[Path], MutationMutex], hooks: UpdateEngineHooks)
UpdateEngine.create_prepared(package: ValidatedPackage, transaction_id: str, *, expected_version: str | None, prior_version: str | None, initiator: UpdateInitiator) -> UpdateJournal
UpdateEngine.activate_prepared(transaction_id: str, process_identity: InitiatingProcessIdentity | None) -> UpdateJournal
UpdateEngine.resume(transaction_id: str) -> UpdateJournal
UpdateEngine.rollback(transaction_id: str, failure_code: JournalReason) -> UpdateJournal
UpdateEngine.finalize_terminal_evidence(transaction_id: str) -> bool
```

Every public mutation method acquires one installation mutex before creating/removing/copying any workspace path or active file and rereads disk records after acquisition. `create_prepared` validates Plan A with the caller's `expected_version`, computes candidate plan before mutation, then takes mutex and repeats validation/ownership calculation to avoid TOCTOU. Same-ID replay requires journal target equals candidate target, initiator matches, ownership sidecar hash equals journal hash, persisted `package_ownership_sha256` equals candidate, and canonical candidate `ownership_plan_bytes` equal persisted sidecar bytes. It never accepts target-only or package-digest-only equality.

`expected_version` rules are exact: browser initiator requires a non-empty exact string and persists `target_version == expected_version`; installer initiator accepts non-empty exact string or `None`; `None` means use the internally consistent `package.manifest.package_version`, never running Host `VERSION`. Malformed empty/non-string expected targets raise `OwnershipError` before workspace mutation. The persisted ownership sidecar carries `expected_version`; journal carries immutable `target_version`, and replay verifies both through sidecar equality. Do not rerun `validate_staged_package(..., expected_version=target_version)` during a replay whose persisted `expected_version` is null; rerun it with the exact persisted null.

Every engine reread cross-validates journal against sidecar: transaction ID, target version, prior version, fresh-install/source relation, ownership SHA-256, and seed-receipt allowance must agree before hooks or filesystem access. A mismatch is `UpdateStateConflict` with zero mutation.

`activate_prepared` validates the persisted initiator under mutex. Browser requires non-null `InitiatingProcessIdentity`, persists it in `waiting-for-host-exit`, and invokes wait hook once per resume attempt. Installer requires `process_identity is None`, transitions to `waiting-for-host-exit` with null process, skips `wait_for_initiating_host_exit`, and proceeds synchronously; non-null installer identity or null browser identity is `UpdateStateConflict`. Tests assert installer never waits on its own PID/process.

This is the shared synchronous-installer activation interface: the installer passes the validated journal's transaction ID (the engine derives/strictly verifies `TransactionPaths.journal`), `process_identity=None`, and uses installer-configured hooks. Do not expose an arbitrary caller-supplied journal path that could escape the fixed transaction root. A Plan D wrapper may accept a journal path only by canonicalizing it back to exactly `TransactionPaths.for_install(...).journal` before this engine call.

If `updates/active.json` is absent but a same-ID final prepared workspace exists, only `create_prepared` with the matching candidate may repair/write active under lock. A `.preparing` directory is never a resumable journal authority: same-ID retry may rebuild it only after validating any existing marker/journal bytes against the same candidate; a different candidate conflicts. `resume`, `activate_prepared`, and `rollback` require a matching active record and otherwise raise `UpdateStateConflict`; they never scan arbitrary transaction directories to claim ownership.

`create_prepared` under lock performs the literal Task 7 preparation tuple for its ownership source entirely in `preparing_root`: create `.preparing`, write staging journal, write byte-identical canonical Plan A manifest to `preparing_probe_manifest`, copy/verify each individual owned staged file, write ownership, transition/write prepared journal, fsync files/directories, atomically rename `.preparing` to final transaction root, then write active. Final root remains absent before promotion. Installed/legacy omit `config.json`; fresh includes it only when `seed_files` contains it. Do not use one coarse directory-copy label; every file and promotion are fault-injected. Every nonterminal resume acquires mutex/rereads active/journal/ownership. Prepared remains inert after locked reread. Terminal resume may return read-only. Every rollback takes mutex.

The staging journal in `.preparing` already binds candidate ownership digest, target, and initiator before staged-file copy. Compute/recompute candidate around mutex as above. Before prepared, require persisted sidecar hash equals journal hash. Before promotion require every expected preparing path exact and final root absent. `os.replace(preparing_root, transaction_root)` is the only publication of a final transaction workspace.

For every preparation operation after `workspace:write-staging-journal`, use the same exact/absent/mismatch classifier against candidate package bytes. Same-ID replay accepts only already-exact destinations, creates only absent destinations, and aborts before further mutation on any mismatch. `workspace:create-preparing` accepts absent (create) or an existing same-ID `.preparing` directory whose staging journal target/initiator/digest match; an empty no-journal `.preparing` is cleanup-safe and rebuilt; any other existing directory conflicts. `workspace:promote-preparing` requires preparing exact/final absent; preparing absent/final exact is complete replay; both present or mismatch conflicts.

Preparation faults never enter rolling-back because no live product path changed. A crash before staging journal may leave only the validated transaction ID plus `.preparing`; same-ID retry under mutex treats an empty/no-journal directory as cleanup-safe orphan, invokes hooks around `workspace:remove-orphan-preparing`, then rebuilds. If a journal exists, retry validates target/initiator/ownership digest before rebuilding. Never write active until final-root promotion and prepared journal are durable.

Normal committed/rolled-back resume retains terminal workspace/active and new preparation conflicts. `finalize_terminal_evidence` is called only after Plan C has durably written its finalization receipt and unregistered the status Host. It acquires the installation mutex and handles exact states: active+workspace present requires matching active and strict terminal journal/ownership, then removes active with `active:remove` before workspace with `workspace:remove-terminal`; active absent+workspace present verifies terminal journal/ownership directly and removes workspace; both absent returns `False`; active present+workspace absent is conflict. Active-first ordering makes a crash between operations replayable without requiring a deleted journal. Matching cleanup returns `True`; lost-response replay after both absent returns `False`. Plan C never deletes these paths itself.

- [ ] **Step 5: Implement explicit source/destination state evaluator**

For every move, compute source and destination state before hooks/mutation:

```text
class PathState(StrEnum):
    ABSENT = "absent"
    EXACT = "exact"
    MISMATCH = "mismatch"

@dataclass(frozen=True)
class TransferState:
    source: PathState
    destination: PathState

classify_file(path: Path, expected_sha256: str) -> PathState
classify_tree(path: Path, expected_files: tuple[FileDigest, ...]) -> PathState
classify_transfer(source: Path, destination: Path, expected_files: tuple[FileDigest, ...]) -> TransferState
```

Exact digest means complete file or exact whole-directory inventory. Apply this table universally:

| Source | Destination | Meaning/action |
|---|---|---|
| exact | absent | pending; one move allowed |
| absent | exact | complete; no move |
| exact | exact | conflict; no mutation |
| absent | absent | missing evidence; no mutation |
| mismatch | any | conflict; no mutation |
| any | mismatch | conflict; no mutation |

Before any mutation, validate the complete phase's source/destination table, not one path at a time. If any mismatch/conflict exists, perform zero operations for that phase. Then call phase hook, and per move call before-operation, move, after-operation. This prevents partial mutation after discovering a later mismatch.

Host backup verifies prior metadata/Host digests; executable backup first. Host install verifies all staged new roots and all live destinations absent before first move; executable last. After each phase, re-evaluate all rows as complete before journal transition.

The table's `any` denotes any of `absent`, `exact`, or `mismatch`; implementation uses explicit enum comparisons, not a wildcard string.

- [ ] **Step 6: Run GREEN/mutations**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_host -v`. Mutations: remove mutex around preparation, accept same ID/target with different package digest, and defer mismatch check until after first move; `MutexOwnershipTests`, `PreparedWorkspaceTests`, and `HostPhaseTests` respectively fail. Restore and rerun the same command to `OK`.

- [ ] **Step 7: Commit**

```powershell
git add host/update_engine.py host/test_update_support.py host/test_update_engine_host.py
git commit -m "feat(update): prepare and replace host under mutex"
```

### Task 5: Whole Extension, Fresh Seed, Metadata Pair, Probe, And Commit

**Files:**
- Modify: `host/update_engine.py`
- Modify: `host/test_update_support.py`
- Create: `host/test_update_engine_extension.py`

**Interfaces:**
- Extends Task 4's frozen engine without changing public signatures.

- [ ] **Step 1: Write RED Extension/seed/metadata tests**

Test whole Extension backup/install with exact preflight state table, no merge, stale old children in backup, mismatch zero-mutation, and post-operation/pre-transition replay.

Test `chrome_version` and `chrome_version_name` mutation boundaries here as defense in depth: rewrite one field in `UpdateManifest` only, then in `ReleaseIntegrity` only, and mutate `version_name` between null/nonempty while keeping all hashes relinked. `create_prepared` must reject before `.preparing` creation. `InstalledProduct` has no Chrome fields; assert no synthetic field is read/serialized.

Seed cases:

| Mode/state | Result |
|---|---|
| fresh, planned absent, staged exact/live absent | one `install-seed:config.json` move |
| fresh, user creates live before seed phase | preserve live; leave staged seed; no move; continue because user-owned wins |
| fresh, staged missing/live exact seed | complete replay |
| fresh, receipt absent, staged absent/live mismatch | infer completed engine move followed by user edit; record `seed_installed=true` with observed user digest; preserve |
| fresh, receipt absent, staged exact/live exact seed | post-plan user creation wins even with identical bytes; record `seed_installed=false`, retain staged evidence |
| fresh, staged mismatch | conflict before mutation |
| installed/legacy | no seed row/operation regardless of live config absence |

Receipt assertions are exact:

| Mode | `SeedOperationReceipt` |
|---|---|
| fresh-seeded after move | `path="config.json"`, expected seed digest, `seed_installed=true`, observed live digest equals expected |
| fresh-seeded crash after move/before receipt | replay sees staged absent/live exact, writes the same installed receipt, never overwrites |
| fresh-seeded crash then user edits before receipt | staged absent/live mismatch records `seed_installed=true` and observed user digest; never restores seed bytes |
| fresh-post-plan-user-creation | expected seed digest, `seed_installed=false`, observed live SHA-256 of user bytes; preserve bytes |
| fresh-preexisting | null because no seed was planned |
| installed/legacy | null |

Metadata cases include staged exact/live absent pending, staged exact/live exact complete replay, staged absent/live exact complete replay, mismatch no mutation, crash after first replacement, and pair verification before phase advance. Unlike move-only rows, metadata completion explicitly permits staged exact plus live exact because copy-to-sibling/replace leaves staged evidence intact.

- [ ] **Step 2: Run RED**

Run the isolated wrapper with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_extension.ExtensionPhaseTests host.test_update_engine_extension.SeedPhaseTests host.test_update_engine_extension.MetadataAndProbeTests -v
```

Expected: missing handlers.

- [ ] **Step 3: Implement Extension and fresh-only seed**

Move old/new Extension as whole directories using the universal move table. Seed uses one staged-to-live `os.replace` only for fresh planned-absent. Immediately after either move completion or user-creation observation, atomically persist `seed_receipt` in the journal before metadata work; label it `journal:record-seed-receipt`. If live appears while staged remains exact, hash/preserve live and record `seed_installed=false`. If staged is absent, the engine's one move completed before any crash; record `seed_installed=true` whether live is exact, mismatched/user-edited, or absent/user-deleted, and never recreate/overwrite. Staged absent/live absent still records installed with `observed_live_sha256=null`, preserving deletion. Once receipt exists, every later live config state is user-owned and ignored by product recovery except preservation. Receipt cannot change. Fresh-preexisting/installed/legacy sidecar parser rejects non-null receipt.

- [ ] **Step 4: Implement metadata copy/replace state table and probe**

For each metadata file:

| Staged | Live | Meaning |
|---|---|---|
| exact | absent | pending copy-to-live-sibling, fsync, replace |
| exact | exact | complete, staged retained |
| absent | exact | complete (supports interrupted staging cleanup/replay) |
| mismatch | absent/exact/mismatch | conflict, zero phase mutation |
| absent/exact/mismatch | mismatch | conflict, zero phase mutation |
| exact | exact | complete, staged retained |
| absent | absent | missing, zero phase mutation |

Preflight both pair rows before first replacement. Copy bytes (do not move staged source) to unique sibling, flush/fsync/replace, retain staged originals, verify both live hashes together, then transition metadata-installed. Transition probing durably before hook; successful probe plus full exact product verification commits. Probe exception maps to `startup_probe_failed` rollback in Task 6.

- [ ] **Step 5: Run GREEN/mutations**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_host host.test_update_engine_extension -v`. Mutate seed into installed mode and reject staged-exact/live-exact metadata completion; `SeedPhaseTests` and `MetadataAndProbeTests` fail. Restore and rerun the same command to `OK`.

- [ ] **Step 6: Commit**

```powershell
git add host/update_engine.py host/test_update_support.py host/test_update_engine_extension.py
git commit -m "feat(update): install extension metadata and fresh seed"
```

### Task 6: Rollback Lineage And Recovery-Required Evidence

**Files:**
- Modify: `host/update_engine.py`
- Modify: `host/test_update_support.py`
- Create: `host/test_update_engine_rollback.py`

**Interfaces:**
- Adds automatic rollback and explicit recovery retry while preserving Task 1 failure lineage.

- [ ] **Step 1: Write RED exact restoration and lineage tests**

For failures at waiting, Host backup/install, Extension backup/install, metadata, and probe, assert:

- `original_failure_code` is the first forward failure and never changes.
- `rollback_from` is the first durable forward phase and never changes.
- rolling-back current `reason_code == original_failure_code`.
- recovery-required current reason is rollback/manual failure while original remains forward failure.
- explicit retry restores current reason to original.
- rolled-back current reason equals original.

Exercise installed, legacy-v1, fresh-seeded, fresh-preexisting, and fresh-post-plan-user-creation exact restoration/absence for product Host, Extension, and metadata only. Preserve every user/unknown path. Seed installed by the transaction, post-plan user-created config, and subsequently user-modified config are retained byte-for-byte through rolled-back; config never enters failed-new and does not force recovery-required.

- [ ] **Step 2: Run RED**

Run the isolated wrapper with:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_rollback.RollbackRestorationTests host.test_update_engine_rollback.FailureLineageTests -v
```

Expected: ordinary forward errors propagate without complete rollback/lineage.

- [ ] **Step 3: Implement reverse phase preflight and restoration**

Under the existing mutex, transition to rolling-back with the forward failure. Map `PermissionError` and Windows sharing/lock violations 32/33 to `LOCKED_PATH`; map wait/probe and other phase exceptions to the matching phase-specific code (`HOST_EXIT_WAIT_FAILED`, `HOST_BACKUP_FAILED`, `HOST_INSTALL_FAILED`, `EXTENSION_BACKUP_FAILED`, `EXTENSION_INSTALL_FAILED`, `METADATA_INSTALL_FAILED`, `STARTUP_PROBE_FAILED`). Chain the internal exception but persist/log only the enum code. Preflight each complete reverse phase using exact source/destination digests before any mutation. Reverse new metadata, new Extension, new Host (executable first), then restore prior Host (executable last), Extension, and metadata. Never include `config.json` in a reverse operation. Every completion verifies persisted prior digests including stale whole-directory children.

An unknown/mismatch state makes zero additional mutations in that phase and enters recovery-required. Never guess ownership or delete evidence.

- [ ] **Step 4: Write RED rollback-failure/retry tests**

Inject before-operation permission faults, missing backup, digest corruption, recovery-required journal write failure, and repeated retry. Separately mutate fresh config after seed installation and assert rollback still reaches rolled-back with those user bytes unchanged. Require mutex held/reread under lock, evidence retained, plain `resume(recovery-required)` still acquires mutex then rereads and returns without filesystem mutation, explicit rollback retry uses original failure rather than `rollback_failed`, and `ExceptionGroup` if recovery journal persistence also fails. The group message is fixed `rollback_and_journal_persistence_failed`; its members are fixed-message `UpdateEngineError`/`JournalValidationError`, while raw OS exceptions are causes only and are not serialized/logged/displayed.

- [ ] **Step 5: Run RED**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_rollback.RecoveryRequiredTests -v`.

Expected: first missing durable recovery behavior fails.

- [ ] **Step 6: Implement recovery-required and retry**

Current reason is `rollback_failed` for ordinary reverse failure or `manual_recovery_required` for unsafe overwrite. Preserve original/rollback phase. Every nonterminal `resume`, including recovery-required inert return, acquires mutex and rereads all records. `rollback(transaction_id, failure_code)` accepts a caller code only when entering rollback from a forward phase and requires it in `FORWARD_FAILURE_CODES`; once `original_failure_code` exists, a supplied different code raises `UpdateStateConflict`. Explicit rollback from recovery-required ignores only an equal repeated code and transitions to rolling-back with current reason reset to persisted original. Terminal resume may validate read-only without mutation mutex only after strict active/journal/ownership verification and retains all evidence.

- [ ] **Step 7: Run GREEN/mutations**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_rollback -v`. Mutate retry to carry `rollback_failed` as original and mutate mismatch handling to perform first reverse move; `FailureLineageTests` and `RecoveryRequiredTests` fail. Restore and rerun the same command to `OK`.

- [ ] **Step 8: Commit**

```powershell
git add host/update_engine.py host/test_update_support.py host/test_update_engine_rollback.py
git commit -m "feat(update): preserve rollback failure lineage"
```

### Task 7: Exhaustive Five-Mode Fault Matrix

**Files:**
- Modify: `host/update_engine.py`
- Modify: `host/test_update_support.py`
- Create: `host/test_update_engine_resume.py`

**Interfaces:**
- Produces literal operation/transition coverage proving all ownership modes and crash windows.

- [ ] **Step 1: Add literal label constants and exact counts**

Use these exact constants in `host/test_update_engine_resume.py`:

```python
FORWARD_TRANSITION_LABELS = (
    "staging", "prepared", "waiting-for-host-exit", "host-backed-up", "host-installed",
    "extension-backed-up", "extension-installed", "metadata-installed",
    "probing", "committed",
)
ROLLBACK_TRANSITION_LABELS = ("rolling-back", "recovery-required", "rolled-back")

OWNERSHIP_MODE_LABELS = (
    "installed", "legacy", "fresh-seeded", "fresh-preexisting",
    "fresh-post-plan-user-creation",
)
OPERATION_FAULT_AXES = (
    "before-operation", "after-operation",
    "synthesized-post-operation-pre-transition",
)
TRANSITION_FAULT_AXES = ("after-transition",)
TERMINAL_OUTCOMES = ("committed", "rolled-back")
PREPARING_ORPHAN_RECOVERY_OPERATIONS = ("workspace:remove-orphan-preparing",)

INSTALLED_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:dh_native_host.exe",
    "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
LEGACY_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:dh_native_host.exe",
    "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
FRESH_SEEDED_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:config.json",
    "workspace:stage-host:dh_native_host.exe", "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
FRESH_PREEXISTING_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:dh_native_host.exe",
    "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
FRESH_POST_PLAN_USER_CREATION_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:config.json",
    "workspace:stage-host:dh_native_host.exe", "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
INSTALLED_FORWARD_OPERATIONS = (
    "backup-metadata:installed-product.json", "backup-metadata:release-integrity.json",
    "backup-host:dh_native_host.exe", "backup-host:_internal",
    "backup-host:register.py", "backup-host:stale-runtime.dll", "backup-host:system_prompt.md",
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "backup-extension", "install-extension",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
LEGACY_FORWARD_OPERATIONS = (
    "backup-host:dh_native_host.exe", "backup-host:_internal",
    "backup-host:register.py", "backup-host:system_prompt.md",
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "backup-extension", "install-extension",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
FRESH_SEEDED_FORWARD_OPERATIONS = (
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "install-extension", "install-seed:config.json", "journal:record-seed-receipt",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
FRESH_PREEXISTING_FORWARD_OPERATIONS = (
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "install-extension",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
FRESH_POST_PLAN_USER_CREATION_FORWARD_OPERATIONS = (
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "install-extension", "journal:record-seed-receipt",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
INSTALLED_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "restore-extension", "remove-new-host:dh_native_host.exe",
    "remove-new-host:_internal", "remove-new-host:helper.dll", "remove-new-host:register.py",
    "remove-new-host:system_prompt.md", "restore-host:_internal", "restore-host:register.py",
    "restore-host:stale-runtime.dll", "restore-host:system_prompt.md",
    "restore-host:dh_native_host.exe", "restore-metadata:release-integrity.json",
    "restore-metadata:installed-product.json",
)
LEGACY_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "restore-extension", "remove-new-host:dh_native_host.exe",
    "remove-new-host:_internal", "remove-new-host:helper.dll", "remove-new-host:register.py",
    "remove-new-host:system_prompt.md", "restore-host:_internal", "restore-host:register.py",
    "restore-host:system_prompt.md", "restore-host:dh_native_host.exe",
)
FRESH_SEEDED_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "remove-new-host:dh_native_host.exe", "remove-new-host:_internal",
    "remove-new-host:helper.dll", "remove-new-host:register.py", "remove-new-host:system_prompt.md",
)
FRESH_PREEXISTING_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "remove-new-host:dh_native_host.exe", "remove-new-host:_internal",
    "remove-new-host:helper.dll", "remove-new-host:register.py", "remove-new-host:system_prompt.md",
)
FRESH_POST_PLAN_USER_CREATION_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "remove-new-host:dh_native_host.exe", "remove-new-host:_internal",
    "remove-new-host:helper.dll", "remove-new-host:register.py", "remove-new-host:system_prompt.md",
)

INSTALLED_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
LEGACY_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
FRESH_SEEDED_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
FRESH_PREEXISTING_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
FRESH_POST_PLAN_USER_CREATION_FINALIZATION_OPERATIONS = (
    "active:remove", "workspace:remove-terminal",
)

EXPECTED_OWNERSHIP_MODE_COUNT = 5
EXPECTED_OPERATION_FAULT_AXIS_COUNT = 3
EXPECTED_TRANSITION_FAULT_AXIS_COUNT = 1
EXPECTED_TERMINAL_OUTCOME_COUNT = 2
EXPECTED_ORPHAN_RECOVERY_OPERATION_COUNT = 1
EXPECTED_INSTALLED_PREPARATION_OPERATION_COUNT = 16
EXPECTED_LEGACY_PREPARATION_OPERATION_COUNT = 16
EXPECTED_FRESH_SEEDED_PREPARATION_OPERATION_COUNT = 17
EXPECTED_FRESH_PREEXISTING_PREPARATION_OPERATION_COUNT = 16
EXPECTED_FRESH_POST_PLAN_PREPARATION_OPERATION_COUNT = 17
EXPECTED_INSTALLED_FORWARD_OPERATION_COUNT = 16
EXPECTED_LEGACY_FORWARD_OPERATION_COUNT = 13
EXPECTED_FRESH_SEEDED_FORWARD_OPERATION_COUNT = 10
EXPECTED_FRESH_PREEXISTING_FORWARD_OPERATION_COUNT = 8
EXPECTED_FRESH_POST_PLAN_FORWARD_OPERATION_COUNT = 9
EXPECTED_INSTALLED_ROLLBACK_OPERATION_COUNT = 16
EXPECTED_LEGACY_ROLLBACK_OPERATION_COUNT = 13
EXPECTED_FRESH_SEEDED_ROLLBACK_OPERATION_COUNT = 8
EXPECTED_FRESH_PREEXISTING_ROLLBACK_OPERATION_COUNT = 8
EXPECTED_FRESH_POST_PLAN_ROLLBACK_OPERATION_COUNT = 8
EXPECTED_FINALIZATION_OPERATION_COUNT = 2
EXPECTED_FORWARD_TRANSITION_LABEL_COUNT = 10
EXPECTED_ROLLBACK_TRANSITION_LABEL_COUNT = 3
EXPECTED_TRANSITION_LABEL_COUNT = 13
EXPECTED_PREPARATION_LABEL_CASES = 82
EXPECTED_ORPHAN_RECOVERY_LABEL_CASES = 5
EXPECTED_FORWARD_LABEL_CASES = 56
EXPECTED_ROLLBACK_LABEL_CASES = 53
EXPECTED_FINALIZATION_LABEL_CASES = 20
EXPECTED_OPERATION_LABEL_CASES = 216
EXPECTED_BEFORE_OPERATION_FAULT_CASES = 216
EXPECTED_AFTER_OPERATION_CRASH_CASES = 216
EXPECTED_SYNTHESIZED_POST_OPERATION_CASES = 216
EXPECTED_PHASE_TRANSITION_CRASH_CASES = 65
EXPECTED_SEED_RECEIPT_TRANSITION_CRASH_CASES = 2
EXPECTED_AFTER_TRANSITION_CRASH_CASES = 67
```

No tuple aliases are allowed. No-fault observations must equal each literal tuple and every count above. Preparation totals 82; cleanup-safe orphan recovery is one label across five modes; forward 56; rollback 53; finalization is two labels across five modes and two terminal outcomes (20); total operation-label cases are 216. Each operation-label case runs the three operation axes. `after_journal_transition` runs 13 phase labels across five modes (65) plus durable seed receipt in fresh-seeded/fresh-post-plan modes (2), totaling 67 transition-axis cases. Fresh-seeded records `seed_installed=true`; fresh-preexisting has no seed/receipt operations; fresh-post-plan-user-creation records `seed_installed=false` and never moves config. Run browser identity activation across all five modes, plus installer-null-identity/no-wait activation across installed, legacy, fresh-seeded, and fresh-preexisting; post-plan creation remains a browser timing mode and does not alias installer behavior.

- [ ] **Step 2: Write RED before/after/transition/synthesized matrix**

For the orphan-recovery label in all five modes, every preparation label in all five modes, every forward/reverse label in its corresponding mode, and each finalization label for both terminal outcomes run:

1. ordinary fault in `before_filesystem_operation`: for orphan/preparation before durable waiting, propagate fixed engine/state error and keep live untouched; for forward live phases, persist mapped forward failure and roll back; for reverse phases, enter recovery-required; for terminal finalization, raise `UpdateEngineError` with receipt/evidence retryable;
2. `InjectedCrash` in `after_filesystem_operation`: operation complete, journal/next fact old; new engine resumes without duplicate;
3. synthesized post-operation/pre-transition disk state without using hook: resume recognizes exact destination/source state.

Separately crash in `after_journal_transition` after each phase transition label and after each applicable seed-receipt write. Require preserved paths, identity/failure lineage, executable ordering, metadata pair, seed receipt mode, mutex acquisition, and terminal no-op. Include all five literal mode tuples; no aliases or “same as” shortcuts.

- [ ] **Step 3: Run forward RED**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_resume.MatrixCoverageTests host.test_update_engine_resume.ForwardFaultMatrixTests -v`; expected first uncovered label/state/count fails.

- [ ] **Step 4: Repair exact forward recognizers**

Implement and test named engine-private helpers `_classify_file`, `_classify_tree`, `_classify_transfer`, `_preflight_phase`, `_resume_preparation`, `_resume_host_backup`, `_resume_host_install`, `_resume_extension_backup`, `_resume_extension_install`, `_resume_metadata_install`, and `_resume_probe`. Each accepts parsed `UpdateJournal`, `OwnershipPlan`, and `TransactionPaths` as applicable; each returns only exact complete/pending operation labels or raises fixed `UpdateStateConflict` before mutation. `_resume_preparation` handles empty no-journal orphan, exact `.preparing`, promoted-final/active repair, and target/initiator/digest conflicts. No helper scans unknown top-level paths or infers ownership.

- [ ] **Step 5: Run rollback RED**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_resume.RollbackFaultMatrixTests host.test_update_engine_resume.OwnershipBoundaryTests -v`; expected first reverse/ownership gap fails.

- [ ] **Step 6: Repair exact reverse recognizers and ownership scan**

Implement `_resume_rollback`, `_preflight_remove_new`, `_preflight_restore_prior`, and `_finalize_terminal_evidence` using the same classifiers and literal labels. Add AST test that only journal/engine production modules call transition/write active/journal; tests create initial fixtures only through public engine APIs. Assert exact ordering: before-operation -> filesystem operation -> after-operation; journal replace -> after-transition; terminal active removal -> workspace removal. Matrix count assertions compare `len()` of every literal tuple and all summed mode/axis totals to the frozen constants.

- [ ] **Step 7: Run matrix GREEN/mutation**

Run the isolated wrapper with `& "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_resume -v`. Remove legacy mode from one loop and remove one literal label; `MatrixCoverageTests` fails. Restore and rerun the same command to `OK`.

- [ ] **Step 8: Run all Plan B focused tests**

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_journal host.test_update_ownership host.test_update_mutex host.test_update_engine_host host.test_update_engine_extension host.test_update_engine_rollback host.test_update_engine_resume -v
```

Expected: all pass in one six-variable isolated process.

- [ ] **Step 9: Commit**

```powershell
git add host/update_engine.py host/test_update_support.py host/test_update_engine_resume.py
git commit -m "test(update): exhaust journal fault matrix"
```

### Task 8: Documentation, Evidence, And Final Gates

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Create: `.superpowers/sdd/hardening-b-journal-engine-report.md`

**Interfaces:**
- Documents exact Plan B contracts and freezes corrected Plan C/D consumption.

- [ ] **Step 1: Run focused and full isolated gates**

Run this exact focused command inside the six-variable wrapper:

```powershell
& "host/venv/Scripts/python.exe" -m unittest host.test_update_journal host.test_update_ownership host.test_update_mutex host.test_update_engine_host host.test_update_engine_extension host.test_update_engine_rollback host.test_update_engine_resume -v
```

In a second fresh six-variable environment run `Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue` followed by `& "host/venv/Scripts/python.exe" -m unittest discover host -v`. Record exact totals/skips/times.

- [ ] **Step 2: Run compile/static contract gates**

```powershell
& "host/venv/Scripts/python.exe" -m compileall -q -x "venv" host
git grep -n -E "OwnershipInventory|manifest\.inventory|sha256: str \| None|initiating_host_pid|recovery/active\.json|TransactionPaths\.recovery_root|workspace:create-transaction|VERSION.*expected_version" -- "host/update_*.py"
$productionTransactionModules = @(
    "host/update_journal.py",
    "host/update_engine.py",
    "host/update_ownership.py",
    "host/update_mutex.py"
)
$ownedSymbols = @("transition", "write_journal_atomic", "write_active_transaction_atomic")
$ownershipMatches = @(
    git grep --no-color -n -E "(^|[^[:alnum:]_])(transition|write_journal_atomic|write_active_transaction_atomic)\(" -- $productionTransactionModules
)
if ($LASTEXITCODE -ne 0) { throw "Expected production journal ownership matches." }
foreach ($symbol in $ownedSymbols) {
    $symbolMatches = @(
        $ownershipMatches | Where-Object {
            $_ -match "\b$symbol\("
        }
    )
    $definitionOwners = @(
        $symbolMatches | Where-Object {
            $_ -match ":\d+:def $symbol\("
        } | ForEach-Object {
            ($_ -split ':\d+:', 2)[0]
        } | Sort-Object -Unique
    )
    $callOwners = @(
        $symbolMatches | Where-Object {
            $_ -notmatch ":\d+:def $symbol\("
        } | ForEach-Object {
            ($_ -split ':\d+:', 2)[0]
        } | Sort-Object -Unique
    )
    if ($definitionOwners.Count -ne 1 -or $definitionOwners[0] -ne "host/update_journal.py") {
        throw "Unexpected definition owner set for $symbol: $($definitionOwners -join ', ')"
    }
    if ($callOwners.Count -ne 1 -or $callOwners[0] -ne "host/update_engine.py") {
        throw "Unexpected call owner set for $symbol: $($callOwners -join ', ')"
    }
    $definitions = @(
        $symbolMatches | Where-Object {
            $_ -match "^host/update_journal\.py:\d+:def $symbol\("
        }
    )
    if ($definitions.Count -ne 1) {
        throw "Expected exactly one update_journal definition for $symbol."
    }
    $calls = @(
        $symbolMatches | Where-Object {
            $_ -match '^host/update_engine\.py:\d+:'
        }
    )
    if ($calls.Count -lt 1) {
        throw "Expected at least one update_engine call for $symbol."
    }
}
git grep -n -E "subprocess|winreg|RunOnce|chrome\.runtime|Updater\(" -- host/update_journal.py host/update_ownership.py host/update_mutex.py host/update_engine.py
& "host/venv/Scripts/python.exe" -c "import inspect; from package_archive import validate_staged_package; from package_manifest import FileRecord,InstalledProduct,UpdateManifest; sig=inspect.signature(validate_staged_package); assert tuple(sig.parameters) == ('stage_root','expected_version'); assert sig.parameters['expected_version'].kind is inspect.Parameter.KEYWORD_ONLY; assert sig.parameters['expected_version'].default is None; assert tuple(UpdateManifest.__dataclass_fields__) == ('schema_version','package_version','required_capabilities','provided_capabilities','chrome_version','chrome_version_name','entries'); assert FileRecord.__annotations__['sha256'] == 'str' or FileRecord.__annotations__['sha256'] is str; assert tuple(InstalledProduct.__dataclass_fields__) == ('schema_version','package_version','required_capabilities','provided_capabilities','ownership_schema_version','legacy_allowlist_version','release_integrity_sha256')"
git diff --check "$env:PLAN_B_BASE..HEAD"
```

Expected: compile clean; stale-contract scan exits 1 with no matches. For each owned symbol, the production-only ownership scan requires the exact definition-owner set `{host/update_journal.py}`, exactly one definition, the exact call-owner set `{host/update_engine.py}`, and at least one engine call; therefore `host/update_ownership.py` and `host/update_mutex.py` have zero matches. The explicit production list excludes every `test_*.py` and `host/test_update_support.py`, so test calls cannot affect the gate. Scope scan exits 1 with no matches; Plan A field/signature probe exits 0; diff clean.

- [ ] **Step 3: Document exact frozen handoff**

Document Plan A N-validates-N+1 `expected_version` semantics, `entries` filtering, Chrome identity equality, metadata links; stable `updates/active.json`; `.preparing` atomic promotion; exact TransactionPaths layout; process identity `{pid, creation_token}`; browser versus installer activation; current reason versus immutable original failure; mutex ownership of workspace/active/nonterminal resume; fresh-only durable seed receipt; terminal version/fresh-install projection; state tables; exception codes; and five-mode literal matrix counts. Preserve legacy updater active/dormant Plan B wording.

Freeze Plan C/D signatures:

```text
parse_transaction_id(value: object) -> str
generate_transaction_id(random_bytes: Callable[[int], bytes] = secrets.token_bytes) -> str
read_journal(path: Path) -> UpdateJournal
read_active_transaction(path: Path) -> ActiveTransaction
resolve_active_journal(updates_root: Path, active: ActiveTransaction) -> Path
TransactionPaths.for_install(install_root: Path, transaction_id: object) -> TransactionPaths
UpdateEngine.create_prepared(package: ValidatedPackage, transaction_id: str, *, expected_version: str | None, prior_version: str | None, initiator: UpdateInitiator) -> UpdateJournal
UpdateEngine.activate_prepared(transaction_id: str, process_identity: InitiatingProcessIdentity | None) -> UpdateJournal
UpdateEngine.resume(transaction_id: str) -> UpdateJournal
UpdateEngine.rollback(transaction_id: str, failure_code: JournalReason) -> UpdateJournal
UpdateEngine.finalize_terminal_evidence(transaction_id: str) -> bool
terminal_version(journal: UpdateJournal) -> TerminalVersion
parse_terminal_version(value: object) -> TerminalVersion
terminal_version_to_value(value: TerminalVersion) -> dict[str, object]
```

Required Plan C changes are explicit:

- replace bare PID with `InitiatingProcessIdentity(pid, creation_token)` and pass it for browser activation;
- use `updates/active.json`; `TransactionPaths` intentionally has no `recovery_root`;
- consume the expanded `TransactionPaths` preparing/final/probe fields and never create a parallel path model;
- use `TransactionPaths.probe_manifest` written by Plan B and let `UpdateEngine` own `probing`, probe-result commit/rollback, and journal transitions;
- call `finalize_terminal_evidence` after receipt durability/status unregister; never delete workspace/active directly;
- use `original_failure_code` when retrying recovery-required; never promote current `rollback_failed` into original failure;
- serialize receipt terminal identity through `terminal_version`: committed target, rolled-back prior when present, or exact JSON `{"fresh_install":true,"version":null}` for fresh rollback;
- installer path calls `activate_prepared(..., process_identity=None)` only for persisted `initiator=installer` and must not create/wait on a self process handle.

Required Plan D call-site changes are explicit: browser `perform_update` passes selected target as non-null `expected_version`, the known current product version as `prior_version` (or null only for true fresh install), and `initiator=browser`; synchronous installer passes its trusted target or null plus `initiator=installer`, then activates with null process identity.

The synchronous installer imports `generate_transaction_id` from `update_journal` and calls it once before `create_prepared`. Browser TypeScript does not call this Python function: its production adapter must obtain exactly 16 bytes through `crypto.getRandomValues`, lowercase-hex encode them, and run the result through its strict `parseTransactionId`. No Plan C/D Python module may import `secrets` or define a second transaction-ID generator.

Status projects current `reason_code`; diagnostics/evidence may inspect `original_failure_code`, but UI never receives raw exceptions.

- [ ] **Step 4: Write evidence report**

Required populated headings: Scope/Base/Prerequisite Signatures; Commit Map; Plan A Alignment; Durable Schemas; Exceptions; RED; GREEN; Mutations; Five-Mode Matrix and literal counts; Mutex Evidence; Preservation; Focused/Full/Compile/Static Gates; Scope Exclusions; Plan C/D Handoff; Residual VM Risks.

- [ ] **Step 5: Verify docs/evidence diff**

Run:

```powershell
git status --short
git diff -- AGENTS.md ARCHITECTURE.md DEVELOPER_GUIDE.md docs/session-handoff-2026-07-15.md .superpowers/sdd/hardening-b-journal-engine-report.md
git diff --check
```

Expected: only those five Task 8 files before commit, no placeholders, actual evidence, clean diff check.

- [ ] **Step 6: Commit docs/evidence**

```powershell
git add -- AGENTS.md ARCHITECTURE.md DEVELOPER_GUIDE.md docs/session-handoff-2026-07-15.md
git add -f -- .superpowers/sdd/hardening-b-journal-engine-report.md
$expectedCached = @(
    ".superpowers/sdd/hardening-b-journal-engine-report.md",
    "AGENTS.md",
    "ARCHITECTURE.md",
    "DEVELOPER_GUIDE.md",
    "docs/session-handoff-2026-07-15.md"
) | Sort-Object
$actualCached = @(git diff --cached --name-only) | Sort-Object
$cachedDifference = @(Compare-Object $expectedCached $actualCached)
if ($cachedDifference.Count -ne 0) {
    $cachedDifference
    throw "Task 8 cached file set differs from the exact intended files."
}
git commit -m "docs(update): record journal engine evidence"
```

Expected before commit: `git diff --cached --name-only` contains exactly the five paths in `$expectedCached`, including the force-added ignored evidence report, and no product/test/other documentation file.

- [ ] **Step 7: Run final committed-head gates**

Repeat the exact commands in Steps 1-2, then run:

```powershell
git status --short
git log --oneline -8
```

Expected: clean status, all gates green, and one independently reviewable commit for each of Tasks 1-8 after Plan A (eight Plan B commits total). Do not amend the evidence commit for its own hash; include that hash in handoff.
