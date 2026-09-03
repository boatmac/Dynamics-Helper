import sys
from pathlib import Path
from typing import Sequence

from install_integrity import run_update_probe
from package_archive import validate_staged_package
from package_manifest import canonical_json_bytes


_FAILURE = {"status": "error", "error_code": "package_probe_failed"}


def _write_probe_json(payload: dict[str, object]) -> None:
    encoded = canonical_json_bytes(payload)
    binary = getattr(sys.stdout, "buffer", None)
    if binary is not None:
        binary.write(encoded)
        binary.flush()
    else:
        sys.stdout.write(encoded.decode("ascii"))
        sys.stdout.flush()


def dispatch_early_cli(argv: Sequence[str]) -> int | None:
    if "--update-probe" not in argv[1:]:
        return None
    if len(argv) not in (3, 4) or argv[1] != "--update-probe":
        _write_probe_json(_FAILURE)
        return 2
    manifest_path = Path(argv[2])
    if not manifest_path.is_absolute() or ".." in manifest_path.parts:
        _write_probe_json(_FAILURE)
        return 2
    package_root = None
    if len(argv) == 4:
        package_root = Path(argv[3])
        if not package_root.is_absolute() or ".." in package_root.parts:
            _write_probe_json(_FAILURE)
            return 2
    result = run_update_probe(manifest_path)
    if package_root is not None and result.status == "success":
        try:
            validate_staged_package(
                package_root.resolve(strict=True),
                expected_version=result.host_version,
            )
        except Exception:
            result = type(result)(status="error", error_code="package_probe_failed")
    if result.status == "success":
        _write_probe_json(
            {
                "status": "success",
                "host_version": result.host_version,
                "extension_version": result.extension_version,
                "capabilities": list(result.capabilities),
            }
        )
        return 0
    _write_probe_json(_FAILURE)
    return 1
