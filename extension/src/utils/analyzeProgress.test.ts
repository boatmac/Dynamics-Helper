import { describe, expect, it, vi } from 'vitest'
import { captureAnalyzeProgressTarget, parseAnalyzeProgress } from './analyzeProgress'

const event = { version: 1, seq: 1, stage: 'prepare', state: 'running', elapsedMs: 0 }
const sender = () => ({
    id: 'extension', tab: { id: 42 }, frameId: 0, documentId: 'document-1',
    origin: 'https://onesupport.crm.dynamics.com',
    url: 'https://onesupport.crm.dynamics.com/main.aspx',
})

describe('parseAnalyzeProgress', () => {
    it('clones and freezes the closed v1 schema for every stage and state', () => {
        for (const stage of ['prepare', 'session_resuming', 'session_creating', 'session_reused',
            'session_ready', 'session_reconnecting', 'auth', 'agent', 'tool', 'response', 'report']) {
            for (const state of ['running', 'succeeded', 'failed', 'unavailable', 'needs_auth']) {
                const input = { ...event, stage, state, ...(stage === 'tool' ? { service: 'other', toolId: 'tool-1' } : {}) }
                const parsed = parseAnalyzeProgress(input)
                expect(parsed).toEqual(input)
                expect(parsed).not.toBe(input)
                expect(Object.isFrozen(parsed)).toBe(true)
                input.seq = 2
                expect(parsed).toMatchObject({ seq: 1 })
            }
        }
        expect(parseAnalyzeProgress(Object.assign(Object.create(null), event))).toEqual(event)
        expect(parseAnalyzeProgress({ ...event, seq: Number.MAX_SAFE_INTEGER, elapsedMs: Number.MAX_SAFE_INTEGER })).not.toBeNull()
    })

    it('rejects invalid primitives, enums and unsafe integer bounds', () => {
        for (const input of [null, undefined, [], true, 1, () => event]) expect(parseAnalyzeProgress(input)).toBeNull()
        for (const [key, values] of Object.entries({
            version: [0, 2, '1', true], seq: [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'],
            elapsedMs: [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0'],
            stage: ['unknown', {}, null], state: ['unknown', {}, null],
        })) {
            for (const value of values) expect(parseAnalyzeProgress({ ...event, [key]: value })).toBeNull()
            const missing: Record<string, unknown> = { ...event }
            delete missing[key]
            expect(parseAnalyzeProgress(missing)).toBeNull()
        }
    })

    it('rejects extra, accessor, symbol, hidden and inherited fields without executing getters', () => {
        const getter = vi.fn(() => 'secret')
        const accessor = { ...event }
        Object.defineProperty(accessor, 'stage', { enumerable: true, get: getter })
        const hidden = { ...event }
        Object.defineProperty(hidden, 'seq', { value: 1, enumerable: false })
        for (const input of [accessor, hidden, { ...event, extra: 'secret' }, { ...event, [Symbol('secret')]: 1 },
            Object.assign(Object.create({ secret: 'value' }), event), Object.create(event)]) {
            expect(parseAnalyzeProgress(input)).toBeNull()
        }
        expect(getter).not.toHaveBeenCalled()
    })

    it('contains hostile proxies without stringification', () => {
        const convert = vi.fn(() => { throw new Error('secret') })
        const revoked = Proxy.revocable({}, {})
        revoked.revoke()
        for (const input of [revoked.proxy, new Proxy(event, { ownKeys: convert }),
            new Proxy(event, { getOwnPropertyDescriptor: convert }), { ...event, toJSON: convert, toString: convert }]) {
            expect(parseAnalyzeProgress(input)).toBeNull()
        }
        // Only the two reflective traps run; toJSON/toString never do.
        expect(convert).toHaveBeenCalledTimes(2)
    })

    it('requires tool aliases and services and confines session IDs to successful readiness', () => {
        for (const service of ['workiq', 'webiq', 'ado', 'mslearn', 'kusto', 'enghub', 'icm', 'research', 'filesystem', 'other']) {
            expect(parseAnalyzeProgress({ ...event, stage: 'tool', service, toolId: 'tool-1' })).not.toBeNull()
            expect(parseAnalyzeProgress({ ...event, stage: 'auth', state: 'needs_auth', service })).not.toBeNull()
        }
        for (const extra of [
            { stage: 'tool' }, { stage: 'tool', service: 'other' }, { stage: 'tool', toolId: 'tool-1' },
            { stage: 'tool', service: 'other', toolId: 'tool-0' },
            { stage: 'tool', service: 'other', toolId: 'tool-01' },
            { stage: 'tool', service: 'other', toolId: 'tool-1\n' },
            { stage: 'tool', service: 'other', toolId: `tool-${'1'.repeat(124)}` },
            { toolId: 'tool-1' }, { toolId: undefined }, { service: undefined }, { service: 'private-server' },
            { sessionId: '11111111-2222-3333-4444-555555555555' },
            { stage: 'session_ready', state: 'running', sessionId: '11111111-2222-3333-4444-555555555555' },
        ]) expect(parseAnalyzeProgress({ ...event, ...extra })).toBeNull()
        const ready = { ...event, stage: 'session_ready', state: 'succeeded' }
        expect(parseAnalyzeProgress(ready)).toEqual(ready)
        const uuid = 'abcdef01-2345-6789-abcd-0123456789ab'
        expect(parseAnalyzeProgress({ ...ready, sessionId: uuid })).toEqual({ ...ready, sessionId: uuid })
        for (const sessionId of [undefined, '', uuid.toUpperCase(), `{${uuid}}`, `${uuid}\n`, 'not-a-uuid']) {
            expect(parseAnalyzeProgress({ ...ready, sessionId })).toBeNull()
        }
        expect(parseAnalyzeProgress({ ...event, stage: 'tool', service: 'other', toolId: `tool-${'1'.repeat(123)}` })).not.toBeNull()
    })

    it('AP-ATT-01 preserves only the exact fixed DTM sign-in notice', () => {
        const notice = 'Waiting for DTM sign-in (30 seconds)...'
        expect(parseAnalyzeProgress(notice)).toBe(notice)
        for (const text of [notice + '\n', notice + ' private',
            'Waiting for DTM sign-in (60 seconds)...',
            'Waiting for DTM sign-in (030 seconds)...',
            'Waiting for DTM sign-in (https://private.invalid/?sig=SECRET seconds)...']) {
            expect(parseAnalyzeProgress(text)).toBe('Analysis in progress')
        }
        expect(parseAnalyzeProgress({ ...event, action: 'analyze_with_attachments' })).toBeNull()
    })

    it('preserves only fixed legacy messages and canonical numeric timeout text', () => {
        for (const text of ['Checking authentication...', 'Auth check timed out, continuing...',
            'Auth check skipped, continuing...', 'Preparing prompt...', 'Waiting for Copilot agent...',
            'Session expired. Reconnecting...', 'Processing response...', 'Pinging...', 'Checking health...',
            'Updating configuration...', 'Analysis in progress', 'Copilot is analyzing (max 20 min)...']) {
            expect(parseAnalyzeProgress(text)).toBe(text)
        }
        expect(parseAnalyzeProgress('')).toBeNull()
        for (const text of ['https://secret.invalid/?sig=private', 'x'.repeat(513),
            'Copilot is analyzing (max https://private min)...', 'Copilot is analyzing (max 01 min)...',
            'Copilot is analyzing (max 9007199254740992 min)...', 'Copilot is analyzing (max 20 min)...\n', 'Preparing prompt... private']) {
            expect(parseAnalyzeProgress(text)).toBe('Analysis in progress')
        }
    })
})

describe('captureAnalyzeProgressTarget', () => {
    it('captures an immutable same-extension top-frame document without retaining sender data', () => {
        const input = sender()
        const target = captureAnalyzeProgressTarget(input, 'extension')
        input.tab.id = 99
        input.documentId = 'new-document'
        expect(target).toEqual({ tabId: 42, frameId: 0, documentId: 'document-1' })
        expect(Object.isFrozen(target)).toBe(true)
    })

    it('rejects invalid routing metadata and getters without invoking them', () => {
        for (const extra of [{ id: 'other' }, { tab: { id: -1 } }, { tab: { id: 1.5 } },
            { tab: { id: Number.MAX_SAFE_INTEGER + 1 } }, { frameId: 1 }, { frameId: undefined },
            { documentId: '' }, { documentId: undefined }, { origin: 'https://evil.invalid' },
            { url: 'https://onesupport.crm.dynamics.com.evil.invalid' }, { url: 'invalid' }]) {
            expect(captureAnalyzeProgressTarget({ ...sender(), ...extra }, 'extension')).toBeUndefined()
        }
        expect(captureAnalyzeProgressTarget(sender(), '')).toBeUndefined()
        const getter = vi.fn(() => 'extension')
        for (const key of ['id', 'tab', 'frameId', 'documentId', 'origin', 'url']) {
            const input = sender()
            Object.defineProperty(input, key, { get: getter })
            expect(captureAnalyzeProgressTarget(input, 'extension')).toBeUndefined()
        }
        const tab = Object.create({ id: 42 })
        expect(captureAnalyzeProgressTarget({ ...sender(), tab }, 'extension')).toBeUndefined()
        expect(getter).not.toHaveBeenCalled()
    })
})
