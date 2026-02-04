import unittest
import json
import os
import sys

# Ensure host directory is in path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "host"))

from pii_scrubber import PiiScrubber


class TestPiiScrubber(unittest.TestCase):
    def setUp(self):
        self.scrubber = PiiScrubber()

    def test_scrub_ip_address(self):
        text = "Server IP is 192.168.1.1 and 10.0.0.1"
        scrubbed = self.scrubber.scrub(text)
        self.assertNotIn("192.168.1.1", scrubbed)
        self.assertNotIn("10.0.0.1", scrubbed)
        self.assertIn("[REDACTED_IP]", scrubbed)

    def test_scrub_email(self):
        text = "Contact support@example.com for help"
        scrubbed = self.scrubber.scrub(text)
        self.assertNotIn("support@example.com", scrubbed)
        self.assertIn("[REDACTED_EMAIL]", scrubbed)

    def test_scrub_guid(self):
        text = "Session ID: 123e4567-e89b-12d3-a456-426614174000"
        scrubbed = self.scrubber.scrub(text)
        self.assertNotIn("123e4567-e89b-12d3-a456-426614174000", scrubbed)
        self.assertIn("[REDACTED_GUID]", scrubbed)

    def test_scrub_subscription_id(self):
        text = "Subscription: /subscriptions/5e123456-e89b-12d3-a456-426614174000/resourceGroups"
        scrubbed = self.scrubber.scrub(text)
        self.assertNotIn("5e123456-e89b-12d3-a456-426614174000", scrubbed)
        self.assertIn("[REDACTED_GUID]", scrubbed)


if __name__ == "__main__":
    unittest.main()
