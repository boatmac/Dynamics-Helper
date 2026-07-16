# Dynamics Helper × MyCasesKit Stage 0 Instructions — Design Discussion Brief

- **Date:** 2026-07-14
- **Status:** Research / cross-repo discussion input — not an approved design
- **Audience:** Dynamics Helper and MyCasesKit maintainers
- **Decision owner:** MyCasesKit design session for the integrated Stage 0 contract

> **Superseded prompt-scope recommendation (2026-07-15):** The accepted
> `docs/superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md`
> supersedes this research document wherever it recommends relying on Copilot
> CLI automatic workspace instruction discovery. Implemented DH sessions set
> `skip_custom_instructions=True` and explicitly inject DH Core plus exactly one
> editable source: DH-specific Instructions, or only
> `<Root>/.github/copilot-instructions.md` when Repository ONLY is effective.
> CLI-global, `AGENTS.md`, path-specific, and other automatically discovered
> instructions are excluded. This note does not change the Stage 0/1 contract
> research below; no MyCases integration described here has been implemented.

> **2026-07-14 discussion update:** MyCasesKit's follow-up proposal,
> `stage0-coordinator-design.md`, identifies the missing deterministic `New-Case`
> coordinator as the keystone and recommends Form ③ (coordinator rather than
> agent prose). The proposal is not yet an approved cross-repo contract. This
> brief now also records an important correction: integrated DH must continue
> its automatic first-pass analysis after deterministic Stage 0 initialization.
> That analysis is Stage 1 initial triage and must be persisted into canonical
> MyCases artifacts; Form ③ replaces schema/file improvisation, not DH analysis.

## 1. Background

### 1.1 MyCasesKit and MyCases

MyCasesKit is a separate repository that provisions a MyCases workspace for Technical Support Engineers (TSEs). The workspace provides a consistent case-folder structure and a lifecycle workflow for customer support cases.

MyCases defines **Stage 0** as case initialization: obtain case information (commonly from Dynamics 365), map it into the workspace's canonical product/case structure, and create the initial lifecycle artifacts. Stage 0 is deliberately not tied to one adapter. Different users may initialize a case through a browser extension, Playwright, OData, scripts, or a manual workflow, while Stage 1+ should operate on the same canonical files and directory structure.

### 1.2 Dynamics Helper (DH)

Dynamics Helper is one possible Stage 0 adapter. It extracts case data from Dynamics 365, uses the Copilot SDK through a local Native Host, and can persist a report/session for continued work in Copilot CLI.

DH has two intended deployment modes:

1. **Standalone DH**
   - No MyCasesKit workspace is required.
   - DH must carry enough product behavior and default instructions to produce a useful case analysis/initialization result.
   - Users can customize DH-specific behavior.

2. **DH integrated with MyCasesKit / MyCases**
   - DH performs D365 extraction, invokes Stage 0 initialization, and continues automatic Stage 1 initial-triage analysis.
   - MyCases owns lifecycle semantics, product mapping, templates, case-folder layout, MCP, skills, hooks, and deterministic persistence of Stage 0/1 results.
   - DH must not create a second, drifting copy of MyCases workflow rules.

The current prompt architecture predates a clear separation between these modes.

## 2. Current DH Prompt Architecture

DH currently exposes or injects three primary prompt layers.

### 2.1 Product system prompt

**Source:** `Dynamics Helper/host/system_prompt.md`

**Current behavior:**

- Read by the Native Host during session config construction.
- Added to SDK `system_message` using `mode: "append"`.
- Applies to every DH session, case, and Root Path.
- Shipped and overwritten by DH releases.
- Defines DH persona, tool/privacy rules, one-shot behavior, output expectations, and general analysis guidance.

**Model role:** system.

**Lifecycle:** added when a session is created, resumed, or refreshed; not separately added on every Analyze turn.

### 2.2 Options “Custom User Instructions”

**Sources:**

- Options field: `prefs.userInstructions`
- Chrome mirror: `chrome.storage.local.dh_prefs.userInstructions`
- Canonical Host file: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`

**Current behavior:**

- Appended to `system_prompt.md` inside the same SDK `system_message` content.
- Applies to every DH session and every Root Path for the current Windows user.
- Despite the UI name, it is not sent as a user-role message; it is system-role instruction content.
- The file is not a standard Copilot CLI discovery path, so DH normally injects it only once.

**Model role:** system.

**Lifecycle:** added on session create/resume/refresh.

**Known defect:** Host update currently uses `payload.get("user_instructions") or ...`; an explicit empty string can be treated as absent, so clearing the field may fail to truncate the file. This should be fixed independently of the larger architecture decision.

### 2.3 Options “Custom User Prompt”

**Sources:**

- Options field: `prefs.userPrompt`
- Chrome mirror: `chrome.storage.local.dh_prefs.userPrompt`
- Host backup/source file: `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`

**Current behavior:**

- FAB inserts the text into the case payload under a `## User Prompt` section.
- The full case payload is sent through the PII scrubber and passed to `send_and_wait()` as the Analyze turn's prompt.
- Host session construction does not put this text into `system_message`.

**Model role:** user.

**Lifecycle:** added to every Analyze request. In a persistent session, prior turns retain prior copies in conversation history.

This layer has a genuinely different scope and role from the first two and should not be merged into system instructions merely to reduce the number of UI sections.

### 2.4 Root Path workspace instructions (hidden fourth layer)

When Root Path is configured, DH currently reads:

```text
<Root Path>\.github\copilot-instructions.md
```

and manually appends its contents to the same `system_message` as the DH system prompt and DH custom user instructions.

At the same time, DH now passes Root Path as the Copilot client/session `working_directory`. Copilot CLI automatically discovers repository instructions from the workspace, including:

- `.github/copilot-instructions.md`
- `.github/instructions/**/*.instructions.md`
- `AGENTS.md`
- agent instruction files such as `CLAUDE.md`, `GEMINI.md`, and related supported files

Copilot CLI also loads global instructions from:

```text
~/.copilot/copilot-instructions.md
```

Repository instructions take precedence over global instructions. SDK `system_message.mode="append"` adds caller content after SDK/CLI-managed system content; it does not disable custom-instruction discovery. DH does not set `skip_custom_instructions=True`.

## 3. Confirmed Problems

### 3.1 Repository instructions are injected twice

For a Root Path containing `.github/copilot-instructions.md`:

1. Copilot CLI discovers and loads the file from `working_directory`.
2. DH reads the same file and appends the raw content to SDK `system_message`.

There is no DH hash/path marker or deduplication. CLI deduplication cannot be assumed to recognize identical text manually embedded in caller-provided `system_message`.

**Conclusion:** this is structural double injection, not merely a possible conflict.

### 3.2 DH user instructions and Copilot global instructions overlap

The current machine has both:

- `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (DH-specific injection)
- `~/.copilot/copilot-instructions.md` (CLI-global automatic discovery)

These are not duplicate files, but both are system instructions with user-wide scope. If they describe the same tool, workflow, or response preferences, the model receives two potentially divergent sources.

Note: `~/.github/copilot-instructions.md` is not the current Copilot CLI global instruction path; `~/.copilot/copilot-instructions.md` is.

### 3.3 DH instructions currently contain MyCases workflow behavior

The active DH custom user instructions include Stage 0/MyCases behavior (for example, case-folder initialization and `context.md` session metadata). In integrated mode this competes with workspace instructions and hooks.

One confirmed conflict is session metadata ownership:

- DH user instructions tell the model to write `session_name` during initialization.
- MyCases workspace instructions state that launcher/hooks own the field and the model must not write it.

The previously observed duplicate `session_name`/`session_id` frontmatter came from this type of split ownership combined with a legacy workspace template.

### 3.4 “Repository ONLY Mode” does not control instructions

The current preference controls only skills and MCP merging. It does not change instruction loading. DH always adds product system + DH custom user instructions, and it currently always manually adds Root `.github/copilot-instructions.md` when present.

The UI label (“Use repository SKILLS and MCP ONLY”) is accurate; broader documentation saying it excludes all global/user instructions is not.

### 3.5 The three named layers have only two model roles

There is no developer-role layer:

- Product system prompt: system
- Custom User Instructions: system
- Workspace instructions: system (CLI-managed plus current DH duplicate)
- Custom User Prompt: user

Therefore, “three layers” is a product/UI taxonomy, not three distinct model-message roles.

## 4. Current MyCasesKit Stage 0 Contract

### 4.1 Intended output boundary

Current MyCasesKit design documents define Stage 0 by output postconditions rather than a stable, versioned adapter API.

Expected artifacts include:

- `<workspace>/<Product>/<CaseNumber>/`
- `case.md`
- `context.md`
- immutable `dh_case_report.md` or adapter-equivalent source report
- `attachments/` or an attachment index

Canonical product mapping belongs to the workspace (`product-mapping.yml`), and canonical case/context schemas belong to MyCasesKit templates.

### 4.2 Canonical ownership

| Concern | Intended owner |
|---|---|
| D365 identifier, raw product, status, severity, case facts | Stage 0 adapter (DH) |
| Canonical product/folder mapping | MyCases workspace |
| `case.md` / `context.md` schema | MyCases templates |
| Stage 1+ canonical persistence and lifecycle | MyCases workspace (DH may execute Stage 1 initial-triage analysis) |
| `session_name` persistence | Launcher/session hooks (current intended rule) |
| Shared session UUID calculation | DH and MyCasesKit share deterministic UUIDv5 contract |
| MCP, skills, hooks, agents | MyCases workspace |

### 4.3 Stage 0 is not yet a stable adapter API

Current documentation names candidate adapters (`dh-extension`, Playwright, OData, manual) but does not yet define a versioned input envelope, executable coordinator interface, complete idempotency rules, attachment/report schemas, or consistent ownership for every frontmatter field.

There are also inconsistencies between MyCasesKit strategy prose, templates, agents, and hooks. Examples include adapter provenance, `session_name` ownership, 19-digit task normalization, and whether some fields live in frontmatter or body.

**Implication:** DH should not copy current MyCases prose into a standalone prompt as a second implementation. The integrated contract should first be stabilized in MyCasesKit.

## 5. Workspace Identification Research

An integrated mode must not be inferred merely from generic Copilot files. `.github/copilot-instructions.md`, `.github/skills/`, `.git/`, `.obsidian/`, or MCP files can appear in unrelated repositories.

The strongest current MyCasesKit marker is:

```text
<root>/.mycase-install/manifest.json
```

with a parseable supported version, a non-empty `files` inventory, and required live canaries such as:

- `.agent/constitution.md`
- `.agent/principles.md`
- `.agent/operations.md`
- `.github/copilot-instructions.md`
- `.github/hooks/mycasekit/hooks.json`

The current `C:\MyWorkbench\MyCases` workspace appears to be legacy/partially migrated: it has historical install traces but lacks the current root manifest and several current canaries. A strict Auto detector should not silently treat it as a fully canonical installation.

## 6. Proposed Responsibility Boundary

This is a proposal for discussion, not a final decision.

### 6.1 Standalone DH

DH owns:

- D365 extraction
- generic case analysis/initialization behavior
- portable report output
- DH-specific MCP/skills configuration
- user-configurable DH-specific rules

DH must not assume MyCases folder/template schemas when no valid integration is selected.

### 6.2 MyCases-integrated DH

DH owns:

- D365 extraction
- adapter identity (`dh-extension`)
- a structured case-data handoff
- correct workspace `working_directory`
- invoking the deterministic Stage 0 coordinator
- automatic Stage 1 initial triage after Stage 0 succeeds
- using workspace-discovered instructions, skills, MCP, agents, and hooks during analysis
- returning a structured analysis proposal for canonical persistence

MyCases workspace owns:

- product mapping
- destination path
- templates and frontmatter schema
- idempotency/collision behavior
- attachments/report persistence rules
- session metadata ownership
- MCP, skills, agents, hooks
- Stage 0 deterministic persistence
- Stage 1 analysis-result persistence and lifecycle transition
- Stage 2+ lifecycle

DH should rely on CLI workspace discovery for repository instructions and remove its manual `.github/copilot-instructions.md` append.

The key boundary is not “DH analyzes versus MyCases analyzes.” It is:

- **DH/LLM produces analysis.**
- **MyCases deterministic components own schemas, file writes, idempotency, and lifecycle transitions.**

### 6.3 Integrated execution pipeline

The intended integrated sequence is:

```text
DH Extract
  → New-Case Coordinator (Stage 0 deterministic scaffold)
  → DH Automatic Initial Triage (Stage 1 analysis)
  → MyCases Deterministic Persistence (canonical files + lifecycle)
```

#### Step A — DH extraction

DH extracts only source-backed D365 facts and attachment metadata. It does not map product folders or render MyCases templates.

#### Step B — `New-Case` Stage 0 coordinator

The recommended Form ③ coordinator:

- maps raw product to canonical product/folder;
- normalizes case/task identity according to the approved rule;
- locks and creates/reuses the case folder idempotently;
- creates and fills `case.md` from source-backed facts;
- creates a `context.md` skeleton;
- persists immutable `dh_case_report.md` / source snapshot;
- creates `attachments/` (or index) and any agreed skeleton directories;
- records adapter provenance;
- leaves hook-owned session metadata alone;
- keeps lifecycle status at `open`.

Stage 0 does not perform troubleshooting analysis.

#### Step C — DH automatic Stage 1 initial triage

After coordinator success, DH continues its automatic Copilot analysis under the MyCases workspace root. This is not optional merely because integrated mode is enabled; it is a core value of the extension.

The analysis may use workspace-discovered instructions, skills, MCP, agents, and hooks. It should produce structured outputs rather than freely editing canonical files:

```text
case_fact_patch
troubleshooting_entry
context_patch
requested_status_transition
```

- `case_fact_patch`: only D365/source-backed missing facts; no hypotheses.
- `troubleshooting_entry`: initial assessment, observations, evidence, pending hypotheses, information gaps, executed/suggested queries, and next actions.
- `context_patch`: concise summary, confirmed findings, pending questions, tasks, and next steps.
- `requested_status_transition`: normally `open → investigating` once a real troubleshooting entry is persisted.

#### Step D — deterministic Stage 1 persistence

A MyCases-owned persistence layer validates and writes the analysis proposal:

- creates `troubleshooting.md` from the canonical template if absent;
- appends one idempotent initial-assessment entry (using `analysis_run_id` or content hash);
- applies allowed source-backed facts to `case.md`;
- updates `context.md` narrative sections;
- asks the lifecycle owner/case-manager to transition `case.md.status`;
- never changes `session_name`/`last_agent` if they are hook-owned;
- never rewrites immutable `dh_case_report.md`;
- runs validators/enforcers.

#### Resulting file ownership

| File | Stage 0 | Stage 1 initial triage | Later stages |
|---|---|---|---|
| `case.md` | Coordinator creates source facts + `status: open` | Persister applies source-backed fact patch; lifecycle owner may set `investigating` | Case-manager owns lifecycle metadata |
| `dh_case_report.md` | Coordinator persists immutable D365/source snapshot | Read-only input | Read-only input |
| `troubleshooting.md` | Not required to contain analysis (optional empty skeleton only if contract chooses) | Persister creates/appends canonical initial assessment | Troubleshooter appends investigation |
| `context.md` | Coordinator creates skeleton; hook/runtime owns session metadata | Persister updates concise handoff sections | Checkpoint/work agents update narrative |
| `root-cause.md` | Not created | Normally not created | Stage 3 only when evidence supports RCA |

### 6.4 Minimal integration handoff instruction

Even with automatic workspace discovery, a small adapter-specific handoff is probably still needed because the workspace cannot infer the current turn's adapter and intent solely from generic case data.

Example intent (illustrative, not final wording):

> This is a `dh-extension` integrated run. First invoke the workspace-owned
> Stage 0 coordinator with the supplied extraction envelope. After successful
> initialization/reuse, perform Stage 1 initial triage using workspace-discovered
> instructions, skills, MCP, agents, hooks, and safety rules. Return the agreed
> structured analysis proposal for deterministic persistence. Do not hand-build
> schemas, overwrite an existing case, enter later lifecycle stages, or directly
> manage hook-owned session metadata.

This handoff should not duplicate product maps, file schemas, or lifecycle instructions.

## 7. Candidate Architectures

### Option A — Keep three DH fields, clarify scopes

- Keep product system prompt.
- Keep DH custom user instructions, but rename/document as “DH-specific personal instructions.”
- Keep Custom User Prompt as per-analysis text.
- Remove manual workspace instruction loading.
- In integrated mode, add a minimal handoff instruction.

**Benefits:** lowest migration cost; preserves standalone customization.

**Risks:** users may continue placing global or workspace workflow rules in the DH-specific field unless the UI and migration guidance are strong.

### Option B — Two visible DH layers (recommended direction)

- Product system prompt remains internal/not user-editable.
- Replace “Custom User Instructions” with a clearly scoped “DH-specific instructions” field, optional and empty by default.
- Keep “Custom User Prompt” as per-analysis text.
- Repository/global Copilot instructions remain external and automatically discovered.
- Integration mode injects only the minimal Stage 0 coordinator + Stage 1 analysis/persistence orchestration handoff; it does not copy MyCases schemas or workflow prose.

**Benefits:** maps UI to actual roles and ownership; avoids presenting the internal product prompt as a user layer; preserves standalone extensibility without competing with workspace SSoT.

**Risks:** existing DH user instruction content needs review/migration because it currently mixes DH, MyCases, and global preferences.

### Option C — Remove DH user instructions entirely

- Product system prompt + per-analysis Custom User Prompt only.
- Users put global rules in `~/.copilot/copilot-instructions.md` and repository rules in workspace files.

**Benefits:** minimal duplication and a single Copilot-native instruction model.

**Risks:** weakens standalone DH isolation; users cannot express preferences that apply to DH but should not affect interactive Copilot CLI. Existing user content needs a forced migration destination.

## 8. Recommended Route for Cross-Repo Discussion

### Phase 0 — Decide MyCasesKit Stage 0 ownership first

MyCasesKit follow-up `stage0-coordinator-design.md` recommends **Form ③: a deterministic `New-Case` coordinator**, because prose-driven initialization cannot guarantee non-interactive unknown-product behavior, idempotency, or task-number normalization. The proposal remains formally unapproved; once accepted, MyCasesKit should define:

1. The deterministic coordinator command/interface and physical Stage 0 writer.
2. Versioned Stage 0 input envelope and adapter identity.
3. Idempotency and existing-case behavior.
4. Canonical schema/ownership for `case.md`, `context.md`, `session_name`, `last_agent`, adapter provenance, and attachments.
5. 19-digit task-number normalization.
6. Unknown-product behavior in a one-shot, non-interactive DH flow.

### Phase 1 — Define integration detection

Recommended preference:

```text
Integration mode:
- Auto
- Standalone
- MyCases-integrated
```

- **Auto:** only activates with a valid manifest + required canaries.
- **Standalone:** never applies MyCases filesystem/workflow contract.
- **MyCases-integrated:** explicit override, but still validates workspace health; incomplete installs fail closed rather than silently writing files.

Because the current MyCases workspace is legacy/partial, the design must decide whether to support a documented legacy signature temporarily or require migration before integrated mode.

### Phase 2 — Remove instruction duplication in DH

Independent of the final Stage 0 writer:

1. Stop manually appending Root `.github/copilot-instructions.md`.
2. Continue using Root Path as client/session working directory so CLI performs official discovery.
3. Add tests that verify workspace instructions/skills/MCP/hooks are discoverable through the SDK child process.
4. Correct documentation that currently overstates Repository ONLY behavior.

### Phase 3 — Refactor DH prompt scopes

Recommended direction:

- Keep internal product system prompt.
- Keep an optional, clearly named DH-specific personal instruction layer.
- Keep Custom User Prompt as the per-analysis user message.
- Move MyCases workflow content out of DH user instructions into MyCases workspace SSoT.
- Move truly global Copilot preferences into `~/.copilot/copilot-instructions.md`.
- Provide a migration preview that shows the existing DH instruction content and suggested destinations; do not silently move arbitrary user text.

### Phase 4 — Implement integrated Stage 0 + Stage 1 orchestration

Once MyCasesKit defines the contracts, DH should send a versioned envelope containing raw adapter facts, not rendered MyCases files, invoke `New-Case`, then continue automatic Stage 1 analysis and submit a structured analysis proposal to the MyCases persistence layer.

Candidate fields:

- `schema_version`
- `intent: stage0.initialize`
- `adapter: dh-extension`
- raw identifier + identifier kind
- canonical/parent case number per decided rule
- D365 status
- raw product display/path
- severity
- title/problem summary
- organization name (not personal contacts)
- technical environment identifiers
- attachment metadata/references
- source report body/reference

The workspace coordinator maps, validates, writes Stage 0 artifacts, and records provenance. After coordinator success/reuse, DH performs initial triage and returns:

- `case_fact_patch`
- `troubleshooting_entry`
- `context_patch`
- `requested_status_transition`

The workspace persister validates/idempotently applies those outputs to canonical files and lifecycle state.

### Phase 5 — Migration and validation

1. Fix DH empty-string clearing for `copilot-instructions.md`.
2. Audit the current DH user instructions into three buckets:
   - DH-specific personal rules
   - MyCases workspace workflow
   - global Copilot preferences
3. Migrate/update the legacy MyCases workspace to a canonical MyCasesKit install.
4. Remove legacy `session_id` templates/agents after consumer compatibility review; retain canonical `session_name` per current MyCasesKit contract unless that contract is deliberately redesigned.
5. Run real SDK E2E tests for instructions, skills, MCP, hooks, case initialization, initial triage persistence, idempotency, and CLI resume.

## 9. Decisions Needed in the MyCasesKit Session

1. Does MyCasesKit formally accept Form ③ (`New-Case` deterministic coordinator)?
2. What is the versioned Stage 0 adapter envelope?
3. Is `session_name` launcher/hook-owned or adapter-written at initialization?
4. Should `stage0_adapter` become canonical frontmatter/provenance?
5. How are 19-digit task IDs normalized?
6. What happens for unknown product mapping without an interactive follow-up?
7. What is the canonical report and attachment-index schema?
8. Must legacy MyCases workspaces be supported in integrated mode, or migrated first?
9. Which manifest schema/version/canaries define a valid integrated workspace?
10. Does the MyCases workspace expose a deterministic coordinator command/skill that adapters can invoke?
11. What deterministic Stage 1 persistence API accepts DH's analysis proposal and owns `troubleshooting.md`, `context.md`, fact patches, and lifecycle transition?
12. What is the idempotency identity for one automatic analysis run (`analysis_run_id`, envelope ID, content hash, or another key)?

## 10. Suggested MyCasesKit Design-Session Prompt

The following can be pasted into the MyCasesKit design session:

> We need to define a stable, adapter-neutral Stage 0 contract for MyCasesKit. Dynamics Helper is one adapter and must also work standalone. Today DH injects its product system prompt, a DH user-level system instruction file, and a per-analysis user prompt; it also manually appends Root `.github/copilot-instructions.md`, while Copilot CLI auto-discovers the same workspace file, causing duplicate instructions. DH's user instructions currently contain MyCases workflow rules that can conflict with workspace hooks (notably `session_name` ownership).
>
> Please use `Dynamics Helper/docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md` as the research brief and `stage0-coordinator-design.md` as the MyCasesKit follow-up proposal. Decide: (1) whether Form ③ / deterministic `New-Case` is accepted, (2) the versioned Stage0Envelope, (3) canonical Stage 0 schemas/ownership/idempotency, (4) integration marker and legacy policy, and (5) a deterministic Stage 1 persistence API. Integrated DH must continue automatic initial triage after Stage 0; the intended pipeline is Extract → New-Case → DH Analyze → MyCases Persist. Preserve the boundary that DH produces extraction and analysis while MyCases owns mapping, templates, file writes, lifecycle, skills, MCP, hooks, and Stage 2+ workflow. Do not implement until both Stage 0 and Stage 1 cross-repo contracts are approved.

## 11. Evidence and Primary References

### Dynamics Helper

- Prompt assembly and workspace manual append: `host/dh_native_host.py::_get_session_config`
- Session UUID injection: `host/dh_native_host.py::_refresh_session`
- Per-analysis prompt construction: `extension/src/components/FAB.tsx::constructTemplate` / Analyze path
- Persistence and hydration: `extension/src/components/Options.tsx`, `extension/src/utils/prefs.ts`
- Current instruction docs: `DEVELOPER_GUIDE.md`, `USER_GUIDE.md`, `AGENTS.md`

### MyCasesKit

- Stage 0 concept: `docs/repo-integration-strategy.md`
- Workspace ownership: `core/agent/operations.md`
- Canonical templates: `core/templates/case.md`, `core/templates/context.md`
- Session identity: `docs/session-identity.md`
- Installer manifest and deployment: `installer/Install-Toolkit.ps1`
- Generator/deploy boundary: `scripts/sync-agent-configs.ps1`, `docs/deploy-boundary.md`
- Current DH-oriented future prompt source: `core/extension-prompts/`

### Official Copilot behavior

- Copilot CLI custom instruction discovery: global `~/.copilot/copilot-instructions.md`, repository `.github/copilot-instructions.md`, path-specific instructions, and agent instruction files; repository rules take precedence over global rules.
- Copilot SDK `system_message.mode="append"`: caller content is appended to SDK/CLI-managed system content.
- Disabling automatic custom instructions requires `skip_custom_instructions` (or an equivalent Empty-mode architecture); DH currently does not disable discovery.
