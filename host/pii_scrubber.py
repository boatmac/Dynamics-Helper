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
        #
        # IMPROVEMENT for Case Numbers (long digits):
        # The previous regex `(?:\+?1[-. ]?)?\(?[2-9][0-9]{2}\)?[-. ]?\d{3,4}[-. ]?\d{4}` was too greedy for long numeric strings like case numbers.
        # A case number 2601220030001652 was being partially matched.
        #
        # We add lookaround checks to ensure we are matching a standalone phone number structure,
        # OR we tighten the delimiters.
        #
        # Valid separators: [-. ]
        # Structure:
        #   (Optional +1)
        #   (Area Code: 3 digits) - optional parens
        #   (Separator)
        #   (Exchange: 3 digits)
        #   (Separator)
        #   (Subscriber: 4 digits)
        #
        # We explicitly require separators to distinguish from long ID numbers.
        # A pure 10-digit number `1234567890` is arguably a phone number, but in IT contexts it's often an ID.
        # We will ONLY redact 10-digit numbers if they have separators OR if they are formatted like (123) 456-7890.
        # Pure 10+ digit integers will be IGNORED to preserve Case IDs/Ticket Numbers.

        self.phone_pattern = re.compile(
            r"(?:\+?1\s*(?:[-.]\s*)?)?"  # Optional Country Code +1 with optional separator
            r"(?:"
            r"(?:\(\d{3}\))"  # (123)
            r"\s*(?:[-.]\s*)?"  # Optional separator after parens
            r"\d{3}"  # 456
            r"\s*(?:[-.]\s*)?"  # Optional separator
            r"\d{4}"  # 7890
            r"|"
            r"\d{3}"  # 123
            r"\s*[-.]\s*"  # REQUIRED separator (dash or dot) to avoid matching pure IDs
            r"\d{3}"  # 456
            r"\s*[-.]\s*"  # REQUIRED separator
            r"\d{4}"  # 7890
            r")"
            r"(?!\d)"  # Negative lookahead: Ensure it doesn't continue with more digits
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
