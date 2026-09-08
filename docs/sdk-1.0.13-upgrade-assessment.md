# Copilot SDK 1.0.13 Upgrade Assessment

## Status

Read-only follow-up after stable v2.0.76 publication. Product dependency remains
github-copilot-sdk==1.0.5; no SDK install, runtime download, real session or SDK
upgrade implementation occurred. Findings use official v1.0.13 tagged sources,
not moving main. This is not approval to change the working environment.

## Compatibility

- Used imports remain available: CopilotClient, RuntimeConnection, session
  PermissionRequestResult/PreToolUseHookOutput/PermissionDecisionApproveOnce, and
  ProcessExitedError. No import migration has been demonstrated necessary.
- Explicit stdio path, cwd/env, create/resume, deterministic IDs, hooks, MCP,
  skills and skip_custom_instructions remain supported. Preserve all isolation
  options on resume, create fallback and transport retry.
- send_and_wait still returns the last assistant event or None; model metadata
  retains the used fields. Additional reasoning effort max is optional scope.
- client.stop remains supported. No used session-method rename is required.
- Both versions require Python>=3.11 and dateutil/Pydantic/httpx. Current direct
  dependency pins satisfy the declared ranges; do not refresh unrelated packages.

## Required Safety Review

Version1.0.13 exposes managed_approval_required. The current unconditional
permission handler and pre-tool allow shortcut need review before adoption:
ordinary headless permission approval must not automatically satisfy managed
human approval. Prefer a concrete PermissionDecisionUserNotAvailable response
for such requests, rather than PermissionNoResult (which leaves event requests
pending). Let the permission handler own the decision instead of the unconditional
pre-tool allow shortcut. This is preventative compatibility/safety work, not a
reproduced policy-bypass claim. Do not disable managed settings or inject permissive
policy to make a test pass. Update the AGENTS approval rule only when implementing.

## Runtime And Packaging

The tagged publish pipeline pins runtime1.0.83; this is not a minimum external CLI
version. Python implementation accepts protocol3 only. Generic compatibility
documentation's wider protocol wording differs; qualify the actual installed
wheel rather than relying on that wording alone.

Explicit CLI path overrides downloaded runtime resolution. DH no-path fallback
already exists with1.0.5, but downloaded layout changes in1.0.13. Test that the
intended external CLI path remains selected without automatically provisioning
a runtime. Do not add runtime.node/FFI libraries merely because the SDK imports
its FFI host module; native loading is lazy for that transport. Keep the current
onedir and mypy-plugin exclusions; no required hidden-import change is established.

## Next Bounded Stage

Requires approval for installing1.0.13 into a new disposable environment, not
host/venv, and executing mocked compatibility tests there. No actual CLI/runtime
download, user credentials, browser, model call, registry or installation access.

Verify imports, signatures, concrete managed-denial serialization, create/resume
options and retry isolation, assistant/model event handling, and cleanup failure
behavior. Pin/hash the exact wheel. Then report whether dependency/code changes
are justified. Frozen build and live runtime qualification are later stages;
do not automatically publish another version or mix these changes into v2.0.76.

## Official Sources

- [Python session API](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/session.py)
- [Python client](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/client.py)
- [RPC types](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/generated/rpc.py)
- [Session events](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/generated/session_events.py)
- [Dependencies](https://github.com/github/copilot-sdk/blob/v1.0.13/python/pyproject.toml)
- [FFI loader](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/_ffi_runtime_host.py)
- [Runtime version](https://github.com/github/copilot-sdk/blob/v1.0.13/nodejs/package.json)
