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
import threading
import struct
import json
import logging
import os
import datetime
import shutil
import time
import re
import traceback
import urllib.request

VERSION = "2.0.42"

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
LOG_FILE = os.path.join(USER_DATA_DIR, "native_host.log")
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


# Global Exception Handler
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    logging.critical(
        "Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback)
    )


sys.excepthook = handle_exception

logging.info("----------------------------------------------------------------")
logging.info(f"Host process started. PID: {os.getpid()}")
logging.info(f"Python Executable: {sys.executable}")

# Import the SDK from the correct package name we discovered: 'copilot'
try:
    log_emergency("Attempting to import copilot SDK...")
    from copilot import CopilotClient
    from copilot.types import (
        CopilotClientOptions,
        MessageOptions,
        SessionConfig,
        PermissionRequestResult,
    )

    logging.info("Successfully imported copilot SDK.")
    log_emergency("Successfully imported copilot SDK.")
except ImportError as e:
    msg = f"Failed to import copilot SDK: {e}\n{traceback.format_exc()}"
    logging.critical(msg)
    log_emergency(msg)
    # We exit here because the app cannot function without it
    sys.exit(1)
except Exception as e:
    msg = f"Unexpected error importing copilot SDK: {e}\n{traceback.format_exc()}"
    logging.critical(msg)
    log_emergency(msg)
    sys.exit(1)

# Import PII Scrubber
try:
    log_emergency("Attempting to import PiiScrubber...")
    from pii_scrubber import PiiScrubber
    import updater  # Import the new updater module

    logging.info("Successfully imported PiiScrubber and Updater.")
    log_emergency("Successfully imported PiiScrubber and Updater.")
except ImportError as e:
    msg = f"Failed to import PiiScrubber or Updater: {e}\n{traceback.format_exc()}"
    logging.critical(msg)
    log_emergency(msg)
    sys.exit(1)


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

        # Log startup location
        logging.info(
            f"Host started. Installation Dir: {os.path.dirname(os.path.abspath(__file__))}"
        )
        logging.info(f"User Data Dir: {USER_DATA_DIR}")

        # Cleanup old version if exists (Atomic Update)
        try:
            from updater import Updater

            Updater.cleanup_old_version(sys.executable)
        except Exception as e:
            logging.error(f"Failed to cleanup old version: {e}")

    async def check_for_updates(self, force=False):
        """Checks for updates from GitHub Releases."""
        try:
            # Rate limit: Check at most once per hour unless forced
            now = time.time()
            if not force and (now - self.last_update_check) < 3600:
                return

            self.last_update_check = now
            url = "https://api.github.com/repos/boatmac/Dynamics-Helper/releases/latest"

            # Run blocking I/O in a thread
            def fetch():
                try:
                    req = urllib.request.Request(
                        url, headers={"User-Agent": "DynamicsHelper-NativeHost"}
                    )
                    with urllib.request.urlopen(req, timeout=10) as response:
                        if response.status == 200:
                            return json.loads(response.read().decode())
                except Exception as e:
                    logging.warning(f"Update check network error: {e}")
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

            if not self.loop:
                return

            tag_name = data.get("tag_name", "").lstrip("v")
            # Basic semver parsing (assumes x.y.z)
            try:
                remote_ver = [int(x) for x in tag_name.split(".")]
                local_ver = [int(x) for x in VERSION.split(".")]

                if remote_ver > local_ver:
                    logging.info(f"Update available: {tag_name}")

                    # Find the .zip asset URL
                    assets = data.get("assets", [])
                    zip_url = None
                    for asset in assets:
                        if asset.get("name", "").endswith(".zip"):
                            zip_url = asset.get("browser_download_url")
                            break

                    final_url = (
                        zip_url
                        if zip_url
                        else data.get(
                            "html_url",
                            "https://github.com/boatmac/Dynamics-Helper/releases/latest",
                        )
                    )

                    self.send_message(
                        {
                            "action": "update_available",
                            "payload": {
                                "version": tag_name,
                                "url": final_url,
                            },
                        }
                    )
                elif force:
                    logging.info(
                        f"No update available (Remote: {tag_name}, Local: {VERSION})"
                    )
                    self.send_message(
                        {
                            "action": "update_not_available",
                            "payload": {"version": VERSION},
                        }
                    )
            except Exception as e:
                logging.warning(f"Version parsing failed: {e}")

        except Exception as e:
            logging.error(f"Failed to check for updates: {e}")
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
                logging.info(f"Found Copilot CLI at npm location: {npm_path_cmd}")
                return npm_path_cmd

        # Fallback to generic 'copilot' in PATH
        copilot_path = shutil.which("copilot")

        if copilot_path:
            logging.info(f"Found Copilot CLI in PATH: {copilot_path}")
            return copilot_path

        return None

    async def initialize_sdk(self):
        """Initializes the Copilot Client and Session."""
        try:
            logging.info("Initializing Copilot Client...")

            cli_path = self.find_copilot_cli()
            options: CopilotClientOptions = {}
            if cli_path:
                options["cli_path"] = cli_path

            self.client = CopilotClient(options if options else None)

            # Explicitly start the client to ensure connection before session creation
            logging.info("Starting Copilot Client...")
            await self.client.start()
            logging.info("Copilot Client started.")

            await self._refresh_session()

        except Exception as e:
            logging.error(f"Failed to initialize SDK: {e}")
            self.session = None  # Ensure it's None on failure

    def _get_session_config(self) -> SessionConfig:
        """Constructs the session configuration from disk."""
        session_config: SessionConfig = {}

        # 1. User-specific config (APPDATA/DynamicsHelper/config.json)
        user_config_path = os.path.join(USER_DATA_DIR, "config.json")

        # 2. Default/bundled config (beside the executable/script)
        if getattr(sys, "frozen", False):
            # PyInstaller OneFile: Look beside the .exe
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

                logging.info(f"Loaded configuration from {path}")
                return data
            except Exception as e:
                logging.error(f"Failed to load config from {path}: {e}")
                return {}

        # --- Load and Merge Configurations ---

        # A. Load Default Config (Base)
        default_data = load_config_file(default_config_path)

        # B. Load User Config (Override)
        if os.path.exists(user_config_path):
            user_data = load_config_file(user_config_path)
        else:
            logging.info(f"User config file not found at: {user_config_path}")
            user_data = {}

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
        use_workspace_only = ext_prefs.get("useWorkspaceOnly", True)
        has_root_path = bool(final_data.get("root_path"))

        # Merge Skill Directories (Additive)
        default_skills = default_data.get("skill_directories", [])
        user_skills = user_data.get("skill_directories", [])

        if use_workspace_only and has_root_path:
            final_data["skill_directories"] = []
            logging.info("Workspace Only Mode: Ignoring global/default skills.")
        else:
            # Combine unique skills
            final_data["skill_directories"] = list(set(default_skills + user_skills))

        # --- MCP SERVER CONFIGURATION (Global + Workspace Merge) ---
        mcp_servers = {}

        # 1. Load Global MCP Config
        # Default to standard location if not set in config
        global_mcp_path_str = final_data.get(
            "mcp_config_path", "~/.copilot/mcp-config.json"
        )
        global_mcp_path = os.path.expanduser(global_mcp_path_str)

        if not (use_workspace_only and has_root_path):
            if os.path.exists(global_mcp_path):
                try:
                    with open(global_mcp_path, "r") as f:
                        global_mcp_data = json.load(f)
                        if "mcpServers" in global_mcp_data:
                            mcp_servers.update(global_mcp_data["mcpServers"])
                            logging.info(
                                f"Loaded Global MCP config from {global_mcp_path}"
                            )
                except Exception as e:
                    logging.error(f"Failed to load Global MCP config: {e}")
            else:
                logging.info(f"Global MCP config not found at {global_mcp_path}")
        else:
            logging.info("Workspace Only Mode: Ignoring global MCP config.")

        # --- Apply to Instance and Session ---

        # Extract root_path for Host use
        if "root_path" in final_data:
            self.root_path = final_data["root_path"]
            # Do NOT delete here, we do it in _refresh_session

        session_config.update(final_data)  # type: ignore

        # 2. Load Workspace MCP Config (.github/mcp-config.json)
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
                            logging.info(
                                f"Loaded Workspace MCP config from {ws_mcp_path}"
                            )
                except Exception as e:
                    logging.error(f"Failed to load Workspace MCP config: {e}")

        # Assign merged MCP servers to session config
        if mcp_servers:
            session_config["mcpServers"] = mcp_servers

        # D. Load Workspace Config (.github/copilot.config.json)
        if self.root_path and os.path.exists(self.root_path):
            ws_config_path = os.path.join(
                self.root_path, ".github", "copilot.config.json"
            )
            if os.path.exists(ws_config_path):
                try:
                    with open(ws_config_path, "r") as f:
                        ws_data = json.load(f)

                    # Resolve workspace skills
                    if "skill_directories" in ws_data:
                        ws_skills = []
                        for path in ws_data["skill_directories"]:
                            if not os.path.isabs(path):
                                ws_skills.append(
                                    os.path.abspath(os.path.join(self.root_path, path))
                                )
                            else:
                                ws_skills.append(path)

                        # Merge skills
                        current_skills = session_config.get("skill_directories", [])
                        session_config["skill_directories"] = list(
                            set(current_skills + ws_skills)
                        )
                        del ws_data["skill_directories"]

                    session_config.update(ws_data)
                    logging.info(f"Loaded workspace config from {ws_config_path}")
                except Exception as e:
                    logging.error(f"Failed to load workspace config: {e}")

        # --- System Instructions (Split Prompt Architecture) ---

        system_instr_path = os.path.join(install_dir, "system_prompt.md")
        # FIX: Revert to using 'copilot-instructions.md' as the standard user file
        # to match user expectations and previous behavior.
        user_instr_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")

        # 2. Load System Instructions (Managed by Installer)
        sys_content = ""
        if os.path.exists(system_instr_path):
            try:
                with open(system_instr_path, "r", encoding="utf-8") as f:
                    sys_content = f.read()
            except Exception as e:
                logging.error(f"Failed to read system instructions: {e}")

        # 3. Load User Instructions (Managed by User)
        user_content = ""
        if os.path.exists(user_instr_path):
            try:
                with open(user_instr_path, "r", encoding="utf-8") as f:
                    user_content = f.read()
            except Exception as e:
                logging.error(f"Failed to read user instructions: {e}")
        else:
            logging.info(f"User instructions file not found at: {user_instr_path}")

        # 4. Combine
        final_content = sys_content
        if user_content.strip():
            final_content += "\n\n" + user_content

        # Apply
        if final_content.strip():
            session_config["system_message"] = {
                "mode": "append",
                "content": final_content,
            }
            logging.info("Loaded system instructions (System + User).")

        # Store raw user content in config for the UI to retrieve
        session_config["_user_instructions_raw"] = user_content

        # 5. Append Workspace Instructions (.github/copilot-instructions.md)
        if self.root_path and os.path.exists(self.root_path):
            ws_instr_path = os.path.join(
                self.root_path, ".github", "copilot-instructions.md"
            )
            if os.path.exists(ws_instr_path):
                try:
                    with open(ws_instr_path, "r", encoding="utf-8") as f:
                        ws_instr_content = f.read()

                    if ws_instr_content.strip():
                        # If system_message already exists, append to it
                        current_msg = session_config.get("system_message", {})

                        previous_content = ""
                        if isinstance(current_msg, dict):
                            previous_content = current_msg.get("content", "")
                        elif isinstance(current_msg, str):
                            previous_content = current_msg

                        new_content = (
                            previous_content + "\n\n" + ws_instr_content
                            if previous_content
                            else ws_instr_content
                        )

                        session_config["system_message"] = {
                            "mode": "append",
                            "content": new_content,
                        }
                        logging.info(
                            f"Loaded workspace instructions from {ws_instr_path}"
                        )
                except Exception as e:
                    logging.error(
                        f"Failed to load workspace instructions from {ws_instr_path}: {e}"
                    )

        return session_config

    def _permission_handler(self, request, context) -> PermissionRequestResult:
        """
        Auto-approves permissions to prevent headless hangs.
        Logs the approval for audit.
        """
        logging.info(f"Permission requested: {request}")
        logging.info("Auto-approving permission request to prevent headless hang.")
        # We can implement finer-grained logic here if needed.
        # For now, allowing execution prevents the 'hanging at prompt' issue.
        return {"kind": "approved"}

    async def _refresh_session(self):
        """Re-creates the Copilot session with current config."""
        if not self.client:
            logging.error("Cannot refresh session: Client not initialized.")
            return False

        try:
            config = self._get_session_config()

            # Register our permission handler to avoid hangs
            config["on_permission_request"] = self._permission_handler

            # Filter out non-SDK config keys (Extension Prefs, root_path)
            # Create a shallow copy for SDK usage to avoid mutating the source of truth
            sdk_config = config.copy()

            # Keys to strip
            keys_to_remove = ["root_path", "extension_preferences"]
            for key in keys_to_remove:
                if key in sdk_config:
                    del sdk_config[key]

            self.session = await self.client.create_session(sdk_config)
            logging.info("Copilot Session created/refreshed successfully.")
            return True
        except Exception as e:
            logging.error(f"Failed to create/refresh session: {e}")
            self.session = None
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

    async def handle_update_config(self, payload):
        """Updates configuration files and refreshes the session."""
        try:
            # 1. Update User Instructions
            # Support both 'user_instructions' (new) and 'system_instructions' (legacy/mapped)
            new_instr = payload.get("user_instructions") or payload.get(
                "system_instructions"
            )

            if new_instr is not None:
                # FIX: Write to 'copilot-instructions.md'
                instr_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")
                with open(instr_path, "w", encoding="utf-8") as f:
                    f.write(new_instr)
                logging.info("Updated copilot-instructions.md")

            # 2. Update Config (Model, etc)
            if "config" in payload:
                user_config_path = os.path.join(USER_DATA_DIR, "config.json")
                # Read existing or empty
                current_data = {}
                if os.path.exists(user_config_path):
                    try:
                        with open(user_config_path, "r") as f:
                            current_data = json.load(f)
                    except:
                        pass  # Start fresh if corrupt

                # --- SANITIZE SKILLS ---
                # The payload contains "effective" skills (User + Default + Workspace).
                # We must NOT save Default or Workspace skills into the User Config.
                if "skill_directories" in payload["config"]:
                    incoming_skills = payload["config"]["skill_directories"]
                    system_skills = set()

                    # A. Resolve Default Config Skills
                    if getattr(sys, "frozen", False):
                        install_dir = os.path.dirname(sys.executable)
                    else:
                        install_dir = os.path.dirname(os.path.abspath(__file__))

                    default_config_path = os.path.join(install_dir, "config.json")
                    if os.path.exists(default_config_path):
                        try:
                            with open(default_config_path, "r") as f:
                                d_data = json.load(f)
                                if "skill_directories" in d_data:
                                    resolved = self._resolve_skills(
                                        d_data["skill_directories"], install_dir
                                    )
                                    system_skills.update(resolved)
                        except Exception as e:
                            logging.warning(
                                f"Failed to load default config for sanitization: {e}"
                            )

                    # B. Resolve Workspace Config Skills
                    if self.root_path and os.path.exists(self.root_path):
                        ws_config_path = os.path.join(
                            self.root_path, ".github", "copilot.config.json"
                        )
                        if os.path.exists(ws_config_path):
                            try:
                                with open(ws_config_path, "r") as f:
                                    ws_data = json.load(f)
                                    if "skill_directories" in ws_data:
                                        # Handle relative paths in workspace config
                                        # Note: .github folder is inside root_path, but relative paths in config are usually relative to config location (.github)
                                        # But let's check how _get_session_config does it.
                                        # It joins self.root_path + path if not absolute.
                                        # Wait, _get_session_config logic for workspace:
                                        # os.path.abspath(os.path.join(self.root_path, path))
                                        # So it assumes paths are relative to ROOT, not .github/

                                        # Let's match that logic here manually because _resolve_skills uses base_path
                                        resolved = []
                                        for p in ws_data["skill_directories"]:
                                            expanded = os.path.expanduser(p)
                                            if not os.path.isabs(expanded):
                                                resolved.append(
                                                    os.path.normpath(
                                                        os.path.abspath(
                                                            os.path.join(
                                                                self.root_path, expanded
                                                            )
                                                        )
                                                    )
                                                )
                                            else:
                                                resolved.append(
                                                    os.path.normpath(expanded)
                                                )
                                        system_skills.update(resolved)
                            except Exception as e:
                                logging.warning(
                                    f"Failed to load workspace config for sanitization: {e}"
                                )

                    # C. Filter Incoming
                    filtered_skills = []
                    for s in incoming_skills:
                        if os.path.normpath(s) not in system_skills:
                            filtered_skills.append(s)

                    logging.info(
                        f"Sanitized skills: {len(incoming_skills)} -> {len(filtered_skills)} (Removed {len(incoming_skills) - len(filtered_skills)} system skills)"
                    )
                    payload["config"]["skill_directories"] = filtered_skills

                # Merge new config
                current_data.update(payload["config"])

                with open(user_config_path, "w") as f:
                    json.dump(current_data, f, indent=2)
                logging.info("Updated config.json")

            # 3. Refresh Session
            success = await self._refresh_session()

            if success:
                return {
                    "success": True,
                    "message": "Configuration updated and session refreshed.",
                }
            else:
                return {"error": "Configuration saved but session refresh failed."}

        except Exception as e:
            logging.error(f"Error updating config: {e}")
            return {"error": str(e)}

    def start_input_thread(self):
        """Starts a daemon thread to read stdin without blocking the async loop."""
        t = threading.Thread(target=self._read_stdin_loop, daemon=True)
        t.start()
        logging.info("Input thread started.")

    def _read_stdin_loop(self):
        """Blocking loop that reads Native Messaging format from stdin."""
        while self.running and self.loop:
            try:
                # Read 4 bytes length
                # sys.stdin.buffer.read is blocking
                raw_length = sys.stdin.buffer.read(4)
                if len(raw_length) == 0:
                    logging.info("Stdin closed. Stopping.")
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
                logging.error(f"Error in input thread: {e}")
                self.running = False
                break

    def send_message(self, message_content):
        """Writes a message to stdout in Native Messaging format."""
        try:
            logging.debug(f"Sending message: {json.dumps(message_content)}")
            encoded_content = json.dumps(message_content).encode("utf-8")
            encoded_length = struct.pack("@I", len(encoded_content))

            NATIVE_STDOUT.write(encoded_length)
            NATIVE_STDOUT.write(encoded_content)
            NATIVE_STDOUT.flush()
        except Exception as e:
            logging.error(f"Error sending message: {e}")

    def send_progress(self, message):
        """Sends a progress update to the client."""
        if self.current_request_id:
            progress_msg = {
                "requestId": self.current_request_id,
                "status": "progress",
                "data": message,
            }
            self.send_message(progress_msg)

    async def handle_analyze_error(self, payload):
        """Uses the Copilot SDK to analyze the error."""
        text = payload.get("text")
        context = payload.get("context", "Unknown")
        product = payload.get("product", "General")
        case_number = payload.get("caseNumber", "Unspecified")
        payload_root_path = payload.get("rootPath")

        # Update root path if provided (syncs frontend setting to backend state)
        if payload_root_path:
            if self.root_path != payload_root_path:
                logging.info(
                    f"Root path changed: {self.root_path} -> {payload_root_path}. Refreshing session."
                )
                self.root_path = payload_root_path
                # Refresh session to pick up new Workspace MCP/Skills config
                await self._refresh_session()
            else:
                self.root_path = payload_root_path

        if not text:
            return {"status": "error", "error": "No text provided for analysis."}

        if not self.session or not self.client:
            return {
                "status": "error",
                "error": "Copilot session/client not initialized.",
            }

        self.send_progress("Checking authentication...")
        time.sleep(0.5)

        # 1. Fast Fail: Check Authentication Status
        try:
            auth_status = await self.client.get_auth_status()
            if not auth_status.get("isAuthenticated", False):
                logging.warning("Copilot is not authenticated.")
                return {
                    "status": "error",
                    "error": f"Copilot is not authenticated. Login: {auth_status.get('login', 'Unknown')}. Status: {auth_status.get('statusMessage', 'Unknown')}. Please run 'copilot auth' in your terminal.",
                }
        except Exception as e:
            logging.error(f"Failed to check auth status: {e}")
            # Continue safely? or fail? Let's try to continue but log it.

        try:
            self.send_progress("Scrubbing PII...")
            time.sleep(0.5)
            # Scrub PII from text and context
            scrubbed_text = self.scrubber.scrub(text)
            scrubbed_context = self.scrubber.scrub(context) if context else ""

            # Construct the prompt
            prompt = (
                f"{scrubbed_text}\nContext: {scrubbed_context}"
                if scrubbed_context
                else scrubbed_text
            )

            logging.debug(f"Scrubbed Prompt content: {prompt}")
            logging.info(f"Sending prompt to Copilot (length: {len(prompt)})")

            self.send_progress("Waiting for Copilot agent...")
            time.sleep(0.5)

            # Accumulate the response
            full_response = ""
            response_event = None

            # Less aggressive sanitization:
            safe_prompt = prompt  # Trusting JSON serialization for now.

            logging.info(f"Prompt length: {len(safe_prompt)}")

            # Use send_and_wait (send_messages is not available)
            message_options: MessageOptions = {"prompt": safe_prompt}

            # Timeout Strategy:
            # Frontend (FAB.tsx) has a safety timeout of 310 seconds.
            # We set the backend timeout to 600 seconds (10 minutes) to be safe.
            timeout_seconds = 600.0

            logging.debug(
                f"Calling send_and_wait with options: {message_options} and timeout: {timeout_seconds}"
            )
            try:
                # Retry loop to handle stale sessions
                for attempt in range(2):
                    try:
                        if attempt == 0:
                            self.send_progress(
                                "Copilot is analyzing (this may take up to 2 mins)..."
                            )
                        else:
                            self.send_progress("Session expired. Reconnecting...")

                        response_event = await self.session.send_and_wait(
                            message_options, timeout=timeout_seconds
                        )
                        break  # Success, exit loop
                    except Exception as e:
                        # Check for Session Not Found (JSON-RPC -32603)
                        if (
                            "Session not found" in str(e) or "-32603" in str(e)
                        ) and attempt == 0:
                            logging.warning(
                                f"Session error encountered: {e}. Refreshing session..."
                            )
                            await self._refresh_session()
                            continue
                        # Re-raise other errors (including TimeoutError) to be handled by outer blocks
                        raise e
                logging.debug(f"Returned from send_and_wait. Event: {response_event}")

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
                        logging.warning(
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
                        logging.warning(
                            f"Response event data missing content: {response_event}"
                        )
                else:
                    full_response = "No response event received (None)."

            except asyncio.TimeoutError:
                logging.error(
                    f"Copilot request timed out after {timeout_seconds} seconds."
                )
                # Return a specific error guiding the user to check authentication/skills
                return {
                    "status": "error",
                    "error": "Copilot request timed out. This often happens if Copilot is waiting for authentication or approval. Please run 'copilot' in your terminal to verify your login and skill permissions.",
                }

            logging.info("Received full response from Copilot.")

            # Determine Save Location
            if self.root_path and os.path.exists(self.root_path):
                # Clean up Product Name
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

                # 3. Compact: Remove spaces and keep only alphanumeric (e.g. "Azure SQL Database" -> "AzureSQLDatabase")
                safe_product = "".join(c for c in clean_product if c.isalnum())

                # Fallback
                if not safe_product:
                    safe_product = "General"

                safe_case = "".join(
                    c for c in case_number if c.isalnum() or c in ("-", "_")
                ).strip()

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
                f.write(f"**Case Number:** {case_number}\n\n")
                f.write(f"## Original Error\n{text}\n\n")
                if context:
                    f.write(f"## Context\n{context}\n\n")
                f.write(f"## AI Explanation\n{full_response}\n")

            return {
                "status": "success",
                "data": {"markdown": full_response, "saved_to": output_file},
            }

        except Exception as e:
            logging.error(f"SDK Error: {e}")
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

                # With the SDK, existence of self.client/session implies health
                if self.client and self.session:
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
                        logging.error(f"Update failed: {e}")
                        response["status"] = "error"
                        response["error"] = str(e)

            elif action == "get_config":
                # Return the effective configuration (merging defaults + user + workspace)
                session_config = self._get_session_config()
                # Cast to dict for JSON serialization
                data = dict(session_config)
                data["host_version"] = VERSION
                response["data"] = data

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
        logging.debug(f"Using proactor: {self.loop.__class__.__name__}")

        await self.initialize_sdk()
        self.start_input_thread()

        # Start update check in background
        if self.loop:
            self.loop.create_task(self.check_for_updates())

        logging.info("Event loop running. Waiting for messages...")

        while self.running:
            # Wait for next message from the input thread
            message = await self.input_queue.get()

            if message is None:
                logging.info("Received exit signal.")
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
        logging.critical(msg)
        log_emergency(msg)
        sys.exit(1)
