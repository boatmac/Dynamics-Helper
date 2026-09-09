# Copilot SDK 1.0.13 Upgrade Assessment

## Assessment Context

Research and qualification evidence recorded on 2026-09-09 after stable v2.0.76
publication, followed by an explicitly approved
isolated SDK installation and mock qualification. Product dependency and project
venv remain github-copilot-sdk==1.0.5. No runtime download, real CLI/model session,
production upgrade or frozen build occurred. Initial findings use official
v1.0.13 tagged sources; qualification uses the hash-verified published wheel.
This is a dated technical assessment, not a live task queue. The
[handoff](session-handoff-2026-07-15.md) alone records active authorization and
scheduling; [test safety](test-safety.md) governs any authorized verification.

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

## Remaining Qualification Questions

The findings below require managed-denial handling and fail-closed negative options
acknowledgment to be verified against actual SDK serializers before adoption.
Retain the failing cases and isolated qualification evidence. A mock adaptation
does not qualify frozen packaging, live runtime behavior or a production pin change.
The handoff, not this assessment, determines whether and when further work runs;
these technical requirements do not authorize another installation or test attempt.

## Isolated Qualification Results

- Environment: local Temp `dh-sdk-1013-qualification-20260909`, separate venv.
- SDK wheel SHA-256:
  `941dd5b55cf32ba55c73c651052a4a52b259b470c68bf6a6ac3d240c235402c9`, matched
  official PyPI metadata previously retrieved by the agent, not a user-supplied hash.
- All 13 transitive pins retained; 14 binary wheels downloaded from the official
  index, then hash-required offline installation. `pip check` passed.
- 27/27 mock cases executed: 25 passed, 2 failed, no errors. Two passing cases
  intentionally establish current DH safety gaps, not qualification success.
- Used imports, explicit CLI-path precedence, create/resume serialization,
  deterministic IDs, cwd/instructions/skills/MCP, assistant/model events, and
  current Host fallback/retry handling passed their stated mock scopes.
- All existing tracked hashes and project venv SDK1.0.5 remained unchanged through
  installation/testing. The subsequent edits here document the findings only.

### Negative Options Acknowledgment

The installed SDK's generated `SessionUpdateOptionsResult.success` boolean
explicitly indicates whether the patch applied. With a synthetic real-wire
response `{"success":false}`, `_apply_post_create_options_patch` ignores that
result and returns the session. An RPC exception does trigger cleanup and failure.
Independent static review confirmed this is a valid negative-response contract,
not an invented fixture shape. It is relevant to `skip_custom_instructions=True`:
DH must not accept the session/fingerprint if the requested isolation failed.

Required qualification work: treat the negative result as failure at the patch
boundary, including create/resume and existing fallback paths, and preserve the
SDK cleanup path. No production shim or package edit has been implemented. This
does not prove real CLI leakage or a regression from1.0.5.

### Managed Approval And Cleanup

An actual typed managed-required permission request received approve-once from
unmodified DH on the mock wire. The pre-tool hook also unconditionally allowed.
A TEMP-only proposed handler serialized user-not-available successfully. The
production handler is unchanged; actual enterprise-policy enforcement was not
tested and no live bypass is claimed.

The other failing test left an actual JSON-RPC task unanswered when stop was
called, but supplied no reader thread or owned CLI process. It establishes only
a synthetic-seam limitation, not a proven live process/task leak. Do not patch
production cleanup based solely on it. Test cleanup canceled/awaited the task;
final async tasks and all owned processes were zero.

Evidence and test code are retained in the isolated environment's
`qualification-report.md`, `test-results.json`, `wire-frames.json`, and wheel/
installation reports. Initial dateutil timezone registry access was blocked;
only the TEMP fixture was corrected to use synthetic handles. No actual registry
or product installation changes, runtime download, browser operation, model
request, or SDK session occurred.

## Official Sources

- [Python session API](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/session.py)
- [Python client](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/client.py)
- [RPC types](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/generated/rpc.py)
- [Session events](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/generated/session_events.py)
- [Dependencies](https://github.com/github/copilot-sdk/blob/v1.0.13/python/pyproject.toml)
- [FFI loader](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/_ffi_runtime_host.py)
- [Runtime version](https://github.com/github/copilot-sdk/blob/v1.0.13/nodejs/package.json)
