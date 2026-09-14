// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import markup from './page.html?raw'
import type { DownloadObservation, observeDownload } from './observer'

const mocked = vi.hoisted(() => ({
    observe: vi.fn<typeof observeDownload>(),
    inspect: vi.fn(),
}))
vi.mock('./observer', () => ({ observeDownload: mocked.observe }))
vi.mock('./portal', () => ({ inspectPortal: mocked.inspect }))

const SPENT_KEY = 'dh_attachment_harness_spent'
const CASE = '1234567890123456'
const WORKSPACE = '11111111-2222-3333-4444-555555555555'
const FILENAME = 'synthetic file.txt'
const BASE = `https://api.dtmnebula.microsoft.com/${WORKSPACE}/download?filename=synthetic%20file.txt`
const TAB = { id: 7, active: true, url: 'https://client.dtmnebula.microsoft.com/synthetic', title: 'PRIVATE_TITLE' }
type Reply = { frameId: number; documentId: string; result: { status: string; baseUrl?: string } }
type Script = { target: { tabId: number; frameIds?: number[]; documentIds?: string[] }; world: string; func: unknown; args: string[] }
type LockCallback = (lock: { name: string } | null) => Promise<void>

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
    return { promise, resolve, reject }
}

function ready(): Reply[] {
    return [{ frameId: 0, documentId: 'synthetic-document', result: { status: 'ready', baseUrl: BASE } }]
}

function fixture() {
    const stored: Record<string, unknown> = {}
    const order: string[] = []
    let held = false
    const request = vi.fn(async (name: string, options: { ifAvailable: boolean }, callback: LockCallback) => {
        expect(name).toBe('dh-attachment-harness-once')
        expect(options).toEqual({ ifAvailable: true })
        if (held) return callback(null)
        held = true
        try { await callback({ name }) } finally { held = false }
    })
    const get = vi.fn(async (key: string): Promise<Record<string, unknown>> => ({ [key]: stored[key] }))
    const set = vi.fn(async (values: Record<string, unknown>) => {
        order.push('persisted')
        Object.assign(stored, values)
    })
    const query = vi.fn(async () => [TAB])
    const tabGet = vi.fn(async (id: number) => ({ ...TAB, id }))
    const execute = vi.fn(async (script: Script): Promise<Reply[]> => {
        if (script.args.length === 3) return ready()
        order.push('execute')
        return [{ frameId: 0, documentId: 'synthetic-document', result: { status: 'clicked' } }]
    })
    const downloads = {
        onCreated: { addListener: vi.fn(), removeListener: vi.fn() },
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
        search: vi.fn(),
    }
    vi.stubGlobal('chrome', { tabs: { query, get: tabGet }, storage: { local: { get, set } },
        scripting: { executeScript: execute }, downloads })
    vi.stubGlobal('navigator', { locks: { request } })
    mocked.observe.mockImplementation(async (_source, _downloads, trigger) => {
        order.push('observe')
        let clicked = false
        try { clicked = await trigger() } catch { /* The observer converts trigger rejection to a safe result. */ }
        return { status: clicked ? 'complete' : 'trigger_failed', matchedCount: clicked ? 1 : 0 }
    })
    return { stored, order, request, get, set, query, tabGet, execute, downloads, held: () => held }
}

async function flush() {
    await vi.advanceTimersByTimeAsync(0)
}

async function loadPage() {
    vi.resetModules()
    const parsed = new DOMParser().parseFromString(markup, 'text/html')
    document.body.replaceChildren(...Array.from(parsed.body.childNodes))
    const input = (id: string) => document.getElementById(id) as HTMLInputElement
    const button = (id: string) => document.getElementById(id) as HTMLButtonElement
    const ui = {
        caseNumber: input('caseNumber'), workspace: input('workspace'), filename: input('filename'),
        portal: document.getElementById('portal') as HTMLSelectElement,
        refresh: button('refresh'), inspect: button('inspect'), run: button('run'),
        status: document.getElementById('status')!, result: document.getElementById('result')!,
        form: document.getElementById('form')!, warnings: document.querySelector('aside')!,
    }
    await import('./page')
    await flush()
    return ui
}

type UI = Awaited<ReturnType<typeof loadPage>>

async function fill(ui: UI) {
    ui.refresh.click()
    await flush()
    for (const [field, value] of [[ui.caseNumber, CASE], [ui.workspace, WORKSPACE], [ui.filename, FILENAME]] as const) {
        field.value = value
        field.dispatchEvent(new Event('input', { bubbles: true }))
    }
}

async function prepare(ui: UI) {
    await fill(ui)
    ui.inspect.click()
    await flush()
}

describe('standalone attachment download controller', () => {
    let f: ReturnType<typeof fixture>
    beforeEach(() => {
        vi.useFakeTimers()
        vi.resetAllMocks()
        f = fixture()
    })
    afterEach(() => {
        const timers = vi.getTimerCount()
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.unstubAllGlobals()
        document.body.replaceChildren()
        expect(timers).toBe(0)
        expect(mocked.inspect).not.toHaveBeenCalled()
        expect(f.downloads.onCreated.addListener).not.toHaveBeenCalled()
        expect(f.downloads.onChanged.addListener).not.toHaveBeenCalled()
        expect(f.downloads.search).not.toHaveBeenCalled()
    })

    it('preserves markup and warnings, prevents form submission, and initializes without automatic operations', async () => {
        const ui = await loadPage()
        expect(document.querySelector('aside')).toBe(ui.warnings)
        expect(ui.warnings.textContent).toContain('运行期间不要关闭、刷新此页或导航目标门户')
        expect(document.getElementById('form')).toBe(ui.form)
        const submit = new Event('submit', { bubbles: true, cancelable: true })
        expect(ui.form.dispatchEvent(submit)).toBe(false)
        expect(submit.defaultPrevented).toBe(true)
        expect(f.get).toHaveBeenCalledExactlyOnceWith(SPENT_KEY)
        expect(f.query).not.toHaveBeenCalled()
        expect(f.tabGet).not.toHaveBeenCalled()
        expect(f.execute).not.toHaveBeenCalled()
        expect(f.set).not.toHaveBeenCalled()
        expect(f.request).not.toHaveBeenCalled()
        expect(mocked.observe).not.toHaveBeenCalled()
        expect(ui.run.disabled).toBe(true)
    })

    it('enumerates exact-origin tabs without displaying URLs or titles', async () => {
        f.query.mockResolvedValue([
            TAB, { ...TAB, id: 8, active: false },
            { ...TAB, id: 9, url: 'https://client.dtmnebula.microsoft.com.evil.test/' },
            { ...TAB, id: 10, url: 'https://user@client.dtmnebula.microsoft.com/' },
            { ...TAB, id: 11, url: 'https://@client.dtmnebula.microsoft.com/' },
        ])
        const ui = await loadPage()
        ui.refresh.click()
        await flush()
        expect(f.query).toHaveBeenCalledExactlyOnceWith({ url: 'https://client.dtmnebula.microsoft.com/*' })
        expect(Array.from(ui.portal.options, option => option.textContent)).toEqual(['DTM 页面 1（活动：是）', 'DTM 页面 2（活动：否）'])
        expect(document.body.textContent).not.toContain(TAB.url)
        expect(document.body.textContent).not.toContain(TAB.title)
        expect(f.set).not.toHaveBeenCalled()
    })

    it('captures a read-only frame-zero document binding without exposing the source', async () => {
        const ui = await loadPage()
        await prepare(ui)
        expect(f.tabGet).toHaveBeenCalledExactlyOnceWith(TAB.id)
        expect(f.execute).toHaveBeenCalledExactlyOnceWith({ target: { tabId: TAB.id, frameIds: [0] },
            world: 'MAIN', func: mocked.inspect, args: [CASE, WORKSPACE, FILENAME] })
        expect(ui.run.disabled).toBe(false)
        expect(document.body.textContent).not.toContain(BASE)
        expect(mocked.observe).not.toHaveBeenCalled()
    })

    it('accepts a fileName source and passes its exact raw value to the document-bound click', async () => {
        const actualBase = BASE.replace('?filename=', '?fileName=')
        const reply = ready()
        reply[0].result.baseUrl = actualBase
        f.execute.mockResolvedValueOnce(reply)
        const ui = await loadPage()
        await prepare(ui)
        expect(ui.run.disabled).toBe(false)
        expect(mocked.observe).not.toHaveBeenCalled()
        ui.run.click()
        await flush()
        expect(f.execute).toHaveBeenCalledTimes(2)
        expect(f.execute.mock.calls[1][0]).toEqual({ target: { tabId: TAB.id, documentIds: ['synthetic-document'] },
            world: 'MAIN', func: mocked.inspect, args: [CASE, WORKSPACE, FILENAME, actualBase] })
        expect(mocked.observe).toHaveBeenCalledTimes(1)
        expect(mocked.observe.mock.calls[0][0]).toEqual({ baseUrl: actualBase.replace('%20', '+'),
            origin: 'https://api.dtmnebula.microsoft.com', workspace: WORKSPACE })
    })

    it.each([
        BASE.replace('?filename=', '?FileName='),
        `${BASE}&fileName=synthetic%20file.txt`,
        `${BASE}&filename=synthetic%20file.txt`,
    ])('independently rejects differently cased or duplicate filename query keys %#', async baseUrl => {
        const reply = ready()
        reply[0].result.baseUrl = baseUrl
        f.execute.mockResolvedValueOnce(reply)
        const ui = await loadPage()
        await prepare(ui)
        expect(ui.run.disabled).toBe(true)
        ui.run.click()
        await flush()
        expect(f.execute).toHaveBeenCalledTimes(1)
        expect(f.set).not.toHaveBeenCalled()
        expect(mocked.observe).not.toHaveBeenCalled()
    })

    it.each(['caseNumber', 'workspace', 'filename', 'portal'] as const)('invalidates preparation on %s edits', async field => {
        const ui = await loadPage()
        await prepare(ui)
        ui[field].dispatchEvent(new Event(field === 'portal' ? 'change' : 'input', { bubbles: true }))
        expect(ui.run.disabled).toBe(true)
        ui.run.click()
        await flush()
        expect(f.set).not.toHaveBeenCalled()
    })

    it('ignores an inspection response after an unannounced input change', async () => {
        const ui = await loadPage()
        await fill(ui)
        const pending = deferred<Reply[]>()
        f.execute.mockReturnValueOnce(pending.promise)
        ui.inspect.click()
        await flush()
        ui.filename.value = 'different.txt'
        pending.resolve(ready())
        await flush()
        expect(ui.run.disabled).toBe(true)
        expect(ui.status.textContent).not.toContain('检查通过')
    })

    it('ignores a timed-out inspection arriving after a newer successful inspection', async () => {
        const ui = await loadPage()
        await fill(ui)
        const pending = deferred<Reply[]>()
        f.execute.mockReturnValueOnce(pending.promise)
        ui.inspect.click()
        await flush()
        await vi.advanceTimersByTimeAsync(10_000)
        expect(ui.run.disabled).toBe(true)
        ui.inspect.click()
        await flush()
        const status = ui.status.textContent
        pending.resolve([{ frameId: 1, documentId: 'stale', result: { status: 'unavailable' } }])
        await flush()
        expect(ui.status.textContent).toBe(status)
        expect(ui.run.disabled).toBe(false)
    })

    it('awaits boolean persistence before observer registration and the document-bound trigger', async () => {
        const ui = await loadPage()
        await prepare(ui)
        const write = deferred<void>()
        f.set.mockImplementationOnce(async values => {
            f.order.push('write-start')
            await write.promise
            Object.assign(f.stored, values)
            f.order.push('persisted')
        })
        ui.run.click()
        await flush()
        expect(f.set).toHaveBeenCalledExactlyOnceWith({ [SPENT_KEY]: true })
        expect(mocked.observe).not.toHaveBeenCalled()
        expect(f.execute).toHaveBeenCalledTimes(1)
        for (const control of [ui.caseNumber, ui.workspace, ui.filename, ui.portal, ui.refresh, ui.inspect, ui.run]) {
            expect(control.disabled).toBe(true)
        }
        ui.refresh.dispatchEvent(new Event('click'))
        ui.inspect.dispatchEvent(new Event('click'))
        ui.run.dispatchEvent(new Event('click'))
        expect(f.request).toHaveBeenCalledTimes(1)
        write.resolve()
        await flush()
        expect(f.order).toEqual(['write-start', 'persisted', 'observe', 'execute'])
        expect(f.execute.mock.calls[1][0]).toEqual({ target: { tabId: TAB.id, documentIds: ['synthetic-document'] },
            world: 'MAIN', func: mocked.inspect, args: [CASE, WORKSPACE, FILENAME, BASE] })
        const [source, downloads, , timeout] = mocked.observe.mock.calls[0]
        expect(Object.isFrozen(source)).toBe(true)
        expect(source).toEqual({ baseUrl: BASE.replace('%20', '+'), origin: 'https://api.dtmnebula.microsoft.com', workspace: WORKSPACE })
        expect(downloads).toBe(f.downloads)
        expect(timeout).toBe(30_000)
        expect(ui.result.textContent).toBe('浏览器报告唯一匹配下载已完成（非文件内容校验）\n匹配数量：1')
        expect(ui.result.textContent).not.toMatch(/https?:|PRIVATE_TITLE|synthetic|[A-Z]:\\/)
        expect(f.stored).toEqual({ [SPENT_KEY]: true })
        expect(ui.run.disabled).toBe(true)
        expect(ui.inspect.disabled).toBe(false)
        expect(f.held()).toBe(false)
    })

    it('reloads the persistent spent marker while still permitting read-only inspection', async () => {
        const first = await loadPage()
        await prepare(first)
        first.run.click()
        await flush()
        const reloaded = await loadPage()
        expect(reloaded.run.disabled).toBe(true)
        await prepare(reloaded)
        reloaded.run.click()
        await flush()
        expect(f.set).toHaveBeenCalledTimes(1)
        expect(mocked.observe).toHaveBeenCalledTimes(1)
        expect(reloaded.status.textContent).toContain('单次机会已消耗')
    })

    it.each(['initialization', 'locked read'])('refuses a malformed spent marker at %s', async phase => {
        if (phase === 'initialization') f.stored[SPENT_KEY] = 'false'
        const ui = await loadPage()
        await prepare(ui)
        f.stored[SPENT_KEY] = 'false'
        ui.run.click()
        await flush()
        expect(ui.run.disabled).toBe(true)
        expect(f.set).not.toHaveBeenCalled()
        expect(mocked.observe).not.toHaveBeenCalled()
        expect(f.held()).toBe(false)
    })

    it('denies a second page while the first page holds the shared lock', async () => {
        const first = await loadPage()
        await prepare(first)
        const second = await loadPage()
        await prepare(second)
        const write = deferred<void>()
        f.set.mockImplementationOnce(async values => { await write.promise; Object.assign(f.stored, values) })
        first.run.click()
        await flush()
        expect(f.held()).toBe(true)
        const reads = f.get.mock.calls.length
        second.run.click()
        await flush()
        expect(second.status.textContent).toContain('另一个诊断页面正在运行')
        expect(f.get).toHaveBeenCalledTimes(reads)
        expect(f.set).toHaveBeenCalledTimes(1)
        expect(mocked.observe).not.toHaveBeenCalled()
        write.resolve()
        await flush()
        await prepare(second)
        second.run.click()
        await flush()
        expect(second.status.textContent).toContain('单次机会已消耗')
        expect(mocked.observe).toHaveBeenCalledTimes(1)
        expect(f.set).toHaveBeenCalledTimes(1)
        expect(f.held()).toBe(false)
    })

    it('fails closed on a spent write failure and releases the lock without triggering', async () => {
        const ui = await loadPage()
        await prepare(ui)
        f.set.mockRejectedValueOnce(new Error(BASE))
        ui.run.click()
        await flush()
        expect(mocked.observe).not.toHaveBeenCalled()
        expect(f.execute).toHaveBeenCalledTimes(1)
        expect(ui.status.textContent).not.toContain(BASE)
        expect(f.held()).toBe(false)
        await prepare(ui)
        expect(ui.run.disabled).toBe(true)
        ui.run.click()
        expect(f.set).toHaveBeenCalledTimes(1)
    })

    it('never triggers after a spent write times out and later succeeds', async () => {
        const ui = await loadPage()
        await prepare(ui)
        const write = deferred<void>()
        f.set.mockReturnValueOnce(write.promise)
        ui.run.click()
        await flush()
        await vi.advanceTimersByTimeAsync(10_000)
        write.resolve()
        await flush()
        expect(mocked.observe).not.toHaveBeenCalled()
        expect(ui.run.disabled).toBe(true)
        expect(f.held()).toBe(false)
    })

    it('ignores a late lock rejection without clobbering newer prepared state', async () => {
        const ui = await loadPage()
        await prepare(ui)
        const lock = deferred<void>()
        f.request.mockReturnValueOnce(lock.promise)
        ui.run.click()
        await flush()
        await vi.advanceTimersByTimeAsync(10_000)
        ui.inspect.click()
        await flush()
        const status = ui.status.textContent
        lock.reject(new Error(BASE))
        await flush()
        expect(ui.status.textContent).toBe(status)
        expect(ui.run.disabled).toBe(false)
        expect(f.set).not.toHaveBeenCalled()
    })

    it('refuses a lock callback admitted after its deadline', async () => {
        const ui = await loadPage()
        await prepare(ui)
        const admission = deferred<void>()
        f.request.mockImplementationOnce(async (name, _options, callback) => {
            await admission.promise
            await callback({ name })
        })
        ui.run.click()
        await flush()
        await vi.advanceTimersByTimeAsync(10_000)
        admission.resolve()
        await flush()
        expect(f.get).toHaveBeenCalledTimes(1)
        expect(f.set).not.toHaveBeenCalled()
        expect(mocked.observe).not.toHaveBeenCalled()
    })

    it('does not dispatch a late click when trigger tab revalidation times out', async () => {
        const ui = await loadPage()
        await prepare(ui)
        const tab = deferred<typeof TAB>()
        f.tabGet.mockResolvedValueOnce(TAB).mockReturnValueOnce(tab.promise)
        ui.run.click()
        await flush()
        await vi.advanceTimersByTimeAsync(10_000)
        tab.resolve(TAB)
        await flush()
        expect(f.execute).toHaveBeenCalledTimes(1)
        expect(ui.status.textContent).toContain('不会重试')
        expect(ui.run.disabled).toBe(true)
        expect(f.held()).toBe(false)
    })

    it.each([
        { frameId: 1, documentId: 'synthetic-document', result: { status: 'clicked' } },
        { frameId: 0, documentId: 'different-document', result: { status: 'clicked' } },
        { frameId: 0, documentId: 'synthetic-document', result: { status: 'unavailable' } },
    ])('refuses a mismatched execution acknowledgement: %j', async reply => {
        const ui = await loadPage()
        await prepare(ui)
        f.execute.mockResolvedValueOnce([reply])
        ui.run.click()
        await flush()
        expect(ui.status.textContent).toContain('未能确认下载触发')
        expect(ui.run.disabled).toBe(true)
    })

    it.each([
        ['unmatched', '观察期内未找到匹配下载；不会重复点击。'],
        ['incomplete', '观察期结束时唯一匹配下载尚未完成；不会重复点击。'],
        ['ambiguous', '发现多个匹配下载，无法确定唯一结果；不会重复点击。'],
        ['blocked', '浏览器未将匹配下载标记为安全；不会接受危险下载或重复点击。'],
        ['observer_failed', '无法可靠观察下载结果；本次机会已消耗，不会重试。'],
    ] as const)('renders safe %s observations without another attempt', async (status, message) => {
        const ui = await loadPage()
        await prepare(ui)
        mocked.observe.mockResolvedValueOnce({ status, matchedCount: status === 'ambiguous' ? 2 : 0 } satisfies DownloadObservation)
        ui.run.click()
        await flush()
        expect(ui.status.textContent).toBe(message)
        expect(ui.result.textContent).toBe(`${message}\n匹配数量：${status === 'ambiguous' ? 2 : 0}`)
        ui.run.click()
        expect(mocked.observe).toHaveBeenCalledTimes(1)
        expect(f.set).toHaveBeenCalledTimes(1)
        expect(ui.run.disabled).toBe(true)
    })
})
