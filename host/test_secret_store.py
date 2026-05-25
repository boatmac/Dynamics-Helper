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
        """SS-T4: output != input, and decoded bytes do not contain the
        plaintext (catches a fake implementation that just base64-encodes
        the input without actual encryption)."""
        plaintext = "the quick brown fox"
        blob = self.secret_store.encrypt(plaintext)
        self.assertNotEqual(blob, plaintext)
        self.assertNotIn(plaintext, blob)
        # The strong check: base64-decode the blob and confirm the raw
        # bytes do not contain the plaintext. A real DPAPI blob is an
        # opaque ciphertext + IV + MAC; the plaintext must not appear.
        decoded = base64.b64decode(blob)
        self.assertNotIn(plaintext.encode("utf-8"), decoded)

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
