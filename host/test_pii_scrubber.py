import unittest
from pii_scrubber import PiiScrubber


class TestPiiScrubber(unittest.TestCase):
    def setUp(self):
        self.scrubber = PiiScrubber()

    def test_email_redaction(self):
        text = "Please contact support@example.com for assistance."
        expected = "Please contact [REDACTED_EMAIL] for assistance."
        self.assertEqual(self.scrubber.scrub(text), expected)

        text = "Multiple: a@b.com and x.y@z.co.uk"
        expected = "Multiple: [REDACTED_EMAIL] and [REDACTED_EMAIL]"
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_ip_redaction(self):
        text = "Server running at 192.168.1.100."
        expected = "Server running at [REDACTED_IP]."
        self.assertEqual(self.scrubber.scrub(text), expected)

        text = "Invalid IP 999.999.999.999 should not match."
        self.assertEqual(self.scrubber.scrub(text), text)

    def test_guid_redaction(self):
        text = "Record ID: 123e4567-e89b-12d3-a456-426614174000."
        # GUID Redaction Disabled (User Request)
        expected = text
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_phone_redaction(self):
        text = "Call me at (555) 123-4567 or 555-123-4567."
        expected = "Call me at [REDACTED_PHONE] or [REDACTED_PHONE]."
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_mixed_content(self):
        text = "User john.doe@corp.com (IP: 10.0.0.5) encountered error with ID 550e8400-e29b-41d4-a716-446655440000."
        # GUID preserved, Emails and IPs redacted
        expected = "User [REDACTED_EMAIL] (IP: [REDACTED_IP]) encountered error with ID 550e8400-e29b-41d4-a716-446655440000."
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_no_pii(self):
        text = "This is a safe error message with error code 500."
        self.assertEqual(self.scrubber.scrub(text), text)

    # --- PII findings from dh-extension-pii-findings.md (2026-04-17) ---

    def test_orgid_email_redaction(self):
        """Emails in OrgId fields must be redacted."""
        text = "OrgId: wei4.zhang@loreal.com"
        expected = "OrgId: [REDACTED_EMAIL]"
        self.assertEqual(self.scrubber.scrub(text), expected)

        text = "OrgId: kxmj570@AZC.partner.onmschina.cn"
        expected = "OrgId: [REDACTED_EMAIL]"
        self.assertEqual(self.scrubber.scrub(text), expected)

        text = "OrgId: ecc2szh@bosch.com"
        expected = "OrgId: [REDACTED_EMAIL]"
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_cc_email_redaction(self):
        """CC emails with full-width and half-width colons must be redacted."""
        text = "cc：xushen@microsoft.com ; yima@microsoft.com"
        expected = "cc：[REDACTED_EMAIL] ; [REDACTED_EMAIL]"
        self.assertEqual(self.scrubber.scrub(text), expected)

        text = "CC Email: guangxin.wu@mercedes-benz.com"
        expected = "CC Email: [REDACTED_EMAIL]"
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_case_owner_email_angle_bracket(self):
        """Case owner with name and email in angle brackets."""
        text = "21v case owner: LiHong <li.hong3@oe.21vianet.com>"
        result = self.scrubber.scrub(text)
        self.assertNotIn("li.hong3@oe.21vianet.com", result)
        self.assertIn("[REDACTED_EMAIL]", result)
        self.assertIn("[REDACTED_NAME]", result)

    def test_case_owner_cjk_name(self):
        """Chinese names after 'case owner:' must be redacted."""
        text = "21v case owner: HeZixuan <he.zixuan@oe.21vianet.com>"
        result = self.scrubber.scrub(text)
        self.assertNotIn("he.zixuan@oe.21vianet.com", result)
        self.assertIn("[REDACTED_NAME]", result)

        # Variant with space in label
        text = "21 v case owner:He Zixuan"
        result = self.scrubber.scrub(text)
        self.assertNotIn("He Zixuan", result)
        self.assertIn("[REDACTED_NAME]", result)

    def test_case_owner_english_name(self):
        """English names after 'case owner:' must be redacted."""
        text = "21v case owner: KongBinbin <kong.binbin@oe.21vianet.com>"
        result = self.scrubber.scrub(text)
        self.assertNotIn("KongBinbin", result)
        self.assertNotIn("kong.binbin@oe.21vianet.com", result)

    def test_real_world_description_block(self):
        """Full description block from a real case (sanitized domains)."""
        text = (
            "Issue description: OrgId: user1@customer.com\n"
            "Some business description here\n"
            "Other Notes: 21v case owner: KongBinbin <kong.binbin@oe.21vianet.com>\n"
            "cc：user2@microsoft.com ; user3@microsoft.com\n"
            "CC Email: user4@customer.com\n"
            "21 v case owner:李明"
        )
        result = self.scrubber.scrub(text)
        # All emails scrubbed
        self.assertNotIn("user1@customer.com", result)
        self.assertNotIn("kong.binbin@oe.21vianet.com", result)
        self.assertNotIn("user2@microsoft.com", result)
        self.assertNotIn("user3@microsoft.com", result)
        self.assertNotIn("user4@customer.com", result)
        # Names scrubbed
        self.assertNotIn("KongBinbin", result)
        self.assertNotIn("李明", result)
        # Structure preserved
        self.assertIn("Issue description: OrgId:", result)
        self.assertIn("21v case owner:", result)


if __name__ == "__main__":
    unittest.main()
