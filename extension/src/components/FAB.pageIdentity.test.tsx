import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
    chromeMockSpies,
    deferNextResponse,
    getMessageLog,
    installChromeMock,
    resetChromeMock,
} from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const A = {
    caseNumber: 'A',
    ticketTitle: 'Title A',
    errorText: 'OLD CASE A BODY',
    description: 'OLD CASE A BODY',
    source: 'page-scan',
}

const B = {
    caseNumber: 'B',
    ticketTitle: 'Title B',
    errorText: 'NEW CASE B BODY',
    description: 'NEW CASE B BODY',
    source: 'page-scan',
}

const state = vi.hoisted(() => ({
    prefs: {
        buttonText: 'DH',
        primaryColor: '#0D9488',
        offsetBottom: 24,
        offsetRight: 24,
        userPrompt: '',
        rootPath: '',
        autoAnalyzeMode: 'disabled' as 'disabled' | 'always' | 'critical' | 'new_cases',
        enableStatusBubble: true,
        language: 'en' as const,
        analyzeTimeoutSeconds: 60,
    },
    scanForErrors: vi.fn<() => Promise<unknown>>(),
    scanValue: null as unknown,
    hydrationCaseNumbers: [] as string[],
    hydrationPending: null as null | {
        caseNumber: string
        requestId: string
        startTime: number
    },
    observerCallback: null as MutationCallback | null,
    trackEvent: vi.fn(),
    hashCaseId: vi.fn(),
}))

vi.mock('../utils/telemetry', () => ({
    trackEvent: state.trackEvent,
    trackException: vi.fn(),
    hashCaseId: state.hashCaseId,
}))

vi.mock('../utils/prefs', () => ({
    usePrefs: () => ({ prefs: state.prefs }),
    mergeRootPathOverride: (value: typeof state.prefs) => value,
}))

vi.mock('../utils/pageReader', () => ({
    PageReader: { scanForErrors: state.scanForErrors },
}))

vi.mock('../hooks/useAnalysisHydration', () => ({
    useAnalysisHydration: (caseNumber: string) => {
        state.hydrationCaseNumbers.push(caseNumber)
        const pending = state.hydrationPending?.caseNumber === caseNumber
            ? state.hydrationPending
            : null
        return {
            popover: null,
            pending,
            isAnalyzing: Boolean(pending),
            dismissPopover: vi.fn().mockResolvedValue(undefined),
        }
    },
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

async function flushReact(): Promise<void> {
    await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
    })
}

function deferredValue<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(res => { resolve = res })
    return { promise, resolve }
}

async function renderOpenFab(initial: unknown = A) {
    state.scanValue = initial
    const view = render(
        <PrefsLanguageProvider language="en">
            <FAB />
        </PrefsLanguageProvider>,
    )
    await flushReact()
    expect(state.scanForErrors).toHaveBeenCalled()

    fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
    await flushReact()
    expect(document.querySelector('.dh-menu')).not.toBeNull()
    state.scanForErrors.mockClear()
    return view
}

function analyzeButton(): HTMLButtonElement {
    return screen.getByRole('button', { name: /^analyze$/i })
}

function openFab(): void {
    fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
}

function expandContext(): HTMLTextAreaElement {
    const existing = screen.queryByRole('textbox') as HTMLTextAreaElement | null
    if (existing) return existing
    fireEvent.click(screen.getByText('Case Context'))
    return screen.getByRole('textbox') as HTMLTextAreaElement
}

async function triggerMutation(expectedScanIncrease = 1): Promise<void> {
    const callback = state.observerCallback
    expect(callback).not.toBeNull()
    const callsBefore = state.scanForErrors.mock.calls.length
    await act(async () => {
        callback!([], {} as MutationObserver)
        await vi.advanceTimersByTimeAsync(2000)
        await Promise.resolve()
    })
    expect(state.scanForErrors).toHaveBeenCalledTimes(
        callsBefore + expectedScanIncrease,
    )
}

async function resolveSuccess(
    response: ReturnType<typeof deferNextResponse>,
    markdown = 'RESULT FOR A',
): Promise<void> {
    await act(async () => response.resolve({
        status: 'success',
        data: { markdown, saved_to: 'A-report.md' },
    }))
    await flushReact()
}

function expectNoVisibleOutcomeForA(): void {
    expect(document.body).not.toHaveTextContent('RESULT FOR A')
    expect(document.body).not.toHaveTextContent('HOST ERROR FOR A')
    expect(document.body).not.toHaveTextContent('OLD CASE A BODY')
    expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
    expect(document.body).not.toHaveTextContent(/Analysis Failed/i)
    expect(document.body).not.toHaveTextContent(/Analysis took/i)
}

function expectNoVisibleOutcomeTelemetry(): void {
    const names = state.trackEvent.mock.calls.map(call => call[0])
    expect(names).not.toContain('Analyze Success')
    expect(names).not.toContain('Case Analyzed')
    expect(names).not.toContain('Analyze Host Error')
    expect(names).not.toContain('Analyze Exception')
    expect(names).not.toContain('Analyze Timeout')
}

describe('FAB live page identity during Analyze', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        resetChromeMock()
        installChromeMock()
        state.scanValue = A
        state.scanForErrors.mockReset().mockImplementation(
            async () => state.scanValue,
        )
        state.hydrationCaseNumbers = []
        state.hydrationPending = null
        state.observerCallback = null
        state.trackEvent.mockReset()
        state.hashCaseId.mockReset().mockResolvedValue('hash-A')
        state.prefs.analyzeTimeoutSeconds = 60
        state.prefs.autoAnalyzeMode = 'disabled'
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

    it('switches identity from A to B while Analyze is busy', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        expect(analyzeButton()).toBeDisabled()

        state.scanValue = B
        await triggerMutation()

        expect(state.hydrationCaseNumbers).toContain('B')
        expect(document.querySelector('.dh-menu')).toBeNull()
        expectNoVisibleOutcomeForA()

        openFab()
        await flushReact()
        expect(analyzeButton()).toBeDisabled()
        expectNoVisibleOutcomeForA()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(67_999)
        })
        expect(state.trackEvent).not.toHaveBeenCalledWith('Analyze Timeout')
        expect(analyzeButton()).toBeDisabled()

        const callsBeforeCompletion = state.scanForErrors.mock.calls.length
        await resolveSuccess(response)

        expect(state.scanForErrors).toHaveBeenCalledTimes(callsBeforeCompletion + 1)
        expectNoVisibleOutcomeForA()
        expectNoVisibleOutcomeTelemetry()
        expect(state.hashCaseId).toHaveBeenCalledWith('A')
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({
                payload: {
                    _persist: { caseNumber: 'A' },
                },
            })

        const textarea = expandContext()
        expect(textarea.value).toContain('NEW CASE B BODY')
        expect(textarea.value).not.toContain('OLD CASE A BODY')
        expect(analyzeButton()).not.toBeDisabled()
    })

    it('ignores an older scan that resolves after a newer page scan', async () => {
        const olderInitial = deferredValue<unknown>()
        const newerObserver = deferredValue<unknown>()
        const heldOpenScan = deferredValue<unknown>()
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => olderInitial.promise)
            .mockImplementationOnce(() => newerObserver.promise)
            .mockImplementation(() => heldOpenScan.promise)

        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)

        await triggerMutation()
        await act(async () => newerObserver.resolve(B))
        await flushReact()
        expect(state.hydrationCaseNumbers.at(-1)).toBe('B')

        await act(async () => olderInitial.resolve(A))
        await flushReact()

        expect(state.hydrationCaseNumbers.at(-1)).toBe('B')
        openFab()
        await flushReact()
        const textarea = expandContext()
        expect(textarea.value).toContain('NEW CASE B BODY')
        expect(textarea.value).not.toContain('OLD CASE A BODY')
    })

    it('ignores an older post-run scan after a newer observer scan', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = B
        await triggerMutation()

        const olderPostRun = deferredValue<unknown>()
        const newerObserver = deferredValue<unknown>()
        state.scanForErrors
            .mockImplementationOnce(() => olderPostRun.promise)
            .mockImplementationOnce(() => newerObserver.promise)
        await act(async () => response.resolve({
            status: 'success',
            data: { markdown: 'RESULT FOR A', saved_to: 'A-report.md' },
        }))
        await flushReact()

        await triggerMutation()
        await act(async () => newerObserver.resolve(B))
        await flushReact()
        await act(async () => olderPostRun.resolve(A))
        await flushReact()

        expect(state.hydrationCaseNumbers.at(-1)).toBe('B')
        openFab()
        await flushReact()
        const textarea = expandContext()
        expect(textarea.value).toContain('NEW CASE B BODY')
        expect(textarea.value).not.toContain('OLD CASE A BODY')
        expectNoVisibleOutcomeForA()
    })

    it('does not analyze stale A context after busy navigation to B', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = B
        await triggerMutation()

        openFab()
        await flushReact()
        const staleTextarea = expandContext()
        expect(staleTextarea.value).toContain('OLD CASE A BODY')
        const staleAnalyze = analyzeButton()
        expect(staleAnalyze).toBeDisabled()

        staleAnalyze.disabled = false
        fireEvent.click(staleAnalyze)
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(1)

        await act(async () => {
            window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
                detail: {
                    selectionText: [
                        '## Case Number',
                        '',
                        'A',
                        '',
                        'STALE A CONTEXT MENU SELECTION',
                    ].join('\n'),
                },
            }))
            await Promise.resolve()
        })
        await flushReact()
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(1)
        expect(staleTextarea.value).toContain('OLD CASE A BODY')
        expect(staleTextarea.value).not.toContain('STALE A CONTEXT MENU SELECTION')

        state.scanValue = B
        await resolveSuccess(response)

        expect(staleTextarea.value).toContain('NEW CASE B BODY')
        expect(staleTextarea.value).not.toContain('OLD CASE A BODY')
        expect(analyzeButton()).not.toBeDisabled()
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(1)
    })

    it('does not run a delayed A auto-analysis after a full B scan', async () => {
        const longA = {
            ...A,
            caseNumber: 'CASE-A-1234',
            errorText: 'OLD CASE A BODY WITH ENOUGH AUTO CONTENT',
            description: 'OLD CASE A BODY WITH ENOUGH AUTO CONTENT',
        }
        const longB = {
            ...B,
            caseNumber: 'CASE-B-5678',
            errorText: 'NEW CASE B BODY WITH ENOUGH AUTO CONTENT',
            description: 'NEW CASE B BODY WITH ENOUGH AUTO CONTENT',
        }
        const openScan = deferredValue<unknown>()
        state.prefs.autoAnalyzeMode = 'always'
        state.scanForErrors
            .mockReset()
            .mockResolvedValueOnce(longA)
            .mockImplementationOnce(() => openScan.promise)
            .mockResolvedValue(longB)

        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()
        openFab()
        await flushReact()

        await act(async () => openScan.resolve(longB))
        await flushReact()
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100)
            await Promise.resolve()
        })

        const analyzeMessages = getMessageLog()
            .filter(entry => entry.action === 'analyze_error')
        expect(analyzeMessages).toHaveLength(1)
        expect(analyzeMessages[0].payload).toMatchObject({
            payload: {
                payload: {
                    caseNumber: longB.caseNumber,
                    text: expect.stringContaining('NEW CASE B BODY'),
                },
                _persist: { caseNumber: longB.caseNumber },
            },
        })
        expect(state.hydrationCaseNumbers.at(-1)).toBe(longB.caseNumber)
    })

    it('keeps edit protection when the post-run scan is malformed', async () => {
        const longA = {
            ...A,
            caseNumber: 'CASE-A-1234',
            errorText: 'OLD CASE A BODY WITH ENOUGH AUTO CONTENT',
            description: 'OLD CASE A BODY WITH ENOUGH AUTO CONTENT',
        }
        state.prefs.autoAnalyzeMode = 'always'
        const response = deferNextResponse('analyze_error')
        await renderOpenFab(longA)
        const textarea = expandContext()
        fireEvent.change(textarea, {
            target: { value: 'MANUAL EDIT FOR LONG CASE A' },
        })

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100)
            await Promise.resolve()
        })
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(1)

        state.scanValue = {
            caseNumber: longA.caseNumber,
            ticketTitle: longA.ticketTitle,
            errorText: 7,
        }
        await resolveSuccess(response)

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100)
            await Promise.resolve()
        })
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(1)

        fireEvent.click(screen.getByTitle('Close'))
        state.scanValue = {
            ...longA,
            errorText: 'SERVER ENRICHMENT MUST NOT REPLACE THE EDIT',
            description: 'SERVER ENRICHMENT MUST NOT REPLACE THE EDIT',
        }
        await triggerMutation()
        openFab()
        await flushReact()
        expandContext()
        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value)
            .toBe('MANUAL EDIT FOR LONG CASE A')
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(1)
    })

    it('replaces a user-edited A textarea with B after busy Analyze completes', async () => {
        await renderOpenFab()
        const textareaA = expandContext()
        fireEvent.change(textareaA, { target: { value: 'MANUAL EDIT FOR A' } })
        expect(textareaA.value).toBe('MANUAL EDIT FOR A')

        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = B
        await triggerMutation()

        expect(textareaA.value).toBe('MANUAL EDIT FOR A')
        expect(document.querySelector('.dh-menu')).toBeNull()
        const callsBeforeCompletion = state.scanForErrors.mock.calls.length

        await resolveSuccess(response)

        expect(state.scanForErrors).toHaveBeenCalledTimes(callsBeforeCompletion + 1)
        expectNoVisibleOutcomeForA()
        openFab()
        await flushReact()
        const textareaB = screen.getByRole('textbox') as HTMLTextAreaElement
        expect(textareaB.value).toContain('NEW CASE B BODY')
        expect(textareaB.value).not.toContain('MANUAL EDIT FOR A')
        expect(textareaB.value).not.toContain('OLD CASE A BODY')
    })

    it('uses title fallback to suppress A completion on a title-only B page', async () => {
        const titleA = {
            caseNumber: '',
            ticketTitle: 'TITLE-ONLY-A',
            errorText: 'TITLE BODY A',
        }
        const titleB = {
            caseNumber: '',
            ticketTitle: 'TITLE-ONLY-B',
            errorText: 'TITLE BODY B',
        }
        await renderOpenFab(titleA)
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())

        state.scanValue = titleB
        await triggerMutation()
        await resolveSuccess(response, 'TITLE A RESULT')

        expect(document.body).not.toHaveTextContent('TITLE A RESULT')
        expect(state.hydrationCaseNumbers.at(-1)).toBe('')
        expectNoVisibleOutcomeTelemetry()
    })

    it('keeps case A identity when only its title changes', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = {
            ...A,
            ticketTitle: 'Edited title inside case A',
            errorText: 'Updated same-case body',
        }

        await triggerMutation()
        expect(document.querySelector('.dh-menu')).not.toBeNull()
        expect(analyzeButton()).toBeDisabled()
        await resolveSuccess(response, 'SAME CASE A RESULT')

        expect(screen.getByText('SAME CASE A RESULT')).toBeInTheDocument()
        expect(state.trackEvent).toHaveBeenCalledWith(
            'Analyze Success',
            expect.objectContaining({ caseIdHash: 'hash-A' }),
        )
    })

    it('suppresses Host-error completion after the page switches to B', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = B
        await triggerMutation()
        const callsBeforeCompletion = state.scanForErrors.mock.calls.length

        await act(async () => response.resolve({
            status: 'error',
            error: 'HOST ERROR FOR A',
            error_code: 'future_code',
        }))
        await flushReact()

        expect(state.scanForErrors).toHaveBeenCalledTimes(callsBeforeCompletion + 1)
        expectNoVisibleOutcomeForA()
        expectNoVisibleOutcomeTelemetry()
    })

    it('suppresses transport failure after the page switches to B', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = B
        await triggerMutation()

        await act(async () => response.reject(new Error('TRANSPORT ERROR FOR A')))
        await flushReact()

        expect(document.body).not.toHaveTextContent('TRANSPORT ERROR FOR A')
        expectNoVisibleOutcomeForA()
        expectNoVisibleOutcomeTelemetry()
    })

    it('runs exactly one post-run full scan after timeout and late settlement', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = B
        await triggerMutation()
        const callsBeforeTimeout = state.scanForErrors.mock.calls.length

        await act(async () => {
            await vi.advanceTimersByTimeAsync(68_000)
            await Promise.resolve()
        })

        expect(state.scanForErrors).toHaveBeenCalledTimes(callsBeforeTimeout + 1)
        expectNoVisibleOutcomeForA()
        expectNoVisibleOutcomeTelemetry()
        const callsAfterTimeout = state.scanForErrors.mock.calls.length

        await resolveSuccess(response, 'LATE RESULT FOR A')

        expect(state.scanForErrors).toHaveBeenCalledTimes(callsAfterTimeout)
        expect(document.body).not.toHaveTextContent('LATE RESULT FOR A')
        expectNoVisibleOutcomeTelemetry()
    })

    it('contains throwing identity accessors', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        const getter = vi.fn(() => {
            throw new Error('SECRET THROWING IDENTITY GETTER')
        })
        state.scanValue = Object.defineProperty(
            { ticketTitle: 'unreadable', errorText: 'unreadable' },
            'caseNumber',
            { enumerable: true, get: getter },
        )

        await triggerMutation()
        expect(getter).not.toHaveBeenCalled()
        expect(state.hydrationCaseNumbers.at(-1)).toBe('A')

        state.scanValue = A
        await resolveSuccess(response, 'ACCESSOR-CONTAINED A RESULT')
        expect(screen.getByText('ACCESSOR-CONTAINED A RESULT')).toBeInTheDocument()
        expect(getter).not.toHaveBeenCalled()
    })

    it('contains a revoked busy scan without changing accepted A ownership', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        const revoked = Proxy.revocable({ ...B }, {})
        revoked.revoke()
        state.scanValue = revoked.proxy

        await triggerMutation()
        expect(state.hydrationCaseNumbers.at(-1)).toBe('A')

        state.scanValue = A
        await resolveSuccess(response, 'REVOKED-CONTAINED A RESULT')
        expect(screen.getByText('REVOKED-CONTAINED A RESULT')).toBeInTheDocument()
    })

    it('accepts an empty identity snapshot and suppresses ownership completion', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        state.scanValue = {}

        await triggerMutation()
        expect(state.hydrationCaseNumbers.at(-1)).toBe('')
        await resolveSuccess(response, 'UNIDENTIFIED A RESULT')

        expect(document.body).not.toHaveTextContent('UNIDENTIFIED A RESULT')
        expectNoVisibleOutcomeTelemetry()
    })

    it('snapshots first-scan identity for an immediate manual Analyze', async () => {
        let resolveInitial!: (value: unknown) => void
        const initial = new Promise<unknown>(resolve => { resolveInitial = resolve })
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => initial)
            .mockImplementation(async () => A)
        const response = deferNextResponse('analyze_error')
        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)

        await act(async () => resolveInitial(A))
        openFab()
        await flushReact()
        fireEvent.click(analyzeButton())

        expect(state.hydrationCaseNumbers).toContain('A')
        expect(chromeMockSpies.sendMessage.mock.calls.some(([message]) =>
            (message as any)?.payload?.action === 'analyze_error'
            && (message as any)?.payload?._persist?.caseNumber === 'A',
        )).toBe(true)

        state.scanValue = A
        await resolveSuccess(response, 'FIRST SCAN A RESULT')
        expect(screen.getByText('FIRST SCAN A RESULT')).toBeInTheDocument()
    })
})
