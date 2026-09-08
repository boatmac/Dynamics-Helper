import { describe, expect, it, vi } from 'vitest'
import {
    parsePageIdentity,
    parsePageIdentitySnapshot,
    parseScrapedDataSnapshot,
} from './pageIdentity'

describe('page identity snapshots', () => {
    it.each([
        [{ caseNumber: 'A', ticketTitle: 'Title' }, 'case:A'],
        [{ caseNumber: '', ticketTitle: 'Title' }, 'title:Title'],
        [{ ticketTitle: 'Title' }, 'title:Title'],
        [{ caseNumber: '', ticketTitle: '' }, null],
        [{}, null],
    ] as const)('parses %j as %s', (input, expected) => {
        expect(parsePageIdentity(input)).toBe(expected)
    })

    it('keeps case identity when the title changes', () => {
        expect(parsePageIdentity({ caseNumber: 'A', ticketTitle: 'Title' }))
            .toBe('case:A')
        expect(parsePageIdentity({ caseNumber: 'A', ticketTitle: 'Changed' }))
            .toBe('case:A')
    })

    it('preserves whitespace-only identity strings without trimming', () => {
        expect(parsePageIdentity({ caseNumber: '   ', ticketTitle: 'Title' }))
            .toBe('case:   ')
        expect(parsePageIdentity({ caseNumber: '', ticketTitle: '   ' }))
            .toBe('title:   ')
    })

    it.each([
        ['number', 1],
        ['object', {}],
        ['array', []],
        ['symbol', Symbol('identity')],
        ['function', () => 'A'],
    ])('rejects a present %s identity field without coercion', (_label, value) => {
        const toString = vi.fn(() => 'coerced')
        if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
            Object.defineProperty(value, 'toString', { value: toString })
        }

        expect(parsePageIdentity({ caseNumber: value, ticketTitle: 'Title' }))
            .toBeNull()
        expect(parsePageIdentity({ caseNumber: '', ticketTitle: value }))
            .toBeNull()
        expect(toString).not.toHaveBeenCalled()
    })

    it.each(['caseNumber', 'ticketTitle'] as const)(
        'rejects a top-level %s getter without invoking or logging it',
        (key) => {
            const getter = vi.fn(() => 'SECRET-GETTER-VALUE')
            const raw = Object.defineProperty({}, key, { enumerable: true, get: getter })
            const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
            const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

            try {
                expect(parsePageIdentity(raw)).toBeNull()
                expect(getter).not.toHaveBeenCalled()
                const logged = [
                    ...consoleLog.mock.calls,
                    ...consoleWarn.mock.calls,
                    ...consoleError.mock.calls,
                ]
                expect(logged.flat()).not.toContain(raw)
                expect(JSON.stringify(logged)).not.toContain('SECRET-GETTER-VALUE')
            } finally {
                consoleLog.mockRestore()
                consoleWarn.mockRestore()
                consoleError.mockRestore()
            }
        },
    )

    it('contains a throwing descriptor proxy with one bounded classification', () => {
        const secret = 'SECRET-DESCRIPTOR-TRAP'
        const toString = vi.fn(() => secret)
        const descriptorTrap = vi.fn(() => {
            throw new Error(secret)
        })
        const raw = new Proxy(
            { caseNumber: 'A', toString },
            { getOwnPropertyDescriptor: descriptorTrap },
        )
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        try {
            expect(parsePageIdentity(raw)).toBeNull()
            expect(descriptorTrap).toHaveBeenCalledTimes(1)
            expect(toString).not.toHaveBeenCalled()
            const logged = [
                ...consoleLog.mock.calls,
                ...consoleWarn.mock.calls,
                ...consoleError.mock.calls,
            ]
            expect(logged.flat()).not.toContain(raw)
            expect(JSON.stringify(logged)).not.toContain(secret)
        } finally {
            consoleLog.mockRestore()
            consoleWarn.mockRestore()
            consoleError.mockRestore()
        }
    })

    it('contains revoked proxies at identity and scrape boundaries', () => {
        const identity = Proxy.revocable({ caseNumber: 'A' }, {})
        const identitySnapshot = Proxy.revocable({ caseNumber: 'A' }, {})
        const scrape = Proxy.revocable({ caseNumber: 'A' }, {})
        identity.revoke()
        identitySnapshot.revoke()
        scrape.revoke()

        expect(parsePageIdentity(identity.proxy)).toBeNull()
        expect(parsePageIdentitySnapshot(identitySnapshot.proxy)).toBeNull()
        expect(parseScrapedDataSnapshot(scrape.proxy)).toBeNull()
    })

    it('copies only supported own string data into a plain scrape snapshot', () => {
        const inherited = {
            ticketTitle: 'Inherited title',
            description: 'Inherited body',
        }
        const raw = Object.assign(Object.create(inherited), {
            caseNumber: 'A',
            errorText: 'Own body',
            source: 'Own source',
            ignored: 'not supported',
        })

        const snapshot = parseScrapedDataSnapshot(raw)

        expect(snapshot).toEqual({
            errorText: 'Own body',
            caseNumber: 'A',
            source: 'Own source',
        })
        expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype)
        expect(snapshot).not.toBe(raw)
        expect(snapshot).not.toHaveProperty('ticketTitle')
        expect(snapshot).not.toHaveProperty('description')
        expect(snapshot).not.toHaveProperty('ignored')
    })

    it.each([
        ['getter', 'getter'],
        ['number', 1],
        ['object', {}],
        ['array', []],
        ['symbol', Symbol('scrape')],
        ['function', () => 'body'],
    ])('rejects malformed scrape %s fields without coercion', (_label, value) => {
        const getter = vi.fn(() => 'SECRET-SCRAPE-GETTER')
        const raw = value === 'getter'
            ? Object.defineProperty({}, 'description', { get: getter })
            : { description: value }

        expect(parseScrapedDataSnapshot(raw)).toBeNull()
        expect(getter).not.toHaveBeenCalled()
    })

    it('returns the exact identity and durable case snapshot together', () => {
        expect(parsePageIdentitySnapshot({ caseNumber: 'A', ticketTitle: 'Title' }))
            .toEqual({ identity: 'case:A', caseNumber: 'A' })
        expect(parsePageIdentitySnapshot({ caseNumber: '', ticketTitle: 'Title' }))
            .toEqual({ identity: 'title:Title', caseNumber: '' })
        expect(parsePageIdentitySnapshot({})).toEqual({
            identity: null,
            caseNumber: '',
        })
    })

    it('retains metadata as own strings without making it part of page identity', () => {
        const raw = { caseNumber: 'A', createdOn: '08/09/2026 9:07 PM', customerName: 'Synthetic Account' }
        expect(parseScrapedDataSnapshot(raw)).toEqual(raw)
        expect(parsePageIdentity(raw)).toBe('case:A')
        expect(parsePageIdentity({ ...raw, createdOn: '', customerName: 'Changed' })).toBe('case:A')
        expect(parsePageIdentity({ createdOn: raw.createdOn, customerName: raw.customerName })).toBeNull()
        expect(parseScrapedDataSnapshot(Object.create(raw))).toEqual({})
        expect(parseScrapedDataSnapshot({ createdOn: undefined, customerName: undefined })).toEqual({})
    })

    it.each(['createdOn', 'customerName'])('rejects malformed %s without getter or coercion side effects', key => {
        const getter = vi.fn(() => 'SECRET')
        const toString = vi.fn(() => 'SECRET')
        expect(parseScrapedDataSnapshot(Object.defineProperty({ caseNumber: 'A' }, key, { get: getter }))).toBeNull()
        for (const value of [null, 7, [], { toString }, Symbol('value'), toString]) {
            expect(parseScrapedDataSnapshot({ caseNumber: 'A', [key]: value })).toBeNull()
        }
        expect(getter).not.toHaveBeenCalled()
        expect(toString).not.toHaveBeenCalled()
    })
})
