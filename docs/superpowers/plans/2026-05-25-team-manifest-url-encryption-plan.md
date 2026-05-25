# Team Manifest URL Encryption (DPAPI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encrypt `team_manifest_url` at the host process boundary using Windows DPAPI so the SAS token never lands plaintext in `%LOCALAPPDATA%\DynamicsHelper\config.json`.

**Architecture:** New `host/secret_store.py` exposes `encrypt(str) -> str` / `decrypt(str) -> str` via `ctypes` bindings to `Crypt32.dll` (no new dependency). Two private methods on `NativeHost` (`_decrypt_secrets_in_memory`, `_encrypt_secrets_before_write`) bridge the encryption boundary inside `_get_session_config()` (load path) and `handle_update_config()` (write path). Extension is unchanged; chrome.storage.local stays plaintext per scope cut.

**Tech Stack:** Python 3, `ctypes` (stdlib), `unittest` (stdlib), Windows DPAPI via `Crypt32.dll`.

**Spec:** `docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md`

---

## File Structure

| Path | Purpose | Status |
|---|---|---|
| `host/secret_store.py` | Pure DPAPI wrapper. `encrypt`, `decrypt`, `EncryptError`, `DecryptError`. ~80 LOC. | **Create** |
| `host/test_secret_store.py` | Unit tests SS-T1..T7, Windows-gated. ~80 LOC. | **Create** |
| `host/test_config_secrets.py` | Integration tests CS-T1..T8 with mocked encrypt/decrypt. ~200 LOC. | **Create** |
| `host/dh_native_host.py` | Add `_decrypt_secrets_in_memory` (called after `load_config_file` returns user data); add `_encrypt_secrets_before_write` (called inside `handle_update_config` before merging into `current_data`); add EncryptError → error-response branch. | **Modify** |
| `AGENTS.md` | New rule in § 4 ("Critical Rules & Safety") documenting host-boundary encryption invariant. | **Modify** |
| `DEVELOPER_GUIDE.md` | New section "Secret encryption (DPAPI)" — key management, failure modes, testing approach. | **Modify** |
| `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` | Mark L881 follow-up `[CLOSED 2026-05-25]` pointing at implementation commit. | **Modify** |

**Unchanged:**
- All of `extension/`
- `host/requirements.txt` (ctypes is stdlib)
- `host/register.py`, `host/updater.py`, installer scripts
- PyInstaller spec

---

## Task 1: secret_store.py module + unit tests

**Files:**
- Create: `host/secret_store.py`
- Create: `host/test_secret_store.py`

### - [ ] Step 1: Write `host/test_secret_store.py` (SS-T1..T7)

Create the test file with all 7 tests; they will fail because the module doesn't exist yet.

```python
"""Unit tests for secret_store.py (Windows DPAPI wrapper).

All tests are Windows-only because DPAPI is a Win32 API.
"""

import base64
import sys
import unittest


@unittest.skipUnless(sys.platform == "win32", "DPAPI is Windows-only")
class TestSecretStore(unittest.TestCase):
    def setUp(self):
        # Import lazily so the file can be collected on non-Windows hosts
        # without ImportError (the class is skipped at run time).
        from host import secret_store
        self.secret_store = secret_store

    def test_SS_T1_roundtrip_simple(self):
        """SS-T1: decrypt(encrypt('hello')) == 'hello'."""
        blob = self.secret_store.encrypt("hello")
        self.assertEqual(self.secret_store.decrypt(blob), "hello")

    def test_SS_T2_roundtrip_realistic_sas_url(self):
        """SS-T2: 191-char SAS URL round-trips intact."""
        url = (
            "https://iuscssasw.blob.core.windows.net/teams/manifest.json"
            "?sp=r&st=2026-05-20T12:06:55Z&se=2026-05-30T20:21:55Z"
            "&spr=https&sv=2026-02-06&sr=b"
            "&sig=" + "A" * 86
        )
        self.assertEqual(self.secret_store.decrypt(self.secret_store.encrypt(url)), url)

    def test_SS_T3_encrypt_produces_base64(self):
        """SS-T3: encrypt output is valid base64."""
        blob = self.secret_store.encrypt("payload")
        # Should not raise:
        base64.b64decode(blob, validate=True)

    def test_SS_T4_encrypt_output_differs_from_input(self):
        """SS-T4: output != input (sanity check that something happened)."""
        plaintext = "the quick brown fox"
        blob = self.secret_store.encrypt(plaintext)
        self.assertNotEqual(blob, plaintext)
        self.assertNotIn(plaintext, blob)

    def test_SS_T5_decrypt_corrupt_blob_raises(self):
        """SS-T5: non-base64 input raises DecryptError."""
        with self.assertRaises(self.secret_store.DecryptError):
            self.secret_store.decrypt("not-valid-base64!!!")

    def test_SS_T6_decrypt_valid_base64_invalid_dpapi_raises(self):
        """SS-T6: random base64 bytes that are not a real DPAPI blob raise DecryptError."""
        random_blob = base64.b64encode(b"this is not a DPAPI blob, just bytes").decode("ascii")
        with self.assertRaises(self.secret_store.DecryptError):
            self.secret_store.decrypt(random_blob)

    def test_SS_T7_encrypt_empty_string(self):
        """SS-T7: empty string round-trips (documented behavior; callers should pre-handle)."""
        self.assertEqual(self.secret_store.decrypt(self.secret_store.encrypt("")), "")


if __name__ == "__main__":
    unittest.main()
```

### - [ ] Step 2: Run tests to verify they fail with ImportError

Run from repo root:

```powershell
python -m unittest host.test_secret_store -v
```

Expected: all 7 tests **ERROR** with `ModuleNotFoundError: No module named 'host.secret_store'` (or the tests are skipped on non-Windows; on Windows they must error).

### - [ ] Step 3: Implement `host/secret_store.py`

```python
"""Windows DPAPI wrapper for encrypting secret fields in config.json.

Uses `ctypes` against `Crypt32.dll` directly — no new dependencies.
Per-user, per-machine binding via `CryptProtectData` /
`CryptUnprotectData`. The OS manages the key material; the application
holds no key state.

Public surface:
    encrypt(plaintext: str) -> str        # returns base64 DPAPI blob
    decrypt(b64_blob: str) -> str         # raises DecryptError on failure
    class EncryptError(Exception)
    class DecryptError(Exception)
"""

import base64
import ctypes
from ctypes import wintypes


class EncryptError(Exception):
    """Raised when CryptProtectData fails. Effectively impossible during a
    normal Windows logon session; surfacing it should abort the write."""


class DecryptError(Exception):
    """Raised when CryptUnprotectData fails. Typical causes: blob created
    on a different machine, blob created by a different Windows user,
    blob is corrupt, or admin reset of user password destroyed the key
    material. Callers should treat the field as absent and self-heal on
    next write."""


# --- Win32 type bindings -----------------------------------------------------

class _DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
    ]


_crypt32 = ctypes.WinDLL("Crypt32.dll", use_last_error=True)
_kernel32 = ctypes.WinDLL("Kernel32.dll", use_last_error=True)

_CryptProtectData = _crypt32.CryptProtectData
_CryptProtectData.argtypes = [
    ctypes.POINTER(_DATA_BLOB),    # pDataIn
    wintypes.LPCWSTR,              # szDataDescr (NULL)
    ctypes.POINTER(_DATA_BLOB),    # pOptionalEntropy (NULL)
    ctypes.c_void_p,               # pvReserved (NULL)
    ctypes.c_void_p,               # pPromptStruct (NULL)
    wintypes.DWORD,                # dwFlags
    ctypes.POINTER(_DATA_BLOB),    # pDataOut
]
_CryptProtectData.restype = wintypes.BOOL

_CryptUnprotectData = _crypt32.CryptUnprotectData
_CryptUnprotectData.argtypes = [
    ctypes.POINTER(_DATA_BLOB),    # pDataIn
    ctypes.POINTER(wintypes.LPWSTR),  # ppszDataDescr (NULL)
    ctypes.POINTER(_DATA_BLOB),    # pOptionalEntropy (NULL)
    ctypes.c_void_p,               # pvReserved (NULL)
    ctypes.c_void_p,               # pPromptStruct (NULL)
    wintypes.DWORD,                # dwFlags
    ctypes.POINTER(_DATA_BLOB),    # pDataOut
]
_CryptUnprotectData.restype = wintypes.BOOL

_LocalFree = _kernel32.LocalFree
_LocalFree.argtypes = [ctypes.c_void_p]
_LocalFree.restype = ctypes.c_void_p

_CRYPTPROTECT_UI_FORBIDDEN = 0x1   # never prompt the user (we're headless)


def _make_blob(data: bytes) -> _DATA_BLOB:
    """Wrap a Python bytes object in a DATA_BLOB."""
    buf = ctypes.create_string_buffer(data, len(data))
    return _DATA_BLOB(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte)))


def _blob_to_bytes_and_free(blob: _DATA_BLOB) -> bytes:
    """Copy a DATA_BLOB's contents into a Python bytes object, then free
    the OS-allocated buffer."""
    try:
        return ctypes.string_at(blob.pbData, blob.cbData)
    finally:
        _LocalFree(blob.pbData)


def encrypt(plaintext: str) -> str:
    """Encrypt `plaintext` and return a base64-encoded DPAPI blob."""
    data = plaintext.encode("utf-8")
    blob_in = _make_blob(data)
    # `buf` must outlive the call; tie its lifetime to blob_in by
    # constructing both in this frame. ctypes keeps the underlying buffer
    # alive as long as the structure references it.
    blob_out = _DATA_BLOB()
    ok = _CryptProtectData(
        ctypes.byref(blob_in),
        None,
        None,
        None,
        None,
        _CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(blob_out),
    )
    if not ok:
        err = ctypes.get_last_error()
        raise EncryptError(f"CryptProtectData failed; GetLastError={err}")
    encrypted = _blob_to_bytes_and_free(blob_out)
    return base64.b64encode(encrypted).decode("ascii")


def decrypt(b64_blob: str) -> str:
    """Decrypt a base64-encoded DPAPI blob produced by `encrypt`."""
    try:
        data = base64.b64decode(b64_blob, validate=True)
    except (ValueError, base64.binascii.Error) as e:
        raise DecryptError(f"Input is not valid base64: {e}") from e

    blob_in = _make_blob(data)
    blob_out = _DATA_BLOB()
    ok = _CryptUnprotectData(
        ctypes.byref(blob_in),
        None,
        None,
        None,
        None,
        _CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(blob_out),
    )
    if not ok:
        err = ctypes.get_last_error()
        raise DecryptError(f"CryptUnprotectData failed; GetLastError={err}")
    plaintext_bytes = _blob_to_bytes_and_free(blob_out)
    try:
        return plaintext_bytes.decode("utf-8")
    except UnicodeDecodeError as e:
        raise DecryptError(f"Decrypted blob is not valid UTF-8: {e}") from e
```

### - [ ] Step 4: Run tests, verify all 7 pass

```powershell
python -m unittest host.test_secret_store -v
```

Expected: `Ran 7 tests in <time>` with **OK**. On non-Windows, all 7 should be skipped (`OK (skipped=7)`).

### - [ ] Step 5: Commit

```powershell
git add host/secret_store.py host/test_secret_store.py
git commit -m "feat(host): add secret_store module (DPAPI wrapper via ctypes)

Pure DPAPI wrapper exposing encrypt(str)->str and decrypt(str)->str.
ctypes bindings against Crypt32.dll's CryptProtectData/
CryptUnprotectData — no new dependencies (no pywin32). Per-user,
per-machine binding; OS manages key material.

Unit tests SS-T1..T7 cover roundtrip, base64 output validation,
corrupt blob handling, and empty string. Windows-only, skipped
on other platforms.

Part of follow-up #L881 in 2026-05-11-beta-channel-toggle plan.
Spec: docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md"
```

---

## Task 2: Integration test scaffolding (CS-T1..T8) with mocked secret_store

We write the integration tests before adding the methods they exercise. The tests will fail because the methods don't exist; that's expected.

**Files:**
- Create: `host/test_config_secrets.py`

### - [ ] Step 1: Write `host/test_config_secrets.py`

```python
"""Integration tests for the host-boundary encryption integration.

Tests `_decrypt_secrets_in_memory` and `_encrypt_secrets_before_write`
on `NativeHost`. Uses a reversible mock secret_store
(`encrypt = lambda s: 'ENC:'+s`, `decrypt = lambda b: b[4:]`) so the
tests exercise the integration logic, not DPAPI itself.

DPAPI behavior is covered in test_secret_store.py.
"""

import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch


def _fake_encrypt(plaintext: str) -> str:
    return "ENC:" + plaintext


def _fake_decrypt(b64_blob: str) -> str:
    # Raise on anything that doesn't start with ENC: so the failure
    # path is testable without real DPAPI.
    if not b64_blob.startswith("ENC:"):
        from host.secret_store import DecryptError
        raise DecryptError(f"fake decrypt rejects: {b64_blob!r}")
    return b64_blob[4:]


class TestConfigSecrets(unittest.TestCase):
    def setUp(self):
        # Each test gets its own temp dir + config.json path.
        self._tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self._tempdir.cleanup)
        self.config_path = os.path.join(self._tempdir.name, "config.json")

        # We need NativeHost only for its bound methods; avoid running
        # __init__ side effects.
        from host.dh_native_host import NativeHost
        self.host = NativeHost.__new__(NativeHost)

    def _write_config(self, payload: dict) -> None:
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(payload, f)

    def _read_config(self) -> dict:
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ---- CS-T1..T3: read path (_decrypt_secrets_in_memory) ---------------

    @patch("host.secret_store.decrypt", side_effect=_fake_decrypt)
    def test_CS_T1_load_with_encrypted_field(self, _mock):
        """Encrypted key on disk -> plaintext in memory, encrypted key removed."""
        data = {"extension_preferences": {"team_manifest_url_encrypted": "ENC:https://x"}}
        self.host._decrypt_secrets_in_memory(data)
        self.assertEqual(data["extension_preferences"].get("team_manifest_url"), "https://x")
        self.assertNotIn("team_manifest_url_encrypted", data["extension_preferences"])

    @patch("host.secret_store.decrypt", side_effect=_fake_decrypt)
    def test_CS_T2_load_without_any_url_field(self, _mock):
        """Neither key present -> no error, no spurious keys added."""
        data = {"extension_preferences": {"some_other": "value"}}
        self.host._decrypt_secrets_in_memory(data)
        self.assertNotIn("team_manifest_url", data["extension_preferences"])
        self.assertNotIn("team_manifest_url_encrypted", data["extension_preferences"])
        # Untouched fields preserved
        self.assertEqual(data["extension_preferences"]["some_other"], "value")

    @patch("host.secret_store.decrypt", side_effect=_fake_decrypt)
    def test_CS_T3_load_with_decrypt_failure_keeps_blob(self, _mock):
        """DecryptError -> empty URL in memory; encrypted blob unchanged on disk.

        Critical invariant: on decrypt failure we do NOT delete the
        on-disk blob (the user might re-login or restore correct
        credentials). The empty in-memory value triggers self-heal on
        next write.
        """
        original_blob = "BOGUS:not-decryptable"
        on_disk = {"extension_preferences": {"team_manifest_url_encrypted": original_blob}}
        self._write_config(on_disk)

        # _decrypt_secrets_in_memory operates on the loaded dict; load it
        # ourselves first to mimic _get_session_config behavior.
        data = self._read_config()
        self.host._decrypt_secrets_in_memory(data)

        # In-memory: plaintext is empty, encrypted key gone (from memory).
        self.assertEqual(data["extension_preferences"].get("team_manifest_url"), "")
        self.assertNotIn("team_manifest_url_encrypted", data["extension_preferences"])

        # On disk: untouched.
        disk_now = self._read_config()
        self.assertEqual(
            disk_now["extension_preferences"]["team_manifest_url_encrypted"],
            original_blob,
        )

    # ---- CS-T4..T7: write path (_encrypt_secrets_before_write) -----------

    @patch("host.secret_store.encrypt", side_effect=_fake_encrypt)
    def test_CS_T4_write_plaintext_becomes_encrypted(self, _mock):
        """Extension sends plaintext URL -> dict has encrypted key only."""
        payload_config = {"extension_preferences": {"team_manifest_url": "https://x"}}
        self.host._encrypt_secrets_before_write(payload_config)
        ext = payload_config["extension_preferences"]
        self.assertNotIn("team_manifest_url", ext)
        self.assertEqual(ext["team_manifest_url_encrypted"], "ENC:https://x")

    @patch("host.secret_store.encrypt", side_effect=_fake_encrypt)
    def test_CS_T5_write_empty_string_clears_both_keys(self, _mock):
        """Extension sends '' -> both keys removed (Reset semantics)."""
        payload_config = {
            "extension_preferences": {
                "team_manifest_url": "",
                "team_manifest_url_encrypted": "ENC:stale",  # stale; should be cleared
            }
        }
        self.host._encrypt_secrets_before_write(payload_config)
        ext = payload_config["extension_preferences"]
        self.assertNotIn("team_manifest_url", ext)
        self.assertNotIn("team_manifest_url_encrypted", ext)

    @patch("host.secret_store.encrypt", side_effect=_fake_encrypt)
    def test_CS_T6_write_overrides_stale_encrypted_blob(self, _mock):
        """Stale encrypted blob present + new plaintext arrives -> fresh
        encrypted blob, no stale data."""
        payload_config = {
            "extension_preferences": {
                "team_manifest_url": "NEW",
                "team_manifest_url_encrypted": "ENC:OLD",  # must be overwritten
            }
        }
        self.host._encrypt_secrets_before_write(payload_config)
        ext = payload_config["extension_preferences"]
        self.assertEqual(ext["team_manifest_url_encrypted"], "ENC:NEW")
        self.assertNotIn("team_manifest_url", ext)

    @patch("host.secret_store.encrypt")
    def test_CS_T7_encrypt_failure_aborts_write(self, mock_encrypt):
        """EncryptError must propagate; caller must NOT fall back to plaintext."""
        from host.secret_store import EncryptError
        mock_encrypt.side_effect = EncryptError("simulated DPAPI failure")

        payload_config = {"extension_preferences": {"team_manifest_url": "https://x"}}
        with self.assertRaises(EncryptError):
            self.host._encrypt_secrets_before_write(payload_config)

        # Critical: the plaintext key must NOT have been deleted (we did
        # not successfully encrypt), and no encrypted key was added. The
        # caller is responsible for aborting the write entirely.
        ext = payload_config["extension_preferences"]
        self.assertEqual(ext.get("team_manifest_url"), "https://x")
        self.assertNotIn("team_manifest_url_encrypted", ext)

    # ---- CS-T8: legacy plaintext discarded -------------------------------

    @patch("host.secret_store.decrypt", side_effect=_fake_decrypt)
    def test_CS_T8_legacy_plaintext_field_discarded(self, _mock):
        """Pre-feature plaintext key on disk is dropped, not honored.

        The team manifest URL feature was never released with plaintext
        persistence to users; any plaintext `team_manifest_url` key
        present in config.json is stale/invalid. _decrypt_secrets_in_memory
        must NOT propagate it to the in-memory dict (where downstream
        code would treat it as a valid configured URL).
        """
        data = {"extension_preferences": {"team_manifest_url": "https://legacy-plaintext"}}
        self.host._decrypt_secrets_in_memory(data)
        # In-memory state: plaintext gone. (Empty string OR key absent is
        # acceptable per spec; assert "no usable URL is present".)
        self.assertFalse(data["extension_preferences"].get("team_manifest_url"))


if __name__ == "__main__":
    unittest.main()
```

### - [ ] Step 2: Run tests, verify they fail with AttributeError

```powershell
python -m unittest host.test_config_secrets -v
```

Expected: all 8 tests **ERROR** with `AttributeError: 'NativeHost' object has no attribute '_decrypt_secrets_in_memory'` (or `_encrypt_secrets_before_write`).

### - [ ] Step 3: Commit

```powershell
git add host/test_config_secrets.py
git commit -m "test(host): add CS-T1..T8 integration tests for secret encryption boundary

Tests for the two private NativeHost methods that will bridge the
encryption boundary (_decrypt_secrets_in_memory called after
load_config_file; _encrypt_secrets_before_write called inside
handle_update_config). Methods do not exist yet — tests will fail
with AttributeError until Task 3.

Uses reversible mock encrypt/decrypt (ENC: prefix) so the tests
exercise integration logic, not DPAPI itself. CS-T8 locks the
'legacy plaintext is dropped' invariant per spec § Migration."
```

---

## Task 3: Add `_decrypt_secrets_in_memory` and `_encrypt_secrets_before_write` methods (still not wired)

We implement the methods first, in isolation, so CS-T1..T8 turn green before any production code path uses them. Wiring is Task 4.

**Files:**
- Modify: `host/dh_native_host.py`

### - [ ] Step 1: Find the `NativeHost` class definition

Search for `class NativeHost` in `host/dh_native_host.py` to confirm the class name and find a suitable insertion point (just before `_get_session_config`).

```powershell
Select-String -Path "host\dh_native_host.py" -Pattern "^class NativeHost|^    def _get_session_config"
```

Note the line numbers; both methods should be added immediately before `_get_session_config`.

### - [ ] Step 2: Add both methods to `NativeHost`

Insert the following two methods into the `NativeHost` class, placed immediately before `def _get_session_config(self):`. Also add `from . import secret_store` near the top of the file if it isn't already importable (likely needs a plain `import secret_store` since the project runs as scripts, not as a package; check existing import style at top of `dh_native_host.py` first and match it).

**Check existing import style first:**

```powershell
Select-String -Path "host\dh_native_host.py" -Pattern "^from \.|^import " | Select-Object -First 20
```

If imports are bare (`import pii_scrubber`, etc.), use `import secret_store`. If they're package-style, use `from host import secret_store`. Match what's there.

**Insert this code (using bare-import style; adjust if needed):**

```python
    # ------------------------------------------------------------------
    # Secret field encryption boundary
    # ------------------------------------------------------------------
    # `team_manifest_url` is an Azure Blob SAS URL containing a sensitive
    # `sig=` HMAC. We persist it to disk encrypted via DPAPI so a screenshot
    # of config.json, a backup-tool upload, or a DLP scan of %LOCALAPPDATA%
    # cannot leak it. Encryption is on-disk only; in-memory state (and the
    # IPC payload to the extension) still uses plaintext.
    #
    # DO NOT log plaintext URLs inside these methods.
    #
    # Spec: docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md

    def _decrypt_secrets_in_memory(self, config: dict) -> None:
        """Replace on-disk encrypted secret fields with in-memory plaintext.

        Mutates `config` in place. Must be called immediately after loading
        config.json. After this call, downstream code sees the legacy
        plaintext key names (`team_manifest_url`) and is oblivious to
        encryption.

        Behavior:
        - If `team_manifest_url_encrypted` is present and decrypts cleanly:
          set `team_manifest_url` to the plaintext, delete the encrypted key
          (in memory only).
        - If decryption fails (cross-machine copy, corrupt blob, lost key):
          log a WARNING, set `team_manifest_url` to "", and remove the
          encrypted key from the in-memory dict so downstream code does not
          see the unusable blob. The on-disk blob is NOT touched; the user
          self-heals by repasting the URL.
        - Any pre-existing plaintext `team_manifest_url` key in config.json
          is treated as legacy/invalid and discarded (never released with
          plaintext persistence; presence indicates stale or tampered
          state).
        """
        ext = config.get("extension_preferences")
        if not isinstance(ext, dict):
            return

        # Discard any stale plaintext key — never trust it (spec § Migration).
        if "team_manifest_url" in ext:
            logging.warning(
                "Discarding stale plaintext team_manifest_url from config.json; "
                "encrypted form is the only persistence path."
            )
            del ext["team_manifest_url"]

        blob = ext.pop("team_manifest_url_encrypted", None)
        if blob is None:
            return  # nothing to decrypt

        try:
            ext["team_manifest_url"] = secret_store.decrypt(blob)
        except secret_store.DecryptError as e:
            logging.warning(
                "Failed to decrypt team_manifest_url (likely cross-machine "
                "copy or key reset); treating as unconfigured. Error: %s",
                e,
            )
            ext["team_manifest_url"] = ""
            # NOTE: Intentionally do NOT write the encrypted blob back to
            # `ext` — downstream code would re-persist it on the next
            # config save and we want self-heal to be one user action.

    def _encrypt_secrets_before_write(self, payload_config: dict) -> None:
        """Replace in-memory plaintext secret fields with encrypted form.

        Mutates `payload_config` in place. Must be called inside
        handle_update_config before merging the payload into the on-disk
        config. After this call, the dict carries only encrypted keys for
        secret fields.

        Behavior:
        - Non-empty plaintext `team_manifest_url`: encrypt, store under
          `team_manifest_url_encrypted`, delete the plaintext key.
        - Empty-string plaintext (user cleared the field, or Reset): delete
          both keys so neither persists.
        - EncryptError propagates to the caller — handle_update_config
          MUST abort the entire write on this exception. There is no
          plaintext fallback path.
        """
        ext = payload_config.get("extension_preferences")
        if not isinstance(ext, dict):
            return
        if "team_manifest_url" not in ext:
            return  # extension didn't send the field; nothing to do

        url = ext["team_manifest_url"]

        if url == "":
            # Reset / clear semantics: drop both keys.
            del ext["team_manifest_url"]
            ext.pop("team_manifest_url_encrypted", None)
            return

        # Encrypt and swap keys atomically. If encrypt raises, we leave
        # `team_manifest_url` in place so the caller's exception handler
        # sees the dict unchanged from what it received — easier to reason
        # about than half-mutated state.
        blob = secret_store.encrypt(url)  # may raise EncryptError
        ext["team_manifest_url_encrypted"] = blob
        del ext["team_manifest_url"]
```

### - [ ] Step 3: Add `import secret_store` near the other module imports

Find the import block at top of `host/dh_native_host.py` and add `import secret_store` alongside `import pii_scrubber` (or wherever sibling-module imports live). Use the same import style as existing sibling modules.

### - [ ] Step 4: Run integration tests, verify all 8 pass

```powershell
python -m unittest host.test_config_secrets -v
```

Expected: `Ran 8 tests in <time>` with **OK**.

### - [ ] Step 5: Run secret_store unit tests too, verify they still pass

```powershell
python -m unittest host.test_secret_store -v
```

Expected: 7 passed (or 7 skipped on non-Windows).

### - [ ] Step 6: Break-and-fail verification

Confirm each protective branch is necessary by temporarily breaking it and re-running the relevant test. After each break, re-run the test, confirm FAIL, then revert.

Run this checklist. For each row: make the edit, run the test, confirm the expected failure, revert the edit.

| # | Test | Break to apply | Expected failure mode |
|---|---|---|---|
| 1 | CS-T3 | In `_decrypt_secrets_in_memory`, on DecryptError add `ext["team_manifest_url_encrypted"] = blob` (re-persist the bad blob in memory) | T3 expects encrypted key absent in-memory — fails |
| 2 | CS-T4 | Remove the `del ext["team_manifest_url"]` line at end of `_encrypt_secrets_before_write` happy path | T4 expects plaintext key absent — fails |
| 3 | CS-T5 | Remove `ext.pop("team_manifest_url_encrypted", None)` from empty-string branch | T5 expects encrypted key absent — fails |
| 4 | CS-T7 | Wrap the `secret_store.encrypt(url)` call in `try/except EncryptError: pass`, fall through to no-op | T7 expects EncryptError to propagate — fails |
| 5 | CS-T8 | Remove the "discard stale plaintext" block in `_decrypt_secrets_in_memory` | T8 expects plaintext key gone — fails |

After all 5 verifications pass (each one fails the test, then reverts cleanly to green), continue.

### - [ ] Step 7: Commit

```powershell
git add host/dh_native_host.py
git commit -m "feat(host): add _decrypt_secrets_in_memory / _encrypt_secrets_before_write

Two private NativeHost methods that bridge the encryption boundary for
extension_preferences.team_manifest_url. Methods are defined but not
yet wired into _get_session_config or handle_update_config — Task 4.

CS-T1..T8 (host/test_config_secrets.py) now pass; SS-T1..T7
(host/test_secret_store.py) still pass. Break-and-fail verification
confirmed 5 protective branches per spec § Testing strategy."
```

---

## Task 4: Wire the boundary methods into load and write paths

Now connect the methods to production code paths.

**Files:**
- Modify: `host/dh_native_host.py`

### - [ ] Step 1: Wire `_decrypt_secrets_in_memory` into `_get_session_config`

Open `host/dh_native_host.py` and find this block (around line 779-784):

```python
        # B. Load User Config (Override)
        if os.path.exists(user_config_path):
            user_data = load_config_file(user_config_path)
        else:
            logging.info(f"User config file not found at: {user_config_path}")
            user_data = {}
```

Insert the decrypt call **after** `user_data = load_config_file(user_config_path)` and **after** the `else` branch sets `user_data = {}`, so both paths get the call. Cleanest is right after the if/else block ends:

```python
        # B. Load User Config (Override)
        if os.path.exists(user_config_path):
            user_data = load_config_file(user_config_path)
        else:
            logging.info(f"User config file not found at: {user_config_path}")
            user_data = {}

        # Decrypt secret fields (e.g. team_manifest_url_encrypted) in place
        # so downstream merge/read code sees the legacy plaintext key names.
        # On decrypt failure the field becomes "" and the user repastes via UI.
        self._decrypt_secrets_in_memory(user_data)
```

### - [ ] Step 2: Wire `_encrypt_secrets_before_write` into `handle_update_config`

Open `host/dh_native_host.py` and find this block (around line 1397-1402):

```python
                # Merge new config
                current_data.update(payload["config"])

                with open(user_config_path, "w") as f:
                    json.dump(current_data, f, indent=2)
                logging.info("Updated config.json")
```

Insert the encrypt call **immediately before** `current_data.update(payload["config"])`, wrapped in try/except for the EncryptError-aborts-write semantics:

```python
                # Encrypt secret fields (team_manifest_url -> _encrypted)
                # before merging. EncryptError aborts the entire write per
                # spec § "EncryptError handling".
                try:
                    self._encrypt_secrets_before_write(payload["config"])
                except secret_store.EncryptError as e:
                    logging.error(
                        "Failed to encrypt secret field; aborting config write. "
                        "Error: %s", e
                    )
                    return {
                        "error": "Failed to encrypt secret field; configuration not saved."
                    }

                # Merge new config
                current_data.update(payload["config"])

                with open(user_config_path, "w") as f:
                    json.dump(current_data, f, indent=2)
                logging.info("Updated config.json")
```

### - [ ] Step 3: Run full host test suite

```powershell
python -m unittest discover host -v
```

Expected: all tests pass (the suite should now include `test_secret_store` and `test_config_secrets` plus the pre-existing tests).

### - [ ] Step 4: Manual smoke test (dev mode)

Switch host to dev mode and exercise both paths end-to-end with a real DPAPI call.

```powershell
python dev_switch.py dev
python dev_switch.py status
```

Confirm dev mode is active. Then:

1. **Clear any existing manifest URL state.** Open `%LOCALAPPDATA%\DynamicsHelper\config.json`, manually verify `extension_preferences.team_manifest_url` and `team_manifest_url_encrypted` are both absent. If present, delete them and save.

2. **Trigger a config write.** Open Chrome with the extension loaded, open Options, paste a manifest URL (any URL is fine for smoke; use a fake one if no real SAS handy: `https://example.com/manifest.json?sig=test`), tab out of the field (onBlur triggers persist).

3. **Verify config.json on disk:**

```powershell
Get-Content "$env:LOCALAPPDATA\DynamicsHelper\config.json" | ConvertFrom-Json | Select-Object -ExpandProperty extension_preferences | Format-List team_manifest_url, team_manifest_url_encrypted
```

Expected output: `team_manifest_url` is empty/absent, `team_manifest_url_encrypted` contains a long base64 string starting with characters like `AQAAANC...`.

4. **Verify host log:**

```powershell
Select-String -Path "$env:LOCALAPPDATA\DynamicsHelper\native_host.log" -Pattern "team_manifest" -SimpleMatch | Select-Object -Last 10
```

Expected: no plaintext URL in log; no error/warning about decrypt or encrypt.

5. **Verify roundtrip.** Restart Chrome (or reload extension) to force a fresh `get_config` from host. Open Options, confirm the manifest URL field shows the original plaintext URL.

6. **Verify Reset clears both keys.** In Options, clear the manifest URL field (tab out), or click Reset. Re-run the Get-Content command above; both keys should now be absent from `extension_preferences`.

### - [ ] Step 5: Commit

```powershell
git add host/dh_native_host.py
git commit -m "feat(host): wire DPAPI encryption into config load/write paths

Wire _decrypt_secrets_in_memory into _get_session_config after
load_config_file returns user config. Wire _encrypt_secrets_before_write
into handle_update_config immediately before current_data.update;
EncryptError returns an error response without writing to disk.

Closes follow-up #L881 (SAS token redaction) from
docs/superpowers/plans/2026-05-11-beta-channel-toggle.md.

Manual smoke verified: paste manifest URL via Options → config.json
contains only team_manifest_url_encrypted (base64 DPAPI blob);
restart host → URL surfaces back to extension intact; Reset clears
both plaintext and encrypted keys."
```

---

## Task 5: Documentation updates

**Files:**
- Modify: `AGENTS.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`

### - [ ] Step 1: Add Secret Field Persistence rule to AGENTS.md § 4

Open `AGENTS.md`, find the "## 4. Critical Rules & Safety" section. Add a new subsection after the existing rules (after "### 6. Session Persistence" or wherever the existing numbered rules end; insert before the next top-level section):

```markdown
### 8. Secret Field Persistence

* **Boundary:** Sensitive fields (currently: `team_manifest_url`) are encrypted on disk in `%LOCALAPPDATA%\DynamicsHelper\config.json` using Windows DPAPI. Encryption happens **only at the host process boundary** — `chrome.storage.local`, IPC payloads, and host in-memory state continue to use plaintext.
* **Implementation:** `host/secret_store.py` (ctypes binding to `Crypt32.dll`; no `pywin32` dependency) plus `_decrypt_secrets_in_memory` / `_encrypt_secrets_before_write` on `NativeHost`. See `docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md`.
* **On-disk schema:** Encrypted form is `extension_preferences.team_manifest_url_encrypted` (base64 DPAPI blob). The plaintext key `team_manifest_url` MUST NEVER appear in `config.json` on disk.
* **DPAPI properties:** Per-user, per-machine binding. Copying `config.json` to another machine or another Windows account renders the blob unreadable. This is intentional: SAS tokens are not portable credentials.
* **Failure modes:**
  * **DecryptError on startup** (cross-machine copy, corrupt blob, admin password reset) → host logs a warning, treats the field as empty, leaves the bad blob on disk. User repastes URL in Options → new encrypted blob overwrites the bad one. Self-heal.
  * **EncryptError on write** → entire `update_config` is aborted with an error response. **No plaintext fallback under any circumstance.**
* **DO NOT** log plaintext URLs in `_decrypt_secrets_in_memory` / `_encrypt_secrets_before_write` or anywhere else.
* **DO NOT** add new sensitive fields without applying the same pattern. If you persist a credential to `config.json`, encrypt it.
```

### - [ ] Step 2: Add DPAPI section to DEVELOPER_GUIDE.md

Open `DEVELOPER_GUIDE.md`, find a natural insertion point (e.g., after the Hydration guard section or near the end of the host-internals coverage). Add:

```markdown
## Secret encryption (DPAPI)

The host encrypts certain `extension_preferences` fields before persisting them to `%LOCALAPPDATA%\DynamicsHelper\config.json`. Currently this applies only to `team_manifest_url` (Azure Blob SAS URL containing an HMAC signature). The threat being mitigated is accidental disclosure: screenshots of `config.json`, backup-tool uploads of `%LOCALAPPDATA%`, and corporate DLP scans for secret patterns.

### Where the boundary lives

- **Extension side (`chrome.storage.local`, IPC payloads, UI):** plaintext. Encryption is not extended here because the extension needs plaintext to perform fetches, and chrome.storage.local lives in a different filesystem path than `config.json` (different scan/screenshot risk).
- **Host in-memory state (`self._get_session_config` return value, `get_config` response):** plaintext. Downstream code reads `extension_preferences.team_manifest_url` and is oblivious to whether it came from an encrypted blob.
- **`config.json` on disk:** encrypted. The plaintext key `team_manifest_url` MUST NEVER appear on disk. Only `team_manifest_url_encrypted` (base64 DPAPI blob) is persisted.

### Modules

- **`host/secret_store.py`** — ctypes wrapper around `Crypt32.dll`'s `CryptProtectData` / `CryptUnprotectData`. Exposes `encrypt(str) -> str`, `decrypt(str) -> str`, `EncryptError`, `DecryptError`. No new dependencies.
- **`NativeHost._decrypt_secrets_in_memory`** — called inside `_get_session_config` after `load_config_file` returns the user config. Replaces encrypted keys with plaintext; on DecryptError sets the plaintext to `""` and leaves the bad blob on disk for self-healing.
- **`NativeHost._encrypt_secrets_before_write`** — called inside `handle_update_config` before merging the payload into `current_data`. Replaces plaintext with encrypted form; empty-string plaintext clears both keys (Reset semantics).

### DPAPI key management

Zero application-level work. Windows LSA derives a per-user Master Key from the user's logon credentials; OS-managed rotation every 90 days (with old keys retained); user-initiated password changes re-wrap the key transparently. The application never reads, writes, or backs up key material.

Properties relevant to debugging:

| Scenario | Effect |
|---|---|
| Same user, same machine | Always decrypts. |
| Same user, different machine | DecryptError (unless corporate AD Credential Roaming is enabled). Self-heal: repaste URL. |
| Different user, same machine | DecryptError. Self-heal: repaste URL. |
| Admin resets user password (not user self-service) | May destroy Master Key → DecryptError. Self-heal: repaste URL. |
| Disk image restored to same hardware | Works (Master Key restored with `%APPDATA%`). |

### Adding a new encrypted field

1. Spec the field in a design doc; confirm DPAPI is appropriate (it's right for credentials that shouldn't be portable; wrong for fields that need to roundtrip across machines).
2. Add the field name to both `_decrypt_secrets_in_memory` and `_encrypt_secrets_before_write` (consider extracting a `_SECRET_FIELDS` list if there are 3+ fields).
3. Add unit tests to `host/test_config_secrets.py` mirroring CS-T1..T8 for the new field.
4. Update AGENTS.md § 4.8 with the new field name.

### Failure mode debugging

Look for these log lines in `%LOCALAPPDATA%\DynamicsHelper\native_host.log`:

- `WARNING ... Failed to decrypt team_manifest_url ...` → DecryptError on startup. Expected after cross-machine copy or password reset.
- `WARNING ... Discarding stale plaintext team_manifest_url ...` → legacy plaintext key found in config.json. Should only appear once per user (during the first run on a pre-existing config).
- `ERROR ... Failed to encrypt secret field; aborting config write` → DPAPI service is broken. The user's Windows session likely needs to be restarted; this should be effectively impossible during a healthy session.
```

### - [ ] Step 3: Close the follow-up in the beta-channel-toggle plan

Open `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`, find line ~881 (the `SAS token redaction in config.json` follow-up). Update the bullet to:

```markdown
- **SAS token redaction in config.json** **[CLOSED 2026-05-25]** (added 2026-05-21 per `docs/superpowers/specs/2026-05-21-team-prefs-config-mirror-design.md` consequence #1). `teamManifestUrl` typically contains an Azure Blob SAS token (`?sp=r&se=...&sig=...`) that is now mirrored to `%LOCALAPPDATA%\DynamicsHelper\config.json` in plaintext. Same posture as `chrome.storage.local`, but the attack surface widens slightly because external scanners may inspect `%LOCALAPPDATA%`. **Resolution:** DPAPI encryption at the host boundary. Plaintext `team_manifest_url` is replaced on disk by `team_manifest_url_encrypted` (base64 DPAPI blob). See spec `docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md` and implementation tasks 1-5 of `docs/superpowers/plans/2026-05-25-team-manifest-url-encryption-plan.md`. `chrome.storage.local` remains plaintext per spec scope cut.
```

### - [ ] Step 4: Commit docs

```powershell
git add AGENTS.md DEVELOPER_GUIDE.md docs/superpowers/plans/2026-05-11-beta-channel-toggle.md
git commit -m "docs: DPAPI secret encryption (AGENTS.md rule 4.8, DEV_GUIDE section, close #L881)

- AGENTS.md § 4.8: new 'Secret Field Persistence' rule covering the
  host-boundary encryption invariant, on-disk schema, failure modes,
  and the 'no plaintext fallback' guarantee.
- DEVELOPER_GUIDE.md: new 'Secret encryption (DPAPI)' section covering
  modules, DPAPI key management, scenarios table, how to add a new
  encrypted field, and log-line debugging cues.
- beta-channel-toggle plan L881 follow-up: marked [CLOSED 2026-05-25]
  with resolution paragraph pointing at the spec and this plan."
```

---

## Task 6: Final verification and push

### - [ ] Step 1: Run full test suite one more time

```powershell
python -m unittest discover host -v
```

Expected: every test passes; new tests (`test_secret_store`, `test_config_secrets`) are in the run.

### - [ ] Step 2: Run extension tests for regression check

```powershell
cd extension; npm run test:run
```

Expected: all 21 tests pass (pageReader 11 + Options 6 + FAB rootPathOverride 4). No new tests expected — extension is unchanged — but we confirm we didn't break anything via the docs edits.

### - [ ] Step 3: Build extension to confirm no docs-edit syntax errors

```powershell
cd extension; npm run build
```

Expected: clean build, no TypeScript errors.

### - [ ] Step 4: Inspect commit log before push

```powershell
git log --oneline origin/master..HEAD
```

Expected: 5 commits in order — secret_store module + tests; integration tests; boundary methods; wiring; docs. Each should have a meaningful subject and body.

### - [ ] Step 5: Final manual smoke (one more end-to-end with attention to log lines)

```powershell
python dev_switch.py status
```

Confirm dev mode. Then in Chrome:

1. Open Options. If a manifest URL is already configured, clear it (tab out), confirm `config.json` has neither key.
2. Paste a fake manifest URL, tab out.
3. Inspect `config.json`:

```powershell
$cfg = Get-Content "$env:LOCALAPPDATA\DynamicsHelper\config.json" -Raw | ConvertFrom-Json
$cfg.extension_preferences.team_manifest_url
$cfg.extension_preferences.team_manifest_url_encrypted.Substring(0, [Math]::Min(60, $cfg.extension_preferences.team_manifest_url_encrypted.Length))
```

Expected: first line empty; second line shows ~60 chars of base64 (`AQAAANC...` or similar). **The plaintext URL must not be visible anywhere in `config.json`.**

4. Inspect log:

```powershell
Get-Content "$env:LOCALAPPDATA\DynamicsHelper\native_host.log" -Tail 30
```

Expected: no plaintext URLs, no decrypt/encrypt warnings. The handle_update_config "Updated config.json" line should be present.

### - [ ] Step 6: Ask user for push approval

Do NOT push without explicit user confirmation. Summarize the 5 commits and the smoke result, then ask:

> "All 5 commits ready. Manual smoke passed: config.json contains only `team_manifest_url_encrypted`, plaintext URL not visible on disk. OK to `git push origin master`?"

### - [ ] Step 7 (after approval): Push

```powershell
git push origin master
```

Expected: `<old>..<new>  master -> master`.

---

## Self-review checklist (executed before finalizing this plan)

**1. Spec coverage:**
- Spec § "Component split" → Task 1 (secret_store) + Task 3 (NativeHost methods)
- Spec § "Data flow: startup" → Task 3 (_decrypt_secrets_in_memory) + Task 4 step 1 (wiring)
- Spec § "Data flow: write" → Task 3 (_encrypt_secrets_before_write) + Task 4 step 2 (wiring)
- Spec § "EncryptError handling" → Task 4 step 2 (try/except return error) + CS-T7
- Spec § "DecryptError handling" → Task 3 method body + CS-T3
- Spec § "Reset" → CS-T5 (covered by empty-string branch)
- Spec § "Migration (no migration)" → Task 3 method body discard branch + CS-T8
- Spec § "DPAPI key management" → DEVELOPER_GUIDE.md section in Task 5
- Spec § "Scope cut: chrome.storage.local stays plaintext" → AGENTS.md rule in Task 5 explicitly documents this
- Spec § "ctypes not pywin32" → Task 1 secret_store.py implementation
- Spec § "Telemetry: none" → covered by absence (no telemetry calls in any task)
- Spec § "Testing strategy" → Tasks 1, 2, 3 step 6 (break-and-fail)
- Spec § "File impact" → all 7 listed files appear in tasks
- Spec § "Implementation order" → matches Tasks 1-5

All spec sections mapped to tasks. No gaps.

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "appropriate", "similar to" patterns in the plan.

**3. Type consistency:**
- `encrypt(str) -> str`, `decrypt(str) -> str` consistent across Task 1 (definition), Task 2 (mock), Task 3 (call site)
- `EncryptError`, `DecryptError` consistent across module definition, tests, and method bodies
- `_decrypt_secrets_in_memory`, `_encrypt_secrets_before_write` method names consistent across Tasks 2, 3, 4
- On-disk key names `team_manifest_url` (plaintext, in-memory only) and `team_manifest_url_encrypted` (on disk only) consistent across spec, tests, methods, and docs
- `extension_preferences` is the parent key in all references
