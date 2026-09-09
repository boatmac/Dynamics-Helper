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
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.useFakeTimers()
    executeScript.mockReset().mockResolvedValue([{ frameId: 0, documentId: DOC, result }])
    sendMessage.mockReset().mockResolvedValue(result)
    vi.stubGlobal('location', { origin: ORIGIN })
    vi.stubGlobal('chrome', { runtime: { id: 'test-extension', sendMessage }, scripting: { executeScript } })
})
afterEach(() => {
    for (const call of vi.mocked(console.debug).mock.calls) {
        expect(call).toEqual(['[DH] Created On', expect.stringMatching(/^(worker|content)$/), expect.stringMatching(/^[a-z_]+$/), null, expect.toSatisfy((value: unknown) => value === null || typeof value === 'number')])
        for (const secret of [CASE, TASK, DOC, ISO, ORIGIN, 'private']) expect(JSON.stringify(call)).not.toContain(secret)
    }
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('document-scoped Created On bridge', () => {
    it.each(['AABBCCDD11223344556677889900AABB', 'browser-document-token'])('preserves browser-issued document tokens without format assumptions (%#)', async documentId => {
        executeScript.mockResolvedValue([{ frameId: 0, documentId, result }])
        expect(await handleReadCreatedOn(message, { ...sender, documentId })).toEqual(result)
        expect(executeScript).toHaveBeenCalledExactlyOnceWith({
            target: { tabId: 42, documentIds: [documentId] }, world: 'MAIN',
            func: readCurrentRecordCreatedOn, args: [TASK],
        })
        executeScript.mockResolvedValue([{ frameId: 0, documentId: `${documentId}-other`, result }])
        expect(await handleReadCreatedOn(message, { ...sender, documentId })).toEqual(unavailable)
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'worker', 'envelope_rejected', null, expect.any(Number))
        expect(JSON.stringify(vi.mocked(console.debug).mock.calls)).not.toContain(documentId)
    })

    it('injects only the sender document in MAIN with one full-ID argument', async () => {
        expect(await handleReadCreatedOn(message, sender)).toEqual(result)
        expect(executeScript).toHaveBeenCalledExactlyOnceWith({
            target: { tabId: 42, documentIds: [DOC] }, world: 'MAIN',
            func: readCurrentRecordCreatedOn, args: [TASK],
        })
        expect(sendMessage).not.toHaveBeenCalled()
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'worker', 'success', null, expect.any(Number))
    })

    it.each([
        { id: 'foreign-extension' }, { id: undefined }, { tab: undefined },
        { tab: { id: -1 } }, { tab: { id: 1.5 } }, { tab: { id: '42' } },
        { frameId: 1 }, { frameId: undefined }, { origin: undefined },
        { origin: 'https://onesupport.crm.dynamics.com.evil.invalid' },
        { origin: 'http://onesupport.crm.dynamics.com' },
        { url: 'https://example.invalid/' }, { url: 'not a url' }, { url: undefined },
        { documentId: undefined }, { documentId: '' }, { documentId: 123 },
    ])('rejects untrusted sender metadata (%#)', async patch => {
        expect(await handleReadCreatedOn(message, { ...sender, ...patch } as chrome.runtime.MessageSender)).toEqual(unavailable)
        expect(executeScript).not.toHaveBeenCalled()
        const code = 'id' in patch ? 'sender_extension_rejected'
            : 'tab' in patch ? 'sender_tab_rejected'
            : 'frameId' in patch ? 'sender_frame_rejected'
            : 'origin' in patch ? 'sender_origin_rejected'
            : 'url' in patch ? 'sender_url_rejected'
            : 'sender_document_missing'
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'worker', code, null, expect.any(Number))
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
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'worker', 'injection_timeout', null, expect.any(Number))
        resolve([{ frameId: 0, documentId: DOC, result }])
        await Promise.resolve()
        expect(sendMessage).not.toHaveBeenCalled()
    })

    it('returns a fixed failure for thrown injections and missing scripting', async () => {
        executeScript.mockRejectedValue(new Error('private URL / GUID'))
        expect(await handleReadCreatedOn(message, sender)).toEqual(unavailable)
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'worker', 'injection_failed', null, expect.any(Number))
        vi.stubGlobal('chrome', { runtime: { id: 'test-extension' } })
        expect(await handleReadCreatedOn(message, sender)).toEqual(unavailable)
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'worker', 'api_unavailable', null, expect.any(Number))
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
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'content', 'request_timeout', null, expect.any(Number))
        resolve(result)
        await Promise.resolve()
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'content', 'request_timeout', null, expect.any(Number))
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
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'content', 'transport_failed', null, expect.any(Number))
        sendMessage.mockImplementation(async () => {
            vi.stubGlobal('location', { origin: 'https://example.invalid' })
            return result
        })
        expect(await requestCreatedOn(TASK)).toBeUndefined()
        expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'content', 'origin_changed', null, expect.any(Number))
    })
})
