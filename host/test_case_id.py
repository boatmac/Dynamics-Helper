import re
import unittest
import uuid
from host.dh_native_host import NativeHost


class TestExtractCaseId(unittest.TestCase):
    """Tests for NativeHost._extract_case_id() validation logic."""

    def test_valid_16_digit_case(self):
        """Standard 16-digit case number should return as-is."""
        self.assertEqual(
            NativeHost._extract_case_id("2601190030003106"), "2601190030003106"
        )

    def test_valid_19_digit_task(self):
        """19-digit task ID should return parent case (first 16 digits)."""
        self.assertEqual(
            NativeHost._extract_case_id("2601190030003106001"), "2601190030003106"
        )
        self.assertEqual(
            NativeHost._extract_case_id("2601190030003106005"), "2601190030003106"
        )

    def test_multiple_tasks_same_parent(self):
        """Different tasks of the same case should return the same parent ID."""
        result1 = NativeHost._extract_case_id("2601190030003106001")
        result2 = NativeHost._extract_case_id("2601190030003106003")
        self.assertEqual(result1, result2)
        self.assertEqual(result1, "2601190030003106")

    def test_unspecified(self):
        """'Unspecified' (default fallback) should return None."""
        self.assertIsNone(NativeHost._extract_case_id("Unspecified"))

    def test_empty_string(self):
        """Empty string should return None."""
        self.assertIsNone(NativeHost._extract_case_id(""))

    def test_none_input(self):
        """None input should return None."""
        self.assertIsNone(NativeHost._extract_case_id(None))

    def test_short_number(self):
        """Numbers shorter than 16 digits should return None."""
        self.assertIsNone(NativeHost._extract_case_id("12345"))
        self.assertIsNone(NativeHost._extract_case_id("123456789012345"))  # 15 digits

    def test_long_number(self):
        """Numbers longer than 19 digits should return None."""
        self.assertIsNone(
            NativeHost._extract_case_id("26011900300031060019")
        )  # 20 digits

    def test_17_or_18_digits(self):
        """17 or 18 digit numbers are invalid (not 16 or 19)."""
        self.assertIsNone(NativeHost._extract_case_id("26011900300031060"))  # 17
        self.assertIsNone(NativeHost._extract_case_id("260119003000310600"))  # 18

    def test_alphanumeric_ids(self):
        """Non-numeric case IDs (e.g., CAS-01234) should return None."""
        self.assertIsNone(NativeHost._extract_case_id("CAS-01234-A1B2"))
        self.assertIsNone(NativeHost._extract_case_id("INC-12345"))
        self.assertIsNone(NativeHost._extract_case_id("WO-12345"))

    def test_mixed_content(self):
        """Strings with non-digit characters should return None."""
        self.assertIsNone(NativeHost._extract_case_id("2601190030003106 extra"))
        self.assertIsNone(NativeHost._extract_case_id("case-2601190030003106"))


class TestCaseToSessionId(unittest.TestCase):
    """Tests for NativeHost._case_to_session_id() — deterministic UUIDv5
    session-id contract, shared byte-for-byte with MyCasesKit.

    The returned string is the cross-CLI handle: passed to Copilot SDK
    `create_session(session_id=...)` / `resume_session(...)` and used as the
    shell-side `copilot --resume <name>` handle.

    Contract (2026-07-03 revert): `str(uuid.uuid5(_NAMESPACE_MYCASE, case))`
    where the input is the **bare** case number (no prefix/salt) and
    `_NAMESPACE_MYCASE = 816bee4e-8eee-4c0b-ae69-70879d032f4d`. MyCasesKit
    computes the IDENTICAL value from the same namespace + bare case number,
    so the two repos agree with no handshake — the golden values below are
    the cross-repo anchor (verified byte-identical to MyCasesKit's PowerShell
    SHA-1 implementation). Authoritative handoff: MyCasesKit
    docs/dh-uuid5-change-spec.md.

    Why UUIDv5 (superseding the `co-`/`dhco-` prefix era): the session id is
    consumed by external validators DH does not control — notably AAD's
    `client_session` (20-50 chars). The `AADSTS901001` incident proved custom
    formats are exposed to such constraints; a 36-char UUID is always legal
    regardless of case-number length AND stays deterministic (uuid5), so
    resume works with no stored map. The earlier B82 "moved away from uuid5"
    rationale is superseded: the AAD floor is met by the UUID's fixed 36-char
    length, and deterministic resume is preserved by uuid5, not by a
    predictable prefix.
    """

    UUID_REGEX = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    )

    def test_known_answer(self):
        """Known-answer test against the SHARED golden values. These are the
        cross-repo anchor: DH and MyCasesKit MUST produce these exact
        strings. If output differs, the namespace constant or the input
        (must be the bare case number, UTF-8, no prefix) is wrong — fix the
        code, do NOT change these literals."""
        golden = {
            "2601190030003106": "ce0ec286-26e6-5095-8b30-46143e9f437f",
            "2099020099009998": "0ff23d45-654e-55aa-8be9-dfc55a842b2e",
            "2606100030001545": "6eb4d81e-d635-59e4-8a98-3d3a733cc733",
        }
        for case, expected in golden.items():
            self.assertEqual(
                NativeHost._case_to_session_id(case),
                expected,
                f"uuid5 mismatch for case {case}: cross-repo sync with "
                "MyCasesKit is broken. Check _NAMESPACE_MYCASE + bare-case "
                "input; do not edit the golden value.",
            )

    def test_length_is_36_aad_legal(self):
        """A UUID string is 36 chars — always inside AAD's `client_session`
        20-50 window, regardless of case-number length. This is the AAD
        regression guard: the whole reason we're on UUID is that the prior
        `co-` (19 chars) failed AAD with `AADSTS901001`."""
        result = NativeHost._case_to_session_id("2601190030003106")
        self.assertEqual(len(result), 36)
        self.assertGreaterEqual(len(result), 20)
        self.assertLessEqual(len(result), 50)

    def test_uses_only_aad_legal_chars(self):
        """AAD `client_session` allows alphanumeric + `-_.~` only; UUID hex
        digits + hyphens are a strict subset."""
        import re as _re
        result = NativeHost._case_to_session_id("2601190030003106")
        self.assertRegex(
            result,
            _re.compile(r"^[A-Za-z0-9\-_.~]+$"),
            f"Session name {result!r} contains chars outside AAD's "
            "`client_session` allowed set (alphanumeric + `-_.~`).",
        )

    def test_is_deterministic(self):
        """Same case ID must always produce the same session name — the
        load-bearing property: it is what lets SDK `resume_session(name)` and
        shell-CLI `copilot --resume <name>` find the same session across runs
        and across devices with no stored case→id map."""
        a = NativeHost._case_to_session_id("2601190030003106")
        b = NativeHost._case_to_session_id("2601190030003106")
        self.assertEqual(a, b)

    def test_different_cases_produce_different_names(self):
        """Two different cases must not collide on the same name."""
        a = NativeHost._case_to_session_id("2601190030003106")
        b = NativeHost._case_to_session_id("2099020099009998")
        self.assertNotEqual(a, b)

    def test_returns_uuid_v5_form(self):
        """Contract-inversion guard (was `test_never_returns_uuid_form`).
        The B82-era contract FORBADE UUID output and required a `dhco-`/`co-`
        prefix; the 2026-07-03 revert flips that. The result MUST now be a
        valid RFC-4122 UUID of **version 5** (deterministic namespace hash),
        and must NOT carry a legacy `cc-`/`co-`/`dhco-` prefix. If a future
        change reintroduces a prefix or a random (v4) UUID, this fails and
        forces a read of the _case_to_session_id docstring + the MyCasesKit
        handoff before proceeding."""
        result = NativeHost._case_to_session_id("2601190030003106")
        self.assertRegex(
            result,
            self.UUID_REGEX,
            f"_case_to_session_id must now return a UUID (got {result!r}).",
        )
        self.assertEqual(
            uuid.UUID(result).version,
            5,
            f"session id {result!r} must be a deterministic UUIDv5, not a "
            "random v4 — determinism is required for resume.",
        )
        for legacy in ("cc-", "co-", "dhco-"):
            self.assertFalse(
                result.startswith(legacy),
                f"session id {result!r} must not carry the legacy {legacy!r} "
                "prefix — the custom-prefix era is over (see docstring).",
            )


if __name__ == "__main__":
    unittest.main()
