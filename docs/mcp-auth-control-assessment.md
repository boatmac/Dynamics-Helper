# MCP Authentication And Cancellation Assessment

## Status

September 13, 2026: public-documentation and local-source research only. No MCP
server, SDK runtime, browser authentication or model turn was started. No new
authentication handler or cancellation behavior has been implemented in DH.

This assessment distinguishes documented contracts, source-observed interfaces,
and unverified runtime behavior. SDK 1.0.13 source availability does not establish
support in whichever external CLI the user currently runs. Historical CLI 1.0.83
verification did not exercise MCP tools or these authentication paths.

## Evidence Levels

The pinned [MCP guide][mcp] calls MCP an evolving feature. It documents
`disabled_mcp_servers` for creation and cold resume: disabled servers are not
started and their authentication is not initiated. It explicitly cautions that a
resident resume cannot undo a server already spawned by the runtime.

The pinned [Python reference][python] and MCP guide do not describe
`on_mcp_auth_request` or its complete return/cancellation contract. These are
documentation gaps, not evidence that the installed methods do not exist.

Read-only inspection of the installed package declared as SDK 1.0.13 found:

| Interface | Source-observed scope | Qualification |
| --- | --- | --- |
| `session.rpc.mcp.list()` | Per-server states including connected, failed, needs-auth, pending, disabled, stopped and not_configured | Public RPC access, experimental MCP API; no runtime call performed |
| `session.mcp_server_status_changed` | Server name/status, optional error | Event shape observed; do not expose raw errors or server names to UI/logs |
| `on_mcp_auth_request` on create/resume | Request-correlated SDK-managed MCP OAuth handling | Python implementation observed; missing pinned narrative documentation |
| `mcp.oauth_required` / `mcp.oauth_completed` | Pending OAuth request and completion/cancellation correlation | Event definitions observed; requests may contain credentials and sensitive URLs |
| `session.rpc.mcp.oauth.handle_pending_request(...)` | Resolve one known OAuth request, including cancelled outcome | Experimental; `success: false` is not confirmed cancellation (request may be unknown, expired or already resolved) |
| MCP enable/disable/start/stop/restart | Server/session lifecycle | Not equivalent to cancelling one tool call or rolling back its effects |
| `session.abort()` | Current message/turn | Broader than OAuth cancellation; no side-effect rollback guarantee |

The Python source maps a callback result of `None` or an explicit cancelled result
to a cancelled pending-request response. With no handler, it warns and returns;
it does not automatically cancel. There is no built-in callback deadline. These
are implementation observations, not tested behavior in DH's current runtime.

Generated types have a public import surface at `copilot.rpc`; production code
should not depend on the internal `copilot.generated` package layout. The
installed package was read, not compared byte-for-byte with an upstream release
in this research step. Earlier dependency review remains separate evidence.

## What Cancellation Does Not Mean

- No general `cancel(tool_call_id)` API for arbitrary MCP tool execution was
  found in the inspected SDK surface.
- MCP sampling cancellation and background-task cancellation address their own
  request types; neither is a universal MCP tool-call cancellation interface.
- Moving MCP loading to the background releases waiting turns without cancelling
  the load; it is not a per-server stop operation.
- `send_and_wait` timeout stops local waiting, not in-flight agent work. Local
  JSON-RPC cancellation does not itself issue a remote cancellation request.
- Server shutdown, turn abort and client stop have wider effects and must not be
  substituted silently for a single authentication-request cancellation.
- Neither documentation nor inspected event shapes establish coverage for a
  server's internal WAM window, browser sign-in or non-OAuth credential flow.
  Tool activity alone is not authentication evidence.

The pinned [Node reference][node] describes abort as stopping the currently
processing message; the [event reference][events] describes turn abortion. These
do not promise rollback of an operation that already reached an external service.

## Bounded Next Work Package

The smallest useful implementation would project fixed, allowlisted per-service
status and handle only explicitly identified SDK OAuth requests. It must preserve
request/session ownership, separate managed tool approval from authentication,
and distinguish a requested cancellation from an acknowledged one.

Before enabling it, review the exact pinned Python interface and add fixed offline
fixtures for callback registration on every create/resume path, request identity,
late completion, missing handler, timeout, cancellation failure and cleanup.
Select a supported runtime and perform a separately authorized synthetic MCP
verification before relying on those experimental methods. Do not infer live
support from handshake success or importable types.

User interaction, timeout policy and whether declining one authentication should
continue the turn remain product decisions. The DTM browser authentication
deadline of 30 seconds is unrelated and must not silently become an MCP-wide
timeout. An IR SLA countdown is also not an authentication timeout budget.

Keep DH's existing `managed_approval_required` checks and headless permission
handler unchanged. Never add unconditional pre-tool approval, automatic account
selection, credential extraction, raw event logging or security-policy bypass.
Do not promise universal per-service authentication cancellation.

## Sources

- [Pinned SDK v1.0.13 MCP guide][mcp]
- [Pinned SDK v1.0.13 Python reference][python]
- [Pinned SDK v1.0.13 Node reference][node]
- [Pinned SDK v1.0.13 event reference][events]
- Local SDK source: `host/venv/Lib/site-packages/copilot/session.py`, `client.py`,
  `rpc.py`, `_jsonrpc.py`, `generated/rpc.py` and `generated/session_events.py`.
  Read-only source evidence, not project runtime dependencies newly introduced
  by this assessment.

[mcp]: https://github.com/github/copilot-sdk/blob/v1.0.13/docs/features/mcp.md
[python]: https://github.com/github/copilot-sdk/blob/v1.0.13/python/README.md
[node]: https://github.com/github/copilot-sdk/blob/v1.0.13/nodejs/README.md
[events]: https://github.com/github/copilot-sdk/blob/v1.0.13/docs/features/streaming-events.md
