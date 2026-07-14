# Dynamics Helper × MyCasesKit Stage 0 Instructions — Design Discussion Brief

- **Date:** 2026-07-14
- **Status:** Research / cross-repo discussion input — not an approved design
- **Audience:** Dynamics Helper and MyCasesKit maintainers
- **Decision owner:** MyCasesKit design session for the integrated Stage 0 contract

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
   - DH is only the D365 extraction and Stage 0 entry adapter.
   - MyCases owns lifecycle semantics, product mapping, templates, case-folder layout, MCP, skills, hooks, and Stage 1+ behavior.
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
| Case lifecycle and Stage 1+ workflow | MyCases workspace |
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
- a minimal handoff intent: execute Stage 0 initialization only; do not enter Stage 1

MyCases workspace owns:

- product mapping
- destination path
- templates and frontmatter schema
- idempotency/collision behavior
- attachments/report persistence rules
- session metadata ownership
- MCP, skills, agents, hooks
- Stage 1+ lifecycle

DH should rely on CLI workspace discovery for repository instructions and remove its manual `.github/copilot-instructions.md` append.

### 6.3 Minimal integration handoff instruction

Even with automatic workspace discovery, a small adapter-specific handoff is probably still needed because the workspace cannot infer the current turn's adapter and intent solely from generic case data.

Example intent (illustrative, not final wording):

> This request is a `dh-extension` Stage 0 initialization. Treat the supplied object as adapter input. Use the workspace's own mapping, templates, coordinator, skills, MCP, hooks, and safety rules. Initialize only this case, do not enter Stage 1, do not overwrite an existing case, and do not invent or directly manage hook-owned session metadata.

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
- Integration mode injects only the versioned Stage 0 handoff.

**Benefits:** maps UI to actual roles and ownership; avoids presenting the internal product prompt as a user layer; preserves standalone extensibility without competing with workspace SSoT.

**Risks:** existing DH user instruction content needs review/migration because it currently mixes DH, MyCases, and global preferences.

### Option C — Remove DH user instructions entirely

- Product system prompt + per-analysis Custom User Prompt only.
- Users put global rules in `~/.copilot/copilot-instructions.md` and repository rules in workspace files.

**Benefits:** minimal duplication and a single Copilot-native instruction model.

**Risks:** weakens standalone DH isolation; users cannot express preferences that apply to DH but should not affect interactive Copilot CLI. Existing user content needs a forced migration destination.

## 8. Recommended Route for Cross-Repo Discussion

### Phase 0 — Decide MyCasesKit Stage 0 ownership first

MyCasesKit should decide:

1. Who physically creates/updates Stage 0 files:
   - deterministic workspace coordinator/command,
   - explicit workspace agent/skill,
   - or the current main Copilot agent following prose instructions.
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

### Phase 4 — Implement a minimal Stage 0 handoff

Once MyCasesKit defines the contract, DH should send a versioned envelope containing raw adapter facts, not rendered MyCases files.

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

The workspace coordinator then maps, validates, writes, and records provenance.

### Phase 5 — Migration and validation

1. Fix DH empty-string clearing for `copilot-instructions.md`.
2. Audit the current DH user instructions into three buckets:
   - DH-specific personal rules
   - MyCases workspace workflow
   - global Copilot preferences
3. Migrate/update the legacy MyCases workspace to a canonical MyCasesKit install.
4. Remove legacy `session_id` templates/agents after consumer compatibility review; retain canonical `session_name` per current MyCasesKit contract unless that contract is deliberately redesigned.
5. Run real SDK E2E tests for instructions, skills, MCP, hooks, case initialization, idempotency, and CLI resume.

## 9. Decisions Needed in the MyCasesKit Session

1. Who is the Stage 0 file writer/coordinator?
2. What is the versioned Stage 0 adapter envelope?
3. Is `session_name` launcher/hook-owned or adapter-written at initialization?
4. Should `stage0_adapter` become canonical frontmatter/provenance?
5. How are 19-digit task IDs normalized?
6. What happens for unknown product mapping without an interactive follow-up?
7. What is the canonical report and attachment-index schema?
8. Must legacy MyCases workspaces be supported in integrated mode, or migrated first?
9. Which manifest schema/version/canaries define a valid integrated workspace?
10. Does the MyCases workspace expose a deterministic coordinator command/skill that adapters can invoke?

## 10. Suggested MyCasesKit Design-Session Prompt

The following can be pasted into the MyCasesKit design session:

> We need to define a stable, adapter-neutral Stage 0 contract for MyCasesKit. Dynamics Helper is one adapter and must also work standalone. Today DH injects its product system prompt, a DH user-level system instruction file, and a per-analysis user prompt; it also manually appends Root `.github/copilot-instructions.md`, while Copilot CLI auto-discovers the same workspace file, causing duplicate instructions. DH's user instructions currently contain MyCases workflow rules that can conflict with workspace hooks (notably `session_name` ownership).
>
> Please use `Dynamics Helper/docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md` as the research brief. Decide: (1) the Stage 0 writer/coordinator, (2) a versioned Stage0Envelope, (3) canonical schemas/ownership/idempotency, (4) integration marker and legacy policy, and (5) the minimal DH handoff. Preserve the boundary that DH extracts D365 facts while the MyCases workspace owns mapping, templates, lifecycle, skills, MCP, hooks, and Stage 1+ workflow. Do not implement until the cross-repo contract is approved.

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
