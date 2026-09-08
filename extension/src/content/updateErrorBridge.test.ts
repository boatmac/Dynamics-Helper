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
        const observed: unknown[] = []
        window.addEventListener('dh-native-progress', event => {
            observed.push((event as CustomEvent).detail)
        })

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

        expect(observed).toEqual([{ requestId: 'request-1', payload: 'working' }])
        expect(Object.isFrozen(observed[0])).toBe(true)
    })
})
