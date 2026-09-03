import { beforeEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('../utils/prefs', () => ({
  usePrefs: () => ({ prefs: state.prefs }),
}))

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

vi.mock('./MenuLogic', () => ({
  useMenuLogic: () => ({
    currentItems: [],
    canGoBack: false,
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
  }),
  resolveDynamicUrl: (value: string) => value,
}))

import FAB from './FAB'

const targetVersion = '2.0.76-beta.1'
const candidate = {
  version: targetVersion,
  url: `https://example.invalid/DynamicsHelper_v${targetVersion}.zip`,
  isPrerelease: true,
}
const transaction = {
  update: candidate,
  transactionId: '0123456789abcdef0123456789abcdef',
  targetVersion,
  priorVersion: '2.0.75-beta.1',
}

function renderFab() {
  return render(
    <PrefsLanguageProvider language="en">
      <FAB />
    </PrefsLanguageProvider>,
  )
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
  })
}

function referencesPendingUpdate(keys: unknown): boolean {
  return keys === 'pending_update'
    || Array.isArray(keys) && keys.includes('pending_update')
    || typeof keys === 'object' && keys !== null && Object.hasOwn(keys, 'pending_update')
}

describe('FAB reliable update projection', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    setManifestVersion(transaction.priorVersion)
    state.trackEvent.mockReset()
    state.scanForErrors.mockReset().mockResolvedValue({
      caseNumber: '1234567890123456',
      ticketTitle: 'Fixture',
      errorText: 'Failure body',
    })
  })

  it('hydrates from one payload-free DH_UPDATE_GET_STATE request', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderFab()

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
  ] as const)('keeps a cold %s completion visible', async (outcome, expected, version) => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderFab()
    await resolveState(getState, { kind: 'complete', update: candidate, outcome })
    openFab()

    const completion = await screen.findByRole('button', { name: new RegExp(expected, 'i') })
    if (outcome === 'committed') expect(completion).toBeDisabled()
    else expect(completion).toBeEnabled()
    expect(completion).toHaveTextContent(version)
  })

  it('labels rollback with the restored version and keeps explicit retry available', async () => {
    const getState = deferNextResponse('DH_UPDATE_GET_STATE')
    renderFab()
    await resolveState(getState, {
      kind: 'complete',
      update: candidate,
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
    renderFab()
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
    renderFab()
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
    renderFab()
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
    renderFab()
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
    renderFab()
    await resolveState(getState, { kind: 'available', update: candidate })
    openFab()
    fireEvent.click(await screen.findByRole('button', { name: /update available/i }))
    await act(async () => start.resolve({ handled: false }))

    expect(await screen.findByText('Could not send the update request. Retry.'))
      .toBeInTheDocument()
  })
})
