import { describe, expect, it, vi } from 'vitest'
import {
    buildContextMenuAnalyzePayload,
    readAnalyzeInvocation,
    requestMatchesPage,
    snapshotAnalyzeRequest,
} from './analyzeRequest'

function revokedProxy(): object {
    const revocable = Proxy.revocable({}, {})
    revocable.revoke()
    return revocable.proxy
}

function descriptorThrowingProxy(): object {
    return new Proxy({ caseNumber: '' }, {
        getOwnPropertyDescriptor: () => {
            throw new Error('descriptor trap')
        },
    })
}

describe('snapshotAnalyzeRequest', () => {
    it.each([
        ['absent', undefined, 'C:\\Prefs', false],
        ['nonempty string', { rootPathOverride: 'C:\\Menu' }, 'C:\\Menu', true],
        ['empty string', { rootPathOverride: '' }, '', true],
        ['number', { rootPathOverride: 7 }, 'C:\\Prefs', false],
        ['null', { rootPathOverride: null }, 'C:\\Prefs', false],
        ['object', { rootPathOverride: {} }, 'C:\\Prefs', false],
        ['array', { rootPathOverride: [] }, 'C:\\Prefs', false],
        ['descriptor-throwing proxy', descriptorThrowingProxy(), 'C:\\Prefs', false],
        ['revoked proxy', revokedProxy(), 'C:\\Prefs', false],
    ])(
        'selects the preference Root for a %s invocation override when required',
        (_label, invocation, expectedRoot, expectedProvided) => {
            const snapshot = snapshotAnalyzeRequest(
                'request-exact',
                { caseNumber: 'Case-AbC', ticketTitle: 'Title' },
                'C:\\Prefs',
                invocation,
            )

            expect(snapshot).toEqual({
                requestId: 'request-exact',
                pageIdentity: 'case:Case-AbC',
                caseNumber: 'Case-AbC',
                rootPath: expectedRoot,
                rootPathOverrideProvided: expectedProvided,
            })
            expect(Object.isFrozen(snapshot)).toBe(true)
        },
    )

    it('rejects an accessor override without invoking its getter', () => {
        const getter = vi.fn(() => 'C:\\Secret')
        const invocation = Object.defineProperty({}, 'rootPathOverride', {
            get: getter,
        })

        expect(snapshotAnalyzeRequest(
            'request-accessor',
            { caseNumber: 'Case-AbC' },
            'C:\\Prefs',
            invocation,
        ).rootPath).toBe('C:\\Prefs')
        expect(getter).not.toHaveBeenCalled()
    })

    it.each([undefined, null, 3, {}, []])(
        'uses an empty safe Root for malformed preference value %j',
        preferenceRoot => {
            expect(snapshotAnalyzeRequest(
                'request-prefs',
                { caseNumber: 'Case-AbC' },
                preferenceRoot,
            )).toMatchObject({ rootPath: '', rootPathOverrideProvided: false })
        },
    )

    it('copies request and page primitives before source objects mutate', () => {
        const invocation = { rootPathOverride: 'C:\\Menu' }
        const page = { caseNumber: 'Case-AbC', ticketTitle: 'Original' }
        const snapshot = snapshotAnalyzeRequest(
            'request-immutable',
            page,
            'C:\\Prefs',
            invocation,
        )

        invocation.rootPathOverride = 'C:\\Changed'
        page.caseNumber = 'Changed'
        page.ticketTitle = 'Changed'

        expect(snapshot).toEqual({
            requestId: 'request-immutable',
            pageIdentity: 'case:Case-AbC',
            caseNumber: 'Case-AbC',
            rootPath: 'C:\\Menu',
            rootPathOverrideProvided: true,
        })
    })

    it.each(['', 1, null, undefined, {}, []])(
        'rejects malformed request ID %j with a fixed error',
        requestId => {
            expect(() => snapshotAnalyzeRequest(
                requestId,
                { caseNumber: 'Case-AbC' },
                'C:\\Prefs',
            )).toThrowError('Invalid Analyze request snapshot')
        },
    )

    it('rejects throwing page descriptors without invoking a getter', () => {
        const getter = vi.fn(() => 'Secret')
        const accessorPage = Object.defineProperty({}, 'caseNumber', { get: getter })

        expect(() => snapshotAnalyzeRequest(
            'request-accessor-page',
            accessorPage,
            'C:\\Prefs',
        )).toThrowError('Invalid Analyze request snapshot')
        expect(() => snapshotAnalyzeRequest(
            'request-descriptor-page',
            descriptorThrowingProxy(),
            'C:\\Prefs',
        )).toThrowError('Invalid Analyze request snapshot')
        expect(() => snapshotAnalyzeRequest(
            'request-revoked-page',
            revokedProxy(),
            'C:\\Prefs',
        )).toThrowError('Invalid Analyze request snapshot')
        expect(getter).not.toHaveBeenCalled()
    })

    it('matches only the same non-null page token', () => {
        const request = snapshotAnalyzeRequest(
            'request-match',
            { caseNumber: 'Case-AbC' },
            'C:\\Prefs',
        )
        const unbound = snapshotAnalyzeRequest(
            'request-unbound',
            {},
            'C:\\Prefs',
        )

        expect(requestMatchesPage(request, 'case:Case-AbC')).toBe(true)
        expect(requestMatchesPage(request, 'case:case-abc')).toBe(false)
        expect(requestMatchesPage(request, null)).toBe(false)
        expect(requestMatchesPage(unbound, null)).toBe(false)
    })
})

describe('readAnalyzeInvocation', () => {
    it.each([
        ['nonempty string', { rootPath: 'C:\\Menu' }, { rootPathOverride: 'C:\\Menu' }],
        ['empty string', { rootPath: '' }, { rootPathOverride: '' }],
        ['absent', {}, undefined],
        ['number', { rootPath: 1 }, undefined],
        ['null', { rootPath: null }, undefined],
        ['object', { rootPath: {} }, undefined],
        ['array', { rootPath: [] }, undefined],
        ['descriptor-throwing proxy', descriptorThrowingProxy(), undefined],
        ['revoked proxy', revokedProxy(), undefined],
    ])('reads a %s Root safely', (_label, detail, expected) => {
        expect(readAnalyzeInvocation(detail)).toEqual(expected)
    })

    it('does not invoke an invocation Root getter', () => {
        const getter = vi.fn(() => 'C:\\Secret')
        const detail = Object.defineProperty({}, 'rootPath', { get: getter })

        expect(readAnalyzeInvocation(detail)).toBeUndefined()
        expect(getter).not.toHaveBeenCalled()
    })
})

describe('buildContextMenuAnalyzePayload', () => {
    it.each([
        ['nonempty Root', { rootPath: 'C:\\Prefs' }, { selectionText: 'selected', rootPath: 'C:\\Prefs' }],
        ['explicit empty Root', { rootPath: '' }, { selectionText: 'selected', rootPath: '' }],
        ['absent Root', {}, { selectionText: 'selected' }],
        ['number Root', { rootPath: 3 }, { selectionText: 'selected' }],
        ['null Root', { rootPath: null }, { selectionText: 'selected' }],
        ['object Root', { rootPath: {} }, { selectionText: 'selected' }],
        ['array Root', { rootPath: [] }, { selectionText: 'selected' }],
        ['descriptor-throwing preferences', descriptorThrowingProxy(), { selectionText: 'selected' }],
        ['revoked preferences', revokedProxy(), { selectionText: 'selected' }],
    ])('builds a fresh payload for %s', (_label, preferences, expected) => {
        const payload = buildContextMenuAnalyzePayload('selected', preferences)

        expect(payload).toEqual(expected)
        expect(Object.getPrototypeOf(payload)).toBe(Object.prototype)
    })

    it('omits malformed selection and never invokes conversion hooks', () => {
        const toString = vi.fn(() => 'secret')
        expect(buildContextMenuAnalyzePayload({ toString }, { rootPath: 'C:\\Prefs' }))
            .toEqual({ rootPath: 'C:\\Prefs' })
        expect(toString).not.toHaveBeenCalled()
    })

    it('does not invoke an accessor-backed stored Root', () => {
        const getter = vi.fn(() => 'C:\\Secret')
        const preferences = Object.defineProperty({}, 'rootPath', { get: getter })

        expect(buildContextMenuAnalyzePayload('selected', preferences))
            .toEqual({ selectionText: 'selected' })
        expect(getter).not.toHaveBeenCalled()
    })
})
