# Remote VM Development Handoff — 2026-07-15

## Purpose

This file is the durable continuation point for moving Dynamics Helper development to a remote Windows VM. Read it before making changes; do not rely on prior chat context.

## Repository State

- Repository: `boatmac/Dynamics-Helper`
- Prompt-scope implementation branch: `docs/prompt-scope-cleanup-design`
- Isolated worktree: `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-prompt-scope-spec`
- Product implementation Tasks 1-6: approved through `0f57f8e`
- Task 7 documentation: complete at `ca65519` plus this `docs(prompt): correct Task 7 review findings` follow-up
- Task 8 final verification/evidence and release draft: pending
- Accepted prompt-scope spec: `441d0db` (`docs(spec): define deterministic DH prompt scopes`)
- Accepted implementation plan: `21108d9` (`docs(plan): add DH prompt scope implementation plan`)
- Source version: `2.0.74-beta.4`
- Historical published baseline: `v2.0.74-beta.4`
- Release URL: <https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.74-beta.4>
- Release asset: `DynamicsHelper_v2.0.74-beta.4.zip`
- Historical local-machine Native Messaging registry mode at the original handoff: **DEV** (machine-local state; it does not transfer through Git)

Historical beta.4/research baseline before prompt-scope implementation:

```text
0040b1d docs(handoff): persist remote VM continuation state
3241656 docs(research): add integrated Stage 0/1 pipeline and DH plan
d91c92a docs(research): DH x MyCasesKit Stage 0 instructions brief
88bdd0d chore: release v2.0.74-beta.4
0b0bb66 fix(session): bind Copilot sessions to configured workspace root
c5e282e chore: release v2.0.74-beta.3
```

Prompt-scope implementation commits after the accepted spec/plan:

```text
e6e3155 feat(prompt): add deterministic prompt source resolver
2601663 feat(session): isolate and refresh prompt sources
abc9d1f fix(session): repair prompt lifecycle transitions
ef257ec fix(session): invalidate exited active sessions
2428172 fix(config): surface prompt source health and clears
6da6120 fix(config): harden partial update failures
8d9561a fix(config): invalidate attempted durable writes
527851b feat(extension): preserve prompt source errors
916c4b6 feat(options): expose deterministic prompt source mode
55decd3 fix(options): hydrate skills by effective prompt mode
eacda76 fix(options): preserve skills across mode edits
6fdd22e fix(options): inspect prompt config persistence
378fffd fix(options): serialize config update intents
11cbed3 fix(options): order config mirror side effects
0f57f8e fix(options): guard passive hydration mirrors
```

These commits do not change version fields, release tags, `host/system_prompt.md`, UUIDv5 identity, or MyCasesKit. They have not implemented MyCases integration. Task 7 is complete; Task 8 remains pending. Inspect `git status --short --branch`, `git rev-parse HEAD`, and `git log --oneline` rather than assuming an ahead/behind count from this document.

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

Historical beta.4 behavior at release:

- Config loads before `CopilotClient` construction.
- Client, `create_session`, and `resume_session` receive the same explicit `working_directory`.
- Root changes restart the CLI client.
- Startup initializes only the client; it does not create a generic session.
- Options updates preserve deterministic UUIDv5 case-session identity.
- Desired config root, client process root, and active-session root are tracked separately.
- Empty/missing Analyze `rootPath` falls back to canonical Host config (protects the extension pre-hydration window).
- Runtime Root overrides drove cwd, Skills, MCP, and the then-current workspace-instruction behavior consistently.
- Relative roots are rejected.
- Corrupt config fails closed instead of silently persisting Host cwd.
- Refresh/retry/broken-pipe/timeout failure paths invalidate stale state.
- Reports print a root-bound command:

```powershell
copilot -C '<root>' --resume=<uuid>
```

At the beta.4 baseline, this applied the Root before CLI workspace discovery and overrode stale cwd metadata from old sessions. Current DH SDK instruction selection is the explicit, discovery-disabled architecture documented below; the report command still establishes the correct Root for interactive CLI continuation.

## Historical Verification Baseline

The following is historical evidence for the published beta.4 workspace-root session fix, not final verification of the prompt-scope implementation:

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

Durable implementation evidence is the accepted spec `441d0db`, plan `21108d9`, Host range `e6e3155..8d9561a`, Extension error commit `527851b`, Options range `916c4b6..0f57f8e`, and Task 7 documentation commits `ca65519` plus `docs(prompt): correct Task 7 review findings`. Do not turn task-level historical counts into a final release claim. Task 8 owns a fresh complete Host/Extension/build/static gate, any authenticated smoke evidence, final totals, and the release-notes draft.

## Session Identity Contract

- Case session ID is deterministic UUIDv5 derived from the bare 16-digit case number.
- Namespace: `816bee4e-8eee-4c0b-ae69-70879d032f4d`.
- DH and MyCasesKit must compute the identical value; do not add a salt or change input format.
- Golden example is locked in `host/test_case_id.py`.
- SDK/internal name: `session_id` / `current_session_id`.
- DH external/report/frontmatter contract currently calls the opaque resume handle `session_name`.
- `context.md` is not written directly by DH Host. Duplicate `session_name` + `session_id` observed in legacy MyCases files was traced to an old MyCases template/agent plus DH instructions, not the current Host response.

## Implemented Prompt Architecture

The accepted 2026-07-15 design replaces the older mixed/manual-plus-automatic proposal with deterministic DH-owned selection:

1. Every DH SDK `create_session` and `resume_session` path sets `skip_custom_instructions=True`.
   - CLI-global `~/.copilot/copilot-instructions.md`, Root/ancestor `AGENTS.md`, path-specific instructions, agent files, and other CLI automatic custom-instruction sources do not enter DH sessions.
2. DH always injects product-managed **DH Core System Prompt** as system content.
3. DH injects exactly one editable system source:
   - Root empty, regardless of stored Repository ONLY: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (**DH-specific Instructions**).
   - Root non-empty and Repository ONLY off: DH-specific Instructions.
   - Root non-empty and Repository ONLY on: only `<Root>/.github/copilot-instructions.md` (**Repository Instructions**).
4. **Custom User Prompt** remains PII-scrubbed user content on every Analyze and is never moved into system content.
5. Session Info remains the final DH system section and carries the unchanged deterministic UUIDv5 session name.

Only the Root-level `.github/copilot-instructions.md` is supported. DH-specific and Repository Instructions never coexist. DH Core and Custom User Prompt remain active in Repository ONLY mode.

Each Analyze resolves exact Core and selected-source bytes once, decodes strict UTF-8, and uses one frozen `PromptSnapshot` for text assembly and a versioned, length-framed SHA-256 fingerprint. A source-mode or byte change refreshes the same UUIDv5 session. Failed source resolution/refresh sends no model turn and clears stale session/fingerprint state; all active-session invalidation clears `current_prompt_fingerprint`.

Source failures are fail-closed. Missing DH-specific Instructions is valid empty content; an existing empty Repository Instructions file is also valid. Missing/unreadable Core, unreadable selected DH-specific content, or missing/unreadable selected Repository content blocks Analyze without fallback. `get_config` exposes soft `prompt_source_status` so Options remains usable for repair.

Options now distinguishes omitted and explicit-empty instruction writes, inspects structured `update_config` results including `config_saved`, and preserves optional prompt `error_code` through Service Worker persistence/hydration. Known prompt-source codes are localized only at immediate/rehydrated display time; raw safe Host fallback text remains stored for unknown codes.

### Existing Preference Migration

No instruction prose is moved or repartitioned. Existing files and internal preference keys remain in place. Existing `use_workspace_only=true` immediately selects Root Repository Instructions when Root is non-empty. A Root without `.github/copilot-instructions.md` therefore blocks Analyze until the file is added or Repository ONLY is disabled.

The July 14 recommendation to remove DH's manual append and rely on CLI automatic workspace discovery is superseded. The accepted implementation instead disables all CLI custom-instruction discovery and explicitly injects the one selected Root file. The July 14 Stage 0/1 contract research remains research and is not altered by this prompt foundation.

## MyCasesKit Response State

Primary documents:

- `docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md`
- `docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md`

The two July 14 documents above remain historical research. The latest
user-provided MyCasesKit response is external commit `675006a`.

Accepted decisions in that response:

- Form ③, a deterministic `New-Case` coordinator, is accepted.
- The Stage 1 deterministic persistence gate model is accepted: DH/LLM produces
  a structured analysis proposal and a MyCases-owned deterministic gate
  validates and writes canonical state.
- A 19-digit collaboration task folds to its 16-digit main case. The
  coordinator owns normalization, records `collaboration_task[]`, and creates
  the main-case folder with `origin: collaboration-task` when needed.
- `session_name` is creator-written at initialization and read-only to the AI
  model during the session. DH continues to compute and provide the same
  deterministic UUIDv5 handle; when the coordinator initializes canonical
  files, the coordinator is the canonical writer.

Artifacts and freeze status:

- Five shared JSON fixtures plus a README exist as build/test examples.
- They are not proof that every interface is formally frozen; the README still
  labels six items tentative.
- Coordinator invocation and the error enum must freeze before DH implements a
  coordinator adapter.
- Required/optional/null semantics, field limits, and `session_name` envelope
  transport remain gaps for a separate **Contract Primitives** spec.
- No DH MyCases integration code has been implemented.

### Accepted Integrated Direction (Not Implemented)

Integrated mode must not reduce DH to a passive importer. Target architecture:

```text
DH Extract
  → MyCases New-Case Coordinator (Stage 0 deterministic scaffold)
  → DH Automatic Initial Triage (Stage 1 analysis)
  → MyCases Deterministic Persistence
```

Form ③ replaces AI-improvised schema/file writes; it does **not** replace DH automatic analysis.

### File Ownership Direction

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
  - The creator writes deterministic `session_name` at initialization; the AI
    model treats it as read-only mid-session. In a coordinator-created case,
    the coordinator is the canonical file writer while DH supplies the same
    UUIDv5 handle.
  - Stage 1 persistence updates concise summary/findings/questions/tasks/next steps.

- `root-cause.md`
  - Not created during normal Stage 1 triage; Stage 3 only when evidence supports RCA.

### Accepted Stage 1 Gate Direction

DH analysis should return a proposal rather than freely editing canonical files:

```text
case_fact_patch
troubleshooting_entry
context_patch
requested_status_transition
```

A MyCases-owned deterministic persistence gate validates/idempotently writes
these outputs. Exact field semantics remain subject to the Contract Primitives
spec.

## Contract Primitives Required Before DH Integrated Implementation

The accepted architecture does not make every fixture or interface frozen. DH
must not build the coordinator adapter until a separate Contract Primitives spec
resolves at least:

1. The coordinator invocation mechanism and request/response boundary.
2. The frozen error enum, version negotiation, and retryability semantics.
3. Required, optional, and nullable fields plus size/value limits.
4. How `session_name` is transported in the envelope while preserving creator
   write ownership and the shared UUIDv5 contract.
5. Which of the README's six tentative items become normative.

The five shared fixtures and README should be consumed as examples for building
and testing that spec, not treated as a complete frozen adapter API.

## DH Conditional Work Plan

### Workstream A — independent cleanup

Implemented under accepted spec `441d0db` and plan `21108d9`, through product commit `0f57f8e`:

- disabled CLI automatic custom-instruction discovery for all DH create/resume paths;
- explicitly selected DH Core plus exactly one editable source;
- fixed explicit-empty DH-specific instruction clearing;
- exposed prompt-source health/errors and deterministic refresh fingerprints;
- renamed/documented DH-specific Instructions and expanded Repository ONLY semantics;
- added Host/Extension invariant coverage and inspected Options persistence.

Task 8 still owns final whole-branch verification and any authenticated SDK smoke; do not infer final release evidence from the task-level reports.

### Workstream B — MyCasesKit contracts

MyCasesKit response `675006a` accepted Form ③ and the Stage 1 persistence-gate
model. The remaining work is the separate Contract Primitives spec described
above; fixture existence alone does not unblock a DH coordinator adapter.

### Workstream C — integrated DH implementation

Blocked until the Contract Primitives spec freezes the adapter boundary:

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

- Prompt-scope production implementation Tasks 1-6 is approved on `docs/prompt-scope-cleanup-design` through `0f57f8e`.
- Accepted design and plan are `441d0db` and `21108d9`.
- Task 7 documentation is complete at `ca65519` plus `docs(prompt): correct Task 7 review findings`; Task 8 owns final verification evidence and the release draft.
- No MyCases integration code, mode preference, workspace detector, coordinator adapter, persistence adapter, or MyCases canonical-file write has been implemented.
- MyCasesKit response `675006a` accepts Form ③ and the Stage 1 deterministic persistence-gate model.
- Five shared JSON fixtures and a README exist as examples, but six README items remain tentative; not every interface is frozen.
- A separate DH Contract Primitives spec remains pending before any coordinator adapter or integration implementation.

## Release Discipline

- Historical published baseline for this development line is beta.4; do not publish stable `v2.0.74` without explicit approval.
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

Use the following for continuation; update the exact HEAD and status from Git rather than treating embedded counts as current:

```text
我们在远程 Windows VM 上继续 Dynamics Helper 的 prompt-scope cleanup。请先不要修改代码。

1. 读取并遵守仓库根目录 AGENTS.md。
2. 读取 docs/session-handoff-2026-07-15.md，作为本次会话的唯一进度来源；不要依赖旧聊天记忆。
3. 读取：
   - docs/superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md
   - docs/superpowers/plans/2026-07-15-dh-prompt-scope-cleanup.md
   - docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md
   - docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md
4. 运行并报告：git status --short、当前分支、origin/master...HEAD ahead/behind、最近 8 个提交、当前版本字段。
5. 检查 VM 本地前置条件：host/venv、Copilot CLI 版本/认证、python dev_switch.py status。不要假设源机器的 DEV/PROD 注册表、AppData 配置、Chrome storage、Copilot session 或 MyCases workspace 会随 Git 迁移。

历史发布基线是 v2.0.74-beta.4；其中 Host 109、Extension 43 和 build 通过仅是 beta.4 workspace-root 修复的历史证据，不是 prompt-scope 最终总数。prompt-scope 分支是 docs/prompt-scope-cleanup-design，已接受 spec 441d0db、plan 21108d9，产品 Tasks 1-6 已批准到 0f57f8e，Task 7 文档已完成。Task 8 才负责完整最终验证、真实 smoke 证据和 release draft；不要提前声称最终 totals。

已实现行为：所有 DH create/resume 都设置 skip_custom_instructions=True；CLI global、AGENTS、path instructions 等自动发现源全部排除。DH 显式注入 Core + 恰好一个可编辑源：Root 为空或 Repository ONLY 关闭时使用 DH-specific Instructions；Root 非空且 Repository ONLY 开启时只使用 <Root>/.github/copilot-instructions.md。Custom User Prompt 仍是每次 Analyze 的 PII-scrubbed user content。使用严格 UTF-8 immutable byte snapshot、framed fingerprint、same-UUID refresh 和 fail-closed errors。Options 区分 explicit empty（清空文件）与 omitted（不写），检查 update_config/config_saved，并保留可选 errorCode 到持久化和本地化显示。

Integrated 目标不是取消 DH 自动分析。目标流水线是：
DH Extract → MyCases New-Case（Stage 0 deterministic scaffold）→ DH Automatic Initial Triage（Stage 1）→ MyCases Deterministic Persistence。

MyCasesKit response commit 675006a 已接受 Form ③ New-Case coordinator 和 Stage 1 deterministic persistence gate。19 位 collaboration task 归一到 16 位 main case，由 coordinator 记录 collaboration_task[]，必要时以 origin: collaboration-task 创建主 case 目录。session_name 由 creator 在初始化时写入，AI model 在 session 中只读；DH 继续计算并提供相同 UUIDv5，coordinator 是 canonical file writer。已有 5 个共享 JSON fixtures 和 README 作为 build/test examples，但 README 仍标记 6 项 tentative，不能声称所有接口已冻结。当前没有实现任何 MyCases integration；在 coordinator invocation、error enum、required/optional/null/limits、session_name envelope transport 由独立 Contract Primitives spec 冻结前，不实现 coordinator adapter。

2026-07-14 research 中“依赖 CLI 自动 workspace instruction discovery”的建议已被 2026-07-15 accepted spec supersede；不要恢复该方案。在正式 MyCases 契约返回前，不要猜测 MyCases 接口，也不要让 DH 直接写 MyCases canonical 文件。

请先简要总结你读取到的状态与 VM 环境差异，再按当前 Task brief 继续。不要未经明确批准 push 或 publish；任何 release --publish 都必须再次获得我的明确确认。
```
