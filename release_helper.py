import argparse
import json
import re
import os
import shutil
import subprocess
import sys

# Configuration
# Run from root of repo
EXT_DIR = os.path.join(os.getcwd(), "extension")
HOST_DIR = os.path.join(os.getcwd(), "host")
PACKAGE_JSON = os.path.join(EXT_DIR, "package.json")
MANIFEST_JSON = os.path.join(EXT_DIR, "manifest.json")
HOST_FILE = os.path.join(HOST_DIR, "dh_native_host.py")
DIST_DIR = os.path.join(EXT_DIR, "dist")


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
    # We look for VERSION = "..." or VERSION='...'
    pattern = r'(VERSION\s*=\s*)(["\'])([^"\']+)(["\'])'

    # Check if we find it first
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

    # Replace group 3 with new version
    new_content = re.sub(pattern, f"\\g<1>\\g<2>{new_version}\\g<4>", content)

    print(f"  Writing {new_version}...")
    with open(file_path, "w") as f:
        f.write(new_content)

    print(f"  Updated {os.path.basename(file_path)}: {old_version} -> {new_version}")


def build_extension():
    print("\n--- Building Extension ---")
    try:
        # Use shell=True for windows to find npm
        subprocess.run("npm run build", cwd=EXT_DIR, check=True, shell=True)
        print("Extension build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Extension build failed: {e}")
        sys.exit(1)


def create_zip(version):
    print("\n--- Creating Release Zip ---")
    zip_name = f"DynamicsHelper_v{version}"
    output_dir = os.path.join(os.getcwd(), "releases")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    output_path = os.path.join(output_dir, zip_name)
    zip_file_path = f"{output_path}.zip"

    # Zip the dist folder
    print(f"Zipping {DIST_DIR} to {zip_file_path}...")
    shutil.make_archive(output_path, "zip", DIST_DIR)
    print(f"Zip created: {zip_file_path}")
    return zip_file_path


def publish_to_github(version, zip_path):
    print(f"\n--- Publishing v{version} to GitHub ---")

    # Check if gh is installed
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
    notes = f"Release {tag}"

    # Command to create release and upload asset
    # gh release create <tag> <files>... --title <title> --notes <notes>
    cmd = f'gh release create {tag} "{zip_path}" --title "{title}" --notes "{notes}"'

    print(f"Executing: {cmd}")
    try:
        subprocess.run(cmd, check=True, shell=True)
        print("GitHub Release created successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Failed to create GitHub Release: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Update version and build Dynamics Helper"
    )
    parser.add_argument("version", help="New version number (e.g., 2.0.4)")
    parser.add_argument("--no-build", action="store_true", help="Skip build step")
    parser.add_argument(
        "--publish", action="store_true", help="Publish release to GitHub using gh CLI"
    )

    args = parser.parse_args()

    print(f"Start Release Process: v{args.version}\n")

    update_json_version(PACKAGE_JSON, args.version)
    update_json_version(MANIFEST_JSON, args.version)
    update_python_version(HOST_FILE, args.version)

    zip_path = None
    if not args.no_build:
        build_extension()
        zip_path = create_zip(args.version)

    if args.publish and zip_path:
        publish_to_github(args.version, zip_path)
    elif args.publish and not zip_path:
        print(
            "Error: Cannot publish without building (missing zip path). Remove --no-build or remove --publish."
        )

    print("\nRelease Process Complete!")


if __name__ == "__main__":
    main()
