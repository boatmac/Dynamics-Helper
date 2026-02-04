import subprocess
import os

copilot_path = r"c:\Users\zhaobo\AppData\Roaming\Code\User\globalStorage\github.copilot-chat\copilotCli\copilot.BAT"
query = "Title: Case #12345: Solution Import Failed Product: Dynamics 365 Sales Description/Error: Error code: 80040216. An unexpected error occurred. Dependency calculation failed for solution 'SalesPatch_1_0_0_0'. Missing dependency: 'Entity: account' (Id: 70816501-edb9-4740-a16c-6a5efbc05d84) Context: fluent-automation-id"
query = query.replace("\n", " ").replace("\r", "")

command = [
    "cmd",
    "/c",
    copilot_path,
    "--prompt",
    query,
    "--silent",
    "--no-ask-user",
    "--allow-all-tools",
]

print(f"Running command: {command}")

try:
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        shell=False,
        stdin=subprocess.DEVNULL,
        encoding="utf-8",
        errors="replace",
        timeout=30
    )
    print("Return code:", result.returncode)
    print("Stdout:", result.stdout)
    print("Stderr:", result.stderr)
except subprocess.TimeoutExpired:
    print("Timed out!")
except Exception as e:
    print(f"Exception: {e}")
