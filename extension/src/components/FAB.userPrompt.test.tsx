import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  chromeMockSpies,
  deferNextResponse,
  installChromeMock,
  resetChromeMock,
} from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const state = vi.hoisted(() => ({
  prefs: {
    buttonText: 'DH',
    primaryColor: '#0D9488',
    offsetBottom: 24,
    offsetRight: 24,
    userPrompt: 'CURRENT PROMPT',
    rootPath: '',
    autoAnalyzeMode: 'disabled' as const,
    enableStatusBubble: true,
    language: 'en' as const,
    analyzeTimeoutSeconds: 1200,
  },
  scanForErrors: vi.fn(),
}))

vi.mock('../utils/telemetry', () => ({
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  hashCaseId: vi.fn().mockResolvedValue('hash'),
}))

vi.mock('../utils/prefs', () => ({
  usePrefs: () => ({ prefs: state.prefs }),
  mergeRootPathOverride: (value: typeof state.prefs, override: string | null) =>
    override === null ? value : { ...value, rootPath: override },
}))

vi.mock('../utils/pageReader', () => ({
  PageReader: { scanForErrors: state.scanForErrors },
}))

vi.mock('../hooks/useAnalysisHydration', () => ({
  useAnalysisHydration: () => ({
    popover: null,
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

describe('FAB Custom User Prompt send wiring', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    state.prefs.userPrompt = 'CURRENT PROMPT'
    state.scanForErrors.mockReset().mockResolvedValue({
      caseNumber: '1234567890123456',
      ticketTitle: 'Fixture',
      errorText: [
        '## Case Number',
        '',
        '1234567890123456',
        '',
        '## Description',
        '',
        'Failure',
        '',
        '## User Prompt',
        '',
        'STALE PROMPT',
      ].join('\n'),
    })
  })

  it('replaces a stale preformatted prompt with the current value at send time', async () => {
    deferNextResponse('analyze_error')
    render(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )

    await waitFor(() => expect(state.scanForErrors).toHaveBeenCalled())
    fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
    const analyze = await screen.findByRole('button', { name: /^analyze$/i })
    await waitFor(() => expect(analyze).not.toBeDisabled())
    fireEvent.click(analyze)

    await waitFor(() => {
      const message = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .find(value => value?.payload?.action === 'analyze_error')
      expect(message).toBeDefined()
      const sent = message.payload.payload.text as string
      expect(sent).toContain('## User Prompt\n\nCURRENT PROMPT')
      expect(sent).not.toContain('STALE PROMPT')
      expect(sent.match(/^## User Prompt$/gm)).toHaveLength(1)
    })
  })
})
