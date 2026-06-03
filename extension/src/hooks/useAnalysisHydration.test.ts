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

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { installChromeMock, resetChromeMock, seedStorage } from '../test/chromeMock'
import { STALE_WINDOW_MS, MAX_PENDING_DISPLAY_AGE_MS } from '../utils/analysisStore'
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
        })
    })

    // R-I2: dismiss → seen flips to true → re-mount does NOT auto-open.
    it('R-I2: dismissPopover sets seen=true; remount does not auto-open', async () => {
        seedStorage({ dh_last_analysis: makeLast() })

        const first = renderHook(() => useAnalysisHydration(CASE_A))
        await waitFor(() => expect(first.result.current.popover).not.toBeNull())

        await act(async () => {
            await first.result.current.dismissPopover()
        })

        // Verify storage was updated with seen=true.
        const stored = await chrome.storage.local.get('dh_last_analysis')
        expect((stored.dh_last_analysis as LastAnalysis).seen).toBe(true)
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
    it('R-I5: matching dh_pending_analysis sets isAnalyzing=true', async () => {
        seedStorage({ dh_pending_analysis: makePending() })

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
