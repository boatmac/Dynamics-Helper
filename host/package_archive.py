import json
import os
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path

from package_manifest import (
    UPDATE_MANIFEST_PATH,
    ManifestError,
    OwnershipClass,
    ReleaseIntegrity,
    UpdateManifest,
    InstalledProduct,
    _require_product_bijection,
    _require_regular_file,
    _walk_regular_relative_paths,
    canonical_json_bytes,
    load_installed_product,
    load_release_integrity,
    load_update_manifest,
    release_integrity_to_dict,
    sha256_bytes,
    sha256_file,
)


class PackageValidationError(ValueError):
    _ALLOWED = {
        "invalid_package_path",
        "duplicate_package_path",
        "unsupported_archive_entry",
        "package_manifest_invalid",
        "package_file_missing",
        "package_file_unmanifested",
        "package_hash_mismatch",
        "package_metadata_mismatch",
    }

    def __init__(self, error_code: str) -> None:
        if error_code not in self._ALLOWED:
            raise ValueError("unknown package validation error code")
        self.error_code = error_code
        super().__init__(error_code)


@dataclass(frozen=True)
class ValidatedPackage:
    stage_root: Path
    manifest: UpdateManifest
    release_integrity: ReleaseIntegrity
    installed_product: InstalledProduct


def validate_staged_package(
    stage_root: Path,
    *,
    expected_version: str | None = None,
) -> ValidatedPackage:
    try:
        root = stage_root.resolve(strict=True)
    except OSError as error:
        raise PackageValidationError("package_file_missing") from error
    try:
        manifest = load_update_manifest(root / UPDATE_MANIFEST_PATH)
        integrity = load_release_integrity(root / "host" / "release-integrity.json")
        installed = load_installed_product(root / "host" / "installed-product.json")
        integrity_bytes = canonical_json_bytes(release_integrity_to_dict(integrity))
    except (ManifestError, OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PackageValidationError("package_manifest_invalid") from error
    if sha256_bytes(integrity_bytes) != installed.release_integrity_sha256:
        raise PackageValidationError("package_metadata_mismatch")
    if not (
        manifest.package_version
        == integrity.package_version
        == installed.package_version
        and manifest.required_capabilities
        == integrity.required_capabilities
        == installed.required_capabilities
        and manifest.provided_capabilities
        == integrity.provided_capabilities
        == installed.provided_capabilities
        and manifest.chrome_version == integrity.chrome_version
        and manifest.chrome_version_name == integrity.chrome_version_name
    ):
        raise PackageValidationError("package_metadata_mismatch")
    if expected_version is not None:
        if type(expected_version) is not str or not expected_version:
            raise PackageValidationError("package_metadata_mismatch")
        if manifest.package_version != expected_version:
            raise PackageValidationError("package_metadata_mismatch")

    expected_paths = {entry.path for entry in manifest.entries} | {
        UPDATE_MANIFEST_PATH
    }
    for relative in expected_paths:
        path = root.joinpath(*relative.split("/"))
        if not path.exists() and not path.is_symlink():
            raise PackageValidationError("package_file_missing")
        try:
            _require_regular_file(path)
        except ManifestError as error:
            raise PackageValidationError("unsupported_archive_entry") from error
    try:
        actual_paths = set(_walk_regular_relative_paths(root))
    except (ManifestError, OSError) as error:
        raise PackageValidationError("unsupported_archive_entry") from error
    if actual_paths - expected_paths:
        raise PackageValidationError("package_file_unmanifested")

    actual_hashes = {
        entry.path: sha256_file(root.joinpath(*entry.path.split("/")))
        for entry in manifest.entries
    }
    metadata_hashes = {
        entry.path: entry.sha256
        for entry in manifest.entries
        if entry.ownership is OwnershipClass.PACKAGED_METADATA
    }
    if metadata_hashes != {
        "host/release-integrity.json": actual_hashes[
            "host/release-integrity.json"
        ],
        "host/installed-product.json": actual_hashes[
            "host/installed-product.json"
        ],
    }:
        raise PackageValidationError("package_metadata_mismatch")
    try:
        _require_product_bijection(manifest, integrity)
    except ManifestError as error:
        raise PackageValidationError("package_metadata_mismatch") from error
    for entry in manifest.entries:
        if actual_hashes[entry.path] != entry.sha256:
            raise PackageValidationError("package_hash_mismatch")
    return ValidatedPackage(
        stage_root=root,
        manifest=manifest,
        release_integrity=integrity,
        installed_product=installed,
    )


def _iter_stage_files(stage_root: Path) -> tuple[tuple[str, Path], ...]:
    return tuple(
        (relative, stage_root.joinpath(*relative.split("/")))
        for relative in _walk_regular_relative_paths(stage_root)
    )


def write_deterministic_archive(stage_root: Path, archive_path: Path) -> None:
    validated = validate_staged_package(stage_root)
    files = tuple(
        sorted(_iter_stage_files(validated.stage_root), key=lambda item: item[0])
    )
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = archive_path.with_name(f".{archive_path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with zipfile.ZipFile(
            temporary,
            "w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as output:
            for logical_path, source in files:
                info = zipfile.ZipInfo(
                    logical_path,
                    date_time=(1980, 1, 1, 0, 0, 0),
                )
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                output.writestr(
                    info,
                    source.read_bytes(),
                    compress_type=zipfile.ZIP_DEFLATED,
                    compresslevel=9,
                )
        os.replace(temporary, archive_path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
