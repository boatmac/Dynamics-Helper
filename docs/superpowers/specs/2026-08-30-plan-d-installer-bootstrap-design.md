# Plan D Direct Installer Bootstrap Design

> **Historical, not an active implementation requirement:** The September 1
> reliable-auto-update design explicitly deferred the independent bootstrap,
> quarantine automation and registration-transaction architecture developed here.
> Earlier approval/status wording below does not authorize reviving it. Product
> archive/integrity requirements remain in their implemented contracts. Start at
> `docs/session-handoff-2026-07-15.md`, not this document's execution gates.

**Status:** Content approved in-session; commit-specific user review remains
required. Product implementation, toolchain provisioning, installation, tagging,
and publication remain unauthorized.

**Scope:** This document supersedes only the fresh/manual installer archive
boundary, installer exit-30 guidance, old-Host migration classification, archive
resource limits, and fresh frozen-toolchain gates in the July whole-branch design
and August Plan D execution refresh. All other Plan A/B/C/E and Plan D contracts
remain unchanged.

The later quarantine section additionally supersedes this document's ordinary
child-exit table only for explicit bootstrap/Host quarantine modes and supersedes
the August early-mode table only for exact exits `41` and `42`. Ordinary install,
registration, transaction-recovery, and every unmentioned row remain unchanged.

## Execution Authority

Let `B` be the commit containing only this design path. `B` must be a direct
child of approved execution-refresh commit
`f408ba96690d28395ae9e6033471b5b51ed36f0d`; no product path may change in `B`.
The user reviews and explicitly approves `B` before plan revision resumes.

The revised Plan D implementation plan and its exact-blob review form the next
commit after `B`. That plan must pin both `B` and `f408ba9`, replace every
superseded installer/toolchain/evidence contract, and require Critical and
Important review sections to be `None.`. Its preflight verifies the exact design
blob from `B`, direct ancestry, and plan/review blob hashes. C-D0 product,
review, evidence, exact PyInstaller `6.22.2` provisioning, and Plan D base capture
remain later independent gates. No C-D0 or Plan D product implementation begins
from this design commit alone.

If this design requires correction after `B`, use a new design-only forward
commit, repeat user approval, and bind the plan to the latest approved design
commit. Never amend/rebase the approved chain or silently treat an uncommitted
worktree design as execution authority.

## Problem

Plan A requires `stage_and_validate_archive` to inspect archive metadata before
accepting extracted package bytes. The prior Plan D installer flow instead let
PowerShell expand the release ZIP and execute package-contained code before Plan
A validation. Post-extraction checks cannot reconstruct duplicate,
case-collision, encrypted-entry, unsupported-type, or traversal facts already
lost at that boundary.

A fresh installation has no trusted installed Host with which to validate the
archive. An archive-contained Host cannot establish its own trust by validating
itself after generic extraction. A remote PowerShell downloader also cannot be
called the first executable trust boundary. The supported entry point must be a
separately published bootstrap executable that owns download, validation, and
installation orchestration directly.

## Trust Model

The user downloads one versioned bootstrap executable from the selected GitHub
release page:

```text
dh_installer_bootstrap_v<VERSION>.exe
```

The bootstrap trusts only current HTTPS metadata and asset bytes for the exact
tag under fixed repository `boatmac/Dynamics-Helper`. GitHub's release-asset
contract supplies `name`, `state`, `size`, `content_type`, asset ID/download URL,
and a nullable `digest`. DH accepts only a non-null digest in exact
`sha256:<64-lowercase-hex>` form and verifies those fields and downloaded bytes;
null or any other digest form fails before download.

This closes the archive parsing/extraction boundary. It does not claim
Authenticode, detached-signature, compromised-account, or coherently replaced
release protection. GitHub release metadata and HTTPS remain the publisher trust
anchor. Adding independent publisher authentication requires a separate design.

Documentation removes the mutable `aka.ms | iex` quick-install path. A remote or
local PowerShell script is not a supported installation entry point.

## Release Assets And Pairing

Each release has two exact version-paired installation assets:

```text
DynamicsHelper_v<VERSION>.zip
dh_installer_bootstrap_v<VERSION>.exe
```

The product ZIP is built and validated first. Its SHA-256 is then embedded with
the exact effective version, prerelease boolean, and tag in the bootstrap's generated frozen entry
module. The bootstrap cannot embed its own digest; at runtime it compares
`sha256(sys.executable)` and its exact file size with its GitHub asset record.

For the exact embedded tag, the bootstrap requires:

- `draft` is `false`;
- `tag_name` equals `v<VERSION>` byte-for-byte;
- `prerelease` is `true` exactly when strict `VERSION` contains the SemVer
  prerelease suffix defined below;
- exactly one uploaded asset has each required name;
- the bootstrap record is `application/octet-stream` and the ZIP record is
  `application/zip`;
- both sizes are positive and within their fixed limits;
- both digests have exact lowercase SHA-256 grammar;
- the bootstrap record digest/size matches the running executable;
- the ZIP record digest equals the hash embedded in the bootstrap.

Other unrelated release assets do not participate. Duplicate required names,
missing records, starter/non-uploaded records, version disagreement, or digest
disagreement fail before ZIP download.

Asset download uses the exact asset ID returned by that release query, not a
name or URL search after selection. Metadata `url` must equal exact
`https://api.github.com/repos/boatmac/Dynamics-Helper/releases/assets/<decimal-id>`;
`browser_download_url` must equal exact
`https://github.com/boatmac/Dynamics-Helper/releases/download/v<VERSION>/<expected-name>`
with no query or fragment. The binary request starts only at
`api.github.com/repos/boatmac/Dynamics-Helper/releases/assets/<decimal-id>`,
uses exact `GET` with `Accept: application/octet-stream`, accepts zero through
five `302` redirects followed by exactly one terminal `200`, and
permits HTTPS hosts only in the exact set
`api.github.com`, `github.com`, `objects.githubusercontent.com`, and
`release-assets.githubusercontent.com`; no userinfo, fragment, non-default port,
IP literal, suffix match, or downgrade is accepted. A deleted/replaced asset ID
or changed byte stream fails closed. Redirect/error bodies are closed after at
most 8 KiB of bounded discard and never parsed. Full URLs, redirect targets,
query strings, response bodies, and exception text are never logged or
displayed.

## Bootstrap Artifact

Source lives in focused module `host/installer_bootstrap.py`. The release helper
creates a temporary generated entry module containing only exact version, tag,
prerelease boolean, ZIP filename, ZIP size, ZIP SHA-256, and PyInstaller version,
then builds one `--onefile` executable. The
generated module and PyInstaller work products are untracked, isolated, and
removed after verification.

`VERSION` uses strict SemVer without build metadata: three no-leading-zero
decimal identifiers plus an optional hyphen and dot-separated nonempty
ASCII alphanumeric/hyphen identifiers; numeric prerelease identifiers also have
no leading zero. `TAG` is exact `v` plus `VERSION`, and `PRERELEASE` is exactly
whether that suffix exists. Generated constants inconsistent with this grammar,
ZIP name/size/hash, or exact `PYINSTALLER_VERSION='6.22.2'` fail before adapter
construction.

The fresh frozen toolchain is exact PyInstaller `6.22.2`. That release contains
the 6.22.1 onefile inherited-environment spoofing validation and the 6.22.2
Windows symlink/junction correction. Historical Plan C evidence produced with
`6.18.0` remains immutable chronology; it is not relabeled. Fresh C-D0 and Plan D
product/bootstrap builds, inventories, module graphs, and frozen probes are
rebaselined and recorded under `6.22.2` after separate provisioning approval.

The onefile build uses exact
`--runtime-tmpdir=%LOCALAPPDATA%\DynamicsHelperBootstrapRuntime\v<VERSION>`.
PyInstaller 6.22.2's Windows bootloader expands that variable and necessarily
creates its secured random `_MEI*` child before Python runs. This bootloader-only
extraction is the sole allowed pre-application filesystem effect. It is not a
product install/stage and contains only bootstrap runtime bytes.

The bootstrap supports only these invocations:

```text
dh_installer_bootstrap_v<VERSION>.exe
dh_installer_bootstrap_v<VERSION>.exe --archive <absolute-existing-zip>
dh_installer_bootstrap_v<VERSION>.exe --quarantine-partial-install
dh_installer_bootstrap_v<VERSION>.exe --quarantine-partial-install --archive <absolute-existing-zip>
dh_installer_bootstrap_v<VERSION>.exe --bootstrap-probe
```

The no-argument mode performs exact-tag GitHub download and installation. Both
installation modes, no-argument and `--archive`, require Windows, reject an
elevated token, validate all embedded constants, and validate the running
executable as a canonical plain non-reparse file before network, archive, or
workspace construction. They also require canonical `sys._MEIPASS` to be an
ordinary random `_MEI*` directory whose exact parent is
`%LOCALAPPDATA%\DynamicsHelperBootstrapRuntime\v<VERSION>`, require every ancestor
from `%LOCALAPPDATA%` down to be an ordinary non-reparse directory, and require
that runtime root and `_MEI` be disjoint from `%LOCALAPPDATA%\DynamicsHelper`
and its `updates` tree. Any mismatch exits `2` before application network/install
effects. Stale runtime children are never scanned, adopted, or executed;
PyInstaller owns current `_MEI` cleanup, and VM tests cover abrupt orphan
non-reuse. The
`--archive` mode is the offline/manual and pre-publication disposable-VM path: it
opens the supplied canonical plain non-reparse ZIP once through noninheritable
`CreateFileW(OPEN_EXISTING)` with share mode zero, and retains that single
exclusive seekable handle through embedded size/hash verification, Plan A
parsing, and stage publication. It never reopens by path. It performs no network
call and assumes the separately obtained bootstrap itself is the trust anchor;
it does not weaken archive pairing. `--bootstrap-probe` is application-level
read-only and offline: the PyInstaller onefile bootloader necessarily creates its
owned `_MEI` runtime before Python, but application code constructs no
network/filesystem/process adapter and emits one
canonical JSON line in this exact key order and compact UTF-8/LF form, with
runtime values replacing examples:

```json
{"schema":"dynamics-helper.installer-bootstrap/v1","status":"ok","version":"2.0.75-beta.1","tag":"v2.0.75-beta.1","prerelease":true,"zip_name":"DynamicsHelper_v2.0.75-beta.1.zip","zip_size":1,"zip_sha256":"<64-lowercase-hex>","pyinstaller_version":"6.22.2"}
```

Every other argv exits `2`, stdout empty, stderr exact
`invalid_bootstrap_invocation\n`, and no application-level side effect.

PyInstaller's bootloader acts before Python code, so exact `6.22.2` is itself
part of this boundary.

## Network And Download Flow

The bootstrap queries only:

```text
https://api.github.com/repos/boatmac/Dynamics-Helper/releases/tags/v<VERSION>
```

It sends `Accept: application/vnd.github+json`,
`X-GitHub-Api-Version: 2022-11-28`, a fixed safe User-Agent, and no credential.
Release JSON is bounded to 1 MiB, requires a successful terminal response within
15 monotonic seconds, and permits no redirect. Each asset download has 15-second
connect, 30-second idle-read, and 15-minute total monotonic deadlines. The JSON
decoder rejects duplicate object keys; typed readers consume only required
primitive fields and never coerce or render hostile values.

After release/asset validation, the bootstrap:

1. Exclusively creates one random workspace under the caller's existing
   canonical user `TEMP`. `TEMP` is not used for bootloader extraction; the fixed
   runtime root above owns that unavoidable effect. Before workspace creation it
   resolves Plan C's canonical desired
   install identity `%LOCALAPPDATA%\DynamicsHelper` through its existing parent
   without creating the leaf. The candidate lexical workspace must resolve after
   exclusive creation to the same canonical final workspace identity. `TEMP` and
   that workspace must be non-equal and neither ancestor nor descendant of the
   install root or its `updates` tree. The only other authoritative runtime root
   is the running bootstrap's `sys.executable` parent, which must also be
   disjoint; no scan for unknown staged/live roots or transaction authority is
   performed. The new stage and intent may be
   descendants only of this owned workspace and remain mutually disjoint. All
   ancestors must be ordinary non-reparse directories, and parent identity is
   rechecked after exclusive creation. Conflict fails before download and creates
   no install/product/transaction path.
2. Creates the ZIP with a noninheritable Windows `CreateFileW` handle, share mode
   zero and `CREATE_NEW`, then transfers that one handle into one seekable binary
   stream whose sole owner closes it exactly once.
3. Streams the exact asset response into that handle with fixed response and
   elapsed-time limits. `Content-Length` is optional; when present it must equal
   the validated metadata size. Actual bytes must always equal that size, with
   early EOF, excess bytes, or any total above archive limits rejected.
4. Flushes the file handle, seeks the same exclusive handle to zero, and computes
   SHA-256 without reopening by path. Windows directory fsync remains the
   existing explicit no-op; no stronger durability is claimed.
5. Requires downloaded size and digest to equal the already validated asset
   record and embedded ZIP digest.
6. Seeks the same handle to zero and passes it to Plan A archive validation.

The exclusive handle remains open through archive validation and stage
publication, closing the hash-to-parse replacement window. No partial ZIP or
stage is reused after failure.

## Bounded Plan A Archive Validation

Plan A remains the sole ZIP parser/extractor. `stage_and_validate_archive`
accepts either its existing path input or an already-open seekable binary input;
the bootstrap uses the latter and calls
`stage_and_validate_archive(stream, stage, expected_version=EMBEDDED_VERSION)`.
Both forms enforce one immutable default limits object:

```text
MAX_ARCHIVE_BYTES=268435456
MAX_BOOTSTRAP_BYTES=134217728
MAX_ARCHIVE_ENTRIES=20000
MAX_ARCHIVE_ENTRY_BYTES=134217728
MAX_ARCHIVE_EXPANDED_BYTES=536870912
MAX_ARCHIVE_COMPRESSION_RATIO=200
```

All maxima are inclusive; bootstrap metadata/running size must be in
`1..134217728`, and one byte or one entry over any limit maps to fixed
`package_archive_limits_exceeded`. Before constructing `zipfile.ZipFile`, a
bounded tail reader validates a single EOCD/ZIP64 locator/record chain, rejects
multi-disk archives and trailing non-ZIP data, requires the central-directory
offset/size inside the already bounded stream, and enforces entry count in
`1..20000`. It then performs a constant-memory bounded walk of central-directory
headers inside the declared byte range, counts every record, bounds each
variable-length field before seeking, and requires exact record count and exact
end offset equal the EOCD/ZIP64 declarations. The first local-file header must be
at byte zero; self-extracting/concatenated prefixes and suffixes are rejected, and
the central-directory offset must be absolute with no `ZipFile` concatenation
adjustment. Tests compare the bounded walked range with `ZipFile`'s effective
start/central/end range and reject any nonzero adjustment. Declared/actual
disagreement fails before `ZipFile` construction. Only then may `ZipFile`
materialize metadata. Before opening an
entry, central-directory preflight enforces archive size, every declared file
size, cumulative expanded size, and
`file_size <= max(1, compress_size) * 200`. Existing traversal,
absolute/drive path, ADS/reserved-name, duplicate/case-collision,
ancestor-conflict, encryption, directory, link/reparse, and unsupported-type
checks remain mandatory.

Extraction copies fixed-size chunks into exclusive files, counts actual bytes,
and rejects any declared/actual mismatch or limit overrun before accepting the
stage. Any failure removes only the validator-owned temporary stage. Complete
manifest, metadata-link, missing/extra path, browser identity, and SHA-256
validation still run before atomic stage publication.

`write_deterministic_archive` also applies the same limits to release input so
the producer cannot create an artifact the consumer must reject. Plan A adds
`package_archive_limits_exceeded` to its fixed package error allowlist.

## Direct Installation Flow

No package-contained PowerShell installer is active. `installer_core.ps1`,
`install.bat`, and the old downloader are removed from release staging and from
Plan A's package-only required paths. `host/package_manifest.py`, its tests, and
release fixtures change `SERIALIZED_PACKAGE_ONLY_PATHS` to the empty tuple;
`update-manifest.json` remains Plan A's implicit non-self-hashed singleton. All
three scripts and the external bootstrap must be absent from generated manifest,
release-integrity, installed-product, archive file inventory, and live product.
Their tracked repository copies become
inert migration notices that never launch, extract, download, register, or
mutate product data. Their canonical source bytes are ASCII-compatible UTF-8
without BOM, LF-only, and exactly one trailing LF. `installer_core.ps1` and
`dyhelper_installer.ps1` are each byte-for-byte:

```powershell
[Console]::Error.WriteLine('Dynamics Helper installation now requires the matching versioned dh_installer_bootstrap executable from the GitHub release.')
exit 64
```

`install.bat` is byte-for-byte:

```bat
@echo off
>&2 echo Dynamics Helper installation now requires the matching versioned dh_installer_bootstrap executable from the GitHub release.
exit /b 64
```

`.gitattributes` assigns `text eol=lf` to all three paths. Each direct invocation
exits `64`, stdout empty, and stderr is the exact ASCII sentence above followed
by Windows CRLF. No other source byte or runtime output is permitted.

After Plan A returns a canonical `ValidatedPackage`, the bootstrap requires the
exact plain non-reparse staged entry:

```text
<stage>\host\dh_native_host.exe
```

Before any staged executable launch, the bootstrap enumerates exactly the
validated package's declared regular-file inventory without following reparse
points, canonicalizes every path under the stage, removes only its
`Zone.Identifier` alternate stream, and verifies absence. Windows
`ERROR_FILE_NOT_FOUND` or `ERROR_PATH_NOT_FOUND` means absent; a retained stream
or any other inspection/removal/access/provider error fails closed before
execution. Tests cover every declared file and reject extra, reparse, or
path-escaping entries. This changes NTFS metadata only; regular-file bytes and
package hashes remain identical. Online and `--archive` modes use the same gate.

It creates canonical external intent JSON in a sibling workspace directory,
outside the validated package, with exactly:

```json
{"beta_channel_enabled":<validated-release-prerelease-boolean>}
```

Stable fixtures serialize literal `false`; prerelease fixtures serialize literal
`true`, each from the embedded validated prerelease constant; online mode also
requires GitHub's release field to equal it. The bootstrap puts
`DYNAMICS_HELPER_INSTALL_INTENT` only in the staged
child's copied environment, never mutates the parent environment, and invokes:

```text
<stage>\host\dh_native_host.exe --install-package <stage>
```

Before every external frozen child it calls `SetDllDirectoryW(NULL)`, removes
all `_PYI_*` private variables and any `PATH` entry rooted in `sys._MEIPASS`, and
sets `PYINSTALLER_RESET_ENVIRONMENT=1`. Staged installation receives the intent;
staged registration uses a fresh copied environment with that variable absent. Parent
environment bytes are never changed.

Both children use exact executable paths, `shell=False`, closed stdin, an exact
inherited-handle allowlist containing only the child's three standard handles,
creation flags that do not open another console, and a
canonical `cwd` equal to the executable's own Host root. Stdout/stderr are
separate bounded byte pipes capped at 64 KiB each; an overflow is a fixed
internal failure and raw bytes are discarded. Each child has a 15-minute
monotonic timeout. Every child is assigned before resume to a bootstrap-owned
Windows Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`; nested child
creation is allowed only inside that job. On timeout/overflow the bootstrap
terminates the job, waits up to 30 seconds for the process and active-process
count zero, and closes handles only after confirmed tree exit. If tree
termination cannot be confirmed, it returns `50` with fixed diagnostics and
retains the workspace rather than deleting files a live descendant may use.
On every normal or error outcome, not only timeout/overflow, the bootstrap waits
for both root exit and Job Object active-process count zero before workspace
cleanup. If descendants remain after the root exits, call `TerminateJobObject`,
query active-process count through the still-open query handle until zero or the
30-second deadline, then close the final job handle. Never query a closed job or
depend on last-handle kill timing. If zero cannot be confirmed, retain the
workspace and return fixed `50`.

The staged Host remains the sole installer transaction owner. It parses intent,
revalidates the staged package, acquires the operation mutex, reconciles pending
finalization, stops/waits the installed Host when required, and runs the Plan B/C
transaction contract.

Bootstrap handling of the staged Host is exact:

- `11`: invoke the same already validated staged Host only as
  `<stage>\host\dh_native_host.exe --register-installed <canonical-live-root>`.
  The bootstrap never starts live product bytes.
- `20`, `30`, `31`, or `40` with exact empty stdout/stderr: do not register and
  preserve that exit.
- `41` with exact empty stdout/stderr: do not register; emit only the fixed
  mixed-install quarantine guidance below and preserve `41`.
- `50` is valid only with empty stdout and exact stderr `early_mode_failed\n`;
  preserve exit `50` but replace raw bytes with the bootstrap's fixed failure.
- `10`, an unknown exit, timeout, output overflow, any other nonempty stream, or
  process-launch failure maps to fixed exit `50`.

Staged registration is exact:

- `0` with empty stdout/stderr: return `0`.
- `31` with empty stdout/stderr: preserve retry exit `31`.
- `50` with empty stdout and exact stderr `early_mode_failed\n`: preserve `50`
  with only fixed bootstrap diagnostics.
- Every other exit/stream/timeout/overflow/launch result maps to fixed `50`.

Explicit bootstrap quarantine mode uses a separate exact child table and does
not pass through the ordinary install/registration table:

- child `0` with empty streams: emit exact quarantine-success guidance and return
  `0`;
- child `31` with empty streams: return `31` with empty streams;
- child `42` with empty streams: emit exact no-longer-required guidance and
  return `42`;
- child `50` with empty stdout and exact `early_mode_failed\n`: emit only
  `bootstrap_internal_failure\n` and return `50`;
- every other child exit/stream/timeout/overflow/launch result maps to fixed
  bootstrap `50`.

`--register-installed` is a new frozen production-main-only early mode. Exact
arity is one absolute canonical live root, which must equal Plan C's fixed
`%LOCALAPPDATA%\DynamicsHelper` authority and be disjoint from the staged Host.
Before registry or finalization effects, the staged Host loads its own validated
package metadata, externally verifies every committed live Host/Extension/
metadata byte and exact inventory against that target, then acquires the
operation mutex, re-verifies under lock, calls `register_main_host` for the live
executable, round-trips both registry values, and settles only exact committed
installer authority through the guarded Plan C API. Exit `0` requires
acknowledgment `True`. Source Host, live Host self-invocation, wrong staged/live
identity, mutable/reparse/mixed live bytes, rolled-back/foreign authority, or
verification disagreement fails before registration/settlement and preserves
evidence. The existing ordinary `--register` source/dev behavior remains, but
the bootstrap never calls it.

Registration uses the same sanitized exact-child boundary. The validated staged
Host owns external live verification, registration, and committed
finalization/acknowledgment.
The bootstrap never reads journals, active authority, owner/cursor/ack state,
registry values, or backups.

The bootstrap removes only its owned workspace after all child handles close and
exit is confirmed. Abrupt process termination may leave an
untrusted random orphan; later runs never adopt or execute it. Disposable-VM
testing covers orphan non-reuse and cleanup guidance.

Bootstrap-local outcomes are exact:

| Condition | Exit | stdout | stderr |
|---|---:|---|---|
| Probe success | `0` | exact canonical probe JSON plus LF | empty |
| Invalid argv/runtime/elevated/constants/self/path | `2` | empty | `invalid_bootstrap_invocation\n` |
| Release/HTTP/asset/self-digest failure | `40` | empty | `bootstrap_download_failed\n` |
| Archive limit/ZIP/package/version failure | `40` | empty | `package_validation_failed\n` |
| Unclassifiable mixed/partial installation | `41` | empty | exact quarantine guidance below |
| Quarantine completed | `0` | empty | exact success guidance below |
| Quarantine no longer required | `42` | empty | `Dynamics Helper no longer finds a partial installation requiring quarantine. Run this bootstrap normally.\n` |
| Staged or registration child retry | `31` | empty | empty |
| Transaction rolled back | `20` | empty | `installation_rolled_back\n` |
| Recovery required | `30` | empty | exact three recovery lines below |
| Complete install/registration | `0` | empty | empty |
| Child launch/output/timeout/tree/internal failure | `50` | empty | `bootstrap_internal_failure\n` |

Only reviewed bootstrap templates reach its streams; dynamic quarantine paths
occupy explicit template fields after canonical validation and PowerShell-literal
escaping. Child bytes are comparison-only and never forwarded.

## Mixed Or Partial Install Quarantine

This section explicitly supersedes the August early-mode table's generic
recovery/internal-failure rows for the exact conditions below. Exit `30` remains
transaction recovery only. Exit `41` means unclassifiable installed identity with
no active transaction authority. Exit `42` means a user-requested quarantine is
no longer required.

The staged installer acquires the operation mutex and calls pending-finalization
reconciliation first. If reconciliation performs any durable cleanup, the
current invocation returns `31` immediately and does not classify, unregister,
stop, or move; the user retries. Only a no-op reconciliation followed by a clear
barrier may enter classification. If active, owner, cursor, or nonterminal
journal authority remains, ordinary resume/recovery owns it and quarantine
returns `31` without further effect. Therefore an install result `41` itself has
zero live-installation, registry, transaction, and user-file mutation.

The requested install identity must be one absent leaf or an absolute canonical
ordinary non-reparse directory under canonical existing `%LOCALAPPDATA%`. An
absent single leaf is fresh and creates nothing during classification. A
reparse/wrong-kind root, multi-level absence, or inaccessible parent is fixed
internal failure, not quarantine. Under an ordinary root, unknown top-level user
paths do not affect classification and are preserved. Exact classifications are:

- **fresh:** the single leaf is absent; or an existing ordinary root has both
  metadata files, every fixed product root (`dh_native_host.exe`, `_internal`,
  `system_prompt.md`, `register.py`, `extension`), generated `manifest.json`, and
  `updates` absent; unknown user paths may remain;
- **installed:** both metadata files are canonical/valid/coupled, version and
  capabilities agree, every declared Host file matches, and declared Extension
  files plus manifest effective version match; stale undeclared descendants are
  permitted exactly as Plan B already captures them;
- **legacy:** both metadata files are absent; all five fixed product roots exist
  with exact ordinary file/directory kinds; `_internal` and `extension` are
  recursively enumerated without following reparse points, are nonempty where
  required, contain only readable ordinary entries with no case collisions, and
  `extension/manifest.json` is ordinary, strict-valid, and supplies the prior
  effective version; root generated `manifest.json` and root `updates` are both
  absent. If either generated path exists, legacy does not match and authority/
  stale-state rules decide `31` or quarantine;
- **quarantine required:** exactly one metadata file; malformed/disagreeing
  metadata; declared/live hash/version mismatch; Extension-only state; any
  nonempty proper subset of fixed legacy roots; fixed child wrong kind/reparse/
  case collision; unreadable fixed child; generated `manifest.json` or `updates`
  without valid installed/transaction authority; or any other contradictory
  product identity. Active/finalization authority under `updates` already returns
  `31`; stale generated update state with no authority requires quarantine.

An ordinary install classifies before creating an absent root or stopping a
process. Quarantine-required returns
`EXIT_MANUAL_QUARANTINE_REQUIRED = 41` before installed-Host stop/wait, ID
generation, install-root creation, package preparation, product/config/registry
mutation, or transaction authority creation. Child stdout/stderr are empty.

On exact install exit `41`, the bootstrap returns `41`, stdout empty, and emits
UTF-8/LF bytes exactly once. It emits validated paths only as single-quoted
PowerShell literals with internal apostrophes doubled. Online mode's complete
stderr is:

```text
Dynamics Helper found an unclassifiable partial installation. No live installation, registry, or user file was changed.
Close Chrome, then run this same bootstrap in PowerShell:
& '<validated-bootstrap-path>' --quarantine-partial-install
After that succeeds, run the bootstrap normally.
```

Offline mode's complete stderr is:

```text
Dynamics Helper found an unclassifiable partial installation. No live installation, registry, or user file was changed.
Close Chrome, then run this same bootstrap in PowerShell:
& '<validated-bootstrap-path>' --quarantine-partial-install --archive '<validated-zip-path>'
After that succeeds, run the bootstrap normally with the same --archive argument.
```

The explicit quarantine bootstrap modes first obtain and Plan-A-validate the
same versioned package through the ordinary online or share-zero offline flow.
In offline mode, canonical ZIP and every ancestor are mutually disjoint from the
live root, generated quarantine root, and their descendants. A ZIP inside a tree
that may move is rejected before staged invocation, so the exact same archive
path remains valid after quarantine.
They generate a destination exactly
`%LOCALAPPDATA%\DynamicsHelper.quarantine.<YYYYMMDDTHHMMSSZ>.<32-lowercase-hex>`
using injected UTC/CSPRNG, then invoke only the validated staged Host:

```text
<stage>\host\dh_native_host.exe --quarantine-partial-install <canonical-live-root> <canonical-quarantine-root>
```

The new early mode is staged-role-only, not merely production-main-only. Before
dependencies it requires executable exact `<stage-root>\host\dh_native_host.exe`,
canonical plain stage/host ancestors, strict validation of the complete staged
package against its own version, and rejects source mode or live-root
self-invocation. It then validates exact arity and requires live root byte-for-
byte equal canonical fixed `%LOCALAPPDATA%\DynamicsHelper` identity,
same-parent/same-volume quarantine grammar, absent destination, and disjointness.
Under operation mutex it reconciles/barriers and reclassifies. Fresh/installed/
legacy returns `EXIT_QUARANTINE_NOT_REQUIRED = 42`; mixed continues.

Before any registry/RunOnce mutation, the staged Host opens the exact live root
directory with `DELETE|FILE_READ_ATTRIBUTES`, share mode
`FILE_SHARE_READ|FILE_SHARE_WRITE` (deliberately no `FILE_SHARE_DELETE`),
`OPEN_EXISTING`, and
`FILE_FLAG_BACKUP_SEMANTICS|FILE_FLAG_OPEN_REPARSE_POINT`. It records canonical
final path and volume/file identity. This handle namespace-locks the source root
against another rename and is the handle used for the eventual rename.

It then snapshots all Chrome/Edge main/status Native Host registry values. Main
values must both be absent or equal canonical live manifest; status values both
absent or equal canonical live recovery status manifest. For every referenced
manifest it opens a retained read/content identity handle with write sharing
disabled, records exact canonical bytes/hash/path/file identity, and validates
strict manifest contents. Through Plan C's injected `RunOnceStore`, it snapshots
exact `DynamicsHelperUpdateRecovery`; its command must be absent or strict-valid
for canonical live recovery runner/active mode, whose file identity is also
captured before mutation. Split/foreign/missing/replaced values fail with no
mutation. Before mutation it also opens every existing fixed executable candidate
with read/attribute access and share mode
`FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_SHARE_DELETE`, records exact final path,
ordinary/non-reparse kind, volume/file identity, and keeps these snapshot handles
open. All snapshot child handles permit the later root-directory rename.

Only after all root/manifest/runner identity evidence is retained does it
unregister both Native names, remove RunOnce, verify all three absent, then
stop/wait exact live `dh_native_host.exe`,
`dh_update_status_host.exe`, and `dh_update_runner.exe` identities, and
re-enumerates until none remain under a separate 30-second monotonic drain
deadline. Drain timeout occurs before move while the staged Host is alive and
uses the identity-gated restoration rule below. It then opens every existing fixed executable
candidate (`dh_native_host.exe`,
`updates/recovery/dh_update_status_host.exe`, and
`updates/recovery/dh_update_runner.exe`) through injected `CreateFileW` with
`FILE_READ_ATTRIBUTES`, share mode exactly `FILE_SHARE_DELETE`, `OPEN_EXISTING`,
and `FILE_FLAG_OPEN_REPARSE_POINT`. It validates each handle's final path, file
identity, ordinary-file kind, and non-reparse status. Existing process opens make
this acquisition fail; once acquired, the handles allow same-volume rename but
deny a new executable read/open. Each restrictive handle must match the
corresponding pre-mutation snapshot volume/file identity and source path. Hold all
snapshot/restrictive/root/manifest handles through move/postconditions.
Recheck both Native/RunOnce absence, zero old/quarantine process identities, and mixed
classification immediately before move. Any pre-move failure keeps identity
handles open and applies one restoration rule: restore prior Native/RunOnce
values only when root handle still has original
identity/exact source path, every referenced manifest handle has original
identity/path/bytes, and each executable/runner identity can be revalidated at
its exact source descendant. Revalidate immediately before each restore write.
If any evidence cannot be verified, keep registration absent, classify
uncertainty, and return `50`. Successful restoration is round-trip verified
through owning adapters; only then close all handles.

The move is identity-bound and never resolves the source path again. It calls
injected Win32 `SetFileInformationByHandle` on the retained root handle with
`FileRenameInfo`, `ReplaceIfExists=FALSE`, `RootDirectory=NULL`, and the exact
absolute quarantine destination. The root handle has `DELETE` access and excludes
delete sharing, so no concurrent source rename can win. Handle rename remains
same-volume and fails if destination exists. Success requires source absent,
destination an ordinary canonical directory, registry absent, all process sets
empty, all executable and root-directory barrier handles still held, and
operation mutex held. It
queries process image paths for both old and quarantine candidates again before
success. Every retained barrier handle must still have its original file identity
and its final path must equal the exact corresponding quarantine descendant; an
old path or any third path is post-move uncertainty. After success Native/RunOnce
registration remains absent and old paths no longer exist, so Chrome cannot
launch old code. The root directory
handle must retain the original volume/file identity and its final path must be
the exact quarantine root; root substitution or a different destination identity
is uncertainty. Close barrier handles only after these checks.
The complete quarantine stays intact.

Move outcome handling is exact. If `SetFileInformationByHandle` fails, not-moved
requires source is the original ordinary root, destination absent, and retained
root handle still has original identity and exact source final path. Keep every
root/manifest/snapshot/restrictive identity handle open, restore Native/RunOnce
exactly, round-trip verify restoration while those handles remain valid, then
close them and return `50`; any handle/path/content mismatch is
uncertainty and never restores registration. If move succeeds and source is absent
while destination is the expected ordinary root, keep registry absent and apply
success postconditions. Any source/destination/access combination outside those
two rows is post-move uncertainty: keep registry absent, best-effort terminate
only exact old/quarantine process identities, do not move/restore/delete either
root, return child `50` with `early_mode_failed\n`, and let bootstrap emit only
fixed `bootstrap_internal_failure\n`. Dynamic candidate paths never enter the
runtime error stream; documentation tells the user to inspect both fixed naming
patterns.

Successful quarantine returns child `0` with empty streams. Bootstrap stdout is
empty and stderr is UTF-8/LF with the exact validated quarantine path:

```text
Dynamics Helper moved the partial installation to:
<canonical-quarantine-root>
Run this bootstrap again without --quarantine-partial-install.
After installation, inspect the quarantine before manually restoring only config.json, copilot-instructions.md, or user_prompt.md.
Do not restore product files, release-integrity.json, installed-product.json, manifest.json, or updates.
```

No automatic restore is supported. Documentation permits only `config.json`,
`copilot-instructions.md`, and `user_prompt.md` as manual review/restoration
candidates after successful fresh install. It forbids executables, `_internal`,
`extension`, product metadata, generated `manifest.json`, and `updates/**`;
unknown data remains in quarantine.

The exact early-mode additions are:

| Mode/state | Exit | stdout | stderr |
|---|---:|---|---|
| `--install-package`, no authority, mixed/partial identity | `41` | empty | empty |
| `--quarantine-partial-install`, authority/contention remains | `31` | empty | empty |
| `--quarantine-partial-install`, state is fresh/installed/legacy | `42` | empty | empty |
| `--quarantine-partial-install`, atomic move and postconditions pass | `0` | empty | empty |
| `--quarantine-partial-install`, safe failure/uncertainty | `50` | empty | `early_mode_failed\n` |

Tests cover every classification row, unknown-user preservation, root/reparse/
access cases, absent-root ordering, operation-lock/reconciliation order, exact
exit/stream/bootstrap bytes, registry snapshot/unregister/restore, split/foreign
denial, exact process identity wait, executable barrier handle flags/final-path/
identity validation, blocked concurrent executable open, restart-race recheck,
30-second drain timeout with exact Native/RunOnce restoration, RunOnce
snapshot/clear/foreign denial, destination collision, atomic move flags, exact
two-row/uncertain outcome matrix,
online/offline command path escaping, fresh rerun after move, and absence of any
automatic restore/copy path. Both online/offline bootstrap quarantine modes and a
disposable-VM exit-41/quarantine/fresh-rerun scenario are mandatory.

## Recovery Guidance

The August early-mode table remains authoritative. Valid staged
`--install-package` exit `30` has empty child stdout and stderr. No Python Host
recovery payload or transaction-specific side channel is added.

On exact exit `30`, the bootstrap emits these three lines exactly once on its own
stderr and returns `30`:

```text
Dynamics Helper installation requires manual recovery.
Recovery evidence: $env:LOCALAPPDATA\DynamicsHelper\updates\transactions
Run: & "$env:LOCALAPPDATA\DynamicsHelper\updates\recovery\dh_update_runner.exe" --recover-active
```

It never echoes child output, parses `active.json` or a journal, enumerates
transactions, deletes backups, or invents a transaction ID. This stable
container plus `--recover-active` contract supersedes only the July requirement
to print transaction-specific journal/backup leaves and an ID-specific command.
Those values are unavailable under the approved empty-stream and Python-state
ownership boundaries without a new side channel.

## Host Gate And Historical Migration

Protected product actions remain exactly `analyze_error`, `update_config`,
`get_config`, and `list_models`; they require cached capability and valid
integrity. Packaged integrity requires Host version, loaded Extension version,
and expected version equality. Development integrity intentionally omits
Extension version: valid development mode permits protected Analyze/config/model
actions after Host capability validation but selects update protocol `disabled`.
No packaged version-equality predicate is applied to development mode.

Recovery/diagnostic actions `ping`, `health_check`, `get_capabilities`,
`verify_installation`, and `check_updates` remain callable without a successful
capability/integrity gate. They still use the shared main client, suppression
rules, strict response parsers, and fixed safe errors.

The five update-execution actions remain coordinator-only:
`check_update_ready`, `perform_update`, `activate_update`,
`finalize_update_status`, and `acknowledge_update_finalization`. Ordinary
`NATIVE_MSG` cannot forward them. The coordinator emits them only after strict
positive mode classification:

| Capability | Integrity | Classification |
|---|---|---|
| Valid, includes `transactional-update-v1` | Exact packaged/verified and all versions equal | `transactional` |
| Valid, lacks transactional capability | Exact packaged/verified and all versions equal | `legacy` |
| Valid and Host version equals development integrity Host version | Exact development/development, no Extension version | `disabled` for update execution; protected actions allowed |
| Exact pre-Plan-A `unknown_action` | Unknown/unavailable | `host_protocol_incompatible` |
| Malformed/mismatched | Any | fixed gate failure |

Pre-Plan-A source and packaged Hosts are wire-identical. A new Plan D Extension
must never classify dual `unknown_action`, version heuristics, health, or config
fields as packaged legacy and must never send that Host `perform_update`.

The only bounded historical route is the already-shipped old Extension plus old
packaged Host executing their existing updater before Plan D code controls the
session. The first new Worker then requires exact target packaged integrity. A
mixed new Extension/old Host, failed/no-op legacy update, or any unverifiable old
Host is directed to the standalone bootstrap. This explicitly narrows the July
statement that update execution remains available without successful capability
classification; diagnostic checking remains available, but new Plan D code does
not execute an unclassified old updater.

Source mode returns exact `source_update_disabled`. Terminal expected-install
checks still bind Host and Extension to the target before final disposition.

## Build And Publication Order

Exact PyInstaller `6.22.2` must be separately authorized and provisioned in
`host/venv`; build code never installs or upgrades it. The reviewed Windows
AMD64 PyInstaller distribution identity is exact:

```text
filename=pyinstaller-6.22.2-py3-none-win_amd64.whl
size=1405725
sha256=9b990fa6bbe143572f06644a984ad0d7aa2e2ccc6929d4916031343a5888e9a7
requires-python=>=3.8,<3.16
```

The retained wheel at exact ignored path
`.scratch/toolchain/pyinstaller-6.22.2-py3-none-win_amd64.whl` must match that
filename, size, and SHA-256 before separately authorized installation. Build
preflight resolves `PyInstaller.__file__`, package metadata, and version from
`host/venv`, requires canonical ordinary non-reparse paths, exact version
`6.22.2`, and invokes only `host/venv/Scripts/python.exe -m PyInstaller` with the
reviewed argv. It records the resolved module path and version in frozen
evidence.

The local CPython installation, `host/venv`, its direct/transitive packages,
`.pth`/site initialization, hooks, and `extension/node_modules` are explicit
trusted operator-controlled build prerequisites. Plan D does not claim to resist
a malicious local administrator, compromised Python/npm dependency environment,
or build-machine code execution. The wheel hash is provenance for the separately
approved PyInstaller installation, not a complete reproducible-build or
supply-chain proof. Such hardening would require a separately designed locked
toolchain.

Build source is a new detached worktree at the exact reviewed HEAD under an
owned temp root. It must contain no untracked/ignored source before the hash-bound
generated bootstrap entry is exclusively added. PyInstaller Analysis paths and
release data inputs may name only that tracked worktree, the generated entry,
and trusted dependency roots; the original workspace is never a source/data
input. Tests inject alternate Analysis/data paths and require rejection.

`tools/plan_d_frozen_contract.json` binds exact PyInstaller version/wheel
provenance, project module sets, complete Host/auxiliary test inventory, frozen
argv, and test-only entry paths. Frozen artifact inventories, probes, and package
hashes remain the executable output gates.

Release order is fail-fast:

1. Commit exact version/input changes and require a clean tracked HEAD.
   Before every build, require empty
   `git ls-files --others --exclude-standard` and separately enumerate the full
   ignored inventory with `git ls-files --others --ignored --exclude-standard`.
   Every ignored path must be an ordinary non-reparse descendant of exactly one
   frozen-contract prefix: `host/venv/` trusted Host/build dependency,
   `extension/node_modules/` lockfile dependency, or exact
   `.scratch/toolchain/pyinstaller-6.22.2-py3-none-win_amd64.whl` provenance;
   `build/`, `dist/`, `extension/dist/`, root `*.spec` generated output; or exact
   H-scoped `.scratch/plan-d-pre-cutover/` / `.scratch/final-review/plan-d/`
   evidence. Any other ignored path, including `.env*`, `__pycache__`, `.pyc`,
   hook/config/source file, or unexpected release artifact blocks. Build command
   import/data inputs may consume only tracked HEAD source, verified dependency/
   toolchain roots, and hash-bound generated entry; output/evidence roots are
   never imports. Enumerate approved roots separately and reject unknown/reparse inputs. Build
   commands consume only tracked HEAD source plus the retained verified wheel and
   generated entry whose bytes are hash-bound; no untracked source is importable
   through `PYTHONPATH`, Vite inputs, PyInstaller paths, hooks, or data lists.
2. Build Extension and product onedir from that HEAD.
3. Stage/validate the product, create deterministic ZIP, and compute its digest.
4. Generate the isolated bootstrap entry constants and build the onefile asset.
5. Run complete source, archive, product-frozen, bootstrap-frozen, inventory,
   module-graph, asset-name, digest, and ZIP-exclusion gates.
6. Recheck source tree/HEAD unchanged; only then create the exact lightweight
   version tag at
   that HEAD.
7. Before any remote mutation, preflight exact
   `GET /repos/boatmac/Dynamics-Helper/immutable-releases`; require canonical
   `{enabled:false,enforced_by_owner:false}` before draft creation. Also require
   authenticated fully paginated repository-release and exact-tag queries prove
   no public or draft release with that tag exists; a public-only query is
   insufficient. If repository
   immutability is enabled/enforced, Plan D publication is unsupported and stops
   before any push or release mutation.
8. With separate publication approval, push only the exact branch and lightweight
   tag refs. Re-run the immutable-policy/no-release preflight immediately after
   push, then resolve exact remote `refs/tags/v<VERSION>` directly to the expected
   40-hex product commit; annotated tags are rejected rather than peeled. If the
   second preflight fails, create no release and leave the valid remote refs
   unchanged for explicit later retry; release readiness remains BLOCKED.
9. Create a
   repository-qualified draft, capture and validate its numeric release ID,
   exact tag, exact `target_commitish` equal that 40-hex product commit,
   `immutable:false`, and `prerelease` derived from the
   embedded constant. Release title is exact `v<VERSION>`. Body is either the
   reviewed fallback template or exact validated UTF-8/no-BOM notes-file bytes;
   capture `releaseBodySha256` before mutation. Both forms name only the exact
   versioned bootstrap and contain no active ZIP extraction, root script,
   `aka.ms | iex`, or single-asset instruction. Upload each asset through GitHub's raw release-asset API
   with an explicit `Content-Type`: bootstrap `application/octet-stream`, ZIP
   `application/zip`; `gh release upload` MIME inference is not used. Query by
   that captured ID, and require
   exact captured release-ID/draft/tag/target/channel/mutability/title/body/body hash,
   `state:'uploaded'`, names, content types,
   sizes, and digests.
10. Publish only that validated release ID. Whether publish succeeds, fails,
   times out, or returns malformed data, query that ID before disposition. Only
   an explicit successful publish response followed by verified public state is
   eligible for success. If it is public, query the public exact tag and require `draft:false`, exact
   `immutable:false`, stable/prerelease value, exact captured release ID, tag,
   target commit OID, title/body/body hash, and both `state:'uploaded'`, names,
   content types, sizes, and digests. A confirmed still-draft result remains a
   draft for explicit operator recovery. Every Git/GitHub failure propagates.

If the publish response is failed/ambiguous, or by-ID/public re-query or
digest/channel/target verification fails after a possibly successful publish,
the same explicit publication authorization preauthorizes one containment action:
exact `PATCH /repos/boatmac/Dynamics-Helper/releases/<captured-validated-id>` with
body `{"draft":true}`. Automation performs it once, then queries by that ID with
authenticated draft visibility and requires exact captured release ID,
`draft:true`, `immutable:false`, unchanged tag/target/prerelease/title/body/body
hash/assets/digests.
It never deletes/re-uploads/retries publish.
If re-draft or verification fails, automation stops with fixed incident guidance.
In either case release readiness remains BLOCKED and exact local assets, tag
target, failure classification, containment response, and transcript are
retained. No automated containment can retract already downloaded bytes, so a
failed or ambiguous public verification is an incident gate, never success. An
immutable release is rejected before draft creation and is never an eligible
Plan D publication target.

The release helper never treats an existing tag as acceptable without verifying
its target, never pushes all tags, never swallows publication failure, and never
publishes before both asset digests are verified. No release operation occurs in
ordinary Plan D automated verification.

## Frozen Evidence Rebaseline

Historical Plan C checks at their fixed commit keep exact `6.18.0`, `73/10`, and
`15/15` labels. Fresh C-D0 and Plan D evidence never copies those values.

The canonical frozen contract contains these exact tracked project-module sets:

```text
C_D0_PRODUCT_REQUIRED=early_cli,install_integrity,native_messaging,native_registration,package_archive,package_manifest,product_info,update_engine,update_entrypoint,update_journal,update_mutex,update_ownership,update_platform,update_recovery,update_status_host
PLAN_D_PRODUCT_REQUIRED=early_cli,install_integrity,native_messaging,native_registration,package_archive,package_manifest,product_info,update_engine,update_entrypoint,update_installer,update_journal,update_mutex,update_operation,update_ownership,update_platform,update_recovery,update_service,update_status_host
PLAN_D_PRODUCT_FORBIDDEN=dh_bootstrap_process_probe,installer_bootstrap,updater
INSTALLER_BOOTSTRAP_EXACT=installer_bootstrap,package_archive,package_manifest,product_info
BOOTSTRAP_PROCESS_PROBE_EXACT=dh_bootstrap_process_probe
```

Product required sets are containment checks plus the exact forbidden set;
bootstrap and test-probe sets are exact equality over tracked project modules.
The generated bootstrap entry is separately hash-bound and is not a tracked
project module.

The complete Host test inventory is the existing sorted 42 paths plus exact new
`host/test_installer_bootstrap.py`, for 43. Root auxiliary tests are exactly
`test_dev_switch.py`, `test_installer_scripts.py`,
`tests/test_plan_d_final_evidence.py`, and legacy `tests/test_pii.py`; they are
not Host discovery modules. Existing zero-test Host helpers remain exactly
`host/test_analyze_flow.py`, `host/test_analyze_full.py`,
`host/test_analyzer.py`, and `host/test_update_support.py`.

Auxiliary evidence runs `test_dev_switch.py` through discovery and requires a
positive test count, exit `0`, exact final `OK`, and zero failure/error/skip. It
includes named tests proving dev and prod registry target values/call counts stay
byte-identical to pre-amendment behavior, missing production files emit only
bootstrap guidance, and no active `install.bat` text remains. It retains legacy
`tests/test_pii.py` at exact blob
`b815285a3ff6120c1661795e92a676be5ec1d8c0`, requires exactly four tests, exact
failures `test_scrub_guid` and `test_scrub_subscription_id`, and zero errors/skips;
authoritative `host/test_pii_scrubber.py` remains GREEN in Host shards. Any legacy
blob/outcome drift blocks for separate cleanup rather than being relabeled.

Ordinary source shards permit exactly three selector/reason skips:

```text
host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation | DH_PLAN_C_FROZEN_ONEDIR not set
host.test_installer_bootstrap.BootstrapFrozenProbeTests.test_built_bootstrap_probe_matches_embedded_contract | DH_INSTALLER_BOOTSTRAP_EXE not set
host.test_installer_bootstrap.BootstrapFrozenProcessBoundaryTests.test_real_onefile_process_boundary | DH_BOOTSTRAP_PROCESS_PROBE not set
```

Fresh frozen gates supply each canonical path in a separate isolated child and
require exactly one test, `OK`, and zero skip. The tracked test-only entry is
exact `host/dh_bootstrap_process_probe.py`; it is excluded from product Host,
product ZIP, bootstrap, and published assets.

Because PyInstaller `6.22.2` layout counts are unknown before authorized build,
the plan never substitutes guessed counts. After bootstrap implementation and
tests are committed, exact wheel/version/module-path preflight passes, and the first clean
pre-cutover HEAD builds all three artifacts, `capture-pre-cutover` exclusively
creates a canonical H-scoped scratch baseline containing:

- exact HEAD/tree and frozen-contract SHA-256;
- wheel identity, trusted resolved `PyInstaller` module path, and runtime version;
- complete sorted POSIX-relative product onedir root/internal file and directory
  path arrays plus canonical layout SHA-256;
- exact module sets above and complete 43-path Host test inventory/hash;
- exact bootstrap filename/size/SHA-256/probe JSON;
- exact process-probe filename/SHA-256 and one-test boundary result;
- exact product ZIP filename/size/SHA-256 and exclusion assertions.

Paths are exact and ignored by root `.gitignore`:

```text
.scratch/plan-d-pre-cutover/<H>/frozen-baseline.json
.scratch/plan-d-pre-cutover/<H>/frozen-observation.json
.scratch/plan-d-pre-cutover/<H>/receipt.json
.scratch/final-review/plan-d/<H>/frozen-observation.json
```

`capture-pre-cutover` exclusively creates the absent H directory and all three
files; any preexisting path, reparse ancestor/entry, unknown child, partial file,
or collision fails rather than being adopted. Each is canonical compact JSON,
ASCII escaped, UTF-8 without BOM, exact key order, and one trailing LF.
For each file, write through an exclusive sibling descriptor, flush, `fsync`,
close, then publish through a no-clobber same-volume move into its fixed absent
destination and exact-read back. On Windows use a primitive that fails when the
destination exists; overwrite-capable `os.replace` is not the no-clobber step.
After baseline and observation durability, write/flush/read back the receipt last;
only a durable PASS receipt permits Task 13. Windows directory fsync follows the
project's explicit no-op contract; file durability and read-back are mandatory.

The baseline has exact top-level keys `schema`, `headOid`, `treeOid`,
`contractSha256`, `toolchain`, `productOnedirLayout`, `moduleSets`, `hostTests`,
`artifacts`. Schema is `dynamics-helper.plan-d.frozen-baseline/v1`.
`toolchain` records the trusted Python executable/version plus exact PyInstaller
wheel provenance, resolved module path, and runtime version;
`productOnedirLayout` contains exact sorted arrays `rootDirectoryPaths`,
`rootFilePaths`, `internalDirectoryPaths`, `internalFilePaths`, then
`layoutSha256`; `moduleSets` reproduces contract arrays and includes exact
`projectModuleSetSha256`; `hostTests` reproduces its separate arrays/hash;
`artifacts` contains exact product ZIP, bootstrap, and process-probe
filename/size/SHA-256/probe evidence.

All baseline/receipt nested schemas are exact and ordered:

```text
baseline.toolchain: pythonExecutable,pythonVersion,pyinstallerVersion,pyinstallerWheelFilename,pyinstallerWheelSize,pyinstallerWheelSha256,pyinstallerModulePath
baseline.moduleSets: cD0ProductRequired,planDProductRequired,planDProductForbidden,installerBootstrapExact,bootstrapProcessProbeExact,projectModuleSetSha256
baseline.hostTests: modulePaths,hostTestModuleSetSha256,zeroModulePaths,auxiliaryTestPaths
baseline.artifacts: productZip,installerBootstrap,bootstrapProcessProbe
baseline.artifacts.productZip: filename,size,sha256,excludedPaths
baseline.artifacts.installerBootstrap: filename,size,sha256,probeJson,probeJsonSha256
baseline.artifacts.bootstrapProcessProbe: filename,size,sha256,boundaryTests,boundaryFailures,boundarySkips,markedProcessesRemaining
receipt.gateSummary: hostTests,hostFailures,hostSourceSkips,hostFrozenSkips,extensionTests,extensionFailures,extensionSkips,extensionTodos,publicAssetTests,publicAssetFailures,publicAssetSkips,publicAssetTodos,publicAssetSha256
```

Canonical hash preimages use ASCII-escaped compact JSON, exact listed key order,
and one LF. `layoutSha256` hashes exactly the ordered object containing the four
layout arrays. `contentInventorySha256` hashes sorted tuples
`[relativePath,size,sha256]` for every ordinary non-reparse product onedir file.
`projectModuleSetSha256` hashes this exact ordered object:
`{"cD0ProductRequired":[...],"planDProductRequired":[...],"planDProductForbidden":[...],"installerBootstrapExact":[...],"bootstrapProcessProbeExact":[...]}`
plus one LF, using the exact arrays above. `hostTestModuleSetSha256` separately
hashes exact `{"modulePaths":[...],"zeroModulePaths":[...],"auxiliaryTestPaths":[...]}`
plus LF. Each `commandSha256` hashes a canonical JSON array of ordered records
`{"cwd":"<POSIX-relative>","argv":[...]}` plus one LF. `contractSha256`, `baselineSha256`, observation hashes, and receipt hash
cover complete canonical file bytes. Artifact SHA-256 values cover exact file
bytes; `probeJsonSha256` covers exact canonical probe stdout including LF. No
hash derives from a count, display text, unordered map, or omitted nested data.

`baseline.artifacts.productZip.excludedPaths` is exact ordinal-sorted
`["dh_installer_bootstrap_v<VERSION>.exe","dyhelper_installer.ps1","host/dh_bootstrap_process_probe.py","host/installer_bootstrap.py","host/test_installer_bootstrap.py","install.bat","installer_core.ps1","test_installer_scripts.py","tools/plan_d_final_evidence.py","tools/plan_d_frozen_contract.json"]`.
The ZIP gate also requires generated bootstrap entry/spec/build paths absent,
even though their H-specific names are verified separately rather than stored in
this tracked-path list.

Fields ending `Sha256` are lowercase 64-hex byte hashes. Git object fields
`headOid`, `treeOid`, `sourceBlob`, and `headBlob` are lowercase 40-hex SHA-1
under this repository's current object format and are never validated with
SHA-256 grammar. `git cat-file -t` must report `commit`, `tree`, and `blob`
respectively for each referenced OID. The helper
also records and requires `git rev-parse --show-object-format` exact `sha1`; any
future object-format change requires a reviewed schema revision.

Both observations have exact keys `schema`, `headOid`, `treeOid`,
`contractSha256`, `baselineSha256`, `toolchain`, `productOnedir`,
`installerBootstrap`, `bootstrapProcessProbe`, `hostTests`, `extensionTests`,
`publicAssetTests`, `verdict`, in that order. Schema is
`dynamics-helper.plan-d.frozen-observation/v1`. Nested key order and types are:

```text
toolchain: pythonExecutable,pythonVersion,pyinstallerVersion,pyinstallerWheelFilename,pyinstallerWheelSize,pyinstallerWheelSha256,pyinstallerModulePath
productOnedir: layoutSha256,contentInventorySha256,observedProjectModules,missingRequiredModules,forbiddenModulesFound,probe
installerBootstrap: filename,size,sha256,probeJson,probeJsonSha256,observedProjectModules,missingRequiredModules,unexpectedProjectModules,probe
bootstrapProcessProbe: filename, size, sha256, observedProjectModules, missingRequiredModules, unexpectedProjectModules, boundary, markedProcessesRemaining
hostTests: hostTestModuleSetSha256, collected, executed, failures, skips, zeroModules
extensionTests: commandSha256, testFilePaths, tests, failures, skips, todos
publicAssetTests: commandSha256, testFilePath, tests, failures, skips, todos, sourcePath, sourceTracked, sourceIgnored, sourceBlob, headBlob, sourceSha256, distPath, distSha256
probe|boundary: tests, failures, skips
```

All path/module arrays are ordinal-sorted unique strings. Sizes/counts are exact
non-boolean integers and hashes are lowercase 64-hex. Every failure/todo and
marked-process field is zero. Ordinary source `hostTests.skips` is exactly three,
matching the three selector/reason rows above; each separately supplied frozen
`probe.skips`/`boundary.skips`, Extension skips, and public-asset skips is zero.
Positive test fields are greater than zero and `verdict` is exact `PASS`.
Pre-cutover `headOid/treeOid` bind Task 12's clean product HEAD; final observation
binds Task 13's clean cutover HEAD. The final path is exclusively created by
`prepare-review` before substantive review.

`extensionTests.commandSha256` hashes canonical exact argv records for
the literal records below, with exact `cwd` string and executable token:

```json
[{"cwd":"extension","argv":["npm.cmd","run","test:run","--","--reporter=json"]},{"cwd":"extension","argv":["npm.cmd","exec","tsc","--","--noEmit","-p","tsconfig.json"]},{"cwd":"extension","argv":["npm.cmd","run","build"]}]
```

`testFilePaths` is the complete ordinal-sorted unique Vitest JSON
file list; totals reconcile all assertions with no failure/pending/todo, and both
TypeScript/build exits are zero.

`publicAssetTests.commandSha256` binds exact argv
through canonical record
`[{"cwd":".","argv":["C:\\Program Files\\nodejs\\node.exe","--test","--test-reporter=tap","extension/test/defaultItems.test.mjs"]}]` plus LF.
`testFilePath` is exact `extension/test/defaultItems.test.mjs`; totals are exactly
five tests, five pass, zero fail/skip/todo. `sourcePath` is
`extension/items.json`, `distPath` is `extension/dist/items.json`, both hashes
are exact `839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25`,
bytes are equal, `sourceTracked:true`, `sourceIgnored:false`, and
`sourceBlob == headBlob == git hash-object(source bytes)`. Build precedes dist
comparison. Any command/path/test identity, tracked/ignore/blob, source, HEAD,
dist, or five-test mismatch blocks observation creation.

The receipt has exact keys `schema`, `headOid`, `treeOid`, `contractSha256`,
`baselinePath`, `baselineSha256`, `observationPath`, `observationSha256`,
`gateSummary`, `verdict`. Schema is
`dynamics-helper.plan-d.pre-cutover-receipt/v1`; paths are exactly the two sibling
paths above, hashes cover exact bytes, `gateSummary` carries positive Host/
Extension/public-asset totals, exact `hostSourceSkips:3`, and zero
`hostFrozenSkips`/Extension/public-asset failure/skip/todo values; verdict is
`PASS`. Tests freeze every nested key/type/order and reject booleans as integers.

Baseline capture rejects duplicates, case collisions, absolute/backslash/dot
segments, reparse entries, unknown product-root children, missing/forbidden
modules, an unexpected test path, any unapproved skip/failure, or same-count path
substitution. It exclusive-creates one H-scoped scratch receipt; it never
overwrites or lets the producing build silently approve a failed static contract.
Independent review covers the full path arrays before the final docs/evidence
commit stores byte-identical baseline bytes at
`.superpowers/sdd/plan-d-frozen-baseline.json`. It also stores byte-identical:

```text
.superpowers/sdd/plan-d-pre-cutover-frozen-observation.json
.superpowers/sdd/plan-d-pre-cutover-receipt.json
.superpowers/sdd/plan-d-final-frozen-observation.json
```

Before that commit, Task 13 and
every verifier read only the exclusive scratch baseline identified and hash-bound
by the pre-cutover receipt; no step expects the future committed path. After the
final evidence commit, validators require all four committed evidence files equal
their receipt/review-bound scratch sources byte-for-byte, then use committed
paths. Task 14 uses `git add -f` for these four ignored files and the report
together; its exact cached set and review bind every blob. No earlier commit
force-adds scratch copies. A clean clone therefore contains every evidence byte
needed to revalidate the committed evidence structures and hash relationships
without relying on ignored local state. It does not contain ignored ZIP/EXE
artifact preimages and does not claim to recompute their recorded content hashes;
fresh artifact verification requires an independent rebuild under the recorded
contract.

Task 13 and final review rebuild independently. They require exact baseline path
arrays/layout hash, module/test contract hashes, and zero frozen skips. Artifact
content hashes are recorded per HEAD and are not required to equal a prior HEAD
whose product bytes intentionally changed. Pre-cutover and final canonical
observations separately hash product layout/content inventory, product module
result, bootstrap EXE/probe/module result, process-probe EXE/boundary result,
Host tests, and zero marked processes.

Evidence helper summaries replace scalar `onedirInternalFiles`,
`onedirInternalDirs`, and `moduleGraph` fields with exact `contractSha256`,
`baselineSha256`, and `frozenObservationSha256`. The final report validator also
binds `preCutoverFrozenObservationSha256` and
`finalCutoverFrozenObservationSha256`. Review packages include complete contract,
baseline, and both observation bytes, not only hashes. Tests reject canonical
field/key-order drift, baseline replacement, same-count path substitution,
wrong-wheel bytes, omitted/unexpected modules, accidental process-probe release,
and report/receipt hash tampering.

## File And Test Boundaries

Planned focused files are:

- `host/installer_bootstrap.py`: release metadata, exclusive download, digest,
  direct staged/live child orchestration, safe errors, and probe mode.
- `host/dh_bootstrap_process_probe.py`: tracked test-only frozen child/grandchild
  entry; excluded from every product and release asset.
- `host/test_installer_bootstrap.py`: pure adapter tests for every bootstrap
  branch and hostile value.
- `host/package_archive.py` and `host/test_package_archive.py`: one Plan A limits
  object, binary-input validation, chunk bounds, and ZIP-bomb rejection.
- `host/package_manifest.py` and `host/test_package_manifest.py`: remove active
  installer scripts from package-only authority and reject them from archives.
- `host/test_release_helper.py`,
  `host/test_early_cli.py`, `host/test_install_integrity.py`,
  `host/test_update_ownership.py`, `host/test_update_engine_host.py`,
  `host/test_update_engine_resume.py`, and `host/test_update_recovery.py`: remove
  obsolete package-script fixture bytes and preserve exact Plan A inventory.
- `release_helper.py` and `host/test_release_helper.py`: ordered dual frozen
  builds, version/digest embedding, ZIP exclusion, secure tag/draft publication,
  and fallback release body that names only the versioned bootstrap.
- `installer_core.ps1`, `install.bat`, `dyhelper_installer.ps1`, and
  `test_installer_scripts.py`: inert migration behavior only.
- `.gitattributes`: force LF source bytes for all three canonical inert scripts.
- `extension/src/background/hostGate.ts`,
  `extension/src/background/hostGate.test.ts`,
  `extension/src/background/updateCoordinator.ts`,
  `extension/src/background/updateCoordinator.test.ts`,
  `extension/src/background/serviceWorker.ts`, and
  `extension/src/background/serviceWorker.update.test.ts`: exact old-Host
  classification and coordinator-only denial.
- `host/update_entrypoint.py`, `host/test_update_entrypoint.py`,
  `host/update_installer.py`, and `host/test_update_installer.py`: exact staged
  `--register-installed` external-verification/registration/settlement plus
  staged-only `--quarantine-partial-install` classification/registry/process/
  atomic-move responsibilities.
- `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `USER_GUIDE.md`,
  `README.md`, `releases/notes-prompt-scope-cleanup-draft.md`, and
  `docs/session-handoff-2026-07-15.md`: replace the 6.18.0/current
  installer workflow only where superseded; preserve historical evidence labels.
- `dev_switch.py`, new root `test_dev_switch.py`, and retained
  `host/debug_integration_test.py`: replace stale active `install.bat`
  guidance with versioned-bootstrap guidance without changing dev/prod switching.
- `tools/plan_d_frozen_contract.json`, `tools/plan_d_final_evidence.py`,
  `tests/test_plan_d_final_evidence.py`, the Plan D final report, and committed
  frozen baseline/pre-cutover receipt/pre-and-final observation evidence: own
  exact module/test inventories and all fresh frozen observations.

Ordinary unit tests use injected HTTP, clock, filesystem, Win32 handle/token,
hash, process, and release adapters. They never contact GitHub, elevate,
terminate an unrelated/real product process, touch real registry/AppData,
install, tag, or publish. The sole exception is the explicitly isolated frozen
process-boundary probe below: it creates and terminates only its own marked test
process tree under an owned temp root.

Bootstrap tests cover exact argv/probe bytes, elevation rejection, duplicate-key
JSON, tag/prerelease grammar, exact asset pairing, self digest, ZIP embedded and
metadata digest equality, redirect allowlist, timeout/size/EOF errors, exclusive
handle reuse, intent isolation, child environment sanitation, every exit,
recovery/quarantine text, cleanup, and orphan non-adoption. Exact UTF-8/LF
stdout/stderr bytes include one trailing LF where text is present. Bootstrap
quarantine tests cover online/offline package validation, generated target
grammar, staged early-mode invocation, exit `31/42/0/50`, and no direct registry,
process, or move operation in bootstrap code.
The release helper builds ignored
`dist/dh_bootstrap_process_probe/dh_bootstrap_process_probe.exe` from a tracked
test-only entry excluded from both release assets. The exact gate command is
`host/run_isolated_python.ps1 -HostPath -m unittest host.test_installer_bootstrap.BootstrapFrozenProcessBoundaryTests -v`
with `DH_BOOTSTRAP_PROCESS_PROBE` set only in that child to the canonical probe
EXE. The helper attempts one unallowlisted inherited sentinel handle and creates
one marked sleeping grandchild inside the suspended-assigned Job Object. The
single test proves only stdin/stdout/stderr child handles are inherited,
grandchild termination reaches active-process count zero, normal-root exit waits
for descendants, and an injected unconfirmed tree exit retains the workspace.
Expected output is `Ran 1 test`, `OK`, zero skip. Unit fakes do not substitute;
the gate records probe EXE SHA-256 and confirms no marked process remains.

Host-gate/Worker tests freeze the exact dual-`unknown_action` dialect as
`host_protocol_incompatible`, prove zero `perform_update`, runtime-state write,
reload, or pending removal, and retain only diagnostics/update checking plus
bootstrap guidance.

Archive tests cover the existing traversal/type/inventory matrix plus zero or
excess entries, oversized archive/entry/expanded total, ratio boundary,
declared/actual mismatch, chunk overrun, cleanup, and valid boundary values.
Every rejected archive proves no package-contained process starts and no
install/AppData/registry path changes.

All package-producing fixtures in the listed Host tests omit the three inert
scripts. Tests require empty `SERIALIZED_PACKAGE_ONLY_PATHS`, preserve the
implicit un-hashed `update-manifest.json`, and reject any script/bootstrap/probe
file as unmanifested. This fixture migration is an explicit Plan A authority
change, not a silent expectation update.

Script tests parse only the two `.ps1` files under PowerShell 7 and Windows
PowerShell 5.1. They invoke each `.ps1` under both editions and `install.bat`
through exact `cmd.exe /d /c`; every invocation must return `64`, stdout empty,
and the exact one-line CRLF migration stderr above. Before execution they compare
each complete file to its canonical source bytes and verify the three exact
`.gitattributes` entries; this byte equality, rather than a token blacklist,
forbids dormant or conditional behavior. They also prove no child/process/file/
registry side effect.
Release
tests prove scripts/bootstrap are absent from
the product ZIP, both release assets are exact and version-paired, bootstrap
constants match ZIP bytes, PyInstaller is exactly `6.22.2`, and publication
ordering/failure behavior is fixed. Stable and prerelease fixtures prove draft
creation receives the exact channel flag and the post-publication query returns
the same value. Failure fixtures prove one exact preauthorized re-draft PATCH,
authenticated verification of unchanged tag/asset fields, and no success; a
PATCH/query failure emits only fixed incident state with no delete, re-upload, or
second publish attempt.

Restored mutations include executing staged code before validation, reopening
the archive path after hash, dropping embedded digest/version comparison,
accepting a duplicate/mismatched asset, removing each archive limit,
reintroducing `Expand-Archive` or script launch, forwarding an unclassified old
Host update, and emitting transaction-specific recovery data. The implementation
plan assigns each mutation an exact selector, expected assertion failure, source
hash restoration, and GREEN rerun.

Final documentation tests scan `dev_switch.py` plus docs for stale active
`install.bat`, `aka.ms | iex`,
generic ZIP extraction, PyInstaller `6.18.0` current-toolchain, single-asset
publication, and package-script instructions while allowing explicitly marked
historical evidence. They require all user/developer/release documents above to
describe the versioned bootstrap and separate provisioning/publication gates.
The scan also covers `release_helper.py` fallback notes and
`host/debug_integration_test.py`; no current workflow may direct users to a root
script or extracted ZIP.

Documentation must describe exit `41`, explicit `--quarantine-partial-install`,
close-Chrome guidance, atomic whole-root quarantine, registration remaining
absent until fresh install, the three manual-restore candidates, and the exact
forbidden restore paths. It must never instruct users to run a raw `Move-Item`
quarantine command or automatically restore from quarantine.

Release-helper tests validate both the generated fallback body and every supplied
`--notes-file` before remote mutation. Current notes must name the exact versioned
bootstrap and must not contain active `install.bat`, extracted-ZIP, `aka.ms | iex`,
or single-asset instructions. Historical note files outside the selected current
release input are not rewritten or published.

## Deferred Disposable-VM Gate

Before public release, but not during automated Plan D execution, a disposable
Windows VM uses exact local `--archive` mode to verify stable and prerelease first
install, upgrade, rollback, exit-30 guidance, MOTW/antivirus behavior,
non-elevated onefile startup, the real handle allowlist/suspended Job
assignment/grandchild zero-count probe, orphan non-reuse, and rerun after interruption
between commit and registration. It also constructs a mixed installation,
requires install exit `41` with zero live/registry/user mutation, runs explicit
offline quarantine mode, verifies atomic sibling move and registry absence, then
reruns fresh installation and manually checks the restore allowlist. After separately authorized publication, a
second short VM smoke verifies the exact public tag metadata, GitHub asset
digests, and no-argument download path before the release is declared complete.
Until both are recorded, the status remains:

```text
DISPOSABLE-VM SMOKE REQUIRED BEFORE RELEASE, NOT RUN
```
