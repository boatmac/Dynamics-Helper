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
} from '../test/chromeMock'

vi.mock('react-dnd', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dnd')>()),
  DndProvider: ({ children }: { children: ReactNode }) => children,
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, vi.fn()],
}))

vi.mock('../utils/telemetry', () => ({
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  appInsights: {},
  reactPlugin: {},
  hashCaseId: vi.fn().mockResolvedValue('mock-hash'),
}))

vi.mock('./MarkdownPreview', () => ({ default: () => null }))
vi.mock('../utils/version', () => ({
  getExtensionVersion: () => '2.0.75-beta.1',
}))

import Options from './Options'

const targetVersion = '2.0.76-beta.1'
const candidate = {
  version: targetVersion,
  url: `https://example.invalid/DynamicsHelper_v${targetVersion}.zip`,
  isPrerelease: true,
}
const TX = '0123456789abcdef0123456789abcdef'
const TX_B = 'fedcba9876543210fedcba9876543210'
let visibility: DocumentVisibilityState
let originalHiddenDescriptor: PropertyDescriptor | undefined
let originalVisibilityDescriptor: PropertyDescriptor | undefined

function setOptionsDocumentVisibility(next: DocumentVisibilityState): void {
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

function renderOptions() {
  deferNextResponse('get_config')
  return render(<Options />)
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

describe('Options reliable update projection', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
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
  })

  it('hydrates from one payload-free DH_UPDATE_GET_STATE request', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()

    await waitFor(() => {
      const request = getMessageLog().find(entry => entry.action === 'DH_UPDATE_GET_STATE')
      expect(request?.payload).toEqual({ type: 'DH_UPDATE_GET_STATE' })
      expect(Reflect.ownKeys(request?.payload as object)).toEqual(['type'])
    })

    await resolveState(getState, { kind: 'available', update: candidate })

    expect(await screen.findByRole('button', { name: /update now/i })).toHaveTextContent(targetVersion)
  })

  it.each([
    ['committed', 'Update completed successfully.', targetVersion],
    ['rolled-back', 'previous version was restored', transaction.priorVersion],
  ] as const)('renders a cold %s completion immediately', async (outcome, expected, version) => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, { kind: 'complete', update: candidate, transactionId: TX, outcome })

    const completion = await screen.findByText(new RegExp(expected, 'i'))
    expect(completion).toHaveAttribute('role', 'status')
    expect(completion).toHaveTextContent(version)
  })

  it('does not ACK complete while the Options document is hidden', async () => {
    vi.useFakeTimers()
    visibility = 'hidden'
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('starts one full ACK interval for foreground complete Options', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('requires a fresh interval after Options foreground-background-foreground', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    setOptionsDocumentVisibility('hidden')
    act(() => vi.advanceTimersByTime(20_000))
    setOptionsDocumentVisibility('visible')
    act(() => vi.advanceTimersByTime(7_999))
    expect(ackMessages()).toHaveLength(0)
    act(() => vi.advanceTimersByTime(1))
    expect(ackMessages()).toHaveLength(1)
  })

  it('cancels the foreground Options epoch on authoritative departure', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(ackMessages()).toHaveLength(0)
  })

  it('keeps foreground completion visible through 7,999 ms and sends exactly one exact ACK at 8,000 ms', async () => {
    vi.useFakeTimers()
    const persisted = { kind: 'complete', transactionId: TX }
    seedStorage({ dh_update_state: persisted })
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState())

    act(() => vi.advanceTimersByTime(7_999))
    expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
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
    renderOptions()
    await resolveState(getState, completeState())

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
    const first = renderOptions()
    await resolveState(firstGetState, completeState())
    act(() => vi.advanceTimersByTime(4_000))
    first.unmount()
    act(() => vi.advanceTimersByTime(10_000))
    expect(ackMessages()).toHaveLength(0)

    const secondGetState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(secondGetState, completeState())
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
      renderOptions()
      await resolveState(getState, completeState())
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

  it.each(['rejected', 'handled-false'] as const)(
    'keeps completion visible after a failed ACK and retries only after a fresh visibility epoch (%s)',
    async result => {
      vi.useFakeTimers()
      const firstGetState = deferNextResponse('DH_UPDATE_GET_STATE')
      const firstAck = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
      renderOptions()
      await resolveState(firstGetState, completeState())

      act(() => vi.advanceTimersByTime(8_000))
      expect(ackMessages()).toHaveLength(1)
      await act(async () => {
        if (result === 'rejected') firstAck.reject(new Error('disconnected'))
        else firstAck.resolve({ handled: false })
      })
      expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
      act(() => vi.advanceTimersByTime(30_000))
      expect(ackMessages()).toHaveLength(1)

      setOptionsDocumentVisibility('hidden')
      setOptionsDocumentVisibility('visible')
      deferNextResponse('DH_UPDATE_ACK_COMPLETE')
      act(() => vi.advanceTimersByTime(7_999))
      expect(ackMessages()).toHaveLength(1)
      act(() => vi.advanceTimersByTime(1))
      expect(ackMessages()).toHaveLength(2)
      expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
    },
  )

  it('ignores a successful ACK response until an authoritative state broadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderOptions()
    await resolveState(getState, completeState())

    act(() => vi.advanceTimersByTime(8_000))
    await act(async () => {
      ack.resolve({ handled: true, state: { kind: 'idle' } })
    })

    expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')
  })

  it('ignores a delayed ACK response after a newer authoritative state arrives', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const ack = deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(8_000))

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    }))
    await act(async () => {
      ack.resolve({ handled: true, state: { kind: 'idle' } })
    })

    expect(screen.getByRole('button', { name: /update now/i })).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('hides committed completion only after an authoritative idle broadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    deferNextResponse('DH_UPDATE_ACK_COMPLETE')
    renderOptions()
    await resolveState(getState, completeState())
    act(() => vi.advanceTimersByTime(8_000))
    expect(screen.getByRole('status')).toHaveTextContent('Update completed successfully.')

    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'idle' } }))

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('button', { name: /update now|retry update/i })).toBeNull()
  })

  it('replaces rollback wording with an enabled ordinary available action after authoritative available broadcast', async () => {
    vi.useFakeTimers()
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, completeState(TX, 'rolled-back'))
    expect(screen.getByRole('status')).toHaveTextContent('previous version was restored')

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'available', update: candidate },
    }))

    const update = screen.getByRole('button', { name: /update now/i })
    expect(update).toBeEnabled()
    expect(update).toHaveTextContent(targetVersion)
    expect(screen.queryByText(/previous version was restored/i)).toBeNull()
  })

  it.each([
    ['committed', 'Update completed successfully.', targetVersion],
    ['rolled-back', 'previous version was restored', transaction.priorVersion],
  ] as const)('renders a live %s completion immediately', async (outcome, expected, version) => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, { kind: 'idle' })

    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'complete', update: candidate, transactionId: TX, outcome },
    }))

    const completion = screen.getByText(new RegExp(expected, 'i'))
    expect(completion).toHaveAttribute('role', 'status')
    expect(completion).toHaveTextContent(version)
  })

  it('labels rollback with the restored version and keeps explicit retry available', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, {
      kind: 'complete',
      update: candidate,
      transactionId: TX,
      outcome: 'rolled-back',
    })

    const completion = await screen.findByRole('status')
    expect(completion).toHaveTextContent(transaction.priorVersion)
    expect(completion).not.toHaveTextContent(targetVersion)
    expect(screen.getByRole('button', { name: /retry update/i })).toBeEnabled()
  })

  it('renders busy and persistent installer-required projections', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, { kind: 'idle' })

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
    const guidance = await screen.findByText(
      'The installed Host and Extension do not match. Run the matching full installer.',
    )
    expect(guidance).toHaveAttribute('role', 'alert')
    expect(screen.getByRole('button', { name: /retry update/i })).toBeDisabled()
  })

  it('does not let delayed hydration overwrite a newer live projection', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    act(() => emitRuntimeMessage({
      type: 'DH_UPDATE_STATE',
      state: { kind: 'preparing', ...transaction },
    }))
    expect(await screen.findByRole('button', { name: /updating/i })).toBeDisabled()

    await resolveState(getState, { kind: 'available', update: candidate })

    expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /update now/i })).toBeNull()
  })

  it('ignores malformed live state without suppressing valid hydration', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    act(() => emitRuntimeMessage({ type: 'DH_UPDATE_STATE', state: { kind: 'broken' } }))
    await resolveState(getState, { kind: 'available', update: candidate })

    expect(await screen.findByRole('button', { name: /update now/i }))
      .toHaveTextContent(targetVersion)
  })

  it('delegates start without owning update storage, Host actions, or reload', async () => {
    seedStorage({ pending_update: { version: '9.9.9', url: 'unsafe-legacy-url' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const start = deferNextResponse('DH_UPDATE_START')
    renderOptions()
    await resolveState(getState, { kind: 'available', update: candidate })

    fireEvent.click(await screen.findByRole('button', { name: /update now/i }))

    await waitFor(() => {
      const request = getMessageLog().find(entry => entry.action === 'DH_UPDATE_START')
      expect(request?.payload).toEqual({ type: 'DH_UPDATE_START' })
      expect(Reflect.ownKeys(request?.payload as object)).toEqual(['type'])
    })
    await resolveState(start, { kind: 'preparing', ...transaction })

    expect(getMessageLog().some(entry => (
      entry.action === 'perform_update' || entry.action === 'check_updates'
    ))).toBe(false)
    expect(chromeMockSpies.storageGet.mock.calls.some(call => referencesPendingUpdate(call[0]))).toBe(false)
    expect(chromeMockSpies.storageRemove.mock.calls.some(call => referencesPendingUpdate(call[0]))).toBe(false)
    expect(chromeMockSpies.runtimeReload).not.toHaveBeenCalled()
    expect(getStorageSnapshot().pending_update).toEqual({
      version: '9.9.9',
      url: 'unsafe-legacy-url',
    })
    confirm.mockRestore()
  })

  it('surfaces a coordinator start failure', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    const start = deferNextResponse('DH_UPDATE_START')
    renderOptions()
    await resolveState(getState, { kind: 'available', update: candidate })
    fireEvent.click(await screen.findByRole('button', { name: /update now/i }))
    await act(async () => start.resolve({ handled: false }))

    expect(await screen.findByText('Could not send the update request. Retry.'))
      .toBeInTheDocument()
  })
})
