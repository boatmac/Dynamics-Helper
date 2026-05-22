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

/**
 * Spec-aligned regression suite for the Options hydration window.
 *
 * Each test maps 1:1 to an invariant in
 *   docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md
 * § 4 (behavioral changes) and § 5 (test matrix).
 *
 * "Hydration window" = the time between Options mounting and the host's
 * get_config response landing (and prefsHydratedRef.current flipping true).
 * During this window, persistPrefs runs only segment 1 (storage write);
 * segments 2 (host RPC) and 3 (manifest fetch) are gated. The hydration
 * merge respects userTouchedFieldsRef so user edits during the window
 * win over host's stale config.json values.
 *
 * Test naming: T-Inv{N} where N matches the invariant number below.
 *   Inv1 — Storage write succeeds during the window (segment 1 ungated)
 *   Inv2 — Host RPC is gated during the window (segment 2 gated)
 *   Inv3 — Hydration merge skips touched fields
 *   Inv4 — Catch-up RPC at hydration COMPLETE pushes user value to host
 *   Inv5 — No catch-up RPC when nothing was touched (no-noise rule)
 *   Inv6 — Reset during window survives merge (all fields marked touched)
 *
 * Production wiring:
 *   - persistPrefs (Options.tsx:1064)
 *   - userTouchedFieldsRef (declared near prefs state)
 *   - mount useEffect with get_config handler (Options.tsx:~660)
 *   - hydration merge inside setPrefs updater (Options.tsx:~715)
 *   - catch-up RPC inside the same updater (Options.tsx:~833 after the
 *     2026-05-22 race fix)
 *   - handleReset (Options.tsx:1146)
 */

// ---------- shared helpers ----------

const findLanguageSelect = async (): Promise<HTMLSelectElement> => {
  return await waitFor(() => {
    const el = document.querySelector('select[name="language"]') as HTMLSelectElement | null
    if (!el) throw new Error('language select not yet rendered')
    return el
  })
}

// Pick the latest update_config sendMessage call whose
// extension_preferences contains the given key/value pair.
const findCatchUpCall = (key: string, value: unknown) =>
  chromeMockSpies.sendMessage.mock.calls.find((c) => {
    const msg = c[0] as {
      type?: string
      payload?: {
        action?: string
        payload?: { config?: { extension_preferences?: Record<string, unknown> } }
      }
    }
    return (
      msg?.type === 'NATIVE_MSG' &&
      msg?.payload?.action === 'update_config' &&
      msg?.payload?.payload?.config?.extension_preferences?.[key] === value
    )
  })

// Count update_config sendMessage calls regardless of payload contents.
// Used by Inv2 (must be 0 during window) and Inv5 (must be 0 with empty
// touched set).
const countUpdateConfigCalls = () =>
  chromeMockSpies.sendMessage.mock.calls.filter((c) => {
    const msg = c[0] as { type?: string; payload?: { action?: string } }
    return msg?.type === 'NATIVE_MSG' && msg?.payload?.action === 'update_config'
  }).length

// Most recent dh_prefs storage.set carrying the given key.
const findStorageWrite = (key: string) =>
  chromeMockSpies.storageSet.mock.calls.findLast((c) => {
    const arg = c[0] as { dh_prefs?: Record<string, unknown> }
    return arg?.dh_prefs?.[key] !== undefined
  })

// Resolve get_config inside act() so React processes the response
// callback's setPrefs updater (and the catch-up RPC inside it) within
// the same tick. Without act() React warns and assertions race.
const resolveHostConfig = async (
  deferred: ReturnType<typeof deferNextResponse>,
  extensionPrefs: Record<string, unknown>,
) => {
  await act(async () => {
    deferred.resolve({
      status: 'success',
      data: {
        host_version: '2.0.70-test',
        extension_preferences: extensionPrefs,
      },
    })
  })
}

// ---------- T-Inv1 ----------

describe('Options hydration window — Inv1: storage write succeeds during window', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('writes the user edit to chrome.storage.local BEFORE host get_config resolves', async () => {
    // Defer get_config indefinitely — we never resolve it. This proves
    // the storage write is independent of hydration completion (segment
    // 1 of persistPrefs runs unconditionally per spec § 4.1).
    deferNextResponse('get_config')

    render(<Options />)
    const select = await findLanguageSelect()

    fireEvent.change(select, { target: { value: 'en' } })

    // Storage must reflect 'en' WITHOUT having to wait for host response.
    await waitFor(() => {
      const write = findStorageWrite('language')
      expect(write).toBeDefined()
      const arg = write![0] as { dh_prefs: { language: string } }
      expect(arg.dh_prefs.language).toBe('en')
    })

    // UI must also reflect the edit (proves setPrefs ran).
    expect(select.value).toBe('en')
  })
})

// ---------- T-Inv2 ----------

describe('Options hydration window — Inv2: host RPC gated during window', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('does NOT send update_config to host while get_config is still pending', async () => {
    deferNextResponse('get_config')

    render(<Options />)
    const select = await findLanguageSelect()

    fireEvent.change(select, { target: { value: 'en' } })

    // Wait until storage write proves the edit has been processed.
    // Then assert no update_config has leaked through. Spec § 4.1
    // segment 2 must be gated on prefsHydratedRef.
    await waitFor(() => {
      expect(findStorageWrite('language')).toBeDefined()
    })

    expect(countUpdateConfigCalls()).toBe(0)
  })
})

// ---------- T-Inv3 ----------

describe('Options hydration window — Inv3: merge skips touched fields', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('does NOT overwrite user-edited language when host returns a different value', async () => {
    const getConfigDeferred = deferNextResponse('get_config')

    render(<Options />)
    const select = await findLanguageSelect()

    fireEvent.change(select, { target: { value: 'en' } })
    expect(select.value).toBe('en')

    // Host responds with conflicting value. Merge must skip language
    // because userTouchedFieldsRef contains 'language' (spec § 4.3).
    await resolveHostConfig(getConfigDeferred, { language: 'zh' })

    // Final storage state holds 'en' (most recent storage.set call
    // carries 'en', not 'zh'). If merge had overwritten, the post-merge
    // storage.set inside the updater (Options.tsx:807) would write 'zh'.
    await waitFor(() => {
      const write = findStorageWrite('language')
      expect(write).toBeDefined()
      const arg = write![0] as { dh_prefs: { language: string } }
      expect(arg.dh_prefs.language).toBe('en')
    })

    expect(select.value).toBe('en')
  })
})

// ---------- T-Inv4 ----------

describe('Options hydration window — Inv4: catch-up RPC at hydration COMPLETE', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('sends update_config carrying the user value after host get_config resolves', async () => {
    const getConfigDeferred = deferNextResponse('get_config')

    render(<Options />)
    const select = await findLanguageSelect()

    fireEvent.change(select, { target: { value: 'en' } })

    // Before hydration: zero update_config calls (Inv2 redux — sanity).
    await waitFor(() => {
      expect(findStorageWrite('language')).toBeDefined()
    })
    expect(countUpdateConfigCalls()).toBe(0)

    await resolveHostConfig(getConfigDeferred, { language: 'zh' })

    // After hydration: catch-up RPC fires with user's 'en'. Spec § 4.4.
    // Production race fix (commit 0265a74) made this assertion reliable
    // under jsdom — pre-fix, the catch-up read a closure variable that
    // React 19 hadn't assigned yet and the RPC was silently skipped.
    await waitFor(() => {
      expect(findCatchUpCall('language', 'en')).toBeDefined()
    })
  })
})

// ---------- T-Inv5 ----------

describe('Options hydration window — Inv5: no catch-up RPC when nothing touched', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('does NOT send catch-up update_config when user made no edits during the window', async () => {
    const getConfigDeferred = deferNextResponse('get_config')

    render(<Options />)
    await findLanguageSelect() // Wait for mount to finish wiring.

    // No user edits. Resolve hydration with a value that differs from
    // DEFAULT_PREFS — merge will commit it but touched set is empty so
    // catch-up must skip the RPC (spec § 4.4 "empty touched set = no
    // catch-up RPC fires (no noise)").
    await resolveHostConfig(getConfigDeferred, { language: 'zh' })

    // Give React + microtasks time to settle. Then assert zero
    // update_config calls. We deliberately do NOT wait-for-presence
    // (there's nothing to wait for); instead we give the event loop
    // a couple of turns and then check.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(countUpdateConfigCalls()).toBe(0)
  })
})

// ---------- T-Inv6 ----------

describe('Options hydration window — Inv6: Reset during window survives merge', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    // Reset calls window.confirm — auto-approve in tests.
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('does NOT revert reset values when host get_config responds with pre-reset config', async () => {
    const getConfigDeferred = deferNextResponse('get_config')

    render(<Options />)
    await findLanguageSelect()

    // Find the Reset button. handleReset (Options.tsx:1146) marks ALL
    // DEFAULT_PREFS keys as touched then sets prefs to DEFAULT_PREFS.
    // Spec § 4.5: every reset key must survive a late hydration merge.
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
    const resetButton = buttons.find(b => /reset/i.test(b.textContent || ''))
    if (!resetButton) throw new Error('Reset button not found')

    fireEvent.click(resetButton)

    // Host responds with a NON-default value that would un-reset us if
    // touched set were empty. We pick language='zh' (DEFAULT_PREFS is
    // 'auto') so merge would visibly clobber if guards failed.
    await resolveHostConfig(getConfigDeferred, {
      language: 'zh',
      button_text: 'Z',
      log_level: 'DEBUG',
    })

    // Final storage state must hold DEFAULT_PREFS (post-reset), not
    // host's pre-reset values. We sample three fields that the host
    // explicitly tried to push.
    await waitFor(() => {
      const write = findStorageWrite('language')
      expect(write).toBeDefined()
      const dhPrefs = (write![0] as { dh_prefs: Record<string, unknown> }).dh_prefs
      expect(dhPrefs.language).toBe('auto')
      expect(dhPrefs.buttonText).toBe('DH')
      expect(dhPrefs.logLevel).toBe('INFO')
    })
  })
})
