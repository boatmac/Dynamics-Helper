import json
import os
import stat
import tempfile
from enum import StrEnum
from pathlib import Path
from typing import Protocol


MAIN_HOST_NAME = "com.dynamics.helper.native"
STATUS_HOST_NAME = "com.dynamics.helper.update_status"
ALLOWED_ORIGINS = (
    "chrome-extension://aiimcjfjmibedicmckpphgbddankgdln/",
    "chrome-extension://fkemelmlolmdnldpofiahmnhngmhonno/",
)
BROWSER_KEY_PREFIXES = (
    r"Software\Google\Chrome\NativeMessagingHosts",
    r"Software\Microsoft\Edge\NativeMessagingHosts",
)


class MainHostRuntime(StrEnum):
    SOURCE = "source"
    FROZEN = "frozen"


class RegistryBackend(Protocol):
    def read_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> Path | None:
        raise AssertionError("registry protocol method")

    def write_native_host(
        self,
        key_prefix: str,
        name: str,
        manifest_path: Path,
    ) -> None:
        raise AssertionError("registry protocol method")

    def delete_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> None:
        raise AssertionError("registry protocol method")


class WindowsRegistryBackend:
    @staticmethod
    def _subkey(key_prefix: str, name: str) -> str:
        if key_prefix not in BROWSER_KEY_PREFIXES:
            raise ValueError("invalid_browser_registry_key")
        if name not in (MAIN_HOST_NAME, STATUS_HOST_NAME):
            raise ValueError("invalid_native_host_name")
        return f"{key_prefix}\\{name}"

    def read_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> Path | None:
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                self._subkey(key_prefix, name),
                0,
                winreg.KEY_QUERY_VALUE,
            ) as key:
                value, kind = winreg.QueryValueEx(key, "")
        except FileNotFoundError:
            return None
        if kind != winreg.REG_SZ or type(value) is not str or not value:
            raise RuntimeError("native_registration_invalid_value")
        return Path(value).resolve(strict=False)

    def write_native_host(
        self,
        key_prefix: str,
        name: str,
        manifest_path: Path,
    ) -> None:
        import winreg

        with winreg.CreateKeyEx(
            winreg.HKEY_CURRENT_USER,
            self._subkey(key_prefix, name),
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE,
        ) as key:
            winreg.SetValueEx(
                key,
                "",
                0,
                winreg.REG_SZ,
                str(manifest_path.resolve()),
            )

    def delete_native_host(
        self,
        key_prefix: str,
        name: str,
    ) -> None:
        import winreg

        try:
            winreg.DeleteKey(
                winreg.HKEY_CURRENT_USER,
                self._subkey(key_prefix, name),
            )
        except FileNotFoundError:
            return


def _is_reparse(info: os.stat_result) -> bool:
    attributes = getattr(info, "st_file_attributes", 0)
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    return bool(attributes & reparse)


def require_plain_root(root: Path) -> Path:
    if not isinstance(root, Path):
        raise ValueError("invalid_native_host_root")
    try:
        info = root.lstat()
        if not stat.S_ISDIR(info.st_mode) or _is_reparse(info):
            raise ValueError("invalid_native_host_root")
        resolved = root.resolve(strict=True)
        resolved_info = resolved.lstat()
    except OSError as error:
        raise ValueError("invalid_native_host_root") from error
    if not stat.S_ISDIR(resolved_info.st_mode) or _is_reparse(resolved_info):
        raise ValueError("invalid_native_host_root")
    return resolved


def is_plain_regular_file(path: Path) -> bool:
    try:
        info = path.lstat()
    except OSError:
        return False
    return stat.S_ISREG(info.st_mode) and not _is_reparse(info)


def require_complete_status_runtime(root: Path) -> None:
    if not is_plain_regular_file(root / "dh_update_runner.exe"):
        raise RuntimeError("status_runtime_incomplete")
    if not is_plain_regular_file(root / "dh_update_status_host.exe"):
        raise RuntimeError("status_runtime_incomplete")
    internal = root / "_internal"
    try:
        info = internal.lstat()
    except OSError as error:
        raise RuntimeError("status_runtime_incomplete") from error
    if not stat.S_ISDIR(info.st_mode) or _is_reparse(info):
        raise RuntimeError("status_runtime_incomplete")
    regular_count = 0
    try:
        for path in internal.rglob("*"):
            child_info = path.lstat()
            if _is_reparse(child_info):
                raise RuntimeError("status_runtime_incomplete")
            if stat.S_ISREG(child_info.st_mode):
                regular_count += 1
            elif not stat.S_ISDIR(child_info.st_mode):
                raise RuntimeError("status_runtime_incomplete")
    except OSError as error:
        raise RuntimeError("status_runtime_incomplete") from error
    if regular_count == 0:
        raise RuntimeError("status_runtime_incomplete")


def _manifest_value(
    name: str,
    description: str,
    host_path: str,
) -> dict[str, object]:
    return {
        "name": name,
        "description": description,
        "path": host_path,
        "type": "stdio",
        "allowed_origins": list(ALLOWED_ORIGINS),
    }


def _atomic_replace(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    sibling = Path(name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(sibling, path)
    except Exception:
        try:
            os.close(descriptor)
        except OSError:
            pass
        sibling.unlink(missing_ok=True)
        raise


def _write_atomic_json(path: Path, value: dict[str, object]) -> None:
    payload = (
        json.dumps(
            value,
            ensure_ascii=True,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")
    _atomic_replace(path, payload)


def _write_atomic_bytes(path: Path, payload: bytes) -> None:
    _atomic_replace(path, payload)


def _read_values(
    registry: RegistryBackend,
    name: str,
) -> tuple[Path | None, Path | None]:
    values = tuple(
        registry.read_native_host(prefix, name)
        for prefix in BROWSER_KEY_PREFIXES
    )
    return values[0], values[1]


def _restore_values(
    registry: RegistryBackend,
    name: str,
    prior: tuple[Path | None, Path | None],
) -> None:
    for prefix, value in zip(BROWSER_KEY_PREFIXES, prior, strict=True):
        registry.delete_native_host(prefix, name)
        if value is not None:
            registry.write_native_host(prefix, name, value)
        if registry.read_native_host(prefix, name) != value:
            raise RuntimeError("native_registration_restore_failed")


def _register_manifest(
    registry: RegistryBackend,
    name: str,
    manifest_path: Path,
    host_path: str,
    description: str,
) -> Path:
    if name not in (MAIN_HOST_NAME, STATUS_HOST_NAME):
        raise ValueError("invalid_native_host_name")
    prior = _read_values(registry, name)
    if prior[0] != prior[1]:
        raise RuntimeError("native_registration_split_brain")
    prior_manifest = manifest_path.read_bytes() if manifest_path.exists() else None
    _write_atomic_json(
        manifest_path,
        _manifest_value(name, description, host_path),
    )
    resolved = manifest_path.resolve(strict=True)
    try:
        for prefix in BROWSER_KEY_PREFIXES:
            registry.write_native_host(prefix, name, resolved)
            if registry.read_native_host(prefix, name) != resolved:
                raise RuntimeError("native_registration_round_trip_failed")
    except Exception as error:
        restore_errors: list[Exception] = []
        try:
            _restore_values(registry, name, prior)
        except Exception as restore_error:
            restore_errors.append(restore_error)
        try:
            if prior_manifest is None:
                manifest_path.unlink(missing_ok=True)
            else:
                _write_atomic_bytes(manifest_path, prior_manifest)
        except Exception as restore_error:
            restore_errors.append(restore_error)
        if restore_errors:
            raise ExceptionGroup(
                "native_registration_restore_failed",
                [error, *restore_errors],
            )
        raise RuntimeError("native_registration_failed") from error
    return resolved


def register_main_host(
    host_root: Path,
    registry: RegistryBackend,
    runtime: MainHostRuntime,
) -> Path:
    root = require_plain_root(host_root)
    if type(runtime) is not MainHostRuntime:
        raise ValueError("invalid_main_host_runtime")
    if runtime is MainHostRuntime.FROZEN:
        executable = root / "dh_native_host.exe"
        if not is_plain_regular_file(executable):
            raise RuntimeError("main_host_executable_missing")
        manifest = root / "manifest.json"
        host_path = executable.name
    else:
        executable = root / "launch_host.bat"
        if not is_plain_regular_file(executable):
            raise RuntimeError("source_host_launcher_missing")
        manifest = root / "host_manifest.json"
        host_path = str(executable.resolve(strict=True))
    return _register_manifest(
        registry,
        MAIN_HOST_NAME,
        manifest,
        host_path,
        "Dynamics Helper Native Host",
    )


def register_status_manifest(
    recovery_root: Path,
    registry: RegistryBackend,
) -> Path:
    root = require_plain_root(recovery_root)
    require_complete_status_runtime(root)
    return _register_manifest(
        registry,
        STATUS_HOST_NAME,
        root / "status-manifest.json",
        "dh_update_status_host.exe",
        "Dynamics Helper Update Status Host",
    )


def unregister_host(registry: RegistryBackend, name: str) -> None:
    if name not in (MAIN_HOST_NAME, STATUS_HOST_NAME):
        raise ValueError("invalid_native_host_name")
    prior = _read_values(registry, name)
    if prior[0] != prior[1]:
        raise RuntimeError("native_registration_split_brain")
    try:
        for prefix in BROWSER_KEY_PREFIXES:
            registry.delete_native_host(prefix, name)
            if registry.read_native_host(prefix, name) is not None:
                raise RuntimeError("native_unregistration_round_trip_failed")
    except Exception as error:
        try:
            _restore_values(registry, name, prior)
        except Exception as restore_error:
            raise ExceptionGroup(
                "native_registration_restore_failed",
                [error, restore_error],
            )
        raise RuntimeError("native_registration_failed") from error
