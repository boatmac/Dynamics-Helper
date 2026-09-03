import hashlib
from pathlib import Path

from update_mutex import (
    MutationMutex,
    WindowsNamedMutex,
    canonical_install_identity,
)


OPERATION_MUTEX_PREFIX = "Local\\DynamicsHelper.UpdateOperation."


def operation_mutex_name(install_root: Path) -> str:
    mutation_identity = canonical_install_identity(install_root)
    digest = hashlib.sha256(mutation_identity.encode("utf-8")).hexdigest()
    return f"{OPERATION_MUTEX_PREFIX}{digest}"


def create_windows_operation_mutex(install_root: Path) -> MutationMutex:
    return WindowsNamedMutex(operation_mutex_name(install_root))
