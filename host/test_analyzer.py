import struct
import json
import subprocess
import sys
import os

# Path to the host script
HOST_SCRIPT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "dh_native_host.py"
)


def send_message(proc, data):
    """Encodes and sends a message to the host process."""
    json_msg = json.dumps(data).encode("utf-8")
    # Write 4-byte length (little-endian)
    proc.stdin.write(struct.pack("@I", len(json_msg)))
    proc.stdin.write(json_msg)
    proc.stdin.flush()


def read_message(proc):
    """Reads and decodes a message from the host process."""
    # Read 4-byte length
    raw_len = proc.stdout.read(4)
    if not raw_len:
        return None
    msg_len = struct.unpack("@I", raw_len)[0]
    # Read the JSON content
    content = proc.stdout.read(msg_len).decode("utf-8")
    return json.loads(content)


def test_analyzer():
    print(f"--- Starting Analyzer Test ---")

    # Start the host process
    # We use the same python executable that is running this script
    cmd = [sys.executable, "-u", HOST_SCRIPT]

    try:
        proc = subprocess.Popen(
            cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr
        )
    except Exception as e:
        print(f"Failed to start host: {e}")
        return

    # Simulate an "analyze_error" request
    # We'll use a simple Python error as a test case
    request = {
        "action": "analyze_error",
        "requestId": "test-123",
        "payload": {
            "text": "TypeError: can only concatenate str (not 'int') to str",
            "context": "Python script line 42",
        },
    }

    print(f"Sending Request: {request['payload']['text']}")
    send_message(proc, request)

    print(
        "Waiting for response (this calls 'gh copilot explain', so it might take a few seconds)..."
    )
    response = read_message(proc)

    if response:
        print("\n--- Response Received ---")
        print(json.dumps(response, indent=2))
    else:
        print("No response received.")

    # Clean up
    proc.terminate()


if __name__ == "__main__":
    test_analyzer()
