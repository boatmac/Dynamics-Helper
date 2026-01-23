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


def reproduce_issue():
    print(f"--- Starting Reproduction with User Input ---")

    cmd = [sys.executable, "-u", HOST_SCRIPT]
    try:
        proc = subprocess.Popen(
            cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr
        )
    except Exception as e:
        print(f"Failed to start host: {e}")
        return

    # User provided input
    scraped_title = "My Open CasesOpen popup to change view."
    scraped_product = "N/A"
    scraped_error = "My Open CasesOpen popup to change view."
    
    full_context_string = f"""
Title: {scraped_title}
Product: {scraped_product}
Description/Error: {scraped_error}
    """.strip()

    request = {
        "action": "analyze_error",
        "requestId": "repro-001",
        "payload": {
            "text": full_context_string,
            "context": "ticket-title-fallback", 
        },
    }

    print(f"Sending Payload:\n---\n{request['payload']['text']}\nWith Context: {request['payload']['context']}\n---")

    send_message(proc, request)

    print("\nWaiting for AI response...")
    response = read_message(proc)

    if response:
        print("\n--- Response Received ---")
        print(json.dumps(response, indent=2))
        
        if response.get("status") == "success":
             data = response.get("data", {})
             if isinstance(data, dict) and "markdown" in data:
                 print(f"\nMarkdown Content:\n{data['markdown']}")
    else:
        print("No response received.")

    proc.terminate()


if __name__ == "__main__":
    reproduce_issue()
