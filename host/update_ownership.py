import json
import os
import tempfile
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from package_archive import ValidatedPackage, validate_staged_package
from package_manifest import (
    LEGACY_PRODUCT_ALLOWLIST_VERSION,
    LEGACY_PRODUCT_PATHS,
    OWNERSHIP_SCHEMA_VERSION,
    PACKAGED_METADATA_PATHS,
    PRODUCT_OWNERSHIP_CLASSES,
    OwnershipClass,
    _require_product_bijection,
    _walk_regular_relative_paths,
    canonical_json_bytes,
    installed_product_to_dict,
    load_installed_product,
    load_release_integrity,
    release_integrity_to_dict,
    sha256_bytes,
    sha256_file,
    update_manifest_to_dict,
)
from update_journal import UpdateError, parse_transaction_id


class OwnershipError(UpdateError):
    error_code = "update_ownership_invalid"


class OwnershipConflictError(OwnershipError):
    error_code = "update_ownership_conflict"


class OwnershipSource(StrEnum):
    FRESH = "fresh"
    INSTALLED = "installed"
    LEGACY_V1 = "legacy-v1"


@dataclass(frozen=True, order=True)
class FileDigest:
    path: str
    sha256: str


@dataclass(frozen=True)
class OwnershipPlan:
    schema_version: int
    transaction_id: str
    source: OwnershipSource
    expected_version: str | None
    target_version: str
    prior_version: str | None
    package_ownership_sha256: str
    host_backup_roots: tuple[str, ...]
    prior_host_files: tuple[FileDigest, ...]
    prior_extension_files: tuple[FileDigest, ...]
    prior_metadata_files: tuple[FileDigest, ...]
    extension_was_present: bool
    metadata_was_present: bool
    host_install_roots: tuple[str, ...]
    host_files: tuple[FileDigest, ...]
    extension_files: tuple[FileDigest, ...]
    seed_files: tuple[FileDigest, ...]
    metadata_files: tuple[FileDigest, ...]


def validate_package_links(
    package: ValidatedPackage,
    *,
    expected_version: str | None,
) -> None:
    try:
        validated = validate_staged_package(
            package.stage_root,
            expected_version=expected_version,
        )
        if validated != package:
            raise OwnershipError()
        manifest = package.manifest
        integrity = package.release_integrity
        installed = package.installed_product
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
            raise OwnershipError()
        if installed.ownership_schema_version != OWNERSHIP_SCHEMA_VERSION:
            raise OwnershipError()
        if installed.legacy_allowlist_version != LEGACY_PRODUCT_ALLOWLIST_VERSION:
            raise OwnershipError()
        integrity_bytes = canonical_json_bytes(release_integrity_to_dict(integrity))
        if sha256_bytes(integrity_bytes) != installed.release_integrity_sha256:
            raise OwnershipError()
        _require_product_bijection(manifest, integrity)
    except OwnershipError:
        raise
    except Exception as error:
        raise OwnershipError() from error


def _digest_tree(root: Path, *, prefix: str = "") -> tuple[FileDigest, ...]:
    if not root.exists():
        return ()
    return tuple(
        FileDigest(
            path=f"{prefix}{relative}",
            sha256=sha256_file(root.joinpath(*relative.split("/"))),
        )
        for relative in _walk_regular_relative_paths(root)
    )


def _digest_existing_file(root: Path, relative: str) -> FileDigest | None:
    path = root.joinpath(*relative.split("/"))
    if not path.exists():
        return None
    if not path.is_file():
        raise OwnershipError()
    return FileDigest(relative, sha256_file(path))


def build_ownership_plan(
    package: ValidatedPackage,
    install_root: Path,
    transaction_id: str,
    *,
    expected_version: str | None,
    prior_version: str | None,
) -> OwnershipPlan:
    validate_package_links(package, expected_version=expected_version)
    tx = parse_transaction_id(transaction_id)
    try:
        root = install_root.resolve(strict=True)
    except OSError as error:
        raise OwnershipError() from error
    if not root.is_dir():
        raise OwnershipError()
    integrity_path = root / "release-integrity.json"
    installed_path = root / "installed-product.json"
    integrity_exists = integrity_path.exists()
    installed_exists = installed_path.exists()
    extension_exists = (root / "extension").exists()
    if integrity_exists != installed_exists:
        raise OwnershipError()

    prior_host: tuple[FileDigest, ...] = ()
    prior_extension: tuple[FileDigest, ...] = ()
    prior_metadata: tuple[FileDigest, ...] = ()
    backup_roots: tuple[str, ...] = ()
    metadata_was_present = False

    if integrity_exists:
        if prior_version is None:
            raise OwnershipError()
        try:
            integrity = load_release_integrity(integrity_path)
            installed = load_installed_product(installed_path)
            integrity_bytes = canonical_json_bytes(
                release_integrity_to_dict(integrity)
            )
            if installed.package_version != prior_version:
                raise OwnershipError()
            if installed.package_version != integrity.package_version:
                raise OwnershipError()
            if installed.required_capabilities != integrity.required_capabilities:
                raise OwnershipError()
            if installed.provided_capabilities != integrity.provided_capabilities:
                raise OwnershipError()
            if installed.release_integrity_sha256 != sha256_bytes(integrity_bytes):
                raise OwnershipError()
            if not extension_exists:
                raise OwnershipError()
            prior_host = tuple(
                sorted(
                    FileDigest(record.path, record.sha256)
                    for record in integrity.host_files
                )
            )
            # Include stale descendants so rollback is exact.
            declared = {item.path for item in prior_host}
            stale = tuple(
                item
                for item in _digest_tree(root / "_internal", prefix="_internal/")
                if item.path not in declared
            )
            prior_host = tuple(sorted((*prior_host, *stale)))
            prior_extension = _digest_tree(root / "extension")
            prior_metadata = tuple(
                sorted(
                    FileDigest(name, sha256_file(root / name))
                    for name in ("release-integrity.json", "installed-product.json")
                )
            )
        except OwnershipError:
            raise
        except Exception as error:
            raise OwnershipError() from error
        source = OwnershipSource.INSTALLED
        metadata_was_present = True
        backup_roots = ("_internal", "extension")
    else:
        legacy_present = any(
            root.joinpath(*relative.removeprefix("host/").split("/")).exists()
            for relative in LEGACY_PRODUCT_PATHS
            if relative != "extension"
        ) or extension_exists
        if legacy_present:
            if prior_version is None:
                raise OwnershipError()
            source = OwnershipSource.LEGACY_V1
            flat = []
            for relative in ("dh_native_host.exe", "system_prompt.md", "register.py"):
                digest = _digest_existing_file(root, relative)
                if digest is not None:
                    flat.append(digest)
            internal = _digest_tree(root / "_internal", prefix="_internal/")
            prior_host = tuple(sorted((*flat, *internal)))
            prior_extension = _digest_tree(root / "extension") if extension_exists else ()
            backup_roots = tuple(
                name
                for name, present in (
                    ("_internal", (root / "_internal").exists()),
                    ("extension", extension_exists),
                )
                if present
            )
        else:
            if prior_version is not None:
                raise OwnershipError()
            source = OwnershipSource.FRESH

    host_files = tuple(
        sorted(
            FileDigest(
                entry.path.removeprefix("host/"),
                entry.sha256,
            )
            for entry in package.manifest.entries
            if entry.path.startswith("host/")
            and entry.ownership in PRODUCT_OWNERSHIP_CLASSES
        )
    )
    extension_files = tuple(
        sorted(
            FileDigest(
                entry.path.removeprefix("extension/"),
                entry.sha256,
            )
            for entry in package.manifest.entries
            if entry.path.startswith("extension/")
            and entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
        )
    )
    metadata_files = tuple(
        sorted(
            FileDigest(entry.path.removeprefix("host/"), entry.sha256)
            for entry in package.manifest.entries
            if entry.ownership is OwnershipClass.PACKAGED_METADATA
        )
    )
    seed_files = ()
    config = root / "config.json"
    if source is OwnershipSource.FRESH and not config.exists():
        seed_files = tuple(
            FileDigest("config.json", entry.sha256)
            for entry in package.manifest.entries
            if entry.ownership is OwnershipClass.SEED_ONLY
        )
    plan = OwnershipPlan(
        schema_version=OWNERSHIP_SCHEMA_VERSION,
        transaction_id=tx,
        source=source,
        expected_version=expected_version,
        target_version=package.manifest.package_version,
        prior_version=prior_version,
        package_ownership_sha256=sha256_bytes(
            canonical_json_bytes(update_manifest_to_dict(package.manifest))
        ),
        host_backup_roots=backup_roots,
        prior_host_files=prior_host,
        prior_extension_files=prior_extension,
        prior_metadata_files=prior_metadata,
        extension_was_present=extension_exists,
        metadata_was_present=metadata_was_present,
        host_install_roots=("_internal",),
        host_files=host_files,
        extension_files=extension_files,
        seed_files=seed_files,
        metadata_files=metadata_files,
    )
    return parse_ownership_plan(ownership_plan_to_value(plan))


_PLAN_KEYS = frozenset(OwnershipPlan.__dataclass_fields__)


def _digests_to_value(items: tuple[FileDigest, ...]) -> list[dict[str, str]]:
    return [{"path": item.path, "sha256": item.sha256} for item in items]


def ownership_plan_to_value(plan: OwnershipPlan) -> dict[str, object]:
    return {
        "schema_version": plan.schema_version,
        "transaction_id": plan.transaction_id,
        "source": plan.source.value,
        "expected_version": plan.expected_version,
        "target_version": plan.target_version,
        "prior_version": plan.prior_version,
        "package_ownership_sha256": plan.package_ownership_sha256,
        "host_backup_roots": list(plan.host_backup_roots),
        "prior_host_files": _digests_to_value(plan.prior_host_files),
        "prior_extension_files": _digests_to_value(plan.prior_extension_files),
        "prior_metadata_files": _digests_to_value(plan.prior_metadata_files),
        "extension_was_present": plan.extension_was_present,
        "metadata_was_present": plan.metadata_was_present,
        "host_install_roots": list(plan.host_install_roots),
        "host_files": _digests_to_value(plan.host_files),
        "extension_files": _digests_to_value(plan.extension_files),
        "seed_files": _digests_to_value(plan.seed_files),
        "metadata_files": _digests_to_value(plan.metadata_files),
    }


def _parse_digests(value: object) -> tuple[FileDigest, ...]:
    if type(value) is not list:
        raise OwnershipError()
    result = []
    for item in value:
        if type(item) is not dict or set(item) != {"path", "sha256"}:
            raise OwnershipError()
        if type(item["path"]) is not str or not item["path"]:
            raise OwnershipError()
        if type(item["sha256"]) is not str or len(item["sha256"]) != 64:
            raise OwnershipError()
        result.append(FileDigest(item["path"], item["sha256"]))
    parsed = tuple(result)
    if parsed != tuple(sorted(parsed)) or len({item.path.casefold() for item in parsed}) != len(parsed):
        raise OwnershipError()
    return parsed


def parse_ownership_plan(value: object) -> OwnershipPlan:
    if type(value) is not dict or set(value) != _PLAN_KEYS:
        raise OwnershipError()
    try:
        plan = OwnershipPlan(
            schema_version=value["schema_version"],
            transaction_id=parse_transaction_id(value["transaction_id"]),
            source=OwnershipSource(value["source"]),
            expected_version=value["expected_version"],
            target_version=value["target_version"],
            prior_version=value["prior_version"],
            package_ownership_sha256=value["package_ownership_sha256"],
            host_backup_roots=tuple(value["host_backup_roots"]),
            prior_host_files=_parse_digests(value["prior_host_files"]),
            prior_extension_files=_parse_digests(value["prior_extension_files"]),
            prior_metadata_files=_parse_digests(value["prior_metadata_files"]),
            extension_was_present=value["extension_was_present"],
            metadata_was_present=value["metadata_was_present"],
            host_install_roots=tuple(value["host_install_roots"]),
            host_files=_parse_digests(value["host_files"]),
            extension_files=_parse_digests(value["extension_files"]),
            seed_files=_parse_digests(value["seed_files"]),
            metadata_files=_parse_digests(value["metadata_files"]),
        )
    except (KeyError, TypeError, ValueError) as error:
        raise OwnershipError() from error
    if type(plan.schema_version) is not int or plan.schema_version != OWNERSHIP_SCHEMA_VERSION:
        raise OwnershipError()
    if plan.expected_version is not None and plan.expected_version != plan.target_version:
        raise OwnershipError()
    if type(plan.target_version) is not str or not plan.target_version:
        raise OwnershipError()
    if type(plan.package_ownership_sha256) is not str or len(plan.package_ownership_sha256) != 64:
        raise OwnershipError()
    if type(plan.extension_was_present) is not bool or type(plan.metadata_was_present) is not bool:
        raise OwnershipError()
    if plan.source is OwnershipSource.FRESH:
        if plan.prior_version is not None or plan.prior_host_files or plan.prior_extension_files or plan.prior_metadata_files or plan.metadata_was_present or plan.extension_was_present:
            raise OwnershipError()
    else:
        if type(plan.prior_version) is not str or not plan.prior_version:
            raise OwnershipError()
        if plan.seed_files:
            raise OwnershipError()
    if plan.source is OwnershipSource.INSTALLED and not (
        plan.metadata_was_present and plan.extension_was_present and plan.prior_metadata_files
    ):
        raise OwnershipError()
    if plan.source is OwnershipSource.LEGACY_V1 and plan.metadata_was_present:
        raise OwnershipError()
    return plan


def _canonical_bytes(value: dict[str, object]) -> bytes:
    return (
        json.dumps(value, ensure_ascii=True, allow_nan=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def ownership_plan_bytes(plan: OwnershipPlan) -> bytes:
    parsed = parse_ownership_plan(ownership_plan_to_value(plan))
    return _canonical_bytes(ownership_plan_to_value(parsed))


def ownership_plan_sha256(plan: OwnershipPlan) -> str:
    return sha256_bytes(ownership_plan_bytes(plan))


def parse_ownership_plan_text(text: str) -> OwnershipPlan:
    try:
        value = json.loads(text)
        parsed = parse_ownership_plan(value)
    except Exception as error:
        raise OwnershipError() from error
    if text.encode("utf-8") != ownership_plan_bytes(parsed):
        raise OwnershipError()
    return parsed


def write_ownership_plan_atomic(path: Path, plan: OwnershipPlan) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=".tmp-", dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(ownership_plan_bytes(plan))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except Exception:
        try:
            os.close(descriptor)
        except OSError:
            pass
        temporary.unlink(missing_ok=True)
        raise


def read_ownership_plan(path: Path) -> OwnershipPlan:
    try:
        return parse_ownership_plan_text(path.read_text(encoding="utf-8"))
    except OwnershipError:
        raise
    except (OSError, UnicodeError) as error:
        raise OwnershipError() from error
