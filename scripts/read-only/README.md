# Original Company Cloud PC: Read-Only Observation

**Completed diagnostic history, not the current next action.** Original B1/B2
observations and beta3 installation checks have been recorded in
[the recovery entry](../../docs/session-handoff-2026-07-15.md). Do not repeat them
or revive candidate maintenance merely because commands remain below.

Retained observers:
- `Test-OriginalCloudPcUpdateState.ps1`: scoped B1/transaction observations with
  optional evidence-only and Defender-skip modes; not a generic beta3 verifier.
- `Test-Beta3InstalledState.ps1`: completed post-install protected-file and version/
  presence observation; not complete integrity verification or a Defender audit.

The execution boundaries below apply if a future specific observation is approved.

Preparation only. Execution on the original company Cloud PC requires explicit
authorization. This is not an update trial, installer, cleanup, retry gate, or
development migration. Use the original installing Windows account, not another
administrator's account. Do not run against the local workstation to simulate it.

## Execution Boundary

- Keep the browser as found. Do not open Options/FAB, reload the extension, or
  inspect a sleeping Worker. These actions can acknowledge completion or resume
  an update. Do not close/kill existing processes to make this check pass.
- The script reads Defender preferences/status, selected HKCU registration in
  both registry views, matching process counts/PIDs, fixed evidence paths, and
  declared product-file hashes. It does not launch any DH executable, invoke RPC,
  run an installer, change policy/registry/storage, or write output files.
- Run with existing company-permitted Windows PowerShell 5.1 or PowerShell 7.
  No elevation, execution-policy bypass, Unblock-File, or tool installation is
  prescribed. If blocked or denied, stop; do not change policy to run it.
- Defender/CIM queries may be unavailable. File reads can themselves be observed
  by antivirus or auditing; read-only does not mean zero OS side effects. Any new
  security alert means stop, preserve evidence, and do not allow/restore anything.
- Expected duration: about 30-60 seconds for a small installation; stop with
  Ctrl+C after 90 seconds if no result. No child task or background job is launched.
  Hashing is capped at 256 entries per group and 1 GiB total; each process query
  has a 15-second operation timeout. Defender cmdlets have no imposed timeout.

After authorized transfer of these two files to a dedicated folder, open a
PowerShell window in that folder and run this one command. The switch confirms
the machine/account manually; it does not detect their identity automatically.

```powershell
& .\Test-OriginalCloudPcUpdateState.ps1 -ConfirmOriginalCloudPcAccount
```

For a follow-up disk observation when Defender was already observed, add
`-SkipDefender`. This skips both Defender queries, not process/registry/transaction
safety checks; its report makes no new claim about protection settings.

Use `-TransactionId <32-lowercase-hex>` to inspect a different observed transaction
and `-EvidenceOnly` to skip metadata/hashes. Immediate transaction/receipt counts
still cover all entries. The fixed ACK comparison always concerns the ORIGINAL
`ed2ff2cbbb31e571d69fc361d83777e2` B1 rollback, never the selected new transaction.
Absence in this snapshot cannot prove a timed-out Host executor has stopped.

Only return the resulting JSON summary. Do not send entire configurations,
registry exports, log files, URLs, account names, or screenshots with private data.
If PowerShell cannot start the script, report that it was blocked without pasting
an error containing private paths. User-managed prompts and config contents are
not read. Declared product files, including packaged `system_prompt.md`, are read
for hashing only; neither their contents nor hashes are printed.

## Interpretation

- `UNKNOWN` means unobserved/inaccessible, not absent. `NONE` means absence was
  observed through readable parents. `PRESENT_STOP` prevents hash observation.
- Main Host and recovery process counts are separate. A running main Host alone
  does not block read-only disk observation and must not be killed to run it.
  It may be active, so the snapshot explicitly remains non-atomic, not quiet or
  settled. Recovery runner/status-host processes, unknown process observations,
  or RunOnce/status registration still block hashing. Recovery processes from
  unrelated installations with these names conservatively block observation.
- `DECLARED_HASHES_MATCH_UNTRUSTED_INVENTORY` means only that B1 metadata versions,
  raw inventory-link hash and declared product hashes match the local inventory.
  It is NOT the Host's `packaged/verified` result, trusted release provenance, an
  executable probe, canonical JSON validation, or an exact extra-file/directory
  inventory. An independent trusted package and production validation are not
  performed. Unsupported metadata produces `UNKNOWN_OR_UNEXPECTED_STOP`.
  `stopPhase`, `fileRole`, `errorCode`, and `checkedFiles` distinguish the fixed
  validation stop from an OS/JSON read failure without printing paths or raw errors.
  Embedded ASCII spaces in runtime names are supported; trailing spaces, traversal,
  device names, and unexpected top-level Host files remain rejected.
- The ACK comparison checks exact known rollback bytes, not arbitrary transaction
  parsing. A different ACK may belong to a later transaction. Do not delete it.
  The idle recovery directory may remain; it is not itself an active transaction.
- Observations are not atomic, do not cover all scratch/registration/renamed
  process cases, and cannot prove full settlement. Process rechecking catches
  some changes, not every race. Do not interpret all-zero counts as retry approval.
- Defender exclusion counts are visible counts only: company policy can hide
  entries. Threat-action entries are not classified as Allow. Current allowed
  threat status and complete company-policy equivalence always remain UNKNOWN.
  Company IT can confirm effective policy/allow state separately; do not change it.
- If needed, visually inspect Windows Security's allowed-threat list without
  clicking any action, under separate execution approval. An empty visible list
  alone is not proof that no centrally managed override/exclusion exists.

## Optional Existing Worker Console

Skip this step unless the disk observation has no stop condition and a Worker
console is ALREADY OPEN and the Worker is already awake and not transitioning.
If uncertain, report browser state UNKNOWN. Opening DevTools for a sleeping
Worker is not permitted by this procedure. Keeping DevTools open affects Worker
lifetime, so record that condition; this is not normal-lifecycle test evidence.

This reads four storage keys without messages or writes. Chrome returns complete
values into memory, including nested candidate data, but only the fixed projection
below is printed. If that in-memory retrieval is not acceptable, skip it. Never
print the raw result. Missing B1 completion transactionId is valid legacy shape;
it does not prove browser idle. No manual ACK is sent.

```javascript
chrome.storage.local.get(['dh_update_state', 'pending_update', 'dh_update_worker_version', 'dh_update_worker_instance'], (r) => {
  if (chrome.runtime.lastError) { console.log('BROWSER_STATE_UNKNOWN'); return; }
  const s = r.dh_update_state;
  const kinds = ['idle', 'available', 'preparing', 'activating', 'polling', 'reload-pending', 'ack-pending', 'complete', 'recovery-required'];
  const version = v => typeof v === 'string' && /^\d{1,5}\.\d{1,5}\.\d{1,5}(-beta\.\d{1,5})?$/.test(v) ? v : 'UNKNOWN';
  const has = (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  console.log(JSON.stringify({
    state: !has(r, 'dh_update_state') ? 'NONE' : kinds.includes(s?.kind) ? s.kind : 'UNKNOWN',
    outcome: ['committed', 'rolled-back'].includes(s?.outcome) ? s.outcome : 'UNKNOWN_OR_NOT_APPLICABLE',
    transactionId: typeof s?.transactionId === 'string' && /^[a-f0-9]{32}$/.test(s.transactionId) ? s.transactionId : 'UNKNOWN_OR_NOT_APPLICABLE',
    candidatePresent: has(s, 'update') || has(s?.transaction, 'update'),
    candidateUrlFieldPresent: has(s?.update, 'url') || has(s?.transaction?.update, 'url'),
    legacyKeyPresent: has(r, 'pending_update'),
    workerVersion: version(r.dh_update_worker_version),
    workerInstanceValid: typeof r.dh_update_worker_instance === 'string' && /^[a-f0-9]{32}$/.test(r.dh_update_worker_instance),
    decision: 'OBSERVATION_ONLY_NO_ACK_NO_RETRY'
  }));
});
```

## Documentation

- [Current recovery entry](../../docs/session-handoff-2026-07-15.md)
- [Incident ledger](../../docs/plan-d-pragmatic-cloud-pc-results.md)
- [Get-MpComputerStatus](https://learn.microsoft.com/en-us/powershell/module/defender/get-mpcomputerstatus)
- [Get-MpPreference](https://learn.microsoft.com/en-us/powershell/module/defender/get-mppreference)
- [Hidden exclusions](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-antivirus-exclusions-configure)

Local validation is syntax/static review only, not Cloud PC execution or B2
qualification. No automatic conclusion of readiness is emitted.
