import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    chromeMockSpies,
    installChromeMock,
    resetChromeMock,
} from '../test/chromeMock'
import {
    LATEST_ANALYSIS_OWNER_KEY,
    pendingAnalysisKey,
} from '../utils/analysisStore'
import {
    guardNonAnalyzeNativeMessage,
    handleAnalyzeRequest,
} from './analyzeRequestHandler'

installChromeMock()

const HOST_PAYLOAD = {
    text: 'full context',
    context: 'Case form',
    timestamp: '7/21/2026, 10:00:00 AM',
    rootPath: '',
    product: 'Dynamics 365',
    caseNumber: '1234567890123456',
} as const

const HOST_SUCCESS = {
    status: 'success',
    data: {
        status: 'success',
        data: { markdown: '# Report', saved_to: 'report.md' },
    },
} as const

const DENIED = {
    status: 'error',
    error_code: 'host_protocol_incompatible',
    error: 'Dynamics Helper Host is incompatible. Retry the update or run the manual installer.',
} as const

const INVALID_ANALYZE = {
    status: 'error',
    error_code: 'invalid_analyze_persistence_context',
    error: 'Analyze persistence context is invalid.',
} as const

const INVALID_NATIVE = {
    status: 'error',
    error: 'Invalid Extension Native message metadata.',
    error_code: 'invalid_native_message_metadata',
} as const

function validAnalyzePayload(): Record<string, unknown> {
    return {
        action: 'analyze_error',
        requestId: 'request-1',
        payload: { ...HOST_PAYLOAD },
        _persist: {
            caseNumber: '1234567890123456',
            successTitle: 'Analyze result',
            errorTitle: 'Analyze failed',
        },
    }
}

describe('handleAnalyzeRequest', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    it('returns invalid Analyze metadata before transport acquisition, storage, or send', async () => {
        const inner = validAnalyzePayload()
        inner._persist = null
        const transportSend = vi.fn()
        const acquireAuthorizedTransport = vi.fn(async () => ({
            allowed: true as const,
            transport: { send: transportSend },
        }))

        await expect(handleAnalyzeRequest(inner, {
            acquireAuthorizedTransport,
        })).resolves.toEqual(INVALID_ANALYZE)

        expect(acquireAuthorizedTransport).not.toHaveBeenCalled()
        expect(transportSend).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })

    it('returns a denied transport acquisition before persistence or send', async () => {
        const order: string[] = []
        const transportSend = vi.fn()
        const acquireAuthorizedTransport = vi.fn(async () => {
            order.push('acquire')
            return { allowed: false as const, response: DENIED }
        })

        const result = await handleAnalyzeRequest(validAnalyzePayload(), {
            acquireAuthorizedTransport,
        })

        expect(result).toEqual(DENIED)
        expect(order).toEqual(['acquire'])
        expect(acquireAuthorizedTransport).toHaveBeenCalledTimes(1)
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        expect(transportSend).not.toHaveBeenCalled()
    })

    it('records Analyze start before sending on the acquired transport', async () => {
        const order: string[] = []
        const originalSet = chromeMockSpies.storageSet.getMockImplementation()!
        chromeMockSpies.storageSet.mockImplementation((items, callback) => {
            if (
                Object.hasOwn(items, pendingAnalysisKey('request-1'))
                && Object.hasOwn(items, LATEST_ANALYSIS_OWNER_KEY)
            ) order.push('start')
            return originalSet(items, callback)
        })
        const transport = {
            send: vi.fn(async (_forwarded: unknown) => {
                order.push('leased-send')
                return HOST_SUCCESS
            }),
        }
        const acquireAuthorizedTransport = vi.fn(async () => {
            order.push('acquire')
            return { allowed: true as const, transport }
        })

        await handleAnalyzeRequest(validAnalyzePayload(), {
            acquireAuthorizedTransport,
        })

        expect(order.slice(0, 3)).toEqual(['acquire', 'start', 'leased-send'])
        expect(transport.send).toHaveBeenCalledTimes(1)
        expect(transport.send).toHaveBeenCalledWith({
            action: 'analyze_error',
            requestId: 'request-1',
            payload: HOST_PAYLOAD,
        })
        expect(Reflect.ownKeys(transport.send.mock.calls[0][0] as object)).toEqual([
            'action', 'requestId', 'payload',
        ])
    })

    it('binds acquisition and send to one transport lease', async () => {
        let acquiredAction: unknown
        const transportB = { send: vi.fn(async (_forwarded: unknown) => HOST_SUCCESS) }
        const transportA = { send: vi.fn(async (_forwarded: unknown) => HOST_SUCCESS) }
        const acquireAuthorizedTransport = vi.fn(async (forwarded) => {
            acquiredAction = forwarded
            expect(Object.isFrozen(forwarded)).toBe(true)
            return { allowed: true as const, transport: transportA }
        })

        await handleAnalyzeRequest(validAnalyzePayload(), {
            acquireAuthorizedTransport,
        })

        expect(acquireAuthorizedTransport).toHaveBeenCalledTimes(1)
        expect(transportA.send).toHaveBeenCalledTimes(1)
        expect(transportB.send).not.toHaveBeenCalled()
        expect(transportA.send.mock.calls[0][0]).toBe(acquiredAction)
    })

    it('rechecks authorization after persistence immediately before send', async () => {
        const transport = { send: vi.fn(async () => HOST_SUCCESS) }
        const authorizeSend = vi.fn(async (_forwarded: unknown) => ({
            allowed: false as const,
            response: DENIED,
        }))
        const acquireAuthorizedTransport = vi.fn(async () => ({
            allowed: true as const,
            transport,
            authorizeSend,
        }))

        await expect(handleAnalyzeRequest(validAnalyzePayload(), {
            acquireAuthorizedTransport,
        })).resolves.toEqual(DENIED)

        expect(authorizeSend).toHaveBeenCalledTimes(1)
        expect(authorizeSend).toHaveBeenCalledWith({
            action: 'analyze_error',
            requestId: 'request-1',
            payload: HOST_PAYLOAD,
        })
        expect(transport.send).not.toHaveBeenCalled()
    })

    it('uses the response started inside final authorization without a second send', async () => {
        const transport = { send: vi.fn(async () => HOST_SUCCESS) }
        const authorizeSend = vi.fn(async () => ({
            allowed: true as const,
            response: Promise.resolve(HOST_SUCCESS),
        }))

        await expect(handleAnalyzeRequest(validAnalyzePayload(), {
            acquireAuthorizedTransport: vi.fn(async () => ({
                allowed: true as const,
                transport,
                authorizeSend,
            })),
        })).resolves.toEqual({ status: 'success', data: HOST_SUCCESS.data.data })

        expect(transport.send).not.toHaveBeenCalled()
    })

    it('fails a disconnected lease without reacquiring or reconnecting', async () => {
        const transportB = {
            send: vi.fn(async () => HOST_SUCCESS),
        }
        const transportA = {
            send: vi.fn(async () => {
                throw new Error('Native Host disconnected unexpectedly')
            }),
        }
        const acquireAuthorizedTransport = vi.fn()
            .mockResolvedValueOnce({ allowed: true, transport: transportA })
            .mockResolvedValueOnce({ allowed: true, transport: transportB })

        await expect(handleAnalyzeRequest(validAnalyzePayload(), {
            acquireAuthorizedTransport,
        })).resolves.toMatchObject({
            status: 'error',
            error: 'Native Host disconnected unexpectedly',
        })
        expect(acquireAuthorizedTransport).toHaveBeenCalledTimes(1)
        expect(transportA.send).toHaveBeenCalledTimes(1)
        expect(transportB.send).not.toHaveBeenCalled()
    })

    it('never double wraps or copies attacker outer fields', async () => {
        const symbol = Symbol('attacker')
        const inner = validAnalyzePayload()
        Object.defineProperties(inner, {
            type: { value: 'NATIVE_MSG', enumerable: true },
            extension_warnings: {
                value: ['analysis_result_not_persisted'],
                enumerable: true,
            },
            arbitrary: { value: 'drop', enumerable: true },
            nestedWrapper: {
                value: { type: 'NATIVE_MSG', payload: { secret: true } },
                enumerable: true,
            },
            [symbol]: { value: 'drop', enumerable: true },
        })
        Object.defineProperty(inner, '__proto__', {
            value: { polluted: true },
            enumerable: true,
        })
        let acquiredAction: unknown
        const transport = { send: vi.fn(async (_forwarded: unknown) => HOST_SUCCESS) }
        const acquireAuthorizedTransport = vi.fn(async (forwarded) => {
            acquiredAction = forwarded
            return { allowed: true as const, transport }
        })

        await handleAnalyzeRequest(inner, { acquireAuthorizedTransport })

        expect(acquireAuthorizedTransport).toHaveBeenCalledTimes(1)
        expect(transport.send).toHaveBeenCalledTimes(1)
        expect(transport.send.mock.calls[0][0]).toBe(acquiredAction)
        expect(Reflect.ownKeys(acquiredAction as object)).toEqual([
            'action', 'requestId', 'payload',
        ])
        expect(transport.send.mock.calls[0][0]).toEqual({
            action: 'analyze_error',
            requestId: 'request-1',
            payload: HOST_PAYLOAD,
        })
        expect(Reflect.ownKeys(inner)).toContain(symbol)
        expect(inner).toHaveProperty('type', 'NATIVE_MSG')
        expect(Object.getOwnPropertyDescriptor(inner, '__proto__')?.value).toEqual({
            polluted: true,
        })
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    })

    it('rejects nested wrappers and unknown Analyze payload keys', async () => {
        const cases: Array<() => unknown> = [
            () => ({ type: 'NATIVE_MSG', payload: validAnalyzePayload() }),
            () => {
                const inner = validAnalyzePayload()
                inner.payload = { type: 'NATIVE_MSG', payload: { ...HOST_PAYLOAD } }
                return inner
            },
            () => {
                const inner = validAnalyzePayload()
                ;(inner.payload as Record<string, unknown>).type = 'NATIVE_MSG'
                return inner
            },
            () => {
                const inner = validAnalyzePayload()
                ;(inner.payload as Record<string, unknown>).extension_warnings = []
                return inner
            },
            () => {
                const inner = validAnalyzePayload()
                Object.defineProperty(inner.payload, '__proto__', {
                    value: { polluted: true },
                    enumerable: true,
                })
                return inner
            },
            () => {
                const inner = validAnalyzePayload()
                Object.defineProperty(inner.payload, Symbol('attacker'), {
                    value: 'secret',
                    enumerable: true,
                })
                return inner
            },
            () => {
                const inner = validAnalyzePayload()
                ;(inner.payload as Record<string, unknown>).arbitrary = 'secret'
                return inner
            },
        ]

        for (const makeInner of cases) {
            resetChromeMock()
            const transport = { send: vi.fn() }
            const acquireAuthorizedTransport = vi.fn(async () => ({
                allowed: true as const,
                transport,
            }))
            await expect(handleAnalyzeRequest(makeInner(), {
                acquireAuthorizedTransport,
            })).resolves.toEqual(INVALID_ANALYZE)
            expect(acquireAuthorizedTransport).not.toHaveBeenCalled()
            expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
            expect(transport.send).not.toHaveBeenCalled()
            expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
        }
    })
})

describe('guardNonAnalyzeNativeMessage', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    it('rejects reserved metadata on non-Analyze Native messages', () => {
        const getter = vi.fn(() => 'secret')
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        const denied: unknown[] = [
            null,
            [],
            'ping',
            {},
            { action: new String('ping') },
            { action: 'ping', requestId: '' },
            { action: 'ping', requestId: 1 },
            { action: 'ping', requestId: new String('ping-1') },
            { action: 'analyze_error', requestId: 'request-1' },
        ]
        for (const key of ['_persist', 'extension_warnings'] as const) {
            for (const enumerable of [true, false]) {
                const value = { action: 'ping', requestId: 'ping-1' }
                Object.defineProperty(value, key, {
                    value: undefined,
                    enumerable,
                })
                denied.push(value)
            }
            const accessor = { action: 'ping', requestId: 'ping-1' }
            Object.defineProperty(accessor, key, {
                get: getter,
                enumerable: true,
            })
            denied.push(accessor)
        }
        const ownToJSON = { action: 'ping', requestId: 'ping-1' }
        Object.defineProperty(ownToJSON, 'toJSON', {
            value: undefined,
            enumerable: false,
        })
        denied.push(ownToJSON)
        const symbol = { action: 'ping', requestId: 'ping-1' }
        Object.defineProperty(symbol, Symbol('attacker'), {
            value: 'secret',
            enumerable: true,
        })
        denied.push(symbol)
        const actionAccessor = { requestId: 'ping-1' }
        Object.defineProperty(actionAccessor, 'action', {
            get: getter,
            enumerable: true,
        })
        denied.push(actionAccessor)
        const requestAccessor = { action: 'ping' }
        Object.defineProperty(requestAccessor, 'requestId', {
            get: getter,
            enumerable: true,
        })
        denied.push(requestAccessor)
        const revoked = Proxy.revocable({ action: 'ping' }, {})
        revoked.revoke()
        denied.push(revoked.proxy)
        denied.push(new Proxy({ action: 'ping' }, {
            ownKeys() { throw new Error('SECRET-OWN-KEYS') },
        }))
        denied.push(new Proxy({ action: 'ping' }, {
            getOwnPropertyDescriptor() {
                throw new Error('SECRET-DESCRIPTOR')
            },
        }))

        for (const value of denied) {
            expect(guardNonAnalyzeNativeMessage(value)).toEqual({
                ok: false,
                response: INVALID_NATIVE,
            })
        }

        const inheritedToJSON = vi.fn(() => ({ secret: true }))
        Object.defineProperty(Object.prototype, 'toJSON', {
            value: inheritedToJSON,
            configurable: true,
        })
        try {
            const guarded = guardNonAnalyzeNativeMessage({
                action: 'ping',
                requestId: 'ping-1',
            })
            expect(guarded.ok).toBe(true)
            if (!guarded.ok) throw new Error('Expected ordinary ping snapshot')
            expect(JSON.stringify(guarded.forwarded)).toBe(
                '{"action":"ping","requestId":"ping-1"}',
            )
            expect(inheritedToJSON).not.toHaveBeenCalled()
        } finally {
            delete (Object.prototype as { toJSON?: unknown }).toJSON
        }
        expect(getter).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        expect(JSON.stringify([
            ...consoleLog.mock.calls,
            ...consoleWarn.mock.calls,
            ...consoleError.mock.calls,
        ])).not.toContain('SECRET')
    })

    it('captures a frozen non-Analyze snapshot before source mutation', () => {
        const nested = { keepIdentity: true }
        const ping: Record<string, unknown> = {
            action: 'ping',
            requestId: 'ping-1',
            payload: nested,
        }
        const guardedPing = guardNonAnalyzeNativeMessage(ping)
        expect(guardedPing.ok).toBe(true)
        if (!guardedPing.ok) throw new Error('Expected ordinary ping snapshot')

        ping.action = 'analyze_error'
        ping.requestId = 'changed'
        ping._persist = { secret: true }

        expect(guardedPing.forwarded).toEqual({
            action: 'ping',
            requestId: 'ping-1',
            payload: nested,
        })
        expect(guardedPing.forwarded).not.toBe(ping)
        expect(guardedPing.forwarded.payload).toBe(nested)
        expect(Object.getPrototypeOf(guardedPing.forwarded)).toBe(Object.prototype)
        expect(Object.isFrozen(guardedPing.forwarded)).toBe(true)
        expect(guardedPing.forwarded).not.toHaveProperty('_persist')
        expect(Object.getOwnPropertyDescriptor(
            guardedPing.forwarded,
            'toJSON',
        )).toEqual(expect.objectContaining({
            value: undefined,
            enumerable: false,
        }))
    })

    it('denies an action that changes to Analyze during snapshot', () => {
        let actionReads = 0
        const source = new Proxy({ action: 'ping', requestId: 'ping-1' }, {
            ownKeys: () => ['action', 'requestId'],
            getOwnPropertyDescriptor(target, key) {
                if (key === 'action') {
                    actionReads += 1
                    return {
                        value: actionReads === 1 ? 'ping' : 'analyze_error',
                        enumerable: true,
                        configurable: true,
                    }
                }
                return Reflect.getOwnPropertyDescriptor(target, key)
            },
        })

        expect(Object.getOwnPropertyDescriptor(source, 'action')?.value).toBe('ping')
        expect(guardNonAnalyzeNativeMessage(source)).toEqual({
            ok: false,
            response: INVALID_NATIVE,
        })
        expect(actionReads).toBe(2)
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })

    it('drops inherited fields from the non-Analyze snapshot', () => {
        const source = Object.create({ inherited: 'drop' }) as Record<string, unknown>
        Object.defineProperties(source, {
            action: { value: 'ping', enumerable: true },
            payload: { value: { nested: true }, enumerable: true },
            ignored: { value: 'non-enumerable', enumerable: false },
        })

        const guarded = guardNonAnalyzeNativeMessage(source)

        expect(guarded.ok).toBe(true)
        if (!guarded.ok) throw new Error('Expected ordinary ping snapshot')
        expect(guarded.forwarded).toEqual({
            action: 'ping',
            payload: source.payload,
        })
        expect(guarded.forwarded).not.toHaveProperty('inherited')
        expect(guarded.forwarded).not.toHaveProperty('ignored')
        expect(Object.getPrototypeOf(guarded.forwarded)).toBe(Object.prototype)
    })

    it('captures one stateful Proxy descriptor snapshot', () => {
        const nested = { first: true }
        const descriptorCalls = new Map<PropertyKey, number>()
        const source = new Proxy({ action: 'ping', payload: nested }, {
            ownKeys: vi.fn(() => ['action', 'payload']),
            getOwnPropertyDescriptor(_target, key) {
                const count = (descriptorCalls.get(key) ?? 0) + 1
                descriptorCalls.set(key, count)
                return {
                    value: key === 'action'
                        ? (count === 1 ? 'ping' : 'analyze_error')
                        : (count === 1 ? nested : { second: true }),
                    enumerable: true,
                    configurable: true,
                }
            },
        })

        const guarded = guardNonAnalyzeNativeMessage(source)

        expect(guarded.ok).toBe(true)
        if (!guarded.ok) throw new Error('Expected one snapshot')
        expect(guarded.forwarded.action).toBe('ping')
        expect(guarded.forwarded.payload).toBe(nested)
        expect(descriptorCalls).toEqual(new Map<PropertyKey, number>([
            ['action', 1],
            ['payload', 1],
        ]))
    })
})
