import os
import sys

if os.name == "nt":
    path = os.path.join(
        os.environ.get("APPDATA", os.path.expanduser("~")), "DynamicsHelper"
    )
else:
    path = os.path.join(os.path.expanduser("~"), ".config", "dynamics_helper")

print(f"Log Path: {path}")
log_file = os.path.join(path, "native_host.log")
if os.path.exists(log_file):
    print("Log file exists.")
    try:
        with open(log_file, "r") as f:
            lines = f.readlines()
            print("--- Last 20 lines of log ---")
            for line in lines[-20:]:
                print(line.strip())
    except Exception as e:
        print(f"Error reading log: {e}")
else:
    print("Log file NOT found.")
