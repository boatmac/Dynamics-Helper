import os
import base64
import hashlib
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

# Get public key
public_key = private_key.public_key()
der = public_key.public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)

# Calculate Extension ID
# SHA256 of public key -> first 32 hex chars (16 bytes) -> mapped to a-p
sha = hashlib.sha256(der).hexdigest()
head = sha[:32]
# Map hex (0-f) to (a-p)
mp = str.maketrans("0123456789abcdef", "abcdefghijklmnop")
ext_id = head.translate(mp)

# Get Base64 key for manifest
b64_key = base64.b64encode(der).decode("utf-8")

print(f"EXTENSION_ID={ext_id}")
print(f"MANIFEST_KEY={b64_key}")
