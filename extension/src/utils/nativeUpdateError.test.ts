import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    handleNativeUpdateError,
    normalizeNativeUpdateError,
    type NativeUpdateErrorDeliveryDeps,
    type NativeUpdateErrorEvent,
} from './nativeUpdateError'
import {
    chromeMockSpies,
    installChromeMock,
    resetChromeMock,
    setActiveTabs,
} from '../test/chromeMock'
import {
    forwardNativeUpdateErrorToWindow,
    UPDATE_ERROR_DOM_EVENT,
} from '../content/updateErrorBridge'

const fallbackEvent = {
    type: 'NATIVE_UPDATE_ERROR',
    payload: { error: 'Update check failed.' },
}

describe('normalizeNativeUpdateError', () => {
    const consoleSpies: Array<ReturnType<typeof vi.spyOn>> = []

    beforeEach(() => {
        const methods = console as unknown as Record<
            string,
            (...args: unknown[]) => void
        >
        for (const method of Object.keys(methods)) {
            if (typeof methods[method] === 'function') {
                consoleSpies.push(vi.spyOn(methods, method).mockImplementation(() => undefined))
            }
        }
    })

    afterEach(() => {
        vi.restoreAllMocks()
        consoleSpies.length = 0
    })

    it.each([
        [{ payload: { error: 'safe' } }, 'safe'],
        [{ payload: { message: 'safe message' } }, 'safe message'],
        [{ error: 'top-level safe' }, 'top-level safe'],
    ])('normalizes a safe Native update error', (raw, expected) => {
        expect(normalizeNativeUpdateError(raw)).toEqual({
            type: 'NATIVE_UPDATE_ERROR',
            payload: { error: expected },
        })
    })

    it('uses fixed update-error candidate precedence', () => {
        expect(normalizeNativeUpdateError({
            payload: {
                error: { secret: 'SECRET-PAYLOAD-ERROR' },
                message: 'payload safe',
            },
            error: 'top safe',
            message: 'top message',
        })).toEqual({
            type: 'NATIVE_UPDATE_ERROR',
            payload: { error: 'payload safe' },
        })

        expect(normalizeNativeUpdateError({
            payload: { error: 'payload error', message: 'payload message' },
            error: 'top error',
            message: 'top message',
        })).toEqual({
            type: 'NATIVE_UPDATE_ERROR',
            payload: { error: 'payload error' },
        })
    })

    it.each([
        undefined,
        '',
        {},
        [],
        () => undefined,
        Symbol('update-error'),
        1n,
        null,
    ])('uses the fixed fallback for missing or malformed values', raw => {
        expect(normalizeNativeUpdateError(raw)).toEqual(fallbackEvent)
    })

    it('rejects accessors and conversion hooks without invoking them', () => {
        const getter = vi.fn(() => 'SECRET-GETTER')
        const toString = vi.fn(() => 'SECRET-TO-STRING')
        const toJSON = vi.fn(() => 'SECRET-TO-JSON')
        const raw = { toString, toJSON }
        Object.defineProperty(raw, 'payload', { get: getter })
        Object.defineProperty(raw, 'error', { get: getter })
        Object.defineProperty(raw, 'message', { get: getter })

        expect(() => normalizeNativeUpdateError(raw)).not.toThrow()
        expect(normalizeNativeUpdateError(raw)).toEqual(fallbackEvent)
        expect(getter).not.toHaveBeenCalled()
        expect(toString).not.toHaveBeenCalled()
        expect(toJSON).not.toHaveBeenCalled()
    })

    it('contains throwing descriptor traps with bounded inspection', () => {
        const secret = 'SECRET-DESCRIPTOR-TRAP'
        const toString = vi.fn(() => secret)
        const descriptor = vi.fn(() => {
            throw new Error(secret)
        })
        const raw = new Proxy({ toString }, {
            getOwnPropertyDescriptor: descriptor,
        })

        expect(() => normalizeNativeUpdateError(raw)).not.toThrow()
        expect(normalizeNativeUpdateError(raw)).toEqual(fallbackEvent)
        expect(descriptor).toHaveBeenCalledTimes(6)
        expect(toString).not.toHaveBeenCalled()
        expect(consoleSpies.flatMap(spy => spy.mock.calls).flat()).not.toContain(secret)
    })

    it('contains revoked outer and nested payload proxies', () => {
        const outer = Proxy.revocable({ error: 'SECRET-OUTER' }, {})
        const nested = Proxy.revocable({ error: 'SECRET-NESTED' }, {})
        outer.revoke()
        nested.revoke()

        expect(() => normalizeNativeUpdateError(outer.proxy)).not.toThrow()
        expect(normalizeNativeUpdateError(outer.proxy)).toEqual(fallbackEvent)
        expect(() => normalizeNativeUpdateError({ payload: nested.proxy })).not.toThrow()
        expect(normalizeNativeUpdateError({ payload: nested.proxy })).toEqual(fallbackEvent)
    })

    it('normalizes update_error without forwarding raw data', () => {
        const secret = 'SECRET-RAW-NATIVE-UPDATE'
        const toString = vi.fn(() => secret)
        const toJSON = vi.fn(() => secret)
        const rawError = { secret, toString, toJSON }
        const raw = {
            action: 'update_error',
            payload: { error: rawError, message: 'safe update failure' },
        }

        const result = normalizeNativeUpdateError(raw)

        expect(result).toEqual({
            type: 'NATIVE_UPDATE_ERROR',
            payload: { error: 'safe update failure' },
        })
        expect(result).not.toBe(raw)
        expect(result.payload).not.toBe(raw.payload)
        expect(Object.values(result).flat(Infinity)).not.toContain(rawError)
        expect(toString).not.toHaveBeenCalled()
        expect(toJSON).not.toHaveBeenCalled()
        expect(consoleSpies.flatMap(spy => spy.mock.calls).flat()).not.toContain(secret)
    })
})

const baselineDeliveryDeps: NativeUpdateErrorDeliveryDeps = {
    sendRuntime: async event => {
        chromeMockSpies.runtimeSendMessage(event)
    },
    queryActiveTabs: async () => chrome.tabs.query({
        active: true,
        currentWindow: true,
    }),
    sendTab: async (tabId, event) => chrome.tabs.sendMessage(tabId, event),
}

describe('handleNativeUpdateError', () => {
    beforeEach(() => {
        resetChromeMock()
        installChromeMock()
    })

    it('delivers only the normalized error to runtime, tab, and FAB DOM', async () => {
        setActiveTabs([{ id: 17 }])
        const secret = {
            marker: 'SECRET-RAW-DELIVERY',
            toString: vi.fn(() => 'SECRET-RAW-DELIVERY'),
            toJSON: vi.fn(() => 'SECRET-RAW-DELIVERY'),
        }
        const rawPayload = { error: secret, message: 'safe update failure' }
        const observed: unknown[] = []
        window.addEventListener(UPDATE_ERROR_DOM_EVENT, event => {
            observed.push((event as CustomEvent).detail)
        }, { once: true })
        const consoleSpies = {
            log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
            info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
            error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
            debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
        }
        const raw = { action: 'update_error', payload: rawPayload }

        try {
            await handleNativeUpdateError(raw, baselineDeliveryDeps)
            expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledOnce()
            expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
                type: 'NATIVE_UPDATE_ERROR',
                payload: { error: 'safe update failure' },
            })
            expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledOnce()
            expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledWith(17, {
                type: 'NATIVE_UPDATE_ERROR',
                payload: { error: 'safe update failure' },
            })
            const runtimeEvent = chromeMockSpies.runtimeSendMessage.mock
                .calls[0][0] as NativeUpdateErrorEvent
            const tabEvent = chromeMockSpies.tabsSendMessage.mock
                .calls[0][1] as NativeUpdateErrorEvent
            expect(runtimeEvent).not.toBe(raw)
            expect(runtimeEvent.payload).not.toBe(rawPayload)
            expect(tabEvent).not.toBe(raw)
            expect(tabEvent.payload).not.toBe(rawPayload)
            expect(forwardNativeUpdateErrorToWindow(tabEvent)).toBe(true)
            expect(observed).toEqual([{ error: 'safe update failure' }])
            expect(secret.toString).not.toHaveBeenCalled()
            expect(secret.toJSON).not.toHaveBeenCalled()
            expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
            expect(consoleSpies.warn).toHaveBeenCalledOnce()
            expect(consoleSpies.warn).toHaveBeenCalledWith(
                '[DH-SW] Update check failed',
            )
            expect(consoleSpies.log).not.toHaveBeenCalled()
            expect(consoleSpies.info).not.toHaveBeenCalled()
            expect(consoleSpies.error).not.toHaveBeenCalled()
            expect(consoleSpies.debug).not.toHaveBeenCalled()
        } finally {
            vi.restoreAllMocks()
        }
    })
})
