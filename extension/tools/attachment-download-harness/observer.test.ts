import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureAttachmentSource } from '../../src/utils/attachmentDownload'
import { observeDownload } from './observer'

const origin = 'https://attachments.example.test'
const workspace = '11111111-2222-3333-4444-555555555555'
const baseUrl = `${origin}/${workspace}/download?attachment=selected`
const source = captureAttachmentSource(baseUrl, workspace, origin)!
const signedUrl = `${baseUrl}&partnerid=synthetic&access_token=synthetic`

function item(id: number, overrides: Partial<chrome.downloads.DownloadItem> = {}) {
    return { id, url: signedUrl, filename: 'C:\\synthetic\\same.txt',
        state: 'complete', danger: 'safe', fileSize: 0, ...overrides } as chrome.downloads.DownloadItem
}

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
    return { promise, resolve, reject }
}

function fixture() {
    const created = new Set<(value: chrome.downloads.DownloadItem) => void>()
    const changed = new Set<(value: chrome.downloads.DownloadDelta) => void>()
    const records = new Map<number, chrome.downloads.DownloadItem>()
    const search = vi.fn(async (query: chrome.downloads.DownloadQuery) => {
        const record = records.get(query.id!)
        return record ? [record] : []
    })
    const onCreated = {
        addListener: vi.fn((listener: (value: chrome.downloads.DownloadItem) => void) => {
            created.add(listener)
        }),
        removeListener: vi.fn((listener: (value: chrome.downloads.DownloadItem) => void) => {
            created.delete(listener)
        }),
    }
    const onChanged = {
        addListener: vi.fn((listener: (value: chrome.downloads.DownloadDelta) => void) => {
            changed.add(listener)
        }),
        removeListener: vi.fn((listener: (value: chrome.downloads.DownloadDelta) => void) => {
            changed.delete(listener)
        }),
    }
    const downloads = { search, onCreated, onChanged } as unknown as Parameters<typeof observeDownload>[1]
    return {
        downloads, search, onCreated, onChanged, records,
        create(value: chrome.downloads.DownloadItem) {
            records.set(value.id, value)
            for (const listener of created) listener(value)
        },
        change(id: number) { for (const listener of changed) listener({ id }) },
        cleaned() {
            expect(created.size).toBe(0)
            expect(changed.size).toBe(0)
            expect(onCreated.removeListener).toHaveBeenCalledTimes(1)
            expect(onChanged.removeListener).toHaveBeenCalledTimes(1)
            expect(vi.getTimerCount()).toBe(0)
        },
    }
}

describe('observeDownload', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('registers before trigger, ignores pre-arm events, and observes the full default window', async () => {
        const f = fixture()
        const register = f.onCreated.addListener.getMockImplementation()!
        f.onCreated.addListener.mockImplementationOnce(listener => {
            register(listener)
            listener(item(90))
        })
        const trigger = vi.fn(async () => {
            expect(f.onChanged.addListener).toHaveBeenCalledTimes(1)
            return true
        })
        const result = observeDownload(source, f.downloads, trigger)
        let settled = false
        void result.then(() => { settled = true })
        await vi.advanceTimersByTimeAsync(29_999)
        expect(settled).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        expect(await result).toEqual({ status: 'unmatched', matchedCount: 0 })
        expect(trigger).toHaveBeenCalledTimes(1)
        expect(f.search).not.toHaveBeenCalled()
        f.cleaned()
    })

    it('queries immediate completion by ID and rechecks finally without returning early', async () => {
        const f = fixture()
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(1))
            return true
        }, 1_000)
        let settled = false
        void result.then(() => { settled = true })
        await vi.advanceTimersByTimeAsync(999)
        expect(settled).toBe(false)
        expect(f.search.mock.calls).toEqual([[{ id: 1 }], [{ id: 1 }]])
        await vi.advanceTimersByTimeAsync(1)
        expect(await result).toEqual({ status: 'complete', matchedCount: 1 })
        f.cleaned()
    })

    it('ignores the same filename at a different URI and uncreated changed IDs', async () => {
        const f = fixture()
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(2, { url: signedUrl.replace('selected', 'other') }))
            f.change(99)
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status: 'unmatched', matchedCount: 0 })
        expect(f.search).not.toHaveBeenCalled()
        f.cleaned()
    })

    it('requeries changes and detects completion even when the change event was missed', async () => {
        const f = fixture()
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(3, { state: 'in_progress' }))
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(100)
        f.change(3)
        await vi.advanceTimersByTimeAsync(100)
        f.records.set(3, item(3))
        await vi.advanceTimersByTimeAsync(800)
        expect(await result).toEqual({ status: 'complete', matchedCount: 1 })
        expect(f.search.mock.calls).toEqual([[{ id: 3 }], [{ id: 3 }], [{ id: 3 }]])
        f.cleaned()
    })

    it('deduplicates an ID but retains ambiguity from a second late match', async () => {
        const f = fixture()
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(1))
            f.create(item(1))
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(999)
        f.create(item(2, { state: 'interrupted' }))
        f.change(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(await result).toEqual({ status: 'ambiguous', matchedCount: 2 })
        f.cleaned()
    })

    it('bounds distinct IDs at eight without losing ambiguity', async () => {
        const f = fixture()
        const result = observeDownload(source, f.downloads, async () => {
            for (let id = 1; id <= 12; id++) f.create(item(id))
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status: 'ambiguous', matchedCount: 8 })
        expect(f.search).toHaveBeenCalledTimes(16)
        expect(f.search.mock.calls.every(([query]) => Object.keys(query).join() === 'id'
            && query.id! <= 8)).toBe(true)
        f.cleaned()
    })

    it.each(['false', 'reject', 'throw'] as const)('never passes completed events when trigger returns %s', async mode => {
        const f = fixture()
        const trigger = vi.fn(() => {
            f.create(item(1))
            if (mode === 'throw') throw new Error('synthetic private detail')
            return mode === 'false' ? Promise.resolve(false)
                : Promise.reject(new Error('synthetic private detail'))
        })
        const result = await observeDownload(source, f.downloads, trigger, 1_000)
        expect(result).toEqual({ status: 'trigger_failed', matchedCount: 1 })
        expect(trigger).toHaveBeenCalledTimes(1)
        f.cleaned()
    })

    it('bounds a hanging trigger and makes late trigger and event callbacks inert', async () => {
        const f = fixture()
        const pending = deferred<boolean>()
        const trigger = vi.fn(() => pending.promise)
        const result = observeDownload(source, f.downloads, trigger, 1_000)
        const lateCreated = f.onCreated.addListener.mock.calls[0][0]
        const lateChanged = f.onChanged.addListener.mock.calls[0][0]
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status: 'trigger_failed', matchedCount: 0 })
        pending.resolve(true)
        lateCreated(item(1))
        lateChanged({ id: 1 })
        await vi.advanceTimersByTimeAsync(1_000)
        expect(f.search).not.toHaveBeenCalled()
        expect(trigger).toHaveBeenCalledTimes(1)
        f.cleaned()
    })

    it('returns a safe failure on search rejection and cleans listeners', async () => {
        const f = fixture()
        f.search.mockRejectedValueOnce(new Error(signedUrl))
        const result = await observeDownload(source, f.downloads, async () => {
            f.create(item(1))
            return true
        }, 1_000)
        expect(result).toEqual({ status: 'observer_failed', matchedCount: 1 })
        f.cleaned()
    })

    it.each(['resolve', 'reject'] as const)('bounds hanging searches and ignores late %s', async mode => {
        const f = fixture()
        const pending = deferred<chrome.downloads.DownloadItem[]>()
        f.search.mockImplementation(() => pending.promise)
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(1))
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status: 'observer_failed', matchedCount: 1 })
        if (mode === 'resolve') pending.resolve([item(1)])
        else pending.reject(new Error('synthetic private detail'))
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status: 'observer_failed', matchedCount: 1 })
        f.cleaned()
    })

    it.each([
        { items: [item(99)] },
        { items: [item(1, { url: signedUrl.replace('selected', 'other') })] },
        { items: [] },
        { items: [item(1), item(1)] },
    ])('rejects a query result without one exact ID and URL match: %#', async ({ items }) => {
        const f = fixture()
        f.search.mockResolvedValue(items)
        const result = await observeDownload(source, f.downloads, async () => {
            f.create(item(1))
            return true
        }, 1_000)
        expect(result).toEqual({ status: 'observer_failed', matchedCount: 1 })
        f.cleaned()
    })

    it.each([
        { overrides: { danger: 'file' }, status: 'blocked' },
        { overrides: { danger: 'accepted' }, status: 'blocked' },
        { overrides: { state: 'interrupted' }, status: 'incomplete' },
        { overrides: { state: 'in_progress' }, status: 'incomplete' },
        { overrides: { fileSize: -1 }, status: 'incomplete' },
        { overrides: { fileSize: NaN }, status: 'incomplete' },
        { overrides: { fileSize: Infinity }, status: 'incomplete' },
    ])('does not qualify unsafe or unfinished metadata: $status $overrides', async ({ overrides, status }) => {
        const f = fixture()
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(1, overrides as Partial<chrome.downloads.DownloadItem>))
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status, matchedCount: 1 })
        f.cleaned()
    })

    it('does not let an older query overwrite a newer blocked snapshot', async () => {
        const f = fixture()
        const old = deferred<chrome.downloads.DownloadItem[]>()
        f.search.mockImplementationOnce(() => old.promise)
        const result = observeDownload(source, f.downloads, async () => {
            f.create(item(1))
            return true
        }, 1_000)
        await vi.advanceTimersByTimeAsync(950)
        f.records.set(1, item(1, { danger: 'file' }))
        f.change(1)
        await vi.advanceTimersByTimeAsync(1)
        old.resolve([item(1)])
        await vi.advanceTimersByTimeAsync(49)
        expect(await result).toEqual({ status: 'blocked', matchedCount: 1 })
        f.cleaned()
    })

    it.each(['invalid response', 'rejection'] as const)(
        'ignores an older query %s after a newer complete snapshot', async mode => {
            const f = fixture()
            const old = deferred<chrome.downloads.DownloadItem[]>()
            f.search.mockImplementationOnce(() => old.promise)
            const result = observeDownload(source, f.downloads, async () => {
                f.create(item(1))
                return true
            }, 1_000)
            let settled = false
            void result.then(() => { settled = true })
            await vi.advanceTimersByTimeAsync(950)
            expect(f.search.mock.calls).toEqual([[{ id: 1 }], [{ id: 1 }]])
            if (mode === 'invalid response') old.resolve([item(99)])
            else old.reject(new Error('synthetic private detail'))
            await vi.advanceTimersByTimeAsync(1)
            expect(settled).toBe(false)
            await vi.advanceTimersByTimeAsync(49)
            expect(await result).toEqual({ status: 'complete', matchedCount: 1 })
            f.cleaned()
        },
    )

    it('cleans both listeners after partial registration failure without triggering', async () => {
        const f = fixture()
        f.onChanged.addListener.mockImplementationOnce(() => { throw new Error('synthetic') })
        const trigger = vi.fn(async () => true)
        expect(await observeDownload(source, f.downloads, trigger, 1_000))
            .toEqual({ status: 'observer_failed', matchedCount: 0 })
        expect(trigger).not.toHaveBeenCalled()
        f.cleaned()
    })

    it('attempts the second removal even if the first throws', async () => {
        const f = fixture()
        f.onCreated.removeListener.mockImplementationOnce(() => { throw new Error('synthetic') })
        const result = observeDownload(source, f.downloads, async () => true, 1_000)
        await vi.advanceTimersByTimeAsync(1_000)
        expect(await result).toEqual({ status: 'observer_failed', matchedCount: 0 })
        expect(f.onChanged.removeListener).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })
})
