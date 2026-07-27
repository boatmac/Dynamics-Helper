import { describe, expect, it, vi } from 'vitest'
import { postNativeMessageWire, type NativeMessageWireDeps } from './nativeMessageWire'

function frozenSnapshot(
    values: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
    const output: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(values)) {
        Object.defineProperty(output, key, {
            value,
            enumerable: true,
            writable: true,
            configurable: true,
        })
    }
    Object.defineProperty(output, 'toJSON', {
        value: undefined,
        enumerable: false,
        writable: false,
        configurable: false,
    })
    return Object.freeze(output)
}

function wireDeps(overrides: Partial<NativeMessageWireDeps> = {}): {
    deps: NativeMessageWireDeps
    createRequestId: ReturnType<typeof vi.fn>
    register: ReturnType<typeof vi.fn>
    unregister: ReturnType<typeof vi.fn>
    postMessage: ReturnType<typeof vi.fn>
} {
    const createRequestId = vi.fn(() => 'generated-1')
    const register = vi.fn()
    const unregister = vi.fn()
    const postMessage = vi.fn()
    return {
        createRequestId,
        register,
        unregister,
        postMessage,
        deps: {
            createRequestId,
            register,
            unregister,
            postMessage,
            ...overrides,
        },
    }
}

describe('postNativeMessageWire', () => {
    it('adds one safe request ID without discarding the guarded snapshot', () => {
        const nested = { preserveIdentity: true }
        const forwarded = frozenSnapshot({ action: 'get_config', payload: nested })
        const { deps, createRequestId, register, postMessage } = wireDeps()

        const requestId = postNativeMessageWire(forwarded, deps)

        expect(requestId).toBe('generated-1')
        expect(createRequestId).toHaveBeenCalledTimes(1)
        expect(register).toHaveBeenCalledWith('generated-1')
        expect(postMessage).toHaveBeenCalledTimes(1)
        const posted = postMessage.mock.calls[0][0]
        expect(posted).toEqual({
            action: 'get_config',
            payload: nested,
            requestId: 'generated-1',
        })
        expect(posted).not.toBe(forwarded)
        expect(posted.payload).toBe(nested)
        expect(Object.getPrototypeOf(posted)).toBe(Object.prototype)
        expect(Object.isFrozen(posted)).toBe(true)
        expect(Object.keys(posted)).toEqual(['action', 'payload', 'requestId'])
    })

    it('preserves the parser-owned Analyze request ID and payload', () => {
        const payload = frozenSnapshot({
            text: 'full context',
            context: 'Case form',
            timestamp: '7/21/2026, 10:00:00 AM',
            rootPath: '',
            product: 'Dynamics 365',
            caseNumber: '1234567890123456',
        })
        const forwarded = Object.freeze({
            action: 'analyze_error',
            requestId: 'request-1',
            payload,
        })
        const { deps, createRequestId, register, postMessage } = wireDeps()

        expect(postNativeMessageWire(forwarded, deps)).toBe('request-1')

        expect(createRequestId).not.toHaveBeenCalled()
        expect(register).toHaveBeenCalledWith('request-1')
        const posted = postMessage.mock.calls[0][0]
        expect(posted.requestId).toBe('request-1')
        expect(posted.payload).toBe(payload)
        expect(Object.getOwnPropertyDescriptor(payload, 'toJSON')).toEqual(
            expect.objectContaining({ value: undefined, enumerable: false }),
        )
    })

    it('registers before posting the final Native wire object', () => {
        const order: Array<[string, unknown]> = []
        const { deps } = wireDeps({
            register: requestId => order.push(['register', requestId]),
            postMessage: message => order.push(['post', message.requestId]),
        })

        postNativeMessageWire(frozenSnapshot({ action: 'ping' }), deps)

        expect(order).toEqual([
            ['register', 'generated-1'],
            ['post', 'generated-1'],
        ])
    })

    it('shadows inherited toJSON on the final wire object', () => {
        const inherited = vi.fn(() => ({ replaced: true }))
        Object.defineProperty(Object.prototype, 'toJSON', {
            value: inherited,
            configurable: true,
        })
        try {
            const { deps, postMessage } = wireDeps()
            postNativeMessageWire(frozenSnapshot({ action: 'ping' }), deps)
            const posted = postMessage.mock.calls[0][0]

            expect(JSON.stringify(posted)).toBe(
                '{"action":"ping","requestId":"generated-1"}',
            )
            expect(inherited).not.toHaveBeenCalled()
            expect(Object.getOwnPropertyDescriptor(posted, 'toJSON')).toEqual(
                expect.objectContaining({ value: undefined, enumerable: false }),
            )
        } finally {
            delete (Object.prototype as { toJSON?: unknown }).toJSON
        }
    })

    it('shadows inherited toJSON on the serialized Analyze payload', () => {
        const inherited = vi.fn(() => ({ replaced: true }))
        Object.defineProperty(Object.prototype, 'toJSON', {
            value: inherited,
            configurable: true,
        })
        try {
            const payload = frozenSnapshot({
                text: 'full context',
                context: 'Case form',
                timestamp: '7/21/2026, 10:00:00 AM',
                rootPath: '',
            })
            const forwarded = Object.freeze({
                action: 'analyze_error',
                requestId: 'request-1',
                payload,
            })
            const { deps, postMessage } = wireDeps()

            postNativeMessageWire(forwarded, deps)

            const posted = postMessage.mock.calls[0][0]
            expect(posted.payload).toBe(payload)
            expect(JSON.parse(JSON.stringify(posted))).toEqual({
                action: 'analyze_error',
                requestId: 'request-1',
                payload: {
                    text: 'full context',
                    context: 'Case form',
                    timestamp: '7/21/2026, 10:00:00 AM',
                    rootPath: '',
                },
            })
            expect(inherited).not.toHaveBeenCalled()
        } finally {
            delete (Object.prototype as { toJSON?: unknown }).toJSON
        }
    })

    it('rejects an invalid generated Native request ID before registration', () => {
        for (const generated of ['', 42, null, undefined, {}]) {
            const { deps, register, unregister, postMessage } = wireDeps({
                createRequestId: () => generated as string,
            })

            expect(() => postNativeMessageWire(
                frozenSnapshot({ action: 'get_config' }),
                deps,
            )).toThrow(new Error('Invalid Native message request ID'))
            expect(register).not.toHaveBeenCalled()
            expect(postMessage).not.toHaveBeenCalled()
            expect(unregister).not.toHaveBeenCalled()
        }
    })

    it('does not post when Native registration throws', () => {
        const sentinel = new Error('REGISTER-SENTINEL')
        const { deps, postMessage, unregister } = wireDeps({
            register: () => { throw sentinel },
        })

        expect(() => postNativeMessageWire(
            frozenSnapshot({ action: 'ping', requestId: 'ping-1' }),
            deps,
        )).toThrow(sentinel)
        expect(postMessage).not.toHaveBeenCalled()
        expect(unregister).not.toHaveBeenCalled()
    })

    it('unregisters once when posting throws', () => {
        const sentinel = new Error('POST-SENTINEL')
        const order: string[] = []
        const unregister = vi.fn(() => { order.push('unregister') })
        const { deps } = wireDeps({
            register: () => { order.push('register') },
            postMessage: () => {
                order.push('post')
                throw sentinel
            },
            unregister,
        })

        expect(() => postNativeMessageWire(
            frozenSnapshot({ action: 'ping', requestId: 'ping-1' }),
            deps,
        )).toThrow(sentinel)
        expect(order).toEqual(['register', 'post', 'unregister'])
        expect(unregister).toHaveBeenCalledTimes(1)
        expect(unregister).toHaveBeenCalledWith('ping-1')
    })

    it('preserves the posting failure when unregister also throws', () => {
        const postSentinel = new Error('POST-SENTINEL')
        const unregisterSentinel = new Error('UNREGISTER-SENTINEL')
        const toString = vi.fn(() => 'must-not-coerce')
        Object.defineProperty(postSentinel, 'toString', { value: toString })
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        const unregister = vi.fn(() => { throw unregisterSentinel })
        const postMessage = vi.fn(() => { throw postSentinel })
        const { deps } = wireDeps({ unregister, postMessage })

        try {
            expect(() => postNativeMessageWire(
                frozenSnapshot({ action: 'ping', requestId: 'ping-1' }),
                deps,
            )).toThrow(postSentinel)
            expect(postMessage).toHaveBeenCalledTimes(1)
            expect(unregister).toHaveBeenCalledTimes(1)
            expect(toString).not.toHaveBeenCalled()
            expect(consoleLog).not.toHaveBeenCalled()
            expect(consoleWarn).not.toHaveBeenCalled()
            expect(consoleError).not.toHaveBeenCalled()
        } finally {
            consoleLog.mockRestore()
            consoleWarn.mockRestore()
            consoleError.mockRestore()
        }
    })
})
