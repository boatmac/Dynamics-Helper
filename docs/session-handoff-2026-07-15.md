# Remote VM Development Handoff — 2026-07-15

## Purpose

This file is the durable continuation point for moving Dynamics Helper development to a remote Windows VM. Read it before making changes; do not rely on prior chat context.

## Repository State

- Repository: `boatmac/Dynamics-Helper`
- Branch: `master`
- Origin sync before this handoff commit: `0 behind / 0 ahead`
- Working tree before this handoff commit: clean
- Source version: `2.0.74-beta.4`
- Latest published prerelease: `v2.0.74-beta.4`
- Release URL: <https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.74-beta.4>
- Release asset: `DynamicsHelper_v2.0.74-beta.4.zip`
- Local machine Native Messaging registry mode at handoff: **DEV** (machine-local state; it does not transfer through Git)

Most recent commits before this handoff:

```text
3241656 docs(research): add integrated Stage 0/1 pipeline and DH plan
d91c92a docs(research): DH x MyCasesKit Stage 0 instructions brief
88bdd0d chore: release v2.0.74-beta.4
0b0bb66 fix(session): bind Copilot sessions to configured workspace root
c5e282e chore: release v2.0.74-beta.3
```

## Remote VM Bootstrap

After `git pull`, verify/install dependencies as needed:

```powershell
npm install --prefix extension
```

```powershell
python -m venv host\venv
```

```powershell
& "host\venv\Scripts\python.exe" -m pip install -r host\requirements.txt
```

Run baseline verification:

```powershell
& "host\venv\Scripts\python.exe" -m unittest discover host
```

```powershell
npm run test:run --prefix extension
```

```powershell
npm run build --prefix extension
```

For browser integration on the VM, inspect registry mode before changing it:

```powershell
python dev_switch.py status
```

Switch to source/DEV only when ready to test the local Host:

```powershell
python dev_switch.py dev
```

The VM must have GitHub Copilot CLI installed and authenticated. The host venv must use `github-copilot-sdk==1.0.5` (see `host/requirements.txt`).

## v2.0.74 Beta Line Delivered

### beta.1 — Options layout

- Reorganized Options into a left sidebar + content pane.
- Sections: General, Appearance, Copilot Configuration, Model & Performance, Team Catalog, Bookmark Manager.
- Fixed Bookmark Manager label.
- Made instruction preview/edit panes resizable.
- Made Bookmark Manager resizable; default height reduced to 900px.
- Fixed duplicated `v` in update messages.

### beta.2 — About & Help

- Added seventh Options tab: About & Help.
- Shows Extension/Host versions and update controls.
- Links to User Guide, releases, and bug reporting.
- Adds troubleshooting guidance and copyable log path.
- Added privacy link and localization.
- `Copied!` confirmation auto-dismisses after 2 seconds.

### beta.3 — i18n audit

- Localized remaining high-confidence hardcoded UI strings in Options, FAB, MarkdownPreview, native dialogs, placeholders, tooltips, and error prefixes.
- Added/updated English + Chinese translation keys and full-width Chinese punctuation.
- Deliberately retained technical enum values, brand names, log-level names, and other agreed technical labels.

### beta.4 — workspace-root session persistence

Fixed the root cause of Copilot CLI `/resume` restoring a DH session into the Native Host/extension directory instead of the configured Root Path.

Key behavior now:

- Config loads before `CopilotClient` construction.
- Client, `create_session`, and `resume_session` receive the same explicit `working_directory`.
- Root changes restart the CLI client.
- Startup initializes only the client; it does not create a generic session.
- Options updates preserve deterministic UUIDv5 case-session identity.
- Desired config root, client process root, and active-session root are tracked separately.
- Empty/missing Analyze `rootPath` falls back to canonical Host config (protects the extension pre-hydration window).
- Runtime root overrides drive cwd, skills, MCP, and workspace instructions consistently.
- Relative roots are rejected.
- Corrupt config fails closed instead of silently persisting Host cwd.
- Refresh/retry/broken-pipe/timeout failure paths invalidate stale state.
- Reports print a root-bound command:

```powershell
copilot -C '<root>' --resume=<uuid>
```

This applies the root before CLI discovers workspace instructions, skills, MCP, and hooks, and overrides stale cwd metadata from old sessions.

## Verification Baseline

Last full verification for the beta.4 session fix:

- Host: **109/109** tests passed.
- Extension: **43/43** tests passed.
- Extension production build passed.
- `py_compile` passed for modified Host/test files.
- `git diff --check` passed.
- Final static gate: READY.

Real SDK smoke (no prompt/model call):

- Created a temporary random-UUID SDK session with the configured root.
- Verified persisted `workspace.yaml.cwd` equals the configured root.
- Resumed with explicit root successfully.
- Deleted the temporary session successfully.

Workspace regression coverage lives in:

`host/test_session_workspace.py`

## Session Identity Contract

- Case session ID is deterministic UUIDv5 derived from the bare 16-digit case number.
- Namespace: `816bee4e-8eee-4c0b-ae69-70879d032f4d`.
- DH and MyCasesKit must compute the identical value; do not add a salt or change input format.
- Golden example is locked in `host/test_case_id.py`.
- SDK/internal name: `session_id` / `current_session_id`.
- DH external/report/frontmatter contract currently calls the opaque resume handle `session_name`.
- `context.md` is not written directly by DH Host. Duplicate `session_name` + `session_id` observed in legacy MyCases files was traced to an old MyCases template/agent plus DH instructions, not the current Host response.

## Current Prompt Architecture — Verified Facts

DH currently has these effective layers:

1. `host/system_prompt.md`
   - Product-managed DH core rules.
   - SDK **system** role via `system_message(mode="append")`.
   - Session scope.

2. Options “Custom User Instructions”
   - Canonical file: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`.
   - Also SDK **system** role, despite the UI name.
   - Applies to all DH sessions for the Windows user.

3. Options “Custom User Prompt”
   - Canonical Host backup: `%LOCALAPPDATA%\DynamicsHelper\user_prompt.md`.
   - Inserted into each Analyze request as **user** content.
   - PII-scrubbed with the case payload.

4. Hidden workspace layer
   - DH currently manually reads `<root>/.github/copilot-instructions.md` and appends it to `system_message`.
   - Copilot CLI also auto-discovers the same file from `working_directory`.
   - Therefore repository instructions are currently injected twice.

Copilot CLI global instructions are loaded from:

`~/.copilot/copilot-instructions.md`

not `~/.github/copilot-instructions.md`.

## Independent Prompt Fixes Identified (Not Implemented)

These are documented but not yet implemented:

1. Remove DH's manual append of Root `.github/copilot-instructions.md`; rely on official CLI discovery.
2. Fix empty-string clearing of `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (`a or b` currently treats empty as absent).
3. Rename/re-document the user field as **DH-specific Instructions**.
4. Keep **Custom User Prompt** as the per-analysis user message.
5. Move global preferences to `~/.copilot/copilot-instructions.md`.
6. Move MyCases workflow/schema content to the MyCases workspace SSoT.
7. Correct documentation that overstates “Repository ONLY” behavior; the current option isolates skills/MCP, not instructions.

Do not implement these directly from this handoff. The research is not an approved DH spec yet; resume design discussion first unless the user explicitly approves an independent Workstream A item.

## Cross-Repo MyCasesKit Research

Primary documents:

- `docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md`
- `docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md`

An external MyCasesKit discussion result was reviewed from:

`stage0-coordinator-design.md`

It is a **proposal**, not a formally approved contract. It recommends Form ③: implement the deterministic `New-Case` coordinator that the existing MyCasesKit Stage 0 architecture assumed but never built.

### Correct integrated pipeline

Integrated mode must not reduce DH to a passive importer. Target architecture:

```text
DH Extract
  → MyCases New-Case Coordinator (Stage 0 deterministic scaffold)
  → DH Automatic Initial Triage (Stage 1 analysis)
  → MyCases Deterministic Persistence
```

Form ③ replaces AI-improvised schema/file writes; it does **not** replace DH automatic analysis.

### File ownership under discussion

- `case.md`
  - Stage 0 coordinator creates source-backed facts and `status: open`.
  - Stage 1 persister applies only source-backed fact patches.
  - Lifecycle owner transitions status (normally to `investigating` after a real triage entry).

- `dh_case_report.md`
  - Immutable D365/source snapshot written/placed by Stage 0 coordinator.
  - Read-only during Stage 1+.

- `troubleshooting.md`
  - Canonical evolving investigation record.
  - Stage 1 persistence creates/appends initial assessment.

- `context.md`
  - Stage 0 skeleton.
  - Hook/runtime owns `session_name` and likely `last_agent`.
  - Stage 1 persistence updates concise summary/findings/questions/tasks/next steps.

- `root-cause.md`
  - Not created during normal Stage 1 triage; Stage 3 only when evidence supports RCA.

### Proposed structured analysis output

DH analysis should return a proposal rather than freely editing canonical files:

```text
case_fact_patch
troubleshooting_entry
context_patch
requested_status_transition
```

A MyCases-owned persistence layer validates/idempotently writes these outputs.

## Contracts Required from MyCasesKit Before DH Integrated Implementation

DH integrated orchestration must not guess these interfaces:

1. Formal accept/reject of Form ③.
2. Workspace marker/manifest/canary schema.
3. Versioned `Stage0Envelope` fixture/schema.
4. `New-Case` coordinator command/API and response fixture.
5. Existing-case/idempotency policy.
6. Product fallback and 19-digit task normalization.
7. Canonical Stage 0 files/provenance/report/attachment contract.
8. Stage 1 analysis-proposal schema.
9. Deterministic Stage 1 persistence API and response fixture.
10. Lifecycle transition ownership.
11. Session metadata ownership.
12. Error taxonomy/version negotiation.
13. Legacy workspace migration policy.

## DH Conditional Work Plan

### Workstream A — independent cleanup

May proceed only after explicit user approval/design:

- remove workspace instruction double injection;
- fix Custom User Instructions empty clear;
- clarify DH Core / DH-specific Instructions / Custom User Prompt scopes;
- correct Repository ONLY documentation;
- add instruction-discovery E2E coverage.

### Workstream B — MyCasesKit contracts

Owned by the MyCasesKit design/implementation session; see required contracts above.

### Workstream C — integrated DH implementation

Blocked until Workstream B contracts are approved:

- `Auto / Standalone / MyCases-integrated` preference;
- strong workspace health detection;
- pure `Stage0Envelope` builder;
- coordinator adapter;
- mode-specific prompt assembly;
- automatic Stage 1 triage;
- structured analysis parser;
- persistence adapter;
- clear UI status for initialization/analysis/persistence outcomes;
- standalone/integrated report behavior;
- cross-repo contract/E2E tests.

### Workstream D — migration

- manually classify existing DH instruction prose into DH-specific / MyCases / global buckets;
- migrate/repair legacy MyCases workspace before trusting Auto mode;
- remove legacy MyCases `session_id` templates/agents only under MyCasesKit migration policy;
- preserve shared UUIDv5 identity.

## Current Decision State

- No production code has been changed for prompt-scope or MyCases integration refactoring.
- Research docs are committed and pushed.
- Form ③ remains a proposal pending explicit MyCasesKit acceptance.
- Stage 1 persistence is a newly identified required contract, not yet designed/implemented.
- The next substantive step should occur in MyCasesKit: return approved contract artifacts listed above.
- After those artifacts return, create an approved DH design spec before implementation.

## Release Discipline

- Latest release is beta.4; do not publish stable `v2.0.74` without explicit approval.
- Do not run release helper with `--publish` without explicit user confirmation.
- Prefer a beta release for any prompt/integration architecture change.
- User preference in this development line: do not push feature code until smoke passes, unless the user explicitly asks to push.

## Local-Only State That Does Not Transfer Through Git

- Native Messaging registry mode (DEV/PROD).
- `%LOCALAPPDATA%\DynamicsHelper\config.json` and instruction/prompt files.
- Chrome extension storage (`dh_prefs`, model cache, bookmarks).
- Copilot CLI auth/settings/session-state.
- MyCases workspace and its legacy/partial migration state.

Reconfigure and inspect these on the remote VM instead of assuming they match the source machine.

## Remote VM New-Session Prompt

Copy the following into a new development session after pulling the repository:

```text
我们在远程 Windows VM 上继续 Dynamics Helper 开发。请先不要修改代码。

1. 读取并遵守仓库根目录 AGENTS.md。
2. 读取 docs/session-handoff-2026-07-15.md，作为本次会话的唯一进度来源；不要依赖旧聊天记忆。
3. 读取：
   - docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md
   - docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md
4. 运行并报告：git status --short、当前分支、origin/master...HEAD ahead/behind、最近 8 个提交、当前版本字段。
5. 检查 VM 本地前置条件：host/venv、Copilot CLI 版本/认证、python dev_switch.py status。不要假设源机器的 DEV/PROD 注册表、AppData 配置、Chrome storage、Copilot session 或 MyCases workspace 会随 Git 迁移。

当前代码基线：v2.0.74-beta.4 已发布。最新核心修复是 0b0bb66（Copilot session 绑定 Root Path）；Host 基线 109 tests，Extension 43 tests。最新研究提交是 3241656。

当前设计主题：重构 DH 的 prompt scope，并设计 Standalone / MyCases-integrated 两种模式。已确认 Root .github/copilot-instructions.md 当前被 DH 手工注入一次、Copilot CLI 自动发现一次，存在结构性重复。DH 的 Custom User Instructions 实际是 system-role、DH-wide；Custom User Prompt 是每次 Analyze 的 user-role。

Integrated 目标不是取消 DH 自动分析。目标流水线是：
DH Extract → MyCases New-Case（Stage 0 deterministic scaffold）→ DH Automatic Initial Triage（Stage 1）→ MyCases Deterministic Persistence。

MyCasesKit 的 stage0-coordinator-design.md 目前只是 Proposal，推荐 Form ③ New-Case coordinator，尚未形成正式跨仓库契约。DH integrated 实现必须等待 MyCasesKit 返回：workspace marker/canaries、Stage0Envelope、coordinator API、Stage 1 persistence API、幂等规则、生命周期/会话字段 ownership、错误分类和 legacy migration policy。

在正式契约返回前，不要猜测 MyCases 接口，不要让 DH 直接写 MyCases canonical 文件。可独立讨论但仍需用户批准的 Workstream A：移除 workspace instruction 双重注入、修复 Custom User Instructions 空字符串无法清除、重新命名/说明 DH-specific Instructions 与 Custom User Prompt 的作用域、修正 Repository ONLY 文档。

请先简要总结你读取到的状态与 VM 环境差异，再根据我提供的 MyCasesKit 最新讨论结果继续 brainstorming/design。任何实现前先形成并批准 DH spec。不要未经明确批准 push 或 publish；任何 release --publish 都必须再次获得我的明确确认。
```
