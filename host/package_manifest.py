import hashlib
import json
import os
import re
import stat
import uuid
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Callable, Iterable, TypeVar

from product_info import (
    PROVIDED_PROTOCOL_CAPABILITIES,
    REQUIRED_PROTOCOL_CAPABILITIES,
    VERSION,
)


class ManifestError(ValueError):
    pass


class OwnershipClass(str, Enum):
    WHOLE_PRODUCT_DIRECTORY = "whole_product_directory"
    HOST_PRODUCT_FILE = "host_product_file"
    SEED_ONLY = "seed_only"
    PACKAGED_METADATA = "packaged_metadata"
    GENERATED_REGISTRATION = "generated_registration"
    USER_OWNED = "user_owned"
    TRANSACTION_WORKSPACE = "transaction_workspace"
    PACKAGE_ONLY = "package_only"
    UNKNOWN_TOP_LEVEL = "unknown_top_level"


@dataclass(frozen=True, order=True)
class FileRecord:
    path: str
    sha256: str


@dataclass(frozen=True, order=True)
class ManifestEntry:
    path: str
    ownership: OwnershipClass
    sha256: str


@dataclass(frozen=True)
class UpdateManifest:
    schema_version: int
    package_version: str
    required_capabilities: tuple[str, ...]
    provided_capabilities: tuple[str, ...]
    chrome_version: str
    chrome_version_name: str | None
    entries: tuple[ManifestEntry, ...]


@dataclass(frozen=True)
class ReleaseIntegrity:
    schema_version: int
    package_version: str
    required_capabilities: tuple[str, ...]
    provided_capabilities: tuple[str, ...]
    chrome_version: str
    chrome_version_name: str | None
    host_files: tuple[FileRecord, ...]
    extension_files: tuple[FileRecord, ...]


@dataclass(frozen=True)
class InstalledProduct:
    schema_version: int
    package_version: str
    required_capabilities: tuple[str, ...]
    provided_capabilities: tuple[str, ...]
    ownership_schema_version: int
    legacy_allowlist_version: int
    release_integrity_sha256: str


@dataclass(frozen=True)
class ReleaseDocuments:
    update_manifest: UpdateManifest
    release_integrity: ReleaseIntegrity
    installed_product: InstalledProduct


UPDATE_MANIFEST_SCHEMA_VERSION = 1
RELEASE_INTEGRITY_SCHEMA_VERSION = 1
INSTALLED_PRODUCT_SCHEMA_VERSION = 1
OWNERSHIP_SCHEMA_VERSION = 1
LEGACY_PRODUCT_ALLOWLIST_VERSION = 1
LEGACY_PRODUCT_PATHS = (
    "host/dh_native_host.exe",
    "host/_internal",
    "host/system_prompt.md",
    "host/register.py",
    "extension",
)
UPDATE_MANIFEST_PATH = "update-manifest.json"
PACKAGED_METADATA_PATHS = (
    "host/installed-product.json",
    "host/release-integrity.json",
)
SERIALIZED_PACKAGE_ONLY_PATHS = (
    "install.bat",
    "installer_core.ps1",
)
FORBIDDEN_PACKAGED_HOST_PATHS = (
    "host/extension",
    "host/updates",
    "host/manifest.json",
    "host/copilot-instructions.md",
    "host/user_prompt.md",
    "host/native_host.log",
)
FORBIDDEN_PACKAGED_HOST_PATHS_CASEFOLDED = frozenset(
    path.casefold() for path in FORBIDDEN_PACKAGED_HOST_PATHS
)
CANONICAL_PACKAGED_SPECIAL_PATHS = (
    "host/config.json",
    *PACKAGED_METADATA_PATHS,
    *SERIALIZED_PACKAGE_ONLY_PATHS,
)
CANONICAL_PACKAGED_SPECIAL_BY_CASEFOLD = {
    path.casefold(): path for path in CANONICAL_PACKAGED_SPECIAL_PATHS
}
PRODUCT_OWNERSHIP_CLASSES = (
    OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
    OwnershipClass.HOST_PRODUCT_FILE,
)
LIVE_ONLY_OWNERSHIP_CLASSES = (
    OwnershipClass.GENERATED_REGISTRATION,
    OwnershipClass.USER_OWNED,
    OwnershipClass.TRANSACTION_WORKSPACE,
    OwnershipClass.UNKNOWN_TOP_LEVEL,
)

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_WINDOWS_RESERVED_COMPONENTS = {
    "con",
    "prn",
    "aux",
    "nul",
    *(f"com{index}" for index in range(1, 10)),
    *(f"lpt{index}" for index in range(1, 10)),
}


def normalize_package_path(raw: object) -> str:
    if type(raw) is not str or not raw or "\x00" in raw or "\\" in raw:
        raise ManifestError("invalid package path")
    if raw.startswith(("/", "//")) or re.match(r"^[A-Za-z]:", raw):
        raise ManifestError("invalid package path")
    parts = raw.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ManifestError("invalid package path")
    for part in parts:
        if ":" in part or part.endswith((".", " ")):
            raise ManifestError("invalid Windows package path")
        if part.split(".", 1)[0].casefold() in _WINDOWS_RESERVED_COMPONENTS:
            raise ManifestError("reserved Windows package path")
    return "/".join(parts)


def canonical_json_bytes(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _record_to_dict(record: FileRecord) -> dict[str, object]:
    return {"path": record.path, "sha256": record.sha256}


def update_manifest_to_dict(value: UpdateManifest) -> dict[str, object]:
    return {
        "schema_version": value.schema_version,
        "package_version": value.package_version,
        "required_capabilities": list(value.required_capabilities),
        "provided_capabilities": list(value.provided_capabilities),
        "chrome_manifest": {
            "version": value.chrome_version,
            "version_name": value.chrome_version_name,
        },
        "entries": [
            {
                "path": entry.path,
                "ownership": entry.ownership.value,
                "sha256": entry.sha256,
            }
            for entry in value.entries
        ],
    }


def release_integrity_to_dict(value: ReleaseIntegrity) -> dict[str, object]:
    return {
        "schema_version": value.schema_version,
        "package_version": value.package_version,
        "required_capabilities": list(value.required_capabilities),
        "provided_capabilities": list(value.provided_capabilities),
        "chrome_manifest": {
            "version": value.chrome_version,
            "version_name": value.chrome_version_name,
        },
        "host_files": [_record_to_dict(record) for record in value.host_files],
        "extension_files": [
            _record_to_dict(record) for record in value.extension_files
        ],
    }


def installed_product_to_dict(value: InstalledProduct) -> dict[str, object]:
    return {
        "schema_version": value.schema_version,
        "package_version": value.package_version,
        "required_capabilities": list(value.required_capabilities),
        "provided_capabilities": list(value.provided_capabilities),
        "ownership_schema_version": value.ownership_schema_version,
        "legacy_allowlist_version": value.legacy_allowlist_version,
        "release_integrity_sha256": value.release_integrity_sha256,
    }


def _require_keys(value: object, expected: frozenset[str]) -> dict[str, object]:
    if type(value) is not dict or frozenset(value) != expected:
        raise ManifestError("invalid object keys")
    return value


def _require_int(value: object) -> int:
    if type(value) is not int:
        raise ManifestError("invalid integer")
    return value


def _require_schema(value: object, expected: int) -> int:
    parsed = _require_int(value)
    if parsed != expected:
        raise ManifestError("unsupported schema version")
    return parsed


def _require_string(value: object, *, allow_empty: bool = False) -> str:
    if type(value) is not str or (not allow_empty and not value):
        raise ManifestError("invalid string")
    return value


def _require_sha256(value: object) -> str:
    text = _require_string(value)
    if _SHA256_RE.fullmatch(text) is None:
        raise ManifestError("invalid SHA-256")
    return text


def _require_capabilities(value: object) -> tuple[str, ...]:
    if type(value) is not list:
        raise ManifestError("invalid capabilities")
    result = tuple(_require_string(item) for item in value)
    if len(set(result)) != len(result):
        raise ManifestError("duplicate capability")
    return result


def _require_unique_paths(paths: Iterable[str]) -> None:
    exact: set[str] = set()
    folded: set[str] = set()
    for path in paths:
        if path in exact or path.casefold() in folded:
            raise ManifestError("duplicate package path")
        exact.add(path)
        folded.add(path.casefold())


def _parse_file_records(value: object) -> tuple[FileRecord, ...]:
    if type(value) is not list:
        raise ManifestError("invalid file records")
    records = tuple(
        FileRecord(
            path=normalize_package_path(
                _require_keys(item, frozenset({"path", "sha256"}))["path"]
            ),
            sha256=_require_sha256(item["sha256"]),
        )
        for item in value
    )
    if records != tuple(sorted(records)):
        raise ManifestError("unsorted file records")
    _require_unique_paths(record.path for record in records)
    return records


def _parse_chrome_manifest(value: object) -> tuple[str, str | None]:
    obj = _require_keys(value, frozenset({"version", "version_name"}))
    version = _require_string(obj["version"])
    version_name = obj["version_name"]
    if version_name is not None:
        version_name = _require_string(version_name)
    return version, version_name


def _parse_manifest_entry(value: object) -> ManifestEntry:
    obj = _require_keys(value, frozenset({"path", "ownership", "sha256"}))
    try:
        ownership = OwnershipClass(_require_string(obj["ownership"]))
    except ValueError as error:
        raise ManifestError("invalid ownership class") from error
    return ManifestEntry(
        path=normalize_package_path(obj["path"]),
        ownership=ownership,
        sha256=_require_sha256(obj["sha256"]),
    )


def _require_package_ownership_paths(entries: tuple[ManifestEntry, ...]) -> None:
    for entry in entries:
        if entry.ownership in LIVE_ONLY_OWNERSHIP_CLASSES:
            raise ManifestError("invalid packaged ownership")
        if entry.path == UPDATE_MANIFEST_PATH:
            raise ManifestError("manifest cannot hash itself")
        folded_path = entry.path.casefold()
        canonical_special = CANONICAL_PACKAGED_SPECIAL_BY_CASEFOLD.get(folded_path)
        if canonical_special is not None and entry.path != canonical_special:
            raise ManifestError("noncanonical reserved package path")
        if (
            folded_path in FORBIDDEN_PACKAGED_HOST_PATHS_CASEFOLDED
            or folded_path.startswith("host/native_host.log.")
            or folded_path.startswith("host/updates/")
        ):
            raise ManifestError("user or generated file in package")
        if entry.path.startswith(("host/_internal/", "extension/")):
            if entry.ownership is not OwnershipClass.WHOLE_PRODUCT_DIRECTORY:
                raise ManifestError("invalid whole-directory ownership")
        elif entry.path == "host/config.json":
            if entry.ownership is not OwnershipClass.SEED_ONLY:
                raise ManifestError("invalid seed ownership")
        elif entry.path in PACKAGED_METADATA_PATHS:
            if entry.ownership is not OwnershipClass.PACKAGED_METADATA:
                raise ManifestError("invalid metadata ownership")
        elif entry.path in SERIALIZED_PACKAGE_ONLY_PATHS:
            if entry.ownership is not OwnershipClass.PACKAGE_ONLY:
                raise ManifestError("invalid package-only ownership")
        elif entry.path.startswith("host/") and "/" not in entry.path.removeprefix(
            "host/"
        ):
            if entry.ownership is not OwnershipClass.HOST_PRODUCT_FILE:
                raise ManifestError("invalid Host product ownership")
        else:
            raise ManifestError("unrecognized package path")

    by_class = {
        ownership: {entry.path for entry in entries if entry.ownership is ownership}
        for ownership in OwnershipClass
    }
    if by_class[OwnershipClass.SEED_ONLY] != {"host/config.json"}:
        raise ManifestError("incomplete seed ownership")
    if by_class[OwnershipClass.PACKAGED_METADATA] != set(PACKAGED_METADATA_PATHS):
        raise ManifestError("incomplete metadata ownership")
    if by_class[OwnershipClass.PACKAGE_ONLY] != set(
        SERIALIZED_PACKAGE_ONLY_PATHS
    ):
        raise ManifestError("incomplete package-only ownership")
    required_host = {
        "host/dh_native_host.exe",
        "host/register.py",
        "host/system_prompt.md",
    }
    if not required_host.issubset(by_class[OwnershipClass.HOST_PRODUCT_FILE]):
        raise ManifestError("incomplete Host product ownership")
    whole = by_class[OwnershipClass.WHOLE_PRODUCT_DIRECTORY]
    if "extension/manifest.json" not in whole:
        raise ManifestError("Extension manifest missing")
    if not any(path.startswith("host/_internal/") for path in whole):
        raise ManifestError("Host runtime missing")


def parse_update_manifest(value: object) -> UpdateManifest:
    obj = _require_keys(
        value,
        frozenset(
            {
                "schema_version",
                "package_version",
                "required_capabilities",
                "provided_capabilities",
                "chrome_manifest",
                "entries",
            }
        ),
    )
    if type(obj["entries"]) is not list:
        raise ManifestError("invalid entries")
    entries = tuple(_parse_manifest_entry(item) for item in obj["entries"])
    if entries != tuple(sorted(entries)):
        raise ManifestError("unsorted entries")
    _require_unique_paths(entry.path for entry in entries)
    _require_package_ownership_paths(entries)
    chrome_version, chrome_version_name = _parse_chrome_manifest(
        obj["chrome_manifest"]
    )
    return UpdateManifest(
        schema_version=_require_schema(
            obj["schema_version"], UPDATE_MANIFEST_SCHEMA_VERSION
        ),
        package_version=_require_string(obj["package_version"]),
        required_capabilities=_require_capabilities(obj["required_capabilities"]),
        provided_capabilities=_require_capabilities(obj["provided_capabilities"]),
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        entries=entries,
    )


def parse_release_integrity(value: object) -> ReleaseIntegrity:
    obj = _require_keys(
        value,
        frozenset(
            {
                "schema_version",
                "package_version",
                "required_capabilities",
                "provided_capabilities",
                "chrome_manifest",
                "host_files",
                "extension_files",
            }
        ),
    )
    chrome_version, chrome_version_name = _parse_chrome_manifest(
        obj["chrome_manifest"]
    )
    return ReleaseIntegrity(
        schema_version=_require_schema(
            obj["schema_version"], RELEASE_INTEGRITY_SCHEMA_VERSION
        ),
        package_version=_require_string(obj["package_version"]),
        required_capabilities=_require_capabilities(obj["required_capabilities"]),
        provided_capabilities=_require_capabilities(obj["provided_capabilities"]),
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        host_files=_parse_file_records(obj["host_files"]),
        extension_files=_parse_file_records(obj["extension_files"]),
    )


def parse_installed_product(value: object) -> InstalledProduct:
    obj = _require_keys(
        value,
        frozenset(
            {
                "schema_version",
                "package_version",
                "required_capabilities",
                "provided_capabilities",
                "ownership_schema_version",
                "legacy_allowlist_version",
                "release_integrity_sha256",
            }
        ),
    )
    return InstalledProduct(
        schema_version=_require_schema(
            obj["schema_version"], INSTALLED_PRODUCT_SCHEMA_VERSION
        ),
        package_version=_require_string(obj["package_version"]),
        required_capabilities=_require_capabilities(obj["required_capabilities"]),
        provided_capabilities=_require_capabilities(obj["provided_capabilities"]),
        ownership_schema_version=_require_schema(
            obj["ownership_schema_version"], OWNERSHIP_SCHEMA_VERSION
        ),
        legacy_allowlist_version=_require_schema(
            obj["legacy_allowlist_version"], LEGACY_PRODUCT_ALLOWLIST_VERSION
        ),
        release_integrity_sha256=_require_sha256(
            obj["release_integrity_sha256"]
        ),
    )


def _reject_duplicate_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ManifestError("duplicate JSON key")
        result[key] = value
    return result


def _reject_constant(_value: str) -> object:
    raise ManifestError("non-finite JSON value")


T = TypeVar("T")


def _load_canonical(
    path: Path,
    parser: Callable[[object], T],
    serializer: Callable[[T], dict[str, object]],
) -> T:
    try:
        raw = path.read_bytes()
        value = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
        parsed = parser(value)
    except ManifestError:
        raise
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ManifestError("invalid manifest document") from error
    if raw != canonical_json_bytes(serializer(parsed)):
        raise ManifestError("noncanonical manifest document")
    return parsed


def load_update_manifest(path: Path) -> UpdateManifest:
    return _load_canonical(path, parse_update_manifest, update_manifest_to_dict)


def load_release_integrity(path: Path) -> ReleaseIntegrity:
    return _load_canonical(path, parse_release_integrity, release_integrity_to_dict)


def load_installed_product(path: Path) -> InstalledProduct:
    return _load_canonical(path, parse_installed_product, installed_product_to_dict)


def _require_regular_file(path: Path) -> None:
    try:
        info = path.lstat()
    except OSError as error:
        raise ManifestError("unreadable filesystem entry") from error
    attributes = getattr(info, "st_file_attributes", 0)
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if not stat.S_ISREG(info.st_mode) or attributes & reparse:
        raise ManifestError("unsupported filesystem entry")


def _require_plain_directory(path: Path) -> None:
    try:
        info = path.lstat()
    except OSError as error:
        raise ManifestError("unreadable filesystem directory") from error
    attributes = getattr(info, "st_file_attributes", 0)
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if not stat.S_ISDIR(info.st_mode) or attributes & reparse:
        raise ManifestError("unsupported filesystem directory")


def _walk_regular_relative_paths(root: Path) -> tuple[str, ...]:
    _require_plain_directory(root)
    try:
        canonical_root = root.resolve(strict=True)
    except OSError as error:
        raise ManifestError("unreadable filesystem directory") from error
    _require_plain_directory(canonical_root)
    paths: list[str] = []

    def visit(directory: Path) -> int:
        count = 0
        try:
            children = sorted(directory.iterdir(), key=lambda item: item.name)
        except OSError as error:
            raise ManifestError("unreadable filesystem directory") from error
        for path in children:
            try:
                info = path.lstat()
            except OSError as error:
                raise ManifestError("unreadable filesystem entry") from error
            attributes = getattr(info, "st_file_attributes", 0)
            reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
            if attributes & reparse:
                raise ManifestError("unsupported filesystem entry")
            if stat.S_ISDIR(info.st_mode):
                descendants = visit(path)
                if descendants == 0:
                    raise ManifestError("unmanifested empty directory")
                count += descendants
                continue
            _require_regular_file(path)
            paths.append(
                normalize_package_path(path.relative_to(canonical_root).as_posix())
            )
            count += 1
        return count

    visit(canonical_root)
    return tuple(sorted(paths))


def _inventory_regular_files(root: Path) -> tuple[FileRecord, ...]:
    return tuple(
        FileRecord(
            path=relative,
            sha256=sha256_file(root.joinpath(*relative.split("/"))),
        )
        for relative in _walk_regular_relative_paths(root)
    )


def _inventory_host_products(host_root: Path) -> tuple[FileRecord, ...]:
    _require_plain_directory(host_root)
    try:
        canonical_root = host_root.resolve(strict=True)
    except OSError as error:
        raise ManifestError("unreadable Host product") from error
    _require_plain_directory(canonical_root)
    records: list[FileRecord] = []
    try:
        children = sorted(canonical_root.iterdir(), key=lambda item: item.name)
    except OSError as error:
        raise ManifestError("unreadable Host product") from error
    for child in children:
        folded_name = child.name.casefold()
        canonical_special = {
            "config.json": "config.json",
            "release-integrity.json": "release-integrity.json",
            "installed-product.json": "installed-product.json",
        }.get(folded_name)
        if canonical_special is not None and child.name != canonical_special:
            raise ManifestError("noncanonical reserved package source path")
        if folded_name in {"release-integrity.json", "installed-product.json"}:
            raise ManifestError("pre-existing packaged metadata")
        if folded_name == "config.json":
            _require_regular_file(child)
            continue
        package_path = f"host/{child.name}"
        folded_path = package_path.casefold()
        if (
            folded_path in FORBIDDEN_PACKAGED_HOST_PATHS_CASEFOLDED
            or folded_name.startswith("native_host.log.")
            or folded_name == "updates"
        ):
            raise ManifestError("user or generated file in package source")
        try:
            info = child.lstat()
        except OSError as error:
            raise ManifestError("unreadable Host product") from error
        attributes = getattr(info, "st_file_attributes", 0)
        reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
        if attributes & reparse:
            raise ManifestError("unsupported filesystem entry")
        if stat.S_ISDIR(info.st_mode):
            if child.name != "_internal":
                raise ManifestError("unexpected Host product directory")
            records.extend(
                FileRecord(
                    path=f"_internal/{record.path}",
                    sha256=record.sha256,
                )
                for record in _inventory_regular_files(child)
            )
            continue
        _require_regular_file(child)
        records.append(FileRecord(path=child.name, sha256=sha256_file(child)))
    paths = {record.path for record in records}
    required = {"dh_native_host.exe", "register.py", "system_prompt.md"}
    if not required.issubset(paths) or not any(
        path.startswith("_internal/") for path in paths
    ):
        raise ManifestError("incomplete Host product")
    return tuple(sorted(records))


def _read_chrome_manifest(path: Path) -> tuple[str, str | None]:
    try:
        value = json.loads(
            path.read_bytes().decode("utf-8"),
            object_pairs_hook=_reject_duplicate_pairs,
            parse_constant=_reject_constant,
        )
    except ManifestError:
        raise
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ManifestError("invalid Chrome manifest") from error
    if type(value) is not dict:
        raise ManifestError("invalid Chrome manifest")
    version = _require_string(value.get("version"))
    version_name = value.get("version_name")
    if version_name is not None:
        version_name = _require_string(version_name)
    return version, version_name


def _build_update_entries(
    stage_root: Path,
    host_records: tuple[FileRecord, ...],
    extension_records: tuple[FileRecord, ...],
    metadata_hashes: dict[str, str],
) -> tuple[ManifestEntry, ...]:
    entries = [
        ManifestEntry(
            path=f"host/{record.path}",
            ownership=(
                OwnershipClass.WHOLE_PRODUCT_DIRECTORY
                if record.path.startswith("_internal/")
                else OwnershipClass.HOST_PRODUCT_FILE
            ),
            sha256=record.sha256,
        )
        for record in host_records
    ]
    entries.extend(
        ManifestEntry(
            path=f"extension/{record.path}",
            ownership=OwnershipClass.WHOLE_PRODUCT_DIRECTORY,
            sha256=record.sha256,
        )
        for record in extension_records
    )
    config_path = stage_root / "host" / "config.json"
    _require_regular_file(config_path)
    entries.append(
        ManifestEntry(
            path="host/config.json",
            ownership=OwnershipClass.SEED_ONLY,
            sha256=sha256_file(config_path),
        )
    )
    entries.extend(
        ManifestEntry(
            path=path,
            ownership=OwnershipClass.PACKAGED_METADATA,
            sha256=digest,
        )
        for path, digest in metadata_hashes.items()
    )
    for path in SERIALIZED_PACKAGE_ONLY_PATHS:
        source = stage_root.joinpath(*path.split("/"))
        _require_regular_file(source)
        entries.append(
            ManifestEntry(
                path=path,
                ownership=OwnershipClass.PACKAGE_ONLY,
                sha256=sha256_file(source),
            )
        )
    result = tuple(sorted(entries))
    _require_unique_paths(entry.path for entry in result)
    _require_package_ownership_paths(result)
    return result


def _require_product_bijection(
    manifest: UpdateManifest,
    integrity: ReleaseIntegrity,
) -> None:
    update_host = {
        (entry.path.removeprefix("host/"), entry.sha256)
        for entry in manifest.entries
        if entry.ownership in PRODUCT_OWNERSHIP_CLASSES
        and entry.path.startswith("host/")
    }
    update_extension = {
        (entry.path.removeprefix("extension/"), entry.sha256)
        for entry in manifest.entries
        if entry.ownership is OwnershipClass.WHOLE_PRODUCT_DIRECTORY
        and entry.path.startswith("extension/")
    }
    if update_host != {
        (record.path, record.sha256) for record in integrity.host_files
    }:
        raise ManifestError("Host product inventory mismatch")
    if update_extension != {
        (record.path, record.sha256) for record in integrity.extension_files
    }:
        raise ManifestError("Extension product inventory mismatch")


def generate_release_documents(
    stage_root: Path,
    package_version: str,
) -> ReleaseDocuments:
    if type(package_version) is not str or package_version != VERSION:
        raise ManifestError("package version mismatch")
    try:
        canonical_root = stage_root.resolve(strict=True)
    except OSError as error:
        raise ManifestError("invalid package stage") from error
    _require_plain_directory(canonical_root)
    output_paths = (
        canonical_root / UPDATE_MANIFEST_PATH,
        *(canonical_root.joinpath(*relative.split("/")) for relative in PACKAGED_METADATA_PATHS),
    )
    if any(path.exists() or path.is_symlink() for path in output_paths):
        raise ManifestError("pre-existing packaged metadata")
    chrome_version, chrome_version_name = _read_chrome_manifest(
        canonical_root / "extension" / "manifest.json"
    )
    if (chrome_version_name or chrome_version) != package_version:
        raise ManifestError("package version mismatch")
    host_records = _inventory_host_products(canonical_root / "host")
    extension_records = _inventory_regular_files(canonical_root / "extension")
    integrity = ReleaseIntegrity(
        schema_version=RELEASE_INTEGRITY_SCHEMA_VERSION,
        package_version=package_version,
        required_capabilities=REQUIRED_PROTOCOL_CAPABILITIES,
        provided_capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        host_files=host_records,
        extension_files=extension_records,
    )
    integrity_bytes = canonical_json_bytes(release_integrity_to_dict(integrity))
    installed = InstalledProduct(
        schema_version=INSTALLED_PRODUCT_SCHEMA_VERSION,
        package_version=package_version,
        required_capabilities=REQUIRED_PROTOCOL_CAPABILITIES,
        provided_capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        ownership_schema_version=OWNERSHIP_SCHEMA_VERSION,
        legacy_allowlist_version=LEGACY_PRODUCT_ALLOWLIST_VERSION,
        release_integrity_sha256=sha256_bytes(integrity_bytes),
    )
    installed_bytes = canonical_json_bytes(installed_product_to_dict(installed))
    entries = _build_update_entries(
        canonical_root,
        host_records,
        extension_records,
        {
            "host/release-integrity.json": sha256_bytes(integrity_bytes),
            "host/installed-product.json": sha256_bytes(installed_bytes),
        },
    )
    manifest = UpdateManifest(
        schema_version=UPDATE_MANIFEST_SCHEMA_VERSION,
        package_version=package_version,
        required_capabilities=REQUIRED_PROTOCOL_CAPABILITIES,
        provided_capabilities=PROVIDED_PROTOCOL_CAPABILITIES,
        chrome_version=chrome_version,
        chrome_version_name=chrome_version_name,
        entries=entries,
    )
    _require_product_bijection(manifest, integrity)
    return ReleaseDocuments(
        update_manifest=manifest,
        release_integrity=integrity,
        installed_product=installed,
    )


def _write_sibling_replace(path: Path, payload: bytes) -> None:
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with temporary.open("xb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _require_document_links(
    documents: ReleaseDocuments,
    payloads: dict[Path, bytes],
) -> None:
    by_name = {path.name: payload for path, payload in payloads.items()}
    integrity_bytes = by_name["release-integrity.json"]
    installed_bytes = by_name["installed-product.json"]
    metadata = {
        entry.path: entry.sha256
        for entry in documents.update_manifest.entries
        if entry.ownership is OwnershipClass.PACKAGED_METADATA
    }
    if documents.installed_product.release_integrity_sha256 != sha256_bytes(
        integrity_bytes
    ):
        raise ManifestError("installed metadata link mismatch")
    if metadata != {
        "host/release-integrity.json": sha256_bytes(integrity_bytes),
        "host/installed-product.json": sha256_bytes(installed_bytes),
    }:
        raise ManifestError("package metadata link mismatch")
    if not (
        documents.update_manifest.package_version
        == documents.release_integrity.package_version
        == documents.installed_product.package_version
    ):
        raise ManifestError("metadata version mismatch")
    if not (
        documents.update_manifest.required_capabilities
        == documents.release_integrity.required_capabilities
        == documents.installed_product.required_capabilities
    ) or not (
        documents.update_manifest.provided_capabilities
        == documents.release_integrity.provided_capabilities
        == documents.installed_product.provided_capabilities
    ):
        raise ManifestError("metadata capability mismatch")
    _require_product_bijection(
        documents.update_manifest,
        documents.release_integrity,
    )


def write_release_documents(
    stage_root: Path,
    documents: ReleaseDocuments,
) -> None:
    payloads = {
        stage_root / "host" / "release-integrity.json": canonical_json_bytes(
            release_integrity_to_dict(documents.release_integrity)
        ),
        stage_root / "host" / "installed-product.json": canonical_json_bytes(
            installed_product_to_dict(documents.installed_product)
        ),
        stage_root / UPDATE_MANIFEST_PATH: canonical_json_bytes(
            update_manifest_to_dict(documents.update_manifest)
        ),
    }
    _require_document_links(documents, payloads)
    for path, payload in payloads.items():
        _write_sibling_replace(path, payload)
