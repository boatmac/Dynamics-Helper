import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { deferNextResponse, installChromeMock, resetChromeMock } from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const state = vi.hoisted(() => ({
  hydrationPending: true,
  hydrationRequestId: 'hydrated-A',
  analyzeTimeoutSeconds: 1200,
  scanForErrors: vi.fn(),
  trackEvent: vi.fn(),
  hashCaseId: vi.fn(),
}))

vi.mock('../utils/telemetry', () => ({
  trackEvent: state.trackEvent,
  trackException: vi.fn(),
  hashCaseId: state.hashCaseId,
}))

vi.mock('../utils/prefs', () => ({
  usePrefs: () => ({
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
      analyzeTimeoutSeconds: state.analyzeTimeoutSeconds,
    },
  }),
  mergeRootPathOverride: (value: unknown) => value,
}))

vi.mock('../utils/pageReader', () => ({
  PageReader: { scanForErrors: state.scanForErrors },
}))

vi.mock('../hooks/useAnalysisHydration', () => ({
  useAnalysisHydration: () => ({
    popover: null,
    pending: state.hydrationPending
      ? { caseNumber: '1234567890123456', requestId: state.hydrationRequestId, startTime: Date.now() }
      : null,
    isAnalyzing: state.hydrationPending,
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

async function renderOpenFab() {
  const view = render(
    <PrefsLanguageProvider language="en">
      <FAB />
    </PrefsLanguageProvider>,
  )
  await waitFor(() => expect(state.scanForErrors).toHaveBeenCalled())
  fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
  return { view, analyze: await screen.findByRole('button', { name: /^analyze$/i }) }
}

describe('FAB analyzing source reconciliation', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    state.hydrationPending = true
    state.hydrationRequestId = 'hydrated-A'
    state.analyzeTimeoutSeconds = 1200
    state.trackEvent.mockReset()
    state.hashCaseId.mockReset().mockResolvedValue('hash')
    state.scanForErrors.mockReset().mockResolvedValue({
      caseNumber: '1234567890123456',
      ticketTitle: 'Fixture',
      errorText: 'Failure body',
    })
  })

  it('clears a hydrated spinner when a case switch has no matching pending request', async () => {
    const { view, analyze } = await renderOpenFab()
    await waitFor(() => expect(analyze).toBeDisabled())

    state.hydrationPending = false
    view.rerender(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )

    await waitFor(() => expect(analyze).not.toBeDisabled())
  })

  it('clears a hydrated spinner when pending expires or storage hydration clears', async () => {
    const { view, analyze } = await renderOpenFab()
    await waitFor(() => expect(analyze).toBeDisabled())
    state.hydrationPending = false
    view.rerender(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )
    await waitFor(() => expect(analyze).not.toBeDisabled())
  })

  it('does not let hydration false clear an active local request; completion clears it', async () => {
    state.hydrationPending = false
    const response = deferNextResponse('analyze_error')
    const { view, analyze } = await renderOpenFab()
    await waitFor(() => expect(analyze).not.toBeDisabled())
    fireEvent.click(analyze)
    await waitFor(() => expect(analyze).toBeDisabled())

    state.hydrationPending = true
    view.rerender(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )
    state.hydrationPending = false
    view.rerender(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )
    expect(analyze).toBeDisabled()

    await act(async () => response.resolve({
      status: 'success',
      data: {
        status: 'success',
        data: { markdown: 'complete', saved_to: 'report.md' },
      },
    }))
    await waitFor(() => expect(screen.getByText('complete')).toBeInTheDocument())
    fireEvent.click(screen.getByTitle('Close'))
    fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
    await waitFor(() => expect(screen.getByRole('button', { name: /^analyze$/i })).not.toBeDisabled())
  })

  it('updates hydrated pending identity from true A to true B', async () => {
    const response = deferNextResponse('analyze_error')
    const randomUuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-00000000000a',
    )
    try {
      state.hydrationRequestId = '00000000-0000-4000-8000-00000000000a'
      const { view, analyze } = await renderOpenFab()
      await waitFor(() => expect(analyze).toBeDisabled())

      await act(async () => {
        window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
          detail: { selectionText: 'request A context' },
        }))
        await Promise.resolve()
      })
      state.hydrationRequestId = '00000000-0000-4000-8000-00000000000b'
      view.rerender(
        <PrefsLanguageProvider language="en">
          <FAB />
        </PrefsLanguageProvider>,
      )
      await act(async () => response.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'request A complete', saved_to: 'a.md' },
        },
      }))

      await waitFor(() => expect(screen.getByText('request A complete')).toBeInTheDocument())
      fireEvent.click(screen.getByTitle('Close'))
      fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
      await waitFor(() => expect(
        screen.getByRole('button', { name: /^analyze$/i }),
      ).toBeDisabled())

      state.hydrationPending = false
      view.rerender(
        <PrefsLanguageProvider language="en">
          <FAB />
        </PrefsLanguageProvider>,
      )
      await waitFor(() => expect(
        screen.getByRole('button', { name: /^analyze$/i }),
      ).not.toBeDisabled())
    } finally {
      randomUuid.mockRestore()
    }
  })

  it('keeps request B active when request A resolves and reaches its old timeout', async () => {
    state.hydrationPending = false
    state.analyzeTimeoutSeconds = 60
    const responseA = deferNextResponse('analyze_error')
    const responseB = deferNextResponse('analyze_error')
    const randomUuid = vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-00000000000a')
      .mockReturnValueOnce('00000000-0000-4000-8000-00000000000b')
    const { analyze } = await renderOpenFab()
    vi.useFakeTimers()
    try {
      fireEvent.click(analyze)
      await act(async () => {
        vi.advanceTimersByTime(10_000)
        await Promise.resolve()
      })
      await act(async () => {
        window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
          detail: { selectionText: 'request B context' },
        }))
        await Promise.resolve()
      })

      await act(async () => responseA.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'STALE REQUEST A', saved_to: 'a.md' },
        },
      }))
      expect(analyze).toBeDisabled()
      expect(screen.queryByText('STALE REQUEST A')).toBeNull()

      await act(async () => {
        vi.advanceTimersByTime(60_001)
        await Promise.resolve()
      })
      expect(analyze).toBeDisabled()
      expect(state.trackEvent).not.toHaveBeenCalledWith('Analyze Timeout')

      await act(async () => responseB.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'REQUEST B COMPLETE', saved_to: 'b.md' },
        },
      }))
      expect(screen.getByText('REQUEST B COMPLETE')).toBeInTheDocument()
      fireEvent.click(screen.getByTitle('Close'))
      fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
      expect(screen.getByRole('button', { name: /^analyze$/i })).not.toBeDisabled()
    } finally {
      act(() => vi.clearAllTimers())
      vi.useRealTimers()
      randomUuid.mockRestore()
    }
  })

  it('keeps B ownership while stale A awaits its case hash', async () => {
    state.hydrationPending = false
    const responseA = deferNextResponse('analyze_error')
    const responseB = deferNextResponse('analyze_error')
    let resolveHashA!: (value: string) => void
    state.hashCaseId
      .mockImplementationOnce(() => new Promise(resolve => { resolveHashA = resolve }))
      .mockResolvedValueOnce('hash-b')
    const randomUuid = vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-00000000000a')
      .mockReturnValueOnce('00000000-0000-4000-8000-00000000000b')
    try {
      const { analyze } = await renderOpenFab()
      fireEvent.click(analyze)
      await act(async () => responseA.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'STALE A HASH RESULT', saved_to: 'a.md' },
        },
      }))
      await waitFor(() => expect(state.hashCaseId).toHaveBeenCalledTimes(1))

      await act(async () => {
        window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
          detail: { selectionText: 'request B context' },
        }))
        await Promise.resolve()
      })
      expect(analyze).toBeDisabled()

      await act(async () => resolveHashA('hash-a'))
      expect(analyze).toBeDisabled()
      expect(screen.queryByText('STALE A HASH RESULT')).toBeNull()
      expect(state.trackEvent.mock.calls.some(call => [
        'Analyze Success',
        'Case Analyzed',
        'Analyze Failed',
        'Analyze Host Error',
        'Analyze Exception',
      ].includes(call[0]))).toBe(false)

      await act(async () => responseB.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'REQUEST B AFTER HASH', saved_to: 'b.md' },
        },
      }))
      await waitFor(() => expect(screen.getByText('REQUEST B AFTER HASH')).toBeInTheDocument())
      expect(state.trackEvent.mock.calls.filter(call => call[0] === 'Analyze Success')).toHaveLength(1)
    } finally {
      randomUuid.mockRestore()
    }
  })

  it('does not emit an A exception when its deferred hash rejects after B starts', async () => {
    state.hydrationPending = false
    const responseA = deferNextResponse('analyze_error')
    const responseB = deferNextResponse('analyze_error')
    let rejectHashA!: (reason: Error) => void
    state.hashCaseId
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectHashA = reject }))
      .mockResolvedValueOnce('hash-b')
    const randomUuid = vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-00000000000a')
      .mockReturnValueOnce('00000000-0000-4000-8000-00000000000b')
    try {
      const { analyze } = await renderOpenFab()
      fireEvent.click(analyze)
      await act(async () => responseA.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'STALE A HASH ERROR', saved_to: 'a.md' },
        },
      }))
      await waitFor(() => expect(state.hashCaseId).toHaveBeenCalledTimes(1))
      await act(async () => {
        window.dispatchEvent(new CustomEvent('dh-trigger-analyze', {
          detail: { selectionText: 'request B context' },
        }))
        await Promise.resolve()
      })

      await act(async () => rejectHashA(new Error('hash failed')))
      expect(analyze).toBeDisabled()
      expect(screen.queryByText(/hash failed/i)).toBeNull()
      expect(state.trackEvent).not.toHaveBeenCalledWith(
        'Analyze Exception',
        { errorCode: 'unclassified' },
      )

      await act(async () => responseB.resolve({
        status: 'success',
        data: {
          status: 'success',
          data: { markdown: 'REQUEST B AFTER HASH ERROR', saved_to: 'b.md' },
        },
      }))
      await waitFor(() => expect(screen.getByText('REQUEST B AFTER HASH ERROR')).toBeInTheDocument())
    } finally {
      randomUuid.mockRestore()
    }
  })
})
