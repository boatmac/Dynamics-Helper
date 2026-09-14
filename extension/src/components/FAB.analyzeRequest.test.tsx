import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
    chromeMockSpies,
    deferNextResponse,
    installChromeMock,
    resetChromeMock,
} from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'
import { publishAnalyzeProgress } from '../utils/analyzeProgressChannel'

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
    CUSTOMER_LOOKUP_SELECTOR: '[data-id="customerid.fieldControl-LookupResultsDropdown_customerid_SelectedRecordList"]',
    PageReader: { scanForErrors: state.scanForErrors, readLiveRecordNumber: () => undefined },
}))

vi.mock('../utils/analyzeRequest', async importOriginal => {
    const actual = await importOriginal<typeof import('../utils/analyzeRequest')>()
    return {
        ...actual,
        requestMatchesPage: (
            ...args: Parameters<typeof actual.requestMatchesPage>
        ) => {
            const [request] = args
            if (!state.requests.some(value => value.requestId === request.requestId)) {
                state.requests.push(request)
            }
            return actual.requestMatchesPage(...args)
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

function deferredValue<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(done => { resolve = done })
    return { promise, resolve }
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

function dispatchProgress(requestId: string, payload: unknown): void {
    act(() => {
        publishAnalyzeProgress({ requestId, payload })
    })
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

async function runContextMenuFallbackPreferenceRace(
    detail: unknown,
): Promise<Record<string, unknown>> {
    resetChromeMock()
    installChromeMock()
    state.prefs = {
        ...state.prefs,
        rootPath: 'C:\\Root-A',
        autoAnalyzeMode: 'disabled',
    }
    state.requests = []
    const initialScan = deferredValue<unknown>()
    const fallbackScan = deferredValue<unknown>()
    state.scanForErrors
        .mockReset()
        .mockImplementationOnce(() => initialScan.promise)
        .mockImplementationOnce(() => fallbackScan.promise)
    deferNextResponse('analyze_error')

    const view = render(
        <PrefsLanguageProvider language="en">
            <FAB />
        </PrefsLanguageProvider>,
    )
    await flushReact()
    await dispatchContextMenu(detail)
    expect(state.scanForErrors).toHaveBeenCalledTimes(2)

    state.prefs = { ...state.prefs, rootPath: 'C:\\Root-B' }
    view.rerender(
        <PrefsLanguageProvider language="en">
            <FAB />
        </PrefsLanguageProvider>,
    )
    await flushReact()
    await act(async () => fallbackScan.resolve(A))
    await flushReact()

    const messages = analyzeMessages()
    expect(messages).toHaveLength(1)
    const payload = messages[0].payload.payload
    await act(async () => initialScan.resolve(A))
    await flushReact()
    view.unmount()
    return payload
}

describe('FAB Analyze request Root snapshots', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        resetChromeMock()
        installChromeMock()
        state.prefs = {
            ...state.prefs,
            rootPath: 'C:\\Prefs',
            autoAnalyzeMode: 'disabled',
            enableStatusBubble: true,
        }
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

    it('opts into progress v1, safely clones events and retains progress across menu remounts', async () => {
        deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        const message = analyzeMessages()[0].payload
        expect(message.payload.progressVersion).toBe(1)
        const payload = { version: 1, seq: 1, stage: 'session_resuming', state: 'running', elapsedMs: 1200 }
        dispatchProgress(message.requestId, payload)
        payload.stage = 'report'
        expect(screen.getByRole('status')).toHaveTextContent('Resuming session: Running')
        expect(document.querySelector('.dh-status-bubble.visible')).toBeNull()
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        dispatchProgress(message.requestId, { version: 1, seq: 2, stage: 'agent', state: 'running', elapsedMs: 2400 })
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        await flushReact()
        expect(screen.getByRole('status')).toHaveTextContent('Copilot analysis: Running')
        expect(screen.getByRole('button', { name: 'Recent activity (2)' })).toBeInTheDocument()
        dispatchProgress(message.requestId, { version: 1, seq: 1, stage: 'report', state: 'running', elapsedMs: 5000 })
        const getter = vi.fn(() => 'report')
        dispatchProgress(message.requestId, Object.defineProperty({ ...payload, seq: 3 }, 'stage', { enumerable: true, get: getter }))
        expect(getter).not.toHaveBeenCalled()
        expect(screen.getByRole('status')).toHaveTextContent('Copilot analysis: Running')
    })

    it('renders legacy progress and the exact DTM sign-in label safely without forcing a disabled bubble', async () => {
        state.prefs = { ...state.prefs, enableStatusBubble: false }
        deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        const { requestId } = analyzeMessages()[0].payload
        dispatchProgress(requestId, 'Preparing prompt...')
        expect(screen.getByRole('status')).toHaveTextContent('Preparing analysis')
        dispatchProgress(requestId, 'Waiting for DTM sign-in (30 seconds)...')
        expect(screen.getByRole('status')).toHaveTextContent('Waiting for DTM sign-in (30 seconds)...')
        dispatchProgress(requestId, 'untrusted secret URL')
        expect(screen.getByRole('status')).toHaveTextContent('Analysis in progress')
        expect(screen.queryByText(/untrusted secret/)).not.toBeInTheDocument()
        expect(document.querySelector('.dh-status-bubble.visible')).toBeNull()
    })

    it.each(['success', 'error'] as const)('attachment notice reaches the immediate FAB %s popover separately', async status => {
        const response = deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        await act(async () => response.resolve({
            ...(status === 'success'
                ? { status, data: { markdown: '# Report', saved_to: 'report.md' } }
                : { status, error: 'SAFE HOST FALLBACK', error_code: 'repository_instructions_missing' }),
            attachmentNotice: 'Some attachments were not included.',
        }))
        await flushReact()
        expect(screen.getByRole('alert')).toHaveTextContent('Some attachments were not included.')
        if (status === 'success') expect(screen.getByRole('heading', { name: 'Report' })).toBeInTheDocument()
        else {
            expect(screen.getByText(/Repository Instructions are missing/i)).toBeInTheDocument()
            expect(screen.queryByText('SAFE HOST FALLBACK')).toBeNull()
        }
        expect(JSON.stringify(state.trackEvent.mock.calls)).not.toContain('Some attachments were not included.')
    })

    it('reserves 120 seconds for attachment preparation before the unchanged model timeout and fallback grace', async () => {
        deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        await act(async () => { await vi.advanceTimersByTimeAsync(189_999) })
        expect(screen.getByRole('button', { name: /^analyze$/i })).toBeDisabled()
        expect(state.trackEvent).not.toHaveBeenCalledWith('Analyze Timeout')
        await act(async () => { await vi.advanceTimersByTimeAsync(1) })
        await flushReact()
        expect(state.trackEvent).toHaveBeenCalledWith('Analyze Timeout')
        expect(state.prefs.analyzeTimeoutSeconds).toBe(60)
    })

    it('rejects late progress as soon as the full response arrives, including while hashing', async () => {
        const response = deferNextResponse('analyze_error')
        const hash = deferredValue<string>()
        state.hashCaseId.mockImplementationOnce(() => hash.promise)
        await renderFab()
        await openAndAnalyze()
        const { requestId } = analyzeMessages()[0].payload
        dispatchProgress(requestId, { version: 1, seq: 1, stage: 'report', state: 'succeeded', elapsedMs: 1000 })
        expect(screen.getByRole('status')).toHaveTextContent('Writing report: Succeeded')
        await act(async () => response.resolve({ status: 'success', data: { markdown: 'PROGRESS RESULT', saved_to: 'report.md' } }))
        dispatchProgress(requestId, 'Preparing prompt...')
        expect(screen.getByRole('status')).toHaveTextContent('Writing report: Succeeded')
        await act(async () => hash.resolve('hash'))
        await flushReact()
        expect(screen.getByText('PROGRESS RESULT')).toBeInTheDocument()
        dispatchProgress(requestId, { version: 1, seq: 2, stage: 'agent', state: 'running', elapsedMs: 2000 })
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        await flushReact()
        expect(screen.getByRole('status')).toHaveTextContent('Analysis complete')
    })

    it('settles business failure through the existing result path and resets on a new request', async () => {
        const response = deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        const oldId = analyzeMessages()[0].payload.requestId
        dispatchProgress(oldId, { version: 1, seq: 1, stage: 'report', state: 'succeeded', elapsedMs: 1000 })
        // The SW has already normalized the Host's inner business failure.
        await act(async () => response.resolve({ status: 'error', error: 'BUSINESS FAILURE' }))
        await flushReact()
        expect(screen.getByText('BUSINESS FAILURE')).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent('Analysis did not complete')
        deferNextResponse('analyze_error')
        await openAndAnalyze()
        const newId = analyzeMessages()[1].payload.requestId
        expect(newId).not.toBe(oldId)
        dispatchProgress(oldId, 'Preparing prompt...')
        expect(screen.getByRole('status')).toHaveTextContent('Analysis in progress')
        expect(screen.queryByRole('button', { name: /Recent activity/ })).not.toBeInTheDocument()
        dispatchProgress(newId, { version: 1, seq: 1, stage: 'auth', state: 'running', elapsedMs: 10 })
        expect(screen.getByRole('status')).toHaveTextContent('Checking authentication: Running')
    })

    it('ignores forged public DOM progress even with the active request ID and a valid payload', async () => {
        deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        const { requestId } = analyzeMessages()[0].payload
        act(() => window.dispatchEvent(new CustomEvent('dh-native-progress', {
            detail: { requestId, payload: { version: 1, seq: 999, stage: 'report', state: 'succeeded', elapsedMs: 999 } },
        })))
        expect(screen.getByRole('status')).toHaveTextContent('Analysis in progress')
        expect(screen.queryByRole('button', { name: /Recent activity/ })).not.toBeInTheDocument()
        expect(document.querySelector('.dh-status-bubble.visible')).toBeNull()
        dispatchProgress(requestId, { version: 1, seq: 1, stage: 'agent', state: 'running', elapsedMs: 1 })
        expect(screen.getByRole('status')).toHaveTextContent('Copilot analysis: Running')
    })

    it('retains ready and parallel tool completion during a same-page scan without displaying them early', async () => {
        deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        const { requestId } = analyzeMessages()[0].payload
        dispatchProgress(requestId, { version: 1, seq: 1, stage: 'tool', state: 'running', service: 'webiq', toolId: 'tool-1', elapsedMs: 1 })
        const scan = deferredValue<unknown>()
        state.scanForErrors.mockImplementationOnce(() => scan.promise)
        await triggerMutation()
        const sessionId = '12345678-1234-1234-1234-123456789012'
        dispatchProgress(requestId, { version: 1, seq: 2, stage: 'session_ready', state: 'succeeded', sessionId, elapsedMs: 2 })
        dispatchProgress(requestId, { version: 1, seq: 3, stage: 'tool', state: 'succeeded', service: 'webiq', toolId: 'tool-1', elapsedMs: 3 })
        expect(screen.queryByRole('region', { name: 'Analysis in progress' })).not.toBeInTheDocument()
        expect(document.querySelector('.dh-status-bubble.visible')).toBeNull()
        await act(async () => scan.resolve(A))
        await flushReact()
        expect(screen.getByText(sessionId)).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent('Tool activity: Succeeded')
        expect(screen.queryByRole('list', { name: 'Active tools' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Recent activity (3)' })).toBeInTheDocument()
    })

    it('hides old progress during a pending page scan and on a different case', async () => {
        deferNextResponse('analyze_error')
        await renderFab()
        await openAndAnalyze()
        const { requestId } = analyzeMessages()[0].payload
        dispatchProgress(requestId, 'Preparing prompt...')
        const scan = deferredValue<unknown>()
        state.scanForErrors.mockImplementationOnce(() => scan.promise)
        await triggerMutation()
        dispatchProgress(requestId, { version: 1, seq: 2, stage: 'report', state: 'running', elapsedMs: 2000 })
        expect(screen.queryByRole('button', { name: /Recent activity/ })).not.toBeInTheDocument()
        expect(screen.queryByText('Preparing analysis')).not.toBeInTheDocument()
        await act(async () => scan.resolve(B))
        await flushReact()
        state.scanValue = B
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        await flushReact()
        dispatchProgress(requestId, 'Preparing prompt...')
        expect(screen.queryByRole('region', { name: 'Analysis in progress' })).not.toBeInTheDocument()
        dispatchProgress(requestId, { version: 1, seq: 3, stage: 'response', state: 'running', elapsedMs: 3000 })
        state.scanValue = A
        await triggerMutation()
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        await flushReact()
        expect(screen.getByRole('status')).toHaveTextContent('Processing response: Running')
        expect(screen.getByRole('button', { name: 'Recent activity (2)' })).toBeInTheDocument()
    })

    it('scopes a nonempty context-menu Root to one request', async () => {
        const firstResponse = deferNextResponse('analyze_error')
        const view = await renderFab()

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

        state.prefs = { ...state.prefs, rootPath: 'C:\\Prefs-Current' }
        view.rerender(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()
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

        state.prefs = { ...state.prefs, rootPath: 'C:\\New-Prefs' }
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
        state.prefs = {
            ...state.prefs,
            rootPath: 'C:\\Auto-Prefs',
            autoAnalyzeMode: 'always',
        }
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

        state.prefs = {
            ...state.prefs,
            rootPath: 'C:\\Manual-Prefs',
            autoAnalyzeMode: 'disabled',
        }
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

    it('uses the latest preference Root when delayed auto Analyze starts', async () => {
        state.prefs = {
            ...state.prefs,
            rootPath: 'C:\\Root-A',
            autoAnalyzeMode: 'always',
        }
        deferNextResponse('analyze_error')
        const view = await renderFab()
        expect(analyzeMessages()).toHaveLength(0)

        state.prefs = { ...state.prefs, rootPath: 'C:\\Root-B' }
        view.rerender(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100)
            await Promise.resolve()
        })

        expect(analyzeMessages()).toHaveLength(1)
        const payload = analyzeMessages()[0].payload.payload
        expect(payload.rootPath).toBe('C:\\Root-B')
        expect(Object.hasOwn(payload, 'rootPathOverrideProvided')).toBe(false)
    })

    it('uses the latest preference Root after context-menu fallback scan', async () => {
        const missing = await runContextMenuFallbackPreferenceRace({
            selectionText: 'missing Root selection',
        })
        const malformed = await runContextMenuFallbackPreferenceRace({
            selectionText: 'malformed Root selection',
            rootPath: { malformed: true },
        })
        const explicit = await runContextMenuFallbackPreferenceRace({
            selectionText: 'explicit Root selection',
            rootPath: 'C:\\Explicit',
        })
        const explicitEmpty = await runContextMenuFallbackPreferenceRace({
            selectionText: 'explicit empty Root selection',
            rootPath: '',
        })

        expect.soft(missing.rootPath).toBe('C:\\Root-B')
        expect.soft(Object.hasOwn(missing, 'rootPathOverrideProvided')).toBe(false)
        expect.soft(malformed.rootPath).toBe('C:\\Root-B')
        expect.soft(Object.hasOwn(malformed, 'rootPathOverrideProvided')).toBe(false)
        expect.soft(explicit.rootPath).toBe('C:\\Explicit')
        expect.soft(explicit.rootPathOverrideProvided).toBe(true)
        expect.soft(explicitEmpty.rootPath).toBe('')
        expect.soft(explicitEmpty.rootPathOverrideProvided).toBe(true)
    })

    it('keeps title-only page ownership when selection supplies a case number', async () => {
        const titleOnly = {
            caseNumber: '',
            ticketTitle: 'Title-only page',
            errorText: 'TITLE ONLY PAGE BODY',
            description: 'TITLE ONLY PAGE BODY',
            source: 'page-scan',
        }
        const extractedCase = '2601190030003106'
        const response = deferNextResponse('analyze_error')
        await renderFab(titleOnly)

        await dispatchContextMenu({
            selectionText: `Selected failure for ${extractedCase}`,
        })

        expect(analyzeMessages()).toHaveLength(1)
        const message = analyzeMessages()[0]
        expect.soft(state.requests).toHaveLength(1)
        expect.soft(state.requests[0]).toMatchObject({
            pageIdentity: 'title:Title-only page',
            caseNumber: extractedCase,
        })
        expect.soft(Object.isFrozen(state.requests[0])).toBe(true)
        expect.soft(message.payload.payload.caseNumber).toBe(extractedCase)
        expect.soft(message.payload._persist.caseNumber).toBe(extractedCase)

        await completeAnalyze(response, 'TITLE ONLY RESULT')

        expect(screen.getByText('TITLE ONLY RESULT')).toBeInTheDocument()
    })
})
