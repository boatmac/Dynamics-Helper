import sys
import json
import struct
import os
import subprocess
import shutil
import logging

# Setup basic file logging
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug.log")
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Native messaging definition
# https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging


def get_message():
    """
    Read a message from stdin.
    The message is serialized as a 32-bit integer (length) followed by the JSON string.
    """
    try:
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            logging.info("Stdin closed (0 bytes read for length)")
            return None
        message_length = struct.unpack("@I", raw_length)[0]
        message = sys.stdin.buffer.read(message_length).decode("utf-8")
        logging.debug(f"Received message: {message}")
        return json.loads(message)
    except AttributeError:
        # Fallback for testing outside of native messaging context (if needed)
        logging.error("AttributeError reading stdin (testing mode?)")
        return None
    except Exception as e:
        logging.error(f"Error reading message: {e}")
        return None


def send_message(message_content):
    """
    Send a message to stdout.
    The message is serialized as a 32-bit integer (length) followed by the JSON string.
    """
    logging.debug(f"Sending message: {json.dumps(message_content)}")
    encoded_content = json.dumps(message_content).encode("utf-8")

    encoded_length = struct.pack("@I", len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()


def check_gh_availability():
    """
    Checks if 'gh' CLI is installed and in PATH.
    """
    gh_path = shutil.which("gh")
    if not gh_path:
        return (
            False,
            "GitHub CLI ('gh') not found in PATH. Please install it: https://cli.github.com/",
        )
    return True, gh_path


def check_gh_auth(gh_path):
    """
    Checks if 'gh' CLI is authenticated.
    """
    try:
        # 'gh auth status' returns 0 if logged in, non-zero otherwise.
        # It prints to stderr/stdout, so we capture it to keep the native host protocol clean.
        result = subprocess.run(
            [gh_path, "auth", "status"], capture_output=True, text=True, shell=False
        )
        if result.returncode == 0:
            return True, "Authenticated"
        else:
            return (
                False,
                "GitHub CLI is not authenticated. Please run 'gh auth login' in your terminal.",
            )
    except Exception as e:
        return False, f"Failed to check auth status: {str(e)}"


def run_gh_copilot(text, context):
    """
    Runs 'gh copilot explain' with the provided error text.
    Fallback: If 'gh copilot' is deprecated, tries the new standalone 'copilot' CLI.
    """

    # 1. Try finding the new standalone 'copilot' CLI first (preferred if installed via npm/system)
    copilot_path = shutil.which("copilot")
    if copilot_path:
        logging.info(f"Found standalone Copilot CLI at: {copilot_path}")
        try:
            # Construct the query
            query = f"{text}\nContext: {context}" if context else text

            # Sanitize query for command line execution (newlines break cmd/batch args)
            # Also escape double quotes to avoid breaking the --prompt "..." argument
            query = query.replace("\n", " ").replace("\r", "").replace('"', '\\"')

            # Use the new CLI syntax: copilot --prompt "..." --silent
            # We explicitly use 'cmd /c' on Windows to avoid issues with .cmd/.bat execution via subprocess
            if os.name == "nt" and (
                copilot_path.lower().endswith(".cmd")
                or copilot_path.lower().endswith(".bat")
            ):
                command = [
                    "cmd",
                    "/c",
                    copilot_path,
                    "--prompt",
                    query,
                    "--silent",
                    "--no-ask-user",
                    "--allow-all-tools",
                ]
            else:
                command = [
                    copilot_path,
                    "--prompt",
                    query,
                    "--silent",
                    "--no-ask-user",
                    "--allow-all-tools",
                ]

            # On Windows, we might need to invoke it via shell=True if it's a batch file
            # but shutil.which returned the .cmd/.bat. However, subprocess usually handles .cmd fine
            # if we pass the full path. Let's try shell=False first for security.
            # CRITICAL: Set stdin=subprocess.DEVNULL to prevent the subprocess from interfering
            # with the Native Messaging stdin pipe (which causes hangs).

            # Note: We use shell=False even with 'cmd /c' because we are invoking cmd explicitly as the executable.

            logging.info(f"Running command: {command}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                shell=False,
                stdin=subprocess.DEVNULL,
                encoding="utf-8",
                errors="replace",
            )

            logging.info(f"Command stdout: {result.stdout}")
            logging.info(f"Command stderr: {result.stderr}")
            logging.info(f"Command return code: {result.returncode}")

            if result.returncode == 0:
                # 3. Save the explanation to a file in a user-accessible location
                # We'll put it in the "Downloads" folder or similar to make it easy to find.
                # For now, let's use the user's Downloads directory.
                if os.name == "nt":
                    downloads_path = os.path.join(
                        os.environ["USERPROFILE"], "Downloads"
                    )
                else:
                    downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")

                output_file = os.path.join(downloads_path, "dh_error_analysis.md")

                # Timestamp for the file content
                import datetime

                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(f"# Dynamics Helper - Error Analysis\n\n")
                    f.write(f"**Timestamp:** {timestamp}\n\n")
                    f.write(f"## Original Error\n{text}\n\n")
                    if context:
                        f.write(f"## Context\n{context}\n\n")
                    f.write(f"## AI Explanation\n{result.stdout.strip()}\n")

                # Return success with the path to the saved file
                return {
                    "success": True,
                    "markdown": result.stdout.strip(),
                    "saved_to": output_file,
                }
            else:
                logging.warning(f"Standalone Copilot CLI failed: {result.stderr}")
                # Fall through to try 'gh copilot' as backup?
                # Or return error? Let's return error because if they have the new CLI, they likely intend to use it.
                return {
                    "error": f"Copilot CLI Error: {result.stderr.strip() or result.stdout.strip()}"
                }

        except Exception as e:
            logging.error(f"Error running standalone Copilot CLI: {e}")
            # Fall through to 'gh copilot' logic below

    # 2. Fallback to 'gh copilot' (Legacy/Deprecated)
    is_installed, gh_path_or_msg = check_gh_availability()
    if not is_installed:
        return {"error": gh_path_or_msg}

    is_authed, auth_msg = check_gh_auth(gh_path_or_msg)
    if not is_authed:
        return {"error": auth_msg}

    try:
        # Construct the query. We include the context if available.
        # The new GitHub Copilot CLI uses a different command structure:
        # 'gh copilot explain "<query>"' is now handled by the 'gh-copilot' extension which is deprecated.
        # However, for this project we must rely on what is installed.
        #
        # Note: If the user has the NEW 'github/copilot-cli' installed, the command might be different.
        # But 'gh copilot explain' was the standard for the extension.
        #
        # Given the deprecation message, we might need to fallback or check for the new CLI.
        # For now, we will stick to the 'gh copilot explain' command as implemented,
        # but be aware it might return the deprecation notice as "success" (stdout).

        query = f"{text}\nContext: {context}" if context else text

        # Security: shell=False is used to prevent injection.
        command = [gh_path_or_msg, "copilot", "explain", query]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            shell=False,
            encoding="utf-8",
            errors="replace",
        )

        # Check for deprecation message in stdout
        if "The gh-copilot extension has been deprecated" in result.stdout:
            return {
                "error": "The installed 'gh-copilot' extension is deprecated. Please install the new GitHub Copilot CLI (npm install -g @githubnext/github-copilot-cli) or check for updates."
            }

        # 3. Save the explanation to a file in a user-accessible location
        # We'll put it in the "Downloads" folder or similar to make it easy to find.
        # For now, let's use the user's Downloads directory.
        if os.name == "nt":
            downloads_path = os.path.join(os.environ["USERPROFILE"], "Downloads")
        else:
            downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")

        output_file = os.path.join(downloads_path, "dh_error_analysis.md")

        # Timestamp for the file content
        import datetime

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"# Dynamics Helper - Error Analysis\n\n")
            f.write(f"**Timestamp:** {timestamp}\n\n")
            f.write(f"## Original Error\n{text}\n\n")
            if context:
                f.write(f"## Context\n{context}\n\n")
            f.write(f"## AI Explanation\n{result.stdout.strip()}\n")

        # Return success with the path to the saved file
        return {
            "success": True,
            "markdown": result.stdout.strip(),
            "saved_to": output_file,
        }

    except Exception as e:
        return {"error": f"Execution Error: {str(e)}"}


def handle_analyze_error(payload):
    text = payload.get("text")
    context = payload.get("context", "Unknown")

    if not text:
        return {"error": "No text provided for analysis."}

    result = run_gh_copilot(text, context)

    # Return the full result (which includes 'success', 'markdown', 'saved_to', or 'error')
    return result


def handle_health_check():
    is_installed, gh_msg = check_gh_availability()
    if not is_installed:
        return {"status": "missing", "message": gh_msg}

    is_authed, auth_msg = check_gh_auth(gh_msg)
    if not is_authed:
        return {"status": "unauthenticated", "message": auth_msg}

    return {"status": "healthy", "message": "GitHub CLI is ready."}


def process_message(message):
    action = message.get("action")
    payload = message.get("payload", {})
    request_id = message.get("requestId")

    response = {"requestId": request_id, "status": "success", "data": None}

    try:
        if action == "ping":
            response["data"] = "pong"
        elif action == "health_check":
            response["data"] = handle_health_check()
        elif action == "analyze_error":
            # This might take a few seconds, which is fine for native messaging
            # as long as the browser keeps the port open.
            response["data"] = handle_analyze_error(payload)
        else:
            response["status"] = "error"
            response["error"] = "unknown_action"
            response["message"] = f"Unknown action: {action}"
    except Exception as e:
        response["status"] = "error"
        response["error"] = "internal_error"
        response["message"] = str(e)

    return response


def main():
    while True:
        try:
            message = get_message()
            if message is None:
                break

            response = process_message(message)
            send_message(response)
        except Exception as e:
            # In case of catastrophic failure, try to send an error message
            # but usually stdin/stdout closure ends the loop
            break


if __name__ == "__main__":
    logging.info("Host process started")
    main()
