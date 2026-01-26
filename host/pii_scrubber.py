import re


class PiiScrubber:
    """
    Detects and redacts Personally Identifiable Information (PII) from text.
    Target entities: Emails, IPv4 addresses, GUIDs, and US Phone numbers.
    """

    def __init__(self):
        # Compile regexes for performance
        # Using verbose mode (re.VERBOSE) for readability where appropriate

        # Email: Standard implementation adapted for finding substrings (no anchors)
        self.email_pattern = re.compile(
            r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*"
        )

        # IPv4: \b ensures we don't match random numbers in version strings easily
        # 0-255 logic is preserved.
        self.ip_pattern = re.compile(
            r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
        )

        # GUID/UUID: Standard 8-4-4-4-12 hex format
        self.guid_pattern = re.compile(
            r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
        )

        # US Phone Number:
        # Handles: (123) 456-7890, 123-456-7890, 123.456.7890, 123 456 7890
        # Optional +1 country code
        # Relaxed constraint on exchange code (middle 3 digits) to allow dummy data like 555-0123 or 555-123-4567
        self.phone_pattern = re.compile(
            r"(?:\+?1[-. ]?)?\(?[2-9][0-9]{2}\)?[-. ]?\d{3,4}[-. ]?\d{4}"
        )

    def scrub(self, text: str) -> str:
        """
        Replaces detected PII in the given text with placeholders.
        """
        if not text:
            return ""

        # Order matters slightly: scrub more specific patterns first if there's overlap.
        # GUIDs and IPs are quite distinct. Emails are distinct.
        # Phone numbers can be tricky (overlapping with IPs or dates), but the pattern is specific to US format.

        # 1. GUIDs (High confidence, distinct)
        text = self.guid_pattern.sub("[REDACTED_GUID]", text)

        # 2. Emails (Distinct)
        text = self.email_pattern.sub("[REDACTED_EMAIL]", text)

        # 3. IPv4 (Distinct with boundary checks)
        text = self.ip_pattern.sub("[REDACTED_IP]", text)

        # 4. Phone Numbers (Lowest confidence, do last to avoid breaking IP addresses if they look like phones? Unlikely with dots vs dashes)
        text = self.phone_pattern.sub("[REDACTED_PHONE]", text)

        return text
