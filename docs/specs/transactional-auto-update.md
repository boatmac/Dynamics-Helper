# Transactional Auto-Update

## Goal

One SW-owned automatic-update flow replaces complete matching Host/Extension
products, handles ordinary failures through rollback/recovery, and reports only
verified outcomes. This describes current source contracts, not installed-state
qualification or authority to build, install, test, or publish.

Package ownership, canonical transaction paths, probes, process identity, and
finalization topology are defined in the
[transaction architecture](runtime-transaction-data-boundaries.md#5-journaled-update-transaction).

## Host Boundary

[UpdateService](../../host/update_service.py) composes download, validation,
`UpdateEngine`, and recovery/finalization. Production does not call
`Updater.apply_update`; verified legacy `.old*` cleanup is separate. Ordinary
Host construction must not repair, overwrite, or delete Extension trees.

- Downloads use owned temporary storage, 30-second network timeout, 256 MiB
  maximum declared/actual bytes, length agreement, and no HTTPS downgrade.
  Owned temporary downloads are cleaned on every outcome, not transaction evidence.
- Archive limits: 20,000 entries, 128 MiB per entry, 512 MiB total declared/actual
  extracted bytes, compression ratio at most 200. Unsafe types/paths and inventory
  mismatches fail before staging acceptance or live mutation.
- Release discovery requires exactly one direct HTTPS ZIP. Candidate tags may
  normalize one leading `v`/`V`; internal target/package/Host/Extension versions
  are strict unprefixed SemVer. Target must be strictly newer than the verified
  current product at candidate acceptance, start, and Host preparation.
- `require_no_pending_finalization` runs before preparation network/package work.
  Verify installed product and stage against trusted `expected_version`, then
  create prepared authority and preflight the complete recovery runtime.
- Source runtime permits checks, but update execution returns
  `source_update_disabled`. Frozen startup performs active recovery before normal
  Host/config/SDK construction when required.

The operation mutex covers each complete prepare/activate/finalize/ack, before
the distinct mutation mutex. Activation requires matching prepared transaction,
retained initiating process identity, and durable runner readiness; flush the
response before orderly main Host exit. Operations are bounded and cancellable.

## Strict Actions

Every request has exact `{requestId, action, payload}` and a non-empty primitive
request ID. Responses echo that ID; requests and success data reject extra/missing
keys and wrong primitive types. All transaction IDs are lowercase 32-hex.

| Action | Payload | Success data |
|---|---|---|
| `perform_update` | `{url, transactionId, targetVersion}` | `{state:'update_prepared', transactionId, targetVersion, priorVersion}` |
| `activate_update` | `{transactionId}` | `{state:'update_activated', transactionId}` |
| `finalize_update_status` | `{transactionId}` | `{transactionId, outcome, terminal_version, state:'finalized-awaiting-ack'}` |
| `acknowledge_update_finalization` | `{transactionId}` | `{transactionId, acknowledged:true}` |

`terminal_version` is `{fresh_install, version}`; browser commit uses target and
rollback uses captured prior version. Prepare means staged, not installed.
Finalization receipt durability precedes terminal evidence cleanup; acknowledgment
moves that receipt to fixed ACK before removing the cursor.

Errors are exact request-correlated error envelopes with fixed code/message,
never URL, path, exception text, or response body:

| Code | Fixed message |
|---|---|
| `invalid_update_request` | The update request is invalid. |
| `installation_integrity_failed` | The installed Host and Extension do not match. Run the matching full installer. |
| `update_already_in_progress` | Another update is already in progress. |
| `update_prepare_failed` | The update could not be prepared. Retry or run the matching full installer. |
| `update_activation_failed` | The prepared update could not be started. Retry or run the matching full installer. |
| `update_not_terminal` | The update has not finished yet. |
| `update_cleanup_failed` | The update finished but cleanup is incomplete. Retry cleanup. |
| `source_update_disabled` | Automatic update is disabled while the source Host is registered. |
| `manual_recovery_required` | Automatic recovery could not finish. Run the matching full installer. |

## Service Worker Ownership

[updateRuntime.ts](../../extension/src/background/updateRuntime.ts) owns strict
state parsing, serialized transitions, `dh_update_state`, alarms, resume/reload,
verification, and completion. Persist before updating the in-memory projection,
broadcasting `DH_UPDATE_STATE`, or starting an external effect. Failed storage
prevents the following effect.

`UpdateCandidate` is exact `{version,url,isPrerelease}`. `UpdateTransaction` adds
`transactionId`, `targetVersion`, and `priorVersion`. Public UI projections do
not expose the private candidate URL. Persisted states are:

| Kind | State-specific fields in addition to transaction, where applicable |
|---|---|
| `idle` | None |
| `available` | Candidate |
| `preparing` | Transaction, optional `errorCode` |
| `activating` | Transaction, `activationRetryUsed`, optional `errorCode` |
| `polling` | Transaction, `lastStatus`, `lastProgressAt`, `recoveryKick` (`unused`, `pending`, `confirmed`) |
| `reload-pending` | Transaction, outcome, optional `errorCode` |
| `ack-pending` | Transaction, receipt, optional `errorCode` |
| `complete` | Candidate, exact `transactionId`, committed/rolled-back outcome |
| `recovery-required` | Code, action (`resume`, `verify-terminal`, `recheck-installation`), optional transaction |

Unknown/malformed states fail closed. Legacy `pending_update` is removed rather
than migrating its URL; a fresh discovery supplies a candidate. Incoming candidates
cannot overwrite active transaction/receipt ownership. A matching rolled-back
completion retains its notice until consumption rather than replaying discovery.

FAB/Options request/project state only. `DH_UPDATE_START` and
`DH_UPDATE_GET_STATE` are exact payload-free messages; completion ACK is the exact
two-field message defined by the [completion acknowledgment contract](update-completion-acknowledgment.md).
UI never forwards transactional Host actions, writes update storage, reloads, or
optimistically completes. Generic `NATIVE_MSG` for the four strict actions is denied.

## Discovery and Suppression

Manual `check_updates` is allowed only after hydration in `idle`, `available`, or
`complete`, with a serialized recheck before dispatch. Its initiation response is
not the discovery result. Fixed `DH_UPDATE_CHECK_RESULT` outcomes settle the
Options check without URLs; discovery notifications have no per-request identity.
Manual discovery never implies `DH_UPDATE_START`.

Ordinary Host requests wait for update hydration and serialized send permission.
Activation in flight, polling, reload-pending, ack-pending, and transaction-backed
recovery suppress Analyze/config/health and ordinary main-port reconnects. This
persists across Worker/Extension reload through final verification/finalization.
Only narrow coordinator activation retry, recovery kick, and terminal work may
use their designated connections. A verified pre-mutation prepared failure can
re-enable ordinary use without losing same-ID retry ownership.

## Update Flow

```text
available -> preparing -> activating -> polling
-> reload-pending -> fresh Worker verification/finalization
-> ack-pending -> complete
-> visible completion ACK -> idle (committed) or available (rolled-back)
```

Preparation validates/stages without live product replacement. After activation,
status traffic uses only `com.dynamics.helper.update_status`, separate from live
product files. Poll at 250 ms, 500 ms, 1 s, then 2 s, up to two minutes per wake;
timeout retains polling for the next wake. One 30-second alarm covers preparing,
activating without an error, polling, reload-pending, ack-pending, and transaction-
backed recovery. Other states clear it; fast in-memory polling is not the only
MV3 liveness mechanism.

After 30 seconds without journal progress, persist a pending recovery kick before
opening the main Host's early recovery path. Confirm connect/disconnect, persist
confirmed, and resume status-only polling. A Worker restarting from pending reads
status first; repeating the idempotent kick must converge on the same transaction.
An activating restart also queries status first: only exact `PREPARED` permits
one activation retry; later/terminal phases proceed to polling/reload handling.

Deterministic prepare/activate failure retains its state, error, and transaction
ID. User retry repeats that phase, not a new transaction. The coordinator does
not delete prepared evidence to make another attempt possible.

Terminal status persists reload-pending before Extension reload. A per-Worker
instance token prevents the Worker that requested reload from finalizing its own
state. The fresh Worker verifies actual Extension version, Host version,
capabilities, and packaged integrity for target commit or prior rollback before
finalization. Persist the validated receipt before acknowledgment. Cleanup errors
stay in reload-pending/ack-pending with safe `errorCode` and same-phase retry.

Mismatch becomes transaction-backed recovery-required: preserve evidence, suppress
ordinary traffic, and do not acknowledge, erase state, reload repeatedly, or
announce success. Repair continuation queries status first and repeats terminal
verification for the same transaction. Contradictory or missing required evidence
never becomes transactionless success.

## Compatibility and Limits

Transactional execution requires `transactional-update-v1` plus matching verified
products. New Host rejects legacy URL-only `perform_update`; new Extension cannot
execute against an old/mixed/unverified Host. There is no legacy bypass. Startup
may clear a transactionless installer-required marker only after complete product
agreement; this shortcut never clears transaction-backed recovery evidence.

The matching installer refuses a running Host/legacy Roaming data, verifies the
combined product before and after copying, replaces `_internal` completely, and
settles compatible journal authority. It preserves user files and `updates/**`;
it does not force termination or prescribe selective file repair.

An old updater's first upgrade remains historical behavior, not retroactively
transactional. Rollback restores the actual prior Extension; a notice protocol
absent from that version cannot be claimed as verified by the newer UI. Completion
eligibility is [eight continuous visible seconds](update-completion-visibility.md),
not component mount time.

Independent bootstrap, registry quiescence across every browser profile, and
per-write power-loss atomicity are deferred. Ordinary locked-file failures use
rollback where possible, otherwise matching-installer recovery with evidence
preserved. Source contracts alone do not establish frozen or live qualification.
