import os
import sys
import json
import winreg
import platform

HOST_NAME = "com.dynamics.helper.native"
# IMPORTANT: Update these IDs with your actual Extension ID
# Go to chrome://extensions/ to find the ID of the loaded "Dynamics Helper" extension
ALLOWED_ORIGINS = [
    "chrome-extension://aiimcjfjmibedicmckpphgbddankgdln/",
]


def get_host_manifest(host_path):
    return {
        "name": HOST_NAME,
        "description": "Dynamics Helper Native Host",
        "path": host_path,
        "type": "stdio",
        "allowed_origins": ALLOWED_ORIGINS,
    }


def install_host():
    # 1. Determine paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    batch_file_path = os.path.join(script_dir, "start_dhnativehost.bat")
    manifest_path = os.path.join(script_dir, "host_manifest.json")

    # 2. Write the Native Messaging Manifest file
    # The browser reads this to know how to start the host
    manifest_content = get_host_manifest(batch_file_path)
    with open(manifest_path, "w") as f:
        json.dump(manifest_content, f, indent=2)
    print(f"Created manifest at: {manifest_path}")

    # 3. Register with Chrome and Edge
    # Windows Registry locations
    registry_locations = [
        (winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\NativeMessagingHosts"),
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Edge\NativeMessagingHosts"),
    ]

    for hkey, subkey in registry_locations:
        try:
            # Create/Open the key for our host
            host_key_path = f"{subkey}\\{HOST_NAME}"
            key = winreg.CreateKey(hkey, host_key_path)

            # Set the default value to the path of the manifest file
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, manifest_path)
            winreg.CloseKey(key)
            print(f"Registered {HOST_NAME} at {host_key_path}")
        except Exception as e:
            print(f"Failed to register at {subkey}: {e}")


if __name__ == "__main__":
    if platform.system() != "Windows":
        print("This script is designed for Windows.")
        sys.exit(1)

    print(f"Installing {HOST_NAME}...")
    install_host()
    print("Installation complete.")
