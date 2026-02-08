import winreg
import os
import sys
import json
import codecs


def check_registry():
    print("--- Registry Check ---")
    keys = [
        r"Software\Google\Chrome\NativeMessagingHosts\com.dynamics.helper.native",
        r"Software\Microsoft\Edge\NativeMessagingHosts\com.dynamics.helper.native",
    ]

    for subkey in keys:
        print(f"\nChecking HKCU\\{subkey}")
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, subkey, 0, winreg.KEY_READ)
            val, _ = winreg.QueryValueEx(key, "")
            winreg.CloseKey(key)
            print(f"  Value: {val}")

            if not os.path.exists(val):
                print(f"  [FAIL] Manifest file does not exist at this path!")
                try:
                    # check if parent dir exists
                    parent = os.path.dirname(val)
                    if os.path.exists(parent):
                        print(f"    Parent dir exists: {parent}")
                        try:
                            print(f"    Listing parent: {os.listdir(parent)}")
                        except Exception as e:
                            print(f"    Error listing parent: {e}")
                    else:
                        print(f"    Parent dir MISSING: {parent}")
                except:
                    pass
                continue

            print(f"  [PASS] Manifest file exists.")
            check_manifest(val)

        except FileNotFoundError:
            print("  [FAIL] Registry Key not found.")
        except Exception as e:
            print(f"  [ERR] {e}")


def check_manifest(path):
    print(f"  --- Inspecting Manifest: {path} ---")
    try:
        # Check for BOM
        with open(path, "rb") as f:
            raw = f.read(4)
            print(f"    First 4 bytes: {raw}")
            if raw.startswith(codecs.BOM_UTF8):
                print("    [WARN] File has UTF-8 BOM.")

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        print(f"    Content length: {len(content)}")
        try:
            data = json.loads(content)
            print("    [PASS] JSON is valid.")
        except json.JSONDecodeError as e:
            print(f"    [FAIL] JSON Decode Error: {e}")
            return

        exe_path_in_manifest = data.get("path")
        print(f"    'path' in manifest: {exe_path_in_manifest}")

        # Resolve path
        if not os.path.isabs(exe_path_in_manifest):
            manifest_dir = os.path.dirname(path)
            full_exe_path = os.path.join(manifest_dir, exe_path_in_manifest)
            print(f"    Resolved relative path to: {full_exe_path}")
        else:
            full_exe_path = exe_path_in_manifest

        if os.path.exists(full_exe_path):
            print(f"    [PASS] Executable found at: {full_exe_path}")
        else:
            print(f"    [FAIL] Executable NOT found at: {full_exe_path}")

    except Exception as e:
        print(f"    [ERR] Error reading manifest: {e}")


if __name__ == "__main__":
    print(f"Diagnostics started. Python: {sys.version}")
    check_registry()
    print("\n--- Done ---")
