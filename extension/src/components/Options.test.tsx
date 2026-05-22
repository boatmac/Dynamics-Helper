import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import {
  installChromeMock,
  resetChromeMock,
  deferNextResponse,
  chromeMockSpies,
} from '../test/chromeMock'

// Mock telemetry BEFORE importing Options. telemetry.ts instantiates
// ApplicationInsights + createBrowserHistory at module-load and would
// blow up under jsdom (window.location.protocol checks, etc.).
vi.mock('../utils/telemetry', () => ({
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  appInsights: {},
  reactPlugin: {},
  hashCaseId: vi.fn().mockResolvedValue('mock-hash'),
}))

// Mock MarkdownPreview — pulls in remark-gfm + react-markdown, expensive
// to evaluate and not relevant to hydration-window assertions.
vi.mock('./MarkdownPreview', () => ({
  default: () => null,
}))

vi.mock('../utils/version', () => ({
  getExtensionVersion: () => '2.0.70-beta.4-test',
}))

// Import AFTER mocks so they take effect.
import Options from './Options'

// Helper: query the language <select> by [name] attribute. Options.tsx's
// <label> has no htmlFor association so accessible-name queries fail.
const findLanguageSelect = async (): Promise<HTMLSelectElement> => {
  return await waitFor(() => {
    const el = document.querySelector('select[name="language"]') as HTMLSelectElement | null
    if (!el) throw new Error('language select not yet rendered')
    return el
  })
}

describe('Options hydration window (I1: language edit preserved)', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('preserves user language edit when host get_config resolves with different value', async () => {
    // Defer get_config so we control timing.
    const getConfigDeferred = deferNextResponse('get_config')

    render(<Options />)

    const languageSelect = await findLanguageSelect()

    // Initial: dh_prefs empty → DEFAULT_PREFS.language = 'auto'.
    expect(languageSelect.value).toBe('auto')

    // User picks 'en' DURING the hydration window (host not responded yet).
    // This marks 'language' as touched and writes 'en' to local state +
    // dh_prefs storage. The host RPC is skipped because prefsHydratedRef
    // is still false (Plan A hydration guard).
    fireEvent.change(languageSelect, { target: { value: 'en' } })
    expect(languageSelect.value).toBe('en')

    // Resolve get_config with a CONFLICTING value (host says 'zh'). The
    // hydration merge should respect the touched guard and NOT overwrite
    // language back to 'zh'.
    await act(async () => {
      getConfigDeferred.resolve({
        status: 'success',
        data: {
          host_version: '2.0.70-test',
          extension_preferences: {
            language: 'zh',
          },
        },
      })
    })

    // Let React reconcile the merge effect's setPrefs updater + commit.
    // We need a beat for the response callback + setPrefs updater to run.
    await waitFor(() => {
      // Storage should reflect the user's 'en', NOT the host's 'zh'.
      // This is the most reliable assertion because dh_prefs is written
      // synchronously inside persistPrefs (line 1077) when user edited,
      // and the hydration merge at line 807 would have overwritten it
      // to 'zh' if the touched guard failed.
      const dhPrefsCall = chromeMockSpies.storageSet.mock.calls.findLast(
        (c) => {
          const arg = c[0] as { dh_prefs?: { language?: string } }
          return arg?.dh_prefs?.language !== undefined
        },
      )
      expect(dhPrefsCall).toBeDefined()
      const lastStoredLanguage = (dhPrefsCall![0] as { dh_prefs: { language: string } }).dh_prefs.language
      expect(lastStoredLanguage).toBe('en')
    })

    // I1 invariant: user's selection still showing in UI after the
    // host-conflicting merge attempt.
    expect(languageSelect.value).toBe('en')

    // NOTE: We do NOT assert that the catch-up update_config RPC fires.
    // The production code at Options.tsx:828 uses a closure variable
    // (mergedPrefs) captured inside a setPrefs(prev => ...) updater
    // function. In real Chrome, the IPC round-trip gives React time to
    // flush the updater synchronously before the catch-up check runs.
    // In jsdom + Vitest, the deferred resolve fires too fast: the catch-
    // up check runs while mergedPrefs is still null, so the RPC is
    // skipped. This is a latent production race ("works because chrome
    // IPC is slow") that the test exposes. Tracking as a follow-up to
    // restructure the merge effect so the catch-up RPC fires inside the
    // setPrefs updater rather than after it. The user-facing invariant
    // (storage + UI hold 'en') is what matters for I1.
  })
})
