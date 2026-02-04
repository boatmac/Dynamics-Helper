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

    # Drain ping responses until success
    while True:
        msg = read_message(proc)
        print(f"Ping Response: {msg}")
        if msg.get("requestId") == "1" and msg.get("status") == "success":
            break

    # 2. Analyze (Scenario A: Simple - Connection Refused)
    print("\n2. Sending Analyze Request (Scenario A: Simple)...")
    payload_a = {
        "text": "Error: ConnectionRefusedError: [WinError 10061] No connection could be made because the target machine actively refused it",
        "context": "User attempting to connect to local SQL server.",
    }

    start_time_a = time.time()
    send_message(
        proc, {"action": "analyze_error", "payload": payload_a, "requestId": "2"}
    )

    print("Waiting for AI response (Scenario A)...")

    # Drain analyze responses for A
    while True:
        response = read_message(proc)
        if response is None:
            print("Process closed unexpectedly during Scenario A")
            break

        if response.get("requestId") == "2":
            if response.get("status") == "progress":
                print(f"Progress A: {response.get('data')}")
            else:
                duration_a = time.time() - start_time_a
                print(f"Analyze Final Response Status A: {response.get('status')}")
                print(f"Duration A: {duration_a:.2f}s")
                data = response.get("data")
                if isinstance(data, dict) and data.get("markdown"):
                    print("Markdown content received successfully.")
                else:
                    print(f"Full Response A: {response}")
                break
        elif response.get("status") == "error":
            print(f"Error received: {response}")
            break

    # 3. Analyze (Scenario B: Complex - Check Emails)
    print("\n3. Sending Analyze Request (Scenario B: Complex - 'Check emails')...")
    payload_b = {
        "text": "Error: ConnectionRefusedError. Please check emails for similar issues.",
        "context": "User asking to look up history.",
    }

    start_time_b = time.time()
    send_message(
        proc, {"action": "analyze_error", "payload": payload_b, "requestId": "3"}
    )

    print("Waiting for AI response (Scenario B)...")

    # Drain analyze responses for B
    while True:
        response = read_message(proc)
        if response is None:
            print("Process closed unexpectedly during Scenario B")
            break

        if response.get("requestId") == "3":
            if response.get("status") == "progress":
                print(f"Progress B: {response.get('data')}")
            else:
                duration_b = time.time() - start_time_b
                print(f"Analyze Final Response Status B: {response.get('status')}")
                print(f"Duration B: {duration_b:.2f}s")
                data = response.get("data")
                if isinstance(data, dict) and data.get("markdown"):
                    print("Markdown content received successfully.")
                else:
                    print(f"Full Response B: {response}")
                break
        elif response.get("status") == "error":
            print(f"Error received: {response}")
            break

    proc.terminate()


if __name__ == "__main__":
    main()
