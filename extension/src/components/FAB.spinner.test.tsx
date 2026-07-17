import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { deferNextResponse, installChromeMock, resetChromeMock } from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const state = vi.hoisted(() => ({
  hydrationPending: true,
  scanForErrors: vi.fn(),
}))

vi.mock('../utils/telemetry', () => ({
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  hashCaseId: vi.fn().mockResolvedValue('hash'),
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
      analyzeTimeoutSeconds: 1200,
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
      ? { caseNumber: '1234567890123456', requestId: 'hydrated', startTime: Date.now() }
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
})
