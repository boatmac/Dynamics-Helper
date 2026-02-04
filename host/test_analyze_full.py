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
    proc.stdin.write(struct.pack("@I", len(json_msg)))
    proc.stdin.write(json_msg)
    proc.stdin.flush()


def read_message(proc):
    """Reads and decodes a message from the host process."""
    raw_len = proc.stdout.read(4)
    if not raw_len:
        return None
    msg_len = struct.unpack("@I", raw_len)[0]
    content = proc.stdout.read(msg_len).decode("utf-8")
    return json.loads(content)


def test_full_integration():
    print(f"--- Starting Full Integration Test ---")

    cmd = [sys.executable, "-u", HOST_SCRIPT]
    try:
        proc = subprocess.Popen(
            cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr
        )
    except Exception as e:
        print(f"Failed to start host: {e}")
        return

    # Simulate the exact payload from extension/src/components/FAB.tsx
    # Based on the error in test_page.html

    scraped_title = "Case #12345: Solution Import Failed"
    scraped_product = "Dynamics 365 Sales"
    scraped_error = "Error code: 80040216. An unexpected error occurred. Dependency calculation failed for solution 'SalesPatch_1_0_0_0'. Missing dependency: 'Entity: account' (Id: 70816501-edb9-4740-a16c-6a5efbc05d84)"

    full_context_string = f"""
Title: {scraped_title}
Product: {scraped_product}
Description/Error: {scraped_error}
    """.strip()

    request = {
        "action": "analyze_error",
        "requestId": "integration-test-001",
        "payload": {
            "text": full_context_string,
            "context": "fluent-automation-id",  # simulated source
        },
    }

    print(f"Sending Mock Extension Payload:\n---\n{request['payload']['text']}\n---")

    send_message(proc, request)

    print("\nWaiting for AI response...")
    response = read_message(proc)

    if response:
        print("\n--- Response Received ---")
        if response.get("status") == "success":
            print(f"Status: SUCCESS")
            print(f"Markdown Output:\n{response.get('data')}")
        else:
            print(f"Status: FAILED")
            print(f"Error: {response.get('error')}")
            print(f"Message: {response.get('message')}")
    else:
        print("No response received.")

    proc.terminate()


if __name__ == "__main__":
    test_full_integration()
