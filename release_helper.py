import argparse
import json
import re
import os
import shutil
import subprocess
import sys

# Configuration
# Run from root of repo
ROOT_DIR = os.getcwd()
EXT_DIR = os.path.join(ROOT_DIR, "extension")
HOST_DIR = os.path.join(ROOT_DIR, "host")
PACKAGE_JSON = os.path.join(EXT_DIR, "package.json")
MANIFEST_JSON = os.path.join(EXT_DIR, "manifest.json")
HOST_FILE = os.path.join(HOST_DIR, "dh_native_host.py")
EXT_DIST_DIR = os.path.join(EXT_DIR, "dist")
INSTALL_SCRIPT = os.path.join(ROOT_DIR, "installer_core.ps1")
INSTALL_WRAPPER = os.path.join(ROOT_DIR, "install.bat")


def update_json_version(file_path, new_version):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)

    print(f"Reading {file_path}...")
    with open(file_path, "r") as f:
        data = json.load(f)

    old_version = data.get("version")
    if old_version == new_version:
        print(f"  Version already {new_version} in {os.path.basename(file_path)}")
        return

    data["version"] = new_version

    print(f"  Writing {new_version}...")
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")  # Ensure newline at EOF

    print(f"  Updated {os.path.basename(file_path)}: {old_version} -> {new_version}")


def update_python_version(file_path, new_version):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)

    print(f"Reading {file_path}...")
    with open(file_path, "r") as f:
        content = f.read()

    # Regex to find VERSION = "x.y.z"
    pattern = r'(VERSION\s*=\s*)(["\'])([^"\']+)(["\'])'

    match = re.search(pattern, content)
    if not match:
        print(
            f"Warning: Could not find VERSION constant in {os.path.basename(file_path)}"
        )
        return

    old_version = match.group(3)
    if old_version == new_version:
        print(f"  Version already {new_version} in {os.path.basename(file_path)}")
        return

    new_content = re.sub(pattern, f"\\g<1>\\g<2>{new_version}\\g<4>", content)

    print(f"  Writing {new_version}...")
    with open(file_path, "w") as f:
        f.write(new_content)

    print(f"  Updated {os.path.basename(file_path)}: {old_version} -> {new_version}")


def build_extension():
    print("\n--- Building Extension ---")
    try:
        subprocess.run("npm run build", cwd=EXT_DIR, check=True, shell=True)
        print("Extension build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Extension build failed: {e}")
        sys.exit(1)


def build_host():
    print("\n--- Building Native Host ---")
    try:
        # Check for pyinstaller
        subprocess.run(
            "pyinstaller --version", check=True, shell=True, stdout=subprocess.DEVNULL
        )

        # Build command: pyinstaller --onefile --name dh_native_host host/dh_native_host.py
        # We run from root, so path is host/dh_native_host.py
        cmd = (
            "pyinstaller --onefile --clean --name dh_native_host host/dh_native_host.py"
        )
        print(f"Executing: {cmd}")
        subprocess.run(cmd, cwd=ROOT_DIR, check=True, shell=True)
        print("Host build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Host build failed: {e}")
        sys.exit(1)


def create_zip(version):
    print("\n--- Creating Release Zip ---")
    zip_name = f"DynamicsHelper_v{version}"
    output_dir = os.path.join(ROOT_DIR, "releases")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Temporary staging directory for zip content
    stage_dir = os.path.join(output_dir, "temp_stage")
    if os.path.exists(stage_dir):
        shutil.rmtree(stage_dir)
    os.makedirs(stage_dir)

    # 1. Copy Extension (dist -> extension)
    print("Copying Extension...")
    shutil.copytree(EXT_DIST_DIR, os.path.join(stage_dir, "extension"))

    # 2. Copy Host (dist/dh_native_host.exe -> host/)
    print("Copying Host...")
    host_stage_dir = os.path.join(stage_dir, "host")
    os.makedirs(host_stage_dir)

    # PyInstaller output is in dist/dh_native_host.exe (relative to where we ran it)
    # We ran from ROOT, so output is ROOT/dist/dh_native_host.exe
    host_exe_src = os.path.join(ROOT_DIR, "dist", "dh_native_host.exe")
    if not os.path.exists(host_exe_src):
        print(f"Error: Host executable not found at {host_exe_src}")
        sys.exit(1)

    shutil.copy2(host_exe_src, host_stage_dir)

    # Copy other host files (config.json, system_prompt.md, register.py)
    # They are in host/ source folder
    shutil.copy2(os.path.join(HOST_DIR, "config.json"), host_stage_dir)
    shutil.copy2(os.path.join(HOST_DIR, "system_prompt.md"), host_stage_dir)
    shutil.copy2(os.path.join(HOST_DIR, "register.py"), host_stage_dir)

    # 3. Copy Installer Script
    print("Copying Installer...")
    shutil.copy2(INSTALL_SCRIPT, stage_dir)
    shutil.copy2(INSTALL_WRAPPER, stage_dir)

    # 4. Zip it up
    zip_file_base = os.path.join(output_dir, zip_name)
    print(f"Zipping to {zip_file_base}.zip...")
    shutil.make_archive(zip_file_base, "zip", stage_dir)

    # Cleanup
    shutil.rmtree(stage_dir)

    zip_file_path = f"{zip_file_base}.zip"
    print(f"Zip created: {zip_file_path}")
    return zip_file_path


def publish_to_github(version, zip_path, prerelease=False):
    print(f"\n--- Publishing v{version} to GitHub ---")

    try:
        subprocess.run(
            "gh --version", check=True, shell=True, stdout=subprocess.DEVNULL
        )
    except subprocess.CalledProcessError:
        print(
            "Error: 'gh' CLI not found. Please install GitHub CLI to publish releases."
        )
        return

    tag = f"v{version}"
    title = f"v{version}"
    notes = f"Release {tag}\n\n## Installation\n1. Download and extract the zip file.\n2. Double-click `install.bat` (Safely bypasses PowerShell restrictions).\n3. Follow the on-screen instructions."

    prerelease_flag = "--prerelease" if prerelease else ""
    cmd = f'gh release create {tag} "{zip_path}" --title "{title}" --notes "{notes}" {prerelease_flag}'

    print(f"Executing: {cmd}")

    try:
        subprocess.run(cmd, check=True, shell=True)
        print("GitHub Release created successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Failed to create GitHub Release: {e}")


def clean_releases_folder(release_folder):
    """
    Cleans up the releases/ folder by deleting old zip files and folders.
    Keeps the release folder itself.
    """
    if os.path.exists(release_folder):
        print(f"Cleaning up {release_folder}...")
        for item in os.listdir(release_folder):
            item_path = os.path.join(release_folder, item)
            try:
                if os.path.isfile(item_path) or os.path.islink(item_path):
                    os.unlink(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            except Exception as e:
                print(f"Failed to delete {item_path}. Reason: {e}")
    else:
        os.makedirs(release_folder)


def main():
    parser = argparse.ArgumentParser(
        description="Update version and build Dynamics Helper"
    )
    parser.add_argument("version", help="New version number (e.g., 2.0.4)")
    parser.add_argument("--no-build", action="store_true", help="Skip build step")
    parser.add_argument(
        "--publish", action="store_true", help="Publish release to GitHub using gh CLI"
    )
    parser.add_argument(
        "--prerelease", action="store_true", help="Mark as pre-release on GitHub"
    )

    args = parser.parse_args()

    # 0. Clean Releases Folder
    releases_dir = os.path.join(ROOT_DIR, "releases")
    clean_releases_folder(releases_dir)

    print(f"Start Release Process: v{args.version}\n")

    update_json_version(PACKAGE_JSON, args.version)
    update_json_version(MANIFEST_JSON, args.version)
    update_python_version(HOST_FILE, args.version)

    # Git Commit and Tag
    if not args.no_build:  # usually we want to commit if we are building a release
        try:
            print("\n--- Git Operations ---")
            subprocess.run(["git", "add", "."], check=True)

            # Check if there are changes to commit
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                check=True,
            )

            if status_result.stdout.strip():
                commit_msg = f"chore: release v{args.version}"
                subprocess.run(["git", "commit", "-m", commit_msg], check=True)
                print(f"Committed: {commit_msg}")
            else:
                print("Nothing to commit. Proceeding to tag...")

            # Check if tag exists locally
            tag_check = subprocess.run(
                ["git", "tag", "-l", f"v{args.version}"], capture_output=True, text=True
            )

            if f"v{args.version}" not in tag_check.stdout:
                subprocess.run(["git", "tag", f"v{args.version}"], check=True)
                print(f"Tagged: v{args.version}")
            else:
                print(f"Tag v{args.version} already exists. Skipping.")

            if args.publish:
                print("Pushing changes and tags...")
                subprocess.run(["git", "push"], check=True)
                subprocess.run(["git", "push", "--tags"], check=True)

        except subprocess.CalledProcessError as e:
            print(f"Git operation failed: {e}")
            if input("Continue anyway? (y/n) ").lower() != "y":
                sys.exit(1)

    zip_path = None
    if not args.no_build:
        build_extension()
        build_host()  # Build the Python Host too!
        zip_path = create_zip(args.version)

    if args.publish and zip_path:
        publish_to_github(args.version, zip_path, args.prerelease)
    elif args.publish and not zip_path:
        print("Error: Cannot publish without building.")

    print("\nRelease Process Complete!")


if __name__ == "__main__":
    main()
