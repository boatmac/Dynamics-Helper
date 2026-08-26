import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    handleContextMenuAnalyzeClick,
    type ContextMenuClickDeps,
} from './contextMenu'

function makeDeps(rootPath: unknown = ''): {
    deps: ContextMenuClickDeps
    order: string[]
} {
    const order: string[] = []
    return {
        order,
        deps: {
            readPreferences: vi.fn(async () => {
                order.push('read')
                return { rootPath }
            }),
            executeInTab: vi.fn(async () => { order.push('execute') }),
            sendToTab: vi.fn(async () => { order.push('send') }),
        },
    }
}

describe('handleContextMenuAnalyzeClick', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('preserves an explicit empty Root through the click boundary', async () => {
        const order: string[] = []
        const deps: ContextMenuClickDeps = {
            readPreferences: vi.fn(async () => {
                order.push('read')
                return { rootPath: '' }
            }),
            executeInTab: vi.fn(async () => { order.push('execute') }),
            sendToTab: vi.fn(async () => { order.push('send') }),
        }
        await expect(handleContextMenuAnalyzeClick(
            { selectionText: 'selected' }, 7, deps,
        )).resolves.toBe('sent')
        expect(order).toEqual(['read', 'execute', 'send'])
        expect(deps.sendToTab).toHaveBeenCalledWith(7, {
            type: 'TRIGGER_ANALYZE',
            payload: { selectionText: 'selected', rootPath: '' },
        })
    })

    it('ignores a missing or invalid tab ID without calling dependencies', async () => {
        for (const tabId of [undefined, 0, -1, 1.5, Number.NaN]) {
            const { deps } = makeDeps()

            await expect(handleContextMenuAnalyzeClick(
                { selectionText: 'selected' }, tabId, deps,
            )).resolves.toBe('ignored')
            expect(deps.readPreferences).not.toHaveBeenCalled()
            expect(deps.executeInTab).not.toHaveBeenCalled()
            expect(deps.sendToTab).not.toHaveBeenCalled()
        }
    })

    it.each([
        ['nonempty', 'C:\\Prefs', { selectionText: 'selected', rootPath: 'C:\\Prefs' }],
        ['malformed', 7, { selectionText: 'selected' }],
    ])('sends a %s Root in exact read/execute/send order', async (
        _label,
        rootPath,
        expectedPayload,
    ) => {
        const { deps, order } = makeDeps(rootPath)

        await expect(handleContextMenuAnalyzeClick(
            { selectionText: 'selected' }, 7, deps,
        )).resolves.toBe('sent')
        expect(order).toEqual(['read', 'execute', 'send'])
        expect(deps.sendToTab).toHaveBeenCalledWith(7, {
            type: 'TRIGGER_ANALYZE',
            payload: expectedPayload,
        })
    })

    it.each(['execute', 'send'] as const)(
        'contains a %s failure with fixed logging',
        async failurePoint => {
            const { deps, order } = makeDeps('C:\\Prefs')
            const error = vi.spyOn(console, 'error').mockImplementation(() => {})
            vi.mocked(deps[failurePoint === 'execute' ? 'executeInTab' : 'sendToTab'])
                .mockImplementationOnce(async () => {
                    order.push(failurePoint)
                    throw new Error('secret')
                })

            await expect(handleContextMenuAnalyzeClick(
                { selectionText: 'selected' }, 7, deps,
            )).resolves.toBe('failed')
            expect(order).toEqual(failurePoint === 'execute'
                ? ['read', 'execute']
                : ['read', 'execute', 'send'])
            expect(error).toHaveBeenCalledWith('[DH-BG] Context menu Analyze failed')
        },
    )

    it('contains a preferences read failure with fixed logging', async () => {
        const { deps } = makeDeps()
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(deps.readPreferences).mockRejectedValueOnce(new Error('secret'))

        await expect(handleContextMenuAnalyzeClick(
            { selectionText: 'selected' }, 7, deps,
        )).resolves.toBe('failed')
        expect(deps.executeInTab).not.toHaveBeenCalled()
        expect(deps.sendToTab).not.toHaveBeenCalled()
        expect(error).toHaveBeenCalledWith('[DH-BG] Context menu Analyze failed')
    })

    it('omits accessor-backed selection without invoking its getter', async () => {
        const { deps, order } = makeDeps('C:\\Prefs')
        const getter = vi.fn(() => 'secret')
        const info = Object.defineProperty({}, 'selectionText', { get: getter })

        await expect(handleContextMenuAnalyzeClick(info, 7, deps)).resolves.toBe('sent')
        expect(order).toEqual(['read', 'execute', 'send'])
        expect(deps.sendToTab).toHaveBeenCalledWith(7, {
            type: 'TRIGGER_ANALYZE',
            payload: { rootPath: 'C:\\Prefs' },
        })
        expect(getter).not.toHaveBeenCalled()
    })

    it('omits selection from revoked info without throwing', async () => {
        const { deps, order } = makeDeps('C:\\Prefs')
        const revocable = Proxy.revocable({}, {})
        revocable.revoke()

        await expect(handleContextMenuAnalyzeClick(
            revocable.proxy, 7, deps,
        )).resolves.toBe('sent')
        expect(order).toEqual(['read', 'execute', 'send'])
        expect(deps.sendToTab).toHaveBeenCalledWith(7, {
            type: 'TRIGGER_ANALYZE',
            payload: { rootPath: 'C:\\Prefs' },
        })
    })
})
