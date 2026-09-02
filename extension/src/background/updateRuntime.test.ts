import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STATUS_HOST_NAME,
  UPDATE_ALARM_NAME,
  UPDATE_STATE_KEY,
  createStatusPortSender,
  createUpdateRuntime,
  isStrictlyNewerVersion,
  parseAcknowledgeResponse,
  parseActivateResponse,
  parseFinalizationReceipt,
  parseFinalizeResponse,
  parsePrepareResponse,
  parseStatusResponse,
  parseTransactionId,
  parseUpdateCandidate,
  parseUpdateState,
  type NativePendingRequest,
  type UpdateRuntimeDeps,
  type UpdateState,
} from './updateRuntime'
import {
  chromeMockSpies,
  deferNextStorageGet,
  deferNextStorageRemove,
  deferNextStorageSet,
  emitAlarm,
  getStorageSnapshot,
  installChromeMock,
  queueNativePort,
  resetChromeMock,
  seedStorage,
  setManifestVersion,
} from '../test/chromeMock'

installChromeMock()

beforeEach(() => {
  resetChromeMock()
  installChromeMock()
  setManifestVersion('2.0.75-beta.1')
})

const TX = '0123456789abcdef0123456789abcdef'
const candidate = Object.freeze({
  version: '2.0.76-beta.1',
  url: 'https://example.invalid/DynamicsHelper_v2.0.76-beta.1.zip',
  isPrerelease: true,
})
const transaction = Object.freeze({
  update: candidate,
  transactionId: TX,
  targetVersion: candidate.version,
  priorVersion: '2.0.75-beta.1',
})

function accessorRecord(values: Record<string, unknown>, accessorKey: string): unknown {
  const value = { ...values }
  Object.defineProperty(value, accessorKey, {
    enumerable: true,
    get: () => {
      throw new Error('must not invoke accessor')
    },
  })
  return value
}

describe('update runtime strict parsers', () => {
  it('freezes fixed public identifiers', () => {
    expect(UPDATE_STATE_KEY).toBe('dh_update_state')
    expect(UPDATE_ALARM_NAME).toBe('dh-reliable-update-resume')
    expect(STATUS_HOST_NAME).toBe('com.dynamics.helper.update_status')
  })

  it('normalizes one candidate tag prefix and requires a direct HTTPS ZIP URL', () => {
    expect(parseUpdateCandidate({
      version: 'V2.0.76-beta.1',
      url: candidate.url,
      isPrerelease: true,
    })).toEqual(candidate)

    const invalid = [
      { ...candidate, version: 'vv2.0.76-beta.1' },
      { ...candidate, version: '02.0.76' },
      { ...candidate, version: '2.0.76+build' },
      { ...candidate, url: 'http://example.invalid/update.zip' },
      { ...candidate, url: 'https://example.invalid/release' },
      { ...candidate, url: 'https://user@example.invalid/update.zip' },
      { ...candidate, url: 'https://example.invalid/update.zip#fragment' },
      { ...candidate, isPrerelease: 'true' },
      { ...candidate, extra: true },
      accessorRecord(candidate, 'version'),
    ]
    for (const value of invalid) expect(parseUpdateCandidate(value)).toBeNull()
  })

  it('parses only exact lowercase transaction IDs', () => {
    expect(parseTransactionId(TX)).toBe(TX)
    for (const value of [TX.toUpperCase(), 'a'.repeat(31), 'g'.repeat(32), 7, null]) {
      expect(parseTransactionId(value)).toBeNull()
    }
  })

  it('uses strict SemVer precedence', () => {
    const cases: Array<[string, string, boolean]> = [
      ['2.0.76', '2.0.75', true],
      ['2.0.76-beta.1', '2.0.75', true],
      ['2.0.76', '2.0.76-beta.2', true],
      ['2.0.76-beta.2', '2.0.76-beta.1', true],
      ['2.0.76-beta', '2.0.76-beta.1', false],
      ['2.0.76', '2.0.76', false],
      ['2.0.75', '2.0.76', false],
    ]
    for (const [target, prior, expected] of cases) {
      expect(isStrictlyNewerVersion(target, prior)).toBe(expected)
    }
    expect(isStrictlyNewerVersion('v2.0.76', '2.0.75')).toBe(false)
    expect(isStrictlyNewerVersion(
      '2.0.76-9007199254740993',
      '2.0.76-9007199254740992',
    )).toBe(true)
    expect(isStrictlyNewerVersion(
      '2.0.76-9007199254740992',
      '2.0.76-9007199254740993',
    )).toBe(false)
  })

  it('parses every exact persisted state and rejects inconsistent transactions', () => {
    const status = {
      transactionId: TX,
      phase: 'host-installed',
      targetVersion: candidate.version,
      reasonCode: null,
    }
    const receipt = {
      transactionId: TX,
      outcome: 'committed',
      terminal_version: { fresh_install: false, version: candidate.version },
      state: 'finalized-awaiting-ack',
    } as const
    const states: UpdateState[] = [
      { kind: 'idle' },
      { kind: 'available', update: candidate },
      { kind: 'preparing', ...transaction },
      { kind: 'preparing', ...transaction, errorCode: 'update_prepare_failed' },
      { kind: 'activating', ...transaction, activationRetryUsed: false },
      {
        kind: 'polling',
        ...transaction,
        lastStatus: status,
        lastProgressAt: 10,
        recoveryKick: 'unused',
      },
      { kind: 'reload-pending', ...transaction, outcome: 'committed' },
      { kind: 'ack-pending', ...transaction, receipt },
      { kind: 'complete', update: candidate, outcome: 'rolled-back' },
      {
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action: 'resume',
        transaction,
      },
      {
        kind: 'recovery-required',
        code: 'installation_integrity_failed',
        action: 'recheck-installation',
      },
    ]
    for (const state of states) {
      const parsed = parseUpdateState(state)
      expect(parsed).toEqual(state)
      expect(Object.isFrozen(parsed)).toBe(true)
    }

    const invalid = [
      { kind: 'unknown' },
      { kind: 'idle', extra: true },
      { kind: 'available', update: { ...candidate, version: 'v2.0.76-beta.1' } },
      { kind: 'preparing', ...transaction, transactionId: TX.toUpperCase() },
      { kind: 'preparing', ...transaction, targetVersion: '2.0.77' },
      { kind: 'preparing', ...transaction, priorVersion: candidate.version },
      { kind: 'activating', ...transaction, activationRetryUsed: 0 },
      {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: Number.NaN,
        recoveryKick: 'unused',
      },
      { kind: 'ack-pending', ...transaction, receipt: { ...receipt, transactionId: 'f'.repeat(32) } },
      {
        kind: 'ack-pending',
        ...transaction,
        receipt: {
          ...receipt,
          terminal_version: { fresh_install: false, version: transaction.priorVersion },
        },
      },
      {
        kind: 'ack-pending',
        ...transaction,
        receipt: {
          transactionId: TX,
          outcome: 'rolled-back',
          terminal_version: { fresh_install: false, version: candidate.version },
          state: 'finalized-awaiting-ack',
        },
      },
      accessorRecord({ kind: 'idle' }, 'kind'),
    ]
    for (const value of invalid) expect(parseUpdateState(value)).toBeNull()
  })

  it('parses exact correlated Host action responses and fixed errors', () => {
    const prepare = {
      requestId: 'prepare-1',
      status: 'success',
      data: {
        state: 'update_prepared',
        transactionId: TX,
        targetVersion: candidate.version,
        priorVersion: transaction.priorVersion,
      },
    }
    expect(parsePrepareResponse('prepare-1', prepare)).toEqual({
      ok: true,
      data: prepare.data,
    })
    expect(parseActivateResponse('activate-1', {
      requestId: 'activate-1',
      status: 'success',
      data: { state: 'update_activated', transactionId: TX },
    })).toEqual({
      ok: true,
      data: { state: 'update_activated', transactionId: TX },
    })
    expect(parseAcknowledgeResponse('ack-1', {
      requestId: 'ack-1',
      status: 'success',
      data: { transactionId: TX, acknowledged: true },
    })).toEqual({
      ok: true,
      data: { transactionId: TX, acknowledged: true },
    })
    expect(parsePrepareResponse('prepare-1', {
      requestId: 'prepare-1',
      status: 'error',
      error_code: 'update_prepare_failed',
      error: 'The update could not be prepared. Retry or run the matching full installer.',
    })).toEqual({ ok: false, errorCode: 'update_prepare_failed' })

    expect(parsePrepareResponse('prepare-1', { ...prepare, requestId: 'wrong' })).toBeNull()
    expect(parsePrepareResponse('prepare-1', { ...prepare, extra: true })).toBeNull()
    expect(parsePrepareResponse('prepare-1', accessorRecord(prepare, 'status'))).toBeNull()
    expect(parsePrepareResponse('prepare-1', {
      requestId: 'prepare-1',
      status: 'error',
      error_code: 'update_prepare_failed',
      error: 'raw unsafe replacement',
    })).toBeNull()
  })

  it('parses exact status evidence and finalization receipts', () => {
    const statusEnvelope = {
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'rolling-back',
        targetVersion: candidate.version,
        reasonCode: 'host_install_failed',
      },
    }
    expect(parseStatusResponse('status-1', statusEnvelope)).toEqual({
      ok: true,
      data: statusEnvelope.data,
    })
    expect(parseStatusResponse('status-1', {
      ...statusEnvelope,
      data: { ...statusEnvelope.data, phase: 'future-phase' },
    })).toBeNull()
    expect(parseStatusResponse('status-1', { ...statusEnvelope, extra: true })).toBeNull()
    expect(parseStatusResponse('status-error', {
      requestId: 'status-error',
      status: 'error',
      error_code: 'unknown_transaction',
    })).toEqual({ ok: false, errorCode: 'unknown_transaction' })

    const receipt = {
      transactionId: TX,
      outcome: 'rolled-back',
      terminal_version: {
        fresh_install: false,
        version: transaction.priorVersion,
      },
      state: 'finalized-awaiting-ack',
    }
    expect(parseFinalizationReceipt(receipt)).toEqual(receipt)
    expect(parseFinalizeResponse('finalize-1', {
      requestId: 'finalize-1',
      status: 'success',
      data: receipt,
    })).toEqual({ ok: true, data: receipt })
    expect(parseFinalizationReceipt({
      ...receipt,
      terminal_version: { fresh_install: true, version: transaction.priorVersion },
    })).toBeNull()
    expect(parseFinalizationReceipt({ ...receipt, extra: true })).toBeNull()
  })

  it('reads state and response discriminators from one descriptor snapshot', () => {
    let kindReads = 0
    const state = new Proxy({ kind: 'idle' }, {
      getOwnPropertyDescriptor(target, property) {
        if (property === 'kind') kindReads += 1
        return Reflect.getOwnPropertyDescriptor(target, property)
      },
    })
    expect(parseUpdateState(state)).toEqual({ kind: 'idle' })
    expect(kindReads).toBe(1)

    let statusReads = 0
    const response = new Proxy({
      requestId: 'activate-1',
      status: 'success',
      data: { state: 'update_activated', transactionId: TX },
    }, {
      getOwnPropertyDescriptor(target, property) {
        if (property === 'status') statusReads += 1
        return Reflect.getOwnPropertyDescriptor(target, property)
      },
    })
    expect(parseActivateResponse('activate-1', response)).not.toBeNull()
    expect(statusReads).toBe(1)
  })
})

function deferredPending(requestId: string): {
  pending: NativePendingRequest
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: unknown) => void
  let reject!: (reason?: unknown) => void
  const response = new Promise<unknown>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {
    pending: Object.freeze({ requestId, response, cancel: vi.fn() }),
    resolve,
    reject,
  }
}

function runtimeDeps(overrides: Partial<UpdateRuntimeDeps> = {}): UpdateRuntimeDeps {
  return {
    requestMain: vi.fn(() => deferredPending('unused').pending),
    requestStatus: vi.fn(() => deferredPending('unused-status').pending),
    createTransactionId: vi.fn(() => TX),
    now: vi.fn(() => 1_000),
    sleep: vi.fn().mockRejectedValue(new Error('end test polling wake')),
    kickRecovery: vi.fn().mockResolvedValue(undefined),
    broadcast: vi.fn().mockResolvedValue(undefined),
    requestFreshCheck: vi.fn().mockResolvedValue(undefined),
    getVerifiedVersion: vi.fn().mockResolvedValue('2.0.75-beta.1'),
    verifyInstalled: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('status port sender', () => {
  it('uses only the independent status Host and correlates one final response', async () => {
    const port = queueNativePort(STATUS_HOST_NAME)
    const sender = createStatusPortSender()
    const pending = sender({
      action: 'get_update_status',
      payload: { transactionId: TX },
    })

    expect(Object.isFrozen(pending)).toBe(true)
    expect(port.posted).toHaveLength(1)
    expect(port.posted[0]).toMatchObject({
      requestId: pending.requestId,
      action: 'get_update_status',
      payload: { transactionId: TX },
    })
    port.emitMessage({
      requestId: pending.requestId,
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'prepared',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await expect(pending.response).resolves.toMatchObject({ status: 'success' })
    expect(port.disconnect).toHaveBeenCalledTimes(1)
    expect(chromeMockSpies.connectNative).toHaveBeenCalledWith(STATUS_HOST_NAME)
  })

  it('registers listeners before posting and disconnects after synchronous post failure', () => {
    const port = queueNativePort(STATUS_HOST_NAME)
    const order: string[] = []
    vi.mocked(port.port.onMessage.addListener).mockImplementation(listener => {
      order.push('message-listener')
      return undefined
    })
    vi.mocked(port.port.onDisconnect.addListener).mockImplementation(listener => {
      order.push('disconnect-listener')
      return undefined
    })
    vi.mocked(port.port.postMessage).mockImplementation(() => {
      order.push('post')
      throw new Error('post failed')
    })

    expect(() => createStatusPortSender()({
      action: 'get_update_status',
      payload: { transactionId: TX },
    })).toThrow('post failed')

    expect(order).toEqual(['message-listener', 'disconnect-listener', 'post'])
    expect(port.disconnect).toHaveBeenCalledTimes(1)
  })
})

describe('serialized update coordinator', () => {
  it('accepts only newer candidates and isolates nonterminal transactions', async () => {
    const deps = runtimeDeps()
    const runtime = createUpdateRuntime(deps)
    await runtime.initialize()

    await expect(runtime.acceptCandidate({ ...candidate, version: '2.0.75-beta.1' }))
      .resolves.toEqual({ kind: 'idle' })
    await expect(runtime.acceptCandidate(candidate)).resolves.toEqual({
      kind: 'available',
      update: candidate,
    })
    seedStorage({ [UPDATE_STATE_KEY]: { kind: 'preparing', ...transaction } })
    const isolated = createUpdateRuntime(runtimeDeps({
      requestMain: vi.fn(() => deferredPending('never').pending),
    }))
    await isolated.initialize({ resume: false })
    await isolated.acceptCandidate({ ...candidate, version: '2.0.77' })
    expect(isolated.getState()).toEqual({ kind: 'preparing', ...transaction })
  })

  it('uses the verified product version when accepting a candidate', async () => {
    const getVerifiedVersion = vi.fn().mockResolvedValue(candidate.version)
    const runtime = createUpdateRuntime(runtimeDeps({ getVerifiedVersion }))
    await runtime.initialize({ resume: false })

    await runtime.acceptCandidate(candidate)

    expect(getVerifiedVersion).toHaveBeenCalledTimes(1)
    expect(runtime.getState()).toEqual({ kind: 'idle' })
  })

  it('serializes ordinary main-Host authorization behind hydration', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const storage = deferNextStorageGet(UPDATE_STATE_KEY)
    const runtime = createUpdateRuntime(runtimeDeps())
    const initializing = runtime.initialize({ resume: false })
    const authorization = runtime.ordinaryMainHostAllowed()
    let settled = false
    void authorization.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)
    await storage.resolve(undefined)
    await initializing
    await expect(authorization).resolves.toBe(false)

    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'preparing',
        ...transaction,
        errorCode: 'update_prepare_failed',
      },
    })
    const safe = createUpdateRuntime(runtimeDeps())
    await safe.initialize({ resume: false })
    await expect(safe.ordinaryMainHostAllowed()).resolves.toBe(true)
  })

  it('keeps ordinary main traffic blocked after hydration fails', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: { kind: 'polling', transactionId: 'unsafe' },
    })
    const runtime = createUpdateRuntime(runtimeDeps())
    await expect(runtime.initialize()).rejects.toThrow('Invalid update state.')
    await expect(runtime.ordinaryMainHostAllowed()).resolves.toBe(false)
  })

  it('rejects candidates in transaction states before verified Host access', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const getVerifiedVersion = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ getVerifiedVersion }))
    await runtime.initialize({ resume: false })
    await runtime.acceptCandidate({ ...candidate, version: '2.0.77' })
    expect(getVerifiedVersion).not.toHaveBeenCalled()
  })

  it('removes legacy availability and requests a fresh check only after durable migration', async () => {
    seedStorage({ pending_update: { version: '9.9.9', url: 'unsafe-old-url' } })
    const remove = deferNextStorageRemove('pending_update')
    const set = deferNextStorageSet(UPDATE_STATE_KEY)
    const requestFreshCheck = vi.fn().mockResolvedValue(undefined)
    const runtime = createUpdateRuntime(runtimeDeps({ requestFreshCheck }))
    const initializing = runtime.initialize()

    expect(requestFreshCheck).not.toHaveBeenCalled()
    await remove.resolve(undefined)
    expect(requestFreshCheck).not.toHaveBeenCalled()
    await set.resolve(undefined)
    await initializing

    expect(getStorageSnapshot().pending_update).toBeUndefined()
    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({ kind: 'idle' })
    expect(requestFreshCheck).toHaveBeenCalledTimes(1)
  })

  it('removes a coexisting legacy key and retries a fresh check after restart', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: { kind: 'idle' },
      pending_update: { version: '9.9.9', url: 'unsafe-old-url' },
    })
    const requestFreshCheck = vi.fn()
      .mockRejectedValueOnce(new Error('host unavailable'))
      .mockResolvedValueOnce(undefined)
    const first = createUpdateRuntime(runtimeDeps({ requestFreshCheck }))
    await first.initialize({ resume: false })
    expect(getStorageSnapshot().pending_update).toBeUndefined()
    expect(requestFreshCheck).toHaveBeenCalledTimes(1)

    const second = createUpdateRuntime(runtimeDeps({ requestFreshCheck }))
    await second.initialize({ resume: false })
    expect(requestFreshCheck).toHaveBeenCalledTimes(2)
  })

  it('does not request a fresh update check while a transaction is active', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'preparing',
        ...transaction,
        errorCode: 'update_prepare_failed',
      },
      pending_update: { version: '9.9.9', url: 'unsafe-old-url' },
    })
    const requestFreshCheck = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestFreshCheck }))

    await runtime.initialize({ resume: false })

    expect(getStorageSnapshot().pending_update).toBeUndefined()
    expect(requestFreshCheck).not.toHaveBeenCalled()
  })

  it('persists preparing before the prepare RPC and keeps the same ID on explicit retry', async () => {
    seedStorage({ [UPDATE_STATE_KEY]: { kind: 'available', update: candidate } })
    const firstWrite = deferNextStorageSet(UPDATE_STATE_KEY)
    const prepareOne = deferredPending('prepare-1')
    const prepareTwo = deferredPending('prepare-2')
    const requestMain = vi.fn()
      .mockReturnValueOnce(prepareOne.pending)
      .mockReturnValueOnce(prepareTwo.pending)
    const createTransactionId = vi.fn(() => TX)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, createTransactionId }))
    await runtime.initialize({ resume: false })

    const firstStart = runtime.start()
    expect(requestMain).not.toHaveBeenCalled()
    await firstWrite.resolve(undefined)
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    expect(requestMain.mock.calls[0][0]).toEqual({
      action: 'perform_update',
      payload: {
        url: candidate.url,
        transactionId: TX,
        targetVersion: candidate.version,
      },
    })
    prepareOne.resolve({
      requestId: 'prepare-1',
      status: 'error',
      error_code: 'update_prepare_failed',
      error: 'The update could not be prepared. Retry or run the matching full installer.',
    })
    await expect(firstStart).resolves.toEqual({
      kind: 'preparing',
      ...transaction,
      errorCode: 'update_prepare_failed',
    })

    const retry = runtime.start()
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(2))
    expect(requestMain.mock.calls[1][0]).toEqual(requestMain.mock.calls[0][0])
    prepareTwo.resolve({
      requestId: 'prepare-2',
      status: 'error',
      error_code: 'update_prepare_failed',
      error: 'The update could not be prepared. Retry or run the matching full installer.',
    })
    await retry
    expect(createTransactionId).toHaveBeenCalledTimes(1)
  })

  it('persists activation before sending it and enters polling after success', async () => {
    seedStorage({ [UPDATE_STATE_KEY]: { kind: 'preparing', ...transaction } })
    const prepare = deferredPending('prepare-1')
    const activate = deferredPending('activate-1')
    const status = deferredPending('status-1')
    const requestMain = vi.fn()
      .mockReturnValueOnce(prepare.pending)
      .mockReturnValueOnce(activate.pending)
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const retryWrite = deferNextStorageSet(UPDATE_STATE_KEY)
    const activationWrite = deferNextStorageSet(UPDATE_STATE_KEY)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, requestStatus }))
    await runtime.initialize({ resume: false })

    const starting = runtime.start()
    await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1))
    expect(requestMain).not.toHaveBeenCalled()
    await retryWrite.resolve(undefined)
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    const prepareResponse = {
      requestId: 'prepare-1',
      status: 'success',
      data: {
        state: 'update_prepared',
        transactionId: TX,
        targetVersion: candidate.version,
        priorVersion: transaction.priorVersion,
      },
    }
    expect(parsePrepareResponse('prepare-1', prepareResponse)).not.toBeNull()
    prepare.resolve(prepareResponse)
    await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(2))
    await activationWrite.resolve(undefined)
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(2))
    activate.resolve({
      requestId: 'activate-1',
      status: 'success',
      data: { state: 'update_activated', transactionId: TX },
    })
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'waiting-for-host-exit',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    const result = await starting
    expect(result.kind).toBe('polling')
    expect(chromeMockSpies.alarmsCreate).toHaveBeenCalledWith(
      UPDATE_ALARM_NAME,
      { delayInMinutes: 0.5 },
    )
  })

  it('blocks the prepare effect when the preparing state cannot persist', async () => {
    seedStorage({ [UPDATE_STATE_KEY]: { kind: 'available', update: candidate } })
    const write = deferNextStorageSet(UPDATE_STATE_KEY)
    const requestMain = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain }))
    await runtime.initialize({ resume: false })

    const starting = runtime.start()
    await write.reject(new Error('storage unavailable'))
    await expect(starting).rejects.toThrow('Update storage write failed.')
    expect(requestMain).not.toHaveBeenCalled()
    expect(runtime.getState()).toEqual({ kind: 'available', update: candidate })
  })

  it('handles only payload-free update UI messages', async () => {
    const runtime = createUpdateRuntime(runtimeDeps())
    await runtime.initialize({ resume: false })
    expect(await runtime.handleMessage({ type: 'DH_UPDATE_GET_STATE' })).toEqual({
      handled: true,
      state: { kind: 'idle' },
    })
    expect(await runtime.handleMessage({
      type: 'DH_UPDATE_GET_STATE',
      payload: null,
    })).toEqual({ handled: false })
    expect(await runtime.handleMessage({ type: 'unknown' })).toEqual({ handled: false })
  })
})

describe('update coordinator restart and polling', () => {
  it('does not automatically retry a persisted preparing error', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'preparing',
        ...transaction,
        errorCode: 'update_prepare_failed',
      },
    })
    const requestMain = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain }))

    await runtime.initialize()

    expect(requestMain).not.toHaveBeenCalled()
    expect(runtime.getState()).toMatchObject({
      kind: 'preparing',
      errorCode: 'update_prepare_failed',
    })
  })

  it('does not automatically retry a persisted activating error', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'activating',
        ...transaction,
        activationRetryUsed: false,
        errorCode: 'update_activation_failed',
      },
    })
    const requestMain = vi.fn()
    const requestStatus = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, requestStatus }))

    await runtime.initialize()

    expect(requestMain).not.toHaveBeenCalled()
    expect(requestStatus).not.toHaveBeenCalled()
    await expect(runtime.ordinaryMainHostAllowed()).resolves.toBe(false)
  })

  it('persists a cleared preparing retry and rechecks the verified version before RPC', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'preparing',
        ...transaction,
        errorCode: 'update_prepare_failed',
      },
    })
    const write = deferNextStorageSet(UPDATE_STATE_KEY)
    const prepare = deferredPending('prepare-1')
    const requestMain = vi.fn().mockReturnValueOnce(prepare.pending)
    const getVerifiedVersion = vi.fn().mockResolvedValue(transaction.priorVersion)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, getVerifiedVersion }))
    await runtime.initialize({ resume: false })

    const retrying = runtime.start()
    await vi.waitFor(() => expect(getVerifiedVersion).toHaveBeenCalledTimes(1))
    expect(requestMain).not.toHaveBeenCalled()
    await write.resolve(undefined)
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({
      kind: 'preparing',
      ...transaction,
    })
    prepare.resolve({
      requestId: 'prepare-1',
      status: 'error',
      error_code: 'update_prepare_failed',
      error: 'The update could not be prepared. Retry or run the matching full installer.',
    })
    await retrying
  })

  it('blocks a retry when the target is no longer newer than the verified product', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'preparing',
        ...transaction,
        errorCode: 'update_prepare_failed',
      },
    })
    const requestMain = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({
      requestMain,
      getVerifiedVersion: vi.fn().mockResolvedValue(candidate.version),
    }))
    await runtime.initialize({ resume: false })

    await runtime.start()

    expect(requestMain).not.toHaveBeenCalled()
    expect(runtime.getState()).toEqual({
      kind: 'recovery-required',
      code: 'installation_integrity_failed',
      action: 'recheck-installation',
      transaction,
    })
  })

  it('uses status-first verification for an explicit activation retry', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'activating',
        ...transaction,
        activationRetryUsed: false,
        errorCode: 'update_activation_failed',
      },
    })
    const status = deferredPending('status-1')
    const activate = deferredPending('activate-1')
    const waiting = deferredPending('status-2')
    const requestStatus = vi.fn()
      .mockReturnValueOnce(status.pending)
      .mockReturnValueOnce(waiting.pending)
    const requestMain = vi.fn().mockReturnValueOnce(activate.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, requestMain }))
    await runtime.initialize({ resume: false })
    const retrying = runtime.start()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    expect(requestMain).not.toHaveBeenCalled()
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'prepared',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    activate.resolve({
      requestId: 'activate-1',
      status: 'success',
      data: { state: 'update_activated', transactionId: TX },
    })
    waiting.resolve({
      requestId: 'status-2',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'waiting-for-host-exit',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await retrying
  })

  it('queries status before one activating retry after Worker restart', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'activating',
        ...transaction,
        activationRetryUsed: false,
      },
    })
    const status = deferredPending('status-1')
    const activate = deferredPending('activate-1')
    const waiting = deferredPending('status-2')
    const requestStatus = vi.fn()
      .mockReturnValueOnce(status.pending)
      .mockReturnValueOnce(waiting.pending)
    const requestMain = vi.fn().mockReturnValueOnce(activate.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, requestMain }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    expect(requestMain).not.toHaveBeenCalled()
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'prepared',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    expect(requestMain.mock.calls[0][0]).toEqual({
      action: 'activate_update',
      payload: { transactionId: TX },
    })
    activate.resolve({
      requestId: 'activate-1',
      status: 'success',
      data: { state: 'update_activated', transactionId: TX },
    })
    waiting.resolve({
      requestId: 'status-2',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'waiting-for-host-exit',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await initializing
    expect(runtime.getState()).toMatchObject({ kind: 'polling' })
    expect(runtime.getState()).not.toHaveProperty('activationRetryUsed')
  })

  it('does not retry activation when restart status is already later', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'activating',
        ...transaction,
        activationRetryUsed: false,
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const requestMain = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, requestMain }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'host-backed-up',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await initializing
    expect(requestMain).not.toHaveBeenCalled()
    expect(runtime.getState()).toMatchObject({ kind: 'polling' })
  })

  it('polls nonterminal status only and persists terminal state before reload', async () => {
    const polling: UpdateState = {
      kind: 'polling',
      ...transaction,
      lastStatus: null,
      lastProgressAt: 100,
      recoveryKick: 'unused',
    }
    seedStorage({ [UPDATE_STATE_KEY]: polling })
    const terminal = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(terminal.pending)
    const requestMain = vi.fn()
    const reloadWrite = deferNextStorageSet(UPDATE_STATE_KEY)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, requestMain }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    terminal.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'committed',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1))
    expect(chromeMockSpies.runtimeReload).not.toHaveBeenCalled()
    await reloadWrite.resolve(undefined)
    await initializing

    expect(requestMain).not.toHaveBeenCalled()
    expect(runtime.getState()).toEqual({
      kind: 'reload-pending',
      ...transaction,
      outcome: 'committed',
    })
    expect(chromeMockSpies.runtimeReload).toHaveBeenCalledTimes(1)
  })

  it('uses bounded 250/500/1000/2000 polling delays within one wake', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const statuses = Array.from({ length: 5 }, (_, index) => deferredPending(`status-${index}`))
    const requestStatus = vi.fn()
    for (const status of statuses) requestStatus.mockReturnValueOnce(status.pending)
    let clock = 1_000
    const sleep = vi.fn().mockImplementation(async (delay: number) => {
      clock += delay
    })
    const now = vi.fn(() => clock)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, sleep, now }))
    const initializing = runtime.initialize()

    for (let index = 0; index < statuses.length; index += 1) {
      await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(index + 1))
      statuses[index].resolve({
        requestId: `status-${index}`,
        status: 'success',
        data: {
          transactionId: TX,
          phase: index === statuses.length - 1 ? 'committed' : 'host-backed-up',
          targetVersion: candidate.version,
          reasonCode: null,
        },
      })
    }
    await initializing
    expect(sleep.mock.calls.map(call => call[0])).toEqual([250, 500, 1_000, 2_000])
    expect(requestStatus).toHaveBeenCalledTimes(5)
  })

  it('times out an unresolved status request at the wake deadline', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    try {
      seedStorage({
        [UPDATE_STATE_KEY]: {
          kind: 'polling',
          ...transaction,
          lastStatus: null,
          lastProgressAt: 0,
          recoveryKick: 'unused',
        },
      })
      const unresolved = deferredPending('never')
      const requestStatus = vi.fn(() => unresolved.pending)
      const runtime = createUpdateRuntime(runtimeDeps({
        requestStatus,
        now: () => Date.now(),
        sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
      }))
      const initializing = runtime.initialize()
      await vi.advanceTimersByTimeAsync(120_000)
      await initializing
      expect(requestStatus).toHaveBeenCalledTimes(1)
      expect(unresolved.pending.cancel).toHaveBeenCalledTimes(1)
      expect(runtime.getState().kind).toBe('polling')
    } finally {
      vi.useRealTimers()
    }
  })

  it('arms retryable states before effects and clears stale alarms at idle/complete', async () => {
    seedStorage({ [UPDATE_STATE_KEY]: { kind: 'idle' } })
    const idle = createUpdateRuntime(runtimeDeps())
    await idle.initialize({ resume: false })
    expect(chromeMockSpies.alarmsClear).toHaveBeenCalledWith(
      UPDATE_ALARM_NAME,
      expect.any(Function),
    )

    resetChromeMock()
    installChromeMock()
    setManifestVersion('2.0.75-beta.1')
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'preparing',
        ...transaction,
        errorCode: 'update_prepare_failed',
      },
    })
    const prepare = deferredPending('prepare-1')
    const requestMain = vi.fn().mockReturnValueOnce(prepare.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain }))
    await runtime.initialize({ resume: false })
    const retrying = runtime.start()
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    expect(chromeMockSpies.alarmsCreate).toHaveBeenCalledWith(
      UPDATE_ALARM_NAME,
      { delayInMinutes: 0.5 },
    )
    prepare.resolve({
      requestId: 'prepare-1',
      status: 'error',
      error_code: 'update_prepare_failed',
      error: 'The update could not be prepared. Retry or run the matching full installer.',
    })
    await retrying
  })

  it('turns exact status-host errors into transaction-backed recovery', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus }))
    const initializing = runtime.initialize()
    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'error',
      error_code: 'unknown_transaction',
    })
    await initializing
    expect(runtime.getState()).toEqual({
      kind: 'recovery-required',
      code: 'manual_recovery_required',
      action: 'recheck-installation',
      transaction,
    })
  })

  it('rearms a consumed alarm when transaction recovery cannot advance', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'recovery-required',
        code: 'installation_integrity_failed',
        action: 'verify-terminal',
        transaction,
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus }))
    await runtime.initialize({ resume: false })
    runtime.registerAlarmListener()
    chromeMockSpies.alarmsCreate.mockClear()

    emitAlarm(UPDATE_ALARM_NAME)
    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'prepared',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(chromeMockSpies.alarmsCreate).toHaveBeenCalledWith(
      UPDATE_ALARM_NAME,
      { delayInMinutes: 0.5 },
    ))
  })

  it('rearms after malformed recovery status and cancels a timed-out recovery request', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    try {
      seedStorage({
        [UPDATE_STATE_KEY]: {
          kind: 'recovery-required',
          code: 'manual_recovery_required',
          action: 'resume',
          transaction,
        },
      })
      const status = deferredPending('status-1')
      const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
      const runtime = createUpdateRuntime(runtimeDeps({
        requestStatus,
        now: () => Date.now(),
      }))
      const initializing = runtime.initialize()
      await vi.advanceTimersByTimeAsync(120_000)
      await initializing
      expect(status.pending.cancel).toHaveBeenCalledTimes(1)
      expect(chromeMockSpies.alarmsCreate).toHaveBeenCalledWith(
        UPDATE_ALARM_NAME,
        { delayInMinutes: 0.5 },
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('projects recovery-required status during activating restart', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'activating',
        ...transaction,
        activationRetryUsed: false,
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus }))
    const initializing = runtime.initialize()
    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'recovery-required',
        targetVersion: candidate.version,
        reasonCode: 'manual_recovery_required',
      },
    })
    await initializing
    expect(runtime.getState()).toEqual({
      kind: 'recovery-required',
      code: 'manual_recovery_required',
      action: 'recheck-installation',
      transaction,
    })
  })

  it.each([
    ['rollback_failed', 'resume'],
    ['manual_recovery_required', 'recheck-installation'],
  ] as const)('preserves %s journal recovery guidance instead of ordinary polling', async (reasonCode, action) => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const kickRecovery = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, kickRecovery }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'recovery-required',
        targetVersion: candidate.version,
        reasonCode,
      },
    })
    await initializing
    expect(kickRecovery).not.toHaveBeenCalled()
    expect(runtime.getState()).toEqual({
      kind: 'recovery-required',
      code: 'manual_recovery_required',
      action,
      transaction,
    })
  })

  it('persists a pending recovery kick before opening the main Host', async () => {
    const statusValue = {
      transactionId: TX,
      phase: 'host-installed',
      targetVersion: candidate.version,
      reasonCode: null,
    }
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: statusValue,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const kickRecovery = vi.fn().mockResolvedValue(undefined)
    const kickWrite = deferNextStorageSet(UPDATE_STATE_KEY)
    const runtime = createUpdateRuntime(runtimeDeps({
      requestStatus,
      kickRecovery,
      now: vi.fn(() => 31_001),
    }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({ requestId: 'status-1', status: 'success', data: statusValue })
    await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1))
    expect(kickRecovery).not.toHaveBeenCalled()
    await kickWrite.resolve(undefined)
    await initializing
    expect(kickRecovery).toHaveBeenCalledTimes(1)
    expect(runtime.getState()).toMatchObject({
      kind: 'polling',
      recoveryKick: 'confirmed',
    })
  })

  it('queries status before repeating a pending recovery kick after restart', async () => {
    const statusValue = {
      transactionId: TX,
      phase: 'host-installed',
      targetVersion: candidate.version,
      reasonCode: null,
    }
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: statusValue,
        lastProgressAt: 1_000,
        recoveryKick: 'pending',
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const kickRecovery = vi.fn().mockResolvedValue(undefined)
    const runtime = createUpdateRuntime(runtimeDeps({
      requestStatus,
      kickRecovery,
      now: vi.fn(() => 31_001),
    }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    expect(kickRecovery).not.toHaveBeenCalled()
    status.resolve({ requestId: 'status-1', status: 'success', data: statusValue })
    await initializing
    expect(kickRecovery).toHaveBeenCalledTimes(1)
    expect(runtime.getState()).toMatchObject({ recoveryKick: 'confirmed' })
  })

  it('an alarm resumes polling without any UI message', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus }))
    await runtime.initialize({ resume: false })
    runtime.registerAlarmListener()

    emitAlarm('unrelated')
    expect(requestStatus).not.toHaveBeenCalled()
    emitAlarm(UPDATE_ALARM_NAME)
    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'host-installed',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(runtime.getState()).toMatchObject({
      kind: 'polling',
      lastStatus: { phase: 'host-installed' },
    }))
    expect(chromeMockSpies.runtimeOnMessageAddListener).not.toHaveBeenCalled()
  })
})

describe('update coordinator hydration failures', () => {
  it('fails closed on malformed persisted state without external effects', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        transactionId: 'unsafe',
      },
    })
    const requestMain = vi.fn()
    const requestStatus = vi.fn()
    const requestFreshCheck = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({
      requestMain,
      requestStatus,
      requestFreshCheck,
    }))

    await expect(runtime.initialize()).rejects.toThrow('Invalid update state.')
    expect(requestMain).not.toHaveBeenCalled()
    expect(requestStatus).not.toHaveBeenCalled()
    expect(requestFreshCheck).not.toHaveBeenCalled()
    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({
      kind: 'polling',
      transactionId: 'unsafe',
    })
  })
})

describe('update coordinator post-reload finalization', () => {
  it('retains terminal transaction evidence when installation verification fails', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'reload-pending',
        ...transaction,
        outcome: 'committed',
      },
    })
    const requestMain = vi.fn()
    const verifyInstalled = vi.fn().mockResolvedValue(false)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, verifyInstalled }))

    await runtime.initialize()

    expect(verifyInstalled).toHaveBeenCalledWith(transaction, 'committed')
    expect(requestMain).not.toHaveBeenCalled()
    expect(runtime.getState()).toEqual({
      kind: 'recovery-required',
      code: 'installation_integrity_failed',
      action: 'verify-terminal',
      transaction,
    })
  })

  it('persists receipt before acknowledgment and completes exactly once', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'reload-pending',
        ...transaction,
        outcome: 'committed',
      },
    })
    const finalize = deferredPending('finalize-1')
    const acknowledge = deferredPending('ack-1')
    const requestMain = vi.fn()
      .mockReturnValueOnce(finalize.pending)
      .mockReturnValueOnce(acknowledge.pending)
    const receiptWrite = deferNextStorageSet(UPDATE_STATE_KEY)
    const broadcast = vi.fn().mockResolvedValue(undefined)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, broadcast }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    expect(requestMain.mock.calls[0][0]).toEqual({
      action: 'finalize_update_status',
      payload: { transactionId: TX },
    })
    const receipt = {
      transactionId: TX,
      outcome: 'committed' as const,
      terminal_version: { fresh_install: false, version: candidate.version },
      state: 'finalized-awaiting-ack' as const,
    }
    finalize.resolve({
      requestId: 'finalize-1',
      status: 'success',
      data: receipt,
    })
    await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1))
    expect(requestMain).toHaveBeenCalledTimes(1)
    await receiptWrite.resolve(undefined)
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(2))
    expect(requestMain.mock.calls[1][0]).toEqual({
      action: 'acknowledge_update_finalization',
      payload: { transactionId: TX },
    })
    acknowledge.resolve({
      requestId: 'ack-1',
      status: 'success',
      data: { transactionId: TX, acknowledged: true },
    })
    await initializing

    expect(runtime.getState()).toEqual({
      kind: 'complete',
      update: candidate,
      outcome: 'committed',
    })
    expect(broadcast.mock.calls.filter(call => call[0].kind === 'complete')).toHaveLength(1)
    expect(chromeMockSpies.alarmsClear).toHaveBeenCalledWith(
      UPDATE_ALARM_NAME,
      expect.any(Function),
    )
  })

  it('continues reload and Native effects when state broadcasts reject', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'polling',
        ...transaction,
        lastStatus: null,
        lastProgressAt: 1_000,
        recoveryKick: 'unused',
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const broadcast = vi.fn().mockRejectedValue(new Error('no listeners'))
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, broadcast }))
    const initializing = runtime.initialize()
    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'committed',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await initializing
    expect(runtime.getState().kind).toBe('reload-pending')
    expect(chromeMockSpies.runtimeReload).toHaveBeenCalledTimes(1)
  })

  it('keeps reload-pending when the finalization response is lost and retries finalization directly', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'reload-pending',
        ...transaction,
        outcome: 'committed',
      },
    })
    const lost = deferredPending('finalize-1')
    const requestMain = vi.fn().mockReturnValueOnce(lost.pending)
    const requestStatus = vi.fn()
    const first = createUpdateRuntime(runtimeDeps({ requestMain, requestStatus }))
    const initializing = first.initialize()
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    lost.reject(new Error('response lost'))
    await initializing
    expect(first.getState()).toEqual({
      kind: 'reload-pending',
      ...transaction,
      outcome: 'committed',
    })
    expect(requestStatus).not.toHaveBeenCalled()

    const replay = deferredPending('finalize-2')
    const ack = deferredPending('ack-1')
    const replayMain = vi.fn()
      .mockReturnValueOnce(replay.pending)
      .mockReturnValueOnce(ack.pending)
    const second = createUpdateRuntime(runtimeDeps({
      requestMain: replayMain,
      requestStatus,
    }))
    const resuming = second.initialize()
    await vi.waitFor(() => expect(replayMain).toHaveBeenCalledTimes(1))
    expect(requestStatus).not.toHaveBeenCalled()
    replay.resolve({
      requestId: 'finalize-2',
      status: 'success',
      data: {
        transactionId: TX,
        outcome: 'committed',
        terminal_version: { fresh_install: false, version: candidate.version },
        state: 'finalized-awaiting-ack',
      },
    })
    await vi.waitFor(() => expect(replayMain).toHaveBeenCalledTimes(2))
    ack.resolve({
      requestId: 'ack-1',
      status: 'success',
      data: { transactionId: TX, acknowledged: true },
    })
    await resuming
    expect(second.getState().kind).toBe('complete')
  })

  it('keeps reload-pending after malformed finalization so receipt replay stays reachable', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'reload-pending',
        ...transaction,
        outcome: 'committed',
      },
    })
    const finalize = deferredPending('finalize-1')
    const requestMain = vi.fn().mockReturnValueOnce(finalize.pending)
    const requestStatus = vi.fn()
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain, requestStatus }))
    const initializing = runtime.initialize()
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    finalize.resolve({ requestId: 'finalize-1', status: 'success', data: {} })
    await initializing
    expect(runtime.getState()).toEqual({
      kind: 'reload-pending',
      ...transaction,
      outcome: 'committed',
    })
    expect(requestStatus).not.toHaveBeenCalled()
  })

  it.each([
    ['committed', { fresh_install: false, version: transaction.priorVersion }],
    ['committed', { fresh_install: true, version: candidate.version }],
    ['rolled-back', { fresh_install: false, version: candidate.version }],
    ['rolled-back', { fresh_install: true, version: null }],
  ] as const)('rejects a %s receipt with mismatched browser terminal version', async (outcome, terminalVersion) => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'reload-pending',
        ...transaction,
        outcome,
      },
    })
    const finalize = deferredPending('finalize-1')
    const requestMain = vi.fn().mockReturnValueOnce(finalize.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain }))
    const initializing = runtime.initialize()
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    finalize.resolve({
      requestId: 'finalize-1',
      status: 'success',
      data: {
        transactionId: TX,
        outcome,
        terminal_version: terminalVersion,
        state: 'finalized-awaiting-ack',
      },
    })
    await initializing
    expect(requestMain).toHaveBeenCalledTimes(1)
    expect(runtime.getState()).toEqual({
      kind: 'recovery-required',
      code: 'update_cleanup_failed',
      action: 'verify-terminal',
      transaction,
    })
  })

  it('retries acknowledgment from persisted ack-pending without finalizing again', async () => {
    const receipt = {
      transactionId: TX,
      outcome: 'rolled-back' as const,
      terminal_version: { fresh_install: false, version: transaction.priorVersion },
      state: 'finalized-awaiting-ack' as const,
    }
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'ack-pending',
        ...transaction,
        receipt,
      },
    })
    const acknowledge = deferredPending('ack-1')
    const requestMain = vi.fn().mockReturnValueOnce(acknowledge.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestMain }))
    const initializing = runtime.initialize()

    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    expect(requestMain.mock.calls[0][0]).toEqual({
      action: 'acknowledge_update_finalization',
      payload: { transactionId: TX },
    })
    acknowledge.resolve({
      requestId: 'ack-1',
      status: 'success',
      data: { transactionId: TX, acknowledged: true },
    })
    await initializing
    expect(requestMain).toHaveBeenCalledTimes(1)
    expect(runtime.getState()).toEqual({
      kind: 'complete',
      update: candidate,
      outcome: 'rolled-back',
    })
  })

  it('continues installer-repaired terminal evidence through the same transaction', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'recovery-required',
        code: 'installation_integrity_failed',
        action: 'verify-terminal',
        transaction,
      },
    })
    const status = deferredPending('status-1')
    const finalize = deferredPending('finalize-1')
    const acknowledge = deferredPending('ack-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const requestMain = vi.fn()
      .mockReturnValueOnce(finalize.pending)
      .mockReturnValueOnce(acknowledge.pending)
    const runtime = createUpdateRuntime(runtimeDeps({ requestStatus, requestMain }))
    await runtime.initialize({ resume: false })
    const retrying = runtime.start()

    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'committed',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(1))
    finalize.resolve({
      requestId: 'finalize-1',
      status: 'success',
      data: {
        transactionId: TX,
        outcome: 'committed',
        terminal_version: { fresh_install: false, version: candidate.version },
        state: 'finalized-awaiting-ack',
      },
    })
    await vi.waitFor(() => expect(requestMain).toHaveBeenCalledTimes(2))
    acknowledge.resolve({
      requestId: 'ack-1',
      status: 'success',
      data: { transactionId: TX, acknowledged: true },
    })
    await retrying
    expect(runtime.getState()).toEqual({
      kind: 'complete',
      update: candidate,
      outcome: 'committed',
    })
  })

  it('persists reload-pending before reload when resume observes terminal evidence', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'recovery-required',
        code: 'manual_recovery_required',
        action: 'resume',
        transaction,
      },
    })
    const status = deferredPending('status-1')
    const requestStatus = vi.fn().mockReturnValueOnce(status.pending)
    const requestMain = vi.fn()
    const verifyInstalled = vi.fn()
    const write = deferNextStorageSet(UPDATE_STATE_KEY)
    const runtime = createUpdateRuntime(runtimeDeps({
      requestStatus,
      requestMain,
      verifyInstalled,
    }))
    await runtime.initialize({ resume: false })
    const retrying = runtime.start()
    await vi.waitFor(() => expect(requestStatus).toHaveBeenCalledTimes(1))
    status.resolve({
      requestId: 'status-1',
      status: 'success',
      data: {
        transactionId: TX,
        phase: 'committed',
        targetVersion: candidate.version,
        reasonCode: null,
      },
    })
    await vi.waitFor(() => expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(1))
    expect(chromeMockSpies.runtimeReload).not.toHaveBeenCalled()
    expect(verifyInstalled).not.toHaveBeenCalled()
    expect(requestMain).not.toHaveBeenCalled()
    await write.resolve(undefined)
    await retrying
    expect(runtime.getState()).toEqual({
      kind: 'reload-pending',
      ...transaction,
      outcome: 'committed',
    })
    expect(chromeMockSpies.runtimeReload).toHaveBeenCalledTimes(1)
    expect(verifyInstalled).not.toHaveBeenCalled()
    expect(requestMain).not.toHaveBeenCalled()
  })
})
