import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { readCurrentRecordCreatedOn } from './createdOnModel'

const ORIGIN = 'https://onesupport.crm.dynamics.com'
const CASE = '2601190030003106'
const TASK = `${CASE}001`
const ISO = '2031-04-17T10:23:00.123Z'
const GUID = '11111111-2222-3333-4444-555555555555'

function header(number = CASE, parent: Node = document.body) {
    const list = document.createElement('uci-header-control-list')
    list.innerHTML = `<uci-header-control-list-item data-name="header_msdfm_casenumberservicelevel"><span slot="label">Case number / Service name</span><span slot="value">${number} | Synthetic service</span></uci-header-control-list-item>`
    parent.appendChild(list)
    const value = list.querySelector('[slot="value"]')!
    vi.spyOn(value, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    return { list, value }
}

function model(number = CASE, date: unknown = new Date(ISO)) {
    const getId = vi.fn(() => GUID)
    const getEntityName = vi.fn(() => 'incident')
    const getAttribute = vi.fn((name: string) => ({ getValue: () => ({
        ticketnumber: number, createdon: date,
    }[name]) }))
    const page = { data: { entity: { getId, getEntityName } }, getAttribute }
    vi.stubGlobal('Xrm', { Page: page })
    return { page, getId, getEntityName, getAttribute }
}

beforeEach(() => {
    vi.stubGlobal('location', { origin: ORIGIN })
    document.body.replaceChildren()
})
afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    document.body.replaceChildren()
})

describe('read-only current record model Created On', () => {
    it.each([CASE, TASK])('reads genuine Date without Details for full record %s', async number => {
        header(number)
        const { getAttribute } = model(number)
        expect(await readCurrentRecordCreatedOn(number)).toEqual({ status: 'ok', caseNumber: number, createdOnUtc: ISO })
        expect(getAttribute.mock.calls.every(([name]) => ['ticketnumber', 'createdon'].includes(name))).toBe(true)
        expect(document.querySelector('[data-id^="createdon."]')).toBeNull()
    })

    it('accepts a foreign-realm Date without calling instance methods', async () => {
        header()
        const date = runInNewContext(`new Date('${ISO}')`) as Date
        expect(date instanceof Date).toBe(false)
        date.toISOString = () => { throw new Error('must use intrinsic') }
        model(CASE, date)
        expect(await readCurrentRecordCreatedOn(CASE)).toMatchObject({ createdOnUtc: ISO })
    })

    it('is self-contained after function serialization', async () => {
        header()
        model()
        const injected = new Function(`return (${readCurrentRecordCreatedOn.toString()})`)() as typeof readCurrentRecordCreatedOn
        expect(await injected(CASE)).toMatchObject({ createdOnUtc: ISO })
    })

    it('uses only the observed composite attribute when ticketnumber does not match', async () => {
        header(TASK)
        const { getAttribute } = model(CASE)
        getAttribute.mockImplementation(name => ({ getValue: () => ({
            ticketnumber: CASE, msdfm_casenumberservicelevel: `${TASK} | Synthetic service`, createdon: new Date(ISO),
        }[name]) }))
        expect(await readCurrentRecordCreatedOn(TASK)).toMatchObject({ status: 'ok', caseNumber: TASK })
    })

    it.each([[TASK, CASE], [CASE, TASK], [CASE, '2601190030003107']])('rejects header %s versus model %s, never normalizing parent', async (visible, loaded) => {
        header(visible)
        model(loaded)
        expect(await readCurrentRecordCreatedOn(visible)).toEqual({ status: 'unavailable' })
    })

    it('rejects a request for the parent while the task is displayed', async () => {
        header(TASK)
        model(CASE)
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it('allows boxless hosts and visible descendant overrides, including open roots', async () => {
        const host = document.createElement('synthetic-host')
        host.style.visibility = 'hidden'
        host.setAttribute('aria-hidden', 'true')
        const outer = document.createElement('uci-header-control-list')
        document.body.append(outer)
        outer.append(host)
        const { value } = header(CASE, host.attachShadow({ mode: 'open' }))
        value.setAttribute('style', 'visibility: visible')
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toMatchObject({ status: 'ok' })
    })

    it.each(['display: none', 'opacity: 0'])('rejects composed ancestor %s', async style => {
        const host = document.createElement('synthetic-host')
        host.setAttribute('style', style)
        const outer = document.createElement('uci-header-control-list')
        document.body.append(outer)
        outer.append(host)
        header(CASE, host.attachShadow({ mode: 'open' }))
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it.each(['visibility: hidden', 'opacity: 0', 'display: none'])('rejects value %s', async style => {
        header().value.setAttribute('style', style)
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it('requires a value rectangle, not a host rectangle', async () => {
        const { value } = header()
        vi.mocked(value.getClientRects).mockReturnValue([] as unknown as DOMRectList)
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it('rejects multiple distinct displayed full numbers but ignores hidden lists', async () => {
        header()
        const other = header(TASK)
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
        other.list.style.display = 'none'
        expect(await readCurrentRecordCreatedOn(CASE)).toMatchObject({ status: 'ok' })
    })

    it('accepts the exact observed name without a label, but not a nested value', async () => {
        const { list, value } = header()
        list.querySelector('[slot="label"]')!.remove()
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toMatchObject({ status: 'ok' })
        const wrapper = document.createElement('div')
        value.replaceWith(wrapper)
        wrapper.append(value)
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it.each([null, undefined, ISO, {}, { getTime: (): number => 1 }, new Date(NaN)])('rejects non-Date or invalid Date (%#)', async date => {
        header()
        model(CASE, date === undefined ? null : date)
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it.each(['', 'not-a-guid'])('rejects unsaved/invalid record GUID %s', async guid => {
        header()
        model().getId.mockReturnValue(guid)
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it('rejects non-incident entities without querying another entity', async () => {
        header(TASK)
        model(TASK).getEntityName.mockReturnValue('task')
        expect(await readCurrentRecordCreatedOn(TASK)).toEqual({ status: 'unavailable' })
    })

    it.each(['guid', 'number', 'header', 'date', 'origin'])('rechecks %s after a yielded read', async changed => {
        vi.useFakeTimers()
        const { list, value } = header()
        list.insertAdjacentHTML('beforeend', '<span></span>'.repeat(60))
        const { getId, getAttribute } = model()
        const pending = readCurrentRecordCreatedOn(CASE)
        if (changed === 'guid') getId.mockReturnValue('aaaaaaaa-2222-3333-4444-555555555555')
        if (changed === 'number') getAttribute.mockImplementation(name => ({ getValue: () => name === 'createdon' ? new Date(ISO) : TASK }))
        if (changed === 'header') value.textContent = TASK
        if (changed === 'date') getAttribute.mockImplementation(name => ({ getValue: () => name === 'createdon' ? new Date(0) : CASE }))
        if (changed === 'origin') vi.stubGlobal('location', { origin: 'https://example.invalid' })
        await vi.runAllTimersAsync()
        expect(await pending).toEqual({ status: 'unavailable' })
    })

    it.each(['', `${CASE}0`, `${TASK}0`, ` ${CASE}`, 'WO-12345'])('rejects incomplete or nonexact request %s', async expected => {
        header()
        model()
        expect(await readCurrentRecordCreatedOn(expected)).toEqual({ status: 'unavailable' })
    })

    it('rejects a header switch during the final traversal yield', async () => {
        vi.useFakeTimers()
        const { list, value } = header()
        list.insertAdjacentHTML('beforeend', '<span></span>'.repeat(60))
        model()
        const schedule = setTimeout
        let yields = 0
        vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay) => schedule(() => {
            if (++yields === 2) value.textContent = TASK
            if (typeof callback === 'function') callback()
        }, delay))
        const pending = readCurrentRecordCreatedOn(CASE)
        await vi.runAllTimersAsync()
        expect(yields).toBe(2)
        expect(await pending).toEqual({ status: 'unavailable' })
    })

    it('fails closed on wrong origin, missing model, and thrown model errors', async () => {
        header()
        const { getId } = model()
        vi.stubGlobal('location', { origin: 'https://example.invalid' })
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
        expect(getId).not.toHaveBeenCalled()
        vi.stubGlobal('location', { origin: ORIGIN })
        getId.mockImplementation(() => { throw new Error('private') })
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
        vi.stubGlobal('Xrm', undefined)
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it.each(['nodes', 'lists'])('fails closed at the %s bound', async bound => {
        vi.useFakeTimers()
        const { list } = header()
        model()
        if (bound === 'nodes') list.insertAdjacentHTML('beforeend', '<div></div>'.repeat(2001))
        else for (let i = 0; i < 20; i++) header()
        const pending = readCurrentRecordCreatedOn(CASE)
        await vi.runAllTimersAsync()
        expect(await pending).toEqual({ status: 'unavailable' })
    })

    it('does not spend the header node budget on a large irrelevant body', async () => {
        vi.useFakeTimers()
        header()
        model()
        document.body.insertAdjacentHTML('beforeend', '<div></div>'.repeat(4332))
        const pending = readCurrentRecordCreatedOn(CASE)
        await vi.runAllTimersAsync()
        expect(await pending).toMatchObject({ status: 'ok', createdOnUtc: ISO })
    })

    it('checks the traversal deadline immediately after a delayed yield', async () => {
        vi.useFakeTimers()
        const { list } = header()
        list.insertAdjacentHTML('beforeend', '<span></span>'.repeat(60))
        model()
        const pending = readCurrentRecordCreatedOn(CASE)
        vi.setSystemTime(Date.now() + 1001)
        await vi.runAllTimersAsync()
        expect(await pending).toEqual({ status: 'unavailable' })
        expect(vi.getTimerCount()).toBe(0)
    })

    it('honors display:none on an assigned slot without scanning another tree', async () => {
        const { list } = header()
        list.attachShadow({ mode: 'open' }).innerHTML = '<slot style="display: none"></slot>'
        model()
        expect(await readCurrentRecordCreatedOn(CASE)).toEqual({ status: 'unavailable' })
    })

    it('does not inspect unrelated shadow roots or outside-header value slots', async () => {
        header()
        model()
        const host = document.createElement('unrelated-host')
        document.body.append(host)
        header(TASK, host.attachShadow({ mode: 'open' }))
        const shadow = vi.spyOn(host, 'shadowRoot', 'get')
        const outside = document.createElement('uci-header-control-list-item')
        outside.innerHTML = `<span slot="label">Case number / Service name</span><span slot="value">${TASK}</span>`
        document.body.append(outside)
        expect(await readCurrentRecordCreatedOn(CASE)).toMatchObject({ status: 'ok' })
        expect(shadow).not.toHaveBeenCalled()
    })
})
