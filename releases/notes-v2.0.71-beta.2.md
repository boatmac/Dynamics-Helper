# v2.0.71-beta.2

Targeted fix for "Copilot did not finish" errors plus the timeout-config slice originally scoped for v2.0.72. Building on beta.1's persistence work.

## ✨ Highlights

### Analyze timeout is now user-configurable, default raised to 1200 s (C2b-lite)

The hardcoded 600 s analyze timeout has been the single biggest source of confusing failures: a complex case with many MCP tool calls (PowerShell + view + grep + create rounds) easily runs past 10 minutes, gets sliced at exactly the 600 s mark, and the user sees an error message blaming **authentication** — which sent people on pointless re-auth troubleshooting because that's what the old wording literally said.

**Root cause confirmed from a real `native_host.log`:** the SDK was actively writing the final report (7 consecutive `create` tool hooks fired in the last second before cut-off) when `asyncio.wait_for` killed it. Not a hang. Not an auth issue. Just a budget mismatch.

**What changes:**

- **New Options field — Analyze Timeout (seconds)** under General. Range 60–3600, default 1200. Clamped client-side on blur AND host-side on every config read, so what you see is what's stored.
- **Default raised 600 → 1200 s.** Cold MCP starts plus deep tool chains routinely need >10 min on complex cases; 600 was leaving capability on the table.
- **Live update.** Change the value, click away from the field — next analyze uses the new budget. No host restart required (the same path that `update_config` already used for log level).
- **Error message rewritten.** Instead of "waiting for authentication or approval", the host now says it truthfully: `Copilot did not finish within Ns (M min) timeout while actively processing your request. Consider increasing the timeout in Options → Analyze Timeout if your cases need more time.` Auth is demoted to a tail hint that only appears if you're already at the 3600 s max.
- **Progress bubble copy is dynamic.** Used to say "this may take up to 2 mins"; now reflects the actual configured value: `Copilot is analyzing (max N min)…`
- **FAB safety timeout is derived,** not hardcoded. Was `610000` ms forever; now `(analyzeTimeoutSeconds + 10) * 1000`. The 10 s grace guarantees the host's truthful error fires before FAB's generic fallback — you should never see the fallback unless the host literally crashed.

## 🔬 Under the hood

### Three-site sync contract documented as a critical rule

The timeout value now lives in three places that must stay aligned: `NativeHost.__init__` default, `_get_session_config` + `handle_update_config` clamp + read, and `FAB.tsx::handleAnalyze` safety-timeout derivation. AGENTS.md § 4.2 was rewritten end-to-end to pin this as a critical rule with the error-message wording requirement spelled out — so a future refactor cannot quietly regress to the misleading guess.

### Cleanup of stale references

- `dh_native_host.py` no longer carries the `# 310 seconds` comment (it had been wrong since v2.0.39).
- `DEVELOPER_GUIDE.md` two "600s timeout" mentions updated to point at the new configurable contract.
- `USER_GUIDE.md` gains an "Analyze Timeout" section and the stale "Click Save Changes" instruction from the Beta Channel section is removed (the Save button has been gone since v2.0.70).

### 7 new host tests for the timeout contract

`host/test_analyze_timeout.py` covers the clamp pure function, the `NativeHost.__init__` default, and source-inspection regression guards on `_get_session_config` and `handle_update_config` so the timeout-read path can't be silently removed during a refactor. Same defensive style as `test_case_id.py::TestCaseToSessionId`.

Test totals: host 72/72 (was 65 at beta.1), extension 42/42 (unchanged).

## Installation

1. Download `DynamicsHelper_v2.0.71-beta.2.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need a refresh (F5) to pick up the new content script.

## Upgrading from beta.1

Zero migration. Existing `config.json` without `analyze_timeout_seconds` gets the new 1200 s default. Existing prefs in `chrome.storage.local` without `analyzeTimeoutSeconds` get 1200 s too. First time you open Options the new field appears pre-filled — no action required unless you want a different value.

## Known issues / follow-ups

- **SAP/Mooncake keyword detector double-fires** on D365 tab return, producing a brief unreadable toast obscured by the hydration popover. Pre-existing bug, unrelated to C2b-lite, deferred to backlog.
- **Team folder collapse state still ephemeral** (B1, carried from beta.5 → beta.1 → beta.2).
- **No telemetry coverage for the new persistence + timeout paths yet.** Considered for beta.3 once stable — currently flying without confirmation that C2a+ rehydration is actually firing on user machines.
