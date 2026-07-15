# --- SELF-REGISTRATION MODE ---
# Must run before stdout redirection to allow printing status to console.
import sys

if "--register" in sys.argv:
    import os
    import json
    import winreg

    try:
        HOST_NAME = "com.dynamics.helper.native"
        ALLOWED_ORIGINS = [
            "chrome-extension://aiimcjfjmibedicmckpphgbddankgdln/",
            "chrome-extension://fkemelmlolmdnldpofiahmnhngmhonno/",
        ]

        # Determine paths (Self-contained exe)
        # When running as exe, sys.executable is the path to the exe.
        # When running as script, it's python.exe.
        # But --register is mainly for the compiled exe scenario in Prod.
        exe_path = sys.executable
        install_dir = os.path.dirname(exe_path)

        # Manifest is strictly "manifest.json" in Prod
        manifest_path = os.path.join(install_dir, "manifest.json")

        # 1. Write Manifest (UTF-8 No BOM)
        # Relative path "dh_native_host.exe" ensures portability and avoids encoding issues.
        manifest_content = {
            "name": HOST_NAME,
            "description": "Dynamics Helper Native Host",
            "path": "dh_native_host.exe",
            "type": "stdio",
            "allowed_origins": ALLOWED_ORIGINS,
        }

        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_content, f, indent=2)
        print(f"Created manifest at: {manifest_path}")

        # 2. Register Keys (Windows Registry)
        registry_locations = [
            (winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\NativeMessagingHosts"),
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Edge\NativeMessagingHosts"),
        ]

        for hkey, subkey in registry_locations:
            try:
                host_key_path = f"{subkey}\\{HOST_NAME}"
                key = winreg.CreateKey(hkey, host_key_path)
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, manifest_path)
                winreg.CloseKey(key)
                print(f"Registered {HOST_NAME} at {host_key_path}")
            except Exception as e:
                print(f"Failed to register at {subkey}: {e}")

        print("Registration completed successfully.")
        sys.exit(0)

    except Exception as e:
        print(f"Registration failed: {e}")
        sys.exit(1)

# --- STDOUT PROTECTION ---
# Native Messaging requires STDOUT to be exclusively used for length-prefixed JSON.
# Any library that uses 'print()' will corrupt the stream and cause Chrome to disconnect.
# We save the original binary stdout for messaging, and redirect 'sys.stdout' to 'sys.stderr'.
import sys
import os
import datetime
import traceback

# --- EMERGENCY LOGGING ---
# We write to %TEMP% because we might crash before determining the User Data Directory.
# This is crucial for debugging silent failures on startup (e.g. missing DLLs, import errors).


# Define dummy first to prevent unbound errors
def log_emergency(msg):
    pass


try:
    temp_dir = os.environ.get("TEMP", os.environ.get("TMP", os.path.expanduser("~")))
    EMERGENCY_LOG = os.path.join(temp_dir, "dh_startup.log")

    def log_emergency(msg):
        try:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(EMERGENCY_LOG, "a") as f:
                f.write(f"[{timestamp}] {msg}\n")
        except:
            pass

    log_emergency("--- Native Host Process Started ---")
    log_emergency(f"Executable: {sys.executable}")
    log_emergency(f"CWD: {os.getcwd()}")
except:
    pass

try:
    # Save the binary stdout for our use
    NATIVE_STDOUT = sys.stdout.buffer

    # Redirect standard print() calls to stderr (logs to Chrome console or file if redirected)
    sys.stdout = sys.stderr
except Exception as e:
    # Fallback if something is weird (e.g. pythonw)
    if "log_emergency" in locals():
        log_emergency(f"Stdout redirection failed: {e}")
    NATIVE_STDOUT = sys.stdout.buffer

import asyncio
import copy
import threading
import struct
import json
import logging
import logging.handlers
import os
import datetime
import shutil
import time
import re
import uuid
import traceback
import urllib.request
from dataclasses import dataclass
import hashlib

VERSION = "2.0.74-beta.4"

# --- Cross-repo session-id coordination anchor (2026-07-03) ---
# DH derives each Copilot session id as a deterministic UUIDv5 from the bare
# case number. MyCasesKit computes the SAME value independently using this
# EXACT namespace + the bare case number (no prefix / no salt), so the two
# repos agree without any handshake. This constant is the shared contract —
# it must stay byte-identical to MyCasesKit's NAMESPACE_MYCASE forever. Do
# NOT change it, and do NOT prepend a salt to the input; either desyncs the
# repos. Authoritative spec: MyCasesKit docs/dh-uuid5-change-spec.md.
_NAMESPACE_MYCASE = uuid.UUID("816bee4e-8eee-4c0b-ae69-70879d032f4d")
_WORKING_DIRECTORY_UNSET = object()

_PROMPT_ERROR_MESSAGES = {
    "dh_core_prompt_missing": (
        "DH Core System Prompt is missing. Repair or reinstall Dynamics Helper."
    ),
    "dh_core_prompt_unreadable": (
        "DH Core System Prompt cannot be read as UTF-8. "
        "Repair the installation or file permissions."
    ),
    "dh_specific_instructions_unreadable": (
        "DH-specific Instructions cannot be read as UTF-8. "
        "Repair or replace them in Options."
    ),
    "repository_instructions_missing": (
        "Repository Instructions are missing. Add "
        ".github/copilot-instructions.md under Root Path or disable Repository ONLY."
    ),
    "repository_instructions_unreadable": (
        "Repository Instructions cannot be read as UTF-8. "
        "Repair the file or disable Repository ONLY."
    ),
}


@dataclass(frozen=True)
class PromptSnapshot:
    mode: str
    effective_root: str | None
    core_bytes: bytes
    core_text: str
    selected_bytes: bytes
    selected_text: str
    fingerprint: str


class PromptSourceError(RuntimeError):
    def __init__(self, error_code: str) -> None:
        self.error_code = error_code
        super().__init__(_PROMPT_ERROR_MESSAGES[error_code])

    def to_result(self) -> dict[str, str]:
        return {
            "status": "error",
            "error_code": self.error_code,
            "error": str(self),
        }

# Setup User Data Directory (Cross-platform)

if os.name == "nt":
    # User feedback indicates preference for LOCAL AppData for self-contained install
    # and preventing split-brain between Roaming (Data) and Local (Binaries).
    # We now default to LOCALAPPDATA to match the installer.
    USER_DATA_DIR = os.path.join(
        os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "DynamicsHelper"
    )
else:
    USER_DATA_DIR = os.path.join(os.path.expanduser("~"), ".config", "dynamics_helper")

# Ensure user data dir exists
os.makedirs(USER_DATA_DIR, exist_ok=True)

# Setup logging to User Data Directory (avoiding permission issues in Program Files)
# Uses RotatingFileHandler: 5 MB max per file, keeps 3 backups (.log.1, .log.2, .log.3)
LOG_FILE = os.path.join(USER_DATA_DIR, "native_host.log")


class _SafeRotatingFileHandler(logging.handlers.RotatingFileHandler):
    """RotatingFileHandler that gracefully handles Windows file-lock errors.

    On Windows, os.rename() fails with PermissionError if another process
    (prod exe, Notepad, antivirus) holds the log file. This subclass catches
    the error and silently skips rotation, continuing to write to the current
    file until the next rotation attempt succeeds.
    """

    def doRollover(self):
        try:
            super().doRollover()
        except PermissionError:
            # File is locked by another process — skip rotation this time.
            # The handler continues writing to the current (oversized) file.
            # Next emit() will retry rotation if still over maxBytes.
            pass


_log_handler = _SafeRotatingFileHandler(
    LOG_FILE,
    maxBytes=5 * 1024 * 1024,  # 5 MB
    backupCount=3,
    encoding="utf-8",
)
_log_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
)

# Scoped logger: attach file handler to "dh" namespace, NOT root.
# Why: previously the handler lived on root, so every third-party library
# (SDK, httpx, asyncio, etc.) flushed INFO/DEBUG into native_host.log,
# polluting it during normal operation AND during test runs. With a named
# logger + propagate=False, only dh's own messages plus dh.* sub-loggers
# (updater, pii_scrubber, secret_store) reach the file.
# Trade-off: Options log_level only controls dh's verbosity. To see SDK
# internals, attach a separate handler to logging.getLogger("copilot") —
# tracked as future "verbose SDK" toggle, not in this refactor.
logger = logging.getLogger("dh")
# Guard against double-attach if the module is somehow re-imported under a
# different name (e.g., `import dh_native_host` vs `from host import
# dh_native_host`). Without the guard, every emit would write N times.
if not logger.handlers:
    logger.addHandler(_log_handler)
logger.setLevel(logging.DEBUG)
logger.propagate = False

# Valid log levels that can be set via config
_VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}


def _apply_log_level(level_name: str) -> None:
    """Set the 'dh' logger level from a string name (e.g., 'INFO', 'DEBUG').

    Validated against _VALID_LOG_LEVELS; defaults to INFO if invalid.
    Only affects dh and dh.* sub-loggers; third-party libraries are
    unaffected (their default WARNING level applies, and they don't
    reach our file anyway since propagate=False on the dh logger).
    """
    level_name = (level_name or "INFO").upper()
    if level_name not in _VALID_LOG_LEVELS:
        logger.warning(f"Invalid log level '{level_name}', defaulting to INFO")
        level_name = "INFO"
    numeric_level = getattr(logging, level_name)
    if logger.level != numeric_level:
        logger.info(f"Log level changed to {level_name}")
        logger.setLevel(numeric_level)


# Apply user's saved log level from config.json at startup (before any analyze).
# Wrapped in try/except so a missing or corrupt config.json never blocks startup.
try:
    _startup_config_path = os.path.join(USER_DATA_DIR, "config.json")
    if os.path.exists(_startup_config_path):
        with open(_startup_config_path, "r", encoding="utf-8") as _f:
            _startup_cfg = json.loads(_f.read())
        _startup_level = _startup_cfg.get("extension_preferences", {}).get("log_level")
        if _startup_level:
            _apply_log_level(_startup_level)
except Exception:
    pass  # config.json missing, corrupt, or unreadable — stay at DEBUG


# Global Exception Handler
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    logger.critical(
        "Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback)
    )


sys.excepthook = handle_exception

logger.info("----------------------------------------------------------------")
logger.info(f"Host process started. PID: {os.getpid()}")
logger.info(f"Python Executable: {sys.executable}")

# Import the SDK from the correct package name we discovered: 'copilot'
try:
    log_emergency("Attempting to import copilot SDK...")
    # SDK 1.0.5 import map (upgraded from 0.3.0 on 2026-07-03, see
    # docs/sdk-upgrade-2026-07-1.0.5.md):
    #   - SubprocessConfig was REMOVED; the stdio connection is now expressed
    #     via `RuntimeConnection.for_stdio(path=...)`.
    #   - PermissionRequestResult is now a Union type (annotation-only, not a
    #     constructor). The headless auto-approve handler returns the concrete
    #     `PermissionDecisionApproveOnce()` variant instead.
    #   - PreToolUseHookOutput stays a TypedDict accepting permissionDecision.
    # WARNING: `copilot.generated.rpc.PermissionRequestResult` is a different
    # internal RPC type (success: bool); always import from `copilot.session`.
    from copilot import CopilotClient, RuntimeConnection
    from copilot._jsonrpc import ProcessExitedError
    from copilot.session import (
        PermissionRequestResult,
        PreToolUseHookOutput,
        PermissionDecisionApproveOnce,
    )

    # NOTE (2026-07-03): the PingResponse ISO-timestamp monkey-patch shim
    # that lived here (added 2026-05-20 for SDK 0.3.0 + CLI 1.0.46+) was
    # DELETED during the 1.0.5 upgrade. SDK 1.0.5's PingResponse.from_dict
    # handles ISO timestamps natively (isinstance(int,float) ? epoch :
    # from_datetime()). Verified 2026-07-03 by a live client.start() on
    # clean 1.0.5 + CLI 1.0.69 with no shim — handshake succeeded, no
    # ValueError. Do not reintroduce the shim unless a future SDK/CLI pair
    # regresses; see docs/sdk-upgrade-2026-07-1.0.5.md § 4.1.

    logger.info("Successfully imported copilot SDK.")
    log_emergency("Successfully imported copilot SDK.")
except ImportError as e:
    msg = f"Failed to import copilot SDK: {e}\n{traceback.format_exc()}"
    logger.critical(msg)
    log_emergency(msg)
    # We exit here because the app cannot function without it
    sys.exit(1)
except Exception as e:
    msg = f"Unexpected error importing copilot SDK: {e}\n{traceback.format_exc()}"
    logger.critical(msg)
    log_emergency(msg)
    sys.exit(1)

# Import PII Scrubber
try:
    log_emergency("Attempting to import PiiScrubber...")
    from pii_scrubber import PiiScrubber
    import updater  # Import the new updater module
    import secret_store
    # Ensure `host.secret_store` (used by tests and any caller using the
    # package path) resolves to the same module object as the bare
    # `secret_store` name this file uses. Without this, `mock.patch
    # ("host.secret_store.encrypt")` would patch a sibling copy and never
    # affect calls dispatched from here. Use direct assignment (not
    # setdefault) so we win even if some earlier code imported the package
    # path first.
    sys.modules["host.secret_store"] = secret_store

    logger.info("Successfully imported PiiScrubber and Updater.")
    log_emergency("Successfully imported PiiScrubber and Updater.")
except ImportError as e:
    msg = f"Failed to import PiiScrubber or Updater: {e}\n{traceback.format_exc()}"
    logger.critical(msg)
    log_emergency(msg)
    sys.exit(1)


# Matches "2.0.70" or "v2.0.70" optionally followed by "-<prerelease>".
# Prerelease is dot-separated identifiers per semver.org § 9.
_VERSION_RE = re.compile(
    r"^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.\-]+))?$"
)


def _parse_version(tag: str) -> tuple[tuple[int, int, int], tuple[str, ...]] | None:
    """Parse a semver-ish tag like "2.0.70", "v2.0.70", or "2.0.70-beta.2".

    Returns ((major, minor, patch), prerelease_parts) or None when the
    tag is not recognisable as a semver. See spec § 3.4.
    """
    if not isinstance(tag, str):
        return None
    m = _VERSION_RE.match(tag.strip())
    if not m:
        return None
    major, minor, patch, pre = m.groups()
    triple = (int(major), int(minor), int(patch))
    parts = tuple(pre.split(".")) if pre else ()
    return triple, parts


def _compare_prerelease(a: tuple[str, ...], b: tuple[str, ...]) -> int:
    """Compare two prerelease tuples per semver.org § 11.4.

    Returns negative, zero, or positive (like cmp): a < b, ==, or a > b.
    Empty tuple means "no prerelease" (i.e. a stable release) and per
    semver § 11.3 it ranks HIGHER than any non-empty prerelease.
    """
    if a == b:
        return 0
    # Stable beats prerelease at the same numeric triple.
    if not a:
        return 1
    if not b:
        return -1
    # Both have identifiers; compare element-wise.
    for ai, bi in zip(a, b):
        a_is_num = ai.isdigit()
        b_is_num = bi.isdigit()
        if a_is_num and b_is_num:
            ai_n, bi_n = int(ai), int(bi)
            if ai_n != bi_n:
                return -1 if ai_n < bi_n else 1
        elif a_is_num and not b_is_num:
            # numeric < alphanumeric per § 11.4.3
            return -1
        elif not a_is_num and b_is_num:
            return 1
        else:
            if ai != bi:
                return -1 if ai < bi else 1
    # All shared identifiers are equal; the longer one wins (§ 11.4.4).
    if len(a) == len(b):
        return 0
    return -1 if len(a) < len(b) else 1


def _version_gt(remote_tag: str, local_tag: str) -> bool:
    """True iff remote is strictly semver-greater than local.

    Returns False (defensively) if either tag is unparseable, so an
    unrecognised remote release never triggers an update prompt.
    See spec § 3.4.
    """
    remote = _parse_version(remote_tag)
    local = _parse_version(local_tag)
    if remote is None or local is None:
        return False
    r_triple, r_pre = remote
    l_triple, l_pre = local
    if r_triple != l_triple:
        return r_triple > l_triple
    return _compare_prerelease(r_pre, l_pre) > 0


class NativeHost:
    def __init__(self):
        self.input_queue = asyncio.Queue()
        self.client = None
        self.session = None
        self.running = True
        self.loop = None
        self.scrubber = PiiScrubber()
        self.current_request_id = None  # Track current request for progress updates
        self.root_path = None  # Store root path from config
        self.last_update_check = 0  # Track last update check time
        # C2b-lite: timeout is user-configurable via Options
        # (extension_preferences.analyze_timeout_seconds). Default 1200
        # because cold-start of a complex case with MCP servers + multiple
        # tool roundtrips routinely needs >600s. Clamped to [60, 3600] on
        # every config read; see _load_config + handle_update_config.
        self.analyze_timeout_seconds = 1200
        self.current_session_id = (
            None  # Track current Copilot session name (uuid5 of case) for --resume
        )
        self.current_case_id = None  # Track which case the current session belongs to
        self.client_working_directory = None
        self.current_session_root_path = None
        self.current_prompt_fingerprint: str | None = None
        self.last_session_error: str | None = None
        self.last_prompt_source_error: PromptSourceError | None = None

        # Log startup location
        logger.info(
            f"Host started. Installation Dir: {os.path.dirname(os.path.abspath(__file__))}"
        )
        logger.info(f"User Data Dir: {USER_DATA_DIR}")

        # Cleanup old version if exists (Atomic Update)
        try:
            from updater import Updater

            Updater.cleanup_old_version(sys.executable)
        except Exception as e:
            logger.error(f"Failed to cleanup old version: {e}")

        # Fix for v2.0.45 Updater Bug (Wrong Directory) & Nested Extension
        # v2.0.45 erroneously extracted extension to ../extension (AppData/Local/extension)
        # v2.0.46 migration attempt might have created extension/extension if folder was locked
        try:
            # Determine directory of the running executable/script
            if getattr(sys, "frozen", False):
                base_dir = os.path.dirname(sys.executable)
                is_prod = True
            else:
                base_dir = os.path.dirname(os.path.abspath(__file__))
                is_prod = False

            if is_prod:
                # The "Wrong" location defined by v2.0.45 logic (Parent/extension)
                wrong_ext_dir = os.path.join(os.path.dirname(base_dir), "extension")
                # The "Right" location (Current/extension)
                right_ext_dir = os.path.join(base_dir, "extension")

                # 1. FIX NESTED EXTENSION (caused by failed migration in v2.0.46)
                # Check for DynamicsHelper/extension/extension/manifest.json
                nested_ext_dir = os.path.join(right_ext_dir, "extension")
                nested_manifest = os.path.join(nested_ext_dir, "manifest.json")

                if os.path.exists(nested_manifest):
                    logger.info(
                        f"Detected nested extension at {nested_ext_dir}. Attempting repair..."
                    )
                    # We need to move content from extension/extension/* to extension/*
                    # But extension/* contains locked files (maybe).
                    # Actually, if extension/extension exists, it means the previous move succeeded
                    # in moving the FOLDER into the FOLDER.
                    # We should just move the contents UP one level.

                    # Strategy: Rename current 'extension' to 'extension_locked' (if possible),
                    # then move 'extension_locked/extension' to 'extension'.
                    # If rename fails, we are stuck until Chrome closes.

                    try:
                        # Scan nested dir and copy/move files up
                        for item in os.listdir(nested_ext_dir):
                            src = os.path.join(nested_ext_dir, item)
                            dst = os.path.join(right_ext_dir, item)
                            try:
                                if os.path.isdir(src):
                                    # Recursive copy/overwrite
                                    shutil.copytree(
                                        src, dst, dirs_exist_ok=True
                                    )  # Python 3.8+
                                    shutil.rmtree(src)  # Remove source after copy
                                else:
                                    shutil.copy2(src, dst)  # Overwrite
                                    os.remove(src)
                            except Exception as ex:
                                logger.warning(f"Failed to move {item} up: {ex}")

                        # Clean up the empty nested folder
                        try:
                            os.rmdir(nested_ext_dir)
                            logger.info("Nested extension repair complete.")
                        except:
                            pass

                    except Exception as e:
                        logger.error(f"Nested extension repair failed: {e}")

                # 2. FIX MISPLACED EXTENSION (v2.0.45 bug)
                # Only migrate if the wrong directory exists and contains a manifest
                if os.path.exists(os.path.join(wrong_ext_dir, "manifest.json")):
                    logger.info(
                        f"Detected misplaced extension files at {wrong_ext_dir}. Migrating to {right_ext_dir}..."
                    )

                    # Robust Migration:
                    # Do NOT use rmtree blindly. If it fails, move() creates nested folders.
                    if os.path.exists(right_ext_dir):
                        # Try to copy/overwrite instead of delete/move
                        try:
                            shutil.copytree(
                                wrong_ext_dir, right_ext_dir, dirs_exist_ok=True
                            )
                            logger.info(
                                "Extension files updated via copytree (overwrite)."
                            )

                            # Now safe to remove the wrong dir
                            shutil.rmtree(wrong_ext_dir)
                            logger.info("Cleaned up misplaced extension folder.")

                        except Exception as e:
                            logger.error(
                                f"Failed to overwrite extension files (likely locked by Chrome): {e}"
                            )
                            # If we can't overwrite, we leave the 'wrong' folder there
                            # hoping the next restart (when Chrome is closed) might succeed?
                            # Or we just accept we can't update without Chrome closing.
                    else:
                        # Destination doesn't exist, safe to move
                        shutil.move(wrong_ext_dir, right_ext_dir)
                        logger.info("Extension migration successful (move).")

        except Exception as e:
            logger.error(f"Extension migration/repair failed: {e}")

    @staticmethod
    def _normalize_root_path(root_path: str | None) -> str | None:
        """Normalize Options.rootPath; an empty value explicitly clears it."""
        if not isinstance(root_path, str) or not root_path.strip():
            return None
        expanded = os.path.expanduser(root_path.strip())
        if not os.path.isabs(expanded):
            raise ValueError("Root path must be an absolute path.")
        return os.path.normpath(expanded)

    @staticmethod
    def _get_install_dir() -> str:
        if getattr(sys, "frozen", False):
            return os.path.dirname(sys.executable)
        return os.path.dirname(os.path.abspath(__file__))

    @staticmethod
    def _prompt_source_mode(
        effective_root: str | None,
        use_workspace_only: bool,
    ) -> str:
        return (
            "repository-only"
            if effective_root and use_workspace_only
            else "dh-specific"
        )

    @staticmethod
    def _validate_effective_root(effective_root: str | None) -> None:
        if effective_root and not os.path.isdir(effective_root):
            raise ValueError(
                "Configured Root Path does not exist or is not a directory."
            )

    @staticmethod
    def _read_prompt_source(
        path: str,
        *,
        missing_error_code: str | None,
        unreadable_error_code: str,
    ) -> tuple[bytes, str]:
        try:
            with open(path, "rb") as stream:
                raw = stream.read()
        except FileNotFoundError as error:
            if missing_error_code is None:
                return b"", ""
            raise PromptSourceError(missing_error_code) from error
        except OSError as error:
            raise PromptSourceError(unreadable_error_code) from error
        try:
            return raw, raw.decode("utf-8")
        except UnicodeDecodeError as error:
            raise PromptSourceError(unreadable_error_code) from error

    @staticmethod
    def _compute_prompt_fingerprint(
        mode: str,
        core_bytes: bytes,
        selected_bytes: bytes,
    ) -> str:
        digest = hashlib.sha256()
        for part in (
            b"dh-prompt-fingerprint-v1",
            mode.encode("utf-8"),
            core_bytes,
            selected_bytes,
        ):
            digest.update(len(part).to_bytes(8, "big"))
            digest.update(part)
        return f"v1:{digest.hexdigest()}"

    def _resolve_prompt_snapshot(
        self,
        effective_root: str | None,
        use_workspace_only: bool,
    ) -> PromptSnapshot:
        mode = self._prompt_source_mode(effective_root, use_workspace_only)
        core_bytes, core_text = self._read_prompt_source(
            os.path.join(self._get_install_dir(), "system_prompt.md"),
            missing_error_code="dh_core_prompt_missing",
            unreadable_error_code="dh_core_prompt_unreadable",
        )
        if mode == "repository-only":
            selected_path = os.path.join(
                effective_root or "", ".github", "copilot-instructions.md"
            )
            missing_code = "repository_instructions_missing"
            unreadable_code = "repository_instructions_unreadable"
        else:
            selected_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")
            missing_code = None
            unreadable_code = "dh_specific_instructions_unreadable"
        selected_bytes, selected_text = self._read_prompt_source(
            selected_path,
            missing_error_code=missing_code,
            unreadable_error_code=unreadable_code,
        )
        return PromptSnapshot(
            mode=mode,
            effective_root=effective_root,
            core_bytes=core_bytes,
            core_text=core_text,
            selected_bytes=selected_bytes,
            selected_text=selected_text,
            fingerprint=self._compute_prompt_fingerprint(
                mode, core_bytes, selected_bytes
            ),
        )

    def _get_prompt_source_config_fields(
        self,
        effective_root: str | None,
        use_workspace_only: bool,
    ) -> dict:
        status: dict[str, str] = {"status": "ok"}
        dh_raw: str | None = None
        dh_error: PromptSourceError | None = None

        try:
            self._read_prompt_source(
                os.path.join(self._get_install_dir(), "system_prompt.md"),
                missing_error_code="dh_core_prompt_missing",
                unreadable_error_code="dh_core_prompt_unreadable",
            )
        except PromptSourceError as error:
            status = error.to_result()

        try:
            _, dh_raw = self._read_prompt_source(
                os.path.join(USER_DATA_DIR, "copilot-instructions.md"),
                missing_error_code=None,
                unreadable_error_code="dh_specific_instructions_unreadable",
            )
        except PromptSourceError as error:
            dh_error = error

        selected_error: PromptSourceError | None = None
        if effective_root and use_workspace_only:
            try:
                self._read_prompt_source(
                    os.path.join(
                        effective_root,
                        ".github",
                        "copilot-instructions.md",
                    ),
                    missing_error_code="repository_instructions_missing",
                    unreadable_error_code="repository_instructions_unreadable",
                )
            except PromptSourceError as error:
                selected_error = error

        if status["status"] == "ok" and selected_error is not None:
            status = selected_error.to_result()
        if status["status"] == "ok" and dh_error is not None:
            status = dh_error.to_result()

        fields: dict = {"prompt_source_status": status}
        if dh_raw is not None:
            fields["_user_instructions_raw"] = dh_raw
        return fields

    @staticmethod
    def _build_system_message(
        snapshot: PromptSnapshot,
        session_id: str | None,
    ) -> dict[str, str]:
        sections = [snapshot.core_text]
        if snapshot.selected_text.strip():
            sections.append(snapshot.selected_text)
        if session_id:
            sections.append(f"## Session Info\n\nSession Name: {session_id}")
        return {"mode": "append", "content": "\n\n".join(sections)}

    def _read_beta_channel_pref(self) -> bool:
        """Best-effort read of the beta-channel preference from config.json.

        Returns False when config is missing, unreadable, or the key is
        absent — i.e. the safe default (stable channel only).
        """
        try:
            cfg_path = os.path.join(USER_DATA_DIR, "config.json")
            if not os.path.exists(cfg_path):
                return False
            with open(cfg_path, "r", encoding="utf-8") as f:
                data = json.loads(f.read())
            ext = data.get("extension_preferences", {})
            return bool(ext.get("beta_channel_enabled", False))
        except Exception as e:
            logger.warning(f"Could not read beta_channel_enabled: {e}")
            return False

    async def check_for_updates(self, force=False):
        """Checks for updates from GitHub Releases.

        When the user has opted in to beta updates (config.json
        extension_preferences.beta_channel_enabled == True) we query
        /releases?per_page=10 which includes prereleases, and pick the
        highest semver-greater tag. Otherwise we use /releases/latest
        which GitHub server-side filters to stable only.
        """
        try:
            now = time.time()
            if not force and (now - self.last_update_check) < 3600:
                return
            self.last_update_check = now

            beta_enabled = self._read_beta_channel_pref()
            if beta_enabled:
                url = (
                    "https://api.github.com/repos/boatmac/Dynamics-Helper/"
                    "releases?per_page=10"
                )
            else:
                url = (
                    "https://api.github.com/repos/boatmac/Dynamics-Helper/"
                    "releases/latest"
                )
            logger.info(
                f"Checking for updates (beta_channel_enabled={beta_enabled})"
            )

            def fetch():
                try:
                    req = urllib.request.Request(
                        url, headers={"User-Agent": "DynamicsHelper-NativeHost"}
                    )
                    with urllib.request.urlopen(req, timeout=30) as response:
                        if response.status == 200:
                            return json.loads(response.read().decode())
                except Exception as e:
                    logger.warning(f"Update check network error: {e}")
                return None

            if not self.loop:
                return

            data = await self.loop.run_in_executor(None, fetch)
            if not data:
                if force:
                    self.send_message(
                        {
                            "action": "update_error",
                            "payload": {"error": "Failed to fetch update data."},
                        }
                    )
                return

            # Normalise to a list of release dicts.
            if isinstance(data, list):
                candidates = data
            else:
                candidates = [data]

            # Pick the highest semver-greater release.
            best_release = None
            best_tag = None
            for release in candidates:
                tag = release.get("tag_name", "")
                if not tag:
                    continue
                if not _version_gt(tag, VERSION):
                    continue
                if best_tag is None or _version_gt(tag, best_tag):
                    best_tag = tag
                    best_release = release

            if best_release is None:
                logger.info(
                    f"No update available (Local: {VERSION}, "
                    f"checked {len(candidates)} release(s))"
                )
                if force:
                    self.send_message(
                        {
                            "action": "update_not_available",
                            "payload": {"version": VERSION},
                        }
                    )
                return

            logger.info(f"Update available: {best_tag}")

            # Find the .zip asset URL on the chosen release.
            assets = best_release.get("assets", [])
            zip_url = None
            for asset in assets:
                if asset.get("name", "").endswith(".zip"):
                    zip_url = asset.get("browser_download_url")
                    break

            final_url = zip_url if zip_url else best_release.get(
                "html_url",
                "https://github.com/boatmac/Dynamics-Helper/releases",
            )

            self.send_message(
                {
                    "action": "update_available",
                    "payload": {
                        "version": best_tag,
                        "url": final_url,
                        "is_prerelease": bool(best_release.get("prerelease", False)),
                    },
                }
            )

        except Exception as e:
            logger.error(f"check_for_updates failed: {e}\n{traceback.format_exc()}")
            if force:
                self.send_message(
                    {
                        "action": "update_error",
                        "payload": {"error": str(e)},
                    }
                )

    def find_copilot_cli(self):
        """Finds the Copilot CLI executable path."""
        # On Windows, try to find the node-based CLI explicitly first to avoid
        # batch file wrapper issues that might confuse the SDK process management
        if os.name == "nt":
            appdata = os.environ.get("APPDATA", "")
            # Try npm global install first (standard)
            # Use 'copilot' without extension to let shell resolve it if possible
            # But here we look for specific file
            npm_path_cmd = os.path.join(appdata, "npm", "copilot.cmd")
            if os.path.exists(npm_path_cmd):
                logger.info(f"Found Copilot CLI at npm location: {npm_path_cmd}")
                return npm_path_cmd

        # Fallback to generic 'copilot' in PATH
        copilot_path = shutil.which("copilot")

        if copilot_path:
            logger.info(f"Found Copilot CLI in PATH: {copilot_path}")
            return copilot_path

        return None

    def _invalidate_active_session(self, *, clear_client: bool = False) -> None:
        self.session = None
        self.current_session_id = None
        self.current_case_id = None
        self.current_session_root_path = None
        self.current_prompt_fingerprint = None
        if clear_client:
            self.client = None
            self.client_working_directory = None

    async def _discard_client_if_workspace_changed(
        self, desired_working_directory: str | None
    ) -> None:
        """Stop a CLI client whose process cwd no longer matches config."""
        if not self.client:
            return
        current = getattr(self, "client_working_directory", None)
        if current == desired_working_directory:
            return

        logger.info(
            "Client working directory changed: %r -> %r. Restarting client.",
            current,
            desired_working_directory,
        )
        try:
            await self.client.stop()
        except Exception as e:
            logger.warning(f"Failed to stop old Copilot client cleanly: {e}")
        self._invalidate_active_session(clear_client=True)

    async def initialize_sdk(self):
        """Initializes the Copilot Client without creating a generic session."""
        try:
            logger.info("Initializing Copilot Client...")

            # Load root_path before starting the CLI process. Session-level
            # working_directory remains authoritative, but binding the client
            # process too prevents any fallback session from persisting the
            # Native Host installation directory as its workspace cwd.
            full_config = self._get_session_config()

            cli_path = self.find_copilot_cli()
            connection = (
                RuntimeConnection.for_stdio(path=cli_path)
                if cli_path
                else RuntimeConnection.for_stdio()
            )

            client_kwargs = {"connection": connection}
            if full_config.get("working_directory"):
                client_kwargs["working_directory"] = full_config["working_directory"]
            self.client = CopilotClient(**client_kwargs)
            self.client_working_directory = full_config.get("working_directory")

            # Explicitly start the client to ensure connection before session creation
            logger.info("Starting Copilot Client...")
            await self.client.start()
            logger.info("Copilot Client started.")

        except Exception as e:
            logger.error(f"Failed to initialize SDK: {e}")
            self._invalidate_active_session(clear_client=True)

    # ------------------------------------------------------------------
    # Secret field encryption boundary
    # ------------------------------------------------------------------
    # `team_manifest_url` is an Azure Blob SAS URL containing a sensitive
    # `sig=` HMAC. We persist it to disk encrypted via DPAPI so a screenshot
    # of config.json, a backup-tool upload, or a DLP scan of %LOCALAPPDATA%
    # cannot leak it. Encryption is on-disk only; in-memory state (and the
    # IPC payload to the extension) still uses plaintext.
    #
    # DO NOT log plaintext URLs inside these methods.
    #
    # Spec: docs/superpowers/specs/2026-05-25-team-manifest-url-encryption-design.md

    def _decrypt_secrets_in_memory(self, config: dict) -> None:
        """Replace on-disk encrypted secret fields with in-memory plaintext.

        Mutates `config` in place. Must be called immediately after loading
        config.json. After this call, downstream code sees the legacy
        plaintext key names (`team_manifest_url`) and is oblivious to
        encryption.

        Behavior:
        - If `team_manifest_url_encrypted` is present and decrypts cleanly:
          set `team_manifest_url` to the plaintext, delete the encrypted key
          (in memory only).
        - If decryption fails (cross-machine copy, corrupt blob, lost key):
          log a WARNING, set `team_manifest_url` to "", and remove the
          encrypted key from the in-memory dict so downstream code does not
          see the unusable blob. The on-disk blob is NOT touched; the user
          self-heals by repasting the URL.
        - Any pre-existing plaintext `team_manifest_url` key in config.json
          is treated as legacy/invalid and discarded (never released with
          plaintext persistence; presence indicates stale or tampered
          state).
        """
        ext = config.get("extension_preferences")
        if not isinstance(ext, dict):
            return

        # Discard any stale plaintext key — never trust it (spec § Migration).
        if "team_manifest_url" in ext:
            logger.warning(
                "Discarding stale plaintext team_manifest_url from config.json; "
                "encrypted form is the only persistence path."
            )
            del ext["team_manifest_url"]

        # pop (not get) removes the encrypted key from the in-memory dict
        # unconditionally — either we'll re-add `team_manifest_url` (success
        # path) or leave it absent (failure path so the caller's next save
        # doesn't re-persist the bad blob). The disk copy is untouched
        # either way; we only mutate this dict.
        blob = ext.pop("team_manifest_url_encrypted", None)
        if blob is None:
            return  # nothing to decrypt

        try:
            ext["team_manifest_url"] = secret_store.decrypt(blob)
        except secret_store.DecryptError as e:
            logger.warning(
                "Failed to decrypt team_manifest_url (likely cross-machine "
                "copy or key reset); treating as unconfigured. Error: %s",
                e,
            )
            ext["team_manifest_url"] = ""
            # NOTE: Intentionally do NOT write the encrypted blob back to
            # `ext` — downstream code would re-persist it on the next
            # config save and we want self-heal to be one user action.

    def _encrypt_secrets_before_write(self, payload_config: dict) -> None:
        """Replace in-memory plaintext secret fields with encrypted form.

        Mutates `payload_config` in place. Must be called inside
        handle_update_config before merging the payload into the on-disk
        config. After this call, the dict carries only encrypted keys for
        secret fields.

        Behavior:
        - Non-empty plaintext `team_manifest_url`: encrypt, store under
          `team_manifest_url_encrypted`, delete the plaintext key.
        - Empty-string plaintext (user cleared the field, or Reset): delete
          both keys so neither persists.
        - EncryptError propagates to the caller — handle_update_config
          MUST abort the entire write on this exception. There is no
          plaintext fallback path.
        """
        ext = payload_config.get("extension_preferences")
        if not isinstance(ext, dict):
            return
        if "team_manifest_url" not in ext:
            return  # extension didn't send the field; nothing to do

        url = ext["team_manifest_url"]

        if url == "":
            # Reset / clear semantics: drop both keys.
            del ext["team_manifest_url"]
            ext.pop("team_manifest_url_encrypted", None)
            return

        # Encrypt and swap keys atomically. If encrypt raises, we leave
        # `team_manifest_url` in place so the caller's exception handler
        # sees the dict unchanged from what it received — easier to reason
        # about than half-mutated state.
        blob = secret_store.encrypt(url)  # may raise EncryptError
        ext["team_manifest_url_encrypted"] = blob
        del ext["team_manifest_url"]

    def _get_session_config(
        self,
        root_path_override=_WORKING_DIRECTORY_UNSET,
        *,
        include_prompt_status: bool = False,
    ) -> dict:
        """Constructs the session configuration from disk."""
        session_config: dict = {}

        # 1. User-specific config (APPDATA/DynamicsHelper/config.json)
        user_config_path = os.path.join(USER_DATA_DIR, "config.json")

        # 2. Default/bundled config (beside the executable/script)
        if getattr(sys, "frozen", False):
            # PyInstaller OneDir: Look beside the .exe
            install_dir = os.path.dirname(sys.executable)
        else:
            # Dev Mode: Look beside the script
            install_dir = os.path.dirname(os.path.abspath(__file__))

        default_config_path = os.path.join(install_dir, "config.json")

        # --- Helper to load and resolve paths for a single config file ---
        def load_config_file(path):
            if not os.path.exists(path):
                return {}
            try:
                with open(path, "r") as f:
                    data = json.load(f)

                # Extract root_path if present (Dynamics Helper specific)
                # We keep it in the dict for now to merge, but will extract to self.root_path later

                # Handle skill_directories (resolve relative paths)
                if "skill_directories" in data:
                    resolved_skills = []
                    for skill_path in data["skill_directories"]:
                        # Expand ~ (user home) first
                        expanded_path = os.path.expanduser(skill_path)

                        if not os.path.isabs(expanded_path):
                            # Resolve relative to the CONFIG FILE location
                            resolved_path = os.path.abspath(
                                os.path.join(os.path.dirname(path), expanded_path)
                            )
                            resolved_skills.append(resolved_path)
                        else:
                            # Normalize path (fix slashes on Windows)
                            resolved_skills.append(os.path.normpath(expanded_path))
                    data["skill_directories"] = resolved_skills

                logger.info(f"Loaded configuration from {path}")
                return data
            except Exception as e:
                logger.error(f"Failed to load config from {path}: {e}")
                raise RuntimeError(f"Failed to load config from {path}: {e}") from e

        # --- Load and Merge Configurations ---

        # A. Load Default Config (Base)
        default_data = load_config_file(default_config_path)

        # B. Load User Config (Override)
        if os.path.exists(user_config_path):
            user_data = load_config_file(user_config_path)
        else:
            logger.info(f"User config file not found at: {user_config_path}")
            user_data = {}

        # Decrypt secret fields (e.g. team_manifest_url_encrypted) in place
        # so downstream merge/read code sees the legacy plaintext key names.
        # On decrypt failure the field becomes "" and the user repastes via UI.
        self._decrypt_secrets_in_memory(user_data)

        # C. Merge Logic
        # Start with default data
        final_data = default_data.copy()

        # REMOVE legacy mcp_servers from default data to enforce new logic
        if "mcp_servers" in final_data:
            del final_data["mcp_servers"]

        # Update scalars (root_path, auto_analyze, etc.) from User
        for key, value in user_data.items():
            if key == "skill_directories":
                continue  # Handle separately
            if key == "mcp_servers":
                continue  # IGNORE legacy mcp_servers in config.json
            final_data[key] = value

        # Check Workspace Only Mode
        ext_prefs = final_data.get("extension_preferences", {})
        use_workspace_only = ext_prefs.get("use_workspace_only", True)

        # Apply log level from config (default: INFO for normal use)
        _apply_log_level(ext_prefs.get("log_level", "INFO"))

        # Apply analyze timeout (C2b-lite). Clamp [60, 3600] to keep
        # asyncio.wait_for / OS pipe buffer out of pathological ranges.
        # int() coercion tolerates string values from older config files.
        try:
            _raw_timeout = int(ext_prefs.get("analyze_timeout_seconds", 1200))
        except (TypeError, ValueError):
            _raw_timeout = 1200
        self.analyze_timeout_seconds = max(60, min(3600, _raw_timeout))

        # Extract root path
        if root_path_override is _WORKING_DIRECTORY_UNSET:
            current_root = self._normalize_root_path(final_data.get("root_path"))
        else:
            current_root = self._normalize_root_path(root_path_override)
        has_root_path = bool(current_root)
        self.root_path = current_root

        # --- SKILL DIRECTORIES ---
        # Strategy:
        # 1. Base Skills: (User overrides Default)
        # 2. Workspace Skills: (.github/skills in root_path)
        # 3. Final:
        #    - If Repository ONLY (use_workspace_only and has_root_path): [Workspace]
        #    - Else: [Base] + [Workspace]

        # A. Resolve Default Skills
        default_skills = default_data.get("skill_directories", [])

        # B. Resolve User Skills
        user_skills = user_data.get("skill_directories", [])

        # C. Determine Base Skills (User > Default)
        # If user explicitly set skills (even empty list), use that. Else Default.
        if "skill_directories" in user_data:
            base_skills = user_skills
        else:
            base_skills = default_skills

        # D. Detect Workspace Skills (.github/skills)
        workspace_skills = []
        if has_root_path and current_root:
            ws_skills_path = os.path.join(current_root, ".github", "skills")
            if os.path.isdir(ws_skills_path):
                workspace_skills.append(ws_skills_path)
                logger.info(f"Detected workspace skills at: {ws_skills_path}")

        # E. Apply "Repository ONLY" Logic
        if use_workspace_only and has_root_path:
            final_data["skill_directories"] = workspace_skills
            logger.info("Repository ONLY Mode: Using ONLY workspace skills.")
        else:
            # Merge Base + Workspace
            final_data["skill_directories"] = list(set(base_skills + workspace_skills))

        # --- MCP SERVER CONFIGURATION ---
        # Strategy:
        # 1. Base MCP: (User overrides Default)
        # 2. Workspace MCP: (.github/mcp-config.json in root_path)
        # 3. Final:
        #    - If Repository ONLY: [Workspace]
        #    - Else: Base merged with Workspace

        mcp_servers = {}

        # A. Resolve Base MCP Config (Global)
        base_mcp_path_str = (
            final_data.get("mcp_config_path") or "~/.copilot/mcp-config.json"
        )

        base_mcp_path = os.path.expanduser(base_mcp_path_str)

        should_load_global = True
        if use_workspace_only and has_root_path:
            should_load_global = False
            logger.info("Repository ONLY Mode: Ignoring global MCP config.")

        if should_load_global:
            if os.path.exists(base_mcp_path):
                try:
                    with open(base_mcp_path, "r") as f:
                        base_mcp_data = json.load(f)
                        if "mcpServers" in base_mcp_data:
                            mcp_servers.update(base_mcp_data["mcpServers"])
                            logger.info(
                                f"Loaded Global MCP config from {base_mcp_path}"
                            )
                except Exception as e:
                    logger.error(f"Failed to load Global MCP config: {e}")
            else:
                logger.info(f"Global MCP config not found at {base_mcp_path}")

        # --- Apply to Instance and Session ---

        session_config.update(final_data)  # type: ignore
        session_config["_effective_root"] = current_root
        session_config["_use_workspace_only"] = bool(use_workspace_only)

        # Model / performance selection (spec 2026-07-03-configurable-model-
        # performance). Surface as TOP-LEVEL session_config keys (like
        # working_directory) so _refresh_session can add them to sdk_kwargs.
        # Empty / absent / invalid → key left empty → session inherits the
        # Copilot CLI's own default (~/.copilot/settings.json). Validate the
        # enums defensively against a hand-edited config.json.
        _VALID_EFFORTS = {"low", "medium", "high", "xhigh"}
        _VALID_TIERS = {"default", "long_context"}
        _model = ext_prefs.get("model")
        session_config["model"] = _model if isinstance(_model, str) and _model.strip() else ""
        _effort = ext_prefs.get("reasoning_effort")
        if isinstance(_effort, str) and _effort in _VALID_EFFORTS:
            session_config["reasoning_effort"] = _effort
        else:
            if _effort:
                logger.warning(
                    f"Ignoring invalid reasoning_effort {_effort!r}; "
                    f"must be one of {sorted(_VALID_EFFORTS)}."
                )
            session_config["reasoning_effort"] = ""
        _tier = ext_prefs.get("context_tier")
        if isinstance(_tier, str) and _tier in _VALID_TIERS:
            session_config["context_tier"] = _tier
        else:
            if _tier:
                logger.warning(
                    f"Ignoring invalid context_tier {_tier!r}; "
                    f"must be one of {sorted(_VALID_TIERS)}."
                )
            session_config["context_tier"] = ""

        # B. Load Workspace MCP Config (.github/mcp-config.json)
        # This overrides Global tools with the same name
        if self.root_path and os.path.exists(self.root_path):
            ws_mcp_path = os.path.join(self.root_path, ".github", "mcp-config.json")
            if os.path.exists(ws_mcp_path):
                try:
                    with open(ws_mcp_path, "r") as f:
                        ws_mcp_data = json.load(f)
                        if "mcpServers" in ws_mcp_data:
                            # Update (Merge/Override)
                            mcp_servers.update(ws_mcp_data["mcpServers"])
                            logger.info(
                                f"Loaded Workspace MCP config from {ws_mcp_path}"
                            )
                except Exception as e:
                    logger.error(f"Failed to load Workspace MCP config: {e}")

        # Assign merged MCP servers to session config
        # IMPORTANT: SDK reads "mcp_servers" (snake_case) and converts to "mcpServers" on the wire
        if mcp_servers:
            # SDK 0.3.0 renamed MCP `type` values: "local" -> "stdio", "remote" -> "http".
            # The user's mcp.json may still carry the legacy values; the SDK
            # silently accepts them on 0.3.0 but behaviour is undefined.
            # Migrate in-memory only — do NOT mutate the user's config file.
            # See docs/sdk-upgrade-2026-05-0.3.0.md § 7 (B-4).
            _MCP_TYPE_MIGRATION = {"local": "stdio", "remote": "http"}
            remapped = []
            for srv_name, srv_cfg in mcp_servers.items():
                if not isinstance(srv_cfg, dict):
                    continue
                old_type = srv_cfg.get("type")
                if old_type in _MCP_TYPE_MIGRATION:
                    srv_cfg["type"] = _MCP_TYPE_MIGRATION[old_type]
                    remapped.append((srv_name, old_type, srv_cfg["type"]))
            if remapped:
                for srv_name, old_type, new_type in remapped:
                    logger.warning(
                        "MCP server '%s' uses legacy type=%r; remapping "
                        "in-memory to %r. Update your mcp.json to silence "
                        "this warning. See docs/sdk-upgrade-2026-05-0.3.0.md "
                        "(B-4).",
                        srv_name, old_type, new_type,
                    )
            session_config["mcp_servers"] = mcp_servers

        # --- Working Directory ---
        # Always send an absolute cwd. SDK 1.0.5 omits falsey values from the
        # wire; omission would let resume restore stale metadata (often the
        # Native Host install directory). A configured root wins; otherwise
        # use the process cwd as an explicit compatibility fallback.
        working_directory = self.root_path or os.getcwd()
        session_config["working_directory"] = working_directory
        logger.info(f"Set working_directory to: {working_directory}")

        # --- User Prompt (New Architecture: user_prompt.md) ---
        # 1. Path
        user_prompt_path = os.path.join(USER_DATA_DIR, "user_prompt.md")

        # 2. Migration: Check if config has it but file doesn't
        # Access raw extension_preferences from final_data (merged config)
        ext_prefs = final_data.get("extension_preferences", {})
        legacy_prompt = ext_prefs.get("user_prompt")

        if legacy_prompt and not os.path.exists(user_prompt_path):
            try:
                logger.info("Migrating legacy user_prompt to user_prompt.md")
                with open(user_prompt_path, "w", encoding="utf-8") as f:
                    f.write(legacy_prompt)
            except Exception as e:
                logger.error(
                    "Failed to migrate user_prompt: %s",
                    type(e).__name__,
                )

        # 3. Read from File (Source of Truth)
        current_prompt_content = ""
        if os.path.exists(user_prompt_path):
            try:
                with open(user_prompt_path, "r", encoding="utf-8") as f:
                    current_prompt_content = f.read()
            except Exception as e:
                logger.error(
                    "Failed to read user_prompt.md: %s",
                    type(e).__name__,
                )

        # 4. Inject into extension_preferences for Frontend Sync
        if "extension_preferences" not in session_config:
            session_config["extension_preferences"] = {}

        # We force the file content into the config object sent to frontend
        # This overrides whatever might be lingering in config.json
        session_config["extension_preferences"]["user_prompt"] = current_prompt_content

        if include_prompt_status:
            session_config.update(
                self._get_prompt_source_config_fields(
                    current_root,
                    bool(use_workspace_only),
                )
            )

        return session_config

    def _permission_handler(self, request, context) -> PermissionRequestResult:
        """
        Auto-approves permissions to prevent headless hangs.
        Fallback safety net — if pre_tool_use hook doesn't catch it.
        """
        logger.info(f"Permission requested (fallback handler): {request}")
        logger.info("Auto-approving permission request to prevent headless hang.")
        # SDK 1.0.5: PermissionRequestResult is a Union (annotation-only);
        # the concrete approval variant is PermissionDecisionApproveOnce().
        # (0.3.0 used PermissionRequestResult(kind="approve-once"), removed
        # in 1.0.5 — see docs/sdk-upgrade-2026-07-1.0.5.md § 3 B2.)
        return PermissionDecisionApproveOnce()

    @staticmethod
    def _pre_tool_use_hook(hook_input, context) -> PreToolUseHookOutput:
        """
        Auto-approves all tool calls BEFORE they reach the permission request stage.
        This eliminates the permission request overhead entirely, improving speed.
        The _permission_handler above serves as a fallback safety net.
        """
        tool_name = hook_input.get("toolName", "unknown")
        logger.info(f"Pre-tool-use hook: auto-allowing '{tool_name}'")
        return PreToolUseHookOutput(permissionDecision="allow")

    @staticmethod
    def _log_session_observability(session, origin: str) -> None:
        """Observability for SDK 1.0.5 infinite-sessions (on by default).

        DH deliberately rides the new infinite-sessions default rather than
        disabling it: automatic background compaction lets a long, complex
        analysis keep going past the context ceiling instead of failing —
        directly relevant to the C2b-lite long-analysis-timeout work
        (docs/sdk-upgrade-2026-07-1.0.5.md § 4.2). This log makes the
        adoption observable rather than blind: it surfaces the session-state
        workspace path (where compaction checkpoints + persisted state live)
        so beta testing can confirm behaviour and spot runaway disk use.

        Best-effort: never raises. `workspace_path` may be absent on some
        SDK builds; we log its absence rather than crash session creation.
        """
        try:
            workspace_path = getattr(session, "workspace_path", None)
            if workspace_path:
                logger.info(
                    f"[infinite-sessions] {origin} session workspace: {workspace_path}"
                )
            else:
                logger.info(
                    f"[infinite-sessions] {origin} session has no workspace_path "
                    "attribute (infinite sessions may be disabled or unsupported)."
                )
        except Exception as e:
            logger.debug(f"[infinite-sessions] observability log failed: {e}")

    @staticmethod
    def _extract_case_id(case_number: str) -> str | None:
        """Extracts a valid 16-digit case ID from a case number or task ID.

        Valid formats:
        - 16 digits: main case ID (e.g., '2601190030003106')
        - 19 digits: task ID (e.g., '2601190030003106001') -> returns parent case '2601190030003106'

        Returns None if the input doesn't match a valid case/task ID pattern.
        """
        if not case_number or not re.match(r"^\d{16}(\d{3})?$", case_number):
            return None
        # Always return the first 16 digits (parent case ID)
        return case_number[:16]

    @classmethod
    def _case_to_session_id(cls, case_id: str) -> str:
        """Returns the session-name string used for both Copilot SDK
        create_session(session_id=...) and shell-CLI `copilot --resume <name>`.

        Format: a **deterministic UUIDv5** derived from the bare case number:
        `str(uuid.uuid5(_NAMESPACE_MYCASE, case_id))` — e.g. case
        `2601190030003106` → `ce0ec286-26e6-5095-8b30-46143e9f437f`.

        Why UUIDv5 (reverted from `dhco-<case>` on 2026-07-03):
          - **Future-proof against external validation.** The session id is
            passed through to layers DH does not control — notably Microsoft
            Entra AAD, which consumes it as the OAuth `client_session`
            parameter (20-50 chars, `[A-Za-z0-9\\-_.~]`). The AAD incident
            (`AADSTS901001`) proved custom-format names are exposed to such
            constraints; the CLI is "a moving target by design" (AGENTS.md
            § 9.5). A UUID is the format every one of those layers is built
            and tested against, so it eliminates the whole class of custom-
            name validation risk. A 36-char hex UUID is always AAD-legal
            regardless of case-number length (unlike `co-`/`dhco-`, whose
            length was coupled to the case number).
          - **Deterministic → resume with no stored map.** uuid5 hashes
            (namespace, name) → the same case always yields the same id, so
            DH re-derives it on any device and `resume_session` finds the
            existing session. This is exactly why DH used uuid5 pre-B82.

        Cross-repo contract (MyCasesKit B81 RFC): MyCasesKit computes the
        IDENTICAL value independently via the same `_NAMESPACE_MYCASE`
        constant + the **bare** case number (no `dh-`/`co-` prefix, no salt).
        The namespace and input format must stay byte-for-byte identical
        across both repos or the values diverge. MyCasesKit now treats
        `context.md` `session_name:` as an opaque UUID; case identity lives
        in the separate `case_number` field. Authoritative handoff:
        MyCasesKit docs/dh-uuid5-change-spec.md. Golden values are locked in
        host/test_case_id.py::TestCaseToSessionId.test_known_answer.

        History: pre-B82 used uuid5 with a DH-only namespace + `dh-` salt.
        B82 (2026-05-11) switched to `co-<case>` for memorable resume once
        the CLI relaxed its UUID requirement; v2.0.72 patched that to
        `dhco-<case>` for the AAD 20-char floor. This revert drops the custom
        prefix entirely and adopts MyCasesKit's shared namespace so DH and
        MyCasesKit derive one identical uuid5 per case.
        """
        return str(uuid.uuid5(_NAMESPACE_MYCASE, case_id))

    @staticmethod
    def _build_resume_command(session_id: str, root_path: str | None) -> str:
        """Build a CLI resume command anchored to the configured workspace.

        ``-C`` applies the root before CLI workspace discovery, so skills,
        MCP, and instructions load from the configured root even if an older
        session persisted the Native Host process directory as its cwd.
        """
        if root_path:
            # PowerShell single-quoted strings keep $, &, backticks, and
            # parentheses literal. Embedded apostrophes are doubled.
            quoted_root = root_path.replace("'", "''")
            return f"copilot -C '{quoted_root}' --resume={session_id}"
        return f"copilot --resume={session_id}"

    @staticmethod
    def _markdown_code_span(value: str) -> str:
        """Wrap text in a Markdown code span without backtick collisions."""
        longest_run = max((len(run) for run in re.findall(r"`+", value)), default=0)
        fence = "`" * (longest_run + 1)
        return f"{fence}{value}{fence}"

    async def _refresh_session(
        self,
        session_id: str | None = None,
        case_id: str | None = None,
        working_directory_override=_WORKING_DIRECTORY_UNSET,
        session_config: dict | None = None,
        prompt_snapshot: PromptSnapshot | None = None,
    ) -> bool:
        """Re-creates or resumes a Copilot session.

        Args:
            session_id: If provided (the uuid5 session-name string from
                        _case_to_session_id), try to resume first. If resume
                        fails, create a new session with this name for future
                        shell-CLI `copilot --resume <name>` support.
                        If None, create a generic session (no resume capability).
            case_id:    The 16-digit case ID this session belongs to (for tracking).
        """
        # Cleared on every attempt; set in the except blocks so the analyze
        # handler can surface the REAL reason a session failed to create
        # (e.g. an unsupported model/reasoning-effort combo) instead of the
        # generic "session/client not initialized".
        self.last_session_error = None
        self.last_prompt_source_error = None

        try:
            full_config = session_config or self._get_session_config(
                root_path_override=working_directory_override
            )
            self._validate_effective_root(full_config.get("_effective_root"))
            snapshot = prompt_snapshot or self._resolve_prompt_snapshot(
                full_config.get("_effective_root"),
                bool(full_config.get("_use_workspace_only")),
            )
        except PromptSourceError as error:
            logger.error(f"Failed to resolve prompt sources: {error}")
            self.last_prompt_source_error = error
            self.last_session_error = str(error)
            self._invalidate_active_session()
            return False
        except Exception as error:
            logger.error(f"Failed to build session config: {error}")
            self.last_session_error = str(error)
            self._invalidate_active_session()
            return False

        await self._discard_client_if_workspace_changed(
            full_config.get("working_directory")
        )

        if not self.client:
            logger.warning("Client not initialized. Attempting re-initialization...")
            try:
                cli_path = self.find_copilot_cli()
                connection = (
                    RuntimeConnection.for_stdio(path=cli_path)
                    if cli_path
                    else RuntimeConnection.for_stdio()
                )
                client_kwargs = {"connection": connection}
                if full_config.get("working_directory"):
                    client_kwargs["working_directory"] = full_config[
                        "working_directory"
                    ]
                self.client = CopilotClient(**client_kwargs)
                self.client_working_directory = full_config.get(
                    "working_directory"
                )
                await self.client.start()
                logger.info("Client re-initialized successfully.")
            except Exception as e:
                logger.error(f"Client re-initialization failed: {e}")
                self.last_session_error = str(e)
                self._invalidate_active_session(clear_client=True)
                return False

        # Extract only SDK-compatible keyword arguments from the config dict.
        # This prevents passing unknown keys (root_path, extension_preferences, etc.)
        # to the SDK, which now uses strict keyword-only arguments.
        sdk_kwargs = {
            "on_permission_request": self._permission_handler,
            "hooks": {"on_pre_tool_use": self._pre_tool_use_hook},
            "skip_custom_instructions": True,
            "system_message": self._build_system_message(snapshot, session_id),
        }

        # Map config dict keys to SDK keyword arguments
        if "mcp_servers" in full_config:
            sdk_kwargs["mcp_servers"] = full_config["mcp_servers"]
        if "working_directory" in full_config:
            sdk_kwargs["working_directory"] = full_config["working_directory"]
        if "skill_directories" in full_config:
            sdk_kwargs["skill_directories"] = full_config["skill_directories"]

        # Model / performance (spec 2026-07-03-configurable-model-performance).
        # Only pass when set to a non-empty value — empty means "inherit the
        # Copilot CLI's own default from ~/.copilot/settings.json" (the prior
        # behaviour). _get_session_config has already validated the values.
        if full_config.get("model"):
            sdk_kwargs["model"] = full_config["model"]
        if full_config.get("reasoning_effort"):
            sdk_kwargs["reasoning_effort"] = full_config["reasoning_effort"]
        if full_config.get("context_tier"):
            sdk_kwargs["context_tier"] = full_config["context_tier"]

        transport_error = None

        # If a session_id is provided, try to resume an existing session first
        if session_id:
            try:
                self.session = await self.client.resume_session(
                    session_id, **sdk_kwargs
                )
                # After resume, capture the server's session ID
                self.current_session_id = getattr(
                    self.session, "session_id", session_id
                )
                # Track which case this session belongs to
                self.current_case_id = case_id
                self.current_session_root_path = full_config.get(
                    "working_directory"
                )
                self.current_prompt_fingerprint = snapshot.fingerprint
                logger.info(
                    f"Resumed existing session: {session_id} (Server ID: {self.current_session_id})"
                )
                self._log_session_observability(self.session, "resumed")
                return True
            except AttributeError:
                logger.info(
                    "SDK does not support resume_session. Will create new session."
                )
            except (OSError, ProcessExitedError) as e:
                transport_error = e
                logger.warning(
                    f"Session transport failed while resuming {session_id}: {e}. "
                    "Re-initializing client."
                )
            except Exception as e:
                logger.info(
                    f"No existing session to resume ({session_id}): {e}. Creating new session."
                )
                logger.debug(f"Resume traceback: {traceback.format_exc()}")

        try:
            if session_id:
                sdk_kwargs["session_id"] = session_id
            if transport_error is not None:
                raise transport_error

            # Inject the session-name (uuid5 of case) so the server uses it as
            # the session_id; this is what `copilot --resume <name>` later
            # looks up (B82 — see _case_to_session_id docstring).
            # Debug: Log the config keys being sent to create_session
            safe_keys = {k: type(v).__name__ for k, v in sdk_kwargs.items()}
            logger.info(f"create_session config keys: {safe_keys}")

            self.session = await self.client.create_session(**sdk_kwargs)
            # Capture the server-returned session ID
            server_session_id = getattr(self.session, "session_id", None)

            # Verify the server honored our named session ID
            if session_id and server_session_id != session_id:
                logger.warning(
                    f"Server did not honor named session ID. "
                    f"Requested: {session_id}, Got: {server_session_id}. "
                    f"Using server-assigned ID."
                )

            self.current_session_id = server_session_id
            # Keep identity exact. A generic session must never retain a stale
            # case ID from the deterministic session it replaced.
            self.current_case_id = case_id
            self.current_session_root_path = full_config.get("working_directory")
            self.current_prompt_fingerprint = snapshot.fingerprint
            logger.info(
                f"Copilot Session created successfully. "
                    f"Session Name: {self.current_session_id}, Case: {self.current_case_id or 'generic'}"
            )
            self._log_session_observability(self.session, "created")
            return True
        except (OSError, ProcessExitedError) as e:
            logger.warning(
                f"Session transport failed: {e}. "
                "Re-initializing client and retrying..."
            )
            broken_client = self.client
            if broken_client:
                try:
                    await broken_client.stop()
                except Exception as stop_error:
                    logger.warning(
                        f"Failed to stop broken Copilot client cleanly: {stop_error}"
                    )
            self._invalidate_active_session(clear_client=True)
            try:
                cli_path = self.find_copilot_cli()
                reinit_connection = (
                    RuntimeConnection.for_stdio(path=cli_path)
                    if cli_path
                    else RuntimeConnection.for_stdio()
                )
                client_kwargs = {"connection": reinit_connection}
                if full_config.get("working_directory"):
                    client_kwargs["working_directory"] = full_config[
                        "working_directory"
                    ]
                self.client = CopilotClient(**client_kwargs)
                self.client_working_directory = full_config.get(
                    "working_directory"
                )
                await self.client.start()
                logger.info("Client re-initialized after transport failure.")
            except Exception as retry_err:
                logger.error(f"Client re-initialization failed: {retry_err}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                self.last_session_error = str(retry_err)
                self._invalidate_active_session(clear_client=True)
                return False

            try:
                self.session = await self.client.create_session(**sdk_kwargs)
                server_session_id = getattr(self.session, "session_id", None)
                self.current_session_id = server_session_id
                self.current_case_id = case_id
                self.current_session_root_path = full_config.get(
                    "working_directory"
                )
                self.current_prompt_fingerprint = snapshot.fingerprint
                logger.info(
                    f"Copilot Session created successfully (after retry). "
                f"Session Name: {self.current_session_id}, Case: {self.current_case_id or 'generic'}"
                )
                self._log_session_observability(self.session, "created-after-retry")
                return True
            except (OSError, ProcessExitedError) as retry_err:
                logger.error(f"Retry transport failed: {retry_err}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                self.last_session_error = str(retry_err)
                retry_client = self.client
                if retry_client:
                    try:
                        await retry_client.stop()
                    except Exception as stop_error:
                        logger.warning(
                            "Failed to stop retry Copilot client cleanly: "
                            f"{stop_error}"
                        )
                self._invalidate_active_session(clear_client=True)
                return False
            except Exception as retry_err:
                logger.error(f"Retry after re-init also failed: {retry_err}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                self.last_session_error = str(retry_err)
                self._invalidate_active_session()
                return False
        except Exception as e:
            logger.error(f"Failed to create/refresh session: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            self.last_session_error = str(e)
            self._invalidate_active_session()
            return False

    def _resolve_skills(self, directories, base_path):
        """Helper to resolve a list of skill directories relative to a base path."""
        resolved = []
        for path in directories:
            expanded = os.path.expanduser(path)
            if not os.path.isabs(expanded):
                # Resolve relative to the CONFIG FILE location (base_path)
                resolved_path = os.path.abspath(os.path.join(base_path, expanded))
                resolved.append(os.path.normpath(resolved_path))
            else:
                # Normalize path (fix slashes on Windows)
                resolved.append(os.path.normpath(expanded))
        return resolved

    @staticmethod
    def _write_utf8_text(path: str, value: str) -> None:
        with open(path, "w", encoding="utf-8", newline="") as stream:
            stream.write(value)

    def _write_user_config(self, incoming_config: dict) -> dict:
        user_config_path = os.path.join(USER_DATA_DIR, "config.json")
        current_data: dict = {}
        if os.path.exists(user_config_path):
            try:
                with open(user_config_path, "r", encoding="utf-8") as stream:
                    current_data = json.load(stream)
            except (OSError, json.JSONDecodeError):
                current_data = {}

        config_to_write = copy.deepcopy(incoming_config)
        ext_prefs = config_to_write.get("extension_preferences")
        if isinstance(ext_prefs, dict):
            ext_prefs.pop("user_prompt", None)
        current_ext = current_data.get("extension_preferences")
        if isinstance(current_ext, dict):
            current_ext.pop("user_prompt", None)

        if "skill_directories" in config_to_write:
            incoming_skills = config_to_write["skill_directories"]
            workspace_skill = (
                os.path.normpath(
                    os.path.join(self.root_path, ".github", "skills")
                )
                if self.root_path
                else None
            )
            config_to_write["skill_directories"] = [
                skill
                for skill in incoming_skills
                if workspace_skill is None
                or os.path.normpath(skill) != workspace_skill
            ]

        self._encrypt_secrets_before_write(config_to_write)
        current_data.update(config_to_write)
        with open(user_config_path, "w", encoding="utf-8") as stream:
            json.dump(current_data, stream, indent=2)

        saved_ext = current_data.get("extension_preferences", {})
        _apply_log_level(saved_ext.get("log_level", "INFO"))
        try:
            raw_timeout = int(saved_ext.get("analyze_timeout_seconds", 1200))
        except (TypeError, ValueError):
            raw_timeout = 1200
        self.analyze_timeout_seconds = max(60, min(3600, raw_timeout))
        return current_data

    async def handle_update_config(self, payload):
        """Updates configuration files and refreshes the session."""
        if "user_instructions" in payload:
            new_instr = payload["user_instructions"]
        elif "system_instructions" in payload:
            new_instr = payload["system_instructions"]
        else:
            new_instr = None

        new_prompt = payload.get("user_prompt")
        if new_prompt is None:
            incoming_config = payload.get("config", {})
            if isinstance(incoming_config, dict):
                ext = incoming_config.get("extension_preferences", {})
                if isinstance(ext, dict) and "user_prompt" in ext:
                    new_prompt = ext["user_prompt"]

        for field_name, value in (
            ("user_instructions", new_instr),
            ("user_prompt", new_prompt),
        ):
            if value is not None and not isinstance(value, str):
                return {
                    "success": False,
                    "config_saved": False,
                    "error": f"{field_name} must be a string.",
                }

        config_saved = False
        try:
            if "config" in payload:
                incoming_config = payload["config"]
                if not isinstance(incoming_config, dict):
                    raise TypeError("config must be an object")
                # Applies live log level and analyze_timeout_seconds settings.
                self._write_user_config(incoming_config)
            if new_instr is not None:
                self._write_utf8_text(
                    os.path.join(USER_DATA_DIR, "copilot-instructions.md"),
                    new_instr,
                )
            if new_prompt is not None:
                self._write_utf8_text(
                    os.path.join(USER_DATA_DIR, "user_prompt.md"),
                    new_prompt,
                )
            config_saved = True
        except secret_store.EncryptError as error:
            logger.error(
                "Secret encryption failed; configuration was not saved: %s",
                type(error).__name__,
            )
            return {
                "success": False,
                "config_saved": False,
                "error": "Configuration was not saved.",
            }
        except Exception as error:
            logger.error("Configuration write failed: %s", type(error).__name__)
            return {
                "success": False,
                "config_saved": False,
                "error": "Configuration was not saved.",
            }

        # Preserve the current deterministic case. With no active case, defer
        # session creation until the next Analyze supplies an identity.
        if self.current_case_id:
            session_id = self._case_to_session_id(self.current_case_id)
            success = await self._refresh_session(
                session_id=session_id,
                case_id=self.current_case_id,
            )
        else:
            self._invalidate_active_session()
            success = True

        if success:
            return {
                "success": True,
                "config_saved": config_saved,
                "message": "Configuration updated and session refreshed.",
            }

        prompt_error = getattr(self, "last_prompt_source_error", None)
        self._invalidate_active_session()
        if prompt_error:
            return {
                "success": False,
                "config_saved": config_saved,
                "error_code": prompt_error.error_code,
                "error": str(prompt_error),
            }
        return {
            "success": False,
            "config_saved": config_saved,
            "error": "Configuration saved but session refresh failed.",
        }

    def start_input_thread(self):
        """Starts a daemon thread to read stdin without blocking the async loop."""
        t = threading.Thread(target=self._read_stdin_loop, daemon=True)
        t.start()
        logger.info("Input thread started.")

    def _read_stdin_loop(self):
        """Blocking loop that reads Native Messaging format from stdin."""
        while self.running and self.loop:
            try:
                # Read 4 bytes length
                # sys.stdin.buffer.read is blocking
                raw_length = sys.stdin.buffer.read(4)
                if len(raw_length) == 0:
                    logger.info("Stdin closed. Stopping.")
                    self.running = False
                    # Signal the main loop to exit
                    self.loop.call_soon_threadsafe(self.input_queue.put_nowait, None)
                    break

                message_length = struct.unpack("@I", raw_length)[0]
                message_data = sys.stdin.buffer.read(message_length).decode("utf-8")

                if not message_data:
                    continue

                message = json.loads(message_data)
                # Thread-safe put into async queue
                self.loop.call_soon_threadsafe(self.input_queue.put_nowait, message)

            except Exception as e:
                logger.error(f"Error in input thread: {e}")
                self.running = False
                break

    def send_message(self, message_content):
        """Writes a message to stdout in Native Messaging format."""
        try:
            logger.debug(
                "Sending message: requestId=%r status=%r action=%r error=%r error_code=%r data_type=%s",
                message_content.get("requestId"),
                message_content.get("status"),
                message_content.get("action"),
                message_content.get("error"),
                message_content.get("error_code"),
                type(message_content.get("data")).__name__,
            )
            encoded_content = json.dumps(message_content).encode("utf-8")
            encoded_length = struct.pack("@I", len(encoded_content))

            NATIVE_STDOUT.write(encoded_length)
            NATIVE_STDOUT.write(encoded_content)
            NATIVE_STDOUT.flush()
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    def send_progress(self, message):
        """Sends a progress update to the client."""
        if self.current_request_id:
            progress_msg = {
                "requestId": self.current_request_id,
                "status": "progress",
                "data": message,
            }
            self.send_message(progress_msg)

    @staticmethod
    def _classify_list_models_error(e) -> str:
        """Classify a list_models failure for the Options UI (spec § 5).
        'auth'        → GitHub login expired / invalid (user must re-auth)
        'unavailable' → client/CLI not reachable (transient)
        'unknown'     → anything else
        """
        msg = str(e).lower()
        auth_markers = (
            "auth", "401", "403", "unauthorized", "forbidden", "login",
            "token", "credential", "sign in", "sign-in", "not logged in",
        )
        conn_markers = (
            "not started", "not initialized", "connection", "broken pipe",
            "closed", "timeout", "econnrefused", "unavailable", "refused",
        )
        if any(m in msg for m in auth_markers):
            return "auth"
        if any(m in msg for m in conn_markers):
            return "unavailable"
        return "unknown"

    async def handle_list_models(self):
        """Fetch available Copilot models via the SDK for the Options model
        dropdown. Returns a CLASSIFIED error on failure — never a silent
        empty list — so the extension can surface auth/connectivity problems
        (spec 2026-07-03-configurable-model-performance-design.md § 5).

        Returns one of:
          {"status": "success", "data": {"models": [{id, name,
              supported_reasoning_efforts, default_reasoning_effort}, ...]}}
          {"status": "error", "error": <msg>, "errorKind": auth|unavailable|unknown}
        """
        if not self.client:
            return {
                "status": "error",
                "error": "Copilot client not initialized",
                "errorKind": "unavailable",
            }
        try:
            models = await self.client.list_models()
            out = []
            for m in models:
                mid = getattr(m, "id", None)
                if not mid:
                    continue
                efforts = getattr(m, "supported_reasoning_efforts", None) or []
                out.append({
                    "id": mid,
                    "name": getattr(m, "name", None) or mid,
                    "supported_reasoning_efforts": list(efforts),
                    "default_reasoning_effort": getattr(
                        m, "default_reasoning_effort", None
                    ),
                })
            logger.info(f"list_models returned {len(out)} model(s).")
            return {"status": "success", "data": {"models": out}}
        except Exception as e:
            kind = self._classify_list_models_error(e)
            logger.warning(f"list_models failed ({kind}): {e}")
            return {"status": "error", "error": str(e), "errorKind": kind}

    async def handle_analyze_error(self, payload):
        """Uses the Copilot SDK to analyze the error."""
        text = payload.get("text")
        context = payload.get("context", "Unknown")
        product = payload.get("product", "General")
        case_number = payload.get("caseNumber", "Unspecified")
        payload_root_value = payload.get("rootPath")
        try:
            if isinstance(payload_root_value, str) and payload_root_value.strip():
                payload_root_path = self._normalize_root_path(payload_root_value)
                full_config = self._get_session_config(
                    root_path_override=payload_root_path
                )
            else:
                # Missing/empty analyze values can be the extension's
                # pre-hydration default. Config updates are the authoritative
                # way to clear root_path; analyze falls back to host config.
                full_config = self._get_session_config()
                payload_root_path = full_config.get("_effective_root")
            self._validate_effective_root(full_config.get("_effective_root"))
            snapshot = self._resolve_prompt_snapshot(
                full_config.get("_effective_root"),
                bool(full_config.get("_use_workspace_only")),
            )
        except PromptSourceError as error:
            self._invalidate_active_session()
            return error.to_result()
        except ValueError as error:
            self._invalidate_active_session()
            return {"status": "error", "error": str(error)}

        # Diagnostic: log the identifying payload fields so we can correlate
        # cross-tab issues (e.g. Tab B sending stale caseNumber from Tab A).
        # text/error body is intentionally excluded to keep PII out of the log.
        logger.info(
            "analyze payload: caseNumber=%r product=%r context=%r rootPath=%r textLen=%d",
            case_number,
            product,
            context,
            payload_root_path,
            len(text) if isinstance(text, str) else -1,
        )

        # Derive the case-specific session name (uuid5 of case) for cross-CLI
        # --resume — shared byte-for-byte with MyCasesKit via _NAMESPACE_MYCASE
        # (see _case_to_session_id + MyCasesKit docs/dh-uuid5-change-spec.md)
        valid_case_id = self._extract_case_id(case_number)
        session_id = self._case_to_session_id(valid_case_id) if valid_case_id else None

        # Determine if we need to refresh the session:
        # 1. Root path changed (workspace MCP/Skills config may differ)
        # 2. Session name changed (different case)
        needs_refresh = self.session is None or self.client is None

        if self.root_path != payload_root_path:
            logger.info(
                f"Configured root path changed: {self.root_path} -> {payload_root_path}."
            )
            self.root_path = payload_root_path

        desired_session_root = full_config.get("working_directory")
        if getattr(self, "current_session_root_path", None) != desired_session_root:
            logger.info(
                "Session root path changed: %r -> %r.",
                getattr(self, "current_session_root_path", None),
                desired_session_root,
            )
            needs_refresh = True

        if valid_case_id != self.current_case_id:
            logger.info(f"Case changed: {self.current_case_id} -> {valid_case_id}.")
            needs_refresh = True

        if self.current_prompt_fingerprint != snapshot.fingerprint:
            logger.info(
                "Prompt fingerprint changed: %r -> %r.",
                (
                    self.current_prompt_fingerprint[:11]
                    if self.current_prompt_fingerprint
                    else None
                ),
                snapshot.fingerprint[:11],
            )
            needs_refresh = True

        if needs_refresh:
            logger.info(
                f"Refreshing session for: {session_id or 'generic'} (case: {valid_case_id or 'none'})"
            )
            refreshed = await self._refresh_session(
                session_id=session_id,
                case_id=valid_case_id,
                session_config=full_config,
                prompt_snapshot=snapshot,
            )
            if not refreshed:
                detail = getattr(self, "last_session_error", None) or "unknown error"
                prompt_error = getattr(self, "last_prompt_source_error", None)
                self._invalidate_active_session()
                if prompt_error:
                    return prompt_error.to_result()
                return {
                    "status": "error",
                    "error": f"Copilot session refresh failed: {detail}",
                }

        if not text:
            return {"status": "error", "error": "No text provided for analysis."}

        if not self.session or not self.client:
            detail = getattr(self, "last_session_error", None) or ""
            hint = ""
            low = detail.lower()
            if "does not support reasoning effort" in low:
                hint = (
                    " The selected model does not support a reasoning effort. "
                    "Set Reasoning effort back to 'Use CLI default' in Options → "
                    "Model & Performance, or choose a model that supports it."
                )
            elif "does not support" in low:
                hint = " Check your Model / Reasoning effort / Context tier in Options → Model & Performance."
            return {
                "status": "error",
                "error": (f"Copilot session/client not initialized. {detail}{hint}").strip(),
            }

        self.send_progress("Checking authentication...")

        # 1. Fast Fail: Check Authentication Status (with timeout to prevent hangs)
        try:
            auth_status = await asyncio.wait_for(
                self.client.get_auth_status(), timeout=15.0
            )
            # SDK 0.2.0: get_auth_status() returns a GetAuthStatusResponse dataclass
            is_auth = getattr(auth_status, "isAuthenticated", False)
            if not is_auth:
                login_name = getattr(auth_status, "login", "Unknown")
                status_msg = getattr(auth_status, "statusMessage", "Unknown")
                logger.warning("Copilot is not authenticated.")
                return {
                    "status": "error",
                    "error": f"Copilot is not authenticated. Login: {login_name}. Status: {status_msg}. Please run 'copilot auth' in your terminal.",
                }
            logger.info("Authentication check passed.")
        except asyncio.TimeoutError:
            logger.warning("Auth status check timed out after 15s, continuing...")
            self.send_progress("Auth check timed out, continuing...")
        except Exception as e:
            logger.error(f"Failed to check auth status: {e}")
            self.send_progress("Auth check skipped, continuing...")

        try:
            self.send_progress("Preparing prompt...")
            # Scrub PII from text and context
            scrubbed_text = self.scrubber.scrub(text)
            scrubbed_context = self.scrubber.scrub(context) if context else ""

            # Construct the prompt
            prompt = (
                f"{scrubbed_text}\nContext: {scrubbed_context}"
                if scrubbed_context
                else scrubbed_text
            )

            logger.info(f"Sending prompt to Copilot (length: {len(prompt)})")

            self.send_progress("Waiting for Copilot agent...")

            # Accumulate the response
            full_response = ""
            response_event = None

            # Less aggressive sanitization:
            safe_prompt = prompt  # Trusting JSON serialization for now.

            logger.info(f"Prompt length: {len(safe_prompt)}")

            # Timeout Strategy (C2b-lite):
            # User-configurable via Options (extension_preferences
            # .analyze_timeout_seconds, default 1200, clamped [60, 3600]).
            # FAB.tsx applies the same value + 10s grace as its safety
            # timeout so the popover error always comes from THIS branch
            # (truthful message) rather than FAB's generic fallback.
            timeout_seconds = float(self.analyze_timeout_seconds)

            logger.debug(
                f"Calling send_and_wait with prompt length={len(safe_prompt)} and timeout: {timeout_seconds}"
            )
            try:
                # Retry loop to handle stale sessions
                for attempt in range(2):
                    try:
                        if attempt == 0:
                            _mins = max(1, int(timeout_seconds // 60))
                            self.send_progress(
                                f"Copilot is analyzing (max {_mins} min)..."
                            )
                        else:
                            self.send_progress("Session expired. Reconnecting...")

                        response_event = await self.session.send_and_wait(
                            safe_prompt, timeout=timeout_seconds
                        )
                        break  # Success, exit loop
                    except Exception as e:
                        # Check for Session Not Found (JSON-RPC -32603)
                        if (
                            "Session not found" in str(e) or "-32603" in str(e)
                        ) and attempt == 0:
                            logger.warning(
                                f"Session error encountered: {e}. Refreshing session..."
                            )
                            refreshed = await self._refresh_session(
                                session_id=session_id,
                                case_id=valid_case_id,
                                session_config=full_config,
                                prompt_snapshot=snapshot,
                            )
                            if not refreshed:
                                prompt_error = getattr(
                                    self, "last_prompt_source_error", None
                                )
                                detail = self.last_session_error or "unknown error"
                                self._invalidate_active_session()
                                if prompt_error:
                                    return prompt_error.to_result()
                                raise RuntimeError(
                                    f"Copilot session reconnect failed: {detail}"
                                )
                            continue
                        # Re-raise other errors (including TimeoutError) to be handled by outer blocks
                        raise e
                logger.debug(f"Returned from send_and_wait. Event: {response_event}")

                self.send_progress("Processing response...")

                full_response = ""
                # Handle possible "auth_required" or "confirmation_required" events
                if response_event:
                    event_type = getattr(response_event, "type", "unknown")
                    if event_type in [
                        "auth_required",
                        "login_required",
                        "confirmation_required",
                    ]:
                        logger.warning(
                            f"Copilot SDK requires interaction: {event_type}"
                        )
                        return {
                            "status": "error",
                            "error": f"Copilot requires authentication or interaction: {event_type}. Please run 'copilot' in your terminal first to authenticate.",
                        }

                if response_event and response_event.data:
                    # Check for content, but also handle cases where it might be in a different field or the event type is weird
                    if (
                        hasattr(response_event.data, "content")
                        and response_event.data.content
                    ):
                        full_response = response_event.data.content
                    else:
                        # DEBUG: Dump the full event to understand why content is missing
                        # This will help diagnose if it's a refusal, a filter, or a different event type
                        import pprint

                        debug_dump = pprint.pformat(response_event, indent=2)
                        full_response = (
                            f"### Debug: No content received\n\n"
                            f"The Copilot SDK returned an event without standard content. "
                            f"Here is the raw event data for debugging:\n\n"
                            f"```text\n{debug_dump}\n```"
                        )
                        logger.warning(
                            f"Response event data missing content: {response_event}"
                        )
                else:
                    full_response = "No response event received (None)."

            except asyncio.TimeoutError:
                logger.error(
                    f"Copilot request timed out after {timeout_seconds} seconds."
                )
                # Invalidate the session — the subprocess pipe is likely dead
                logger.info("Invalidating session after timeout.")
                self._invalidate_active_session(clear_client=True)
                # Truthful error message (C2b-lite). The previous "waiting
                # for authentication" line was a guess and misled users into
                # re-auth loops; in practice timeouts almost always mean
                # the case was complex enough that Copilot's tool roundtrips
                # exceeded the configured budget. The remediation is to
                # raise the timeout, not to fix auth.
                _mins = max(1, int(timeout_seconds // 60))
                return {
                    "status": "error",
                    "error": (
                        f"Copilot did not finish within the configured "
                        f"{int(timeout_seconds)}s ({_mins} min) timeout. "
                        f"This usually means the case is unusually complex "
                        f"(many tool calls, large prompts). You can raise "
                        f"the limit in Options → Analyze Timeout (max 60 "
                        f"min). If timeouts persist at the max, run "
                        f"'copilot' in a terminal to confirm authentication."
                    ),
                }

            logger.info("Received full response from Copilot.")

            # Determine Save Location
            if self.root_path and os.path.exists(self.root_path):
                safe_case = "".join(
                    c for c in case_number if c.isalnum() or c in ("-", "_")
                ).strip()

                # Strategy 1: Scan filesystem for a folder Copilot already created
                # Copilot uses the filesystem MCP to create product/case folders.
                # We scan root_path for any product subfolder containing this case number
                # to guarantee dh_case_report.md lands in the same directory.
                save_dir = None
                try:
                    for entry in os.listdir(self.root_path):
                        candidate = os.path.join(self.root_path, entry, safe_case)
                        if os.path.isdir(candidate):
                            save_dir = candidate
                            logger.info(f"Found Copilot-created folder: {save_dir}")
                            break
                except OSError as e:
                    logger.warning(f"Error scanning root_path: {e}")

                # Strategy 2 (Fallback): Derive folder name from product string
                if not save_dir:
                    logger.info(
                        "No existing case folder found. Falling back to product name cleanup."
                    )
                    # 1. Handle paths like "Azure / Data / Blob" -> "Blob"
                    clean_product = product
                    if "/" in clean_product:
                        clean_product = clean_product.split("/")[-1]
                    if "\\" in clean_product:
                        clean_product = clean_product.split("\\")[-1]

                    # 2. Remove common verbose prefixes (21Vianet, Mooncake, Microsoft)
                    clean_product = re.sub(
                        r"^(21Vianet\s*China|Mooncake|Microsoft)\s*",
                        "",
                        clean_product,
                        flags=re.IGNORECASE,
                    )

                    # 3. Compact: Remove spaces and keep only alphanumeric
                    safe_product = "".join(c for c in clean_product if c.isalnum())

                    if not safe_product:
                        safe_product = "General"

                    save_dir = os.path.join(self.root_path, safe_product, safe_case)

                os.makedirs(save_dir, exist_ok=True)
                output_file = os.path.join(save_dir, "dh_case_report.md")
            else:
                # Fallback to Downloads
                if os.name == "nt":
                    downloads_path = os.path.join(
                        os.environ["USERPROFILE"], "Downloads"
                    )
                else:
                    downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
                output_file = os.path.join(downloads_path, "dh_error_analysis.md")

            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            with open(output_file, "w", encoding="utf-8") as f:
                f.write(f"# Dynamics Helper - Error Analysis\n\n")
                f.write(f"**Timestamp:** {timestamp}\n")
                f.write(f"**Product:** {product}\n")
                f.write(f"**Case Number:** {case_number}\n")
                if self.current_session_id:
                    f.write(f"**Session Name:** {self.current_session_id}\n")
                f.write(f"\n")
                if self.current_session_id:
                    resume_command = self._build_resume_command(
                        self.current_session_id,
                        self.root_path,
                    )
                    f.write(
                        "> Resume in Copilot CLI: "
                        f"{self._markdown_code_span(resume_command)}\n\n"
                    )
                f.write(f"## Original Error\n{scrubbed_text}\n\n")
                if scrubbed_context:
                    f.write(f"## Context\n{scrubbed_context}\n\n")
                f.write(f"## AI Explanation\n{full_response}\n")

            return {
                "status": "success",
                "data": {
                    "markdown": full_response,
                    "saved_to": output_file,
                    "session_name": self.current_session_id,
                },
            }

        except Exception as e:
            logger.error(f"SDK Error: {e}")
            # Invalidate session on pipe/subprocess errors so next request reconnects
            error_text = str(e).lower()
            if (
                isinstance(e, ProcessExitedError)
                or "invalid argument" in error_text
                or "broken pipe" in error_text
            ):
                logger.info("Invalidating session due to broken pipe/subprocess.")
                dead_client = self.client
                if dead_client:
                    try:
                        await dead_client.stop()
                    except Exception as stop_error:
                        logger.warning(
                            f"Failed to stop dead Copilot client cleanly: {stop_error}"
                        )
                self._invalidate_active_session(clear_client=True)
            return {"status": "error", "error": f"SDK Error: {str(e)}"}

    async def process_message(self, message):
        """Dispatches messages to handlers."""
        action = message.get("action")
        payload = message.get("payload", {})
        request_id = message.get("requestId")

        # Set current request ID for progress updates
        self.current_request_id = request_id

        response = {"requestId": request_id, "status": "success", "data": None}

        try:
            if action == "ping":
                self.send_progress("Pinging...")
                response["data"] = "pong"

            elif action == "health_check":
                self.send_progress("Checking health...")
                # Trigger update check (respects cache timeout)
                if self.loop:
                    self.loop.create_task(self.check_for_updates())

                # The client is the host's initialized SDK boundary. Sessions
                # are created lazily once Analyze provides a case identity.
                if self.client:
                    response["data"] = {
                        "status": "healthy",
                        "message": "Copilot SDK Active",
                        "host_version": VERSION,
                    }
                else:
                    response["data"] = {
                        "status": "error",
                        "message": "SDK not initialized",
                        "host_version": VERSION,
                    }

            elif action == "check_updates":
                if self.loop:
                    self.loop.create_task(self.check_for_updates(force=True))
                response["data"] = "Update check initiated"

            elif action == "analyze_error":
                response["data"] = await self.handle_analyze_error(payload)

            elif action == "update_config":
                self.send_progress("Updating configuration...")
                response["data"] = await self.handle_update_config(payload)

            elif action == "perform_update":
                self.send_progress("Starting update process...")
                url = payload.get("url")
                if not url:
                    response["status"] = "error"
                    response["error"] = "No update URL provided"
                else:
                    try:
                        from updater import Updater

                        upd = Updater(sys.executable)

                        self.send_progress("Downloading update...")
                        if self.loop:
                            zip_path = await self.loop.run_in_executor(
                                None, upd.download_update, url
                            )

                            self.send_progress(
                                "Applying update (this will restart the host)..."
                            )
                            # Apply update (extract and swap)
                            await self.loop.run_in_executor(
                                None, upd.apply_update, zip_path
                            )

                            response["data"] = {
                                "message": "Update applied successfully. Please reload."
                            }
                        else:
                            response["status"] = "error"
                            response["error"] = "Event loop not available"
                    except Exception as e:
                        logger.error(f"Update failed: {e}")
                        response["status"] = "error"
                        response["error"] = str(e)

            elif action == "get_config":
                # Return the effective configuration (merging defaults + user + workspace)
                session_config = self._get_session_config(
                    include_prompt_status=True
                )
                # Cast to dict for JSON serialization
                data = dict(session_config)
                data["host_version"] = VERSION
                response["data"] = data

            elif action == "list_models":
                # Fetch available Copilot models for the Options model dropdown.
                # Classified failure is propagated (never a silent empty list).
                result = await self.handle_list_models()
                if result.get("status") == "error":
                    response["status"] = "error"
                    response["error"] = result.get("error")
                    response["errorKind"] = result.get("errorKind")
                else:
                    response["data"] = result.get("data")

            else:
                response["status"] = "error"
                response["error"] = "unknown_action"
                response["message"] = f"Unknown action: {action}"

        except Exception as e:
            response["status"] = "error"
            response["error"] = "internal_error"
            response["message"] = str(e)

        # Clear current request ID after processing
        self.current_request_id = None
        self.send_message(response)

    async def run(self):
        """Main async loop."""
        self.loop = asyncio.get_running_loop()

        # Use proactor loop on Windows for subprocess support if not already set
        # (Though usually asyncio.run handles this in Py 3.8+)
        logger.debug(f"Using proactor: {self.loop.__class__.__name__}")

        await self.initialize_sdk()
        self.start_input_thread()

        # Start update check in background
        if self.loop:
            self.loop.create_task(self.check_for_updates())

        logger.info("Event loop running. Waiting for messages...")

        while self.running:
            # Wait for next message from the input thread
            message = await self.input_queue.get()

            if message is None:
                logger.info("Received exit signal.")
                break

            await self.process_message(message)


if __name__ == "__main__":
    try:
        log_emergency("Initializing NativeHost class...")
        host = NativeHost()

        log_emergency("Starting asyncio loop...")
        # Standard entry point for asyncio
        asyncio.run(host.run())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        msg = f"Fatal error in main loop: {e}\n{traceback.format_exc()}"
        logger.critical(msg)
        log_emergency(msg)
        sys.exit(1)
