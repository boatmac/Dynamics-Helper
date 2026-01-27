import sys
import json
import struct
import subprocess
import os
import time


def send_message(proc, message):
    msg_json = json.dumps(message)
    msg_bytes = msg_json.encode("utf-8")
    header = struct.pack("@I", len(msg_bytes))
    proc.stdin.write(header)
    proc.stdin.write(msg_bytes)
    proc.stdin.flush()


def read_message(proc):
    raw_length = proc.stdout.read(4)
    if len(raw_length) == 0:
        return None
    length = struct.unpack("@I", raw_length)[0]
    content = proc.stdout.read(length).decode("utf-8")
    return json.loads(content)


def main():
    host_script = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "start_dhnativehost.bat"
    )

    print(f"Starting host: {host_script}")
    proc = subprocess.Popen(
        [host_script],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )

    # 1. Ping
    print("1. Sending Ping...")
    send_message(proc, {"action": "ping", "requestId": "1"})
    print(f"Ping Response: {read_message(proc)}")

    # 2. Analyze
    print("\n2. Sending Analyze Request...")
    payload = {
        "text": "Error: ConnectionRefusedError: [WinError 10061] No connection could be made because the target machine actively refused it",
        "context": "User attempting to connect to local SQL server.",
    }
    send_message(
        proc, {"action": "analyze_error", "payload": payload, "requestId": "2"}
    )

    print("Waiting for AI response (this may take a few seconds)...")
    # Read response
    response = read_message(proc)
    print(f"Analyze Response Status: {response.get('status')}")
    if response.get("data", {}).get("markdown"):
        print("Markdown content received successfully.")
        print(f"Snippet: {response['data']['markdown'][:100]}...")
    else:
        print(f"Full Response: {response}")

    proc.terminate()


if __name__ == "__main__":
    main()
