# v2.0.73

A backend-infrastructure release: the Copilot SDK is modernized, session IDs become deterministic UUIDs, and you can now pick DH's analyze model independently of your CLI. Consolidates the v2.0.73 beta line (beta.1 + beta.2) plus the configurable-model feature.

## ✨ Highlights

### Choose DH's model and performance (new)

DH's analyze sessions used to inherit your Copilot CLI's global config (`~/.copilot/settings.json`). If you'd set the CLI to a heavyweight model — e.g. Claude Opus at max reasoning effort — for interactive use, **DH silently inherited it and every analysis was slow**.

Now, under **Settings → Copilot Configuration → Model & Performance**, DH has its own selection:

- **Model** — a live dropdown of the models your GitHub account offers (fetched from Copilot; **Refresh** to re-fetch, cached 24 h). Pick a lighter model (e.g. Claude Sonnet) and analyses get dramatically faster. In testing, switching from Opus-at-max to Sonnet took a re-analysis from ~11 minutes to ~90 seconds.
- **Reasoning effort** — only offered for models that support it. Models with no reasoning-effort setting (e.g. Claude Sonnet 4.5) say so and can't be mis-configured.
- **Context tier** — `default` or `long_context`.
- Every field defaults to **Use CLI default** (empty), so nothing changes until you opt in — DH keeps inheriting your CLI config out of the box.

If the model list can't be fetched (e.g. GitHub login expired), DH surfaces a clear error and keeps the last-known list — never a silent empty dropdown. For an expired login, run `copilot` in a terminal, then Refresh.

### Session IDs are now deterministic UUIDs

DH names each Copilot session so the same case always maps to the same resumable session. That name is passed through to external validators DH doesn't control — notably Microsoft Entra AAD, which consumes it as the OAuth `client_session` parameter (20–50 chars). The previous custom `co-<case>` / `dhco-<case>` formats were fragile against such constraints (an `AADSTS901001` incident proved it).

Session IDs are now a **deterministic UUID v5** derived from the case number (`uuid5(namespace, case)`). Properties:

- **Always valid** for AAD and any layer expecting a UUID — 36 fixed chars, regardless of case-number length.
- **Still deterministic** — the same case always yields the same UUID, so resume works with no stored map; the report still prints `copilot --resume <uuid>`.
- **Cross-tool consistent** — MyCasesKit computes the identical value from the same namespace, so DH and the shell CLI agree.

The human-readable case number stays in the report and in MyCasesKit's `context.md` `case_number:` field; the UUID is just the resume handle.

### Copilot SDK upgraded 0.3.0 → 1.0.5

DH's backend talks to the Copilot CLI through the `github-copilot-sdk` package. This release jumps from 0.3.0 to 1.0.5:

- `SubprocessConfig` → `RuntimeConnection.for_stdio()`, typed permission approval (`PermissionDecisionApproveOnce`).
- The startup PingResponse monkey-patch (a workaround for a CLI/SDK timestamp mismatch) is **deleted** — 1.0.5 handles it natively.
- **Infinite sessions** (automatic context compaction) are adopted rather than disabled: they let long, complex analyses continue past the context ceiling instead of failing. Adopted with observability logging so the behaviour is visible.

## 🐛 Also fixed

- **"You are up to date!" now shows in Chinese** — the update-check toast captured the translation function before the language preference hydrated; fixed with a ref-mirror.

## Installation

1. Download `DynamicsHelper_v2.0.73.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.72

Zero migration. Existing sessions (`dhco-<case>` or older) simply orphan — case data lives in the reports/context.md, not the session; the next analyze on a case creates its UUID-named session. Model / effort / tier default to empty (inherit), so nothing changes until you set them in Options.

The frozen host now bundles the `httpx` stack (SDK 1.0.5's dependency) instead of the old `requests` stack; the installer replaces the runtime, no action needed.

## Notes for cross-tool users (MyCasesKit)

MyCasesKit computes the identical UUID v5 from the shared namespace, so DH-created and shell-CLI-created sessions for a case converge. MyCasesKit's `context.md` migration tolerates legacy `dhco-`/`co-` values and forward-upgrades them, so the two can land independently.

## Known issues / follow-ups

- **Options page layout** (config column grows long next to the bookmark manager) — a rebalance is planned for v2.0.74.
- **SDK 1.0.5 new capabilities** (`on_mcp_auth_request` for MCP OAuth, per-tool-failure hooks, session spend limits, custom BYOK providers like Azure OpenAI) are catalogued for future releases.
- **Team folder collapse state** still resets on Options reload.
