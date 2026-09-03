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

describe('Service Worker transactional update cutover', () => {
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

  it('ignores accessor-backed runtime messages without invoking them', async () => {
    await loadWorker()
    const getter = vi.fn(() => 'NATIVE_MSG')
    const message = {}
    Object.defineProperty(message, 'type', { enumerable: true, get: getter })

    await expect(dispatchRuntimeMessage(message)).resolves.toBeUndefined()
    expect(getter).not.toHaveBeenCalled()
    expect(chromeMockSpies.connectNative).not.toHaveBeenCalled()
  })

  it('hydrates update state before forwarding an ordinary Native request', async () => {
    const hydration = deferNextStorageGet(UPDATE_STATE_KEY)
    const importing = import('./serviceWorker')
    const worker = await importing
    const responsePromise = dispatchRuntimeMessage({
      type: 'NATIVE_MSG',
      payload: { action: 'ping' },
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
