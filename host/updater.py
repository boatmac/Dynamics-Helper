import os
import shutil
import logging
import zipfile
import urllib.request
import tempfile
import sys
import time


class Updater:
    def __init__(self, current_exe_path):
        self.current_exe = os.path.abspath(current_exe_path)
        self.host_dir = os.path.dirname(self.current_exe)

        # Logic to determine extension directory
        # Prod Layout: extension/ is a sibling of the executable (in DynamicsHelper folder)
        prod_ext = os.path.join(self.host_dir, "extension")

        # Dev Layout: extension/ is in the parent directory (sibling of host folder)
        dev_ext = os.path.join(os.path.dirname(self.host_dir), "extension")

        # Default to Prod layout unless Dev exists and Prod doesn't
        if os.path.exists(dev_ext) and not os.path.exists(prod_ext):
            self.extension_dir = dev_ext
        else:
            self.extension_dir = prod_ext

    def download_update(self, url):
        """Downloads the update zip to a temporary file."""
        logging.info(f"Downloading update from {url}...")
        try:
            # Create a temp file
            fd, temp_path = tempfile.mkstemp(suffix=".zip")
            os.close(fd)

            # Download
            req = urllib.request.Request(
                url, headers={"User-Agent": "DynamicsHelper-Updater"}
            )
            with urllib.request.urlopen(req) as response:
                with open(temp_path, "wb") as f:
                    shutil.copyfileobj(response, f)

            logging.info(f"Download complete: {temp_path}")
            return temp_path
        except Exception as e:
            logging.error(f"Download failed: {e}")
            raise

    def apply_update(self, zip_path):
        """Extracts zip and swaps files."""
        logging.info("Applying update...")
        temp_extract_dir = tempfile.mkdtemp()

        try:
            # 1. Extract Zip
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(temp_extract_dir)

            # 2. Validate Structure
            new_ext_src = os.path.join(temp_extract_dir, "extension")
            # In the release zip, the host is inside a 'host' folder
            new_host_src = os.path.join(temp_extract_dir, "host", "dh_native_host.exe")

            if not os.path.exists(new_ext_src):
                # Try finding it if the zip structure is different (e.g. root/extension)
                # But our release_helper creates: extension/ and host/ at root of zip
                raise Exception("Update zip missing 'extension' folder")

            if not os.path.exists(new_host_src):
                raise Exception("Update zip missing 'host/dh_native_host.exe'")

            # 3. Update Extension Files
            logging.info(f"Updating extension files in {self.extension_dir}...")
            if os.path.exists(self.extension_dir):
                self._overwrite_directory(new_ext_src, self.extension_dir)
            else:
                shutil.copytree(new_ext_src, self.extension_dir)

            # 4. Swap Host Binary
            logging.info("Swapping host binary...")
            self._swap_host_binary(new_host_src)

            # 5. Update Config & Instructions (Safe Mode)
            logging.info("Updating configuration files...")

            # system_prompt.md: Always Overwrite (No backup needed as it's system managed)
            new_instr_src = os.path.join(temp_extract_dir, "host", "system_prompt.md")
            dest_instr = os.path.join(self.host_dir, "system_prompt.md")

            if os.path.exists(new_instr_src):
                try:
                    shutil.copy2(new_instr_src, dest_instr)
                    logging.info("Updated system_prompt.md")
                except Exception as e:
                    logging.error(f"Failed to update system_prompt.md: {e}")

            # config.json: Create Only (Do not overwrite user settings)
            new_config_src = os.path.join(temp_extract_dir, "host", "config.json")
            dest_config = os.path.join(self.host_dir, "config.json")

            if os.path.exists(new_config_src) and not os.path.exists(dest_config):
                try:
                    shutil.copy2(new_config_src, dest_config)
                    logging.info("Created default config.json")
                except Exception as e:
                    logging.error(f"Failed to create config.json: {e}")

            return True

        except Exception as e:
            logging.error(f"Update failed: {e}")
            raise
        finally:
            # Cleanup temp extract
            shutil.rmtree(temp_extract_dir, ignore_errors=True)
            if os.path.exists(zip_path):
                os.remove(zip_path)

    def _overwrite_directory(self, src, dst):
        """Recursively copies files from src to dst, overwriting existing."""
        os.makedirs(dst, exist_ok=True)
        for item in os.listdir(src):
            s = os.path.join(src, item)
            d = os.path.join(dst, item)
            if os.path.isdir(s):
                self._overwrite_directory(s, d)
            else:
                shutil.copy2(s, d)

    def _swap_host_binary(self, new_exe_source):
        """
        Renames current exe to .old and moves new exe to current location.
        This works on Windows even if the executable is running.
        """
        # If we are running as a script (during dev), we can't swap the exe
        if not self.current_exe.endswith(".exe"):
            logging.warning("Not running as executable. Skipping binary swap.")
            return

        # 1. Rename running exe -> .old
        old_exe = self.current_exe + ".old"
        if os.path.exists(old_exe):
            try:
                os.remove(old_exe)
            except OSError:
                logging.warning(f"Could not remove existing {old_exe}")

        try:
            os.rename(self.current_exe, old_exe)
        except OSError as e:
            raise Exception(f"Failed to rename current executable: {e}")

        # 2. Move new exe -> current exe
        try:
            shutil.move(new_exe_source, self.current_exe)
        except OSError as e:
            # Attempt Rollback
            try:
                os.rename(old_exe, self.current_exe)
            except:
                pass
            raise Exception(f"Failed to move new executable: {e}")

    @staticmethod
    def cleanup_old_version(current_exe_path):
        """Deletes .old file if it exists and cleans up legacy backups."""
        if not current_exe_path.endswith(".exe"):
            return

        # 1. Cleanup Binary
        old_exe = current_exe_path + ".old"
        if os.path.exists(old_exe):
            try:
                os.remove(old_exe)
                logging.info(f"Cleaned up old version: {old_exe}")
            except Exception as e:
                logging.debug(f"Could not clean up old version (might be locked?): {e}")

        # 2. Cleanup System Prompt Backups (Legacy)
        host_dir = os.path.dirname(current_exe_path)
        try:
            for item in os.listdir(host_dir):
                if item.startswith("system_prompt.md.") and item.endswith(".bak"):
                    bak_path = os.path.join(host_dir, item)
                    try:
                        os.remove(bak_path)
                        logging.info(f"Cleaned up legacy backup: {item}")
                    except Exception as e:
                        logging.warning(f"Failed to remove backup {item}: {e}")
        except Exception as e:
            logging.error(f"Error cleaning up backups: {e}")
