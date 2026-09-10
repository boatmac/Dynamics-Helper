# SDK Integration

## Client Boundary

The Python SDK dependency is pinned in `host/requirements.txt`. Host code imports
`CopilotClient` from `host/sdk_client.py`, while `RuntimeConnection` comes from
`copilot`. Explicit external CLI selection uses `RuntimeConnection.for_stdio(path=...)`;
do not infer compatibility with every CLI version from a successful protocol handshake.

The adapter checks the first post-create options RPC, including instruction
discovery isolation. Only literal `success is True` confirms the update. Negative,
malformed or exceptional results raise `SessionOptionsPatchError`. Host refresh
handles this as terminal on resume, create and retry: clear session/client and
prompt fingerprint, attempt bounded cleanup, and never fall through to another
session creation in the same failed refresh.

The adapter temporarily wraps only the current session's update/disconnect methods,
restores them in finally and reuses SDK cleanup. It does not send a second options
RPC. Cleanup deadlines are cooperative asyncio limits, not guarantees that an
unresponsive native process has exited; failure remains explicitly unconfirmed.
Cancellation invalidates Host availability and propagates.

This private SDK-method adaptation is version-sensitive. Remove it only after
confirming upstream enforcement of first-update success and passing the relevant
regressions without the wrapper. See [upgrade workflow](sdk-upgrade-workflow.md).

## Headless Permissions

Keep the permission handler on every session creation/resumption path. Requests
with `managed_approval_required` exactly False or None return approve-once. True,
invalid or unreadable values return user-not-available. No UI or second approval
client can be assumed. Never use an unconditional pre-tool allow hook to bypass
this decision, or abstain indefinitely when human approval is unavailable.

## Sessions And Responses

Use the [deterministic session identity](specs/deterministic-session-identity.md)
and [prompt isolation](specs/prompt-source-isolation.md) contracts for session ID,
working directory, exact instruction snapshot and fingerprint ownership. Client
startup alone does not create a generic analysis session.

`send_and_wait` returns the final assistant event or None after the applicable
idle event. Treat response content as optional. Log only safe event metadata;
never serialize the event or raw response into diagnostics. A waiting timeout
does not itself establish authentication failure or prove the agent stopped.

Automatic SDK context compaction is not disabled. It is distinct from DH's own
timeout and session identity controls; do not promise unlimited context or reuse
an invalid session merely because compaction is available.

`get_auth_status` exposes authentication status separately from `get_status`
version/protocol data. Model metadata is obtained through `list_models`; only the
selected model's supported reasoning efforts should be offered in the UI.

## MCP Configuration Compatibility

Current transport names are `stdio` and `http`. Existing saved `local` and `remote`
values map in memory to those names, respectively; the mapping does not rewrite
user files. Prefer current names in new configuration. Repository-only selection,
working directory and explicit MCP inputs must not silently mix unrelated sources.

## Diagnostics And Verification

Use the fixed offline entry described in [test safety](test-safety.md) and the
[SDK upgrade workflow](sdk-upgrade-workflow.md). Exact tests and dependency versions
come from the reviewed selection, not from importing arbitrary debug scripts.

Live checks require an applicable scope and must distinguish process/session auth,
creation/options confirmation, model response, persistence and resumption. Use a
dedicated synthetic identity, reject unexpected tools, record safe booleans/types,
and clean only owned state. Do not obtain a nominal PASS by fabricating history,
copying credentials, or silently broadening a no-model check into a model request.

Unsupported probes and unqualified scenarios are tracked in [project TODO](../TODO.md).
