# Runtime, Transaction, and Data Boundaries

## 1. Purpose

Define current trust, ownership, update, and data boundaries. Detailed coordinator
behavior is in the [transactional-update contract](transactional-auto-update.md).

## 2. Ownership

The Service Worker owns update coordination and analysis result/pending/Reset
storage. Options owns preference and personal-bookmark intent queues and explicit
Reset cleanup phases. FAB owns only its local request/page projection and separate
seen identity. Host `UpdateEngine` owns journal transitions and transaction files;
recovery orchestration must call that engine rather than mutate its authority.

## 3. Trust Principles

Parse once at each boundary into safe typed snapshots. Validate primitive types
and own data descriptors without coercing or logging rejected values. Persist
identity before effects, recheck it after awaits, and retain recovery evidence on
failure. A multi-file replacement with rollback is not a power-loss-atomic swap.

## 4. Runtime Host Protocol Gate

### 4.1 Capabilities and integrity

The update coordinator validates Host/Extension versions, the
`transactional-update-v1` capability and packaged installation integrity before
accepting an update candidate. Missing capability never selects a legacy execution
fallback. This update validation is distinct from ordinary request routing: the
current Worker does not implement a separate per-port `prompt-scope-v1` gate for
Analyze/config/model calls. Do not infer such protection from Host capability data.

`release-integrity.json` inventories product bytes, version, capabilities, and
Chrome identity. It excludes itself and `installed-product.json` to avoid
recursive hashes. `installed-product.json` links its exact SHA-256 and metadata;
package `update-manifest.json` externally inventories both metadata files.

Frozen `verify_installation` validates the coupled metadata, product inventory,
and Host/Extension identity and returns packaged/verified or a fixed failure.
Only source mode can return development integrity. Hashes detect incomplete or
mixed products, not malicious repacking; they are not signatures.

### 4.2 Routing and suppression

| Operation | Current gate/owner |
|---|---|
| `analyze_error`, `get_config`, `update_config`, `list_models` | Serialized ordinary-traffic permission after update-state hydration |
| `ping`, `health_check`, ordinary handshake requests | Not unconditional bypasses: obey hydrated update-state suppression |
| Manual `check_updates` | Only hydrated `idle`, `available`, or `complete`, rechecked in the serialized SW path; discovery does not start installation |
| `perform_update`, `activate_update`, `finalize_update_status`, `acknowledge_update_finalization` | Coordinator-owned exact, request-correlated actions; generic `NATIVE_MSG` forwarding denied |
| `get_update_status` | Detached status Host, never a normal main-Host action |
| Recovery kick / terminal verification | Narrow coordinator-owned paths for the existing transaction |

Native disconnect clears the port and pending requests; it is not a capability
cache invalidation mechanism. UI never owns a second gate, transaction, polling
loop, reload, or update-storage writer. Transactionless matching-installer guidance
does not by itself suppress ordinary main-Host traffic.
Update-state hydration precedes ordinary sends. After activation begins, ordinary
main-Host Analyze/config/health traffic stays suppressed through status polling,
reload, terminal verification, and finalization until a verified safe disposition.
The bounded recovery kick is not permission for general reconnects. A proven
pre-mutation `PREPARED` failure can retain same-ID retry and safely restore
ordinary use under coordinator rules.

## 5. Journaled Update Transaction

### 5.1 Package ownership

Every packaged regular file appears once in `update-manifest.json`, with one
ownership class and lowercase SHA-256. `stage_and_validate_archive` rejects
traversal, absolute paths, duplicates/case collisions, directory entries,
links/reparse points, encryption, unsupported types, missing/extra files, and
hash mismatch before accepting staging. Never use `extract`/`extractall`.
Resource limits and target-version checks are in the reliable-update contract.

| Ownership | Replacement behavior |
|---|---|
| Whole product trees `_internal/`, `extension/` | Replace complete trees; stale children do not survive |
| Manifest-listed Host product files | Replace exact owned files, remove superseded owned files |
| Product metadata pair | Back up, install verified pair, restore prior pair/absence on rollback |
| Seed-only `config.json` | Seed only if absent on fresh install; user-created/edited config wins |
| User config/instructions/prompt/logs, generated `manifest.json` | Preserve |
| Unknown top-level paths and unrelated `updates/**` | Preserve, never infer product ownership from location |
| Package-only manifest/installer files | Validate as package inputs, not live Host runtime |

### 5.2 Authority and paths

IDs are exact lowercase 32-hex from 16 random bytes. The fixed topology is:

```text
updates/active.json
updates/transactions/<id>.preparing/
updates/transactions/<id>/journal.json
updates/transactions/<id>/ownership.json
updates/transactions/<id>/probe/update-manifest.json
updates/transactions/<id>/staged/host/**
updates/transactions/<id>/staged/extension/**
updates/recovery/
updates/receipts/<id>.json
updates/finalization-cursor.json
updates/finalization-ack.json
```

Transaction backups also belong to the matching transaction root.
`TransactionPaths` has no `recovery_root`; recovery is the separate fixed tree.
Canonical/lexical containment and non-reparse topology are validated, not inferred
from a caller path. `active.json` identifies the matching transaction/journal.

Preparation stages only under `<id>.preparing`, verifies exact candidate journal,
ownership, probe, and inventories, then atomically promotes before publishing
active authority. N validates an internally consistent N+1 package against the
trusted requested `expected_version`, not N's importing `VERSION`. The
[Windows promotion retry](windows-staging-promotion-retry.md)
preserves this publication boundary.

### 5.3 Locks, phases, and probes

The cross-process operation mutex `Local\DynamicsHelper.UpdateOperation.<hash>`
covers entire prepare/activate/finalize/ack operations. It is distinct from the
installation mutation mutex; lock order is operation before mutation, never a
process-local substitute or recursive use of the same mutex.

Forward journal phases are `staging`, `prepared`, `waiting-for-host-exit`,
`host-backed-up`, `host-installed`, `extension-backed-up`, `extension-installed`,
`metadata-installed`, `probing`, `committed`. Failure recovery uses `rolling-back`,
`rolled-back`, or `recovery-required`. Journal writes use atomic sibling
replacement with durability steps. Resume reconciles owned paths idempotently;
`reason_code` is current status, while `original_failure_code` and `rollback_from`
retain original failure lineage. Seed receipts keep fresh-install ownership
distinct from later user edits.

Before recovery-tree/status/RunOnce/live mutation, materialize and probe the exact
combined staged Host, Extension, and metadata view. Repeat preflight immediately
before activation. Replacing `updates/recovery` preserves `updates/active.json`
byte-for-byte. `require_no_pending_finalization` blocks new preparation before
network/package work when prior finalization remains.

Commit replaces Host, then Extension, then verifies metadata and installed product
through the early probe. The probe checks runtime startup, exact expected
versions, capabilities, Core/product hashes, and Chrome identity without SDK,
authentication, or a model turn. Failed replacement/probe rolls back complete
owned product sets, not just the EXE. Only a successful target probe commits;
unrecoverable rollback preserves evidence and requires matching-installer repair.

### 5.4 Detached recovery

`updates/recovery` holds a complete frozen runtime with `dh_update_runner.exe`
and `dh_update_status_host.exe`, not an EXE-only copy. Browser activation captures
immutable `{pid, creation_token}`; installer activation uses `None`. The process
adapter waits on the retained exact process handle, never a reopened PID.

Detached launch uses `CreateProcessW`, canonical transaction-root cwd, an explicit
NUL-handle allowlist, and closes parent handles exactly once. It inherits no
Native Messaging pipe. The Host acknowledges activation only after durable runner
readiness, flushes the response, and exits before live replacement.

`update_entrypoint.py` validates executable role, source/frozen mode, exact argv,
identity, and path authority before constructing dependencies. Invalid non-probe
invocations return exit 2, empty stdout, and `invalid_early_invocation\n`; malformed
probes use the single fixed probe serializer. Frozen startup recovery happens
before normal config/logging/SDK construction; unrecoverable startup returns 30,
empty stdout, and `manual_recovery_required\n`.

The status-only Native Host `com.dynamics.helper.update_status` accepts exact-ID
status reads and ping, never product mutation or user config access. Recovery
uses validated `updates/active.json` and the engine. Fixed `--recover-active`
RunOnce registration is a best-effort restart aid, not a delivery guarantee.
No arbitrary journal-path command is a supported bypass.

### 5.5 Finalization and repair

Reserve the one finalization cursor, write at most one matching receipt, then
advance to `receipt-ready`. After receipt durability/status unregister,
`UpdateEngine.finalize_terminal_evidence` removes active before the matching
terminal workspace. Recovery orchestration cannot delete those files directly.

Acknowledgment moves the receipt with one same-volume `os.replace` to fixed
`finalization-ack.json`, then removes the cursor. Never scan receipts, use random
scratch names, write a separate ACK object, overwrite pending cursor ownership,
or copy-delete/unlink the receipt. Cleanup failure is retryable same-phase truth,
not permission to announce completion or erase evidence.

The matching full installer is a separate repair path. It refuses a running Host or legacy Roaming
data before mutation, probes a temporary combined product, replaces `_internal`
completely, preserves user files/evidence, probes the live product, and invokes
frozen-only `--settle-installer-repair`. Compatible authority settles to matching
target/prior terminal state; contradiction fails without evidence deletion.
It neither force-terminates processes nor migrates/deletes legacy user data.

Standalone bootstrap and per-write power-loss atomicity remain deferred. An old
release's first upgrade cannot be made transactional retroactively; mixed installs
receive matching-installer guidance, never a fabricated transaction or legacy
execution fallback. Browser completion is separately defined by the
[completion acknowledgment contract](update-completion-acknowledgment.md).

## 6. Bookmark Loading and Reset

Stored bookmark reads distinguish `saved`, `absent`, `invalid`, and `failed`.
Only absent storage may load packaged defaults. Failed callbacks inspect scoped
`lastError`; invalid stored data remains untouched, not replaced by defaults.
Default JSON accepts an array or the supported `{items: array}` wrapper and must
parse successfully before persistence.

Items have supported type, string label, typed optional string/boolean/tag/source
fields, and recursively valid children. Unknown safe own data fields are retained;
unsafe accessors/prototypes, wrong types, cycles, and depth over 64 are rejected
without coercion. Generation checks protect mount normalization from later edits.

Reset loads/validates collapsed defaults before a generation-owned storage set,
never removes `dh_items` first. Failed load/write leaves current data and
`local-cleanup-pending` retry ownership. Personal mutation and Reset share one
queue; stale Reset cannot overwrite a newer bookmark generation.

## 7. Analyze Wire Schema

Inner success requires exact `status:'success'`, non-array data, string markdown,
and optional string `saved_to`. Only parsed fields proceed; malformed success
becomes fixed `malformed_native_response`, never serialized fallback data.

Every Extension Analyze requires non-empty top-level request ID and `_persist`
with string case number and non-empty success/error titles. Invalid metadata
returns `invalid_analyze_persistence_context` before effects. Safe immutable
envelopes and final-wire construction follow the
[Native snapshot contract](native-message-snapshot.md).

Completion preserves the normalized Host outcome while separately reporting
allowlisted storage warnings. Result write is once; matching pending cleanup
retries at most three times with 50/200 ms delays. Initial pending/owner write
failure prevents Host send.

## 8. Durable Analyze Ownership and Storage Schemas

`dh_latest_analysis_owner` stores `{caseNumber, requestId, startTime}` alongside
request pending in the same serialized start write. Only completion matching
both durable identities can write `dh_last_analysis`. Missing/malformed/unreadable
ownership cannot authorize it. Non-owner responses clean only matching pending.
Owner survives completion/Worker restart until a newer accepted start or Reset.

Result, pending, seen, and owner fields are parsed before rendering or identity
arithmetic. Per-request pending and per-identity seen keys coexist; legacy singleton
records remain compatibility read inputs. Reset clears owner/result/pending/seen,
including legacy keys. The complete numbered definition remains
[analysis section 5](analysis-result-persistence.md#5-invariants).

## 9. FAB Request Identity and Root

`PageIdentity` uses `case:<caseNumber>`, otherwise `title:<ticketTitle>`, otherwise
no identity. Title is only a live navigation guard, never a durable storage key.
During Analyze, identity-only scans cannot overwrite editable context/user-edit
protection. Navigation prevents old result UI/duration/outcome telemetry from
attaching to the new case; hydration follows the new exact case, and a full scrape
after Analyze catches up even without another mutation.

Create request ID before local ownership and timeout. All responses, timers,
catches, and finalizers recheck matching request/page identity, including after
case hashing. Hydrated pending expiry never cancels a local active request.

Each invocation snapshots Root. Context-menu override is not persisted in React
preferences/storage; explicit empty applies only to that invocation and is marked
on the wire. Subsequent ordinary Analyze uses current preferences/Host fallback.

## 10. Safe Errors and Config Acknowledgment

Unsolicited `update_error` is reduced at SW ingress to
`{type:'NATIVE_UPDATE_ERROR', payload:{error: safeString}}`. Raw values are not
forwarded or logged. Options/FAB retain string-only validation at display.

| `success` | `config_saved` | Acknowledgment |
|---|---|---|
| true | absent | Yes, shipped legacy response compatibility |
| true | true | Yes |
| true | false | No, contradictory unsaved result |
| false | true | Yes, with post-save issue |
| false | absent/false | No |
| any | present non-boolean | No, malformed |

Absent means no own property, not null or another malformed value. Only
acknowledged responses advance saved prompt revisions. Errors use
`safeErrorText` and trusted fallbacks. See
[Reset/error contract](configuration-storage-contract.md#reset-transaction).

## 11. Source Map

- [Package validation](../../host/package_archive.py), [manifest](../../host/package_manifest.py)
- [Journal/path authority](../../host/update_journal.py), [engine](../../host/update_engine.py)
- [Recovery/finalization](../../host/update_recovery.py), [entrypoint](../../host/update_entrypoint.py)
- [Update service](../../host/update_service.py), [installer](../../installer_core.ps1)
- [SW coordinator](../../extension/src/background/updateRuntime.ts)
- [Bookmark parser](../../extension/src/utils/bookmarkItems.ts)
- [Config classifier](../../extension/src/utils/configUpdateResult.ts)

These are architecture references, not evidence that a build, live update,
installer, or test suite has been executed or authorized.
