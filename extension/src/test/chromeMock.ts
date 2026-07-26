import { vi } from 'vitest'

// Hand-rolled chrome.* stub for unit tests.
//
// Design rules:
// - Default sendMessage response is a never-resolving promise. This makes
//   forgotten mocks surface as test timeouts rather than silent passes that
//   accidentally use undefined response data.
// - deferNextResponse(action) lets the test caller decide WHEN to resolve
//   the response (timing-sensitive tests like hydration window need this).
// - deferNextStorageGet/Set/Remove optionally delay matching storage work and
//   callbacks; when unused, storage retains its original immediate behavior.
// - resolveNext / rejectNext fire pending deferrals in FIFO order per action.
// - storage uses an in-memory Map; reset via resetChromeMock() in beforeEach.

export type DeferredResponse = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  promise: Promise<unknown>
}

type PendingMap = Map<string, DeferredResponse[]>
type DeferredStorageSet = DeferredResponse & {
  matches: (items: Record<string, unknown>) => boolean
}
type DeferredStorageRemove = DeferredResponse & {
  matches: (keys: string[]) => boolean
}
type DeferredStorageGet = DeferredResponse & {
  matches: (keys: unknown) => boolean
}
type StorageChangeListener = (
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string,
) => void

let pendingByAction: PendingMap = new Map()
let pendingStorageGets: DeferredStorageGet[] = []
let pendingStorageSets: DeferredStorageSet[] = []
let pendingStorageRemoves: DeferredStorageRemove[] = []
let storageData: Record<string, unknown> = {}
let messageLog: Array<{ action: string; payload: unknown }> = []
let storageChangeListeners = new Set<StorageChangeListener>()

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
  pendingStorageGets = []
  pendingStorageSets = []
  pendingStorageRemoves = []
  storageData = {}
  messageLog = []
  storageChangeListeners = new Set()
  sendMessage.mockClear()
  storageGet.mockClear()
  storageSet.mockClear()
  storageRemove.mockClear()
  storageOnChangedAddListener.mockClear()
  storageOnChangedRemoveListener.mockClear()
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    ;(chrome.runtime as typeof chrome.runtime & {
      lastError?: { message: string }
    }).lastError = undefined
  }
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

export function deferNextStorageSet(key?: string): DeferredResponse {
  const deferred: DeferredStorageSet = {
    ...makeDeferred(),
    matches: items => key === undefined || Object.hasOwn(items, key),
  }
  pendingStorageSets.push(deferred)
  return deferred
}

export function deferNextStorageGet(key?: string): DeferredResponse {
  const deferred: DeferredStorageGet = {
    ...makeDeferred(),
    matches: keys => {
      if (key === undefined || keys == null) return true
      if (typeof keys === 'string') return keys === key
      if (Array.isArray(keys)) return keys.includes(key)
      return Object.hasOwn(keys as object, key)
    },
  }
  pendingStorageGets.push(deferred)
  return deferred
}

export function deferNextStorageRemove(key?: string): DeferredResponse {
  const deferred: DeferredStorageRemove = {
    ...makeDeferred(),
    matches: keys => key === undefined || keys.includes(key),
  }
  pendingStorageRemoves.push(deferred)
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
        : payload && typeof payload === 'object' && 'type' in payload
          ? String((payload as { type: unknown }).type)
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
        (reason) => {
          const runtime = chrome.runtime as typeof chrome.runtime & {
            lastError?: { message: string }
          }
          runtime.lastError = {
            message: reason instanceof Error ? reason.message : String(reason),
          }
          try {
            callback(undefined)
          } finally {
            runtime.lastError = undefined
          }
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
    const resetToken = payload && typeof payload === 'object'
      && 'payload' in payload
      && (payload as { payload?: unknown }).payload
      && typeof (payload as { payload: { payload?: unknown } }).payload.payload === 'object'
      && (payload as { payload: { payload: { reset_token?: unknown } } }).payload.payload.reset_token
    if (action === 'update_config' && Number.isInteger(resetToken)) {
      queueMicrotask(() => callback({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      return undefined
    }
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
  const deferredIndex = pendingStorageGets.findIndex(entry => entry.matches(keys))
  const deferred = deferredIndex >= 0
    ? pendingStorageGets.splice(deferredIndex, 1)[0]
    : undefined
  if (deferred) {
    const fail = (reason: unknown) => {
      if (!cb) throw reason
      const runtime = chrome.runtime as typeof chrome.runtime & {
        lastError?: { message: string }
      }
      runtime.lastError = {
        message: reason instanceof Error ? reason.message : String(reason),
      }
      try {
        cb(undefined)
      } finally {
        runtime.lastError = undefined
      }
    }
    const completion = deferred.promise.then(() => result, fail)
    if (cb) {
      void completion.then(value => {
        if (value !== undefined) cb(value)
      })
      return undefined
    }
    return completion
  }
  if (cb) {
    // Fire callback async to match real chrome behavior.
    queueMicrotask(() => cb(result))
    return undefined
  }
  return Promise.resolve(result)
})

const storageSet = vi.fn((items: Record<string, unknown>, maybeCallback?: unknown) => {
  const cb = typeof maybeCallback === 'function' ? (maybeCallback as () => void) : undefined
  const deferredIndex = pendingStorageSets.findIndex(entry => entry.matches(items))
  const deferred = deferredIndex >= 0
    ? pendingStorageSets.splice(deferredIndex, 1)[0]
    : undefined
  const commit = () => {
    Object.assign(storageData, items)
    cb?.()
  }
  const fail = (reason: unknown) => {
    if (!cb) throw reason
    const runtime = chrome.runtime as typeof chrome.runtime & {
      lastError?: { message: string }
    }
    runtime.lastError = {
      message: reason instanceof Error ? reason.message : String(reason),
    }
    try {
      cb()
    } finally {
      runtime.lastError = undefined
    }
  }
  if (deferred) {
    const completion = deferred.promise.then(commit, fail)
    return cb ? undefined : completion
  }
  Object.assign(storageData, items)
  if (cb) {
    queueMicrotask(() => cb())
    return undefined
  }
  return Promise.resolve()
})

const storageRemove = vi.fn((keys: string | string[], maybeCallback?: unknown) => {
  const arr = Array.isArray(keys) ? keys : [keys]
  const cb = typeof maybeCallback === 'function' ? (maybeCallback as () => void) : undefined
  const deferredIndex = pendingStorageRemoves.findIndex(entry => entry.matches(arr))
  const deferred = deferredIndex >= 0
    ? pendingStorageRemoves.splice(deferredIndex, 1)[0]
    : undefined
  const commit = () => {
    for (const k of arr) delete storageData[k]
    cb?.()
  }
  const fail = (reason: unknown) => {
    if (!cb) throw reason
    const runtime = chrome.runtime as typeof chrome.runtime & {
      lastError?: { message: string }
    }
    runtime.lastError = {
      message: reason instanceof Error ? reason.message : String(reason),
    }
    try {
      cb()
    } finally {
      runtime.lastError = undefined
    }
  }
  if (deferred) {
    const completion = deferred.promise.then(commit, fail)
    return cb ? undefined : completion
  }
  for (const k of arr) delete storageData[k]
  if (cb) {
    queueMicrotask(() => cb())
    return undefined
  }
  return Promise.resolve()
})

export function seedStorage(data: Record<string, unknown>): void {
  Object.assign(storageData, data)
}

export function getStorageSnapshot(): Readonly<Record<string, unknown>> {
  return structuredClone(storageData)
}

/**
 * Emit an explicit chrome.storage.onChanged notification. Storage mocks keep
 * their historical non-emitting set/remove behavior unless a test calls this
 * helper, so existing tests remain deterministic.
 */
export function emitStorageChanges(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName = 'local',
): void {
  if (areaName === 'local') {
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete storageData[key]
      else storageData[key] = change.newValue
    }
  }
  for (const listener of [...storageChangeListeners]) {
    listener(changes, areaName)
  }
}

const storageOnChangedAddListener = vi.fn((listener: StorageChangeListener) => {
  storageChangeListeners.add(listener)
})

const storageOnChangedRemoveListener = vi.fn((listener: StorageChangeListener) => {
  storageChangeListeners.delete(listener)
})

export function installChromeMock(): void {
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      sendMessage,
      getManifest: () => ({ version: '2.0.70-beta.5-test' }),
      getURL: (path: string) => `chrome-extension://test/${path}`,
      lastError: undefined,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
        remove: storageRemove,
      },
      onChanged: {
        addListener: storageOnChangedAddListener,
        removeListener: storageOnChangedRemoveListener,
      },
    },
  }
}

export const chromeMockSpies = {
  sendMessage,
  storageGet,
  storageSet,
  storageRemove,
  storageOnChangedAddListener,
  storageOnChangedRemoveListener,
}
