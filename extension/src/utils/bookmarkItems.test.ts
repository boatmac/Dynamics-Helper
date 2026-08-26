import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    collapseBookmarkFolders,
    loadBookmarkItems,
    parseBookmarkDocument,
    parseBookmarkItems,
    parseOwnBookmarkItems,
    readDefaultItems,
    readStoredItems,
    writeStoredItems,
    type MenuItem,
} from './bookmarkItems'
import {
    chromeMockSpies,
    deferNextStorageGet,
    getStorageSnapshot,
    installChromeMock,
    resetChromeMock,
    seedStorage,
} from '../test/chromeMock'

installChromeMock()

function link(label = 'Bookmark'): MenuItem {
    return { type: 'link', label, url: 'https://example.com' }
}

function itemChain(levels: number, type: MenuItem['type'] = 'folder'): MenuItem[] {
    let current: MenuItem = { type, label: `Level ${levels}` }
    for (let level = levels - 1; level >= 1; level -= 1) {
        current = {
            type,
            label: `Level ${level}`,
            children: [current],
        }
    }
    return [current]
}

function unknownPath(leafDepth: number): unknown {
    let value: unknown = 'leaf'
    for (let depth = leafDepth - 1; depth >= 2; depth -= 1) {
        value = depth % 2 === 0 ? { next: value } : [value]
    }
    return value
}

function fetchText(text: string, ok = true): typeof globalThis.fetch {
    return vi.fn(async () => ({
        ok,
        text: async () => text,
    } as Response)) as unknown as typeof globalThis.fetch
}

function returnStorageResult(value: unknown): void {
    chromeMockSpies.storageGet.mockImplementationOnce(
        (_keys?: unknown, maybeCallback?: unknown) => {
            if (typeof maybeCallback === 'function') {
                queueMicrotask(() => {
                    ;(maybeCallback as (result: unknown) => void)(value)
                })
            }
            return undefined
        },
    )
}

function quietConsole() {
    return [
        vi.spyOn(console, 'log').mockImplementation(() => undefined),
        vi.spyOn(console, 'warn').mockImplementation(() => undefined),
        vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ]
}

beforeEach(() => {
    resetChromeMock()
    installChromeMock()
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('bookmark item boundary', () => {
    it('current schema', () => {
        const input: MenuItem[] = [
            {
                type: 'folder',
                label: '',
                url: '',
                content: '',
                children: [],
                target: '',
                icon: '',
                collapsed: false,
                tags: ['empty-label'],
                source: 'personal',
            },
            { type: 'link', label: 'Link', url: 'https://example.com' },
            { type: 'markdown', label: 'Note', content: '# Note' },
            { type: 'back', label: 'Back', target: 'root' },
            { type: 'unknown', label: 'Future', icon: 'question' },
        ]

        const parsed = parseBookmarkItems(input)

        expect(parsed).toEqual(input)
        expect(parsed).not.toBe(input)
        expect(parsed?.every(item => !Object.hasOwn(item, 'id'))).toBe(true)
    })

    it('safe unknown own data', () => {
        const item = Object.assign(
            Object.create({ inherited: 'drop' }) as Record<string, unknown>,
            {
                type: 'link',
                label: 'Future bookmark',
                future: { flag: true, list: [1, 'x', null] },
            },
        )

        const parsed = parseBookmarkItems([item])

        expect((parsed?.[0] as Record<string, unknown> | undefined)?.future).toEqual({
            flag: true,
            list: [1, 'x', null],
        })
        expect(Object.getPrototypeOf(parsed?.[0])).toBe(Object.prototype)
        expect(Object.hasOwn(parsed?.[0] ?? {}, 'inherited')).toBe(false)
    })

    it('preserves own __proto__ as inert data', () => {
        const nested: Record<string, unknown> = { safe: true }
        Object.defineProperty(nested, '__proto__', {
            value: { nestedPolluted: true },
            enumerable: true,
            writable: true,
            configurable: true,
        })
        const item: Record<string, unknown> = {
            type: 'link',
            label: 'Safe',
            future: nested,
        }
        Object.defineProperty(item, '__proto__', {
            value: { polluted: true },
            enumerable: true,
            writable: true,
            configurable: true,
        })

        const parsed = parseBookmarkItems([item])
        const parsedItem = parsed?.[0] as Record<string, unknown> | undefined
        const parsedNested = parsedItem?.future as Record<string, unknown> | undefined
        const itemDescriptor = Object.getOwnPropertyDescriptor(parsedItem ?? {}, '__proto__')
        const nestedDescriptor = Object.getOwnPropertyDescriptor(parsedNested ?? {}, '__proto__')

        expect(itemDescriptor).toMatchObject({
            enumerable: true,
            writable: true,
            configurable: true,
            value: { polluted: true },
        })
        expect(nestedDescriptor).toMatchObject({
            enumerable: true,
            writable: true,
            configurable: true,
            value: { nestedPolluted: true },
        })
        expect(Object.getPrototypeOf(parsedItem)).toBe(Object.prototype)
        expect(Object.getPrototypeOf(parsedNested)).toBe(Object.prototype)
        expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
        expect(Object.hasOwn(Object.prototype, 'nestedPolluted')).toBe(false)
    })

    it('unsafe unknown own data', () => {
        const convert = vi.fn(() => {
            throw new Error('SECRET')
        })
        const cyclic: Record<string, unknown> = {}
        cyclic.self = cyclic
        const accessor: Record<string, unknown> = {}
        const getter = vi.fn(() => {
            throw new Error('SECRET')
        })
        Object.defineProperty(accessor, 'secret', {
            enumerable: true,
            get: getter,
        })
        const throwingProxy = new Proxy({}, {
            ownKeys: () => {
                throw new Error('SECRET')
            },
        })
        const unsafe: unknown[] = [
            Object.assign(() => undefined, { toString: convert }),
            Symbol('secret'),
            BigInt(1),
            Number.NaN,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            accessor,
            throwingProxy,
            cyclic,
        ]

        for (const future of unsafe) {
            expect(parseBookmarkItems([{
                type: 'link',
                label: 'Unsafe',
                future,
            }])).toBeNull()
        }
        expect(getter).not.toHaveBeenCalled()
        expect(convert).not.toHaveBeenCalled()
    })

    it('cross-field cycle', () => {
        const direct: Record<string, unknown> = {
            type: 'link',
            label: 'Direct',
        }
        direct.future = { owner: direct }

        const child: Record<string, unknown> = {
            type: 'link',
            label: 'Child',
        }
        const children = [child]
        const future = { children }
        child.future = future
        const indirect: Record<string, unknown> = {
            type: 'folder',
            label: 'Indirect',
            children,
            future,
        }

        expect(parseBookmarkItems([direct])).toBeNull()
        expect(parseBookmarkItems([indirect])).toBeNull()
    })

    it('rejects unknown-data depth 65', () => {
        expect(parseBookmarkItems([{
            type: 'link',
            label: 'Depth 64',
            future: unknownPath(64),
        }])).not.toBeNull()
        expect(() => parseBookmarkItems([{
            type: 'link',
            label: 'Depth 65',
            future: unknownPath(65),
        }])).not.toThrow()
        expect(parseBookmarkItems([{
            type: 'link',
            label: 'Depth 65',
            future: unknownPath(65),
        }])).toBeNull()
    })

    it('accessor', () => {
        const getter = vi.fn(() => {
            throw new Error('SECRET')
        })
        const item: Record<string, unknown> = { type: 'link' }
        Object.defineProperty(item, 'label', {
            enumerable: true,
            get: getter,
        })

        expect(parseBookmarkItems([link('Control')])).toEqual([link('Control')])
        expect(parseBookmarkItems([item])).toBeNull()
        expect(getter).not.toHaveBeenCalled()
    })

    it('wrong known field', () => {
        const convert = vi.fn(() => {
            throw new Error('SECRET')
        })
        const invalidType = {
            toString: convert,
            [Symbol.toPrimitive]: convert,
        }
        const invalid: unknown[] = [
            [[]],
            [{ type: 'link', label: 42 }],
            [{ type: 'folder', label: 'Folder', collapsed: 'false' }],
            [{ type: 'link', label: 'Tags', tags: ['safe', 1] }],
            [{ type: 'link', label: 'Source', source: 'shared' }],
            [{ type: invalidType, label: 'Type' }],
        ]

        for (const value of invalid) {
            expect(parseBookmarkItems(value)).toBeNull()
        }
        expect(convert).not.toHaveBeenCalled()
    })

    it('cycle', () => {
        const parent: Record<string, unknown> = {
            type: 'folder',
            label: 'Parent',
            children: [],
        }
        ;(parent.children as unknown[]).push(parent)
        const extraCycle: Record<string, unknown> = {
            type: 'link',
            label: 'Extra',
        }
        extraCycle.future = { owner: extraCycle }

        expect(parseBookmarkItems([parent])).toBeNull()
        expect(parseBookmarkItems([extraCycle])).toBeNull()
    })

    it('depth 64', () => {
        expect(parseBookmarkItems(itemChain(64))).not.toBeNull()
    })

    it('rejects 65 nested levels', () => {
        expect(parseBookmarkItems(itemChain(65))).toBeNull()
        expect(parseBookmarkItems(itemChain(65, 'link'))).toBeNull()
    })

    it('throwing array length get', () => {
        const convert = vi.fn(() => {
            throw new Error('SECRET')
        })
        const item = link()
        Object.defineProperty(item, 'toString', {
            value: convert,
            enumerable: false,
        })
        const target = [item]
        const get = vi.fn((_target: MenuItem[], key: PropertyKey) => {
            throw new Error(key === 'length' ? 'SECRET length' : 'SECRET property')
        })
        const ownKeys = vi.fn((value: MenuItem[]) => Reflect.ownKeys(value))
        const getOwnPropertyDescriptor = vi.fn(
            (value: MenuItem[], key: PropertyKey) => Reflect.getOwnPropertyDescriptor(value, key),
        )
        const proxy = new Proxy(target, {
            get,
            ownKeys,
            getOwnPropertyDescriptor,
        })
        const logs = quietConsole()

        expect(parseBookmarkItems(proxy)).toEqual(target)
        expect(get).not.toHaveBeenCalled()
        expect(convert).not.toHaveBeenCalled()
        expect(ownKeys).toHaveBeenCalledTimes(1)
        expect(getOwnPropertyDescriptor).toHaveBeenCalledTimes(2)
        logs.forEach(log => expect(log).not.toHaveBeenCalled())
    })

    it('throwing proxy ownKeys', () => {
        const logs = quietConsole()
        const makeProxy = <T extends object>(target: T) => new Proxy(target, {
            ownKeys: () => {
                throw new Error('SECRET')
            },
        })

        expect(() => parseBookmarkItems(makeProxy([link()]))).not.toThrow()
        expect(parseBookmarkItems(makeProxy([link()]))).toBeNull()
        expect(parseBookmarkItems([makeProxy(link())])).toBeNull()
        expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
        logs.forEach(log => expect(log).not.toHaveBeenCalled())
    })

    it('throwing proxy descriptor', () => {
        const logs = quietConsole()
        const makeProxy = <T extends object>(target: T) => new Proxy(target, {
            getOwnPropertyDescriptor: () => {
                throw new Error('SECRET')
            },
        })

        expect(() => parseBookmarkItems(makeProxy([link()]))).not.toThrow()
        expect(parseBookmarkItems(makeProxy([link()]))).toBeNull()
        expect(parseBookmarkItems([makeProxy(link())])).toBeNull()
        expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
        logs.forEach(log => expect(log).not.toHaveBeenCalled())
    })

    it('revoked proxy containment', () => {
        const revoked = <T extends object>(target: T) => {
            const value = Proxy.revocable(target, {})
            value.revoke()
            return value.proxy
        }
        const logs = quietConsole()
        const attempts = [
            () => parseBookmarkItems(revoked([link()])),
            () => parseBookmarkItems([revoked(link())]),
            () => parseBookmarkItems([{
                type: 'folder',
                label: 'Children',
                children: revoked([link()]),
            }]),
            () => parseBookmarkItems([{
                type: 'link',
                label: 'Tags',
                tags: revoked(['safe']),
            }]),
            () => parseBookmarkItems([{
                type: 'link',
                label: 'Unknown',
                future: revoked({ safe: true }),
            }]),
            () => parseBookmarkDocument(revoked({ items: [link()] })),
        ]

        for (const attempt of attempts) {
            expect(attempt).not.toThrow()
            expect(attempt()).toBeNull()
        }
        expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
        logs.forEach(log => expect(log).not.toHaveBeenCalled())
    })

    it('guarded own bookmark property', () => {
        const items = [link()]
        const getter = vi.fn(() => {
            throw new Error('SECRET')
        })
        const accessor = {}
        Object.defineProperty(accessor, 'bookmarks', {
            enumerable: true,
            get: getter,
        })
        const inherited = Object.create({ bookmarks: items })
        const get = vi.fn(() => {
            throw new Error('SECRET')
        })
        const descriptor = vi.fn(() => {
            throw new Error('SECRET')
        })
        const throwing = new Proxy({}, {
            get,
            getOwnPropertyDescriptor: descriptor,
        })
        const revocable = Proxy.revocable({ bookmarks: items }, {})
        revocable.revoke()

        expect(parseOwnBookmarkItems({ bookmarks: items }, 'bookmarks')).toEqual(items)
        expect(parseOwnBookmarkItems({}, 'bookmarks')).toBeNull()
        expect(parseOwnBookmarkItems(inherited, 'bookmarks')).toBeNull()
        expect(parseOwnBookmarkItems(accessor, 'bookmarks')).toBeNull()
        expect(parseOwnBookmarkItems(throwing, 'bookmarks')).toBeNull()
        expect(() => parseOwnBookmarkItems(revocable.proxy, 'bookmarks')).not.toThrow()
        expect(parseOwnBookmarkItems(revocable.proxy, 'bookmarks')).toBeNull()
        expect(getter).not.toHaveBeenCalled()
        expect(get).not.toHaveBeenCalled()
        expect(descriptor).toHaveBeenCalled()
    })

    it('document shapes', () => {
        const items = [link()]

        expect(parseBookmarkDocument(items)).toEqual(items)
        expect(parseBookmarkDocument({ items })).toEqual(items)
    })

    it('malformed document', () => {
        const getter = vi.fn(() => {
            throw new Error('SECRET')
        })
        const accessor = {}
        Object.defineProperty(accessor, 'items', {
            enumerable: true,
            get: getter,
        })

        expect(parseBookmarkDocument({})).toBeNull()
        expect(parseBookmarkDocument('<html>not JSON</html>')).toBeNull()
        expect(parseBookmarkDocument(42)).toBeNull()
        expect(parseBookmarkDocument(accessor)).toBeNull()
        expect(getter).not.toHaveBeenCalled()
    })

    it('rejects accessors and cyclic data without invoking conversion hooks', () => {
        const convert = vi.fn(() => 'SECRET')
        const item: Record<string, unknown> = {
            type: 'folder',
            children: [],
            toString: convert,
        }
        Object.defineProperty(item, 'label', {
            enumerable: true,
            get: () => { throw new Error('SECRET') },
        })
        ;(item.children as unknown[]).push(item)

        expect(parseBookmarkItems([item])).toBeNull()
        expect(convert).not.toHaveBeenCalled()
    })
})

describe('bookmark storage and defaults', () => {
    it('stored empty', async () => {
        seedStorage({ dh_items: [] })

        await expect(readStoredItems()).resolves.toEqual({
            kind: 'saved',
            items: [],
        })
    })

    it('true absence', async () => {
        await expect(readStoredItems()).resolves.toEqual({ kind: 'absent' })
    })

    it('inherited key', async () => {
        returnStorageResult(Object.create({ dh_items: [link()] }))

        await expect(readStoredItems()).resolves.toEqual({ kind: 'absent' })
    })

    it('invalid present', async () => {
        seedStorage({ dh_items: { items: [] } })

        await expect(readStoredItems()).resolves.toEqual({
            kind: 'invalid',
            code: 'bookmark_storage_invalid',
        })
    })

    it('throwing/revoked storage result', async () => {
        const fetcher = fetchText(JSON.stringify([link()]))
        const throwing = new Proxy({}, {
            getOwnPropertyDescriptor: () => {
                throw new Error('SECRET')
            },
        })
        returnStorageResult(throwing)
        await expect(loadBookmarkItems(fetcher)).resolves.toEqual({
            kind: 'invalid',
            code: 'bookmark_storage_invalid',
        })

        const revocable = Proxy.revocable({ dh_items: [link()] }, {})
        revocable.revoke()
        returnStorageResult(revocable.proxy)
        await expect(loadBookmarkItems(fetcher)).resolves.toEqual({
            kind: 'invalid',
            code: 'bookmark_storage_invalid',
        })
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('scoped read failure', async () => {
        const logs = quietConsole()
        const deferred = deferNextStorageGet('dh_items')
        void deferred.promise.catch(() => undefined)
        const result = readStoredItems()
        deferred.reject(new Error('secret'))

        await expect(result).resolves.toEqual({
            kind: 'failed',
            code: 'bookmark_storage_read_failed',
        })
        expect(chromeMockSpies.storageGet).toHaveBeenCalledWith(
            'dh_items',
            expect.any(Function),
        )
        expect(chrome.runtime.lastError).toBeUndefined()
        logs.forEach(log => expect(log).not.toHaveBeenCalled())
    })

    it('valid defaults', async () => {
        const items = [link()]
        const cases: Array<{ shape: unknown; expected: MenuItem[] }> = [
            { shape: items, expected: items },
            { shape: { items }, expected: items },
            { shape: [], expected: [] },
            { shape: { items: [] }, expected: [] },
        ]

        for (const { shape, expected } of cases) {
            const fetcher = fetchText(JSON.stringify(shape))
            await expect(readDefaultItems(fetcher)).resolves.toEqual({
                kind: 'loaded',
                items: expected,
            })
            expect(fetcher).toHaveBeenCalledWith('chrome-extension://test/items.json')
        }
    })

    it('default failures', async () => {
        const logs = quietConsole()
        const failures: typeof globalThis.fetch[] = [
            fetchText('not found', false),
            fetchText('<html>SECRET</html>'),
            fetchText('{ invalid JSON'),
            fetchText(JSON.stringify({ items: [{ type: 'link', label: 1 }] })),
            vi.fn(async () => {
                throw new Error('SECRET')
            }) as unknown as typeof globalThis.fetch,
        ]

        for (const fetcher of failures) {
            await expect(readDefaultItems(fetcher)).resolves.toEqual({
                kind: 'failed',
                code: 'bookmark_defaults_unreadable',
            })
        }
        logs.forEach(log => expect(log).not.toHaveBeenCalled())
    })

    it('shared load orchestration', async () => {
        const saved = [link('Saved')]
        const defaults = [link('Default')]
        seedStorage({ dh_items: saved })
        const savedFetch = fetchText(JSON.stringify(defaults))
        await expect(loadBookmarkItems(savedFetch)).resolves.toEqual({
            kind: 'loaded',
            source: 'saved',
            items: saved,
        })
        expect(savedFetch).not.toHaveBeenCalled()

        resetChromeMock()
        const defaultFetch = fetchText(JSON.stringify({ items: defaults }))
        await expect(loadBookmarkItems(defaultFetch)).resolves.toEqual({
            kind: 'loaded',
            source: 'defaults',
            items: defaults,
        })
        expect(defaultFetch).toHaveBeenCalledTimes(1)

        resetChromeMock()
        seedStorage({ dh_items: { items: [] } })
        const invalidFetch = fetchText(JSON.stringify(defaults))
        await expect(loadBookmarkItems(invalidFetch)).resolves.toEqual({
            kind: 'invalid',
            code: 'bookmark_storage_invalid',
        })
        expect(invalidFetch).not.toHaveBeenCalled()

        resetChromeMock()
        const deferred = deferNextStorageGet('dh_items')
        void deferred.promise.catch(() => undefined)
        const failedFetch = fetchText(JSON.stringify(defaults))
        const failedRead = loadBookmarkItems(failedFetch)
        deferred.reject(new Error('SECRET'))
        await expect(failedRead).resolves.toEqual({
            kind: 'failed',
            code: 'bookmark_storage_read_failed',
        })
        expect(failedFetch).not.toHaveBeenCalled()

        resetChromeMock()
        const unreadable = fetchText('<html>SECRET</html>')
        await expect(loadBookmarkItems(unreadable)).resolves.toEqual({
            kind: 'failed',
            code: 'bookmark_defaults_unreadable',
        })
        expect(unreadable).toHaveBeenCalledTimes(1)
    })

    it('generation-owned write', async () => {
        const items = [link()]

        await expect(writeStoredItems(items, () => false)).resolves.toBe('stale')
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()

        await expect(writeStoredItems(items, () => true)).resolves.toBe('committed')
        expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1)
        expect(getStorageSnapshot()).toEqual({ dh_items: items })

        await expect(writeStoredItems(items, () => {
            throw new Error('SECRET')
        })).rejects.toThrow('Bookmark storage ownership check failed')
        expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1)
    })

    it('generation-owned collapse', () => {
        const items = itemChain(64)
        let ownershipChecks = 0

        const result = collapseBookmarkFolders(items, () => {
            ownershipChecks += 1
            return ownershipChecks < 10
        })

        expect(result).toBeNull()
        expect(ownershipChecks).toBe(10)
        expect(items[0].collapsed).toBeUndefined()
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })
})
