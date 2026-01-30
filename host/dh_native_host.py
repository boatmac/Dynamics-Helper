import asyncio
import threading
import sys
import struct
import json
import logging
import os
import datetime
import shutil

# Import the SDK from the correct package name we discovered: 'copilot'
from copilot import CopilotClient
from copilot.types import (
    CopilotClientOptions,
    MessageOptions,
    SessionConfig,
    PermissionRequestResult,
)

# Import PII Scrubber
from pii_scrubber import PiiScrubber


# Setup User Data Directory (Cross-platform)
if os.name == "nt":
    USER_DATA_DIR = os.path.join(
        os.environ.get("APPDATA", os.path.expanduser("~")), "DynamicsHelper"
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


class NativeHost:
    def __init__(self):
        self.input_queue = asyncio.Queue()
        self.client = None
        self.session = None
        self.running = True
        self.loop = None
        self.scrubber = PiiScrubber()

        # Log startup location
        logging.info(
            f"Host started. Installation Dir: {os.path.dirname(os.path.abspath(__file__))}"
        )
        logging.info(f"User Data Dir: {USER_DATA_DIR}")

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
        install_dir = os.path.dirname(os.path.abspath(__file__))
        default_config_path = os.path.join(install_dir, "config.json")

        # Determine which config to use (User overrides Default)
        config_path = (
            user_config_path
            if os.path.exists(user_config_path)
            else default_config_path
        )

        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config_data = json.load(f)

                # Handle skill_directories (resolve relative paths)
                if "skill_directories" in config_data:
                    resolved_skills = []
                    for path in config_data["skill_directories"]:
                        if not os.path.isabs(path):
                            # Resolve relative to the CONFIG FILE location
                            resolved_path = os.path.abspath(
                                os.path.join(os.path.dirname(config_path), path)
                            )
                            resolved_skills.append(resolved_path)
                        else:
                            resolved_skills.append(path)
                    config_data["skill_directories"] = resolved_skills

                session_config.update(config_data)  # type: ignore
                logging.info(f"Loaded configuration from {config_path}")
            except Exception as e:
                logging.error(f"Failed to load config.json: {e}")
        else:
            logging.info(
                "No config.json found (checked User and Install dirs). Using default session."
            )

        # Load custom instructions (copilot-instructions.md)
        user_instr_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")
        default_instr_path = os.path.join(install_dir, "copilot-instructions.md")

        instr_path = (
            user_instr_path if os.path.exists(user_instr_path) else default_instr_path
        )

        if os.path.exists(instr_path):
            try:
                with open(instr_path, "r", encoding="utf-8") as f:
                    instructions_content = f.read()

                if instructions_content.strip():
                    # Append instructions to existing system message if configured, or create new one
                    # We use 'append' mode to preserve the CLI's foundation instructions
                    session_config["system_message"] = {
                        "mode": "append",
                        "content": instructions_content,
                    }
                    logging.info(f"Loaded system instructions from {instr_path}")
            except Exception as e:
                logging.error(f"Failed to load instructions from {instr_path}: {e}")

        return session_config

    def _permission_handler(self, request, context) -> PermissionRequestResult:
        """
        Auto-approves permissions to prevent headless hangs.
        Logs the approval for audit.
        """
        logging.info(f"Permission requested: {request}")
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

            self.session = await self.client.create_session(config)
            logging.info("Copilot Session created/refreshed successfully.")
            return True
        except Exception as e:
            logging.error(f"Failed to create/refresh session: {e}")
            self.session = None
            return False

    async def handle_update_config(self, payload):
        """Updates configuration files and refreshes the session."""
        try:
            # 1. Update System Instructions
            if "system_instructions" in payload:
                instr_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")
                with open(instr_path, "w", encoding="utf-8") as f:
                    f.write(payload["system_instructions"])
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

            sys.stdout.buffer.write(encoded_length)
            sys.stdout.buffer.write(encoded_content)
            sys.stdout.buffer.flush()
        except Exception as e:
            logging.error(f"Error sending message: {e}")

    async def handle_analyze_error(self, payload):
        """Uses the Copilot SDK to analyze the error."""
        text = payload.get("text")
        context = payload.get("context", "Unknown")

        if not text:
            return {"error": "No text provided for analysis."}

        if not self.session or not self.client:
            return {"error": "Copilot session/client not initialized."}

        # 1. Fast Fail: Check Authentication Status
        try:
            auth_status = await self.client.get_auth_status()
            if not auth_status.get("isAuthenticated", False):
                logging.warning("Copilot is not authenticated.")
                return {
                    "error": f"Copilot is not authenticated. Login: {auth_status.get('login', 'Unknown')}. Status: {auth_status.get('statusMessage', 'Unknown')}. Please run 'copilot auth' in your terminal."
                }
        except Exception as e:
            logging.error(f"Failed to check auth status: {e}")
            # Continue safely? or fail? Let's try to continue but log it.

        try:
            # Scrub PII from text and context
            scrubbed_text = self.scrubber.scrub(text)
            scrubbed_context = self.scrubber.scrub(context) if context else ""

            prompt = (
                f"{scrubbed_text}\nContext: {scrubbed_context}"
                if scrubbed_context
                else scrubbed_text
            )
            logging.debug(f"Scrubbed Prompt content: {prompt}")
            logging.info(f"Sending prompt to Copilot (length: {len(prompt)})")

            # Accumulate the response
            full_response = ""

            # Sanitize prompt to avoid breaking CLI IPC on Windows
            # Empirical evidence shows double quotes " cause hangs.
            # Single quotes also seem to cause hangs.
            # Newlines cause command injection issues if not handled by JSON-RPC.
            # We replace them with spaces to preserve word boundaries.

            # UPDATE: We are relaxing this. The SDK sends JSON. Newlines should be fine.
            # Flattening the prompt might be confusing the model.
            # We will still escape double quotes just in case the SDK implementation does simple string interpolation (unlikely but safe).

            # safe_prompt = (
            #     prompt.replace('"', " ")
            #     .replace("'", " ")
            #     .replace("\n", " ")
            #     .replace("\r", "")
            # )

            # Less aggressive sanitization:
            safe_prompt = prompt  # Trusting JSON serialization for now.

            logging.info(f"Prompt length: {len(safe_prompt)}")

            # Use send_and_wait (send_messages is not available)
            message_options: MessageOptions = {"prompt": safe_prompt}

            # Timeout Strategy:
            # Frontend (FAB.tsx) has a safety timeout of 310 seconds.
            # We set the backend timeout to 300 seconds (shorter than frontend).
            # This ensures that if the SDK hangs (e.g., waiting for auth/confirmation),
            # we catch it here and return a USEFUL error message to the UI before the frontend
            # just gives up with a generic "Analysis timed out" message.
            timeout_seconds = 300.0

            logging.debug(f"Calling send_and_wait with options: {message_options}")
            try:
                response_event = await self.session.send_and_wait(
                    message_options, timeout=timeout_seconds
                )
                logging.debug(f"Returned from send_and_wait. Event: {response_event}")

                full_response = ""
                # Handle possible "auth_required" or "confirmation_required" events if the SDK supports them
                # Since we don't know the exact SDK event types for auth, we check for "type" field generically
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
                            "error": f"Copilot requires authentication or interaction: {event_type}. Please run 'copilot' in your terminal first to authenticate."
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
                    "error": "Copilot request timed out. This often happens if Copilot is waiting for authentication or approval. Please run 'copilot' in your terminal to verify your login and skill permissions."
                }

            logging.info("Received full response from Copilot.")

            # Save to Downloads (matching old behavior)
            if os.name == "nt":
                downloads_path = os.path.join(os.environ["USERPROFILE"], "Downloads")
            else:
                downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")

            output_file = os.path.join(downloads_path, "dh_error_analysis.md")
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            with open(output_file, "w", encoding="utf-8") as f:
                f.write(f"# Dynamics Helper - Error Analysis\n\n")
                f.write(f"**Timestamp:** {timestamp}\n\n")
                f.write(f"## Original Error\n{text}\n\n")
                if context:
                    f.write(f"## Context\n{context}\n\n")
                f.write(f"## AI Explanation\n{full_response}\n")

            return {"success": True, "markdown": full_response, "saved_to": output_file}

        except Exception as e:
            logging.error(f"SDK Error: {e}")
            return {"error": f"SDK Error: {str(e)}"}

    async def process_message(self, message):
        """Dispatches messages to handlers."""
        action = message.get("action")
        payload = message.get("payload", {})
        request_id = message.get("requestId")

        response = {"requestId": request_id, "status": "success", "data": None}

        try:
            if action == "ping":
                response["data"] = "pong"

            elif action == "health_check":
                # With the SDK, existence of self.client/session implies health
                if self.client and self.session:
                    response["data"] = {
                        "status": "healthy",
                        "message": "Copilot SDK Active",
                    }
                else:
                    response["data"] = {
                        "status": "error",
                        "message": "SDK not initialized",
                    }

            elif action == "analyze_error":
                response["data"] = await self.handle_analyze_error(payload)

            elif action == "update_config":
                response["data"] = await self.handle_update_config(payload)

            else:
                response["status"] = "error"
                response["error"] = "unknown_action"
                response["message"] = f"Unknown action: {action}"

        except Exception as e:
            response["status"] = "error"
            response["error"] = "internal_error"
            response["message"] = str(e)

        self.send_message(response)

    async def run(self):
        """Main async loop."""
        self.loop = asyncio.get_running_loop()

        # Use proactor loop on Windows for subprocess support if not already set
        # (Though usually asyncio.run handles this in Py 3.8+)
        logging.debug(f"Using proactor: {self.loop.__class__.__name__}")

        await self.initialize_sdk()
        self.start_input_thread()

        logging.info("Event loop running. Waiting for messages...")

        while self.running:
            # Wait for next message from the input thread
            message = await self.input_queue.get()

            if message is None:
                logging.info("Received exit signal.")
                break

            await self.process_message(message)


if __name__ == "__main__":
    host = NativeHost()
    try:
        # Standard entry point for asyncio
        asyncio.run(host.run())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logging.critical(f"Fatal error: {e}")
