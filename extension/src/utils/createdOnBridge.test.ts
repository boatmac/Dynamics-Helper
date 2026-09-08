import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleReadCreatedOn, parseCreatedOnResult, requestCreatedOn } from './createdOnBridge'
import { readCurrentRecordCreatedOn } from './createdOnModel'

const ORIGIN = 'https://onesupport.crm.dynamics.com'
const CASE = '2601190030003106'
const TASK = `${CASE}001`
const DOC = '11111111-2222-3333-4444-555555555555'
const ISO = '2031-04-17T10:23:00.123Z'
const result = { status: 'ok', caseNumber: TASK, createdOnUtc: ISO }
const message = { type: 'DH_READ_CREATED_ON', caseNumber: TASK }
const unavailable = { status: 'unavailable' }
const sender = {
    id: 'test-extension', tab: { id: 42 } as chrome.tabs.Tab, frameId: 0,
    origin: ORIGIN, url: `${ORIGIN}/main.aspx`, documentId: DOC,
} satisfies chrome.runtime.MessageSender
const executeScript = vi.fn()
const sendMessage = vi.fn()

beforeEach(() => {
    vi.useFakeTimers()
    executeScript.mockReset().mockResolvedValue([{ frameId: 0, documentId: DOC, result }])
    sendMessage.mockReset().mockResolvedValue(result)
    vi.stubGlobal('location', { origin: ORIGIN })
    vi.stubGlobal('chrome', { runtime: { id: 'test-extension', sendMessage }, scripting: { executeScript } })
})
afterEach(() => {
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('document-scoped Created On bridge', () => {
    it('injects only the sender document in MAIN with one full-ID argument', async () => {
        expect(await handleReadCreatedOn(message, sender)).toEqual(result)
        expect(executeScript).toHaveBeenCalledExactlyOnceWith({
            target: { tabId: 42, documentIds: [DOC] }, world: 'MAIN',
            func: readCurrentRecordCreatedOn, args: [TASK],
        })
        expect(sendMessage).not.toHaveBeenCalled()
    })

    it.each([
        { id: 'foreign-extension' }, { id: undefined }, { tab: undefined },
        { tab: { id: -1 } }, { tab: { id: 1.5 } }, { tab: { id: '42' } },
        { frameId: 1 }, { frameId: undefined }, { origin: undefined },
        { origin: 'https://onesupport.crm.dynamics.com.evil.invalid' },
        { origin: 'http://onesupport.crm.dynamics.com' },
        { url: 'https://example.invalid/' }, { url: 'not a url' }, { url: undefined },
        { documentId: undefined }, { documentId: '' }, { documentId: 'not-a-uuid' },
    ])('rejects untrusted sender metadata (%#)', async patch => {
        expect(await handleReadCreatedOn(message, { ...sender, ...patch } as chrome.runtime.MessageSender)).toEqual(unavailable)
        expect(executeScript).not.toHaveBeenCalled()
    })

    it.each([
        null, [], { ...message, target: { tabId: 999 } }, { ...message, url: ORIGIN },
        { ...message, func: 'arbitrary' }, { ...message, caseNumber: `${TASK}0` },
        { ...message, caseNumber: `${CASE}0` }, { ...message, caseNumber: ` ${CASE}` },
        { ...message, caseNumber: 123 }, { ...message, caseNumber: 'WO-12345' },
        { type: 'DH_READ_CREATED_ON' }, { ...message, type: 'NATIVE_MSG' },
        { ...message, [Symbol('extra')]: true }, Object.create(message),
    ])('rejects malformed or extra request data (%#)', async malformed => {
        expect(await handleReadCreatedOn(malformed, sender)).toEqual(unavailable)
        expect(executeScript).not.toHaveBeenCalled()
    })

    it.each(['type', 'caseNumber'])('does not invoke request accessor %s', async key => {
        const get = vi.fn(() => { throw new Error('private') })
        const malformed = Object.defineProperty({ ...message }, key, { get })
        expect(await handleReadCreatedOn(malformed, sender)).toEqual(unavailable)
        expect(get).not.toHaveBeenCalled()
        expect(executeScript).not.toHaveBeenCalled()
    })

    it.each([
        [], [{ frameId: 1, documentId: DOC, result }], [{ frameId: 0, result }],
        [{ frameId: 0, documentId: 'aaaaaaaa-2222-3333-4444-555555555555', result }],
        [{ frameId: 0, documentId: DOC, result }, { frameId: 0, documentId: DOC, result }],
        [{ frameId: 0, documentId: DOC, result: { ...result, caseNumber: CASE } }],
    ].map(results => ({ results })))('rejects wrong result document, frame, count, or full record (%#)', async ({ results }) => {
        executeScript.mockResolvedValue(results)
        expect(await handleReadCreatedOn(message, sender)).toEqual(unavailable)
    })

    it('does not invoke result envelope accessors', async () => {
        const get = vi.fn(() => result)
        executeScript.mockResolvedValue([Object.defineProperty({ frameId: 0, documentId: DOC }, 'result', { get })])
        expect(await handleReadCreatedOn(message, sender)).toEqual(unavailable)
        expect(get).not.toHaveBeenCalled()
    })

    it('bounds a hanging injection at five seconds and ignores its late result', async () => {
        let resolve!: (value: unknown) => void
        executeScript.mockReturnValue(new Promise(res => { resolve = res }))
        const pending = handleReadCreatedOn(message, sender)
        await vi.advanceTimersByTimeAsync(5000)
        expect(await pending).toEqual(unavailable)
        resolve([{ frameId: 0, documentId: DOC, result }])
        await Promise.resolve()
        expect(sendMessage).not.toHaveBeenCalled()
    })

    it('returns a fixed failure for thrown injections and missing scripting', async () => {
        executeScript.mockRejectedValue(new Error('private URL / GUID'))
        expect(await handleReadCreatedOn(message, sender)).toEqual(unavailable)
        vi.stubGlobal('chrome', { runtime: { id: 'test-extension' } })
        expect(await handleReadCreatedOn(message, sender)).toEqual(unavailable)
    })
})

describe('strict UTC response parsing and content transport', () => {
    it('returns explicit UTC without shifting to the D365/browser offset', async () => {
        expect(await requestCreatedOn(TASK)).toBe(`${ISO} (UTC)`)
        expect(sendMessage).toHaveBeenCalledExactlyOnceWith(message)
        expect(parseCreatedOnResult(result, TASK)).toEqual(result)
    })

    it.each([
        null, [], { ...result, caseNumber: CASE }, { ...result, createdOnUtc: new Date(ISO) },
        { ...result, createdOnUtc: '2031-04-17T10:23:00Z' },
        { ...result, createdOnUtc: '2031-04-17T10:23:00.123+08:00' },
        { ...result, createdOnUtc: '2031-02-30T10:23:00.123Z' },
        { ...result, createdOnUtc: 'Invalid Date' }, { ...result, extra: true },
        { ...result, [Symbol('extra')]: true }, Object.create(result), unavailable,
    ])('rejects malformed, noncanonical, or wrong-record responses (%#)', async value => {
        expect(parseCreatedOnResult(value, TASK)).toEqual(unavailable)
        sendMessage.mockResolvedValue(value)
        expect(await requestCreatedOn(TASK)).toBeUndefined()
    })

    it.each(['status', 'caseNumber', 'createdOnUtc'])('does not invoke response accessor %s', async key => {
        const get = vi.fn(() => { throw new Error('private') })
        sendMessage.mockResolvedValue(Object.defineProperty({ ...result }, key, { get }))
        expect(await requestCreatedOn(TASK)).toBeUndefined()
        expect(get).not.toHaveBeenCalled()
    })

    it('bounds a hanging content request at 1500ms and ignores late completion', async () => {
        let resolve!: (value: unknown) => void
        sendMessage.mockReturnValue(new Promise(res => { resolve = res }))
        const pending = requestCreatedOn(TASK)
        await vi.advanceTimersByTimeAsync(1500)
        expect(await pending).toBeUndefined()
        resolve(result)
        await Promise.resolve()
    })

    it('bails before send on invalid ID, wrong origin, or missing Chrome API', async () => {
        expect(await requestCreatedOn(`${CASE}0`)).toBeUndefined()
        vi.stubGlobal('location', { origin: 'https://example.invalid' })
        expect(await requestCreatedOn(TASK)).toBeUndefined()
        expect(sendMessage).not.toHaveBeenCalled()
        vi.stubGlobal('location', { origin: ORIGIN })
        vi.stubGlobal('chrome', undefined)
        expect(await requestCreatedOn(TASK)).toBeUndefined()
    })

    it('rejects transport exceptions and origin changes during the wait', async () => {
        sendMessage.mockRejectedValue(new Error('private'))
        expect(await requestCreatedOn(TASK)).toBeUndefined()
        sendMessage.mockImplementation(async () => {
            vi.stubGlobal('location', { origin: 'https://example.invalid' })
            return result
        })
        expect(await requestCreatedOn(TASK)).toBeUndefined()
    })
})
