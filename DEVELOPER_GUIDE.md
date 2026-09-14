# Dynamics Helper - Developer Documentation

## Overview

This document explains the internal architecture and file responsibilities of the Dynamics Helper project. Use this to understand how the pieces fit together when debugging or adding new features.

## Architecture

The project consists of three main components:

1. **Browser Extension (Frontend):** A Chrome/Edge extension written in React/TypeScript. It handles the UI, page scraping, and user interaction.
2. **Native Host (Backend):** A Python script (`dh_native_host.py`) running locally on the user's machine. It acts as a bridge between the browser and the AI Agent.
3. **AI Agent (Copilot):** The GitHub Copilot CLI SDK, which performs the actual intelligence tasks (RAG, analysis, query generation).

## Directory Structure

### `extension/` (Frontend)

Current capture hardening is recorded once in the
[ten-finding review](docs/capture-hardening-review.md). Identity invalidation is
independent of preview protection; raw/empty edits advance intent revisions and
pending refreshes cannot overwrite newer edits. Visibility and scheduled
auto-Analyze timers retain their owners. Customer/header reads use visible record
ownership and bounded live traversal without cloning; yielding XPath reads use
snapshots, and Created On accounts for traversal/text/ancestry work in MAIN and
the final `readCreatedOn` DOM fallback. Both IR panel paths require `expectedCase`
and the same unique visible main/outer-pane/canonical-header ownership. All ten
source issues have scoped offline verification; earlier
source/build results below describe their own snapshots, not this hardening pass.
No unified-coordinator completion, new API, OData migration or measured performance
improvement is claimed. Running Dev source is not frozen-build qualification.

* **`src/components/FAB.tsx`**: The main UI component. It contains the Analyze logic, derives its safety timeout from the Host preference plus 120 seconds of preparation allowance and 10 seconds of fallback grace, localizes prompt-source errors at render time, and uses the `isUserEdited` ref pattern to protect user edits from background scans. Its update UI is projection-only: payload-free `DH_UPDATE_GET_STATE` / `DH_UPDATE_START` plus `DH_UPDATE_STATE` rendering.
* **`src/components/Options.tsx`**: The extension settings page. Handles preferences, Root Path, MCP/Skill directory config, team catalog sync, and projected update status. It never owns update storage, Host update payloads, or reload. DH-specific Instructions and Custom User Prompt textareas include an Edit/Preview toggle for rendered Markdown preview.
* **`src/components/MarkdownPreview.tsx`**: Shared Markdown renderer using `react-markdown` + `remark-gfm`. Provides styled GFM rendering (headings, code blocks, tables, links, lists, blockquotes). Used by Options.tsx for preview toggles.
* **`src/utils/pageReader.ts`**: Extracts case numbers, error text, and context on the supported `https://onesupport.crm.dynamics.com/*` pages, not Azure Portal or arbitrary websites. Reads direct value/label slots inside known `uci-header-control-list` open shadow trees first, then uses the 4-strategy fallback cascade (header controls, label search, header container regex, ticket title fallback). Structured traversal is capped at 20 lists/2,000 elements and yields every 50 elements; it does not search arbitrary shadow text or closed roots. Shadow-only mutations do not independently trigger the document observer, so later field changes require a scan signal or explicit refresh. User-edited context remains protected.
  `createdOn` and `customerName` are optional scraped strings carried through
  the pipeline. Field investigations should use the bounded, privacy-preserving
  [Edge D365 debugging workflow](docs/edge-d365-debugging-workflow.md), including
  single-connection CDP fallback and synthetic fixtures for observed DOM structure.
  These strings pass through
  `pageIdentity.ts`'s explicit snapshot whitelist into the Case Context template;
  they are not identity keys or new Host RPC fields. Created On DOM fallback uses
  controls in a single-field boundary or explicit createdon controls, never nearby
  Modified On. Customer reads the specific selected customer lookup; ambiguous or
  GUID-only values are rejected. No tab activation/cache/timezone inference is
  performed. Both sections use the existing scrubbed-text analysis/report path;
  the scrubber does not generally redact company names.
  Late Customer enrichment uses `PageReader.readCustomerName(expectedCaseNumber)`
  and FAB's fixed five-second epoch: 250 ms targeted reads plus a lookup-scoped
  observer, not repeated full scraping. Exact live case, accepted snapshot and scan
  generation must agree; only a missing Customer is filled, never an existing
  value or user-edited/explicitly emptied context. Sparse same-case scans retain
  a known Customer. Repeated scans do not renew the deadline; identity change or
  explicit refresh resets the epoch. A menu-open background scan may revalidate
  and rebind only Customer enrichment to its new generation, never apply its full
   snapshot to the preview. Active Analyze input remains frozen. New source adds a
   passive capture-phase scroll listener only while the menu is open, Customer is
   missing, context is unedited, and no active or hydrated Analyze is pending.
   It debounces one Customer-field read by 200 ms; pending-scan gating waits at most
   one second from the latest scroll. The read retains expected-case and scan-
   generation checks, never starts a full scan, and does not extend or restart the
   original five-second polling window. Sparse same-case retention is not a
   cross-case cache. No auto-scroll is performed. The user confirmed that scrolling
   materializes the Customer DOM and reopening DH then reads it; this observation
   does not verify the new listener. An unrendered name cannot be read, and initial
   Customer availability without user scrolling is not guaranteed.
  See the [confirmed offline and mutation/restoration results](docs/dtm-attachment-investigation.md#workspace-missing-and-late-customer-follow-up).
   The scroll-listener change now has supplied restored GREEN confirmation:
   **17 passed, 95 skipped, 0 failed**, with raw FAB hash prefix `7B06...` matching
   initial GREEN. TypeScript `customer-scroll` exited 0 with sources unchanged.
   The approved local Extension build passed all five default-items gates and
   tsc/Vite/copy, producing 13 artifacts with 408 sources and selected tooling
   unchanged; evidence and manifest identity are recorded in
   [TODO](TODO.md#attachment-analysis). These are synthetic source checks and a
   build PASS, not live confirmation of the new listener. The user can reload
   local `extension/dist/`, refresh D365, keep the menu open and scroll until the
   field renders to check the expected preview update, without Analyze. Real modal
   markup remains live-unverified.
  `createdOnBridge.ts` sends one extension-local `DH_READ_CREATED_ON` request to
  the SW; strict sender origin/top-frame/document checks target only the originating
  document in MAIN. Self-contained `createdOnModel.ts` reads the constrained
  deprecated `Xrm.Page` compatibility surface, binding the full 16/19-digit record
  number and stable record GUID to the visible header before/after yielding. No
  parent normalization, Web API, frame sweep, tab activation, or Host RPC is used.
  Genuine cross-realm Dates serialize as ISO UTC with `(UTC)`; DOM fallback gains
  no invented offset. Ambiguity/errors/timeouts fail closed. PageReader rechecks
  live identity for every bridge outcome and discards a stale whole scan; FAB's
  existing generation and user-edit protections remain authoritative.
  Created On diagnostics use `console.debug('[DH] Created On', stage, outcome,
  generation, elapsedMs)`; enable Verbose in DevTools to see them. Page console
  stages are `content`, `scan`, and `ui`; `worker` is in the extension Service
  Worker console. Only fixed codes and numeric/null fields are logged, never
  record identifiers, dates, URLs, content or caught errors. Page-side generation
  links one scan's request/result/application, not separate Worker lifetimes.
  `request_timeout` (1500ms) and `injection_timeout` (5000ms) are distinct;
  `sender_*_rejected` (extension/tab/frame/origin/url),
  `sender_document_missing`, `injection_failed` and `envelope_rejected` locate bridge
  failures. `result_unavailable` does not identify a particular MAIN model guard.
  `scan/success` means a model value was selected, not displayed; `ui/applied`
  means the editable snapshot setter ran, not a confirmed React paint. Same-scan
  `edited_context`, `menu_open`, `identity_only`, `stale_scan` or
  `ownership_rejected` explains why it was not applied. `dom_fallback` retains
  raw display text without an inferred timezone. Diagnostics do not persist or
  send telemetry, and do not change identities, timeouts or edit protection.
  Treat the browser-provided non-empty `sender.documentId` as an opaque string:
  forward it unchanged in `target.documentIds` and require exact equality with
  the returned documentId. Do not require a hyphenated UUID, normalize its case,
  or fall back to a frame target. The runtime API describes a document UUID but
  does not promise a specific textual representation; browser scripting remains
  responsible for resolving the exact token. See the official
  [MessageSender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender)
  and [InjectionTarget](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-InjectionTarget) contracts.
* **`src/background/serviceWorker.ts`**: Service worker handling telemetry, native messaging relay, analysis-result persistence, and the sole production update coordinator. Native-message logging is metadata-only; it must not log prompt-bearing payloads.
* **`src/background/updateRuntime.ts`**: Strict update parsers and serialized durable state machine for `dh_update_state`, restart resume, alarms, detached status polling, terminal reload, and receipt-backed finalization.
* **`src/background/teamManifestSync.ts`**: Team sync response boundary. Manifest-only fetches re-read `dh_prefs` after every fetch result, including failure/null/304. Selected-team responses preserve `committed|unchanged|failed|skipped|stale` plus captured identity.
* **`src/utils/irSla.ts`**: First bounded IR SLA milestone: recognizes only the observed exact `Succeeded` terminal label under strict active Summary ownership, returning a scan-time status/timestamp pair or no pair when the timer root is absent. Not a countdown or general SLA-state reader. See [IR SLA snapshot](docs/specs/ir-sla-snapshot.md).
* **`src/utils/analysisPrompt.ts`**: Send-time Custom User Prompt assembly and reserved IR SLA section replacement for both constructed and preformatted FAB context. IR metadata comes from the current accepted scan, not edited template text or a new send-time clock.
* **`src/utils/telemetry.ts`**: Azure Application Insights integration for anonymous telemetry.
* **`manifest.json`**: Defines permissions (`nativeMessaging`) and background scripts.
* **`dist/`**: The build output directory. Load the extension from here (`extension/dist`).

### `host/` (Backend)

* **`dh_native_host.py`**: The core backend script.
  * **Loop:** Runs an asyncio event loop; `start_input_thread` reads Chrome messages from `stdin` in a separate daemon thread. Keep I/O-bound SDK calls async and use Python type hints extensively. Catch main-loop exceptions and return `{"status": "error", "message": "..."}` rather than crashing.
  * **Stdout:** Reserve it for Native Messaging; use `logging.info()` / `logging.error()`, never diagnostic `print()`. Preserve the post-dispatch stdout redirection described in [Stdout Protection](ARCHITECTURE.md#c-stdout-protection).
  * **Startup Boundary:** The constructor does not import, overwrite, or delete sibling or nested Extension trees. Verified packaged startup permits legacy `.old*` cleanup; product replacement belongs to transactional update or the matching installer.
  * **Frozen Build:** `release_helper.py::pyinstaller_build_command` excludes only the development-time `pydantic.mypy` and `pydantic.v1.mypy` plugins to avoid collecting development dependencies and vendored runtime/data. Keep all 17 required hidden imports; confirm exclusions against actual build graphs, not just command arguments. This is not proof of antivirus compatibility.
  * **Timeout:** User-configurable timeout for Copilot requests via Options -> Analyze Timeout (range 60-3600s, default 1200s). Stored as `extension_preferences.analyze_timeout_seconds` in `config.json`. See [Analysis Timeout](#2-analysis-timeout) for clamping and the three-site sync contract.
  * **Logging:** Uses `_SafeRotatingFileHandler` (5 MB max, 3 backups, about 20 MB total), catching Windows `PermissionError` for locked files. Writes to `%LOCALAPPDATA%\DynamicsHelper\native_host.log` (Windows), or `~/.config/dynamics_helper/` (Linux/Mac). Options selects DEBUG/INFO/WARNING/ERROR, default INFO; apply at startup from `config.json` and live on `update_config`.
  * **Config Loading:** Prioritizes `%LOCALAPPDATA%` config over the local directory.
  * **Session Persistence:** Uses deterministic UUID v5 session IDs (derived from case IDs via `_case_to_session_id()`) for Copilot `/resume` support.
  * **Case ID Validation:** `_extract_case_id()` validates 16-digit case IDs and 19-digit task IDs.
* **`update_service.py`**: Production updater composing validated archive staging, transaction mutation/rollback, and detached recovery/finalization. `updater.py` remains only for verified legacy `.old*` cleanup; `Updater.apply_update` is not production reachable.
* **`update_operation.py`**: Distinct cross-process operation mutex. It
  wraps full service operations and is always acquired before the installation
  mutation mutex.
* **`pii_scrubber.py`**: PII redaction utility for sanitizing text before sending to the LLM.
* **`system_prompt.md`**: Product-managed Core for one Analyze request: support-task scope, selected-instruction/data separation, authorized tool/file actions, privacy, evidence and output requirements. It does not assume a particular model, cloud product, MCP service or case-management framework. Repository instructions define specific workflows without overriding Core safety boundaries. Prompt wording is not a permission sandbox or proof that a workflow executed.

### Test Files (`host/`)

* **`test_pii_scrubber.py`** — PII redaction tests.
* **`test_case_id.py`** — Case ID extraction/validation tests (16-digit, 19-digit, edge cases).
* Live/unreviewed analysis probes are not ordinary offline unit tests. Their filenames do not authorize discovery or execution; separate source/dependency review and applicable live-effect authorization are required.

### `%LOCALAPPDATA%\DynamicsHelper\` (User Configuration)

Resolve log/config paths from `os.environ.get("LOCALAPPDATA")` on Windows or
`~/.config` on Linux/Mac. Use absolute paths; never write user data to the program
directory (such as Program Files), which requires administrator privileges.

* **`config.json`**: Defines Root Path, Repository ONLY, MCP, Skills, model/performance settings, and mirrored extension preferences. Ships with a minimal default; additional capabilities are user-configured.
  * *Note:* In Production mode, this file is shared between the installed app and the user's overrides.
* **`native_host.log`**: The primary debug log.
* **`copilot-instructions.md`**: DH-specific Instructions. This is one editable system source, selected only when Repository ONLY is not effective.
* **`user_prompt.md`**: Canonical Custom User Prompt source, reread for each Analyze and appended before PII scrubbing.

---

## The Copilot Integration Pipeline

Understanding how a user request becomes an AI response.

### 1. The Prompt Pipeline

1. **User Input:** The user provides error text, context, and case metadata via the Extension UI.
2. **Native Messaging:** The page submits `analyze_error`. For each valid document-bound case Analyze, the SW prepares attachments and constructs private `analyze_with_attachments` with `{analysis, attachments}` before Host dispatch. Generic/page forwarding of the private action is denied; requests without the required case/document binding retain the ordinary path.
3. **PII Scrubbing (`pii_scrubber.py`):**
    * Before sending to the LLM, the `text` and `context` are scrubbed using regex.
    * **Removes:** Emails, IPv4 Addresses, US Phone Numbers.
    * **Note:** GUID redaction is currently disabled to preserve technical identifiers needed for troubleshooting (e.g., Subscription IDs, Resource IDs).
4. **Session Management:**
    * The backend validates the case number via `_extract_case_id()` (accepts 16 or 19 digits).
    * A stable deterministic UUIDv5 is derived via `_case_to_session_id()` from the bare case number and the shared MyCasesKit namespace. The same UUID is the SDK `session_id` argument and the shell-CLI resume handle.
    * Before every Analyze, the Host validates the effective Root and resolves an immutable prompt snapshot containing exact DH Core bytes plus exactly one selected editable source. Strict UTF-8 decode or source-availability failures stop before any model turn.
    * Smart refresh compares `current_case_id` plus `current_session_root_path` (the root actually applied to the active session), not just the desired `self.root_path` config value.
    * Smart refresh also compares `current_prompt_fingerprint` with the snapshot's versioned fingerprint. A changed source mode, Core bytes, or selected-source bytes resumes/creates the same UUIDv5 session before sending the turn.
    * On session creation or refresh, `resume_session(uuid, ...)` is tried first and ordinary failures fall back to `create_session(session_id=uuid, ...)`. `SessionOptionsPatchError` is terminal, with no create fallback or transport retry. Resume, create fallback, and transport retry receive equivalent Root, prompt, isolation, Skills, MCP, hook, permission, and model/performance kwargs.
    * The session UUID is injected into the `system_message` content as `## Session Info` / `Session Name: <uuid>`, making it available for `context.md` frontmatter `session_name:`.
5. **SDK Execution (`send_and_wait`):**
    * The backend sends scrubbed case/context/Custom User Prompt text, appends eligible raw attachment text, and supplies qualified image blobs when available. The **user-configurable model timeout** remains unchanged (default 1200s, range 60-3600s, Options > Analyze Timeout). FAB uses `(clampedModelSeconds + 120 + 10) * 1000` ms, not the old model-plus-10 formula. Startup, refresh, import and retries prevent a guaranteed Host-first end-to-end timeout; the UI fallback is not cancellation.

Analyze also projects best-effort phases and SDK tool start/completion events
through `host/analyze_progress.py::AnalyzeProgress`. Inner-payload v1 opt-in,
closed schemas, safe aliases, limits and originating-document routing are defined
in the [progress contract](docs/specs/native-message-snapshot.md#analyze-progress-contract).
Progress cannot settle the SDK request or detect per-service MCP auth waits.

#### Automatic Attachment Preparation

**Implemented-source; focused offline milestones passed, runtime UNVERIFIED:** `attachmentPreparation.ts`,
`attachmentPortal.ts`, `attachmentDownload.ts`, the current SW and
`host/analysis_attachments.py` / `handle_attachment_analyze` are production source,
not just the standalone harness. The initial 13-file frontend run passed 519/524;
all five failures were in `FAB.pageIdentity.test.tsx`. FAB prematurely settled
progress before terminal page revalidation; settlement now shares the result UI's
post-revalidation publication gate. The affected four complete files passed 98/98,
including two new ownership cases. This expands the selected inventory to 526
in aggregate, not evidence of a full 526-test run. An early-settle mutation made
both new cases fail as expected (2/2 RED); it was removed. Restored GREEN
(`green-restored`) is confirmed: 2 passed, 45 skipped, exit 0; FAB's raw hash
matches the pre-RED ownership-fixed bytes (prefix `D5DF`). Final TypeScript
(`attachments-final`) exited 0 with sources unchanged, independently of the
earlier corrected TypeScript PASS.

The `analysis-attachments` pure-Host profile is confirmed 21/21, exit 0. Its reader
tests mock every filesystem operation and qualification uses SDK-shaped RPC mocks;
it does not exercise real attachment file I/O or Host/SDK runtime. The Host source
hash in `tests/sdk-test-review.json` was updated to `32736e8b912ebf54b51de265932e3baa856aa353f43bb2be560edde486fd018e`,
but the fixed SDK tests were not rerun; a review hash is not runtime qualification.
Production is not built, installed or live-verified and no actual attachment model
inputs were exercised. Broader SDK/full-build verification needs applicable user
approval; the previous standalone-harness scope does not authorize production
builds. Historical harness metadata completion is not product qualification. See the
[verification status](docs/dtm-attachment-investigation.md#initial-verification-status).

Every valid, originating-document-bound Analyze prepares a fresh invocation,
including repeat requests for the same case, before its first model send. Durable
pending/latest-owner commit precedes preparation; generation, source identity and
serialized updater authorization are rechecked before private dispatch. Stale
preparation does not send. Unavailable attachment preparation can continue a
still-current Analyze with cautious notice metadata, without another confirmation.

The SW opens an inactive owned DTM Home tab. Its 30-second create-to-ready/auth
deadline includes navigation/readiness, not model execution. Only transient
read-only inspection retries within that original deadline; uncertain external-tab
selection or download dispatch is not retried. Sign-in and browser safety prompts
remain user actions. Up to four sequential 10-second observation windows correlate
full initial request URI to a unique safe completed browser download ID, never
filename/time alone. The helper budgets 89 seconds of work plus up to one second
of cleanup, with bounded API awaits. Timeout cannot recall a dispatched script or
cancel a browser download. Late auth/files cannot change the returned file set.

`readAttachmentPortal` returns the closed `{status: 'workspace_missing'}` only
for inspection of the exact no-workspace modal for the full same 16/19-digit
case. A readable background case header must agree; absent/hidden headers are
allowed. It never clicks Create or Cancel. The coordinator validates document
binding and returns known-empty (`files: []`, `skipped: 0`, `reason: 'none'`)
without a yellow attachment warning, unless a positive D365 count conflicts,
including at final source revalidation; that remains unknown/unavailable.
`tabOrigin` updates `authPending` from the latest successfully read URL, so a
return to the portal clears historical login evidence rather than misclassifying
a later readiness failure as `auth_timeout`. Failed tab reads retain the last
observed state; the 30-second deadline is unchanged. These are implemented source
fixes, not live verification.

Host receives only selected completed download `{path, size}` descriptors from
the private SW action, never local paths supplied by a page. The reader rejects
observed links/reparse points, checks ordinary replacement/size changes, and reads
at most 2 MiB per file into immutable bytes, four files/8 MiB total. Local path
syntax and these checks are not an OS sandbox, exclusive provenance proof, or
guarantee against concurrent filesystem mutation. Downloads stay in the browser's
normal destination; import is in memory with no Root staging or Root/report-path
change. Never log raw URLs, credentials or attachment contents.

Allow only `.png`, `.jpg`, `.jpeg`, `.txt`, `.log`, `.json`, `.xml`, `.csv`, `.md`.
Text decodes strict UTF-8 without BOM/newline normalization and is wrapped as
untrusted evidence after the unchanged case/context/Custom User Prompt scrub.
Images receive signature checks (not full sanitization), then effective-session
model vision/media/count/size qualification before sending. Unknown capabilities
skip images, never switch models. Reconnect attempts reuse frozen bytes and
requalify images against the active session. Unsupported/failed inputs contribute
to the product notice; unknown inventory never asserts that attachments exist.

`AttachmentImportOwner` now owns at most one import task per Host, with a
cooperative 5-second caller wait. It validates and freezes all metadata before
any I/O or busy fallback. Empty input starts no thread; a busy call immediately
gets a fresh fallback counting its selected files as skipped, without queuing or
reusing earlier inputs. Timeout likewise returns a fresh skip fallback. Late
completion is discarded, never reused or allowed to trigger a model send. Caller
cancellation propagates while the worker remains owned until completion.

The timer is not a hard real-time deadline under event-loop starvation. Timeout
and caller cancellation do not cancel/bound underlying OS reads or executor
shutdown. FAB's unchanged 120-second preparation allowance is separate, as is
DTM's 30-second readiness/auth deadline; file limits and the model timeout are
unchanged. Existing startup/session refresh is not fully bounded. Model
qualification RPCs have individual cooperative 3-second waits, not an end-to-end
guarantee.

This import-wait source-plus-focused-offline milestone is complete: main-agent
confirmation is **31/31**, zero failures/errors/skips, runner exit 0 and unchanged
sources. Evidence `dh-safe-tests-5ukf7zga/results.jsonl` ends with `finished: 31`;
`cleanupErrors: []`, `capture_errors: []`, `reader_pending: false` and
`child_unreaped: false`. Broader supervisor
`dh-analyze-progress-host-attachments-import-deadline` returned 0 with
`changedSources: []`. Current `host/dh_native_host.py` SHA-256 is
`fefd0ccef620e54c5c06a04c3e37d9a31fb79e685f1e4ed3c5e4b0592187a160`.
The SDK review binding was refreshed for source only; fixed SDK tests were not
rerun. The historical 25-pass SDK result does not qualify this new hash. See the
[import-wait evidence](docs/dtm-attachment-investigation.md#host-import-caller-wait-follow-up).
This is focused offline verification, not real attachment I/O or live runtime
qualification; this documentation finalization runs no new tests or runtime work.
Only Host source changed for this follow-up, so no new Extension build/reload is
required for it. An already-running source Dev Host needs a normal restart before
future authorized live verification; no automatic restart or registry switch.

The Extension accepts wire `attachment_notice` as separate `attachmentNotice`
through persistence, hydration and rendering beside known prompt-code localization.
Host now emits a nonempty `attachment_notice` beside success `data.markdown`, or
beside the inner Analyze error fields, without prefixing `full_response` or error
text. Saved reports write it in a separate `## Attachment Status` section before
`## AI Explanation`. Known prompt-code localization therefore does not replace
the separately carried notice.

Before each send attempt, after image qualification, Host resets `send_prompt`
from `safe_prompt` and appends a fixed product input-status summary from
`report_notice` when nonempty. It uses frozen preparation and that attempt's
qualified-image count, asks the model to use only supplied inputs, not claim
omitted files were reviewed, and not repeat the separately displayed status.
Retries do not accumulate summaries. This source fix does not prove model
compliance, current SDK compatibility or end-to-end runtime behavior.

No attachment capability was added to `get_capabilities`/`product_info.py` and no
private-action version negotiation or old-Host fallback exists. A matching updated
Host is necessary; the existing generic version/integrity gates do not prove this
new action is supported, especially with unchanged version metadata. An old runtime
fails rather than silently reverting to `analyze_error`. See the
[wire contract](docs/specs/native-message-snapshot.md#private-attachment-analyze)
and [remaining verification](TODO.md#attachment-analysis).

#### SDK Adapter And Headless Permissions

The source dependency is SDK 1.0.13. The Host imports `CopilotClient` from
`host/sdk_client.py` via `sdk_client`, while `RuntimeConnection` comes from
`copilot` and permission types come from `copilot.session`. This narrow wrapper
uses the private `_apply_post_create_options_patch` hook to require literal
`success is True` from the first options update, including instruction isolation.
A negative/malformed result or exception raises `SessionOptionsPatchError`;
the Host clears active session/client state and `current_prompt_fingerprint`,
performs bounded cleanup, and stops without fallback, retry, or a model turn.
Remove the adapter only after an upstream fix is confirmed to check that first
update's success and the focused regression tests pass without the adapter.

Ordinary permissions (`managed_approval_required` exactly `False` or `None`)
return `PermissionDecisionApproveOnce()`. Managed-required (`True`), invalid,
or unreadable values return `PermissionDecisionUserNotAvailable()` immediately.
Do not add unconditional pre-tool `allow` or omit the permission handler on any
create/resume path. See [SDK integration](docs/sdk-integration.md)
for the adapter contract and the [SDK upgrade workflow](docs/sdk-upgrade-workflow.md)
for offline verification; source/offline results do not
claim a frozen build or an installed production upgrade.

### 2. Session Persistence

The host maintains persistent sessions so users can continue analysis in the Copilot CLI.

* **Session ID:** A deterministic UUID v5 derived from the case ID via `_case_to_session_id()`. The same case always produces the same UUID, enabling resume across restarts. Preserve the namespace and bare-case input in [Deterministic session identity](docs/specs/deterministic-session-identity.md); repository relocation or renaming must not change the identity.
* **Server Verification:** After `create_session()`, the session ID is read from `session.session_id` and stored in `self.current_session_id`.
* **Case Tracking:** `self.current_case_id` tracks which case the current session belongs to, used for smart-refresh comparison (not the session ID itself).
* **SDK Mechanism:** `client.resume_session(session_id, working_directory=root, skip_custom_instructions=True, ...)` restores state from `~/.copilot/session-state/{session_id}/` and explicitly applies the configured Root. `CopilotClient` also receives the same Root so its CLI subprocess never falls back to the Native Host install cwd. Every create/resume/retry path keeps `skip_custom_instructions=True`.
* **Graceful Fallback:** If the SDK version doesn't support `resume_session()`, an `AttributeError` is caught and a new session is created instead.
* **Report Integration:** `dh_case_report.md` includes the UUID and `copilot -C '<root>' --resume=<uuid>`. `-C` applies the correct Root before the interactive CLI continuation resolves workspace capabilities even if an old session persisted the wrong cwd. DH's SDK session does not rely on CLI automatic instruction discovery.
* **Response Payload:** The session name is returned to the extension as `session_name` in the analysis response for frontend visibility.
* **System Message Injection:** The UUID is appended to the `system_message` content as a `## Session Info` section (labelled `Session Name: <uuid>`) before session creation. This ensures the AI can reference it (e.g., for `context.md` frontmatter `session_name:` field) without relying on a fallback value.
* **Lifecycle:** Startup initializes only the SDK client; session creation is lazy until Analyze supplies a case. Config updates preserve an active deterministic case session and never replace it with a generic UUIDv4 session. Root changes restart the client and refresh the session. `update_config` is authoritative for clearing root; a missing/empty Analyze `rootPath` reloads host config so a pre-hydration extension default cannot overwrite the canonical disk value.

### 3. Deterministic Prompt Sources

DH owns instruction selection. Every SDK `create_session()` and `resume_session()` call, including fallback/retry paths, sets `skip_custom_instructions=True`. The spawned Copilot CLI therefore does not automatically add CLI-global instructions, Root/ancestor `AGENTS.md`, path-specific `.instructions.md` files, agent instruction files, or automatically discovered `.github/copilot-instructions.md` to a DH session. This does not exclude DH's explicit injection of its selected Root entry.

The Host explicitly injects DH Core plus exactly one editable system source. Custom User Prompt remains separate PII-scrubbed user-role content on every Analyze:

| Root Path | Persisted Repository ONLY | Effective system sources | Analyze user content |
|---|---:|---|---|
| Empty | false or true | DH Core + DH-specific Instructions | Case payload + Custom User Prompt |
| Non-empty | false | DH Core + DH-specific Instructions | Case payload + Custom User Prompt |
| Non-empty | true | DH Core + `<Root>/AGENTS.md`; only if absent, use `<Root>/.github/copilot-instructions.md` instead | Case payload + Custom User Prompt |

`effective_repository_only = bool(effective_root) and use_workspace_only`. A non-empty Root does not select Repository Instructions by itself. DH-specific and Repository Instructions are mutually exclusive. In Repository ONLY mode, `<Root>/AGENTS.md` takes priority; only its absence permits the legacy `<Root>/.github/copilot-instructions.md`, never both. Only these two Root entries are candidates: no parent or nested-directory search. Empty Root or mode off retains DH-specific selection. Repository ONLY still controls Skills and MCP according to their existing paths and rules; DH Core, SDK built-ins, Session Info, hooks, tool definitions, and Custom User Prompt remain active.

#### Immutable Snapshot and Fingerprint

`_resolve_prompt_snapshot()` reads DH Core and the selected editable source exactly once in binary mode. It stores the exact bytes and strict UTF-8 decoded strings in frozen `PromptSnapshot`; it performs no BOM, newline, or whitespace normalization. `_build_system_message()` uses only that snapshot, in this order:

1. DH Core System Prompt.
2. The selected editable source, omitted from assembly only when its decoded content is empty/whitespace.
3. Deterministic Session Info.

The snapshot fingerprint is `v1:` plus SHA-256 over length-framed version marker, source mode, exact Core bytes, and exact selected bytes. Root identity remains a separate refresh condition. The selected filename is not hashed; switching between repository entries with identical bytes does not itself require a refresh. Before each Analyze, an unchanged case/Root/fingerprint reuses the active session; any change refreshes the same UUIDv5 session. The candidate fingerprint is committed only after awaited SDK resume/create succeeds. `_invalidate_active_session()` always clears `current_prompt_fingerprint`, so resolution, refresh, timeout, transport, and uncertain durable-write failures cannot reuse stale prompt state.

#### Source Errors and Config Health

Strict Analyze/session resolution fails closed:

* Missing or unreadable/invalid-UTF-8 DH Core blocks Analyze.
* A missing DH-specific file is valid empty content; an existing unreadable/invalid-UTF-8 file blocks Analyze when selected.
* An existing empty Repository Instructions file is valid; empty `AGENTS.md` never selects the legacy entry. Only absent `AGENTS.md` permits legacy selection. Both absent reports `repository_instructions_missing`.
* An unreadable/invalid-UTF-8 repository entry, directory, or broken link reports `repository_instructions_unreadable` and blocks Analyze without fallback. The Host never falls back to DH-specific or CLI-global instructions, and no user turn is sent on failure.

`get_config` is intentionally softer. `_get_session_config(include_prompt_status=True)` returns normal configuration plus `prompt_source_status` without creating or committing a session snapshot. It returns readable `_user_instructions_raw` and `extension_preferences.user_prompt`, including explicit empty content. If either file exists but cannot be read as strict UTF-8, its content property is omitted so Options retains its Chrome mirror and shows the safe health warning; unreadable Custom User Prompt reports `user_prompt_unreadable`. Legacy hydration is used only when `prompt_source_status` is absent. Calls without `include_prompt_status=True` never read, migrate, or hydrate `user_prompt.md`; Analyze owns one separate canonical read per request.

After the latest `update_config` intent is durably acknowledged, Options sends one additional health-only `get_config`. This callback changes only `promptHealthIssue`; it never re-enters the full hydration merge. Both config and health generations must still match before applying a response, so an older health result cannot replace newer state. Transport/non-success responses leave the existing health issue unchanged.

Prompt-source errors carry a stable `error_code` and safe English fallback. Options/FAB preserve unknown non-empty codes, localize known codes only at render time, and never tell users to re-authenticate for a source/configuration error. Logs may include safe source mode, classified code, or a short fingerprint prefix, but never instruction contents, Custom User Prompt contents, or prompt-source paths. SDK response-event diagnostics are likewise metadata-only: event type, data type, content presence, and content length. No-content fallback reports use that safe summary and never serialize the event, its data, or model content.

FAB applies Custom User Prompt immediately before every send for an accurate editor/template preview. The Host remains authoritative: it rereads `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md` on each Analyze, truncates payload text from the first authoritative line-level marker, appends current non-empty file content exactly once, and then PII-scrubs the canonicalized text. Empty file content removes stale payload sections; an unreadable or invalid UTF-8 file blocks Analyze as `user_prompt_unreadable` without logging content or path.

| Prompt/config error code | Host condition | Extension behavior |
|---|---|---|
| `dh_core_prompt_missing` | Core absent | Localized install repair warning |
| `dh_core_prompt_unreadable` | Core read/decode failure | Localized install/permission warning |
| `dh_specific_instructions_unreadable` | DH-specific file read/decode failure | Omit raw field; preserve Chrome mirror |
| `repository_instructions_missing` | Both `<Root>/AGENTS.md` and legacy `<Root>/.github/copilot-instructions.md` absent | Localized add-file/disable-mode warning |
| `repository_instructions_unreadable` | Repository entry read/decode failure, directory, or broken link | Localized repair/disable-mode warning; no fallback |
| `user_prompt_unreadable` | Custom User Prompt read/decode failure | Omit `user_prompt`; preserve mirror until explicit repair |

Options treats `user_instructions` and top-level `user_prompt` as sparse
revisioned writes. Their edit/clear/Reset handlers capture immutable
`{revision, value}` tokens; unrelated updates omit both fields and
`config.extension_preferences` never carries `user_prompt`. A saved response
acknowledges only its captured revision, while transport/unsaved failures leave
that revision pending for a later intent.

The ordered `dh_prefs` mirror is a single-flight coalescing queue and owns typed post-commit actions. Normal saves and hydration catch-up both enter it as immutable snapshots. Each action has a
stable ID and captured Team Catalog identity. Compatible newer snapshots carry
unsettled actions forward; incompatible enabled/URL/team snapshots cancel team
actions. The latest successful durable callback, with no queued newer intent,
settles before dispatch and runs the matching Host update from
`onLatestCommit`. Storage
`chrome.runtime.lastError` runs neither, leaves actions unsettled, and exposes a
persistent retryable issue. Reset is separate after its initial mirror action:
`resetTransactionRef` captures immutable default identity, request/bookmark
generations, token, retry action, and phase (`host-pending`, `host-committed`,
`sw-pending`, `local-cleanup-pending`, `complete`). The matching mirror must
commit and tokenized Host `update_config` must return `success: true` or
`config_saved: true` before Options dispatches `RESET_EXTENSION_STATE`. Options
records `host-committed` before generation/supersession checks. From then on,
Retry cleanup never enters `persistPrefs`, never sends Host/defaults, and reuses
the token for only the pending SW/local phase. A normal Reset click always starts
a new transaction. SW default-identity validation and separate team/bookmark
generation checks prevent retry from clearing newer-owned state.

Personal bookmarks have a separate generation boundary. Every add/edit/delete/
move/import/collapse and Reset intent calls `mutatePersonalItems`; all `dh_items`
writes use one Promise queue. Reset captures that generation, first reads and
validates defaults through `readDefaultItems`, then collapses folders and queues
the complete default snapshot without first removing `dh_items`. It rechecks
cleanup ownership after awaited work, before the queued write, and before
applying committed defaults to the UI. Default-read failure preserves existing
bookmarks and retains local-cleanup retry. A newer mutation supersedes personal
cleanup, stays visible, and queues its snapshot after any already-started write;
separately owned team cleanup may still finish without resetting newer bookmarks.
A failed current write retains the newest complete snapshot intent, displays a
persistent localized bookmark warning, and leaves the queue usable. A later
bookmark mutation coalesces to the newest UI snapshot; a successful current write
clears the warning. Older failures cannot replace a newer intent or its warning.

Options team cache hydration and storage follow-up reads use one UI generation
plus captured enabled/URL/team identity before applying list/items/synced state.
`useMenuLogic()` similarly accepts only its latest mount/storage load and ignores
all results after unmount. FAB Analyze state is the union of a local request ID
and the current hydrated pending identity. The one active safety timer is tagged
with its request ID; a new request cancels it, and stale response/finally/timeout
paths cannot clear or report against the replacement request.
Ownership remains live through all response-processing awaits, including case
hashing; every post-await continuation rechecks request ID before UI, duration,
menu, or outcome-telemetry changes.

FAB freezes progress intake at response receipt, before the case-hash await,
without releasing terminal ownership. `analyzeProgressState.ts` retains bounded
request-local activity while page/scan identity gates hide stale views; closing
the menu does not clear it. `AnalyzeProgress.tsx` renders the panel independently
of the optional status bubble. The content-to-FAB channel is an isolated-world
module, not a public DOM event.

Team manifest and bookmark URLs are credential-bearing data because Azure SAS values commonly live in their query strings. `teamCatalog.ts` returns fixed safe diagnostics and logs only failure kind plus numeric status. Every Options request captures enabled/URL/team plus a request generation. The Service Worker synchronously allocates a storage generation before any asynchronous pref/cache read, rejects stale identity before clear/fetch, rechecks generation after awaited reads, and queues identity validation together with awaited mutation. `setStorage` and `removeStorage` inspect `chrome.runtime.lastError` inside their callbacks and reject with fixed safe errors. Manifest/bookmark/304 writes and clear/Reset removes therefore cannot report committed after a rejected mutation; selected failed responses omit items and timestamps. The queue's rejection continuation keeps later operations usable. Options sends messages only and clears rendered team items/timestamp immediately on identity change.

Manifest URL blur deduplication uses two refs, not one optimistic marker.
`lastSuccessfulManifestUrlRef` changes only for a current identity-matching
`committed` or `unchanged` response. `manifestFetchInFlightRef` stores a token
and URL, suppresses only a duplicate concurrent URL, and is cleared only by its
own callback. Auth/network/transport/failed/stale/skipped outcomes can retry on
the next same-URL blur; URL A cannot clear or complete URL B. Every Options
current/response team check normalizes an omitted team to `''`, so no-team
committed/unchanged results deduplicate while failed/stale/skipped results retry.

`safeErrorText(candidates, fallback)` is the shared string-selection boundary
for extension error persistence and display. It returns the first non-empty
string unchanged; it never calls `String`/`toString` or serializes candidate
objects, arrays, functions, symbols, or null. `analyzeBridge`,
`normalizeNativeHostResponse`, `configUpdateResult`, Options prompt health and
immediate warnings, FAB nested/outer/catch paths, and Service Worker immediate
normalization all use it. `normalizeNativeHostResponse` still leaves success
`data` unchanged and allowlists normalized `error_code`, string `errorKind`, and
finite numeric `httpStatus`, so model-list classification remains available
without exposing arbitrary Host fields.

Analysis pending and dismissal state is request scoped. Starts write `dh_pending_analysis:<encoded-requestId>`; completion removes only that key. The legacy singleton pending key remains readable. `seenAnalysisKey()` produces collision-safe request or exact legacy case/timestamp keys, so A/B acknowledgments coexist. Hydration performs one `get(null)`, selects the newest fresh pending matching the current case, observes pending storage changes/expiry, and derives matching seen state from the same snapshot. Reset removes both prefixes and legacy singletons.

Use [SDK integration](docs/sdk-integration.md) for supported diagnostics and the fixed offline entry in [SDK upgrade workflow](docs/sdk-upgrade-workflow.md) for reviewed contracts. Unsupported probes must not substitute for these entries; live CLI/model probes require separate authorization. See [TODO.md](TODO.md) for current diagnostic limitations.

### 4. Skills Configuration

Capabilities (Skills) are loaded based on the following precedence:

1. **Base Skills:**
    * **User Skills:** Defined in `%LOCALAPPDATA%\DynamicsHelper\config.json`.
    * **Default Skills:** The `host/skills/` directory is reserved for bundled skills but currently ships empty. Skills are user-configured.
    * *Rule:* User Settings **override** Default Settings. If `skill_directories` exists in User Config, Default is ignored.

2. **Workspace Skills:**
    * **Source:** `[Root Path]/.github/skills` directory.
    * *Rule:* Workspace skills are **appended** to Base Skills.

3. **Repository ONLY Mode:**
    * If enabled: The AI uses **ONLY** Workspace Skills. Base Skills (User + Default) are ignored.

### 5. MCP Configuration

Model Context Protocol (MCP) servers follow similar logic:

1. **Base MCP:**
    * **Path selection:** The merged Host configuration's non-empty `mcp_config_path`, otherwise `~/.copilot/mcp-config.json`; the user-configured path overrides the bundled configuration's path.
    * **Server source:** The selected file's `mcpServers` object. Legacy inline `mcp_servers` in either user or bundled `config.json` is ignored; there is no separate bundled `mcp-config.json` fallback.

2. **Workspace MCP:**
    * **Source:** `[Root Path]/.github/mcp-config.json`.
    * *Rule:* Workspace `mcpServers` are **merged** into Base MCP servers, overriding servers with the same name.

3. **Repository ONLY Mode:**
    * When enabled **and a non-empty Root is effective**, Base MCP is skipped and only Workspace MCP servers are loaded. With no effective Root, Base MCP is still loaded. Missing/unreadable workspace MCP does not restore Base MCP in Repository ONLY mode.

---

## Frontend Patterns

Use small, focused functional components with `useState`, `useEffect` and `useRef`.
Keep UI state local and persistent preferences in `chrome.storage.local`.
Use asynchronous `pageReader.ts` for scraping, `await yieldToMain()` in long
content-script loops, and debounced `MutationObserver` auto-scans.
Prefer Tailwind `className` utilities for new UI; existing inline styles remain
appropriate for complex dynamic positioning (`clsx` / `tailwind-merge` are used).
Use `lucide-react` for all icons.

### IR SLA Snapshot

The first bounded terminal milestone is implemented in `irSla.ts`,
`pageReader.ts`, `pageIdentity.ts`, `FAB.tsx`, and `analysisPrompt.ts`. The observed
`TimercontrolState` evidence is the exact `Succeeded` label, not a general enum
mapping or an API contract. Extraction requires the exact `IR_SLA_Timer` root,
one rendered selected `Summary` tab, and verified panel ownership of the rendered
terminal label. A present `aria-controls` must resolve its single valid target;
invalid explicit controls never enable fallback. A unique timer alone does not establish
ownership. Label `aria-hidden="true"` does not mean CSS-hidden; the panel's own
`aria-hidden="true"` does reject panel authority. Exact selectors and rendering
checks are specified in the [contract](docs/specs/ir-sla-snapshot.md).
Read-only inspection in the confirmed Profile 1 context found a selected Summary
`li` with `aria-label="Summary"`, direct text `Summary`, extra aggregate text and
no `aria-controls`. The source fix uses accessible/direct tab text and permits
fallback only for an absent attribute: a unique outer record tabpanel under the
unique main contains the matching canonical record header and selected Summary
tab (whose nearest pane is that outer pane), plus a Summary tabpanel whose
parent's nearest pane is the same outer pane. The exact `Performance indicators`
section inside Summary must own the IR root and label. Rendering ancestry follows
CSS and `assignedSlot`. The earlier source allowed the explicit path without
`expectedCase`; current hardening requires an exact full 16/19-digit canonical
header and the same record-pane ownership for both explicit and fallback paths.
The TypeScript parameter remains syntactically optional, but omission cannot
authorize a `Succeeded` read. Invalid explicit linkage never enables fallback.
This tightens the earlier source fix without erasing its historical evidence;
current scoped offline verification is recorded in the capture hardening review,
not a new full-suite or runtime qualification.

PageReader binds capture before/after to the full live 16/19-digit record number,
without title fallback or task-to-parent normalization. The snapshot parser
accepts only the complete string pair `irSlaStatus: 'Succeeded' | 'unknown'` and
`irSlaCapturedAt` in canonical ISO UTC form, or neither. A missing supported root
omits both; a recognized root with insufficient evidence returns `unknown` with
capture time. These are internal scraped metadata, not new Host RPC fields.

FAB requires the current accepted scan and no newer pending scan. Same-case
acceptance can update scan-owned IR metadata while retaining user-edited context.
At send assembly it uses `invocation.accepted.data`, removes the canonical User
Prompt tail, replaces the reserved IR section, then appends the current prompt.
The outgoing replacement leaves the editor and already-frozen Analyze untouched.
The timestamp is the accepted scan's capture time, never a fresh send clock.
Countdown/deadline stay unknown; no Severity/Created On deduction, live budget or
percentage is implemented.

Only the IR section helper recognizes ordinary backtick/tilde fences; this is
not a general Markdown parser. `applyCurrentUserPrompt` still uses the first exact
line-level `## User Prompt` marker even inside a fence. Host canonical prompt-file
behavior is unchanged.

The earlier bounded source/offline milestone is **complete**, with results confirmed by
the user: `initial-green` passed **297/297 across seven complete test files**;
TypeScript `ir-sla` exited 0 with sources unchanged. RED mutations disabling
Succeeded capture and outgoing accepted-snapshot use produced **4 failed,
3 passed, 109 skipped**. After removing the mutations, `green-restored` confirmed
**7 passed, 109 skipped, actual exit 0**, with raw `FAB.tsx` and `irSla.ts` bytes
matching `initial-green`. The restored focused run is not a second full 297-test
run. These prior tests were not rerun for this update.

The earlier user-confirmed Extension build is **PASS, not live-qualified**:
version **2.0.77**, evidence
`dh-local-extension-2077-ir-sla-20260913`, five default items,
TypeScript/Vite/copy checks and 13 artifacts. The 407 source files and selected
tooling were unchanged. Inventory SHA-256:
`97493B28EECA5CFFB625F748ACBD04A65349AD6B80246FF6468BE616F9C7C219`.
This is historical build evidence, not verification of the ownership source fix.
Earlier ownership-fix verification is user-confirmed: the seven-file run had
**350 passed, 1 failed (351 total)**. The new slot fixture encountered jsdom's
cached opacity; mutating a fixture host attribute invalidated the cache without
changing production checks. Both affected complete files then passed **187/187**.
Disabling the case comparison produced **3 failed, 184 passed**; restoration
passed **187/187**, with restored hashes matching the fixed source (`irSla.ts`
SHA-256 prefix `24D7`). Final TypeScript exited **0**, sources unchanged. This
does not establish a full 351-test GREEN rerun.

The earlier local Extension **2.0.77** build passed the five-item gate and
TypeScript/Vite/copy checks, producing **13 artifacts** with **408 source files
and selected tooling unchanged**. Evidence:
`dh-local-extension-2077-ir-record-pane-20260913`; manifest SHA-256:
`CC88CAB04810FD826F17052DA11FAD9216B016213B64EA0B9BFD1C19939B40F1`.
Content artifact: `index.tsx-B5TB3eTu`, reported SHA-256 prefix `B6369`.
Read-only DOM source evidence and the actual-anchor fallback fix are complete;
compiled runtime preview remains unverified. No Host changes
are part of this milestone. This docs-only update performs static checks only,
with no new source review, tests, product/build-tool edits or build.

The user's prior browser verification identified **TSEWork / Profile 1** using
`edge://version` and the same browser context, not endpoint existence alone.
No browser reconnection or profile verification was performed for this docs-only
update. Keep endpoint/target identifiers, emails and case/customer data out of
documents; any fixture must be synthetic. The user confirmed cleanup of the new
direct CDP connections used for read-only evidence; this was not model execution.

The reported current environment remains source Dev, sharing real DH configuration
with Prod, not a sandbox; this update does not recheck or change registration.
The new local build is ready; the eventual Extension-only route still requires
authorized **Load unpacked** from `extension/dist/` with the installed production
Host. That route does not
authorize automatically switching the current Dev registration to Prod. Any
later switch needs its applicable scope. Host and registry remained unchanged.
Compiled preview verification awaits the user's Extension reload and D365 refresh;
inspect Case Context without Analyze or a model call. The fixed reader should return
`Succeeded` if all confirmed structure and rendering checks match; otherwise it
returns `unknown`. Neither source correction nor the current build PASS qualifies
that future preview. No browser load/test, Analyze, Host
restart, registry mutation, commit or publication occurs this turn. Remaining
countdown/deadline and other-status source discovery needs a separately scoped
user-provided running case, not one this turn. Main research/MCP work stays
separate and is not duplicated here.

### User Edit Protection (`isUserEdited` Pattern)

Background scans (MutationObserver, `useEffect` on `isOpen`) continuously scrape the page and update `scrapedData`. Without protection, these overwrites any user edits to the Case Context textarea.

**Implementation (see `FAB.tsx`):**

1. A `useRef<boolean>` flag `isUserEdited` tracks whether the user has manually edited the textarea.
2. The textarea's `onChange` handler sets `isUserEdited.current = true`.
3. All `setScrapedData` calls from background scans check `isUserEdited.current` before overwriting.
4. The flag resets to `false` only on:
   * **Identity change:** New case number or ticket title detected (SPA navigation).
   * **Explicit refresh:** User clicks the refresh button (`handleRefreshContext`).

**Rule:** Any new code path that calls `setScrapedData` from a background process MUST check `isUserEdited.current` first.

### Telemetry

* **Async failures:** Import `trackEvent` / `trackException` from `../utils/telemetry`; catch async failures with `try/catch` and report safe diagnostics, never raw SDK responses, prompt contents, or credential-bearing URLs/errors.
* **Anonymous Identity:** Stable UUID generated via `chrome.storage.local` in `serviceWorker.ts`. Do NOT use cookies/localStorage (unavailable in service workers).
* **Extension Version:** Injected automatically in `trackBackgroundEvent`. Do NOT rely on `item.data` for version stamping.
* **Querying:** Use `dcount(user_Id)` in App Insights for unique anonymous user counts.

### Internationalization (i18n)

* **Hook:** `useTranslation()` from `src/utils/i18n.ts` returns a `t(key)` function.
* **Dictionary:** `src/utils/translations.ts` maps keys to `{ en, zh }` string pairs.
* **Rule:** All user-facing strings must use `t('key')` lookups. Add new keys to `translations.ts` first, then reference them with `t()`; do not hardcode English strings in UI code.
* **Status messages:** Timeout comparisons that use `setStatus(prev => prev === "..." ? "..." : prev)` must capture the translated string into a local variable before the `setTimeout` closure (see the `checkingMsg` / `timedOutMsg` pattern in Options.tsx).

### Analysis Result Persistence

Analyze results survive page reload via `chrome.storage.local`, with one-shot semantics so a dismissed result does not reappear. See [Analysis result persistence](docs/specs/analysis-result-persistence.md) for the invariants.

**Storage schema** (`extension/src/utils/analysisStore.ts`):

* `dh_pending_analysis:<encoded-requestId>` — one `{caseNumber, requestId, startTime}` per in-flight request, written before Host RPC and removed only by that request's completion. `dh_pending_analysis` is legacy read compatibility.
* `dh_latest_analysis_owner` stores `{caseNumber, requestId, startTime}` for the latest started request. `recordAnalyzeStart` writes this owner and that request's pending marker in one serialized storage set before Host dispatch. Ownership is durable across Service Worker restarts, not inferred from response arrival order or a pending-marker scan.
* `dh_last_analysis` — `{status: 'success'|'error', caseNumber, requestId?, title, content, timestamp, seen, durationSec?, savedTo?, errorCode?}` written by SW only for a completion matching the latest-started owner. New records use `requestId` as result identity; legacy records use exact `caseNumber + timestamp`. The legacy `seen` field remains readable for compatibility but is no longer rewritten for acknowledgment. `errorCode` is an optional raw machine-readable Host code; legacy records may omit optional fields.
* `dh_seen_analysis:request:<case>:<requestId>` / `dh_seen_analysis:legacy:<case>:<timestamp>` — one identity-only acknowledgment per consumed result. The old singleton `dh_seen_analysis` is accepted only for backward compatibility.

**Two ages, do not confuse them:**

* `MAX_PENDING_AGE_MS = 2h` — GC threshold; pending markers older than this are treated as orphans (likely SW crash mid-flight).
* `MAX_PENDING_DISPLAY_AGE_MS = 15min` — UI threshold for `useAnalysisHydration`; older pending markers are not surfaced as "Analyzing…" because the user has likely abandoned the run.
* `STALE_WINDOW_MS = 1h` — rehydration window for `dh_last_analysis`; older results are not popped open on mount.

**Wire protocol — `_persist` field on outgoing NATIVE_MSG:**

FAB attaches a `_persist: {caseNumber, successTitle, errorTitle}` to the analyze payload. The SW reads this, calls `recordAnalyzeStart` before forwarding, calls `recordAnalyzeSuccess`/`recordAnalyzeError` on response, and **strips `_persist` before sending to the Host** (the Host has never seen this field and will reject unknown keys). Titles are pre-translated by FAB because the SW has no `t()` access.

Completion reads and strictly parses `dh_latest_analysis_owner` inside the same
mutation queue used for start and Reset. Only an exact `caseNumber` and `requestId`
match permits writing `dh_last_analysis`; a missing, malformed, unreadable or
different owner never grants permission. This is latest-started ownership, not
last-response-wins. Completion retains the owner and attempts request-scoped
pending cleanup in `finally`, including when ownership or result persistence fails.

For errors, persistence stores the raw safe Host fallback in `content` and preserves a non-empty `error_code` as optional `errorCode`; an inner Analyze code takes precedence over an outer wrapper code, and transport rejection does not fabricate one. Both immediate and rehydrated popovers localize known codes in `ResultPopover` at render time. The immediate path may prefix its safe fallback before opening the popover (for example, `Analysis failed:` or the Host-error label); rehydration supplies the raw stored fallback. Unknown or absent codes therefore display the fallback from their own path rather than a shared prelocalized string.

**Pure-helper boundary:**

* `extension/src/background/analyzeBridge.ts` exposes `handleAnalyzeForward(payload, ctx, deps)` with DI'd `send`. Its focused suite covers P-I1..P-I4, error-code transport, and edge 6.3 without spinning up a real Chrome port; the test count is not a contract.
* `extension/src/hooks/useAnalysisHydration.ts` exposes `{popover, pending, isAnalyzing, dismissPopover(identity)}`. It uses a batched snapshot, newest matching pending selection, storage-change refresh, and expiry timer.
* FAB keeps local Analyze in-flight state separate from the hydrated mirror. Hydration true/false is mirrored when no local request owns the spinner; hydration false cannot stop an active local request. Completion clears local ownership and retains only a different hydrated request if present.
* Progress is local-only, separate from all pending/result storage. Hydration can restore a pending spinner, not its phase, activity or session-copy details; there is no progress replay.

**popoverIsAnalyze ref discriminator:**

`ResultPopover` is shared between analyze flow and bookmark markdown previews. `popoverIsAnalyze.current` is set `true` whenever an analyze success/error opens the popover, and the close handler only calls `hydration.dismissPopover(resultPopover.identity)` when this flag and an analysis identity are present — otherwise dismissing a bookmark popover would spuriously acknowledge analysis state.

**Edge cases handled:**

* **Start-before-send ordering:** `handleAnalyzeForward` awaits `recordAnalyzeStart(ctx)` before calling `deps.send(payload)`. The Host request is not dispatched until the combined pending/owner write completes.
* **A/B isolation:** Analyses A and B have distinct pending keys. Starting B preserves A's pending marker but replaces the singleton owner. A's late completion cannot overwrite `dh_last_analysis`; either completion cleans only its own pending state, including after a Service Worker restart.
* **Stale pending on mount:** `useAnalysisHydration` checks `Date.now() - startTime > MAX_PENDING_DISPLAY_AGE_MS` and ignores pending markers older than 15 min. The marker stays on disk until GC; this is intentional (the user might still want to know if the run eventually completes).
* **Case mismatch on pending:** if the on-disk pending marker is for case A but the FAB is mounted on case B, the hook ignores the pending row entirely (no false "Analyzing…").
* **Options Reset:** dispatches `RESET_EXTENSION_STATE` only after the default `dh_prefs` mirror callback, with captured identity/generation. Serialized analysis Reset removes result, `dh_latest_analysis_owner`, both legacy singletons, and every pending/seen prefixed key as part of the coordinated cleanup with Team Catalog state. Clearing the owner prevents pre-Reset completions from restoring the result.

---

## Extension Testing

The extension test suite uses **Vitest 3 + Testing Library (React 16) + jsdom**. Tests live next to source as `*.test.ts` / `*.test.tsx`.

### Running

Follow [test execution safety](docs/test-safety.md) before execution. Commands below
run from the repository root and assume dependencies are already installed.
Focused verification must name reviewed files and cases; for example, only when
this selection is in the approved scope:

```bash
npm test --prefix extension -- --run src/utils/pageReader.test.ts -t ID_REGEX
```

The following unfiltered entries discover the full Vitest suite, not a focused
selection. Reserve them for an agreed full-suite scope. `test:run` and
`test:coverage` additionally execute the Node default-items gate before Vitest;
adding Vitest filters does not remove that extra step. Its source/dependency
review and process effects must be included, not inferred from a focused PASS.

Full one-shot run:

```bash
npm run test:run --prefix extension
```

Full watch run (requires an agreed stop/cancellation plan):

```bash
npm test --prefix extension
```

Full coverage run:

```bash
npm run test:coverage --prefix extension
```

### Config (`vitest.config.ts`)

Standalone config — **does NOT extend `vite.config.ts`**. The CRXJS plugin used for the extension build is incompatible with jsdom (it tries to resolve `chrome.runtime.getManifest()` at evaluate-time and crashes). The test config only enables the React plugin + jsdom environment.

`pool: 'forks'` is used instead of the default threads pool because some chrome mock state is module-level and benefits from per-worker isolation.

### Chrome API Mock (`src/test/chromeMock.ts`)

Provides a complete mock of the chrome.runtime + chrome.storage surfaces used by the extension. Public API:

* `installChromeMock()` — call in `beforeEach`. Wires `globalThis.chrome` to the mock.
* `resetChromeMock()` — clears storage, pending responses, scoped `lastError`, message log, **and spy call counts**.
* `seedStorage({ ... })` — pre-populate `chrome.storage.local` before render.
* `deferNextResponse(action)` — pause the next outgoing message with the given `action`. Returns a controller with `.resolve(response)` / `.reject(error)`. Used to hold `get_config` open while the test simulates user edits inside the hydration window.
* `deferNextStorageSet(key?)` / `deferNextStorageRemove(key?)` — pause a matching mutation. Rejection invokes its callback while `chrome.runtime.lastError` is scoped, then clears the error immediately afterward.
* `emitStorageChanges(changes, areaName?)` — explicitly updates mock storage and invokes registered `chrome.storage.onChanged` listeners. Normal mock `set`/`remove` calls remain non-emitting for backward-compatible deterministic tests.
* `chromeMockSpies` — runtime/storage operation spies plus storage-listener registration spies, each a `vi.fn()`. Used for ordering, call-count, and payload assertions.

The mock supports **both callback-style** (`chrome.runtime.sendMessage(msg, cb)`) and **Promise-style** (`await chrome.runtime.sendMessage(msg)`) APIs. Pick the matching style for the code under test — the production code uses callback style for `sendMessage` and Promise style for `chrome.storage.local`.

**Mock reset is mandatory.** `resetChromeMock()` clears registered listeners and calls `.mockClear()` on all spies. Without this, listeners/state/counts accumulate across tests because the mock objects are module-level singletons. Ordering and Options invariant suites can silently report false positives if mock state leaks.

### The 6-Invariant Pattern for `Options.test.tsx`

The Options page hydration window has 6 distinct invariants documented in [Options hydration](docs/specs/options-hydration.md). Each invariant gets exactly one test:

| ID | What it asserts | Failure mode it catches |
|---|---|---|
| Inv1 | storage.set succeeds during hydration window (segment 1 ungated) | Adding a hydration gate to segment 1 breaks fast local persistence |
| Inv2 | host RPC is gated during hydration window (segment 2 gated) | Removing the gate clobbers `config.json` with DEFAULT_PREFS values |
| Inv3 | hydration merge skips user-touched fields | Removing `!touched.has('X')` overwrites user edits |
| Inv4 | catch-up at hydration COMPLETE mirrors and then sends the user value | Reading stale outer-closure `prefs`, bypassing mirror durability, or sending before latest commit |
| Inv5 | no catch-up RPC fires when nothing touched during window | Catch-up running unconditionally spams the host every Options open |
| Inv6 | Reset during window survives the late hydration merge | `handleReset` not marking DEFAULT_PREFS keys as touched lets late host response un-reset the user |

**Adding new tests:** Map 1:1 to a spec invariant. Don't write the same invariant twice with different fields (e.g., one test for `language`, one for `logLevel`, one for `enableStatusBubble`) — they all verify Inv3 with different payloads. Pick the field that exercises the path most cleanly.

**Break-and-fail verification** (required for new invariant tests): After the test passes, **temporarily break** the corresponding source code in `Options.tsx` and re-run the test to confirm it fails with a useful message. Restore only that mutation and confirm the test passes again. Record the mutation and result to prove the test catches its named regression.

### Hydration Catch-Up Ordering (Inv4)

Hydration computes the merged snapshot, updates refs/state, and schedules a generation-tagged hydration mirror plus catch-up intent. A post-render effect creates an immutable catch-up mirror and enters the shared `writePrefsMirror` queue. Only its successful `onLatestCommit` sends the captured Host update; storage failure sends nothing and a newer queued edit supersedes it. No Host or storage side effect runs inside a React state-updater closure; StrictMode replay therefore cannot duplicate an RPC. Inv4 defers `get_config`, edits `language`, and verifies the post-render intent carries the committed user value.

### Test File Conventions

* Tests live next to source: `Options.tsx` → `Options.test.tsx`, `pageReader.ts` → `pageReader.test.ts`.
* Use `installChromeMock()` + `resetChromeMock()` in `beforeEach` — every test must start with a clean chrome surface.
* Use `import.meta.env.DEV` checks sparingly in source code being tested; jsdom doesn't set MV3 service-worker globals so anything gated on those will throw.
* The `items.json` fetch warnings in test output are harmless (`unknown scheme` errors from jsdom's fetch implementation). Don't try to silence them in source — they're a jsdom limitation, not a real bug.

### Required Packaged Assets

`extension/items.json` is the tracked public bootstrap menu consumed by both Options and FAB and copied by CRXJS into `extension/dist/items.json`. It must never contain internal URLs, credentials, query strings, or organization-specific content. Personal bookmarks live in `dh_items`; Team Catalog data is fetched separately.

Every file referenced by `extension/manifest.json` must either be tracked or be produced deterministically by a reviewed build step before release tagging. `release_helper.py` currently commits and tags before invoking its own build, so the operator MUST start from a clean worktree and successfully run `npm run build --prefix extension` before invoking the helper. That preflight, including the `extension/items.json`/`extension/dist/items.json` byte-identity check, is the pre-tag gate; the helper's later build is a second check, not the pre-tag gate.

---

## Preferences State Management

All extension preferences (the `dh_prefs` chrome.storage.local key) are typed and managed through `extension/src/utils/prefs.ts`:

- **`Preferences` interface** — the canonical type. Add new fields here, never in component-local state declarations.
- **`DEFAULT_PREFS`** — single source of truth for default values. Components must not declare their own default dictionaries.
- **`usePrefs()` hook** — read-only React hook returning `{ prefs }`. Subscribes to `chrome.storage.onChanged` and re-renders consumers on any `dh_prefs` change.

### Reading prefs

Any component (FAB, future overlays, etc.) calls `usePrefs()`:

```typescript
import { usePrefs } from '../utils/prefs';

const MyComponent = () => {
    const { prefs } = usePrefs();
    return <div>{prefs.buttonText}</div>;
};
```

Do **not** call `chrome.storage.local.get('dh_prefs')` directly inside a React component. That bypasses the hook's onChanged subscription and permits stale or inconsistent preference values.

### Writing prefs

Only `Options.tsx::persistPrefs(nextPrefs, opts?)` writes user preference changes. It creates an immutable `ConfigUpdateIntent` containing a generation, a frozen preference snapshot, and, only when needed, a frozen `{revision, value}` DH-instruction token. Other React components do **not** write `dh_prefs`.

The persistence path is ordered and inspected:

1. Write the captured preference snapshot to the `dh_prefs` Chrome mirror. Generation checks converge delayed/out-of-order callbacks back to the newest snapshot.
2. After Host hydration, send one `update_config` payload built only from that captured intent in the successful latest mirror callback. Hydration catch-up follows the same rule; stale or failed storage callbacks dispatch no Host update.
3. Inspect the outer Native Messaging envelope and the inner Host result with `classifyConfigUpdateResponse()`; this RPC is not universally fire-and-forget.
4. Flush a requested team-manifest fetch only after the latest matching mirror commits and only for the still-active URL.

`user_instructions` is sparse. It is included only while an instruction edit revision remains unacknowledged. An explicit empty string from editor clear or Reset is a real write and truncates `copilot-instructions.md`; omission means no instruction-file write. The Host retains `system_instructions` only as a legacy fallback when the primary field is absent, never when `user_instructions` is present and empty.

The Host uses a sentinel for both editable file fields. Present null or any
non-string value returns `config_saved: false` before config or file writes;
absence performs no file write.

Host update outcomes separate persistence from active-session refresh:

* `success: true` acknowledges the captured instruction revision and clears the newest update warning.
* `success: false, config_saved: true` means all requested persistent writes completed but session refresh failed. Options acknowledges exactly the revision that was sent, keeps the saved UI values, and shows a persistent localized warning.
* `config_saved: false`, malformed responses, and transport failures do not acknowledge the instruction revision, so it remains pending for a later intent. The Host conservatively invalidates active session/fingerprint state after any attempted durable write that raises because truncation or partial output may already have occurred; it does not claim rollback.

Get-config health and update warnings are separate state. The newest update warning takes precedence; after a later successful update, any still-current prompt health warning becomes visible again. Known prompt codes are localized at render time, while unknown codes use the safe Host fallback.

#### Hydration guard

`prefsHydratedRef` starts `false` and flips to `true` after the Host's `get_config` response is merged, or on host-unreachable/non-success fallback so the user is not deadlocked. While it is false, `persistPrefs` still records the captured user state in the ordered `dh_prefs` mirror, but it gates the Host RPC and manifest fetch. Once hydration settles, an epoch-driven post-render catch-up captures user-touched values, writes that immutable snapshot through the same queue, and performs its inspected Host send only from `onLatestCommit`. It does not perform Host side effects inside the React state-updater closure, which is important under React StrictMode replay.

Before Host hydration, `prefs` contains defaults merged with the browser mirror, not authoritative Host configuration. Sending that snapshot could overwrite saved Root, team, or prompt values with defaults. The gate preserves Host values while allowing local edits; sparse prompt-file fields separately distinguish omission from an explicit clear.

If you add a new path that writes before hydration finishes, route it through `updatePref`/`persistPrefs` and mark its keys touched. Do not call the Host directly, bypass immutable intent creation or `writePrefsMirror`, or move catch-up into a React updater. Passive Host-hydration mirrors capture their own snapshot and user-generation value; they must skip when newer user persistence has started so they cannot suppress the user's Host update.

### Documented exception — runtime overrides

Root comes from preferences or the current Analyze invocation, not the D365 URL.
`analyzeRequest.ts` captures an immutable request snapshot; a context-menu Root
override belongs only to that invocation, including an explicit empty string.
It does not update React preferences, storage or Host configuration. Never keep
an invocation override in component state where it can leak into a later request.
The Host honors a string `rootPath` when `rootPathOverrideProvided` is exactly
`true`; an explicit empty string means no Root for this invocation, without
changing the configured Host root. Ordinary missing/empty Analyze `rootPath`
without that marker falls back to the configured Host root. An explicit empty
root in `update_config`, unlike an Analyze override, clears saved configuration.

### Service workers

`serviceWorker.ts` cannot use React hooks. If a service worker ever needs prefs, it reads `chrome.storage.local.get('dh_prefs')` directly. The "use the hook" convention applies to React-rendered contexts only.

---

## Secret encryption (DPAPI)

The host encrypts certain `extension_preferences` fields before persisting them to `%LOCALAPPDATA%\DynamicsHelper\config.json`. Currently this applies only to `team_manifest_url` (Azure Blob SAS URL containing an HMAC signature). The threat being mitigated is accidental disclosure: screenshots of `config.json`, backup-tool uploads of `%LOCALAPPDATA%`, and corporate DLP scans for secret patterns.

### Where the boundary lives

- **Extension side (`chrome.storage.local`, IPC payloads, UI):** plaintext. Encryption is not extended here because the extension needs plaintext to perform fetches, and chrome.storage.local lives in a different filesystem path than `config.json` (different scan/screenshot risk).
- **Host in-memory state (`self._get_session_config` return value, `get_config` response):** plaintext. Downstream code reads `extension_preferences.team_manifest_url` and is oblivious to whether it came from an encrypted blob.
- **`config.json` on disk:** encrypted. The plaintext key `team_manifest_url` MUST NEVER appear on disk. Only `team_manifest_url_encrypted` (base64 DPAPI blob) is persisted.

### Modules

- **`host/secret_store.py`** — ctypes wrapper around `Crypt32.dll`'s `CryptProtectData` / `CryptUnprotectData`. Exposes `encrypt(str) -> str`, `decrypt(str) -> str`, `EncryptError`, `DecryptError`. No new dependencies.
- **`NativeHost._decrypt_secrets_in_memory`** — called inside `_get_session_config` after `load_config_file` returns the user config. Replaces encrypted keys with plaintext; on DecryptError sets the plaintext to `""` and leaves the bad blob on disk for self-healing.
- **`NativeHost._encrypt_secrets_before_write`** — called inside `handle_update_config` before merging the payload into `current_data`. Replaces plaintext with encrypted form; empty-string plaintext clears both keys (Reset semantics).

### DPAPI key management

Windows manages DPAPI key material; DH only calls `CryptProtectData` and `CryptUnprotectData`. The application never reads, writes, or backs up keys and assumes no fixed rotation interval. Successful decryption depends on a valid blob and the required Windows user/profile key context remaining available; account or hardware identity alone is not a guarantee.

Properties relevant to debugging:

| Scenario | Effect |
|---|---|
| Same user, same machine | Expected to decrypt only while the blob and required key context remain usable; failure is still possible. |
| Config copied to another machine or Windows account | DH provides no credential-portability guarantee. If decryption fails, repaste the URL in Options. |
| Password/account recovery or profile changes | DH does not determine whether keys remain usable; handle the actual decryption result rather than assuming success or loss. |
| Disk image or profile restored | Same hardware alone does not establish decryptability; DH provides no image-restore guarantee. |

On `DecryptError`, the Host treats the URL as unconfigured in memory, logs a
warning without the URL, and leaves the on-disk blob untouched by that read.
Repasting the URL in Options can replace it after successful encryption and
save. `EncryptError` aborts the config write; there is no plaintext fallback.

### Adding a new encrypted field

1. Spec the field in a design doc; confirm DPAPI is appropriate (it's right for credentials that shouldn't be portable; wrong for fields that need to roundtrip across machines).
2. Add the field name to both `_decrypt_secrets_in_memory` and `_encrypt_secrets_before_write` (consider extracting a `_SECRET_FIELDS` list if there are 3+ fields).
3. Add unit tests to `host/test_config_secrets.py` mirroring CS-T1..T8 for the new field.
4. Update AGENTS.md § 4.8 with the new field name.

### Failure mode debugging

Look for these log lines in `%LOCALAPPDATA%\DynamicsHelper\native_host.log`:

- `WARNING ... Failed to decrypt team_manifest_url ...` → DecryptError on startup. A changed account/key context, corrupt blob or password-reset event can contribute; the warning alone does not identify the cause. Preserve the config and use an explicit authorized URL edit to repair the field.
- `WARNING ... Discarding stale plaintext team_manifest_url ...` → a legacy plaintext key was found in config.json. Persist only the encrypted form; never log the URL.
- `ERROR ... Failed to encrypt secret field; aborting config write` → The encryption operation failed and the entire config write was aborted. Inspect safe error classification and the Windows account/key context without exposing the value. Do not infer a broken service, promise a restart will fix it, or fall back to plaintext.

---

## Self-Update Mechanism

The Service Worker is the only production update coordinator. FAB and Options
render its projection and never infer success from a Host response.

### Flow

1. `check_for_updates` accepts only a strictly newer release with exactly one
   direct HTTPS ZIP.
2. The Worker probes `get_capabilities` and `verify_installation`; version,
   `transactional-update-v1`, and packaged integrity must agree.
3. UI hydration/start messages are exact payload-free
   `DH_UPDATE_GET_STATE`/`DH_UPDATE_START`; broadcasts are `DH_UPDATE_STATE`.
4. The Worker persists each state before sending strict `perform_update` and
   `activate_update` actions. `UpdateService` validates/stages, creates the
   transaction, installs recovery, and launches detached activation.
5. Status-only polling and a 30-second MV3 alarm resume interrupted work.
   Ordinary forward failures roll back the complete previous product.
6. Only committed/rolled-back status permits Extension reload. The new Worker
   re-verifies terminal version/capability/integrity, persists the finalization
   receipt, and acknowledges cleanup before reporting `complete` with the
   originating lowercase 32-hex transaction ID.
7. Mixed or incomplete installs persist matching-full-installer guidance until
   a later startup verifies the repaired complete product.

### One-shot completion lifecycle

`complete.transactionId` is required scalar identity, not optional metadata.
Copy that exact lowercase 32-hex string into timer closures and ACK messages; do
not retain a mutable state object as identity. Runtime parsing and the Worker
route accept only exact own enumerable data properties
`{type:'DH_UPDATE_ACK_COMPLETE',transactionId}`. Reject extra/missing/accessor/
symbol keys, arrays, uppercase IDs, and non-strings as `handled: false`. Parsing
uses one descriptor snapshot and requires exactly the own enumerable data keys;
prototype identity is not a criterion. Getters are not read and hostile values
are not coerced.

The Service Worker is the sole update state/storage and serialized transition
owner. A matching committed ACK persists `idle` (thereby removing the private
candidate URL); a matching rolled-back ACK persists `available` with the same
candidate so normal Retry allocates a new transaction. Persistence completes
before memory and `DH_UPDATE_STATE` broadcast. Wrong, stale, duplicate, and late
ACKs are no-ops, including an old timer racing a newer completion.

FAB and Options call the shared `useVisibleCompletionAck` hook with the current
transaction ID and one aggregate surface-visible Boolean. The hook combines
that with `document.visibilityState === 'visible'`. FAB's Boolean is true only
for an open terminal menu or an actually visible bubble bound to that exact
transaction; the red dot and generic bubbles do not count. Options' Boolean is
true while its `complete` status is rendered. Acknowledgment requires eight
continuous visible seconds.

One visibility epoch is a maximal continuous interval in which the aggregate
predicate remains true. A true-to-false transition cancels the timeout and
discards elapsed time; a later false-to-true transition starts a fresh 8,000 ms.
Equivalent same-ID state and menu/bubble hand-offs that leave the aggregate true
retain the original deadline. The document listener synchronously increments a
generation and clears its timer before scheduling React state; transaction and
surface changes invalidate in a layout effect. The callback rechecks timer,
generation, transaction, surface, cached document visibility, and live document
visibility before sending.

Mark an epoch attempted before transport. Synchronous throw, Promise rejection,
and `{handled:false}` are contained and do not retry in place; only a later
visibility epoch may retry. Ignore every ACK response. The Service Worker's
persisted `DH_UPDATE_STATE` broadcast is the only live transition authority.
The completion bubble's ten-second fallback remains wall-clock based; it is not
reset by ACK failure and does not become visible-time accounting.

Tests use fake timers plus a configurable `document.visibilityState` descriptor,
restore or delete the original descriptor exactly, cover React StrictMode and
same-state `visibilitychange`, and manually invoke stale callbacks after hide,
replacement, and departure. Every new invariant requires one externally
observable break-and-fail mutation.

The installer test boundary in `installer_core.ps1`
defines `Invoke-InstallerWorkflow` with an explicit operations table. Dot-sourcing
defines functions without constructing production adapters; the normal entry
uses `New-InstallerOperations`. The plain `-File` harness supplies recording fakes
instead of evaluating transformed/encoded installer strings. Package-root files
and validator schema remain unchanged. See [test safety](docs/test-safety.md) for
execution policy. Verify the current checkout and authorized scope; architecture
descriptions do not certify an unverified working tree.

The production flow removes the installed `_internal` tree before copying the
packaged runtime. This exact-tree repair is required because installation
verification rejects both missing and extra runtime files. It first creates a
temporary combined product view and runs the packaged Host `--update-probe`
before mutating the destination; it refuses a running Host or legacy Roaming
directory instead of terminating processes or migrating user data. Package-root mode
also validates exact package inventory/hashes. After copy, a live probe and
frozen-only `--settle-installer-repair` settle compatible preserved authority to
the target/prior terminal version or fail without deleting evidence.

The installer does not unblock files, override execution policy, add antivirus
exclusions, or assert a false positive. Policy/security blocks remain failures;
the batch wrapper preserves the PowerShell exit code. Registration failure returns
nonzero rather than leaving an incomplete installation reported as success.

`updateRuntime.initialize({resume:false})` hydrates durable state without
waiting on recovery; Service Worker starts `resume()` in the background. Exact
pre-launch activation errors are explicit-retry states that allow ordinary Host
traffic, while lost/post-launch responses remain suppressed and reconcile via
the status Host. Development verification projects `source_update_disabled`
without allocating a transaction. Rolled-back completion remains visible; the
same failed candidate cannot overwrite it, and retry begins only on user intent.
Prepare/activate/finalize/ack leases use bounded cancellation deadlines.
Finalize/ack errors remain in their exact persisted phase, and retry invokes the
same idempotent action. A Worker-instance token requires a fresh Worker after
reload before terminal finalization.

---

## Debugging Guide

### 1. "Host Disconnected" or "No Response"

* **Check:** Is the Host running? Chrome spawns it automatically.
* **Log:** Check `%LOCALAPPDATA%\DynamicsHelper\native_host.log`.
* **Common Cause:** Registry key mismatches or PowerShell encoding bugs.
* **Fix:**
  * Run `installer_core.ps1` (or `install.bat`) again.
  * Verify `manifest.json` in `%LOCALAPPDATA%\DynamicsHelper` is valid JSON and points to `dh_native_host.exe`.

### 2. "Analysis Timeout"

The Host clamps `extension_preferences.analyze_timeout_seconds` to [60, 3600]
on every config load and `update_config`; Options clamps `prefs.analyzeTimeoutSeconds`
on field blur so the displayed and stored values agree. Keep these sites in sync:

* `host/dh_native_host.py::NativeHost.__init__`: initial value 1200 seconds.
* `host/dh_native_host.py::_get_session_config` + `handle_update_config`: config read and clamp.
* `extension/src/components/FAB.tsx::handleAnalyze`: safety timeout derivation below.

The Host timeout error must name the configured budget and direct users to
Options -> Analyze Timeout, not re-authentication. Timeout alone establishes
neither authentication nor approval failure.

* **Check:** Does the log show `Copilot request timed out after X seconds`?
* **Meaning:** The analysis exceeded the configured budget; the timeout alone does not establish why it was slow.
* **Fix:** Adjust Options -> Analyze Timeout (60-3600 seconds, default 1200), rather than editing source. The Host model wait uses that preference; FAB uses `(clampedModelSeconds + 120 + 10) * 1000` ms. Preparation allowance does not bound startup, refresh or file I/O, and a FAB timeout does not prove Host cancellation or guarantee Host-first completion.

### 3. Agent failing to run Kusto queries

* **Check:** Logs for `Permission requested`.
* **Check:** `config.json` in `%LOCALAPPDATA%` to ensure the `kusto` MCP server is defined correctly.
* **Check:** Does the user have `Use-AzureChina` or relevant credentials? The Agent runs as the user.

---

## Release Process & Testing

### Package Integrity Boundary

`host/package_manifest.py` owns canonical package schemas, ownership classes,
path rules, and hashes. `host/package_archive.py` validates staged trees and
performs manual two-pass ZIP extraction; never use `ZipFile.extract()` or
`extractall()`. `host/install_integrity.py` verifies a frozen live product and
implements the early probe consumed by `host/early_cli.py`.

Key interfaces:

```text
generate_release_documents(stage_root, package_version) -> ReleaseDocuments
write_release_documents(stage_root, documents) -> None
validate_staged_package(stage_root, expected_version=None) -> ValidatedPackage
stage_and_validate_archive(archive_path, stage_root, expected_version=None)
write_deterministic_archive(stage_root, archive_path) -> None
InstallationVerifier(install_root, frozen=None).verify()
```

Canonical DH JSON is strict UTF-8, sorted compact ASCII, no BOM, and one final
newline. Package paths are relative POSIX paths; traversal, backslashes,
absolute/drive/UNC paths, alternate data streams, trailing dot/space, reserved
Windows names, exact/casefold duplicates, symlinks, and reparse points fail
closed. Test Host subprocesses with fresh `LOCALAPPDATA`, `APPDATA`,
`USERPROFILE`, `HOME`, `TEMP`, and `TMP` values before process start.

For safe tests, call pure helpers against temporary synthetic source/stage
trees. Do not invoke the release CLI: it also edits versions and can perform Git
or publishing operations. Production routing consumes package integrity metadata
and requires the complete `transactional-update-v1` capability.

### Transaction API

`UpdateEngine` owns mutation and rollback beneath `UpdateService`.
Recovery and service orchestration consume these interfaces rather than writing journal, active, or
workspace paths directly:

`UpdateService` uses a separate cross-process operation mutex around complete service
operations. Lock order is `operation -> mutation`; engine/recovery never acquire the
outer operation mutex themselves.

```text
parse_transaction_id(value: object) -> str
generate_transaction_id(random_bytes: Callable[[int], bytes] = secrets.token_bytes) -> str
read_journal(path: Path) -> UpdateJournal
read_active_transaction(path: Path) -> ActiveTransaction
resolve_active_journal(updates_root: Path, active: ActiveTransaction) -> Path
TransactionPaths.for_install(install_root: Path, transaction_id: object) -> TransactionPaths
UpdateEngine.create_prepared(package: ValidatedPackage, transaction_id: str, *, expected_version: str | None, prior_version: str | None, initiator: UpdateInitiator) -> UpdateJournal
UpdateEngine.activate_prepared(transaction_id: str, process_identity: InitiatingProcessIdentity | None) -> UpdateJournal
UpdateEngine.resume(transaction_id: str) -> UpdateJournal
UpdateEngine.rollback(transaction_id: str, failure_code: JournalReason) -> UpdateJournal
UpdateEngine.finalize_terminal_evidence(transaction_id: str) -> bool
terminal_version(journal: UpdateJournal) -> TerminalVersion
parse_terminal_version(value: object) -> TerminalVersion
terminal_version_to_value(value: TerminalVersion) -> dict[str, object]
```

`generate_transaction_id` consumes exactly 16 random bytes and returns lowercase
32-hex. Browser TypeScript uses its reviewed `crypto.getRandomValues` adapter;
no other Python generator is allowed. Browser preparation passes a selected
non-null target and browser activation passes `InitiatingProcessIdentity(pid,
creation_token)`. Installer preparation may pass a trusted target or `None`,
then activates with `None`; it must not open/wait on its own process.

Stable authority is `updates/active.json`, pointing to the exact journal beneath
`updates/transactions/<id>`. Preparation alone uses `<id>.preparing` and atomic
promotion. Recovery consumes `TransactionPaths.probe_manifest`, lets the engine
own probing/commit/rollback, and calls `finalize_terminal_evidence` only after a
durable finalization receipt and status unregister. Recovery retry passes
`original_failure_code`, never current `rollback_failed`. Receipt serialization
uses `terminal_version`, including the fresh rollback JSON
`{"fresh_install":true,"version":null}`.

The five literal ownership modes are installed, legacy, fresh-seeded,
fresh-preexisting, and fresh-post-plan-user-creation. The matrix freezes 216
operation-label cases across before-operation fault, after-operation crash, and
synthesized post-operation state (648 cases), plus 67 journal-transition crash
cases. Execution requires a separately reviewed transaction profile under
`docs/test-safety.md`. The isolated runner supplies import paths from the selected
closure and fresh profile directories; do not rely on inherited `PYTHONPATH` or
bypass the gate with direct discovery.

### Detached Recovery API

Recovery exposes the finalization and restart primitives used after activation.
Source and frozen entrypoint identity is exact:

* Source development registers `host/host_manifest.json`; its `path` field is
  the absolute `host/launch_host.bat` path, and the batch wrapper forwards Chrome
  argv.
* Frozen production registers sibling `manifest.json` with relative
  `dh_native_host.exe`.
* Source early dispatch receives resolved `Path(__file__)`; frozen dispatch
  receives resolved `Path(sys.executable)`. Never pass the source interpreter as
  the entrypoint.

The accepted early invocations are:

```text
dh_native_host.py [<allowlisted-origin> [--parent-window=<nonnegative-decimal>]]
dh_native_host.py --register
dh_native_host.exe [<allowlisted-origin> [--parent-window=<nonnegative-decimal>]]
dh_native_host.exe --register
dh_native_host.exe --install-package <absolute-canonical-package-root>
dh_native_host.exe --settle-installer-repair
dh_native_host.exe --update-probe <absolute-canonical-probe-manifest>
dh_update_runner.exe --complete-update <32-lower-hex-id> <positive-decimal-pid> <win-create-time-ticks>
dh_update_runner.exe --recover-active
dh_update_runner.exe --recover-update <absolute-canonical-journal>
dh_update_status_host.exe <allowlisted-origin> [--parent-window=<nonnegative-decimal>]
```

Decimal parent window `0` is Chrome's valid sentinel. Every special command
validates role, runtime bit, arity, identity text, executable chain, and path
authority before `EarlyModeDependencies`, registry/controller/process adapters,
default install root, installer callback, or status server is constructed.
Non-probe mismatch is exit `2`, empty stdout, and exact stderr
`b"invalid_early_invocation\n"`. Malformed or wrong-role probe also exits `2`,
but delegates the package verifier's fixed malformed tuple and emits exact stdout
`b'{"error_code":"package_probe_failed","status":"error"}\n'` with empty
stderr; `run_update_probe` remains uncalled.

`prepare_recovery_runtime(transaction_id, source, registry)` is the only
service-facing recovery setup boundary. It preflights the complete staged target,
rereads the same `PREPARED` authority, installs the exact onedir recovery tree,
and registers status only for browser mode. Both browser and installer
activation repeat preflight before RunOnce or `activate_prepared`. Browser mode
uses a complete `InitiatingProcessIdentity`; installer mode uses `None`.

Finalization crash/replay behavior is bounded:

| Durable/interrupted state | Same-ID recovery | New update start |
|---|---|---|
| Reserved stable cursor, no receipt | Recreate/verify one receipt, advance cursor | Blocked |
| Reserved cursor plus receipt target/scratch | Verify/normalize receipt, advance cursor without a second receipt | Blocked |
| Receipt-ready cursor plus receipt | Resume cleanup or acknowledgment | Blocked |
| Crash before receipt-to-ack replace | Replay from source receipt | Blocked while cursor remains |
| Crash after replace, before cursor removal | Re-fsync/replay from matching fixed ack slot | Blocked |
| Ack slot plus cursor scratch after lost unlink response | Normalize/remove cursor from matching slot | Blocked until replay completes |
| Ack slot only | Same ID succeeds read-only until later slot replacement | Allowed |
| Newer cursor plus older matching ack slot | Older ID replay is read-only and cannot mutate newer state | Newer start already owns cursor |
| Newer acknowledgment replaces fixed slot | Delayed older ID becomes `finalization_not_current` | Allowed after cursor cleanup |
| Nonterminal requested journal | Finalize fails `transaction_not_terminal` | Existing authority remains |
| Requested ID mismatches active/journal/root authority | Finalize fails `active_transaction_mismatch` | No record mutation |
| Malformed/noncanonical receipt or receipt scratch | `invalid_finalization_receipt` | Cursor/receipt evidence retained |
| Malformed/noncanonical stable cursor | `invalid_finalization_cursor` | Start remains blocked while cursor evidence exists |
| Valid cursor scratch matching active terminal authority | Normalize a reserved cursor, create/verify one receipt, then advance | Blocked until replay completes |
| Cursor scratch with unreadable active authority | `invalid_finalization_cursor` | Scratch retained; start blocked |
| Cursor scratch whose active ID differs from requested ID | `finalization_ack_pending` | Scratch retained; start blocked |
| Forbidden ack scratch | `invalid_finalization_acknowledgment` | No cursor/receipt mutation |
| Malformed old ack plus valid newer terminal authority | Newer finalize may reserve cursor/receipt; acknowledgment later atomically replaces the slot | Blocked only by the newer cursor |
| Malformed ack without valid requested terminal authority | Preserve and return `invalid_finalization_acknowledgment` | No record mutation |
| Receipt-ready cursor with absent receipt and mismatched ack | `invalid_finalization_acknowledgment` | Cursor and slot retained |
| Receipt-ready cursor while engine cleanup is incomplete | Acknowledge fails `finalization_cleanup_incomplete` | Receipt and cursor retained |
| Different requested ID while another cursor/scratch is pending | `finalization_ack_pending` before registry/engine/receipt work | Blocked |
| Ack ID matches neither current cursor nor fixed slot | `finalization_not_current` | Current records unchanged |
| Filesystem/registry/engine/durability operation fails | `finalization_cleanup_failed`; retry same ID | Blocked while cursor remains |
| Cursor/receipt write cannot canonical round-trip | `finalization_record_round_trip_failed` | Preserve bounded evidence for retry |

`require_no_pending_finalization(install_root)` is enforced by Host
`UpdateService.prepare`, not by a filesystem check in the Service Worker.
For an accepted `DH_UPDATE_START`, the Worker allocates the transaction ID and
persists `preparing` before sending `perform_update`. Host prepare validates the
request, holds the cross-process operation mutex, and checks the finalization
barrier before downloading/opening the package. It checks again before
`engine.create_prepared`; the barrier and engine use the installation mutex
inside that operation scope. A Host rejection returns a preparation error that
the Worker persists on `preparing`; it does not undo the earlier ID/state intent.
This barrier does not itself suppress ordinary Analyze/config/health traffic;
activation-time suppression remains a separate rule.

### Verification Scope And Entry

Follow [test execution safety](docs/test-safety.md). Use the maintained
`scripts/check_test_safety.py`, `scripts/run_safe_tests.py`, and
`tests/test-safety-manifest.json`, not ad hoc wrappers or unreviewed launchers.
For fixed offline SDK contracts, use `scripts/run_sdk_tests.py` and
`tests/sdk-test-review.json` instead. This is a separately reviewed fixed unittest
selection, not the Python scanner or a scanner-profile PASS. It reuses
`run_safe_tests.py`'s `safe.worker` and `safe.supervise`, binds exact test IDs and
project-source bytes, checks installed third-party versions and RECORD hashes,
and compares dependency-byte snapshots before/after. Third-party/native code is
an explicit trust boundary, not per-source scanner coverage or an OS sandbox.
No CLI/model execution or dependency installation is part of this entry. Review
changed tests, adapters, and dependencies before updating the review hashes;
see [SDK upgrade workflow](docs/sdk-upgrade-workflow.md) for invocation and limits.

Verify readiness against the current checkout and user request. Evidence and
this guide do not grant execution authorization.

For live feature testing, select the publication/component route in
[AGENTS.md's Testing Cycle](AGENTS.md#native-host-mode-selection), not a local
complete-installer cycle. Published GitHub Release upgrade tests must exercise
the Extension's own production upgrade feature. This does not grant publication
permission or replace the separate recovery/fault-test disposable-VM gate below.
Matching-full-installer repair is explicitly approved user maintenance, not a
routine feature-test entry.

An approved work package includes reversible source/documentation changes,
necessary tooling repairs, and its agreed tests without per-command approval.
Do not expand a pure-Python scope into PowerShell, SDK, browser, installation,
dependency provisioning or Git writes. Honor explicit once-only effect budgets.
When a rule blocks work, quote it exactly, explain the interpretation and concrete
conflict, and report the smallest remedy instead of adding another wrapper.

Separate full-inventory audit from named-profile execution. Profiles must identify
meaningful behavior, exact selected tests, imported dependencies and their review
closure, not simply rename one bootstrap fixture. Complete raw-byte SHA-256 review
includes CRLF/LF differences; a changed test or dependency invalidates the affected
review. A full audit finding is not a reason to silently broaden a focused run.
Conversely, a focused PASS is not evidence that the whole inventory is qualified.

Create six fresh profile/temp directories before discovery/import. Record actual
processes and filesystem effects separately from mocked adapters. Use checked-in
plain physical scripts with bounded arguments, time/output limits, progress and
owned-process cancellation. These controls are not an OS sandbox. Preserve original
logs and failed results; exact allowed baseline deltas never mean no changes.

Use focused regression and required break-and-fail checks for behavior edits,
affected-profile checks for tooling changes, and diff/link/state checks for docs.
Run full suites/builds at agreed milestones or when scope requires them, not after
every minor review fix. Honor the actual review/attempt budget agreed for the
task; do not invent a fixed round count or reset the budget by changing reviewers.
Report outcomes and gaps before evidence paths; distinguish source review, mocked
tests, real subprocess validation, and live integration in every completion claim.

Frozen-build/probe work needs the applicable integration scope. Builds and probes
execute code and create files/processes even when installed product bytes stay
untouched. Never use encoded command launchers.

The PyInstaller version command must report exactly `6.22.2`. Build/spec/dist
outputs remain ignored and untracked. Do not provision PyInstaller automatically.

Manual recovery commands are exactly:

```text
%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe --recover-active
%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe --recover-update <absolute-canonical-journal>
```

For `recovery-required`, preserve backups and evidence; never advise deleting
them. Frozen startup recovery runs before normal initialization; unsafe manual
recovery exits `30` with empty stdout and exact stderr
`manual_recovery_required\n`. Real handle inheritance, RunOnce, registration,
forced rollback, browser status argv, and interrupted installer resume require a
disposable VM. Standalone bootstrap and per-write power-loss guarantees remain
deferred; an extreme interruption may require the matching full installer.
See [TODO.md](TODO.md) for current limitations and planned work.

### 1. Release Automation

`release_helper.py` manages versions, commits/tags, builds, and release outputs.
Its `main` entry commits/tags and cleans outputs; never use it for a local-only
build or artifact cleanup. Invocation requires an approved target version and
release scope. `--publish` publishes to GitHub, `--prerelease` marks a Beta, and
`--notes-file` supplies the Markdown release body verbatim instead of the default
installation template. Cleanup removes only `*.zip` and `DynamicsHelper_v*` staging
directories from release outputs; notes under `releases/` are preserved.

Within authorized release scope, the controlled alternative uses existing
`build_host()` and `create_zip()` functions directly, the existing Extension build
entry, and explicit Git/`gh` operations instead of `main`. Apply the same version,
pre-tag build, public-asset and integrity checks; defer push/publication until
verification succeeds, avoiding `main --publish` pushing commits/tags before builds.
`main` remains available with its documented preflight and authorization; no new
wrapper, test platform or release-helper change is needed. See
[Required Packaged Assets](#required-packaged-assets) for the clean-worktree,
pre-tag build and source/dist public `items.json` byte-identity gate,
[Package Integrity Boundary](#package-integrity-boundary) for package checks, and
[AGENTS.md](AGENTS.md) for operational authorization boundaries.

### 2. Native Host Mode Selection

The user's `switch_prod` refers to the existing `dev_switch.py`, not a new script
or alias. `dev_switch.py` selects which Native Host future browser launches use by writing
the real Chrome and Edge Native Messaging keys in HKCU. It is not an isolated
test environment, does not switch the loaded Extension, and neither runs nor
verifies the installer. It does not terminate or replace an already-running Host;
a changed registration is not proof the active connection uses the selected Host.
Source Dev is not a sandbox and shares the user's DH configuration with Prod.
Registry mutation requires an applicable work package covering that effect.

For unreleased Extension-only changes, use browser **Load unpacked** on the
approved local build at this checkout's `extension/dist/`, retaining the installed
production Host. For unreleased Host-only changes, retain the installed production
Extension and select the source Host with `python dev_switch.py dev`; Native
Messaging uses the registry to connect that Extension to Dev. For changes to both,
combine these two routes. Do not install a local complete package or copy local
files into the production installation for feature testing. For published GitHub
Releases, use only the Extension's own real production upgrade feature, not these
Dev routes or a full installer as a substitute. The authoritative table is in
[AGENTS.md](AGENTS.md#native-host-mode-selection).

Operator prerequisites, not checks supplied by the tool:

* Run from the intended repository root; Dev paths derive from the current working directory.
* Verify the target manifest actually exists: `host/host_manifest.json` for Dev or `%LOCALAPPDATA%\DynamicsHelper\manifest.json` for Prod. Inspect its contents and ensure its Host path resolves to the intended existing launcher/executable; verify the Dev runtime or matching installed product separately.
* Record current Chrome/Edge registration with read-only `status` before switching. Inspect both keys afterward; a success banner is not proof both writes succeeded. There is no automatic return-to-Prod or return-to-Dev requirement; any subsequent switch must stay within the applicable work package.

The tool checks only Dev manifest existence. Prod merely warns when its manifest
is absent and still writes registration; neither mode validates the manifest's
Host path. `status` compares registered path strings, not product integrity or
runtime health. Do not treat switching back as installer verification or cleanup
of runtime effects.

Read registration status:

```bash
python dev_switch.py status
```

Select the source Host:

```bash
python dev_switch.py dev
```

Select the installed Host:

```bash
python dev_switch.py prod
```
