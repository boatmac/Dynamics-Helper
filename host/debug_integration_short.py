import struct
import json
import sys
import subprocess
import os
import time
import threading


def read_stream(stream, prefix):
    for line in iter(stream.readline, b""):
        print(f"[{prefix}] {line.decode('utf-8').strip()}")


def main():
    host_script = os.path.join(os.getcwd(), "host", "dh_native_host.py")
    python_exe = os.path.join(os.getcwd(), "host", "venv", "Scripts", "python.exe")

    print(f"Starting host: {python_exe} {host_script}")
    proc = subprocess.Popen(
        [python_exe, "-u", host_script],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
    )

    # Read stderr in a separate thread to see logs
    t = threading.Thread(
        target=read_stream, args=(proc.stderr, "HOST_STDERR"), daemon=True
    )
    t.start()

    try:
        time.sleep(2)  # Wait for startup

        # 1. Health Check
        print("Sending Health Check...")
        msg = {"action": "health_check", "requestId": "1"}
        msg_json = json.dumps(msg).encode("utf-8")
        proc.stdin.write(struct.pack("@I", len(msg_json)))
        proc.stdin.write(msg_json)
        proc.stdin.flush()

        # Read response
        print("Reading Health Response...")
        raw_len = proc.stdout.read(4)
        if raw_len:
            msg_len = struct.unpack("@I", raw_len)[0]
            data = proc.stdout.read(msg_len)
            print(f"Received: {data.decode('utf-8')}")
        else:
            print("No response for health check")

        # 2. Analyze
        print("Sending Analyze Request...")
        msg = {
            "action": "analyze_error",
            "requestId": "2",
            "payload": {"text": "Simple test error", "context": "test"},
        }
        msg_json = json.dumps(msg).encode("utf-8")
        proc.stdin.write(struct.pack("@I", len(msg_json)))
        proc.stdin.write(msg_json)
        proc.stdin.flush()

        print("Waiting for Analyze Response (max 30s)...")
        # Polling read with timeout
        start = time.time()
        while time.time() - start < 30:
            if proc.poll() is not None:
                print("Host process exited!")
                break
            # Since we can't peek easily in Python without blocking on Windows pipes,
            # we'll just try a blocking read for the length prefix.
            # If the host hangs, we hang here.
            # But we have the stderr thread running to show us what's happening.
            print("Attempting to read 4 bytes...")
            raw_len = proc.stdout.read(4)
            if raw_len:
                msg_len = struct.unpack("@I", raw_len)[0]
                data = proc.stdout.read(msg_len)
                print(f"Received: {data.decode('utf-8')}")
                break
            time.sleep(0.1)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Terminating host...")
        proc.terminate()


if __name__ == "__main__":
    main()
