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
        expected = "Record ID: [REDACTED_GUID]."
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_phone_redaction(self):
        text = "Call me at (555) 123-4567 or 555-123-4567."
        expected = "Call me at [REDACTED_PHONE] or [REDACTED_PHONE]."
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_mixed_content(self):
        text = "User john.doe@corp.com (IP: 10.0.0.5) encountered error with ID 550e8400-e29b-41d4-a716-446655440000."
        expected = "User [REDACTED_EMAIL] (IP: [REDACTED_IP]) encountered error with ID [REDACTED_GUID]."
        self.assertEqual(self.scrubber.scrub(text), expected)

    def test_no_pii(self):
        text = "This is a safe error message with error code 500."
        self.assertEqual(self.scrubber.scrub(text), text)


if __name__ == "__main__":
    unittest.main()
