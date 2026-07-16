import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { installChromeMock, resetChromeMock } from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

const SECRET = 'SIGNED-BOOKMARK-SECRET'
const SIGNED_URL = `https://bookmarks.example/resource?sig=${SECRET}#private`
const telemetry = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  trackException: vi.fn(),
}))

vi.mock('../utils/telemetry', () => ({
  ...telemetry,
  hashCaseId: vi.fn().mockResolvedValue('hash'),
}))

vi.mock('../utils/prefs', () => {
  const prefs = {
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
  }
  return {
    usePrefs: () => ({ prefs }),
    mergeRootPathOverride: (value: typeof prefs) => value,
  }
})

vi.mock('../utils/pageReader', () => ({
  PageReader: {
    scanForErrors: vi.fn().mockResolvedValue({
      caseNumber: '1234567890123456',
      ticketTitle: 'fixture',
    }),
  },
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
    currentItems: [{
      type: 'link',
      label: 'Signed team bookmark',
      url: SIGNED_URL,
      source: 'team',
    }],
    canGoBack: false,
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
  }),
  resolveDynamicUrl: (value: string) => value,
}))

import FAB from './FAB'

describe('FAB bookmark telemetry', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    telemetry.trackEvent.mockClear()
  })

  it('opens the full signed URL but omits it and thrown URL text from telemetry/logs', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {
      throw new Error(`blocked ${SIGNED_URL}`)
    })
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
      vi.spyOn(console, 'debug').mockImplementation(() => {}),
    ]
    render(
      <PrefsLanguageProvider language="en">
        <FAB />
      </PrefsLanguageProvider>,
    )

    fireEvent.click(document.querySelector('.dh-btn') as HTMLButtonElement)
    fireEvent.click(await screen.findByRole('button', { name: 'Signed team bookmark' }))
    await waitFor(() => expect(open).toHaveBeenCalledWith(SIGNED_URL, '_blank'))

    expect(telemetry.trackEvent).toHaveBeenCalledWith('Bookmark Link Clicked', {
      label: 'Signed team bookmark',
      source: 'team',
      type: 'link',
    })
    const observable = JSON.stringify({
      telemetry: telemetry.trackEvent.mock.calls,
      logs: logs.flatMap(spy => spy.mock.calls.map(call => call.map(value =>
        value instanceof Error ? value.message : String(value)))),
    })
    expect(observable).not.toContain(SECRET)
    expect(observable).not.toContain(SIGNED_URL)
  })
})
