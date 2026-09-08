# B2 One-Key Maintenance

**Historical / superseded: do not rerun this sequence.** The third private
candidate was revoked and its container deleted. Candidate maintenance failed
to restore a runnable B1 Host; the subsequent complete beta3 installer restored
basic use. These files preserve execution history, not current permission.
See [the recovery entry](../../docs/session-handoff-2026-07-15.md).

Retained tools:
- `Prepare-B2CandidateMaintenance.ps1` and its offline `.cjs` tests: old single-key
  maintenance, not a supported cancel/reset API. Do not reuse old credentials.
- `Prepare-Beta3Install.ps1`: completed one-time package preparation and private
  protected-file snapshot; not an installer and not a new task to rerun.

Do not delete private backups or evidence as part of documentation closeout.
The original sequence below remains historical; its old approval is consumed.

Local preparation only; not a product fix or supported cancellation. The approved
single-trial bundle has a fresh exit gate at 2026-09-08 02:57:02Z: zero main/recovery
processes, no pending 404ded authority, and prior `EXIT_GATE_MATCH`. Do not repeat
authentication or the completed exit check. This script does not verify that gate.
The third candidate expires at 2026-09-08 06:47Z; both modes and the pasted code
require more than ten minutes remaining. No network validation is performed.

Before use, the parent must allow **only** `failed-state-backup.json` as an extra
child of **only** `dh-b2-third-20260908` in the private distribution helper's
`Protect` validation, so required cleanup is not blocked. That private edit is
parent-owned, not part of this repository change. The current handoff owns later decisions.

Use only the original Cloud PC/account and a secure company-permitted RDP session.
Clipboard redirection shares credentials with the local machine; backup JSON and
generated code contain SAS credentials (base64 is not encryption). Clipboard
history/sync and DevTools command history may retain them. No screenshots, console
history exports, raw errors, or clipboard contents should be shared. Do not broadly
clear history/storage. If clipboard, redirected drive, or script execution is
prohibited, stop; no policy bypass, ACL change, elevation, or alternate transfer.

## Manual Sequence

1. Reopen the affected browser only to `chrome://extensions` and the installed DH
Service Worker console. No Options/FAB, update, retry, reset, or other DH activity.
Keep this newly restarted Worker console open through backup and replacement. Its
new instance must differ from the pre-exit instance; the full persisted failed
state must still be unchanged. Stop if initialization does not settle within five
minutes, identity differs, or any security alert appears. Do not allow/restore.

2. Run this **non-mutating** export in DevTools. `copy()` must be available there;
no worker `prompt()` is used. It copies the complete state, without printing it.
Only `BACKUP_CLIPBOARD_READY` means proceed. This strict shape is intentionally
specific to the known failed preparation; unknown fields stop rather than drop.

```javascript
(() => {
  const stop = () => console.log('B2_BACKUP_STOP');
  const exact = (o, keys) => o !== null && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(o, k));
  try {
    if (typeof copy !== 'function') { stop(); return; }
    chrome.storage.local.get(['dh_update_state', 'pending_update', 'dh_update_worker_version', 'dh_update_worker_instance'], r => {
      try {
        const s = r.dh_update_state, m = chrome.runtime.getManifest();
        if (chrome.runtime.lastError || !exact(s, ['kind', 'errorCode', 'transactionId', 'targetVersion', 'priorVersion', 'update']) ||
            !exact(s.update, ['version', 'url', 'isPrerelease']) || s.kind !== 'preparing' || s.errorCode !== 'update_prepare_failed' ||
            s.transactionId !== '404ded6a59bbcc86fb681c28c9827b6c' || s.priorVersion !== '2.0.76-beta.1' ||
            s.targetVersion !== '2.0.76-beta.2' || s.update.version !== '2.0.76-beta.2' || s.update.isPrerelease !== true || typeof s.update.url !== 'string' ||
            (m.version_name || m.version) !== '2.0.76-beta.1' || r.dh_update_worker_version !== '2.0.76-beta.1' ||
            typeof r.dh_update_worker_instance !== 'string' || !/^[a-f0-9]{32}$/.test(r.dh_update_worker_instance) ||
            Object.prototype.hasOwnProperty.call(r, 'pending_update')) { stop(); return; }
        copy(JSON.stringify({state: r.dh_update_state, workerVersion: r.dh_update_worker_version, workerInstance: r.dh_update_worker_instance, legacyPresent: false}));
        console.log('BACKUP_CLIPBOARD_READY');
      } catch { stop(); }
    });
  } catch { stop(); }
})();
```

3. In the Cloud PC's Windows PowerShell 5.1, run the local repo script via the
redirected drive. It reads only the fixed third handoff and clipboard, validates
HTTPS Azure Blob host against the old host, different `/b2.zip` path, unique SAS
query keys, `sp=r`, `sr=b`, `spr=https`, and expiry. It creates the backup exactly
once in the existing private third directory. No directory/ACL creation and no
overwrite, even after partial failure. Proceed only on `BACKUP_SAVED`.

```powershell
& "\\tsclient\C\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\scripts\maintenance\Prepare-B2CandidateMaintenance.ps1" -Mode SaveBackup
```

4. Without restarting/reloading the Worker, generate the replacement clipboard.
This revalidates the backup/handoff and writes no generated secret file. Proceed
only on `REPLACEMENT_CLIPBOARD_READY`; otherwise do not paste old clipboard data.

```powershell
& "\\tsclient\C\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec\scripts\maintenance\Prepare-B2CandidateMaintenance.ps1" -Mode CopyReplacement
```

5. Paste the clipboard once into the **same** Worker console and execute once.
It compares the entire failed state using recursively sorted object keys (array
order is preserved), B1 version, captured Worker instance, and legacy absence,
then checks expiry again. Its global one-shot latch is set immediately before
the only write: `dh_update_state = {kind:'available', update:{version:'2.0.76-beta.2',
url:<private candidate>, isPrerelease:true}}`. Only a successful storage callback
triggers immediate `chrome.runtime.reload()`. Fixed STOP output means preserve
evidence and stop; do not retry, reset the latch, re-export, or overwrite backup.

The read/compare/write is **not CAS** and write/reload is not atomic. Fresh natural
exit, inert failed-preparation gate, and same restarted Worker reduce races but
cannot eliminate queued writes. A failed callback/reload can leave uncertain
state; do not automatically repair it. The script sends no messages/native RPC,
removes no keys, and starts no update. Ordinary discovery after reload can replace
`available`; do not reseed if that happens. Only after the expected B2 availability
is confirmed may the user perform the already approved **single normal UI trial**.
No automatic update is included here. Cleanup of the third owned distribution
remains required on completion, failure, abort, or expiry through the parent-owned
helper. Preserve the private backup/evidence; do not broaden cleanup.

## Offline Checks

`Test-B2CandidateMaintenance.cjs` extracts only the public script's JS template
and this export snippet and uses synthetic clipboard/Chrome objects. It reads no
private file, uses no browser/network, and executes neither PowerShell mode.
PowerShell syntax is checked separately with the Windows PowerShell 5.1 AST parser.
Local validation: 33/33 offline checks passed; Windows PowerShell
5.1.26100.9168 parsed the script successfully. No private input was read, neither
mode was executed, and no Cloud PC/browser/network operation was performed.
