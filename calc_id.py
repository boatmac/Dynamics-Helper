import base64
import hashlib


def calculate_extension_id(pub_key_base64):
    try:
        # 1. Decode the base64 public key
        pub_key_bytes = base64.b64decode(pub_key_base64)

        # 2. SHA256 hash
        sha256 = hashlib.sha256(pub_key_bytes).hexdigest()

        # 3. First 32 hex chars (16 bytes)
        prefix = sha256[:32]

        # 4. Map 0-9a-f to a-p
        # 0->a, 1->b, ... 9->j, a->k, ... f->p
        mapping = {
            "0": "a",
            "1": "b",
            "2": "c",
            "3": "d",
            "4": "e",
            "5": "f",
            "6": "g",
            "7": "h",
            "8": "i",
            "9": "j",
            "a": "k",
            "b": "l",
            "c": "m",
            "d": "n",
            "e": "o",
            "f": "p",
        }

        ext_id = "".join([mapping[c] for c in prefix])
        return ext_id

    except Exception as e:
        return str(e)


key = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlgj9K6xqR3H7eGmpKpGoM4YTNgetfpv6hJRQqCGKwPF3o+Q10QYNZbO/BKm8pcQVr0SuAJbTI0lIB0DdjUpJ++Ol89N+97YEwYxa6B47h4m8JkEofsgd7VSqX/m/N7jtFJ9EkBPATZJLTCNpjp7JhwIqkI6BG6iofzixBBRvgKYx5M2oe1k5qFz2+8/9Pc0kfkGLfYkgnauyGc3QBTOCZaGWbLT2pjWKzBKpMGD0XB4T6zxL4SAccSofC0qzAIBd4eQ9ttKvRSrAP2pbq+PR3h9/ovrPULrtOH0gc2diijca4S8Szz3Ar3s/fRkQ0bO3Wooi44QnSx8f2/J5uXzrsQIDAQAB"

print(f"Calculated ID: {calculate_extension_id(key)}")
