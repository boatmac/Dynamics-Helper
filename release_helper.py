import argparse
import json
import re
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

# Configuration
ROOT_DIR = Path(__file__).resolve().parent
EXT_DIR = ROOT_DIR / "extension"
HOST_DIR = ROOT_DIR / "host"
PACKAGE_JSON = EXT_DIR / "package.json"
MANIFEST_JSON = EXT_DIR / "manifest.json"
HOST_FILE = HOST_DIR / "product_info.py"
EXT_DIST_DIR = EXT_DIR / "dist"
INSTALL_SCRIPT = ROOT_DIR / "installer_core.ps1"
INSTALL_WRAPPER = ROOT_DIR / "install.bat"

_HOST_IMPORT_PATH = HOST_DIR.resolve()
sys.path[:] = [
    entry
    for entry in sys.path
    if Path(entry or os.curdir).resolve() != _HOST_IMPORT_PATH
]
sys.path.insert(0, str(_HOST_IMPORT_PATH))


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


def update_chrome_manifest_version(file_path, new_version):
    """Like update_json_version but split semver-with-prerelease into
    Chrome's numeric `version` + display-only `version_name`.

    Chrome (and Edge) reject `2.0.70-beta` in the manifest's `version`
    field with `Required value 'version' is missing or invalid. It
    must be between 1-4 dot-separated integers each between 0 and
    65536.` See manifest v3 spec.

    Workaround per Chrome docs: keep `version` numeric (drop the
    `-<prerelease>` suffix) and put the full display string in
    `version_name`. Chrome surfaces `version_name` in the UI; updater
    comparisons can still rely on `version` being numeric.
    """
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)

    print(f"Reading {file_path}...")
    with open(file_path, "r") as f:
        data = json.load(f)

    # Split "2.0.70-beta" -> numeric="2.0.70", display="2.0.70-beta"
    # Plain "2.0.70" -> numeric="2.0.70", drop any stale version_name
    numeric = new_version.split("-", 1)[0]
    has_prerelease = "-" in new_version

    old_version = data.get("version")
    old_name = data.get("version_name")
    data["version"] = numeric
    if has_prerelease:
        data["version_name"] = new_version
    elif "version_name" in data:
        # No prerelease in the new version: drop the stale version_name
        del data["version_name"]

    print(f"  Writing version={numeric}, version_name={new_version if has_prerelease else '(none)'}")
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(
        f"  Updated {os.path.basename(file_path)}: "
        f"version {old_version} -> {numeric}"
        + (f", version_name {old_name} -> {new_version}" if has_prerelease else "")
    )


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
    # CRITICAL: must use the venv's pyinstaller, NOT the system one. The venv
    # pins github-copilot-sdk to the supported version (host/requirements.txt);
    # the system Python may have a different SDK version installed and will
    # silently bundle the wrong one, causing ImportError at runtime in user
    # installations. See docs/sdk-upgrade-2026-05-0.3.0.md § 8.1.
    venv_pyinstaller = os.path.join(
        ROOT_DIR, "host", "venv", "Scripts", "pyinstaller.exe"
    )
    if not os.path.exists(venv_pyinstaller):
        print(
            f"ERROR: venv pyinstaller not found at {venv_pyinstaller}\n"
            "Run `& host/venv/Scripts/python.exe -m pip install pyinstaller` "
            "to provision it. Using the system-PATH pyinstaller is unsafe "
            "because it binds to a Python interpreter with possibly the wrong "
            "SDK version (see docs/sdk-upgrade-2026-05-0.3.0.md § 8.1)."
        )
        sys.exit(1)

    try:
        # Sanity-check by asking for --version. argv-list form (no shell=True)
        # avoids quoting issues with the path containing spaces.
        subprocess.run(
            [venv_pyinstaller, "--version"],
            check=True,
            stdout=subprocess.DEVNULL,
        )

        # Build command: pyinstaller --onedir (avoids WDAC temp extraction blocks)
        # Output goes to dist/dh_native_host/ folder with exe + DLLs alongside
        cmd = [
            venv_pyinstaller,
            "--onedir",
            "--clean",
            "-y",
            "--name", "dh_native_host",
            os.path.join("host", "dh_native_host.py"),
        ]
        print(f"Executing: {' '.join(cmd)}")
        subprocess.run(cmd, cwd=ROOT_DIR, check=True)
        print("Host build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Host build failed: {e}")
        sys.exit(1)


def stage_release(source_root: Path, stage_root: Path, version: str) -> Path:
    from package_archive import validate_staged_package
    from package_manifest import generate_release_documents, write_release_documents

    source_root = source_root.resolve(strict=True)
    required = (
        source_root / "extension" / "dist",
        source_root / "dist" / "dh_native_host",
        source_root / "host" / "config.json",
        source_root / "host" / "system_prompt.md",
        source_root / "host" / "register.py",
        source_root / "installer_core.ps1",
        source_root / "install.bat",
    )
    for path in required:
        if not path.exists():
            raise FileNotFoundError(path)
    if stage_root.exists():
        raise FileExistsError(stage_root)
    temporary = stage_root.with_name(f".{stage_root.name}.{uuid.uuid4().hex}.tmp")
    try:
        shutil.copytree(required[0], temporary / "extension")
        shutil.copytree(required[1], temporary / "host")
        for source in required[2:5]:
            shutil.copy2(source, temporary / "host" / source.name)
        for source in required[5:]:
            shutil.copy2(source, temporary / source.name)
        documents = generate_release_documents(temporary, version)
        write_release_documents(temporary, documents)
        validate_staged_package(temporary, expected_version=version)
        os.replace(temporary, stage_root)
        return stage_root
    except Exception:
        shutil.rmtree(temporary, ignore_errors=True)
        raise


def create_zip(
    version: str,
    *,
    source_root: Path | None = None,
    output_dir: Path | None = None,
):
    print("\n--- Creating Release Zip ---")
    from package_archive import write_deterministic_archive

    source = (source_root or ROOT_DIR).resolve(strict=True)
    output = (output_dir or source / "releases").resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"DynamicsHelper_v{version}.zip"
    stage = output / f".DynamicsHelper_v{version}.{uuid.uuid4().hex}.stage"
    try:
        stage_release(source, stage, version)
        write_deterministic_archive(stage, archive)
        print(f"Zip created: {archive}")
        return str(archive)
    finally:
        shutil.rmtree(stage, ignore_errors=True)


def publish_to_github(version, zip_path, prerelease=False, notes_file=None):
    print(f"\n--- Publishing v{version} to GitHub ---")

    try:
        subprocess.run(
            ["gh", "--version"], check=True, stdout=subprocess.DEVNULL
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(
            "Error: 'gh' CLI not found. Please install GitHub CLI to publish releases."
        )
        return

    tag = f"v{version}"
    title = f"v{version}"

    if notes_file:
        # Path was validated for existence at startup (main() guard).
        cmd = [
            "gh", "release", "create", tag, zip_path,
            "--title", title, "--notes-file", notes_file,
        ]
    else:
        notes = (
            f"Release {tag}\n\n"
            "## Installation\n"
            "1. Download and extract the zip file.\n"
            "2. Double-click `install.bat` (Safely bypasses PowerShell restrictions).\n"
            "3. Follow the on-screen instructions."
        )
        # Use argv-list form (NOT shell=True) so the multi-line --notes string
        # cannot swallow the trailing --prerelease flag. Previously
        # `shell=True` with a single f-string command silently dropped
        # --prerelease on Windows; verified by observing isPrerelease=false
        # on the v2.0.70-beta release.
        cmd = [
            "gh", "release", "create", tag, zip_path,
            "--title", title, "--notes", notes,
        ]

    if prerelease:
        cmd.append("--prerelease")

    print(
        f"Executing: {' '.join(cmd[:5])} ... "
        f"(prerelease={prerelease}, notes_file={notes_file})"
    )

    try:
        subprocess.run(cmd, check=True)
        print("GitHub Release created successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Failed to create GitHub Release: {e}")


def clean_releases_folder(release_folder):
    """Delete only build artifacts (*.zip and DynamicsHelper_v* staging dirs).

    Preserves release-notes markdown and any other user-curated files placed
    in releases/. Callers may safely keep `notes-v<version>.md` next to the
    zip without losing it on the next build.

    Previously this function indiscriminately wiped everything under
    release_folder, which forced release notes to live outside the repo
    during the v2.0.70-beta.3 release. Allowlist behaviour fixes that
    papercut (follow-up #10).
    """
    if not os.path.exists(release_folder):
        os.makedirs(release_folder)
        return

    print(f"Cleaning build artifacts in {release_folder}...")
    for item in os.listdir(release_folder):
        item_path = os.path.join(release_folder, item)
        is_zip = os.path.isfile(item_path) and item.lower().endswith(".zip")
        is_staging_dir = (
            os.path.isdir(item_path) and item.startswith("DynamicsHelper_v")
        )
        if not (is_zip or is_staging_dir):
            continue
        try:
            if is_zip:
                os.unlink(item_path)
            else:
                shutil.rmtree(item_path)
        except Exception as e:
            print(f"Failed to delete {item_path}. Reason: {e}")


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
    parser.add_argument(
        "--notes-file",
        help="Path to a markdown file used as the GitHub release body. "
             "Without this flag, falls back to the hardcoded 4-line template.",
    )

    args = parser.parse_args()

    # Fail fast on --notes-file pointing nowhere. Must run BEFORE
    # clean_releases_folder() so a typo cannot trigger pointless cleanup.
    if args.notes_file and not os.path.isfile(args.notes_file):
        print(f"Error: --notes-file '{args.notes_file}' does not exist.")
        sys.exit(1)

    # 0. Clean Releases Folder
    releases_dir = os.path.join(ROOT_DIR, "releases")
    clean_releases_folder(releases_dir)

    print(f"Start Release Process: v{args.version}\n")

    update_json_version(PACKAGE_JSON, args.version)
    update_chrome_manifest_version(MANIFEST_JSON, args.version)
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
        publish_to_github(args.version, zip_path, args.prerelease, args.notes_file)
    elif args.publish and not zip_path:
        print("Error: Cannot publish without building.")

    print("\nRelease Process Complete!")


if __name__ == "__main__":
    main()
