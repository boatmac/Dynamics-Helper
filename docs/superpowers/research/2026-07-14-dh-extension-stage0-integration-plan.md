# Dynamics Helper Extension — Conditional Stage 0/1 Integration Plan

- **Date:** 2026-07-14
- **Status:** Planning input, conditional on MyCasesKit contracts; not an implementation plan
- **Related research:** `2026-07-14-dh-mycaseskit-stage0-instructions-brief.md`
- **MyCasesKit proposal:** `stage0-coordinator-design.md` (Form ③ recommended, not yet formally approved)

## 1. Objective

Refactor Dynamics Helper so it supports both:

1. **Standalone mode:** DH remains useful without MyCasesKit and performs its normal automatic case analysis/reporting.
2. **MyCases-integrated mode:** DH acts as the D365 extraction + automatic initial-triage adapter, while MyCasesKit deterministically owns mapping, schemas, file persistence, idempotency, and lifecycle.

Integrated mode must not reduce DH to a passive import button. The target pipeline is:

```text
DH Extract
  → MyCases New-Case (Stage 0)
  → DH Automatic Initial Triage (Stage 1)
  → MyCases Deterministic Persistence
```

## 2. Non-negotiable boundaries

### DH owns

- D365 DOM/context extraction
- PII scrubbing before model analysis
- case-session UUID and Copilot SDK lifecycle
- automatic initial analysis
- adapter identity and structured handoff
- standalone behavior
- DH-specific personal preferences/instructions

### MyCasesKit owns in integrated mode

- workspace identity/health contract
- product mapping and canonical case path
- case/task normalization
- templates/frontmatter/file schemas
- Stage 0 idempotency and collision behavior
- canonical writes to `case.md`, `context.md`, `troubleshooting.md`, reports/attachments
- session metadata persistence policy
- lifecycle transitions
- workspace instructions, skills, MCP, agents, hooks

### Shared contract

- deterministic UUIDv5 session identity
- versioned `Stage0Envelope`
- coordinator request/response
- structured Stage 1 analysis proposal
- persistence request/response + idempotency identity
- error taxonomy and version compatibility

## 3. Workstream A — DH fixes that do not depend on MyCasesKit API

These can be designed/implemented independently after explicit approval.

### A1. Remove duplicate workspace-instruction injection

Current DH manually reads `<root>/.github/copilot-instructions.md` and appends it to SDK `system_message`, while Copilot CLI auto-discovers the same file from `working_directory`.

Change:

- remove the manual workspace-instruction append;
- retain root-bound client/session working directory;
- rely on Copilot CLI official discovery for repository instructions and agent files;
- keep DH's own internal system prompt separate.

Required tests:

- `_get_session_config()` no longer embeds workspace instruction text;
- SDK integration smoke proves workspace instructions still load from working directory;
- no duplicate instruction markers in session context/events if observable.

### A2. Fix Custom User Instructions empty-string clearing

Current host uses truthiness (`a or b`) and can ignore an explicit empty value.

Change:

- distinguish missing field from empty string;
- empty string truncates `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`;
- add Options/Host round-trip tests.

### A3. Correct prompt-scope naming and documentation

Proposed UI taxonomy:

- Internal (not user-editable): **DH Core System Prompt**
- User-editable system layer: **DH-specific Instructions**
- Per-analysis user layer: **Custom User Prompt**

Document that:

- DH-specific instructions affect only DH sessions;
- global Copilot preferences belong in `~/.copilot/copilot-instructions.md`;
- repository workflow belongs in workspace instruction files;
- Custom User Prompt is repeated on each Analyze turn.

Do not silently migrate existing text. Show migration guidance because current content may mix all three scopes.

### A4. Correct Repository ONLY documentation

The preference currently isolates skills and MCP, not instructions. Update documentation/UI help text only if needed; do not broaden behavior without a separate design.

## 4. Workstream B — contracts MyCasesKit must define first

DH implementation is blocked on these artifacts.

### B1. Workspace identity / integration health

Need a versioned manifest contract with authoritative canaries, not DH-hardcoded path guesses.

Expected detection result:

```text
mode: standalone | integrated | blocked
manifest_version
coordinator_version
missing_canaries[]
reason
```

Open policy: legacy workspace support versus mandatory migration.

### B2. `Stage0Envelope`

Minimum categories:

- schema version / request ID / adapter
- intent (`stage0.initialize`)
- raw identifier and kind
- canonical parent-case identity per approved task rule
- D365 status, raw product, severity
- title/description/problem summary
- organization (no personal contact PII)
- technical environment identifiers/timestamps
- attachment metadata/references
- source report payload/reference
- operator notes (from Custom User Prompt, with precedence limits)

Must specify required/optional/null semantics, size limits, PII boundary, forward compatibility, and validation errors.

### B3. `New-Case` coordinator API

Need:

- invocation mechanism (PowerShell command/module, skill wrapper, RPC, or another stable interface);
- request and response schema;
- idempotency and locking;
- existing-case behavior;
- product mapping/unknown fallback;
- 19-digit task normalization;
- file outputs and provenance;
- report/attachment behavior;
- transactional failure/rollback;
- version negotiation.

Expected response categories:

```text
created | reused | blocked | invalid
case_root
canonical_case_number
canonical_product
stage0_run_id
warnings[]
```

### B4. Stage 1 persistence API

This contract is as important as `New-Case`; without it, DH analysis remains only in chat/report and does not become canonical investigation state.

Input proposal:

```text
analysis_run_id
case_fact_patch
troubleshooting_entry
context_patch
requested_status_transition
source_refs[]
```

Persistence must:

- validate source-backed facts;
- create `troubleshooting.md` from template if absent;
- write one idempotent initial assessment;
- update allowed `context.md` sections;
- route lifecycle transition through the owner;
- protect hook-owned fields;
- never rewrite immutable source report;
- run validators/enforcers;
- return applied/skipped/conflict details.

### B5. Error taxonomy

DH needs deterministic handling for:

- unsupported contract version
- incomplete workspace/install
- unknown product
- existing case conflict
- lock contention
- invalid envelope
- persistence validation failure
- partial attachment failure
- coordinator unavailable

The contract must define retryable versus terminal errors and whether standalone fallback is allowed. Explicit integrated mode should fail closed; Auto mode policy requires a separate decision.

## 5. Workstream C — DH integrated-mode implementation (after B contracts)

### C1. Preferences and detection

Add:

```text
Integration mode:
- Auto
- Standalone
- MyCases-integrated
```

Behavior:

- Standalone: skip MyCases contract entirely.
- Auto: integrate only when strong manifest + canaries pass.
- MyCases-integrated: validate health; fail closed if incomplete.

Persist/mirror settings according to current Options rules and hydration guard.

### C2. Extraction DTO builder

Introduce a pure, testable conversion from DH page context to `Stage0Envelope`.

Requirements:

- no product-folder mapping;
- no rendered MyCases Markdown;
- no inferred missing facts;
- explicit source/provenance;
- PII policy aligned with contract;
- deterministic request ID/idempotency input.

### C3. Coordinator adapter

Add a small boundary component that:

- invokes the MyCases coordinator;
- validates response version/schema;
- logs safe diagnostics;
- classifies errors;
- never writes MyCases files directly.

### C4. Mode-specific prompt assembly

Refactor prompt construction into explicit units:

```text
DH Core System
+ DH-specific personal instructions
+ Mode module:
   - Standalone behavior, or
   - MyCases integration handoff
+ Session info
+ Analyze user message / Custom User Prompt
```

Integrated handoff contains only orchestration intent, not workflow/schema duplication.

### C5. Automatic Stage 1 triage

After coordinator returns `created` or an approved `reused` status:

- run DH analysis automatically under workspace root;
- use workspace-discovered instructions/skills/MCP/hooks;
- provide Stage 0 artifacts as input;
- request structured analysis output conforming to B4;
- preserve existing user-visible analysis summary/progress behavior.

### C6. Persistence adapter

Submit structured analysis proposal to the MyCases persistence API.

UI result should distinguish:

- analysis completed + canonical persistence completed;
- analysis completed but persistence failed;
- initialization blocked before analysis;
- existing case reused and triage appended/skipped idempotently.

### C7. Portable report behavior

Standalone:

- retain current portable `dh_case_report.md` behavior.

Integrated:

- coordinator owns immutable source-report placement;
- DH must not later overwrite it;
- user-visible result links to canonical case path/artifacts returned by coordinator/persister.

## 6. Workstream D — migration

### D1. Current DH instructions

Provide a guided/manual migration checklist:

- DH-specific preferences remain in DH field;
- MyCases lifecycle/schema content moves to workspace SSoT;
- universal Copilot preferences move to `~/.copilot/copilot-instructions.md`.

Never automatically repartition arbitrary prose.

### D2. Legacy MyCases workspace

The current workspace does not satisfy the proposed canonical manifest/canary check. MyCasesKit must supply migration/repair before Auto integration can be trusted.

### D3. Session metadata

Remove DH instructions that tell the model to write `session_name` once MyCasesKit confirms hook ownership. Preserve shared UUIDv5 runtime identity.

### D4. Existing files

MyCasesKit owns migration from legacy `session_id` templates/agents and any context/troubleshooting schema versions. DH must not rewrite historical case files during the integration upgrade.

## 7. Test plan

### DH unit/contract tests

- mode selection/detection
- envelope construction and validation
- no workspace instruction double append
- user instruction clear semantics
- coordinator response/error mapping
- prompt mode selection
- structured analysis parser
- persistence response mapping
- Options hydration invariants for new preferences

### Cross-repo contract tests

- shared envelope fixtures validated by both repos
- version compatibility matrix
- created/reused/idempotent/conflict coordinator cases
- unknown product and task normalization
- Stage 1 persistence exact-once behavior
- protected session fields
- immutable report behavior

### Real SDK E2E

- integrated root discovers instructions, skills, MCP, and hooks exactly once
- coordinator initializes canonical files
- DH automatic triage runs
- persistence writes troubleshooting/context and lifecycle transition
- CLI resume retains root and artifacts
- standalone mode remains unchanged

## 8. Suggested sequencing

1. MyCasesKit formally decides Form ③.
2. DH may implement Workstream A independent cleanup while MyCasesKit design continues.
3. MyCasesKit fixes independent `session_name` prose conflict and exports integration canaries.
4. Both repos approve `Stage0Envelope` + coordinator contract.
5. MyCasesKit builds/tests `New-Case`.
6. Both repos approve Stage 1 analysis-proposal + persistence contract.
7. MyCasesKit builds/tests deterministic Stage 1 persister.
8. DH implements Workstream C integrated orchestration.
9. Migrate/repair legacy MyCases workspace.
10. Run cross-repo E2E and then enable Auto mode.

Parallelization note: Workstream A can proceed while MyCasesKit designs/builds B, but DH integrated orchestration must not guess B interfaces.

## 9. MyCasesKit discussion checklist

Please return the following artifacts/decisions to DH:

- [ ] Form ③ accepted/rejected
- [ ] Workspace marker/manifest/canary schema
- [ ] `Stage0Envelope` JSON/schema fixture
- [ ] Coordinator command/API and response fixture
- [ ] Existing-case/idempotency policy
- [ ] Product fallback and task normalization
- [ ] Canonical Stage 0 file/provenance contract
- [ ] Stage 1 analysis proposal schema
- [ ] Stage 1 persistence API/response fixture
- [ ] Lifecycle transition ownership
- [ ] Session metadata ownership
- [ ] Error taxonomy/version negotiation
- [ ] Legacy migration policy

Until these are approved, DH should not implement MyCases-specific file writes or duplicate workflow instructions.
