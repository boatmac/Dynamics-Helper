"""Windows DPAPI wrapper for encrypting secret fields in config.json.

Uses `ctypes` against `Crypt32.dll` directly — no new dependencies.
Per-user, per-machine binding via `CryptProtectData` /
`CryptUnprotectData`. The OS manages the key material; the application
holds no key state.

Public surface:
    encrypt(plaintext: str) -> str        # returns base64 DPAPI blob
    decrypt(b64_blob: str) -> str         # raises DecryptError on failure
    class EncryptError(Exception)
    class DecryptError(Exception)
"""

import base64
import ctypes
from ctypes import wintypes


class EncryptError(Exception):
    """Raised when CryptProtectData fails. Effectively impossible during a
    normal Windows logon session; surfacing it should abort the write."""


class DecryptError(Exception):
    """Raised when CryptUnprotectData fails. Typical causes: blob created
    on a different machine, blob created by a different Windows user,
    blob is corrupt, or admin reset of user password destroyed the key
    material. Callers should treat the field as absent and self-heal on
    next write."""


# --- Win32 type bindings -----------------------------------------------------

class _DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
    ]


_crypt32 = ctypes.WinDLL("Crypt32.dll", use_last_error=True)
_kernel32 = ctypes.WinDLL("Kernel32.dll", use_last_error=True)

_CryptProtectData = _crypt32.CryptProtectData
_CryptProtectData.argtypes = [
    ctypes.POINTER(_DATA_BLOB),    # pDataIn
    wintypes.LPCWSTR,              # szDataDescr (NULL)
    ctypes.POINTER(_DATA_BLOB),    # pOptionalEntropy (NULL)
    ctypes.c_void_p,               # pvReserved (NULL)
    ctypes.c_void_p,               # pPromptStruct (NULL)
    wintypes.DWORD,                # dwFlags
    ctypes.POINTER(_DATA_BLOB),    # pDataOut
]
_CryptProtectData.restype = wintypes.BOOL

_CryptUnprotectData = _crypt32.CryptUnprotectData
_CryptUnprotectData.argtypes = [
    ctypes.POINTER(_DATA_BLOB),    # pDataIn
    ctypes.POINTER(wintypes.LPWSTR),  # ppszDataDescr (NULL)
    ctypes.POINTER(_DATA_BLOB),    # pOptionalEntropy (NULL)
    ctypes.c_void_p,               # pvReserved (NULL)
    ctypes.c_void_p,               # pPromptStruct (NULL)
    wintypes.DWORD,                # dwFlags
    ctypes.POINTER(_DATA_BLOB),    # pDataOut
]
_CryptUnprotectData.restype = wintypes.BOOL

_LocalFree = _kernel32.LocalFree
_LocalFree.argtypes = [ctypes.c_void_p]
_LocalFree.restype = ctypes.c_void_p

_CRYPTPROTECT_UI_FORBIDDEN = 0x1   # never prompt the user (we're headless)


def _make_blob(data: bytes) -> _DATA_BLOB:
    """Wrap a Python bytes object in a DATA_BLOB."""
    buf = ctypes.create_string_buffer(data, len(data))
    return _DATA_BLOB(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte)))


def _blob_to_bytes_and_free(blob: _DATA_BLOB) -> bytes:
    """Copy a DATA_BLOB's contents into a Python bytes object, then free
    the OS-allocated buffer."""
    try:
        return ctypes.string_at(blob.pbData, blob.cbData)
    finally:
        _LocalFree(blob.pbData)


def encrypt(plaintext: str) -> str:
    """Encrypt `plaintext` and return a base64-encoded DPAPI blob."""
    data = plaintext.encode("utf-8")
    blob_in = _make_blob(data)
    blob_out = _DATA_BLOB()
    ok = _CryptProtectData(
        ctypes.byref(blob_in),
        None,
        None,
        None,
        None,
        _CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(blob_out),
    )
    if not ok:
        err = ctypes.get_last_error()
        raise EncryptError(f"CryptProtectData failed; GetLastError={err}")
    encrypted = _blob_to_bytes_and_free(blob_out)
    return base64.b64encode(encrypted).decode("ascii")


def decrypt(b64_blob: str) -> str:
    """Decrypt a base64-encoded DPAPI blob produced by `encrypt`."""
    try:
        data = base64.b64decode(b64_blob, validate=True)
    except (ValueError, base64.binascii.Error) as e:
        raise DecryptError(f"Input is not valid base64: {e}") from e

    blob_in = _make_blob(data)
    blob_out = _DATA_BLOB()
    ok = _CryptUnprotectData(
        ctypes.byref(blob_in),
        None,
        None,
        None,
        None,
        _CRYPTPROTECT_UI_FORBIDDEN,
        ctypes.byref(blob_out),
    )
    if not ok:
        err = ctypes.get_last_error()
        raise DecryptError(f"CryptUnprotectData failed; GetLastError={err}")
    plaintext_bytes = _blob_to_bytes_and_free(blob_out)
    try:
        return plaintext_bytes.decode("utf-8")
    except UnicodeDecodeError as e:
        raise DecryptError(f"Decrypted blob is not valid UTF-8: {e}") from e
