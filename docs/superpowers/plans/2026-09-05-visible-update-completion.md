# Visible Update Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acknowledge an update completion only after one real foreground completion surface has remained continuously visible for eight seconds.

**Approved Design:** `docs/superpowers/specs/2026-09-05-visible-update-completion-design.md`

**Architecture:** A shared `useVisibleCompletionAck` hook owns document/surface visibility epochs, timer cancellation, stale-callback rejection, and exact ACK transport. FAB supplies the OR of its open terminal banner and its exact transaction-bound Status bubble; Options supplies its rendered `complete` status. The Service Worker remains the only update-state/storage authority.

**Tech Stack:** React 19, TypeScript 5.9, Chrome MV3, Vitest 3, Testing Library, jsdom, PowerShell 7.

---

## Scope And Safety

- This plan implements product behavior and non-destructive product documentation only.
- Destructive qualification is out of scope. After product implementation and
  review, a smaller post-implementation qualification design/plan must be written
  from the final code and the approved visible-completion design, pending separate
  user approval. No draft qualification procedure is current authority.
- Do not modify Host transaction, rollback, finalization, installer, archive, or registration code.
- Do not add compatibility for unpublished B1's old completion shape.
- FAB and Options never read or write update storage, never interpret an ACK response, and never optimistically hide completion.
- Hidden or closed time never counts. A false visibility transition discards elapsed time rather than pausing it.
- A local Extension production build is permitted in Task 6 as verification. It is not a B2 artifact build.
- Do not change any version carrier; invoke PyInstaller, `release_helper.build_host`, `release_helper.create_zip`, or a release helper; create/package/hash/upload B2; touch Azure/cloud PCs; install; tag; push; or publish.
- Every behavior task adds its tests and observes the specified RED before changing production behavior. Every mutation below changes one externally observable invariant and must make only its named test fail.

## File Structure

- Create `extension/src/hooks/useVisibleCompletionAck.ts`: the sole visible-epoch and ACK-transport boundary.
- Create `extension/src/hooks/useVisibleCompletionAck.test.ts`: isolated epoch, race, transport, cleanup, and StrictMode tests.
- Modify `extension/src/background/serviceWorker.update.test.ts`: await cold module evaluation before condition waits.
- Modify `extension/src/components/FAB.tsx`: derive whether a real completion surface is visible and delegate to the hook.
- Modify `extension/src/components/FAB.update.test.tsx`: prove FAB menu/bubble visibility and cross-view composition.
- Modify `extension/src/components/Options.tsx`: delegate foreground completion visibility to the hook.
- Modify `extension/src/components/Options.update.test.tsx`: prove Options foreground visibility behavior.
- Modify `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `README.md`, and `USER_GUIDE.md`: replace mounted-time product claims with visible-epoch behavior.
- Modify `docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md` and `docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md`: add amendment notices.
- Modify `docs/superpowers/plans/2026-09-04-one-shot-update-completion.md` and `docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md`: point product authority to this plan and state that qualification requires a new post-implementation design/plan.
- Modify `releases/notes-prompt-scope-cleanup-draft.md`: describe visible completion and keep qualification explicitly pending.
- Do not modify `docs/plan-d-pragmatic-cloud-pc-runbook.md` or `docs/plan-d-pragmatic-cloud-pc-results.md` in this plan.

Task dependencies are strict: Task 1 is an independent test-harness repair; Task 2 must finish before either component imports the hook; Task 3 adds FAB integration; Task 4 adds Options integration and completes cross-view GREEN; Task 5 documents only the implemented product behavior; Task 6 verifies and stops. Do not combine Task 2-4 production edits into one pre-RED batch.

### Task 0: Commit The Reviewed Product Plan

**Files:**
- Create: `docs/superpowers/plans/2026-09-05-visible-update-completion.md`

- [ ] **Step 1: Verify plan-only scope**

Run from the repository root. If the controller has already committed this file and the worktree is clean, the command prints `PlanAlreadyCommitted:true`; skip Steps 2-3. Otherwise it requires this to be the only untracked path.

```powershell
$path='docs/superpowers/plans/2026-09-05-visible-update-completion.md';$actual=@(git status --short);if($actual.Count -eq 0){git cat-file -e "HEAD:$path";if($LASTEXITCODE -ne 0){throw 'Committed product plan is missing'};[pscustomobject]@{PlanAlreadyCommitted=$true}|ConvertTo-Json -Compress}else{if($actual.Count -ne 1 -or $actual[0] -cne "?? $path"){$actual;throw 'Product-plan commit scope is not exact'};[pscustomobject]@{PlanReadyToCommit=$true}|ConvertTo-Json -Compress}
```

- [ ] **Step 2: Stage and inspect exactly the product plan**

```powershell
git add -- "docs/superpowers/plans/2026-09-05-visible-update-completion.md"
```

```powershell
$expected='docs/superpowers/plans/2026-09-05-visible-update-completion.md';$actual=@(git diff --cached --name-only);if($actual.Count -ne 1 -or $actual[0] -cne $expected){$actual;throw 'Cached product-plan path is not exact'};git diff --cached --check;if($LASTEXITCODE -ne 0){throw 'Plan diff check failed'}
```

- [ ] **Step 3: Commit**

```powershell
git commit -m "docs(plan): add visible completion implementation plan"
```

Expected: one documentation commit containing exactly this product plan. Do not amend it.

### Task 1: Remove The Full-Suite Worker Import Race

**Files:**
- Modify: `extension/src/background/serviceWorker.update.test.ts:75-102,439-458,579-633`

- [ ] **Step 1: Preserve the observed RED evidence**

The following load-sensitive failure was captured on 2026-09-05 before this plan rewrite:

```text
Service Worker transactional update cutover > routes an exact DH_UPDATE_ACK_COMPLETE message to durable committed consumption
expected [] to have a length of 1 but got +0
```

It occurred at the first 1,000 ms `vi.waitFor` in `loadWorkerWithCommittedCompletion` under this exact command:

```powershell
npm --prefix extension exec -- vitest run --root extension --silent --reporter=default --sequence.shuffle.files --sequence.seed=1 --maxWorkers=14 --minWorkers=14
```

This is scheduling-dependent evidence, not a deterministic mutation test. Run the command once before editing. If it fails as above, record that fresh RED. If it passes, retain the prior captured RED and do not rerun until it happens to fail, increase a timeout, or claim a deterministic reproduction.

- [ ] **Step 2: Make module evaluation structurally precede every condition wait**

At the reviewed baseline, direct import is at line 62 and deferred imports are at lines 83, 441, 585, and 617. The three sites that immediately wait for startup native-port output are the race-sensitive sites: `loadWorkerWithCommittedCompletion`, `preserves a private candidate across a normal worker restart without checking for updates`, and `extension reload triggers onInstalled and a no-update response clears a private candidate`. The fourth immediately awaits the temporary variable in the hydration-ordering test. Normalize all four to one direct awaited import before their next condition/request step:

```typescript
const worker = await import('./serviceWorker')
```

For the three race-sensitive sites, delete each later `const worker = await importing` line because `worker` is now created at the import site. In the hydration-ordering test, delete only `const importing = ...` and change its immediately following `const worker = await importing` to `const worker = await import('./serviceWorker')`; its deferred runtime hydration behavior is unchanged. Keep every `vi.resetModules()` and every `await worker.updateRuntimeReady`. Do not alter the 1,000 ms `vi.waitFor` defaults.

The structural check must find no temporary import variable and exactly five direct awaited imports total: the pre-existing `loadWorker` helper plus all four converted deferred sites (three startup-port sites and the hydration-ordering site):

```powershell
$path='extension/src/background/serviceWorker.update.test.ts';$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));if(([regex]::Matches($text,"const importing = import\('./serviceWorker'\)")).Count -ne 0){throw 'Deferred Service Worker import variable remains'};if(([regex]::Matches($text,"const worker = await import\('./serviceWorker'\)")).Count -ne 5){throw 'Expected exactly five direct awaited Service Worker imports'}
```

- [ ] **Step 3: Verify focused and stressed GREEN**

```powershell
npm --prefix extension exec -- vitest run --root extension src/background/serviceWorker.update.test.ts --reporter=verbose
```

Expected: all tests in the file pass.

```powershell
npm --prefix extension exec -- vitest run --root extension --silent --reporter=default --sequence.shuffle.files --sequence.seed=1 --maxWorkers=14 --minWorkers=14
```

Expected: the full Extension suite passes. This verifies the structural awaited-import fix under the prior load shape; it does not prove that restoring the race would fail on every machine or run.

- [ ] **Step 4: Run compile and diff checks**

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

```powershell
git diff --check -- "extension/src/background/serviceWorker.update.test.ts"
```

```powershell
$diff=(git diff -- "extension/src/background/serviceWorker.update.test.ts"|Out-String);$removedDeferred=([regex]::Matches($diff,'(?m)^-\s*const importing = import\(''\./serviceWorker''\)\s*$')).Count;$removedAwait=([regex]::Matches($diff,'(?m)^-\s*const worker = await importing\s*$')).Count;$addedDirect=([regex]::Matches($diff,'(?m)^\+\s*const worker = await import\(''\./serviceWorker''\)\s*$')).Count;if($removedDeferred -ne 4 -or $removedAwait -ne 4 -or $addedDirect -ne 4){$diff;throw 'Expected four deferred-import pairs to become four direct awaited imports'};$diff
```

Expected: TypeScript and diff checks are silent; the diff removes four temporary import declarations plus their four later awaits and adds four direct awaited imports. Together with the pre-existing helper import, the final file has five direct awaited imports and no deferred import variable.

Do not perform a temporary rollback/break-and-fail for this load-sensitive harness race. The captured RED plus structural diff and stressed GREEN are the evidence; restoring one unawaited import can pass under lighter scheduling and must not be described as deterministic proof.

- [ ] **Step 5: Commit**

```powershell
git add -- "extension/src/background/serviceWorker.update.test.ts"
```

```powershell
$actual=@(git diff --cached --name-only);if($actual.Count -ne 1 -or $actual[0] -cne 'extension/src/background/serviceWorker.update.test.ts'){throw 'Worker-test commit path set is not exact'};git diff --cached --check;if($LASTEXITCODE -ne 0){throw 'Worker-test cached diff check failed'}
```

```powershell
git commit -m "test(extension): await cold worker startup"
```

### Task 2: Build The Shared Visibility-Epoch Hook With TDD

**Files:**
- Create: `extension/src/hooks/useVisibleCompletionAck.ts`
- Create: `extension/src/hooks/useVisibleCompletionAck.test.ts`

Execute Steps 1-26 strictly in order. A later test group must not be added until the preceding group's focused GREEN is observed; a later production increment must not be written until that group's RED is observed. Steps 3, 7, 11, 15, 19, and 23 are the only production-code edit points in this task. Intermediate hook versions are intentionally incomplete but compile; never jump directly to Step 23's final form.

- [ ] **Step 1: Write the initial exact-transport contract tests**

Create `extension/src/hooks/useVisibleCompletionAck.test.ts` with this harness and the deadline, payload, ownership, and null-identity tests:

```typescript
import { StrictMode, createElement, type PropsWithChildren } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  chromeMockSpies,
  deferNextResponse,
  getMessageLog,
  installChromeMock,
  resetChromeMock,
} from '../test/chromeMock'
import { useVisibleCompletionAck } from './useVisibleCompletionAck'

const TX = '0123456789abcdef0123456789abcdef'
const TX_B = 'fedcba9876543210fedcba9876543210'

let visibility: DocumentVisibilityState
let originalVisibilityDescriptor: PropertyDescriptor | undefined
let nativeRemoveEventListener: typeof document.removeEventListener

function ackMessages(): ReadonlyArray<{ action: string; payload: unknown }> {
  return getMessageLog().filter(entry => entry.action === 'DH_UPDATE_ACK_COMPLETE')
}

function setDocumentVisibility(next: DocumentVisibilityState): void {
  visibility = next
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

function activeVisibilityListeners(): Set<EventListenerOrEventListenerObject> {
  const added = vi.mocked(document.addEventListener).mock.calls
    .filter(([type]) => type === 'visibilitychange')
    .map(([, listener]) => listener)
  const removed = new Set(
    vi.mocked(document.removeEventListener).mock.calls
      .filter(([type]) => type === 'visibilitychange')
      .map(([, listener]) => listener),
  )
  return new Set(added.filter(listener => !removed.has(listener)))
}

function restoreVisibilityDescriptor(): void {
  if (originalVisibilityDescriptor) {
    Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor)
  } else {
    delete (document as unknown as { visibilityState?: DocumentVisibilityState }).visibilityState
  }
}

describe('useVisibleCompletionAck', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    vi.useFakeTimers()
    visibility = 'visible'
    originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    nativeRemoveEventListener = document.removeEventListener.bind(document)
    vi.spyOn(document, 'addEventListener')
    vi.spyOn(document, 'removeEventListener')
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
  })

  afterEach(() => {
    cleanup()
    for (const listener of activeVisibilityListeners()) {
      nativeRemoveEventListener('visibilitychange', listener)
    }
    vi.clearAllTimers()
    vi.useRealTimers()
    restoreVisibilityDescriptor()
    vi.restoreAllMocks()
  })

  it('sends no ACK at 7,999 ms and one ACK at 8,000 ms', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('sends only the exact ACK payload', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(ackMessages()[0]?.payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX,
    })
    expect(Reflect.ownKeys(ackMessages()[0]?.payload as object)).toEqual([
      'type',
      'transactionId',
    ])
  })

  it('does not write update storage', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(chromeMockSpies.storageGet).not.toHaveBeenCalled()
    expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
  })

  it('does not ACK without a completion transaction', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: null, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the initial contract RED**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

Expected RED: import resolution fails for `./useVisibleCompletionAck`. This is the only permitted missing-module RED. Record that one module-resolution failure as RED evidence for all four tests in this initial group; do not create an empty production stub just to split them.

- [ ] **Step 3: Implement only the exact deadline**

Create `extension/src/hooks/useVisibleCompletionAck.ts`:

```typescript
import { useLayoutEffect } from 'react'

const ACK_DELAY_MS = 8_000

export type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>

export function useVisibleCompletionAck({
  transactionId,
  surfaceVisible: _surfaceVisible,
}: VisibleCompletionAckOptions): void {
  useLayoutEffect(() => {
    if (transactionId === null) return
    globalThis.setTimeout(() => {
      void chrome.runtime.sendMessage({
        type: 'DH_UPDATE_ACK_COMPLETE',
        transactionId,
      })
    }, ACK_DELAY_MS)
  }, [transactionId])
}
```

- [ ] **Step 4: Run the exact-deadline GREEN**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

Expected GREEN: all four initial contract tests pass.

- [ ] **Step 5: Write the initial hidden-state tests**

Append inside the existing `describe`:

```typescript
  it('does not ACK while the surface is hidden', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: false }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not ACK while the document is hidden', () => {
    visibility = 'hidden'
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })
```

- [ ] **Step 6: Run basic exact/hidden RED**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "does not ACK while the surface is hidden|does not ACK while the document is hidden" --reporter=verbose
```

Expected RED: both hidden tests report one unexpected ACK.

- [ ] **Step 7: Implement only initial visibility eligibility**

Rename the destructured parameter `surfaceVisible: _surfaceVisible` to `surfaceVisible`, then in the scheduling effect replace:

```typescript
    if (transactionId === null) return
```

with:

```typescript
    if (
      transactionId === null
      || !surfaceVisible
      || document.visibilityState !== 'visible'
    ) return
```

Do not add `surfaceVisible` to the dependency list yet; the next RED group proves transition handling.

- [ ] **Step 8: Run basic exact/hidden GREEN**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "sends no ACK at 7,999 ms and one ACK at 8,000 ms|sends only the exact ACK payload|does not write update storage|does not ACK without a completion transaction|does not ACK while the surface is hidden|does not ACK while the document is hidden" --reporter=verbose
```

Expected: all six named tests PASS.

- [ ] **Step 9: Write the epoch reset/same-state group**

Append inside the existing `describe`:

```typescript
  it('requires a fresh 8,000 ms after document hide and show', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(4_000))
    setDocumentVisibility('hidden')
    act(() => vi.advanceTimersByTime(20_000))
    expect(ackMessages()).toHaveLength(0)
    setDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('requires a fresh 8,000 ms after surface hide and show', () => {
    const view = renderHook(
      ({ surfaceVisible }) => useVisibleCompletionAck({ transactionId: TX, surfaceVisible }),
      { initialProps: { surfaceVisible: true } },
    )
    act(() => vi.advanceTimersByTime(4_000))
    view.rerender({ surfaceVisible: false })
    act(() => vi.advanceTimersByTime(20_000))
    expect(ackMessages()).toHaveLength(0)
    view.rerender({ surfaceVisible: true })
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps the original deadline across an equivalent same-transaction rerender', () => {
    const view = renderHook(
      ({ options }) => useVisibleCompletionAck(options),
      { initialProps: { options: { transactionId: TX as string | null, surfaceVisible: true } } },
    )
    act(() => vi.advanceTimersByTime(4_000))
    view.rerender({ options: { transactionId: TX, surfaceVisible: true } })
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('does not restart a visible epoch for a same-state visibilitychange event', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(4_000))
    setDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels transaction A and gives transaction B a fresh epoch', () => {
    const view = renderHook(
      ({ transactionId }) => useVisibleCompletionAck({ transactionId, surfaceVisible: true }),
      { initialProps: { transactionId: TX as string | null } },
    )
    act(() => vi.advanceTimersByTime(4_000))
    view.rerender({ transactionId: TX_B })
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()[0]?.payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX_B,
    })
  })
```

- [ ] **Step 10: Run epoch/same-state RED**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "requires a fresh 8,000 ms after document hide and show|requires a fresh 8,000 ms after surface hide and show|keeps the original deadline across an equivalent same-transaction rerender|does not restart a visible epoch for a same-state visibilitychange event|cancels transaction A and gives transaction B a fresh epoch" --reporter=verbose
```

Expected RED: both fresh-interval tests report an old ACK during hidden time, and transaction replacement reports the stale transaction A ACK because the initial implementation has no cancellation. The equivalent-rerender and same-state-event tests are GREEN lock tests.

- [ ] **Step 11: Implement only epoch transitions**

Replace all of `extension/src/hooks/useVisibleCompletionAck.ts` with this compile-ready intermediate implementation. It intentionally has no returned cleanup for either effect; Steps 21-23 prove and add those cleanups. The Step 1 harness removes every still-active intercepted visibility listener with the saved native remover in `afterEach`, so intermediate RED/GREEN runs cannot leak between tests.

```typescript
import { useLayoutEffect, useRef, useState } from 'react'

const ACK_DELAY_MS = 8_000

export type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>

export function useVisibleCompletionAck({
  transactionId,
  surfaceVisible,
}: VisibleCompletionAckOptions): void {
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const documentVisibleRef = useRef(false)
  const [visibilityRevision, setVisibilityRevision] = useState(0)

  useLayoutEffect(() => {
    documentVisibleRef.current = document.visibilityState === 'visible'
    const handleVisibilityChange = (): void => {
      const nextVisible = document.visibilityState === 'visible'
      if (nextVisible === documentVisibleRef.current) return
      documentVisibleRef.current = nextVisible
      if (timerRef.current !== null) {
        globalThis.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisibilityRevision(current => current + 1)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useLayoutEffect(() => {
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (
      transactionId === null
      || !surfaceVisible
      || !documentVisibleRef.current
      || document.visibilityState !== 'visible'
    ) return

    const timeoutId = globalThis.setTimeout(() => {
      void chrome.runtime.sendMessage({
        type: 'DH_UPDATE_ACK_COMPLETE',
        transactionId,
      })
      if (timerRef.current === timeoutId) timerRef.current = null
    }, ACK_DELAY_MS)
    timerRef.current = timeoutId
  }, [transactionId, surfaceVisible, visibilityRevision])
}
```

- [ ] **Step 12: Run epoch/same-state GREEN**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

Expected: all named tests PASS.

- [ ] **Step 13: Write stale-callback tests**

Append the five exact stale-callback tests below. Each captures the 8,000 ms callback, performs one transition, manually invokes the callback, and asserts zero stale ACKs. Transaction replacement then advances the fresh B timer and asserts one exact TX_B ACK.

```typescript
  it('ignores a stale callback after document hide', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    setDocumentVisibility('hidden')
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('rechecks live document visibility without an event', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    visibility = 'hidden'
    act(() => stale())
    expect(ackMessages()).toHaveLength(0)
  })

  it('ignores a stale callback after surface hide', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(
      ({ surfaceVisible }) => useVisibleCompletionAck({ transactionId: TX, surfaceVisible }),
      { initialProps: { surfaceVisible: true } },
    )
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.rerender({ surfaceVisible: false })
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('ignores a stale callback after transaction replacement', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(
      ({ transactionId }) => useVisibleCompletionAck({ transactionId, surfaceVisible: true }),
      { initialProps: { transactionId: TX as string | null } },
    )
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.rerender({ transactionId: TX_B })
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()[0]?.payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX_B,
    })
  })

  it('ignores a stale callback after authoritative departure', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(
      ({ transactionId }) => useVisibleCompletionAck({ transactionId, surfaceVisible: true }),
      { initialProps: { transactionId: TX as string | null } },
    )
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.rerender({ transactionId: null })
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })
```

- [ ] **Step 14: Run stale-callback RED**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "stale callback|rechecks live document visibility" --reporter=verbose
```

Expected RED: document-hide, surface-hide, replacement, and departure stale callbacks send from the Step 11 closure. The no-event live-document test also sends because no callback-time visibility check exists.

- [ ] **Step 15: Implement stale-callback revalidation**

Replace all of `extension/src/hooks/useVisibleCompletionAck.ts` with this compile-ready intermediate version. It adds generation and live-state revalidation but intentionally leaves synchronous transport throws and effect cleanup for later RED groups:

```typescript
import { useLayoutEffect, useRef, useState } from 'react'

const ACK_DELAY_MS = 8_000

export type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>

export function useVisibleCompletionAck({
  transactionId,
  surfaceVisible,
}: VisibleCompletionAckOptions): void {
  const currentTransactionIdRef = useRef(transactionId)
  const currentSurfaceVisibleRef = useRef(surfaceVisible)
  const documentVisibleRef = useRef(false)
  const generationRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const [visibilityRevision, setVisibilityRevision] = useState(0)

  useLayoutEffect(() => {
    documentVisibleRef.current = document.visibilityState === 'visible'
    const handleVisibilityChange = (): void => {
      const nextVisible = document.visibilityState === 'visible'
      if (nextVisible === documentVisibleRef.current) return
      documentVisibleRef.current = nextVisible
      generationRef.current += 1
      if (timerRef.current !== null) {
        globalThis.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisibilityRevision(current => current + 1)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useLayoutEffect(() => {
    currentTransactionIdRef.current = transactionId
    currentSurfaceVisibleRef.current = surfaceVisible
    const generation = generationRef.current + 1
    generationRef.current = generation
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (
      transactionId === null
      || !surfaceVisible
      || !documentVisibleRef.current
      || document.visibilityState !== 'visible'
    ) return

    const capturedTransactionId = transactionId
    const timeoutId = globalThis.setTimeout(() => {
      if (
        timerRef.current !== timeoutId
        || generationRef.current !== generation
        || currentTransactionIdRef.current !== capturedTransactionId
        || !currentSurfaceVisibleRef.current
        || !documentVisibleRef.current
        || document.visibilityState !== 'visible'
      ) return

      void chrome.runtime.sendMessage({
        type: 'DH_UPDATE_ACK_COMPLETE',
        transactionId: capturedTransactionId,
      })
      if (timerRef.current === timeoutId) timerRef.current = null
    }, ACK_DELAY_MS)
    timerRef.current = timeoutId
  }, [transactionId, surfaceVisible, visibilityRevision])
}
```

- [ ] **Step 16: Run the stale-callback group GREEN**

Run the complete hook file; expected GREEN for every test added through Step 13:

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

- [ ] **Step 17: Write failure/reentry/sync-throw/response tests**

Append the exact tests below. Use `deferNextResponse` for Promise outcomes and a `runtimeSendMessage.mockImplementationOnce` callback that synchronously invokes the captured timer for reentry.

```typescript
  it('does not retry a rejected ACK in the same visible epoch', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    const rejectionCatch = vi.spyOn(ack.promise, 'catch')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(rejectionCatch).toHaveBeenCalledOnce()
    await act(async () => { ack.reject(new Error('disconnected')) })
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })

  it('does not retry a handled-false ACK in the same visible epoch', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => { ack.resolve({ handled: false }) })
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })

  it('contains a synchronous sendMessage throw', () => {
    chromeMockSpies.runtimeSendMessage.mockImplementationOnce((_payload, _callback) => {
      throw new Error('context invalidated')
    })
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    expect(() => act(() => vi.advanceTimersByTime(8_000))).not.toThrow()
  })

  it('does not retry a synchronous sendMessage throw in the same epoch', () => {
    chromeMockSpies.runtimeSendMessage.mockImplementationOnce((_payload, _callback) => {
      throw new Error('context invalidated')
    })
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    expect(() => act(() => vi.advanceTimersByTime(8_000))).not.toThrow()
    act(() => vi.advanceTimersByTime(30_000))
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(1)
  })

  it('marks the epoch attempted before synchronous transport reentry', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    let callback: (() => void) | undefined
    chromeMockSpies.runtimeSendMessage.mockImplementationOnce((_payload, _callback) => {
      callback?.()
      return new Promise<unknown>(() => {})
    })
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    callback = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    act(() => callback?.())
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(1)
  })

  it('allows one retry only after failure and a fresh hide-show epoch', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    const rejectionCatch = vi.spyOn(ack.promise, 'catch')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(rejectionCatch).toHaveBeenCalledOnce()
    await act(async () => { ack.reject(new Error('disconnected')) })
    setDocumentVisibility('hidden')
    setDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(2)
  })

  it('ignores a successful ACK response', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => { ack.resolve({ handled: true, state: { kind: 'idle' } }) })
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })
```

- [ ] **Step 18: Run failure/reentry/sync-throw/response RED**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "rejected ACK|handled-false ACK|synchronous sendMessage throw|synchronous transport reentry|fresh hide-show epoch|successful ACK response" --reporter=verbose
```

Expected RED: the rejected-ACK and fresh-epoch tests report that no rejection handler was attached, both synchronous-throw tests report the escaped `context invalidated` error, and synchronous reentry sends twice. The handled-false and successful-response non-authority assertions are GREEN lock tests. Do not reject the deferred Promise until its catch-spy assertion passes; this keeps RED deterministic and avoids an intentional unhandled rejection.

- [ ] **Step 19: Implement attempt-before-transport and containment**

Replace all of `extension/src/hooks/useVisibleCompletionAck.ts` with this compile-ready intermediate version. It marks the epoch before transport and contains synchronous/Promise failures, while intentionally retaining the no-cleanup behavior needed for the next RED group:

```typescript
import { useLayoutEffect, useRef, useState } from 'react'

const ACK_DELAY_MS = 8_000

export type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>

export function useVisibleCompletionAck({
  transactionId,
  surfaceVisible,
}: VisibleCompletionAckOptions): void {
  const currentTransactionIdRef = useRef(transactionId)
  const currentSurfaceVisibleRef = useRef(surfaceVisible)
  const documentVisibleRef = useRef(false)
  const generationRef = useRef(0)
  const attemptedGenerationRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const [visibilityRevision, setVisibilityRevision] = useState(0)

  useLayoutEffect(() => {
    documentVisibleRef.current = document.visibilityState === 'visible'
    const handleVisibilityChange = (): void => {
      const nextVisible = document.visibilityState === 'visible'
      if (nextVisible === documentVisibleRef.current) return
      documentVisibleRef.current = nextVisible
      generationRef.current += 1
      if (timerRef.current !== null) {
        globalThis.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisibilityRevision(current => current + 1)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useLayoutEffect(() => {
    currentTransactionIdRef.current = transactionId
    currentSurfaceVisibleRef.current = surfaceVisible
    const generation = generationRef.current + 1
    generationRef.current = generation
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (
      transactionId === null
      || !surfaceVisible
      || !documentVisibleRef.current
      || document.visibilityState !== 'visible'
    ) return

    const capturedTransactionId = transactionId
    const timeoutId = globalThis.setTimeout(() => {
      if (
        timerRef.current !== timeoutId
        || generationRef.current !== generation
        || attemptedGenerationRef.current === generation
        || currentTransactionIdRef.current !== capturedTransactionId
        || !currentSurfaceVisibleRef.current
        || !documentVisibleRef.current
        || document.visibilityState !== 'visible'
      ) return

      attemptedGenerationRef.current = generation
      try {
        const response = chrome.runtime.sendMessage({
          type: 'DH_UPDATE_ACK_COMPLETE',
          transactionId: capturedTransactionId,
        })
        void Promise.resolve(response).catch(() => undefined)
      } catch {
        // A destroyed Extension context must not alter authoritative UI.
      }
      if (timerRef.current === timeoutId) timerRef.current = null
    }, ACK_DELAY_MS)
    timerRef.current = timeoutId
  }, [transactionId, surfaceVisible, visibilityRevision])
}
```

- [ ] **Step 20: Run failure/reentry/sync-throw/response GREEN**

Run the complete hook file. Expected: every test added through Step 17 PASS.

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

- [ ] **Step 21: Write StrictMode/unmount tests**

Append tests that unmount before deadline, manually invoke a captured callback after unmount, require removal of the exact listener, and render through `StrictMode` while requiring `activeVisibilityListeners().size === 1` plus exactly one ACK. Use the exact code below. `activeVisibilityListeners()` is defined in Step 1's harness.

```typescript
  it('cancels the timer on unmount', () => {
    const view = renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    view.unmount()
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('ignores a stale callback after unmount', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.unmount()
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('removes its exact visibility listener on unmount', () => {
    const view = renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    expect(activeVisibilityListeners().size).toBe(1)
    view.unmount()
    expect(activeVisibilityListeners().size).toBe(0)
  })

  it('keeps one listener and sends one ACK under React StrictMode', () => {
    const wrapper = ({ children }: PropsWithChildren<unknown>) => createElement(StrictMode, null, children)
    renderHook(
      () => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }),
      { wrapper },
    )
    expect(activeVisibilityListeners().size).toBe(1)
    act(() => vi.advanceTimersByTime(8_000))
    expect(ackMessages()).toHaveLength(1)
  })
```

- [ ] **Step 22: Run StrictMode/unmount RED**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "unmount|StrictMode" --reporter=verbose
```

Expected RED against the no-cleanup intermediate hook: unmount still permits a send, the stale callback sends, and the listener remains registered. The StrictMode test must also fail if replay leaves duplicate active listeners or duplicate ACKs; record the exact observed StrictMode assertion rather than fabricating one.

- [ ] **Step 23: Add exact listener and timer cleanup**

Return this exact cleanup from the listener effect:

```typescript
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      generationRef.current += 1
    }
```

Return this exact cleanup from the scheduling effect after assigning `timerRef.current`:

```typescript
    return () => {
      generationRef.current += 1
      if (timerRef.current === timeoutId) {
        globalThis.clearTimeout(timeoutId)
        timerRef.current = null
      }
    }
```

After adding both returns, compare the complete hook against this final compile-ready form:

```typescript
import { useLayoutEffect, useRef, useState } from 'react'

const ACK_DELAY_MS = 8_000

export type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>

export function useVisibleCompletionAck({
  transactionId,
  surfaceVisible,
}: VisibleCompletionAckOptions): void {
  const currentTransactionIdRef = useRef(transactionId)
  const currentSurfaceVisibleRef = useRef(surfaceVisible)
  const documentVisibleRef = useRef(false)
  const generationRef = useRef(0)
  const attemptedGenerationRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const [visibilityRevision, setVisibilityRevision] = useState(0)

  useLayoutEffect(() => {
    documentVisibleRef.current = document.visibilityState === 'visible'
    const handleVisibilityChange = (): void => {
      const nextVisible = document.visibilityState === 'visible'
      if (nextVisible === documentVisibleRef.current) return
      documentVisibleRef.current = nextVisible
      generationRef.current += 1
      if (timerRef.current !== null) {
        globalThis.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisibilityRevision(current => current + 1)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      generationRef.current += 1
    }
  }, [])

  useLayoutEffect(() => {
    currentTransactionIdRef.current = transactionId
    currentSurfaceVisibleRef.current = surfaceVisible
    const generation = generationRef.current + 1
    generationRef.current = generation
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (
      transactionId === null
      || !surfaceVisible
      || !documentVisibleRef.current
      || document.visibilityState !== 'visible'
    ) return

    const capturedTransactionId = transactionId
    const timeoutId = globalThis.setTimeout(() => {
      if (
        timerRef.current !== timeoutId
        || generationRef.current !== generation
        || attemptedGenerationRef.current === generation
        || currentTransactionIdRef.current !== capturedTransactionId
        || !currentSurfaceVisibleRef.current
        || !documentVisibleRef.current
        || document.visibilityState !== 'visible'
      ) return

      attemptedGenerationRef.current = generation
      try {
        const response = chrome.runtime.sendMessage({
          type: 'DH_UPDATE_ACK_COMPLETE',
          transactionId: capturedTransactionId,
        })
        void Promise.resolve(response).catch(() => undefined)
      } catch {
        // A destroyed Extension context must not alter authoritative UI.
      }
      if (timerRef.current === timeoutId) timerRef.current = null
    }, ACK_DELAY_MS)
    timerRef.current = timeoutId

    return () => {
      generationRef.current += 1
      if (timerRef.current === timeoutId) {
        globalThis.clearTimeout(timeoutId)
        timerRef.current = null
      }
    }
  }, [transactionId, surfaceVisible, visibilityRevision])
}
```

- [ ] **Step 24: Run full hook GREEN and compile**

Then run:

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

Expected: full hook file PASS and TypeScript emits no diagnostics.

- [ ] **Step 25: Perform compile-ready isolated mutation checks**

Use only these deterministic mutations, one at a time from restored final source. The **Named test** column is the exact Vitest `-t` string:

| Invariant | Exact mutation | Named test |
|---|---|---|
| Deadline | Replace `const ACK_DELAY_MS = 8_000` with `const ACK_DELAY_MS = 7_999` | `sends no ACK at 7,999 ms and one ACK at 8,000 ms` |
| Exact payload | Insert `extra: true,` after `type: 'DH_UPDATE_ACK_COMPLETE',` | `sends only the exact ACK payload` |
| No storage ownership | Insert `void chrome.storage.local.set({ dh_update_state: {} })` immediately before the transport `try {` | `does not write update storage` |
| Transaction eligibility | Replace `currentTransactionIdRef.current = transactionId` with `currentTransactionIdRef.current = transactionId ?? '0123456789abcdef0123456789abcdef'`; delete the `transactionId === null` eligibility clause and its following `||`; replace `const capturedTransactionId = transactionId` with `const capturedTransactionId = transactionId ?? '0123456789abcdef0123456789abcdef'` | `does not ACK without a completion transaction` |
| Surface eligibility | Delete `|| !surfaceVisible` from scheduling eligibility and `|| !currentSurfaceVisibleRef.current` from callback revalidation | `does not ACK while the surface is hidden` |
| Document eligibility | Delete `|| !documentVisibleRef.current` and `|| document.visibilityState !== 'visible'` from scheduling eligibility, and delete the same two clauses from callback revalidation | `does not ACK while the document is hidden` |
| Document reset | Delete `generationRef.current += 1`, the entire timer-clear `if` block, and `setVisibilityRevision(current => current + 1)` from `handleVisibilityChange`, leaving only the cached visibility assignment | `requires a fresh 8,000 ms after document hide and show` |
| Surface reset | Replace the scheduling dependency list `[transactionId, surfaceVisible, visibilityRevision]` with `[transactionId, visibilityRevision]` and delete `currentSurfaceVisibleRef.current = surfaceVisible` from that effect | `requires a fresh 8,000 ms after surface hide and show` |
| Equivalent rerender retains deadline | Insert `generationRef.current += 1` immediately before the listener `useLayoutEffect` so every render invalidates the pending callback | `keeps the original deadline across an equivalent same-transaction rerender` |
| Same-state event | Delete `if (nextVisible === documentVisibleRef.current) return` | `does not restart a visible epoch for a same-state visibilitychange event` |
| Replacement | Replace the scheduling dependency list `[transactionId, surfaceVisible, visibilityRevision]` with `[surfaceVisible, visibilityRevision]` | `cancels transaction A and gives transaction B a fresh epoch` |
| Live document recheck | Delete only `|| document.visibilityState !== 'visible'` from callback revalidation | `rechecks live document visibility without an event` |
| Stale after document hide | Replace the complete callback guard with `if (attemptedGenerationRef.current === generation) return` | `ignores a stale callback after document hide` |
| Stale after surface hide | Replace the complete callback guard with `if (attemptedGenerationRef.current === generation) return` | `ignores a stale callback after surface hide` |
| Stale after replacement | Replace the complete callback guard with `if (attemptedGenerationRef.current === generation) return` | `ignores a stale callback after transaction replacement` |
| Stale after departure | Replace the complete callback guard with `if (attemptedGenerationRef.current === generation) return` | `ignores a stale callback after authoritative departure` |
| Attempt before transport | Delete `attemptedGenerationRef.current = generation` before `try {` and insert it immediately after the closing `})` of `chrome.runtime.sendMessage({ ... })` | `marks the epoch attempted before synchronous transport reentry` |
| Rejected no-loop | Replace `.catch(() => undefined)` with `.catch(() => { void chrome.runtime.sendMessage({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: capturedTransactionId }) })` | `does not retry a rejected ACK in the same visible epoch` |
| Handled-false no-loop | Replace `void Promise.resolve(response).catch(() => undefined)` with `void Promise.resolve(response).then(value => { if ((value as { handled?: boolean }).handled === false) void chrome.runtime.sendMessage({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: capturedTransactionId }) }).catch(() => undefined)` | `does not retry a handled-false ACK in the same visible epoch` |
| Sync throw | Replace the complete transport `try/catch` with `const response = chrome.runtime.sendMessage({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: capturedTransactionId }); void Promise.resolve(response).catch(() => undefined)` | `contains a synchronous sendMessage throw` |
| Sync throw no-loop | Replace the catch body comment with `try { void chrome.runtime.sendMessage({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: capturedTransactionId }) } catch {}` | `does not retry a synchronous sendMessage throw in the same epoch` |
| Fresh retry epoch | Insert `if (attemptedGenerationRef.current !== null) return` at the start of `handleVisibilityChange` | `allows one retry only after failure and a fresh hide-show epoch` |
| Response ignored | Replace `void Promise.resolve(response).catch(() => undefined)` with `void Promise.resolve(response).then(() => { void chrome.runtime.sendMessage({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: capturedTransactionId }) }).catch(() => undefined)` | `ignores a successful ACK response` |
| Unmount timer/callback invalidation | Replace the listener cleanup with `return () => { document.removeEventListener('visibilitychange', handleVisibilityChange) }` and replace the scheduling cleanup with `return () => undefined` | `cancels the timer on unmount` |
| Stale callback after unmount | Replace the complete callback guard with `if (attemptedGenerationRef.current === generation) return` | `ignores a stale callback after unmount` |
| Listener cleanup | Delete `document.removeEventListener('visibilitychange', handleVisibilityChange)` | `removes its exact visibility listener on unmount` |
| StrictMode listener singularity | Replace listener cleanup with `return () => { generationRef.current += 1 }` | `keeps one listener and sends one ACK under React StrictMode` |

For a stale-callback row, "complete callback guard" means the full multiline `if (...) return` immediately inside the 8,000 ms callback; replace that whole statement once, leaving the send body unchanged. For the document-reset row, "timer-clear `if` block" means the block beginning `if (timerRef.current !== null)` inside `handleVisibilityChange`, not the similarly shaped block in the scheduling effect.

For each mutation, run the exact named test with this command form, require exit `1`, restore, and require exit `0`:

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts -t "sends no ACK at 7,999 ms and one ACK at 8,000 ms" --reporter=verbose
```

- [ ] **Step 26: Validate path set and commit**

Before staging, run the complete hook file once more after restoring every mutation:

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts --reporter=verbose
```

Expected: all hook tests PASS, confirming no temporary mutation remains.

```powershell
git add -- "extension/src/hooks/useVisibleCompletionAck.ts" "extension/src/hooks/useVisibleCompletionAck.test.ts"
```

```powershell
$expected=@('extension/src/hooks/useVisibleCompletionAck.test.ts','extension/src/hooks/useVisibleCompletionAck.ts');$actual=@(git diff --cached --name-only);if($actual.Count -ne $expected.Count -or (Compare-Object $expected $actual).Count){$actual;throw 'Hook commit path set is not exact'};git diff --cached --check;if($LASTEXITCODE -ne 0){throw 'Hook cached diff check failed'}
```

```powershell
git commit -m "fix(ui): acknowledge only visible completions"
```

### Task 3: Integrate Real FAB Completion Surfaces

**Files:**
- Modify: `extension/src/components/FAB.tsx:1-9,188-221,243-296`
- Modify: `extension/src/components/FAB.update.test.tsx:1-205,240-732`

- [ ] **Step 1: Install and verify the deterministic FAB test harness**

Add `originalHiddenDescriptor`, `originalVisibilityDescriptor`, and `visibility` beside the existing constants. Extend `beforeEach` and `afterEach` exactly as follows; the delete branches are mandatory because jsdom may inherit either descriptor instead of defining it directly on `document`:

```typescript
let visibility: DocumentVisibilityState
let originalHiddenDescriptor: PropertyDescriptor | undefined
let originalVisibilityDescriptor: PropertyDescriptor | undefined

function setFabDocumentVisibility(next: DocumentVisibilityState): void {
  visibility = next
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

function restoreDocumentDescriptor(
  key: 'hidden' | 'visibilityState',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(document, key, descriptor)
  else delete (document as unknown as Record<string, unknown>)[key]
}
```

At the end of the existing `beforeEach` add:

```typescript
    visibility = 'visible'
    originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => visibility === 'hidden',
    })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
```

At the end of `afterEach`, after timers are restored, add:

```typescript
    restoreDocumentDescriptor('hidden', originalHiddenDescriptor)
    restoreDocumentDescriptor('visibilityState', originalVisibilityDescriptor)
```

Also call `vi.restoreAllMocks()` after restoring both descriptors so per-test timer/document spies cannot leak.

Before adding any new RED test, replace `renderFab`'s ten-promise loop and `resolveState`'s two-promise loop with these exact helpers. `vi.waitFor` is intentional because it cooperates with Vitest fake timers; awaiting the actual deferred promise replaces guessed microtask counts:

```typescript
async function renderFab() {
  let view!: ReturnType<typeof render>
  await act(async () => {
    view = render(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )
  })
  await vi.waitFor(() => expect(
    getMessageLog().some(entry => entry.action === 'DH_UPDATE_GET_STATE'),
  ).toBe(true))
  return view
}

async function resolveState(
  deferred: ReturnType<typeof deferNextResponse>,
  updateState: unknown,
) {
  await act(async () => {
    deferred.resolve({ handled: true, state: updateState })
    await deferred.promise
  })
}
```

Run the unchanged FAB file to prove this test-only reliability refactor is GREEN before introducing any new behavior assertion:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx --reporter=verbose
```

Expected: all pre-existing FAB tests PASS with no `act` warning.

- [ ] **Step 2: Write the closed/cold FAB RED before production edits**

Add this test before changing `FAB.tsx`:

```typescript
  it('does not ACK a cold completion while only the closed-FAB red dot is visible', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    const button = document.querySelector('.dh-btn') as HTMLButtonElement
    const redDot = Array.from(button.querySelectorAll('span')).find(
      element => ['#ef4444', 'rgb(239, 68, 68)'].includes((element as HTMLElement).style.backgroundColor.toLowerCase()),
    )
    expect(redDot).toBeDefined()
    expect(screen.queryByRole('button', { name: /update completed successfully/i })).toBeNull()
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })
```

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx -t "does not ACK a cold completion while only the closed-FAB red dot is visible" --reporter=verbose
```

Expected RED against the current mounted-only effect: one ACK is sent although the menu is closed and cold hydration created no completion bubble.

- [ ] **Step 3: Add the remaining FAB visibility tests before production edits**

The focused RED from Step 2 is already recorded, so this step expands that same pre-production RED suite; it is not a second TDD cycle. Keep production unchanged until Step 4 has recorded the complete expected failure set.

Add these complete tests:

```typescript
  it('starts a full epoch only when the cold-completion menu opens', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(20_000))
    openFab()
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels a menu epoch when the menu closes without a bound bubble', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    openFab()
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not ACK a live completion with Status bubble disabled and the menu closed', async () => {
    vi.useFakeTimers()
    state.prefs.enableStatusBubble = false
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, { kind: 'idle' })
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: completeState() }))
    expect(bubble()).not.toHaveClass('visible')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('ACKs an exact transaction-bound completion bubble while the menu is closed', async () => {
    vi.useFakeTimers()
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderLiveCompletion()
    expect(bubble()).toHaveClass('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps one deadline across a bound-bubble-to-menu hand-off', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(4_000))
    expect(bubble()).toHaveClass('visible')
    openFab()
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'UNRELATED UPDATE FEEDBACK' },
    })))
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps one deadline across a menu-to-bound-bubble hand-off', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: completeState() }))
    expect(bubble()).toHaveClass('visible')
    openFab()
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps an already-visible bound bubble eligible after the preference is disabled', async () => {
    vi.useFakeTimers()
    const view = await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(4_000))
    state.prefs.enableStatusBubble = false
    act(() => {
      view.rerender(<PrefsLanguageProvider language="en"><FAB /></PrefsLanguageProvider>)
    })
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('does not restart the epoch when a bound bubble appears while the menu stays open', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: completeState() }))
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('removes bubble eligibility when unrelated feedback replaces it', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'UNRELATED UPDATE FEEDBACK' },
    })))
    expect(bubble()).toHaveTextContent('UNRELATED UPDATE FEEDBACK')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not treat a generic visible status bubble as a completion surface', async () => {
    vi.useFakeTimers()
    state.prefs.enableStatusBubble = true
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'GENERIC UPDATE FEEDBACK' },
    })))
    expect(bubble()).toHaveClass('visible')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('requires a fresh full interval after the FAB document hides and returns', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    setFabDocumentVisibility('hidden')
    act(() => vi.advanceTimersByTime(20_000))
    setFabDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels every visible epoch on authoritative departure', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('lets a failed-ACK bubble expire and retries only after a fresh menu epoch', async () => {
    vi.useFakeTimers()
    const firstAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => { firstAck.reject(new Error('disconnected')) })
    act(() => vi.advanceTimersByTime(2_000))
    expect(bubble()).not.toHaveClass('visible')
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    openFab()
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(2)
  })
```

The tests intentionally keep the ten-second bubble fallback wall-clock based. Do not reset it when an ACK fails.

Run the complete FAB file before editing production:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx --reporter=verbose
```

Expected RED: at minimum the closed-red-dot, menu-start, menu-close, disabled-bubble, unrelated-replacement, hidden-document reset, and failed-fallback retry tests fail because the current effect starts from mounted `complete` state alone. Existing preserved-behavior tests may pass; do not count those passes as RED evidence.

- [ ] **Step 4: Update existing timer and cross-view tests, then capture RED**

Make these exact edits to existing tests:

- In `keeps completion visible through 7,999 ms...`, retain the existing `openFab()` before timing and rename it to `keeps a visible menu completion through 7,999 ms and sends one exact ACK at 8,000 ms`.
- In `keeps the original ACK deadline across an equivalent same-ID rebroadcast`, retain `openFab()` and rename it to say `visible-epoch deadline`.
- In `cancels ACK on unmount...`, call `openFab()` before the first 4,000 ms and again after second hydration before the 7,999 ms interval.
- In the transaction A departure/replacement test, call `openFab()` immediately after first hydration.
- Replace the rejection/handled-false test's remount tail with the same-view code below and rename it to `keeps completion visible after a failed ACK and retries only after a fresh visibility epoch (%s)`. This replaces `first.unmount()` through the final assertion; remove the now-unused `first` binding by changing `const first = await renderFab()` to `await renderFab()`:

```typescript
      openFab()
      openFab()
      deferNextResponse('DH_UPDATE_ACK_COMPLETE')
      act(() => vi.advanceTimersByTime(7_999))
      expect(ackMessages()).toHaveLength(1)
      act(() => vi.advanceTimersByTime(1))
      expect(ackMessages()).toHaveLength(2)
      expect(screen.getByRole('button', { name: /update completed successfully/i })).toBeDisabled()
```

The first `openFab()` closes the menu and ends the failed epoch; the second opens it and starts the fresh epoch. Do not use unmount/remount as the retry trigger.
- In `keeps FAB and Options on a newer authoritative state when simultaneous duplicate ACK responses race`, keep Options visible and call `openFab()` before advancing eight seconds.
- In `cancels the later view timer when the first global ACK broadcast consumes completion`, call `openFab()` immediately after resolving the FAB's complete state and before the first 4,000 ms. Keep the test so it still proves a visible FAB winner's authoritative broadcast cancels the later Options timer.
- Add the complete test below separately. It proves a closed FAB cannot beat visible Options.
- Do not create a same-jsdom test that claims FAB and Options have different document visibility. Hidden Options and visible FAB are proven by their separate component/hook tests; duplicate-winner safety remains the runtime/idempotence test.
- In any other touched helper/test that still uses fixed-count promise loops, replace the loop with `waitFor` on the expected rendered terminal element or message-log length. The shared `renderFab` and `resolveState` helpers were already made deterministic in Step 1; do not edit them again here.

```typescript
  it('lets visible Options win while a cold FAB remains closed', async () => {
    vi.useFakeTimers()
    const fabGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const optionsGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    deferNextResponse('get_config')
    await renderFab()
    await resolveState(fabGetState, completeState())
    expect(screen.queryByRole('button', { name: /update completed successfully/i })).toBeNull()
    act(() => vi.advanceTimersByTime(4_000))
    render(<Options />)
    await resolveState(optionsGetState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
    expect(screen.queryByRole('status')).toBeNull()
  })
```

Rerun the complete FAB file while production still has its direct mounted-only timer:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx --reporter=verbose
```

Expected RED includes the FAB-specific failures listed above and `lets visible Options win while a cold FAB remains closed`: the current mounted-only FAB sends at `t=8,000` instead of leaving the later visible Options epoch as the sole winner at `t=12,000`. Do not edit `FAB.tsx` until these failures are observed and recorded.

- [ ] **Step 5: Replace FAB's direct ACK effect with aggregate visibility**

This production edit follows the FAB-specific RED runs from Steps 2-4. Do not make it before those named failures are recorded.

Add this import:

```typescript
import { useVisibleCompletionAck } from '../hooks/useVisibleCompletionAck';
```

Delete the current `useEffect` whose callback sends `DH_UPDATE_ACK_COMPLETE`. After `statusCompletionTransactionIdRef` is declared, add:

```typescript
    const completionBubbleVisible = completionTransactionId !== null
        && statusBubble.visible
        && statusCompletionTransactionIdRef.current === completionTransactionId;
    const completionSurfaceVisible = completionTransactionId !== null
        && (isOpen || completionBubbleVisible);

    useVisibleCompletionAck({
        transactionId: completionTransactionId,
        surfaceVisible: completionSurfaceVisible,
    });
```

Delete the render-time assignment `statusBubbleRef.current = statusBubble;`. The three existing `setStatusBubble` paths already assign the matching ref immediately before state. Verify that remains true:

```powershell
$path='extension/src/components/FAB.tsx';$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));if(([regex]::Matches($text,'setStatusBubble\(')).Count -ne 3){throw 'Unexpected Status bubble setter count; inspect every ref/state pair'};if($text.Contains('statusBubbleRef.current = statusBubble;')){throw 'Render-time Status bubble ref mutation remains'}
```

Do not include `prefs.enableStatusBubble` in `completionBubbleVisible`: that preference controls creation, not whether an already-rendered bound bubble is visible.

- [ ] **Step 6: Run focused GREEN and TypeScript**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts src/components/FAB.update.test.tsx --reporter=verbose
```

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

- [ ] **Step 7: Perform FAB break-and-fail checks**

Apply and restore one row at a time. Use this command form with the row's literal test name in place of the example; for an `it.each` row, the displayed prefix intentionally selects both `rejected` and `handled-false` cases. Require exit code `1` while mutated and `0` after restoration:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/FAB.update.test.tsx -t "does not ACK a cold completion while only the closed-FAB red dot is visible" --reporter=verbose
```

For the fresh-menu-retry row below, replace the complete `useVisibleCompletionAck({...});` call with this exact compile-ready mounted-only regression block, then restore the hook call immediately after the named test fails:

```typescript
    useEffect(() => {
        if (completionTransactionId === null) return;
        const timeoutId = setTimeout(() => {
            void chrome.runtime.sendMessage({
                type: 'DH_UPDATE_ACK_COMPLETE',
                transactionId: completionTransactionId,
            }).catch(() => undefined);
        }, 8000);
        return () => clearTimeout(timeoutId);
    }, [completionTransactionId]);
```

| Observable invariant | One temporary mutation | Test that must fail |
|---|---|---|
| Closed red dot is not a surface | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: completionTransactionId !== null,` | `does not ACK a cold completion while only the closed-FAB red dot is visible` |
| Menu opens epoch | Replace `&& (isOpen || completionBubbleVisible);` with `&& completionBubbleVisible;` | `starts a full epoch only when the cold-completion menu opens` |
| Menu close cancels | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: completionTransactionId !== null && (isOpen || completionBubbleVisible || updateState.kind === 'complete'),` | `cancels a menu epoch when the menu closes without a bound bubble` |
| Disabled preference creates no surface | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: completionTransactionId !== null,` | `does not ACK a live completion with Status bubble disabled and the menu closed` |
| Exact bound bubble qualifies | Replace `&& (isOpen || completionBubbleVisible);` with `&& isOpen;` | `ACKs an exact transaction-bound completion bubble while the menu is closed` |
| Bubble-to-menu hand-off retains deadline | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: completionBubbleVisible,` | `keeps one deadline across a bound-bubble-to-menu hand-off` |
| Menu-to-bubble hand-off retains deadline | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: isOpen,` | `keeps one deadline across a menu-to-bound-bubble hand-off` |
| Equivalent bound-bubble broadcast retains deadline | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: isOpen && !completionBubbleVisible,` | `does not restart the epoch when a bound bubble appears while the menu stays open` |
| Existing bubble survives pref change | Replace `&& statusBubble.visible` with `&& prefs.enableStatusBubble && statusBubble.visible` | `keeps an already-visible bound bubble eligible after the preference is disabled` |
| Replacement removes eligibility | Delete `&& statusCompletionTransactionIdRef.current === completionTransactionId` | `removes bubble eligibility when unrelated feedback replaces it` |
| Generic bubble is not completion | Replace `&& statusCompletionTransactionIdRef.current === completionTransactionId` with `&& statusBubble.type !== 'default'` | `does not treat a generic visible status bubble as a completion surface` |
| Hidden tab resets | Delete `document.addEventListener('visibilitychange', handleVisibilityChange)` from `useVisibleCompletionAck.ts` | `requires a fresh full interval after the FAB document hides and returns` |
| Authoritative departure cancels | Replace both hook arguments with `transactionId: completionTransactionId ?? '0123456789abcdef0123456789abcdef',` and `surfaceVisible: true,` | `cancels every visible epoch on authoritative departure` |
| Fallback remains wall-clock | In the `next.kind === 'complete'` `showStatusBubble` call, replace the exact `10000,` argument immediately before `next.transactionId` with `16000,` | `lets a failed-ACK bubble expire and retries only after a fresh menu epoch` |
| Failed ACK retries only after a new menu epoch | Apply the mounted-only regression block above | `keeps completion visible after a failed ACK and retries only after a fresh visibility epoch` |
| Closed FAB cannot beat Options | Replace `surfaceVisible: completionSurfaceVisible,` with `surfaceVisible: completionTransactionId !== null,` | `lets visible Options win while a cold FAB remains closed` |

Record every row's named test, observed failed assertion, and restored GREEN result in the implementation handoff. Do not use source inspection or a test spy with no user-visible assertion as mutation evidence.

After restoring the last mutation, rerun the full focused FAB set:

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts src/components/FAB.update.test.tsx --reporter=verbose
```

Expected: both files PASS, confirming no temporary mutation remains.

- [ ] **Step 8: Inspect and commit**

```powershell
git diff --check -- "extension/src/components/FAB.tsx" "extension/src/components/FAB.update.test.tsx"
```

```powershell
git diff -- "extension/src/components/FAB.tsx" "extension/src/components/FAB.update.test.tsx"
```

```powershell
git add -- "extension/src/components/FAB.tsx" "extension/src/components/FAB.update.test.tsx"
```

```powershell
$expected=@('extension/src/components/FAB.tsx','extension/src/components/FAB.update.test.tsx');$actual=@(git diff --cached --name-only);if($actual.Count -ne $expected.Count -or (Compare-Object $expected $actual).Count){$actual;throw 'FAB commit path set is not exact'};git diff --cached --check;if($LASTEXITCODE -ne 0){throw 'FAB cached diff check failed'}
```

```powershell
git commit -m "fix(fab): require a visible completion surface"
```

### Task 4: Integrate Foreground Options Completion

**Files:**
- Modify: `extension/src/components/Options.tsx:1-75,840-870`
- Modify: `extension/src/components/Options.update.test.tsx:1-305`

- [ ] **Step 1: Add the same reversible visibility harness**

Task 3 is committed before this task begins, so `Options.update.test.tsx` may already exercise the shared hook indirectly through its imported `FAB`. This step changes only the Options test harness; do not edit `Options.tsx` before the Options-specific RED in Steps 2-3.

Add these declarations and helpers beside the existing constants in `Options.update.test.tsx`:

```typescript
let visibility: DocumentVisibilityState
let originalHiddenDescriptor: PropertyDescriptor | undefined
let originalVisibilityDescriptor: PropertyDescriptor | undefined

function setOptionsDocumentVisibility(next: DocumentVisibilityState): void {
  visibility = next
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

function restoreDocumentDescriptor(
  key: 'hidden' | 'visibilityState',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(document, key, descriptor)
  else delete (document as unknown as Record<string, unknown>)[key]
}
```

At the end of the existing `beforeEach`, install coherent getters:

```typescript
    visibility = 'visible'
    originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => visibility === 'hidden',
    })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
```

At the end of `afterEach`, after restoring real timers, restore an original own descriptor or delete the test-created own property when the original was inherited:

```typescript
    restoreDocumentDescriptor('hidden', originalHiddenDescriptor)
    restoreDocumentDescriptor('visibilityState', originalVisibilityDescriptor)
```

Then call `vi.restoreAllMocks()`.

Before adding the hidden-document RED, replace the existing `resolveState` helper with this deterministic version so every subsequent assertion observes the actual deferred response rather than a guessed number of microtasks:

```typescript
async function resolveState(
  deferred: ReturnType<typeof deferNextResponse>,
  updateState: unknown,
) {
  await act(async () => {
    deferred.resolve({ handled: true, state: updateState })
    await deferred.promise
  })
}
```

Run the unchanged Options file to prove the test-only harness edit is GREEN:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx --reporter=verbose
```

Expected: all pre-existing Options update tests PASS with no `act` warning.

- [ ] **Step 2: Write the hidden Options RED before production edits**

```typescript
  it('does not ACK complete while the Options document is hidden', async () => {
    vi.useFakeTimers()
    visibility = 'hidden'
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })
```

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx -t "does not ACK complete while the Options document is hidden" --reporter=verbose
```

Expected RED against the current direct timer: one ACK is sent from a hidden Options document.

- [ ] **Step 3: Add foreground/reset/departure tests before production edits**

The focused RED from Step 2 is already recorded, so this step expands the same pre-production Options RED suite before the single production integration in Step 4.

```typescript
  it('starts one full ACK interval for foreground complete Options', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('requires a fresh interval after Options foreground-background-foreground', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    setOptionsDocumentVisibility('hidden')
    act(() => vi.advanceTimersByTime(20_000))
    setOptionsDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels the foreground Options epoch on authoritative departure', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })
```

Run the complete Options file before editing production:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx --reporter=verbose
```

Replace the Options rejection/handled-false test's unmount/remount tail with this same-view hide/show sequence after the first result is settled. Replace `first.unmount()` through the final assertion and change `const first = renderOptions()` to `renderOptions()` so no unused binding remains:

```typescript
      setOptionsDocumentVisibility('hidden')
      setOptionsDocumentVisibility('visible')
      deferNextResponse('DH_UPDATE_ACK_COMPLETE')
      act(() => vi.advanceTimersByTime(7_999))
      expect(ackMessages()).toHaveLength(1)
      act(() => vi.advanceTimersByTime(1))
      expect(ackMessages()).toHaveLength(2)
      expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
```

Rename it to `keeps completion visible after a failed ACK and retries only after a fresh visibility epoch (%s)`. Also rename `keeps completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms` to `keeps foreground completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms`, and rename `keeps the original ACK deadline across an equivalent same-ID rebroadcast` to `keeps the original visible-epoch deadline across an equivalent same-ID rebroadcast`. Keep the existing response-authority, persisted-storage, transaction-replacement, and unmount tests; they now exercise the shared hook.

Rerun the complete Options file after these test-only edits and before production integration:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx --reporter=verbose
```

Expected RED: `does not ACK complete while the Options document is hidden`, `requires a fresh interval after Options foreground-background-foreground`, and both updated failed-ACK fresh-epoch cases fail because the current effect ignores document visibility and cannot start a same-view retry epoch. Foreground and authoritative-departure tests may already pass and are independently proven by their break-and-fail rows.

- [ ] **Step 4: Replace Options' direct ACK effect**

This production edit follows the hidden/reset Options RED run in Step 3. Do not make it earlier.

Add:

```typescript
import { useVisibleCompletionAck } from '../hooks/useVisibleCompletionAck';
```

Delete the direct `DH_UPDATE_ACK_COMPLETE` `useEffect` and call the hook unconditionally beside the completion projection:

```typescript
    useVisibleCompletionAck({
        transactionId: completionTransactionId,
        surfaceVisible: updateState.kind === 'complete',
    });
```

Document visibility remains inside the hook. Do not pass `document.visibilityState` as a prop and do not add an Options-owned listener.

- [ ] **Step 5: Run focused GREEN and TypeScript**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts src/components/FAB.update.test.tsx src/components/Options.update.test.tsx --reporter=verbose
```

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

Cross-view coverage is intentionally compositional because one jsdom `document` cannot be foreground for FAB and background for Options simultaneously: `does not ACK complete while the Options document is hidden` proves the hidden-Options half, FAB's bound/menu tests prove visible-FAB eligibility, `lets visible Options win while a cold FAB remains closed` proves the inverse direction, and the existing simultaneous-visible tests plus `updateRuntime.test.ts` prove cancellation/idempotence after the first authoritative winner.

- [ ] **Step 6: Perform Options break-and-fail checks**

These component rows mutate only Options integration. Hook-level document visibility/reset and transaction-departure mutations were already proven in Task 2; do not mutate the shared hook again here.

For the two mounted-only regression rows below, replace the complete `useVisibleCompletionAck({...});` call with this exact compile-ready block, then restore it before the next row:

```typescript
    useEffect(() => {
        if (completionTransactionId === null) return;
        const timeoutId = setTimeout(() => {
            void chrome.runtime.sendMessage({
                type: 'DH_UPDATE_ACK_COMPLETE',
                transactionId: completionTransactionId,
            }).catch(() => undefined);
        }, 8000);
        return () => clearTimeout(timeoutId);
    }, [completionTransactionId]);
```

| Observable invariant | One temporary mutation | Test that must fail |
|---|---|---|
| Foreground starts | Replace `surfaceVisible: updateState.kind === 'complete',` with `surfaceVisible: false,` | `starts one full ACK interval for foreground complete Options` |
| Background cannot consume | Apply the mounted-only regression block above | `does not ACK complete while the Options document is hidden` |
| Hidden interval resets | Apply the mounted-only regression block above | `requires a fresh interval after Options foreground-background-foreground` |
| Failed ACK retries only after a fresh foreground epoch | Apply the mounted-only regression block above | `keeps completion visible after a failed ACK and retries only after a fresh visibility epoch` |
| Departure cancels | Replace both hook arguments with `transactionId: completionTransactionId ?? '0123456789abcdef0123456789abcdef',` and `surfaceVisible: true,` | `cancels the foreground Options epoch on authoritative departure` |

Run one named test per mutation, record its observed assertion failure, restore, and rerun GREEN. For an `it.each` row, the displayed prefix intentionally selects both `rejected` and `handled-false` cases. Do not combine mutations.

Use this command form with the row's literal test name in place of the example; require exit code `1` while mutated and `0` after restoration:

```powershell
npm --prefix extension exec -- vitest run --root extension src/components/Options.update.test.tsx -t "does not ACK complete while the Options document is hidden" --reporter=verbose
```

After restoring the last mutation, rerun the full focused component set:

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts src/components/FAB.update.test.tsx src/components/Options.update.test.tsx --reporter=verbose
```

Expected: all three files PASS, confirming no temporary mutation remains.

- [ ] **Step 7: Inspect and commit**

```powershell
git diff --check -- "extension/src/components/Options.tsx" "extension/src/components/Options.update.test.tsx"
```

```powershell
git diff -- "extension/src/components/Options.tsx" "extension/src/components/Options.update.test.tsx"
```

```powershell
git add -- "extension/src/components/Options.tsx" "extension/src/components/Options.update.test.tsx"
```

```powershell
$expected=@('extension/src/components/Options.tsx','extension/src/components/Options.update.test.tsx');$actual=@(git diff --cached --name-only);if($actual.Count -ne $expected.Count -or (Compare-Object $expected $actual).Count){$actual;throw 'Options commit path set is not exact'};git diff --cached --check;if($LASTEXITCODE -ne 0){throw 'Options cached diff check failed'}
```

```powershell
git commit -m "fix(options): require foreground completion visibility"
```

### Task 5: Update Product Documentation And Authority Notices

**Files:**
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DEVELOPER_GUIDE.md`
- Modify: `README.md`
- Modify: `USER_GUIDE.md`
- Modify: `docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md`
- Modify: `docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md`
- Modify: `docs/superpowers/plans/2026-09-04-one-shot-update-completion.md`
- Modify: `docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Do not modify: `docs/plan-d-pragmatic-cloud-pc-runbook.md`
- Do not modify: `docs/plan-d-pragmatic-cloud-pc-results.md`

- [ ] **Step 1: Add exact design amendment notices**

Immediately below the title in each older design, add this notice. The link is correct because all three files are in `docs/superpowers/specs`:

```markdown
> **Amended by (2026-09-05):**
> [Visible Update Completion Design](2026-09-05-visible-update-completion-design.md).
> That amendment replaces mounted-time acknowledgment with eight continuous
> visible seconds and makes committed-B2 recovery the only Scenario 2 PASS.
> Conflicting behavior or qualification text below is historical context.
```

- [ ] **Step 2: Add exact execution-authority notices to the older plans**

Immediately below each older plan title, add:

```markdown
> **Current amendment authority (2026-09-05):** Product implementation is
> governed by `docs/superpowers/plans/2026-09-05-visible-update-completion.md`.
> Destructive qualification remains deferred. A smaller post-implementation
> qualification design/plan must be written after product implementation and
> independent review, pending separate user approval.
```

In `2026-09-03-plan-d-pragmatic-delivery-gate.md`, replace the paragraph beginning `Current authority is Task 5 of` with this exact text. Do not add or duplicate any cloud, installer, process, or cleanup command:

```markdown
Current product implementation authority is
`docs/superpowers/plans/2026-09-05-visible-update-completion.md`.
Destructive qualification is not authorized by this historical record. It needs
a smaller post-implementation qualification design/plan, pending separate user
approval. Only after approval may that future work update and commit the runbook
before any qualification run.
```

In `2026-09-04-one-shot-update-completion.md`, keep Task 5's operational commands but insert this exact notice immediately below `### Task 5: Prepare And Qualify \`2.0.76-beta.2\``. Product Task 5 does not itself rewrite destructive commands:

```markdown
> **Superseded Scenario 2 procedure:** Do not execute this historical Task 5.
> Its Scenario 2 state machine must be redesigned after visible-completion
> product implementation and independent review are complete. A smaller
> post-implementation qualification design/plan is pending separate user approval;
> only after approval may that future work update and commit
> `docs/plan-d-pragmatic-cloud-pc-runbook.md`. Versioning, artifact creation,
> installation, and qualification still require their own approval.
```

- [ ] **Step 3: Replace product mounted-time wording precisely**

In `AGENTS.md`, replace the **Completion UI authority** paragraph with these contracts:

- completion requires eight continuous seconds of an actually visible surface in a foreground document;
- FAB eligibility is exactly open terminal menu OR visible bubble bound to the current completion transaction;
- the red dot and generic bubbles are not completion surfaces;
- Options eligibility is its rendered `complete` status in a visible document;
- hide/close resets elapsed time; equivalent state and an aggregate-visible hand-off do not;
- each epoch attempts once, and transport failure can retry only after a later fresh epoch;
- the response is ignored and only a Service Worker broadcast changes UI.

Use this exact replacement paragraph:

```markdown
* **Completion UI authority:** FAB and Options render terminal completion
  immediately, but acknowledge only after eight continuous visible seconds in a
  foreground document. FAB eligibility is the open terminal banner OR an
  actually visible Status bubble bound to the current completion transaction;
  the closed red dot and unrelated bubbles never count. Options eligibility is
  its rendered `complete` status while the document is visible. Hiding the
  document or the last qualifying surface ends the epoch and discards elapsed
  time; an aggregate-visible menu/bubble hand-off and equivalent same-ID state
  do not restart it. Each epoch attempts one exact ACK; transport failure may
  retry only after a later fresh epoch. The UI never owns update storage,
  optimistically hides completion, or applies the ACK response. Only the Service
  Worker's persisted `DH_UPDATE_STATE` broadcast is live authority.
```

In `ARCHITECTURE.md`, replace numbered step 8 with:

```markdown
8. **Consume once:** A foreground FAB or Options completion surface must remain
   visible for eight continuous seconds before sending exact
   `{type:'DH_UPDATE_ACK_COMPLETE',transactionId}`. Hidden/closed time is
   discarded. The Worker serializes and persists the matching transition before
    broadcasting it: committed becomes `idle` with no candidate URL; rolled-back
    becomes `available` with the same candidate and ordinary Retry in versions
    supporting this completion protocol. Older B1 is not qualified for this
    rollback/Retry behavior.
```

Replace the later FAB/Options completion paragraph with:

```markdown
FAB and Options display `complete` immediately. `useVisibleCompletionAck` treats
one transaction's maximal continuous aggregate-visible interval as an epoch.
FAB supplies open terminal menu OR exact transaction-bound visible completion
bubble; Options supplies rendered completion, and both also require a visible
document. A false transition discards elapsed time, while equivalent state and
an aggregate-visible hand-off retain the deadline. Each epoch attempts once;
failure may retry only after a later false-to-true transition. Views ignore ACK
responses, so only the authoritative `DH_UPDATE_STATE` broadcast changes UI and
simultaneous visible winners remain idempotent. The FAB bubble's ten-second
fallback remains wall-clock based and never affects unrelated bubbles.
```

Under **Key Files**, immediately before the existing `FAB.tsx` / `Options.tsx` bullet, add:

```markdown
* **`extension/src/hooks/useVisibleCompletionAck.ts`**: Shared visible-epoch,
  timer, and ACK-transport boundary used by FAB and Options.
```

In `DEVELOPER_GUIDE.md`, replace the mounted-timer paragraphs under **One-shot completion lifecycle** with:

```markdown
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
```

In `README.md`, replace its existing **Reliable Updates** paragraph with:

```markdown
Update progress is durable across Service Worker and Extension restarts. A
terminal update or rollback is re-verified and finalized before success is
reported. Its result is consumed only after eight continuous visible seconds in
an open FAB terminal menu, its exact transaction-bound completion Status bubble,
or foreground Options. Switching tabs or closing the only qualifying surface
starts the full interval over; the closed-FAB red dot and unrelated messages do
not count, and Status bubble is never forced on. A rollback then returns to the
ordinary Retry action only in versions supporting this completion protocol;
older B1 is not qualified for this rollback/Retry behavior. Mixed or unrecoverable
installations show persistent guidance to run the matching full installer.
Standalone bootstrap and per-write power-loss guarantees remain deferred, so an
extreme interruption may still require that installer.
```

In `USER_GUIDE.md`, use the existing `## Updates` / `### Automatic Updates` section (currently lines 298-326). Replace only step 6 and the immediately following paragraph (currently lines 312-319) with the text below. Keep steps 1-5, both existing headings, and the matching-installer paragraph beginning `If the installed Host and Extension do not match` (currently lines 321-326) intact. Do not add another heading or section:

```markdown
6. The terminal result is acknowledged only after eight continuous visible
   seconds in a foreground document: an open FAB menu showing its terminal
   banner, a visible Status bubble bound to that completion transaction, or the
   visible Options completion status. Hiding the document or closing the last
   qualifying surface discards elapsed time; showing a qualifying surface again
   starts a full new interval. Hidden time never counts. The closed-FAB red dot
   and unrelated bubbles do not count, and Dynamics Helper never forces Status
   bubble on to acknowledge an update.

If acknowledgment fails, the notice remains until an authoritative Service
Worker update-state broadcast changes it. There is no same-epoch ACK retry;
hide/show or close/reopen the last qualifying surface to start a fresh interval.
After a committed update is acknowledged, the updater returns to idle with no
private candidate address. After rollback, acknowledgment restores the same
candidate as the ordinary **Retry** action only in versions supporting this
completion protocol. Older B1 is not qualified for this rollback/Retry behavior.
```

- [ ] **Step 4: Update release-note wording without claiming qualification**

Replace the paragraph beginning `Terminal completion is now one-shot and transaction-bound.` with:

```markdown
Terminal completion is transaction-bound and consumed only after eight
continuous visible seconds. A foreground Options status, an open FAB terminal
banner, or the exact transaction-bound FAB completion bubble can acknowledge it;
background tabs, a closed FAB red dot, and unrelated bubbles cannot. Visibility
loss starts the interval over, and an ACK transport failure gets no same-epoch
retry. Beta2 artifact creation and destructive cloud-PC qualification remain
deferred. A smaller post-implementation qualification design/plan must be written
after product implementation and independent review, pending separate user
approval.
```

Do not add Scenario 2 commands or claim a B2 artifact, build, qualification, tag, or release exists.

- [ ] **Step 5: Run exact documentation guards**

```powershell
$paths=@('AGENTS.md','ARCHITECTURE.md','DEVELOPER_GUIDE.md','README.md','USER_GUIDE.md','releases/notes-prompt-scope-cleanup-draft.md');$accepted='(?i)(?:(?:eight|8)\s+(?:continuous(?:ly)?|uninterrupted)\s+visible\s+seconds|visible\s+for\s+(?:eight|8)\s+continuous\s+seconds)';foreach($path in $paths){$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));if($text -notmatch $accepted){throw "Missing approved visible-duration wording: $path"}}
```

```powershell
$paths=@('AGENTS.md','ARCHITECTURE.md','DEVELOPER_GUIDE.md','README.md','USER_GUIDE.md','releases/notes-prompt-scope-cleanup-draft.md');$bad=Select-String -LiteralPath $paths -Pattern 'eight seconds of (?:actual )?mounted|eight-second mounted-time|8 mounted seconds|8 mounted|remains mounted for (?:8|eight) seconds|mounted FAB or Options view|while mounted on the same transaction|mounted view retains the same transaction for eight seconds|first view mounted on it for eight seconds|remains open for (?:8|eight) seconds|pauses consumption';if($bad){$bad;throw 'Stale mounted-time completion wording remains in product docs'}
```

```powershell
$needle='2026-09-05-visible-update-completion-design.md';foreach($path in @('docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md','docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md')){$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));if(-not $text.Contains('Amended by (2026-09-05)') -or -not $text.Contains($needle)){throw "Missing design amendment notice: $path"}}
```

```powershell
foreach($path in @('docs/superpowers/plans/2026-09-04-one-shot-update-completion.md','docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md')){$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));$notice=[regex]::Match($text,'(?m)^> \*\*Current amendment authority \(2026-09-05\):\*\*[^\r\n]*(?:\r?\n>[^\r\n]*)*').Value;$notice=$notice -replace '\r?\n>\s*',' ';foreach($needle in @('2026-09-05-visible-update-completion.md','Destructive qualification remains deferred.','smaller post-implementation qualification design/plan','pending separate user approval')){if(-not $notice.Contains($needle)){throw "Missing product authority or deferred qualification notice in $path"}}}
```

```powershell
$paths=@('docs/superpowers/plans/2026-09-04-one-shot-update-completion.md','docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md');foreach($path in $paths){$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));$matches=[regex]::Matches($text,'(?ms)^```powershell\s*\r?\n(?<code>.*?)^```\s*$');$opens=[regex]::Matches($text,'(?m)^```powershell\s*$').Count;if($matches.Count -ne $opens){throw "Unterminated PowerShell fence: $path"};for($i=0;$i -lt $matches.Count;$i++){$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput($matches[$i].Groups['code'].Value,[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){$errors|ForEach-Object{$_.ToString()};throw "PowerShell fence $($i+1) failed to parse: $path"}}}
```

```powershell
$paths=@('releases/notes-prompt-scope-cleanup-draft.md');if(Select-String -LiteralPath $paths -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found in release evidence wording'}
```

```powershell
$forbidden=@('docs/plan-d-pragmatic-cloud-pc-runbook.md','docs/plan-d-pragmatic-cloud-pc-results.md');$changed=@(git diff --name-only);foreach($path in $forbidden){if($changed -contains $path){throw "Qualification file changed in product plan: $path"}}
```

```powershell
$allowed=@('AGENTS.md','ARCHITECTURE.md','DEVELOPER_GUIDE.md','README.md','USER_GUIDE.md','docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md','docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md','docs/superpowers/plans/2026-09-04-one-shot-update-completion.md','docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md','releases/notes-prompt-scope-cleanup-draft.md');$actual=@(git diff --name-only);$unexpected=@($actual|Where-Object{$_ -notin $allowed});if($unexpected.Count){$unexpected;throw 'Task 5 changed an unowned path'};git diff --check -- $allowed;if($LASTEXITCODE -ne 0){throw 'Product documentation diff check failed'}
```

- [ ] **Step 6: Inspect and commit exactly the product docs**

```powershell
git diff -- "AGENTS.md" "ARCHITECTURE.md" "DEVELOPER_GUIDE.md" "README.md" "USER_GUIDE.md" "docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md" "docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md" "docs/superpowers/plans/2026-09-04-one-shot-update-completion.md" "docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md" "releases/notes-prompt-scope-cleanup-draft.md"
```

```powershell
git add -- "AGENTS.md" "ARCHITECTURE.md" "DEVELOPER_GUIDE.md" "README.md" "USER_GUIDE.md" "docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md" "docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md" "docs/superpowers/plans/2026-09-04-one-shot-update-completion.md" "docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md" "releases/notes-prompt-scope-cleanup-draft.md"
```

```powershell
$expected=@('AGENTS.md','ARCHITECTURE.md','DEVELOPER_GUIDE.md','README.md','USER_GUIDE.md','docs/superpowers/plans/2026-09-03-plan-d-pragmatic-delivery-gate.md','docs/superpowers/plans/2026-09-04-one-shot-update-completion.md','docs/superpowers/specs/2026-09-03-plan-d-pragmatic-delivery-gate-design.md','docs/superpowers/specs/2026-09-04-one-shot-update-completion-design.md','releases/notes-prompt-scope-cleanup-draft.md');$actual=@(git diff --cached --name-only);if($actual.Count -ne $expected.Count -or (Compare-Object $expected $actual).Count){$actual;throw 'Product-doc commit path set is not exact'};git diff --cached --check;if($LASTEXITCODE -ne 0){throw 'Product-doc cached diff check failed'}
```

```powershell
git commit -m "docs(update): document visible completion epochs"
```

### Task 6: Full Verification, Independent Reviews, And Versioning Stop

**Files:**
- Modify only by returning a finding to its owning Task 1-5 and creating that task's explicitly scoped follow-up commit. Do not use a catch-all staging command.

- [ ] **Step 1: Run update-focused Extension tests**

```powershell
npm --prefix extension exec -- vitest run --root extension src/hooks/useVisibleCompletionAck.test.ts src/background/updateRuntime.test.ts src/background/serviceWorker.update.test.ts src/components/FAB.update.test.tsx src/components/Options.update.test.tsx src/content/updateErrorBridge.test.ts src/background/analyzeRequestHandler.test.ts --reporter=verbose
```

Expected: all listed files pass with no unhandled rejection or React act warning.

- [ ] **Step 2: Run TypeScript and the full Extension suite**

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

```powershell
npm --prefix extension run test:run
```

Expected: TypeScript emits no diagnostics and every Extension test passes.

- [ ] **Step 3: Run the permitted local Extension production build**

```powershell
npm --prefix extension run build
```

Expected: default-item source checks, TypeScript, Vite build, and source/dist item-copy check pass. This may update ignored `extension/dist`; it is verification only. Do not call Host build, PyInstaller, package creation, or any B2/release command.

- [ ] **Step 4: Run the Host regression suite without building a Host**

```powershell
& "host/venv/Scripts/python.exe" -m unittest discover host
```

Expected: all Host tests pass, with only documented environment-gated skips. No Host executable is built.

- [ ] **Step 5: Run final static and scope checks**

```powershell
git diff --check
```

```powershell
$path='docs/superpowers/plans/2026-09-05-visible-update-completion.md';$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));$blocks=[regex]::Matches($text,'(?ms)^```powershell\s*\r?\n(?<code>.*?)^```\s*$');$opens=[regex]::Matches($text,'(?m)^```powershell\s*$').Count;if($blocks.Count -ne $opens){throw "Unterminated PowerShell fence: $path"};for($i=0;$i -lt $blocks.Count;$i++){$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput($blocks[$i].Groups['code'].Value,[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){throw "PowerShell fence $($i+1) failed to parse: $path"}}
```

```powershell
$path='extension/src/background/serviceWorker.update.test.ts';$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));if(([regex]::Matches($text,"const importing = import\('./serviceWorker'\)")).Count -ne 0 -or ([regex]::Matches($text,"const worker = await import\('./serviceWorker'\)")).Count -ne 5){throw 'Final Service Worker import shape is not 5 direct / 0 deferred'}
```

```powershell
$planCommit=([string](git log --format='%H' --grep='^docs(plan): add visible completion implementation plan$' -1)).Trim();if($planCommit -notmatch '^[0-9a-f]{40}$'){throw 'Plan commit is missing'};$forbidden=@('extension/package.json','extension/manifest.json','host/product_info.py','docs/plan-d-pragmatic-cloud-pc-runbook.md','docs/plan-d-pragmatic-cloud-pc-results.md');$changed=@(git diff "$planCommit..HEAD" --name-only)+@(git diff --name-only);foreach($path in $forbidden){if($changed -contains $path){throw "Forbidden product-plan path changed: $path"}}
```

```powershell
git status --short
```

Expected: no version carrier or qualification runbook/ledger change and no uncommitted tracked source/docs changes. If `git status --short` lists unrelated concurrent work, report it without modifying it; if it lists any Task 1-5 owned path, return to the owning task and commit the correction before review. Ignored local build output need not appear.

```powershell
$path='docs/superpowers/plans/2026-09-05-visible-update-completion.md';$terms=@(('T'+'BD'),('T'+'ODO'),('implement'+' later'),('fill'+' in'),('similar'+' to'),('place'+'holder'),('FIX'+'ME'));$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $path));foreach($term in $terms){if($text.Contains($term)){throw "Incomplete-plan marker remains in ${path}: $term"}}
```

Expected: no output.

- [ ] **Step 6: Request two independent reviews**

Request one spec-compliance review against `docs/superpowers/specs/2026-09-05-visible-update-completion-design.md` and one code-quality/test review. Both must inspect the complete Task 1-5 commit range, TDD evidence, StrictMode test, same-state visibility event, descriptor fallback, mutation table results, docs guards, and the prohibition on qualification mutations.

For each Critical or Important finding, return to its owning task, add a failing focused test first for behavior findings, observe RED, make the smallest correction, rerun focused and full checks, stage only that task's exact paths using its existing `git add` command, and create a new commit with the same subject plus ` review fix`. Do not amend or combine unrelated findings.

- [ ] **Step 7: Stop before versioning**

Report the implementation commits, fresh focused/full test counts, TypeScript result, local Extension build result, Host-suite result, review dispositions, and remaining qualification dependency. Do not change `extension/package.json`, `extension/manifest.json`, or `host/product_info.py`; do not build/package B2. Stop here: a smaller post-implementation qualification design/plan must be written from the final reviewed code, pending separate user approval. This product plan does not authorize qualification preparation or execution.
