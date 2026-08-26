import platform
import sys
from pathlib import Path

from native_registration import (
    MainHostRuntime,
    WindowsRegistryBackend,
    register_main_host,
)


if __name__ == "__main__":
    if platform.system() != "Windows":
        print("This script is designed for Windows.")
        sys.exit(1)

    register_main_host(
        Path(__file__).resolve().parent,
        WindowsRegistryBackend(),
        MainHostRuntime.SOURCE,
    )
    print("Installation complete.")
