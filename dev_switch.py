import argparse
import os
import winreg
import json
import sys

# Configuration
HOST_NAME = "com.dynamics.helper.native"
ROOT_DIR = os.getcwd()

# DEV Configuration
DEV_HOST_DIR = os.path.join(ROOT_DIR, "host")
DEV_MANIFEST_PATH = os.path.join(DEV_HOST_DIR, "host_manifest.json")

# PROD Configuration
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local"))
PROD_INSTALL_DIR = os.path.join(LOCAL_APPDATA, "DynamicsHelper")
PROD_MANIFEST_PATH = os.path.join(PROD_INSTALL_DIR, "manifest.json")

# Registry Paths
REG_PATHS = [
    f"Software\\Google\\Chrome\\NativeMessagingHosts\\{HOST_NAME}",
    f"Software\\Microsoft\\Edge\\NativeMessagingHosts\\{HOST_NAME}",
]


def set_registry_value(path_str):
    """Sets the registry value for both Chrome and Edge to the given path."""
    print(f"Setting Native Host Manifest to: {path_str}")

    for reg_path in REG_PATHS:
        try:
            # Create/Open Key
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, reg_path)
            # Set Default Value
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, path_str)
            winreg.CloseKey(key)
            print(f"  [OK] HKCU\\{reg_path}")
        except Exception as e:
            print(f"  [ERR] HKCU\\{reg_path}: {e}")


def get_current_registry_value():
    """Reads the current registry value."""
    print("\nCurrent Registry Status:")
    for reg_path in REG_PATHS:
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path, 0, winreg.KEY_READ)
            val, _ = winreg.QueryValueEx(key, "")
            winreg.CloseKey(key)

            status = "UNKNOWN"
            if val == DEV_MANIFEST_PATH:
                status = "DEV"
            elif val == PROD_MANIFEST_PATH:
                status = "PROD"

            print(f"  HKCU\\{reg_path}")
            print(f"    -> {val}")
            print(f"    -> Status: {status}")
        except FileNotFoundError:
            print(f"  HKCU\\{reg_path}: Not Found")
        except Exception as e:
            print(f"  HKCU\\{reg_path}: Error {e}")


def switch_to_dev():
    print("--- Switching to DEV Mode (Source Code) ---")
    if not os.path.exists(DEV_MANIFEST_PATH):
        print(f"Error: Dev manifest not found at {DEV_MANIFEST_PATH}")
        return

    set_registry_value(DEV_MANIFEST_PATH)
    print("\n[SUCCESS] Browser will now launch the Native Host from source code.")
    print("Ensure you have set up the virtual environment in 'host/venv'.")


def switch_to_prod():
    print("--- Switching to PROD Mode (Installed Exe) ---")
    if not os.path.exists(PROD_MANIFEST_PATH):
        print(f"Warning: Prod manifest not found at {PROD_MANIFEST_PATH}")
        print("You may need to run 'install.bat' from a release build first.")
        # We allow setting it anyway, as the user might install next

    set_registry_value(PROD_MANIFEST_PATH)
    print("\n[SUCCESS] Browser will now launch the installed 'dh_native_host.exe'.")


def main():
    parser = argparse.ArgumentParser(
        description="Switch Native Host between Dev (Source) and Prod (Exe) modes."
    )
    parser.add_argument(
        "mode",
        choices=["dev", "prod", "status"],
        help="Mode to switch to",
        nargs="?",
        default="status",
    )

    args = parser.parse_args()

    if args.mode == "dev":
        switch_to_dev()
    elif args.mode == "prod":
        switch_to_prod()

    get_current_registry_value()


if __name__ == "__main__":
    main()
