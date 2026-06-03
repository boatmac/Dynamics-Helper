// Tests for the Service Worker analyze persistence bridge.
//
// Maps to spec invariants P-I1..P-I4 in
// docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md § 5.
//
// Strategy: handleAnalyzeForward is a pure async function with injected
// `send`. We can assert (a) what lands in chrome.storage.local at each
// stage and (b) the call ordering between persistence writes and the
// underlying RPC using vitest's mock.invocationCallOrder.
//
// Why not test serviceWorker.ts directly: SW has top-level side effects
// (setupContextMenu, ApplicationInsights init, native port connect) that
// make import-for-test brittle. The bridge is the smallest unit that
// captures the persistence contract.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    installChromeMock,
    resetChromeMock,
    chromeMockSpies,
} from '../test/chromeMock'
import { handleAnalyzeForward } from './analyzeBridge'
import type { AnalyzePersistContext } from '../utils/analysisStore'

installChromeMock()

const CTX: AnalyzePersistContext = {
    caseNumber: '1234567890123456',
    requestId: 'req-A',
    successTitle: '🤖 Copilot Analyze',
    errorTitle: '❌ Analysis Failed',
}

function makeHostSuccess() {
    // Outer host wrapper { status, data } where data is the inner
    // handle_analyze_error return { status, data: { markdown, saved_to } }
    return {
        status: 'success',
        data: {
            status: 'success',
            data: {
                markdown: '# Report\nBody',
                saved_to: 'C:\\path\\dh_case_report.md',
                session_name: 'co-1234567890123456',
            },
        },
    }
}

function makeHostError(msg: string) {
    return {
        status: 'success',
        data: { status: 'error', error: msg },
    }
}

async function readStorage(key: string): Promise<any> {
    const out = await chrome.storage.local.get(key)
    return out[key]
}

describe('handleAnalyzeForward — SW persistence bridge', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // P-I1: pending marker is written BEFORE the host RPC fires.
    it('P-I1: writes dh_pending_analysis before invoking send()', async () => {
        const orderLog: string[] = []
        const send = vi.fn(async (_payload) => {
            orderLog.push('send')
            return makeHostSuccess()
        })

        // Wrap storageSet to log when the pending key lands.
        const originalSet = chromeMockSpies.storageSet.getMockImplementation()!
        chromeMockSpies.storageSet.mockImplementation((items: any, cb?: any) => {
            if (items && 'dh_pending_analysis' in items) {
                orderLog.push('pending_set')
            }
            if (items && 'dh_last_analysis' in items) {
                orderLog.push('last_set')
            }
            return originalSet(items, cb)
        })

        await handleAnalyzeForward({ action: 'analyze_error' }, CTX, { send })

        const pendingIdx = orderLog.indexOf('pending_set')
        const sendIdx = orderLog.indexOf('send')
        expect(pendingIdx).toBeGreaterThanOrEqual(0)
        expect(sendIdx).toBeGreaterThanOrEqual(0)
        expect(pendingIdx).toBeLessThan(sendIdx)
    })

    // P-I2: on success, dh_last_analysis is written AND dh_pending_analysis
    // is removed (because clearPendingIfMatches sees a matching requestId).
    it('P-I2: success writes dh_last_analysis and clears dh_pending_analysis', async () => {
        const send = vi.fn(async () => makeHostSuccess())

        await handleAnalyzeForward({ action: 'analyze_error' }, CTX, { send })

        const last = await readStorage('dh_last_analysis')
        const pending = await readStorage('dh_pending_analysis')

        expect(last).toMatchObject({
            caseNumber: CTX.caseNumber,
            status: 'success',
            title: CTX.successTitle,
            content: '# Report\nBody',
            seen: false,
            savedTo: 'C:\\path\\dh_case_report.md',
        })
        expect(typeof last.timestamp).toBe('number')
        expect(pending).toBeUndefined()
    })

    // P-I3: host returned {status: 'error', error: '...'} → recorded as
    // error with content === error message verbatim.
    it('P-I3: host error writes dh_last_analysis with status=error and content=host message', async () => {
        const send = vi.fn(async () =>
            makeHostError('Copilot request timed out after 600.0 seconds.'),
        )

        await handleAnalyzeForward({ action: 'analyze_error' }, CTX, { send })

        const last = await readStorage('dh_last_analysis')
        expect(last).toMatchObject({
            caseNumber: CTX.caseNumber,
            status: 'error',
            title: CTX.errorTitle,
            content: 'Copilot request timed out after 600.0 seconds.',
            seen: false,
        })
        expect(await readStorage('dh_pending_analysis')).toBeUndefined()
    })

    // P-I4: send() rejection (e.g., native port disconnected) recorded as
    // error with content === exception message; pending cleared; throw
    // re-propagated so SW can still sendResponse the failure to FAB.
    it('P-I4: send rejection writes dh_last_analysis with status=error and rethrows', async () => {
        const send = vi.fn(async () => {
            throw new Error('Native Host disconnected unexpectedly')
        })

        await expect(
            handleAnalyzeForward({ action: 'analyze_error' }, CTX, { send }),
        ).rejects.toThrow('Native Host disconnected unexpectedly')

        const last = await readStorage('dh_last_analysis')
        expect(last).toMatchObject({
            caseNumber: CTX.caseNumber,
            status: 'error',
            title: CTX.errorTitle,
            content: 'Native Host disconnected unexpectedly',
            seen: false,
        })
        expect(await readStorage('dh_pending_analysis')).toBeUndefined()
    })

    // Edge case 6.3: A's late response must not wipe B's pending.
    // Simulated by setting a pending marker for a different requestId
    // before A's response is recorded. The clearPendingIfMatches guard
    // should leave B's marker intact.
    it('edge 6.3: late response does not clear newer pending with different requestId', async () => {
        // B's pending arrives first (simulating user navigated to case B
        // and started a new analysis while A was still in flight).
        await chrome.storage.local.set({
            dh_pending_analysis: {
                caseNumber: '9999999999999999',
                requestId: 'req-B',
                startTime: Date.now(),
            },
        })

        const send = vi.fn(async () => makeHostSuccess())

        // Now A's response lands. A's recordAnalyzeStart will overwrite
        // B's pending — that's actually a known limitation (single-slot
        // pending) but the *clear-after-success* must not fire on B.
        // To isolate the clear behavior, call recordAnalyzeSuccess
        // directly via the bridge but skip recordAnalyzeStart by
        // pre-faking that A never wrote pending. We do that by passing
        // a tweaked bridge call... actually the cleanest test is:
        // - set B's pending
        // - call handleAnalyzeForward for A; recordAnalyzeStart will
        //   overwrite to A's pending (single-slot reality)
        // - manually re-set B's pending after recordAnalyzeStart but
        //   before send resolves — we can't easily intercept that timing
        //   without a deferred mock.
        // Simpler: assert the clearPendingIfMatches helper isolation
        // by faking the SW path that skips recordAnalyzeStart. The
        // bridge function calls clearPendingIfMatches(ctx.requestId)
        // which only removes the marker if requestId matches. So:
        //   set B's pending, run a success bridge call for A's ctx,
        //   the post-success clear sees pending.requestId='req-B' !==
        //   ctx.requestId='req-A' → leaves B in place.
        // BUT recordAnalyzeStart at the top overwrites pending with A's
        // requestId, defeating the test. Reorder: use a custom send
        // that re-injects B's pending after start fired but before it
        // resolves.
        const sendWithReinjection = vi.fn(async () => {
            await chrome.storage.local.set({
                dh_pending_analysis: {
                    caseNumber: '9999999999999999',
                    requestId: 'req-B',
                    startTime: Date.now(),
                },
            })
            return makeHostSuccess()
        })

        await handleAnalyzeForward(
            { action: 'analyze_error' },
            CTX,
            { send: sendWithReinjection },
        )

        // After: dh_last_analysis is A's success, dh_pending_analysis
        // is still B's marker (clearPendingIfMatches saw 'req-B' !==
        // 'req-A' and left it alone).
        const last = await readStorage('dh_last_analysis')
        const pending = await readStorage('dh_pending_analysis')
        expect(last.caseNumber).toBe(CTX.caseNumber)
        expect(pending).toMatchObject({
            caseNumber: '9999999999999999',
            requestId: 'req-B',
        })
        // Silence unused-mock warnings.
        void send
    })

    // Smoke: non-analyze actions bypass persistence entirely.
    it('passes through when ctx is null (non-analyze message)', async () => {
        const send = vi.fn(async () => ({ status: 'success', data: 'ok' }))

        const out = await handleAnalyzeForward(
            { action: 'get_config' },
            null,
            { send },
        )

        expect(out).toEqual({ status: 'success', data: 'ok' })
        expect(await readStorage('dh_pending_analysis')).toBeUndefined()
        expect(await readStorage('dh_last_analysis')).toBeUndefined()
    })
})
