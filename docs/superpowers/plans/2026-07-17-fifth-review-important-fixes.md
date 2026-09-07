# Fifth Review Important Fixes Implementation Plan

> **Execution note:** No workflow plugin is required. Execute only currently authorized scope in bounded steps, with observable progress and scope-appropriate verification. Historical checkboxes do not authorize work; read `AGENTS.md` and the current handoff first.

**Goal:** Fix all four Important findings from the fifth whole-branch review in one coordinated TDD wave without changing release, registry, package, AppData, or MyCases state.

**Architecture:** Host config health will expose Custom User Prompt read failures without inventing empty content, while Options will persist both editable prompt files through immutable sparse revision tokens. Ordered preference mirrors will carry typed post-commit actions across compatible newer snapshots. Options and FAB menu consumers will generation-gate asynchronous team reads, and FAB Analyze state will be derived from request-scoped local and hydrated identities.

**Tech Stack:** Python 3.13, `unittest`, React 19, TypeScript 5.9, Chrome Manifest V3, Vitest 3, Testing Library, Vite 7.

## Global Constraints

- Start from `e1fb39c0ef81fbb873e0e653f3d37661cc3300b3` in the existing linked worktree.
- Every Host process must set isolated `LOCALAPPDATA`; focused Host uses `PYTHONPATH=host`.
- Do not push, tag, publish, version, package, change registry state, access real `%LOCALAPPDATA%\DynamicsHelper`, or touch MyCases.
- Preserve all prior prompt-source, storage ownership, team identity, logging secrecy, and request-scoped persistence behavior.
- Record RED failures and temporary mutation failures before restoring the correct implementation.

---

### Task 1: Sparse Custom User Prompt Health and Persistence

**Files:**
- Modify: `host/dh_native_host.py`
- Modify: `host/test_prompt_sources.py`
- Modify: `extension/src/utils/configUpdateResult.ts`
- Modify: `extension/src/utils/configUpdateResult.test.ts`
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/utils/translations.ts`

**Interfaces:**
- Produces: modern `get_config` omission of unreadable `extension_preferences.user_prompt`, `user_prompt_unreadable` health, and sparse `ConfigUpdateIntent.prompt` revision/value tokens.
- Consumes: existing structured `update_config` acknowledgement classification and post-save health refresh.

- [ ] **Step 1: Add failing Host tests**

Add invalid-UTF-8 tests that require `prompt_source_status.error_code == "user_prompt_unreadable"`, omission of `extension_preferences.user_prompt`, byte preservation on an unrelated update, explicit replacement, explicit empty clear, and a healthy follow-up `get_config`.

- [ ] **Step 2: Run Host tests for RED**

Run:

```powershell
$env:PYTHONPATH = "host"
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources -v
```

Expected: new assertions fail because current config hydration substitutes an empty prompt and unrelated payloads always contain `user_prompt`.

- [ ] **Step 3: Implement Host presence-aware reads and writes**

Use strict UTF-8 prompt reading in the soft health projection. Populate `extension_preferences.user_prompt` only after a successful read; treat a missing file as explicit empty; report `user_prompt_unreadable` and omit the property on read/decode failure. In `handle_update_config`, use key presence so top-level explicit `""` writes an empty file, omission performs no write, and the legacy nested alias is consulted only when the top-level field is absent.

- [ ] **Step 4: Add failing Extension sparse-token tests**

Require modern omitted prompt hydration to preserve `dh_prefs.userPrompt`, legacy no-status hydration to accept its value, unrelated writes to omit both top-level and nested prompt keys, explicit edit/clear/Reset to include the immutable value, failed writes to retry, overlapping revisions to acknowledge only their own values, and successful repair health to clear the warning.

- [ ] **Step 5: Implement the prompt revision token**

Extend `ConfigUpdateIntent<T>` with an optional frozen `prompt` token. Track prompt edit and acknowledged revisions beside instruction revisions. Increment only on explicit textarea changes and Reset. Build `update_config` without any prompt field by default, adding top-level `user_prompt` only when the captured prompt token is pending; never mirror it into `config.extension_preferences`.

- [ ] **Step 6: Run focused Host and Extension tests for GREEN**

Run:

```powershell
$env:PYTHONPATH = "host"
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources -v
npm run test:run --prefix extension -- src/utils/configUpdateResult.test.ts src/components/Options.test.tsx --reporter=dot
```

Expected: all focused tests pass.

---

### Task 2: Durable Preference-Mirror Actions

**Files:**
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`

**Interfaces:**
- Produces: typed mirror actions with stable IDs, compatibility identity, carry-forward, cancellation, and once-only execution.
- Consumes: immutable `PrefsMirrorIntent` snapshots and existing Team Catalog request identities.

- [ ] **Step 1: Add failing delayed-callback tests**

Require a delayed selected-team mirror followed by an unrelated edit to dispatch one sync, a delayed Reset followed by an unrelated edit to dispatch one `RESET_EXTENSION_STATE`, an incompatible team identity to cancel the old sync, and repair recursion to execute no action twice.

- [ ] **Step 2: Run Options tests for RED**

Run:

```powershell
npm run test:run --prefix extension -- src/components/Options.test.tsx --reporter=dot
```

Expected: delayed team and Reset actions are lost by the current callback-only writer.

- [ ] **Step 3: Attach actions to immutable mirror intents**

Add `reset`, `team-sync`, and `manifest-fetch` action descriptors carrying immutable team identity and a stable action ID. When creating a newer mirror intent, carry unsettled actions whose identity still matches the newer preferences and mark incompatible actions canceled. On the latest durable callback, settle each action before dispatch so recursive repair writes cannot duplicate it. Reset carries across unrelated edits while default team identity still matches; selected-team sync carries across unrelated edits and cancels on enabled/URL/team change.

- [ ] **Step 4: Run Options tests for GREEN**

Run the Task 2 command and expect all tests to pass.

---

### Task 3: Team UI Async Load Generations

**Files:**
- Modify: `extension/src/components/Options.tsx`
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/MenuLogic.ts`
- Modify: `extension/src/components/MenuLogic.teamCache.test.ts`

**Interfaces:**
- Produces: generation/identity-gated Options team snapshots and latest-only `useMenuLogic()` loads.
- Consumes: exact `{enabled, manifestUrl, teamId}` preference identity and `teamCacheIsCurrent()`.

- [ ] **Step 1: Add failing delayed A-to-B/reset tests**

Delay an Options A cache read, switch to B or Reset, complete B, then resolve A and require B/empty list, items, and timestamp to remain. Render `useMenuLogic()`, delay its A team read, emit a B/reset storage event, and require the old result to be ignored.

- [ ] **Step 2: Run team UI tests for RED**

Run:

```powershell
npm run test:run --prefix extension -- src/components/Options.test.tsx src/components/MenuLogic.teamCache.test.ts --reporter=dot
```

Expected: delayed callbacks currently apply stale A data.

- [ ] **Step 3: Implement latest-only loads**

Centralize Options team cache reads behind a monotonically increasing UI-load generation and captured preference identity; revalidate generation plus current enabled/URL/team before every state write. Route initial identity loads and storage-change follow-up reads through that function. In `useMenuLogic`, increment a load generation for mount and every relevant storage event, ignore results after a newer load or unmount, and reset navigation only for the accepted result.

- [ ] **Step 4: Run team UI tests for GREEN**

Run the Task 3 command and expect all tests to pass.

---

### Task 4: Request-Scoped FAB Spinner and Timeout

**Files:**
- Modify: `extension/src/components/FAB.tsx`
- Modify: `extension/src/components/FAB.spinner.test.tsx`
- Modify: `extension/src/hooks/useAnalysisHydration.ts`
- Modify: `extension/src/hooks/useAnalysisHydration.test.ts`

**Interfaces:**
- Produces: local Analyze request ownership, request-keyed timer cleanup, and hydrated pending identity reconciliation.
- Consumes: `HydrationResult.pending` as `{requestId, caseNumber, startTime}` rather than boolean-only state.

- [ ] **Step 1: Add failing A/B identity tests**

Require hydrated true A to true B to update identity, hydration false to preserve an active local request, expired pending to clear, and local A stale response/finally/timeout to neither clear B nor show A timeout while B completion clears B.

- [ ] **Step 2: Run spinner/hydration tests for RED**

Run:

```powershell
npm run test:run --prefix extension -- src/components/FAB.spinner.test.tsx src/hooks/useAnalysisHydration.test.ts --reporter=dot
```

Expected: current boolean ownership and pre-request timer allow stale A callbacks to affect B, and true-to-true hydration does not refresh the FAB ref.

- [ ] **Step 3: Implement request ownership and timer identity**

Create the request ID before setting local ownership or scheduling its timeout. Store local ownership as the current request ID and timers by request ID; a new single-active request cancels the old timer. Timeout and `finally` clear ownership only when their ID still owns it, while every stale request still clears its own timer. Reconcile `isAnalyzing` from current local ownership or current hydrated pending, and depend on pending identity so A-to-B true transitions apply.

- [ ] **Step 4: Run spinner/hydration tests for GREEN**

Run the Task 4 command and expect all tests to pass.

---

### Task 5: Documentation, Mutation Proof, Verification, and Commits

**Files:**
- Modify: `docs/superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md`
- Modify: `AGENTS.md`
- Modify: `USER_GUIDE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Create: `.superpowers/sdd/fifth-final-review-fix-report.md`

**Interfaces:**
- Produces: durable fifth-wave behavior/evidence and exact committed totals.
- Consumes: all four GREEN implementations and mutation results.

- [ ] **Step 1: Perform one temporary mutation per finding**

Temporarily restore empty substitution, drop inherited mirror actions, remove team load generation checks, and remove FAB request-ID timeout checks. Run each named focused test and record its failure, then immediately restore the correct code and rerun GREEN.

- [ ] **Step 2: Update governing documentation**

Add `user_prompt_unreadable` to the accepted spec and user/developer/agent error contracts; document sparse prompt revisions, typed post-commit actions, async team UI generations, and request-scoped spinner/timers. Update handoff and release draft to the current product head while retaining broad review as pending.

- [ ] **Step 3: Run final isolated verification**

Run isolated focused Host with `PYTHONPATH=host`, isolated full Host discovery, full Extension tests, production build, isolated `compileall -q host`, TypeScript/Vite static checks through build, `git diff --check`, and targeted static scans. Keep the optional authenticated smoke skipped unless safe authenticated isolation becomes available.

- [ ] **Step 4: Commit product/tests/docs**

```powershell
git add host/dh_native_host.py host/test_prompt_sources.py extension/src/utils/configUpdateResult.ts extension/src/utils/configUpdateResult.test.ts extension/src/components/Options.tsx extension/src/components/Options.test.tsx extension/src/components/MenuLogic.ts extension/src/components/MenuLogic.teamCache.test.ts extension/src/components/FAB.tsx extension/src/components/FAB.spinner.test.tsx extension/src/hooks/useAnalysisHydration.ts extension/src/hooks/useAnalysisHydration.test.ts extension/src/utils/translations.ts docs/superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md docs/superpowers/plans/2026-07-17-fifth-review-important-fixes.md AGENTS.md USER_GUIDE.md DEVELOPER_GUIDE.md ARCHITECTURE.md docs/session-handoff-2026-07-15.md releases/notes-prompt-scope-cleanup-draft.md
git commit -m "fix(review): preserve asynchronous intent ownership"
```

- [ ] **Step 5: Write and commit evidence report**

Record finding mapping, RED/GREEN, restored mutations, exact commands/totals, product/evidence commits, constraints, and concerns in `.superpowers/sdd/fifth-final-review-fix-report.md`, update handoff/release totals if needed, then commit:

```powershell
git add .superpowers/sdd/fifth-final-review-fix-report.md docs/session-handoff-2026-07-15.md releases/notes-prompt-scope-cleanup-draft.md
git commit -m "docs(verification): record fifth review fixes"
```
