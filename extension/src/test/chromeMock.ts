import { vi } from 'vitest'

// Hand-rolled chrome.* stub for unit tests.
//
// Design rules:
// - Default sendMessage response is a never-resolving promise. This makes
//   forgotten mocks surface as test timeouts rather than silent passes that
//   accidentally use undefined response data.
// - deferNextResponse(action) lets the test caller decide WHEN to resolve
//   the response (timing-sensitive tests like hydration window need this).
// - resolveNext / rejectNext fire pending deferrals in FIFO order per action.
// - storage uses an in-memory Map; reset via resetChromeMock() in beforeEach.

type DeferredResponse = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  promise: Promise<unknown>
}

type PendingMap = Map<string, DeferredResponse[]>

let pendingByAction: PendingMap = new Map()
let storageData: Record<string, unknown> = {}
let messageLog: Array<{ action: string; payload: unknown }> = []

function makeDeferred(): DeferredResponse {
  let resolve!: (v: unknown) => void
  let reject!: (r?: unknown) => void
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { resolve, reject, promise }
}

export function resetChromeMock(): void {
  pendingByAction = new Map()
  storageData = {}
  messageLog = []
}

/**
 * Queue a deferred response for the next sendMessage call whose payload.action
 * matches. Returns handles so the test can resolve/reject when ready.
 *
 * Usage:
 *   const d = deferNextResponse('get_config')
 *   render(<Options />)
 *   // ... do timing-sensitive things while RPC is in flight ...
 *   d.resolve({ status: 'success', config: { ... } })
 */
export function deferNextResponse(action: string): DeferredResponse {
  const deferred = makeDeferred()
  const list = pendingByAction.get(action) ?? []
  list.push(deferred)
  pendingByAction.set(action, list)
  return deferred
}

export function getMessageLog(): ReadonlyArray<{ action: string; payload: unknown }> {
  return messageLog
}

const sendMessage = vi.fn((payload: unknown, maybeCallback?: unknown) => {
  const action =
    payload && typeof payload === 'object' && 'action' in payload
      ? String((payload as { action: unknown }).action)
      : payload && typeof payload === 'object' && 'payload' in payload &&
          (payload as { payload?: unknown }).payload &&
          typeof (payload as { payload: { action?: unknown } }).payload === 'object' &&
          'action' in (payload as { payload: { action?: unknown } }).payload
        ? String((payload as { payload: { action: unknown } }).payload.action)
        : '<unknown>'
  messageLog.push({ action, payload })

  const queue = pendingByAction.get(action)
  const callback = typeof maybeCallback === 'function' ? (maybeCallback as (r: unknown) => void) : undefined

  if (queue && queue.length > 0) {
    const next = queue.shift()!
    if (callback) {
      // Callback-style: fire callback when the deferred resolves.
      // Real chrome.runtime.sendMessage delivers via callback async.
      void next.promise.then(
        (value) => callback(value),
        () => {
          // Simulate lastError path: callback fires with undefined response.
          // Tests can pre-set chrome.runtime.lastError before rejecting if
          // they want to exercise the error branch.
          callback(undefined)
        },
      )
      return undefined
    }
    // Promise-style: return the promise directly.
    return next.promise
  }

  // No deferred response queued — never resolve so forgotten mocks surface
  // as timeouts, not silent passes.
  if (callback) {
    // Callback simply never fires.
    return undefined
  }
  return new Promise(() => {})
})

const storageGet = vi.fn((keys?: unknown, maybeCallback?: unknown) => {
  const cb = typeof maybeCallback === 'function' ? (maybeCallback as (r: unknown) => void) : undefined
  const compute = (): Record<string, unknown> => {
    if (keys == null) return { ...storageData }
    if (typeof keys === 'string') {
      return keys in storageData ? { [keys]: storageData[keys] } : {}
    }
    if (Array.isArray(keys)) {
      const out: Record<string, unknown> = {}
      for (const k of keys) {
        if (k in storageData) out[k] = storageData[k]
      }
      return out
    }
    // Object form: defaults
    const out: Record<string, unknown> = {}
    for (const [k, def] of Object.entries(keys as Record<string, unknown>)) {
      out[k] = k in storageData ? storageData[k] : def
    }
    return out
  }
  const result = compute()
  if (cb) {
    // Fire callback async to match real chrome behavior.
    queueMicrotask(() => cb(result))
    return undefined
  }
  return Promise.resolve(result)
})

const storageSet = vi.fn((items: Record<string, unknown>, maybeCallback?: unknown) => {
  Object.assign(storageData, items)
  const cb = typeof maybeCallback === 'function' ? (maybeCallback as () => void) : undefined
  if (cb) {
    queueMicrotask(() => cb())
    return undefined
  }
  return Promise.resolve()
})

const storageRemove = vi.fn((keys: string | string[], maybeCallback?: unknown) => {
  const arr = Array.isArray(keys) ? keys : [keys]
  for (const k of arr) delete storageData[k]
  const cb = typeof maybeCallback === 'function' ? (maybeCallback as () => void) : undefined
  if (cb) {
    queueMicrotask(() => cb())
    return undefined
  }
  return Promise.resolve()
})

export function seedStorage(data: Record<string, unknown>): void {
  Object.assign(storageData, data)
}

export function installChromeMock(): void {
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      sendMessage,
      getManifest: () => ({ version: '2.0.70-beta.4-test' }),
      lastError: undefined,
    },
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
        remove: storageRemove,
      },
    },
  }
}

export const chromeMockSpies = {
  sendMessage,
  storageGet,
  storageSet,
  storageRemove,
}
