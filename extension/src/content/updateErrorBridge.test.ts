import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    emitTabMessage,
    installChromeMock,
    resetChromeMock,
} from '../test/chromeMock'
import {
    forwardNativeUpdateErrorToWindow,
    UPDATE_ERROR_DOM_EVENT,
} from './updateErrorBridge'

vi.mock('react-dom/client', () => ({
    createRoot: () => ({ render: vi.fn() }),
}))
vi.mock('../components/FAB', () => ({ default: () => null }))
vi.mock('../utils/legacyFeatures', () => ({
    startClipboardListener: vi.fn(),
    setupSapTextAreaWatcher: vi.fn(),
}))
vi.mock('../components/LegacyStyles', () => ({ LEGACY_CSS: '' }))

describe('updateErrorBridge', () => {
    beforeEach(() => {
        vi.resetModules()
        resetChromeMock()
        installChromeMock()
    })

    it('bridges NATIVE_UPDATE_ERROR with safe detail', async () => {
        const secret = 'SECRET-CONTENT-UPDATE-ERROR'
        const getter = vi.fn(() => secret)
        const payload = {}
        Object.defineProperty(payload, 'error', {
            enumerable: true,
            get: getter,
        })
        const target = new EventTarget()
        const observed: unknown[] = []
        target.addEventListener(UPDATE_ERROR_DOM_EVENT, event => {
            observed.push((event as CustomEvent).detail)
        })

        expect(forwardNativeUpdateErrorToWindow({
            type: 'NATIVE_UPDATE_ERROR',
            payload,
        }, target)).toBe(true)
        expect(observed).toEqual([{ error: 'Update check failed.' }])
        expect(getter).not.toHaveBeenCalled()

        const contentObserved: unknown[] = []
        window.addEventListener(UPDATE_ERROR_DOM_EVENT, event => {
            contentObserved.push((event as CustomEvent).detail)
        }, { once: true })
        await import('./index')
        emitTabMessage(17, {
            type: 'NATIVE_UPDATE_ERROR',
            payload: { error: 'safe tab failure' },
        })
        expect(contentObserved).toEqual([{ error: 'safe tab failure' }])
    })

    it('ignores accessor-backed content messages without invoking them', async () => {
        await import('./index')
        const getter = vi.fn(() => 'NATIVE_PROGRESS')
        const message = {}
        Object.defineProperty(message, 'type', { enumerable: true, get: getter })

        emitTabMessage(17, message)

        expect(getter).not.toHaveBeenCalled()
    })

    it('bridges only exact nonempty progress messages', async () => {
        await import('./index')
        const { subscribeAnalyzeProgress } = await import('../utils/analyzeProgressChannel')
        const observed: unknown[] = []
        const unsubscribe = subscribeAnalyzeProgress(message => { observed.push(message) })

        try {
            emitTabMessage(17, {
                type: 'NATIVE_PROGRESS',
                requestId: 'request-1',
                payload: 'working',
            })
            emitTabMessage(17, {
                type: 'NATIVE_PROGRESS',
                requestId: 'request-2',
                payload: '',
            })
            emitTabMessage(17, {
                type: 'NATIVE_PROGRESS',
                requestId: 'request-3',
                payload: 'unsafe',
                extra: true,
            })

            expect(observed).toEqual([{ requestId: 'request-1', payload: 'Analysis in progress' }])
            expect(Object.isFrozen(observed[0])).toBe(true)
        } finally {
            unsubscribe()
        }
    })

    it('bridges cloned structured progress but never raw nested or accessor payloads', async () => {
        await import('./index')
        const { subscribeAnalyzeProgress } = await import('../utils/analyzeProgressChannel')
        const observed: Array<{ requestId: string; payload: unknown }> = []
        const unsubscribe = subscribeAnalyzeProgress(message => { observed.push(message) })
        try {
            const payload = { version: 1, seq: 1, stage: 'agent', state: 'running', elapsedMs: 0 }
            const message = { type: 'NATIVE_PROGRESS', requestId: 'request-1', payload }
            emitTabMessage(17, message)
            expect(observed).toEqual([{ requestId: 'request-1', payload }])
            expect(observed[0].payload).not.toBe(payload)
            expect(Object.isFrozen(observed[0].payload)).toBe(true)
            const getter = vi.fn(() => 'secret')
            const accessor = { ...payload }
            Object.defineProperty(accessor, 'stage', { enumerable: true, get: getter })
            for (const invalid of [accessor, { ...payload, raw: { text: 'secret' } }, { ...payload, [Symbol('secret')]: 1 }]) {
                emitTabMessage(17, { ...message, payload: invalid })
            }
            emitTabMessage(17, { ...message, [Symbol('secret')]: true })
            emitTabMessage(17, Object.assign(Object.create({ extra: true }), message))
            emitTabMessage(17, null)
            expect(observed).toHaveLength(1)
            expect(getter).not.toHaveBeenCalled()
        } finally {
            unsubscribe()
        }
    })

    it('uses only the private runtime channel, isolates listener failures and supports unsubscribe', async () => {
        await import('./index')
        const { publishAnalyzeProgress, subscribeAnalyzeProgress } = await import('../utils/analyzeProgressChannel')
        const observed = vi.fn()
        const domListener = vi.fn()
        const failing = subscribeAnalyzeProgress(() => { throw new Error('private consumer failed') })
        const unsubscribe = subscribeAnalyzeProgress(observed)
        window.addEventListener('dh-native-progress', domListener)
        try {
            const detail = { requestId: 'request-1', payload: { version: 1, seq: 1, stage: 'agent', state: 'running', elapsedMs: 0 } }
            window.dispatchEvent(new CustomEvent('dh-native-progress', { detail }))
            expect(observed).not.toHaveBeenCalled()
            domListener.mockClear()
            emitTabMessage(17, { type: 'NATIVE_PROGRESS', ...detail })
            expect(observed).toHaveBeenCalledExactlyOnceWith(detail)
            expect(domListener).not.toHaveBeenCalled()
            const delivered = observed.mock.calls[0][0]
            expect(delivered.payload).not.toBe(detail.payload)
            expect(Object.isFrozen(delivered.payload)).toBe(true)
            observed.mockClear()
            publishAnalyzeProgress(detail)
            expect(observed.mock.calls[0][0].payload).not.toBe(detail.payload)
            unsubscribe()
            publishAnalyzeProgress(detail)
            expect(observed).toHaveBeenCalledTimes(1)
        } finally {
            failing()
            unsubscribe()
            window.removeEventListener('dh-native-progress', domListener)
        }
    })
})
