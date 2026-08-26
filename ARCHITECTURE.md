# Dynamics Helper - Native Host Architecture

## 1. The Dual-Mode Deployment Strategy

To prevent "Split Brain" (developing on source while running the installed exe), the system supports two mutually exclusive modes.

| Feature | **DEV Mode** (Source Code) | **PROD Mode** (End User / Release) |
| :--- | :--- | :--- |
| **Use Case** | Developing python logic (`host/`) | Final installation (`%LOCALAPPDATA%`) |
| **Executable** | `host/launch_host.bat` (Wrapper) | `dh_native_host.exe` (Compiled) |
| **Manifest File** | `host/host_manifest.json` | `%LOCALAPPDATA%/DynamicsHelper/manifest.json` |
| **Path Strategy** | **ABSOLUTE** (e.g., `C:\Repo\host\launch_host.bat`) | **RELATIVE** (e.g., `dh_native_host.exe`) |
| **Why?** | Browser needs full path to find the repo. | Bypass encoding bugs (e.g., `Jose`) by keeping path local. |

## 2. Critical Technical Constraints

### A. Manifest Encoding (The "Jose" Rule)

* **Rule:** The `manifest.json` MUST be written as **UTF-8 WITHOUT BOM**.
* **Reason:** Chrome/Edge Native Messaging hosts fail to parse JSON if a Byte Order Mark (BOM) is present.
* **Implementation:**
  * **PowerShell:** Do NOT use `Out-File -Encoding UTF8` (Adds BOM). Use `[System.IO.File]::WriteAllText`.
  * **Python:** Use `open(path, 'w', encoding='utf-8')` (Default is No-BOM).

### B. Registry Keys

The browser looks up the Host ID (`com.dynamics.helper.native`) in the Registry.

* **Key:** `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.dynamics.helper.native` (and Edge equivalent).
* **Value:** The **Absolute Path** to the Manifest File.
  * **Dev:** Points to `.../Repository/host/host_manifest.json`
  * **Prod:** Points to `%LOCALAPPDATA%/DynamicsHelper/manifest.json`

### C. Stdout Protection

* The Native Host communicates via `stdout` using length-prefixed JSON.
* **Any `print()` to stdout (from code or libraries) will corrupt the communication pipe** and cause "Native Host disconnected" errors.
* `dh_native_host.py` redirects `sys.stdout` to `sys.stderr` at the very top of the file. **DO NOT REMOVE THIS.**

## 3. Tooling Responsibilities

### `host/register.py` (Dev Registration)

* Calculates the absolute path of `launch_host.bat`.
* Writes `host_manifest.json` (UTF-8 No BOM).
* Updates Registry to point to `host/host_manifest.json`.

### `installer_core.ps1` (Prod Installation)

* Copies host files (exe + `_internal/` runtime from `--onedir` build) to `%LOCALAPPDATA%/DynamicsHelper`.
* Writes `manifest.json` with `"path": "dh_native_host.exe"` (Relative).
* **CRITICAL:** Uses `[System.IO.File]::WriteAllText` to ensure No-BOM.
* Updates Registry to point to `%LOCALAPPDATA%/DynamicsHelper/manifest.json`.
* **Preserves user data:** `copilot-instructions.md` and `config.json` are NEVER deleted or overwritten by the installer.

### `dev_switch.py` (Mode Toggler)

* Does NOT modify files.
* Only updates the **Registry Key** to toggle between the Dev Manifest path and the Prod Manifest path.

## 4. Self-Update Architecture

The host supports in-place updates without requiring the user to re-download and re-install.

### Flow

1. **Check:** On startup (`health_check` action), `NativeHost.check_for_updates()` queries the GitHub Releases API.
2. **Notify:** If a newer version exists, sends `NATIVE_UPDATE_AVAILABLE` message to the extension with version and download URL.
3. **Download:** When user clicks "Update Now", `updater.download_update()` fetches the release zip.
4. **Apply:** The updater extracts files to the install directory (`%LOCALAPPDATA%\DynamicsHelper`).
5. **Locked File Handling:** When replacing `dh_native_host.exe`:
   * Try renaming old file to `.exe.old`
   * If locked (antivirus): fall back to `.exe.old2`, `.exe.old3`
   * Other host files (`_internal/`, `system_prompt.md`) are overwritten directly
   * User files (`config.json`, `copilot-instructions.md`, logs) are protected via `_USER_FILES` set
   * Log errors for debugging
6. **Reload:** The FAB calls `chrome.runtime.reload()` to reload the extension with the new code. The `pending_update` key is cleared from `chrome.storage.local` on success; the Options page uses version guards to dismiss stale banners.
7. **Restart:** The host process exits; Chrome relaunches it on the next native message.

### Key Files

* **`host/updater.py`** (~208 lines): The `Updater` class handling download, extraction, and locked-file fallback.
* **`extension/src/components/Options.tsx`**: Displays update status and "Update Now" button.

### Release Integrity Metadata (Plan A)

Release staging now generates three canonical documents without changing the
active update flow:

* `update-manifest.json` assigns every packaged regular file one ownership
  class and SHA-256. It is package-only and cannot hash itself.
* `host/release-integrity.json` inventories exact Host and Extension product
  bytes. It excludes seed/user files and both metadata files.
* `host/installed-product.json` links the integrity document, package version,
  capabilities, ownership schema, and legacy allowlist version.

Staging and ZIP output are deterministic, files-only, and reject traversal,
case collisions, symlinks/reparse points, unsupported entry types, encrypted
entries, missing/extra files, and hash/link mismatches. The Host exposes
`get_capabilities` and `verify_installation`; source mode reports
`development`, while a frozen install fails closed when product bytes or
metadata disagree. `--update-probe` runs before logging, config, updater, or SDK
initialization and emits only an allowlisted JSON result.

Plan A remains package hardening. Plan B adds the standard-library transaction
engine, and Plan C adds frozen-tested detached recovery special modes. The
existing extension-first in-place updater, reload behavior, and locked-
executable fallback above remain active until Plan D wires ordinary update and
installer routing. Only `prompt-scope-v1` is advertised before that complete
cutover.

### Dormant Transaction Engine (Plan B)

`update_journal.py` owns strict canonical journal/active schemas, transaction-ID
generation, transitions, and terminal-version projection. `update_ownership.py`
filters Plan A `UpdateManifest.entries` into exact fresh, installed, or
legacy-v1 ownership. N accepts an internally consistent N+1 only when it matches
the caller's `expected_version`; manifest/integrity package capabilities,
Chrome `version`/`version_name`, product bijections, metadata hashes, and old
installed product hashes must all agree.

`update_mutex.py` provides one named installation mutation mutex.
`update_engine.py` exclusively mutates `updates/transactions/**`, stable
`updates/active.json`, and product-owned live paths under that mutex. Preparation
is inert in `updates/transactions/<id>.preparing`; it writes canonical staging
journal, probe manifest, staged Host/Extension, ownership, and prepared journal,
then atomically promotes to `updates/transactions/<id>` before writing active.
The final workspace contains `staged/`, `backup/host`, `backup/extension`,
`backup/metadata`, `failed-new/`, `probe/update-manifest.json`,
`ownership.json`, and `journal.json`. `TransactionPaths` has no recovery root.

Browser activation stores immutable `InitiatingProcessIdentity(pid,
creation_token)` before waiting for the initiating Host to exit. Synchronous
installer activation persists `initiator=installer`, accepts `process_identity`
`None`, and skips that wait. Forward phases replace Host roots before the
executable, replace Extension as a whole tree, install the metadata pair, and
probe exact live bytes before commit. Every move uses exact source/destination
hash state: exact/absent is pending, absent/exact is complete, and every other
combination fails closed before that phase mutates.

Rollback removes new metadata, Extension, and Host products, restores exact
prior products, and never owns user config. Fresh seed handling records one
durable `SeedOperationReceipt`; a post-plan user creation, later edit, or delete
is preserved. `reason_code` reports current status, while
`original_failure_code` and `rollback_from` retain the first forward failure.
Unsafe mismatch yields `manual_recovery_required`; ordinary reverse failure
yields `rollback_failed`, with all workspace/backup/failed-new evidence retained.
Terminal `committed`/`rolled-back` evidence remains until Plan C durably writes
its receipt and calls `finalize_terminal_evidence`, which removes active before
the matching workspace. `terminal_version` projects committed target, rolled
back prior, or `{fresh_install:true, version:null}` for fresh rollback.

### Dormant Detached Recovery (Plan C)

Plan C is implemented and frozen-tested, but ordinary update-click and installer
routing is still dormant. Update clicks continue through the historical Python
updater; installation continues through the PowerShell installer path until Plan
D performs the runtime cutover and advertises the transactional capability.

The stable topology is:

```text
<install>/updates/
  active.json
  transactions/<id>/...
  recovery/
    dh_update_runner.exe
    dh_update_status_host.exe
    _internal/...
    status-manifest.json  # browser registration only; absent for installer setup
  receipts/<id>.json
  finalization-cursor.json
  finalization-ack.json
```

`active.json` and `recovery/` are siblings. Replacing the reusable recovery tree
cannot move, rewrite, or delete `active.json`. Each detached executable is a
sibling copy of one preflighted PyInstaller executable beside one byte-exact
`_internal` tree.

Early dispatch classifies the canonical entrypoint and complete argv before
constructing dependencies. Normal main classification depends only on the exact
`dh_native_host.exe`/`dh_native_host.py` role and Chrome argv; missing or partial
historical metadata proceeds to normal Plan A installation verification.

| Mode | Allowed executable role |
|---|---|
| Normal main | production main or canonical source main |
| `--register` | production main or canonical source main |
| `--install-package` | production main only |
| `--update-probe` | production main only |
| `--complete-update` | detached runner only |
| `--recover-active` | detached runner only |
| `--recover-update` | detached runner only |
| Status Native Host | exact status-host basename only |

Source registration writes `host/host_manifest.json` for the absolute
`launch_host.bat`; frozen registration writes sibling `manifest.json` for the
relative `dh_native_host.exe`. Browser and status registration share the same
registry service.

Before recovery-tree installation and again immediately before activation,
`RecoveryController` strict-loads Plan B authority, materializes a temporary
combined staged Host/Extension/metadata root outside the install and transaction
trees, and invokes its copied `dh_native_host.exe --update-probe` against Plan
B's read-only probe manifest. Any copy, process, identity, capability,
revalidation, or cleanup fault is `staged_probe_failed` and leaves `PREPARED`
inert. Plan B's installed-product probe still runs after live mutation and is
the only commit gate.

Browser activation opens one immutable `{pid, creation_token}` identity and
waits on the retained handle, defeating PID reuse. Installer activation passes
`None` and never opens or waits on a process. Detached launch uses
`CreateProcessW`, canonical transaction-root `cwd`, only inherited `NUL`
standard handles, and closes parent handles after capturing the child creation
token. RunOnce is the fixed HKCU value `DynamicsHelperUpdateRecovery`; it is
armed/read back before live phases, re-armed for safe nonterminal interruption,
and removed for terminal or manual-recovery-required states.

The status executable is a read-only Native Host. It accepts only allowlisted
Chrome origin argv, caps requests at 64 KiB before body read, and projects only
transaction ID, phase, target version, and current reason. Main Host framing
remains uncapped on input and both reader/writer use explicit little-endian
32-bit framing.

Finalization reserves one durable cursor in `reserved`, writes its matching
canonical receipt, then advances that same cursor to `receipt-ready` before
status unregister and Plan B cleanup. Acknowledgment atomically moves the exact
receipt bytes to the one fixed ack slot with `os.replace`, fsyncs the moved file
and parents where supported, then removes the cursor. A crash before the move
replays from the receipt; a crash after it replays from the fixed slot. The old
slot remains read-only replay proof until a later transaction's acknowledgment
replaces it. A cursor or cursor scratch blocks every newer update start, while
an ack slot alone does not.

## 5. Session Persistence Architecture

The host maintains Copilot sessions so users can continue analysis in the Copilot CLI.

### Session ID Strategy

* **Session ID:** A deterministic UUID v5 derived from the case ID via `_case_to_session_id()`. The same case always produces the same UUID. The Copilot CLI requires session IDs to be valid UUIDs (not arbitrary strings).
* **Server Verification:** After `create_session()`, the real session ID is captured from `session.session_id`. This is stored in `self.current_session_id` and used in reports and `/resume` commands.
* **Case Tracking:** `self.current_case_id` holds the 16-digit case ID for smart-refresh comparison. This is separate from the session ID.
* **Validation:** `_extract_case_id()` accepts 16-digit (main case) or 19-digit (task ID, maps to parent 16 digits).
* **Invalid case numbers** may use a generic session only when an analysis is explicitly requested; startup never pre-creates one.
* **System Message Injection:** Before calling `create_session()` or `resume_session()`, the deterministic UUIDv5 session name is appended to the `system_message` content as `## Session Info` / `Session Name:`. This makes it available for generated files such as `context.md` frontmatter `session_name:`.

### Session Lifecycle

1. **First analysis for a case:** `resume_session(uuid)` is tried first. If no prior session exists, falls back to `create_session(session_id=uuid)`.
2. **Subsequent analyses for same case:** Session is reused only when `current_case_id` and `current_session_root_path` still match and the client/session are available.
3. **Case or root change:** The client is restarted when its process cwd differs from the configured root; the deterministic session is then resumed with explicit `working_directory=root` (or created under that root). Analyze payloads with missing/empty `rootPath` use host `config.json`; only `update_config` can clear the canonical root.
4. **SDK compatibility:** `AttributeError` is caught gracefully if the SDK version doesn't support `resume_session()`.
5. **Shell resume:** Reports print `copilot -C '<root>' --resume=<uuid>`, applying the Root before the interactive CLI continuation resolves workspace capabilities and overriding stale cwd metadata in sessions created by older DH versions. DH SDK sessions separately disable CLI automatic custom-instruction discovery and supply their selected instructions explicitly.

### Storage

* SDK stores session state at `~/.copilot/session-state/{session_id}/`.
* The report (`dh_case_report.md`) includes the server-assigned session ID and a resume command.

## 6. Case ID Pipeline

How case numbers flow from the browser to the host:

1. **PageReader** (`pageReader.ts`): Scrapes case numbers using a 4-strategy cascade (header controls, label search, header container regex, ticket title fallback). Regex: `/(\b\d{16}\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/`.
2. **FAB.tsx**: Passes `caseNumber` in the analyze payload to the service worker.
3. **serviceWorker.ts**: Transparent relay — passes the payload through to the native host.
4. **dh_native_host.py**: `payload.get("caseNumber", "Unspecified")` extracts the value. `_extract_case_id()` validates the format. Invalid numbers fall back to generic (non-persistent) sessions.

## 7. Deterministic Prompt Architecture

### Source Selection Boundary

The Native Host, not Copilot CLI discovery, owns every configurable instruction source used by DH. Every SDK `create_session()` and `resume_session()` call, including create fallback and transport retry, sets `skip_custom_instructions=True`. This excludes CLI-global instructions, `AGENTS.md`/related agent files, path-specific instruction files, and automatically discovered repository instructions from all DH sessions.

DH explicitly assembles system content from:

1. Product-managed DH Core (`host/system_prompt.md` in development or beside the installed Host executable).
2. Exactly one editable source selected by `effective_repository_only = bool(effective_root) and use_workspace_only`:
   * false: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (DH-specific Instructions);
   * true: `<Root>/.github/copilot-instructions.md` (Repository Instructions).
3. Deterministic Session Info containing the UUIDv5 session name.

Custom User Prompt (`%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`) never enters system content. The Host rereads this canonical source for each Analyze, replaces/removes any Extension-provided `## User Prompt` section, and then PII-scrubs the final user content. The only supported repository instruction path is the Root-level `.github/copilot-instructions.md`; DH does not reproduce the CLI's parent, agent-file, or path-specific discovery rules.

### Snapshot and Refresh Boundary

`PromptSnapshot` is frozen and contains source mode, effective Root, exact Core/selected bytes, strict UTF-8 decoded strings, and a `v1:` SHA-256 fingerprint. Core and the selected source are each opened once per resolution attempt. The fingerprint length-frames the version marker, source mode, Core bytes, and selected bytes, preventing ambiguous concatenation and ensuring assembly and comparison observe the same bytes.

Analyze resolves a fresh snapshot before every turn. The active session is reused only when client/session, case identity, active Root, and fingerprint all match. Any source-mode or byte change refreshes/resumes the same UUIDv5 session, preserving persisted history. The candidate fingerprint becomes active only after awaited SDK resume/create succeeds. All active-session invalidation routes use `_invalidate_active_session()`, which clears session identity, active Root, and `current_prompt_fingerprint`; transport failures may also clear the client.

Prompt resolution is fail-closed. Missing/unreadable Core, unreadable selected DH-specific Instructions, and missing/unreadable selected Repository Instructions return stable safe errors and send no model turn. A missing DH-specific file and an existing empty Repository file are valid empty editable layers. There is no fallback to an unselected source.

### Config and Error Boundary

`get_config` uses a soft health projection rather than creating a strict session snapshot. It returns normal configuration plus `prompt_source_status`; Options therefore remains available to repair a bad source. Readable DH-specific text is returned separately as `_user_instructions_raw`, and readable Custom User Prompt as `extension_preferences.user_prompt`, including explicit empty strings. An unreadable/invalid-UTF-8 file omits its content property; Custom User Prompt uses `user_prompt_unreadable`, so neither editor is overwritten with a false empty value. Session-refresh `_get_session_config` calls do not read/migrate/hydrate `user_prompt.md`; Analyze reads it once through its separate canonicalization boundary.

`update_config` distinguishes sparse field omission from explicit empty content for both `user_instructions` and top-level `user_prompt`. Omission performs no file write; explicit `""` truncates the selected file. Options carries immutable revision/value tokens only on explicit edit/clear/Reset, acknowledges matching saved revisions, and retries unacknowledged values. Its structured result separates durable persistence (`config_saved`) from session refresh (`success`). The Host does not roll back uncertain partial writes; it invalidates stale active prompt state once a durable writer was attempted.

Options serializes and coalesces `dh_prefs` mirror writes. Normal persistence
and post-hydration catch-up both capture immutable intents and route through the
same queue. Host updates, typed team actions, and the initial Reset Host dispatch
are latest-commit work of only the newest successful snapshot; storage failure
retains unsettled intent and exposes a warning. Reset is one tokenized two-phase transaction. The default
mirror and matching Host `update_config` must durably acknowledge before the
Service Worker receives `RESET_EXTENSION_STATE`. Options keeps an explicit
transaction `{token, default identity, request/bookmark generations, phase,
retryAction}` outside the coalescing mirror-action queue. Its phases are
`host-pending`, `host-committed`, `sw-pending`, `local-cleanup-pending`, and
`complete`. Host acknowledgment is recorded before newer-callback checks; after
that point the token never resends Host or rewrites defaults. Only matching SW
`committed` truth advances to scoped local cleanup. The warning's Retry cleanup
control resumes the stored SW/local phase, while a normal Reset click creates a
fresh transaction. Host failure causes no SW destruction, and
`config_saved: true` refresh failure still permits cleanup.
Personal `dh_items` mutations additionally share one generation counter and
serialized write/remove queue. A committed shared reset cannot remove or reload
personal bookmarks after a newer personal generation; that outcome is partial,
keeps the newer UI/storage snapshot, and never displays complete success.
Set/remove failure retains the newest full bookmark intent, keeps a localized
persistence warning visible, and clears it only after a later successful
coalesced mutation.
FAB similarly owns an Analyze request through all asynchronous response
processing, including case hashing, so stale requests have no UI or telemetry
authority.

Analyze errors may carry optional `error_code`. The Service Worker persists raw safe fallback text plus optional `LastAnalysis.errorCode`, preserving an inner Analyze code over an outer wrapper code. Immediate and rehydrated FAB display use the same render-time localization helper for known codes; immediate unknown-code fallbacks may include a safe UI prefix, while rehydrated unknown/legacy codes retain the raw stored fallback. Instruction contents, Custom User Prompt contents, and prompt-source paths are excluded from normal logs and telemetry.

Extension error extraction uses one `safeErrorText` boundary. It returns the
first non-empty string candidate or a trusted fixed/localized fallback and never
coerces objects, arrays, functions, symbols, or null. Analyze persistence,
Native response normalization, config updates, Options health/warnings, FAB
nested/outer display, and Service Worker immediate error paths all use it.
Success `data` remains unchanged; error envelopes retain only normalized
`error_code`, string `errorKind`, finite numeric `httpStatus`, and selected
string fallback text. This preserves model-list auth/unavailable classification
without forwarding arbitrary Host fields.

Service Worker persistence has two ownership domains. Team requests carry captured enabled/URL/team identity plus request generation; `teamCatalog.ts` synchronously invalidates older generations and queues validation with awaited manifest/item/ETag/timestamp/clear mutations. Its callback-style set/remove wrappers reject on callback-scoped Chrome storage errors. Mutation rejection becomes identity-safe `failed` truth with no items/timestamp success payload, while generation/identity mismatch remains `stale` and the queue accepts later work. `analysisStore.ts` uses request-scoped pending and identity-scoped seen keys, so A/B remain independent across worker restarts; hydration derives last, newest matching pending, and acknowledgment from one snapshot. Options issues Service Worker messages and does not mutate owned keys directly.

Options manifest blur state separates the last successful URL from a tokenized
in-flight `{token, manifestUrl}`. Duplicate concurrent blurs for the same URL
coalesce. Only the current identity-matching `committed` or `unchanged` response
promotes success; failed, transport, stale, and skipped outcomes release only
their own token and remain retryable. An older URL callback cannot clear or
complete a newer request. Options normalizes every optional team value to `''`
for current and response checks, making no-team results follow the same terminal
truth as selected-team results.

Options' ordered preference mirror attaches stable post-commit action IDs to
user intents. Compatible newer snapshots inherit unsettled actions, incompatible
team identities cancel them, and settlement precedes dispatch so recursive
repair writes remain exactly once. Options and Menu team UI reads separately
generation-gate asynchronous cache snapshots. FAB local Analyze ownership and
safety timers are request-ID scoped and reconcile with the hook's full hydrated
pending identity rather than a boolean mirror.

### Product Scope

Repository ONLY selects repository Skills, MCP, and the single Root instruction file while DH Core and Custom User Prompt remain active. This architecture is generic to any absolute Root. It does not implement MyCases detection, Stage 0 coordination, Stage 1 persistence, MyCases file writes, or an Auto/Standalone/Integrated mode.
