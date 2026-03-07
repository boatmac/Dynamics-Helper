import unittest
from dh_native_host import NativeHost


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


if __name__ == "__main__":
    unittest.main()
