import sys
import json
import struct
import os
import subprocess
import shutil

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
            return None
        message_length = struct.unpack("@I", raw_length)[0]
        message = sys.stdin.buffer.read(message_length).decode("utf-8")
        return json.loads(message)
    except AttributeError:
        # Fallback for testing outside of native messaging context (if needed)
        return None


def send_message(message_content):
    """
    Send a message to stdout.
    The message is serialized as a 32-bit integer (length) followed by the JSON string.
    """
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
    """
    is_installed, gh_path_or_msg = check_gh_availability()
    if not is_installed:
        return {"error": gh_path_or_msg}

    is_authed, auth_msg = check_gh_auth(gh_path_or_msg)
    if not is_authed:
        return {"error": auth_msg}

    try:
        # Construct the query. We include the context if available.
        query = f"{text}\nContext: {context}" if context else text

        # Security: shell=False is used to prevent injection.
        # Note: 'gh copilot explain' might require the extension to be installed: 'gh extension install github/gh-copilot'
        # We assume standard setup.
        command = [gh_path_or_msg, "copilot", "explain", query]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            shell=False,
            encoding="utf-8",
            errors="replace",
        )

        if result.returncode != 0:
            # gh copilot might write help text or errors to stderr
            return {
                "error": f"AI Error: {result.stderr.strip() or result.stdout.strip()}"
            }

        return {"success": True, "markdown": result.stdout.strip()}

    except Exception as e:
        return {"error": f"Execution Error: {str(e)}"}


def handle_analyze_error(payload):
    text = payload.get("text")
    context = payload.get("context", "Unknown")

    if not text:
        return "Error: No text provided for analysis."

    result = run_gh_copilot(text, context)

    if "error" in result:
        return f"Error: {result['error']}"

    return result["markdown"]


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
    main()
