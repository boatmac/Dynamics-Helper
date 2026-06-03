# Analysis Result Persistence — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md`
**Status:** Draft

## Task ordering (TDD-first per AGENTS.md)

Tests come before implementation for each invariant per the 6-invariant model used by Options.tsx (see AGENTS.md "Adding New Tests for Options.tsx"). Break-and-fail verification required for each.

### Task 0: Storage helper module

Create `extension/src/utils/analysisStore.ts` — a typed wrapper around `chrome.storage.local` for the two new keys. Exports:

- `getLastAnalysis(): Promise<LastAnalysis | null>`
- `setLastAnalysis(value: LastAnalysis): Promise<void>`
- `markSeen(): Promise<void>` — sets `seen=true` on whatever is currently in storage
- `getPendingAnalysis(): Promise<PendingAnalysis | null>`
- `setPendingAnalysis(value: PendingAnalysis): Promise<void>`
- `clearPendingAnalysis(): Promise<void>`
- `clearStalePending(): Promise<void>` — deletes if startTime > 2h ago
- `STALE_WINDOW_MS`, `MAX_PENDING_AGE_MS` constants

Acceptance: type exports compile, no UI code changed yet.

### Task 1: Tests for SW write paths (P-I1..P-I4)

New file: `extension/src/background/serviceWorker.analysisPersistence.test.ts`

Each test mocks `chrome.runtime.connectNative` (Port) and `chrome.storage.local`. Asserts the storage-write sequence around `NATIVE_MSG` action='analyze_error'.

| Test | Invariant | What it asserts |
|---|---|---|
| 1 | P-I1 | `setPendingAnalysis` called with correct shape BEFORE `nativePort.postMessage` |
| 2 | P-I2 | On success response, `setLastAnalysis(status='success')` + `clearPendingAnalysis()` called |
| 3 | P-I3 | On `{status: 'error', error: 'msg'}` response, `setLastAnalysis(status='error', content='msg')` + clear pending |
| 4 | P-I4 | When `nativePort.postMessage` throws, `setLastAnalysis(status='error')` + clear pending |
| 5 | edge 6.3 | Late response for old requestId does NOT clear newer pending |

Run, expect to fail (no production code yet).

### Task 2: Implement SW write paths

Modify `extension/src/background/serviceWorker.ts` `chrome.runtime.onMessage` handler:

```ts
if (message.type === "NATIVE_MSG") {
    const payload = message.payload;
    const isAnalyze = payload?.action === 'analyze_error';
    const caseNumber = payload?.payload?.caseNumber;
    const requestId = payload?.requestId;

    if (isAnalyze && caseNumber) {
        setPendingAnalysis({ caseNumber, requestId, startTime: Date.now() });
    }

    sendNativeMessage(payload)
        .then(async response => {
            if (isAnalyze && caseNumber) {
                await writeAnalysisResult(response, caseNumber, requestId);
            }
            sendResponse(response);
        })
        .catch(async error => {
            if (isAnalyze && caseNumber) {
                await setLastAnalysis({
                    caseNumber, status: 'error',
                    title: 'Analysis Failed',
                    content: error.message,
                    timestamp: Date.now(),
                    seen: false,
                });
                await clearPendingIfMatches(requestId);
            }
            sendResponse({ status: "error", error: error.message });
        });
    return true;
}
```

Run tests, expect P-I1..P-I4 to pass.

**Break-and-fail verification:** remove the `setPendingAnalysis` call → test 1 fails. Remove `clearPendingAnalysis` → test 2 fails. Confirm each test catches the regression. Revert.

### Task 3: Tests for FAB re-hydration (R-I1..R-I5)

New file: `extension/src/components/FAB.analysisRehydration.test.tsx`

Uses chromeMock to seed `dh_last_analysis` / `dh_pending_analysis`, mounts FAB, asserts popover state.

| Test | Invariant | What it asserts |
|---|---|---|
| 1 | R-I1 | Mount with matching unseen result → popover renders open |
| 2 | R-I2 | Closing popover writes `seen: true`; next mount on same case → popover stays closed |
| 3 | R-I3 | Mount with non-matching `caseNumber` → popover stays closed |
| 4 | R-I4 | Mount with `timestamp` older than `STALE_WINDOW_MS` → popover stays closed |
| 5 | R-I5 | Mount with matching pending → `isAnalyzing` state is true (spinner visible) |

Run, expect to fail.

### Task 4: Implement FAB re-hydration

In `FAB.tsx`:

1. Add a `useEffect` triggered on `targetData.caseNumber` change that:
   - Calls `getLastAnalysis()`, checks the 3 conditions (match, unseen, fresh), if all true opens popover with stored content.
   - Calls `getPendingAnalysis()`, if matches case sets `setIsAnalyzing(true)`.
2. Wire `ResultPopover.onClose` to call `markSeen()` before `setResultPopover({isOpen: false})`.
3. Replace the 4 error-display sites in `handleAnalyzeClick` to also open `ResultPopover` with error styling (covered as part of in-flight UX, not strictly re-hydration, but same code path).

Run tests, expect R-I1..R-I5 to pass.

**Break-and-fail verification:** Remove the `getLastAnalysis()` call → test 1 fails. Skip the `markSeen()` → test 2 fails. Skip the case-match check → test 3 fails. Skip the timestamp check → test 4 fails. Skip the `getPendingAnalysis()` → test 5 fails. Revert.

### Task 5: Replace error UX with popover

The existing 5 error code paths in `FAB.tsx handleAnalyzeClick` (lines ~709, 814, 820, 826, 830) currently `setErrorMsg + showStatusBubble`. Each gets an additional `setResultPopover({isOpen: true, title: '❌ ' + t('analysisFailed'), content: errorMessage})`.

Add helper at top of component:

```ts
const showAnalyzeError = (msg: string) => {
    setResultPopover({
        isOpen: true,
        title: `❌ ${t('analysisFailed')}`,
        content: msg,
    });
};
```

Replace each error path:

```ts
// before
setErrorMsg(`Host Error: ${hostError}`);
showStatusBubble(t('analysisFailed'), 'error', 4000);

// after
showAnalyzeError(`Host Error: ${hostError}`);
showStatusBubble(t('analysisFailed'), 'error', 4000);  // brief flash kept for visual signal
```

Leave `errorMsg` state in place for now (separate dead-code cleanup follow-up).

Manual smoke: trigger a fake host error by killing the native host process mid-analyze. Confirm popover opens with the error text. Close it. Reload page. Confirm popover re-opens (re-hydration). Close. Reload again. Confirm popover does NOT re-open (`seen: true` persisted).

### Task 6: Build + full test run

```pwsh
cd extension && npm run test:run; if ($LASTEXITCODE -eq 0) { npm run build }
```

Expect 35+ tests pass (26 existing + 5 SW + 5 FAB = 36).

Manual smoke:
1. Reload extension at `chrome://extensions` pointing at `extension/dist`.
2. Trigger an analysis on a real case page.
3. Switch to another tab during analysis, switch back → popover should appear.
4. Reload the case page → popover should re-appear (not yet dismissed).
5. Dismiss popover, reload again → popover should NOT appear.
6. Wait an hour, reload → popover should NOT appear (stale).

### Task 7: Documentation

Update:
- `DEVELOPER_GUIDE.md` — new section "Analysis result persistence (v2.0.71+)" with the storage schema and read/write flow.
- `AGENTS.md` — extension test count update (36+), brief mention of analysisStore.ts under "Critical patterns".
- Spec → mark Status: Implemented.

### Task 8: Commit + version bump

Single commit per task, conventional commits. Final commits:
1. `feat(extension): add analysisStore utility for chrome.storage.local persistence`
2. `test(sw): cover P-I1..P-I5 storage write paths for analyze flow`
3. `feat(sw): persist analyze pending/result to chrome.storage.local`
4. `test(fab): cover R-I1..R-I5 result re-hydration on mount and case change`
5. `feat(fab): re-hydrate analysis result/pending state on mount`
6. `refactor(fab): route analyze errors through ResultPopover for persistent display`
7. `docs: analysis result persistence (DEVELOPER_GUIDE + AGENTS + spec close)`
8. `chore: bump version to 2.0.71-beta.1`

Followed by a release once user smoke-tests on the case page.

## Risk register

| Risk | Mitigation |
|---|---|
| SW message handler signature change breaks existing callers | All current callers send `{type: 'NATIVE_MSG', payload: ...}`. We don't change that surface; only add storage hooks for `action === 'analyze_error'`. |
| chrome.storage.local quota exhaustion | <1% per result; non-issue. Worst-case: write rejection logged + popover still works in-flight. |
| Race: SW writes `dh_last_analysis` after another SW already cleared it (rare cross-SW restart) | Single-SW guarantee in Chrome MV3 — only one SW per extension. No race. |
| Stale `dh_pending_analysis` blocks spinner forever | GC pass on every successful write (delete if older than 2h). Plus mount-time freshness check (ignore pending older than 15 min). |
| `seen` flag accidentally set true by background read | Read path never writes `seen`; only the explicit `onClose` handler writes. Audited in Task 4. |

## Estimated effort

- Tasks 1-2 (SW write paths + tests): 45 min
- Tasks 3-4 (FAB re-hydration + tests): 60 min
- Task 5 (error UX): 15 min
- Tasks 6-8 (build/test/docs/commit/version): 30 min
- **Total: ~2.5 hours focused**

## Out of scope, generated follow-ups for next session

1. Cross-tab live updates via `chrome.storage.onChanged` listener in FAB
2. Multi-case result history (schema change)
3. Desktop notifications via `chrome.notifications`
4. Pending-state cross-tab visibility (rolled into C2b host health UI)
5. `errorMsg` dead-state cleanup (8 setErrorMsg writers, 0 readers)
6. `FAB.tsx` 4-second-bubble UX audit (other code paths beyond analyze that may have the same issue)
