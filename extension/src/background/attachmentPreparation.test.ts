import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import manifest from '../../manifest.json'
import { readAttachmentPortal, type AttachmentPortalAction } from '../utils/attachmentPortal'
import {
    prepareAttachments, readAttachmentSource,
    type AttachmentPreparationDependencies, type AttachmentPreparationInput,
} from './attachmentPreparation'

const CASE = '2601190030003106'
const TASK = `${CASE}001`
const PORTAL = 'https://client.dtmnebula.microsoft.com'
const API = 'https://api.dtmnebula.microsoft.com'
const WORKSPACE = '11111111-2222-3333-4444-555555555555'
const base = (filename = 'synthetic.txt') => `${API}/workspaces/${WORKSPACE}/files/item?fileName=${encodeURIComponent(filename)}`
const row = (filename = 'synthetic.txt') => ({ baseUrl: base(filename), filename, workspace: WORKSPACE })
const ready = (files = [row()], skipped = 0, inventoryComplete = true) => ({ status: 'ready', files, skipped, inventoryComplete })
const input = (): AttachmentPreparationInput => ({
    requestId: 'synthetic-request', caseNumber: CASE,
    sourceTarget: { tabId: 1, documentId: 'source-document', frameId: 0 }, language: 'en',
})

function fixture() {
    const listeners = new Set<(item: chrome.downloads.DownloadItem) => void>()
    const captured: ((item: chrome.downloads.DownloadItem) => void)[] = []
    const state = {
        current: true, matches: true as boolean | null, sourceCount: 1 as number | null,
        url: `${PORTAL}/Home?srNumber=${CASE}`, portal: ready() as unknown,
        sourceDocument: 'source-document', portalDocument: 'portal-document',
        clicked: { status: 'clicked' } as unknown,
    }
    const item = (id = 7, overrides: Record<string, unknown> = {}) => ({
        id, url: `${base()}&partnerid=synthetic&access_token=synthetic`,
        startTime: new Date(Date.now()).toISOString(), state: 'complete', danger: 'safe',
        fileSize: 42, filename: 'C:\\Synthetic\\synthetic.txt', exists: true, ...overrides,
    }) as chrome.downloads.DownloadItem
    const downloads = new Map<number, chrome.downloads.DownloadItem>()
    const emit = (entry: chrome.downloads.DownloadItem) => {
        downloads.set(entry.id, entry)
        for (const listener of listeners) listener(entry)
    }
    const click = vi.fn(() => { emit(item()) })
    const selectExternal = vi.fn(() => {})
    const create = vi.fn(async () => ({ id: 2 }))
    const get = vi.fn(async () => ({ id: 2, url: state.url }))
    const remove = vi.fn(async () => {})
    const search = vi.fn(async ({ id }: { id: number }) => downloads.has(id) ? [downloads.get(id)!] : [])
    type Injection = { target: { tabId: number; documentIds?: string[]; frameIds?: number[] }; world: string; func: unknown; args: unknown[] }
    const executeScript = vi.fn(async (injection: Injection) => {
        expect(injection.world).toBe('MAIN')
        if (injection.func === readAttachmentSource) {
            expect(injection.target).toEqual({ tabId: 1, documentIds: ['source-document'] })
            return [{ frameId: 0, documentId: state.sourceDocument,
                result: { matches: state.matches, visibleAttachmentCount: state.sourceCount } }]
        }
        expect(injection.func).toBe(readAttachmentPortal)
        expect(injection.target.tabId).toBe(2)
        expect(state.url.startsWith(PORTAL)).toBe(true)
        const action = injection.args[1] as AttachmentPortalAction
        expect(injection.args).toHaveLength(action.kind === 'inspect' ? 3 : 2)
        if (action.kind === 'inspect') expect(injection.args[2]).toBe(true)
        if (action.kind === 'select_external') selectExternal()
        if (action.kind === 'download') {
            expect(injection.target.documentIds).toEqual(['portal-document'])
            expect(listeners.size).toBe(1)
            click()
        }
        return [{ frameId: 0, documentId: state.portalDocument,
            result: action.kind === 'download' ? state.clicked : action.kind === 'select_external' ? { status: 'clicked' } : state.portal }]
    })
    const addListener = vi.fn((listener: (entry: chrome.downloads.DownloadItem) => void) => { listeners.add(listener); captured.push(listener) })
    const removeListener = vi.fn((listener: (entry: chrome.downloads.DownloadItem) => void) => { listeners.delete(listener) })
    const isCurrent = vi.fn(async () => state.current)
    const notify = vi.fn(async () => {})
    // Only the specified API surface is available. No cancel/permissions/network/Host mock.
    const browser = { tabs: { create, get, remove }, scripting: { executeScript }, downloads: { search, onCreated: { addListener, removeListener } } }
    const deps: AttachmentPreparationDependencies = {
        browser: browser as unknown as AttachmentPreparationDependencies['browser'], isCurrent, notify,
    }
    const actions = () => executeScript.mock.calls.filter(([entry]) => entry.func === readAttachmentPortal)
        .map(([entry]) => (entry.args[1] as AttachmentPortalAction).kind)
    return { state, deps, create, get, remove, search, executeScript, click, item, emit, listeners, captured,
        isCurrent, notify, actions, addListener, removeListener, selectExternal }
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); document.body.replaceChildren() })

describe('private attachment preparation', () => {
    it('declares cross-origin tab metadata access without login-page injection access', () => {
        expect(manifest.permissions.filter(permission => permission === 'tabs')).toHaveLength(1)
        expect(manifest.host_permissions).toEqual([
            'https://onesupport.crm.dynamics.com/*',
            'https://client.dtmnebula.microsoft.com/*',
        ])
        expect(manifest.content_scripts.flatMap(script => script.matches)).toEqual([
            'https://onesupport.crm.dynamics.com/*',
        ])
    })

    it('opens only an inactive owned portal for the full task identity and returns browser paths after the full window', async () => {
        const f = fixture()
        const request = { ...input(), caseNumber: TASK, language: 'zh' as const }
        const pending = prepareAttachments(request, f.deps)
        await vi.advanceTimersByTimeAsync(9999)
        expect(f.search).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toEqual({ files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }], inventory: 'known', skipped: 0, reason: 'none', language: 'zh' })
        expect(f.create).toHaveBeenCalledExactlyOnceWith({ url: `${PORTAL}/Home?srNumber=${TASK}`, active: false })
        expect(f.search).toHaveBeenCalledExactlyOnceWith({ id: 7 })
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(f.listeners.size).toBe(0)
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
        expect(f.isCurrent).toHaveBeenCalledWith(request)
        expect(console.warn).not.toHaveBeenCalled()
    })

    it.each([true, false])('waits 30 seconds and skips unverified inventory; login observed=%s', async login => {
        const f = fixture()
        f.state.sourceCount = 3
        f.state.url = login ? 'https://login.microsoftonline.com/synthetic' : 'https://example.invalid/'
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(29999)
        expect(f.remove).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toEqual({ files: [], inventory: 'unknown', skipped: 3, reason: login ? 'auth_timeout' : 'unavailable', language: 'en' })
        expect(f.actions()).toEqual([])
        expect(f.notify).toHaveBeenCalledTimes(login ? 1 : 0)
        if (login) expect(f.notify).toHaveBeenCalledWith('auth_wait')
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: 'portal_wait', reason: login ? 'auth_timeout' : 'unavailable',
            wait: { urlUnavailable: 0, tabReadFailed: 0, injectionFailed: 0, portalUnavailable: 0,
                lastOutcome: 'outside_portal', portalDetail: 'none' },
        })
    })

    it('can become ready after authentication without focusing or injecting the auth document', async () => {
        const f = fixture()
        f.state.url = 'https://login.microsoftonline.com/synthetic'
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(5000)
        f.state.url = `${PORTAL}/Home?srNumber=${CASE}`
        await vi.advanceTimersByTimeAsync(11000)
        expect((await pending).reason).toBe('none')
        expect(f.notify).toHaveBeenCalledExactlyOnceWith('auth_wait')
    })

    it.each([0, null, 3])('settles workspace_missing immediately without actions; source count=%s', async count => {
        const f = fixture()
        f.state.sourceCount = count
        f.state.portal = { status: 'workspace_missing' }
        const started = Date.now()
        expect(await prepareAttachments(input(), f.deps)).toEqual({
            files: [], inventory: count ? 'unknown' : 'known', skipped: count || 0,
            reason: count ? 'unavailable' : 'none', language: 'en',
        })
        expect(Date.now()).toBe(started)
        expect(f.actions()).toEqual(['inspect'])
        expect(f.executeScript.mock.calls.filter(([entry]) => entry.func === readAttachmentSource)).toHaveLength(3)
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.search).not.toHaveBeenCalled()
        expect(f.addListener).not.toHaveBeenCalled()
        expect(f.notify).not.toHaveBeenCalled()
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['case', 'document', 'owner', 'positive-count'])('revalidates workspace_missing through the final source/owner check: %s', async kind => {
        const f = fixture()
        f.state.sourceCount = 0
        f.state.portal = { status: 'workspace_missing' }
        const original = f.executeScript.getMockImplementation()!
        let sourceReads = 0
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentSource && ++sourceReads === 3) {
                if (kind === 'case') f.state.matches = false
                if (kind === 'document') f.state.sourceDocument = 'other-document'
                if (kind === 'owner') f.state.current = false
                if (kind === 'positive-count') f.state.sourceCount = 3
            }
            return original(injection)
        })
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({
            files: [], inventory: 'unknown', reason: kind === 'positive-count' ? 'unavailable' : 'stale',
        })
        expect(sourceReads).toBe(3)
        expect(f.actions()).toEqual(['inspect'])
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each([0, null, 3])('settles folder_unavailable immediately as unknown without actions; source count=%s', async count => {
        const f = fixture()
        f.state.sourceCount = count
        f.state.portal = { status: 'folder_unavailable' }
        const started = Date.now()
        expect(await prepareAttachments(input(), f.deps)).toEqual({
            files: [], inventory: 'unknown', skipped: count || 0, reason: 'folder_unavailable', language: 'en',
        })
        expect(Date.now()).toBe(started)
        expect(f.actions()).toEqual(['inspect'])
        expect(f.executeScript.mock.calls.filter(([entry]) => entry.func === readAttachmentSource)).toHaveLength(2)
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.search).not.toHaveBeenCalled()
        expect(f.addListener).not.toHaveBeenCalled()
        expect(f.notify).not.toHaveBeenCalled()
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: 'portal_inventory', reason: 'folder_unavailable',
        })
    })

    it.each(['case', 'document', 'owner', 'positive-count', 'source-unavailable'])('revalidates folder_unavailable in finally: %s', async kind => {
        const f = fixture()
        f.state.sourceCount = 0
        f.state.portal = { status: 'folder_unavailable' }
        const original = f.executeScript.getMockImplementation()!
        let sourceReads = 0
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentSource && ++sourceReads === 2) {
                if (kind === 'case') f.state.matches = false
                if (kind === 'document') f.state.sourceDocument = 'other-document'
                if (kind === 'owner') f.state.current = false
                if (kind === 'positive-count') f.state.sourceCount = 3
                if (kind === 'source-unavailable') f.state.sourceCount = -1
            }
            return original(injection)
        })
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({
            files: [], inventory: 'unknown', skipped: kind === 'positive-count' ? 3 : 0,
            reason: kind === 'positive-count' ? 'folder_unavailable' : kind === 'source-unavailable' ? 'unavailable' : 'stale',
        })
        expect(sourceReads).toBe(2)
        expect(f.actions()).toEqual(['inspect'])
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: kind === 'positive-count' ? 'portal_inventory' : 'source_final',
            reason: kind === 'positive-count' ? 'folder_unavailable' : kind === 'source-unavailable' ? 'unavailable' : 'stale',
        })
    })

    it.each(['workspace_missing', 'folder_unavailable'].flatMap(status =>
        ['extra', 'accessor', 'symbol', 'inherited', 'frame', 'document'].map(kind => ({ status, kind })),
    ))('rejects $status with noncanonical $kind reply', async ({ status, kind }) => {
        const f = fixture()
        f.state.sourceCount = 0
        const getter = vi.fn(() => status)
        const reply: Record<string | symbol, unknown> = { status }
        if (kind === 'extra') reply.caseNumber = CASE
        if (kind === 'accessor') Object.defineProperty(reply, 'status', { get: getter })
        if (kind === 'symbol') reply[Symbol('extra')] = true
        f.state.portal = kind === 'inherited' ? Object.create(reply) : reply
        const original = f.executeScript.getMockImplementation()!
        f.executeScript.mockImplementation(async injection => {
            const response = await original(injection)
            if (injection.func === readAttachmentPortal) {
                if (kind === 'frame') return [{ ...response[0], frameId: 1 }]
                if (kind === 'document') return [{ ...response[0], documentId: '' }]
            }
            return response
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(30000)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(getter).not.toHaveBeenCalled()
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['workspace_missing', 'folder_unavailable'])('settles login then %s without waiting for the auth deadline', async status => {
        const f = fixture()
        f.state.sourceCount = null
        f.state.portal = { status }
        f.state.url = 'https://login.microsoftonline.com/synthetic'
        const started = Date.now()
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(1000)
        expect(f.actions()).toEqual([])
        f.state.url = `${PORTAL}/Home?srNumber=${CASE}`
        await vi.advanceTimersByTimeAsync(250)
        expect(await pending).toEqual({ files: [], inventory: status === 'workspace_missing' ? 'known' : 'unknown',
            skipped: 0, reason: status === 'workspace_missing' ? 'none' : 'folder_unavailable', language: 'en' })
        expect(Date.now() - started).toBe(1250)
        expect(f.actions()).toEqual(['inspect'])
        expect(f.notify).toHaveBeenCalledExactlyOnceWith('auth_wait')
        expect(f.search).not.toHaveBeenCalled()
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
        if (status === 'folder_unavailable') {
            expect(f.click).not.toHaveBeenCalled()
            expect(f.selectExternal).not.toHaveBeenCalled()
            expect(f.addListener).not.toHaveBeenCalled()
            expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
                stage: 'portal_inventory', reason: 'folder_unavailable',
            })
        }
    })

    it.each(['unavailable', 'malformed', 'read-failure', 'missing-url'])('clears historical auth after portal return with %s without renewing the deadline', async kind => {
        const f = fixture()
        f.state.url = 'https://login.microsoftonline.com/synthetic'
        f.state.portal = kind === 'malformed' ? { status: 'unexpected' } : { status: 'unavailable' }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(1000)
        f.state.url = `${PORTAL}/Home?srNumber=${CASE}`
        await vi.advanceTimersByTimeAsync(250)
        if (kind === 'read-failure') f.get.mockRejectedValue(new Error('Synthetic read failure'))
        if (kind === 'missing-url') f.get.mockResolvedValue({ id: 2 } as never)
        await vi.advanceTimersByTimeAsync(28749)
        expect(f.remove).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(f.notify).toHaveBeenCalledExactlyOnceWith('auth_wait')
        expect(f.actions().every(action => action === 'inspect')).toBe(true)
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('notifies once across login, portal, login and retains the original auth deadline', async () => {
        const f = fixture()
        f.state.url = 'https://login.microsoftonline.com/synthetic'
        f.state.portal = { status: 'unavailable' }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(1000)
        f.state.url = `${PORTAL}/Home?srNumber=${CASE}`
        await vi.advanceTimersByTimeAsync(1000)
        f.state.url = 'https://login.microsoftonline.com/synthetic'
        await vi.advanceTimersByTimeAsync(27999)
        expect(f.remove).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'auth_timeout' })
        expect(f.notify).toHaveBeenCalledExactlyOnceWith('auth_wait')
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['missing', 'second-read-missing', 'second-read-outside'])(
        'diagnoses %s tab URL without auth notification, injection, or a renewed deadline', async kind => {
            const f = fixture()
            let reads = 0
            f.get.mockImplementation(async () => {
                const first = ++reads % 2 === 1
                if (kind !== 'missing' && first) return { id: 2, url: f.state.url }
                return kind === 'second-read-outside' ? { id: 2, url: 'https://example.invalid/?sig=synthetic' } : { id: 2 } as never
            })
            const pending = prepareAttachments(input(), f.deps)
            await vi.advanceTimersByTimeAsync(29999)
            expect(console.warn).not.toHaveBeenCalled()
            expect(f.remove).not.toHaveBeenCalled()
            await vi.advanceTimersByTimeAsync(1)
            expect(await pending).toEqual({ files: [], inventory: 'unknown', skipped: 1, reason: 'unavailable', language: 'en' })
            expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
                stage: 'portal_wait', reason: 'unavailable',
                wait: { urlUnavailable: kind === 'second-read-outside' ? 0 : 120, tabReadFailed: 0, injectionFailed: 0, portalUnavailable: 0,
                    lastOutcome: kind === 'second-read-outside' ? 'outside_portal' : 'url_unavailable', portalDetail: 'none' },
            })
            expect(f.get).toHaveBeenCalledTimes(kind === 'missing' ? 120 : 240)
            expect(f.notify).not.toHaveBeenCalled()
            expect(f.actions()).toEqual([])
            expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
            expect(vi.getTimerCount()).toBe(0)
        },
    )

    it.each(['case_identity', 'accessor', 'proxy-value', 'throwing-proxy', 'unknown', 'invalid-response'])(
        'logs only fixed inspection detail for %s without invoking detail getters or coercion', async kind => {
            const f = fixture()
            const unsafe = vi.fn(() => { throw new Error('https://example.invalid/?access_token=synthetic') })
            const reply: Record<string, unknown> = { status: 'unavailable', detail: 'case_identity' }
            if (kind === 'accessor') Object.defineProperty(reply, 'detail', { get: unsafe })
            if (kind === 'proxy-value') reply.detail = new Proxy({}, { get: unsafe, getOwnPropertyDescriptor: unsafe })
            if (kind === 'unknown') reply.detail = 'https://example.invalid/?sig=synthetic'
            if (kind === 'invalid-response') reply.status = 'unknown'
            f.state.portal = kind === 'throwing-proxy' ? new Proxy(reply, { getOwnPropertyDescriptor: unsafe }) : reply
            const pending = prepareAttachments(input(), f.deps)
            await vi.advanceTimersByTimeAsync(30000)
            expect((await pending).reason).toBe('unavailable')
            const invalid = kind === 'throwing-proxy' || kind === 'invalid-response'
            expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
                stage: 'portal_wait', reason: 'unavailable',
                wait: { urlUnavailable: 0, tabReadFailed: 0, injectionFailed: 0, portalUnavailable: invalid ? 0 : 120,
                    lastOutcome: invalid ? 'invalid_response' : 'portal_unavailable', portalDetail: kind === 'case_identity' ? 'case_identity' : 'none' },
            })
            // A descriptor trap may run at the untrusted boundary; its exception is never logged.
            if (kind !== 'throwing-proxy') expect(unsafe).not.toHaveBeenCalled()
            expect(f.click).not.toHaveBeenCalled()
            expect(f.selectExternal).not.toHaveBeenCalled()
            expect(f.notify).not.toHaveBeenCalled()
            expect(vi.getTimerCount()).toBe(0)
        },
    )

    it.each(['urlUnavailable', 'tabReadFailed', 'injectionFailed', 'portalUnavailable'] as const)(
        'caps %s observations at 256 without logging individual polls', async counter => {
            const f = fixture()
            const started = Date.now()
            // Slow only the synthetic wall clock so the unchanged 250ms polls exceed the cap.
            vi.spyOn(Date, 'now').mockImplementation(() => started + Math.floor((new Date().getTime() - started) / 3))
            f.state.portal = { status: 'unavailable', detail: 'inventory' }
            if (counter === 'urlUnavailable') f.get.mockResolvedValue({ id: 2 } as never)
            if (counter === 'tabReadFailed') f.get.mockRejectedValue(new Error('https://example.invalid/?sig=synthetic'))
            if (counter === 'injectionFailed') {
                const original = f.executeScript.getMockImplementation()!
                f.executeScript.mockImplementation(async injection => {
                    if (injection.func === readAttachmentPortal) throw new Error('https://example.invalid/?sig=synthetic')
                    return original(injection)
                })
            }
            const pending = prepareAttachments(input(), f.deps)
            await vi.advanceTimersByTimeAsync(89999)
            expect(console.warn).not.toHaveBeenCalled()
            await vi.advanceTimersByTimeAsync(1)
            expect((await pending).reason).toBe('unavailable')
            expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
                stage: 'portal_wait', reason: 'unavailable',
                wait: { urlUnavailable: 0, tabReadFailed: 0, injectionFailed: 0, portalUnavailable: 0, [counter]: 256,
                    lastOutcome: { urlUnavailable: 'url_unavailable', tabReadFailed: 'tab_read_failed',
                        injectionFailed: 'injection_failed', portalUnavailable: 'portal_unavailable' }[counter],
                    portalDetail: counter === 'portalUnavailable' ? 'inventory' : 'none' },
            })
            expect(f.click).not.toHaveBeenCalled()
            expect(f.selectExternal).not.toHaveBeenCalled()
            expect(vi.getTimerCount()).toBe(0)
        },
    )

    it('retains an injection failure diagnostic when the ownership finally makes the request stale', async () => {
        const f = fixture()
        const original = f.executeScript.getMockImplementation()!
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentPortal) {
                f.state.current = false
                throw new Error('https://example.invalid/?sig=synthetic')
            }
            return original(injection)
        })
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({ files: [], reason: 'stale' })
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: 'portal_wait', reason: 'stale',
            wait: { urlUnavailable: 0, tabReadFailed: 0, injectionFailed: 1, portalUnavailable: 0,
                lastOutcome: 'injection_failed', portalDetail: 'none' },
        })
        expect(f.click).not.toHaveBeenCalled()
    })

    it.each(['case', 'document', 'owner'])('does not open on mismatched source %s', async kind => {
        const f = fixture()
        if (kind === 'case') f.state.matches = false
        if (kind === 'document') f.state.sourceDocument = 'other-document'
        if (kind === 'owner') f.state.current = false
        expect((await prepareAttachments(input(), f.deps)).reason).toBe('stale')
        expect(f.executeScript).toHaveBeenCalledTimes(kind === 'owner' ? 0 : 1)
        expect(f.create).not.toHaveBeenCalled()
        expect(f.remove).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_initial', reason: 'stale' })
    })

    it('attempts External selection only once, with a source and durable-owner check immediately before dispatch', async () => {
        const f = fixture()
        f.state.portal = { status: 'external_selectable' }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(30000)
        expect((await pending).reason).toBe('unavailable')
        expect(f.actions().filter(action => action === 'select_external')).toHaveLength(1)
        expect(f.click).not.toHaveBeenCalled()
        const calls = f.executeScript.mock.calls.map(([entry]) => entry)
        const index = calls.findIndex(entry => (entry.args[1] as AttachmentPortalAction | undefined)?.kind === 'select_external')
        expect(calls[index - 1].func).toBe(readAttachmentSource)
    })

    it.each(['header', 'malformed', 'injection', 'missing-document'])('returns unavailable with current ownership and unreadable source %s', async kind => {
        const f = fixture()
        if (kind === 'header') f.state.matches = null
        if (kind === 'malformed') f.state.sourceCount = -1
        if (kind === 'injection' || kind === 'missing-document') f.executeScript.mockRejectedValue(new Error(kind))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(kind === 'malformed' ? 0 : 3000)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(f.executeScript).toHaveBeenCalledTimes(kind === 'malformed' ? 1 : 15)
        expect(f.isCurrent).toHaveBeenCalled()
        expect(f.create).not.toHaveBeenCalled()
        expect(f.click).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_initial', reason: 'unavailable' })
    })

    it('SC-R1 recovers canonical null at 2800ms without creating a portal until ready', async () => {
        const f = fixture()
        f.state.matches = null
        f.state.sourceCount = null
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(2799)
        expect(f.executeScript).toHaveBeenCalledTimes(14)
        expect(f.create).not.toHaveBeenCalled()
        f.state.matches = true
        await vi.advanceTimersByTimeAsync(1)
        expect(f.create).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ reason: 'none', inventory: 'known', files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }] })
        expect(f.create).toHaveBeenCalledTimes(1)
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['rejection', 'timeout'])('SC-R2 recovers transient source injection %s after the 200ms pause', async kind => {
        const f = fixture()
        if (kind === 'rejection') f.executeScript.mockRejectedValueOnce(new Error('Synthetic source read failure'))
        else f.executeScript.mockImplementationOnce(() => new Promise(() => {}))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(kind === 'rejection' ? 199 : 2199)
        expect(f.executeScript).toHaveBeenCalledTimes(1)
        expect(f.create).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(f.create).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ reason: 'none', files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }] })
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['null', 'timeout'])('SC-R3 exhausts persistent source %s at exactly 3s without a fresh finally window', async kind => {
        const f = fixture()
        f.state.matches = null
        f.state.sourceCount = null
        if (kind === 'timeout') f.executeScript.mockImplementation(() => new Promise(() => {}))
        const settled = vi.fn()
        const pending = prepareAttachments(input(), f.deps).then(result => { settled(); return result })
        await vi.advanceTimersByTimeAsync(2999)
        expect(settled).not.toHaveBeenCalled()
        expect(f.executeScript).toHaveBeenCalledTimes(kind === 'null' ? 15 : 2)
        await vi.advanceTimersByTimeAsync(1)
        expect(settled).toHaveBeenCalledTimes(1)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(f.executeScript).toHaveBeenCalledTimes(kind === 'null' ? 15 : 2)
        expect(f.create).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['envelope', 'data', 'count', 'matches'])('SC-R4 rejects malformed source %s immediately without retry or final read', async kind => {
        const f = fixture()
        const result = kind === 'data' ? {} : { matches: kind === 'matches' ? 'true' : null, visibleAttachmentCount: kind === 'count' ? -1 : null }
        f.executeScript.mockResolvedValueOnce((kind === 'envelope' ? [] : [
            { frameId: 0, documentId: 'source-document', result },
        ]) as never)
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({ files: [], reason: 'unavailable' })
        expect(f.executeScript).toHaveBeenCalledTimes(1)
        expect(f.create).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['case', 'document', 'owner'])('SC-R5 stops source retries immediately on explicit %s loss', async kind => {
        const f = fixture()
        f.state.matches = null
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(199)
        expect(f.executeScript).toHaveBeenCalledTimes(1)
        if (kind === 'case') f.state.matches = false
        if (kind === 'document') f.state.sourceDocument = 'other-document'
        if (kind === 'owner') f.state.current = false
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toMatchObject({ files: [], reason: 'stale' })
        expect(f.executeScript).toHaveBeenCalledTimes(kind === 'owner' ? 1 : 2)
        expect(f.create).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('SC-R6 clips a pending ownership await to the original source window', async () => {
        const f = fixture()
        f.state.matches = null
        const settled = vi.fn()
        const pending = prepareAttachments(input(), f.deps).then(result => { settled(); return result })
        await vi.advanceTimersByTimeAsync(2799)
        f.isCurrent.mockImplementation(() => new Promise(() => {}))
        await vi.advanceTimersByTimeAsync(200)
        expect(settled).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(settled).toHaveBeenCalledTimes(1)
        expect(await pending).toMatchObject({ files: [], reason: 'stale' })
        expect(f.executeScript).toHaveBeenCalledTimes(14)
        expect(f.create).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each([true, false])('SC-R7 retries the download postcheck without another click; recovers=%s', async recovers => {
        const f = fixture()
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(9999)
        f.state.matches = null
        await vi.advanceTimersByTimeAsync(2800)
        expect(f.remove).not.toHaveBeenCalled()
        if (recovers) f.state.matches = true
        await vi.advanceTimersByTimeAsync(recovers ? 1 : 201)
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(await pending).toMatchObject({
            files: recovers ? [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }] : [],
            inventory: recovers ? 'known' : 'unknown', reason: recovers ? 'none' : 'unavailable',
        })
        expect(f.executeScript.mock.calls.filter(([entry]) => entry.func === readAttachmentSource)).toHaveLength(recovers ? 19 : 17)
        expect(f.search).toHaveBeenCalledExactlyOnceWith({ id: 7 })
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(f.create).toHaveBeenCalledTimes(1)
        expect(f.listeners.size).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
        if (recovers) expect(console.warn).not.toHaveBeenCalled()
        else expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_post_download', reason: 'unavailable' })
    })

    it.each(['null', 'timeout'])('SC-R8 clips source %s retries before selection to the original 30s phase deadline', async kind => {
        const f = fixture()
        f.state.portal = { status: 'unavailable' }
        const settled = vi.fn()
        const pending = prepareAttachments(input(), f.deps).then(result => { settled(); return result })
        await vi.advanceTimersByTimeAsync(28999)
        f.state.portal = { status: 'external_selectable' }
        f.state.matches = null
        const original = f.executeScript.getMockImplementation()!
        if (kind === 'timeout') f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentSource) return new Promise(() => {})
            return original(injection)
        })
        await vi.advanceTimersByTimeAsync(1000)
        expect(settled).not.toHaveBeenCalled()
        expect(f.remove).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(settled).toHaveBeenCalledTimes(1)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(f.executeScript.mock.calls.filter(([entry]) => entry.func === readAttachmentSource)).toHaveLength(kind === 'null' ? 6 : 2)
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.click).not.toHaveBeenCalled()
        expect(f.create).toHaveBeenCalledTimes(1)
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('SC-R9 preserves the latest source read in finally for normal returns', async () => {
        const f = fixture()
        f.state.portal = ready([])
        const original = f.executeScript.getMockImplementation()!
        let sourceReads = 0
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentSource && ++sourceReads === 3) f.state.matches = false
            return original(injection)
        })
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({ files: [], inventory: 'unknown', reason: 'stale' })
        expect(sourceReads).toBe(3)
        expect(f.create).toHaveBeenCalledTimes(1)
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('discards prepared paths as unavailable when the source header disappears before return', async () => {
        const f = fixture()
        const original = f.executeScript.getMockImplementation()!
        let postDownloadReads = 0
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentSource && f.search.mock.calls.length && ++postDownloadReads === 2) f.state.matches = null
            return original(injection)
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(13000)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(f.search).toHaveBeenCalledExactlyOnceWith({ id: 7 })
        expect(postDownloadReads).toBe(16)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('does not consume External selection while loading, then selects once and reads ready inventory', async () => {
        const f = fixture()
        f.state.portal = { status: 'unavailable' }
        f.selectExternal.mockImplementation(() => { f.state.portal = ready() })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(1000)
        expect(f.selectExternal).not.toHaveBeenCalled()
        f.state.portal = { status: 'external_selectable' }
        await vi.advanceTimersByTimeAsync(11000)
        expect(await pending).toMatchObject({ reason: 'none', files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }] })
        expect(f.selectExternal).toHaveBeenCalledTimes(1)
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['get-reject', 'get-timeout', 'inspect-reject', 'inspect-timeout'])('retries transient read-only %s before the original deadline', async kind => {
        const f = fixture()
        if (kind === 'get-reject') f.get.mockRejectedValueOnce(new Error('Synthetic read failure'))
        if (kind === 'get-timeout') f.get.mockImplementationOnce(() => new Promise(() => {}))
        if (kind.startsWith('inspect')) {
            const original = f.executeScript.getMockImplementation()!
            let failed = false
            f.executeScript.mockImplementation(async injection => {
                if (injection.func === readAttachmentPortal && !failed) {
                    failed = true
                    if (kind.endsWith('timeout')) return new Promise(() => {})
                    throw new Error('Synthetic read failure')
                }
                return original(injection)
            })
        }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(13000)
        expect(await pending).toMatchObject({ reason: 'none', files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }] })
        expect(f.create).toHaveBeenCalledTimes(1)
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['get-reject', 'get-timeout', 'inspect-reject', 'inspect-timeout'])('never renews the 30-second deadline for repeated read-only %s', async kind => {
        const f = fixture()
        if (kind === 'get-reject') f.get.mockRejectedValue(new Error('Synthetic read failure'))
        if (kind === 'get-timeout') f.get.mockImplementation(() => new Promise(() => {}))
        if (kind.startsWith('inspect')) {
            const original = f.executeScript.getMockImplementation()!
            f.executeScript.mockImplementation(async injection => {
                if (injection.func === readAttachmentPortal) {
                    if (kind.endsWith('timeout')) return new Promise(() => {})
                    throw new Error('Synthetic read failure')
                }
                return original(injection)
            })
        }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(29999)
        expect(f.remove).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'unavailable' })
        expect(f.get.mock.calls.length).toBeGreaterThan(1)
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.create).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: 'portal_wait', reason: 'unavailable',
            wait: { urlUnavailable: 0, tabReadFailed: kind.startsWith('get') ? expect.any(Number) : 0,
                injectionFailed: kind.startsWith('inspect') ? expect.any(Number) : 0, portalUnavailable: 0,
                lastOutcome: kind.startsWith('get') ? 'tab_read_failed' : kind.endsWith('timeout') ? 'injection_timeout' : 'injection_failed',
                portalDetail: 'none' },
        })
    })

    it('retains observed authentication classification through later read failures until the original deadline', async () => {
        const f = fixture()
        f.state.url = 'https://login.microsoftonline.com/synthetic'
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(1000)
        f.get.mockRejectedValue(new Error('Synthetic read failure'))
        await vi.advanceTimersByTimeAsync(29000)
        expect(await pending).toMatchObject({ files: [], inventory: 'unknown', reason: 'auth_timeout' })
        expect(f.notify).toHaveBeenCalledExactlyOnceWith('auth_wait')
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('stops after an unavailable External action reply without retrying selection', async () => {
        const f = fixture()
        f.state.portal = { status: 'external_selectable' }
        const original = f.executeScript.getMockImplementation()!
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentPortal && (injection.args[1] as AttachmentPortalAction).kind === 'select_external') {
                return [{ frameId: 0, documentId: 'portal-document', result: { status: 'unavailable' } }]
            }
            return original(injection)
        })
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({ files: [], reason: 'unavailable' })
        expect(f.actions().filter(kind => kind === 'select_external')).toHaveLength(1)
        expect(f.click).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['select_external', 'download'] as const)('does not retry uncertain %s dispatch on rejection or timeout', async action => {
        for (const timeout of [false, true]) {
            const f = fixture()
            if (action === 'select_external') f.state.portal = { status: 'external_selectable' }
            const original = f.executeScript.getMockImplementation()!
            f.executeScript.mockImplementation(async injection => {
                if (injection.func === readAttachmentPortal && (injection.args[1] as AttachmentPortalAction).kind === action) {
                    if (timeout) return new Promise(() => {})
                    throw new Error('Synthetic uncertain dispatch')
                }
                return original(injection)
            })
            const pending = prepareAttachments(input(), f.deps)
            await vi.advanceTimersByTimeAsync(2000)
            expect(await pending).toMatchObject({ files: [], reason: action === 'download' ? 'download_failed' : 'unavailable' })
            expect(f.actions().filter(kind => kind === action)).toHaveLength(1)
            expect(f.listeners.size).toBe(0)
            expect(vi.getTimerCount()).toBe(0)
        }
    })

    it.each(['false', 'rejection', 'timeout'])('terminates polling on ownership %s without another attempt', async kind => {
        const f = fixture()
        f.state.portal = { status: 'unavailable' }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(0)
        const reads = f.get.mock.calls.length
        if (kind === 'false') f.state.current = false
        if (kind === 'rejection') f.isCurrent.mockRejectedValue(new Error('Synthetic ownership failure'))
        if (kind === 'timeout') f.isCurrent.mockImplementation(() => new Promise(() => {}))
        await vi.advanceTimersByTimeAsync(2250)
        expect(await pending).toMatchObject({ files: [], reason: 'stale' })
        expect(f.get).toHaveBeenCalledTimes(reads)
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('rejects duplicate candidates without a click or download history lookup', async () => {
        const f = fixture()
        f.state.portal = ready([row(), row()])
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({ files: [], reason: 'unavailable' })
        expect(f.click).not.toHaveBeenCalled()
        expect(f.search).not.toHaveBeenCalled()
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'portal_inventory', reason: 'unavailable' })
    })

    it('rechecks the source immediately before a download, not only before opening the tab', async () => {
        const f = fixture()
        f.get.mockImplementation(async () => {
            if (f.actions().includes('inspect')) f.state.matches = false
            return { id: 2, url: f.state.url }
        })
        expect(await prepareAttachments(input(), f.deps)).toMatchObject({ files: [], reason: 'stale' })
        expect(f.click).not.toHaveBeenCalled()
        expect(f.listeners.size).toBe(0)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_before_action', reason: 'stale' })
    })

    it('accepts four sequential 2 MiB downloads, retaining visible skipped count within 90 seconds', async () => {
        const f = fixture()
        const names = ['one.txt', 'two.txt', 'three.txt', 'four.txt']
        f.state.portal = ready(names.map(name => row(name)), 2)
        let next = 0
        f.click.mockImplementation(() => {
            const name = names[next++]
            f.emit(f.item(next, { url: `${base(name)}&partnerid=x&access_token=y`,
                filename: `C:\\Synthetic\\${name}`, fileSize: 2 * 1024 * 1024 }))
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(39999)
        expect(f.search).toHaveBeenCalledTimes(3)
        await vi.advanceTimersByTimeAsync(1)
        const result = await pending
        expect(result).toMatchObject({ inventory: 'known', reason: 'none', skipped: 2 })
        expect(result.files).toHaveLength(4)
        expect(result.files.reduce((sum, file) => sum + file.size, 0)).toBe(8 * 1024 * 1024)
        expect(f.click).toHaveBeenCalledTimes(4)
        expect(f.listeners.size).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['workspace', 'marker', 'query', 'accessor', 'extra'])('independently rejects malformed portal %s', async kind => {
        const f = fixture()
        const candidate = row()
        if (kind === 'workspace') candidate.workspace = 'aaaaaaaa-2222-3333-4444-555555555555'
        if (kind === 'marker') candidate.baseUrl = candidate.baseUrl.replace('/files/', '/workspaces/')
        if (kind === 'query') candidate.baseUrl += '&format=raw'
        const getter = vi.fn(() => base())
        if (kind === 'accessor') Object.defineProperty(candidate, 'baseUrl', { get: getter })
        f.state.portal = kind === 'extra' ? { ...ready(), unexpected: true } : ready([candidate])
        expect((await prepareAttachments(input(), f.deps)).files).toEqual([])
        expect(f.click).not.toHaveBeenCalled()
        expect(getter).not.toHaveBeenCalled()
    })

    it('ignores different full URIs and pre-gate replays, without querying or cancelling their IDs', async () => {
        const f = fixture()
        f.click.mockImplementation(() => {
            f.emit(f.item(50, { url: `${base('other.txt')}&partnerid=x&access_token=y` }))
            f.emit(f.item(51, { startTime: new Date(Date.now() - 1).toISOString() }))
            f.emit(f.item())
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect((await pending).files).toHaveLength(1)
        expect(f.search.mock.calls).toEqual([[{ id: 7 }]])
    })

    it('rejects a second matching ID arriving near the end of the full observation window', async () => {
        const f = fixture()
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(9999)
        f.emit(f.item(8))
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toMatchObject({ files: [], reason: 'download_failed', skipped: 1 })
        expect(f.search).not.toHaveBeenCalled()
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'download_completion', reason: 'download_failed' })
    })

    it('disarms late callbacks after the deadline and removes every observer', async () => {
        const f = fixture()
        f.click.mockImplementation(() => {})
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        const result = await pending
        for (const listener of f.captured) listener(f.item())
        expect(result.files).toEqual([])
        expect(f.search).not.toHaveBeenCalled()
        expect(f.listeners.size).toBe(0)
        expect(f.removeListener).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each([
        { state: 'in_progress' }, { danger: 'file' }, { exists: false }, { fileSize: -1 },
        { fileSize: 2 * 1024 * 1024 + 1 }, { filename: 'C:\\Synthetic\\synthetic.exe' },
        { filename: 'C:\\Synthetic\\different.txt' }, { filename: 'relative.txt' },
        { filename: `C:\\${'x'.repeat(512)}.txt` },
    ])('rejects unsafe/incomplete browser metadata %#', async overrides => {
        const f = fixture()
        f.click.mockImplementation(() => f.emit(f.item(7, overrides)))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ files: [], reason: 'download_failed', skipped: 1 })
    })

    it('accepts only the corresponding browser collision suffix with an allowed unchanged extension', async () => {
        const f = fixture()
        f.click.mockImplementation(() => f.emit(f.item(7, { filename: 'C:\\Synthetic\\synthetic (2).txt' })))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect((await pending).files).toEqual([{ path: 'C:\\Synthetic\\synthetic (2).txt', size: 42 }])
    })

    it.each(['source', 'owner'])('discards all paths when %s changes during observation', async kind => {
        const f = fixture()
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(1000)
        if (kind === 'source') f.state.matches = false
        else f.state.current = false
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ files: [], reason: 'stale' })
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(f.listeners.size).toBe(0)
    })

    it('checks durable ownership after a metadata search before accepting its result', async () => {
        const f = fixture()
        f.search.mockImplementation(async () => { f.state.current = false; return [f.item()] })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ files: [], reason: 'stale' })
    })

    it('retains unknown inventory and visible omissions, not an invented complete count', async () => {
        const f = fixture()
        f.state.sourceCount = 3
        f.state.portal = ready([], 2, false)
        expect(await prepareAttachments(input(), f.deps)).toEqual({ files: [], inventory: 'unknown', skipped: 3, reason: 'unavailable', language: 'en' })
    })

    it('does not report known empty inventory when the D365 source count is three', async () => {
        const f = fixture()
        f.state.sourceCount = 3
        f.state.portal = ready([])
        expect(await prepareAttachments(input(), f.deps)).toEqual({
            files: [], inventory: 'unknown', skipped: 3, reason: 'unavailable', language: 'en',
        })
        expect(f.click).not.toHaveBeenCalled()
        expect(f.search).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each([true, false])('retains safe files and an unknown-inventory warning when source count exceeds portal rows; complete=%s', async complete => {
        const f = fixture()
        f.state.sourceCount = 3
        f.state.portal = ready([row()], 1, complete)
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toEqual({
            files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }],
            inventory: 'unknown', skipped: 2, reason: 'unavailable', language: 'en',
        })
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(f.search).toHaveBeenCalledExactlyOnceWith({ id: 7 })
        expect(vi.getTimerCount()).toBe(0)
    })

    it('counts visible portal omissions when checking completeness against the source count', async () => {
        const f = fixture()
        f.state.sourceCount = 3
        f.state.portal = ready([row()], 2)
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ inventory: 'known', skipped: 2, reason: 'none' })
    })

    it.each([0, null])('keeps sustained portal unavailability unknown through the 30-second deadline with source count %s', async count => {
        const f = fixture()
        f.state.sourceCount = count
        f.state.portal = { status: 'unavailable' }
        const settled = vi.fn()
        const pending = prepareAttachments(input(), f.deps).then(result => { settled(); return result })
        await vi.advanceTimersByTimeAsync(29999)
        expect(settled).not.toHaveBeenCalled()
        expect(f.remove).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toEqual({
            files: [], inventory: 'unknown', skipped: 0, reason: 'unavailable', language: 'en',
        })
        expect(f.actions().length).toBeGreaterThan(1)
        expect(f.actions().every(action => action === 'inspect')).toBe(true)
        expect(f.create).toHaveBeenCalledExactlyOnceWith({ url: `${PORTAL}/Home?srNumber=${CASE}`, active: false })
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.search).not.toHaveBeenCalled()
        expect(f.addListener).not.toHaveBeenCalled()
        expect(f.removeListener).not.toHaveBeenCalled()
        expect(f.listeners.size).toBe(0)
        expect(f.notify).not.toHaveBeenCalled()
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each([
        { count: 0, complete: true }, { count: null, complete: true },
        { count: 0, complete: false }, { count: null, complete: false },
    ])('reports empty inventory as known only when explicitly complete; source count=$count complete=$complete', async ({ count, complete }) => {
        const f = fixture()
        f.state.sourceCount = count
        f.state.portal = ready([], 0, complete)
        const result = await prepareAttachments(input(), f.deps)
        expect(result).toMatchObject({ files: [], inventory: complete ? 'known' : 'unknown', skipped: 0, language: 'en' })
        if (complete) expect(result.reason).toBe('none')
        expect(f.actions()).toEqual(['inspect'])
        expect(f.create).toHaveBeenCalledExactlyOnceWith({ url: `${PORTAL}/Home?srNumber=${CASE}`, active: false })
        expect(f.click).not.toHaveBeenCalled()
        expect(f.selectExternal).not.toHaveBeenCalled()
        expect(f.search).not.toHaveBeenCalled()
        expect(f.addListener).not.toHaveBeenCalled()
        expect(f.removeListener).not.toHaveBeenCalled()
        expect(f.listeners.size).toBe(0)
        expect(f.notify).not.toHaveBeenCalled()
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('bounds a hung API and removes a tab that resolves after create timeout', async () => {
        const f = fixture()
        let resolve!: (tab: { id: number }) => void
        f.create.mockImplementation(() => new Promise(done => { resolve = done }))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(2000)
        expect(await pending).toMatchObject({ files: [], reason: 'unavailable' })
        expect(f.remove).not.toHaveBeenCalled()
        resolve({ id: 2 })
        await vi.advanceTimersByTimeAsync(0)
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('bounds a hung terminal search and a hung owned-tab removal', async () => {
        const f = fixture()
        f.search.mockImplementation(() => new Promise(() => {}))
        f.remove.mockImplementation(() => new Promise(() => {}))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(13000)
        expect(await pending).toMatchObject({ files: [], reason: 'download_failed' })
        expect(f.listeners.size).toBe(0)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('does not trust a click with a changed document reply or retry it', async () => {
        const f = fixture()
        f.click.mockImplementation(() => { f.state.portalDocument = 'replacement-document'; f.emit(f.item()) })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toMatchObject({ files: [], reason: 'download_failed' })
        expect(f.click).toHaveBeenCalledTimes(1)
        expect(f.search).not.toHaveBeenCalled()
    })
})

describe('attachment preparation terminal diagnostics', () => {
    it('keeps invalid input silent without browser effects', async () => {
        const f = fixture()
        expect(await prepareAttachments({ ...input(), caseNumber: 'invalid' }, f.deps)).toEqual({
            files: [], inventory: 'unknown', skipped: 0, reason: 'unavailable', language: 'en',
        })
        expect(f.isCurrent).not.toHaveBeenCalled()
        expect(f.executeScript).not.toHaveBeenCalled()
        expect(f.create).not.toHaveBeenCalled()
        expect(console.warn).not.toHaveBeenCalled()
    })

    it.each([false, true])('reports portal_create after rejected creation; ownership lost=%s', async stale => {
        const f = fixture()
        f.create.mockImplementation(async () => {
            if (stale) f.state.current = false
            throw new Error('Synthetic private URI https://example.invalid/?token=private')
        })
        const reason = stale ? 'stale' : 'unavailable'
        expect(await prepareAttachments(input(), f.deps)).toEqual({ files: [], inventory: 'unknown', skipped: 1, reason, language: 'en' })
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'portal_create', reason })
    })

    it('reports portal_wait once for pending portal readiness at the original deadline', async () => {
        const f = fixture()
        f.state.portal = { status: 'unavailable' }
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(29999)
        expect(console.warn).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect((await pending).reason).toBe('unavailable')
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: 'portal_wait', reason: 'unavailable',
            wait: { urlUnavailable: 0, tabReadFailed: 0, injectionFailed: 0, portalUnavailable: 120,
                lastOutcome: 'portal_unavailable', portalDetail: 'none' },
        })
    })

    it.each(['select_external', 'download'] as const)('restores the action stage after successful source validation for rejected %s', async action => {
        const f = fixture()
        if (action === 'select_external') f.state.portal = { status: 'external_selectable' }
        const original = f.executeScript.getMockImplementation()!
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentPortal && (injection.args[1] as AttachmentPortalAction).kind === action) {
                throw new Error('Synthetic private path C:\\Synthetic\\private.txt')
            }
            return original(injection)
        })
        const reason = action === 'download' ? 'download_failed' : 'unavailable'
        expect((await prepareAttachments(input(), f.deps)).reason).toBe(reason)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', {
            stage: action === 'download' ? 'download_dispatch' : 'external_selection', reason,
        })
        expect(f.listeners.size).toBe(0)
    })

    it.each(['select_external', 'download'] as const)('reports source_before_action when the source is missing before %s', async action => {
        const f = fixture()
        if (action === 'select_external') f.state.portal = { status: 'external_selectable' }
        const original = f.executeScript.getMockImplementation()!
        f.executeScript.mockImplementation(async injection => {
            const reply = await original(injection)
            if (injection.func === readAttachmentPortal) f.state.matches = null
            return reply
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(3000)
        expect((await pending).reason).toBe('unavailable')
        expect(f.actions()).toEqual(['inspect'])
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_before_action', reason: 'unavailable' })
    })

    it('keeps download_completion when ownership overrides a rejected metadata search', async () => {
        const f = fixture()
        f.search.mockImplementation(async () => { f.state.current = false; throw new Error('Synthetic metadata failure') })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect((await pending).reason).toBe('stale')
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'download_completion', reason: 'stale' })
    })

    it('preserves portal_inventory after successful downloads and final source checks', async () => {
        const f = fixture()
        f.state.sourceCount = 3
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect(await pending).toEqual({ files: [{ path: 'C:\\Synthetic\\synthetic.txt', size: 42 }], inventory: 'unknown', skipped: 2, reason: 'unavailable', language: 'en' })
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'portal_inventory', reason: 'unavailable' })
    })

    it.each(['unknown', 'stale'] as const)('reports source_final when final revalidation overrides rejected creation with %s source', async source => {
        const f = fixture()
        f.create.mockImplementation(async () => {
            f.state.matches = source === 'unknown' ? null : false
            throw new Error('Synthetic creation failure')
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(3000)
        const reason = source === 'unknown' ? 'unavailable' : 'stale'
        expect((await pending).reason).toBe(reason)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_final', reason })
    })

    it('reports source_final for late unknown source after four successful source reads', async () => {
        const f = fixture()
        const original = f.executeScript.getMockImplementation()!
        let sourceReads = 0
        f.executeScript.mockImplementation(async injection => {
            if (injection.func === readAttachmentSource && ++sourceReads > 4) f.state.matches = null
            return original(injection)
        })
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(12999)
        expect(console.warn).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(await pending).toEqual({ files: [], inventory: 'unknown', skipped: 1, reason: 'unavailable', language: 'en' })
        expect(sourceReads).toBe(19)
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'source_final', reason: 'unavailable' })
    })

    it('emits the primary diagnostic only after best-effort tab cleanup fails', async () => {
        const f = fixture()
        f.state.portal = { ...ready(), unexpected: 'Synthetic private detail' }
        f.remove.mockImplementation(async () => {
            expect(console.warn).not.toHaveBeenCalled()
            throw new Error('Synthetic cleanup failure')
        })
        expect((await prepareAttachments(input(), f.deps)).reason).toBe('unavailable')
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'portal_inventory', reason: 'unavailable' })
    })

    it('does not diagnose successful preparation when best-effort tab cleanup fails', async () => {
        const f = fixture()
        f.remove.mockRejectedValue(new Error('Synthetic cleanup failure'))
        const pending = prepareAttachments(input(), f.deps)
        await vi.advanceTimersByTimeAsync(10000)
        expect((await pending).reason).toBe('none')
        expect(f.remove).toHaveBeenCalledExactlyOnceWith(2)
        expect(console.warn).not.toHaveBeenCalled()
    })

    it('returns the unchanged result when the terminal console warning throws', async () => {
        const f = fixture()
        f.create.mockRejectedValue(new Error('Synthetic creation failure'))
        vi.mocked(console.warn).mockImplementation(() => { throw new Error('Synthetic logger failure') })
        expect(await prepareAttachments(input(), f.deps)).toEqual({ files: [], inventory: 'unknown', skipped: 1, reason: 'unavailable', language: 'en' })
        expect(console.warn).toHaveBeenCalledExactlyOnceWith('[DH] Attachment preparation incomplete', { stage: 'portal_create', reason: 'unavailable' })
    })
})

describe('bounded source header MAIN read', () => {
    function header(number: string, shadow = false) {
        const list = document.createElement('uci-header-control-list')
        document.body.append(list)
        const root = shadow ? list.attachShadow({ mode: 'open' }) : list
        const item = document.createElement('uci-header-control-list-item')
        item.setAttribute('data-name', 'header_msdfm_casenumberservicelevel')
        const slot = document.createElement('span')
        slot.setAttribute('slot', 'value')
        slot.textContent = `${number} | Synthetic service`
        slot.style.visibility = 'visible'
        vi.spyOn(slot, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
        item.append(slot)
        root.append(item)
        return { list, slot }
    }

    beforeEach(() => { document.body.replaceChildren(); vi.stubGlobal('location', { origin: 'https://onesupport.crm.dynamics.com' }) })

    it.each([CASE, TASK])('checks the entire canonical visible header identity %s including open shadow roots', number => {
        header(number, true)
        expect(readAttachmentSource(number)).toEqual({ matches: true, visibleAttachmentCount: null })
        expect(readAttachmentSource(number === CASE ? TASK : CASE).matches).toBe(false)
    })

    it('rejects competing visible records and hidden composed ancestors', () => {
        const first = header(CASE)
        const second = header(TASK)
        expect(readAttachmentSource(CASE).matches).toBeNull()
        second.list.style.display = 'none'
        expect(readAttachmentSource(CASE).matches).toBe(true)
        first.list.style.opacity = '0'
        expect(readAttachmentSource(CASE).matches).toBeNull()
    })

    it('reads only the fixed visible DTM count label without clicking it', () => {
        header(CASE)
        const count = document.createElement('button')
        count.setAttribute('aria-label', 'DTM Attachments (4)')
        count.style.visibility = 'visible'
        document.body.append(count)
        vi.spyOn(count, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
        const click = vi.spyOn(count, 'click')
        expect(readAttachmentSource(CASE)).toEqual({ matches: true, visibleAttachmentCount: 4 })
        expect(click).not.toHaveBeenCalled()
    })

    it('rejects a foreign origin or an over-budget known header', () => {
        const { list } = header(CASE)
        vi.stubGlobal('location', { origin: 'https://example.invalid' })
        expect(readAttachmentSource(CASE).matches).toBeNull()
        vi.stubGlobal('location', { origin: 'https://onesupport.crm.dynamics.com' })
        for (let i = 0; i < 2001; i++) list.append(document.createElement('span'))
        expect(readAttachmentSource(CASE).matches).toBeNull()
    })

    it('distinguishes a missing or unreadable header from a confirmed different full case identity', () => {
        expect(readAttachmentSource(CASE)).toEqual({ matches: null, visibleAttachmentCount: null })
        const { slot } = header(TASK)
        expect(readAttachmentSource(CASE)).toEqual({ matches: false, visibleAttachmentCount: null })
        slot.textContent = 'x'.repeat(1025)
        expect(readAttachmentSource(CASE)).toEqual({ matches: null, visibleAttachmentCount: null })
    })
})
