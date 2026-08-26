# Whole-Branch Important Hardening Design

**Date:** 2026-07-18
**Status:** Approved
**Branch:** `docs/prompt-scope-cleanup-design`
**Review base:** `0040b1de1bc196b203014a8e4f94a53babb7e9aa`
**Design starting head:** `1ba54f310bba59ed3243efd45abe57d0c7a86d1f`

## 1. Purpose

The Prompt Scope Cleanup is already implemented and verified. Its core contract
does not change in this follow-up:

- Every Dynamics Helper SDK session disables Copilot CLI custom-instruction
  discovery with `skip_custom_instructions=True`.
- DH owns instruction selection. Repository ONLY can select only
  `<Root>/.github/copilot-instructions.md`; otherwise DH-specific Instructions
  are selected.
- `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` is the authoritative Custom
  User Prompt source for every Analyze and is injected exactly once by the
  Host.

The tenth whole-branch review found additional Important defects around the
boundaries of that implementation and in older supporting code. The user chose
to fix every validated Important finding, including confirmed pre-existing
defects, instead of limiting this wave to prompt-scope changes.

This design adds:

1. A journaled, externally completed Host/Extension update transaction with
   startup probing, rollback, crash recovery, and a runtime protocol gate.
2. Non-destructive bookmark loading and Reset behavior.
3. Strict Analyze wire and persisted-data schemas.
4. Latest-started Analyze ownership and non-masking persistence failures.
5. Correct SPA case identity and one-request context-menu Root behavior.
6. Safe unsolicited update errors and unambiguous config acknowledgment.

The design deliberately uses small boundary parsers and explicit ownership.
It does not move all Options or Analyze state into the Service Worker.

## 2. Validated Findings In Scope

### 2.1 Update transaction and compatibility

The current updater writes Extension files before swapping the Host. A Host
swap failure can therefore leave a new Extension paired with an old Host. The
current updater also swallows some individual copy failures and has no complete
Extension rollback.

This is a release-safety defect because Prompt Scope Cleanup changes coupled
Host/Extension message semantics. A mixed pair must neither silently run the
old prompt behavior nor report a partial update as successful.

### 2.2 Bookmark load and Reset data loss

`loadItems()` currently treats a `chrome.storage.local.get` failure as if the
`dh_items` key were absent. It then loads packaged defaults, or an empty array,
and writes that fallback over the user's bookmarks. Reset also removes the key
before it knows that packaged defaults can be read and parsed.

Storage failure, absence, and default-file failure must be distinct states.

### 2.3 Analyze result trust and ownership

The Service Worker currently accepts any inner `status: "success"` payload,
persists unvalidated `markdown`, and lets FAB serialize the whole object when
`markdown` is absent. Persisted `dh_last_analysis`, pending, and seen records
are cast without schema validation before identity keys, arithmetic, or React
rendering.

The singleton `dh_last_analysis` is also completion-order last-wins. The
approved product rule is instead:

> The latest-started Analyze request owns the singleton durable result. An
> older request may finish, but it cannot replace a result owned by a request
> that started later.

### 2.4 Analyze persistence failure

Once a Host result exists, a rejection while writing `dh_last_analysis` can
replace that Host outcome with a generic Service Worker error and leave the
request pending. Host success or Host failure and local durability are separate
facts. A local write failure must not falsify the Host outcome.

### 2.5 SPA case switching

While Analyze is busy, FAB skips all MutationObserver scans. A D365 SPA switch
from case A to case B can therefore leave `currentCaseRef` on A and display A's
late result on B.

### 2.6 Context-menu Root lifetime

The context-menu handler writes a React Root override and immediately invokes a
closure that still sees the previous value. The override also persists into
later normal analyses. The Root captured by a context-menu invocation must be
an immutable argument for that request only.

### 2.7 Error and acknowledgment boundaries

- An unsolicited Native `update_error` payload is logged and forwarded raw,
  then interpolated by Options.
- `{ success: true, config_saved: false }` is currently acknowledged even
  though it explicitly says the config was not saved.

Legacy Hosts that return `{ success: true }` without a `config_saved` property
remain supported. Only an explicit `config_saved: false` contradicts success.

## 3. Architecture Principles

### 3.1 Validate once at each trust boundary

Wire responses, Chrome storage records, packaged bookmark defaults, update
packages, and update journals each receive a small parser with an explicit
output type. Callers consume parsed values rather than repeatedly probing raw
objects.

Parsers must not use `String`, template interpolation, `JSON.stringify`, or
custom conversion hooks on rejected values. Property access that throws is
caught and classified as malformed input.

### 3.2 Persist ownership, not callback timing

Analyze ownership is represented by a durable latest-request record. Bookmark
and Reset writes retain the existing generation ownership. Update ownership is
represented by a transaction ID and an atomically written journal.

### 3.3 Fail closed while preserving recovery

An incompatible Host cannot Analyze, update configuration, Reset Host-backed
state, or list models. It can still answer compatibility/health requests and
perform or report an update so the user can recover.

### 3.4 Do not call a multi-path operation atomic

Windows cannot atomically replace the flat Host product set and the Extension
directory in one filesystem operation. The updater is therefore described as
a journaled transaction, not as a single atomic swap. Each completed step is
recoverable and idempotent, and the runtime protocol gate is a second layer of
protection.

## 4. Runtime Host Protocol Gate

### 4.1 Capability contract

The main Host exposes a dedicated `get_capabilities` action. The exact Native
Messaging response envelope is:

```json
{
  "requestId": "the-request-id",
  "status": "success",
  "data": {
    "host_version": "2.0.74-beta.4",
    "capabilities": [
      "prompt-scope-v1",
      "transactional-update-v1"
    ]
  }
}
```

The exact product version is diagnostic. Runtime compatibility is based on
required capability names, not exact version equality. Package commit probing,
described later, does require the staged Host and Extension versions to match
their package manifest.

The parser requires a non-array `data` object, a non-empty string
`host_version`, and an array containing only non-empty strings. Duplicate
capabilities are deduplicated. Missing fields, arrays/objects in the capability
list, throwing property access in direct tests, or any other malformed shape
is `host_protocol_incompatible`; rejected values are not coerced or logged.

The Host also includes its capability list in `health_check` and `get_config`
responses where practical, but `get_capabilities` is the authoritative minimal
handshake.

The normative action matrix is:

| Main Host action | Required capability | Behavior without it |
|---|---|---|
| `analyze_error` | `prompt-scope-v1` | Reject before forwarding |
| `update_config` | `prompt-scope-v1` | Reject before forwarding |
| `get_config` | `prompt-scope-v1` | Reject before forwarding |
| `list_models` | `prompt-scope-v1` | Reject before forwarding |
| `get_capabilities` | none | Always allowed |
| `ping`, `health_check` | none | Always allowed |
| `check_updates`, `perform_update`, `activate_update` | none | Always allowed for recovery |
| `verify_installation` | none | Always allowed; returns only allowlisted integrity metadata |
| `finalize_update_status`, `acknowledge_update_finalization` | none | Allowed only for a terminal transaction |

`transactional-update-v1` means `perform_update` follows the staged transaction
response defined in section 5.7. Its absence selects the explicitly limited
legacy verification flow; it does not make `perform_update` unavailable.
`get_update_status` is not a main Host action while a transaction is active. It
belongs only to the detached update-status Host described in section 5.7.

Every release also places generated `release-integrity.json` and
`installed-product.json` files inside the packaged Host product set. This is a
bootstrap requirement: the historical updater copies ordinary new Host files,
so a complete first legacy upgrade installs both documents without needing new
transaction code. A partial historical copy instead fails the new integrity
gate.

`release-integrity.json` is derived from the same inventory as
`update-manifest.json` and includes the expected Host and Extension file hashes,
version, and capabilities. Its internal inventory explicitly excludes
`release-integrity.json` and `installed-product.json`, avoiding recursive
self-hashes. `installed-product.json` identifies the package version,
ownership-schema version, and expected SHA-256 of `release-integrity.json`; it
also excludes its own hash. The package-only `update-manifest.json` contains
the external SHA-256 of both generated Host metadata files.

`verify_installation` requires both files in a frozen build, hashes
`release-integrity.json` against `installed-product.json`, verifies that their
versions/capability declarations agree, then uses the integrity document to
hash all other frozen live Host and sibling Extension product paths once per
Host process. `installed-product.json` is transaction metadata, not a signed
trust root; these checks detect incomplete/mixed installation rather than
malicious repacking. The action returns one of:

```json
{ "mode": "packaged", "integrity": "verified", "host_version": "...", "extension_version": "..." }
{ "mode": "packaged", "integrity": "failed", "error_code": "installation_integrity_failed" }
{ "mode": "development", "integrity": "development", "host_version": "..." }
```

A frozen Host must return packaged/verified and its Extension version must
equal `chrome.runtime.getManifest().version_name ?? version` before protected
actions are enabled. Missing inventory, missing/extra product files, hash
mismatch, or version mismatch is `installation_integrity_failed`. A source Host
may return development only when `sys.frozen` is false; that exception preserves
the registered repository development workflow and is never available to a
frozen production binary.

### 4.2 Service Worker enforcement

The Service Worker is the sole runtime coordinator for capabilities and
updates. Options and FAB request operations from it and render normalized
status events; they do not maintain their own update transaction, poll either
Native Host, or clear update storage independently.

The Service Worker checks and caches main Host capabilities and installation
integrity once per Native port. The cache is cleared on disconnect. Concurrent
protected requests share one in-flight gate rather than sending duplicate
probes. Both checks must pass before a protected request is forwarded.

Protected actions are:

- `analyze_error`
- `update_config`
- `get_config`
- `list_models`

Reset reaches the Host through `update_config`, so it is blocked before any
Host-backed Reset phase can be acknowledged. Options must not run hydration
catch-up writes after a typed compatibility failure.

Recovery actions remain available without a successful capability check:

- `get_capabilities`
- `ping`
- `health_check`
- `check_updates`
- `perform_update`
- `activate_update`
- `finalize_update_status`
- `acknowledge_update_finalization`

An old Host returns `unknown_action` for `get_capabilities`. The Service Worker
maps that response to the fixed typed error `host_protocol_incompatible` for
protected actions. It never forwards the old Host's raw response as display
text.

### 4.3 User-visible behavior

Options and FAB show a localized incompatibility message that instructs the
user to retry the update or run the manual installer. Update controls stay
available. Prompt/config editors can retain local edits, but no incompatible
Host write is reported as saved.

While a persisted update transaction is nonterminal, the Service Worker closes
the main Native port and suppresses all main-Host actions. It communicates only
with the detached, status-only update Host. This rule prevents status polling
from relaunching the live Host and locking product runtime files during a swap.

## 5. Journaled Update Transaction

### 5.1 Release package manifest

`release_helper.py` generates an `update-manifest.json` inside every release
package. Every archive entry is assigned exactly one ownership class. The
manifest contains:

- package version;
- required and provided protocol capabilities;
- all product-owned Host paths and SHA-256 hashes;
- all Extension paths and SHA-256 hashes;
- seed-only and package-only paths and SHA-256 hashes;
- the expected Chrome manifest version/version_name;
- the update manifest schema version.

The stager rejects absolute paths, parent traversal, duplicate normalized
paths, unsupported entry types, a path assigned to multiple classes, missing
files, unmanifested archive entries, and hash mismatches before modifying the
installation.

The hashes prove package consistency and complete copying. They are not a
substitute for release signing and do not claim to authenticate a maliciously
repacked archive.

### 5.2 Product and user-owned files

The ownership classes are normative:

| Class | Examples | Install behavior |
|---|---|---|
| Whole product directory | `_internal/`, `extension/` | Replace the entire directory; undeclared children are stale product files, not user data |
| Product-owned Host file | `dh_native_host.exe`, `system_prompt.md`, `register.py`, other manifest-listed Host runtime files outside `_internal/` | Replace exactly; remove old manifest-listed files absent from the new package |
| Seed-only | packaged `config.json` | Copy only on fresh install when the user file is absent; never own or replace it afterward |
| Packaged product metadata | `release-integrity.json`, `installed-product.json` | Generate during release staging, verify as a coupled pair, journal separately, and use for runtime integrity/next-update ownership |
| Generated registration | `manifest.json` | Preserve during the file swap; regenerate only after commit/registration |
| User-owned | instructions, prompt, logs, existing config | Preserve byte-for-byte |
| Transaction workspace | `updates/**` | Never include in a product swap; retain until terminal status is acknowledged and cleanup is safe |
| Package-only | `update-manifest.json`, `installer_core.ps1`, `install.bat` | Validate in staging; do not copy into the live product tree |
| Unknown top-level path | any install-root entry not in the old installed manifest or legacy product allowlist | Preserve; never infer ownership merely because it is under the install root |

The transaction therefore preserves these user-owned files throughout update:

- `config.json`
- `copilot-instructions.md`
- `user_prompt.md`
- `native_host.log` and rotations
- generated Native Messaging `manifest.json`
- the update workspace/journal
- any unknown top-level file or directory not declared by the installed
  product manifest or legacy product allowlist

On a fresh install, the packaged `config.json` is copied only when no user
config exists. Later updates never replace it.

The first transaction-capable release uses a versioned, fixed legacy allowlist
for `dh_native_host.exe`, `_internal/`, `system_prompt.md`, `register.py`, known
old product runtime files, and `extension/`. It does not classify arbitrary
top-level paths as product-owned when an older installation has no installed
manifest.

Before product mutation, existing `release-integrity.json` and
`installed-product.json` are moved into the transaction metadata backup. After
Host and Extension installation, the two verified packaged metadata files are
installed through atomic per-file replacement and the journal advances through
an explicit `metadata-installed` phase only after both match. Rollback removes
the new pair and restores the old pair, or restores absence on a legacy/fresh
install. Commit retains the new pair for runtime verification and subsequent
exact stale-file cleanup.

### 5.3 Detached runner

The live Host downloads and validates the archive, then creates an update
workspace under `%LOCALAPPDATA%\DynamicsHelper\updates\<transaction-id>` with:

- a staged payload;
- a detached runner tree;
- backup trees;
- `journal.json`;
- probe and completion status files.

The detached runner is a complete frozen PyInstaller `--onedir` runtime tree,
not a copy of the executable alone. For self-update it is copied from the
currently installed `dh_native_host.exe` plus its complete `_internal/` tree.
For a fresh/manual install it is copied from the verified staged Host tree.
Failure to copy or preflight that complete runner leaves the live installation
untouched.

The reusable recovery/status tree lives at the fixed short path
`%LOCALAPPDATA%\DynamicsHelper\updates\recovery`; transaction-specific payload,
backup, and journal trees remain under `updates\transactions\<id>`. The runner
executable is named `dh_update_runner.exe` inside the fixed recovery tree.
`dh_native_host.py` dispatches `--complete-update`, `--install-package`, and
`--update-probe` before logging setup, SDK imports, user-config loading, or
normal Native Messaging initialization. These modes import only the
standard-library transaction engine. A sibling copy named
`dh_update_status_host.exe` detects that basename when Chrome launches it
without a recognized DH command-mode argument and enters the status-only Native
Messaging loop described in section 5.7. Chrome-provided positional origin and
Windows `--parent-window=<handle>` arguments are expected in this mode. The
status Host validates the origin against the same fixed allowlist, accepts only
one optional decimal parent-window argument, rejects every other argument, and
never interprets browser arguments as a filesystem path or transaction ID.

The runner is launched with `stdin`, `stdout`, and `stderr` detached, no Native
Messaging pipe handles inherited, `close_fds=True`, and Windows detached/new
process-group flags. It runs from the update workspace, outside every live
product path it can replace. The staged Host is probed before the current Host
exits; failure leaves the installation untouched.

Preparing and activating an update are separate actions:

1. The Service Worker generates a cryptographically random transaction ID,
   validates its fixed hexadecimal format, and persists an `update-preparing`
   record before contacting the Host.
2. `perform_update(url, transactionId)` downloads, validates, stages, writes a
   `prepared` journal, installs/registers the detached status Host, and returns
   `update_prepared`. It does not launch the runner or mutate live product
   paths.
3. The Service Worker validates the echoed ID, updates its durable record to
   `update-activating`, and sends `activate_update(transactionId)`.
4. The Host validates the existing prepared journal and detached runner,
   launches the runner detached, and waits for the runner to acquire the
   mutation mutex and atomically advance the journal to
   `waiting-for-host-exit` with the initiating Host PID.
5. Only after observing that durable ready phase does the Host send and flush
   `update_activated`, set its run loop to stop, close the Native Messaging
   stream, and exit normally.

The runner waits for that exact initiating Host PID to exit before touching
live product files. If the Service Worker dies before step 3, the prepared
transaction is inert and can be activated on restart. If it dies after step 3,
its durable record already suppresses main-Host reconnection and it resumes via
the status Host. If the Host or runner fails before the ready phase, activation
returns/rejects without acknowledgment and the journal remains `prepared`.
When the status Host reports `prepared` and browser state is
`update-activating`, the Service Worker may make one activation-only connection
to the main Host and reissue `activate_update`; no other action is permitted on
that port. Once the journal reaches `waiting-for-host-exit`, main-Host
reconnection is forbidden. The runner's atomic phase transition and mutation
mutex reject duplicate activation/runners.

If the Host crashes after the runner records `waiting-for-host-exit` but before
the activation response reaches the Service Worker, the runner observes the
recorded PID exit and continues. The already durable `update-activating` browser
record directs restart recovery to the status Host, which now reports the real
journal phase; no activation acknowledgment is required to preserve ownership.

### 5.4 Journal state machine

The durable phases are:

```text
staging
  -> prepared
  -> waiting-for-host-exit
  -> host-backed-up
  -> host-installed
  -> extension-backed-up
  -> extension-installed
  -> metadata-installed
  -> probing
  -> committed

Any post-prepared failure:
  -> rolling-back
  -> rolled-back

An unrecoverable filesystem failure:
  -> recovery-required
```

Each journal write uses write-to-sibling, flush/fsync, and `os.replace`. Every
filesystem step is idempotent and records enough source/destination state to
resume after interruption.

One Windows named mutex derived from the canonical install path serializes
every mutating transaction/recovery/installer process for that installation.
Only the detached runner or synchronous installer engine may hold it. A second
invocation exits with `update_already_in_progress`; it never starts a parallel
rollback. The detached status Host does not acquire the mutation mutex and
never writes files or registry state. It reads only atomically replaced journal
snapshots, so it cannot observe a partially written JSON document.

The commit order is Host first, Extension second:

1. Move the currently installed product-owned Host entries into the transaction
   backup.
2. Move verified staged Host entries into the live install, placing the Host
   executable last.
3. Move the current Extension directory into backup.
4. Move the verified staged Extension directory into its stable live path.
5. Atomically install the new `release-integrity.json` and
   `installed-product.json` pair, retaining their prior state in transaction
   metadata.
6. Run the installed Host startup probe.

Host-first ordering prevents the unsafe new-Extension/old-Host window. The new
Host must retain old-Extension compatibility for the immediately preceding
shipped protocol. The capability gate still rejects any unsupported pair.

Before `activate_update`, the Service Worker has already persisted the active
transaction ID and status-host registration name. After receiving the flushed
activation response, it closes the main Host port and suppresses every
main-Host action while the journal is nonterminal. On Service Worker restart,
the preparing/activating record is read before any main Native connection is
permitted. A preparing record may reconnect only to finish preparation. An
activating record may reconnect only for the activation retry described above
when the status Host proves the journal remains `prepared`; neither state may
send an unrelated action. This prevents Chrome from restarting and locking a
half-committed Host runtime.

### 5.5 Startup probe and commit

The runner invokes the newly installed Host in an early `--update-probe` mode.
The probe must exit successfully and report only allowlisted data proving:

- the executable and bundled runtime can start;
- Host version equals the package manifest version;
- all required capabilities are present;
- required product files, including DH Core, exist and match the package
  manifest;
- the installed Extension manifest version/version_name matches the package.

The probe does not initialize Copilot, authenticate, create an SDK session, or
perform an Analyze.

Only a successful probe advances the journal to `committed`. The runner then
unregisters crash recovery but retains the terminal journal, detached status
tree, and any backup remnants until Service Worker revalidation and main-Host
finalization. A failed probe rolls both product sets back and records
`rolled-back` with a fixed safe reason code; terminal rollback evidence is
retained until the same finalization handshake.

### 5.6 Rollback and crash recovery

Before the first live mutation, the runner registers a per-user Windows
`RunOnce` entry pointing to the fixed detached recovery runner. No administrator
permission is required. The value is `REG_EXPAND_SZ` and contains only the
short, fixed command:

```text
"%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe" --recover-active
```

It contains no transaction ID or journal path. The runner resolves its sibling
`active.json`, which contains the validated transaction ID and a relative
`transactions/<id>/journal.json` path. Both files use atomic replacement. The
runner rejects a missing/malformed active record, wrong ID format, absolute
path, parent traversal, or a canonical journal path outside `updates`.

The command is generated through an argv-to-command-line helper and its exact
expanded registry text must be at most 260 characters, Windows' documented
RunOnce limit. Tests cover the literal worst-case command and reject an
over-limit value before live mutation. Because `%LOCALAPPDATA%` remains an
environment reference in `REG_EXPAND_SZ`, username length does not expand the
stored command. If the registry cannot accept/round-trip this fixed value,
automatic recovery is unavailable and activation fails before live mutation;
the prepared package remains usable through synchronous installer/manual
recovery.

Windows deletes a `RunOnce` value before launching it. Therefore every recovery
invocation that ends in a nonterminal phase re-registers the value before
returning. The runner also refreshes the entry immediately before each live
mutation phase. Terminal `committed` or `rolled-back` removes it. A
`recovery-required` transaction retains/re-arms it only when another automatic
attempt is safe; otherwise it records `manual_recovery_required` and leaves the
backups and detached runner intact.

If the runner is terminated, Windows loses power, or login ends during the
transaction, a successfully registered `RunOnce` value provides best-effort
next-login recovery. `RunOnce` is not treated as a delivery guarantee: policy
may disable it, registry writes may fail, or the user may not log in again. The
Host early startup check, synchronous installer resume, and a documented manual
`--recover-update <journal>` command are independent fallbacks using the same
engine. Each reads the journal and either completes the remaining idempotent
steps or restores both backups.

The installer and Host startup also inspect incomplete journals when they are
able to start. They invoke the same recovery engine rather than independently
guessing which files are current.

If rollback itself encounters locked or missing paths, the journal remains
`recovery-required`, backups are retained, and the UI/manual installer reports
an actionable fixed error. Backups are never deleted merely because recovery
timed out.

All registry access is isolated behind a small interface so tests use a fake
RunOnce store and never modify the developer machine's registry.

### 5.7 Extension completion protocol

`perform_update` no longer means “installed.” It returns a transaction ID and
the state `update_prepared`. `activate_update` returns `update_activated` only
after the response is flushed and the Host is committed to orderly exit. The
Service Worker is the only consumer that
persists the transaction record or polls status. Options/FAB receive normalized
runtime messages and never call `get_update_status` themselves.

Before the main Host exits, the stager writes a Native Messaging manifest in
the detached workspace for the fixed host name
`com.dynamics.helper.update_status`, with the same allowlisted Extension
origins, and registers that manifest through the injected registry interface.
Chrome then launches `dh_update_status_host.exe` from the detached complete
`--onedir` tree. That Host accepts only:

- `get_update_status`, with the exact transaction ID;
- `ping`.

It receives Chrome's required launch arguments as defined in section 5.3,
then reads the atomically replaced journal selected by the validated request
ID. It returns only the transaction ID,
allowlisted phase, target version, and fixed reason code. It cannot stage,
commit, roll back, clean up, or access user config. Any other action is
`unknown_action`. The detached tree is never replaced during its transaction,
so status polling cannot lock a live product path.

The Service Worker polls this status Host with a deterministic schedule of
250 ms, 500 ms, 1 s, then 2 s capped intervals for at most 120 seconds in one
wake cycle. A temporary disconnect is expected and consumes an interval, not a
terminal failure. The persisted transaction remains authoritative after that
window; the Worker reports “still updating” and resumes the same sequence on
its next wake rather than discarding state.

- in-progress: retain `pending_update` and the active transaction; continue or
  resume status polling.
- timeout: retain both records, report “still updating,” and resume on the next
  Worker wake.
- `recovery-required`: retain every record/backup, stop automatic activation,
  and show the fixed manual-recovery guidance.
- `committed` or `rolled-back`: persist `terminal-reload-pending`, the observed
  terminal phase, target/prior version, and transaction ID. Retain
  `pending_update`, journal, backups, and status registration. Do not announce
  success/rollback. Call `chrome.runtime.reload()` so the Extension code
  actually present in the committed or restored directory takes control.

Service Worker startup resumes polling a persisted transaction after browser
or worker restart.

On startup, a Service Worker that sees `terminal-reload-pending` first verifies
that its own `chrome.runtime.getManifest().version_name ?? version` equals the
expected target version for `committed` or prior version for `rolled-back`.
This is the first point where the normal Host/Extension version gate is
meaningful: the pre-reload JavaScript belonged to the old Extension. A mismatch
changes the record to `recovery-required`, retains all recovery data, and
blocks protected actions.

The newly loaded Worker then connects the main Host and runs the complete
capability/integrity gate. The integrity response must equal the target version
for `committed`; for `rolled-back` it must equal the journal's captured prior
version/inventory. A failed gate also changes the record to
`recovery-required`, retains all transaction/update data, blocks protected
actions, and does not announce the terminal result.

After a successful gate, protected product actions may resume and the Service
Worker changes the record to `cleanup-pending`, closes the status Host, and
sends `finalize_update_status(transactionId)`. The transaction-aware main Host
verifies the terminal journal and writes an atomic finalization receipt under
the stable path `updates/receipts/<transactionId>.json` before deleting the
transaction workspace or unregistering the status Host. The receipt contains
only the validated transaction ID, terminal outcome/version, and state
`finalized-awaiting-ack`; it is outside the transaction workspace and is not
part of the swapped product tree.

The Host then unregisters the status Host, deletes terminal backups/workspace,
and returns the receipt. A repeated `finalize_update_status` after a lost
response reads and returns the same stable receipt without requiring the
deleted journal. Until the Service Worker receives a valid receipt, browser
state remains `cleanup-pending` and retries on each wake. Cleanup failure never
reverses a verified product commit/rollback, but it retains the transaction
record/receipt as available and shows a cleanup warning; it does not clear
`pending_update` or announce the terminal outcome.

After receiving the receipt, the Service Worker atomically writes the one-time
announcement marker and removes the active browser transaction. It then sends
`acknowledge_update_finalization(transactionId)` to the main Host. This action
deletes only the matching receipt and is idempotent; a lost acknowledgment
leaves a harmless receipt that a later startup can acknowledge again. Receipt
cleanup never gates product use or repeats the announcement.

Only receipt-backed finalization performs UI completion exactly once:

- committed: clear `pending_update` and the active transaction, announce
  success after this startup completes;
- rolled back: retain `pending_update`/available update, clear the active
  transaction, and announce rollback after this startup completes.

The announcement marker is consumed once by Options/FAB and then removed,
preventing duplicate success or rollback notifications. No second reload is
required after finalization because the correct Extension already loaded at
`terminal-reload-pending`.

### 5.8 Manual installer

The manual installer stops directly overwriting/deleting live Host and
Extension files. It stages the extracted release and invokes the same journaled
engine synchronously through the verified staged Host's early
`--install-package` mode. The extracted package is outside the destination, so
its complete `--onedir` tree can act as the initial runner. The installer:

1. Detects an existing nonterminal journal and resumes/recover it before
   starting another transaction.
2. Stops the live Host and waits for its PID to exit.
3. Invokes the transaction engine and waits for a terminal exit code.
4. On `committed`, runs registration from the committed live executable,
   verifies the registered main Host, and reports success.
5. On `rolled-back`, leaves the prior registration/product active and reports
   failure.
6. On `recovery-required`, prints the journal/backup locations and exact manual
   recovery command; it never proceeds to registration or deletes backups.

Fresh install, upgrade, failure, retry, and registration resumption therefore
share one product ownership and rollback contract. If installation committed
but the installer itself ended before registration, rerunning it recognizes
the terminal committed journal, verifies the product, completes registration,
then finalizes cleanup without repeating the file swap.

### 5.9 Migration limit

An already shipped old Host necessarily executes the first upgrade into this
transaction-capable release with its old updater code. New code cannot make
that historical updater transactional.

If the old updater leaves a new Extension with an old Host, the new Extension's
capability gate blocks protected behavior while keeping update recovery
available. If it leaves a new Extension with a partially copied but startable
Host runtime, `verify_installation` returns `installation_integrity_failed` and
the same block applies. The new Service Worker has no transaction ID in this
legacy path, so it does not poll the detached status Host or represent the old
updater's success response as a new transaction commit.

If the old updater leaves an unstartable Host, the new Extension reports Host
unavailable and directs the user to the manual installer. If it leaves an
Extension directory so incomplete that Chrome cannot start the new Service
Worker, no in-product gate can run; manual reinstall is the only recovery.
These historical-code limits are explicit release-note risks, not conditions
the new transaction engine can retroactively prevent.

Once the transaction-capable Host is installed successfully, all subsequent
self-updates use the journaled flow.

This limitation must be stated in verification and release notes rather than
hidden behind a claim that the first upgrade was transactionally applied.

## 6. Bookmark Loading and Reset

### 6.1 Discriminated reads

Bookmark loading is split into two pure boundaries:

```ts
type StoredItemsResult =
  | { kind: 'saved'; items: MenuItem[] }
  | { kind: 'absent' }
  | { kind: 'invalid'; code: 'bookmark_storage_invalid' }
  | { kind: 'failed'; code: 'bookmark_storage_read_failed' }

type DefaultItemsResult =
  | { kind: 'loaded'; items: MenuItem[] }
  | { kind: 'failed'; code: 'bookmark_defaults_unreadable' }
```

`chrome.runtime.lastError` is inspected inside the storage callback. A failed
read never falls through to the absent path. A present `dh_items` property that
is not a valid bookmark array is `invalid`, never absent. It remains untouched
for diagnosis/recovery and packaged defaults are not loaded over it. Packaged
JSON must be an array (or the one explicitly supported `{ items: array }`
shape); malformed HTML, JSON, or schema is a failure, not an empty bookmark
list.

The bookmark-array parser matches the existing `MenuItem` storage schema; it
does not add an ID or migrate data. Every item must be a non-array object with:

- `type` equal to `folder`, `link`, `markdown`, `back`, or `unknown`;
- string `label` (empty remains accepted because the current editor permits it);
- optional `url`, `content`, `target`, and `icon` as strings;
- optional `collapsed` as boolean;
- optional `tags` as an array of strings;
- optional `source` equal to `team` or `personal`;
- optional `children` as another valid item array.

Unknown extra own data properties are preserved so import/export remains
forward-compatible, but accessors/prototypes are not copied into the parsed
plain-object snapshot. The parser rejects arrays in place of item objects,
wrong known-field types, throwing property access, cycles in direct tests, and
more than 64 nested folder levels. The fixed depth limit is a corruption/stack
safety bound, not a migration of valid current defaults, which are well below
it. Rejected values are not coerced.

### 6.2 Mount behavior

- Saved: collapse folders and apply the saved snapshot. Preserve the existing
  generation check before any normalization write.
- Absent: load packaged defaults; only a successful parse may be applied and
  persisted.
- Failed: leave current UI/storage untouched and show a localized safe warning.
- Invalid: leave current UI/storage untouched, do not load defaults, and show a
  distinct localized repair warning.
- Defaults failed: do not create `dh_items`; show a repair/retry warning.

### 6.3 Reset behavior

Reset loads and validates packaged defaults before mutating `dh_items`. It then
performs one generation-owned storage `set` with the collapsed defaults. It no
longer removes `dh_items` first.

If default loading or the final write fails, Reset remains in
`local-cleanup-pending` with its existing Retry cleanup control. Personal
bookmarks remain unchanged. A stale Reset transaction cannot apply defaults
after a newer bookmark generation.

## 7. Analyze Wire Schema

### 7.1 Parsed success

The Analyze bridge accepts inner success only when:

- inner `status` is exactly `success`;
- `data` is a non-array object;
- `data.markdown` is a string;
- `data.saved_to`, when present, is a string.

Additional fields are ignored. The parsed result contains only `markdown` and
optional `savedTo`. FAB no longer serializes an unrecognized object as a
fallback.

Malformed success becomes a normalized Analyze error with the fixed code
`malformed_native_response` and a fixed/localized message. The rejected object
is not logged, persisted, serialized, interpolated, or sent to telemetry.

Host-reported error fields continue through `safeErrorText` and the existing
allowlisted `error_code` normalization.

### 7.2 Persistence warning contract

Analyze persistence metadata is mandatory for every Extension-originated
`analyze_error`. Before recording start or contacting the Host, the Service
Worker requires:

- a non-empty string top-level `requestId`;
- `_persist` to be a non-array object;
- `_persist.caseNumber` to be a string (empty is allowed for a genuinely
  unidentified case);
- `_persist.successTitle` and `_persist.errorTitle` to be non-empty strings.

The request ID comes only from the top-level field; `_persist.requestId` is not
a supported second source. Missing or malformed metadata returns the fixed
`invalid_analyze_persistence_context` error and the Host is not called. The raw
metadata is not logged or coerced.

After a valid Host response is obtained, result persistence is best-effort
with respect to the immediate caller:

1. Attempt to write the owned result.
2. In `finally`, attempt request-scoped pending cleanup with bounded retry.
3. Return the normalized Host outcome even if either local operation fails.
4. Attach an `extension_warnings` array containing zero, one, or both of these
   allowlisted codes in this fixed order:
   `analysis_result_not_persisted`,
   `analysis_pending_cleanup_failed`.

FAB displays the Host result and a separate localized durability warning. It
does not relabel Host success as analysis failure. If both persistence and
cleanup fail, the warning explains that navigation recovery/spinner state may
be unavailable until retry or expiry.

Result persistence is attempted once. Request-scoped pending cleanup is
attempted at the end of the same serialized mutation and, on failure, retried
twice after injected delays of 50 ms and 200 ms (three total attempts). Tests
replace the delay function; production keeps the Service Worker response
promise alive through the bounded sequence. A failed attempt logs only the
allowlisted stage and attempt number. There is no unbounded timer or retry
after the response has returned.

Failure to record the initial pending/owner marker remains a pre-send failure:
the Host is not called because the persistence contract was never established.

## 8. Durable Analyze Ownership and Storage Schemas

### 8.1 Latest-started owner

A new key stores the latest Analyze owner:

```ts
interface LatestAnalysisOwner {
  requestId: string
  caseNumber: string
  startTime: number
}
```

`recordAnalyzeStart` writes the request-scoped pending marker and latest owner
in one serialized mutation before forwarding to the Host.

On completion, the serialized mutation rereads the owner:

- matching request: write `dh_last_analysis`, then clear only this request's
  pending key;
- non-matching request: do not touch `dh_last_analysis`, but still clear only
  this request's pending key.

The owner remains after completion until a newer Analyze starts or analysis
state is Reset. This prevents an older request that completes later from
regaining ownership merely because the newer pending marker was cleared.

### 8.2 Persisted schemas

Before identity generation, arithmetic, or rendering, readers validate:

- Last result: string case number/title/content, finite timestamp, boolean
  `seen`, exact `success|error` status, optional string request/path/code, and
  optional finite duration.
- Pending: string case number/request ID and finite start time.
- Latest owner: string case number/request ID and finite start time.
- Seen identity: string case number plus a string request ID or finite legacy
  timestamp.

Arrays, null, accessors that throw, functions, symbols, non-finite numbers, and
wrong field types are rejected without coercion. Invalid records behave as
absent. Their exact known storage key may be queued for safe cleanup, but a bad
record never causes unrelated analysis keys to be removed.

All writers construct values through the same typed schema helpers used by the
readers. Reset clears the owner along with last, pending, and seen state.

## 9. FAB Request Identity and Root

### 9.1 SPA identity-only scanning

FAB maintains current page identity separately from editable scraped context.
`PageIdentity` is one opaque token constructed without coercion:

- `case:<caseNumber>` when a non-empty string case number exists;
- otherwise `title:<ticketTitle>` when a non-empty string ticket title exists;
- otherwise no identity.

Case number is therefore stable when a title is edited inside the same case;
title is only a navigation fallback for pages where no case number can be
scraped. Analyze snapshots this token and the exact string case number.
Hydration and durable analysis storage remain keyed only by exact case number;
title fallback is a live display-suppression guard and never becomes a storage
identity.

While Analyze is active, MutationObserver scans may update only the current
`PageIdentity`, exact current case number, and stale-request display guards.
They must not overwrite the textarea, enriched context, hydration storage key,
or `isUserEdited` state.

When case identity changes during a request:

- current-page identity changes immediately;
- the originating request may finish and be persisted for its original case;
- its result popover, success bubble, error bubble, duration display, and
  success/failure telemetry tied to the visible page are not attached to the
  new case; request completion telemetry may still identify the originating
  hashed case;
- hydration switches to the new case identity;
- a full scrape runs when Analyze ends so the editable context catches up even
  if the page produces no further DOM mutation.

### 9.2 Per-request Root snapshot

`handleAnalyze` accepts an optional immutable invocation object containing a
Root override. Normal manual/automatic Analyze snapshots the current
Options-configured Root. Context-menu Analyze passes the Root captured in that
specific context-menu message directly.

No context-menu Root is stored in React state or Chrome storage. Missing or
malformed context-menu Root falls back to the current preference. An explicit
captured empty string remains an empty Root for that invocation. The next
normal Analyze always reads the current preference again.

The old persistent `rootPathOverride` state/helper and tests that require its
lifetime are removed or replaced by component-level request-payload tests.

## 10. Safe Update Errors and Config Acknowledgment

### 10.1 Unsolicited update errors

At the Service Worker Native-port boundary, `update_error` is reduced to:

```ts
{
  type: 'NATIVE_UPDATE_ERROR',
  payload: { error: string }
}
```

The string comes from `safeErrorText` over allowed string candidates and a
trusted fallback. Raw payloads are neither logged nor forwarded. Logging uses
fixed text or allowlisted metadata only. Options/FAB apply `safeErrorText`
again before display as defense in depth.

### 10.2 Config response matrix

`classifyConfigUpdateResponse` uses this matrix:

| `success` | `config_saved` | Acknowledged | Meaning |
|---|---|---:|---|
| `true` | absent | yes | Shipped legacy Host compatibility |
| `true` | `true` | yes | Saved successfully |
| `true` | `false` | no | Contradictory, explicitly not saved |
| `false` | `true` | yes, with issue | Saved but post-save refresh/action failed |
| `false` | absent/`false` | no | Not saved |
| either/absent/malformed | present non-boolean | no | Malformed contradictory envelope |

Only acknowledged responses advance instruction or prompt edit revisions.
Contradictory responses retain retry ownership and show a safe fixed fallback
if no valid string message exists. “Absent” means the property does not exist;
`null`, strings, numbers, arrays, and objects are present malformed values, not
legacy absence.

## 11. Testing Strategy

### 11.1 TDD requirement

Each production change begins with the smallest failing regression test. RED
evidence is retained in the implementation report. Restored mutation tests
must prove that each ownership/parser guard is behaviorally active.

### 11.2 Updater tests

Updater tests run only in isolated temporary directories. Process waiting,
clock/backoff, registry RunOnce, and Host probe execution are injected or
mocked. No test touches the real registry, installed Extension, or real
`%LOCALAPPDATA%\DynamicsHelper`.

Required cases include:

- archive traversal, duplicate path, missing/extra file, and hash mismatch;
- user-owned files preserved across commit and rollback;
- stale product files removed on commit and restored on rollback;
- failure injection after every journal phase;
- rerunning every in-progress phase is idempotent;
- runner termination followed by RunOnce recovery;
- quoted RunOnce command round-trip with install/workspace paths containing
  spaces and non-ASCII characters;
- RunOnce value re-armed after every simulated nonterminal recovery launch;
- Host probe failure restores both Host and Extension;
- rollback failure retains backup and reaches `recovery-required`;
- `perform_update` returns prepared and performs no live mutation;
- activation is acknowledged only after the runner records its durable ready
  phase;
- terminal status triggers a pre-gate reload while recovery evidence remains;
- product announcement occurs only after post-reload gate and receipt-backed
  finalization;
- browser/Service Worker restart resumes status polling;
- protocol mismatch blocks protected actions but permits recovery actions;
- packaged installation-integrity mismatch blocks protected actions while a
  source-development Host remains usable;
- package version/capability mismatch fails before commit;
- manual installer invokes the shared transaction engine.

Disposable-VM smoke is required before any release that enables the new
updater. It verifies the frozen detached runner does not inherit Native
Messaging handles, real per-user RunOnce launch/re-arm/removal, a forced probe
rollback, installer resume after an interrupted commit, and Chrome reconnect to
the committed Host/Extension pair. This smoke is a human-controlled release
gate, not part of repository unit tests, and is not run during this unversioned
branch implementation.

### 11.3 Extension data tests

Required cases include:

- bookmark storage read failure preserves personal bookmarks and performs no
  fallback write;
- true bookmark absence loads and persists valid defaults;
- defaults fetch/HTML/JSON/schema failure performs no destructive write;
- Reset default read/write failure remains retryable and preserves bookmarks;
- malicious/malformed Analyze success never serializes or renders raw data;
- malformed persisted last/pending/seen/owner records are ignored without
  coercion;
- A starts, B starts, B completes, A completes: B remains last;
- A starts, B starts, A completes first: A cannot replace the owner while B is
  pending;
- every completion clears only its own pending marker;
- result write/cleanup rejection preserves the normalized Host outcome and
  emits only an allowlisted persistence warning;
- case A Analyze plus SPA switch to B suppresses A UI on B and performs a
  post-run full scan;
- context-menu Root applies to exactly one initiating request;
- raw `update_error` objects are not logged, coerced, or forwarded;
- explicit `config_saved:false` cannot acknowledge an edit, while the shipped
  legacy response without that property remains acknowledged.

### 11.4 Final gates

From a committed product head:

- focused Host tests, then full isolated Host discovery;
- focused Extension tests, then full Extension suite;
- production Extension build and TypeScript checking;
- source-only Host `compileall` excluding the venv;
- updater fault-injection matrix;
- release-manifest generation/validation test without creating a publishable
  release asset;
- `git diff --check` and static no-coercion/ownership scans;
- whole-branch review of the complete original base-to-head range.

Authenticated model-backed smoke remains optional and must be skipped when
user/session isolation cannot be guaranteed.

## 12. Non-Goals

This wave does not include:

- repository symlink/junction containment or a new hostile-repository threat
  model;
- broad malformed Native Messaging envelope hardening;
- Windows Root case-equivalence optimization;
- cross-document Options multi-writer ownership;
- team folder collapse-state race (Minor);
- Reset transaction persistence across page reload (accepted limitation);
- repository-wide historical console logging cleanup;
- update package signing/public-key infrastructure;
- MyCases Contract Primitives or integration;
- version changes, release packaging, publishing, registry changes on the real
  machine, or real self-update execution.

## 13. Delivery Boundaries

This design is intentionally broader than one implementation plan. It is
delivered through five sequential plans. Each plan starts from the reviewed
committed result of the prior plan and has its own TDD, focused tests, review,
and commit boundaries.

### Plan A: Package ownership and integrity

- release/update manifest schema and deterministic generation;
- archive/path/hash validator;
- ownership classes, legacy allowlist, installed-product metadata;
- frozen `verify_installation` and early `--update-probe` contracts;
- Host capability response without Service Worker enforcement yet.

Plan A does not change the active updater path. It creates the inventory and
probe primitives required by every later plan.

### Plan B: Journal engine

- transaction/journal schemas and atomic journal writes;
- product backup/install/metadata/rollback state machine;
- idempotent resume and injected failure matrix;
- named mutation mutex;
- user-data preservation and `recovery-required` behavior.

Plan B exercises only isolated temporary trees. It does not launch detached
processes, register Native Hosts, or route production update clicks yet.

### Plan C: Detached process and crash recovery

- complete frozen runner/status-host trees and early command dispatch;
- Host PID wait and handle isolation;
- RunOnce quoting, re-arm, cleanup, and manual recovery command;
- status-only Native Host registration/protocol;
- startup probe commit/rollback and transaction finalization cleanup.

Plan C integrates the journal engine with injected process/registry adapters.
No real registry or installed path is touched by automated tests.

### Plan D: Runtime and installer integration

- `perform_update` prepare plus `activate_update` ready/exit handshake;
- Service Worker as sole update coordinator, protected-action gate, detached
  status polling, restart recovery, terminal revalidation, and reload;
- legacy updater response/integrity handling;
- synchronous installer reuse and registration resumption;
- update UI events and documentation.

Only after Plan D passes does the old in-place updater path stop being active.

### Plan E: Extension data/request hardening

- bookmark discriminated reads and non-destructive Reset;
- Analyze wire/persisted parsers, mandatory persistence metadata,
  latest-started owner, request-scoped cleanup, and durability warnings;
- FAB SPA identity-only scanning and one-request Root snapshot;
- update-error normalization and config contradiction handling;
- complete Extension verification and final base-to-head whole-branch review.

Plans A-D may be implemented before or after Plan E, but no release may include
only a subset that activates transactional update routing. Within A-D, order is
mandatory. Documentation commits may accompany each plan; one final evidence
commit records all gates.

No commit is pushed, tagged, published, versioned, or installed without a
separate explicit user instruction.
