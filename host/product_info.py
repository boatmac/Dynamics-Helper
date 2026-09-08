from dataclasses import dataclass


@dataclass(frozen=True)
class HostCapabilities:
    host_version: str
    required: tuple[str, ...]
    provided: tuple[str, ...]


VERSION = "2.0.76"
REQUIRED_PROTOCOL_CAPABILITIES = ("prompt-scope-v1",)
PROVIDED_PROTOCOL_CAPABILITIES = (
    "prompt-scope-v1",
    "transactional-update-v1",
)


def get_host_capabilities() -> HostCapabilities:
    return HostCapabilities(
        host_version=VERSION,
        required=REQUIRED_PROTOCOL_CAPABILITIES,
        provided=PROVIDED_PROTOCOL_CAPABILITIES,
    )
