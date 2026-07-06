# v2.0.73-beta.1

Headline: **Copilot SDK upgraded 0.3.0 → 1.0.5.** Plus a small i18n fix. This is an infrastructure release — no user-facing feature changes, but the SDK jump is the foundation for future MCP-auth and session capabilities.

## 🔧 Copilot SDK 0.3.0 → 1.0.5

DH's backend talks to the Copilot CLI through the `github-copilot-sdk` Python package. We'd been pinned to 0.3.0 since May while the SDK moved to 1.0.x. This release makes the jump. Full migration record: `docs/sdk-upgrade-2026-07-1.0.5.md`.

**What changed under the hood:**

- **`SubprocessConfig` → `RuntimeConnection`.** The SDK removed `SubprocessConfig`; the stdio connection to the CLI is now `RuntimeConnection.for_stdio(path=...)` passed as `CopilotClient(connection=...)`. Migrated all 3 client-construction sites.

- **Permission approval is now a typed variant.** `PermissionRequestResult` became a Union (annotation-only, not constructible). The headless auto-approve handler — the golden-rule safety net that keeps the host from hanging on permission prompts — now returns the concrete `PermissionDecisionApproveOnce()` instead of the old `PermissionRequestResult(kind="approve-once")`.

- **The PingResponse timestamp shim was DELETED.** Since May, DH carried a startup monkey-patch working around a CLI-vs-SDK wire mismatch (CLI 1.0.46+ emitted ISO-8601 timestamps that SDK 0.3.0 fed to a bare `int()` and crashed). SDK 1.0.5 handles ISO timestamps natively, so the shim is dead code. It's gone — verified by a live `client.start()` handshake on clean 1.0.5 + CLI 1.0.69 with no shim.

- **Infinite sessions: adopted, not suppressed.** SDK 1.0.5 turns *infinite sessions* on by default — automatic background context compaction plus session-state workspace persistence. Rather than reflexively disabling it to reproduce the old behaviour, DH **rides the new default**: automatic compaction lets a long, complex analysis keep going past the context ceiling instead of failing, which directly helps the kind of long-running case analysis that the v2.0.72 configurable-timeout work was about. Adopted with observability — the host now logs each session's workspace path so behaviour is visible, not blind.

**What did NOT change:** the analyze pipeline, the `dhco-<case>` session naming (from v2.0.72), the report format, the permission/tool-approval behaviour. This is a dependency swap, not a behaviour change.

**Live-validated before release:** a real case analysis under 1.0.5 — 40+ tool calls (powershell / view / grep / edit / skill) all auto-allowed, ~11-minute run, report generated, `dhco-<case>` naming intact, zero errors. Frozen (PyInstaller) build imports the SDK cleanly and passed a Defender scan.

**Scope discipline:** SDK 1.0.5 added ~55 new optional session params (MCP OAuth host token handlers, per-tool-failure hooks, session spend limits, citations). This release adopts **none** of them — they're catalogued as future opportunities in the upgrade spec § 8. One thing at a time.

## 🐛 Also fixed

**"You are up to date!" now shows in Chinese.** In a zh-language Options page, the update-check toast stayed English because its message handler captured the translation function at mount time, before the language preference had hydrated from the host. Fixed with a ref-mirror so the handler always reads the current language. (Two neighbouring update-check strings had the same latent bug and were fixed alongside.)

## Installation

1. Download `DynamicsHelper_v2.0.73-beta.1.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.72

Zero migration steps. The SDK swap is entirely backend; your config, prefs, team catalog, and session state carry forward untouched. Existing `dhco-<case>` sessions from v2.0.72 resume normally.

**Note on the dependency change:** the frozen host now bundles the `httpx` HTTP stack (SDK 1.0.5's dependency) instead of the old `requests`/`urllib3` stack. Package size is ~1.3 MB larger. No action needed — the installer replaces the runtime.

## Known issues / follow-ups

- **Frozen-build analyze not yet field-tested.** The frozen exe imports + initializes cleanly and the dev-mode analyze is fully validated, but a real end-to-end analyze against the *packaged* build happens when you install this beta. That's what the beta is for.
- **SDK 1.0.5 new capabilities deferred** (`on_mcp_auth_request`, `on_post_tool_use_failure`, `session_limits`, `enable_citations`) — future dedicated features, see spec § 8.
- **Team folder collapse state still ephemeral** (B1, carried).
- **No telemetry** on the SDK-upgrade paths (infinite-sessions workspace logging is local-only).
