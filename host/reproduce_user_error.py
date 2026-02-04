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
    # Adjust python path if needed, assuming running from repo root
    python_exe = os.path.join(os.getcwd(), "host", "venv", "Scripts", "python.exe")

    if not os.path.exists(python_exe):
        print(f"Python executable not found at: {python_exe}")
        # Fallback to system python if venv not found (though risky if deps missing)
        python_exe = sys.executable

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
        error_text = "Title: Case #12345: Solution Import Failed Product: Dynamics 365 Sales Description/Error: Error code: 80040216. An unexpected error occurred. Dependency calculation failed for solution SalesPatch_1_0_0_0 . Missing dependency: Entity: account (Id: 70816501-edb9-4740-a16c-6a5efbc05d84)"
        msg = {
            "action": "analyze_error",
            "requestId": "2",
            "payload": {
                "text": error_text,
                "context": "Dynamics 365 Sales - Solution Import"
            },
        }
        msg_json = json.dumps(msg).encode("utf-8")
        proc.stdin.write(struct.pack("@I", len(msg_json)))
        proc.stdin.write(msg_json)
        proc.stdin.flush()

        print("Waiting for Analyze Response (timeout increased)...")
        # Polling read with timeout
        start = time.time()
        # Give it enough time as per dh_native_host.py timeout (180s)
        while time.time() - start < 200:
            if proc.poll() is not None:
                print("Host process exited!")
                break
            
            # Non-blocking peek is hard, so we just check if stdout has data?
            # Actually standard read(4) is blocking. 
            # In a real scenario we'd use select or async, but here we expect a response.
            # We'll just wait a bit and hope output comes.
            
            # WARNING: This blocking read(4) will hang if no data comes.
            # But since we have a timeout in the host, it *should* send something eventually.
            print("Attempting to read 4 bytes (blocking)...")
            raw_len = proc.stdout.read(4)
            if raw_len:
                msg_len = struct.unpack("@I", raw_len)[0]
                data = proc.stdout.read(msg_len)
                print(f"Received: {data.decode('utf-8')}")
                break
            
            time.sleep(1)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Terminating host...")
        proc.terminate()


if __name__ == "__main__":
    main()
