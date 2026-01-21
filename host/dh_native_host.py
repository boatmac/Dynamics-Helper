import sys
import json
import struct
import os

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


def handle_analyze_error(payload):
    # Placeholder for Phase 3: Local AI Integration
    return {
        "text": "This is a placeholder response from the Python Native Host.",
        "context": payload.get("context", "Unknown"),
    }


def process_message(message):
    action = message.get("action")
    payload = message.get("payload", {})
    request_id = message.get("requestId")

    response = {"requestId": request_id, "status": "success", "data": None}

    try:
        if action == "ping":
            response["data"] = "pong"
        elif action == "analyze_error":
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
