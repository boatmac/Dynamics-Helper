import re
import unittest
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
    """Tests for NativeHost._case_to_session_id() — DH `dhco-` extension of
    the MyCasesKit B81 RFC § D1 contract.

    The session-name string returned here is the cross-CLI handle: the same
    value is passed to Copilot SDK `create_session(session_id=...)` and
    `client.resume_session(...)`, and is also the shell-side handle for
    `copilot --resume <name>`.

    Contract history:
      - B82 (2026-05-11): `co-<case-num>` (19 chars for a 16-digit case).
      - 2026-07-03: extended to `dhco-<case-num>` (21 chars) to satisfy
        Microsoft Entra AAD `client_session` OAuth parameter minimum of
        20 chars. The 19-char `co-` form was silently blocking every MCP
        auth flow with `AADSTS901001: Invalid request`.

    MyCasesKit B81 RFC § D1's shell-CLI matcher is being updated in the
    sibling repo from `^(cc|co)-<case-num>$` to `^(cc|co|dhco)-<case-num>$`
    so shell-CLI sessions can still recognise DH-created sessions. Until
    the MyCasesKit PR merges, DH-created and MyCasesKit-created sessions
    for the same case have distinct names and do NOT round-trip through
    `copilot --resume`.

    See _case_to_session_id docstring for the full history.
    """

    UUID_REGEX = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    )

    def test_returns_dhco_prefix_form(self):
        """The value must be `dhco-<case-num>` per the 2026-07-03 AAD-fix
        update. Bare `co-<case>` (19 chars) is REJECTED by AAD as too
        short for `client_session`."""
        self.assertEqual(
            NativeHost._case_to_session_id("2601190030003106"),
            "dhco-2601190030003106",
        )

    def test_length_satisfies_aad_minimum(self):
        """AAD requires `client_session` to be 20-50 chars. This test is
        the regression guard: if a future maintainer shortens the prefix
        back to `co-` or removes it, the AAD-side breakage returns and
        every AAD-protected MCP tool fails to auth.
        """
        result = NativeHost._case_to_session_id("2601190030003106")
        self.assertGreaterEqual(
            len(result),
            20,
            f"Session name {result!r} is only {len(result)} chars; AAD "
            "`client_session` OAuth parameter requires 20-50 chars. "
            "See _case_to_session_id docstring re: AADSTS901001.",
        )
        self.assertLessEqual(len(result), 50)

    def test_uses_only_aad_legal_chars(self):
        """AAD `client_session` allows alphanumeric + `-_.~` only."""
        import re as _re
        result = NativeHost._case_to_session_id("2601190030003106")
        self.assertRegex(
            result,
            _re.compile(r"^[A-Za-z0-9\-_.~]+$"),
            f"Session name {result!r} contains chars outside AAD's "
            "`client_session` allowed set (alphanumeric + `-_.~`).",
        )

    def test_is_deterministic(self):
        """Same case ID must always produce the same session name; this is
        the precondition for SDK `resume_session(name)` and shell-CLI
        `copilot --resume <name>` finding the same session across runs."""
        a = NativeHost._case_to_session_id("2601190030003106")
        b = NativeHost._case_to_session_id("2601190030003106")
        self.assertEqual(a, b)

    def test_different_cases_produce_different_names(self):
        """Two different cases must not collide on the same name."""
        a = NativeHost._case_to_session_id("2601190030003106")
        b = NativeHost._case_to_session_id("2099020099009998")
        self.assertNotEqual(a, b)

    def test_never_returns_uuid_form(self):
        """Regression guard: B82 explicitly moved away from UUID v5(dh-<case>)
        so DH-launched sessions and shell-CLI-launched sessions converge
        under one --resume handle. If a future change accidentally reverts
        to UUID output, this test fails loudly and forces the maintainer
        to read the _case_to_session_id docstring + MyCasesKit
        b81-session-naming-rfc.md before proceeding."""
        result = NativeHost._case_to_session_id("2601190030003106")
        self.assertNotRegex(
            result,
            self.UUID_REGEX,
            f"_case_to_session_id returned UUID-shaped value {result!r}; "
            "contract requires `dhco-<case-num>` (see docstring).",
        )
        self.assertTrue(
            result.startswith("dhco-"),
            f"_case_to_session_id must start with 'dhco-' (got {result!r}); "
            "AAD-compatible extension of MyCasesKit B81 RFC § D1 (see 2026-07-03 update).",
        )


if __name__ == "__main__":
    unittest.main()
