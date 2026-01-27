import sys
import json
import struct
import subprocess
import os
import time


def send_message(proc, message):
    """Send a message to the native host in the Chrome native messaging format."""
    msg_json = json.dumps(message)
    msg_bytes = msg_json.encode("utf-8")
    header = struct.pack("@I", len(msg_bytes))
    proc.stdin.write(header)
    proc.stdin.write(msg_bytes)
    proc.stdin.flush()


def read_message(proc):
    """Read a message from the native host."""
    raw_length = proc.stdout.read(4)
    if len(raw_length) == 0:
        return None
    length = struct.unpack("@I", raw_length)[0]
    content = proc.stdout.read(length).decode("utf-8")
    return json.loads(content)


def main():
    # Path to the batch file that launches the host
    host_script = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "start_dhnativehost.bat"
    )

    print(f"Testing Native Host at: {host_script}")

    # Start the host process
    try:
        proc = subprocess.Popen(
            [host_script],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=sys.stderr,  # Pass stderr through
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
    except FileNotFoundError:
        print("Error: start_dhnativehost.bat not found. Run install.bat first.")
        return

    print("Host started. Sending 'ping'...")

    # 1. Test Ping
    send_message(proc, {"action": "ping", "requestId": "test-1"})
    response = read_message(proc)
    print(f"Ping Response: {response}")

    if response and response.get("data") == "pong":
        print("[PASS] Ping Test Passed")
    else:
        print("[FAIL] Ping Test Failed")

    # 2. Test Health Check (SDK Initialization)
    print("\nSending 'health_check'...")
    send_message(proc, {"action": "health_check", "requestId": "test-2"})

    # Give it a moment to initialize SDK if needed
    response = read_message(proc)
    print(f"Health Check Response: {response}")

    if response and response.get("data", {}).get("status") == "healthy":
        print("[PASS] SDK Health Check Passed")
    else:
        print(
            "[WARN] SDK Health Check Failed (Expected if Copilot CLI is not configured)"
        )

    # 3. Test Error Analysis (Dry Run / Mock)
    # We won't expect a real AI response without a valid CLI session, but we check if it handles the message.
    print("\nSending 'analyze_error' (Dry Run)...")
    payload = {
        "text": "Error: ConnectionRefusedError: [WinError 10061] No connection could be made",
        "context": "User clicked 'Submit' on the login form.",
    }
    send_message(
        proc, {"action": "analyze_error", "payload": payload, "requestId": "test-3"}
    )

    # This might take longer or fail if no CLI, so we just wait for *any* response
    response = read_message(proc)
    print(f"Analyze Response: {response}")

    # Close
    proc.terminate()


if __name__ == "__main__":
    main()
