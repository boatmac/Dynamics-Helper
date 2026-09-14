# Team Manifest URL Encryption (DPAPI) — Design

**Date:** 2026-05-25
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Closes:** Follow-up in `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` L881 ("SAS token redaction in config.json")

## Problem

`prefs.teamManifestUrl` is an Azure Blob SAS URL of the form:

```
https://iuscssasw.blob.core.windows.net/<container>/<blob>?sp=r&st=...&se=2026-05-30T20:21:55Z&spr=https&sv=...&sr=b&sig=<86-char base64>
```

The `sig=` component is a HMAC-SHA256 signature; any process that can read it can read the blob at `<container>/<blob>` until `se=<expiry>` (currently a ~10 day rolling window).

As of v2.0.70, this URL is persisted **plaintext** in two locations:

1. `chrome.storage.local` (`dh_prefs.teamManifestUrl`) — inside the browser's IndexedDB-backed leveldb store.
2. `%LOCALAPPDATA%\DynamicsHelper\config.json` (`extension_preferences.team_manifest_url`) — mirrored there by the `team-prefs-config-mirror` change (2026-05-21) for backup/restore parity.

### Threat model

The user is the operator. Attack scenarios that warrant mitigation:

- **Screenshot / copy-paste leak.** User opens `config.json` to debug something, screenshots or pastes a snippet into a chat / ticket / shared doc. `sig=...` becomes broadly visible.
- **Backup / sync upload.** A backup tool (OneDrive, corporate IT backup, etc.) uploads `%LOCALAPPDATA%\DynamicsHelper\` to a less-protected store. Anyone with access to that store sees the SAS.
- **Corporate DLP scan.** Endpoint DLP tools scan `%LOCALAPPDATA%` for high-entropy secrets / known SAS URL shapes, surface a compliance event, possibly to a team that has nothing to do with this user's workflow.

Scenarios explicitly **out of scope**:

- Attacker already has malware running as the same Windows user. If that's true, they have the user's session and SAS leakage is the least of their worries.
- Attacker has physical disk + offline access. NTFS DPAPI at this user level isn't designed to stop that; full-disk encryption is the right layer for that threat.

## Decision

Encrypt the manifest URL using Windows DPAPI (`CryptProtectData` / `CryptUnprotectData`) at the **host process boundary**. Plaintext URL never lands in `config.json` on disk.

`chrome.storage.local` continues to hold plaintext — that is a deliberate scope cut (see § "Scope cut: chrome.storage.local stays plaintext").

## Architecture

### Component split

**New module: `host/secret_store.py`**

Pure DPAPI wrapper. Single responsibility: turn plaintext strings into base64-encoded DPAPI blobs and back. Knows nothing about `config.json` schema, knows nothing about which fields are secret. Implemented as ~80 LOC of `ctypes` bindings to `Crypt32.dll`'s `CryptProtectData` / `CryptUnprotectData` — **no new dependencies**, no `pywin32`.

```python
# host/secret_store.py — public API
def encrypt(plaintext: str) -> str: ...           # returns base64 DPAPI blob
def decrypt(b64_blob: str) -> str: ...            # raises DecryptError on failure
class EncryptError(Exception): pass
class DecryptError(Exception): pass
```

**Modified: `host/dh_native_host.py`**

Two new private methods sandwich the existing config I/O:

- `_decrypt_secrets_in_memory(config: dict) -> None` — called immediately after `_load_config()`. Replaces `extension_preferences.team_manifest_url_encrypted` with an in-memory `extension_preferences.team_manifest_url` (plaintext) so downstream code (which expects the legacy plaintext key) is unchanged. The encrypted key is removed from the in-memory dict; the on-disk blob is untouched.
- `_encrypt_secrets_before_write(payload_config: dict) -> None` — called inside `handle_update_config()` before merging into `current_data`. Replaces any `extension_preferences.team_manifest_url` with `extension_preferences.team_manifest_url_encrypted` and deletes the plaintext key from the dict. If `team_manifest_url` is an empty string, both keys are deleted (Reset semantics).

**Unchanged: `extension/`**

UI, `chrome.storage.local`, and IPC payload still carry plaintext URL. Encryption is a host-side disk-persistence concern only.

### Data flow: startup (read)

```
host start
  ↓
_load_config()  →  reads config.json
                   { "extension_preferences": {
                       "team_manifest_url_encrypted": "AQAAA...base64...==",
                       ...
                   }}
  ↓
_decrypt_secrets_in_memory(config)
  ├─ secret_store.decrypt(blob) succeeds
  │    config["extension_preferences"]["team_manifest_url"] = plaintext  (in-memory)
  │    del config["extension_preferences"]["team_manifest_url_encrypted"]  (in-memory)
  │
  └─ DecryptError raised
       log.warning("Failed to decrypt team_manifest_url ...; ignoring")
       config["extension_preferences"]["team_manifest_url"] = ""  (in-memory)
       (encrypted blob remains on disk; will be overwritten on next valid write)
  ↓
Host operates on in-memory plaintext.
get_config response to extension contains plaintext URL (over stdio IPC).
```

### Data flow: write (extension → host)

```
Extension sends update_config:
  { config: { extension_preferences: { team_manifest_url: "https://...?sig=...", ... }}}
  ↓
handle_update_config()
  ↓
_encrypt_secrets_before_write(payload_config)
  ├─ team_manifest_url is non-empty string
  │    blob = secret_store.encrypt(url)
  │    ext_prefs["team_manifest_url_encrypted"] = blob
  │    del ext_prefs["team_manifest_url"]
  │
  └─ team_manifest_url is empty string (user cleared, or Reset)
       del ext_prefs["team_manifest_url"]
       del ext_prefs.get("team_manifest_url_encrypted")   (clear stale encrypted too)
  ↓
Merge into current_data; json.dump to disk.
On-disk config.json now has team_manifest_url_encrypted only, OR neither key.
```

**Atomicity invariant:** the in-memory `payload_config` dict is fully transformed before any disk write. No intermediate state where plaintext and encrypted coexist on disk.

### EncryptError handling

If `secret_store.encrypt()` raises (effectively impossible — DPAPI failing means the user's Windows logon session is broken), `handle_update_config()` **aborts the write entirely** and returns `{status: "error", message: "Failed to encrypt secret field"}`. **No fallback to plaintext persistence under any circumstance.**

### DecryptError handling (problem 5 — choice A)

On startup, if `team_manifest_url_encrypted` cannot be decrypted (cross-machine copy of `config.json`, corrupt blob, key material lost from admin password reset), host logs a `WARNING`, treats the field as empty string in memory, and **does not delete the on-disk blob**. The user sees an empty URL field in Options, repastes the URL, the new value overwrites the bad blob on next save. Self-healing.

### Reset Settings (problem 4 — choice A)

Options page Reset triggers `persistPrefs(DEFAULT_PREFS)`, which sends `team_manifest_url: ""` to host. The empty-string branch of `_encrypt_secrets_before_write` deletes both `team_manifest_url` and `team_manifest_url_encrypted` from disk. **No new code path** — Reset semantics emerge from the write path.

### Migration (problem 3 — "no migration needed")

The team manifest URL feature has not been released to users yet. Any `team_manifest_url` plaintext key found in `config.json` is treated as invalid stale data: dropped from memory, logged as a warning, removed from disk on next save. Test CS-T8 locks this behavior.

## DPAPI key management

Zero application-level key management. Windows DPAPI derives a per-user Master Key from the user's logon credentials (password / PIN / biometric), maintained by LSA and stored under `%APPDATA%\Microsoft\Protect\<user-SID>\`. Properties relevant to this design:

| Property | DH implication |
|---|---|
| Per-user binding | `config.json` copied to another user account on same machine → blob unreadable |
| Per-machine binding | `config.json` copied to another machine → blob unreadable (modulo AD Credential Roaming, which is corp-environment only and an acceptable widening) |
| Master Key auto-rotation (90 days) | Transparent. Old Master Keys retained for decrypting existing blobs. |
| User changes password (self-service) | Master Key re-wrapped with new password; blobs remain decryptable |
| Admin resets user password | Master Key may be lost; blobs become undecryptable; self-healing path applies |
| Disk image restore to same machine | Master Key restores with `%APPDATA%`; works |
| Disk image restore to different machine | Master Key restored but unusable (hardware-binding details); self-healing path applies |

The application never reads, writes, generates, rotates, or backs up any key material.

## Scope cut: chrome.storage.local stays plaintext

The browser-side storage (`chrome.storage.local.dh_prefs.teamManifestUrl`) remains plaintext. Justifications:

1. The core threat (DLP scan / screenshot / sync upload of `%LOCALAPPDATA%\DynamicsHelper\config.json`) is resolved by encrypting only the host-managed file. The browser's leveldb store at `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Extension Settings\` is in a different scan / screenshot path.
2. Encrypting chrome.storage.local would require either a service-worker-side crypto path (Web Crypto API, but key management becomes our problem — DPAPI isn't reachable from JS) or a host-mediated read/write proxy (high complexity, breaks the extension's offline-from-host modes).
3. The extension UI must hold plaintext URL anyway to perform the fetch — encrypting in storage but decrypting in memory at every read is performative.

The boundary is: **anything host writes to a user-visible file gets encrypted; anything that lives only inside the browser process stays as it is**.

## Implementation: ctypes binding (not pywin32)

Two reasonable DPAPI access paths:

- **pywin32 (`win32crypt.CryptProtectData` / `CryptUnprotectData`).** ~12 MB PyPI package; idiomatic in Windows Python; new dependency.
- **`ctypes.WinDLL('Crypt32.dll')` direct.** Stdlib-only; ~60-80 LOC of ctypes boilerplate; no new dependency.

Decision: **ctypes**. Reasons:

1. Zero new dependencies. `requirements.txt` unchanged; PyInstaller bundle unchanged in size.
2. Project style: existing `host/register.py` and `host/dh_native_host.py` already use `winreg` (stdlib) for Windows API access; adding pywin32 would be a stylistic departure.
3. The wrapper is small and self-contained (~80 LOC), entirely inside `secret_store.py`. No call site outside that module sees ctypes.
4. Eliminates a class of failure modes (pywin32 import errors, install corruption) that ctypes / stdlib can't have.

## Telemetry

None. Encryption and decryption emit no telemetry events. Reasons:

- Failure probability is effectively zero in normal operation.
- Any telemetry payload referencing the field name risks inviting accidental URL inclusion in future refactors.
- Host log lines are sufficient for post-hoc audit.

## Testing strategy

### Unit (`host/test_secret_store.py`, new)

All gated `@unittest.skipUnless(sys.platform == 'win32', ...)`.

| ID | Name | Verifies |
|---|---|---|
| SS-T1 | `test_roundtrip_simple` | `decrypt(encrypt("hello")) == "hello"` |
| SS-T2 | `test_roundtrip_realistic_sas_url` | Roundtrip of a 191-char URL with `?sp=r&se=...&sig=...` |
| SS-T3 | `test_encrypt_produces_base64` | Output is valid base64 |
| SS-T4 | `test_encrypt_output_differs_from_input` | Output != input (sanity check) |
| SS-T5 | `test_decrypt_corrupt_blob_raises` | Non-base64 input → `DecryptError` |
| SS-T6 | `test_decrypt_valid_base64_invalid_dpapi_raises` | Random bytes wrapped in base64 → `DecryptError` |
| SS-T7 | `test_encrypt_empty_string` | Empty string round-trips (documented behavior; callers should pre-handle empties anyway) |

### Integration (`host/test_config_secrets.py`, new)

Monkeypatch `secret_store.encrypt` / `decrypt` with reversible mocks (`"ENC:" + plaintext` / strip prefix). Tests the integration logic, not DPAPI itself.

| ID | Name | Verifies |
|---|---|---|
| CS-T1 | `test_load_with_encrypted_field` | Encrypted key on disk → plaintext in memory, encrypted key removed from in-memory dict |
| CS-T2 | `test_load_without_any_url_field` | Neither key present → no special handling, no errors |
| CS-T3 | `test_load_with_decrypt_failure_keeps_blob` | `DecryptError` → empty URL in memory, **encrypted blob unchanged on disk** |
| CS-T4 | `test_write_plaintext_becomes_encrypted` | Extension sends plaintext → disk has encrypted key only |
| CS-T5 | `test_write_empty_string_clears_both_keys` | Extension sends `""` → neither key on disk (covers Reset) |
| CS-T6 | `test_write_overrides_stale_encrypted_blob` | Disk has stale encrypted blob; new write replaces it cleanly |
| CS-T7 | `test_encrypt_failure_aborts_write` | `EncryptError` → on-disk file untouched, handler returns error status |
| CS-T8 | `test_legacy_plaintext_field_discarded` | Disk has only plaintext `team_manifest_url` (pre-feature, stale data) → ignored in memory, removed on next save, warning logged |

### Break-and-fail verification (per AGENTS.md convention)

Each CS-T must be confirmed to fail when its protective code is temporarily broken. Required:

- CS-T3 — remove "do not delete blob on DecryptError" line → must fail
- CS-T4 — remove `del ext_prefs["team_manifest_url"]` → must fail
- CS-T5 — remove `del ext_prefs["team_manifest_url_encrypted"]` → must fail
- CS-T7 — replace EncryptError abort with plaintext-fallback → must fail
- CS-T8 — change discard logic to "trust the plaintext key" → must fail

### Out of scope for tests

- Real DPAPI cross-user / cross-machine decryption failure — requires multi-account CI; SS-T6 already exercises the `DecryptError` code path.
- DPAPI blob tamper resistance — same reason; SS-T6 covers it.
- PyInstaller-bundled `Crypt32.dll` load behavior — covered by manual smoke, not unit tests.

### Extension side

No new tests. Extension code is unchanged. Existing Options 6-invariant suite and FAB rootPathOverride suite already lock the relevant behaviors.

## File impact

### New
- `host/secret_store.py` (~80 LOC)
- `host/test_secret_store.py` (~80 LOC)
- `host/test_config_secrets.py` (~200 LOC)

### Modified
- `host/dh_native_host.py` — two new private methods + two call sites + EncryptError error-response branch
- `AGENTS.md` § 3 — new "Secret Field Persistence" rule documenting the encrypted-at-host-boundary invariant
- `DEVELOPER_GUIDE.md` — new section on DPAPI usage, key management, failure modes
- `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` — L881 follow-up marked `[CLOSED <date>]` pointing at the implementation commit

### Unchanged
- All of `extension/` — UI, storage, IPC unchanged
- `host/requirements.txt` — ctypes is stdlib
- `host/register.py`, `host/updater.py`, installer scripts — unrelated
- PyInstaller spec — ctypes / Crypt32.dll handled automatically

## Implementation order

Each step is an independent commit; `python -m unittest discover host` must be green after each.

1. **`secret_store.py` + SS-T1..T7.** Module is self-contained and tested before any integration. Commit.
2. **`_decrypt_secrets_in_memory` + `_encrypt_secrets_before_write` private methods + CS-T1..T8.** Methods defined but not yet wired into `_load_config` / `handle_update_config`. Commit.
3. **Wire into `_load_config()` startup path and `handle_update_config()` write path.** Run break-and-fail verification table. Commit.
4. **Docs: AGENTS.md, DEVELOPER_GUIDE.md, follow-up closure.** Commit.
5. **Manual smoke:** start host with empty config; paste manifest URL via Options; restart host; verify `config.json` has only `team_manifest_url_encrypted`; verify team catalog still loads; verify clearing the URL removes both keys.

## Consequences

### Positive
- DLP / screenshot / sync-upload leak vector for `config.json` closed.
- Key management externalized to OS; zero application-level secret-handling code.
- No new runtime dependency.
- Reusable boundary: future secret fields (Kusto tokens, third-party API keys) plug into the same `_decrypt_secrets_in_memory` / `_encrypt_secrets_before_write` mechanism.

### Negative
- `config.json` is now per-machine non-portable for the manifest URL field. Acceptable; SAS tokens are not portable credentials by design.
- Admin-initiated password reset destroys the encryption key, requiring the user to repaste the URL once. Acceptable; self-healing path is one paste operation.
- chrome.storage.local plaintext remains. Acceptable per scope cut above.

### Neutral
- Adds two methods (~40 LOC) and one module (~80 LOC) to host codebase. Test code roughly equal volume.

## References

- `docs/superpowers/specs/2026-05-21-team-prefs-config-mirror-design.md` § "Negative" #1 — original identification of the leak
- `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` L881 — follow-up entry
- Microsoft DPAPI documentation: <https://learn.microsoft.com/en-us/windows/win32/api/dpapi/>
- `host/dh_native_host.py:544`, `:803`, `:1029` — current `extension_preferences` read sites
- `host/dh_native_host.py:1357-1405` — current `handle_update_config` write path
