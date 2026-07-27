import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    chromeMockSpies,
    deferNextStorageRemove,
    deferNextStorageSet,
    getStorageSnapshot,
    installChromeMock,
    resetChromeMock,
} from '../test/chromeMock'
import type {
    AnalysisPersistenceWarning,
    AnalyzeCompletion,
    AnalyzePersistContext,
} from '../utils/analysisStore'
import {
    handleAnalyzeForward,
    isAnalyzePayload,
    normalizeAnalyzeHostOutcome,
    parseAnalyzeForwardRequest,
    parseAnalyzeForwardResult,
    parseAnalyzePersistContext,
    parseAnalyzeSuccess,
    type AnalyzeNativeAction,
    type AnalyzeNativePayload,
} from './analyzeBridge'

installChromeMock()

const CTX: AnalyzePersistContext = {
    caseNumber: '1234567890123456',
    requestId: 'request-1',
    successTitle: 'Analyze result',
    errorTitle: 'Analyze failed',
}

const HOST_PAYLOAD: AnalyzeNativePayload = {
    text: 'full context',
    context: 'Case form',
    timestamp: '7/21/2026, 10:00:00 AM',
    rootPath: '',
    product: 'Dynamics 365',
    caseNumber: '1234567890123456',
}

const FORWARDED: AnalyzeNativeAction = {
    action: 'analyze_error',
    requestId: CTX.requestId,
    payload: HOST_PAYLOAD,
}

const HOST_SUCCESS = {
    status: 'success',
    data: {
        status: 'success',
        data: { markdown: '# Report', saved_to: 'report.md', ignored: 'drop' },
    },
} as const

const HOST_ERROR = {
    status: 'success',
    data: {
        status: 'error',
        error: 'Host analysis failed',
        error_code: 'repository_instructions_missing',
        errorKind: 'unavailable',
        httpStatus: 503,
        ignored: 'drop',
    },
} as const

const INVALID_PARSE = {
    ok: false,
    response: {
        status: 'error',
        error_code: 'invalid_analyze_persistence_context',
        error: 'Analyze persistence context is invalid.',
    },
} as const

const MALFORMED = {
    status: 'error',
    error_code: 'malformed_native_response',
    error: 'The Native Host returned a malformed Analyze response.',
} as const

const START_FAILED = {
    status: 'error',
    error_code: 'analysis_persistence_start_failed',
    error: 'Analyze persistence could not be started.',
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

function assertInvalid(value: unknown): void {
    expect(parseAnalyzeForwardRequest(value)).toEqual(INVALID_PARSE)
}

describe('Analyze request parsing', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    it('constructs an exact fresh frozen action and context', () => {
        const symbol = Symbol('attacker')
        const raw = validAnalyzePayload()
        raw.requestId = ' top-level '
        Object.defineProperties(raw, {
            type: { value: 'NATIVE_MSG', enumerable: true },
            extension_warnings: { value: ['secret'], enumerable: true },
            arbitrary: { value: 'drop', enumerable: true },
            [symbol]: { value: 'drop', enumerable: true },
        })
        Object.defineProperty(raw, '__proto__', {
            value: { polluted: true },
            enumerable: true,
        })

        const parsed = parseAnalyzeForwardRequest(raw)

        expect(parsed.ok).toBe(true)
        if (!parsed.ok) throw new Error('Expected valid Analyze request')
        expect(parsed.forwarded).toEqual({
            action: 'analyze_error',
            requestId: ' top-level ',
            payload: HOST_PAYLOAD,
        })
        expect(parsed.context).toEqual({ ...CTX, requestId: ' top-level ' })
        expect(Object.isFrozen(parsed.forwarded)).toBe(true)
        expect(Object.isFrozen(parsed.forwarded.payload)).toBe(true)
        expect(Object.isFrozen(parsed.context)).toBe(true)
        expect(Object.getPrototypeOf(parsed.forwarded)).toBe(Object.prototype)
        expect(Object.getPrototypeOf(parsed.forwarded.payload)).toBe(Object.prototype)
        expect(Reflect.ownKeys(parsed.forwarded)).toEqual([
            'action', 'requestId', 'payload',
        ])
        expect(Object.keys(parsed.forwarded.payload)).toEqual([
            'text', 'context', 'timestamp', 'rootPath', 'product', 'caseNumber',
        ])
        expect(Reflect.ownKeys(parsed.forwarded.payload)).toEqual([
            'text', 'context', 'timestamp', 'rootPath', 'product', 'caseNumber',
            'toJSON',
        ])
        expect(Object.getOwnPropertyDescriptor(
            parsed.forwarded.payload,
            'toJSON',
        )).toEqual(expect.objectContaining({
            value: undefined,
            enumerable: false,
        }))
        expect(Reflect.ownKeys(raw)).toEqual(expect.arrayContaining([
            'action', 'requestId', 'payload', '_persist', 'type',
            'extension_warnings', 'arbitrary', '__proto__', symbol,
        ]))
        expect(parsed.forwarded).not.toHaveProperty('_persist')
        expect(parsed.forwarded).not.toHaveProperty('type')
        expect(parsed.forwarded).not.toHaveProperty('extension_warnings')
        expect(parsed.forwarded).not.toHaveProperty('arbitrary')
        expect(Object.getOwnPropertyDescriptor(parsed.forwarded, '__proto__')).toBeUndefined()
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    })

    it.each([
        ['missing requestId', (value: Record<string, unknown>) => { delete value.requestId }],
        ['empty requestId', (value: Record<string, unknown>) => { value.requestId = '' }],
        ['number requestId', (value: Record<string, unknown>) => { value.requestId = 7 }],
        ['missing _persist', (value: Record<string, unknown>) => { delete value._persist }],
        ['null _persist', (value: Record<string, unknown>) => { value._persist = null }],
        ['array _persist', (value: Record<string, unknown>) => { value._persist = [] }],
        ['function _persist', (value: Record<string, unknown>) => { value._persist = () => undefined }],
        ['number caseNumber', (value: Record<string, unknown>) => {
            ;(value._persist as Record<string, unknown>).caseNumber = 7
        }],
        ['empty successTitle', (value: Record<string, unknown>) => {
            ;(value._persist as Record<string, unknown>).successTitle = ''
        }],
        ['number successTitle', (value: Record<string, unknown>) => {
            ;(value._persist as Record<string, unknown>).successTitle = 7
        }],
        ['empty errorTitle', (value: Record<string, unknown>) => {
            ;(value._persist as Record<string, unknown>).errorTitle = ''
        }],
        ['number errorTitle', (value: Record<string, unknown>) => {
            ;(value._persist as Record<string, unknown>).errorTitle = 7
        }],
        ['only persisted requestId', (value: Record<string, unknown>) => {
            delete value.requestId
            ;(value._persist as Record<string, unknown>).requestId = 'fallback'
        }],
    ])('rejects malformed persistence metadata: %s', (_name, mutate) => {
        const value = validAnalyzePayload()
        mutate(value)
        assertInvalid(value)
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })

    it('accepts an empty case number and explicit empty root path', () => {
        const value = validAnalyzePayload()
        ;(value._persist as Record<string, unknown>).caseNumber = ''
        ;(value.payload as Record<string, unknown>).rootPath = ''

        const parsed = parseAnalyzeForwardRequest(value)

        expect(parsed.ok).toBe(true)
        if (!parsed.ok) throw new Error('Expected valid empty strings')
        expect(parsed.context.caseNumber).toBe('')
        expect(parsed.forwarded.payload.rootPath).toBe('')
    })

    it.each(['text', 'context', 'timestamp', 'rootPath'])(
        'rejects a missing or non-string required payload %s',
        key => {
            for (const malformed of [undefined, null, 7, {}, []]) {
                const value = validAnalyzePayload()
                if (malformed === undefined) {
                    delete (value.payload as Record<string, unknown>)[key]
                } else {
                    ;(value.payload as Record<string, unknown>)[key] = malformed
                }
                assertInvalid(value)
            }
        },
    )

    it.each(['product', 'caseNumber'])(
        'accepts an absent or string optional payload %s and rejects other present values',
        key => {
            const absent = validAnalyzePayload()
            delete (absent.payload as Record<string, unknown>)[key]
            expect(parseAnalyzeForwardRequest(absent).ok).toBe(true)
            const empty = validAnalyzePayload()
            ;(empty.payload as Record<string, unknown>)[key] = ''
            expect(parseAnalyzeForwardRequest(empty).ok).toBe(true)
            for (const malformed of [undefined, null, 7, {}, []]) {
                const value = validAnalyzePayload()
                ;(value.payload as Record<string, unknown>)[key] = malformed
                assertInvalid(value)
            }
        },
    )

    it('accepts only absent or exact true rootPathOverrideProvided', () => {
        const absent = validAnalyzePayload()
        expect(parseAnalyzeForwardRequest(absent).ok).toBe(true)
        const present = validAnalyzePayload()
        ;(present.payload as Record<string, unknown>).rootPathOverrideProvided = true
        const parsed = parseAnalyzeForwardRequest(present)
        expect(parsed.ok).toBe(true)
        if (!parsed.ok) throw new Error('Expected true override')
        expect(parsed.forwarded.payload.rootPathOverrideProvided).toBe(true)
        for (const malformed of [false, undefined, null, 'true', 1, {}, []]) {
            const value = validAnalyzePayload()
            ;(value.payload as Record<string, unknown>).rootPathOverrideProvided = malformed
            assertInvalid(value)
        }
    })

    it.each([
        ['requestId', 'top'],
        ['_persist', 'top'],
        ['caseNumber', 'persist'],
        ['successTitle', 'persist'],
        ['errorTitle', 'persist'],
        ['text', 'payload'],
        ['context', 'payload'],
        ['timestamp', 'payload'],
        ['rootPath', 'payload'],
        ['product', 'payload'],
        ['caseNumber', 'payload'],
        ['rootPathOverrideProvided', 'payload'],
    ])('rejects a getter for %s %s without invoking it', (key, location) => {
        const getter = vi.fn(() => 'SECRET-GETTER')
        const value = validAnalyzePayload()
        const target = location === 'top'
            ? value
            : location === 'persist'
                ? value._persist as object
                : value.payload as object
        Object.defineProperty(target, key, {
            get: getter,
            enumerable: true,
            configurable: true,
        })

        assertInvalid(value)
        expect(getter).not.toHaveBeenCalled()
    })

    it('contains throwing descriptor proxies without conversion or logging', () => {
        const secret = 'SECRET-DESCRIPTOR-PROXY'
        const toJSON = vi.fn(() => { throw new Error(secret) })
        const toString = vi.fn(() => { throw new Error(secret) })
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        const ownKeys = vi.fn(() => { throw { secret, toJSON, toString } })
        const descriptors = vi.fn(() => { throw { secret, toJSON, toString } })
        const values = [
            new Proxy(validAnalyzePayload(), { ownKeys }),
            new Proxy(validAnalyzePayload(), {
                getOwnPropertyDescriptor: descriptors,
            }),
        ]
        try {
            for (const value of values) assertInvalid(value)
            expect(ownKeys).toHaveBeenCalledTimes(1)
            expect(descriptors).toHaveBeenCalledTimes(1)
            expect(toJSON).not.toHaveBeenCalled()
            expect(toString).not.toHaveBeenCalled()
            expect(JSON.stringify([
                ...consoleLog.mock.calls,
                ...consoleWarn.mock.calls,
                ...consoleError.mock.calls,
            ])).not.toContain(secret)
        } finally {
            consoleLog.mockRestore()
            consoleWarn.mockRestore()
            consoleError.mockRestore()
        }
    })

    it('rejects outer and nested runtime wrappers', () => {
        assertInvalid({ type: 'NATIVE_MSG', payload: validAnalyzePayload() })
        const nested = validAnalyzePayload()
        nested.payload = { type: 'NATIVE_MSG', payload: { ...HOST_PAYLOAD } }
        assertInvalid(nested)
    })

    it.each(['unknown', 'type', 'extension_warnings', '__proto__'])(
        'rejects unknown payload key %s without pollution',
        key => {
            const value = validAnalyzePayload()
            Object.defineProperty(value.payload, key, {
                value: key === '__proto__' ? { polluted: true } : 'secret',
                enumerable: true,
                configurable: true,
            })
            assertInvalid(value)
            expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
        },
    )

    it('rejects a payload symbol', () => {
        const value = validAnalyzePayload()
        Object.defineProperty(value.payload, Symbol('secret'), {
            value: 'secret',
            enumerable: true,
        })
        assertInvalid(value)
    })

    it('rejects arrays and revoked or throwing payload proxies', () => {
        const revoked = Proxy.revocable({ ...HOST_PAYLOAD }, {})
        revoked.revoke()
        const values: unknown[] = [
            [],
            revoked.proxy,
            new Proxy({ ...HOST_PAYLOAD }, {
                ownKeys() { throw new Error('SECRET-OWN-KEYS') },
            }),
            new Proxy({ ...HOST_PAYLOAD }, {
                getOwnPropertyDescriptor() {
                    throw new Error('SECRET-DESCRIPTOR')
                },
            }),
        ]
        for (const payload of values) {
            const value = validAnalyzePayload()
            value.payload = payload
            assertInvalid(value)
        }
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    })

    it('uses one request descriptor snapshot for context and action', () => {
        const source = validAnalyzePayload()
        const ownKeys = vi.fn(() => Reflect.ownKeys(source))
        const descriptors = new Map<PropertyKey, number>()
        const proxy = new Proxy(source, {
            ownKeys,
            getOwnPropertyDescriptor(target, key) {
                descriptors.set(key, (descriptors.get(key) ?? 0) + 1)
                return Reflect.getOwnPropertyDescriptor(target, key)
            },
        })

        expect(parseAnalyzeForwardRequest(proxy).ok).toBe(true)
        expect(ownKeys).toHaveBeenCalledTimes(1)
        for (const count of descriptors.values()) expect(count).toBe(1)
    })

    it('parses context independently without reading persisted requestId', () => {
        const value = validAnalyzePayload()
        const getter = vi.fn(() => 'persisted-fallback')
        Object.defineProperty(value._persist, 'requestId', {
            get: getter,
            enumerable: true,
        })

        expect(parseAnalyzePersistContext(value)).toEqual(CTX)
        expect(getter).not.toHaveBeenCalled()
    })

    it('classifies Analyze without invoking action accessors', () => {
        expect(isAnalyzePayload({ action: 'analyze_error' })).toBe(true)
        expect(isAnalyzePayload({ action: 'ping' })).toBe(false)
        expect(isAnalyzePayload({ action: new String('analyze_error') })).toBe(false)
        const getter = vi.fn(() => 'analyze_error')
        const value = {}
        Object.defineProperty(value, 'action', { get: getter })
        expect(isAnalyzePayload(value)).toBe(false)
        expect(getter).not.toHaveBeenCalled()
    })
})

describe('strict Analyze Host outcome parsing', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    it('normalizes an exact Analyze success and drops extra fields', () => {
        expect(normalizeAnalyzeHostOutcome(HOST_SUCCESS)).toEqual({
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
        })
        expect(parseAnalyzeSuccess({ markdown: '# Report' })).toEqual({
            markdown: '# Report',
        })
        expect(parseAnalyzeSuccess({
            markdown: '# Report',
            saved_to: 'report.md',
            ignored: 'drop',
        })).toEqual({ markdown: '# Report', savedTo: 'report.md' })
    })

    it.each([
        null,
        [],
        {},
        { markdown: 7 },
        { markdown: '# Report', saved_to: null },
        { markdown: '# Report', saved_to: 7 },
    ])('rejects malformed Analyze success data %#', value => {
        expect(parseAnalyzeSuccess(value)).toBeNull()
        expect(normalizeAnalyzeHostOutcome({
            status: 'success',
            data: { status: 'success', data: value },
        })).toEqual(MALFORMED)
    })

    it('normalizes safe inner and outer Host errors', () => {
        expect(normalizeAnalyzeHostOutcome(HOST_ERROR)).toEqual({
            status: 'error',
            error: 'Host analysis failed',
            error_code: 'repository_instructions_missing',
            errorKind: 'unavailable',
            httpStatus: 503,
        })
        expect(normalizeAnalyzeHostOutcome({
            status: 'error',
            error: { unsafe: true },
            message: 'Safe outer message',
            error_code: 'future_code',
            errorKind: 'unknown',
            httpStatus: 401,
            ignored: 'drop',
        })).toEqual({
            status: 'error',
            error: 'Safe outer message',
            error_code: 'future_code',
            errorKind: 'unknown',
            httpStatus: 401,
        })
    })

    it('validates normalized success, error, and ordered warning subsets', () => {
        const success = {
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md', ignored: 'drop' },
            extension_warnings: ['analysis_result_not_persisted'],
            ignored: 'drop',
        }
        const parsedSuccess = parseAnalyzeForwardResult(success)
        expect(parsedSuccess).toEqual({
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
            extension_warnings: ['analysis_result_not_persisted'],
        })
        expect(parsedSuccess).not.toBe(success)
        expect(Object.getPrototypeOf(parsedSuccess)).toBe(Object.prototype)

        expect(parseAnalyzeForwardResult({
            status: 'error',
            error: 'Safe failure',
            error_code: 'future_code',
            errorKind: 'auth',
            httpStatus: 401,
            extension_warnings: [
                'analysis_result_not_persisted',
                'analysis_pending_cleanup_failed',
            ],
            ignored: 'drop',
        })).toEqual({
            status: 'error',
            error: 'Safe failure',
            error_code: 'future_code',
            errorKind: 'auth',
            httpStatus: 401,
            extension_warnings: [
                'analysis_result_not_persisted',
                'analysis_pending_cleanup_failed',
            ],
        })
    })

    it.each([
        null,
        [],
        {},
        { status: 'success' },
        { status: 'success', data: null },
        { status: 'success', data: {} },
        { status: 'success', data: { markdown: 7 } },
        { status: 'success', data: { markdown: '', saved_to: null } },
        { status: 'error', error: 7 },
        { status: 'error', error: 'x', error_code: 7 },
        { status: 'error', error: 'x', errorKind: 7 },
        { status: 'error', error: 'x', httpStatus: Number.POSITIVE_INFINITY },
        { status: 'success', data: { markdown: '' }, extension_warnings: 'bad' },
        { status: 'success', data: { markdown: '' }, extension_warnings: ['unknown'] },
        {
            status: 'success',
            data: { markdown: '' },
            extension_warnings: [
                'analysis_pending_cleanup_failed',
                'analysis_result_not_persisted',
            ],
        },
        {
            status: 'success',
            data: { markdown: '' },
            extension_warnings: [
                'analysis_result_not_persisted',
                'analysis_result_not_persisted',
            ],
        },
    ])('returns the fixed malformed response for invalid normalized input %#', value => {
        expect(parseAnalyzeForwardResult(value)).toEqual(MALFORMED)
    })

    it('contains accessors and revoked proxies at each accepted layer', () => {
        const getter = vi.fn(() => 'secret')
        const accessor = {}
        Object.defineProperty(accessor, 'status', { get: getter, enumerable: true })
        const revokedTop = Proxy.revocable({ status: 'success' }, {})
        const revokedData = Proxy.revocable({ markdown: '# Report' }, {})
        revokedTop.revoke()
        revokedData.revoke()

        expect(normalizeAnalyzeHostOutcome(accessor)).toEqual(MALFORMED)
        expect(normalizeAnalyzeHostOutcome(revokedTop.proxy)).toEqual(MALFORMED)
        expect(parseAnalyzeForwardResult(revokedTop.proxy)).toEqual(MALFORMED)
        expect(parseAnalyzeForwardResult({
            status: 'success',
            data: revokedData.proxy,
        })).toEqual(MALFORMED)
        expect(getter).not.toHaveBeenCalled()
    })

    it('never coerces, serializes, logs, stores, or returns malformed secrets', () => {
        const secret = 'SECRET-MALFORMED-ANALYZE'
        const toJSON = vi.fn(() => { throw new Error(secret) })
        const toString = vi.fn(() => { throw new Error(secret) })
        const unsafe = { secret, toJSON, toString }
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const result = normalizeAnalyzeHostOutcome({
                status: 'success',
                data: { status: 'success', data: { markdown: unsafe } },
            })
            expect(result).toEqual(MALFORMED)
            expect(result).not.toHaveProperty('secret')
            expect(JSON.stringify(getStorageSnapshot())).not.toContain(secret)
            expect(toJSON).not.toHaveBeenCalled()
            expect(toString).not.toHaveBeenCalled()
            expect(JSON.stringify([
                ...consoleLog.mock.calls,
                ...consoleWarn.mock.calls,
                ...consoleError.mock.calls,
            ])).not.toContain(secret)
            expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        } finally {
            consoleLog.mockRestore()
            consoleWarn.mockRestore()
            consoleError.mockRestore()
        }
    })
})

describe('handleAnalyzeForward persistence outcomes', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    it('revalidates direct context before start or send', async () => {
        const send = vi.fn()
        const recordStart = vi.fn()
        const completePersistence = vi.fn()

        await expect(handleAnalyzeForward(FORWARDED, {
            ...CTX,
            requestId: '',
        }, { send, recordStart, completePersistence })).resolves.toEqual(
            INVALID_PARSE.response,
        )
        expect(recordStart).not.toHaveBeenCalled()
        expect(send).not.toHaveBeenCalled()
        expect(completePersistence).not.toHaveBeenCalled()
    })

    it('returns start failure before Host send for injected rejection', async () => {
        const send = vi.fn()
        const completePersistence = vi.fn()

        await expect(handleAnalyzeForward(FORWARDED, CTX, {
            send,
            recordStart: vi.fn(async () => { throw new Error('SECRET START') }),
            completePersistence,
        })).resolves.toEqual(START_FAILED)
        expect(send).not.toHaveBeenCalled()
        expect(completePersistence).not.toHaveBeenCalled()
    })

    it('returns start failure before Host send for callback lastError', async () => {
        const write = deferNextStorageSet('dh_latest_analysis_owner')
        const send = vi.fn()
        const result = handleAnalyzeForward(FORWARDED, CTX, { send })
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledOnce())
        write.reject(new Error('SECRET START WRITE'))

        await expect(result).resolves.toEqual(START_FAILED)
        expect(send).not.toHaveBeenCalled()
    })

    it('normalizes before completion and omits an empty warning array', async () => {
        const completePersistence = vi.fn(async () => [])
        const send = vi.fn(async (_forwarded: AnalyzeNativeAction) => HOST_SUCCESS)

        const result = await handleAnalyzeForward(FORWARDED, CTX, {
            send,
            recordStart: vi.fn(async () => undefined),
            completePersistence,
        })

        expect(result).toEqual({
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
        })
        expect(completePersistence).toHaveBeenCalledWith(
            CTX,
            { status: 'success', markdown: '# Report', savedTo: 'report.md' },
            undefined,
        )
        expect(send).toHaveBeenCalledWith(FORWARDED)
        expect(send.mock.calls[0][0]).not.toHaveProperty('extension_warnings')
    })

    it.each([
        ['success', HOST_SUCCESS, {
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
        }],
        ['error', HOST_ERROR, {
            status: 'error',
            error: 'Host analysis failed',
            error_code: 'repository_instructions_missing',
            errorKind: 'unavailable',
            httpStatus: 503,
        }],
    ])('preserves normalized Host %s while attaching warnings', async (
        _name,
        hostOutcome,
        expected,
    ) => {
        const completePersistence = vi.fn(async () => [
            'analysis_result_not_persisted',
            'analysis_pending_cleanup_failed',
        ] satisfies AnalysisPersistenceWarning[])

        const result = await handleAnalyzeForward(FORWARDED, CTX, {
            send: vi.fn(async () => hostOutcome),
            recordStart: vi.fn(async () => undefined),
            completePersistence,
        })

        expect(result).toEqual({
            ...expected,
            extension_warnings: [
                'analysis_result_not_persisted',
                'analysis_pending_cleanup_failed',
            ],
        })
    })

    it('normalizes a send rejection, persists it, and attaches cleanup warning', async () => {
        const completionSeen: AnalyzeCompletion[] = []
        const completePersistence = vi.fn(async (_context, completion) => {
            completionSeen.push(completion)
            return ['analysis_pending_cleanup_failed'] as AnalysisPersistenceWarning[]
        })

        const result = await handleAnalyzeForward(FORWARDED, CTX, {
            send: vi.fn(async () => {
                throw new Error('Native Host disconnected unexpectedly')
            }),
            recordStart: vi.fn(async () => undefined),
            completePersistence,
        })

        expect(result).toEqual({
            status: 'error',
            error: 'Native Host disconnected unexpectedly',
            extension_warnings: ['analysis_pending_cleanup_failed'],
        })
        expect(completionSeen).toEqual([{
            status: 'error',
            error: 'Native Host disconnected unexpectedly',
        }])
    })

    it('uses a fixed rejection fallback without coercion', async () => {
        const toString = vi.fn(() => 'SECRET-REJECTION')
        const rejection = { message: { unsafe: true }, toString }

        const result = await handleAnalyzeForward(FORWARDED, CTX, {
            send: vi.fn(async () => { throw rejection }),
            recordStart: vi.fn(async () => undefined),
            completePersistence: vi.fn(async () => []),
        })

        expect(result).toEqual({ status: 'error', error: 'Native Host error' })
        expect(toString).not.toHaveBeenCalled()
    })

    it.each([
        ['success', HOST_SUCCESS, {
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
        }],
        ['error', HOST_ERROR, {
            status: 'error',
            error: 'Host analysis failed',
            error_code: 'repository_instructions_missing',
            errorKind: 'unavailable',
            httpStatus: 503,
        }],
        ['rejection', new Error('Native Host disconnected unexpectedly'), {
            status: 'error',
            error: 'Native Host disconnected unexpectedly',
        }],
    ])('contains unexpected completion failure after %s', async (
        kind,
        outcome,
        expected,
    ) => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const send = kind === 'rejection'
            ? vi.fn(async () => { throw outcome })
            : vi.fn(async () => outcome)
        try {
            const result = await handleAnalyzeForward(FORWARDED, CTX, {
                send,
                recordStart: vi.fn(async () => undefined),
                completePersistence: vi.fn(async () => {
                    throw new Error('SECRET COMPLETION FAILURE')
                }),
            })
            expect(result).toEqual({
                ...expected,
                extension_warnings: [
                    'analysis_result_not_persisted',
                    'analysis_pending_cleanup_failed',
                ],
            })
            expect(JSON.stringify(warning.mock.calls)).not.toContain('SECRET')
        } finally {
            warning.mockRestore()
        }
    })

    it('Host success survives result write failure', async () => {
        const resultWrite = deferNextStorageSet('dh_last_analysis')
        const running = handleAnalyzeForward(FORWARDED, CTX, {
            send: vi.fn(async () => HOST_SUCCESS),
            persistence: {
                now: () => 10,
                delay: async () => undefined,
                logCleanupFailure: () => undefined,
            },
        })
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(2))
        resultWrite.reject(new Error('SECRET RESULT WRITE'))

        await expect(running).resolves.toEqual({
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
            extension_warnings: ['analysis_result_not_persisted'],
        })
    })

    it('Host error survives all cleanup failures', async () => {
        const removes = [
            deferNextStorageRemove('dh_pending_analysis:request-1'),
            deferNextStorageRemove('dh_pending_analysis:request-1'),
            deferNextStorageRemove('dh_pending_analysis:request-1'),
        ]
        const running = handleAnalyzeForward(FORWARDED, CTX, {
            send: vi.fn(async () => HOST_ERROR),
            persistence: {
                now: () => 10,
                delay: async () => undefined,
                logCleanupFailure: () => undefined,
            },
        })
        for (let index = 0; index < removes.length; index += 1) {
            await vi.waitFor(() => expect(chromeMockSpies.storageRemove)
                .toHaveBeenCalledTimes(index + 1))
            removes[index].reject(new Error(`SECRET REMOVE ${index}`))
        }

        await expect(running).resolves.toEqual({
            status: 'error',
            error: 'Host analysis failed',
            error_code: 'repository_instructions_missing',
            errorKind: 'unavailable',
            httpStatus: 503,
            extension_warnings: ['analysis_pending_cleanup_failed'],
        })
    })

    it('Host success survives result and cleanup failure in fixed warning order', async () => {
        const resultWrite = deferNextStorageSet('dh_last_analysis')
        const removes = [
            deferNextStorageRemove('dh_pending_analysis:request-1'),
            deferNextStorageRemove('dh_pending_analysis:request-1'),
            deferNextStorageRemove('dh_pending_analysis:request-1'),
        ]
        const running = handleAnalyzeForward(FORWARDED, CTX, {
            send: vi.fn(async () => HOST_SUCCESS),
            persistence: {
                now: () => 10,
                delay: async () => undefined,
                logCleanupFailure: () => undefined,
            },
        })
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(2))
        resultWrite.reject(new Error('SECRET RESULT'))
        for (let index = 0; index < removes.length; index += 1) {
            await vi.waitFor(() => expect(chromeMockSpies.storageRemove)
                .toHaveBeenCalledTimes(index + 1))
            removes[index].reject(new Error(`SECRET REMOVE ${index}`))
        }

        await expect(running).resolves.toEqual({
            status: 'success',
            data: { markdown: '# Report', saved_to: 'report.md' },
            extension_warnings: [
                'analysis_result_not_persisted',
                'analysis_pending_cleanup_failed',
            ],
        })
    })
})
