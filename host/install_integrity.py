import sys
from dataclasses import dataclass
from pathlib import Path

from package_manifest import (
    LEGACY_PRODUCT_ALLOWLIST_VERSION,
    OWNERSHIP_SCHEMA_VERSION,
    ManifestError,
    OwnershipClass,
    ReleaseIntegrity,
    UpdateManifest,
    _require_product_bijection,
    _read_chrome_manifest,
    _require_plain_directory,
    _require_regular_file,
    _walk_regular_relative_paths,
    canonical_json_bytes,
    load_installed_product,
    load_release_integrity,
    load_update_manifest,
    normalize_package_path,
    release_integrity_to_dict,
    sha256_bytes,
    sha256_file,
)
from product_info import (
    PROVIDED_PROTOCOL_CAPABILITIES,
    REQUIRED_PROTOCOL_CAPABILITIES,
    VERSION,
)


@dataclass(frozen=True)
class InstallationVerification:
    mode: str
    integrity: str
    host_version: str | None = None
    extension_version: str | None = None
    error_code: str | None = None


@dataclass(frozen=True)
class UpdateProbeResult:
    status: str
    host_version: str | None = None
    extension_version: str | None = None
    capabilities: tuple[str, ...] = ()
    error_code: str | None = None


_RESERVED_LIVE_HOST_PATHS = {
    "_internal",
    "extension",
    "updates",
    "config.json",
    "manifest.json",
    "copilot-instructions.md",
    "user_prompt.md",
    "native_host.log",
    "release-integrity.json",
    "installed-product.json",
}
_RESERVED_LIVE_HOST_PATHS_CASEFOLDED = frozenset(
    path.casefold() for path in _RESERVED_LIVE_HOST_PATHS
)


def _require_integrity_product_paths(integrity: ReleaseIntegrity) -> None:
    host_paths = {record.path for record in integrity.host_files}
    required = {"dh_native_host.exe", "register.py", "system_prompt.md"}
    if not required.issubset(host_paths):
        raise ValueError("required Host product record missing")
    if not any(path.startswith("_internal/") for path in host_paths):
        raise ValueError("Host runtime records missing")
    for path in host_paths:
        if normalize_package_path(path) != path:
            raise ValueError("noncanonical Host product path")
        folded = path.casefold()
        if folded.startswith("_internal/"):
            continue
        if "/" in path:
            raise ValueError("unsupported Host product path class")
        if (
            folded in _RESERVED_LIVE_HOST_PATHS_CASEFOLDED
            or folded.startswith("native_host.log.")
        ):
            raise ValueError("reserved Host path declared product-owned")
    extension_paths = {record.path for record in integrity.extension_files}
    if "manifest.json" not in extension_paths:
        raise ValueError("Extension manifest record missing")
    for path in extension_paths:
        if normalize_package_path(path) != path:
            raise ValueError("noncanonical Extension product path")


def _verify_exact_live_inventory(root: Path, integrity: ReleaseIntegrity) -> None:
    expected_host = {record.path: record.sha256 for record in integrity.host_files}
    expected_extension = {
        record.path: record.sha256 for record in integrity.extension_files
    }
    internal_expected = {
        path for path in expected_host if path.startswith("_internal/")
    }
    internal_actual = {
        f"_internal/{relative}"
        for relative in _walk_regular_relative_paths(root / "_internal")
    }
    extension_actual = set(_walk_regular_relative_paths(root / "extension"))
    if internal_actual != internal_expected:
        raise ValueError("extra or missing Host runtime file")
    if extension_actual != set(expected_extension):
        raise ValueError("extra or missing Extension file")
    for relative, digest in expected_host.items():
        path = root.joinpath(*relative.split("/"))
        _require_regular_file(path)
        if sha256_file(path) != digest:
            raise ValueError("Host product hash mismatch")
    for relative, digest in expected_extension.items():
        path = root / "extension" / Path(*relative.split("/"))
        _require_regular_file(path)
        if sha256_file(path) != digest:
            raise ValueError("Extension product hash mismatch")


def _read_effective_extension_version(path: Path) -> str:
    version, version_name = _read_chrome_manifest(path)
    return version_name or version


class InstallationVerifier:
    def __init__(self, install_root: Path, *, frozen: bool | None = None):
        _require_plain_directory(install_root)
        self._install_root = install_root.resolve(strict=True)
        _require_plain_directory(self._install_root)
        self._frozen = getattr(sys, "frozen", False) if frozen is None else frozen
        self._cached: InstallationVerification | None = None

    def verify(self) -> InstallationVerification:
        if not self._frozen:
            return InstallationVerification(
                mode="development",
                integrity="development",
                host_version=VERSION,
            )
        if self._cached is None:
            try:
                self._cached = self._verify_packaged()
            except (ManifestError, OSError, ValueError):
                self._cached = InstallationVerification(
                    mode="packaged",
                    integrity="failed",
                    error_code="installation_integrity_failed",
                )
        return self._cached

    def _verify_packaged(self) -> InstallationVerification:
        integrity = load_release_integrity(
            self._install_root / "release-integrity.json"
        )
        installed = load_installed_product(
            self._install_root / "installed-product.json"
        )
        integrity_bytes = canonical_json_bytes(
            release_integrity_to_dict(integrity)
        )
        if sha256_bytes(integrity_bytes) != installed.release_integrity_sha256:
            raise ValueError("metadata link mismatch")
        if not (
            integrity.package_version == installed.package_version == VERSION
        ):
            raise ValueError("metadata version mismatch")
        if not (
            integrity.required_capabilities
            == installed.required_capabilities
            == REQUIRED_PROTOCOL_CAPABILITIES
        ):
            raise ValueError("required capability mismatch")
        if not (
            integrity.provided_capabilities
            == installed.provided_capabilities
            == PROVIDED_PROTOCOL_CAPABILITIES
        ):
            raise ValueError("provided capability mismatch")
        if (
            installed.ownership_schema_version != OWNERSHIP_SCHEMA_VERSION
            or installed.legacy_allowlist_version
            != LEGACY_PRODUCT_ALLOWLIST_VERSION
        ):
            raise ValueError("ownership schema mismatch")
        _require_integrity_product_paths(integrity)
        _verify_exact_live_inventory(self._install_root, integrity)
        extension_version = _read_effective_extension_version(
            self._install_root / "extension" / "manifest.json"
        )
        if extension_version != VERSION:
            raise ValueError("extension version mismatch")
        return InstallationVerification(
            mode="packaged",
            integrity="verified",
            host_version=VERSION,
            extension_version=extension_version,
        )


def _require_probe_manifest_matches_integrity(
    root: Path,
    manifest: UpdateManifest,
) -> None:
    if not any(
        entry.path == "host/system_prompt.md"
        and entry.ownership is OwnershipClass.HOST_PRODUCT_FILE
        for entry in manifest.entries
    ):
        raise ValueError("DH Core missing from package manifest")
    integrity = load_release_integrity(root / "release-integrity.json")
    _require_product_bijection(manifest, integrity)


def run_update_probe(
    manifest_path: Path,
    *,
    install_root: Path | None = None,
) -> UpdateProbeResult:
    try:
        manifest = load_update_manifest(manifest_path)
        root = (
            install_root.resolve(strict=True)
            if install_root is not None
            else (
                Path(sys.executable).resolve().parent
                if getattr(sys, "frozen", False)
                else Path(__file__).resolve().parent
            )
        )
        if manifest.package_version != VERSION:
            raise ValueError("version mismatch")
        if not set(manifest.required_capabilities).issubset(
            PROVIDED_PROTOCOL_CAPABILITIES
        ):
            raise ValueError("required capability missing")
        if manifest.provided_capabilities != PROVIDED_PROTOCOL_CAPABILITIES:
            raise ValueError("provided capability mismatch")
        _require_probe_manifest_matches_integrity(root, manifest)
        verification = InstallationVerifier(root, frozen=True).verify()
        if verification.integrity != "verified":
            raise ValueError("installation verification failed")
        if verification.host_version != manifest.package_version:
            raise ValueError("host version mismatch")
        if verification.extension_version != manifest.package_version:
            raise ValueError("extension version mismatch")
        return UpdateProbeResult(
            status="success",
            host_version=verification.host_version,
            extension_version=verification.extension_version,
            capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        )
    except (ManifestError, OSError, ValueError):
        return UpdateProbeResult(
            status="error",
            error_code="package_probe_failed",
        )
