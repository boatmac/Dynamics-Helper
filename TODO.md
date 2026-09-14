# Project TODO

## Repository Setup

- [ ] Confirm the unknown EMU hostname, owner and repository name; verify enterprise
  private-repository policy and permission to create personal repositories.
- [ ] Choose the default branch; `main` is recommended, not yet decided.
  Configure repository-local Git author identity for the managed account.
- [ ] Prepare a privacy-reviewed current-file tree, including intended uncommitted edits.
  Exclude `.git`, archives, dependencies, generated artifacts, credentials and customer data;
  verify the actual file selection without deleting original safety evidence.
- [ ] Once repository and distribution targets are approved, update active Help,
  Issues, privacy, documentation and update URLs together with public-menu fixtures/tests.
- [ ] Assign telemetry resource ownership, access and privacy responsibility;
  confirm the intended configuration before enabling collection in this environment.

## Development Environment

- [ ] Provision an enterprise-approved Windows Cloud PC with supported Node.js/Python;
  follow [development guidance](DEVELOPER_GUIDE.md), existing SDK/PyInstaller pins and dependency files.
- [ ] Recreate the Python virtual environment and install Node dependencies with
  `npm ci` under approved provisioning scope; do not copy venvs or `node_modules`.
- [ ] Verify generated Native Messaging manifests use the intended existing local
  launcher/executable paths before any approved `dev_switch.py` operation.
- [ ] Confirm browser extension policy, browser profile and CLI/MCP authentication
  independently; do not assume browser sessions or tool authentication are available.
- [ ] Re-enter required credentials under the target Windows account through the
  supported configuration flow; do not export DPAPI keys or assume encrypted values are portable.
- [ ] Handle personal bookmarks separately only if needed; browser-local items are
  not backed up in Host config. Check the intended items before importing them.
- [ ] Verify the documented workflow is usable without a particular coding-agent
  plugin, browser automation tool or pre-authenticated MCP connection.

## Versioning

- [ ] Confirm the next release version: current code is `2.0.78`; `2.0.79` is proposed,
  not approved. Continue the version sequence without resetting it or changing existing tags.
- [ ] Align the four version carriers in a future version change: `host/product_info.py`,
  `extension/manifest.json`, `extension/package.json` and `extension/package-lock.json`.
  The lockfile's top-level `version` and `packages[""].version` still read `2.0.77`.
- [ ] Include the implemented, unreleased Customer wrapper/label capture fix in the
  next approved release; retain layout/language coverage limits in release qualification.
- [ ] Verify packaging preserves the Extension key/ID, Native Host names and session
  UUID namespace automatically; repository setup must not regenerate or change them.

## Release Automation

- [ ] Implement GitHub Actions release automation; it is planned, not implemented.
  First confirm enterprise Windows-runner availability, allowed actions and artifact policy.
- [ ] Pin approved action/tool versions and honor dependency locks and documented pins.
  Reuse existing build entries and the fixed verification scope in [AGENTS.md](AGENTS.md),
  not a new full test matrix or replacement test harness.
- [ ] Separate read-only build/test jobs from publication; grant only the publishing
  job `contents: write` or an appropriate enterprise-controlled identity with minimal permissions.
- [ ] Require manual ref/version inputs and environment approval where available;
  preflight version alignment and fail if the requested tag already exists.
- [ ] Build once from the selected exact commit, verify package integrity and checksum
  an immutable candidate; publish that same artifact and tag that commit without rebuilding.
- [ ] Set job timeouts and observable progress/failure reporting; keep model calls,
  authenticated browser sessions and production runtime operations out of CI jobs.

## Distribution

- [ ] Gate publication on an approved distribution/access decision: the current
  anonymous update endpoint cannot access private EMU release metadata or assets.
  Choose supported authenticated access or an authorized internal channel; do not assume public hosting.
- [ ] Implement and qualify the chosen channel's discovery, download, credential and
  enterprise-access behavior before advertising working updates or changing endpoint defaults.
- [ ] Verify an approved published release through the Extension's own upgrade feature
  using the runtime route in [AGENTS.md](AGENTS.md); installer success is not upgrade qualification.

## IR SLA Snapshot

- [ ] Qualify current compiled capture behavior on representative supported layouts
  and languages, keeping source, built Extension and running Host identity distinct.
- [ ] Cover remaining Customer enrichment edge cases: fields materializing after a
  scroll read and user edits during enrichment; do not repeat already confirmed
  initial-view and post-scroll paths solely to complete this checklist.
- [ ] Qualify the IR preview's implemented `Succeeded` snapshot in the actual browser,
  without requiring a model call; unsupported or ambiguous evidence must remain unknown.
- [ ] Extend IR status/countdown/duration only after observing authoritative active
  record data. Do not infer Paused, Expired, deadlines or durations from unrelated fields.
  Use the [IR specification](docs/specs/ir-sla-snapshot.md) for acceptance boundaries.
- [ ] Scope capture-coordinator redesign and an API/OData feasibility investigation
  before implementation; neither is complete. Measure runtime performance before claiming gains.

## Attachment Analysis

- [ ] Qualify matching current Host/Extension runtime integration under the applicable
  route in [AGENTS.md](AGENTS.md); source/offline checks do not establish production compatibility.
  Confirm the running Host matches the implementation being qualified.
- [ ] Verify preparation before every valid Analyze, including repeated same-case
  requests, private dispatch, stale-owner exclusion and update send gates.
- [ ] Verify confirmed-empty inventory, missing-workspace modal handling and inaccessible
  External folders. Empty versus access-restricted remains unknown without authoritative evidence.
- [ ] Verify DTM creation without a pre-opened tab, user-controlled authentication and
  unattended 30-second expiry with case-text continuation; do not assume all unavailable cases share one cause.
- [ ] Verify frozen bytes, download correlation and late-event exclusion; identical concurrent requests remain a provenance limitation.
- [ ] Verify real Host import of selected completed downloads, path/link rejection,
  file/size/type limits, preserved text bytes, raw attachment input versus scrubbed case/prompt text,
  unsupported-file accounting and effective-model image qualification without automatic model switching.
- [ ] Verify cooperative import busy/timeout/cancellation behavior and discarded late
  completion; OS reads/executor shutdown remain unbounded and the timer is not a real-time guarantee.
- [ ] Verify separate attachment notices across success, error, report, persistence and
  hydration paths, including cautious unknown-inventory wording and omitted-file accounting.
- [ ] Verify the FAB preparation/model fallback budget with the current runtime;
  it is not an end-to-end Host deadline. Use the [attachment contract](DEVELOPER_GUIDE.md#automatic-attachment-preparation).

## Product Follow-Up

- [ ] Scope per-service MCP status/auth/cancellation controls against documented SDK
  support and actual runtime behavior; browser/WAM login and general tool cancellation remain gaps.
  Use the [MCP assessment](docs/mcp-auth-control-assessment.md); DTM deadlines do not govern MCP operations.
- [ ] Assess Analyze progress/readability improvements: meaningful operation labels,
  initialization status and elapsed/ETA presentation are not supplied by current safe local phases.
- [ ] Scope persistence/hydration redesign before adding progress replay or concurrent
  CLI views; preserve existing result ownership and hydration contracts rather than treating them as broken.
- [ ] Define external case-management workflow integration only if required;
  Repository ONLY instruction/Skills/MCP selection does not initialize those workflows.
- [ ] Scope recovery qualification separately from ordinary upgrades; standalone bootstrap
  and per-write power-loss atomicity remain limitations, with matching-installer repair potentially required.

## Maintenance

- [ ] Retire the three unsupported SDK debug scripts and their dedicated source-inspection
  test together, preserving meaningful prompt-isolation coverage.
- [ ] Complete pending test inventory/source reviews when their scopes are selected;
  determine SDK/build checks from current inputs under the existing verification gates.
- [ ] Assess optional timezone-data packaging and browser-compatibility warnings in scoped dependency maintenance.

These tasks do not authorize account changes, provisioning, runtime operations or publication.
