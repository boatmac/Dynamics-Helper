# Plan D Reliable Auto-Update Design

**Status:** Approved in-session on 2026-09-01

## Goal

Keep one-click automatic updates while eliminating false success, unsafe ZIP
handling, Host/Extension version mixing, and ordinary update failures that cannot
roll back.

Plan D is application update reliability, not a bank-grade storage transaction.
Normal failures and process restarts must be handled. A machine power loss at an
unrecoverable filesystem boundary may require reinstall and is documented as a
residual risk rather than expanding the design indefinitely.

## Existing Problems

The production updater currently:

1. extracts an untrusted ZIP with `extractall()`;
2. validates only that `extension/` and `host/dh_native_host.exe` exist;
3. overwrites Extension before replacing Host;
4. ignores some locked-file and copy failures, then reports success;
5. backs up only the Host EXE, not Extension or `_internal`;
6. does not bind the requested target version to package metadata;
7. may accept stale UI state and install an older release;
8. has no durable browser-visible progress across Service Worker or Extension
   reload;
9. deletes old EXE backups before proving the new complete installation works.

Plans A, B, and C already contain the required foundations: safe package
validation, full Host/Extension backup and rollback, detached replacement of
locked files, a status Host, and journal-based process-restart recovery. Plan D
connects those components to the production Host and Extension.

## Scope

### Host

Add one focused `host/update_service.py` that:

- downloads to an owned temporary directory with a 30-second network timeout and
  256 MiB maximum response size;
- removes owned temporary files on every outcome;
- calls `stage_and_validate_archive(..., expected_version=target_version)`;
- verifies the current packaged installation before preparation;
- calls `UpdateEngine.create_prepared` with the browser transaction ID, target,
  current version, and browser initiator;
- calls `RecoveryController.prepare_recovery_runtime`;
- activates only a matching prepared transaction through
  `launch_complete_update` and `wait_until_ready`;
- exposes finalization and acknowledgment through existing Plan C APIs;
- maps known failures to short fixed error codes without leaking URLs, paths, or
  exception text.

Plan A archive extraction adds simple fixed resource limits: at most 20,000
entries, 128 MiB per entry, 512 MiB total declared/actual extracted bytes, and
compression ratio at most 200. Boundary values pass; one-over values fail before
live mutation. This is ordinary ZIP-bomb protection, not a new evidence system.

Version identity is normalized once: release tags may display one leading `v` or
`V`, while `targetVersion`, package metadata, Host `VERSION`, and Extension
`version_name` use strict SemVer without that prefix. Any other transformation or
version mismatch fails.

`host/dh_native_host.py` routes the transactional actions to this service and
flushes the activation response before normal Host exit. Before SDK/config startup,
frozen Host startup launches `--recover-active` for a valid post-activation
nonterminal journal. Invalid authority or explicit `manual_recovery_required`
shows a fixed reinstall/recovery message and preserves evidence.

Source runtime continues to allow update checks but rejects update execution.

The Host wire is exact. `targetVersion` and every response version omit a leading
`v`:

```jsonl
{"requestId":"r-prepare","action":"perform_update","payload":{"url":"https://example.invalid/release.zip","transactionId":"0123456789abcdef0123456789abcdef","targetVersion":"2.0.76-beta.1"}}
{"requestId":"r-prepare","status":"success","data":{"state":"update_prepared","transactionId":"0123456789abcdef0123456789abcdef","targetVersion":"2.0.76-beta.1","priorVersion":"2.0.75-beta.1"}}
{"requestId":"r-activate","action":"activate_update","payload":{"transactionId":"0123456789abcdef0123456789abcdef"}}
{"requestId":"r-activate","status":"success","data":{"state":"update_activated","transactionId":"0123456789abcdef0123456789abcdef"}}
{"requestId":"r-finalize","action":"finalize_update_status","payload":{"transactionId":"0123456789abcdef0123456789abcdef"}}
{"requestId":"r-finalize","status":"success","data":{"transactionId":"0123456789abcdef0123456789abcdef","outcome":"committed","terminal_version":{"fresh_install":false,"version":"2.0.76-beta.1"},"state":"finalized-awaiting-ack"}}
{"requestId":"r-ack","action":"acknowledge_update_finalization","payload":{"transactionId":"0123456789abcdef0123456789abcdef"}}
{"requestId":"r-ack","status":"success","data":{"transactionId":"0123456789abcdef0123456789abcdef","acknowledged":true}}
```

Requests and success data reject extra or missing keys and wrong primitive types.
Errors use request-correlated envelopes with fixed codes. `prepare()` calls
`require_no_pending_finalization()` before network or package work.

Rollback finalization has the same data keys as committed finalization, with
`outcome:"rolled-back"` and the prior version in `terminal_version.version`.
Errors are exact `{"requestId":"<same-id>","status":"error","error_code":
"<code>","error":"<fixed-message>"}` using this closed table:

| Code | Fixed message |
|---|---|
| `invalid_update_request` | `The update request is invalid.` |
| `installation_integrity_failed` | `The installed Host and Extension do not match. Run the matching full installer.` |
| `update_already_in_progress` | `Another update is already in progress.` |
| `update_prepare_failed` | `The update could not be prepared. Retry or run the matching full installer.` |
| `update_activation_failed` | `The prepared update could not be started. Retry or run the matching full installer.` |
| `update_not_terminal` | `The update has not finished yet.` |
| `update_cleanup_failed` | `The update finished but cleanup is incomplete. Retry cleanup.` |
| `source_update_disabled` | `Automatic update is disabled while the source Host is registered.` |
| `manual_recovery_required` | `Automatic recovery could not finish. Run the matching full installer.` |

Exception text, URLs, paths, and response bodies never enter these envelopes.

### Extension

Add one focused `extension/src/background/updateRuntime.ts`. It owns strict
parsing, SemVer comparison, one serialized update state machine, and one storage
key `dh_update_state`.

`UpdateCandidate` is exact `{version,url,isPrerelease}` with normalized SemVer,
direct HTTPS ZIP URL, and boolean prerelease. `UpdateTransaction` carries that
candidate plus `transactionId`, `targetVersion`, and `priorVersion`. Persisted
objects reject extra keys, invalid IDs, malformed URLs, and unknown state kinds.

The Service Worker is the only update coordinator. It:

- accepts Host `update_available` only when target is strictly newer than the
  current Extension;
- handles payload-free `DH_UPDATE_START` from UI;
- creates and persists one 32-lowercase-hex transaction ID;
- sends prepare and activate through the existing main Native sender;
- after activation, uses a separate small port to
  `com.dynamics.helper.update_status` and does not reconnect the main Host;
- resumes from storage after Worker restart;
- supports payload-free `DH_UPDATE_GET_STATE` so UI opened after a broadcast
  receives the current persisted projection;
- reloads the Extension only after a terminal journal result;
- verifies the newly loaded Extension and Host versions before finalization;
- persists the finalization receipt before acknowledgment;
- announces success or rollback once.

At cutover, legacy `pending_update` is removed and a fresh Host update check is
requested. Its stored URL is never migrated into `dh_update_state`.

FAB and Options only display the projected state and send `DH_UPDATE_START`.
They no longer write update storage, call `perform_update`, or reload the
Extension.

The state is intentionally small:

```ts
type UpdateState =
  | { kind: 'idle' }
  | { kind: 'available'; update: UpdateCandidate }
  | ({ kind: 'preparing'; errorCode?: UpdateErrorCode } & UpdateTransaction)
  | ({ kind: 'activating'; activationRetryUsed: boolean; errorCode?: UpdateErrorCode } & UpdateTransaction)
  | ({ kind: 'polling'; lastStatus: UpdateStatus | null; lastProgressAt: number; recoveryKick: 'unused' | 'pending' | 'confirmed' } & UpdateTransaction)
  | ({ kind: 'reload-pending'; outcome: 'committed' | 'rolled-back' } & UpdateTransaction)
  | ({ kind: 'ack-pending'; receipt: FinalizationReceipt } & UpdateTransaction)
  | { kind: 'complete'; update: UpdateCandidate; outcome: 'committed' | 'rolled-back' }
  | { kind: 'recovery-required'; code: UpdateErrorCode; action: 'resume' | 'verify-terminal' | 'recheck-installation'; transaction?: UpdateTransaction }
```

Every side effect is preceded by the corresponding state write. Polling uses
250 ms, 500 ms, 1 s, then 2 s intervals for at most two minutes per wake. Timeout
keeps `polling` for the next wake.

Candidate acceptance, `DH_UPDATE_START`, and Host `prepare()` each independently
require target strictly newer than the currently verified Host/Extension version.
Storage write/remove failure prevents the following external effect.

An incoming candidate may replace only `idle`, `available`, or `complete`.
`preparing` through `ack-pending` and transaction-backed `recovery-required`
ignore it so transaction identity, status, and receipt cannot be lost.

Every retryable nonterminal state schedules one `chrome.alarms` safety wake 30
seconds later. In-memory timers provide normal fast polling; the alarm calls
`resume()` after MV3 suspension and is cleared at `idle` or `complete`. After
activation begins, all ordinary main-Host requests, including Analyze, config,
and health, are rejected with a fixed temporary-unavailable response. The
recovery kick is the sole allowed main connection until reload or
completion or a verified safe pre-activation failure.

Update-state hydration completes before the Service Worker forwards an ordinary
main-Host request. Suppression applies while activation is in flight, throughout
`polling`, `reload-pending`, `ack-pending`, and every transaction-backed
`recovery-required` state. It remains active after reload until terminal
version/capability/integrity verification and finalization complete. A confirmed
`PREPARED` activation failure is pre-mutation and may re-enable normal Host use
while retaining the same-ID retry.

## Update Flow

```text
available
-> persist preparing
-> Plan A validate + Plan B PREPARED + Plan C recovery ready
-> persist activating
-> detached runner launched and Host exits
-> persist polling
-> Plan B applies complete Host + Extension
-> probe target
-> COMMITTED, or automatic full rollback -> ROLLED_BACK
-> persist reload-pending
-> reload Extension
-> verify Extension/Host/integrity
-> finalize, persist receipt, acknowledge
-> complete
```

Before live mutation, failures leave the installed product untouched. After
activation, ordinary copy, lock, or target-probe failures use Plan B rollback.
Rollback success keeps the old product usable. If rollback itself cannot complete
or journal/path state is unsafe, state becomes `recovery-required`; the UI directs
the user to rerun the matching full installer package.

If `polling` observes no journal progress for 30 seconds, the coordinator persists
`recoveryKick:'pending'` and opens the main Host. Frozen startup launches
active recovery and exits before logging/config/SDK/`NativeHost` construction.
After a confirmed connect/disconnect it writes `confirmed` and returns to
status-only polling. A Worker restarted from `pending` queries status first; if
the same phase remains, it may repeat the idempotent kick. Existing Plan B/C
mutex and journal reconciliation make duplicate recovery converge on the same
transaction. `activating` restart always queries status first: only an
exact `PREPARED` result permits one activation retry; later or terminal phases
move directly to polling or reload handling.

A deterministic prepare or activation failure remains in `preparing` or
`activating` with `errorCode` and the same transaction ID. A user
`DH_UPDATE_START` retries that exact step and ID; it never allocates a second
transaction. If retry still fails, the UI offers the matching installer. Plan D
does not automatically delete a prepared transaction.

After terminal status, any Extension version, Host version, capability, or
installation-integrity mismatch enters transaction-backed `recovery-required`.
It preserves journal/finalization evidence and does not finalize, acknowledge,
clear state, reload again, or announce success.

Transaction-backed recovery has a defined installer-repair continuation. On an
alarm or user retry, `action:'resume'` queries status first and kicks recovery only
for a nonterminal journal. `action:'verify-terminal'` requires a terminal journal,
then repeats version/capability/integrity verification. If a matching installer
has repaired the expected committed target or rolled-back prior, the coordinator
continues the same transaction through finalize, receipt persistence, and
acknowledgment. Missing or contradictory journal evidence remains manual recovery;
it is never converted to a transactionless success.

## Compatibility And Cutover

Existing automatic update remains active while the new implementation is being
built. New Host/Extension code is dormant until all reliable-update tests pass.
The final commit simultaneously:

- advertises `transactional-update-v1`;
- routes the Host actions to `UpdateService`;
- enables the Service Worker coordinator;
- removes UI-owned update/reload behavior;
- stops production calls to `Updater.apply_update`.

The first upgrade from `v2.0.75-beta.1` to the cutover release necessarily uses
the old updater because the old version does not understand the new protocol.
On first startup, the cutover release verifies Host/Extension/package integrity.
A complete installation enables future transactional updates. A mixed or
incomplete first upgrade displays a persistent matching-installer requirement and
blocks subsequent update execution. The old UI may already have displayed its
legacy success message before the cutover code starts; Plan D cannot retroactively
prevent that. It corrects the state immediately on cutover startup and never
reports a second transactional success.

Both mixed first-upgrade directions are explicit:

- New Extension + old Host: capability/integrity probing disables execution and
  shows matching full-installer guidance.
- Old Extension + new Host: the new Host rejects the legacy URL-only
  `perform_update` request with the same fixed guidance. Health/update checks that
  observe Extension-version disagreement emit the existing safe update-error
  notification. They never start another update.

Cutover startup performs integrity/capability checks before legacy `.old*`
cleanup or nested-Extension repair. Mixed state preserves available backups and
does not run cleanup that could remove the repair source.

After a matching installer repairs that state, startup may clear only a
transactionless installer-required marker after Host version, Extension version,
capability, and installation integrity all agree. It then requests a fresh update
check. Transaction-backed `recovery-required` is never cleared by this shortcut.

The cutover Host update checker emits a candidate only when the release contains
exactly one direct HTTPS ZIP asset; zero or multiple ZIP assets produce no
candidate, and a release page URL is never used as an archive URL. Download
rejects HTTPS-to-HTTP redirects, declared or actual response bytes over 256 MiB,
and declared/actual length disagreement, then removes its owned temporary file.
The new Extension probes `get_capabilities` before any update execution. Missing
`transactional-update-v1`, unknown action, version disagreement, or failed
`verify_installation` disables update execution and displays matching-installer
guidance while leaving normal Analyze/config behavior available.

All transactional rollbacks happen only after the cutover release is completely
installed, so the restored prior Extension also understands `dh_update_state`,
status polling, and finalization. The legacy-to-cutover transition itself does not
claim transactional rollback.

Before implementation, carry forward the released alignment fixes from
`v2.0.75-beta.1@488f6f5` without merging release version or release-only files.

## Explicitly Deferred

- Main registration owner/settlement protocols.
- Registry quiescence across every Chrome/Edge profile.
- Permanent maintenance dispatcher.
- Independent onefile installer bootstrap and dual release assets.
- Partial-install quarantine automation.
- Per-write power-loss proofs or registry hive flush protocols.
- New package/evidence schema versions solely for Plan D.

Another browser profile starting the Host during replacement may cause a locked
file. That is handled as an ordinary failure: rollback when possible, otherwise
clear recovery/reinstall guidance. It is not solved with a new registry
transaction in this Plan D.

## Verification

Use TDD for each behavior. Run only focused tests while implementing. Run full
Host, Extension, TypeScript, and build gates at three milestones: alignment
carry-forward, final cutover, and final delivery. Long suites report cumulative
`N/total` progress.

Required end-to-end cases:

- valid automatic update commits complete matching versions;
- malformed, unsafe, wrong-version, or hash-mismatched ZIP changes no live file;
- Extension, Host, `_internal`, metadata, and target probe failure each rolls back
  the complete old product;
- failed copy is never reported as success;
- Worker, Extension, Host, and runner restart resume from durable state;
- stale/equal/older update candidates cannot start;
- successful target and rolled-back prior both pass final integrity/version
  checks;
- rollback failure enters `recovery-required` without deleting evidence;
- existing Analyze/config functionality remains unchanged;
- a disposable Windows VM performs one successful update and one forced rollback.
- VM transition coverage includes both new-Extension/old-Host and
  old-Extension/new-Host first-upgrade results; after cutover startup neither may
  execute a second update or report transactional success.

Review is limited to three rounds. After the third round, remaining findings are
reported for a decision; the process does not silently expand scope.
