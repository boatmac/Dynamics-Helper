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
import { formatIrSlaSnapshot } from '../utils/analysisPrompt'

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
}))

vi.mock('../utils/pageReader', async importOriginal => {
    const actual = await importOriginal<typeof import('../utils/pageReader')>()
    return { ...actual, PageReader: class extends actual.PageReader {
        static scanForErrors = state.scanForErrors as typeof actual.PageReader.scanForErrors
    } }
})

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
import { PageReader } from '../utils/pageReader'

class CapturingMutationObserver implements MutationObserver {
    static instances: CapturingMutationObserver[] = []
    readonly observe = vi.fn<(target: Node, options?: MutationObserverInit) => void>()
    readonly disconnect = vi.fn()
    readonly takeRecords = vi.fn(() => [])

    constructor(readonly callback: MutationCallback) {
        CapturingMutationObserver.instances.push(this)
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
        CapturingMutationObserver.instances = []
        state.trackEvent.mockReset()
        state.hashCaseId.mockReset().mockResolvedValue('hash-A')
        state.prefs.analyzeTimeoutSeconds = 60
        state.prefs.autoAnalyzeMode = 'disabled'
        state.prefs.userPrompt = ''
        Object.defineProperty(globalThis, 'MutationObserver', {
            configurable: true,
            writable: true,
            value: CapturingMutationObserver,
        })
    })

    afterEach(() => {
        act(() => vi.clearAllTimers())
        vi.useRealTimers()
        document.querySelectorAll('[data-customer-fixture]').forEach(node => node.remove())
    })

    function customerPage(number = '2601190030003106001') {
        const fixture = document.createElement('section')
        fixture.setAttribute('data-customer-fixture', '')
        fixture.setAttribute('role', 'tabpanel')
        fixture.innerHTML = `<div role="main"><uci-header-control-list><uci-header-control-list-item data-name="header_msdfm_casenumberservicelevel"><span slot="value">${number}</span></uci-header-control-list-item></uci-header-control-list></div><div role="tablist"><button role="tab" aria-selected="true" aria-controls="recordSummary-${number}">Summary</button></div><div role="tabpanel" aria-label="Summary" id="recordSummary-${number}" data-customer-summary></div>`
        document.body.append(fixture)
        return fixture
    }

    function materializeCustomer(fixture: Element, name = 'Late Account') {
        fixture.querySelector('[data-customer-summary]')!.insertAdjacentHTML('beforeend', `<ul data-id="customerid.fieldControl-LookupResultsDropdown_customerid_SelectedRecordList"><li><a>${name}</a></li></ul>`)
    }

    async function customerTick(ms = 250) {
        await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
    }

    function backgroundMutation() {
        const observer = CapturingMutationObserver.instances.filter(instance =>
            instance.observe.mock.calls.some(call => call[0] === document.body)).at(-1)!
        observer.callback([], observer)
    }

    describe('bounded scroll customer enrichment', () => {
        beforeEach(() => {
            vi.spyOn(PageReader, 'readCustomerName')
            vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{ width: 80, height: 20 }] as unknown as DOMRectList)
        })

        afterEach(() => vi.restoreAllMocks())

        it('reads once after expired-window scroll bursts and updates the open preview and next Analyze', async () => {
            const caseNumber = '2601190030003106001'
            const fixture = customerPage(caseNumber)
            await renderOpenFab({ ...A, caseNumber, createdOn: 'Original date', context: 'Original context' })
            const before = expandContext().value
            await customerTick(5250)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            for (let i = 0; i < 3; i++) {
                fireEvent.scroll(fixture) // Non-bubbling internal-pane event, captured on document.
                await customerTick(100)
            }
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
            await customerTick(100)
            const text = before.replace('## Customer Name\n\n', '## Customer Name\n\nLate Account')
            expect(expandContext().value).toBe(text)
            expect(PageReader.readCustomerName).toHaveBeenCalledExactlyOnceWith(caseNumber)
            fireEvent.scroll(fixture)
            await customerTick(1500)
            expect(PageReader.readCustomerName).toHaveBeenCalledTimes(1)
            expect(state.scanForErrors).not.toHaveBeenCalled()
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())
            await flushReact()
            expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
                .toMatchObject({ payload: { payload: { text, caseNumber } } })
            await resolveSuccess(response)
        })

        it('leaves an empty lookup unchanged and requires another scroll after materialization', async () => {
            const fixture = customerPage()
            await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
            const before = expandContext().value
            await customerTick(5250)
            vi.mocked(PageReader.readCustomerName).mockClear()
            fireEvent.scroll(fixture)
            await customerTick(200)
            expect(PageReader.readCustomerName).toHaveBeenCalledTimes(1)
            expect(expandContext().value).toBe(before)
            materializeCustomer(fixture)
            await customerTick(1500)
            expect(expandContext().value).toBe(before)
            expect(PageReader.readCustomerName).toHaveBeenCalledTimes(1)
            fireEvent.scroll(fixture)
            await customerTick(200)
            expect(expandContext().value).toContain('Late Account')
            expect(PageReader.readCustomerName).toHaveBeenCalledTimes(2)
            expect(state.scanForErrors).not.toHaveBeenCalled()
        })

        it('waits briefly for a same-record background scan without copying its context or cached customer', async () => {
            const fixture = customerPage()
            const snapshot = { ...A, caseNumber: '2601190030003106001' }
            await renderOpenFab(snapshot)
            const before = expandContext().value
            await customerTick(5250)
            const pending = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => pending.promise)
            act(backgroundMutation)
            await customerTick(2000)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            fireEvent.scroll(fixture)
            await customerTick(200)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
            await act(async () => pending.resolve({ ...snapshot, description: 'Do not copy', customerName: 'Cached Account' }))
            await customerTick(250)
            expect(expandContext().value).toBe(before.replace('## Customer Name\n\n', '## Customer Name\n\nLate Account'))
            expect(PageReader.readCustomerName).toHaveBeenCalledTimes(1)
            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
        })

        it.each(['timeout', 'missing', 'invalid', 'different task', 'newer pending'])('discards the scroll check for %s background authority', async kind => {
            const fixture = customerPage()
            const snapshot = { ...A, caseNumber: '2601190030003106001' }
            await renderOpenFab(snapshot)
            const before = expandContext().value
            await customerTick(5250)
            const pending = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => pending.promise)
            act(backgroundMutation)
            await customerTick(2000)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            fireEvent.scroll(fixture)
            await customerTick(200)
            const newer = deferredValue<unknown>()
            if (kind === 'newer pending') {
                state.scanForErrors.mockImplementationOnce(() => newer.promise)
                fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
            }
            if (kind === 'timeout') await customerTick(800)
            await act(async () => pending.resolve(kind === 'missing' ? null
                : kind === 'invalid' ? { ...snapshot, description: {} }
                : kind === 'different task' ? { ...snapshot, caseNumber: '2601190030003106002' }
                : snapshot))
            await customerTick(1500)
            if (kind === 'newer pending') await act(async () => newer.resolve(null))
            await customerTick(500)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
            if (kind === 'different task') {
                expect(document.querySelector('.dh-menu')).toBeNull()
                expect(state.hydrationCaseNumbers.at(-1)).toBe('2601190030003106002')
            } else expect(expandContext().value).toBe(before)
            expect(state.scanForErrors).toHaveBeenCalledTimes(kind === 'newer pending' ? 2 : 1)
        })

        it.each(['2601190030003106002', '2601190030003106', ''])('rejects changed or missing full live record %s without title fallback', async number => {
            const fixture = customerPage()
            await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
            const before = expandContext().value
            await customerTick(5250)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            fixture.insertAdjacentHTML('beforeend', '<h1>2601190030003106001</h1>')
            fireEvent.scroll(fixture)
            fixture.querySelector('[slot="value"]')!.textContent = number
            await customerTick(200)
            fixture.querySelector('[slot="value"]')!.textContent = '2601190030003106001'
            await customerTick(1000)
            expect(expandContext().value).toBe(before)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
            expect(state.scanForErrors).not.toHaveBeenCalled()
        })

        it.each(['', 'User edited context'])('cancels a queued scroll read on user edit (%s)', async edit => {
            const fixture = customerPage()
            await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
            await customerTick(5250)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            fireEvent.scroll(fixture)
            fireEvent.change(expandContext(), { target: { value: edit } })
            await customerTick(200)
            fireEvent.scroll(fixture)
            await customerTick(1500)
            expect(expandContext().value).toBe(edit)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
        })

        it.each(['close', 'unmount', 'case change'])('cancels a queued scroll read on %s', async action => {
            const fixture = customerPage()
            const view = await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
            await customerTick(5250)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            fireEvent.scroll(fixture)
            if (action === 'close') openFab()
            else if (action === 'unmount') view.unmount()
            else {
                fixture.querySelector('[slot="value"]')!.textContent = 'B'
                state.scanValue = B
                fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
                await flushReact()
            }
            await customerTick(1500)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
            expect(document.querySelector('.dh-menu')).toBeNull()
        })

        it('cancels on Analyze start and never changes the frozen payload during active scrolling', async () => {
            const fixture = customerPage()
            await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
            const before = expandContext().value
            await customerTick(5250)
            vi.mocked(PageReader.readCustomerName).mockClear()
            materializeCustomer(fixture)
            fireEvent.scroll(fixture)
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())
            await flushReact()
            const sent = getMessageLog().find(entry => entry.action === 'analyze_error')?.payload
            const frozen = JSON.stringify(sent)
            await customerTick(200)
            fireEvent.scroll(fixture)
            await customerTick(1500)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
            expect(expandContext().value).toBe(before)
            expect(JSON.stringify(sent)).toBe(frozen)
            await resolveSuccess(response)
            await customerTick(1500)
            expect(JSON.stringify(sent)).toBe(frozen)
            expect(PageReader.readCustomerName).not.toHaveBeenCalled()
        })
    })

    it.each(['open', 'background'])('does not renew the customer deadline after a sparse %s scan at four seconds', async route => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        openFab() // Close without accepting another scan.
        await flushReact()
        if (route === 'background') {
            await customerTick(2000)
            act(backgroundMutation)
            await customerTick(2000)
        } else {
            await customerTick(4000)
            openFab()
            await flushReact()
        }
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)
        await customerTick(1100)
        materializeCustomer(fixture)
        if (route === 'background') {
            openFab()
            await flushReact()
        }
        await customerTick()
        expect(expandContext().value).not.toContain('Late Account')
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        expect(expandContext().value).toContain('Late Account')
    })

    it('rebinds customer-only generation after an unrelated menu-open background scan', async () => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001', createdOn: 'Original date' })
        const before = expandContext().value
        state.scanValue = { ...A, caseNumber: '2601190030003106001', description: 'Must not replace preview', createdOn: 'Changed date' }
        const scan = deferredValue<unknown>()
        state.scanForErrors.mockImplementationOnce(() => scan.promise)
        act(backgroundMutation)
        await customerTick(2250) // Old enrichment observes the pending newer generation.
        await act(async () => { scan.resolve(state.scanValue) })
        expect(expandContext().value).toBe(before)
        materializeCustomer(fixture)
        await customerTick()
        expect(expandContext().value).toBe(before.replace('## Customer Name\n\n', '## Customer Name\n\nLate Account'))
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)
        await customerTick(3000)
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)
    })

    it('keeps the original deadline when a menu-open background scan rebinds at four seconds', async () => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        await customerTick(2000)
        act(backgroundMutation)
        await customerTick(2000)
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)
        await customerTick(1100)
        materializeCustomer(fixture)
        await customerTick()
        expect(expandContext().value).toBe(before)
    })

    it('does not rebind over an explicit empty edit made while the background scan awaits', async () => {
        const fixture = customerPage()
        const snapshot = { ...A, caseNumber: '2601190030003106001' }
        await renderOpenFab(snapshot)
        const pending = deferredValue<unknown>()
        state.scanForErrors.mockImplementationOnce(() => pending.promise)
        act(backgroundMutation)
        await customerTick(2250)
        fireEvent.change(expandContext(), { target: { value: '' } })
        materializeCustomer(fixture)
        await act(async () => { pending.resolve(snapshot) })
        await customerTick()
        expect(expandContext().value).toBe('')
    })

    it.each(['wrong case', 'invalid source', 'missing source', 'wrong live case'])('fails closed on a menu-open background scan with %s', async kind => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        state.scanValue = kind === 'wrong case' ? { ...A, caseNumber: '2601190030003106002' }
            : kind === 'invalid source' ? { ...A, caseNumber: '2601190030003106001', description: {} }
            : kind === 'missing source' ? null : { ...A, caseNumber: '2601190030003106001' }
        if (kind === 'wrong live case') fixture.querySelector('[slot="value"]')!.textContent = '2601190030003106002'
        act(backgroundMutation)
        await customerTick(2250)
        fixture.querySelector('[slot="value"]')!.textContent = '2601190030003106001'
        materializeCustomer(fixture)
        await customerTick()
        if (kind === 'wrong case') {
            expect(document.querySelector('.dh-menu')).toBeNull()
            expect(state.hydrationCaseNumbers.at(-1)).toBe('2601190030003106002')
        } else expect(expandContext().value).toBe(before)
        expect(state.scanForErrors).toHaveBeenCalledTimes(1)
    })

    it('does not carry an old asynchronous customer revalidation across case epochs', async () => {
        const fixture = customerPage()
        const original = { ...A, caseNumber: '2601190030003106001' }
        await renderOpenFab(original)
        const pending = deferredValue<unknown>()
        state.scanForErrors.mockImplementationOnce(() => pending.promise)
        act(backgroundMutation)
        await customerTick(2250)
        fixture.querySelector('[slot="value"]')!.textContent = '2601190030003106002'
        state.scanValue = { ...B, caseNumber: '2601190030003106002' }
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        openFab()
        await flushReact()
        materializeCustomer(fixture, 'Current Account')
        await act(async () => { pending.resolve(original) })
        await customerTick()
        expect(expandContext().value).toContain('2601190030003106002')
        expect(expandContext().value).toContain('Current Account')
        expect(expandContext().value).not.toContain('OLD CASE A BODY')
    })

    it('does not retry an expired customer epoch after active Analyze completes', async () => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        const sent = getMessageLog().find(entry => entry.action === 'analyze_error')?.payload
        const frozen = JSON.stringify(sent)
        materializeCustomer(fixture)
        await customerTick(5250)
        expect(expandContext().value).toBe(before)
        await resolveSuccess(response)
        openFab()
        await flushReact()
        await customerTick()
        expect(expandContext().value).not.toContain('Late Account')
        expect(JSON.stringify(sent)).toBe(frozen)
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        expect(expandContext().value).toContain('Late Account')
        expect(JSON.stringify(sent)).toBe(frozen)
    })

    it('enriches only customer in the open menu and next Analyze without full rescans', async () => {
        const caseNumber = '2601190030003106001'
        const fixture = customerPage(caseNumber)
        await renderOpenFab({ ...A, caseNumber, createdOn: 'Original date', context: 'Original context' })
        const before = expandContext().value
        materializeCustomer(fixture)
        await customerTick()
        const text = expandContext().value
        expect(text).toBe(before.replace('## Customer Name\n\n', '## Customer Name\n\nLate Account'))
        await customerTick(1000)
        expect(state.scanForErrors).not.toHaveBeenCalled()
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({ payload: { payload: { text, caseNumber } } })
        await resolveSuccess(response)
    })

    it.each(['', 'User edited context'])('preserves a user edit including explicit empty (%s)', async edit => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        fireEvent.change(expandContext(), { target: { value: edit } })
        materializeCustomer(fixture)
        await customerTick()
        expect(expandContext().value).toBe(edit)
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        await customerTick()
        expect(expandContext().value).toContain('## Customer Name\n\nLate Account')
    })

    it('defers enrichment during Analyze and keeps the sent snapshot unchanged', async () => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        const sent = getMessageLog().find(entry => entry.action === 'analyze_error')?.payload
        const frozen = JSON.stringify(sent)
        materializeCustomer(fixture)
        await customerTick()
        expect(expandContext().value).toBe(before)
        expect(JSON.stringify(sent)).toBe(frozen)
        await resolveSuccess(response)
        await customerTick()
        openFab()
        await flushReact()
        expect(expandContext().value).toContain('Late Account')
        expect(JSON.stringify(sent)).toBe(frozen)
    })

    it.each(['2601190030003106002', '2601190030003106', ''])('cancels on changed or missing live full record %s', async number => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        fixture.querySelector('[slot="value"]')!.textContent = number
        materializeCustomer(fixture)
        await customerTick()
        fixture.querySelector('[slot="value"]')!.textContent = '2601190030003106001'
        await customerTick()
        expect(expandContext().value).toBe(before)
    })

    it('expires after five seconds and disconnects on unmount', async () => {
        const fixture = customerPage()
        const view = await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        await customerTick(5000)
        materializeCustomer(fixture)
        await customerTick()
        expect(expandContext().value).toBe(before)
        expect(state.scanForErrors).not.toHaveBeenCalled()
        view.unmount()
        await customerTick(5000)
        expect(state.scanForErrors).not.toHaveBeenCalled()
    })

    it('observes only the discovered lookup and cancels its callbacks on unmount', async () => {
        const fixture = customerPage()
        materializeCustomer(fixture, '')
        const field = fixture.querySelector('ul')!
        const view = await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        expandContext()
        const observers = CapturingMutationObserver.instances.filter(observer =>
            observer.observe.mock.calls.some(call => call[0] === field))
        const observer = observers.at(-1)!
        expect(observer).toBeDefined()
        expect(observer.observe).toHaveBeenLastCalledWith(field, {
            attributes: true, characterData: true, childList: true, subtree: true,
        })
        field.querySelector('a')!.textContent = 'Observed Account'
        await act(async () => { observer.callback([], observer) })
        expect(expandContext().value).toContain('Observed Account')
        expect(observer.disconnect).toHaveBeenCalled()
        expect(state.scanForErrors).not.toHaveBeenCalled()
        view.unmount()
        await act(async () => { observer.callback([], observer) })
        await customerTick()
        expect(state.scanForErrors).not.toHaveBeenCalled()
    })

    it('cancels enrichment when a newer full scan is pending even on the same live case', async () => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const before = expandContext().value
        const pending = deferredValue<unknown>()
        state.scanForErrors.mockImplementationOnce(() => pending.promise)
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        materializeCustomer(fixture)
        await customerTick()
        expect(expandContext().value).toBe(before)
        await act(async () => { pending.resolve(null) })
        await customerTick()
        expect(expandContext().value).toBe(before)
    })

    it('disconnects an unfinished customer window on unmount', async () => {
        const fixture = customerPage()
        materializeCustomer(fixture, '')
        const view = await renderOpenFab({ ...A, caseNumber: '2601190030003106001' })
        const observer = CapturingMutationObserver.instances.at(-1)!
        observer.disconnect.mockClear()
        view.unmount()
        expect(observer.disconnect).toHaveBeenCalled()
        fixture.querySelector('a')!.textContent = 'Too late'
        await act(async () => { observer.callback([], observer) })
        await customerTick()
        expect(state.scanForErrors).not.toHaveBeenCalled()
    })

    it('preserves a known same-case customer on sparse scans but clears it on case change', async () => {
        const fixture = customerPage()
        await renderOpenFab({ ...A, caseNumber: '2601190030003106001', customerName: 'Known Account' })
        state.scanValue = { ...A, caseNumber: '2601190030003106001' }
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        expect(expandContext().value).toContain('Known Account')
        fixture.querySelector('[slot="value"]')!.textContent = '2601190030003106002'
        state.scanValue = { ...B, caseNumber: '2601190030003106002' }
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        openFab()
        await flushReact()
        expect(expandContext().value).not.toContain('Known Account')
    })

    it.each(['08/09/2026 9:07 PM', '2031-04-17T10:23:00.123Z (UTC)'])('includes Created On %s and Customer Name in the existing textarea and outgoing context', async createdOn => {
        const diagnostic = vi.spyOn(console, 'debug').mockImplementation(() => {})
        await renderOpenFab({ ...A, createdOn, customerName: 'Synthetic Account' })
        expect(diagnostic).toHaveBeenCalledWith('[DH] Created On', 'ui', 'applied', expect.any(Number), null)
        expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(createdOn)
        expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('Synthetic Account')
        diagnostic.mockRestore()
        const text = expandContext().value
        expect(screen.getAllByRole('textbox')).toHaveLength(1)
        expect(text).toMatch(/^## Case Number\n\nA/)
        expect(text).toContain(`## Created On\n\n${createdOn}`)
        expect(text).toContain('## Customer Name\n\nSynthetic Account')
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({ payload: { payload: { text, caseNumber: 'A' } } })
        await resolveSuccess(response)
    })

    describe('prior review regressions', () => {
        afterEach(() => vi.restoreAllMocks())

        it.each(['MANUAL A EDIT', ''])('FAB-R1 invalidates open-menu A authority after background B with edit %j', async edit => {
            await renderOpenFab()
            fireEvent.change(expandContext(), { target: { value: edit } })
            const scan = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => scan.promise)
            await triggerMutation()
            state.scanValue = B
            await act(async () => scan.resolve(B))
            await flushReact()
            expect(state.hydrationCaseNumbers.at(-1)).toBe('B')
            expect(document.querySelector('.dh-menu')).toBeNull()

            // A malformed subsequent scan cannot resurrect the old accepted A snapshot.
            state.scanValue = null
            window.dispatchEvent(new CustomEvent('dh-trigger-analyze', { detail: { selectionText: 'SELECTED TEXT' } }))
            await flushReact()
            expect(getMessageLog().filter(entry => entry.action === 'analyze_error')).toHaveLength(0)
            state.scanValue = B
            openFab()
            await flushReact()
            expect(expandContext().value).toContain('NEW CASE B BODY')
            expect(expandContext().value).not.toContain('MANUAL A EDIT')
        })

        it.each(['ONLY MY EDIT', '# My own heading\n\nONLY MY EDIT'])('FAB-R2 preserves non-template edit %j while replacing reserved sections', async edit => {
            const snapshot = { irSlaStatus: 'Succeeded', irSlaCapturedAt: '2031-04-17T10:23:00.123Z' }
            state.prefs.userPrompt = 'CURRENT PROMPT'
            await renderOpenFab({ ...A, ...snapshot })
            fireEvent.change(expandContext(), { target: { value: `${edit}\n\n## IR SLA Snapshot\n\nFORGED IR\n\n## User Prompt\n\nSTALE PROMPT` } })
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())
            await flushReact()
            expect(getMessageLog().filter(entry => entry.action === 'analyze_error')).toHaveLength(1)
            expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
                .toMatchObject({ payload: { payload: { caseNumber: 'A', text: `${edit}\n\n${formatIrSlaSnapshot(snapshot)}\n\n## User Prompt\n\nCURRENT PROMPT` } } })
            await resolveSuccess(response)
        })

        it.each(['', '   \n'])('FAB-R2 treats explicit blank %j as no Analyze content despite original description', async edit => {
            state.prefs.autoAnalyzeMode = 'always'
            await renderOpenFab({ ...A, caseNumber: 'CASE-A-1234' })
            fireEvent.change(expandContext(), { target: { value: edit } })
            expect(analyzeButton()).toBeDisabled()
            fireEvent.click(analyzeButton())
            await customerTick(500)
            expect(expandContext().value).toBe(edit)
            expect(getMessageLog().filter(entry => entry.action === 'analyze_error')).toHaveLength(0)
        })

        it.each(['NEWER EDIT', ''])('FAB-R3 preserves newer same-case edit %j while Refresh awaits', async edit => {
            await renderOpenFab()
            fireEvent.change(expandContext(), { target: { value: 'OLD EDIT' } })
            const scan = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => scan.promise)
            fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
            fireEvent.change(expandContext(), { target: { value: edit } })
            await act(async () => scan.resolve({ ...A, description: 'REFRESHED DESCRIPTION' }))
            await flushReact()
            expect(expandContext().value).toBe(edit)
            openFab()
            openFab()
            await flushReact()
            expect(expandContext().value).toBe(edit)
        })

        it('FAB-R3 resets an old edit when Refresh has no newer edit intent', async () => {
            await renderOpenFab()
            fireEvent.change(expandContext(), { target: { value: '' } })
            const scan = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => scan.promise)
            fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
            await act(async () => scan.resolve({ ...A, description: 'REFRESHED DESCRIPTION' }))
            await flushReact()
            expect(expandContext().value).toContain('REFRESHED DESCRIPTION')
        })

        it('FAB-R3 never carries a newer A edit into a Refresh result for B', async () => {
            await renderOpenFab()
            const scan = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => scan.promise)
            fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
            fireEvent.change(expandContext(), { target: { value: 'NEWER A EDIT' } })
            state.scanValue = B
            await act(async () => scan.resolve(B))
            await flushReact()
            openFab()
            await flushReact()
            expect(expandContext().value).toContain('NEW CASE B BODY')
            expect(expandContext().value).not.toContain('NEWER A EDIT')
        })

        it.each(['TERMINAL EDIT', ''])('FAB-R3 preserves newer edit %j during terminal Refresh participation', async edit => {
            await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            fireEvent.click(analyzeButton())
            await flushReact()
            const terminal = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => terminal.promise)
            await resolveSuccess(response)
            const refresh = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => refresh.promise)
            fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
            fireEvent.change(expandContext(), { target: { value: edit } })
            await act(async () => refresh.resolve(A))
            await flushReact()
            await act(async () => terminal.resolve(A))
            await flushReact()
            openFab()
            await flushReact()
            expect(expandContext().value).toBe(edit)
        })

        it('FAB-R4 coalesces visibility bursts and cancels scheduled work on menu cleanup and unmount', async () => {
            const view = await renderOpenFab()
            vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
            for (let index = 0; index < 30; index++) {
                document.dispatchEvent(new Event('visibilitychange'))
                await customerTick(10)
            }
            expect(state.scanForErrors).not.toHaveBeenCalled()
            await customerTick(500)
            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
            document.dispatchEvent(new Event('visibilitychange'))
            openFab() // Cleanup of the open-menu effect owns the pending timer.
            await customerTick(500)
            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
            document.dispatchEvent(new Event('visibilitychange'))
            const observer = CapturingMutationObserver.instances.filter(instance =>
                instance.observe.mock.calls.some(call => call[0] === document.body)).at(-1)!
            view.unmount()
            observer.callback([], observer)
            await customerTick(2500)
            expect(state.scanForErrors).toHaveBeenCalledTimes(1)
        })

        it('FAB-R4 applies current closed-menu policy to a visibility scan begun while open', async () => {
            await renderOpenFab()
            vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
            const scan = deferredValue<unknown>()
            state.scanForErrors.mockImplementationOnce(() => scan.promise)
            document.dispatchEvent(new Event('visibilitychange'))
            await customerTick(500)
            openFab()
            await act(async () => scan.resolve(B))
            await flushReact()
            expect(state.hydrationCaseNumbers.at(-1)).toBe('B')
            state.scanValue = null
            openFab()
            await flushReact()
            expect(expandContext().value).toContain('NEW CASE B BODY')
        })

        it.each(['auto', 'manual'] as const)('FAB-R5 transfers pending auto Analyze to enriched context without a duplicate %s send', async send => {
            const caseNumber = '2601190030003106001'
            const fixture = customerPage(caseNumber)
            const view = await renderOpenFab({ ...A, caseNumber })
            await customerTick(200)
            state.prefs.autoAnalyzeMode = 'always'
            view.rerender(<PrefsLanguageProvider language="en"><FAB /></PrefsLanguageProvider>)
            await flushReact()
            materializeCustomer(fixture)
            await customerTick(50) // Enrichment lands between scheduling and the 100 ms send.
            const response = deferNextResponse('analyze_error')
            if (send === 'manual') fireEvent.click(analyzeButton())
            await customerTick(500)
            const messages = getMessageLog().filter(entry => entry.action === 'analyze_error')
            expect(messages).toHaveLength(1)
            expect(messages[0].payload).toMatchObject({ payload: { payload: {
                caseNumber, text: expect.stringContaining('## Customer Name\n\nLate Account'),
            } } })
            await resolveSuccess(response)
            await customerTick(500)
            expect(getMessageLog().filter(entry => entry.action === 'analyze_error')).toHaveLength(1)
        })

        it('FAB-R5 cancels an enriched pending auto Analyze on unmount', async () => {
            const caseNumber = '2601190030003106001'
            const fixture = customerPage(caseNumber)
            const view = await renderOpenFab({ ...A, caseNumber })
            await customerTick(200)
            state.prefs.autoAnalyzeMode = 'always'
            view.rerender(<PrefsLanguageProvider language="en"><FAB /></PrefsLanguageProvider>)
            await flushReact()
            materializeCustomer(fixture)
            await customerTick(50)
            expect(expandContext().value).toContain('Late Account')
            view.unmount()
            await customerTick(500)
            expect(getMessageLog().filter(entry => entry.action === 'analyze_error')).toHaveLength(0)
        })

        it('FAB-R5 never sends enriched A after a newer B scan takes ownership', async () => {
            const caseNumber = '2601190030003106001'
            const fixture = customerPage(caseNumber)
            const view = await renderOpenFab({ ...A, caseNumber })
            await customerTick(200)
            state.prefs.autoAnalyzeMode = 'always'
            view.rerender(<PrefsLanguageProvider language="en"><FAB /></PrefsLanguageProvider>)
            await flushReact()
            materializeCustomer(fixture)
            await customerTick(50)
            state.scanValue = B // Short identifier prevents a new B auto-analysis.
            fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
            await flushReact()
            await customerTick(500)
            expect(state.hydrationCaseNumbers.at(-1)).toBe('B')
            expect(getMessageLog().filter(entry => entry.action === 'analyze_error')).toHaveLength(0)
        })
    })

    it('includes one scan-time IR snapshot in a fresh template and outgoing Analyze before User Prompt', async () => {
        const capturedAt = '2031-04-17T10:23:00.123Z'
        state.prefs.userPrompt = 'CURRENT PROMPT'
        await renderOpenFab({ ...A, irSlaStatus: 'Succeeded', irSlaCapturedAt: capturedAt })
        const text = expandContext().value
        expect(text).toContain(`## IR SLA Snapshot\n\nStatus: Succeeded\nCaptured at (UTC): ${capturedAt}\nCountdown: unknown\nDeadline (UTC): unknown`)
        expect(text).toContain('Captured observation, not a live timer or execution budget.\n\n## User Prompt\n\nCURRENT PROMPT')
        expect(text.match(/^## IR SLA Snapshot$/gm)).toHaveLength(1)
        const scansBeforeSend = state.scanForErrors.mock.calls.length
        await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        expect(state.scanForErrors).toHaveBeenCalledTimes(scansBeforeSend)
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({ payload: { payload: { text, caseNumber: 'A' } } })
        await resolveSuccess(response)
    })

    it.each([
        { irSlaStatus: 'Succeeded', irSlaCapturedAt: '2031-04-17T10:24:00.123Z' },
        { irSlaStatus: 'unknown', irSlaCapturedAt: '2031-04-17T10:25:00.123Z' },
        { irSlaStatus: undefined, irSlaCapturedAt: undefined },
    ])('refreshes only outgoing IR from the latest accepted scan while preserving an edited template ($irSlaStatus, $irSlaCapturedAt)', async snapshot => {
        const capturedAt = '2031-04-17T10:23:00.123Z'
        await renderOpenFab({ ...A, createdOn: 'Original date', customerName: 'Original Account', irSlaStatus: 'Succeeded', irSlaCapturedAt: capturedAt })
        const textarea = expandContext()
        const edited = textarea.value.replace('Original date', 'Edited date').replace('Original Account', 'Edited Account')
            .replace('Status: Succeeded', 'Status: USER OVERRIDE')
            + '\n\n## User Prompt\n\nSTALE PROMPT'
        fireEvent.change(textarea, { target: { value: edited } })
        openFab()
        state.scanValue = { ...A, ...snapshot, createdOn: 'Changed date', customerName: 'Changed Account' }
        await triggerMutation()
        openFab()
        await flushReact()
        expect(expandContext().value).toBe(edited)
        const scansBeforeSend = state.scanForErrors.mock.calls.length
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        const expected = edited.replace('Status: USER OVERRIDE', `Status: ${snapshot.irSlaStatus === 'Succeeded' ? 'Succeeded' : 'Unknown'}`)
            .replace(capturedAt, snapshot.irSlaCapturedAt ?? 'unavailable')
            .replace('\n\n## User Prompt\n\nSTALE PROMPT', '')
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({ payload: { payload: { text: expected, caseNumber: 'A' } } })
        expect(state.scanForErrors).toHaveBeenCalledTimes(scansBeforeSend)
        expect(expandContext().value).toBe(edited)
        await resolveSuccess(response)
    })

    it('protects edited metadata from changed and shorter same-case scans until explicit refresh', async () => {
        const diagnostic = vi.spyOn(console, 'debug').mockImplementation(() => {})
        await renderOpenFab({ ...A, createdOn: 'Original date', customerName: 'Original Account' })
        const textarea = expandContext()
        expect(textarea.value).toContain('## Customer Name\n\nOriginal Account')
        const edited = textarea.value.replace('Original date', 'Edited date').replace('Original Account', 'Edited Account')
        fireEvent.change(textarea, { target: { value: edited } })
        for (const fresh of [{ ...A, createdOn: 'New date', customerName: 'New Account' }, { ...A, description: 'Short', errorText: 'Short' }]) {
            fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
            state.scanValue = fresh
            await triggerMutation()
            openFab()
            await flushReact()
            expect(expandContext().value).toBe(edited)
            expect(state.hydrationCaseNumbers.at(-1)).toBe('A')
        }
        const response = deferNextResponse('analyze_error')
        fireEvent.click(analyzeButton())
        await flushReact()
        expect(getMessageLog().find(entry => entry.action === 'analyze_error')?.payload)
            .toMatchObject({ payload: { payload: { text: edited, caseNumber: 'A' } } })
        await resolveSuccess(response)
        openFab()
        await flushReact()
        state.scanValue = { ...A, createdOn: 'Refreshed date', customerName: 'Refreshed Account' }
        expect(diagnostic).toHaveBeenCalledWith('[DH] Created On', 'ui', 'edited_context', expect.any(Number), null)
        diagnostic.mockClear()
        fireEvent.click(screen.getByTitle('Refresh Context (Re-scan page)'))
        await flushReact()
        expect(expandContext().value).toContain('## Created On\n\nRefreshed date')
        expect(expandContext().value).toContain('## Customer Name\n\nRefreshed Account')
        expect(expandContext().value).not.toContain('Edited Account')
        expect(diagnostic).toHaveBeenCalledWith('[DH] Created On', 'ui', 'applied', expect.any(Number), null)
        expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('Refreshed')
        diagnostic.mockRestore()
    })

    it('does not carry metadata or edits from A into a B scan with unloaded fields', async () => {
        await renderOpenFab({ ...A, createdOn: 'A date', customerName: 'A Account' })
        const textarea = expandContext()
        expect(textarea.value).toContain('## Customer Name\n\nA Account')
        fireEvent.change(textarea, { target: { value: textarea.value.replace('A Account', 'Edited A Account') } })
        fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
        state.scanValue = B
        await triggerMutation()
        openFab()
        await flushReact()
        const text = expandContext().value
        expect(text).toMatch(/^## Case Number\n\nB/)
        expect(text).toContain('## Created On\n\n\n\n')
        expect(text).toContain('## Customer Name\n\n\n\n')
        expect(text).not.toContain('A Account')
        expect(text).not.toContain('A date')
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
            await vi.advanceTimersByTimeAsync(187_999)
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

    it.each(['success', 'error'] as const)(
        'does not retain terminal or running progress after rejected page revalidation (%s)',
        async status => {
            await renderOpenFab()
            const response = deferNextResponse('analyze_error')
            const postRunScan = deferredValue<unknown>()
            fireEvent.click(analyzeButton())
            expect(screen.getByRole('status')).toHaveTextContent('Analysis in progress')
            state.scanForErrors
                .mockReset()
                .mockImplementationOnce(() => postRunScan.promise)
                .mockResolvedValue(A)

            await act(async () => response.resolve({
                ...(status === 'success'
                    ? { status, data: { markdown: 'UNVALIDATED PROGRESS RESULT' } }
                    : { status, error: 'UNVALIDATED PROGRESS ERROR' }),
                attachmentNotice: 'UNVALIDATED ATTACHMENT NOTICE',
            }))
            await flushReact()
            expect(screen.queryByRole('region', { name: 'Analysis in progress' })).not.toBeInTheDocument()

            await act(async () => postRunScan.resolve({ ...A, errorText: 7 }))
            await flushReact()
            expect(screen.queryByRole('region', { name: 'Analysis in progress' })).not.toBeInTheDocument()
            expect(document.body).not.toHaveTextContent('UNVALIDATED')
            expectNoVisibleOutcomeTelemetry()
            expect(analyzeButton()).not.toBeDisabled()

            // A later valid same-page scan must not resurrect the rejected outcome.
            openFab()
            await flushReact()
            openFab()
            await flushReact()
            expect(screen.queryByRole('region', { name: 'Analysis in progress' })).not.toBeInTheDocument()
            expect(document.body).not.toHaveTextContent('UNVALIDATED')
            expectNoVisibleOutcomeTelemetry()
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
                    await vi.advanceTimersByTimeAsync(190_000)
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
        const freshB = { ...B, productCategory: 'B PRODUCT', irSlaStatus: 'Succeeded', irSlaCapturedAt: '2031-04-17T10:23:00.123Z' }
        state.scanValue = freshB
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

        const bResponse = deferNextResponse('analyze_error')
        const selectionText = '## Case Number\n\nA\n\nSTALE A CONTEXT MENU SELECTION'
        const scansBeforeSelection = state.scanForErrors.mock.calls.length
        await act(async () => {
            window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
                detail: { selectionText },
            }))
            await Promise.resolve()
        })
        await flushReact()
        // A was invalidated. This explicit selection takes a fresh B snapshot;
        // selected text is content, never authority for the request's case identity.
        expect(state.scanForErrors).toHaveBeenCalledTimes(scansBeforeSelection + 1)
        const messages = getMessageLog().filter(entry => entry.action === 'analyze_error')
        expect(messages).toHaveLength(2)
        expect(messages[0].payload).toMatchObject({ payload: {
            requestId: expect.any(String),
            payload: { caseNumber: 'A', context: 'page-scan', text: expect.stringContaining('OLD CASE A BODY') },
            _persist: { caseNumber: 'A' },
        } })
        expect(messages[1].payload).toMatchObject({ payload: {
            requestId: expect.any(String),
            payload: { caseNumber: 'B', product: 'B PRODUCT', context: 'Context Menu Selection', text: `${selectionText}\n\n${formatIrSlaSnapshot(freshB)}` },
            _persist: { caseNumber: 'B' },
        } })
        const firstRequest = messages[0].payload as { payload: { requestId: string } }
        const secondRequest = messages[1].payload as { payload: { requestId: string } }
        expect(secondRequest.payload.requestId).not.toBe(firstRequest.payload.requestId)
        expect(JSON.stringify(messages[1].payload)).not.toContain('OLD CASE A BODY')
        expect(state.hydrationCaseNumbers.at(-1)).toBe('B')
        expect(staleTextarea.value).toBe(selectionText)

        state.scanValue = freshB
        await resolveSuccess(response)
        expect(staleTextarea.value).toBe(selectionText)
        expect(analyzeButton()).toBeDisabled()
        expectNoVisibleOutcomeForA()
        expectNoVisibleOutcomeTelemetry()
        await resolveSuccess(bResponse, 'RESULT FOR B')
        expect(document.body).toHaveTextContent('RESULT FOR B')
        expect(document.body).not.toHaveTextContent('RESULT FOR A')
        openFab()
        await flushReact()
        expect(expandContext().value).toContain('NEW CASE B BODY')
        expect(expandContext().value).not.toContain('OLD CASE A BODY')
        expect(analyzeButton()).not.toBeDisabled()
        expect(getMessageLog().filter(entry => entry.action === 'analyze_error'))
            .toHaveLength(2)
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
                    payload: { text: `${manualEdit}\n\n${formatIrSlaSnapshot({})}` },
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
            await vi.advanceTimersByTimeAsync(188_000)
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
