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

const sendMessage = vi.fn((payload: unknown) => {
  const action =
    payload && typeof payload === 'object' && 'action' in payload
      ? String((payload as { action: unknown }).action)
      : '<unknown>'
  messageLog.push({ action, payload })

  const queue = pendingByAction.get(action)
  if (queue && queue.length > 0) {
    const next = queue.shift()!
    return next.promise
  }
  // No deferred response queued — return a never-resolving promise so tests
  // that forgot to mock a call hit the timeout instead of getting undefined.
  return new Promise(() => {})
})

const storageGet = vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
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
  for (const [k, def] of Object.entries(keys)) {
    out[k] = k in storageData ? storageData[k] : def
  }
  return out
})

const storageSet = vi.fn(async (items: Record<string, unknown>) => {
  Object.assign(storageData, items)
})

const storageRemove = vi.fn(async (keys: string | string[]) => {
  const arr = Array.isArray(keys) ? keys : [keys]
  for (const k of arr) delete storageData[k]
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
