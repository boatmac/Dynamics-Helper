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
    "chrome-extension://fkemelmlolmdnldpofiahmnhngmhonno/",
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

    # Detect if we are in "Prod" (exe exists) or "Dev" (use bat)
    exe_path = os.path.join(script_dir, "dh_native_host.exe")
    bat_path = os.path.join(script_dir, "launch_host.bat")

    if os.path.exists(exe_path):
        # PROD Mode: Use the executable directly (Relative path for portability)
        # Note: If this script is run, we assume the manifest is in the same folder as the exe
        host_path = "dh_native_host.exe"
        print(f"Found executable. Registering: {host_path}")
    else:
        # DEV Mode: Use the batch file wrapper
        host_path = bat_path
        print(f"Executable not found. Registering Dev Script: {host_path}")

    manifest_path = os.path.join(script_dir, "host_manifest.json")
    # In Prod (release zip), the manifest is usually named 'manifest.json' by the installer.
    # But register.py historically uses 'host_manifest.json'.
    # To be safe and compatible with the Extension's expectations in Prod, let's use 'manifest.json' if we found the EXE.
    if os.path.exists(exe_path):
        manifest_path = os.path.join(script_dir, "manifest.json")

    # 2. Write the Native Messaging Manifest file
    # The browser reads this to know how to start the host
    manifest_content = get_host_manifest(host_path)

    # Python defaults to UTF-8 without BOM (perfect for Chrome)
    with open(manifest_path, "w", encoding="utf-8") as f:
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
