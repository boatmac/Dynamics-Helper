import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
    chromeMockSpies,
    deferNextResponse,
    installChromeMock,
    resetChromeMock,
} from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const A = {
    caseNumber: 'CASE-A-1234',
    ticketTitle: 'Title A',
    errorText: 'CASE A BODY WITH ENOUGH CONTENT',
    description: 'CASE A BODY WITH ENOUGH CONTENT',
    source: 'page-scan',
}

const B = {
    caseNumber: 'CASE-B-5678',
    ticketTitle: 'Title B',
    errorText: 'CASE B BODY WITH ENOUGH CONTENT',
    description: 'CASE B BODY WITH ENOUGH CONTENT',
    source: 'page-scan',
}

const state = vi.hoisted(() => ({
    prefs: {
        buttonText: 'DH',
        primaryColor: '#0D9488',
        offsetBottom: 24,
        offsetRight: 24,
        userPrompt: '',
        rootPath: 'C:\\Prefs',
        autoAnalyzeMode: 'disabled' as 'disabled' | 'always' | 'critical' | 'new_cases',
        enableStatusBubble: true,
        language: 'en' as const,
        analyzeTimeoutSeconds: 60,
    },
    scanValue: null as unknown,
    scanForErrors: vi.fn<() => Promise<unknown>>(),
    observerCallback: null as MutationCallback | null,
    trackEvent: vi.fn(),
    hashCaseId: vi.fn(),
    requests: [] as Array<{
        requestId: string
        pageIdentity: string | null
        caseNumber: string
        rootPath: string
        rootPathOverrideProvided: boolean
    }>,
}))

vi.mock('../utils/telemetry', () => ({
    trackEvent: state.trackEvent,
    trackException: vi.fn(),
    hashCaseId: state.hashCaseId,
}))

vi.mock('../utils/prefs', () => ({
    usePrefs: () => ({ prefs: state.prefs }),
}))

vi.mock('../utils/pageReader', () => ({
    PageReader: { scanForErrors: state.scanForErrors },
}))

vi.mock('../utils/analyzeRequest', async importOriginal => {
    const actual = await importOriginal<typeof import('../utils/analyzeRequest')>()
    return {
        ...actual,
        snapshotAnalyzeRequest: (
            ...args: Parameters<typeof actual.snapshotAnalyzeRequest>
        ) => {
            const request = actual.snapshotAnalyzeRequest(...args)
            state.requests.push(request)
            return request
        },
    }
})

vi.mock('../hooks/useAnalysisHydration', () => ({
    useAnalysisHydration: () => ({
        popover: null,
        pending: null,
        isAnalyzing: false,
        dismissPopover: vi.fn().mockResolvedValue(undefined),
    }),
}))

vi.mock('./MenuLogic', () => ({
    useMenuLogic: () => ({
        currentItems: [],
        canGoBack: false,
        navigateTo: vi.fn(),
        navigateBack: vi.fn(),
    }),
    resolveDynamicUrl: (value: string) => value,
}))

import FAB from './FAB'

class CapturingMutationObserver implements MutationObserver {
    readonly observe = vi.fn()
    readonly disconnect = vi.fn()
    readonly takeRecords = vi.fn(() => [])

    constructor(callback: MutationCallback) {
        state.observerCallback = callback
    }
}

type AnalyzeMessage = {
    payload: {
        action: 'analyze_error'
        payload: Record<string, unknown>
        requestId: string
        _persist: { caseNumber: string }
    }
}

async function flushReact(): Promise<void> {
    await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
    })
}

async function renderFab(initial: unknown = A) {
    state.scanValue = initial
    const view = render(
        <PrefsLanguageProvider language="en">
            <FAB />
        </PrefsLanguageProvider>,
    )
    await flushReact()
    expect(state.scanForErrors).toHaveBeenCalled()
    return view
}

function analyzeMessages(): AnalyzeMessage[] {
    return chromeMockSpies.sendMessage.mock.calls
        .map(([message]) => message as Partial<AnalyzeMessage>)
        .filter((message): message is AnalyzeMessage =>
            message.payload?.action === 'analyze_error',
        )
}

async function dispatchContextMenu(detail: unknown): Promise<void> {
    await act(async () => {
        window.dispatchEvent(new CustomEvent('dh-trigger-analyze', { detail }))
        await Promise.resolve()
        await Promise.resolve()
    })
}

async function completeAnalyze(
    response: ReturnType<typeof deferNextResponse>,
    markdown = 'complete',
): Promise<void> {
    await act(async () => response.resolve({
        status: 'success',
        data: { markdown, saved_to: 'report.md' },
    }))
    await flushReact()
}

async function openAndAnalyze(): Promise<void> {
    if (!document.querySelector('.dh-menu')) {
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        await flushReact()
    }
    fireEvent.click(screen.getByRole('button', { name: /^analyze$/i }))
    await flushReact()
}

async function triggerMutation(): Promise<void> {
    const callback = state.observerCallback
    expect(callback).not.toBeNull()
    await act(async () => {
        callback!([], {} as MutationObserver)
        await vi.advanceTimersByTimeAsync(2000)
        await Promise.resolve()
    })
}

describe('FAB Analyze request Root snapshots', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        resetChromeMock()
        installChromeMock()
        state.prefs.rootPath = 'C:\\Prefs'
        state.prefs.autoAnalyzeMode = 'disabled'
        state.scanValue = A
        state.scanForErrors.mockReset().mockImplementation(
            async () => state.scanValue,
        )
        state.observerCallback = null
        state.trackEvent.mockReset()
        state.hashCaseId.mockReset().mockResolvedValue('hash')
        state.requests = []
        Object.defineProperty(globalThis, 'MutationObserver', {
            configurable: true,
            writable: true,
            value: CapturingMutationObserver,
        })
    })

    afterEach(() => {
        act(() => vi.clearAllTimers())
        vi.useRealTimers()
    })

    it('scopes a nonempty context-menu Root to one request', async () => {
        const firstResponse = deferNextResponse('analyze_error')
        await renderFab()

        await dispatchContextMenu({
            selectionText: 'selected context',
            rootPath: 'C:\\Menu',
        })

        expect(analyzeMessages()).toHaveLength(1)
        expect(analyzeMessages()[0].payload.payload).toMatchObject({
            rootPath: 'C:\\Menu',
            rootPathOverrideProvided: true,
        })
        await completeAnalyze(firstResponse)

        state.prefs.rootPath = 'C:\\Prefs-Current'
        const secondResponse = deferNextResponse('analyze_error')
        await openAndAnalyze()

        expect(analyzeMessages()).toHaveLength(2)
        const secondPayload = analyzeMessages()[1].payload.payload
        expect(secondPayload.rootPath).toBe('C:\\Prefs-Current')
        expect(Object.hasOwn(secondPayload, 'rootPathOverrideProvided')).toBe(false)
        expect(secondPayload.rootPath).not.toBe('C:\\Menu')
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
        void secondResponse
    })

    it('applies an explicit empty Root to exactly one request', async () => {
        const firstResponse = deferNextResponse('analyze_error')
        await renderFab()

        await dispatchContextMenu({ selectionText: 'selected context', rootPath: '' })

        expect(analyzeMessages()).toHaveLength(1)
        expect(analyzeMessages()[0].payload.payload).toMatchObject({
            rootPath: '',
            rootPathOverrideProvided: true,
        })
        await completeAnalyze(firstResponse)

        const secondResponse = deferNextResponse('analyze_error')
        await openAndAnalyze()
        const secondPayload = analyzeMessages()[1].payload.payload
        expect(secondPayload.rootPath).toBe('C:\\Prefs')
        expect(Object.hasOwn(secondPayload, 'rootPathOverrideProvided')).toBe(false)
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
        void secondResponse
    })

    it('uses current preferences for missing and malformed invocation Roots', async () => {
        await renderFab()
        const toString = vi.fn(() => 'C:\\Secret')
        const getter = vi.fn(() => 'C:\\Secret')
        const accessorDetail = Object.defineProperty(
            { selectionText: 'accessor selection' },
            'rootPath',
            { get: getter },
        )

        await dispatchContextMenu({ selectionText: 'missing selection Root' })
        await dispatchContextMenu({
            selectionText: 'malformed selection Root',
            rootPath: { toString },
        })
        await dispatchContextMenu(accessorDetail)

        expect(analyzeMessages()).toHaveLength(3)
        for (const message of analyzeMessages()) {
            expect(message.payload.payload.rootPath).toBe('C:\\Prefs')
            expect(Object.hasOwn(
                message.payload.payload,
                'rootPathOverrideProvided',
            )).toBe(false)
        }
        expect(toString).not.toHaveBeenCalled()
        expect(getter).not.toHaveBeenCalled()
    })

    it('contains a revoked context-menu detail without sending', async () => {
        await renderFab()
        const revocable = Proxy.revocable({
            selectionText: 'secret selection',
            rootPath: 'C:\\Secret',
        }, {})
        revocable.revoke()

        await dispatchContextMenu(revocable.proxy)

        expect(analyzeMessages()).toHaveLength(0)
    })

    it.each(['accessor', 'revoked'] as const)(
        'does not send malformed %s page data to the Host',
        async kind => {
            const getter = vi.fn(() => A.caseNumber)
            let malformedPage: unknown
            if (kind === 'accessor') {
                malformedPage = Object.defineProperty(
                    { ticketTitle: A.ticketTitle, errorText: A.errorText },
                    'caseNumber',
                    { get: getter },
                )
            } else {
                const revocable = Proxy.revocable({ ...A }, {})
                revocable.revoke()
                malformedPage = revocable.proxy
            }
            await renderFab(malformedPage)

            await dispatchContextMenu({ selectionText: 'selected context' })

            expect(analyzeMessages()).toHaveLength(0)
            expect(getter).not.toHaveBeenCalled()
        },
    )

    it('keeps an in-flight SPA request immutable and reads new preferences later', async () => {
        const firstResponse = deferNextResponse('analyze_error')
        const view = await renderFab()
        await openAndAnalyze()
        const firstMessage = analyzeMessages()[0]
        const firstPayload = firstMessage.payload.payload
        const firstRequest = state.requests[0]

        state.prefs.rootPath = 'C:\\New-Prefs'
        view.rerender(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        state.scanValue = B
        await triggerMutation()

        expect(firstPayload).toMatchObject({
            rootPath: 'C:\\Prefs',
            caseNumber: A.caseNumber,
        })
        expect(firstRequest).toMatchObject({
            pageIdentity: `case:${A.caseNumber}`,
            caseNumber: A.caseNumber,
            rootPath: 'C:\\Prefs',
        })
        expect(Object.isFrozen(firstRequest)).toBe(true)
        expect(firstMessage.payload._persist.caseNumber).toBe(A.caseNumber)
        expect(Object.hasOwn(firstPayload, 'rootPathOverrideProvided')).toBe(false)

        await completeAnalyze(firstResponse, 'STALE A RESULT')
        expect(firstRequest).toMatchObject({
            pageIdentity: `case:${A.caseNumber}`,
            caseNumber: A.caseNumber,
            rootPath: 'C:\\Prefs',
        })
        expect(document.body).not.toHaveTextContent('STALE A RESULT')
        expect(state.hashCaseId).toHaveBeenCalledWith(A.caseNumber)

        const secondResponse = deferNextResponse('analyze_error')
        await openAndAnalyze()
        const secondMessage = analyzeMessages()[1]
        expect(secondMessage.payload.payload).toMatchObject({
            rootPath: 'C:\\New-Prefs',
            caseNumber: B.caseNumber,
        })
        expect(secondMessage.payload._persist.caseNumber).toBe(B.caseNumber)
        expect(Object.hasOwn(
            secondMessage.payload.payload,
            'rootPathOverrideProvided',
        )).toBe(false)
        void secondResponse
    })

    it('snapshots current preference Root independently for auto and manual Analyze', async () => {
        state.prefs.rootPath = 'C:\\Auto-Prefs'
        state.prefs.autoAnalyzeMode = 'always'
        const autoResponse = deferNextResponse('analyze_error')
        const view = await renderFab()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100)
            await Promise.resolve()
        })
        expect(analyzeMessages()).toHaveLength(1)
        expect(analyzeMessages()[0].payload.payload.rootPath).toBe('C:\\Auto-Prefs')
        expect(Object.hasOwn(
            analyzeMessages()[0].payload.payload,
            'rootPathOverrideProvided',
        )).toBe(false)
        await completeAnalyze(autoResponse)

        state.prefs.rootPath = 'C:\\Manual-Prefs'
        state.prefs.autoAnalyzeMode = 'disabled'
        view.rerender(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        const manualResponse = deferNextResponse('analyze_error')
        await openAndAnalyze()

        expect(analyzeMessages()).toHaveLength(2)
        expect(analyzeMessages()[1].payload.payload.rootPath).toBe('C:\\Manual-Prefs')
        expect(Object.hasOwn(
            analyzeMessages()[1].payload.payload,
            'rootPathOverrideProvided',
        )).toBe(false)
        void manualResponse
    })
})
