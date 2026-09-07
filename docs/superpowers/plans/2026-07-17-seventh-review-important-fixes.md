# Seventh Review Important Fixes Implementation Plan

> **Execution note:** No workflow plugin is required. Execute only currently authorized scope in bounded steps, with observable progress and scope-appropriate verification. Historical checkboxes do not authorize work; read `AGENTS.md` and the current handoff first.

**Goal:** Route hydration catch-up through durable latest-only preference persistence and make every Team Catalog storage mutation report callback-scoped Chrome failures truthfully.

**Architecture:** Options will represent catch-up as an immutable mirror intent whose `onLatestCommit` sends the suppressed-warning Host update only after the newest `dh_prefs` snapshot commits. Team Catalog storage wrappers will reject on callback-scoped `runtime.lastError`; sync/request boundaries will distinguish mutation failure from stale identity and return safe failed responses while the serialized queue remains recoverable.

**Tech Stack:** React 19, TypeScript 5.9, Chrome Manifest V3 storage APIs, Vitest 3, Testing Library, Python 3.13 `unittest`, Vite 7.

## Global Constraints

- Work only in `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-prompt-scope-spec` from `540283edcd03b64189a64368fe8fe984622e2033`.
- Do not push, tag, publish, version, package, change registry state, access real `%LOCALAPPDATA%\DynamicsHelper`, or touch MyCases.
- Every Host process must use isolated `LOCALAPPDATA`, `TEMP`, and `TMP`; focused Host also uses `PYTHONPATH=host`.
- Preserve all prior PS/PF/UI invariants, races, actions, response identities, and logging secrecy.
- Record initial RED failures and one restored break proof per finding.

---

### Task 1: Durable Hydration Catch-Up

**Files:**
- Modify: `extension/src/components/Options.test.tsx`
- Modify: `extension/src/components/Options.tsx`

**Interfaces:**
- Consumes: `createIntent(nextPrefs)`, `createPrefsMirrorIntent(...)`, and `writePrefsMirror(intent)`.
- Produces: a frozen catch-up mirror whose `onLatestCommit` calls `sendHostConfigUpdate(configIntent, { suppressTransportWarning: true })`.

- [ ] **Step 1: Write failing queue-order tests**

Add tests that defer the passive hydration mirror and then the catch-up mirror.
Reject the catch-up mirror and assert zero `update_config`; trigger a later edit
and assert exactly one latest payload. In a second test, keep catch-up storage
pending, make a newer edit, release both writes, and assert only the newer
payload is sent.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm run test:run -- src/components/Options.test.tsx --reporter=dot
```

Expected: direct catch-up sends before the deferred/failing mirror and violates
the zero/latest-only assertions.

- [ ] **Step 3: Implement the minimal queue routing**

Rename the mirror callback to `onLatestCommit`. In the catch-up effect, capture
the config intent, create a mirror for its frozen prefs, and enqueue it. Put the
suppressed-warning Host send only in `onLatestCommit`, guarded by the current
config generation.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Task 1 command and require all Options tests to pass.

---

### Task 2: Team Storage `lastError` and Recovery

**Files:**
- Modify: `extension/src/test/chromeMock.ts`
- Modify: `extension/src/utils/teamCatalog.test.ts`
- Modify: `extension/src/utils/teamCatalog.ts`
- Modify: `extension/src/background/teamManifestSync.test.ts`
- Modify: `extension/src/background/teamManifestSync.ts`
- Modify: `extension/src/background/resetExtensionState.test.ts`

**Interfaces:**
- Produces: `setStorage`/`removeStorage` Promises that reject on callback-scoped `chrome.runtime.lastError`.
- Produces: safe `syncStatus: 'failed'` responses for mutation failures, with no selected items or timestamp.
- Consumes: the existing rejection-safe `queueTeamMutation` chain and Reset catch boundary.

- [ ] **Step 1: Extend the Chrome mock and add failing storage tests**

Make deferred `storage.remove` rejection expose `runtime.lastError` only during
its callback, matching deferred `storage.set`. Add actual Team Catalog tests for
manifest set, changed bookmark set, 304 timestamp set, selection remove, full
remove, and a successful operation after each failed queued mutation.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm run test:run -- src/utils/teamCatalog.test.ts src/background/teamManifestSync.test.ts src/background/resetExtensionState.test.ts --reporter=dot
```

Expected: mutation wrappers resolve despite `lastError`, failed writes report
committed/unchanged, and failed removes report successful clear/reset.

- [ ] **Step 3: Implement rejection and failed response propagation**

Read `runtime.lastError` inside each storage callback and reject with a fixed
Error. Catch set rejection at manifest-only and selected-sync boundaries,
returning failed identity-safe results. Catch clear rejection at the Team
Catalog request boundary. Omit selected items and timestamps for failed/stale
responses. Do not catch inside the shared queue in a way that converts failure
to success; its existing rejection continuation must keep future work usable.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Task 2 command and require all focused tests to pass.

---

### Task 3: Documentation, Break Proofs, and Verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `docs/session-handoff-2026-07-15.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Create: `.superpowers/sdd/seventh-final-review-fix-report.md`

**Interfaces:**
- Produces: current behavior, head, exact test/build totals, constraints, and remaining broad-review status.

- [ ] **Step 1: Run restored break proofs**

Temporarily bypass the catch-up queue and run the named durability test; restore
it after observing failure. Temporarily ignore storage `lastError` in one
wrapper and run the named mutation test; restore it after observing failure.

- [ ] **Step 2: Update governing documentation**

Document catch-up as a queued immutable mirror and Team Catalog callback errors
as failed mutations. Update handoff/release draft with seventh-wave commits,
totals, exact final head/ahead count, skipped optional smoke, and broad review
still pending.

- [ ] **Step 3: Run final isolated gates**

Run focused and full Host tests in fresh isolated roots, focused and full
Extension tests, production build, source-only compileall excluding `host/venv`,
`git diff --check`, generated-output checks, version checks, and targeted static
scans.

- [ ] **Step 4: Commit product and evidence**

Create separate product/test/docs and verification-report commits. Do not push,
tag, publish, package, version, or alter registry/AppData/MyCases state.
