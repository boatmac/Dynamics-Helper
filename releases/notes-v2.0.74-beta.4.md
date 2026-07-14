# v2.0.74-beta.4

Headline: **Copilot sessions now stay anchored to the configured Root Path across SDK creation and CLI resume.** This fixes a case where `/resume <UUID>` could switch an interactive Copilot CLI back to the Dynamics Helper Native Host / extension directory, preventing workspace skills, MCP servers, and instructions under the configured root from being discovered.

## 🧭 Root-bound Copilot sessions

**Root cause:** if `rootPath` was unavailable when a session was first created, the Copilot SDK/CLI fell back to the Native Host process cwd and persisted that directory in the session metadata. A later `/resume` correctly restored the persisted cwd — but it was the wrong directory.

**What changed:**

- Dynamics Helper loads the configured root **before** starting `CopilotClient`.
- The same `working_directory` is now applied at all levels: client process, `create_session`, and `resume_session`.
- The client is restarted when Root Path changes, so the CLI process cwd and session cwd cannot diverge.
- Session creation is now lazy: startup initializes only the client and does not pre-create a generic session before Analyze provides a case identity.
- Options updates preserve the active deterministic UUIDv5 case session instead of replacing it with a generic UUIDv4 session.
- Missing or empty Analyze `rootPath` values (for example, before extension preferences hydrate) fall back to the canonical host `config.json`; only `update_config` can clear Root Path.
- Runtime Root Path overrides drive workspace skill/MCP/instruction discovery as well as cwd.
- Session refresh/retry failures invalidate stale state instead of continuing analysis through the wrong session.
- Relative Root Paths are rejected rather than being resolved under the Native Host directory; corrupt config fails closed instead of silently falling back to the process cwd.

## 🔁 Safer CLI resume command

`dh_case_report.md` now prints a root-bound PowerShell command:

```powershell
copilot -C '<root>' --resume=<uuid>
```

`-C` applies the workspace before Copilot discovers skills, MCP, and instructions. It also overrides stale cwd metadata left by sessions created with older Dynamics Helper versions. Paths are PowerShell-literal quoted and safely fenced in Markdown.

## ✅ Verification

- **Host tests:** 109 passed, including 26 isolated session-workspace regression tests.
- **Extension tests:** 43 passed; production build clean.
- **Real SDK smoke (no prompt/model call):** created a temporary random-UUID session using the configured root, verified `workspace.yaml.cwd`, resumed it with the explicit root, then deleted the temporary session. Create / resume / cleanup all passed.

## Installation

1. Download `DynamicsHelper_v2.0.74-beta.4.zip` below.
2. Unzip it.
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`).
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.74-beta.3

No config migration is required. After your next case analysis, use the **complete resume command printed in `dh_case_report.md`** rather than entering `/resume` alone. The explicit `-C` root is the safest path for older sessions whose saved cwd may be stale.

## Known follow-ups

- Sessions created by older DH releases retain their old metadata until resumed by the new host or opened with the report's `-C` command.
- Resize height and team-folder collapse state remain ephemeral (carried from prior betas).
