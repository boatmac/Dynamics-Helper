import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  chromeMockSpies,
  deferNextResponse,
  getMessageLog,
  installChromeMock,
  resetChromeMock,
} from '../test/chromeMock'
import { useVisibleCompletionAck } from './useVisibleCompletionAck'

const TX = '0123456789abcdef0123456789abcdef'
const TX_B = 'fedcba9876543210fedcba9876543210'

let visibility: DocumentVisibilityState
let originalVisibilityDescriptor: PropertyDescriptor | undefined
let nativeRemoveEventListener: typeof document.removeEventListener

function ackMessages(): ReadonlyArray<{ action: string; payload: unknown }> {
  return getMessageLog().filter(entry => entry.action === 'DH_UPDATE_ACK_COMPLETE')
}

function setDocumentVisibility(next: DocumentVisibilityState): void {
  visibility = next
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

function activeVisibilityListeners(): Set<EventListenerOrEventListenerObject> {
  const added = vi.mocked(document.addEventListener).mock.calls
    .filter(([type]) => type === 'visibilitychange')
    .map(([, listener]) => listener)
  const removed = new Set(
    vi.mocked(document.removeEventListener).mock.calls
      .filter(([type]) => type === 'visibilitychange')
      .map(([, listener]) => listener),
  )
  return new Set(added.filter(listener => !removed.has(listener)))
}

function restoreVisibilityDescriptor(): void {
  if (originalVisibilityDescriptor) {
    Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor)
  } else {
    delete (document as unknown as { visibilityState?: DocumentVisibilityState }).visibilityState
  }
}

describe('useVisibleCompletionAck', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    vi.useFakeTimers()
    visibility = 'visible'
    originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    nativeRemoveEventListener = document.removeEventListener.bind(document)
    vi.spyOn(document, 'addEventListener')
    vi.spyOn(document, 'removeEventListener')
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
  })

  afterEach(() => {
    cleanup()
    for (const listener of activeVisibilityListeners()) {
      nativeRemoveEventListener('visibilitychange', listener)
    }
    vi.clearAllTimers()
    vi.useRealTimers()
    restoreVisibilityDescriptor()
    vi.restoreAllMocks()
  })

  it('sends no ACK at 7,999 ms and one ACK at 8,000 ms', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('sends only the exact ACK payload', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(ackMessages()[0]?.payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX,
    })
    expect(Reflect.ownKeys(ackMessages()[0]?.payload as object)).toEqual([
      'type',
      'transactionId',
    ])
  })

  it('does not write update storage', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(chromeMockSpies.storageGet).not.toHaveBeenCalled()
    expect(chromeMockSpies.storageSet).not.toHaveBeenCalled()
    expect(chromeMockSpies.storageRemove).not.toHaveBeenCalled()
  })

  it('does not ACK without a completion transaction', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: null, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not ACK while the surface is hidden', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: false }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not ACK while the document is hidden', () => {
    visibility = 'hidden'
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('requires a fresh 8,000 ms after document hide and show', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(4_000))
    setDocumentVisibility('hidden')
    act(() => vi.advanceTimersByTime(20_000))
    expect(ackMessages()).toHaveLength(0)
    setDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('requires a fresh 8,000 ms after surface hide and show', () => {
    const view = renderHook(
      ({ surfaceVisible }) => useVisibleCompletionAck({ transactionId: TX, surfaceVisible }),
      { initialProps: { surfaceVisible: true } },
    )
    act(() => vi.advanceTimersByTime(4_000))
    view.rerender({ surfaceVisible: false })
    act(() => vi.advanceTimersByTime(20_000))
    expect(ackMessages()).toHaveLength(0)
    view.rerender({ surfaceVisible: true })
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps the original deadline across an equivalent same-transaction rerender', () => {
    const view = renderHook(
      ({ options }) => useVisibleCompletionAck(options),
      { initialProps: { options: { transactionId: TX as string | null, surfaceVisible: true } } },
    )
    act(() => vi.advanceTimersByTime(4_000))
    view.rerender({ options: { transactionId: TX, surfaceVisible: true } })
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('does not restart a visible epoch for a same-state visibilitychange event', () => {
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(4_000))
    setDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels transaction A and gives transaction B a fresh epoch', () => {
    const view = renderHook(
      ({ transactionId }) => useVisibleCompletionAck({ transactionId, surfaceVisible: true }),
      { initialProps: { transactionId: TX as string | null } },
    )
    act(() => vi.advanceTimersByTime(4_000))
    view.rerender({ transactionId: TX_B })
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()[0]?.payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX_B,
    })
  })

  it('ignores a stale callback after document hide', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    setDocumentVisibility('hidden')
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('rechecks live document visibility without an event', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    visibility = 'hidden'
    act(() => stale())
    expect(ackMessages()).toHaveLength(0)
  })

  it('ignores a stale callback after surface hide', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(
      ({ surfaceVisible }) => useVisibleCompletionAck({ transactionId: TX, surfaceVisible }),
      { initialProps: { surfaceVisible: true } },
    )
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.rerender({ surfaceVisible: false })
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('ignores a stale callback after transaction replacement', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(
      ({ transactionId }) => useVisibleCompletionAck({ transactionId, surfaceVisible: true }),
      { initialProps: { transactionId: TX as string | null } },
    )
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.rerender({ transactionId: TX_B })
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()[0]?.payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX_B,
    })
  })

  it('ignores a stale callback after authoritative departure', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(
      ({ transactionId }) => useVisibleCompletionAck({ transactionId, surfaceVisible: true }),
      { initialProps: { transactionId: TX as string | null } },
    )
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.rerender({ transactionId: null })
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not retry a rejected ACK in the same visible epoch', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    const rejectionCatch = vi.spyOn(ack.promise, 'catch')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(rejectionCatch).toHaveBeenCalledOnce()
    await act(async () => { ack.reject(new Error('disconnected')) })
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })

  it('does not retry a handled-false ACK in the same visible epoch', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => { ack.resolve({ handled: false }) })
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })

  it('contains a synchronous sendMessage throw', () => {
    chromeMockSpies.runtimeSendMessage.mockImplementationOnce((_payload, _callback) => {
      throw new Error('context invalidated')
    })
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    expect(() => act(() => vi.advanceTimersByTime(8_000))).not.toThrow()
  })

  it('does not retry a synchronous sendMessage throw in the same epoch', () => {
    chromeMockSpies.runtimeSendMessage.mockImplementationOnce((_payload, _callback) => {
      throw new Error('context invalidated')
    })
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    expect(() => act(() => vi.advanceTimersByTime(8_000))).not.toThrow()
    act(() => vi.advanceTimersByTime(30_000))
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(1)
  })

  it('marks the epoch attempted before synchronous transport reentry', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    let callback: (() => void) | undefined
    chromeMockSpies.runtimeSendMessage.mockImplementationOnce((_payload, _callback) => {
      callback?.()
      return new Promise<unknown>(() => {})
    })
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    callback = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    act(() => callback?.())
    expect(chromeMockSpies.runtimeSendMessage).toHaveBeenCalledTimes(1)
  })

  it('allows one retry only after failure and a fresh hide-show epoch', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    const rejectionCatch = vi.spyOn(ack.promise, 'catch')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    expect(rejectionCatch).toHaveBeenCalledOnce()
    await act(async () => { ack.reject(new Error('disconnected')) })
    setDocumentVisibility('hidden')
    setDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(2)
  })

  it('ignores a successful ACK response', async () => {
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => { ack.resolve({ handled: true, state: { kind: 'idle' } }) })
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels the timer on unmount', () => {
    const view = renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    view.unmount()
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('ignores a stale callback after unmount', () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const view = renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    const stale = timeoutSpy.mock.calls.find(([, delay]) => delay === 8_000)?.[0] as () => void
    view.unmount()
    act(() => {
      stale()
      stale()
    })
    expect(ackMessages()).toHaveLength(0)
  })

  it('removes its exact visibility listener on unmount', () => {
    const view = renderHook(() => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }))
    expect(activeVisibilityListeners().size).toBe(1)
    view.unmount()
    expect(activeVisibilityListeners().size).toBe(0)
  })

  it('keeps one listener and sends one ACK under React StrictMode', () => {
    renderHook(
      () => useVisibleCompletionAck({ transactionId: TX, surfaceVisible: true }),
      { reactStrictMode: true },
    )
    const installs = vi.mocked(document.addEventListener).mock.calls
      .filter(([type]) => type === 'visibilitychange')
    const removals = vi.mocked(document.removeEventListener).mock.calls
      .filter(([type]) => type === 'visibilitychange')
    expect(installs).toHaveLength(2)
    expect(removals).toHaveLength(1)
    expect(removals[0]?.[1]).toBe(installs[0]?.[1])
    expect(activeVisibilityListeners().size).toBe(1)
    act(() => vi.advanceTimersByTime(8_000))
    expect(ackMessages()).toHaveLength(1)
  })
})
