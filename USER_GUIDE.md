# Dynamics Helper - User Guide

## Introduction

Dynamics Helper is a browser extension for Technical Support Engineers. It bridges your browser (Edge/Chrome) to GitHub Copilot through a local Native Host for support-case analysis.

## Prerequisites

Use Windows with Edge or Chrome and an organizational policy that permits unpacked extensions. GitHub Copilot CLI must be installed and authenticated under the same Windows account as the browser, with Copilot access. An npm-based CLI installation also needs Node.js LTS.

The complete release ZIP includes the compiled Host and its runtime; **end users do not need to install Python separately**. Python **3.11+** is required only for source development.

## Installation

### Complete Release ZIP

The configured release source is [boatmac/Dynamics-Helper Releases](https://github.com/boatmac/Dynamics-Helper/releases).

1. Download the complete release ZIP asset, not the GitHub source-code archive. Extract the entire package to a folder before running anything.
2. Close the browser and Dynamics Helper normally and allow the Host to exit. The installer refuses a running Host; it does not restart or force-terminate it.
3. Double-click the extracted package's root `install.bat` using the same Windows account as the browser. The package installs both Host and Extension to `%LOCALAPPDATA%\DynamicsHelper` and registers Native Messaging in **HKCU**. Do not choose **Run as administrator**.
4. After installation succeeds, open `chrome://extensions` or `edge://extensions`, enable **Developer Mode**, and choose **Load unpacked**.
5. Select `%LOCALAPPDATA%\DynamicsHelper\extension`. Keep the packaged key and fixed Extension ID unchanged. An unexpected ID means the loaded folder/package needs checking, not that `allowed_origins` should be edited and an arbitrary ID registered.

For Beta installation, select the desired pre-release ZIP on the same Releases page. Future Beta checks are controlled separately by **Options > General > Receive beta updates**, which saves automatically.

If the installer refuses legacy Roaming data, preserve both locations and resolve the legacy installation with your administrator. If policy or antivirus blocks the package, stop and preserve the error; do not bypass execution policy, add exclusions, or restore/allow a detected file. Never mix individual Host/Extension files or delete `updates/**` recovery evidence.

### For Developers (Build from Source)

Source development requires Python **3.11+** and separately provisioned frontend/Host dependencies. Within an approved development scope, build from the repository root:

```powershell
npm run build --prefix extension
```

Load **`extension/dist`**, not the source `extension/` folder, and verify that the browser ID matches the fixed source/product identity. Preserve the source manifest's `key` and expected Native Messaging origins.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for runtime and verification details. The legacy `host/install.bat` creates a venv, installs `host/requirements.txt`, and registers the source Host; it is not the release ZIP installer. Dependency installation, registration, and mode switching require their own applicable scope, not automatic execution of this example.

---

## Configuration

The extension uses configuration files stored in your User directory. This ensures your settings are safe even if you update the tool.

**Location:** `%LOCALAPPDATA%\DynamicsHelper` (Paste this into Windows File Explorer address bar).

* **`config.json`**: Controls MCP servers, skills, and model settings.
* **`copilot-instructions.md`**: Your **DH-specific Instructions**. They apply only to DH sessions when Repository ONLY is not effective.
* **`user_prompt.md`**: The canonical Host source for the **Custom User Prompt**. The Host rereads it for every Analyze.
* **`native_host.log`**: The log file for troubleshooting. Log files rotate automatically at 5 MB (up to 3 backups: `.log.1`, `.log.2`, `.log.3`), keeping total disk usage under ~20 MB.

### The Options Page

Open the Options page from the extension icon or the FAB menu. Settings are organized into a left-hand navigation rail with the following tabs:

* **General** — language, auto-analyze mode, status bubble, analyze timeout, log level, and beta channel.
* **Appearance** — floating-button text, colour, and screen-edge offsets.
* **Copilot Configuration** — workbench Root Path, Skills, MCP config, DH-specific Instructions, Repository ONLY, and Custom User Prompt.
* **Model & Performance** — model, reasoning effort, and context tier for analyze sessions.
* **Team Catalog** — shared team bookmark subscription.
* **Bookmark Manager** — your personal bookmark menu editor.
* **About & Help** — version info, links (User Guide, GitHub, report a bug), a log-collection helper, and troubleshooting tips.

There is no Save button. Selects and toggles persist on change; text, number, and color inputs persist when they lose focus. Check visible save/refresh warnings: saving configuration and refreshing the active session are separate outcomes. Manual controls include **Reset**, model/team **Refresh**, and update checks/actions.

### Log Level

You can control the verbosity of the host log from the extension's **Settings → General** section:

* **DEBUG**: Maximum detail — useful for troubleshooting but produces large logs.
* **INFO** (default): Normal operation events.
* **WARNING**: Only warnings and errors.
* **ERROR**: Only errors.

Changes take effect immediately — no restart required.

### Analyze Timeout

Controls how long the host waits for Copilot to finish analyzing a case before giving up. Configure in **Settings → General → Analyze Timeout (seconds)**.

* **Default**: 1200 seconds (20 minutes).
* **Range**: 60–3600 seconds (1 minute to 1 hour). Values outside this range are clamped automatically.
* **When to raise it**: If you see "Copilot did not finish within Ns timeout" errors on complex cases (lots of log files, deep MCP queries). The error message itself tells you the current configured value.
* **When to lower it**: Rarely useful. The timeout only fires when the SDK is actively working past the budget; idle sessions don't burn the timer.

Changes take effect immediately on the next analyze — no host restart required.

The current source gives FAB a fallback of `(model seconds + 120 + 10) * 1000`
milliseconds: 120 seconds for preparation and 10 seconds of fallback grace.
DTM's 30-second sign-in/readiness wait is separate from the configured model
timeout. Host attachment import now has a separate cooperative 5-second caller
wait; event-loop starvation can delay that timer, so it is not a hard real-time
deadline. These allowances do not change the model setting or guarantee overall
completion: startup/session refresh, underlying OS reads and executor shutdown
are not fully bounded. A FAB timeout does not establish cancellation of Host or
browser work.

### Headless Tool Permissions

DH runs without an interactive approval window. Ordinary tool permission requests
continue to be approved automatically. Tools that require managed approval are
explicitly denied with a user-unavailable decision rather than waiting for an
invisible prompt or hanging. This does not bypass managed-approval requirements.

### Model & Performance

Under **Settings → Model & Performance**, you can choose the model, reasoning effort, and context tier DH uses for analyze sessions — independent of the model your Copilot CLI uses interactively.

* **Independent selection**: DH can use a different model and performance configuration from your interactive Copilot CLI (`~/.copilot/settings.json`).
* **Model**: a dropdown of the models your GitHub account offers (fetched live from Copilot; click **Refresh** to re-fetch). Pick a lighter model (e.g. Claude Sonnet) to speed analyses up. Leave it on **Use CLI default** to keep inheriting your CLI setting.
* **Reasoning effort**: only shown for models that support it. Some models (e.g. Claude Sonnet 4.5) have no reasoning-effort setting — the dropdown will say so and only offer *Use CLI default*.
* **Context tier**: `default` or `long_context`, or *Use CLI default*.
* Any field left on **Use CLI default** is not sent to Copilot, so it inherits whatever your CLI is configured to use.

If the model list can't be fetched (e.g. your GitHub login expired), DH shows an error under the dropdown and keeps the last-known model list — it never silently shows an empty list. For an expired login, run `copilot` in a terminal to re-authenticate, then click Refresh.

### DH-Specific Instructions & Custom User Prompt

In **Settings → Copilot Configuration**, you can customize two Markdown text fields with different scopes:

* **DH-specific Instructions**: System-role rules used across DH analyses when Repository ONLY is not effective. Use this for DH-only preferences such as response style or analysis emphasis. The canonical file is `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`.
* **Custom User Prompt**: User-role content appended once and PII-scrubbed with the case payload. Use it for recurring questions such as "Provide a root cause analysis and mitigation steps." Options previews the text, while `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` is authoritative: the Host rereads it on every Analyze and replaces any stale prompt section in the browser payload.

Both fields support Markdown formatting. Click **Preview** above either textarea to see rendered output and **Edit** to return to raw text. Both panes can be resized. Clearing either field is a real saved operation: an explicit empty value truncates its file. Unrelated setting changes omit both prompt-file fields and leave their files unchanged. If Custom User Prompt is unreadable or invalid UTF-8, Options keeps the last browser-mirrored text instead of displaying a false empty value; explicitly edit/clear the field to repair the Host file.

If Chrome cannot save the local preference mirror, Options shows a persistent
**Settings were not saved** warning and does not apply the Host/team side
effects yet. Change a setting again to retry. A failed personal bookmark write
or removal keeps the current menu visible and shows **Bookmark changes are not
saved**; make another bookmark change to retry the newest menu snapshot. Reset
reports success only after both the Native Host defaults and matching browser
cleanup commit. Host save failure performs no browser cleanup; if only session
refresh fails, Reset can finish while that separate warning remains. A stale,
interrupted, or superseded Reset keeps newer values visible and asks you to
retry; after the Host phase has committed, retry repeats only browser cleanup.

Prompt/configuration errors are actionable and do not mean authentication failed:

| Code | Meaning | Action |
|---|---|---|
| `dh_core_prompt_missing` | DH Core is missing | Repair or reinstall Dynamics Helper |
| `dh_core_prompt_unreadable` | DH Core cannot be read | Repair the installation or permissions |
| `dh_specific_instructions_unreadable` | DH-specific Instructions cannot be read | Replace or clear them in Options |
| `repository_instructions_missing` | Both Root instruction entries are absent | Add `<Root>/AGENTS.md` (preferred) or `<Root>/.github/copilot-instructions.md`, or disable Repository ONLY |
| `repository_instructions_unreadable` | Root instructions cannot be read | Repair the file or disable Repository ONLY |
| `user_prompt_unreadable` | Custom User Prompt cannot be read | Replace or clear it in Options |

### Workspace Configuration (Advanced)

You can configure Dynamics Helper to use specific Skills, MCP servers, and instructions for a project or repository.

1.  **Create a `.github` folder** in the root of your project/repository.
2.  **Add Configuration Files:**
    *   **`.github/skills/`**: A folder containing your custom skill definitions.
    *   **`.github/mcp-config.json`**: A JSON file defining MCP servers for this project.
    *   **`AGENTS.md`**: The preferred Repository Instructions entry, directly under the configured Root Path (not inside `.github`).
    *   **`.github/copilot-instructions.md`**: The legacy entry under that same Root, used only when `<Root>/AGENTS.md` is absent. DH never injects both entries.

### Repository ONLY Mode

In the extension settings, **Use repository SKILLS, MCP, and instructions ONLY** selects repository capabilities and instructions. DH Core is always active, and Custom User Prompt is always included with Analyze.

The exact instruction-source matrix is:

```text
Root empty, Repository ONLY ignored:
  DH Core + DH-specific Instructions + Custom User Prompt

Root non-empty, Repository ONLY off:
  DH Core + DH-specific Instructions + Custom User Prompt

Root non-empty, Repository ONLY on:
  DH Core + selected Root entry + Custom User Prompt
  Entry: <Root>/AGENTS.md first; only if absent, <Root>/.github/copilot-instructions.md
```

Important behavior:

* With an empty Root Path, the checkbox is disabled and its stored value is retained but ignored.
* With a non-empty Root Path and Repository ONLY on, repository Skills and MCP replace their global counterparts, and the selected Root entry replaces DH-specific Instructions. `<Root>/AGENTS.md` takes priority; only its absence selects `<Root>/.github/copilot-instructions.md`. Never both. The disabled DH-specific editor retains its content. Skills/MCP paths and selection rules are unchanged.
* DH explicitly disables Copilot CLI automatic custom-instruction discovery for every DH session. CLI-global `~/.copilot/copilot-instructions.md`, automatically discovered `AGENTS.md`, `.github/instructions/**/*.instructions.md`, and other discovery sources do not enter DH analyses. The selected Root entry is explicitly injected by DH, not discovered by the CLI.
* Only `<Root>/AGENTS.md` and the legacy `<Root>/.github/copilot-instructions.md` entry are candidates. DH does not search parents or nested repositories/directories, or reproduce the CLI's broader discovery rules.
* An existing empty or whitespace-only Repository Instructions file is valid; empty `AGENTS.md` never selects the legacy entry. If both entries are absent, Analyze reports `repository_instructions_missing`. An unreadable/invalid-UTF-8 entry, directory, or broken link reports `repository_instructions_unreadable` and blocks Analyze without fallback. A missing DH-specific Instructions file remains valid empty content; an unreadable selected DH-specific file or missing/unreadable DH Core still blocks Analyze.
* Prompt refresh compares source mode and exact Core/selected bytes, not the selected filename. Switching between repository entries with identical bytes does not by itself require a refresh when the case, Root, and session/client remain unchanged.
* No instruction text is moved automatically. Keep DH-only preferences in DH-specific Instructions, repository workflow in the Root file, and CLI-wide preferences in the CLI global file, understanding that DH intentionally excludes the latter.
* This setting is generic to any repository; it does not initialize repository workflows or files. See [TODO.md](TODO.md) for current limitations and planned work.

---

## Usage

### Analyzing a Case

1. **Open a Ticket:** Navigate to a support ticket on `https://onesupport.crm.dynamics.com/`. The current content script is limited to this D365 domain, not Azure Portal or arbitrary pages.
2. **Open Dynamics Helper:** Click the "DH" floating button on the supported page. The extension icon opens configuration, not the case-analysis panel.
3. **Review Context:** Expand the "Case Context" section to see what was scraped from the page.
   The template also includes **Created On** (the current open record's creation
   time, whether a case or a task) and **Customer Name** (the Summary Customer
   lookup's displayed associated name, not a verified ultimate customer or TPID).
   When the loaded form matches the full visible 16/19-digit record number,
   Created On can be read without opening Details and is explicitly formatted
   as an ISO timestamp with `(UTC)`. No parent-case lookup or timezone guessing is
   performed. If that form access is unavailable, the displayed Details date/time
   remains the fallback, with no inferred timezone. Other unloaded/ambiguous fields
   remain blank; there is no cross-tab metadata cache or automatic tab activation.
   You can correct the context manually; same-case background scans preserve edits.
   Current source can fill a blank Customer Name for up to five seconds, using
   targeted reads every 250 ms and an observer scoped to that lookup. It requires
   the same case and current scan generation, preserves edits (including an
   intentionally emptied context), and never changes an active Analyze's frozen
   input. Repeated scans do not extend this window; explicit refresh resets it.
   The user confirmed that scrolling materializes the Customer field and reopening
   DH then reads it. New source also listens for user scrolling while the menu is
   open, Customer is missing, context is unedited, and no active or hydrated Analyze
   is pending. It debounces a Customer-only read by 200 ms without extending the
   original five-second polling window. Known names survive sparse same-case scans,
   but are not cached across cases. DH never auto-scrolls and cannot read a name
   before D365 renders it; initial Customer availability without user scrolling is
   not guaranteed. The scroll-listener change now has synthetic offline test,
   restoration, TypeScript and approved local Extension build PASS; actual user
   runtime behavior of the new listener remains unconfirmed. You can reload the
   local extension from `extension/dist/`, refresh D365, keep the DH menu open and
   scroll until the Customer field appears. With the guards above satisfied, the
   expected result is that the preview updates without reopening the menu; no
   Analyze is needed. This is a manual check, not a live PASS or a promise to read
   an unrendered field. See [current Customer evidence](TODO.md#attachment-analysis).
   Real modal markup remains live-unverified. See the
   [verification record](docs/dtm-attachment-investigation.md#workspace-missing-and-late-customer-follow-up).
   Customer names are not generally removed by the existing pattern scrubber and
   are included in analysis/report text when present; remove them before Analyze
   if they should not be sent.
    * You can **edit the context** directly in the textarea — your edits are preserved even if the page changes in the background.
    * Click the **refresh icon** to re-scrape the page. Current source replaces the prior context only if you have not edited it again while the refresh is pending; newer edits, including clearing the editor, are preserved.
4. **Analyze:** Click the **Analyze** button.
    * The Native Host applies local pattern redaction, then sends the resulting context to cloud-hosted GitHub Copilot.
    * **Wait:** Deep analysis can take **2-5 minutes** if the agent needs to search logs or run database queries.
5. **View Results:**
    * The analysis summary will appear inline in the floating panel.
    * A full detailed Markdown report (`dh_case_report.md`) is saved to your **Root Path** directory (configured in the Extension Options page). If no Root Path is configured, `dh_error_analysis.md` is saved to your **Downloads** folder instead.

During Analyze, the open menu shows the latest phase, expandable recent activity
and active tool aliases with service categories, not real operation names or
arguments/results. Closing and reopening the menu preserves this local progress;
the optional status bubble is not required. Elapsed time updates only when an
event arrives, not as a live timer, ETA or percentage. Reloaded pending requests
show details unavailable because progress is not saved or replayed. Copilot auth
status does not detect individual MCP service login waits, and there is no Cancel
control. See the [progress contract](docs/specs/native-message-snapshot.md#analyze-progress-contract).

The current capture-hardening changes add no new controls. Editor preservation
is implemented in source with scoped offline verification recorded in the
[capture hardening review](docs/capture-hardening-review.md). Earlier local builds
and the running Dev state do not establish that these source changes are loaded
or verified in a frozen build. The production entry is quarantined; no installation
or automatic return-to-Prod step is implied. Runtime verification needs a separately
approved entry.

### IR SLA Snapshot

The earlier IR ownership fix has **focused offline checks and a local Extension
build PASS; compiled runtime preview remains unverified**. The later capture
hardening requires matching record ownership on both explicit and fallback panel
paths; its scoped offline verification is recorded in the review above, not
production qualification. Support is still
partial. Case Context includes an **IR SLA Snapshot** section. Only the
observed, rendered, exact `Succeeded` label in the verified active Summary
panel is recognized. Other states or insufficient evidence display `Unknown`;
DH does not guess `Paused`, `Expired`, or an active countdown.

The UTC capture timestamp belongs to the accepted page scan, not the time Analyze
is sent. If the timer root is missing, status displays `Unknown` and capture time
is `unavailable`; an unrecognized state at a recognized root retains its scan
timestamp. Countdown and deadline remain `unknown`. Neither Severity nor Created
On supplies a derived deadline. This is an observation, not a live timer,
execution budget, or completion percentage.

The IR section is product-reserved: Analyze replaces stale or manually edited IR
section text in the outgoing context with the current accepted scan's metadata.
Other context edits remain subject to the existing Custom User Prompt boundary;
this replacement does not rewrite the editor or change an in-flight Analyze's
frozen input. The first exact line-level `## User Prompt` heading remains the
canonical boundary even inside a fenced block; IR-specific fence handling does
not change that rule.

The earlier bounded source/offline milestone is **complete**: confirmed `initial-green`
results are **297/297 across seven complete test files**, and TypeScript
`ir-sla` exited 0 with sources unchanged. Mutation checks disabling Succeeded
capture and outgoing accepted-snapshot use produced 4 failed, 3 passed and 109
skipped; after restoration, `green-restored` confirmed 7 passed, 109 skipped and
actual exit 0. Raw FAB and irSla source bytes matched `initial-green`. These are
prior results, not rerun for this documentation update.

The earlier user-confirmed Extension build **2.0.77** passed: evidence
`dh-local-extension-2077-ir-sla-20260913`, five default items, TypeScript/Vite/copy
checks and 13 artifacts, with 407 source files and selected tooling unchanged.
The [contract](docs/specs/ir-sla-snapshot.md#confirmed-verification) records the
inventory SHA-256. Build PASS does not establish browser loading or live behavior.

For that earlier fix, the seven-file run recorded **350 passed, 1 failed (351
total)**. A new slot fixture hit jsdom's cached opacity; a fixture-only host
attribute mutation invalidated that cache without changing production checks.
The two affected complete files then passed **187/187**. Disabling the case
comparison produced **3 failed, 184 passed**; restoration passed **187/187** with
the same fixed source bytes. Final TypeScript exited 0 with no source changes.
This is not a full 351-test GREEN rerun. The local **2.0.77** build passed the
five-item gate and TypeScript/Vite/copy checks: 13 artifacts, 408 source files and
selected tooling unchanged, evidence `dh-local-extension-2077-ir-record-pane-20260913`.
Artifact identity is recorded in the [contract](docs/specs/ir-sla-snapshot.md#confirmed-verification).

Read-only inspection in the confirmed Profile 1 context found a selected Summary
tab without `aria-controls`; the earlier source's required relation rejected that
structure. The source fix permits a fallback only when the attribute is absent,
requiring the matching full-record header, selected Summary tab and Summary panel
in the same unique record pane, with the exact Performance indicators section
owning the IR label. Present but invalid controls still reject. Read-only DOM
source evidence is complete; compiled runtime preview awaits the user's Extension
reload and D365 refresh. It should show `Succeeded` if all observed structure and
rendering checks match; this is an expectation, not runtime PASS. No Analyze or
model call is needed. Host and registry remained unchanged, and cleanup of the
new direct CDP connections was confirmed.
No browser load/test, Analyze, Host restart, registration change, commit or
publication is part of this docs-only update. No Host change is part of this
milestone. Active countdown, deadlines and other states remain pending authoritative
source discovery, not part of the completed bounded milestone.
See the [IR SLA snapshot contract](docs/specs/ir-sla-snapshot.md) for the supported
source and remaining status/countdown work.

### Automatic DTM Attachments

**Implemented in source; focused offline checks passed, production UNVERIFIED:**
the corrected four-file frontend rerun passed 98/98 and the pure-Host profile
passed 21/21 using mocked file access and model RPCs. Post-mutation restored
GREEN is confirmed (2 passed, 45 skipped, exit 0, with FAB restored to the same
pre-RED bytes); final TypeScript exited 0 with sources unchanged. At that initial
milestone, production had not been built, installed or live-verified, and no actual
attachment inputs had been sent to a model for verification. Later user-observed
results and current gaps are recorded in [verification status](TODO.md#attachment-analysis).
The standalone download diagnostic is complete, but does not qualify this feature
or an installed release. The updated
Extension needs a matching updated Host; an old Host cannot handle the private
attachment action and there is no automatic legacy fallback.

**New permission, runtime verification pending:** the user-approved source manifest adds
`tabs` to address the documented cross-origin tab-metadata gap. This permission
allows extension-wide URL, title and `pendingUrl` metadata access, not just access
to DH-owned tabs; attachment code reads only its owned tab and does not log raw
URLs. D365/DTM host permissions are unchanged: no login-host or `cookies`
permission is added, and DH does not inject into login pages. The change does not
establish or guarantee a root-cause fix or automatic SSO. Reported checks passed:
122/122 preparation tests (permission contract and auth/missing-URL boundaries),
TypeScript exit 0, and the full local Extension build including all five
default-items gates and tsc/Vite/copy, with raw source/tool inputs unchanged.
See [build evidence](docs/dtm-attachment-investigation.md#tabs-metadata-permission-follow-up).
Runtime remains unverified and the cause unknown. A browser reload/update may show a new permission warning;
only the user may manually accept it. DH does not automatically focus tabs or
approve prompts, and the 30-second readiness/sign-in deadline is unchanged.

For every valid Analyze from the supported, document-bound case page, DH attempts
to prepare eligible DTM attachments before that invocation's first model send.
This also applies when analyzing the same case again; it is not once per case.

* DH opens its own inactive DTM tab and waits up to 30 seconds for readiness/sign-in. Complete any required sign-in yourself; DH does not approve browser safety or multiple-download prompts, select your account or focus the tab automatically.
* If sign-in is still unavailable at the deadline, the still-current analysis continues automatically without unavailable attachments, with no extra confirmation. Late sign-in/downloads cannot join that analysis. A later Analyze makes a new attempt; already-started browser downloads are not cancelled by ending preparation.
* Current source recognizes the exact same-case "No workspace exists" modal by inspection only, without clicking Create or Cancel. With no conflicting positive D365 attachment count, it returns known-empty and continues without a yellow attachment warning; a conflicting count remains unknown. After the portal returns, historical sign-in alone no longer labels a later failure an authentication timeout. These fixes are not yet live-verified; see the [workspace/Customer follow-up](docs/dtm-attachment-investigation.md#workspace-missing-and-late-customer-follow-up).
* A separate, screenshot-verified External-folder message reads exactly: "No files under this folder. You may not have permission to access this folder." Current source recognizes it only during inspection, with matching case identity, a unique External folder and no visible table/file rows. It continues immediately with unknown inventory rather than waiting the full 30 seconds, without Create/Cancel or download actions. The SW now preserves `folder_unavailable`, and the Host's strict reason schema accepts it. With zero supplied files, no images and zero skipped files, the notice is shortened to "DTM did not list accessible files (the folder may be empty or access may be restricted); this analysis uses the case text." In Chinese: "DTM 未列出可访问文件（目录可能为空或无访问权限），本次按工单文本分析。" This is not known-empty or confirmed zero files; positive supplied/skipped counts retain the count/completeness and omission warnings. The earlier wait-only fix did not change the notice text and is superseded by this reason/notice change. See the [folder-reason follow-up](docs/dtm-attachment-investigation.md#folder-reason-and-notice-follow-up).
* Eligible formats are PNG/JPEG (`.png`, `.jpg`, `.jpeg`) and strict UTF-8 text (`.txt`, `.log`, `.json`, `.xml`, `.csv`, `.md`), limited to four files, 2 MiB per file and 8 MiB total. Unsupported or failed files are skipped. Images also require confirmed support and limits from the effective session model; DH does not switch models automatically.
* **Attachments are sent raw, without attachment PII redaction.** Existing redaction of case text, context and Custom User Prompt is unchanged. Only use this workflow where sending that attachment data to Copilot is permitted.
* Downloads remain in the browser's normal download location. The Host reads selected completed files into memory; DH does not stage attachments in Root or change Root Path or report destinations.
* Current Host source waits cooperatively up to 5 seconds for attachment import, then continues without those files and counts them as skipped. Each Host owns at most one import task. All metadata is validated before any file I/O or busy handling; empty input starts no thread. If an earlier import remains busy, the new invocation immediately gets its own skip fallback without queuing or using earlier files. Late results are discarded and cannot trigger a model send. Caller cancellation propagates but leaves the worker owned; it does not cancel/bound OS reads or executor shutdown. DTM's separate 30-second wait, file limits and FAB's 120-second preparation allowance are unchanged.

**Host import-wait follow-up:** source implementation and focused offline
verification are complete: **31/31**, zero failures/errors/skips, runner exit 0,
unchanged sources and no cleanup/capture errors or pending reader/unreaped child.
This is not real attachment I/O or live runtime qualification. The refreshed SDK
review binding is source-only; fixed SDK tests were not rerun, and the historical
25-pass SDK result does not qualify the new Host source hash. See the
[verification evidence](docs/dtm-attachment-investigation.md#host-import-caller-wait-follow-up).
Only Host source changed for this follow-up, so it requires no new Extension
build/reload. An already-running source Dev Host needs a normal
restart before future authorized live verification; no automatic restart or
registry switch is performed. This documentation finalization performs no new
tests, builds, reloads, Host restarts, actual attachment reads or model calls.

**Latest local artifact, not runtime qualification:** existing evidence confirms
376/376 frontend tests across three complete selected files, the safe Host helper
profile 21/21 (exit 0, fake filesystem and SDK-shaped RPCs, not real Host/SDK
runtime), TypeScript exit 0, and all five default-items gates plus tsc/Vite/copy.
Checked source/tool inputs were unchanged. Build evidence:
`dh-local-extension-2077-folder-reason-20260913`. The new local `extension/dist`
is ready, but an already-running Dev Host must restart normally to load the
changed `analysis_attachments.py` reason schema; otherwise it rejects the new
reason. Refreshing only the Extension/page is insufficient. No Host EXE build,
restoration, installation, registry change or agent-run live Analyze was performed
for this follow-up. Build success does not qualify runtime behavior.

Product notices report included/skipped files and warn when inventory or
completeness cannot be confirmed. Do not interpret unknown inventory as proof
that attachments exist or that all were reviewed. The separate notice display
and reload-persistence path is implemented in the Extension. Host now returns the
notice separately from analysis/error text, so known prompt-error localization
does not replace it, and saves it in its own `Attachment Status` report section.
Before each model send attempt, Host supplies a fixed input-status summary when
nonempty and asks the model not to repeat it or claim omitted files were reviewed.
Host no longer prefixes returned Markdown/error text with the notice. These are
source behaviors, not verified live results or a guarantee of model compliance;
see [current gaps](TODO.md).

### Right-Click Analysis

On a supported D365 page where the extension content script is already loaded, select text and choose "Analyze with Dynamics Helper" from the right-click menu. This does not inject support into arbitrary websites or Azure Portal; a context-menu entry alone does not mean the current page can receive the action.

### Auto-Analyze

In the extension settings, you can enable automatic analysis:

* **Always:** The tool automatically analyzes when you navigate to a new case.
* **Initial Pending:** The tool only auto-analyzes cases in "Initial Pending" status.

Auto-Analyze sends the freshly scraped Case Context after local pattern
redaction, without pausing for manual review or edits. If you need to inspect or
remove content before it is sent to GitHub Copilot, keep Auto-Analyze disabled,
open Case Context, edit it, and click **Analyze** manually.

### Session Persistence (Copilot CLI Integration)

Each analysis creates a persistent Copilot session tied to your case number. After the analysis completes:

* The report includes a **Session Name** (a deterministic UUID that identifies the case session).
* Copy the complete resume command from the report. With Root Path configured it has the form `copilot -C '<root>' --resume=<uuid>`; `-C` applies the workspace before the interactive CLI continuation resolves workspace capabilities.
* This restores conversation history, tool state, planning context, and the configured workspace root. It does not change the explicit instruction source DH used when creating or refreshing the session. Prefer the report command over entering `/resume` inside a CLI started elsewhere: the explicit Root overrides stale saved working-directory metadata.

The progress panel also offers session UUID copy once the SDK reports a ready
session with a valid ID. This is not a guarantee of a concurrent live CLI view;
use the report's Root-bound resume command after analysis completes.

### Team Bookmark Catalog

The extension can subscribe to a shared list of bookmarks ("team catalog") published by your team. **The feature is off by default** — no team-related network requests are made until you enable it.

To enable:

1. Open the extension **Options** page → **Team Catalog** tab.
2. Tick **"Enable Team Catalog"**.
3. Paste your team's **Manifest URL** into the input. This URL is provided by your team admin and points to a JSON file (e.g. on GitHub raw, Azure Blob, SharePoint). The URL saves automatically when you click out of the field.
4. Click **Refresh** to fetch the manifest and populate the dropdown.
5. Pick your team from the dropdown.

The manifest format your admin needs to publish:

```json
{
    "version": 1,
    "teams": [
        { "id": "sales", "label": "Sales", "url": "https://example.com/sales-bookmarks.json" }
    ]
}
```

Each team's bookmark file at its `url`:

```json
{
    "version": 1,
    "team": "sales",
    "items": [
        { "type": "link", "label": "Sales Dashboard", "url": "https://..." }
    ]
}
```

**Update behaviour**: the manifest and the selected team's bookmarks are re-fetched once per browser session (on extension startup), with ETag-based conditional requests to skip bandwidth when nothing changed. You can also click **Refresh** at any time for an immediate update.

**Disabling** the toggle hides team data and stops all team-related network requests, but does not delete the local cache — turning it back on restores your previous selection.

**Personal bookmarks** (drag-and-drop in the **Bookmark Manager** tab) work independently of the team catalog and are not affected by the toggle.

**Built-in defaults:** New browser profiles start with public Dynamics Helper documentation, release, and issue-reporting links. An upgrade does not replace saved personal bookmark state, including an intentionally empty menu. Only missing personal bookmark storage loads the shipped defaults; malformed storage is reported without overwriting it. Clearing browser storage or clicking **Reset** loads the currently shipped public defaults again.

---

## Updates

### Automatic Updates

The extension checks for updates on startup. To check immediately, use the refresh
icon beside the Host version in Options or **Check for Updates** in **About & Help**.
Opening Options also requests one check after configuration and update state have
loaded successfully and the update state is safe; an accepted manual check shares
that attempt rather than causing a duplicate automatic request.
These controls check only; they do not install automatically. They share an active
check and are disabled until update state loads or while an update/recovery is in
progress. A check that does not finish within 45 seconds reports a timeout.

When a new version is available:

1. A notification appears in the FAB and the Options page.
2. Click **"Update Now"** to download and apply the update.
3. Progress is saved while the UI closes, the Service Worker restarts, or the
   Extension reloads.
4. Dynamics Helper verifies the complete Host and Extension before and after
   replacement. Ordinary failures automatically restore the previous complete
   version.
5. The Extension reloads only after the update commits or rollback completes.
6. The terminal result is acknowledged only after eight continuous visible
   seconds in a foreground document: an open FAB menu showing its terminal
   banner, a visible Status bubble bound to that completion transaction, or the
   visible Options completion status. Hiding the document or closing the last
   qualifying surface discards elapsed time; showing a qualifying surface again
   starts a full new interval. Hidden time never counts. The closed-FAB red dot
   and unrelated bubbles do not count, and Dynamics Helper never forces Status
   bubble on to acknowledge an update.

If acknowledgment fails, the notice remains until an authoritative Service
Worker update-state broadcast changes it. There is no same-epoch ACK retry;
hide/show or close/reopen the last qualifying surface to start a fresh interval.
After a committed update is acknowledged, the updater returns to idle with no
private candidate address. After rollback, acknowledgment restores the same
candidate as the ordinary **Retry** action.

If the installed Host and Extension do not match, guidance to run the matching
full installer remains visible until the complete product is repaired. An
extreme power interruption can also require that installer. The matching
installer verifies the release before mutation, verifies the repaired product,
and settles compatible preserved update evidence. Contradictory evidence stops
the installer instead of reporting false success.

### Manual Update

Download the complete matching release ZIP from
[boatmac/Dynamics-Helper Releases](https://github.com/boatmac/Dynamics-Helper/releases),
extract it fully, close the browser/Host normally, and run the package's root
`install.bat` under the same Windows account. Follow the [installation steps](#installation).
Do not mix individual Host/Extension files or delete preserved update evidence.

### Beta Channel

By default, Dynamics Helper only receives **stable** releases. To opt in to pre-release (Beta) versions ahead of stable:

1. Open the extension **Options** page → **General** tab.
2. Tick **"Receive beta updates"**. The change is saved automatically; there is no Save button.

Beta versions include new features and fixes before they ship to stable, but may also be less tested. The setting takes effect on the next update check.

Toggling this option **off** does not roll you back from a Beta you are already on — you will simply return to the stable channel for future updates. The next stable release that is newer than your current Beta will pick you up automatically.

---

## Security & Privacy

This extension is designed with "Privacy First" principles for handling support data.

### Data Flow

1. **Browser (Local)**: The extension scrapes case details from the supported D365 page where its content script is loaded.
2. **Native Host (Local)**: Data is passed to the local Host (a compiled executable with bundled runtime in release installations).
3. **PII Scrubbing (Local)**: The Host applies selected redaction patterns to Analyze text and context, including the composed Custom User Prompt (see below).
4. **GitHub Copilot (Cloud)**: The processed Analyze content, eligible raw attachments and separately selected system instructions are sent through Copilot for analysis. Automatic attachment handling is implemented-source but UNVERIFIED; see [Automatic DTM Attachments](#automatic-dtm-attachments).
5. **Return**: The AI response is sent back to your local machine.

### Automatic Redaction

DH Core and the selected DH-specific or Repository Instructions are sent as an
exact system-instruction snapshot; they do **not** pass through the PII scrubber.
Eligible attachments also bypass the scrubber, including UTF-8 text attachments
and supported images. Review their data separately; editing Case Context does
not redact attachment contents. Review instruction files separately as well.
Redaction of request text also does
not guarantee that the model response or generated report contains no PII.

The built-in "PII Scrubber" attempts to remove the following from case text,
context and canonical Custom User Prompt before sending them to the AI:

* **Emails**: Replaced with `[REDACTED_EMAIL]`
* **IPv4 Addresses**: Replaced with `[REDACTED_IP]`
* **US Phone Numbers**: Replaced with `[REDACTED_PHONE]`

*Redaction is pattern-limited, and GUID/UUID values are intentionally preserved
for technical investigation. Before clicking **Analyze**, review and edit the
Case Context to remove anything you do not want sent. The operational
`native_host.log` is not a record of prompt or case content and cannot replace
this pre-send review.*

### Telemetry

* The extension sends operational telemetry such as event counts and error classifications through Azure Application Insights, not Case Context or prompt content.
* A locally generated random UUID correlates events without using your name or account identity.
* Telemetry is used to improve reliability; review Case Context separately before Analyze because telemetry controls do not change what an analysis sends.

### Auditing

* Local logs contain operational diagnostics and may include non-prompt paths or SDK response diagnostics at verbose levels. DH does not log instruction contents, Custom User Prompt contents, or prompt-source paths; safe source mode, error classification, and a short fingerprint prefix may be logged.
* **Log Location**: `%LOCALAPPDATA%\DynamicsHelper\native_host.log`
* The generated report contains the analysis response. Review it separately from the operational log.

---

## Troubleshooting & Getting Help

If the tool isn't working, follow these steps to collect information for the developer.

### Common Issues

* **"Analysis Timed Out"**: The Agent is taking too long. This usually means it's doing a lot of work (good!) but hit the analyze-timeout budget (default 20 minutes; configurable under **Options → General → Analyze Timeout**). Raise the timeout or narrow your request, and check the logs.
* **"Repository Instructions are missing/cannot be read"**: Repository ONLY first selects `<Root>/AGENTS.md`, using `<Root>/.github/copilot-instructions.md` only if `AGENTS.md` is absent. Both absent means missing. An unreadable/invalid-UTF-8 entry, directory, or broken link fails closed without fallback. Add/repair the entry, or disable Repository ONLY. Empty `AGENTS.md` is valid and does not trigger fallback.
* **"Host error" / "Native host disconnected"**: The Host may be missing, blocked, or unable to start. Check the loaded extension folder and fixed product ID without editing the key or `allowed_origins`. For repair, close the browser/Host normally and use the complete matching installer under the same Windows account, then reopen the browser after success. Elevation is not a remedy for a blocked executable.
* **Update requires recovery / matching installer**: Automatic restart recovery
  and rollback resume ordinary interruptions. If matching-installer guidance
  persists, or diagnostics show `manual_recovery_required`, run the complete
  installer for that release. Do not delete
  `%LOCALAPPDATA%\DynamicsHelper\updates`; it contains recovery evidence.
* **Installer safety checks**: Close the browser normally so the Host can exit.
  The installer refuses a running Host or a legacy Roaming data directory; it
  does not force termination or overwrite/migrate that data. If Windows policy or
  antivirus blocks the package, stop and preserve the error. Do not add exclusions,
  restore/allow a detected file, or bypass execution policy to make installation
  succeed. A failed installer returns a nonzero exit code.

### How to Collect Logs (Debug Info)

If you need to report a bug, please provide the **Native Host Log**.

1. Open File Explorer.
2. In the address bar, type `%LOCALAPPDATA%\DynamicsHelper` and press Enter.
3. Find the file named **`native_host.log`** (and any rotated copies: `.log.1`, `.log.2`, `.log.3`).
4. Review and redact sensitive operational details before sharing logs through an approved support channel. Logs are diagnostics, not a transcript of case or prompt contents; review generated reports separately.
