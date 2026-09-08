import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  chromeMockSpies,
  deferNextResponse,
  emitRuntimeMessage,
  getMessageLog,
  getStorageSnapshot,
  installChromeMock,
  resetChromeMock,
  seedStorage,
  setManifestVersion,
} from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const state = vi.hoisted(() => ({
  scanForErrors: vi.fn(),
  trackEvent: vi.fn(),
  prefs: {
    buttonText: 'DH',
    primaryColor: '#0D9488',
    offsetBottom: 24,
    offsetRight: 24,
    userPrompt: '',
    rootPath: '',
    autoAnalyzeMode: 'disabled',
    enableStatusBubble: true,
    language: 'en',
    analyzeTimeoutSeconds: 1200,
  },
}))

vi.mock('../utils/telemetry', () => ({
  trackEvent: state.trackEvent,
  trackException: vi.fn(),
  hashCaseId: vi.fn().mockResolvedValue('case-hash'),
}))

vi.mock('../utils/prefs', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/prefs')>()
  return {
    ...original,
    usePrefs: () => ({ prefs: { ...original.DEFAULT_PREFS, ...state.prefs } }),
  }
})

vi.mock('../utils/pageReader', () => ({
  PageReader: { scanForErrors: state.scanForErrors },
}))

vi.mock('../hooks/useAnalysisHydration', () => ({
  useAnalysisHydration: () => ({
    popover: null,
    pending: null,
    isAnalyzing: false,
    dismissPopover: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('./MenuLogic', async (importOriginal) => {
  const original = await importOriginal<typeof import('./MenuLogic')>()
  return {
    ...original,
    useMenuLogic: () => ({
      currentItems: [],
      canGoBack: false,
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
    }),
    resolveDynamicUrl: (value: string) => Promise.resolve(value),
  }
})

vi.mock('react-dnd', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dnd')>()),
  DndProvider: ({ children }: { children: ReactNode }) => children,
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, vi.fn()],
}))

vi.mock('./MarkdownPreview', () => ({ default: () => null }))

import FAB from './FAB'
import Options from './Options'

const targetVersion = '2.0.76-beta.1'
const candidate = {
  version: targetVersion,
  url: `https://example.invalid/DynamicsHelper_v${targetVersion}.zip`,
  isPrerelease: true,
}
const TX = '0123456789abcdef0123456789abcdef'
const TX_B = 'fedcba9876543210fedcba9876543210'
const realSetTimeout = globalThis.setTimeout
const realClearTimeout = globalThis.clearTimeout
let visibility: DocumentVisibilityState
let originalHiddenDescriptor: PropertyDescriptor | undefined
let originalVisibilityDescriptor: PropertyDescriptor | undefined

function setFabDocumentVisibility(next: DocumentVisibilityState): void {
  visibility = next
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}

function restoreDocumentDescriptor(
  key: 'hidden' | 'visibilityState',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(document, key, descriptor)
  else delete (document as unknown as Record<string, unknown>)[key]
}

const transaction = {
  update: candidate,
  transactionId: TX,
  targetVersion,
  priorVersion: '2.0.75-beta.1',
}

async function renderFab() {
  let view!: ReturnType<typeof render>
  await act(async () => {
    view = render(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )
  })
  await vi.waitFor(() => expect(
    getMessageLog().some(entry => entry.action === 'DH_UPDATE_GET_STATE'),
  ).toBe(true))
  return view
}

function openFab() {
  fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
}

async function resolveState(
  deferred: ReturnType<typeof deferNextResponse>,
  updateState: unknown,
) {
  await act(async () => {
    deferred.resolve({ handled: true, state: updateState })
    await deferred.promise
  })
}

function referencesPendingUpdate(keys: unknown): boolean {
  return keys === 'pending_update'
    || Array.isArray(keys) && keys.includes('pending_update')
    || typeof keys === 'object' && keys !== null && Object.hasOwn(keys, 'pending_update')
}

function referencesUpdateState(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Object.hasOwn(value, 'dh_update_state')
}

function ackMessages() {
  return getMessageLog().filter(entry => entry.action === 'DH_UPDATE_ACK_COMPLETE')
}

function completeState(transactionId = TX, outcome: 'committed' | 'rolled-back' = 'committed') {
  return { kind: 'complete', update: candidate, transactionId, outcome } as const
}

function deferredValue<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function bubble(): HTMLElement {
  return document.querySelector('.dh-status-bubble') as HTMLElement
}

async function renderLiveCompletion(
  outcome: 'committed' | 'rolled-back' = 'committed',
) {
  const getState = deferNextResponse('DH_UPDATE_GET_STATE')
  const view = await renderFab()
  await resolveState(getState, { kind: 'idle' })
  act(() => emitRuntimeMessage({
    type: 'DH_UPDATE_STATE',
    state: completeState(TX, outcome),
  }))
  return view
}

async function replaceWithPersistentProgress(text: string): Promise<void> {
  deferNextResponse('analyze_error')
  openFab()
  await act(async () => {
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /^analyze$/i })).toBeEnabled())
  })
  fireEvent.click(screen.getByRole('button', { name: /^analyze$/i }))
  await act(async () => {
    await vi.waitFor(() => expect(
      getMessageLog().filter(entry => entry.action === 'analyze_error'),
    ).toHaveLength(1))
  })
  const analyze = getMessageLog().find(entry => entry.action === 'analyze_error')
  const requestId = (analyze?.payload as {
    payload?: { requestId?: string }
  } | undefined)?.payload?.requestId
  expect(requestId).toEqual(expect.any(String))
  act(() => window.dispatchEvent(new CustomEvent('dh-native-progress', {
    detail: { requestId, payload: text },
  })))
}

describe('FAB reliable update projection', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    setManifestVersion(transaction.priorVersion)
    state.prefs.enableStatusBubble = true
    state.prefs.autoAnalyzeMode = 'disabled'
    state.trackEvent.mockReset()
    state.scanForErrors.mockReset().mockImplementation(() => new Promise(() => {}))
    visibility = 'visible'
    originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => visibility === 'hidden',
    })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
  })

  afterEach(() => {
    act(() => vi.clearAllTimers())
    vi.useRealTimers()
    restoreDocumentDescriptor('hidden', originalHiddenDescriptor)
    restoreDocumentDescriptor('visibilityState', originalVisibilityDescriptor)
    vi.restoreAllMocks()
    // Timer spies can restore a prior test's fake functions after useRealTimers.
    globalThis.setTimeout = realSetTimeout
    globalThis.clearTimeout = realClearTimeout
  })

  it('hydrates from one payload-free DH_UPDATE_GET_STATE request', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()

    await waitFor(() => {
      const request = getMessageLog().find(entry => entry.action === 'DH_UPDATE_GET_STATE')
      expect(request?.payload).toEqual({ type: 'DH_UPDATE_GET_STATE' })
      expect(Reflect.ownKeys(request?.payload as object)).toEqual(['type'])
    })

    await resolveState(getState, { kind: 'available', update: candidate })
    openFab()

    expect(await screen.findByRole('button', { name: /update available/i }))
      .toHaveTextContent(targetVersion)
  })

  it.each([
    ['committed', 'Update completed successfully.', targetVersion],
    ['rolled-back', 'previous version was restored', transaction.priorVersion],
  ] as const)('renders a cold %s completion immediately', async (outcome, expected, version) => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, { kind: 'complete', update: candidate, transactionId: TX, outcome })
    openFab()

    const completion = await screen.findByRole('button', { name: new RegExp(expected, 'i') })
    if (outcome === 'committed') expect(completion).toBeDisabled()
    else expect(completion).toBeEnabled()
    expect(completion).toHaveTextContent(version)
  })

  it('does not ACK a cold completion while only the closed-FAB red dot is visible', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    const button = document.querySelector('.dh-btn') as HTMLButtonElement
    const redDot = Array.from(button.querySelectorAll('span')).find(
      element => ['#ef4444', 'rgb(239, 68, 68)'].includes((element as HTMLElement).style.backgroundColor.toLowerCase()),
    )
    expect(redDot).toBeDefined()
    expect(screen.queryByRole('button', { name: /update completed successfully/i })).toBeNull()
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('starts a full epoch only when the cold-completion menu opens', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(20_000))
    openFab()
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels a menu epoch when the menu closes without a bound bubble', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    openFab()
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not ACK a live completion with Status bubble disabled and the menu closed', async () => {
    vi.useFakeTimers()
    state.prefs.enableStatusBubble = false
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, { kind: 'idle' })
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: completeState() }))
    expect(bubble()).not.toHaveClass('visible')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('ACKs an exact transaction-bound completion bubble while the menu is closed', async () => {
    vi.useFakeTimers()
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderLiveCompletion()
    expect(bubble()).toHaveClass('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps one deadline across a bound-bubble-to-menu hand-off', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(4_000))
    expect(bubble()).toHaveClass('visible')
    openFab()
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'UNRELATED UPDATE FEEDBACK' },
    })))
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps one deadline across a menu-to-bound-bubble hand-off', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: completeState() }))
    expect(bubble()).toHaveClass('visible')
    openFab()
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps an already-visible bound bubble eligible after the preference is disabled', async () => {
    vi.useFakeTimers()
    const view = await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(4_000))
    state.prefs.enableStatusBubble = false
    act(() => {
      view.rerender(<PrefsLanguageProvider language="en"><FAB /></PrefsLanguageProvider>)
    })
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('does not restart the epoch when a bound bubble appears while the menu stays open', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: completeState() }))
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('removes bubble eligibility when unrelated feedback replaces it', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'UNRELATED UPDATE FEEDBACK' },
    })))
    expect(bubble()).toHaveTextContent('UNRELATED UPDATE FEEDBACK')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('does not treat a generic visible status bubble as a completion surface', async () => {
    vi.useFakeTimers()
    state.prefs.enableStatusBubble = true
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'GENERIC UPDATE FEEDBACK' },
    })))
    expect(bubble()).toHaveClass('visible')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('requires a fresh full interval after the FAB document hides and returns', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    setFabDocumentVisibility('hidden')
    act(() => vi.advanceTimersByTime(20_000))
    setFabDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels every visible epoch on authoritative departure', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('lets a failed-ACK bubble expire and retries only after a fresh menu epoch', async () => {
    vi.useFakeTimers()
    const firstAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderLiveCompletion()
    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => { firstAck.reject(new Error('disconnected')) })
    act(() => vi.advanceTimersByTime(2_000))
    expect(bubble()).not.toHaveClass('visible')
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    openFab()
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(2)
  })

  it('keeps a visible menu completion through 7,999 ms and sends one exact ACK at 8,000 ms', async () => {
    vi.useFakeTimers()
    const persisted = { kind: 'complete', transactionId: TX }
    seedStorage({ dh_update_state: persisted })
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()

    act(() => vi.advanceTimersByTime(7_999))
    expect(screen.getByRole('button', { name: /update completed successfully/i })).toBeDisabled()
    expect(ackMessages()).toHaveLength(0)

    act(() => vi.advanceTimersByTime(1))
    const messages = ackMessages()
    expect(messages).toHaveLength(1)
    expect(messages[0].payload).toEqual({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: TX })
    expect(Reflect.ownKeys(messages[0].payload as object)).toEqual(['type', 'transactionId'])
    expect(chromeMockSpies.storageSet.mock.calls.some(call => referencesUpdateState(call[0]))).toBe(false)
    expect(getStorageSnapshot().dh_update_state).toEqual(persisted)

    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
  })

  it('keeps the original visible-epoch deadline across an equivalent same-ID rebroadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()

    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: completeState(TX, 'rolled-back'),
    }))
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)

    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
    expect(ackMessages()[0].payload).toEqual({ type: 'DH_UPDATE_ACK_COMPLETE', transactionId: TX })
  })

  it('cancels ACK on unmount and requires a fresh 8 seconds after remount', async () => {
    vi.useFakeTimers()
    const firstGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const first = await renderFab()
    await resolveState(firstGetState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    first.unmount()
    act(() => vi.advanceTimersByTime(10_000))
    expect(ackMessages()).toHaveLength(0)

    const secondGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(secondGetState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it.each(['departure', 'replacement'] as const)(
    'cancels transaction A after state departure or replacement by transaction B (%s)',
    async transition => {
      vi.useFakeTimers()
      const getState = deferNextResponse('DH_UPDATE_GET_STATE')
      await renderFab()
      await resolveState(getState, completeState())
      openFab()
      act(() => vi.advanceTimersByTime(4_000))

      act(() => emitRuntimeMessage({
        type: 'DH_UPDATE_STATE',
        state: transition === 'departure'
          ? { kind: 'available', update: candidate }
          : completeState(TX_B),
      }))
      act(() => vi.advanceTimersByTime(4_000))
      expect(ackMessages()).toHaveLength(0)

      act(() => vi.advanceTimersByTime(4_000))
      if (transition === 'departure') {
        expect(ackMessages()).toHaveLength(0)
      } else {
        expect(ackMessages()).toHaveLength(1)
        expect(ackMessages()[0].payload).toEqual({
          type: 'DH_UPDATE_ACK_COMPLETE',
          transactionId: TX_B,
        })
      }
    },
  )

  it('replaces a live transaction A bubble and timers with fresh transaction B deadlines', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, { kind: 'idle' })

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: completeState(TX, 'rolled-back'),
    }))
    const timerAIndex = timeoutSpy.mock.calls.findIndex(([, delay]) => delay === 10_000)
    expect(timerAIndex).toBeGreaterThanOrEqual(0)
    const callbackA = timeoutSpy.mock.calls[timerAIndex][0]
    const timerA = timeoutSpy.mock.results[timerAIndex].value
    expect(bubble()).toHaveTextContent('previous version was restored')
    expect(bubble()).toHaveClass('visible', 'error')

    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: completeState(TX_B),
    }))

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerA)
    expect(timeoutSpy.mock.calls.filter(([, delay]) => delay === 10_000)).toHaveLength(2)
    expect(bubble()).toHaveTextContent('Update completed successfully.')
    expect(bubble()).toHaveClass('visible', 'success')

    act(() => {
      ;(callbackA as () => void)()
    })
    expect(bubble()).toHaveTextContent('Update completed successfully.')
    expect(bubble()).toHaveClass('visible', 'success')

    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
    expect(ackMessages()[0].payload).toEqual({
      type: 'DH_UPDATE_ACK_COMPLETE',
      transactionId: TX_B,
    })
  })

  it.each(['rejected', 'handled-false'] as const)(
    'keeps completion visible after a failed ACK and retries only after a fresh visibility epoch (%s)',
    async result => {
      vi.useFakeTimers()
      const firstGetState = deferNextResponse('DH_UPDATE_GET_STATE')
      const firstAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
      await renderFab()
      await resolveState(firstGetState, completeState())
      openFab()

      act(() => vi.advanceTimersByTime(8_000))
      expect(ackMessages()).toHaveLength(1)
      await act(async () => {
        if (result === 'rejected') firstAck.reject(new Error('disconnected'))
        else firstAck.resolve({ handled: false })
      })
      expect(screen.getByRole('button', { name: /update completed successfully/i })).toBeDisabled()
      act(() => vi.advanceTimersByTime(30_000))
      expect(ackMessages()).toHaveLength(1)

      openFab()
      openFab()
      deferNextResponse('DH_UPDATE_ACK_COMPLETE')
      act(() => vi.advanceTimersByTime(7_999))
      expect(ackMessages()).toHaveLength(1)
      act(() => vi.advanceTimersByTime(1))
      expect(ackMessages()).toHaveLength(2)
      expect(screen.getByRole('button', { name: /update completed successfully/i })).toBeDisabled()
    },
  )

  it('ignores a successful ACK response until an authoritative state broadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()

    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => {
      ack.resolve({ handled: true, state: { kind: 'idle' } })
    })

    expect(screen.getByRole('button', { name: /update completed successfully/i })).toBeDisabled()
  })

  it('ignores a delayed ACK response after a newer authoritative state arrives', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(8_000))

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    }))
    await act(async () => {
      ack.resolve({ handled: true, state: { kind: 'idle' } })
    })

    expect(screen.getByRole('button', { name: /update available/i })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /update completed successfully/i })).toBeNull()
  })

  it('hides committed completion only after an authoritative idle broadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderFab()
    await resolveState(getState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(8_000))
    expect(screen.getByRole('button', { name: /update completed successfully/i })).toBeDisabled()

    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))

    expect(screen.queryByRole('button', { name: /update completed successfully/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /update available|retry update/i })).toBeNull()
  })

  it('replaces rollback wording with an enabled ordinary available action after authoritative available broadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const view = await renderFab()
    await resolveState(getState, { kind: 'idle' })
    openFab()
    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: completeState(TX, 'rolled-back'),
    }))
    expect(screen.getByRole('button', { name: /previous version was restored/i })).toBeEnabled()
    expect(bubble()).toHaveTextContent('previous version was restored')
    state.prefs.enableStatusBubble = false
    view.rerender(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    }))

    const update = screen.getByRole('button', { name: /update available/i })
    expect(update).toBeEnabled()
    expect(update).toHaveTextContent(targetVersion)
    expect(update).not.toHaveTextContent(/previous version was restored/i)
    expect(bubble()).not.toHaveClass('visible')
  })

  it('keeps FAB and Options on a newer authoritative state when simultaneous duplicate ACK responses race', async () => {
    vi.useFakeTimers()
    const fabGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const optionsGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const fabAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    const optionsAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    deferNextResponse('get_config')
    render(
      <>
        <PrefsLanguageProvider language="en"><FAB /></PrefsLanguageProvider>
        <Options />
      </>,
    )
    await act(async () => {
      fabGetState.resolve({ handled: true, state: completeState() })
      optionsGetState.resolve({ handled: true, state: completeState() })
    })
    openFab()
    act(() => vi.advanceTimersByTime(8_000))
    expect(ackMessages()).toHaveLength(2)

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    }))
    await act(async () => {
      fabAck.resolve({ handled: true, state: { kind: 'idle' } })
      optionsAck.resolve({ handled: true, state: { kind: 'idle' } })
    })

    expect(screen.getByRole('button', { name: /update available/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /update now/i })).toBeEnabled()
  })

  it('cancels the later view timer when the first global ACK broadcast consumes completion', async () => {
    vi.useFakeTimers()
    const fabGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const optionsGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const fabAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    deferNextResponse('get_config')

    await renderFab()
    await resolveState(fabGetState, completeState())
    openFab()
    act(() => vi.advanceTimersByTime(4_000))
    render(<Options />)
    await resolveState(optionsGetState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()).toHaveLength(1)

    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    await act(async () => {
      fabAck.resolve({ handled: true, state: { kind: 'idle' } })
    })
    act(() => vi.advanceTimersByTime(30_000))

    expect(ackMessages()).toHaveLength(1)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lets visible Options win while a cold FAB remains closed', async () => {
    vi.useFakeTimers()
    const fabGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    const optionsGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    deferNextResponse('get_config')
    await renderFab()
    await resolveState(fabGetState, completeState())
    expect(screen.queryByRole('button', { name: /update completed successfully/i })).toBeNull()
    act(() => vi.advanceTimersByTime(4_000))
    render(<Options />)
    await resolveState(optionsGetState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(3_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(1)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('hides the transaction-bound live completion bubble on the authoritative post-ACK broadcast', async () => {
    vi.useFakeTimers()
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    await renderLiveCompletion()
    expect(bubble()).toHaveTextContent('Update completed successfully.')
    expect(bubble()).toHaveClass('visible')

    act(() => vi.advanceTimersByTime(8_000))
    expect(ackMessages()).toHaveLength(1)
    expect(bubble()).toHaveClass('visible')
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))

    expect(bubble()).not.toHaveClass('visible')
    act(() => vi.advanceTimersByTime(30_000))
    expect(bubble()).not.toHaveClass('visible')
  })

  it('keeps an unrelated replacement bubble visible when completion later leaves state', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'UNRELATED UPDATE FEEDBACK' },
    })))
    expect(bubble()).toHaveTextContent('UNRELATED UPDATE FEEDBACK')
    expect(bubble()).toHaveClass('visible')

    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))

    expect(bubble()).toHaveTextContent('UNRELATED UPDATE FEEDBACK')
    expect(bubble()).toHaveClass('visible')
  })

  it('keeps a live completion bubble visible through 9,999 ms without an authoritative transition', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()

    act(() => vi.advanceTimersByTime(9_999))

    expect(bubble()).toHaveTextContent('Update completed successfully.')
    expect(bubble()).toHaveClass('visible')
  })

  it('hides a live completion bubble at its 10,000 ms fallback without an authoritative transition', async () => {
    vi.useFakeTimers()
    await renderLiveCompletion()

    act(() => vi.advanceTimersByTime(9_999))
    expect(bubble()).toHaveClass('visible')
    act(() => vi.advanceTimersByTime(1))

    expect(bubble()).not.toHaveClass('visible')
  })

  it('does not let a replaced completion timeout hide an unrelated bubble at the old deadline', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    await renderLiveCompletion()
    const completionTimerIndex = timeoutSpy.mock.calls.findIndex(([, delay]) => delay === 10_000)
    const completionTimer = timeoutSpy.mock.results[completionTimerIndex]?.value
    act(() => vi.advanceTimersByTime(6_000))
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'REPLACEMENT FEEDBACK' },
    })))
    expect(clearTimeoutSpy).toHaveBeenCalledWith(completionTimer)
    act(() => vi.advanceTimersByTime(4_000))

    expect(bubble()).toHaveTextContent('REPLACEMENT FEEDBACK')
    expect(bubble()).toHaveClass('visible')
  })

  it('ignores a captured stale completion callback after a persistent progress bubble replaces it', async () => {
    vi.useFakeTimers()
    state.scanForErrors.mockResolvedValue({
      caseNumber: '1234567890123456',
      ticketTitle: 'Fixture',
      errorText: 'Failure body',
    })
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    await renderLiveCompletion()
    const staleCallback = timeoutSpy.mock.calls.find(([, delay]) => delay === 10_000)?.[0]
    expect(staleCallback).toEqual(expect.any(Function))
    await replaceWithPersistentProgress('PERSISTENT PROGRESS')
    expect(bubble()).toHaveTextContent('PERSISTENT PROGRESS')
    expect(bubble()).toHaveClass('visible')

    act(() => {
      ;(staleCallback as () => void)()
    })

    expect(bubble()).toHaveTextContent('PERSISTENT PROGRESS')
    expect(bubble()).toHaveClass('visible')
  })

  it('clears a live completion through an identity-change hide without affecting later feedback', async () => {
    vi.useFakeTimers()
    const initialScan = deferredValue<unknown>()
    const changedScan = deferredValue<unknown>()
    state.scanForErrors
      .mockReset()
      .mockImplementationOnce(() => initialScan.promise)
      .mockImplementationOnce(() => changedScan.promise)
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await act(async () => {
      initialScan.resolve({
        caseNumber: '1111111111111111',
        ticketTitle: 'Case A',
        errorText: 'Case A body',
      })
      await initialScan.promise
    })
    await resolveState(getState, { kind: 'idle' })
    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: completeState(),
    }))
    const completionTimerIndex = timeoutSpy.mock.calls.findIndex(([, delay]) => delay === 10_000)
    const staleCallback = timeoutSpy.mock.calls[completionTimerIndex]?.[0]
    const completionTimer = timeoutSpy.mock.results[completionTimerIndex]?.value
    expect(staleCallback).toEqual(expect.any(Function))

    openFab()
    await act(async () => {
      changedScan.resolve({
        caseNumber: '2222222222222222',
        ticketTitle: 'Case B',
        errorText: 'Case B body',
      })
      await changedScan.promise
    })

    expect(state.scanForErrors).toHaveBeenCalledTimes(2)
    expect(bubble()).not.toHaveClass('visible')
    expect(clearTimeoutSpy).toHaveBeenCalledWith(completionTimer)
    act(() => window.dispatchEvent(new CustomEvent('dh-update-error', {
      detail: { error: 'LATER FEEDBACK' },
    })))

    act(() => {
      ;(staleCallback as () => void)()
    })

    expect(bubble()).toHaveTextContent('LATER FEEDBACK')
    expect(bubble()).toHaveClass('visible')
  })

  it('clears the completion bubble timer on unmount', async () => {
    vi.useFakeTimers()
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const view = await renderLiveCompletion()
    const completionTimerIndex = timeoutSpy.mock.calls.findIndex(([, delay]) => delay === 10_000)
    expect(completionTimerIndex).toBeGreaterThanOrEqual(0)
    const completionTimer = timeoutSpy.mock.results[completionTimerIndex].value

    view.unmount()

    expect(clearTimeoutSpy).toHaveBeenCalledWith(completionTimer)
  })

  it.each([
    ['committed', 'Update completed successfully.', targetVersion],
    ['rolled-back', 'previous version was restored', transaction.priorVersion],
  ] as const)('renders a live %s completion immediately', async (outcome, expected, version) => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, { kind: 'idle' })
    openFab()

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'complete', update: candidate, transactionId: TX, outcome },
    }))

    const completion = screen.getByRole('button', { name: new RegExp(expected, 'i') })
    if (outcome === 'committed') expect(completion).toBeDisabled()
    else expect(completion).toBeEnabled()
    expect(completion).toHaveTextContent(version)
  })

  it('labels rollback with the restored version and keeps explicit retry available', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, {
      kind: 'complete',
      update: candidate,
      transactionId: TX,
      outcome: 'rolled-back',
    })
    openFab()

    const retry = await screen.findByRole('button', { name: /previous version was restored/i })
    expect(retry).toBeEnabled()
    expect(retry).toHaveTextContent(transaction.priorVersion)
    expect(retry).not.toHaveTextContent(targetVersion)
  })

  it('renders live coordinator states without inferring update progress', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    await resolveState(getState, { kind: 'idle' })
    openFab()

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'preparing', ...transaction },
    }))

    const busy = await screen.findByRole('button', { name: /updating/i })
    expect(busy).toBeDisabled()
    expect(busy).toHaveTextContent(targetVersion)

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: {
        kind: 'recovery-required',
        code: 'installation_integrity_failed',
        action: 'recheck-installation',
      },
    }))
    const installer = await screen.findByRole('button', { name: /retry update/i })
    expect(installer).toBeDisabled()
    expect(installer).toHaveTextContent(
      'The installed Host and Extension do not match. Run the matching full installer.',
    )
  })

  it('does not let delayed hydration overwrite a newer live projection', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    openFab()
    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'preparing', ...transaction },
    }))
    expect(await screen.findByRole('button', { name: /updating/i })).toBeDisabled()

    await resolveState(getState, { kind: 'available', update: candidate })

    expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /update available/i })).toBeNull()
  })

  it('ignores malformed live state without suppressing valid hydration', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    await renderFab()
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'broken' } }))
    await resolveState(getState, { kind: 'available', update: candidate })
    openFab()

    expect(await screen.findByRole('button', { name: /update available/i }))
      .toHaveTextContent(targetVersion)
  })

  it('delegates start without owning update storage, Host actions, or reload', async () => {
    seedStorage({ pending_update: { version: '9.9.9', url: 'unsafe-legacy-url' } })
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const start = deferNextResponse('DH_UPDATE_START')
    await renderFab()
    await resolveState(getState, { kind: 'available', update: candidate })
    openFab()

    fireEvent.click(await screen.findByRole('button', { name: /update available/i }))

    await waitFor(() => {
      const request = getMessageLog().find(entry => entry.action === 'DH_UPDATE_START')
      expect(request?.payload).toEqual({ type: 'DH_UPDATE_START' })
      expect(Reflect.ownKeys(request?.payload as object)).toEqual(['type'])
    })
    await resolveState(start, { kind: 'preparing', ...transaction })

    expect(getMessageLog().some(entry => entry.action === 'perform_update')).toBe(false)
    expect(chromeMockSpies.storageGet.mock.calls.some(call => referencesPendingUpdate(call[0]))).toBe(false)
    expect(chromeMockSpies.storageRemove.mock.calls.some(call => referencesPendingUpdate(call[0]))).toBe(false)
    expect(chromeMockSpies.runtimeReload).not.toHaveBeenCalled()
    expect(getStorageSnapshot().pending_update).toEqual({
      version: '9.9.9',
      url: 'unsafe-legacy-url',
    })
  })

  it('surfaces a coordinator start failure', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const start = deferNextResponse('DH_UPDATE_START')
    await renderFab()
    await resolveState(getState, { kind: 'available', update: candidate })
    openFab()
    fireEvent.click(await screen.findByRole('button', { name: /update available/i }))
    await act(async () => start.resolve({ handled: false }))

    expect(await screen.findByText('Could not send the update request. Retry.'))
      .toBeInTheDocument()
  })
})
