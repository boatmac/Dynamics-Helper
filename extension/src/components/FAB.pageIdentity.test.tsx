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
    hydrationPopover: null as null | {
        isOpen: true
        status: 'success' | 'error'
        title: string
        content: string
        identity: {
            caseNumber: string
            requestId?: string
            timestamp?: number
        }
    },
    hydrationDismiss: vi.fn(),
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
        const popover = state.hydrationPopover?.identity.caseNumber === caseNumber
            ? state.hydrationPopover
            : null
        return {
            popover,
            pending,
            isAnalyzing: Boolean(pending),
            dismissPopover: state.hydrationDismiss,
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
        state.hydrationPopover = null
        state.hydrationDismiss.mockReset().mockResolvedValue(undefined)
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

    it('suppresses A completion while a newer page scan is pending', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())

        const pendingB = deferredValue<unknown>()
        const pendingPostRun = deferredValue<unknown>()
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => pendingB.promise)
            .mockImplementationOnce(() => pendingPostRun.promise)
        const callback = state.observerCallback
        expect(callback).not.toBeNull()
        await act(async () => {
            callback!([], {} as MutationObserver)
            await vi.advanceTimersByTimeAsync(2000)
            await Promise.resolve()
        })
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)

        await act(async () => response.resolve({
            status: 'success',
            data: {
                markdown: 'A RESULT WHILE B SCAN IS PENDING',
                saved_to: 'A-report.md',
            },
        }))
        await flushReact()

        expect(document.body).not.toHaveTextContent('A RESULT WHILE B SCAN IS PENDING')
        expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
        expectNoVisibleOutcomeTelemetry()
        expect(state.hashCaseId).toHaveBeenCalledWith(A.caseNumber)
    })

    it('keeps accepted context usable after an ignored or malformed scan', async () => {
        await renderOpenFab()
        const ignoredScan = deferredValue<unknown>()
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => ignoredScan.promise)
            .mockResolvedValueOnce({
                caseNumber: A.caseNumber,
                ticketTitle: A.ticketTitle,
                errorText: 7,
            })
            .mockResolvedValue(A)

        await triggerMutation()
        await act(async () => ignoredScan.resolve(A))
        await flushReact()

        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()

        const bubble = document.querySelector('.dh-status-bubble') as HTMLElement
        expect(bubble).not.toHaveClass('visible')
        expect(bubble).not.toHaveTextContent(/^Analyzing$/i)

        deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())

        const analyzeMessages = getMessageLog()
            .filter(entry => entry.action === 'analyze_error')
        expect(analyzeMessages).toHaveLength(1)
        expect(analyzeMessages[0].payload).toMatchObject({
            payload: {
                payload: {
                    caseNumber: A.caseNumber,
                    text: expect.stringContaining('OLD CASE A BODY'),
                },
                _persist: { caseNumber: A.caseNumber },
            },
        })
    })

    it('waits for post-run page revalidation before publishing terminal Analyze UI', async () => {
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        const postRunScan = deferredValue<unknown>()
        fireEvent.click(analyzeButton())
        state.scanForErrors.mockReset().mockImplementationOnce(() => postRunScan.promise)

        await act(async () => response.resolve({
            status: 'success',
            data: {
                markdown: 'SAME PAGE TERMINAL RESULT',
                saved_to: 'A-report.md',
            },
        }))
        await flushReact()

        expect(state.scanForErrors).toHaveBeenCalledTimes(1)
        expect(document.body).not.toHaveTextContent('SAME PAGE TERMINAL RESULT')
        expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
        expect(document.body).not.toHaveTextContent(/Analysis took/i)
        expectNoVisibleOutcomeTelemetry()

        await act(async () => postRunScan.resolve(A))
        await flushReact()

        expect(screen.getByText('SAME PAGE TERMINAL RESULT')).toBeInTheDocument()
        expect(document.body).toHaveTextContent(/Analysis Complete/i)
        expect(document.body).toHaveTextContent(/Analysis took/i)
        expect(state.trackEvent.mock.calls.filter(
            call => call[0] === 'Analyze Success',
        )).toHaveLength(1)
        expect(state.trackEvent.mock.calls.filter(
            call => call[0] === 'Case Analyzed',
        )).toHaveLength(1)
    })

    it('does not hydrate the active local Analyze before post-run revalidation', async () => {
        const requestId = '00000000-0000-4000-8000-00000000000a'
        const randomUuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(requestId)
        try {
            const view = await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            const postRunScan = deferredValue<unknown>()
            fireEvent.click(analyzeButton())

            state.hydrationPopover = {
                isOpen: true,
                status: 'success',
                title: 'Hydrated Analyze',
                content: 'HYDRATED ACTIVE LOCAL A',
                identity: { caseNumber: A.caseNumber, requestId, timestamp: 100 },
            }
            view.rerender(
                <PrefsLanguageProvider language="en">
                    <FAB />
                </PrefsLanguageProvider>,
            )
            await flushReact()

            expect(document.body).not.toHaveTextContent('HYDRATED ACTIVE LOCAL A')
            expect(state.hydrationDismiss).not.toHaveBeenCalled()

            state.scanForErrors.mockReset().mockImplementationOnce(
                () => postRunScan.promise,
            )
            await act(async () => response.resolve({
                status: 'success',
                data: {
                    markdown: 'LOCAL A AFTER REVALIDATION',
                    saved_to: 'A-report.md',
                },
            }))
            await flushReact()

            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
            expect(document.body).not.toHaveTextContent('LOCAL A AFTER REVALIDATION')
            expect(state.hydrationDismiss).not.toHaveBeenCalled()

            await act(async () => postRunScan.resolve(A))
            await flushReact()

            expect(screen.getByText('LOCAL A AFTER REVALIDATION')).toBeInTheDocument()
            expect(document.body).not.toHaveTextContent('HYDRATED ACTIVE LOCAL A')
            expect(state.hydrationDismiss).not.toHaveBeenCalled()
        } finally {
            randomUuid.mockRestore()
        }
    })

    it('does not mark an active local result seen before terminal page ownership is proven', async () => {
        const requestId = '00000000-0000-4000-8000-00000000000a'
        const randomUuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(requestId)
        try {
            const view = await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())

            state.hydrationPopover = {
                isOpen: true,
                status: 'success',
                title: 'Hydrated Analyze',
                content: 'HYDRATED A MUST REMAIN UNSEEN',
                identity: { caseNumber: A.caseNumber, requestId, timestamp: 101 },
            }
            view.rerender(
                <PrefsLanguageProvider language="en">
                    <FAB />
                </PrefsLanguageProvider>,
            )
            await flushReact()

            expect(document.body).not.toHaveTextContent('HYDRATED A MUST REMAIN UNSEEN')
            expect(state.hydrationDismiss).not.toHaveBeenCalled()

            state.scanForErrors.mockReset().mockResolvedValue(B)
            await act(async () => response.resolve({
                status: 'success',
                data: {
                    markdown: 'LOCAL A MUST NOT PUBLISH ON B',
                    saved_to: 'A-report.md',
                },
            }))
            await flushReact()

            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
            expect(state.hydrationCaseNumbers.at(-1)).toBe(B.caseNumber)
            expect(document.body).not.toHaveTextContent('HYDRATED A MUST REMAIN UNSEEN')
            expect(document.body).not.toHaveTextContent('LOCAL A MUST NOT PUBLISH ON B')
            expect(state.hydrationDismiss).not.toHaveBeenCalled()
            expectNoVisibleOutcomeTelemetry()

            view.unmount()
            state.scanForErrors.mockReset().mockResolvedValue(A)
            render(
                <PrefsLanguageProvider language="en">
                    <FAB />
                </PrefsLanguageProvider>,
            )
            await flushReact()

            expect(screen.getByText('HYDRATED A MUST REMAIN UNSEEN')).toBeInTheDocument()
            expect(state.hydrationDismiss).toHaveBeenCalledTimes(1)
            expect(state.hydrationDismiss).toHaveBeenCalledWith(
                state.hydrationPopover.identity,
            )
        } finally {
            randomUuid.mockRestore()
        }
    })

    it('hydrates a non-local legacy persisted result after mount', async () => {
        state.hydrationPopover = {
            isOpen: true,
            status: 'success',
            title: 'Persisted Analyze',
            content: 'NON-LOCAL PERSISTED A',
            identity: {
                caseNumber: A.caseNumber,
                timestamp: 102,
            },
        }

        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()

        expect(screen.getByText('NON-LOCAL PERSISTED A')).toBeInTheDocument()
        expect(state.hydrationDismiss).toHaveBeenCalledTimes(1)
        expect(state.hydrationDismiss).toHaveBeenCalledWith(
            state.hydrationPopover.identity,
        )
    })

    it.each([
        ['thrown', () => Promise.reject(new Error('TERMINAL SCAN FAILURE'))],
        ['null', () => Promise.resolve(null)],
        ['malformed', () => Promise.resolve({ ...A, errorText: 7 })],
    ] as const)(
        'does not publish terminal Analyze UI when post-run revalidation fails',
        async (_kind, runPostRunScan) => {
            const requestId = '00000000-0000-4000-8000-00000000000a'
            const randomUuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(requestId)
            try {
                const view = await renderOpenFab()
                const response = deferNextResponse('analyze_error')
                fireEvent.click(analyzeButton())

                state.hydrationPopover = {
                    isOpen: true,
                    status: 'success',
                    title: 'Persisted Analyze',
                    content: 'RECOVERABLE PERSISTED A',
                    identity: { caseNumber: A.caseNumber, requestId, timestamp: 103 },
                }
                view.rerender(
                    <PrefsLanguageProvider language="en">
                        <FAB />
                    </PrefsLanguageProvider>,
                )
                await flushReact()
                expect(state.hydrationDismiss).not.toHaveBeenCalled()

                state.scanForErrors.mockReset().mockImplementationOnce(runPostRunScan)
                await act(async () => response.resolve({
                    status: 'success',
                    data: {
                        markdown: 'UNREVALIDATED LOCAL A',
                        saved_to: 'A-report.md',
                    },
                }))
                await flushReact()

                expect(state.scanForErrors).toHaveBeenCalledTimes(1)
                expect(document.body).not.toHaveTextContent('UNREVALIDATED LOCAL A')
                expect(document.body).not.toHaveTextContent('RECOVERABLE PERSISTED A')
                expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
                expect(document.body).not.toHaveTextContent(/Analysis Failed/i)
                expect(document.body).not.toHaveTextContent(/Analysis took/i)
                expect(document.querySelector('.dh-status-bubble')).not.toHaveClass('visible')
                expect(state.hydrationDismiss).not.toHaveBeenCalled()
                expectNoVisibleOutcomeTelemetry()
                expect(analyzeButton()).not.toBeDisabled()

                view.unmount()
                state.scanForErrors.mockReset().mockResolvedValue(A)
                render(
                    <PrefsLanguageProvider language="en">
                        <FAB />
                    </PrefsLanguageProvider>,
                )
                await flushReact()

                expect(screen.getByText('RECOVERABLE PERSISTED A')).toBeInTheDocument()
                expect(state.hydrationDismiss).toHaveBeenCalledTimes(1)
                expect(state.hydrationDismiss).toHaveBeenCalledWith(
                    state.hydrationPopover.identity,
                )
            } finally {
                randomUuid.mockRestore()
            }
        },
    )

    it('uses the newest observer scan as terminal full revalidation', async () => {
        const newerA = {
            ...A,
            errorText: 'NEWEST CASE A BODY',
            description: 'NEWEST CASE A BODY',
        }
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        const mandatoryPostRun = deferredValue<unknown>()
        const observerB = deferredValue<unknown>()
        const observerA = deferredValue<unknown>()
        fireEvent.click(analyzeButton())
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => mandatoryPostRun.promise)
            .mockImplementationOnce(() => observerB.promise)
            .mockResolvedValueOnce(B)
            .mockImplementationOnce(() => observerA.promise)

        await act(async () => response.resolve({
            status: 'success',
            data: {
                markdown: 'STALE PRE-RUN A RESULT',
                saved_to: 'A-report.md',
            },
        }))
        await flushReact()
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)

        await triggerMutation()
        await act(async () => observerB.resolve(B))
        await flushReact()
        openFab()
        await flushReact()
        expect(state.scanForErrors).toHaveBeenCalledTimes(3)
        const contextAfterB = expandContext().value
        openFab()
        await flushReact()

        await triggerMutation()
        expect(state.scanForErrors).toHaveBeenCalledTimes(4)
        await act(async () => observerA.resolve(newerA))
        await flushReact()

        expect(document.body).not.toHaveTextContent('STALE PRE-RUN A RESULT')
        expectNoVisibleOutcomeTelemetry()

        await act(async () => mandatoryPostRun.resolve(A))
        await flushReact()

        expect(contextAfterB).toContain('NEW CASE B BODY')
        expect(contextAfterB).not.toContain('OLD CASE A BODY')
        if (!document.querySelector('.dh-menu')) openFab()
        await flushReact()
        const newestContext = expandContext().value
        expect(newestContext).toContain('NEWEST CASE A BODY')
        expect(newestContext).not.toContain('OLD CASE A BODY')
        expect(document.body).not.toHaveTextContent('STALE PRE-RUN A RESULT')
        expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
        expectNoVisibleOutcomeTelemetry()
        expect(state.hydrationDismiss).not.toHaveBeenCalled()
        expect(analyzeButton()).not.toBeDisabled()
    })

    it('terminal revalidation switches to a newer participant without waiting for the old scan', async () => {
        const newerA = {
            ...A,
            errorText: 'WAKEABLE NEWEST CASE A BODY',
            description: 'WAKEABLE NEWEST CASE A BODY',
        }
        await renderOpenFab()
        const response = deferNextResponse('analyze_error')
        const mandatoryPostRun = deferredValue<unknown>()
        const newerObserver = deferredValue<unknown>()
        fireEvent.click(analyzeButton())
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => mandatoryPostRun.promise)
            .mockImplementationOnce(() => newerObserver.promise)

        await act(async () => response.resolve({
            status: 'success',
            data: {
                markdown: 'WAKEABLE TERMINAL RESULT',
                saved_to: 'A-report.md',
            },
        }))
        await flushReact()
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)

        await triggerMutation()
        await act(async () => newerObserver.resolve(newerA))
        await flushReact()

        expect(screen.getByText('WAKEABLE TERMINAL RESULT')).toBeInTheDocument()
        expect(state.trackEvent).toHaveBeenCalledWith(
            'Analyze Success',
            expect.objectContaining({ caseIdHash: 'hash-A' }),
        )
        fireEvent.click(screen.getByTitle('Close'))
        openFab()
        await flushReact()
        const context = expandContext().value
        expect(context).toContain('WAKEABLE NEWEST CASE A BODY')
        expect(context).not.toContain('OLD CASE A BODY')
        expect(analyzeButton()).not.toBeDisabled()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(6001)
            window.dispatchEvent(new CustomEvent('DH_TOAST', {
                detail: { text: 'TERMINAL CLEANUP COMPLETE' },
            }))
        })
        expect(document.body).toHaveTextContent('TERMINAL CLEANUP COMPLETE')
        expect(document.querySelector('.dh-status-bubble')).toHaveClass('visible')
    })

    it.each(['open', 'refresh'] as const)(
        'uses open and refresh scans as terminal full participants',
        async kind => {
            await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            const mandatoryPostRun = deferredValue<unknown>()
            const participant = deferredValue<unknown>()
            fireEvent.click(analyzeButton())
            if (kind === 'open') {
                openFab()
                await flushReact()
            }
            state.scanForErrors
                .mockReset()
                .mockImplementationOnce(() => mandatoryPostRun.promise)
                .mockImplementationOnce(() => participant.promise)

            await act(async () => response.resolve({
                status: 'success',
                data: {
                    markdown: `STALE A RESULT BEFORE ${kind.toUpperCase()}`,
                    saved_to: 'A-report.md',
                },
            }))
            await flushReact()
            expect(state.scanForErrors).toHaveBeenCalledTimes(1)

            if (kind === 'open') {
                openFab()
                await flushReact()
            } else {
                fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
                await flushReact()
            }
            expect(state.scanForErrors).toHaveBeenCalledTimes(2)

            await act(async () => participant.resolve(B))
            await flushReact()
            await act(async () => mandatoryPostRun.resolve(A))
            await flushReact()

            if (!document.querySelector('.dh-menu')) {
                openFab()
                await flushReact()
            }
            const context = expandContext().value
            expect(context).toContain('NEW CASE B BODY')
            expect(context).not.toContain('OLD CASE A BODY')
            expect(document.body).not.toHaveTextContent(
                `STALE A RESULT BEFORE ${kind.toUpperCase()}`,
            )
            expectNoVisibleOutcomeTelemetry()
            expect(analyzeButton()).not.toBeDisabled()
        },
    )

    it.each([
        ['success', 'STALE SUCCESS TERMINAL A'],
        ['host-error', 'STALE HOST ERROR TERMINAL A'],
        ['exception', 'STALE EXCEPTION TERMINAL A'],
        ['timeout', 'STALE TIMEOUT TERMINAL A'],
    ] as const)(
        'suppresses every terminal A outcome when post-run scan discovers B',
        async (kind, staleText) => {
            await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())
            state.scanForErrors.mockReset().mockResolvedValue(B)

            if (kind === 'success') {
                await act(async () => response.resolve({
                    status: 'success',
                    data: { markdown: staleText, saved_to: 'A-report.md' },
                }))
            } else if (kind === 'host-error') {
                await act(async () => response.resolve({
                    status: 'error',
                    error: staleText,
                    error_code: 'future_code',
                }))
            } else if (kind === 'exception') {
                await act(async () => response.reject(new Error(staleText)))
            } else {
                await act(async () => {
                    await vi.advanceTimersByTimeAsync(70_000)
                    await Promise.resolve()
                })
            }
            await flushReact()

            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
            expect(document.body).not.toHaveTextContent(staleText)
            expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
            expect(document.body).not.toHaveTextContent(/Analysis Failed/i)
            expect(document.body).not.toHaveTextContent(/Analysis took/i)
            expectNoVisibleOutcomeTelemetry()
        },
    )

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

    it('orders overlapping context-menu fallback scans by generation', async () => {
        const initialScan = deferredValue<unknown>()
        const olderFallback = deferredValue<unknown>()
        const newerFallback = deferredValue<unknown>()
        const getter = vi.fn(() => 'STALE RAW PRODUCT')
        const rawA = Object.defineProperty(
            { ...A },
            'unsupportedGetter',
            { enumerable: true, get: getter },
        )
        state.scanForErrors
            .mockReset()
            .mockImplementationOnce(() => initialScan.promise)
            .mockImplementationOnce(() => olderFallback.promise)
            .mockImplementationOnce(() => newerFallback.promise)

        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()

        await act(async () => {
            window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
                detail: { selectionText: 'OLDER FALLBACK SELECTION' },
            }))
            window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
                detail: { selectionText: 'NEWER FALLBACK SELECTION' },
            }))
            await Promise.resolve()
        })
        expect(state.scanForErrors).toHaveBeenCalledTimes(3)

        await act(async () => newerFallback.resolve(B))
        await flushReact()
        await act(async () => olderFallback.resolve(rawA))
        await flushReact()

        const analyzeMessages = getMessageLog()
            .filter(entry => entry.action === 'analyze_error')
        expect(analyzeMessages).toHaveLength(1)
        expect(analyzeMessages[0].payload).toMatchObject({
            payload: {
                payload: {
                    caseNumber: B.caseNumber,
                    text: expect.stringContaining('NEW CASE B BODY'),
                },
                _persist: { caseNumber: B.caseNumber },
            },
        })
        expect(getter).not.toHaveBeenCalled()
        expect(state.hydrationCaseNumbers.at(-1)).toBe(B.caseNumber)
    })

    it('binds context-menu identity and data from one accepted snapshot', async () => {
        await renderOpenFab()
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        await flushReact()

        const bScan = deferredValue<unknown>()
        state.scanForErrors.mockReset().mockImplementationOnce(() => bScan.promise)
        const callback = state.observerCallback
        expect(callback).not.toBeNull()
        await act(async () => {
            callback!([], {} as MutationObserver)
            await vi.advanceTimersByTimeAsync(2000)
            await Promise.resolve()
        })

        await act(async () => {
            bScan.resolve(B)
            await Promise.resolve()
            await Promise.resolve()
            await Promise.resolve()
            window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
                detail: { selectionText: 'ATOMIC B SELECTION' },
            }))
            await Promise.resolve()
        })

        const analyzeMessages = getMessageLog()
            .filter(entry => entry.action === 'analyze_error')
        expect(analyzeMessages).toHaveLength(1)
        expect(analyzeMessages[0].payload).toMatchObject({
            payload: {
                payload: {
                    caseNumber: B.caseNumber,
                    text: expect.stringContaining('NEW CASE B BODY'),
                },
                _persist: { caseNumber: B.caseNumber },
            },
        })
        expect(JSON.stringify(analyzeMessages[0].payload))
            .not.toContain('OLD CASE A BODY')
    })

    it('binds manual Analyze to one accepted scan record before React commit', async () => {
        await renderOpenFab()
        const analyze = analyzeButton()
        const bRefresh = deferredValue<unknown>()
        state.scanForErrors.mockReset().mockImplementationOnce(() => bRefresh.promise)
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()

        await act(async () => {
            bRefresh.resolve(B)
            await Promise.resolve()
            await Promise.resolve()
            await Promise.resolve()
            fireEvent.click(analyze)
            await Promise.resolve()
        })

        expect(state.hydrationCaseNumbers.at(-1)).toBe(B.caseNumber)
        const analyzeMessages = getMessageLog()
            .filter(entry => entry.action === 'analyze_error')
        expect(analyzeMessages).toHaveLength(1)
        for (const message of analyzeMessages) {
            expect(message.payload).toMatchObject({
                payload: {
                    payload: {
                        caseNumber: B.caseNumber,
                        text: expect.stringContaining('NEW CASE B BODY'),
                    },
                    _persist: { caseNumber: B.caseNumber },
                },
            })
            expect(JSON.stringify(message.payload)).not.toContain('OLD CASE A BODY')
        }
    })

    it('rejects an auto Analyze callback after an A to B to A scan cycle', async () => {
        const firstA = {
            ...A,
            caseNumber: 'CASE-A-1234',
            errorText: 'FIRST A CYCLE BODY WITH ENOUGH AUTO CONTENT',
            description: 'FIRST A CYCLE BODY WITH ENOUGH AUTO CONTENT',
        }
        const middleB = {
            ...B,
            caseNumber: 'CASE-B-5678',
            errorText: 'MIDDLE B CYCLE BODY WITH ENOUGH AUTO CONTENT',
            description: 'MIDDLE B CYCLE BODY WITH ENOUGH AUTO CONTENT',
        }
        const newerA = {
            ...firstA,
            errorText: 'NEW A CYCLE BODY WITH ENOUGH AUTO CONTENT',
            description: 'NEW A CYCLE BODY WITH ENOUGH AUTO CONTENT',
        }
        const bScan = deferredValue<unknown>()
        const newerAScan = deferredValue<unknown>()
        state.prefs.autoAnalyzeMode = 'always'
        state.scanForErrors
            .mockReset()
            .mockResolvedValueOnce(firstA)
            .mockImplementationOnce(() => bScan.promise)
            .mockImplementationOnce(() => newerAScan.promise)

        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )
        await flushReact()

        openFab()
        await flushReact()
        await act(async () => bScan.resolve(middleB))
        await flushReact()

        openFab()
        await flushReact()
        await act(async () => newerAScan.resolve(newerA))
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
                    caseNumber: newerA.caseNumber,
                    text: expect.stringContaining('NEW A CYCLE BODY'),
                },
                _persist: { caseNumber: newerA.caseNumber },
            },
        })
        expect(JSON.stringify(analyzeMessages[0].payload))
            .not.toContain('FIRST A CYCLE BODY')
    })

    it('keeps edit protection when explicit refresh is malformed', async () => {
        await renderOpenFab()
        const textarea = expandContext()
        fireEvent.change(textarea, { target: { value: 'MANUAL A REFRESH EDIT' } })

        state.scanValue = {
            caseNumber: A.caseNumber,
            ticketTitle: A.ticketTitle,
            errorText: 7,
        }
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()

        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        state.scanValue = {
            ...A,
            errorText: 'VALID A ENRICHMENT',
            description: 'VALID A ENRICHMENT',
        }
        await triggerMutation()
        openFab()
        await flushReact()

        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value)
            .toBe('MANUAL A REFRESH EDIT')
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(0)
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

        expect(document.body).not.toHaveTextContent(/Analysis Complete/i)
        expect(document.body).not.toHaveTextContent(/Analysis Failed/i)
        expectNoVisibleOutcomeTelemetry()
        state.scanValue = {
            ...longA,
            errorText: 'SERVER ENRICHMENT MUST NOT REPLACE THE EDIT',
            description: 'SERVER ENRICHMENT MUST NOT REPLACE THE EDIT',
        }
        if (document.querySelector('.dh-menu')) {
            openFab()
            await flushReact()
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
        const manualEdit = '## Case Number\n\nA\n\nMANUAL EDIT FOR A'
        fireEvent.change(textareaA, { target: { value: manualEdit } })
        expect(textareaA.value).toBe(manualEdit)

        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({
                payload: {
                    payload: { text: manualEdit },
                    _persist: { caseNumber: A.caseNumber },
                },
            })
        state.scanValue = B
        await triggerMutation()

        expect(textareaA.value).toBe(manualEdit)
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

    it.each(['getter-message', 'revoked', 'descriptor-throwing'] as const)(
        'contains hostile Analyze rejection before terminal finalization',
        async kind => {
            const secret = `SECRET HOSTILE ANALYZE REJECTION ${kind}`
            let rejection: unknown
            let rawMessageRead: ReturnType<typeof vi.fn> | null = null
            let descriptorRead: ReturnType<typeof vi.fn> | null = null
            if (kind === 'getter-message') {
                rawMessageRead = vi.fn(() => { throw new Error(secret) })
                rejection = Object.defineProperty({}, 'message', {
                    configurable: true,
                    get: rawMessageRead,
                })
            } else if (kind === 'revoked') {
                const revoked = Proxy.revocable({ message: secret }, {})
                revoked.revoke()
                rejection = revoked.proxy
            } else {
                rawMessageRead = vi.fn(() => { throw new Error(secret) })
                descriptorRead = vi.fn(() => { throw new Error(secret) })
                rejection = new Proxy({}, {
                    get: rawMessageRead,
                    getOwnPropertyDescriptor: descriptorRead,
                })
            }

            await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())
            state.scanForErrors.mockReset().mockResolvedValue(A)
            const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
            const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
            try {
                await act(async () => response.reject(rejection))
                await flushReact()

                expect(state.scanForErrors).toHaveBeenCalledTimes(1)
                expect(screen.getByText(/Unknown error/i)).toBeInTheDocument()
                expect(document.body).not.toHaveTextContent(secret)
                if (rawMessageRead) expect(rawMessageRead).not.toHaveBeenCalled()
                if (descriptorRead) expect(descriptorRead).toHaveBeenCalledTimes(1)
                const loggedStrings = [
                    ...consoleLog.mock.calls,
                    ...consoleWarn.mock.calls,
                    ...consoleError.mock.calls,
                ].flat().filter((value): value is string => typeof value === 'string')
                expect(loggedStrings.join('\n')).not.toContain(secret)
                expect(state.trackEvent.mock.calls.filter(
                    call => call[0] === 'Analyze Exception',
                )).toHaveLength(1)

                fireEvent.click(screen.getByTitle('Close'))
                expect(analyzeButton()).not.toBeDisabled()
            } finally {
                consoleLog.mockRestore()
                consoleWarn.mockRestore()
                consoleError.mockRestore()
            }
        },
    )

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
