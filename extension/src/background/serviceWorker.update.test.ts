import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  chromeMockSpies,
  deferNextStorageGet,
  dispatchRuntimeMessage,
  emitStartup,
  getStorageSnapshot,
  installChromeMock,
  queueNativePort,
  resetChromeMock,
  seedStorage,
  setActiveTabs,
  setManifestVersion,
} from '../test/chromeMock'
import { UPDATE_STATE_KEY } from './updateRuntime'

vi.mock('./contextMenu', () => ({ setupContextMenu: vi.fn() }))
vi.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: class {
    context = { user: { id: '', authenticatedId: '' } }
    loadAppInsights() {}
    addTelemetryInitializer() {}
    trackEvent() {}
    trackException() {}
  },
}))

const MAIN_HOST = 'com.dynamics.helper.native'
const TX = '0123456789abcdef0123456789abcdef'
const currentVersion = '2.0.75-beta.1'
const targetVersion = '2.0.76-beta.1'
const completionVersion = targetVersion
const candidateWire = {
  version: `v${targetVersion}`,
  url: `https://example.invalid/DynamicsHelper_v${targetVersion}.zip`,
  is_prerelease: true,
}
const candidate = {
  version: targetVersion,
  url: candidateWire.url,
  isPrerelease: true,
}
const committedCompletion = {
  kind: 'complete' as const,
  update: candidate,
  transactionId: TX,
  outcome: 'committed' as const,
}

beforeEach(() => {
  vi.resetModules()
  resetChromeMock()
  installChromeMock()
  setManifestVersion(currentVersion)
  seedStorage({
    telemetryUserId: 'stable-test-user',
    [UPDATE_STATE_KEY]: { kind: 'idle' },
  })
})

async function loadWorker() {
  const worker = await import('./serviceWorker')
  await worker.updateRuntimeReady
  return worker
}

function emitFinal(port: ReturnType<typeof queueNativePort>, request: any, data: unknown) {
  port.emitMessage({
    requestId: request.requestId,
    status: 'success',
    data,
  })
}

async function loadWorkerWithCommittedCompletion() {
  setManifestVersion(completionVersion)
  setActiveTabs([{ id: 42 }, { id: 43 }])
  seedStorage({
    [UPDATE_STATE_KEY]: committedCompletion,
    dh_update_worker_version: completionVersion,
  })
  const port = queueNativePort(MAIN_HOST)
  const worker = await import('./serviceWorker')

  await vi.waitFor(() => expect(port.posted).toHaveLength(1))
  expect(port.posted[0]).toMatchObject({ action: 'get_capabilities' })
  emitFinal(port, port.posted[0], {
    host_version: completionVersion,
    capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
  })
  await vi.waitFor(() => expect(port.posted).toHaveLength(2))
  expect(port.posted[1]).toMatchObject({ action: 'verify_installation' })
  emitFinal(port, port.posted[1], {
    mode: 'packaged',
    integrity: 'verified',
    host_version: completionVersion,
    extension_version: completionVersion,
  })

  await worker.updateRuntimeReady
  return {
    worker,
    port,
    baselines: {
      storageSet: chromeMockSpies.storageSet.mock.calls.length,
      runtimeSend: chromeMockSpies.runtimeSendMessage.mock.calls.length,
      tabSend: chromeMockSpies.tabsSendMessage.mock.calls.length,
      tabsQuery: chromeMockSpies.tabsQuery.mock.calls.length,
    },
  }
}

describe('Service Worker transactional update cutover', () => {
  it('routes Created On only to the sender document and replies without Host, storage, or broadcasts', async () => {
    await loadWorker()
    const caseNumber = '2601190030003106001'
    const documentId = '11111111-2222-3333-4444-555555555555'
    const result = { status: 'ok', caseNumber, createdOnUtc: '2031-04-17T10:23:00.123Z' }
    const executeScript = vi.fn().mockResolvedValue([{ frameId: 0, documentId, result }])
    Object.assign(chrome, { scripting: { executeScript } })
    Object.assign(chrome.runtime, { id: 'test-extension' })
    const listener = chromeMockSpies.runtimeOnMessageAddListener.mock.calls.at(-1)![0]
    const sendResponse = vi.fn()
    const baseline = [chromeMockSpies.storageSet, chromeMockSpies.runtimeSendMessage, chromeMockSpies.tabsSendMessage, chromeMockSpies.connectNative]
      .map(spy => spy.mock.calls.length)
    expect(listener({ type: 'DH_READ_CREATED_ON', caseNumber }, {
      id: chrome.runtime.id, tab: { id: 42 } as chrome.tabs.Tab, frameId: 0, documentId,
      origin: 'https://onesupport.crm.dynamics.com', url: 'https://onesupport.crm.dynamics.com/main.aspx',
    }, sendResponse)).toBe(true)
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledExactlyOnceWith(result))
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 42, documentIds: [documentId] }, world: 'MAIN', args: [caseNumber] }))
    expect([chromeMockSpies.storageSet, chromeMockSpies.runtimeSendMessage, chromeMockSpies.tabsSendMessage, chromeMockSpies.connectNative]
      .map(spy => spy.mock.calls.length)).toEqual(baseline)
  })

  it('relays actual idle no-update discovery, not the initiation ACK or raw payload', async () => {
    await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const response = dispatchRuntimeMessage({ type: 'NATIVE_MSG', payload: { action: 'check_updates' } })
    await vi.waitFor(() => expect(port.posted).toHaveLength(1))
    emitFinal(port, port.posted[0], 'Update check initiated')
    await expect(response).resolves.toEqual({ status: 'success', data: 'Update check initiated' })
    expect(chromeMockSpies.runtimeSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DH_UPDATE_CHECK_RESULT' }),
    )
    const writes = chromeMockSpies.storageSet.mock.calls.length
    port.emitMessage({ action: 'update_not_available', payload: { url: 'private', error: 'private' } })
    await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
      type: 'DH_UPDATE_CHECK_RESULT', outcome: 'not-available',
    }))
    expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(writes)
    expect(chromeMockSpies.runtimeReload).not.toHaveBeenCalled()
  })

  it('blocks manual discovery in transactionless recovery without blocking ordinary ping', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    seedStorage({ [UPDATE_STATE_KEY]: {
      kind: 'recovery-required', code: 'installation_integrity_failed', action: 'recheck-installation',
    } })
    const initializing = worker.updateRuntime.initialize({ resume: false })
    await vi.waitFor(() => expect(port.posted).toHaveLength(1))
    emitFinal(port, port.posted[0], { host_version: currentVersion, capabilities: [] })
    await initializing
    const check = dispatchRuntimeMessage({ type: 'NATIVE_MSG', payload: { action: 'check_updates' } })
    await expect(check).resolves.toMatchObject({ status: 'error', error_code: 'update_temporarily_unavailable' })
    expect(port.posted).toHaveLength(1)
    const ping = dispatchRuntimeMessage({ type: 'NATIVE_MSG', payload: { action: 'ping' } })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    emitFinal(port, port.posted[1], 'pong')
    await expect(ping).resolves.toEqual({ status: 'success', data: 'pong' })
  })

  it('waits for candidate acceptance before relaying only a fixed available result', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response
    let accept!: (state: { kind: 'available'; update: typeof candidate }) => void
    vi.spyOn(worker.updateRuntime, 'acceptCandidate').mockReturnValue(new Promise(resolve => { accept = resolve }))
    port.emitMessage({ action: 'update_available', payload: candidateWire })
    await vi.waitFor(() => expect(worker.updateRuntime.acceptCandidate).toHaveBeenCalledWith(candidate))
    expect(chromeMockSpies.runtimeSendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DH_UPDATE_CHECK_RESULT' }),
    )
    accept({ kind: 'available', update: candidate })
    await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
      type: 'DH_UPDATE_CHECK_RESULT', outcome: 'available',
    }))
  })

  it.each(['idle', 'complete', 'different-candidate', 'recovery', 'failure', 'malformed'])(
    'does not relay available when candidate processing rejects or fails (%s)', async result => {
      const worker = await loadWorker()
      const port = queueNativePort(MAIN_HOST)
      const ping = worker.requestNativeMessage({ action: 'ping' })
      emitFinal(port, port.posted[0], 'pong')
      await ping.response
      const accept = vi.spyOn(worker.updateRuntime, 'acceptCandidate')
      if (result === 'failure') accept.mockRejectedValue(new Error('private-url-and-error'))
      else accept.mockResolvedValue(result === 'complete' ? committedCompletion
        : result === 'different-candidate' ? { kind: 'available', update: { ...candidate, url: 'https://example.invalid/other.zip' } }
        : result === 'recovery' ? { kind: 'recovery-required', code: 'source_update_disabled', action: 'recheck-installation' }
        : { kind: 'idle' })
      port.emitMessage({ action: 'update_available', payload: result === 'malformed' ? { url: 'private' } : candidateWire })
      await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
        type: 'NATIVE_UPDATE_ERROR', payload: { error: 'Update check failed.' },
      }))
      expect(chromeMockSpies.runtimeSendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DH_UPDATE_CHECK_RESULT' }),
      )
    },
  )

  it('settles an unchanged rolled-back candidate without claiming fresh validation', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response
    vi.spyOn(worker.updateRuntime, 'acceptCandidate').mockResolvedValue({ ...committedCompletion, outcome: 'rolled-back' })
    port.emitMessage({ action: 'update_available', payload: candidateWire })
    await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
      type: 'DH_UPDATE_CHECK_RESULT', outcome: 'finished',
    }))
  })

  it('relays discovery errors without raw Host text or URLs', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response
    port.emitMessage({ action: 'update_error', payload: { error: 'private-url-and-error' } })
    await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
      type: 'NATIVE_UPDATE_ERROR', payload: { error: 'Update check failed.' },
    }))
  })

  it.each(['rejected', 'blocked', 'complete'])(
    'reports no-update only after successful coordinator clearing (%s)', async result => {
      const worker = await loadWorker()
      const port = queueNativePort(MAIN_HOST)
      const ping = worker.requestNativeMessage({ action: 'ping' })
      emitFinal(port, port.posted[0], 'pong')
      await ping.response
      const clear = vi.spyOn(worker.updateRuntime, 'clearAvailable')
      if (result === 'rejected') clear.mockRejectedValue(new Error('private'))
      else clear.mockResolvedValue(result === 'complete' ? committedCompletion : {
        kind: 'recovery-required', code: 'installation_integrity_failed', action: 'recheck-installation',
      })
      port.emitMessage({ action: 'update_not_available' })
      await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith(
        result === 'complete' ? { type: 'DH_UPDATE_CHECK_RESULT', outcome: 'not-available' }
          : { type: 'NATIVE_UPDATE_ERROR', payload: { error: 'Update check failed.' } },
      ))
      if (result !== 'complete') expect(chromeMockSpies.runtimeSendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DH_UPDATE_CHECK_RESULT' }),
      )
    },
  )

  it('routes an exact DH_UPDATE_ACK_COMPLETE message to durable committed consumption', async () => {
    const { port, baselines } = await loadWorkerWithCommittedCompletion()

    await expect(dispatchRuntimeMessage({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX,
    })).resolves.toEqual({ handled: true, state: { kind: 'idle' } })

    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({ kind: 'idle' })
    expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(baselines.storageSet + 1)
    expect(chromeMockSpies.storageSet.mock.calls[baselines.storageSet]?.[0]).toEqual({
      [UPDATE_STATE_KEY]: { kind: 'idle' },
    })
    expect(port.posted).toHaveLength(2)
  })

  it('broadcasts persisted completion consumption to runtime and every tab', async () => {
    const { baselines } = await loadWorkerWithCommittedCompletion()
    const event = { type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }
    setActiveTabs([{ id: 42 }, {}, { id: 43 }])

    await dispatchRuntimeMessage({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX,
    })

    expect(chromeMockSpies.runtimeSendMessage.mock.calls.slice(baselines.runtimeSend)).toEqual([
      [event],
    ])
    expect(chromeMockSpies.tabsSendMessage.mock.calls.slice(baselines.tabSend)).toEqual([
      [42, event],
      [43, event],
    ])
  })

  it('leaves completion untouched for malformed completion ACK metadata', async () => {
    const { worker, port, baselines } = await loadWorkerWithCommittedCompletion()
    const getter = vi.fn(() => TX)
    const accessor = { type: 'DH_UPDATE_ACK_COMPLETE' }
    Object.defineProperty(accessor, 'transactionId', { enumerable: true, get: getter })
    const nonEnumerable = { type: 'DH_UPDATE_ACK_COMPLETE' }
    Object.defineProperty(nonEnumerable, 'transactionId', {
      enumerable: false,
      value: TX,
    })
    const toString = vi.fn(() => TX)
    const protoKey = {
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX,
    }
    Object.defineProperty(protoKey, '__proto__', {
      enumerable: true,
      value: { injected: true },
    })
    const malformed: unknown[] = [
      { type: 'DH_UPDATE_ACK_COMPLETE' },
      { type: 'DH_UPDATE_ACK_COMPLETE', transactionId: TX.toUpperCase() },
      { type: 'DH_UPDATE_ACK_COMPLETE', transactionId: { toString } },
      nonEnumerable,
      { type: 'DH_UPDATE_ACK_COMPLETE', transactionId: TX, extra: true },
      { type: 'DH_UPDATE_ACK_COMPLETE', transactionId: TX, [Symbol('extra')]: true },
      accessor,
      protoKey,
    ]

    for (const value of malformed) {
      await expect(dispatchRuntimeMessage(value)).resolves.toEqual({ handled: false })
    }

    expect(getter).not.toHaveBeenCalled()
    expect(toString).not.toHaveBeenCalled()
    expect(worker.updateRuntime.getState()).toEqual(committedCompletion)
    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual(committedCompletion)
    expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(baselines.storageSet)
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(baselines.runtimeSend)
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledTimes(baselines.tabSend)
    expect(chromeMockSpies.tabsQuery).toHaveBeenCalledTimes(baselines.tabsQuery)
    expect(port.posted).toHaveLength(2)
  })

  it('rejects nested completion ACK spoofing through NATIVE_MSG without Host forwarding', async () => {
    const { worker, port, baselines } = await loadWorkerWithCommittedCompletion()

    await expect(dispatchRuntimeMessage({
      type: 'NATIVE_MSG',
      payload: { type: 'DH_UPDATE_ACK_COMPLETE', transactionId: TX },
    })).resolves.toEqual({
      status: 'error',
      error: 'Invalid Extension Native message metadata.',
      error_code: 'invalid_native_message_metadata',
    })

    expect(worker.updateRuntime.getState()).toEqual(committedCompletion)
    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual(committedCompletion)
    expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(baselines.storageSet)
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(baselines.runtimeSend)
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledTimes(baselines.tabSend)
    expect(port.posted).toHaveLength(2)
  })

  it('returns raw correlated Native handles and keeps progress pending', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const pending = worker.requestNativeMessage({ action: 'ping' })

    expect(Object.isFrozen(pending)).toBe(true)
    expect(port.posted).toHaveLength(1)
    const posted = port.posted[0] as any
    expect(posted.requestId).toBe(pending.requestId)
    port.emitMessage({
      requestId: pending.requestId,
      status: 'progress',
      data: 'still working',
    })
    let settled = false
    void pending.response.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    const final = {
      requestId: pending.requestId,
      status: 'success',
      data: 'pong',
    }
    port.emitMessage(final)
    await expect(pending.response).resolves.toEqual(final)
  })

  it('rejects malformed correlated responses instead of hanging', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const pending = worker.requestNativeMessage({ action: 'ping' })

    port.emitMessage({ requestId: pending.requestId, status: 'mystery' })

    await expect(pending.response).rejects.toThrow('Invalid Native Host response')
  })

  it('rejects malformed correlated progress envelopes instead of hanging', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const pending = worker.requestNativeMessage({ action: 'ping' })

    port.emitMessage({
      requestId: pending.requestId,
      status: 'progress',
      data: 7,
    })

    await expect(pending.response).rejects.toThrow('Invalid Native Host response')
  })

  it('rejects correlated progress with extra keys or empty data', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    for (const message of [
      { status: 'progress', data: '', extra: true },
      { status: 'progress', data: '' },
    ]) {
      const pending = worker.requestNativeMessage({ action: 'ping' })
      port.emitMessage({ requestId: pending.requestId, ...message })
      await expect(pending.response).rejects.toThrow('Invalid Native Host response')
    }
  })

  it('ignores unsolicited progress without a correlated request ID', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response

    port.emitMessage({ status: 'progress', data: 'unsafe' })
    await Promise.resolve()

    expect(chromeMockSpies.tabsSendMessage).not.toHaveBeenCalled()
  })

  it('ignores stale correlated update-shaped responses', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const pending = worker.requestNativeMessage({ action: 'ping' })
    pending.cancel()
    void pending.response.catch(() => undefined)

    port.emitMessage({
      requestId: pending.requestId,
      action: 'update_available',
      payload: candidateWire,
    })
    await Promise.resolve()

    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({ kind: 'idle' })
    expect(port.posted).toHaveLength(1)
  })

  it('rejects duplicate live request IDs without replacing the first lease', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const first = worker.requestNativeMessage({ action: 'ping', requestId: 'duplicate' })

    expect(() => worker.requestNativeMessage({
      action: 'ping',
      requestId: 'duplicate',
    })).toThrow('Duplicate Native Host request ID')
    port.emitMessage({ requestId: 'duplicate', status: 'success', data: 'pong' })
    await expect(first.response).resolves.toMatchObject({ data: 'pong' })
  })

  it('does not let an old port disconnect reject a newer port lease', async () => {
    const worker = await loadWorker()
    const oldPort = queueNativePort(MAIN_HOST)
    const oldPending = worker.requestNativeMessage({ action: 'ping' })
    vi.mocked(oldPort.port.postMessage).mockImplementationOnce(() => {
      throw new Error('old post failed')
    })
    expect(() => worker.requestNativeMessage({ action: 'ping' })).toThrow('old post failed')

    const newPort = queueNativePort(MAIN_HOST)
    const current = worker.requestNativeMessage({ action: 'ping' })
    oldPort.emitDisconnect()
    emitFinal(newPort, newPort.posted[0], 'pong')

    await expect(oldPending.response).rejects.toThrow('Native Host disconnected unexpectedly')
    await expect(current.response).resolves.toMatchObject({ data: 'pong' })
  })

  it('returns handled false for invalid outer completion ACK metadata without invoking getters', async () => {
    await loadWorker()
    const getter = vi.fn(() => 'DH_UPDATE_ACK_COMPLETE')
    const message = {}
    Object.defineProperty(message, 'type', { enumerable: true, get: getter })
    const listener = chromeMockSpies.runtimeOnMessageAddListener.mock.calls.at(-1)?.[0]
    const sendResponse = vi.fn()
    const toString = vi.fn(() => 'DH_UPDATE_ACK_COMPLETE')
    const descriptorLookup = vi.fn((_target: object, _property: PropertyKey) => ({
      configurable: true,
      enumerable: true,
      get: getter,
    }))
    const proxy = new Proxy({}, {
      getOwnPropertyDescriptor: descriptorLookup,
      get: () => { throw new Error('unexpected get trap') },
      getPrototypeOf: () => { throw new Error('unexpected prototype trap') },
      has: () => { throw new Error('unexpected has trap') },
      ownKeys: () => { throw new Error('unexpected ownKeys trap') },
    })

    expect(listener?.(message, {} as chrome.runtime.MessageSender, sendResponse)).toBe(false)
    expect(sendResponse).toHaveBeenCalledWith({ handled: false })
    await expect(dispatchRuntimeMessage({ type: { toString } })).resolves.toEqual({ handled: false })
    await expect(dispatchRuntimeMessage(proxy)).resolves.toEqual({ handled: false })
    await expect(dispatchRuntimeMessage({})).resolves.toBeUndefined()
    await expect(dispatchRuntimeMessage(Object.create({ type: 'NATIVE_MSG' }))).resolves.toBeUndefined()
    await expect(dispatchRuntimeMessage([])).resolves.toBeUndefined()
    await expect(dispatchRuntimeMessage(undefined)).resolves.toBeUndefined()
    await expect(dispatchRuntimeMessage(null)).resolves.toBeUndefined()
    await expect(dispatchRuntimeMessage(7)).resolves.toBeUndefined()
    await expect(dispatchRuntimeMessage('NATIVE_MSG')).resolves.toBeUndefined()
    expect(getter).not.toHaveBeenCalled()
    expect(toString).not.toHaveBeenCalled()
    expect(descriptorLookup).toHaveBeenCalledOnce()
    expect(descriptorLookup.mock.calls[0]?.[1]).toBe('type')
    expect(chromeMockSpies.connectNative).not.toHaveBeenCalled()
  })

  it('ignores a revoked runtime message proxy without throwing or causing effects', async () => {
    await loadWorker()
    const baselines = {
      storageSet: chromeMockSpies.storageSet.mock.calls.length,
      runtimeSend: chromeMockSpies.runtimeSendMessage.mock.calls.length,
      tabSend: chromeMockSpies.tabsSendMessage.mock.calls.length,
      tabsQuery: chromeMockSpies.tabsQuery.mock.calls.length,
    }
    const { proxy, revoke } = Proxy.revocable({}, {})
    revoke()

    await expect(dispatchRuntimeMessage(proxy)).resolves.toBeUndefined()

    expect(chromeMockSpies.connectNative).not.toHaveBeenCalled()
    expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(baselines.storageSet)
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(baselines.runtimeSend)
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledTimes(baselines.tabSend)
    expect(chromeMockSpies.tabsQuery).toHaveBeenCalledTimes(baselines.tabsQuery)
  })

  it('leaves type ownership unproven when a runtime message descriptor trap throws', async () => {
    await loadWorker()
    const baselines = {
      storageSet: chromeMockSpies.storageSet.mock.calls.length,
      runtimeSend: chromeMockSpies.runtimeSendMessage.mock.calls.length,
      tabSend: chromeMockSpies.tabsSendMessage.mock.calls.length,
      tabsQuery: chromeMockSpies.tabsQuery.mock.calls.length,
    }
    const descriptorLookup = vi.fn((_target: object, _property: PropertyKey) => {
      throw new Error('descriptor unavailable')
    })
    const get = vi.fn(() => { throw new Error('unexpected get trap') })
    const getPrototypeOf = vi.fn(() => { throw new Error('unexpected prototype trap') })
    const has = vi.fn(() => { throw new Error('unexpected has trap') })
    const ownKeys = vi.fn(() => { throw new Error('unexpected ownKeys trap') })
    const proxy = new Proxy({}, {
      getOwnPropertyDescriptor: descriptorLookup,
      get,
      getPrototypeOf,
      has,
      ownKeys,
    })

    await expect(dispatchRuntimeMessage(proxy)).resolves.toBeUndefined()

    expect(descriptorLookup).toHaveBeenCalledOnce()
    expect(descriptorLookup.mock.calls[0]?.[1]).toBe('type')
    expect(get).not.toHaveBeenCalled()
    expect(getPrototypeOf).not.toHaveBeenCalled()
    expect(has).not.toHaveBeenCalled()
    expect(ownKeys).not.toHaveBeenCalled()
    expect(chromeMockSpies.connectNative).not.toHaveBeenCalled()
    expect(chromeMockSpies.storageSet).toHaveBeenCalledTimes(baselines.storageSet)
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(baselines.runtimeSend)
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledTimes(baselines.tabSend)
    expect(chromeMockSpies.tabsQuery).toHaveBeenCalledTimes(baselines.tabsQuery)
  })

  it.each(['ping', 'check_updates'])('hydrates update state before forwarding %s', async action => {
    const hydration = deferNextStorageGet(UPDATE_STATE_KEY)
    const worker = await import('./serviceWorker')
    const responsePromise = dispatchRuntimeMessage({
      type: 'NATIVE_MSG',
      payload: { action },
    })
    await Promise.resolve()
    expect(chromeMockSpies.connectNative.mock.calls.some(
      ([name]) => name === MAIN_HOST,
    )).toBe(false)

    const port = queueNativePort(MAIN_HOST)
    await hydration.resolve(undefined)
    await vi.waitFor(() => expect(port.posted).toHaveLength(1))
    emitFinal(port, port.posted[0], 'pong')
    await expect(responsePromise).resolves.toEqual({ status: 'success', data: 'pong' })
    await worker.updateRuntimeReady
  })

  it('suppresses ordinary main-Host traffic during an active transaction', async () => {
    seedStorage({
      [UPDATE_STATE_KEY]: {
        kind: 'activating',
        update: candidate,
        transactionId: TX,
        targetVersion,
        priorVersion: currentVersion,
        activationRetryUsed: false,
      },
    })
    await loadWorker()

    const response = await dispatchRuntimeMessage({
      type: 'NATIVE_MSG',
      payload: { action: 'ping' },
    })

    expect(response).toEqual({
      status: 'error',
      error_code: 'update_temporarily_unavailable',
      error: 'Dynamics Helper is temporarily unavailable while an update is in progress.',
    })
    expect(chromeMockSpies.connectNative.mock.calls.some(
      ([name]) => name === MAIN_HOST,
    )).toBe(false)
  })

  it('rejects coordinator-only actions through generic NATIVE_MSG', async () => {
    await loadWorker()
    for (const action of [
      'perform_update',
      'activate_update',
      'finalize_update_status',
      'acknowledge_update_finalization',
    ]) {
      const response = await dispatchRuntimeMessage({
        type: 'NATIVE_MSG',
        payload: { action },
      })
      expect(response).toEqual({
        status: 'error',
        error: 'Invalid Extension Native message metadata.',
        error_code: 'invalid_native_message_metadata',
      })
    }
    expect(chromeMockSpies.connectNative).not.toHaveBeenCalled()
  })

  it('maps a validated unsolicited candidate and broadcasts projected state', async () => {
    setActiveTabs([{ id: 42 }, { id: 43 }])
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response

    port.emitMessage({ action: 'update_available', payload: candidateWire })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    emitFinal(port, port.posted[1], {
      host_version: currentVersion,
      capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
    })
    await vi.waitFor(() => expect(port.posted).toHaveLength(3))
    emitFinal(port, port.posted[2], {
      mode: 'packaged',
      integrity: 'verified',
      host_version: currentVersion,
      extension_version: currentVersion,
    })

    await vi.waitFor(() => expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({
      kind: 'available',
      update: candidate,
    }))
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    })
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledWith(42, {
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    })
    expect(chromeMockSpies.tabsSendMessage).toHaveBeenCalledWith(43, {
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    })
    expect(chromeMockSpies.tabsQuery).toHaveBeenCalledWith({})
    await vi.waitFor(() => expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledWith({
      type: 'DH_UPDATE_CHECK_RESULT', outcome: 'available',
    }))
  })

  it('clears durable availability when a fresh check reports no update', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response

    port.emitMessage({ action: 'update_available', payload: candidateWire })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    emitFinal(port, port.posted[1], {
      host_version: currentVersion,
      capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
    })
    await vi.waitFor(() => expect(port.posted).toHaveLength(3))
    emitFinal(port, port.posted[2], {
      mode: 'packaged',
      integrity: 'verified',
      host_version: currentVersion,
      extension_version: currentVersion,
    })
    await vi.waitFor(() => expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toMatchObject({
      kind: 'available',
    }))

    port.emitMessage({ action: 'update_not_available', payload: { version: currentVersion } })

    await vi.waitFor(() => expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({ kind: 'idle' }))
  })

  it('preserves a private candidate across a normal worker restart without checking for updates', async () => {
    seedStorage({
      telemetryUserId: 'stable-test-user',
      [UPDATE_STATE_KEY]: { kind: 'available', update: candidate },
    })
    const port = queueNativePort(MAIN_HOST)
    const worker = await import('./serviceWorker')

    await vi.waitFor(() => expect(port.posted).toHaveLength(1))
    expect(port.posted[0]).toMatchObject({ action: 'get_capabilities' })
    emitFinal(port, port.posted[0], {
      host_version: currentVersion,
      capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
    })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    expect(port.posted[1]).toMatchObject({ action: 'verify_installation' })
    emitFinal(port, port.posted[1], {
      mode: 'packaged',
      integrity: 'verified',
      host_version: currentVersion,
      extension_version: currentVersion,
    })
    await worker.updateRuntimeReady

    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({
      kind: 'available',
      update: candidate,
    })
    expect(port.posted).toHaveLength(2)
  })

  it('extension reload triggers onInstalled and a no-update response clears a private candidate', async () => {
    seedStorage({
      telemetryUserId: 'stable-test-user',
      [UPDATE_STATE_KEY]: { kind: 'available', update: candidate },
    })
    const port = queueNativePort(MAIN_HOST)
    const worker = await import('./serviceWorker')

    await vi.waitFor(() => expect(port.posted).toHaveLength(1))
    emitFinal(port, port.posted[0], {
      host_version: currentVersion,
      capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
    })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    emitFinal(port, port.posted[1], {
      mode: 'packaged',
      integrity: 'verified',
      host_version: currentVersion,
      extension_version: currentVersion,
    })
    await worker.updateRuntimeReady
    expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toMatchObject({ kind: 'available' })

    chrome.runtime.reload()

    await vi.waitFor(() => expect(port.posted).toHaveLength(3))
    expect(port.posted[2]).toMatchObject({ action: 'check_updates' })
    emitFinal(port, port.posted[2], 'Update check initiated')
    port.emitMessage({ action: 'update_not_available', payload: { version: currentVersion } })

    await vi.waitFor(() => expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({ kind: 'idle' }))
  })

  it('requests a nonblocking update check on browser startup', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)

    emitStartup()

    await vi.waitFor(() => expect(port.posted).toHaveLength(1))
    expect(port.posted[0]).toMatchObject({ action: 'check_updates' })
    emitFinal(port, port.posted[0], 'Update check initiated')
    await worker.updateRuntimeReady
  })

  it('persists installer guidance for a mixed or old Host capability', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response
    port.emitMessage({ action: 'update_available', payload: candidateWire })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    emitFinal(port, port.posted[1], {
      host_version: currentVersion,
      capabilities: ['prompt-scope-v1'],
    })

    await vi.waitFor(() => expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({
      kind: 'recovery-required',
      code: 'installation_integrity_failed',
      action: 'recheck-installation',
    }))
  })

  it('projects source update disabled without allocating a transaction', async () => {
    const worker = await loadWorker()
    const port = queueNativePort(MAIN_HOST)
    const ping = worker.requestNativeMessage({ action: 'ping' })
    emitFinal(port, port.posted[0], 'pong')
    await ping.response
    port.emitMessage({ action: 'update_available', payload: candidateWire })
    await vi.waitFor(() => expect(port.posted).toHaveLength(2))
    emitFinal(port, port.posted[1], {
      host_version: currentVersion,
      capabilities: ['prompt-scope-v1', 'transactional-update-v1'],
    })
    await vi.waitFor(() => expect(port.posted).toHaveLength(3))
    emitFinal(port, port.posted[2], {
      mode: 'development',
      integrity: 'development',
      host_version: currentVersion,
    })

    await vi.waitFor(() => expect(getStorageSnapshot()[UPDATE_STATE_KEY]).toEqual({
      kind: 'recovery-required',
      code: 'source_update_disabled',
      action: 'recheck-installation',
    }))
    const beforeStart = port.posted.length
    expect(await dispatchRuntimeMessage({ type: 'DH_UPDATE_START' })).toEqual({
      handled: true,
      state: {
        kind: 'recovery-required',
        code: 'source_update_disabled',
        action: 'recheck-installation',
      },
    })
    expect(port.posted).toHaveLength(beforeStart)
  })

  it('routes payload-free update UI messages and registers the alarm listener', async () => {
    await loadWorker()
    expect(await dispatchRuntimeMessage({ type: 'DH_UPDATE_GET_STATE' })).toEqual({
      handled: true,
      state: { kind: 'idle' },
    })
    expect(await dispatchRuntimeMessage({
      type: 'DH_UPDATE_GET_STATE',
      payload: null,
    })).toEqual({ handled: false })
    expect(chromeMockSpies.alarmsOnAlarmAddListener).toHaveBeenCalledTimes(1)
  })

  it('creates transaction IDs from exactly sixteen random bytes', async () => {
    const random = vi.spyOn(crypto, 'getRandomValues').mockImplementation(array => {
      expect(array).toBeInstanceOf(Uint8Array)
      expect(array.byteLength).toBe(16)
      ;(array as Uint8Array).set(Array.from({ length: 16 }, (_, index) => index))
      return array
    })
    const worker = await loadWorker()
    expect(worker.createTransactionId()).toBe('000102030405060708090a0b0c0d0e0f')
    random.mockRestore()
  })
})
