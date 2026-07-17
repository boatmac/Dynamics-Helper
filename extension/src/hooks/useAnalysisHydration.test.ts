// Tests for useAnalysisHydration — FAB re-hydration on mount.
//
// Maps to spec invariants R-I1..R-I5 in
// docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md § 5.
//
// Strategy: the hook owns the read side of analysisStore. Testing it in
// isolation via renderHook (instead of rendering full FAB) avoids the
// DOM-scraping/MutationObserver/telemetry surface that makes FAB-level
// tests brittle. Task 4 wires the hook into FAB; that wiring is a
// 3-line consumption, code-reviewed not unit-tested.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
    chromeMockSpies,
    deferNextStorageGet,
    deferNextStorageSet,
    emitStorageChanges,
    getStorageSnapshot,
    installChromeMock,
    resetChromeMock,
    seedStorage,
} from '../test/chromeMock'
import {
    clearPendingIfMatches,
    markSeen,
    recordAnalyzeStart,
    resetAnalysisState,
    seenAnalysisKey,
    STALE_WINDOW_MS,
    MAX_PENDING_DISPLAY_AGE_MS,
    pendingAnalysisKey,
} from '../utils/analysisStore'
import type { LastAnalysis, PendingAnalysis } from '../utils/analysisStore'
import { useAnalysisHydration } from './useAnalysisHydration'

installChromeMock()

const CASE_A = '1234567890123456'
const CASE_B = '9999999999999999'

function makeLast(overrides: Partial<LastAnalysis> = {}): LastAnalysis {
    return {
        caseNumber: CASE_A,
        status: 'success',
        title: '🤖 Copilot Analyze',
        content: '# Report\nBody',
        timestamp: Date.now(),
        seen: false,
        requestId: 'req-A',
        savedTo: 'C:\\path\\dh_case_report.md',
        ...overrides,
    }
}

function makePending(overrides: Partial<PendingAnalysis> = {}): PendingAnalysis {
    return {
        caseNumber: CASE_A,
        requestId: 'req-A',
        startTime: Date.now(),
        ...overrides,
    }
}

describe('useAnalysisHydration — FAB re-hydration', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    afterEach(() => {
        resetChromeMock()
    })

    // R-I1: matching unseen fresh result auto-opens popover.
    it('R-I1: matching unseen result inside stale window opens popover', async () => {
        seedStorage({ dh_last_analysis: makeLast() })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await waitFor(() => {
            expect(result.current.popover).not.toBeNull()
        })
        expect(result.current.popover).toMatchObject({
            isOpen: true,
            title: '🤖 Copilot Analyze',
            content: '# Report\nBody',
            status: 'success',
            savedTo: 'C:\\path\\dh_case_report.md',
            identity: {
                requestId: 'req-A',
                caseNumber: CASE_A,
                timestamp: expect.any(Number),
            },
        })
    })

    // R-I2: dismiss writes a separate identity acknowledgement. The result
    // remains immutable and a re-mount does not auto-open it.
    it('R-I2: dismissPopover acknowledges A separately; remount does not auto-open', async () => {
        seedStorage({ dh_last_analysis: makeLast() })

        const first = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(first.result.current.popover).not.toBeNull())

        await act(async () => {
            await (first.result.current.dismissPopover as any)(
                first.result.current.popover!.identity,
            )
        })

        // The last result is not rewritten; the separate identity is stored.
        const stored = await chrome.storage.local.get('dh_last_analysis')
        expect((stored.dh_last_analysis as LastAnalysis).seen).toBe(false)
        expect(getStorageSnapshot()[seenAnalysisKey({
            requestId: 'req-A',
            caseNumber: CASE_A,
        })]).toEqual({
            requestId: 'req-A',
            caseNumber: CASE_A,
            timestamp: expect.any(Number),
        })
        expect(first.result.current.popover).toBeNull()

        // Fresh mount on the same case must not re-open.
        first.unmount()
        const second = renderHook(() => useAnalysisHydration(CASE_A))
        // Give the hook a tick to do its async read.
        await new Promise((r) => setTimeout(r, 20))
        expect(second.result.current.popover).toBeNull()
    })

    // R-I3: case mismatch → no auto-open even if fresh and unseen.
    it('R-I3: non-matching caseNumber does not open popover', async () => {
        seedStorage({ dh_last_analysis: makeLast({ caseNumber: CASE_B }) })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await new Promise((r) => setTimeout(r, 20))
        expect(result.current.popover).toBeNull()
    })

    // R-I4: result older than STALE_WINDOW_MS → ignored on read.
    it('R-I4: stale result older than STALE_WINDOW_MS does not open popover', async () => {
        seedStorage({
            dh_last_analysis: makeLast({
                timestamp: Date.now() - STALE_WINDOW_MS - 1000,
            }),
        })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await new Promise((r) => setTimeout(r, 20))
        expect(result.current.popover).toBeNull()
    })

    // R-I5: matching pending marker → isAnalyzing=true.
    it('R-I5: matching request-scoped pending sets isAnalyzing=true', async () => {
        const pending = makePending()
        seedStorage({ [pendingAnalysisKey(pending.requestId)]: pending })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await waitFor(() => {
            expect(result.current.isAnalyzing).toBe(true)
        })
    })

    // R-I5 negative: pending marker for a different case → isAnalyzing=false.
    it('R-I5 (negative): pending for different case does not set isAnalyzing', async () => {
        seedStorage({ dh_pending_analysis: makePending({ caseNumber: CASE_B }) })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await new Promise((r) => setTimeout(r, 20))
        expect(result.current.isAnalyzing).toBe(false)
    })

    // R-I5 stale pending: marker older than MAX_PENDING_DISPLAY_AGE_MS is
    // ignored on read (edge 6.4 — spinner doesn't show forever).
    it('R-I5 (stale): pending older than MAX_PENDING_DISPLAY_AGE_MS is ignored', async () => {
        seedStorage({
            dh_pending_analysis: makePending({
                startTime: Date.now() - MAX_PENDING_DISPLAY_AGE_MS - 1000,
            }),
        })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await new Promise((r) => setTimeout(r, 20))
        expect(result.current.isAnalyzing).toBe(false)
    })

    // Error-status results re-hydrate the same way as success — they were
    // the original motivating use case (4-second-bubble-only error UX).
    it('error-status result auto-opens with status=error and title=errorTitle', async () => {
        seedStorage({
            dh_last_analysis: makeLast({
                status: 'error',
                title: '❌ Analysis Failed',
                content: 'Copilot request timed out after 600.0 seconds.',
                savedTo: undefined,
            }),
        })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await waitFor(() => {
            expect(result.current.popover).not.toBeNull()
        })
        expect(result.current.popover).toMatchObject({
            isOpen: true,
            status: 'error',
            title: '❌ Analysis Failed',
            content: 'Copilot request timed out after 600.0 seconds.',
        })
    })

    it('selects the newest fresh matching pending among multiple requests', async () => {
        const older = makePending({ requestId: 'req-old', startTime: Date.now() - 1000 })
        const newer = makePending({ requestId: 'req-new', startTime: Date.now() })
        const otherCase = makePending({
            caseNumber: CASE_B,
            requestId: 'req-other',
            startTime: Date.now() + 1000,
        })
        seedStorage({
            [pendingAnalysisKey(older.requestId)]: older,
            [pendingAnalysisKey(newer.requestId)]: newer,
            [pendingAnalysisKey(otherCase.requestId)]: otherCase,
        })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(result.current.isAnalyzing).toBe(true))
        expect(result.current.pending?.requestId).toBe('req-new')
    })

    it('keeps legacy singleton pending read compatibility', async () => {
        seedStorage({ dh_pending_analysis: makePending() })
        const { result } = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(result.current.isAnalyzing).toBe(true))
        expect(result.current.pending?.requestId).toBe('req-A')
    })

    it('mirrors a request-scoped pending removal to isAnalyzing=false', async () => {
        const pending = makePending()
        const key = pendingAnalysisKey(pending.requestId)
        seedStorage({ [key]: pending })
        const hook = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(hook.result.current.isAnalyzing).toBe(true))

        act(() => emitStorageChanges({
            [key]: { oldValue: pending, newValue: undefined },
        }))

        await waitFor(() => expect(hook.result.current.isAnalyzing).toBe(false))
        expect(hook.result.current.pending).toBeNull()
    })

    it('expires a hydrated pending marker while the hook remains mounted', async () => {
        vi.useFakeTimers()
        const now = new Date('2026-07-17T00:00:00.000Z')
        vi.setSystemTime(now)
        const pending = makePending({
            startTime: now.getTime() - MAX_PENDING_DISPLAY_AGE_MS + 10,
        })
        seedStorage({ [pendingAnalysisKey(pending.requestId)]: pending })
        const hook = renderHook(() => useAnalysisHydration(CASE_A))
        await act(async () => { await Promise.resolve() })
        expect(hook.result.current.isAnalyzing).toBe(true)

        act(() => vi.advanceTimersByTime(12))

        expect(hook.result.current.isAnalyzing).toBe(false)
        expect(hook.result.current.pending).toBeNull()
        hook.unmount()
        vi.useRealTimers()
    })

    it('an A acknowledgement ordered after newer B cannot rewrite B or its error code', async () => {
        const displayed = makeLast({
            requestId: 'req-A',
            errorCode: 'dh_core_prompt_missing',
        })
        seedStorage({ dh_last_analysis: displayed })
        const delayedAck = deferNextStorageSet()
        const marking = markSeen({
            caseNumber: CASE_A,
            requestId: 'req-A',
            timestamp: displayed.timestamp,
        })
        await act(async () => undefined)

        seedStorage({
            dh_last_analysis: makeLast({
                requestId: 'req-B',
                timestamp: displayed.timestamp + 1,
                errorCode: 'repository_instructions_missing',
            }),
        })
        await act(async () => delayedAck.resolve(undefined))
        await marking

        const stored = await chrome.storage.local.get('dh_last_analysis')
        expect(stored.dh_last_analysis).toMatchObject({
            requestId: 'req-B',
            seen: false,
            errorCode: 'repository_instructions_missing',
        })
        expect(getStorageSnapshot()[seenAnalysisKey({
            requestId: 'req-A',
            caseNumber: CASE_A,
        })]).toMatchObject({
            requestId: 'req-A',
            caseNumber: CASE_A,
        })
    })

    it('keeps A and B acknowledgements independently when A is acknowledged last', async () => {
        await markSeen({ caseNumber: CASE_B, requestId: 'req-B', timestamp: 2 })
        await markSeen({ caseNumber: CASE_A, requestId: 'req-A', timestamp: 1 })

        const snapshot = getStorageSnapshot()
        expect(snapshot[seenAnalysisKey({ caseNumber: CASE_A, requestId: 'req-A' })]).toBeDefined()
        expect(snapshot[seenAnalysisKey({ caseNumber: CASE_B, requestId: 'req-B' })]).toBeDefined()
    })

    it('a previously acknowledged B result does not reopen after A is acknowledged', async () => {
        await markSeen({ caseNumber: CASE_B, requestId: 'req-B', timestamp: 2 })
        await markSeen({ caseNumber: CASE_A, requestId: 'req-A', timestamp: 1 })
        seedStorage({ dh_last_analysis: makeLast({ caseNumber: CASE_B, requestId: 'req-B' }) })

        const hook = renderHook(() => useAnalysisHydration(CASE_B))
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(hook.result.current.popover).toBeNull()
    })

    it('uses a deterministic per-identity key for legacy acknowledgements', async () => {
        const legacy = { caseNumber: CASE_A, timestamp: 12345 }
        await markSeen(legacy)
        expect(getStorageSnapshot()[seenAnalysisKey(legacy)]).toEqual(legacy)
    })

    it('hydrates last, pending, and seen from one coherent batched snapshot', async () => {
        const lastA = makeLast({ requestId: 'req-A', timestamp: 1 })
        const lastB = makeLast({ requestId: 'req-B', timestamp: Date.now() })
        chromeMockSpies.storageGet
            .mockResolvedValueOnce({
                dh_last_analysis: lastB,
                dh_pending_analysis: makePending({ requestId: 'req-B' }),
                dh_seen_analysis: {
                    caseNumber: CASE_A,
                    requestId: 'req-A',
                    timestamp: 1,
                },
            })

        const hook = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(hook.result.current.popover?.identity.requestId).toBe('req-B'))
        expect(hook.result.current.isAnalyzing).toBe(true)
        expect(chromeMockSpies.storageGet).toHaveBeenCalledTimes(1)
        expect(chromeMockSpies.storageGet).toHaveBeenCalledWith(null)
    })

    it('serializes A conditional clear with a newer B pending write', async () => {
        seedStorage({ dh_pending_analysis: makePending({ requestId: 'req-A' }) })
        const delayedRead = deferNextStorageGet('dh_pending_analysis')
        const clearA = clearPendingIfMatches('req-A')
        await act(async () => undefined)
        const startB = recordAnalyzeStart({
            caseNumber: CASE_B,
            requestId: 'req-B',
            successTitle: 'success',
            errorTitle: 'error',
        })
        await act(async () => delayedRead.resolve(undefined))
        await Promise.all([clearA, startB])

        expect(getStorageSnapshot()[pendingAnalysisKey('req-B')]).toMatchObject({
            caseNumber: CASE_B,
            requestId: 'req-B',
        })
    })

    it('A completion removes only A after a simulated worker queue restart', async () => {
        const startA = recordAnalyzeStart({
            caseNumber: CASE_A,
            requestId: 'req-A',
            successTitle: 'success',
            errorTitle: 'error',
        })
        const startB = recordAnalyzeStart({
            caseNumber: CASE_B,
            requestId: 'req-B',
            successTitle: 'success',
            errorTitle: 'error',
        })
        await Promise.all([startA, startB])

        await clearPendingIfMatches('req-A')

        const snapshot = getStorageSnapshot()
        expect(snapshot).not.toHaveProperty(pendingAnalysisKey('req-A'))
        expect(snapshot[pendingAnalysisKey('req-B')]).toMatchObject({
            caseNumber: CASE_B,
            requestId: 'req-B',
        })
    })

    it('request-scoped keys survive A/B interleaving across module reloads', async () => {
        vi.resetModules()
        const workerA = await import('../utils/analysisStore')
        await workerA.recordAnalyzeStart({
            caseNumber: CASE_A,
            requestId: 'req-A-reload',
            successTitle: 'success',
            errorTitle: 'error',
        })
        vi.resetModules()
        const workerB = await import('../utils/analysisStore')
        await workerB.recordAnalyzeStart({
            caseNumber: CASE_B,
            requestId: 'req-B-reload',
            successTitle: 'success',
            errorTitle: 'error',
        })
        vi.resetModules()
        const workerAResponse = await import('../utils/analysisStore')
        await workerAResponse.clearPendingIfMatches('req-A-reload')

        const snapshot = getStorageSnapshot()
        expect(snapshot).not.toHaveProperty(pendingAnalysisKey('req-A-reload'))
        expect(snapshot[pendingAnalysisKey('req-B-reload')]).toMatchObject({
            caseNumber: CASE_B,
            requestId: 'req-B-reload',
        })
    })

    it('encodes request IDs without seen-key collisions', () => {
        const one = seenAnalysisKey({ caseNumber: CASE_A, requestId: 'req:a/b' })
        const two = seenAnalysisKey({ caseNumber: CASE_A, requestId: 'req%3Aa%2Fb' })
        expect(one).not.toBe(two)
    })

    it('normally clears a matching pending marker', async () => {
        seedStorage({ dh_pending_analysis: makePending({ requestId: 'req-A' }) })
        await clearPendingIfMatches('req-A')
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis')
    })

    it('analysis reset removes last, pending, singleton legacy seen, and every seen prefix key', async () => {
        const requestKey = seenAnalysisKey({ caseNumber: CASE_A, requestId: 'req-A' })
        const legacyKey = seenAnalysisKey({ caseNumber: CASE_B, timestamp: 42 })
        seedStorage({
            dh_last_analysis: makeLast(),
            dh_pending_analysis: makePending(),
            [pendingAnalysisKey('req-B')]: makePending({ requestId: 'req-B' }),
            dh_seen_analysis: { caseNumber: CASE_A, requestId: 'old-singleton' },
            [requestKey]: { caseNumber: CASE_A, requestId: 'req-A' },
            [legacyKey]: { caseNumber: CASE_B, timestamp: 42 },
        })

        await resetAnalysisState()
        const snapshot = getStorageSnapshot()
        expect(snapshot).not.toHaveProperty('dh_last_analysis')
        expect(snapshot).not.toHaveProperty('dh_pending_analysis')
        expect(snapshot).not.toHaveProperty(pendingAnalysisKey('req-B'))
        expect(snapshot).not.toHaveProperty('dh_seen_analysis')
        expect(snapshot).not.toHaveProperty(requestKey)
        expect(snapshot).not.toHaveProperty(legacyKey)
    })

    it('suppresses a legacy record acknowledged by exact case number and timestamp', async () => {
        const legacy = makeLast({ requestId: undefined })
        seedStorage({
            dh_last_analysis: legacy,
            dh_seen_analysis: {
                caseNumber: CASE_A,
                timestamp: legacy.timestamp,
            },
        })
        const hook = renderHook(() => useAnalysisHydration(CASE_A))
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(hook.result.current.popover).toBeNull()
    })

    it('does not suppress a legacy record with a different timestamp', async () => {
        const current = makeLast({ requestId: undefined })
        seedStorage({
            dh_last_analysis: current,
            dh_seen_analysis: {
                caseNumber: CASE_A,
                timestamp: current.timestamp - 1,
            },
        })
        const hook = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(hook.result.current.popover).not.toBeNull())
        expect(hook.result.current.popover?.identity.timestamp).toBe(current.timestamp)
    })

    it('preserves legacy last.seen suppression without a separate acknowledgement', async () => {
        seedStorage({ dh_last_analysis: makeLast({ seen: true }) })

        const hook = renderHook(() => useAnalysisHydration(CASE_A))
        await new Promise(resolve => setTimeout(resolve, 20))

        expect(hook.result.current.popover).toBeNull()
    })

    it('UI-I6: hydrates coded prompt errors', async () => {
        seedStorage({
            dh_last_analysis: makeLast({
                status: 'error',
                content: 'safe fallback',
                errorCode: 'repository_instructions_missing',
            }),
        })

        const { result } = renderHook(() => useAnalysisHydration(CASE_A))

        await waitFor(() => expect(result.current.popover).not.toBeNull())
        expect(result.current.popover).toMatchObject({
            content: 'safe fallback',
            errorCode: 'repository_instructions_missing',
        })
    })

    // Case identity change while hook is mounted: popover re-evaluates
    // against the new caseNumber. R-I3 + spec § 4.3 trigger 2.
    it('caseNumber prop change re-runs hydration check', async () => {
        seedStorage({ dh_last_analysis: makeLast({ caseNumber: CASE_B }) })

        const { result, rerender } = renderHook(
            ({ caseNumber }) => useAnalysisHydration(caseNumber),
            { initialProps: { caseNumber: CASE_A } },
        )

        // CASE_A mount: stored result is for CASE_B → no popover.
        await new Promise((r) => setTimeout(r, 20))
        expect(result.current.popover).toBeNull()

        // Switch to CASE_B → stored result now matches → popover opens.
        rerender({ caseNumber: CASE_B })
        await waitFor(() => {
            expect(result.current.popover).not.toBeNull()
        })
    })

    // Empty caseNumber (FAB before scrape resolves the case ID): hook
    // must not crash and must not open any popover. R-I3 generalized.
    it('empty caseNumber does not open popover', async () => {
        seedStorage({ dh_last_analysis: makeLast() })

        const { result } = renderHook(() => useAnalysisHydration(''))

        await new Promise((r) => setTimeout(r, 20))
        expect(result.current.popover).toBeNull()
        expect(result.current.isAnalyzing).toBe(false)
    })
})
