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
