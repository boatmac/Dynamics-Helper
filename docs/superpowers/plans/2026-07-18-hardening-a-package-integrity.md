# Package Ownership and Integrity Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every release file an explicit ownership/hash contract, safely validate hostile archives, verify installed frozen products, and expose early probe plus Host capability/integrity actions without activating the transactional updater.

**Architecture:** Standard-library-only Host modules form a dependency-light boundary: `product_info` owns version/capabilities, `package_manifest` owns strict schemas and release documents, `package_archive` owns manual extraction and deterministic ZIP output, `install_integrity` verifies live products and runs the startup probe, and `early_cli` dispatches the probe before normal Host side effects. `release_helper.py` builds a complete temporary stage through those pure APIs, validates it, and writes a deterministic archive; `dh_native_host.py` delegates diagnostic wire actions to the new modules while its existing `perform_update` path remains active and unchanged.

**Tech Stack:** Python 3.13, standard library (`dataclasses`, `enum`, `hashlib`, `json`, `pathlib`, `zipfile`, `subprocess`, `tempfile`, `unittest`), PyInstaller `--onedir`, Native Messaging JSON, PowerShell 7 verification commands

## Global Constraints

- Implement only Plan A from `docs/superpowers/specs/2026-07-18-whole-branch-important-hardening-design.md`. This plan was authored against product source head `e5910f47ddb73b8ee26d4ce1bacc6746545c512f`; actual execution starts from the later clean planning head captured by the execution precondition below.
- Use TDD for every production change; retain exact RED, GREEN, and restored mutation evidence in `.superpowers/sdd/package-integrity-plan-a-report.md`.
- Run every Host Python process with fresh isolated `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` values set before process start. Never let a test import create files in the real Windows profile.
- Use `host/venv/Scripts/python.exe` for all Python commands. Focused dotted Host imports additionally set `PYTHONPATH=host`; full discovery removes `PYTHONPATH`.
- Use only temporary synthetic product trees and archives. Do not create a real release asset, change a version, publish, push, tag, install, launch a real updater, alter registry state, or read/write the real AppData installation.
- Keep `host/updater.py::Updater`, `dh_native_host.py`'s `perform_update`, and current Extension update routing active. Plan A may validate an archive only through new primitives and must not route production update clicks through them.
- Advertise exactly `prompt-scope-v1`. `PROVIDED_PROTOCOL_CAPABILITIES` and every generated/runtime response must omit `transactional-update-v1` until Plan D.
- Treat package hashes as consistency checks, not signatures or authentication. Do not add signing, key, registry, journal, mutex, detached runner, rollback, Service Worker gating, or installer integration.
- Normalize logical paths to forward-slash, relative POSIX strings while preserving case. Reject empty/dot paths, absolute/drive/UNC paths, `..`, backslashes, NULs, Windows case-fold collisions, duplicate normalized paths, and unsupported archive entry types; never call `ZipFile.extractall()` or `ZipInfo.extract()` in new package code.
- Generated `host/release-integrity.json` inventories all live Host/Extension product bytes except both Host metadata files. Generated `host/installed-product.json` hashes `release-integrity.json` but not itself. Package-only `update-manifest.json` externally hashes both Host metadata files. The manifest is assigned `PACKAGE_ONLY` by its schema and omitted from its own `entries` array, avoiding a recursive self-hash; every entry that does appear has a lowercase SHA-256.
- A frozen verification fails closed on missing, extra, malformed, mismatched, or unreadable product data. Development mode is available only when `sys.frozen` is false.
- Early `--update-probe` dispatch must occur before emergency logging, user-directory creation, config loading, updater import, SDK import, or normal Native Messaging initialization. Its import closure is standard-library-only and its stdout is one canonical JSON object plus `\n`.
- Preserve the exact `get_capabilities` envelope and the allowlisted `verify_installation` response shapes from spec section 4.1. Plan A exposes these Host actions but does not gate protected actions in the Host or Extension.
- No generated `update-manifest.json`, `host/release-integrity.json`, or `host/installed-product.json` is checked into the repository; tests assert them inside temporary stages only.

### Execution Precondition

This gate applies when implementation begins, not while the five plans are being drafted. Before Task 1, all five reviewed plan documents must be tracked and committed, the worktree/index must be clean, and no untracked copy of any plan may remain:

```powershell
$plans = @(
    "docs/superpowers/plans/2026-07-18-hardening-a-package-integrity.md",
    "docs/superpowers/plans/2026-07-18-hardening-b-journal-engine.md",
    "docs/superpowers/plans/2026-07-18-hardening-c-detached-recovery.md",
    "docs/superpowers/plans/2026-07-18-hardening-d-runtime-installer.md",
    "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"
)
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { throw "Plan A requires an empty Git index." }
foreach ($plan in $plans) {
    git ls-files --error-unmatch -- $plan | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Reviewed plan is not committed: $plan" }
}
$dirty = @(git status --porcelain=v1)
if ($dirty.Count -ne 0) { throw "Plan A requires a clean execution worktree and index." }
$env:PLAN_A_BASE = (git rev-parse HEAD).Trim()
if (-not $env:PLAN_A_BASE) { throw "Could not capture PLAN_A_BASE." }
```

Expected: exit 0, empty `git status --porcelain=v1`, and `PLAN_A_BASE` equals the clean commit containing all five reviewed plans. Record that hash before editing product code and re-export the exact recorded value in every later shell. The controller separately confirms downstream plans consume this authoritative frozen Plan A contract before execution; downstream drift is not repaired or adapted inside Plan A.

---

## File Structure and Responsibilities

| File | Change | Responsibility |
|---|---|---|
| `host/product_info.py` | Create | Single import-safe source of `VERSION`, required/provided capability tuples, and immutable `HostCapabilities`. |
| `host/package_manifest.py` | Create | Ownership enum/data classes, strict JSON parsers, path/hash validation, canonical JSON/SHA-256, release inventory derivation, and the three generated documents. No archive or live-install mutation. |
| `host/package_archive.py` | Create | Validate a staged package, manually stage a ZIP without `extractall`, reject hostile entries, and write byte-deterministic ZIPs. |
| `host/install_integrity.py` | Create | Verify development/frozen installations, cache one frozen verification per process, validate live inventory/version/capabilities, and execute the allowlisted update probe. |
| `host/early_cli.py` | Create | Recognize and strictly dispatch only `--update-probe <manifest-path>` before Host side effects. |
| `host/dh_native_host.py` | Modify | Delegate version data, call early dispatch immediately after `sys` import, and add `get_capabilities`/`verify_installation` wire actions plus capability fields in practical diagnostics. |
| `release_helper.py` | Modify | Retarget version edits to `host/product_info.py`, then replace implicit mutable `temp_stage`/`make_archive` packaging with pure `stage_release(...)` and `create_zip(...)` orchestration over generated release documents and deterministic ZIP writing. |
| `host/test_product_info.py` | Create | Lock version/capability constants and immutable capability projection. |
| `host/test_package_manifest.py` | Create | Lock strict schemas, ownership/path invariants, canonical bytes/hashes, metadata exclusions, and generated external hashes. |
| `host/test_release_helper.py` | Create | Lock complete deterministic staging, missing input behavior, side-effect boundaries, and historical-updater metadata bootstrap. |
| `host/test_package_archive.py` | Create | Table-drive traversal/type/duplicate/missing/extra/hash attacks and deterministic ZIP behavior. |
| `host/test_install_integrity.py` | Create | Lock development/frozen responses, all frozen failure classes, cache behavior, and probe version/capability/file/Extension checks. |
| `host/test_early_cli.py` | Create | Run isolated subprocesses proving update-probe dispatch happens without SDK/log/config/updater imports or writes. |
| `host/test_host_integrity_actions.py` | Create | Exercise exact Native Messaging responses and prove protected/legacy updater behavior is unchanged in Plan A. |
| `ARCHITECTURE.md` | Modify | Document package ownership, generated metadata trust boundary, verification modes, and the still-active legacy updater. |
| `DEVELOPER_GUIDE.md` | Modify | Document schemas/APIs, deterministic staging validation, probe usage, and isolated test commands. |
| `AGENTS.md` | Modify | Add release/integrity invariants and the no-`extractall`, no-real-install testing rules. |
| `releases/notes-prompt-scope-cleanup-draft.md` | Modify | State bootstrap metadata, diagnostic capability/integrity behavior, and first historical-updater migration limits without claiming transactional activation. |
| `.superpowers/sdd/package-integrity-plan-a-report.md` | Create | Record commits, RED/GREEN/mutation evidence, exact final gates, limitations, and Plan B handoff. |

### Exact Test Class Map

Use these class names verbatim so every dotted command below resolves:

| Test file | Exact classes |
|---|---|
| `host/test_product_info.py` | `TestProductInfo` |
| `host/test_package_manifest.py` | `ManifestParserTests`, `ReleaseDocumentGenerationTests`, `FilesystemEntryTypeTests` |
| `host/test_package_archive.py` | `StagedPackageValidationTests`, `DeterministicArchiveWriterTests`, `HostileArchiveTests` |
| `host/test_release_helper.py` | `TestReleaseStaging` |
| `host/test_install_integrity.py` after Task 5 | `InstallationVerifierTests`, `InstallationEntryTypeTests` |
| `host/test_install_integrity.py` after Task 6 | the Task 5 classes plus `UpdateProbeTests` |
| `host/test_early_cli.py` | `EarlyCliDispatchTests` |
| `host/test_host_integrity_actions.py` | `HostIntegrityActionTests` |

## Frozen Interfaces and Schemas

All tasks use these exact names. A later task must not silently rename or reshape them.

```python
# host/product_info.py
@dataclass(frozen=True)
class HostCapabilities:
    host_version: str
    required: tuple[str, ...]
    provided: tuple[str, ...]

VERSION = "2.0.74-beta.4"
REQUIRED_PROTOCOL_CAPABILITIES = ("prompt-scope-v1",)
PROVIDED_PROTOCOL_CAPABILITIES = ("prompt-scope-v1",)

def get_host_capabilities() -> HostCapabilities: ...
```

```python
# host/package_manifest.py
class ManifestError(ValueError): ...

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
class ReleaseDocuments:
    update_manifest: UpdateManifest
    release_integrity: ReleaseIntegrity
    installed_product: InstalledProduct

UPDATE_MANIFEST_SCHEMA_VERSION = 1
RELEASE_INTEGRITY_SCHEMA_VERSION = 1
INSTALLED_PRODUCT_SCHEMA_VERSION = 1
OWNERSHIP_SCHEMA_VERSION = 1
LEGACY_PRODUCT_ALLOWLIST_VERSION = 1
LEGACY_PRODUCT_PATHS = (
    "host/dh_native_host.exe",
    "host/_internal",
    "host/system_prompt.md",
    "host/register.py",
    "extension",
)
UPDATE_MANIFEST_PATH = "update-manifest.json"
PACKAGED_METADATA_PATHS = (
    "host/installed-product.json",
    "host/release-integrity.json",
)
SERIALIZED_PACKAGE_ONLY_PATHS = (
    "install.bat",
    "installer_core.ps1",
)
FORBIDDEN_PACKAGED_HOST_PATHS = (
    "host/extension",
    "host/updates",
    "host/manifest.json",
    "host/copilot-instructions.md",
    "host/user_prompt.md",
    "host/native_host.log",
)
FORBIDDEN_PACKAGED_HOST_PATHS_CASEFOLDED = frozenset(
    path.casefold() for path in FORBIDDEN_PACKAGED_HOST_PATHS
)
CANONICAL_PACKAGED_SPECIAL_PATHS = (
    "host/config.json",
    *PACKAGED_METADATA_PATHS,
)
CANONICAL_PACKAGED_SPECIAL_BY_CASEFOLD = {
    path.casefold(): path for path in CANONICAL_PACKAGED_SPECIAL_PATHS
}
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

def normalize_package_path(raw: object) -> str: ...
def canonical_json_bytes(value: object) -> bytes: ...
def sha256_bytes(value: bytes) -> str: ...
def sha256_file(path: Path) -> str: ...
def update_manifest_to_dict(value: UpdateManifest) -> dict[str, object]: ...
def release_integrity_to_dict(value: ReleaseIntegrity) -> dict[str, object]: ...
def installed_product_to_dict(value: InstalledProduct) -> dict[str, object]: ...
def parse_update_manifest(value: object) -> UpdateManifest: ...
def parse_release_integrity(value: object) -> ReleaseIntegrity: ...
def parse_installed_product(value: object) -> InstalledProduct: ...
def load_update_manifest(path: Path) -> UpdateManifest: ...
def load_release_integrity(path: Path) -> ReleaseIntegrity: ...
def load_installed_product(path: Path) -> InstalledProduct: ...
def generate_release_documents(stage_root: Path, package_version: str) -> ReleaseDocuments: ...
def write_release_documents(stage_root: Path, documents: ReleaseDocuments) -> None: ...
```

Canonical JSON is UTF-8, `sort_keys=True`, `separators=(",", ":")`, `ensure_ascii=True`, no BOM, and exactly one trailing `\n`; hashes include that trailing byte. JSON objects are strict: every required key must exist, unknown keys and duplicate JSON keys are rejected, `NaN`/infinity are rejected, booleans are not integers, capability arrays contain unique non-empty strings, records are sorted by `path`, and all SHA-256 values are lowercase 64-hex strings. Strict `load_*` functions additionally require the input bytes to equal the canonical serialization of the parsed value.

The canonical document shapes are:

```json
{
  "schema_version": 1,
  "package_version": "2.0.74-beta.4",
  "required_capabilities": ["prompt-scope-v1"],
  "provided_capabilities": ["prompt-scope-v1"],
  "chrome_manifest": {"version": "2.0.74", "version_name": "2.0.74-beta.4"},
  "entries": [
    {"path": "extension/assets/app.js", "ownership": "whole_product_directory", "sha256": "<file hash>"},
    {"path": "extension/manifest.json", "ownership": "whole_product_directory", "sha256": "<file hash>"},
    {"path": "host/_internal/python313.dll", "ownership": "whole_product_directory", "sha256": "<file hash>"},
    {"path": "host/config.json", "ownership": "seed_only", "sha256": "<file hash>"},
    {"path": "host/dh_native_host.exe", "ownership": "host_product_file", "sha256": "<file hash>"},
    {"path": "host/installed-product.json", "ownership": "packaged_metadata", "sha256": "<external hash>"},
    {"path": "host/register.py", "ownership": "host_product_file", "sha256": "<file hash>"},
    {"path": "host/release-integrity.json", "ownership": "packaged_metadata", "sha256": "<external hash>"},
    {"path": "host/system_prompt.md", "ownership": "host_product_file", "sha256": "<file hash>"},
    {"path": "install.bat", "ownership": "package_only", "sha256": "<file hash>"},
    {"path": "installer_core.ps1", "ownership": "package_only", "sha256": "<file hash>"}
  ]
}
```

Every packaged regular file except the containing `UPDATE_MANIFEST_PATH` appears exactly once in `UpdateManifest.entries`, and every `ManifestEntry.sha256` is a non-null lowercase 64-hex string. The physical `host/_internal` source directory is mandatory and is the whole-product replacement root; it is not forbidden and is not serialized as a directory entry. Instead, every regular descendant receives `WHOLE_PRODUCT_DIRECTORY`, and later plans infer the one `_internal` replacement root from that fixed prefix. The sibling physical `extension` directory follows the same descendant-entry rule. `HOST_PRODUCT_FILE` entries are flat files under `host/`; `SEED_ONLY` is exactly `host/config.json`; `PACKAGED_METADATA` is exactly `PACKAGED_METADATA_PATHS`; and serialized `PACKAGE_ONLY` entries are exactly `SERIALIZED_PACKAGE_ONLY_PATHS`. The root `update-manifest.json` is a separate implicit package-only singleton: its schema assigns that ownership, the staged/archive bijection requires the physical file, but it is never serialized as a `ManifestEntry` because it cannot contain its own hash. Casefolded `FORBIDDEN_PACKAGED_HOST_PATHS`, any case variant of `host/native_host.log.<n>`, and `host/updates/**` cannot appear in a package under any class. The live-only enum values model generated registration, user ownership, transaction workspace, and unknown-top-level preservation; they are forbidden in package entries. Release generation classifies any other regular file emitted at the root of the PyInstaller `host/` onedir as `HOST_PRODUCT_FILE` and rejects any additional Host subdirectory outside `_internal/`.

This does not permit explicit ZIP directory markers. Package ownership identifies the whole-directory *policy* through descendant file entries; `write_deterministic_archive` emits files only, and `stage_and_validate_archive` rejects `host/_internal/`, `extension/`, and every other explicit directory `ZipInfo`.

```json
{
  "schema_version": 1,
  "package_version": "2.0.74-beta.4",
  "required_capabilities": ["prompt-scope-v1"],
  "provided_capabilities": ["prompt-scope-v1"],
  "chrome_manifest": {"version": "2.0.74", "version_name": "2.0.74-beta.4"},
  "host_files": [{"path": "_internal/runtime.dll", "sha256": "<hash>"}, {"path": "dh_native_host.exe", "sha256": "<hash>"}, {"path": "register.py", "sha256": "<hash>"}, {"path": "system_prompt.md", "sha256": "<hash>"}],
  "extension_files": [{"path": "manifest.json", "sha256": "<hash>"}]
}
```

`host_files` paths are relative to the live Host install root; `extension_files` paths are relative to its sibling `extension/`. `host/system_prompt.md` is a product-owned Host file and therefore appears as `FileRecord(path="system_prompt.md", sha256=<lowercase-64-hex>)`. The internal inventory excludes only non-product data: seed/user `config.json`, generated registration `manifest.json`, both metadata files, `copilot-instructions.md`, `user_prompt.md`, `native_host.log` and rotations, `updates/**`, and unknown top-level paths. Do not describe `system_prompt.md` as an excluded "prompt". In a frozen install, exactness applies to product-owned roots: every regular file under `_internal/` and `extension/` and every listed flat Host product file must match, and no unlisted child may exist inside `_internal/` or `extension/`; preserved user/registration/update/unknown top-level paths are not treated as extras.

The cross-document product bijection is exact and normative. Define these mathematical views without filesystem probing:

```python
update_host_products = {
    (entry.path.removeprefix("host/"), entry.sha256)
    for entry in update_manifest.entries
    if entry.ownership in PRODUCT_OWNERSHIP_CLASSES
    and entry.path.startswith("host/")
}
update_extension_products = {
    (entry.path.removeprefix("extension/"), entry.sha256)
    for entry in update_manifest.entries
    if entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
    and entry.path.startswith("extension/")
}
integrity_host_products = {(record.path, record.sha256) for record in release_integrity.host_files}
integrity_extension_products = {(record.path, record.sha256) for record in release_integrity.extension_files}
```

Generation and validation require both `update_host_products == integrity_host_products` and `update_extension_products == integrity_extension_products`. Equality covers path and hash in both directions: no product path may be missing, added, reassigned, or paired with a different digest in either document. `SEED_ONLY`, `PACKAGED_METADATA`, serialized/implicit package-only paths, and all live-only classes are absent from `ReleaseIntegrity`.

```json
{
  "schema_version": 1,
  "package_version": "2.0.74-beta.4",
  "required_capabilities": ["prompt-scope-v1"],
  "provided_capabilities": ["prompt-scope-v1"],
  "ownership_schema_version": 1,
  "legacy_allowlist_version": 1,
  "release_integrity_sha256": "<sha256 of canonical host/release-integrity.json bytes>"
}
```

`installed-product.json` is the next-update ownership bootstrap. Its version and capability declarations must equal `release-integrity.json`; `ownership_schema_version` freezes the manifest/installed-inventory interpretation; `legacy_allowlist_version` records the fixed fallback used only when an older install has no metadata. Plan A does not consume the legacy allowlist for mutation, but Plan B can distinguish a genuinely metadata-free legacy install from malformed half-metadata without guessing ownership.

The serializers are also frozen. Downstream plans must copy these keys and nesting, not infer JSON from dataclass field names:

```python
def _record_to_dict(record: FileRecord) -> dict[str, object]:
    return {"path": record.path, "sha256": record.sha256}


def update_manifest_to_dict(value: UpdateManifest) -> dict[str, object]:
    return {
        "schema_version": value.schema_version,
        "package_version": value.package_version,
        "required_capabilities": list(value.required_capabilities),
        "provided_capabilities": list(value.provided_capabilities),
        "chrome_manifest": {
            "version": value.chrome_version,
            "version_name": value.chrome_version_name,
        },
        "entries": [
            {
                "path": entry.path,
                "ownership": entry.ownership.value,
                "sha256": entry.sha256,
            }
            for entry in value.entries
        ],
    }


def release_integrity_to_dict(value: ReleaseIntegrity) -> dict[str, object]:
    return {
        "schema_version": value.schema_version,
        "package_version": value.package_version,
        "required_capabilities": list(value.required_capabilities),
        "provided_capabilities": list(value.provided_capabilities),
        "chrome_manifest": {
            "version": value.chrome_version,
            "version_name": value.chrome_version_name,
        },
        "host_files": [_record_to_dict(record) for record in value.host_files],
        "extension_files": [_record_to_dict(record) for record in value.extension_files],
    }


def installed_product_to_dict(value: InstalledProduct) -> dict[str, object]:
    return {
        "schema_version": value.schema_version,
        "package_version": value.package_version,
        "required_capabilities": list(value.required_capabilities),
        "provided_capabilities": list(value.provided_capabilities),
        "ownership_schema_version": value.ownership_schema_version,
        "legacy_allowlist_version": value.legacy_allowlist_version,
        "release_integrity_sha256": value.release_integrity_sha256,
    }
```

The strict parser additionally requires all three `schema_version` values to equal their matching constants, `ownership_schema_version == OWNERSHIP_SCHEMA_VERSION`, and `legacy_allowlist_version == LEGACY_PRODUCT_ALLOWLIST_VERSION`; unknown future versions fail closed. `generate_release_documents` accepts only `type(package_version) is str` and requires it equals `VERSION` for Plan A, so release tooling cannot package a version that the staged Host does not report.

`LEGACY_PRODUCT_PATHS` is the complete version-1 fallback for current shipped source context: PyInstaller places runtime descendants under `_internal`, so there are no additional known flat runtime roots beyond `dh_native_host.exe`, `system_prompt.md`, and `register.py`; `extension` is the whole sibling product directory. Changing this tuple requires incrementing `LEGACY_PRODUCT_ALLOWLIST_VERSION` and an explicit migration review, never runtime discovery.

Version identity has four separate boundaries and must not be collapsed:

1. `generate_release_documents(stage_root, package_version)` is release-build-only. It requires the explicit target `package_version` to equal the freshly loaded, already edited `product_info.VERSION`, and requires the built Extension effective version to equal that target.
2. `validate_staged_package(stage_root, expected_version=None)` is a generic package consistency boundary. It requires the three documents to agree with one another, but never implicitly compares their version or capability declarations to the importing/running Host's `VERSION` or capability constants. When `expected_version` is a non-empty string, it additionally requires exact equality to the internally consistent package version.
3. Updater/archive staging passes the normalized selected target version as `expected_version` when update selection supplied one. That target may be newer than the running Host. Callers that genuinely have no trusted selected target pass `None` and receive only internal consistency validation.
4. `InstallationVerifier` and `run_update_probe` execute from the installed Host after swap. They require installed metadata/Extension identity to equal that running installed executable's `VERSION` and capabilities.

```python
# host/package_archive.py
class PackageValidationError(ValueError):
    def __init__(self, error_code: str) -> None:
        allowed = {
            "invalid_package_path",
            "duplicate_package_path",
            "unsupported_archive_entry",
            "package_manifest_invalid",
            "package_file_missing",
            "package_file_unmanifested",
            "package_hash_mismatch",
            "package_metadata_mismatch",
        }
        if error_code not in allowed:
            raise ValueError("unknown package validation error code")
        self.error_code = error_code
        super().__init__(error_code)

@dataclass(frozen=True)
class ValidatedPackage:
    stage_root: Path
    manifest: UpdateManifest
    release_integrity: ReleaseIntegrity
    installed_product: InstalledProduct

def validate_staged_package(
    stage_root: Path,
    *,
    expected_version: str | None = None,
) -> ValidatedPackage: ...
def stage_and_validate_archive(
    archive_path: Path,
    stage_root: Path,
    *,
    expected_version: str | None = None,
) -> ValidatedPackage: ...
def write_deterministic_archive(stage_root: Path, archive_path: Path) -> None: ...
```

`PackageValidationError.error_code` is one of `invalid_package_path`, `duplicate_package_path`, `unsupported_archive_entry`, `package_manifest_invalid`, `package_file_missing`, `package_file_unmanifested`, `package_hash_mismatch`, or `package_metadata_mismatch`. `validate_staged_package` catches strict document load/parse/canonical/I/O failures and remaps them to `package_manifest_invalid`; direct `load_*` callers still receive `ManifestError`/`OSError`. A malformed/empty `expected_version` or an exact expected-target mismatch is `package_metadata_mismatch`; rejected values are not coerced. Explicit ZIP directory entries are unsupported, including otherwise expected `host/`, `host/_internal/`, and `extension/` markers; parent directories are created only from validated regular-file paths. ZIP output contains regular files only, sorted by normalized path, with `ZipInfo.date_time=(1980, 1, 1, 0, 0, 0)`, `create_system=3`, `external_attr=(0o100644 << 16)`, `compress_type=ZIP_DEFLATED`, and `compresslevel=9`.

```python
# host/install_integrity.py after Task 5
@dataclass(frozen=True)
class InstallationVerification:
    mode: str
    integrity: str
    host_version: str | None = None
    extension_version: str | None = None
    error_code: str | None = None

class InstallationVerifier:
    def __init__(self, install_root: Path, *, frozen: bool | None = None): ...
    def verify(self) -> InstallationVerification: ...
```

```python
# Task 6 additions to host/install_integrity.py
@dataclass(frozen=True)
class UpdateProbeResult:
    status: str
    host_version: str | None = None
    extension_version: str | None = None
    capabilities: tuple[str, ...] = ()
    error_code: str | None = None

def run_update_probe(manifest_path: Path, *, install_root: Path | None = None) -> UpdateProbeResult: ...
```

`InstallationVerification` serializes only to one of the three spec shapes. `UpdateProbeResult` field invariants are exact: success requires both non-empty version strings, `capabilities == PROVIDED_PROTOCOL_CAPABILITIES`, and `error_code is None`; error requires both version fields `None`, `capabilities == ()`, and `error_code == "package_probe_failed"`. It serializes success as `{"status":"success","host_version":"...","extension_version":"...","capabilities":["prompt-scope-v1"]}` and failure as `{"status":"error","error_code":"package_probe_failed"}`. Probe failures never expose paths, exceptions, rejected values, or partial mismatch details.

The dataclasses intentionally carry optional fields so one type can represent the three allowlisted wire shapes, but constructors are private to these modules and tests enforce the combinations above; Host serialization never uses `asdict()`.

```python
# host/early_cli.py
def dispatch_early_cli(argv: Sequence[str]) -> int | None: ...
```

Return `None` for normal Host startup. Accept exactly `--update-probe <absolute-update-manifest-path>` and no other arguments, print the canonical allowlisted probe result, and return `0` on success or `1` on failure. A recognized flag with missing/extra/relative/path-traversing arguments emits only the fixed failure object and returns `2`.

### Task 1: Product Version and Capability Source

**Files:**
- Create: `host/product_info.py`
- Create: `host/test_product_info.py`
- Modify: `host/dh_native_host.py:128-132`
- Modify: `release_helper.py:16,369`

**Interfaces:**
- Consumes: current Host version literal `2.0.74-beta.4`
- Produces: `HostCapabilities`, `VERSION`, `REQUIRED_PROTOCOL_CAPABILITIES`, `PROVIDED_PROTOCOL_CAPABILITIES`, `get_host_capabilities()` exactly as frozen above

- [ ] **Step 1: Write the failing capability tests**

Create `host/test_product_info.py` with this complete table and assertions:

```python
import unittest
import re
import tempfile
from pathlib import Path

import release_helper
from product_info import (
    PROVIDED_PROTOCOL_CAPABILITIES,
    REQUIRED_PROTOCOL_CAPABILITIES,
    VERSION,
    HostCapabilities,
    get_host_capabilities,
)


class TestProductInfo(unittest.TestCase):
    def test_plan_a_capability_contract(self):
        self.assertEqual(VERSION, "2.0.74-beta.4")
        self.assertEqual(REQUIRED_PROTOCOL_CAPABILITIES, ("prompt-scope-v1",))
        self.assertEqual(PROVIDED_PROTOCOL_CAPABILITIES, ("prompt-scope-v1",))
        self.assertNotIn("transactional-update-v1", PROVIDED_PROTOCOL_CAPABILITIES)

    def test_projection_is_frozen_and_exact(self):
        actual = get_host_capabilities()
        self.assertEqual(
            actual,
            HostCapabilities(
                host_version="2.0.74-beta.4",
                required=("prompt-scope-v1",),
                provided=("prompt-scope-v1",),
            ),
        )
        with self.assertRaises((AttributeError, TypeError)):
            actual.host_version = "changed"

    def test_release_helper_updates_the_product_info_version_source(self):
        self.assertEqual(
            release_helper.HOST_FILE.resolve(),
            (Path(release_helper.__file__).resolve().parent / "host" / "product_info.py"),
        )

    def test_release_helper_does_not_retain_a_stale_host_version_source(self):
        source = Path(release_helper.__file__).read_text(encoding="utf-8")
        self.assertNotIn('HOST_FILE = os.path.join(HOST_DIR, "dh_native_host.py")', source)
        self.assertIn('HOST_FILE = HOST_DIR / "product_info.py"', source)
        self.assertEqual(source.count("update_python_version(HOST_FILE, args.version)"), 1)
        self.assertNotRegex(
            Path("host/dh_native_host.py").read_text(encoding="utf-8"),
            re.compile(r'^VERSION\s*=\s*["\']', re.MULTILINE),
        )

    def test_update_python_version_changes_the_only_runtime_version_source(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "product_info.py"
            target.write_text(
                Path("host/product_info.py").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            release_helper.update_python_version(target, "9.9.9-test")
            self.assertIn(
                'VERSION = "9.9.9-test"',
                target.read_text(encoding="utf-8"),
            )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run from the repository root in a fresh PowerShell process:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task1-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_product_info -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'product_info'`.

- [ ] **Step 3: Implement the minimal product-info module and delegate the Host constant**

Create `host/product_info.py` with this complete body:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class HostCapabilities:
    host_version: str
    required: tuple[str, ...]
    provided: tuple[str, ...]


VERSION = "2.0.74-beta.4"
REQUIRED_PROTOCOL_CAPABILITIES = ("prompt-scope-v1",)
PROVIDED_PROTOCOL_CAPABILITIES = ("prompt-scope-v1",)


def get_host_capabilities() -> HostCapabilities:
    return HostCapabilities(
        host_version=VERSION,
        required=REQUIRED_PROTOCOL_CAPABILITIES,
        provided=PROVIDED_PROTOCOL_CAPABILITIES,
    )
```

In `dh_native_host.py`, replace the local `VERSION = ...` with:

```python
from product_info import VERSION
```

Do not import `dh_native_host` from `product_info`; `product_info` must remain safe for early CLI and release tooling imports.

In Task 1, first replace `release_helper.py`'s cwd-derived configuration block with `Path` values rooted at the script, including `ROOT_DIR = Path(__file__).resolve().parent`, `HOST_DIR = ROOT_DIR / "host"`, and `HOST_FILE = HOST_DIR / "product_info.py"`; existing `os.path`/subprocess consumers accept path-like values, and Task 3 completes the remaining path-oriented staging refactor. Do not insert `HOST_DIR` into `sys.path` yet in Task 1 because doing so does not import package modules but belongs with Task 3's staging boundary. Keep exactly one existing `update_python_version(HOST_FILE, args.version)` call: release versioning must edit the only `VERSION` definition. Remove the literal definition from `dh_native_host.py`; it imports `VERSION` only. Do not change the version value in this task. This stale-import/version-bump regression prevents a future release from updating a dead source while runtime and manifests keep the old version.

- [ ] **Step 4: Run GREEN and prove the capability advertisement is active**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task1-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_product_info host.test_version_parse -v
```

Expected: PASS. Then temporarily append `"transactional-update-v1"` to `PROVIDED_PROTOCOL_CAPABILITIES`, rerun `host.test_product_info.TestProductInfo.test_plan_a_capability_contract`, observe FAIL, restore the tuple, and rerun to PASS.

- [ ] **Step 5: Commit the independently reviewable capability source**

```powershell
git add host/product_info.py host/test_product_info.py host/dh_native_host.py release_helper.py
git commit -m "feat(host): centralize product capabilities"
```

### Task 2: Strict Manifest Models and Release Documents

**Files:**
- Create: `host/package_manifest.py`
- Create: `host/test_package_manifest.py`

**Interfaces:**
- Consumes: `product_info.VERSION`, `REQUIRED_PROTOCOL_CAPABILITIES`, `PROVIDED_PROTOCOL_CAPABILITIES`; a complete package stage containing `host/`, `extension/`, `installer_core.ps1`, and `install.bat`
- Produces: every `package_manifest.py` enum, dataclass, constant, parser, canonical/hash helper, `generate_release_documents(...)`, and `write_release_documents(...)` from the frozen interfaces

- [ ] **Step 1: Write the failing strict-parser and canonicalization tests**

Create `host/test_package_manifest.py`. Use `tempfile.TemporaryDirectory()` and a `_make_stage()` helper that writes this exact synthetic tree (bytes in parentheses):

```text
host/dh_native_host.exe                 (b"host-exe")
host/_internal/python313.dll            (b"runtime")
host/system_prompt.md                   (b"core")
host/register.py                        (b"register")
host/config.json                        (b"{}\n")
extension/manifest.json                 ({"version":"2.0.74","version_name":"2.0.74-beta.4"}\n)
extension/assets/app.js                 (b"app")
installer_core.ps1                      (b"installer")
install.bat                             (b"wrapper")
```

Add these concrete tests:

```python
PATH_CASES = (
    ("host/system_prompt.md", "host/system_prompt.md"),
    ("", None), (".", None), ("../x", None), ("host/../x", None),
    ("/host/x", None), (r"C:\host\x", None), (r"\\server\share\x", None),
    (r"host\x", None), ("host//x", None), ("host/./x", None),
    ("host/x\x00y", None), ("extension/app.js:stream", None),
    ("extension/app.js.", None), ("extension/app.js ", None),
    ("host/CON", None), ("extension/AUX.txt", None),
)

def test_path_normalization_table(self):
    for raw, expected in PATH_CASES:
        with self.subTest(raw=raw):
            if expected is None:
                with self.assertRaises(ManifestError):
                    normalize_package_path(raw)
            else:
                self.assertEqual(normalize_package_path(raw), expected)

def test_canonical_json_is_stable_ascii_and_newline_terminated(self):
    self.assertEqual(
        canonical_json_bytes({"z": "é", "a": [2, 1]}),
        b'{"a":[2,1],"z":"\\u00e9"}\n',
    )

PARSER_MUTATIONS = (
    ("missing-key", lambda d: d.pop("package_version")),
    ("unknown-key", lambda d: d.__setitem__("surprise", True)),
    ("bool-schema", lambda d: d.__setitem__("schema_version", True)),
    ("empty-capability", lambda d: d.__setitem__("provided_capabilities", [""])),
    ("duplicate-capability", lambda d: d.__setitem__("provided_capabilities", ["prompt-scope-v1", "prompt-scope-v1"])),
    ("wrong-hash-case", lambda d: d["entries"][0].__setitem__("sha256", "A" * 64)),
    ("unknown-ownership", lambda d: d["entries"][0].__setitem__("ownership", "mystery")),
    ("duplicate-owned-path", lambda d: d["entries"].append(dict(d["entries"][0]))),
    ("self-entry", lambda d: d["entries"].append({"path": "update-manifest.json", "ownership": "package_only", "sha256": "0" * 64})),
)
```

Build a known-valid manifest dictionary with one sorted `entries` array containing all five packaged ownership values and iterate `PARSER_MUTATIONS`, deep-copying before mutation and asserting `parse_update_manifest` raises `ManifestError`. Add parser cases that reject live-only ownership values, an `_internal`/Extension descendant assigned to the wrong class, `host/config.json` assigned as product-owned, an unsorted entry array, and case-fold collisions such as `extension/App.js` plus `extension/app.js`. Add equivalent missing/unknown/wrong-type tests for `parse_release_integrity` and `parse_installed_product`. Assert a rejected object whose `__str__` raises is rejected by type without coercion. For each `load_*`, add raw-byte cases for duplicate JSON keys, `NaN`, pretty/noncanonical JSON, invalid UTF-8, and a missing final newline.

- [ ] **Step 2: Run parser tests to verify RED**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task2-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_package_manifest -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'package_manifest'`.

- [ ] **Step 3: Implement strict values, paths, hashes, and parsers**

Implement the frozen enums/data classes/constants and parsing functions. Use exact-key checks (`set(value) == expected_keys`), exact type checks (`type(value) is dict/list/str/int`), a compiled lowercase SHA-256 regex, sorted tuple validation, one exact-path set, and one `casefold()` collision set across all entries. Parse JSON with `object_pairs_hook` that rejects duplicate keys and `parse_constant` that rejects non-finite values. Never call `str()` on a rejected value. `load_*` reads UTF-8 strictly, catches decode/JSON/I/O failures, rejects noncanonical bytes by comparing with the matching serializer, and raises `ManifestError` with fixed non-sensitive text.

Use these concrete boundary bodies and strict field helpers rather than permissive `.get(...)` calls:

```python
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_WINDOWS_RESERVED_COMPONENTS = {
    "con", "prn", "aux", "nul",
    *(f"com{index}" for index in range(1, 10)),
    *(f"lpt{index}" for index in range(1, 10)),
}


def normalize_package_path(raw: object) -> str:
    if type(raw) is not str or not raw or "\x00" in raw or "\\" in raw:
        raise ManifestError("invalid package path")
    if raw.startswith(("/", "//")) or re.match(r"^[A-Za-z]:", raw):
        raise ManifestError("invalid package path")
    parts = raw.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ManifestError("invalid package path")
    for part in parts:
        if ":" in part or part.endswith((".", " ")):
            raise ManifestError("invalid Windows package path")
        if part.split(".", 1)[0].casefold() in _WINDOWS_RESERVED_COMPONENTS:
            raise ManifestError("reserved Windows package path")
    return "/".join(parts)


def canonical_json_bytes(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _require_keys(value: object, expected: frozenset[str]) -> dict[str, object]:
    if type(value) is not dict or frozenset(value) != expected:
        raise ManifestError("invalid object keys")
    return value


def _require_int(value: object) -> int:
    if type(value) is not int:
        raise ManifestError("invalid integer")
    return value


def _require_schema(value: object, expected: int) -> int:
    parsed = _require_int(value)
    if parsed != expected:
        raise ManifestError("unsupported schema version")
    return parsed


def _require_string(value: object, *, allow_empty: bool = False) -> str:
    if type(value) is not str or (not allow_empty and not value):
        raise ManifestError("invalid string")
    return value


def _require_sha256(value: object) -> str:
    text = _require_string(value)
    if _SHA256_RE.fullmatch(text) is None:
        raise ManifestError("invalid SHA-256")
    return text


def _require_capabilities(value: object) -> tuple[str, ...]:
    if type(value) is not list:
        raise ManifestError("invalid capabilities")
    result = tuple(_require_string(item) for item in value)
    if len(set(result)) != len(result):
        raise ManifestError("duplicate capability")
    return result


def _parse_file_records(value: object) -> tuple[FileRecord, ...]:
    if type(value) is not list:
        raise ManifestError("invalid file records")
    parsed: list[FileRecord] = []
    for item in value:
        obj = _require_keys(item, frozenset({"path", "sha256"}))
        parsed.append(FileRecord(
            path=normalize_package_path(obj["path"]),
            sha256=_require_sha256(obj["sha256"]),
        ))
    records = tuple(parsed)
    if records != tuple(sorted(records)):
        raise ManifestError("unsorted file records")
    _require_unique_paths(record.path for record in records)
    return records


def _parse_chrome_manifest(value: object) -> tuple[str, str | None]:
    obj = _require_keys(value, frozenset({"version", "version_name"}))
    version = _require_string(obj["version"])
    version_name = obj["version_name"]
    if version_name is not None:
        version_name = _require_string(version_name)
    return version, version_name


def _parse_manifest_entry(value: object) -> ManifestEntry:
    obj = _require_keys(value, frozenset({"path", "ownership", "sha256"}))
    try:
        ownership = OwnershipClass(_require_string(obj["ownership"]))
    except ValueError as error:
        raise ManifestError("invalid ownership class") from error
    return ManifestEntry(
        path=normalize_package_path(obj["path"]),
        ownership=ownership,
        sha256=_require_sha256(obj["sha256"]),
    )


def _require_unique_paths(paths) -> None:
    exact: set[str] = set()
    folded: set[str] = set()
    for path in paths:
        if path in exact or path.casefold() in folded:
            raise ManifestError("duplicate package path")
        exact.add(path)
        folded.add(path.casefold())


def _require_package_ownership_paths(entries: tuple[ManifestEntry, ...]) -> None:
    for entry in entries:
        if entry.ownership in LIVE_ONLY_OWNERSHIP_CLASSES or entry.path == UPDATE_MANIFEST_PATH:
            raise ManifestError("invalid packaged ownership")
        folded_path = entry.path.casefold()
        canonical_special = CANONICAL_PACKAGED_SPECIAL_BY_CASEFOLD.get(folded_path)
        if canonical_special is not None and entry.path != canonical_special:
            raise ManifestError("noncanonical reserved package path")
        if (
            folded_path in FORBIDDEN_PACKAGED_HOST_PATHS_CASEFOLDED
            or folded_path.startswith("host/native_host.log.")
            or folded_path.startswith("host/updates/")
        ):
            raise ManifestError("user or generated file in package")
        if entry.path.startswith(("host/_internal/", "extension/")):
            if entry.ownership is not OwnershipClass.WHOLE_PRODUCT_DIRECTORY:
                raise ManifestError("invalid whole-directory ownership")
        elif entry.path == "host/config.json":
            if entry.ownership is not OwnershipClass.SEED_ONLY:
                raise ManifestError("invalid seed ownership")
        elif entry.path in PACKAGED_METADATA_PATHS:
            if entry.ownership is not OwnershipClass.PACKAGED_METADATA:
                raise ManifestError("invalid metadata ownership")
        elif entry.path in SERIALIZED_PACKAGE_ONLY_PATHS:
            if entry.ownership is not OwnershipClass.PACKAGE_ONLY:
                raise ManifestError("invalid package-only ownership")
        elif entry.path.startswith("host/") and "/" not in entry.path.removeprefix("host/"):
            if entry.ownership is not OwnershipClass.HOST_PRODUCT_FILE:
                raise ManifestError("invalid Host product ownership")
        else:
            raise ManifestError("unrecognized package path")
    by_class = {
        ownership: {entry.path for entry in entries if entry.ownership is ownership}
        for ownership in OwnershipClass
    }
    if by_class[OwnershipClass.SEED_ONLY] != {"host/config.json"}:
        raise ManifestError("incomplete seed ownership")
    if by_class[OwnershipClass.PACKAGED_METADATA] != set(PACKAGED_METADATA_PATHS):
        raise ManifestError("incomplete metadata ownership")
    if by_class[OwnershipClass.PACKAGE_ONLY] != set(SERIALIZED_PACKAGE_ONLY_PATHS):
        raise ManifestError("incomplete package-only ownership")
    required_host = {
        "host/dh_native_host.exe",
        "host/register.py",
        "host/system_prompt.md",
    }
    if not required_host.issubset(by_class[OwnershipClass.HOST_PRODUCT_FILE]):
        raise ManifestError("incomplete Host product ownership")
    whole = by_class[OwnershipClass.WHOLE_PRODUCT_DIRECTORY]
    if "extension/manifest.json" not in whole:
        raise ManifestError("Extension manifest missing")
    if not any(path.startswith("host/_internal/") for path in whole):
        raise ManifestError("Host runtime missing")


def parse_update_manifest(value: object) -> UpdateManifest:
    obj = _require_keys(value, frozenset({
        "schema_version", "package_version", "required_capabilities",
        "provided_capabilities", "chrome_manifest", "entries",
    }))
    if type(obj["entries"]) is not list:
        raise ManifestError("invalid entries")
    entries = tuple(_parse_manifest_entry(item) for item in obj["entries"])
    if entries != tuple(sorted(entries)):
        raise ManifestError("unsorted entries")
    _require_unique_paths(entry.path for entry in entries)
    _require_package_ownership_paths(entries)
    chrome_version, chrome_version_name = _parse_chrome_manifest(obj["chrome_manifest"])
    return UpdateManifest(
        schema_version=_require_schema(obj["schema_version"], UPDATE_MANIFEST_SCHEMA_VERSION),
        package_version=_require_string(obj["package_version"]),
        required_capabilities=_require_capabilities(obj["required_capabilities"]),
        provided_capabilities=_require_capabilities(obj["provided_capabilities"]),
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        entries=entries,
    )


def parse_release_integrity(value: object) -> ReleaseIntegrity:
    obj = _require_keys(value, frozenset({
        "schema_version", "package_version", "required_capabilities",
        "provided_capabilities", "chrome_manifest", "host_files", "extension_files",
    }))
    chrome_version, chrome_version_name = _parse_chrome_manifest(obj["chrome_manifest"])
    return ReleaseIntegrity(
        schema_version=_require_schema(obj["schema_version"], RELEASE_INTEGRITY_SCHEMA_VERSION),
        package_version=_require_string(obj["package_version"]),
        required_capabilities=_require_capabilities(obj["required_capabilities"]),
        provided_capabilities=_require_capabilities(obj["provided_capabilities"]),
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        host_files=_parse_file_records(obj["host_files"]),
        extension_files=_parse_file_records(obj["extension_files"]),
    )


def parse_installed_product(value: object) -> InstalledProduct:
    obj = _require_keys(value, frozenset({
        "schema_version", "package_version", "required_capabilities",
        "provided_capabilities", "ownership_schema_version",
        "legacy_allowlist_version", "release_integrity_sha256",
    }))
    return InstalledProduct(
        schema_version=_require_schema(obj["schema_version"], INSTALLED_PRODUCT_SCHEMA_VERSION),
        package_version=_require_string(obj["package_version"]),
        required_capabilities=_require_capabilities(obj["required_capabilities"]),
        provided_capabilities=_require_capabilities(obj["provided_capabilities"]),
        ownership_schema_version=_require_schema(obj["ownership_schema_version"], OWNERSHIP_SCHEMA_VERSION),
        legacy_allowlist_version=_require_schema(obj["legacy_allowlist_version"], LEGACY_PRODUCT_ALLOWLIST_VERSION),
        release_integrity_sha256=_require_sha256(obj["release_integrity_sha256"]),
    )


def _reject_duplicate_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ManifestError("duplicate JSON key")
        result[key] = value
    return result


def _reject_constant(_value: str) -> object:
    raise ManifestError("non-finite JSON value")


def _load_canonical(path: Path, parser, serializer):
    try:
        raw = path.read_bytes()
        value = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        parsed = parser(value)
    except ManifestError:
        raise
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ManifestError("invalid manifest document") from error
    if raw != canonical_json_bytes(serializer(parsed)):
        raise ManifestError("noncanonical manifest document")
    return parsed


def load_update_manifest(path: Path) -> UpdateManifest:
    return _load_canonical(path, parse_update_manifest, update_manifest_to_dict)


def load_release_integrity(path: Path) -> ReleaseIntegrity:
    return _load_canonical(path, parse_release_integrity, release_integrity_to_dict)


def load_installed_product(path: Path) -> InstalledProduct:
    return _load_canonical(path, parse_installed_product, installed_product_to_dict)
```

- [ ] **Step 4: Add failing release-generation tests**

Extend `host/test_package_manifest.py` with:

```python
def test_generated_documents_have_exact_ownership_and_hash_links(self):
    stage = self._make_stage()
    docs = generate_release_documents(stage, "2.0.74-beta.4")
    self.assertEqual(docs.update_manifest.required_capabilities, ("prompt-scope-v1",))
    self.assertEqual(docs.update_manifest.provided_capabilities, ("prompt-scope-v1",))
    self.assertEqual(
        {e.path for e in docs.update_manifest.entries if e.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY},
        {"extension/assets/app.js", "extension/manifest.json", "host/_internal/python313.dll"},
    )
    self.assertEqual(
        {e.path for e in docs.update_manifest.entries if e.ownership is OwnershipClass.PACKAGED_METADATA},
        {"host/installed-product.json", "host/release-integrity.json"},
    )
    self.assertEqual(
        docs.release_integrity.host_files,
        tuple(sorted(docs.release_integrity.host_files)),
    )
    self.assertNotIn("release-integrity.json", {r.path for r in docs.release_integrity.host_files})
    self.assertNotIn("installed-product.json", {r.path for r in docs.release_integrity.host_files})
    self.assertEqual(
        docs.installed_product.release_integrity_sha256,
        sha256_bytes(canonical_json_bytes(release_integrity_to_dict(docs.release_integrity))),
    )
    update_host = {
        (entry.path.removeprefix("host/"), entry.sha256)
        for entry in docs.update_manifest.entries
        if entry.ownership in PRODUCT_OWNERSHIP_CLASSES
        and entry.path.startswith("host/")
    }
    update_extension = {
        (entry.path.removeprefix("extension/"), entry.sha256)
        for entry in docs.update_manifest.entries
        if entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
        and entry.path.startswith("extension/")
    }
    self.assertEqual(update_host, {(r.path, r.sha256) for r in docs.release_integrity.host_files})
    self.assertEqual(update_extension, {(r.path, r.sha256) for r in docs.release_integrity.extension_files})

def test_write_release_documents_materializes_external_metadata_hashes(self):
    stage = self._make_stage()
    docs = generate_release_documents(stage, "2.0.74-beta.4")
    write_release_documents(stage, docs)
    parsed = load_update_manifest(stage / "update-manifest.json")
    hashes = {e.path: e.sha256 for e in parsed.entries}
    self.assertEqual(hashes["host/release-integrity.json"], sha256_file(stage / "host/release-integrity.json"))
    self.assertEqual(hashes["host/installed-product.json"], sha256_file(stage / "host/installed-product.json"))
    self.assertNotIn("update-manifest.json", hashes)

def test_installed_product_has_exact_frozen_fields(self):
    stage = self._make_stage()
    documents = generate_release_documents(stage, "2.0.74-beta.4")
    self.assertEqual(documents.installed_product, InstalledProduct(
        schema_version=1,
        package_version="2.0.74-beta.4",
        required_capabilities=("prompt-scope-v1",),
        provided_capabilities=("prompt-scope-v1",),
        ownership_schema_version=1,
        legacy_allowlist_version=1,
        release_integrity_sha256=documents.installed_product.release_integrity_sha256,
    ))
    self.assertEqual(
        set(installed_product_to_dict(documents.installed_product)),
        {
            "schema_version", "package_version", "required_capabilities",
            "provided_capabilities", "ownership_schema_version",
            "legacy_allowlist_version", "release_integrity_sha256",
        },
    )

def test_valid_stage_requires_and_accepts_internal_whole_product_directory(self):
    stage = self._make_stage()
    documents = generate_release_documents(stage, "2.0.74-beta.4")
    entries = {entry.path: entry for entry in documents.update_manifest.entries}
    self.assertNotIn("host/_internal", entries)
    self.assertEqual(
        entries["host/_internal/python313.dll"].ownership,
        OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
    )
    integrity = {record.path: record.sha256 for record in documents.release_integrity.host_files}
    self.assertEqual(
        entries["host/_internal/python313.dll"].sha256,
        integrity["_internal/python313.dll"],
    )
```

Define the test classes exactly as `ManifestParserTests`, `ReleaseDocumentGenerationTests`, and `FilesystemEntryTypeTests`. `ReleaseDocumentGenerationTests` contains both snippets above and positive/negative generation cases. Add `test_valid_stage_requires_and_accepts_internal_whole_product_directory`: use the exact valid synthetic tree, assert generation succeeds, assert no entry path equals `host/_internal`, assert `host/_internal/python313.dll` is present as `WHOLE_PRODUCT_DIRECTORY`, and assert the ReleaseIntegrity counterpart is `_internal/python313.dll` with the same hash. Assert missing `host/dh_native_host.exe`; absent `_internal`; absent/invalid Extension manifest; Extension effective version (`version_name` when present, otherwise `version`) different from `package_version`; pre-existing `host/release-integrity.json` alone; pre-existing `host/installed-product.json` alone; both metadata files together; an unexpected Host subdirectory such as `host/plugins/x.dll`; uppercase aliases of `config.json` and both metadata names; and each case variant of forbidden generated/user/workspace paths (`manifest.json`, both prompt files, a base/rotated log, and `updates/x`) are rejected. In all three pre-existing-metadata cases, snapshot bytes before the call and assert generation raises `ManifestError` without changing or deleting either file. Add a positive `host/helper.dll` case proving all other flat onedir runtime files are `HOST_PRODUCT_FILE` rather than a three-file hard-coded list.

`FilesystemEntryTypeTests` must be deterministic on Windows without Developer Mode or symlink privileges. Patch the private inventory helper's `Path.lstat()` result with `stat.S_IFLNK | 0o777`, `stat.S_IFIFO | 0o600`, and regular mode carrying Windows `stat.FILE_ATTRIBUTE_REPARSE_POINT`; in every subtest assert `ManifestError`. A privilege-guarded real symlink fixture may supplement this but can never be the only coverage. The production helper must use `lstat`, reject every non-regular file, and on Windows reject the reparse attribute before opening bytes.

```python
def test_regular_file_guard_rejects_link_fifo_and_reparse(self):
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    cases = (
        SimpleNamespace(st_mode=stat.S_IFLNK | 0o777, st_file_attributes=0),
        SimpleNamespace(st_mode=stat.S_IFIFO | 0o600, st_file_attributes=0),
        SimpleNamespace(st_mode=stat.S_IFREG | 0o644, st_file_attributes=reparse),
    )
    for fake_stat in cases:
        with self.subTest(mode=fake_stat.st_mode, attrs=fake_stat.st_file_attributes):
            path = MagicMock(spec=Path)
            path.lstat.return_value = fake_stat
            with self.assertRaises(ManifestError):
                _require_regular_file(path)

def test_walker_returns_global_normalized_lexical_order(self):
    root = self.root / "walk"
    (root / "z").mkdir(parents=True)
    (root / "a").mkdir()
    (root / "z" / "a.txt").write_bytes(b"za")
    (root / "a" / "z.txt").write_bytes(b"az")
    (root / "a.txt").write_bytes(b"a")
    (root / "m.txt").write_bytes(b"m")
    self.assertEqual(
        _walk_regular_relative_paths(root),
        ("a.txt", "a/z.txt", "m.txt", "z/a.txt"),
    )
```

Also patch a child directory's `lstat()` to `S_IFDIR` plus the reparse attribute and invoke `_walk_regular_relative_paths`; assert `ManifestError` before any descendant iteration. This locks junction containment, not only file reparse rejection.

Expected before implementation: FAIL because generation/writer/serializer functions are absent.

Run immediately after adding these generation tests:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task2-generation-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_package_manifest.ReleaseDocumentGenerationTests -v
```

Expected: FAIL naming the first missing generation/serializer API; it must not pass against parser-only code.

- [ ] **Step 5: Implement deterministic release generation and two-pass metadata writing**

Implement all three frozen `*_to_dict` serializers. Inventory only regular files and reject symlinks/reparse-like non-files. Compute byte hashes for every package entry, internal relative Host/Extension records, and external ownership records exactly as specified. `generate_release_documents` remains pure because it can canonicalize the two metadata models in memory before it constructs the final update manifest. Generate in this order:

1. Derive internal product records and `ReleaseIntegrity` while excluding both metadata names.
2. Canonicalize `ReleaseIntegrity`; derive `InstalledProduct.release_integrity_sha256`.
3. Canonicalize both Host metadata documents in memory; place their hashes in `UpdateManifest.entries`.
4. Write all three files through sibling temporary files followed by `os.replace`, so a test cannot observe partially written JSON.

`generate_release_documents` is pure: it returns values and does not create files. `write_release_documents` reserializes those exact returned values, verifies the manifest's two external hashes still match the in-memory metadata bytes, and writes only the three named outputs.

Use this implementation skeleton so generation and writing cannot drift:

```python
def generate_release_documents(stage_root: Path, package_version: str) -> ReleaseDocuments:
    if type(package_version) is not str or package_version != VERSION:
        raise ManifestError("package version mismatch")
    stage_root = stage_root.resolve(strict=True)
    metadata_paths = tuple(
        stage_root.joinpath(*relative.split("/"))
        for relative in PACKAGED_METADATA_PATHS
    )
    if any(path.exists() or path.is_symlink() for path in metadata_paths):
        raise ManifestError("pre-existing packaged metadata")
    chrome_version, chrome_version_name = _read_chrome_manifest(
        stage_root / "extension" / "manifest.json"
    )
    effective_extension_version = chrome_version_name or chrome_version
    if effective_extension_version != package_version:
        raise ManifestError("package version mismatch")

    host_records = _inventory_host_products(stage_root / "host")
    extension_records = _inventory_regular_files(stage_root / "extension")
    integrity = ReleaseIntegrity(
        schema_version=RELEASE_INTEGRITY_SCHEMA_VERSION,
        package_version=package_version,
        required_capabilities=REQUIRED_PROTOCOL_CAPABILITIES,
        provided_capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        host_files=host_records,
        extension_files=extension_records,
    )
    integrity_bytes = canonical_json_bytes(release_integrity_to_dict(integrity))
    installed = InstalledProduct(
        schema_version=INSTALLED_PRODUCT_SCHEMA_VERSION,
        package_version=package_version,
        required_capabilities=REQUIRED_PROTOCOL_CAPABILITIES,
        provided_capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        ownership_schema_version=OWNERSHIP_SCHEMA_VERSION,
        legacy_allowlist_version=LEGACY_PRODUCT_ALLOWLIST_VERSION,
        release_integrity_sha256=sha256_bytes(integrity_bytes),
    )
    installed_bytes = canonical_json_bytes(installed_product_to_dict(installed))
    entries = _build_update_entries(
        stage_root,
        host_records,
        extension_records,
        {
            "host/release-integrity.json": sha256_bytes(integrity_bytes),
            "host/installed-product.json": sha256_bytes(installed_bytes),
        },
    )
    manifest = UpdateManifest(
        schema_version=UPDATE_MANIFEST_SCHEMA_VERSION,
        package_version=package_version,
        required_capabilities=REQUIRED_PROTOCOL_CAPABILITIES,
        provided_capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        entries=entries,
    )
    _require_product_bijection(manifest, integrity)
    return ReleaseDocuments(
        update_manifest=manifest,
        release_integrity=integrity,
        installed_product=installed,
    )


def write_release_documents(stage_root: Path, documents: ReleaseDocuments) -> None:
    payloads = {
        stage_root / "host" / "release-integrity.json": canonical_json_bytes(
            release_integrity_to_dict(documents.release_integrity)
        ),
        stage_root / "host" / "installed-product.json": canonical_json_bytes(
            installed_product_to_dict(documents.installed_product)
        ),
        stage_root / UPDATE_MANIFEST_PATH: canonical_json_bytes(
            update_manifest_to_dict(documents.update_manifest)
        ),
    }
    _require_document_links(documents, payloads)
    for path, payload in payloads.items():
        _write_sibling_replace(path, payload)
```

`_build_update_entries` maps every Host/Extension `FileRecord` to its exact prefixed `ManifestEntry`, appends the seed, metadata, and serialized installer entries, then returns a path-sorted tuple after exact-path and casefold uniqueness checks. `_write_sibling_replace` creates a sibling temporary file, writes and flushes bytes, calls `os.fsync`, closes, and calls `os.replace`; on failure it deletes only its temporary sibling.

Use these helper bodies:

```python
def _require_regular_file(path: Path) -> None:
    info = path.lstat()
    attributes = getattr(info, "st_file_attributes", 0)
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    if not stat.S_ISREG(info.st_mode) or attributes & reparse:
        raise ManifestError("unsupported filesystem entry")


def _require_plain_directory(path: Path) -> None:
    info = path.lstat()
    attributes = getattr(info, "st_file_attributes", 0)
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    if not stat.S_ISDIR(info.st_mode) or attributes & reparse:
        raise ManifestError("unsupported filesystem directory")


def _walk_regular_relative_paths(root: Path) -> tuple[str, ...]:
    _require_plain_directory(root)
    root = root.resolve(strict=True)
    _require_plain_directory(root)
    paths: list[str] = []

    def visit(directory: Path) -> int:
        count = 0
        for path in sorted(directory.iterdir()):
            info = path.lstat()
            attributes = getattr(info, "st_file_attributes", 0)
            reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
            if attributes & reparse:
                raise ManifestError("unsupported filesystem entry")
            if stat.S_ISDIR(info.st_mode):
                descendants = visit(path)
                if descendants == 0:
                    raise ManifestError("unmanifested empty directory")
                count += descendants
                continue
            _require_regular_file(path)
            paths.append(normalize_package_path(path.relative_to(root).as_posix()))
            count += 1
        return count

    visit(root)
    return tuple(sorted(paths))


def _inventory_regular_files(root: Path) -> tuple[FileRecord, ...]:
    return tuple(
        FileRecord(
            path=relative,
            sha256=sha256_file(root.joinpath(*relative.split("/"))),
        )
        for relative in _walk_regular_relative_paths(root)
    )


def _inventory_host_products(host_root: Path) -> tuple[FileRecord, ...]:
    _require_plain_directory(host_root)
    host_root = host_root.resolve(strict=True)
    _require_plain_directory(host_root)
    records: list[FileRecord] = []
    for child in sorted(host_root.iterdir()):
        canonical_special = {
            "config.json": "config.json",
            "release-integrity.json": "release-integrity.json",
            "installed-product.json": "installed-product.json",
        }.get(child.name.casefold())
        if canonical_special is not None and child.name != canonical_special:
            raise ManifestError("noncanonical reserved package source path")
        if child.name in {"config.json", "release-integrity.json", "installed-product.json"}:
            continue
        package_path = f"host/{child.name}"
        folded_path = package_path.casefold()
        if (
            folded_path in FORBIDDEN_PACKAGED_HOST_PATHS_CASEFOLDED
            or child.name.casefold().startswith("native_host.log.")
            or child.name.casefold() == "updates"
        ):
            raise ManifestError("user or generated file in package source")
        info = child.lstat()
        attributes = getattr(info, "st_file_attributes", 0)
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
        if attributes & reparse:
            raise ManifestError("unsupported filesystem entry")
        if stat.S_ISDIR(info.st_mode):
            if child.name != "_internal":
                raise ManifestError("unexpected Host product directory")
            records.extend(
                FileRecord(path=f"_internal/{record.path}", sha256=record.sha256)
                for record in _inventory_regular_files(child)
            )
        else:
            _require_regular_file(child)
            records.append(FileRecord(path=child.name, sha256=sha256_file(child)))
    required = {"dh_native_host.exe", "register.py", "system_prompt.md"}
    paths = {record.path for record in records}
    if not required.issubset(paths) or not any(path.startswith("_internal/") for path in paths):
        raise ManifestError("incomplete Host product")
    return tuple(sorted(records))


def _build_update_entries(
    stage_root: Path,
    host_records: tuple[FileRecord, ...],
    extension_records: tuple[FileRecord, ...],
    metadata_hashes: dict[str, str],
) -> tuple[ManifestEntry, ...]:
    entries = [
        ManifestEntry(
            path=f"host/{record.path}",
            ownership=(OwnershipClass.WHOLE_PRODUCT_DIRECTORY
                       if record.path.startswith("_internal/")
                       else OwnershipClass.HOST_PRODUCT_FILE),
            sha256=record.sha256,
        )
        for record in host_records
    ]
    entries.extend(
        ManifestEntry(
            path=f"extension/{record.path}",
            ownership=OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
            sha256=record.sha256,
        )
        for record in extension_records
    )
    entries.append(ManifestEntry(
        path="host/config.json",
        ownership=OwnershipClass.SEED_ONLY,
        sha256=sha256_file(stage_root / "host" / "config.json"),
    ))
    entries.extend(
        ManifestEntry(path=path, ownership=OwnershipClass.PACKAGED_METADATA, sha256=digest)
        for path, digest in metadata_hashes.items()
    )
    entries.extend(
        ManifestEntry(
            path=path,
            ownership=OwnershipClass.PACKAGE_ONLY,
            sha256=sha256_file(stage_root.joinpath(*path.split("/"))),
        )
        for path in SERIALIZED_PACKAGE_ONLY_PATHS
    )
    result = tuple(sorted(entries))
    _require_unique_paths(entry.path for entry in result)
    _require_package_ownership_paths(result)
    return result


def _require_product_bijection(
    manifest: UpdateManifest,
    integrity: ReleaseIntegrity,
) -> None:
    update_host = {
        (entry.path.removeprefix("host/"), entry.sha256)
        for entry in manifest.entries
        if entry.ownership in PRODUCT_OWNERSHIP_CLASSES and entry.path.startswith("host/")
    }
    update_extension = {
        (entry.path.removeprefix("extension/"), entry.sha256)
        for entry in manifest.entries
        if entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
        and entry.path.startswith("extension/")
    }
    if update_host != {(record.path, record.sha256) for record in integrity.host_files}:
        raise ManifestError("Host product inventory mismatch")
    if update_extension != {(record.path, record.sha256) for record in integrity.extension_files}:
        raise ManifestError("Extension product inventory mismatch")


def _write_sibling_replace(path: Path, payload: bytes) -> None:
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with temporary.open("xb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _require_document_links(
    documents: ReleaseDocuments,
    payloads: dict[Path, bytes],
) -> None:
    integrity_bytes = payloads[next(
        path for path in payloads if path.name == "release-integrity.json"
    )]
    installed_bytes = payloads[next(
        path for path in payloads if path.name == "installed-product.json"
    )]
    metadata = {
        entry.path: entry.sha256
        for entry in documents.update_manifest.entries
        if entry.ownership is OwnershipClass.PACKAGED_METADATA
    }
    if documents.installed_product.release_integrity_sha256 != sha256_bytes(integrity_bytes):
        raise ManifestError("installed metadata link mismatch")
    if metadata != {
        "host/release-integrity.json": sha256_bytes(integrity_bytes),
        "host/installed-product.json": sha256_bytes(installed_bytes),
    }:
        raise ManifestError("package metadata link mismatch")
    if not (
        documents.update_manifest.package_version
        == documents.release_integrity.package_version
        == documents.installed_product.package_version
    ):
        raise ManifestError("metadata version mismatch")
    if not (
        documents.update_manifest.required_capabilities
        == documents.release_integrity.required_capabilities
        == documents.installed_product.required_capabilities
    ) or not (
        documents.update_manifest.provided_capabilities
        == documents.release_integrity.provided_capabilities
        == documents.installed_product.provided_capabilities
    ):
        raise ManifestError("metadata capability mismatch")
    _require_product_bijection(documents.update_manifest, documents.release_integrity)
```

Use this Chrome boundary; unlike generated DH documents, the Chrome manifest may contain unrelated keys and need not use DH canonical formatting:

```python
def _read_chrome_manifest(path: Path) -> tuple[str, str | None]:
    try:
        value = json.loads(
            path.read_bytes().decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ManifestError("invalid Chrome manifest") from error
    if type(value) is not dict:
        raise ManifestError("invalid Chrome manifest")
    version = _require_string(value.get("version"))
    version_name = value.get("version_name")
    if version_name is not None:
        version_name = _require_string(version_name)
    return version, version_name
```

Because `_reject_duplicate_pairs` raises `ManifestError`, allow that exception to propagate unchanged rather than wrapping it; the `except` tuple handles only OS/decode/JSON syntax failures.

- [ ] **Step 6: Run GREEN and restored ownership mutation**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task2-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_product_info host.test_package_manifest -v
```

Expected: PASS. Run three restored mutations: temporarily add `"host/_internal"` to `FORBIDDEN_PACKAGED_HOST_PATHS` and run `ReleaseDocumentGenerationTests.test_valid_stage_requires_and_accepts_internal_whole_product_directory`; temporarily include `installed-product.json` in `ReleaseIntegrity.host_files`; then separately change only the update-manifest SHA-256 paired with `host/system_prompt.md`. The named `_internal` guard or `ReleaseDocumentGenerationTests.test_generated_documents_have_exact_ownership_and_hash_links` must fail for its mutation. Restore each change and rerun to PASS.

- [ ] **Step 7: Commit the manifest boundary**

```powershell
git add host/package_manifest.py host/test_package_manifest.py
git commit -m "feat(release): define package ownership manifests"
```

### Task 3: Pure Deterministic Release Staging

**Files:**
- Create: `host/package_archive.py`
- Create: `host/test_package_archive.py`
- Modify: `release_helper.py:9-19,184-243,413-417`
- Create: `host/test_release_helper.py`

**Interfaces:**
- Consumes: strict manifest loaders/models/hash helpers, `generate_release_documents(...)`, and `write_release_documents(...)`
- Produces: `PackageValidationError`, `ValidatedPackage`, `validate_staged_package(stage_root: Path, *, expected_version: str | None = None)`, `write_deterministic_archive`; `stage_release(source_root: Path, stage_root: Path, version: str) -> Path`; `create_zip(version: str, *, source_root: Path | None = None, output_dir: Path | None = None) -> str`
- Leaves for Task 4: `stage_and_validate_archive(...)` manual hostile-archive extraction

- [ ] **Step 1: Write failing staged-package and deterministic ZIP tests**

Create `host/test_package_archive.py` with exact classes `StagedPackageValidationTests`, `DeterministicArchiveWriterTests`, and, in Task 4, `HostileArchiveTests`. Use a local synthetic-stage helper. Generate/write valid documents, then table-drive one fresh stage per mutation:

```python
mutations = (
    ("missing", "package_file_missing", lambda p: (p / "extension/assets/app.js").unlink()),
    ("extra-extension", "package_file_unmanifested", lambda p: (p / "extension/extra.js").write_bytes(b"x")),
    ("extra-internal", "package_file_unmanifested", lambda p: (p / "host/_internal/extra.dll").write_bytes(b"x")),
    ("extra-package-root", "package_file_unmanifested", lambda p: (p / "surprise.txt").write_bytes(b"x")),
    ("content-hash", "package_hash_mismatch", lambda p: (p / "host/system_prompt.md").write_bytes(b"changed")),
    ("malformed-integrity-json", "package_manifest_invalid", lambda p: (p / "host/release-integrity.json").write_bytes(b"{\n")),
    ("relinked-metadata-product-mismatch", "package_metadata_mismatch", self._relink_metadata_with_wrong_product_hash),
)
```

Implement the relink mutation in the test, using only frozen public models/serializers, exactly as follows:

```python
def _relink_metadata_with_wrong_product_hash(self, stage: Path) -> None:
    integrity = load_release_integrity(stage / "host/release-integrity.json")
    changed_integrity = replace(
        integrity,
        host_files=tuple(
            replace(record, sha256="0" * 64)
            if record.path == "system_prompt.md" else record
            for record in integrity.host_files
        ),
    )
    integrity_bytes = canonical_json_bytes(release_integrity_to_dict(changed_integrity))

    installed = load_installed_product(stage / "host/installed-product.json")
    changed_installed = replace(
        installed,
        release_integrity_sha256=sha256_bytes(integrity_bytes),
    )
    installed_bytes = canonical_json_bytes(installed_product_to_dict(changed_installed))

    manifest = load_update_manifest(stage / "update-manifest.json")
    metadata_hashes = {
        "host/release-integrity.json": sha256_bytes(integrity_bytes),
        "host/installed-product.json": sha256_bytes(installed_bytes),
    }
    changed_manifest = replace(
        manifest,
        entries=tuple(
            replace(entry, sha256=metadata_hashes[entry.path])
            if entry.path in metadata_hashes else entry
            for entry in manifest.entries
        ),
    )

    (stage / "host/release-integrity.json").write_bytes(integrity_bytes)
    (stage / "host/installed-product.json").write_bytes(installed_bytes)
    (stage / "update-manifest.json").write_bytes(
        canonical_json_bytes(update_manifest_to_dict(changed_manifest))
    )
```

Define `mutations` inside `StagedPackageValidationTests.test_staged_mutation_table`, where `self._relink_metadata_with_wrong_product_hash` is bound. The mutation leaves the physical `host/system_prompt.md` and its update-manifest product entry unchanged, but rewrites `ReleaseIntegrity`, relinks `InstalledProduct.release_integrity_sha256`, and refreshes both external metadata hashes in `UpdateManifest`. Thus all three JSON documents remain canonical and all metadata hash links are valid; only the product `(path, sha256)` bijection disagrees. For each table row create a fresh stage, invoke the callable, and assert `validate_staged_package` raises `PackageValidationError` with the exact code. A valid stage returns resolved `stage_root` and all three parsed models. Add a test proving a manifest declaring `transactional-update-v1` fails `package_metadata_mismatch`.

Add this deterministic writer test:

```python
def test_deterministic_archive_bytes_and_metadata(self):
    first = self.root / "first.zip"
    second = self.root / "second.zip"
    write_deterministic_archive(self.stage, first)
    os.utime(self.stage / "host/system_prompt.md", (1_900_000_000, 1_900_000_000))
    write_deterministic_archive(self.stage, second)
    self.assertEqual(first.read_bytes(), second.read_bytes())
    with zipfile.ZipFile(first) as zf:
        self.assertEqual(zf.namelist(), sorted(zf.namelist()))
        for info in zf.infolist():
            self.assertEqual(info.date_time, (1980, 1, 1, 0, 0, 0))
            self.assertEqual(info.create_system, 3)
            self.assertEqual(info.external_attr >> 16, 0o100644)

def test_deterministic_archive_contains_no_directory_entries(self):
    archive = self.root / "files-only.zip"
    write_deterministic_archive(self.stage, archive)
    with zipfile.ZipFile(archive) as package:
        self.assertTrue(package.infolist())
        self.assertTrue(all(not info.is_dir() for info in package.infolist()))
        self.assertTrue(all(not info.filename.endswith("/") for info in package.infolist()))

def test_staged_non_file_walker_failure_is_typed(self):
    with patch(
        "package_archive._walk_regular_relative_paths",
        side_effect=ManifestError("unsupported filesystem entry"),
    ):
        with self.assertRaises(PackageValidationError) as captured:
            validate_staged_package(self.stage)
    self.assertEqual(captured.exception.error_code, "unsupported_archive_entry")

def test_expected_target_rejects_non_string_and_empty_values(self):
    for value in ("", 7, True, [], {}):
        with self.subTest(value=value):
            with self.assertRaises(PackageValidationError) as captured:
                validate_staged_package(self.stage, expected_version=value)
            self.assertEqual(captured.exception.error_code, "package_metadata_mismatch")
```

- [ ] **Step 2: Write failing release-helper and historical-bootstrap tests**

Create `host/test_release_helper.py` with exact class `TestReleaseStaging`. Construct synthetic source roots containing `extension/dist`, `dist/dh_native_host`, `host/config.json`, `host/system_prompt.md`, `host/register.py`, `installer_core.ps1`, and `install.bat`; never use repository build output.

```python
def test_stage_release_is_complete_and_does_not_touch_source(self):
    before = self._snapshot(self.source)
    result = release_helper.stage_release(self.source, self.stage, "2.0.74-beta.4")
    self.assertEqual(result, self.stage)
    self.assertEqual(before, self._snapshot(self.source))
    self.assertEqual(set(self._relative_files(self.stage)), {
        "extension/manifest.json", "extension/assets/app.js",
        "host/dh_native_host.exe", "host/_internal/python313.dll",
        "host/config.json", "host/system_prompt.md", "host/register.py",
        "host/release-integrity.json", "host/installed-product.json",
        "installer_core.ps1", "install.bat", "update-manifest.json",
    })

def test_stage_release_rejects_empty_unmanifested_source_directory(self):
    (self.source / "extension" / "dist" / "empty").mkdir()
    with self.assertRaises(ManifestError):
        release_helper.stage_release(self.source, self.stage, "2.0.74-beta.4")
    self.assertFalse(self.stage.exists())

def test_stage_release_rejects_preexisting_destination_without_mutation(self):
    self.stage.mkdir()
    sentinel = self.stage / "sentinel.txt"
    sentinel.write_bytes(b"keep")
    with self.assertRaises(FileExistsError):
        release_helper.stage_release(self.source, self.stage, "2.0.74-beta.4")
    self.assertEqual(sentinel.read_bytes(), b"keep")

def test_create_zip_is_deterministic_through_public_helper(self):
    output = self.root / "out"
    first_path = Path(release_helper.create_zip(
        "2.0.74-beta.4", source_root=self.source, output_dir=output
    ))
    first_bytes = first_path.read_bytes()
    os.utime(
        self.source / "host" / "system_prompt.md",
        (1_900_000_000, 1_900_000_000),
    )
    second_path = Path(release_helper.create_zip(
        "2.0.74-beta.4", source_root=self.source, output_dir=output
    ))
    self.assertEqual(first_path, second_path)
    self.assertEqual(first_bytes, second_path.read_bytes())

def _build_fresh_target_stage(self, target: str) -> tuple[Path, str]:
    self.assertNotEqual(target, VERSION)
    shutil.copy2(Path("release_helper.py"), self.source / "release_helper.py")
    for name in ("product_info.py", "package_manifest.py", "package_archive.py"):
        shutil.copy2(Path("host") / name, self.source / "host" / name)
    (self.source / "extension" / "package.json").write_text(
        '{"version":"2.0.74-beta.4"}\n', encoding="utf-8"
    )
    script = r'''
import json
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
target = sys.argv[2]
import release_helper

for name in ("product_info", "package_manifest", "package_archive"):
    if name in sys.modules:
        raise AssertionError(f"stale package import before version edit: {name}")

release_helper.update_json_version(root / "extension" / "package.json", target)
release_helper.update_chrome_manifest_version(root / "extension" / "manifest.json", target)
release_helper.update_chrome_manifest_version(root / "extension" / "dist" / "manifest.json", target)
release_helper.update_python_version(root / "host" / "product_info.py", target)
release_helper.stage_release(root, root / "fresh-stage", target)
'''
    env = os.environ.copy()
    child_root = self.root / "fresh-process-profile"
    env.update({
        "LOCALAPPDATA": str(child_root / "local"),
        "APPDATA": str(child_root / "roaming"),
        "USERPROFILE": str(child_root / "profile"),
        "HOME": str(child_root / "profile"),
        "TEMP": str(child_root / "temp"),
        "TMP": str(child_root / "tmp"),
    })
    env.pop("PYTHONPATH", None)
    for key in ("LOCALAPPDATA", "APPDATA", "USERPROFILE", "TEMP", "TMP"):
        Path(env[key]).mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        [sys.executable, "-c", script, str(self.source), target],
        cwd=self.source,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    self.assertEqual(completed.returncode, 0, completed.stderr)
    stage = self.source / "fresh-stage"
    for relative in (
        "update-manifest.json",
        "host/release-integrity.json",
        "host/installed-product.json",
    ):
        self.assertEqual(
            json.loads((stage / relative).read_text(encoding="utf-8"))["package_version"],
            target,
        )
    return stage, target

def test_fresh_process_version_edit_precedes_package_imports(self):
    stage, target = self._build_fresh_target_stage("9.9.9-beta.7")
    self.assertTrue(stage.is_dir())
    self.assertNotEqual(target, VERSION)

def test_running_n_accepts_internally_consistent_n_plus_one_with_expected_target(self):
    stage, target = self._build_fresh_target_stage("9.9.9-beta.7")
    self.assertNotEqual(VERSION, target)
    validated = validate_staged_package(stage, expected_version=target)
    self.assertEqual(validated.manifest.package_version, target)
    self.assertEqual(validated.release_integrity.package_version, target)
    self.assertEqual(validated.installed_product.package_version, target)

def test_running_n_accepts_internally_consistent_n_plus_one_without_expected_target(self):
    stage, target = self._build_fresh_target_stage("9.9.9-beta.7")
    self.assertNotEqual(VERSION, target)
    self.assertEqual(validate_staged_package(stage).manifest.package_version, target)

def test_wrong_selected_target_rejects_internally_consistent_package(self):
    stage, target = self._build_fresh_target_stage("9.9.9-beta.7")
    self.assertNotEqual(VERSION, target)
    with self.assertRaises(PackageValidationError) as captured:
        validate_staged_package(stage, expected_version="9.9.9-beta.8")
    self.assertEqual(captured.exception.error_code, "package_metadata_mismatch")

def _run_release_helper_path_case(self, pythonpath: str | None, stage_name: str) -> None:
    shutil.copy2(Path("release_helper.py"), self.source / "release_helper.py")
    for name in ("product_info.py", "package_manifest.py", "package_archive.py"):
        shutil.copy2(Path("host") / name, self.source / "host" / name)
    script = r'''
import os
import pathlib
import sys
import release_helper

root = pathlib.Path(".").resolve()
canonical = (root / "host").resolve()
resolved = [pathlib.Path(entry or os.curdir).resolve() for entry in sys.path]
assert resolved[0] == canonical, resolved
assert resolved.count(canonical) == 1, resolved
release_helper.stage_release(root, root / sys.argv[1], "2.0.74-beta.4")
'''
    env = os.environ.copy()
    if pythonpath is None:
        env.pop("PYTHONPATH", None)
    else:
        env["PYTHONPATH"] = pythonpath
    child_root = self.root / "clean-process-profile"
    env.update({
        "LOCALAPPDATA": str(child_root / "local"),
        "APPDATA": str(child_root / "roaming"),
        "USERPROFILE": str(child_root / "profile"),
        "HOME": str(child_root / "profile"),
        "TEMP": str(child_root / "temp"),
        "TMP": str(child_root / "tmp"),
    })
    for key in ("LOCALAPPDATA", "APPDATA", "USERPROFILE", "TEMP", "TMP"):
        Path(env[key]).mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        [sys.executable, "-c", script, stage_name],
        cwd=self.source,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    self.assertEqual(completed.returncode, 0, completed.stderr)
    self.assertTrue((self.source / stage_name / "update-manifest.json").is_file())

def test_clean_environment_subprocess_stages_without_pythonpath(self):
    self._run_release_helper_path_case(None, "clean-stage")

def test_pythonpath_host_is_deduplicated_and_stages(self):
    host = str((self.source / "host").resolve())
    self._run_release_helper_path_case(
        os.pathsep.join((host, "host", host)),
        "pythonpath-stage",
    )

def test_release_helper_bootstrap_does_not_import_host_modules(self):
    for name in ("product_info", "package_manifest", "package_archive"):
        sys.modules.pop(name, None)
    module = importlib.util.module_from_spec(
        importlib.util.spec_from_file_location("isolated_release_helper", Path("release_helper.py"))
    )
    module.__spec__.loader.exec_module(module)
    for name in ("product_info", "package_manifest", "package_archive"):
        self.assertNotIn(name, sys.modules)
    canonical = Path("host").resolve()
    resolved = [Path(entry or os.curdir).resolve() for entry in sys.path]
    self.assertEqual(resolved[0], canonical)
    self.assertEqual(resolved.count(canonical), 1)

def test_historical_updater_bootstraps_both_metadata_files(self):
    release_helper.stage_release(self.source, self.stage, "2.0.74-beta.4")
    archive = self.root / "release.zip"
    write_deterministic_archive(self.stage, archive)
    install = self.root / "installed"
    install.mkdir()
    updater = Updater(install / "dh_native_host.exe")
    updater.extension_dir = install / "extension"
    original_overwrite = updater._overwrite_directory
    with (
        patch.object(
            updater,
            "_swap_host_binary",
            side_effect=lambda src: shutil.copy2(src, updater.current_exe),
        ),
        patch.object(updater, "_overwrite_directory", wraps=original_overwrite) as overwrite,
    ):
        updater.apply_update(archive)
    self.assertTrue(any(
        Path(call.args[0]).name == "_internal" for call in overwrite.call_args_list
    ))
    self.assertEqual(
        sha256_file(install / "release-integrity.json"),
        load_installed_product(install / "installed-product.json").release_integrity_sha256,
    )
    self.assertFalse((install / "update-manifest.json").exists())

def test_historical_bootstrap_pair_is_target_internal_not_running_version(self):
    stage, target = self._build_fresh_target_stage("9.9.9-beta.7")
    self.assertNotEqual(VERSION, target)
    validated = validate_staged_package(stage)
    self.assertEqual(validated.release_integrity.package_version, target)
    self.assertEqual(validated.installed_product.package_version, target)
    self.assertEqual(
        validated.installed_product.release_integrity_sha256,
        sha256_file(stage / "host" / "release-integrity.json"),
    )
```

This exercises unmodified `Updater.apply_update`; only running-executable swap semantics are injected. Historical bootstrap correctness is internal to the selected target package: the old running Host version is irrelevant, the generated `ReleaseIntegrity`/`InstalledProduct` pair must agree on the N+1 target, and the installed-product digest must link that target integrity document. Add one row per missing required source and assert no stage is created. The explicit sentinel test above locks pre-existing destination preservation.

- [ ] **Step 3: Run Task 3 tests to verify RED**

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task3-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_package_archive host.test_release_helper -v
```

Expected: FAIL with missing `package_archive` and/or missing `release_helper.stage_release`.

- [ ] **Step 4: Implement staged validation and deterministic ZIP writing**

Implement `validate_staged_package` in this exact order so failures are stable and each physical entry is hashed once. It imports no `VERSION` or product-capability constants; generic validation uses only parsed documents plus the optional caller-supplied target:

```python
def validate_staged_package(
    stage_root: Path,
    *,
    expected_version: str | None = None,
) -> ValidatedPackage:
    root = stage_root.resolve(strict=True)
    try:
        manifest = load_update_manifest(root / UPDATE_MANIFEST_PATH)
        integrity_path = root / "host" / "release-integrity.json"
        installed_path = root / "host" / "installed-product.json"
        integrity = load_release_integrity(integrity_path)
        installed = load_installed_product(installed_path)
        integrity_bytes = canonical_json_bytes(release_integrity_to_dict(integrity))
        if sha256_bytes(integrity_bytes) != installed.release_integrity_sha256:
            raise PackageValidationError("package_metadata_mismatch")
    except (ManifestError, OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PackageValidationError("package_manifest_invalid") from error
    if not (
        manifest.package_version == integrity.package_version == installed.package_version
        and manifest.required_capabilities == integrity.required_capabilities == installed.required_capabilities
        and manifest.provided_capabilities == integrity.provided_capabilities == installed.provided_capabilities
        and manifest.chrome_version == integrity.chrome_version
        and manifest.chrome_version_name == integrity.chrome_version_name
    ):
        raise PackageValidationError("package_metadata_mismatch")
    if expected_version is not None:
        if type(expected_version) is not str or not expected_version:
            raise PackageValidationError("package_metadata_mismatch")
        if manifest.package_version != expected_version:
            raise PackageValidationError("package_metadata_mismatch")

    try:
        actual_paths = set(_walk_regular_relative_paths(root))
    except (ManifestError, OSError) as error:
        raise PackageValidationError("unsupported_archive_entry") from error
    expected_paths = {entry.path for entry in manifest.entries} | {UPDATE_MANIFEST_PATH}
    missing = expected_paths - actual_paths
    extra = actual_paths - expected_paths
    if missing:
        raise PackageValidationError("package_file_missing")
    if extra:
        raise PackageValidationError("package_file_unmanifested")

    actual_hashes: dict[str, str] = {}
    for entry in manifest.entries:
        if entry.path == "host/release-integrity.json":
            actual_hashes[entry.path] = installed.release_integrity_sha256
        else:
            actual_hashes[entry.path] = sha256_file(root.joinpath(*entry.path.split("/")))
    metadata_hashes = {
        entry.path: entry.sha256
        for entry in manifest.entries
        if entry.ownership is OwnershipClass.PACKAGED_METADATA
    }
    if metadata_hashes != {
        "host/release-integrity.json": actual_hashes["host/release-integrity.json"],
        "host/installed-product.json": actual_hashes["host/installed-product.json"],
    }:
        raise PackageValidationError("package_metadata_mismatch")
    try:
        _require_product_bijection(manifest, integrity)
    except ManifestError as error:
        raise PackageValidationError("package_metadata_mismatch") from error
    for entry in manifest.entries:
        if actual_hashes[entry.path] != entry.sha256:
            raise PackageValidationError("package_hash_mismatch")
    return ValidatedPackage(
        stage_root=root,
        manifest=manifest,
        release_integrity=integrity,
        installed_product=installed,
    )
```

The implicit `UPDATE_MANIFEST_PATH` is strict-canonical-loaded but intentionally not hashed against itself. `_walk_regular_relative_paths(root)` rejects empty explicit source directories, symlinks, FIFOs, and reparse points before the hash pass.

Implement `write_deterministic_archive` with this concrete files-only body; `_iter_stage_files` is defined immediately below and returns `(normalized_path, absolute_path)` pairs:

```python
def write_deterministic_archive(stage_root: Path, archive_path: Path) -> None:
    validated = validate_staged_package(stage_root)
    files = tuple(sorted(_iter_stage_files(validated.stage_root), key=lambda item: item[0]))
    temporary = archive_path.with_name(f".{archive_path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with zipfile.ZipFile(
            temporary,
            "w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as output:
            for logical_path, source in files:
                info = zipfile.ZipInfo(logical_path, date_time=(1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                output.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        os.replace(temporary, archive_path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _iter_stage_files(stage_root: Path) -> tuple[tuple[str, Path], ...]:
    return tuple(
        (relative, stage_root.joinpath(*relative.split("/")))
        for relative in _walk_regular_relative_paths(stage_root)
    )
```

It emits no directory entries. Do not add `stage_and_validate_archive` yet.

- [ ] **Step 5: Refactor release staging and `create_zip`**

Use `Path(__file__).resolve().parent`, not `os.getcwd()`, for repository defaults/import bootstrapping. Implement `stage_release` with this flow:

```python
def stage_release(source_root: Path, stage_root: Path, version: str) -> Path:
    from package_archive import validate_staged_package
    from package_manifest import generate_release_documents, write_release_documents

    source_root = source_root.resolve(strict=True)
    required = (
        source_root / "extension" / "dist",
        source_root / "dist" / "dh_native_host",
        source_root / "host" / "config.json",
        source_root / "host" / "system_prompt.md",
        source_root / "host" / "register.py",
        source_root / "installer_core.ps1",
        source_root / "install.bat",
    )
    for path in required:
        if not path.exists():
            raise FileNotFoundError(path)
    if stage_root.exists():
        raise FileExistsError(stage_root)
    temporary = stage_root.with_name(f".{stage_root.name}.{uuid.uuid4().hex}.tmp")
    try:
        shutil.copytree(required[0], temporary / "extension")
        shutil.copytree(required[1], temporary / "host")
        for source in required[2:5]:
            shutil.copy2(source, temporary / "host" / source.name)
        for source in required[5:]:
            shutil.copy2(source, temporary / source.name)
        documents = generate_release_documents(temporary, version)
        write_release_documents(temporary, documents)
        validate_staged_package(temporary, expected_version=version)
        os.replace(temporary, stage_root)
        return stage_root
    except Exception:
        shutil.rmtree(temporary, ignore_errors=True)
        raise
```

This is isolated staging, not a claim that the later live multi-path update is atomic.

Implement `create_zip` as:

```python
def create_zip(
    version: str,
    *,
    source_root: Path | None = None,
    output_dir: Path | None = None,
) -> str:
    from package_archive import write_deterministic_archive

    source = (source_root or Path(__file__).resolve().parent).resolve(strict=True)
    output = (output_dir or source / "releases").resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"DynamicsHelper_v{version}.zip"
    stage = output / f".DynamicsHelper_v{version}.{uuid.uuid4().hex}.stage"
    try:
        stage_release(source, stage, version)
        write_deterministic_archive(stage, archive)
        return str(archive)
    finally:
        shutil.rmtree(stage, ignore_errors=True)
```

Preserve `create_zip(args.version)` compatibility; remove `shutil.make_archive` and shared `releases/temp_stage`. The public-helper test above proves output equality across source-mtime changes. `release_helper.py` must not import `product_info`, `package_manifest`, or `package_archive` at module import time. Immediately after defining `HOST_DIR`, canonicalize every current `sys.path` entry, remove every occurrence resolving to `HOST_DIR` (including relative `host`, duplicate absolute spellings, and environment-provided entries), then insert one canonical absolute string at index 0:

```python
_HOST_IMPORT_PATH = HOST_DIR.resolve()
sys.path[:] = [
    entry
    for entry in sys.path
    if Path(entry or os.curdir).resolve() != _HOST_IMPORT_PATH
]
sys.path.insert(0, str(_HOST_IMPORT_PATH))
```

This bootstrap changes only module resolution; it imports no Host module before version edits. After it runs, resolving `sys.path[0]` equals `HOST_DIR`, and exactly one resolved `HOST_DIR` occurrence exists. The clean-env and `PYTHONPATH=host` subprocess tests both perform pure staging and assert those invariants. The shown function bodies keep actual package imports local:

```python
from package_archive import validate_staged_package
from package_manifest import generate_release_documents, write_release_documents
```

In the real CLI flow, `main()` performs all three version edits before build/staging calls either function, so those local imports observe the edited `host/product_info.py`. The fresh-process test uses a non-baseline target and fails if any package module is imported before the edits.

- [ ] **Step 6: Run GREEN and restored bootstrap mutation**

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task3-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_package_manifest host.test_package_archive host.test_release_helper -v
```

Expected: PASS. Temporarily omit `installed-product.json` during document writing, rerun the historical-bootstrap test, observe FAIL, restore, and rerun to PASS.

- [ ] **Step 7: Commit deterministic release staging**

```powershell
git add host/package_archive.py host/test_package_archive.py release_helper.py host/test_release_helper.py
git commit -m "feat(release): stage deterministic integrity packages"
```

### Task 4: Hostile Archive Validation

**Files:**
- Modify: `host/package_archive.py`
- Modify: `host/test_package_archive.py`

**Interfaces:**
- Consumes: Task 3 `validate_staged_package(..., expected_version=...)` and strict path/manifest helpers
- Produces: `stage_and_validate_archive(archive_path: Path, stage_root: Path, *, expected_version: str | None = None) -> ValidatedPackage`, completing the frozen `package_archive.py` interface

- [ ] **Step 1: Write the failing hostile ZIP table**

Build ZIPs manually with `ZipFile.writestr`; start each case from valid package entries and inject/replace:

```python
cases = (
    ("parent", "../escape.txt", 0o100644, "invalid_package_path"),
    ("absolute", "/escape.txt", 0o100644, "invalid_package_path"),
    ("drive", "C:/escape.txt", 0o100644, "invalid_package_path"),
    ("backslash", r"host\escape.txt", 0o100644, "invalid_package_path"),
    ("duplicate", "host/system_prompt.md", 0o100644, "duplicate_package_path"),
    ("case-collision", "extension/assets/APP.js", 0o100644, "duplicate_package_path"),
    ("symlink", "host/link", 0o120777, "unsupported_archive_entry"),
    ("fifo", "host/pipe", 0o010644, "unsupported_archive_entry"),
    ("expected-directory-marker", "host/_internal/", 0o040755, "unsupported_archive_entry"),
    ("extra-directory-marker", "surprise/", 0o040755, "unsupported_archive_entry"),
    ("alternate-data-stream", "extension/assets/app.js:secret", 0o100644, "invalid_package_path"),
    ("trailing-dot", "extension/assets/app.js.", 0o100644, "invalid_package_path"),
    ("trailing-space", "extension/assets/app.js ", 0o100644, "invalid_package_path"),
    ("reserved-device", "extension/assets/CON.txt", 0o100644, "invalid_package_path"),
    ("unix-mode-zero", "host/mode-zero.bin", 0, "unsupported_archive_entry"),
)
```

Define `cases` inside `HostileArchiveTests.test_hostile_archive_table`; for each row build a fresh archive and absent stage destination.

Add selected-target propagation tests with a canonical archive containing an internally consistent N+1 package:

```python
def test_archive_staging_accepts_selected_n_plus_one_target(self):
    archive, target = self._build_target_archive("9.9.9-beta.7")
    validated = stage_and_validate_archive(
        archive,
        self.root / "accepted-stage",
        expected_version=target,
    )
    self.assertEqual(validated.manifest.package_version, target)

def test_archive_staging_rejects_wrong_selected_target(self):
    archive, _target = self._build_target_archive("9.9.9-beta.7")
    with self.assertRaises(PackageValidationError) as captured:
        stage_and_validate_archive(
            archive,
            self.root / "rejected-stage",
            expected_version="9.9.9-beta.8",
        )
    self.assertEqual(captured.exception.error_code, "package_metadata_mismatch")

def test_deterministic_archive_round_trips_through_strict_archive_validation(self):
    archive = self.root / "round-trip.zip"
    extracted = self.root / "round-trip-stage"
    write_deterministic_archive(self.stage, archive)
    validated = stage_and_validate_archive(
        archive,
        extracted,
        expected_version="2.0.74-beta.4",
    )
    self.assertEqual(validated.manifest.package_version, "2.0.74-beta.4")
    with zipfile.ZipFile(archive) as package:
        for info in package.infolist():
            self.assertEqual(info.create_system, 3)
            self.assertTrue(stat.S_ISREG((info.external_attr >> 16) & 0xFFFF))

def test_unix_mode_zero_is_rejected_before_open(self):
    archive = self._archive_with_single_extra("host/mode-zero.bin", create_system=3)
    self._patch_central_external_attr(archive, "host/mode-zero.bin", 0)
    with zipfile.ZipFile(archive) as package:
        target = next(info for info in package.infolist() if info.filename == "host/mode-zero.bin")
        self.assertEqual((target.external_attr >> 16) & 0xFFFF, 0)
    with patch("zipfile.ZipFile.open", side_effect=AssertionError("opened")) as opened:
        with self.assertRaises(PackageValidationError) as captured:
            stage_and_validate_archive(archive, self.root / "mode-zero-stage")
    self.assertEqual(captured.exception.error_code, "unsupported_archive_entry")
    opened.assert_not_called()

def test_dos_regular_entry_is_not_rejected_as_unsupported_type(self):
    archive = self._archive_with_single_extra(
        "surprise.txt", create_system=0, external_attr=0
    )
    with self.assertRaises(PackageValidationError) as captured:
        stage_and_validate_archive(archive, self.root / "dos-file-stage")
    self.assertEqual(captured.exception.error_code, "package_file_unmanifested")

def test_dos_directory_attribute_is_rejected(self):
    archive = self._archive_with_single_extra(
        "surprise", create_system=0, external_attr=0x10
    )
    with self.assertRaises(PackageValidationError) as captured:
        stage_and_validate_archive(archive, self.root / "dos-directory-stage")
    self.assertEqual(captured.exception.error_code, "unsupported_archive_entry")
```

`_build_target_archive` uses the fresh-process release fixture, not the running N module cache. In updater integration, normalize the update selection's target to a non-empty exact version string before download/staging, then call `stage_and_validate_archive(archive_path, stage_root, expected_version=selection.version)`. The selected target may be N+1 while the caller is Host N; never substitute running `VERSION`. If a manual/offline caller has no trusted selected target, it explicitly passes/uses `None` and relies on cross-document consistency plus later installed probe validation.

Set Unix test entries to `create_system=3` and `external_attr=mode << 16`. Add exact and case-folded file/ancestor collisions in both insertion orders, for example `extension/ASSETS` as a file followed by `extension/assets/app.js`, and the reverse order; both are `unsupported_archive_entry` before extraction. Add missing/malformed manifest, missing/unmanifested file, and hash mismatch cases. Reject `ZipInfo.is_dir()`, any name ending `/`, Unix `S_IFDIR`, and the DOS directory attribute as `unsupported_archive_entry`; do not strip or normalize a directory marker into a tolerated path. For Unix-created entries, mode zero is unknown and fails closed; only `stat.S_ISREG(mode)` is accepted, while directory/symlink/FIFO/device/socket/unknown modes are rejected. Python's `writestr` supplies a default mode when `external_attr` is zero, so the mode-zero regression writes a normal ZIP first and then patches the target central-directory external-attributes field to zero; reopening the ZIP must show mode zero before validation. For DOS/Windows-created entries (`create_system != 3`), do not interpret upper Unix mode bits; accept ordinary non-directory files when `ZipInfo.is_dir()` is false, the filename has no trailing `/`, and DOS attribute bit `0x10` is clear. Add one DOS fixture with `create_system=0`, `external_attr=0`, and a normal file name that reaches later manifest validation rather than `unsupported_archive_entry`; add a DOS directory-bit fixture that is rejected. `normalize_package_path` rejects ADS colons, components ending dot/space, and case-insensitive DOS device basenames (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`) before the temporary extraction directory is created.

Define `_patch_central_external_attr` by walking central-directory headers (`b"PK\x01\x02"`), reading filename/extra/comment lengths at offsets 28/30/32, matching the decoded filename, and writing the 32-bit external attribute at offset 38 with `struct.pack_into("<I", data, central_offset + 38, value)`. Assert exactly one matching record is patched.

Build the encrypted-entry fixture in two phases because `zipfile.writestr()` clears encryption flags. First write an ordinary one-file stored ZIP (`ZIP_STORED`) and close it. Then patch bit 0 in both required headers with this helper:

```python
def _set_encrypted_header_bits(path: Path) -> None:
    data = bytearray(path.read_bytes())
    local_offset = data.find(b"PK\x03\x04")
    central_offset = data.find(b"PK\x01\x02")
    if local_offset < 0 or central_offset < 0:
        raise AssertionError("ZIP headers missing")
    local_flags = struct.unpack_from("<H", data, local_offset + 6)[0]
    central_flags = struct.unpack_from("<H", data, central_offset + 8)[0]
    struct.pack_into("<H", data, local_offset + 6, local_flags | 0x0001)
    struct.pack_into("<H", data, central_offset + 8, central_flags | 0x0001)
    path.write_bytes(data)
```

Reopen with `ZipFile`, assert `infolist()[0].flag_bits & 1 == 1`, patch `ZipFile.open` with `wraps` or a failing sentinel, then assert staging rejects the archive as `unsupported_archive_entry` and the open sentinel is not invoked. This fixture tests metadata preflight only and does not claim to contain encrypted payload bytes.

Implement preflight with this concrete body:

```python
def _preflight_zip_infos(
    infos: list[zipfile.ZipInfo],
) -> tuple[tuple[str, zipfile.ZipInfo], ...]:
    records: list[tuple[str, zipfile.ZipInfo]] = []
    exact: set[str] = set()
    folded: set[str] = set()
    files_folded: set[str] = set()
    for info in infos:
        if info.flag_bits & 0x0001:
            raise PackageValidationError("unsupported_archive_entry")
        if info.is_dir() or info.filename.endswith("/"):
            raise PackageValidationError("unsupported_archive_entry")
        if info.create_system == 3:
            mode = (info.external_attr >> 16) & 0xFFFF
            if mode == 0 or not stat.S_ISREG(mode):
                raise PackageValidationError("unsupported_archive_entry")
        else:
            dos_attributes = info.external_attr & 0xFF
            if dos_attributes & 0x10:
                raise PackageValidationError("unsupported_archive_entry")
        try:
            logical = normalize_package_path(info.filename)
        except ManifestError as error:
            raise PackageValidationError("invalid_package_path") from error
        folded_path = logical.casefold()
        if logical in exact or folded_path in folded:
            raise PackageValidationError("duplicate_package_path")
        folded_parts = folded_path.split("/")
        prefixes = {
            "/".join(folded_parts[:index])
            for index in range(1, len(folded_parts))
        }
        if prefixes & files_folded or any(
            path.startswith(folded_path + "/") for path in files_folded
        ):
            raise PackageValidationError("unsupported_archive_entry")
        exact.add(logical)
        folded.add(folded_path)
        files_folded.add(folded_path)
        records.append((logical, info))
    return tuple(sorted(records, key=lambda item: item[0]))
```

Use an absent `stage_root` and assert it remains absent after every rejection; no case creates outside `escape.txt`. Add `test_preexisting_stage_destination_is_untouched`: precreate `stage_root/sentinel.txt` with `b"keep"`, call `stage_and_validate_archive`, assert `FileExistsError`, and assert the sentinel bytes remain unchanged.

- [ ] **Step 2: Run hostile archive tests to verify RED**

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task4-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_package_archive.HostileArchiveTests -v
```

Expected: FAIL with missing `stage_and_validate_archive`.

- [ ] **Step 3: Implement two-pass manual extraction**

Require an absent destination and use this two-pass body. `_preflight_zip_infos` applies every name/type/encryption/collision rule above and returns sorted `(logical_path, ZipInfo)` regular-file records only:

```python
def stage_and_validate_archive(
    archive_path: Path,
    stage_root: Path,
    *,
    expected_version: str | None = None,
) -> ValidatedPackage:
    if stage_root.exists():
        raise FileExistsError(stage_root)
    temporary = stage_root.with_name(f".{stage_root.name}.{uuid.uuid4().hex}.tmp")
    try:
        with zipfile.ZipFile(archive_path, "r") as archive:
            entries = _preflight_zip_infos(archive.infolist())
            temporary.mkdir(parents=False)
            root = temporary.resolve(strict=True)
            for logical_path, info in entries:
                destination = temporary.joinpath(*logical_path.split("/"))
                destination.parent.mkdir(parents=True, exist_ok=True)
                parent = destination.parent.resolve(strict=True)
                if os.path.commonpath((str(root), str(parent))) != str(root):
                    raise PackageValidationError("invalid_package_path")
                with archive.open(info, "r") as source, destination.open("xb") as target:
                    shutil.copyfileobj(source, target)
        validated = validate_staged_package(
            temporary,
            expected_version=expected_version,
        )
        os.replace(temporary, stage_root)
        return replace(validated, stage_root=stage_root.resolve(strict=True))
    except Exception:
        shutil.rmtree(temporary, ignore_errors=True)
        raise
```

Never call `extract`, `extractall`, or trust an archive path in a filesystem operation before normalization/containment checks.

- [ ] **Step 4: Run GREEN, static scan, and restored traversal mutation**

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task4-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_package_archive -v
git grep -n -E "extractall|\.extract\(" -- host/package_archive.py
```

Expected: tests PASS and `git grep` exits 1 with no matches. Temporarily remove `..` rejection, run the parent case, observe FAIL, restore, and rerun to PASS.

- [ ] **Step 5: Commit hostile archive staging**

```powershell
git add host/package_archive.py host/test_package_archive.py
git commit -m "feat(update): reject hostile package archives"
```

### Task 5: Frozen and Development Installation Integrity

**Files:**
- Create: `host/install_integrity.py`
- Create: `host/test_install_integrity.py`

**Interfaces:**
- Consumes: `ReleaseIntegrity`, `InstalledProduct`, strict loaders/hash helpers, `VERSION`, required/provided capability tuples
- Produces: only `InstallationVerification` and `InstallationVerifier.__init__(install_root: Path, *, frozen: bool | None = None)` / `verify() -> InstallationVerification` exactly as frozen above. `UpdateProbeResult` and `run_update_probe` do not exist until Task 6's RED/GREEN cycle.

- [ ] **Step 1: Write failing development and frozen verification tests**

Create `host/test_install_integrity.py` with exact Task 5 classes `InstallationVerifierTests` and `InstallationEntryTypeTests`. Use a synthetic *live* tree. Build its metadata by creating a package stage through Task 2, then copy `host/*` to live root and `extension/*` to `live/extension`; do not hand-author integrity JSON.

Add these exact tests:

```python
def test_source_host_reports_development_without_metadata(self):
    result = InstallationVerifier(self.live, frozen=False).verify()
    self.assertEqual(
        result,
        InstallationVerification(
            mode="development", integrity="development", host_version=VERSION
        ),
    )

def test_frozen_complete_product_is_verified(self):
    result = InstallationVerifier(self.live, frozen=True).verify()
    self.assertEqual(result.mode, "packaged")
    self.assertEqual(result.integrity, "verified")
    self.assertEqual(result.host_version, "2.0.74-beta.4")
    self.assertEqual(result.extension_version, "2.0.74-beta.4")
```

Table-drive a fresh live tree per mutation:

```python
failures = (
    ("missing-integrity", lambda p: (p / "release-integrity.json").unlink()),
    ("missing-installed", lambda p: (p / "installed-product.json").unlink()),
    ("bad-link", lambda p: (p / "release-integrity.json").write_bytes(b"{}\n")),
    ("missing-host-file", lambda p: (p / "system_prompt.md").unlink()),
    ("changed-host-file", lambda p: (p / "system_prompt.md").write_bytes(b"changed")),
    ("extra-internal-file", lambda p: (p / "_internal/extra.dll").write_bytes(b"extra")),
    ("missing-extension-file", lambda p: (p / "extension/assets/app.js").unlink()),
    ("extra-extension-file", lambda p: (p / "extension/extra.js").write_bytes(b"extra")),
    ("extension-version", lambda p: self._rewrite_extension_version(p, "9.9.9")),
    ("host-version", lambda p: self._rewrite_integrity_version(p, "9.9.9")),
    ("capability-mismatch", lambda p: self._rewrite_integrity_capabilities(p, ("transactional-update-v1",))),
    ("installed-capability-mismatch", lambda p: self._rewrite_installed_capabilities(p, ("transactional-update-v1",))),
    ("omitted-core-record", lambda p: self._rewrite_integrity_host_paths(p, remove="system_prompt.md")),
    ("omitted-executable-record", lambda p: self._rewrite_integrity_host_paths(p, remove="dh_native_host.exe")),
    ("omitted-register-record", lambda p: self._rewrite_integrity_host_paths(p, remove="register.py")),
    ("omitted-runtime-records", lambda p: self._rewrite_integrity_host_paths(p, remove_prefix="_internal/")),
    ("config-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="config.json")),
    ("registration-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="manifest.json")),
    ("instructions-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="copilot-instructions.md")),
    ("prompt-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="user_prompt.md")),
    ("base-log-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="native_host.log")),
    ("log-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="native_host.log.1")),
    ("metadata-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="release-integrity.json")),
    ("installed-metadata-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="installed-product.json")),
    ("workspace-reclassified-product", lambda p: self._rewrite_integrity_host_paths(p, add="updates/x")),
    ("unknown-subdirectory-product", lambda p: self._rewrite_integrity_host_paths(p, add="plugins/x.dll")),
    ("uppercase-config-alias", lambda p: self._rewrite_integrity_host_paths(p, add="CONFIG.JSON")),
    ("uppercase-registration-alias", lambda p: self._rewrite_integrity_host_paths(p, add="MANIFEST.JSON")),
    ("uppercase-instructions-alias", lambda p: self._rewrite_integrity_host_paths(p, add="COPILOT-INSTRUCTIONS.MD")),
    ("uppercase-prompt-alias", lambda p: self._rewrite_integrity_host_paths(p, add="USER_PROMPT.MD")),
    ("uppercase-base-log-alias", lambda p: self._rewrite_integrity_host_paths(p, add="NATIVE_HOST.LOG")),
    ("uppercase-rotated-log-alias", lambda p: self._rewrite_integrity_host_paths(p, add="NATIVE_HOST.LOG.2")),
    ("uppercase-metadata-alias", lambda p: self._rewrite_integrity_host_paths(p, add="RELEASE-INTEGRITY.JSON")),
    ("uppercase-installed-metadata-alias", lambda p: self._rewrite_integrity_host_paths(p, add="INSTALLED-PRODUCT.JSON")),
)
```

Define `failures` inside `InstallationVerifierTests.test_frozen_failure_table` so all `self._rewrite_*` methods are bound. `_rewrite_integrity_host_paths` rewrites canonical `release-integrity.json`, recalculates `InstalledProduct.release_integrity_sha256`, and writes canonical `installed-product.json`. For an added path that does not already exist, it creates a matching live regular file and records its real SHA-256. For `release-integrity.json`/`installed-product.json`, which already exist and are rejected before live hashing, it inserts any valid lowercase 64-hex digest without overwriting either metadata document. These cases therefore reach Host path-class validation rather than failing an incidental metadata link or missing-file check. Include every listed uppercase alias to prove Windows case-insensitive reservation of config, registration, both user prompt files, base/rotated logs, and metadata. Each result must equal `InstallationVerification(mode="packaged", integrity="failed", error_code="installation_integrity_failed")` with both version fields `None`. `InstallationEntryTypeTests` always patches the private verifier walker/read helper's `Path.lstat()` result for a listed Host file, an `_internal` child, and an Extension child with Unix symlink/FIFO modes and Windows `FILE_ATTRIBUTE_REPARSE_POINT`; each must fail with `installation_integrity_failed`. A privilege-guarded real symlink fixture may supplement this deterministic mock coverage but may be skipped; never make privilege-dependent creation the only test.

- [ ] **Step 2: Run integrity tests to verify RED**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task5-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_install_integrity -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'install_integrity'`.

- [ ] **Step 3: Implement fail-closed verification and per-instance cache**

`InstallationVerifier.__init__` resolves `install_root` strictly, rejects a non-directory, resolves `frozen` from `getattr(sys, "frozen", False)` when omitted, and initializes an empty per-instance cache. `verify()` returns development immediately only when false. Frozen verification must:

1. Strict-load both metadata files.
2. Hash the exact canonical bytes on disk for `release-integrity.json` and match `InstalledProduct.release_integrity_sha256`.
3. Require the two metadata package versions equal one another and `VERSION`; require their required/provided capability tuples equal one another and current product tuples; and require ownership/legacy-allowlist schema versions are supported.
4. Hash each listed Host/Extension regular file once; reject missing/hash mismatch.
5. Enumerate `_internal/**` and `extension/**` to reject unlisted product children, while ignoring preserved top-level user/registration/update/unknown paths.
6. Strict-load `extension/manifest.json` and derive effective version as `version_name` when it is a non-empty string, otherwise `version`; require it equals both integrity package version and `VERSION`.

Cache the first frozen `InstallationVerification` on the verifier instance, including failure. This yields once-per-Host-process behavior when one verifier instance is stored by `NativeHost`; do not use a global cache that contaminates tests/install roots.

Use this public-method shape; `_verify_packaged()` implements numbered checks 1-6 with `_require_regular_file`/`_walk_regular_relative_paths` using `lstat` and reparse rejection:

```python
class InstallationVerifier:
    def __init__(self, install_root: Path, *, frozen: bool | None = None):
        candidate = install_root
        _require_plain_directory(candidate)
        self._install_root = candidate.resolve(strict=True)
        _require_plain_directory(self._install_root)
        if not self._install_root.is_dir():
            raise ValueError("install root must be a directory")
        self._frozen = getattr(sys, "frozen", False) if frozen is None else frozen
        self._cached: InstallationVerification | None = None

    def verify(self) -> InstallationVerification:
        if not self._frozen:
            return InstallationVerification(
                mode="development",
                integrity="development",
                host_version=VERSION,
            )
        if self._cached is None:
            try:
                self._cached = self._verify_packaged()
            except (ManifestError, OSError, ValueError):
                self._cached = InstallationVerification(
                    mode="packaged",
                    integrity="failed",
                    error_code="installation_integrity_failed",
                )
        return self._cached

    def _verify_packaged(self) -> InstallationVerification:
        integrity_path = self._install_root / "release-integrity.json"
        installed_path = self._install_root / "installed-product.json"
        integrity = load_release_integrity(integrity_path)
        installed = load_installed_product(installed_path)
        integrity_bytes = canonical_json_bytes(release_integrity_to_dict(integrity))
        if sha256_bytes(integrity_bytes) != installed.release_integrity_sha256:
            raise ValueError("metadata link mismatch")
        if integrity.package_version != installed.package_version or integrity.package_version != VERSION:
            raise ValueError("metadata version mismatch")
        if integrity.required_capabilities != installed.required_capabilities or integrity.required_capabilities != REQUIRED_PROTOCOL_CAPABILITIES:
            raise ValueError("required capability mismatch")
        if integrity.provided_capabilities != installed.provided_capabilities or integrity.provided_capabilities != PROVIDED_PROTOCOL_CAPABILITIES:
            raise ValueError("provided capability mismatch")
        if installed.ownership_schema_version != OWNERSHIP_SCHEMA_VERSION or installed.legacy_allowlist_version != LEGACY_PRODUCT_ALLOWLIST_VERSION:
            raise ValueError("ownership schema mismatch")
        _require_integrity_product_paths(integrity)
        _verify_exact_live_inventory(self._install_root, integrity)
        extension_version = _read_effective_extension_version(
            self._install_root / "extension" / "manifest.json"
        )
        if extension_version != integrity.package_version:
            raise ValueError("extension version mismatch")
        return InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version=VERSION,
            extension_version=extension_version,
        )
```

`_verify_exact_live_inventory` calls `_require_regular_file(path)` before hashing every listed record, requires the actual `_internal/**` and `extension/**` path sets to exactly equal the corresponding listed sets, and permits unlisted flat install-root paths only because they may be user/registration/update/unknown-owned. It still requires every flat Host product path listed by `ReleaseIntegrity.host_files`.

Validate metadata-declared product classes before touching their live paths:

```python
_RESERVED_LIVE_HOST_PATHS = {
    "_internal",
    "extension",
    "updates",
    "config.json",
    "manifest.json",
    "copilot-instructions.md",
    "user_prompt.md",
    "native_host.log",
    "release-integrity.json",
    "installed-product.json",
}
_RESERVED_LIVE_HOST_PATHS_CASEFOLDED = frozenset(
    path.casefold() for path in _RESERVED_LIVE_HOST_PATHS
)


def _require_integrity_product_paths(integrity: ReleaseIntegrity) -> None:
    host_paths = {record.path for record in integrity.host_files}
    required_flat = {"dh_native_host.exe", "register.py", "system_prompt.md"}
    if not required_flat.issubset(host_paths):
        raise ValueError("required Host product record missing")
    if not any(path.startswith("_internal/") for path in host_paths):
        raise ValueError("Host runtime records missing")
    for path in host_paths:
        normalized = normalize_package_path(path)
        if normalized != path:
            raise ValueError("noncanonical Host product path")
        folded = path.casefold()
        if folded.startswith("_internal/"):
            continue
        if "/" in path:
            raise ValueError("unsupported Host product path class")
        if (
            folded in _RESERVED_LIVE_HOST_PATHS_CASEFOLDED
            or folded.startswith("native_host.log.")
        ):
            raise ValueError("reserved Host path declared product-owned")
    extension_paths = {record.path for record in integrity.extension_files}
    if "manifest.json" not in extension_paths:
        raise ValueError("Extension manifest record missing")
    for path in extension_paths:
        if normalize_package_path(path) != path:
            raise ValueError("noncanonical Extension product path")
```

```python
def _verify_exact_live_inventory(root: Path, integrity: ReleaseIntegrity) -> None:
    expected_host = {record.path: record.sha256 for record in integrity.host_files}
    expected_extension = {record.path: record.sha256 for record in integrity.extension_files}
    internal_expected = {path for path in expected_host if path.startswith("_internal/")}
    internal_actual = {
        f"_internal/{relative}"
        for relative in _walk_regular_relative_paths(root / "_internal")
    }
    extension_actual = set(_walk_regular_relative_paths(root / "extension"))
    if internal_actual != internal_expected or extension_actual != set(expected_extension):
        raise ValueError("extra or missing product file")
    for relative, digest in expected_host.items():
        path = root.joinpath(*relative.split("/"))
        _require_regular_file(path)
        if sha256_file(path) != digest:
            raise ValueError("Host product hash mismatch")
    for relative, digest in expected_extension.items():
        path = root / "extension" / Path(*relative.split("/"))
        _require_regular_file(path)
        if sha256_file(path) != digest:
            raise ValueError("Extension product hash mismatch")
```

In `install_integrity.py`, reuse/import the standard-library-safe regular-file inventory helper from `package_manifest.py` rather than implementing a weaker `Path.is_file()` path. Implement effective Extension version as:

```python
def _read_effective_extension_version(path: Path) -> str:
    version, version_name = _read_chrome_manifest(path)
    return version_name or version
```

The Extension manifest was already included in the product hash pass, so this parse performs no second file hash.

- [ ] **Step 4: Add and pass cache behavior tests**

Add a test that verifies once, mutates `system_prompt.md`, verifies again on the same instance and receives the same verified object, then creates a new verifier and receives failure. Patch `sha256_file` with `wraps`; derive the expected first-call count as `len(release_integrity.host_files) + len(release_integrity.extension_files)`, assert the first call count equals it, and assert the second call on the same verifier adds zero hash calls. The metadata link uses `sha256_bytes(canonical_json_bytes(release_integrity_to_dict(integrity)))`; strict loading already proved those canonical bytes equal the bytes read from disk, avoiding a second open/TOCTOU window.

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task5-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_install_integrity -v
```

Expected: PASS. Temporarily allow development whenever metadata is missing regardless of `frozen`, run `test_frozen_complete_product_is_verified` plus `missing-integrity`, observe the latter FAIL, restore, and rerun to PASS.

- [ ] **Step 5: Commit installation verification**

```powershell
git add host/install_integrity.py host/test_install_integrity.py
git commit -m "feat(host): verify packaged installation integrity"
```

### Task 6: Early Update Probe Before Host Side Effects

**Files:**
- Modify: `host/install_integrity.py`
- Create: `host/early_cli.py`
- Create: `host/test_early_cli.py`
- Modify: `host/test_install_integrity.py`
- Modify: `host/dh_native_host.py:1-4`

**Interfaces:**
- Consumes: absolute staged `update-manifest.json`, installed/staged Host root, current product capabilities, `InstallationVerifier`
- Produces: `UpdateProbeResult`, `run_update_probe(...)`, `dispatch_early_cli(argv) -> int | None`; process mode `dh_native_host.py --update-probe <absolute-manifest>`

- [ ] **Step 1: Write failing pure probe tests**

Add exact class `UpdateProbeTests` to `host/test_install_integrity.py` with valid package/live fixtures and this table:

```python
failures = (
    ("manifest-version", lambda m, p: self._rewrite_update_version(m, "9.9.9")),
    ("required-capability", lambda m, p: self._rewrite_required(m, ("missing-v1",))),
    ("provided-capability", lambda m, p: self._rewrite_provided(m, ())),
    ("manifest-host-hash", lambda m, p: self._rewrite_update_hash(m, "host/system_prompt.md", "0" * 64)),
    ("manifest-extension-hash", lambda m, p: self._rewrite_update_hash(m, "extension/assets/app.js", "0" * 64)),
    ("host-file", lambda m, p: (p / "system_prompt.md").write_bytes(b"changed")),
    ("dh-core-missing", lambda m, p: (p / "system_prompt.md").unlink()),
    ("extension-version", lambda m, p: self._rewrite_extension_version(p, "9.9.9")),
)
```

Define `failures` inside `UpdateProbeTests.test_probe_failure_table` so every `self._rewrite_*` method is bound.

A valid result must equal:

```python
UpdateProbeResult(
    status="success",
    host_version="2.0.74-beta.4",
    extension_version="2.0.74-beta.4",
    capabilities=("prompt-scope-v1",),
)
```

Every table mutation must equal `UpdateProbeResult(status="error", error_code="package_probe_failed")`; no path or exception field exists.

Also add `test_valid_probe_hashes_each_live_product_once`: patch `sha256_file` with `wraps`, run a valid probe, derive the expected count as `len(release_integrity.host_files) + len(release_integrity.extension_files)`, and assert exact equality. This Task 6 RED assertion proves the external manifest comparison does not rehash product bytes; before Step 3 it fails because `run_update_probe`/`UpdateProbeResult` do not exist.

- [ ] **Step 2: Run the pure probe test to verify RED**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task6-probe-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_install_integrity.UpdateProbeTests -v
```

Expected: FAIL with `ImportError: cannot import name 'run_update_probe'` or the first missing `UpdateProbeResult` symbol.

- [ ] **Step 3: Implement `run_update_probe` minimally**

Strict-load the external update manifest. When `install_root` is passed by a unit test, resolve and use it; otherwise derive the running Host root as `Path(sys.executable).resolve().parent` in a frozen process or `Path(__file__).resolve().parent` in source. Never derive the installed root from the package manifest path: the detached runner passes the external staged manifest while probing the newly installed live Host. Require the manifest's package version equals `VERSION`, require all `required_capabilities` are in current provided capabilities, and require manifest provided capabilities exactly equal current Plan A provided capabilities. Before hashing live files, load the installed `release-integrity.json` and require the external update manifest's Host/Extension product view equals it through `_require_product_bijection`; require the DH Core entry `host/system_prompt.md` specifically. Then invoke a fresh frozen `InstallationVerifier(resolved_install_root, frozen=True)` and require packaged/verified plus matching Extension/package versions. The verifier performs the one live hash pass; the probe must not hash those paths a second time. `SEED_ONLY`, `PACKAGED_METADATA`, and `PACKAGE_ONLY` are absent from the product bijection because seed bytes may be user-owned and metadata has its separate coupled checks. Catch all parser/I/O exceptions at this outer boundary and return only the fixed failure result.

Use this outer body; `_require_probe_manifest_matches_integrity` performs the exact metadata comparison just described and raises only internally:

```python
def run_update_probe(
    manifest_path: Path,
    *,
    install_root: Path | None = None,
) -> UpdateProbeResult:
    try:
        manifest = load_update_manifest(manifest_path)
        root = (
            install_root.resolve(strict=True)
            if install_root is not None
            else (
                Path(sys.executable).resolve().parent
                if getattr(sys, "frozen", False)
                else Path(__file__).resolve().parent
            )
        )
        if manifest.package_version != VERSION:
            raise ValueError("version mismatch")
        if not set(manifest.required_capabilities).issubset(PROVIDED_PROTOCOL_CAPABILITIES):
            raise ValueError("required capability missing")
        if manifest.provided_capabilities != PROVIDED_PROTOCOL_CAPABILITIES:
            raise ValueError("provided capability mismatch")
        _require_probe_manifest_matches_integrity(root, manifest)
        verification = InstallationVerifier(root, frozen=True).verify()
        if verification.integrity != "verified":
            raise ValueError("installation verification failed")
        if verification.host_version != manifest.package_version:
            raise ValueError("host version mismatch")
        if verification.extension_version != manifest.package_version:
            raise ValueError("extension version mismatch")
        return UpdateProbeResult(
            status="success",
            host_version=verification.host_version,
            extension_version=verification.extension_version,
            capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        )
    except (ManifestError, OSError, ValueError):
        return UpdateProbeResult(status="error", error_code="package_probe_failed")
```

Compare external package metadata to installed integrity without a second live-file hash pass:

```python
def _require_probe_manifest_matches_integrity(
    root: Path,
    manifest: UpdateManifest,
) -> None:
    if not any(
        entry.path == "host/system_prompt.md"
        and entry.ownership is OwnershipClass.HOST_PRODUCT_FILE
        for entry in manifest.entries
    ):
        raise ValueError("DH Core missing from package manifest")
    integrity = load_release_integrity(root / "release-integrity.json")
    _require_product_bijection(manifest, integrity)
```

Call `_require_probe_manifest_matches_integrity(root, manifest)` immediately before `InstallationVerifier(root, frozen=True).verify()`. Import `_require_product_bijection` and `load_release_integrity` from `package_manifest.py`; both remain standard-library-only. The `manifest-host-hash` and `manifest-extension-hash` mutations therefore fail before `InstallationVerifier` hashes live bytes, while a valid probe hashes each live product path once inside the verifier.

- [ ] **Step 4: Write failing isolated process tests for early ordering**

Create `host/test_early_cli.py` with exact class `EarlyCliDispatchTests`. Its subprocess helper always constructs `env = os.environ.copy()` and overwrites `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` before `Popen`/`run`. Use `sys.executable` (the test itself runs under the required venv) and absolute paths.

Add exact tests:

```python
def test_valid_probe_exits_before_sdk_logging_config_and_updater_imports(self):
    completed = self._run_probe(self.valid_manifest)
    self.assertEqual(completed.returncode, 0, completed.stderr)
    self.assertEqual(json.loads(completed.stdout), {
        "status": "success",
        "host_version": "2.0.74-beta.4",
        "extension_version": "2.0.74-beta.4",
        "capabilities": ["prompt-scope-v1"],
    })
    self.assertEqual(completed.stdout.count("\n"), 1)
    self.assertFalse((self.localappdata / "DynamicsHelper").exists())
    self.assertFalse((self.temp / "dh_startup.log").exists())

def test_probe_succeeds_when_sdk_and_legacy_updater_are_poisoned(self):
    poison = self.root / "poison"
    poison.mkdir()
    (poison / "copilot.py").write_text("raise RuntimeError('SDK IMPORTED')\n", encoding="ascii")
    (poison / "updater.py").write_text("raise RuntimeError('UPDATER IMPORTED')\n", encoding="ascii")
    completed = self._run_probe(self.valid_manifest, pythonpath=str(poison) + os.pathsep + "host")
    self.assertEqual(completed.returncode, 0, completed.stderr)
    self.assertNotIn("IMPORTED", completed.stderr)

def test_process_probe_uses_running_host_root_not_manifest_parent(self):
    external = self.root / "staged" / "update-manifest.json"
    external.parent.mkdir()
    external.write_bytes(self.valid_manifest.read_bytes())
    completed = self._run_probe(external, cwd=self.live_host_root)
    self.assertEqual(completed.returncode, 0, completed.stderr)

def test_probe_subprocess_environment_is_fully_isolated(self):
    completed = self._run_probe(self.valid_manifest)
    self.assertEqual(completed.returncode, 0, completed.stderr)
    for path in (
        self.localappdata, self.appdata, self.userprofile,
        self.home, self.temp, self.tmp,
    ):
        self.assertTrue(path.is_relative_to(self.root))
```

Also test missing path, relative path, extra argument, malformed package, and failed probe. Each outputs only `{"error_code":"package_probe_failed","status":"error"}\n`; argument errors exit 2 and validation errors exit 1. `dispatch_early_cli(["dh_native_host.py"])` returns `None` without output. In `_run_probe`, execute a copied `dh_native_host.py` plus copied `early_cli.py`, `install_integrity.py`, `package_manifest.py`, and `product_info.py` placed at `self.live_host_root`; this makes the source-mode default root equal the synthetic installed tree. Pass the staged manifest at a separate absolute path to prove root selection is independent.

- [ ] **Step 5: Run process tests to verify RED**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task6-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_early_cli -v
```

Expected: FAIL because `early_cli.py`/early dispatch does not exist; if the script reaches normal startup, the poisoned SDK error and/or startup files prove the ordering defect.

- [ ] **Step 6: Implement strict early dispatch at the first import seam**

Create `early_cli.py` with only standard-library imports plus `from install_integrity import run_update_probe` and `from package_manifest import canonical_json_bytes`. Serialize both probe shapes with `canonical_json_bytes`; write bytes through `sys.stdout.buffer` when available and flush once:

```python
def _write_probe_json(payload: dict[str, object]) -> None:
    encoded = canonical_json_bytes(payload)
    binary = getattr(sys.stdout, "buffer", None)
    if binary is not None:
        binary.write(encoded)
        binary.flush()
    else:
        sys.stdout.write(encoded.decode("ascii"))
        sys.stdout.flush()
```

Use this complete dispatcher body:

```python
def dispatch_early_cli(argv: Sequence[str]) -> int | None:
    if "--update-probe" not in argv[1:]:
        return None
    failure = {"status": "error", "error_code": "package_probe_failed"}
    if len(argv) != 3 or argv[1] != "--update-probe":
        _write_probe_json(failure)
        return 2
    manifest_path = Path(argv[2])
    if not manifest_path.is_absolute() or ".." in manifest_path.parts:
        _write_probe_json(failure)
        return 2
    result = run_update_probe(manifest_path)
    if result.status == "success":
        payload = {
            "status": "success",
            "host_version": result.host_version,
            "extension_version": result.extension_version,
            "capabilities": list(result.capabilities),
        }
        _write_probe_json(payload)
        return 0
    _write_probe_json(failure)
    return 1
```

At the top of `dh_native_host.py`, immediately after the first `import sys`, add:

```python
from early_cli import dispatch_early_cli

_early_exit_code = dispatch_early_cli(sys.argv)
if _early_exit_code is not None:
    raise SystemExit(_early_exit_code)
```

This must precede the current `--register` block and every `os`, `json`, `winreg`, emergency-log, stdout-redirection, logging, SDK, updater, PII, secret, or config import/side effect. Do not move `--register`; Plan C will generalize other early modes.

- [ ] **Step 7: Run GREEN and static import-order proof**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task6-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_install_integrity host.test_early_cli -v
& "host/venv/Scripts/python.exe" -c "import ast,pathlib; p=pathlib.Path('host/dh_native_host.py'); t=ast.parse(p.read_text(encoding='utf-8')); names=[getattr(n,'module',None) for n in t.body[:5] if isinstance(n,ast.ImportFrom)]; assert 'early_cli' in names"
```

Expected: PASS and no real profile writes. Temporarily move dispatch below emergency logging, run `test_valid_probe_exits_before_sdk_logging_config_and_updater_imports`, observe FAIL due to `dh_startup.log`, restore, and rerun to PASS.

- [ ] **Step 8: Commit the early probe**

```powershell
git add host/install_integrity.py host/early_cli.py host/test_install_integrity.py host/test_early_cli.py host/dh_native_host.py
git commit -m "feat(host): add side-effect-free update probe"
```

### Task 7: Host Capability and Integrity Wire Actions

**Files:**
- Modify: `host/dh_native_host.py:459-485,2631-2741`
- Create: `host/test_host_integrity_actions.py`

**Interfaces:**
- Consumes: `get_host_capabilities()`, `InstallationVerifier.verify()`, existing `NativeHost.process_message`
- Produces: authoritative `get_capabilities`; allowlisted `verify_installation`; capability list in practical `health_check`/`get_config` responses; one verifier instance per `NativeHost`

- [ ] **Step 1: Write failing exact-envelope wire tests**

Create `host/test_host_integrity_actions.py` with exact class `HostIntegrityActionTests(unittest.IsolatedAsyncioTestCase)`. Build instances with `NativeHost.__new__(NativeHost)` to avoid constructor side effects, set `current_request_id=None`, `loop=None`, `client=object()`, `send_progress=MagicMock()`, `send_message=MagicMock()`, and inject `_installation_verifier=MagicMock()`.

Add:

```python
async def test_get_capabilities_exact_envelope(self):
    await self.host.process_message({"action": "get_capabilities", "requestId": "cap-1"})
    self.host.send_message.assert_called_once_with({
        "requestId": "cap-1",
        "status": "success",
        "data": {
            "host_version": "2.0.74-beta.4",
            "capabilities": ["prompt-scope-v1"],
        },
    })

VERIFY_CASES = (
    (InstallationVerification(mode="packaged", integrity="verified", host_version="2.0.74-beta.4", extension_version="2.0.74-beta.4"),
     {"mode":"packaged","integrity":"verified","host_version":"2.0.74-beta.4","extension_version":"2.0.74-beta.4"}),
    (InstallationVerification(mode="packaged", integrity="failed", error_code="installation_integrity_failed"),
     {"mode":"packaged","integrity":"failed","error_code":"installation_integrity_failed"}),
    (InstallationVerification(mode="development", integrity="development", host_version="2.0.74-beta.4"),
     {"mode":"development","integrity":"development","host_version":"2.0.74-beta.4"}),
)
```

Iterate `VERIFY_CASES`, call `verify_installation`, and assert exact `data` equality and no extra fields. Add assertions that `health_check.data.capabilities` and `get_config.data.capabilities` equal `['prompt-scope-v1']` while their current fields remain. Patch the verifier to raise a secret-bearing exception and assert the action returns packaged/failed fixed metadata without the secret.

Add a compile-time annotation regression:

```python
def test_integrity_serializer_annotation_resolves(self):
    hints = typing.get_type_hints(NativeHost._serialize_installation_verification)
    self.assertIs(hints["verification"], InstallationVerification)
    self.assertEqual(hints["return"], dict[str, str])
```

This fails if Task 7 omits `InstallationVerification` from imports and does not enable postponed annotations.

- [ ] **Step 2: Write Plan A non-enforcement/legacy updater tests**

Add:

```python
async def test_plan_a_does_not_gate_analyze(self):
    self.host.handle_analyze_error = AsyncMock(return_value={"status": "success", "data": {"markdown": "ok"}})
    await self.host.process_message({"action": "analyze_error", "requestId": "a", "payload": {}})
    self.host.handle_analyze_error.assert_awaited_once_with({})

async def test_plan_a_perform_update_still_uses_legacy_updater(self):
    self.host.loop = asyncio.get_running_loop()
    fake = MagicMock()
    fake.download_update.return_value = "synthetic.zip"
    fake.apply_update.return_value = True
    with patch("updater.Updater", return_value=fake):
        await self.host.process_message({"action": "perform_update", "requestId": "u", "payload": {"url": "https://example.invalid/release.zip"}})
    fake.download_update.assert_called_once()
    fake.apply_update.assert_called_once_with("synthetic.zip")
```

No network occurs because both updater methods are mocked. Assert there is no `activate_update` action and no `transactional-update-v1` response.

- [ ] **Step 3: Run wire tests to verify RED**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task7-red-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_host_integrity_actions -v
```

Expected: FAIL because `get_capabilities`/`verify_installation` currently return `unknown_action` and diagnostic responses lack capabilities.

- [ ] **Step 4: Implement minimal Host action wiring**

Import the annotation type explicitly in the normal Host section (the early probe already exited); no postponed-annotation assumption is needed:

```python
from pathlib import Path

from install_integrity import InstallationVerification, InstallationVerifier
from product_info import get_host_capabilities
```

In `NativeHost.__init__`, create:

```python
self._installation_verifier = InstallationVerifier(Path(self._get_install_dir()))
```

Add this private serializer so no dataclass `None` fields leak:

```python
@staticmethod
def _serialize_installation_verification(
    verification: InstallationVerification,
) -> dict[str, str]:
    if verification.mode == "development":
        if verification.integrity != "development" or not verification.host_version:
            return {
                "mode": "packaged",
                "integrity": "failed",
                "error_code": "installation_integrity_failed",
            }
        return {
            "mode": "development",
            "integrity": "development",
            "host_version": verification.host_version,
        }
    if verification.integrity == "verified":
        if not verification.host_version or not verification.extension_version:
            return {
                "mode": "packaged",
                "integrity": "failed",
                "error_code": "installation_integrity_failed",
            }
        return {
            "mode": "packaged",
            "integrity": "verified",
            "host_version": verification.host_version,
            "extension_version": verification.extension_version,
        }
    return {
        "mode": "packaged",
        "integrity": "failed",
        "error_code": "installation_integrity_failed",
    }
```

Add dispatch branches before the unknown action:

```python
elif action == "get_capabilities":
    capabilities = get_host_capabilities()
    response["data"] = {
        "host_version": capabilities.host_version,
        "capabilities": list(capabilities.provided),
    }

elif action == "verify_installation":
    response["data"] = self._serialize_installation_verification(
        self._installation_verifier.verify()
    )
```

On an unexpected verifier exception, return only packaged/failed/`installation_integrity_failed`. Add `capabilities` to health/config data without changing their status semantics. Do not call verification before Analyze/config/model actions and do not add capability enforcement.

- [ ] **Step 5: Run GREEN and legacy regression tests**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-task7-green-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_host_integrity_actions host.test_session_workspace host.test_prompt_sources host.test_model_config host.test_version_parse -v
```

Expected: PASS. Temporarily expose `dataclasses.asdict(verification)` directly, run the failed verification exact-shape test, observe FAIL because `None` fields leak, restore the allowlisted serializer, and rerun to PASS.

- [ ] **Step 6: Commit Host diagnostics without runtime gating**

```powershell
git add host/dh_native_host.py host/test_host_integrity_actions.py
git commit -m "feat(host): expose capability and integrity diagnostics"
```

### Task 8: Documentation, Evidence, and Final Gates

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `AGENTS.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Create: `.superpowers/sdd/package-integrity-plan-a-report.md`

**Interfaces:**
- Consumes: committed Plan A source/tests, exact command output and commit IDs
- Produces: durable package/integrity documentation, explicit legacy migration limitation, reproducible RED/GREEN/mutation/final evidence, and Plan B handoff

- [ ] **Step 1: Run focused Plan A tests from a fresh isolated root**

Run exactly:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-final-focused-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest host.test_product_info host.test_package_manifest host.test_package_archive host.test_release_helper host.test_install_integrity host.test_early_cli host.test_host_integrity_actions -v
```

Expected: PASS. Record exact test count and elapsed time; do not predict them in the report.

- [ ] **Step 2: Run full isolated Host discovery and source compile**

Run in a new shell/root so environment is set before Python starts:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-final-full-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -m unittest discover host -v
& "host/venv/Scripts/python.exe" -m compileall -q -x "venv" host release_helper.py
```

Expected: full discovery PASS; compileall exits 0 with no diagnostics. Before this command starts, use a new `$root`; after Python exits, remove that isolated root so no scratch Host profile remains.

- [ ] **Step 3: Run full Extension regressions and production TypeScript/build gate**

Run from the repository root; these Node processes do not start/import the Host and therefore do not need Host environment variables:

```powershell
npm run test:run --prefix extension -- --reporter=dot
npm run build --prefix extension
```

Expected: full Extension suite PASS; `tsc` and Vite production build exit 0. `extension/dist` remains ignored/untracked. Record exact test/module/artifact totals from output rather than predicting them.

- [ ] **Step 4: Run release-manifest generation/round-trip without a release asset**

Use a temporary synthetic source/stage/archive under the isolated root through `host.test_release_helper` and `host.test_package_archive`; do **not** invoke `release_helper.py`'s CLI because it changes versions/commits/tags/builds. Then run this import-only contract probe:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-final-contract-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
& "host/venv/Scripts/python.exe" -c "from product_info import *; assert VERSION == '2.0.74-beta.4'; assert PROVIDED_PROTOCOL_CAPABILITIES == ('prompt-scope-v1',); assert 'transactional-update-v1' not in PROVIDED_PROTOCOL_CAPABILITIES"
& "host/venv/Scripts/python.exe" -m unittest host.test_release_helper.TestReleaseStaging.test_historical_updater_bootstraps_both_metadata_files host.test_package_archive.DeterministicArchiveWriterTests.test_deterministic_archive_bytes_and_metadata -v
```

Expected: PASS; `git status --short` shows no release ZIP, generated metadata, version, or `extension/dist` tracked change.

- [ ] **Step 5: Run static safety and scope gates**

Run:

```powershell
$root = Join-Path "C:\Users\zhaobo\AppData\Local\Temp\opencode" ("dh-plan-a-final-static-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $root | Out-Null
$env:LOCALAPPDATA = Join-Path $root "local"
$env:APPDATA = Join-Path $root "roaming"
$env:USERPROFILE = Join-Path $root "profile"
$env:HOME = $env:USERPROFILE
$env:TEMP = Join-Path $root "temp"
$env:TMP = Join-Path $root "tmp"
$env:PYTHONPATH = "host"
New-Item -ItemType Directory -Force $env:LOCALAPPDATA,$env:APPDATA,$env:USERPROFILE,$env:TEMP,$env:TMP | Out-Null
git diff --check "$env:PLAN_A_BASE..HEAD"
git grep -n -E "extractall|\.extract\(" -- host/package_archive.py host/install_integrity.py release_helper.py
git grep -n "transactional-update-v1" -- host/product_info.py host/package_manifest.py host/install_integrity.py host/dh_native_host.py
git grep -n -E "activate_update|waiting-for-host-exit|journal\.json|RunOnce" -- host/product_info.py host/package_manifest.py host/package_archive.py host/install_integrity.py host/early_cli.py host/dh_native_host.py release_helper.py
git grep -n -E "str\((raw|value|entry|capability|payload)" -- host/package_manifest.py host/package_archive.py host/install_integrity.py host/early_cli.py
& "host/venv/Scripts/python.exe" -c "from package_manifest import OwnershipClass as O; assert {x.value for x in O} == {'whole_product_directory','host_product_file','seed_only','packaged_metadata','generated_registration','user_owned','transaction_workspace','package_only','unknown_top_level'}"
git diff --name-only "$env:PLAN_A_BASE..HEAD"
```

Expected: `git diff --check` exits 0; all four `git grep` commands exit 1 with no matches in production Plan A files, including no rejected-value `str(...)` coercion; the ownership-enum check exits 0; changed product files are limited to the structure mapped above. Review every `$env:PLAN_A_BASE..HEAD` product diff against Plan A and record any finding/fix in the evidence report. `host/updater.py`, Extension source, installer scripts, versions, registry files, and generated release documents have no diff.

- [ ] **Step 6: Document exact behavior and migration limits**

Update documentation with concrete content:

- `ARCHITECTURE.md`: ownership classes; generated file locations; internal metadata exclusions/external metadata hashes; frozen vs development verification; early probe ordering; `get_capabilities` and `verify_installation`; explicit statement that the in-place legacy updater remains active.
- `DEVELOPER_GUIDE.md`: frozen interfaces/signatures, canonical JSON/path rules, deterministic staging/archive API, isolated Host commands, and how to generate/validate only synthetic packages.
- `AGENTS.md`: never use `extractall`; every package entry has one ownership class; never advertise `transactional-update-v1` before Plan D; every Host subprocess isolates all six profile/temp environment variables; no real AppData/registry/installer tests.
- `releases/notes-prompt-scope-cleanup-draft.md`: the first upgrade still runs historical updater code, but complete ordinary-file copy bootstraps both Host metadata documents; partial copy is detected by the new integrity action; no claim that the first upgrade or active updater is transactional.

- [ ] **Step 7: Write the Plan A evidence report**

Create `.superpowers/sdd/package-integrity-plan-a-report.md` with these exact headings and actual evidence only:

```markdown
# Package Integrity Plan A Implementation Report

## Scope and Heads
## Commit Map
## Interface and Schema Summary
## TDD RED Evidence
## GREEN Evidence
## Restored Mutation Proofs
## Historical Updater Bootstrap Evidence
## Final Verification
## Static and Scope Gates
## Migration Limits and Residual Risks
## Plan B Handoff
```

Record the execution precondition's exact `PLAN_A_BASE` (and note that this plan was authored against source head `e5910f47ddb73b8ee26d4ce1bacc6746545c512f`), each product commit hash/message, exact failures observed before implementation, exact passing totals, mutation failure messages, environment roots, and skipped real-world operations. State that hashes do not authenticate malicious repacking, Plan A does not enforce the runtime gate, the first historical upgrade is not transactional, and disposable-VM smoke is deferred until a release enables the new updater.

- [ ] **Step 8: Re-run focused/full gates from committed product head and verify docs**

After documentation edits, repeat Steps 1-5. Additionally run:

```powershell
git grep -n -E "legacy updater|historical updater|prompt-scope-v1|release-integrity\.json|installed-product\.json|update-manifest\.json" -- ARCHITECTURE.md DEVELOPER_GUIDE.md AGENTS.md releases/notes-prompt-scope-cleanup-draft.md .superpowers/sdd/package-integrity-plan-a-report.md
git diff --check
git status --short
```

Expected: all gates retain their prior PASS results; documentation scan finds every required concept; status contains only intended documentation/evidence files before the evidence commit.

- [ ] **Step 9: Commit documentation and evidence**

```powershell
git add ARCHITECTURE.md DEVELOPER_GUIDE.md AGENTS.md releases/notes-prompt-scope-cleanup-draft.md
git add -f -- .superpowers/sdd/package-integrity-plan-a-report.md
$staged = @(git diff --cached --name-only)
$expected = @(
    ".superpowers/sdd/package-integrity-plan-a-report.md",
    "AGENTS.md",
    "ARCHITECTURE.md",
    "DEVELOPER_GUIDE.md",
    "releases/notes-prompt-scope-cleanup-draft.md"
) | Sort-Object
if (Compare-Object ($staged | Sort-Object) $expected) {
    throw "Unexpected staged files before evidence commit."
}
git diff --cached --check
git commit -m "docs(integrity): record package hardening evidence"
```

`.superpowers/sdd/.gitignore` ignores every report by default, so ordinary `git add` is insufficient. `git add -f --` is limited to the exact evidence path, and the staged-name equality check prevents unrelated ignored or tracked files from entering the commit.

- [ ] **Step 10: Run final committed-head checks and record no post-evidence drift**

Run `git status --short`, `git diff --check HEAD^..HEAD`, the focused suite from Step 1, full discovery from Step 2, and Extension test/build commands from Step 3 with new isolated roots where applicable. Expected: clean worktree, diff check PASS, focused/full Host tests PASS, Extension tests/build PASS. If the evidence commit's recorded totals changed, add a new corrective documentation commit; do not amend and do not alter product code without restarting its TDD cycle.
