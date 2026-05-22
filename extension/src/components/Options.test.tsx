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

    // Catch-up RPC: hydration window saw 1 user-touched field, so after
    // the merge the host must receive an update_config carrying the
    // user's value ('en'), NOT the host's conflicting value ('zh').
    // This was previously a latent production race — closure variable
    // mergedPrefs was assigned inside a setPrefs(prev => ...) updater
    // and read by the catch-up block AFTER setPrefs returned. React 19
    // schedules updaters on later microtask ticks, so mergedPrefs was
    // null when the catch-up check ran and the RPC was silently skipped.
    // Real Chrome happened to mask the bug because IPC latency gave
    // React time to flush. The fix moves the catch-up RPC inside the
    // updater closure (Options.tsx ~819) so it reads newPrefs/prev
    // directly.
    await waitFor(() => {
      const catchUpCall = chromeMockSpies.sendMessage.mock.calls.find((c) => {
        const msg = c[0] as {
          type?: string
          payload?: {
            action?: string
            payload?: { config?: { extension_preferences?: { language?: string } } }
          }
        }
        return (
          msg?.type === 'NATIVE_MSG' &&
          msg?.payload?.action === 'update_config' &&
          msg?.payload?.payload?.config?.extension_preferences?.language === 'en'
        )
      })
      expect(catchUpCall).toBeDefined()
    })
  })
})
