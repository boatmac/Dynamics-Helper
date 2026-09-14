# Team Manifest URL Encryption (DPAPI)

Status: Implemented. Current Host-boundary secret persistence contract.

## Problem

A team manifest URL can contain a SAS credential. Plaintext Host config would
expose it in copied snippets, screenshots, or backups. Encrypting this field
reduces that exposure without changing the Extension's fetch/IPC contract.

### Threat model

This protects the URL's representation in Host-managed config, not every copy
of the credential. It is not protection against code running as the same Windows
user, nor a substitute for access control, safe diagnostics, or disk encryption.
No exemption from security scanning or guarantee against detection is implied.

## Decision

Windows DPAPI encrypts the URL at the Host persistence boundary. The only valid
on-disk key is `extension_preferences.team_manifest_url_encrypted`, containing
a base64 DPAPI blob. Plaintext `team_manifest_url` must never be written to
`config.json`. Empty/cleared configuration contains neither key.

`chrome.storage.local`, IPC payloads, and Host in-memory config continue to use
plaintext. See "Scope cut: chrome.storage.local stays plaintext" below.

## Architecture

### Component split

`host/secret_store.py` exposes `encrypt(plaintext: str) -> str`,
`decrypt(b64_blob: str) -> str`, `EncryptError`, and `DecryptError`. It wraps
`CryptProtectData` / `CryptUnprotectData` with `ctypes`; it does not own config
schema, URLs, or application-level key management. No `pywin32` dependency is
introduced.

`NativeHost._decrypt_secrets_in_memory` transforms loaded config for runtime use.
`NativeHost._encrypt_secrets_before_write` transforms incoming config before
persistence. The Extension does not implement a second encryption scheme.

### Data flow: startup (read)

1. Load the on-disk config into memory and discard any stale plaintext URL key.
2. Remove the encrypted key from the in-memory dictionary and decrypt its blob.
3. On success, expose `team_manifest_url` in memory and in `get_config` responses.
4. On failure, expose an empty URL and log a safe warning. Reading does not
   rewrite or delete the original disk blob.

### Data flow: write (extension → host)

1. `update_config` receives the plaintext field over Native Messaging.
2. A non-empty URL is encrypted, replaced by the encrypted key, and removed
   from the payload's disk representation before persistence.
3. Explicit empty URL clears both fields. An omitted URL is not an explicit
   credential edit by the transform.
4. Any encryption failure aborts the entire update rather than writing plaintext.

**Atomicity invariant:** complete the secret transformation before persistent
writes; no intermediate plaintext/encrypted pair may be serialized to disk.
This ordering is not a claim of per-write power-loss atomicity for all files.

### EncryptError handling

Encryption failure is a real error outcome. `handle_update_config` returns an
error and must not persist the update. There is no plaintext fallback under any
circumstance, and Options must inspect the response rather than claim a save.

### DecryptError handling

A corrupt blob, different account/machine, or unavailable key material can make
decryption fail. Host treats the URL as unconfigured in memory and preserves the
on-disk blob during that read. Re-entering a valid URL writes a new encrypted
value; clearing the URL removes it. Do not silently trust a stale plaintext key.

### Reset Settings

Reset explicitly supplies an empty URL and uses the normal secret write path to
remove both keys. Current Reset is tokenized: the latest default-derived mirror
commits before its Host update, and matching durable Host acknowledgment precedes
Worker cleanup. Cleanup retries do not resend acknowledged defaults and must
preserve newer edits. Encryption does not add a separate Reset mutation path.

### Migration

A plaintext `team_manifest_url` found on disk is stale/invalid input, not a
migration source. It is discarded in memory with a safe warning and removed by
a later config save. **CS-T8** retains this definition and the Host source's
reference to "spec § Migration" continues to refer to this rule.

## DPAPI key management

DH creates no application encryption key and does not copy, rotate, back up,
or inspect Windows key material. Credential portability is not supported:
copying `config.json` to another Windows user or machine must not be described
as restoring a usable team URL. Re-enter the URL when decryption fails.

Password/account recovery or loss of key material can affect decryptability.
This contract does not promise precise OS rotation intervals, hardware-binding
internals, or successful decryption after an arbitrary image restore.

## Scope cut: chrome.storage.local stays plaintext

The browser keeps `dh_prefs.teamManifestUrl` and identity-bound team cache data in
plaintext, and must hold usable URLs to fetch catalogs. IPC and in-memory values
also remain plaintext. Therefore Host config encryption does not make browser
profiles, copied URLs, or network diagnostics safe to share.

This boundary applies to the defined secret field. It is not a blanket claim
that every Host-written file is encrypted. Any newly persisted credential needs
the same reviewed secret-boundary handling rather than a plaintext exception.

## Implementation: ctypes binding (not pywin32)

`secret_store.py` owns Windows API bindings and buffer lifetime. Callers handle
the module's typed failures, not native pointers. Source and frozen Host use the
same persistence rules; source inspection alone does not establish frozen
runtime behavior.

## Telemetry

No encryption/decryption telemetry event is defined. Logs must not include URL
plaintext, queries, credential blobs, or thrown objects that could expose them.
Catalog fetch diagnostics separately use fixed failure descriptions and numeric
HTTP status, never response status text or raw exception messages containing URLs.

## Testing strategy

<a id="unit-hosttest_secret_storepy-new"></a>
### Unit (`host/test_secret_store.py`)

Real DPAPI cases are Windows-specific.

| ID | Contract |
|---|---|
| SS-T1 | Simple plaintext round-trip |
| SS-T2 | Synthetic SAS-shaped URL round-trip |
| SS-T3 | Encryption produces valid base64 |
| SS-T4 | Ciphertext representation differs from plaintext |
| SS-T5 | Corrupt/non-base64 input raises `DecryptError` |
| SS-T6 | Base64 wrapping invalid DPAPI bytes raises `DecryptError` |
| SS-T7 | Wrapper supports empty-string round-trip; config layer handles clearing |

<a id="integration-hosttest_config_secretspy-new"></a>
### Integration (`host/test_config_secrets.py`)

These existing tests mock encrypt/decrypt to verify config integration, not
DPAPI security or real cross-machine behavior.

| ID | Contract |
|---|---|
| CS-T1 | Encrypted field loads as plaintext only in memory |
| CS-T2 | Neither field present is a valid unconfigured state |
| CS-T3 | Failed decrypt leaves the disk blob unchanged and in-memory URL empty |
| CS-T4 | Plaintext incoming URL persists only as encrypted form |
| CS-T5 | Explicit empty URL removes both fields |
| CS-T6 | New credential replaces stale encrypted blob |
| CS-T7 | Encryption failure aborts the write and returns an error |
| CS-T8 | Legacy plaintext is discarded, not restored as a credential |

### Break-and-fail verification (per AGENTS.md convention)

Protective assertions must detect removal of discard, clear, abort, and
no-plaintext safeguards. New verification follows the applicable reviewed
test-safety entry; no blanket suite or executable procedure is prescribed here.

### Out of scope for tests

Mock integration results do not verify DPAPI cross-user/machine behavior, bundled
runtime loading, or a real installation. Those require separate approved scope.
Documentation maintenance runs none of these operations.

## References

- [Team preference mirror](team-preferences-persistence.md),
  including "Negative" for the nonportable credential boundary.
- [Hydration contract](options-hydration.md),
  especially §4.5 for Reset ordering.
