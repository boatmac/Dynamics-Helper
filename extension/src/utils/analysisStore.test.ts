import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    chromeMockSpies,
    deferNextStorageGet,
    deferNextStorageRemove,
    deferNextStorageSet,
    getStorageSnapshot,
    installChromeMock,
    resetChromeMock,
    seedStorage,
} from '../test/chromeMock'
import * as analysisStoreModule from './analysisStore'

const analysisStoreExports = analysisStoreModule as unknown as Record<
    string,
    unknown
>

installChromeMock()

const CASE_A = '1234567890123456'
const CASE_B = '9999999999999999'
const CTX = {
    caseNumber: CASE_A,
    requestId: 'req-A',
    successTitle: 'Analyze result',
    errorTitle: 'Analyze failed',
}

type PersistContextForTest = typeof CTX
type CompletePersistenceForTest = (
    ctx: PersistContextForTest,
    completion:
        | { status: 'success'; markdown: string; savedTo?: string }
        | { status: 'error'; error: string; errorCode?: string },
    deps?: {
        now?: () => number
        delay?: (milliseconds: number) => Promise<void>
        logCleanupFailure?: (attempt: number) => void
    },
) => Promise<string[]>

type RecordStartForTest = (
    ctx: PersistContextForTest,
    now?: () => number,
) => Promise<void>

beforeEach(() => {
    resetChromeMock()
    installChromeMock()
})

function requireAnalysisFunction(name: string): (value: unknown) => unknown {
    const candidate = analysisStoreExports[name]
    expect(candidate, `${name} export`).toBeTypeOf('function')
    return candidate as (value: unknown) => unknown
}

function requireCompletePersistence(): CompletePersistenceForTest {
    return requireAnalysisFunction(
        'completeAnalyzePersistence',
    ) as CompletePersistenceForTest
}

function requireRecordStart(): RecordStartForTest {
    return requireAnalysisFunction('recordAnalyzeStart') as RecordStartForTest
}

function expectPlainSnapshot(
    name: string,
    input: Record<string, unknown>,
    expected: Record<string, unknown>,
): void {
    const parsed = requireAnalysisFunction(name)(input)
    expect(parsed).toEqual(expected)
    expect(parsed).not.toBe(input)
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype)
    expect(Object.keys(parsed as object)).toEqual(Object.keys(expected))
}

function maliciousRows(): {
    rows: unknown[]
    getter: ReturnType<typeof vi.fn>
} {
    const getter = vi.fn(() => CASE_A)
    const accessor = Object.defineProperty({}, 'caseNumber', {
        enumerable: true,
        get: getter,
    })
    const throwing = new Proxy({}, {
        getOwnPropertyDescriptor() {
            throw new Error('SECRET DESCRIPTOR ERROR')
        },
    })
    const revocable = Proxy.revocable({}, {})
    revocable.revoke()
    return { rows: [accessor, throwing, revocable.proxy], getter }
}

it('exports and applies the strict persisted analysis parser surface', () => {
    expect(analysisStoreExports.LATEST_ANALYSIS_OWNER_KEY).toBe(
        'dh_latest_analysis_owner',
    )
    for (const name of [
        'parseLastAnalysis',
        'parsePendingAnalysis',
        'parseLatestAnalysisOwner',
        'parseLastAnalysisIdentity',
        'parseAnalyzePersistContextValue',
    ]) {
        expect(analysisStoreExports[name], `${name} export`).toBeTypeOf(
            'function',
        )
    }
    const parseLastAnalysis = analysisStoreExports.parseLastAnalysis
    if (typeof parseLastAnalysis !== 'function') return
    expect(parseLastAnalysis({
        caseNumber: '1234567890123456',
        status: 'success',
        title: 'Result',
        content: 'Body',
        timestamp: 0,
        seen: false,
        durationSec: 0,
    })).toMatchObject({ timestamp: 0, durationSec: 0 })
})

describe('strict persisted analysis parser matrix', () => {
    const lastBase = {
        caseNumber: CASE_A,
        status: 'success',
        title: 'Result',
        content: 'Body',
        timestamp: 0,
        seen: false,
    }

    it('parses LastAnalysis snapshots and rejects malformed records', () => {
        const modern = {
            ...lastBase,
            requestId: 'req-modern',
            durationSec: 0,
            savedTo: 'C:\\report.md',
            unknown: 'ignored',
        }
        expectPlainSnapshot('parseLastAnalysis', modern, {
            caseNumber: CASE_A,
            requestId: 'req-modern',
            status: 'success',
            title: 'Result',
            content: 'Body',
            timestamp: 0,
            seen: false,
            durationSec: 0,
            savedTo: 'C:\\report.md',
        })
        expectPlainSnapshot('parseLastAnalysis', {
            ...lastBase,
            status: 'error',
            errorCode: 'repository_instructions_missing',
        }, {
            ...lastBase,
            status: 'error',
            errorCode: 'repository_instructions_missing',
        })
        expectPlainSnapshot('parseLastAnalysis', { ...lastBase }, lastBase)

        const conversion = {
            valueOf: vi.fn(() => 0),
            toString: vi.fn(() => '0'),
        }
        const invalid = [
            null,
            [],
            { ...lastBase, status: 'pending' },
            { ...lastBase, caseNumber: 1 },
            { ...lastBase, title: null },
            { ...lastBase, content: {} },
            { ...lastBase, seen: 0 },
            { ...lastBase, timestamp: Number.NaN },
            { ...lastBase, timestamp: Number.POSITIVE_INFINITY },
            { ...lastBase, timestamp: conversion },
            { ...lastBase, requestId: 1 },
            { ...lastBase, savedTo: false },
            { ...lastBase, errorCode: {} },
            { ...lastBase, durationSec: Number.NaN },
            { ...lastBase, durationSec: Number.NEGATIVE_INFINITY },
            Object.create(lastBase),
        ]
        const malicious = maliciousRows()
        for (const value of [...invalid, ...malicious.rows]) {
            expect(requireAnalysisFunction('parseLastAnalysis')(value)).toBeNull()
        }
        expect(conversion.valueOf).not.toHaveBeenCalled()
        expect(conversion.toString).not.toHaveBeenCalled()
        expect(malicious.getter).not.toHaveBeenCalled()
    })

    it('parses PendingAnalysis snapshots and rejects malformed records', () => {
        const valid = {
            caseNumber: '',
            requestId: 'req-pending',
            startTime: 0,
            unknown: 'ignored',
        }
        expectPlainSnapshot('parsePendingAnalysis', valid, {
            caseNumber: '',
            requestId: 'req-pending',
            startTime: 0,
        })
        const conversion = { valueOf: vi.fn(() => 0) }
        const invalid = [
            null,
            [],
            {},
            { ...valid, caseNumber: 1 },
            { ...valid, requestId: null },
            { ...valid, startTime: Number.NaN },
            { ...valid, startTime: Number.POSITIVE_INFINITY },
            { ...valid, startTime: conversion },
        ]
        const malicious = maliciousRows()
        for (const value of [...invalid, ...malicious.rows]) {
            expect(requireAnalysisFunction('parsePendingAnalysis')(value)).toBeNull()
        }
        expect(conversion.valueOf).not.toHaveBeenCalled()
        expect(malicious.getter).not.toHaveBeenCalled()
    })

    it('parses LatestAnalysisOwner snapshots and rejects malformed records', () => {
        const valid = {
            caseNumber: CASE_A,
            requestId: 'req-owner',
            startTime: -1,
            unknown: 'ignored',
        }
        expectPlainSnapshot('parseLatestAnalysisOwner', valid, {
            caseNumber: CASE_A,
            requestId: 'req-owner',
            startTime: -1,
        })
        const invalid = [
            null,
            [],
            {},
            { ...valid, caseNumber: false },
            { ...valid, requestId: 2 },
            { ...valid, startTime: Number.NaN },
            { ...valid, startTime: Number.NEGATIVE_INFINITY },
        ]
        const malicious = maliciousRows()
        for (const value of [...invalid, ...malicious.rows]) {
            expect(requireAnalysisFunction('parseLatestAnalysisOwner')(value)).toBeNull()
        }
        expect(malicious.getter).not.toHaveBeenCalled()
    })

    it('parses LastAnalysisIdentity snapshots and rejects malformed records', () => {
        expectPlainSnapshot('parseLastAnalysisIdentity', {
            caseNumber: CASE_A,
            requestId: 'req-modern',
            timestamp: 0,
            unknown: 'ignored',
        }, {
            caseNumber: CASE_A,
            requestId: 'req-modern',
            timestamp: 0,
        })
        expectPlainSnapshot('parseLastAnalysisIdentity', {
            caseNumber: CASE_A,
            timestamp: 0,
        }, {
            caseNumber: CASE_A,
            timestamp: 0,
        })
        const invalid = [
            null,
            [],
            {},
            { caseNumber: CASE_A },
            { caseNumber: 1, requestId: 'req' },
            { caseNumber: CASE_A, requestId: 2, timestamp: 0 },
            { caseNumber: CASE_A, timestamp: Number.NaN },
            { caseNumber: CASE_A, timestamp: Number.POSITIVE_INFINITY },
            { caseNumber: CASE_A, requestId: 'req', timestamp: Number.NaN },
        ]
        const malicious = maliciousRows()
        for (const value of [...invalid, ...malicious.rows]) {
            expect(requireAnalysisFunction('parseLastAnalysisIdentity')(value)).toBeNull()
        }
        expect(malicious.getter).not.toHaveBeenCalled()
    })

    it('parses AnalyzePersistContext snapshots and rejects malformed records', () => {
        const valid = {
            caseNumber: CASE_A,
            requestId: 'req-context',
            successTitle: 'Analyze',
            errorTitle: 'Analysis failed',
            unknown: 'ignored',
        }
        expectPlainSnapshot('parseAnalyzePersistContextValue', valid, {
            caseNumber: CASE_A,
            requestId: 'req-context',
            successTitle: 'Analyze',
            errorTitle: 'Analysis failed',
        })
        const invalid = [
            null,
            [],
            {},
            { ...valid, caseNumber: 1 },
            { ...valid, requestId: '' },
            { ...valid, requestId: false },
            { ...valid, successTitle: '' },
            { ...valid, successTitle: null },
            { ...valid, errorTitle: '' },
            { ...valid, errorTitle: {} },
        ]
        const malicious = maliciousRows()
        for (const value of [...invalid, ...malicious.rows]) {
            expect(requireAnalysisFunction('parseAnalyzePersistContextValue')(value)).toBeNull()
        }
        expect(malicious.getter).not.toHaveBeenCalled()
    })
})

it('derives last identity without invoking source accessors', () => {
    const getter = vi.fn(() => CASE_A)
    const value = {
        status: 'success',
        title: 'Result',
        content: 'Body',
        timestamp: 1,
        seen: false,
        requestId: 'req-accessor',
    }
    Object.defineProperty(value, 'caseNumber', {
        enumerable: true,
        get: getter,
    })
    const getIdentity = analysisStoreExports.getLastAnalysisIdentity
    expect(getIdentity).toBeTypeOf('function')

    expect(() => (getIdentity as (input: unknown) => unknown)(value)).toThrow(
        'Invalid analysis persistence value',
    )
    expect(getter).not.toHaveBeenCalled()
})

it('rejects a revoked whole-storage snapshot with fixed text', async () => {
    seedStorage({ keep_me: 'safe' })
    const revoked = Proxy.revocable({}, {})
    const entries = vi.spyOn(Object, 'entries')
    chromeMockSpies.storageGet.mockImplementationOnce((
        _keys: unknown,
        maybeCallback?: unknown,
    ) => {
        const callback = typeof maybeCallback === 'function'
            ? maybeCallback as (value: unknown) => void
            : undefined
        revoked.revoke()
        if (callback) {
            queueMicrotask(() => callback(revoked.proxy))
            return undefined
        }
        return Promise.resolve(revoked.proxy)
    })

    try {
        const getSnapshot = analysisStoreExports.getAnalysisSnapshot
        expect(getSnapshot).toBeTypeOf('function')
        await expect((getSnapshot as () => Promise<unknown>)()).rejects.toThrow(
            'Analysis storage read failed',
        )
        expect(entries.mock.calls.some(([value]) => value === revoked.proxy)).toBe(false)
        expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
        expect(getStorageSnapshot()).toEqual({ keep_me: 'safe' })
    } finally {
        entries.mockRestore()
    }
})

describe('latest-started persistence ownership', () => {
    const context = (
        requestId: string,
        caseNumber = CASE_A,
    ): PersistContextForTest => ({
        ...CTX,
        caseNumber,
        requestId,
    })
    const completion = {
        status: 'success' as const,
        markdown: '# Result',
        savedTo: 'C:\\report.md',
    }

    it('writes pending and owner in one storage set', async () => {
        const caller = context('req-atomic')
        await requireRecordStart()(caller, () => 7)

        expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1)
        const [values] = chromeMockSpies.storageSet.mock.calls[0]
        const pendingKey = 'dh_pending_analysis:req-atomic'
        expect(values).toEqual({
            [pendingKey]: {
                caseNumber: CASE_A,
                requestId: 'req-atomic',
                startTime: 7,
            },
            dh_latest_analysis_owner: {
                caseNumber: CASE_A,
                requestId: 'req-atomic',
                startTime: 7,
            },
        })
        expect(values[pendingKey]).not.toBe(caller)
        expect(values.dh_latest_analysis_owner).not.toBe(caller)
        expect(Object.getPrototypeOf(values[pendingKey])).toBe(Object.prototype)
        expect(Object.getPrototypeOf(values.dh_latest_analysis_owner)).toBe(Object.prototype)
        expect(requireAnalysisFunction('parsePendingAnalysis')(values[pendingKey]))
            .toEqual(values[pendingKey])
        expect(requireAnalysisFunction('parseLatestAnalysisOwner')(
            values.dh_latest_analysis_owner,
        )).toEqual(values.dh_latest_analysis_owner)
    })

    it('latest-started request owns the singleton result', async () => {
        await requireRecordStart()(context('req-A'), () => 1)
        await requireRecordStart()(context('req-B', CASE_B), () => 2)

        await requireCompletePersistence()(context('req-B', CASE_B), completion, {
            now: () => 20,
        })
        await requireCompletePersistence()(context('req-A'), completion, {
            now: () => 30,
        })

        expect(getStorageSnapshot()).toMatchObject({
            dh_last_analysis: {
                caseNumber: CASE_B,
                requestId: 'req-B',
                timestamp: 20,
            },
            dh_latest_analysis_owner: {
                caseNumber: CASE_B,
                requestId: 'req-B',
                startTime: 2,
            },
        })
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-A')
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-B')
    })

    it('A cannot replace the singleton while B is pending', async () => {
        await requireRecordStart()(context('req-A'), () => 1)
        await requireRecordStart()(context('req-B', CASE_B), () => 2)

        await requireCompletePersistence()(context('req-A'), completion, {
            now: () => 10,
        })

        const afterA = getStorageSnapshot()
        expect(afterA).not.toHaveProperty('dh_last_analysis')
        expect(afterA).not.toHaveProperty('dh_pending_analysis:req-A')
        expect(afterA).toHaveProperty('dh_pending_analysis:req-B')
        expect(afterA).toHaveProperty(
            'dh_latest_analysis_owner.requestId',
            'req-B',
        )

        await requireCompletePersistence()(context('req-B', CASE_B), completion, {
            now: () => 20,
        })
        expect(getStorageSnapshot()).toHaveProperty(
            'dh_last_analysis.requestId',
            'req-B',
        )
    })

    it('one request can start and complete while retaining its owner', async () => {
        await requireRecordStart()(context('req-A'), () => 1)
        await requireCompletePersistence()(context('req-A'), completion, {
            now: () => 10,
        })

        expect(getStorageSnapshot()).toMatchObject({
            dh_last_analysis: { requestId: 'req-A' },
            dh_latest_analysis_owner: { requestId: 'req-A' },
        })
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-A')
    })

    it('module reload preserves durable latest-started ownership', async () => {
        vi.resetModules()
        const workerA = await import('./analysisStore')
        await workerA.recordAnalyzeStart(context('req-A'), () => 1)
        vi.resetModules()
        const workerB = await import('./analysisStore')
        await workerB.recordAnalyzeStart(context('req-B', CASE_B), () => 2)
        vi.resetModules()
        const completingA = await import('./analysisStore')
        await completingA.completeAnalyzePersistence(context('req-A'), completion, {
            now: () => 10,
        })
        vi.resetModules()
        const completingB = await import('./analysisStore')
        await completingB.completeAnalyzePersistence(
            context('req-B', CASE_B),
            completion,
            { now: () => 20 },
        )

        expect(getStorageSnapshot()).toMatchObject({
            dh_last_analysis: { requestId: 'req-B' },
            dh_latest_analysis_owner: { requestId: 'req-B' },
        })
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-A')
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-B')
    })

    it('malformed owner cannot grant completion ownership', async () => {
        seedStorage({
            dh_latest_analysis_owner: { requestId: 'req-A', startTime: Number.NaN },
            'dh_pending_analysis:req-A': {
                caseNumber: CASE_A,
                requestId: 'req-A',
                startTime: 1,
            },
            dh_last_analysis: {
                caseNumber: CASE_B,
                requestId: 'existing',
                status: 'success',
                title: 'Existing',
                content: 'Existing',
                timestamp: 1,
                seen: false,
            },
        })

        await expect(requireCompletePersistence()(CTX, completion)).resolves.toEqual([])
        expect(getStorageSnapshot()).toHaveProperty(
            'dh_last_analysis.requestId',
            'existing',
        )
        expect(getStorageSnapshot()).toHaveProperty(
            'dh_latest_analysis_owner.startTime',
            Number.NaN,
        )
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-A')
    })

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        'rejects non-finite start clock %s before storage mutation',
        async startTime => {
            await expect(requireRecordStart()(CTX, () => startTime)).rejects.toThrow(
                'Invalid analysis persistence value',
            )
            expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        },
    )

    it('rejects a throwing start clock before storage mutation', async () => {
        await expect(requireRecordStart()(CTX, () => {
            throw new Error('SECRET CLOCK')
        })).rejects.toThrow('Invalid analysis persistence value')
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })

    it('rejects malformed start context before storage mutation', async () => {
        await expect(requireRecordStart()({
            ...CTX,
            requestId: '',
        })).rejects.toThrow('Invalid analysis persistence value')
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })

    it('evaluates the start clock only after earlier mutations finish', async () => {
        const blockedWrite = deferNextStorageSet()
        const blocking = (analysisStoreExports.markSeen as (
            value: unknown,
        ) => Promise<void>)({ caseNumber: CASE_A, timestamp: 1 })
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledOnce())
        const now = vi.fn(() => 7)
        const starting = requireRecordStart()(CTX, now)
        await Promise.resolve()
        expect(now).not.toHaveBeenCalled()

        await blockedWrite.resolve(undefined)
        await blocking
        await starting
        expect(now).toHaveBeenCalledOnce()
    })

    it('returns a fixed error when the combined start write reports lastError', async () => {
        const write = deferNextStorageSet('dh_latest_analysis_owner')
        const started = requireRecordStart()(CTX, () => 1)
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledOnce())
        await write.reject(new Error('SECRET START WRITE'))

        await expect(started).rejects.toThrow('Analysis storage write failed')
        expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1)
        expect(getStorageSnapshot()).not.toHaveProperty('dh_latest_analysis_owner')
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-A')
    })

    it.each([
        ['setLastAnalysis', {
            caseNumber: CASE_A,
            status: 'success',
            title: 'Result',
            content: 'Body',
            timestamp: Number.NaN,
            seen: false,
        }],
        ['setPendingAnalysis', {
            caseNumber: CASE_A,
            requestId: 'req-A',
            startTime: Number.NaN,
        }],
        ['markSeen', { caseNumber: CASE_A, timestamp: Number.NaN }],
    ])('%s rejects direct malformed values before writing', async (name, value) => {
        const writer = analysisStoreExports[name]
        expect(writer, `${name} export`).toBeTypeOf('function')
        await expect((writer as (input: unknown) => Promise<void>)(value)).rejects.toThrow(
            'Invalid analysis persistence value',
        )
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    })

    it('rejects storage reads with fixed text without coercing raw errors', async () => {
        await requireRecordStart()(CTX, () => 1)
        const raw = new Error('SECRET READ ERROR')
        raw.toString = vi.fn(() => 'SECRET READ ERROR')
        const read = deferNextStorageGet('dh_latest_analysis_owner')
        const completing = requireCompletePersistence()(CTX, completion)
        await vi.waitFor(() => expect(chromeMockSpies.storageGet).toHaveBeenCalled())
        await read.reject(raw)

        await expect(completing).rejects.toThrow('Analysis storage read failed')
        expect(raw.toString).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
    })

    it('rejects malformed completion before any completion storage operation', async () => {
        await requireRecordStart()(CTX, () => 1)
        chromeMockSpies.storageGet.mockClear()
        chromeMockSpies.storageSet.mockClear()
        await expect(requireCompletePersistence()(CTX, {
            status: 'success',
            markdown: 7,
        } as unknown as { status: 'success'; markdown: string })).rejects.toThrow(
            'Invalid analysis persistence value',
        )
        expect(chromeMockSpies.storageGet).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
        expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
    })

    it('captures completion context before waiting for the mutation queue', async () => {
        await requireRecordStart()(CTX, () => 1)
        const blockedWrite = deferNextStorageSet()
        const blocking = (analysisStoreExports.markSeen as (
            value: unknown,
        ) => Promise<void>)({ caseNumber: CASE_A, timestamp: 1 })
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(2))
        const mutable = { ...CTX }
        const completing = requireCompletePersistence()(mutable, completion, {
            now: () => 10,
        })
        mutable.caseNumber = CASE_B
        mutable.requestId = 'mutated'
        mutable.successTitle = 'Mutated title'

        await blockedWrite.resolve(undefined)
        await blocking
        await completing
        expect(getStorageSnapshot()).toHaveProperty(
            'dh_last_analysis.requestId',
            'req-A',
        )
        expect(getStorageSnapshot()).toHaveProperty(
            'dh_last_analysis.title',
            'Analyze result',
        )
    })

    it('keeps cleanup after a result write failure', async () => {
        await requireRecordStart()(CTX, () => 1)
        const resultWrite = deferNextStorageSet('dh_last_analysis')
        const completing = requireCompletePersistence()(CTX, completion)
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(2))
        await resultWrite.reject(new Error('SECRET RESULT WRITE'))

        await expect(completing).resolves.toEqual(['analysis_result_not_persisted'])
        expect(getStorageSnapshot()).not.toHaveProperty('dh_pending_analysis:req-A')
    })

    it('cleanup retry uses three attempts and fixed delays', async () => {
        await requireRecordStart()(CTX, () => 1)
        const removes = [
            deferNextStorageRemove('dh_pending_analysis:req-A'),
            deferNextStorageRemove('dh_pending_analysis:req-A'),
            deferNextStorageRemove('dh_pending_analysis:req-A'),
        ]
        const delays: number[] = []
        const attempts: number[] = []
        const completing = requireCompletePersistence()(CTX, completion, {
            delay: async milliseconds => { delays.push(milliseconds) },
            logCleanupFailure: attempt => { attempts.push(attempt) },
        })
        for (let index = 0; index < removes.length; index += 1) {
            await vi.waitFor(() => expect(chromeMockSpies.storageRemove)
                .toHaveBeenCalledTimes(index + 1))
            await removes[index].reject(new Error(`SECRET REMOVE ${index + 1}`))
        }

        await expect(completing).resolves.toEqual([
            'analysis_pending_cleanup_failed',
        ])
        expect(delays).toEqual([50, 200])
        expect(attempts).toEqual([1, 2, 3])
        expect(chromeMockSpies.storageRemove).toHaveBeenCalledTimes(3)
    })

    it('retries cleanup read failures with the fixed schedule', async () => {
        await requireRecordStart()(CTX, () => 1)
        const reads = [
            deferNextStorageGet('dh_pending_analysis:req-A'),
            deferNextStorageGet('dh_pending_analysis:req-A'),
            deferNextStorageGet('dh_pending_analysis:req-A'),
        ]
        const delays: number[] = []
        const attempts: number[] = []
        const completing = requireCompletePersistence()(CTX, completion, {
            delay: async milliseconds => { delays.push(milliseconds) },
            logCleanupFailure: attempt => { attempts.push(attempt) },
        })
        for (let index = 0; index < reads.length; index += 1) {
            await vi.waitFor(() => expect(chromeMockSpies.storageGet.mock.calls.length)
                .toBeGreaterThan(index + 1))
            await reads[index].reject(new Error(`SECRET GET ${index + 1}`))
        }

        await expect(completing).resolves.toEqual([
            'analysis_pending_cleanup_failed',
        ])
        expect(delays).toEqual([50, 200])
        expect(attempts).toEqual([1, 2, 3])
        expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
    })

    it('warning order follows the allowlist', async () => {
        await requireRecordStart()(CTX, () => 1)
        const resultWrite = deferNextStorageSet('dh_last_analysis')
        const removes = [
            deferNextStorageRemove('dh_pending_analysis:req-A'),
            deferNextStorageRemove('dh_pending_analysis:req-A'),
            deferNextStorageRemove('dh_pending_analysis:req-A'),
        ]
        const completing = requireCompletePersistence()(CTX, completion, {
            delay: async () => undefined,
            logCleanupFailure: () => undefined,
        })
        await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(2))
        await resultWrite.reject(new Error('SECRET RESULT'))
        for (let index = 0; index < removes.length; index += 1) {
            await vi.waitFor(() => expect(chromeMockSpies.storageRemove)
                .toHaveBeenCalledTimes(index + 1))
            await removes[index].reject(new Error(`SECRET REMOVE ${index + 1}`))
        }

        await expect(completing).resolves.toEqual([
            'analysis_result_not_persisted',
            'analysis_pending_cleanup_failed',
        ])
    })

    it('stops cleanup retry when the pending value is replaced', async () => {
        await requireRecordStart()(CTX, () => 1)
        const firstRemove = deferNextStorageRemove('dh_pending_analysis:req-A')
        let releaseDelay!: () => void
        const delay = vi.fn(() => new Promise<void>(resolve => {
            releaseDelay = resolve
        }))
        const attempts: number[] = []
        const completing = requireCompletePersistence()(CTX, completion, {
            delay,
            logCleanupFailure: attempt => { attempts.push(attempt) },
        })
        await vi.waitFor(() => expect(chromeMockSpies.storageRemove).toHaveBeenCalledOnce())
        await firstRemove.reject(new Error('SECRET FIRST REMOVE'))
        await vi.waitFor(() => expect(delay).toHaveBeenCalledWith(50))
        seedStorage({
            'dh_pending_analysis:req-A': {
                caseNumber: CASE_B,
                requestId: 'different-request',
                startTime: 9,
            },
        })
        releaseDelay()

        await expect(completing).resolves.toEqual([])
        expect(attempts).toEqual([1])
        expect(chromeMockSpies.storageRemove).toHaveBeenCalledTimes(1)
        expect(getStorageSnapshot()).toHaveProperty(
            'dh_pending_analysis:req-A.requestId',
            'different-request',
        )
    })
})
