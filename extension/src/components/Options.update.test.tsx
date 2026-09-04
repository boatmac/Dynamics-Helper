import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  })
}

function referencesPendingUpdate(keys: unknown): boolean {
  return keys === 'pending_update'
    || Array.isArray(keys) && keys.includes('pending_update')
    || typeof keys === 'object' && keys !== null && Object.hasOwn(keys, 'pending_update')
}

describe('Options reliable update projection', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
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
  ] as const)('keeps a cold %s completion visible', async (outcome, expected, version) => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderOptions()
    await resolveState(getState, { kind: 'complete', update: candidate, transactionId: TX, outcome })

    const completion = await screen.findByText(new RegExp(expected, 'i'))
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
