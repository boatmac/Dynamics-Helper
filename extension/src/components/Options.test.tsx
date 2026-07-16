import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StrictMode } from 'react'
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react'
import {
  installChromeMock,
  resetChromeMock,
  deferNextResponse,
  deferNextStorageGet,
  deferNextStorageRemove,
  deferNextStorageSet,
  getStorageSnapshot,
  seedStorage,
  chromeMockSpies,
} from '../test/chromeMock'
import { DEFAULT_PREFS } from '../utils/prefs'
import { getTranslation } from '../utils/translations'

const teamCatalogMock = vi.hoisted(() => ({
  syncTeamBookmarks: vi.fn(),
}))

vi.mock('../utils/teamCatalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/teamCatalog')>()),
  syncTeamBookmarks: teamCatalogMock.syncTeamBookmarks,
}))

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
  getExtensionVersion: () => '2.0.70-beta.5-test',
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
  // Sidebar-nav layout (v2.0.74): the language select lives in the
  // Appearance section, which is not the default active tab (General).
  // Switch to Appearance first so the select renders, then return it.
  // The hydration invariants under test are section-agnostic — navigating
  // tabs doesn't touch persistPrefs / userTouchedFieldsRef / the merge.
  const navBtn = await waitFor(() => {
    const el = document.querySelector('[data-section="appearance"]') as HTMLButtonElement | null
    if (!el) throw new Error('appearance nav not yet rendered')
    return el
  })
  fireEvent.click(navBtn)
  return await waitFor(() => {
    const el = document.querySelector('select[name="language"]') as HTMLSelectElement | null
    if (!el) throw new Error('language select not yet rendered')
    return el
  })
}

const openCopilotSection = async () => {
  const nav = await waitFor(() => {
    const element = document.querySelector(
      '[data-section="copilot"]',
    ) as HTMLButtonElement | null
    if (!element) throw new Error('copilot nav not rendered')
    return element
  })
  fireEvent.click(nav)
}

const hydrateOptions = async (data: Record<string, unknown>) => {
  const deferred = deferNextResponse('get_config')
  render(<Options />)
  await act(async () => deferred.resolve({ status: 'success', data }))
  await openCopilotSection()
}

const openDhInstructionsEditor = async (): Promise<HTMLTextAreaElement> => {
  fireEvent.click(screen.getAllByRole('button', { name: /edit|编辑/i })[0])
  return screen.getByLabelText(
    /DH-specific Instructions|DH 专用指令/i,
  ) as HTMLTextAreaElement
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
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')

    render(<Options />)
    await findLanguageSelect()

    // Find the Reset button. handleReset (Options.tsx:1146) marks ALL
    // DEFAULT_PREFS keys as touched then sets prefs to DEFAULT_PREFS.
    // Spec § 4.5: every reset key must survive a late hydration merge.
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
    const resetButton = buttons.find(b => /reset/i.test(b.textContent || ''))
    if (!resetButton) throw new Error('Reset button not found')

    fireEvent.click(resetButton)
    await act(async () => resetResponse.resolve({ status: 'success' }))

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

// ---------- About & Help tab (spec 2026-07-08) ----------

describe('Options About & Help tab', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('shows the extension version and a User Guide link when the About tab is active', async () => {
    // Hydration is irrelevant to this tab — defer get_config and never resolve.
    deferNextResponse('get_config')
    render(<Options />)

    const aboutNav = await waitFor(() => {
      const el = document.querySelector('[data-section="about"]') as HTMLButtonElement | null
      if (!el) throw new Error('about nav not yet rendered')
      return el
    })
    fireEvent.click(aboutNav)

    // getExtensionVersion is mocked to '2.0.70-beta.5-test' (top of file).
    await waitFor(() => {
      if (!document.body.textContent?.includes('2.0.70-beta.5-test')) {
        throw new Error('extension version not shown in About tab')
      }
    })

    const guideLink = document.querySelector(
      'a[href="https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md"]',
    ) as HTMLAnchorElement | null
    expect(guideLink).not.toBeNull()
    expect(guideLink!.target).toBe('_blank')
    expect(guideLink!.rel).toContain('noopener')
  })
})

describe('Options delayed initial chrome hydration', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('keeps an explicit instruction clear over a delayed stale storage snapshot', async () => {
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userInstructions: 'STALE-STORAGE' },
    })
    const outerStorageGet = deferNextStorageGet('dh_prefs')
    const storageGet = deferNextStorageGet('dh_prefs')
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    await openCopilotSection()
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'temporary' } })
    fireEvent.change(editor, { target: { value: '' } })
    fireEvent.blur(editor)

    await act(async () => {
      outerStorageGet.resolve(undefined)
      storageGet.resolve(undefined)
    })
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: 'STALE-HOST',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))

    const update = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .find(message => message?.payload?.action === 'update_config')
    expect(update.payload.payload.user_instructions).toBe('')
    expect(update.payload.payload.user_instructions).not.toBe('STALE-STORAGE')
    expect(editor.value).toBe('')
    expect((getStorageSnapshot().dh_prefs as any).userInstructions).toBe('')
    await act(async () => catchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('keeps Reset defaults over a delayed stale storage snapshot', async () => {
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        language: 'zh',
        buttonText: 'STALE',
        userInstructions: 'STALE-STORAGE',
      },
    })
    const outerStorageGet = deferNextStorageGet('dh_prefs')
    const storageGet = deferNextStorageGet('dh_prefs')
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      render(<Options />)
      fireEvent.click(await screen.findByRole('button', { name: /^reset$/i }))
      await act(async () => resetResponse.resolve({ status: 'success' }))

      await act(async () => {
        outerStorageGet.resolve(undefined)
        storageGet.resolve(undefined)
      })
      await act(async () => getConfig.resolve({
        status: 'success',
        data: {
          root_path: 'C:\\Stale',
          _user_instructions_raw: 'STALE-HOST',
          prompt_source_status: { status: 'ok' },
          extension_preferences: {
            language: 'zh',
            button_text: 'STALE',
            use_workspace_only: false,
          },
        },
      }))
      await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))

      const update = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .find(message => message?.payload?.action === 'update_config')
      const ext = update.payload.payload.config.extension_preferences
      expect(ext.language).toBe(DEFAULT_PREFS.language)
      expect(ext.button_text).toBe(DEFAULT_PREFS.buttonText)
      expect(update.payload.payload.user_instructions).toBe('')
      expect(getStorageSnapshot().dh_prefs).toMatchObject(DEFAULT_PREFS)
      await act(async () => catchUp.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('keeps an explicitly selected default-valued field over stale storage', async () => {
    seedStorage({ dh_prefs: { ...DEFAULT_PREFS, language: 'zh' } })
    const outerStorageGet = deferNextStorageGet('dh_prefs')
    const storageGet = deferNextStorageGet('dh_prefs')
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    fireEvent.change(language, { target: { value: DEFAULT_PREFS.language } })

    await act(async () => {
      outerStorageGet.resolve(undefined)
      storageGet.resolve(undefined)
    })
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { language: 'zh', use_workspace_only: false },
      },
    }))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))

    const updates = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updates[0].payload.payload.config.extension_preferences.language).toBe('auto')
    expect(JSON.stringify(updates)).not.toContain('"language":"zh"')
    expect(language.value).toBe('auto')
    expect((getStorageSnapshot().dh_prefs as any).language).toBe('auto')
    await act(async () => catchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })
})

describe('Options selected-team refresh generation', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    teamCatalogMock.syncTeamBookmarks.mockReset()
  })

  async function hydrateTeamOptions() {
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        teamCatalogEnabled: true,
        teamManifestUrl: 'https://example.com/manifest.json',
        team: 'team-a',
      },
      dh_team: 'team-a',
      dh_team_manifest_url: 'https://example.com/manifest.json',
      dh_team_items: [{ type: 'link', label: 'Cached' }],
      dh_team_synced: '2026-01-01T00:00:00.000Z',
      dh_team_manifest: {
        version: 1,
        teams: [
          { id: 'team-a', label: 'Team A', url: 'https://example.com/a.json' },
          { id: 'team-b', label: 'Team B', url: 'https://example.com/b.json' },
        ],
      },
    })
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        team_catalog_enabled: true,
        team_manifest_url: 'https://example.com/manifest.json',
        team: 'team-a',
        use_workspace_only: false,
      },
    })
    fireEvent.click(document.querySelector('[data-section="team"]') as HTMLButtonElement)
  }

  it('ignores a stale refresh result after the selected team changes', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()

    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    const teamSelect = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(teamSelect, { target: { value: 'team-b' } })
    seedStorage({
      dh_team_manifest: {
        version: 1,
        teams: [{ id: 'stale', label: 'Stale Team', url: 'https://example.com/stale.json' }],
      },
    })
    await act(async () => response.resolve({
      status: 'error',
      error: 'OLD TEAM FAILURE',
      data: {
        syncStatus: 'failed',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
      },
    }))

    expect(teamSelect.value).toBe('team-b')
    expect(document.body.textContent).not.toContain('Stale Team')
    expect(document.body.textContent).not.toContain('STALE ONE')
    expect(document.body.textContent).not.toContain('OLD TEAM FAILURE')
    expect(document.body.textContent).toContain('1 items')
    expect(document.body.textContent).toContain(
      new Date('2026-01-01T00:00:00.000Z').toLocaleString(),
    )
  })

  it('ignores a stale refresh result after Reset without restoring UI state', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      seedStorage({
        dh_seen_analysis: {
          caseNumber: '1234567890123456',
          requestId: 'seen-before-reset',
          timestamp: 1,
        },
      })
      fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await act(async () => resetResponse.resolve({ status: 'success' }))
      await waitFor(() => {
        expect(screen.getByRole('status').textContent).toContain('Reset complete')
      })
      await act(async () => response.resolve({
        status: 'error',
        error: 'OLD RESET FAILURE',
        data: {
          syncStatus: 'failed',
          identity: {
            enabled: true,
            manifestUrl: 'https://example.com/manifest.json',
            teamId: 'team-a',
          },
        },
      }))

      await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
      expect(document.body.textContent).not.toContain('STALE AFTER RESET')
      expect(document.body.textContent).not.toContain('OLD RESET FAILURE')
      expect(document.body.textContent).not.toContain('Manifest auth failed')
      expect(chromeMockSpies.sendMessage.mock.calls.some(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toBe(true)
    } finally {
      confirm.mockRestore()
    }
  })

  it('ignores a stale refresh result after the manifest URL changes', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()

    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    const manifest = screen.getByPlaceholderText(
      'https://example.com/team-manifest.json',
    ) as HTMLInputElement
    fireEvent.change(manifest, {
      target: { value: 'https://example.com/new-manifest.json' },
    })
    await act(async () => {
      response.resolve({
        status: 'error',
        error: 'OLD URL FAILURE',
        data: {
          syncStatus: 'failed',
          identity: {
            enabled: true,
            manifestUrl: 'https://example.com/manifest.json',
            teamId: 'team-a',
          },
        },
      })
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(manifest.value).toBe('https://example.com/new-manifest.json')
    expect(document.body.textContent).not.toContain('STALE ONE')
    expect(document.body.textContent).not.toContain('OLD URL FAILURE')
    expect(document.body.textContent).not.toContain('Manifest auth failed')
    expect(document.body.textContent).toContain('0 items')
    expect(document.body.textContent).toContain('Never synced')
  })

  it('applies an unchanged valid refresh result', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()

    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'unchanged',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
        items: [{ type: 'link', label: 'Cached' }],
      },
    }))

    await waitFor(() => {
      expect(document.body.textContent).toContain('Last synced')
      expect(document.body.textContent).toContain('1 items')
    })
  })

  it('routes manual Refresh through the Service Worker and never calls the storage helper', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))

    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.some(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.teamId === 'team-a',
    )).toBe(true))
    expect(teamCatalogMock.syncTeamBookmarks).not.toHaveBeenCalled()
    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'unchanged',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
        items: [{ type: 'link', label: 'Cached' }],
        syncedAt: '2026-07-17T00:00:00.000Z',
      },
    }))
  })

  it('does not dispatch a team change until its preference mirror commits', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const mirror = deferNextStorageSet('dh_prefs')
    const before = chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG',
    ).length

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG',
    )).toHaveLength(before)

    await act(async () => mirror.resolve(undefined))
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.some(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.teamId === 'team-b',
    )).toBe(true))
    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'skipped',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-b',
        },
      },
    }))
  })

  it('does not timestamp a current skipped response', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'skipped',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
      },
    }))

    expect(document.body.textContent).toContain(
      new Date('2026-01-01T00:00:00.000Z').toLocaleString(),
    )
  })

  it('surfaces a current identity-less Service Worker failure', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    await act(async () => response.resolve({
      status: 'error',
      error: 'generic Service Worker failure',
    }))

    await waitFor(() => expect(document.body.textContent).toContain(
      'Could not fetch manifest',
    ))
  })

  it('surfaces a current identity-less team-change failure', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.some(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.teamId === 'team-b',
    )).toBe(true))
    await act(async () => response.resolve({
      status: 'error',
      error: 'generic team-change failure',
    }))

    await waitFor(() => expect(document.body.textContent).toContain(
      'generic team-change failure',
    ))
  })

  it('timestamps a current unchanged response', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'unchanged',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
        items: [{ type: 'link', label: 'Cached' }],
        syncedAt: '2026-07-17T00:00:00.000Z',
      },
    }))

    await waitFor(() => expect(document.body.textContent).toContain(
      new Date('2026-07-17T00:00:00.000Z').toLocaleString(),
    ))
  })

  it('ignores an old team-change failure after the URL changes', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    const manifest = screen.getByPlaceholderText(
      'https://example.com/team-manifest.json',
    ) as HTMLInputElement
    fireEvent.change(manifest, { target: { value: 'https://example.com/new.json' } })
    await act(async () => response.resolve({
      status: 'error',
      error: 'OLD FAILURE MUST NOT WIN',
      data: {
        syncStatus: 'failed',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-b',
        },
      },
    }))

    expect(document.body.textContent).not.toContain('OLD FAILURE MUST NOT WIN')
  })

  it('an old callback cannot stop the spinner for a newer team sync', async () => {
    const oldResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    const currentResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const teamSelect = screen.getByRole('combobox')
    fireEvent.change(teamSelect, { target: { value: 'team-b' } })
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.some(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.teamId === 'team-b',
    )).toBe(true))
    fireEvent.change(teamSelect, { target: { value: 'team-a' } })
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG',
    )).toHaveLength(2))
    await waitFor(() => expect(screen.getByText('Syncing...')).toBeInTheDocument())
    await act(async () => oldResponse.resolve({
      status: 'success',
      data: {
        syncStatus: 'committed',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-b',
        },
        items: [],
      },
    }))

    expect(screen.getByText('Syncing...')).toBeInTheDocument()
    await act(async () => currentResponse.resolve({
      status: 'success',
      data: {
        syncStatus: 'unchanged',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
        items: [{ type: 'link', label: 'Cached' }],
      },
    }))
  })

  it('an old failure cannot replace a newer successful team result', async () => {
    const oldResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    const currentResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const teamSelect = screen.getByRole('combobox')
    fireEvent.change(teamSelect, { target: { value: 'team-b' } })
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.some(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.teamId === 'team-b',
    )).toBe(true))
    fireEvent.change(teamSelect, { target: { value: 'team-a' } })
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG',
    )).toHaveLength(2))

    await act(async () => currentResponse.resolve({
      status: 'success',
      data: {
        syncStatus: 'committed',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-a',
        },
        items: [{ type: 'link', label: 'NEW SUCCESS ITEM' }],
        syncedAt: '2026-07-17T01:00:00.000Z',
      },
    }))
    await act(async () => oldResponse.resolve({
      status: 'error',
      error: 'OLD FAILURE AFTER SUCCESS',
      data: {
        syncStatus: 'failed',
        identity: {
          enabled: true,
          manifestUrl: 'https://example.com/manifest.json',
          teamId: 'team-b',
        },
      },
    }))

    expect(document.body.textContent).not.toContain('OLD FAILURE AFTER SUCCESS')
    expect(document.body.textContent).toContain('1 items')
    expect(document.body.textContent).toContain(
      new Date('2026-07-17T01:00:00.000Z').toLocaleString(),
    )
  })

  it('does not hydrate a cache stamped for another manifest URL', async () => {
    seedStorage({
      dh_team: 'team-a',
      dh_team_manifest_url: 'https://example.com/old-manifest.json',
      dh_team_items: [{ type: 'link', label: 'STALE CACHE ITEM' }],
      dh_team_synced: '2026-07-17T00:00:00.000Z',
      dh_team_manifest: {
        version: 1,
        teams: [{ id: 'stale', label: 'Stale Team', url: 'https://example.com/stale.json' }],
      },
    })
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        team_catalog_enabled: true,
        team_manifest_url: 'https://example.com/manifest.json',
        team: 'team-a',
        use_workspace_only: false,
      },
    })
    fireEvent.click(document.querySelector('[data-section="team"]') as HTMLButtonElement)

    expect(document.body.textContent).not.toContain('Stale Team')
    expect(document.body.textContent).not.toContain('STALE CACHE ITEM')
    expect(document.body.textContent).toContain('Never synced')
    expect(document.body.textContent).toContain('(0 items)')
  })

  it('hydrates a valid stamped cache after Host prefs arrive', async () => {
    seedStorage({
      dh_team: 'team-a',
      dh_team_manifest_url: 'https://example.com/manifest.json',
      dh_team_items: [{ type: 'link', label: 'CURRENT CACHE ITEM' }],
      dh_team_synced: '2026-07-17T00:00:00.000Z',
      dh_team_manifest: {
        version: 1,
        teams: [{ id: 'team-a', label: 'Team A', url: 'https://example.com/a.json' }],
      },
    })
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        team_catalog_enabled: true,
        team_manifest_url: 'https://example.com/manifest.json',
        team: 'team-a',
        use_workspace_only: false,
      },
    })
    fireEvent.click(document.querySelector('[data-section="team"]') as HTMLButtonElement)

    await waitFor(() => {
      expect(document.body.textContent).toContain('Team A')
      expect(document.body.textContent).toContain('(1 items)')
      expect(document.body.textContent).toContain(
        new Date('2026-07-17T00:00:00.000Z').toLocaleString(),
      )
    })
  })
})

describe('Options prompt health repair refresh', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('clears unreadable DH health after a successful instruction replacement', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      prompt_source_status: {
        status: 'error',
        error_code: 'dh_specific_instructions_unreadable',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    const health = deferNextResponse('get_config')
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'replacement' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/DH-specific Instructions/i)

    await act(async () => health.resolve({
      status: 'success',
      data: {
        prompt_source_status: { status: 'ok' },
        root_path: 'C:\\MUST-NOT-HYDRATE',
      },
    }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(editor.value).toBe('replacement')
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    const getConfigCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'get_config')
    expect(getConfigCalls).toHaveLength(2)
    expect(countUpdateConfigCalls()).toBe(1)
  })

  it('clears repository-missing health after Repository ONLY is disabled', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: 'C:\\Repo',
      _user_instructions_raw: 'KEEP',
      prompt_source_status: {
        status: 'error',
        error_code: 'repository_instructions_missing',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: true },
    })
    const health = deferNextResponse('get_config')
    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    fireEvent.click(toggle)
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => health.resolve({
      status: 'success',
      data: { prompt_source_status: { status: 'ok' } },
    }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(toggle.checked).toBe(false)
  })

  it('ignores a stale health response after a newer health check', async () => {
    const update1 = deferNextResponse('update_config')
    const update2 = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: {
        status: 'error',
        error_code: 'dh_core_prompt_missing',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    const health1 = deferNextResponse('get_config')
    const health2 = deferNextResponse('get_config')
    const language = await findLanguageSelect()

    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update1.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    fireEvent.change(language, { target: { value: 'zh' } })
    await act(async () => update2.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    await act(async () => health2.resolve({
      status: 'success',
      data: { prompt_source_status: { status: 'ok' } },
    }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    await act(async () => health1.resolve({
      status: 'success',
      data: {
        prompt_source_status: {
          status: 'error',
          error_code: 'repository_instructions_missing',
          error: 'stale',
        },
      },
    }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ignores a delayed StrictMode initial health response after repair', async () => {
    const firstInitial = deferNextResponse('get_config')
    const secondInitial = deferNextResponse('get_config')
    const update = deferNextResponse('update_config')
    render(<StrictMode><Options /></StrictMode>)
    await act(async () => firstInitial.resolve({
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: '',
        prompt_source_status: {
          status: 'error',
          error_code: 'dh_specific_instructions_unreadable',
          error: 'initial',
        },
        extension_preferences: { use_workspace_only: false },
      },
    }))
    await openCopilotSection()
    const health = deferNextResponse('get_config')
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'replacement' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => health.resolve({
      status: 'success',
      data: { prompt_source_status: { status: 'ok' } },
    }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())

    await act(async () => secondInitial.resolve({
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: 'stale',
        prompt_source_status: {
          status: 'error',
          error_code: 'repository_instructions_missing',
          error: 'stale',
        },
        extension_preferences: { use_workspace_only: false },
      },
    }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(editor.value).toBe('replacement')
  })

  it('updates prompt health when the latest health check returns an error', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const health = deferNextResponse('get_config')
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => health.resolve({
      status: 'success',
      data: {
        prompt_source_status: {
          status: 'error',
          error_code: 'repository_instructions_missing',
          error: 'fallback',
        },
      },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(
      /Repository Instructions/i,
    )
  })

  it('leaves existing health unchanged when the health transport fails', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: {
        status: 'error',
        error_code: 'dh_core_prompt_missing',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    const health = deferNextResponse('get_config')
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    ;(chrome.runtime as any).lastError = { message: 'health transport failed' }
    await act(async () => health.resolve(undefined))
    ;(chrome.runtime as any).lastError = undefined
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
  })
})

// ---------- Prompt source mode matrix (Task 5) ----------

describe('Options prompt source mode matrix', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it.each([
    ['empty', '', ''],
    ['null', null, ''],
    ['whitespace-only', '   ', '   '],
  ])('UI-I1: %s Host Root disables Repository ONLY without rewriting stored true', async (_label, hostRoot, expectedRoot) => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        rootPath: 'C:\\StaleChromeRoot',
        useWorkspaceOnly: true,
      },
    })
    render(<Options />)
    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: hostRoot,
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: true },
      },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    expect(toggle.disabled).toBe(true)
    expect(toggle.checked).toBe(true)
    expect((document.querySelector(
      'input[name="rootPath"]',
    ) as HTMLInputElement).value).toBe(expectedRoot)
    expect((document.querySelector(
      'input[name="skillDirectories"]',
    ) as HTMLInputElement).disabled).toBe(false)
    expect((document.querySelector(
      'input[name="mcpConfigPath"]',
    ) as HTMLInputElement).disabled).toBe(false)
    expect((screen.getByLabelText(
      /DH-specific Instructions/i,
    ) as HTMLTextAreaElement).disabled).toBe(false)
    expect(countUpdateConfigCalls()).toBe(0)
  })

  it.each([
    ['empty', '', ''],
    ['whitespace-only', '   ', '   '],
  ])('UI-I2: %s effective Root hydrates canonical Host Skills when stored Repository ONLY is true', async (_label, hostRoot, expectedRoot) => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        rootPath: 'C:\\StaleChromeRoot',
        skillDirectories: 'C:\\StaleSkills',
        mcpConfigPath: 'C:\\StaleMcp.json',
        userInstructions: 'STALE-DH',
        useWorkspaceOnly: true,
      },
    })
    render(<Options />)
    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: hostRoot,
        skill_directories: ['C:\\CanonicalSkills'],
        mcp_config_path: 'C:\\CanonicalMcp.json',
        _user_instructions_raw: 'CANONICAL-DH',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: true },
      },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])

    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    const root = screen.getByLabelText(/Root Path/i) as HTMLInputElement
    const skills = screen.getByLabelText(/Skill Directories/i) as HTMLInputElement
    const mcp = screen.getByLabelText(/MCP Configuration/i) as HTMLInputElement
    const dhInstructions = screen.getByLabelText(
      /DH-specific Instructions/i,
    ) as HTMLTextAreaElement

    expect(root.value).toBe(expectedRoot)
    expect(toggle.disabled).toBe(true)
    expect(toggle.checked).toBe(true)
    expect(skills.disabled).toBe(false)
    expect(skills.value).toBe('C:\\CanonicalSkills')
    expect(mcp.disabled).toBe(false)
    expect(mcp.value).toBe('C:\\CanonicalMcp.json')
    expect(dhInstructions.disabled).toBe(false)
    expect(dhInstructions.value).toBe('CANONICAL-DH')
  })

  it('UI-I2: touched Root preserves local Skills during the hydration window', async () => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        rootPath: 'C:\\StoredRoot',
        skillDirectories: 'C:\\RetainedGlobalSkills',
        useWorkspaceOnly: true,
      },
    })
    render(<Options />)
    await openCopilotSection()
    const root = screen.getByLabelText(/Root Path/i) as HTMLInputElement
    fireEvent.change(root, { target: { value: '   ' } })

    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: 'C:\\HostRoot',
        skill_directories: ['C:\\HostRoot\\.github\\skills'],
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: true },
      },
    }))

    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    const skills = screen.getByLabelText(/Skill Directories/i) as HTMLInputElement
    expect(root.value).toBe('   ')
    expect(toggle.disabled).toBe(true)
    expect(toggle.checked).toBe(true)
    expect(skills.disabled).toBe(false)
    expect(skills.value).toBe('C:\\RetainedGlobalSkills')
  })

  it('UI-I2: touched Repository ONLY preserves local Skills during the hydration window', async () => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        rootPath: 'C:\\StoredRoot',
        skillDirectories: 'C:\\RetainedGlobalSkills',
        useWorkspaceOnly: true,
      },
    })
    render(<Options />)
    await openCopilotSection()
    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    fireEvent.click(toggle)

    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: 'C:\\HostRoot',
        skill_directories: ['C:\\HostRoot\\.github\\skills'],
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: true },
      },
    }))

    const skills = screen.getByLabelText(/Skill Directories/i) as HTMLInputElement
    expect(toggle.disabled).toBe(false)
    expect(toggle.checked).toBe(false)
    expect(skills.disabled).toBe(false)
    expect(skills.value).toBe('C:\\RetainedGlobalSkills')
  })

  it('UI-I2: non-empty Root with stored false keeps all DH-specific inputs enabled', async () => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        skillDirectories: 'C:\\StaleSkills',
        mcpConfigPath: 'C:\\StaleMcp.json',
        userInstructions: 'STALE-DH',
      },
    })
    render(<Options />)
    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: 'C:\\MyCases',
        skill_directories: ['C:\\CanonicalSkills'],
        mcp_config_path: 'C:\\CanonicalMcp.json',
        _user_instructions_raw: 'CANONICAL-DH',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])

    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    const skills = screen.getByLabelText(/Skill Directories/i) as HTMLInputElement
    const mcp = screen.getByLabelText(/MCP Configuration/i) as HTMLInputElement
    const dhInstructions = screen.getByLabelText(
      /DH-specific Instructions/i,
    ) as HTMLTextAreaElement

    expect(toggle.disabled).toBe(false)
    expect(toggle.checked).toBe(false)
    expect(skills).toMatchObject({
      disabled: false,
      value: 'C:\\CanonicalSkills',
    })
    expect(mcp).toMatchObject({
      disabled: false,
      value: 'C:\\CanonicalMcp.json',
    })
    expect(dhInstructions).toMatchObject({
      disabled: false,
      value: 'CANONICAL-DH',
    })
  })

  it('UI-I2/UI-I3: non-empty Root reapplies stored true and disables only repository-selected inputs', async () => {
    const deferred = deferNextResponse('get_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        skillDirectories: 'C:\\RetainedSkills',
        mcpConfigPath: 'C:\\RetainedMcp.json',
      },
    })
    render(<Options />)
    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: 'C:\\MyCases',
        _user_instructions_raw: 'KEEP-ME',
        prompt_source_status: { status: 'ok' },
        extension_preferences: {
          use_workspace_only: true,
          user_prompt: 'USER-PROMPT',
        },
      },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1])
    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    const dhInstructions = screen.getByLabelText(
      /DH-specific Instructions/i,
    ) as HTMLTextAreaElement
    const userPrompt = screen.getByLabelText(
      /Custom User Prompt/i,
    ) as HTMLTextAreaElement
    expect(toggle.disabled).toBe(false)
    expect(toggle.checked).toBe(true)
    expect(dhInstructions.disabled).toBe(true)
    expect(dhInstructions.value).toBe('KEEP-ME')
    expect(userPrompt.disabled).toBe(false)
    expect(userPrompt.value).toBe('USER-PROMPT')
    expect((document.querySelector(
      'input[name="skillDirectories"]',
    ) as HTMLInputElement)).toMatchObject({
      disabled: true,
      value: 'C:\\RetainedSkills',
    })
    expect((document.querySelector(
      'input[name="mcpConfigPath"]',
    ) as HTMLInputElement)).toMatchObject({
      disabled: true,
      value: 'C:\\RetainedMcp.json',
    })
  })

  it('UI-I3: disabling Repository ONLY restores retained DH text', async () => {
    const getConfig = deferNextResponse('get_config')
    const update = deferNextResponse('update_config')
    render(<Options />)
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: 'C:\\MyCases',
        _user_instructions_raw: 'KEEP-ME',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: true },
      },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0])
    const toggle = screen.getByRole('checkbox', {
      name: /repository SKILLS, MCP, and instructions ONLY/i,
    }) as HTMLInputElement
    fireEvent.click(toggle)
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    const dhInstructions = screen.getByLabelText(
      /DH-specific Instructions/i,
    ) as HTMLTextAreaElement
    expect(dhInstructions.disabled).toBe(false)
    expect(dhInstructions.value).toBe('KEEP-ME')
  })

  it('UI-I5: renamed scope copy exists in English and Chinese', () => {
    expect(getTranslation('userInstructions', 'en')).toBe(
      'DH-specific Instructions',
    )
    expect(getTranslation('userInstructions', 'zh')).toBe('DH 专用指令')
    expect(getTranslation('useWorkspaceOnly', 'en')).toContain(
      'instructions ONLY',
    )
    expect(getTranslation('useWorkspaceOnly', 'zh')).toContain('指令')
    expect(getTranslation('useWorkspaceOnlyDesc', 'en')).toContain(
      '<Root>/.github/copilot-instructions.md',
    )
    expect(getTranslation('useWorkspaceOnlyDesc', 'en')).toContain(
      'Custom User Prompt remain active',
    )
    expect(getTranslation('useWorkspaceOnlyDesc', 'zh')).toContain(
      '<Root>/.github/copilot-instructions.md',
    )
    expect(getTranslation('dhSpecificInstructionsInactive', 'en')).toContain(
      'retained but inactive',
    )
    expect(getTranslation('dhSpecificInstructionsInactive', 'zh')).toContain(
      '保留',
    )
  })

  it.each([
    { root: '', repositoryOnly: true },
    { root: 'C:\\MyCases', repositoryOnly: false },
    { root: 'C:\\MyCases', repositoryOnly: true },
  ])('UI-I4: Custom User Prompt stays enabled for %#', async state => {
    const deferred = deferNextResponse('get_config')
    render(<Options />)
    await act(async () => deferred.resolve({
      status: 'success',
      data: {
        root_path: state.root,
        prompt_source_status: { status: 'ok' },
        extension_preferences: {
          use_workspace_only: state.repositoryOnly,
          user_prompt: 'USER-PROMPT',
        },
      },
    }))
    await openCopilotSection()
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i }).at(-1)!)
    const prompt = screen.getByLabelText(
      /Custom User Prompt/i,
    ) as HTMLTextAreaElement
    expect(prompt.disabled).toBe(false)
    expect(prompt.value).toBe('USER-PROMPT')
  })
})

// ---------- Prompt health and inspected sparse writes (Task 6) ----------

describe('Options prompt health and inspected sparse writes', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('retains mirrored text when modern Host reports unreadable DH file', async () => {
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userInstructions: 'KEEP-MIRROR' },
    })
    await hydrateOptions({
      root_path: '',
      system_message: { content: 'DO-NOT-HYDRATE-CORE' },
      prompt_source_status: {
        status: 'error',
        error_code: 'dh_specific_instructions_unreadable',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    expect((await openDhInstructionsEditor()).value).toBe('KEEP-MIRROR')
    expect(screen.queryByText('DO-NOT-HYDRATE-CORE')).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(
      /DH-specific Instructions/i,
    )
  })

  it('hydrates an explicit empty DH instruction value', async () => {
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userInstructions: 'STALE' },
    })
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    expect((await openDhInstructionsEditor()).value).toBe('')
  })

  it('uses system_message only when prompt_source_status is absent', async () => {
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userInstructions: 'STALE' },
    })
    await hydrateOptions({
      root_path: '',
      system_message: { content: 'LEGACY-INSTRUCTIONS' },
      extension_preferences: { use_workspace_only: false },
    })
    expect((await openDhInstructionsEditor()).value).toBe(
      'LEGACY-INSTRUCTIONS',
    )
  })

  it('omits user_instructions from unrelated preference updates', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'UNCHANGED',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    const call = chromeMockSpies.sendMessage.mock.calls
      .map(entry => entry[0] as any)
      .find(message => message?.payload?.action === 'update_config')
    expect(Object.prototype.hasOwnProperty.call(
      call.payload.payload,
      'user_instructions',
    )).toBe(false)
  })

  it('sends explicit empty user_instructions when editor is cleared', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'CLEAR-ME',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: '' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    const calls = chromeMockSpies.sendMessage.mock.calls
      .map(entry => entry[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(calls.at(-1).payload.payload.user_instructions).toBe('')
  })

  it('sends explicit empty user_instructions when Options is reset', async () => {
    const update = deferNextResponse('update_config')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'CLEAR-ON-RESET',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await act(async () => resetResponse.resolve({ status: 'success' }))
      await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      const calls = chromeMockSpies.sendMessage.mock.calls
        .map(entry => entry[0] as any)
        .filter(message => message?.payload?.action === 'update_config')
      expect(calls.at(-1).payload.payload.user_instructions).toBe('')
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('UI-I7: saved refresh failure preserves value and shows localized warning', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'KEEP',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'SAVED-TEXT' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'repository_instructions_missing',
        error: 'DO-NOT-SHOW-FALLBACK',
      },
    }))
    expect(editor.value).toBe('SAVED-TEXT')
    const alert = screen.getByRole('alert').textContent || ''
    expect(alert).toMatch(/saved/i)
    expect(alert).not.toMatch(/not saved/i)
    expect(alert).toMatch(/Repository Instructions/i)
    expect(alert).not.toContain('DO-NOT-SHOW-FALLBACK')
  })

  it('UI-I7: outer/unsaved errors show not-saved fallback', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'error',
      error: 'OUTER-FALLBACK',
    }))
    const alert = screen.getByRole('alert').textContent || ''
    expect(alert).toMatch(/not saved/i)
    expect(alert).toContain('OUTER-FALLBACK')
  })

  it('unknown config error code uses Host fallback', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: false,
        error_code: 'future_code',
        error: 'FUTURE HOST FALLBACK',
      },
    }))
    expect(screen.getByRole('alert').textContent).toContain(
      'FUTURE HOST FALLBACK',
    )
  })

  it('renders a known update issue in the current language', async () => {
    const update = deferNextResponse('update_config')
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, language: 'zh' },
    })
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'KEEP',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        language: 'zh',
        use_workspace_only: false,
      },
    })
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: '已保存' } })
    fireEvent.blur(editor)
    await act(async () => update.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'repository_instructions_missing',
        error: 'DO-NOT-SHOW-FALLBACK',
      },
    }))
    const alert = screen.getByRole('alert').textContent || ''
    expect(alert).toContain('设置已保存')
    expect(alert).toContain('仓库指令')
    expect(alert).not.toContain('DO-NOT-SHOW-FALLBACK')
  })

  it('hydration catch-up inspects structured refresh errors', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }))
    await act(async () => catchUp.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'dh_core_prompt_missing',
        error: 'fallback',
      },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
  })

  it('suppresses chrome lastError from an expected hydration catch-up', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }))

    ;(chrome.runtime as any).lastError = { message: 'EXPECTED CATCH-UP ERROR' }
    await act(async () => catchUp.reject(new Error('EXPECTED CATCH-UP ERROR')))
    ;(chrome.runtime as any).lastError = undefined
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('non-success get_config catch-up inspects structured errors', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => getConfig.resolve({
      status: 'error',
      error: 'get failed',
    }))
    await act(async () => catchUp.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'repository_instructions_missing',
        error: 'fallback',
      },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(
      /Repository Instructions/i,
    )
  })

  it('host-unreachable catch-up suppresses only transport errors', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })

    ;(chrome.runtime as any).lastError = { message: 'host unavailable' }
    await act(async () => getConfig.reject(new Error('host unavailable')))
    ;(chrome.runtime as any).lastError = undefined
    expect(screen.queryByRole('alert')).toBeNull()

    await act(async () => catchUp.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'dh_core_prompt_missing',
        error: 'fallback',
      },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
  })

  it('successful unrelated update does not erase prompt health warning', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'KEEP',
      prompt_source_status: {
        status: 'error',
        error_code: 'dh_core_prompt_missing',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
  })

  it('successful update reveals an existing health warning after an update warning', async () => {
    const failedUpdate = deferNextResponse('update_config')
    const successfulUpdate = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'KEEP',
      prompt_source_status: {
        status: 'error',
        error_code: 'dh_core_prompt_missing',
        error: 'health fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => failedUpdate.resolve({
      status: 'error',
      error: 'LATEST UPDATE WARNING',
    }))
    expect(screen.getByRole('alert').textContent).toContain(
      'LATEST UPDATE WARNING',
    )

    fireEvent.change(language, { target: { value: 'zh' } })
    await act(async () => successfulUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Core System Prompt/i)
  })

  it('a stale response cannot overwrite the newest update warning', async () => {
    const firstUpdate = deferNextResponse('update_config')
    const secondUpdate = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    fireEvent.change(language, { target: { value: 'zh' } })

    await act(async () => secondUpdate.resolve({
      status: 'error',
      error: 'NEWEST WARNING',
    }))
    expect(screen.getByRole('alert').textContent).toContain('NEWEST WARNING')

    await act(async () => firstUpdate.resolve({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'repository_instructions_missing',
        error: 'stale fallback',
      },
    }))
    const alert = screen.getByRole('alert').textContent || ''
    expect(alert).toContain('NEWEST WARNING')
    expect(alert).not.toMatch(/Repository Instructions/i)
  })

  it('transport failure leaves instructions pending for an unrelated retry', async () => {
    const failedUpdate = deferNextResponse('update_config')
    const retry = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'initial',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'retry-me' } })
    fireEvent.blur(editor)

    ;(chrome.runtime as any).lastError = { message: 'PORT CLOSED' }
    await act(async () => failedUpdate.reject(new Error('PORT CLOSED')))
    ;(chrome.runtime as any).lastError = undefined
    expect(screen.getByRole('alert').textContent).toContain('PORT CLOSED')

    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => retry.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    const calls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(calls.at(-1).payload.payload.user_instructions).toBe('retry-me')
  })

  it('keeps revision 2 pending when revision 1 succeeds late', async () => {
    const getConfig = deferNextResponse('get_config')
    const firstUpdate = deferNextResponse('update_config')
    const secondUpdate = deferNextResponse('update_config')
    const thirdUpdate = deferNextResponse('update_config')
    render(<Options />)
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: 'initial',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }))
    await openCopilotSection()
    const editor = await openDhInstructionsEditor()

    fireEvent.change(editor, { target: { value: 'revision-1' } })
    fireEvent.blur(editor)
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    fireEvent.change(editor, { target: { value: 'revision-2' } })
    fireEvent.blur(editor)

    await act(async () => firstUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => secondUpdate.resolve({
      status: 'error',
      error: 'retry revision 2',
    }))

    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => thirdUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls.at(-1).payload.payload.user_instructions).toBe(
      'revision-2',
    )
  })

  it('skips an older intent when storage callbacks complete out of order', async () => {
    const newestUpdate = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const olderStorage = deferNextStorageSet('dh_prefs')
    const newerStorage = deferNextStorageSet('dh_prefs')

    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    fireEvent.change(language, { target: { value: 'zh' } })

    await act(async () => newerStorage.resolve(undefined))
    await act(async () => newestUpdate.resolve({
      status: 'error',
      error: 'NEWEST WARNING',
    }))
    await act(async () => olderStorage.resolve(undefined))

    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls).toHaveLength(1)
    expect(
      updateCalls[0].payload.payload.config.extension_preferences.language,
    ).toBe('zh')
    expect((getStorageSnapshot().dh_prefs as any).language).toBe('zh')
    expect(screen.getByRole('alert').textContent).toContain('NEWEST WARNING')
  })

  it('pairs each instruction intent with its captured text and revision', async () => {
    const firstUpdate = deferNextResponse('update_config')
    const retryUpdate = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'initial',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const firstStorage = deferNextStorageSet('dh_prefs')
    const secondStorage = deferNextStorageSet('dh_prefs')
    const editor = await openDhInstructionsEditor()

    fireEvent.change(editor, { target: { value: 'text-1' } })
    fireEvent.blur(editor)
    fireEvent.change(editor, { target: { value: 'text-2' } })

    await act(async () => firstStorage.resolve(undefined))
    const firstCall = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
      .at(-1)
    expect(firstCall.payload.payload.user_instructions).toBe('text-1')

    await act(async () => firstUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    fireEvent.blur(editor)
    await act(async () => secondStorage.resolve(undefined))
    const retryCall = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
      .at(-1)
    expect(retryCall.payload.payload.user_instructions).toBe('text-2')
    await act(async () => retryUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('sends one committed latest instruction catch-up after rapid edits', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    const unrelatedUpdate = deferNextResponse('update_config')
    render(<StrictMode><Options /></StrictMode>)
    await openCopilotSection()
    const editor = await openDhInstructionsEditor()

    fireEvent.change(editor, { target: { value: 'revision-1' } })
    fireEvent.blur(editor)
    fireEvent.change(editor, { target: { value: 'revision-2' } })
    fireEvent.blur(editor)

    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: 'stale-host-value',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }))

    await waitFor(() => {
      const updateCalls = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .filter(message => message?.payload?.action === 'update_config')
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0].payload.payload.user_instructions).toBe(
        'revision-2',
      )
    })
    await act(async () => catchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(2))
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(Object.hasOwn(
      updateCalls.at(-1).payload.payload,
      'user_instructions',
    )).toBe(false)
    await act(async () => unrelatedUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('keeps a post-reset instruction edit when cleanup finishes late', async () => {
    const cleanup = deferNextStorageRemove('dh_items')
    const resetUpdate = deferNextResponse('update_config')
    const editUpdate = deferNextResponse('update_config')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    await hydrateOptions({
      root_path: '',
      _user_instructions_raw: 'before-reset',
      prompt_source_status: { status: 'ok' },
      extension_preferences: { use_workspace_only: false },
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await act(async () => resetResponse.resolve({ status: 'success' }))
      const editor = await openDhInstructionsEditor()
      fireEvent.change(editor, { target: { value: 'after-reset' } })
      fireEvent.blur(editor)

      await act(async () => resetUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await act(async () => editUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      const countPrefsWrites = () => chromeMockSpies.storageSet.mock.calls
        .filter(call => Object.hasOwn(call[0] as object, 'dh_prefs'))
        .length
      const writesBeforeCleanup = countPrefsWrites()
      await act(async () => cleanup.resolve(undefined))

      expect(countPrefsWrites()).toBe(writesBeforeCleanup)
      expect(chromeMockSpies.storageRemove.mock.calls.some(call => {
        const keys = call[0] as string[]
        return keys.includes('dh_prefs')
      })).toBe(false)
      expect(editor.value).toBe('after-reset')
      const updateCalls = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .filter(message => message?.payload?.action === 'update_config')
      expect(updateCalls.at(-1).payload.payload.user_instructions).toBe(
        'after-reset',
      )
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('keeps a newer user mirror when delayed Host hydration storage completes', async () => {
    const getConfig = deferNextResponse('get_config')
    const update = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    const hydrationMirror = deferNextStorageSet('dh_prefs')

    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: {
          language: 'zh',
          use_workspace_only: false,
        },
      },
    }))
    expect(language.value).toBe('zh')

    fireEvent.change(language, { target: { value: 'en' } })
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => hydrationMirror.resolve(undefined))

    expect((getStorageSnapshot().dh_prefs as any).language).toBe('en')
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls).toHaveLength(1)
    expect(
      updateCalls[0].payload.payload.config.extension_preferences.language,
    ).toBe('en')
  })

  it('does not let a passive hydration mirror supersede newer user persistence', async () => {
    deferNextResponse('get_config')
    const update = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    const userStorage = deferNextStorageSet('dh_prefs')
    const getConfigCall = chromeMockSpies.sendMessage.mock.calls.find(call =>
      (call[0] as any)?.payload?.action === 'get_config',
    )
    const getConfigCallback = getConfigCall?.[1] as (
      response: Record<string, unknown>,
    ) => void

    await act(async () => {
      getConfigCallback({
        status: 'success',
        data: {
          root_path: '',
          prompt_source_status: { status: 'ok' },
          extension_preferences: {
            language: 'zh',
            use_workspace_only: false,
          },
        },
      })
      fireEvent.change(language, { target: { value: 'en' } })
    })
    await act(async () => userStorage.resolve(undefined))

    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    expect((getStorageSnapshot().dh_prefs as any).language).toBe('en')
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls).toHaveLength(1)
    expect(
      updateCalls[0].payload.payload.config.extension_preferences.language,
    ).toBe('en')
  })

  it('carries a delayed manifest fetch into the latest persistence intent', async () => {
    const latestUpdate = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        language: 'auto',
        team_catalog_enabled: true,
        team_manifest_url: 'https://example.com/old-manifest.json',
        use_workspace_only: false,
      },
    })
    const olderStorage = deferNextStorageSet('dh_prefs')
    const newerStorage = deferNextStorageSet('dh_prefs')
    const teamNav = document.querySelector(
      '[data-section="team"]',
    ) as HTMLButtonElement
    fireEvent.click(teamNav)
    const manifest = screen.getByPlaceholderText(
      'https://example.com/team-manifest.json',
    ) as HTMLInputElement
    fireEvent.change(manifest, {
      target: { value: 'https://example.com/new-manifest.json' },
    })
    fireEvent.blur(manifest)

    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })

    await act(async () => newerStorage.resolve(undefined))
    await act(async () => latestUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => olderStorage.resolve(undefined))

    const messages = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
    const manifestCalls = messages.filter(message =>
      message?.type === 'SYNC_TEAM_CATALOG'
      && message?.payload?.manifestOnly === true,
    )
    expect(manifestCalls).toHaveLength(1)
    expect(manifestCalls[0].payload.resetCache).toBe(true)
    expect((getStorageSnapshot().dh_prefs as any).teamManifestUrl).toBe(
      'https://example.com/new-manifest.json',
    )
    const updateCalls = messages.filter(
      message => message?.payload?.action === 'update_config',
    )
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].payload.payload.config.extension_preferences).toMatchObject({
      language: 'en',
      team_manifest_url: 'https://example.com/new-manifest.json',
    })
  })

  it('runs a pending manifest fetch after pre-hydration persistence catches up', async () => {
    const getConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        teamCatalogEnabled: true,
        teamManifestUrl: 'https://example.com/old-manifest.json',
        useWorkspaceOnly: false,
      },
    })
    render(<Options />)
    const teamNav = await waitFor(() => document.querySelector(
      '[data-section="team"]',
    ) as HTMLButtonElement)
    fireEvent.click(teamNav)
    const manifest = await waitFor(() => screen.getByPlaceholderText(
      'https://example.com/team-manifest.json',
    ) as HTMLInputElement)
    fireEvent.change(manifest, {
      target: { value: 'https://example.com/new-manifest.json' },
    })
    fireEvent.blur(manifest)
    expect(countUpdateConfigCalls()).toBe(0)

    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: {
          team_catalog_enabled: true,
          team_manifest_url: 'https://example.com/old-manifest.json',
          use_workspace_only: false,
        },
      },
    }))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))

    const manifestCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message =>
        message?.type === 'SYNC_TEAM_CATALOG'
        && message?.payload?.manifestOnly === true,
      )
    expect(manifestCalls).toHaveLength(1)
    expect((getStorageSnapshot().dh_prefs as any).teamManifestUrl).toBe(
      'https://example.com/new-manifest.json',
    )
    await act(async () => catchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('coalesces duplicate StrictMode hydration callbacks for one touched revision', async () => {
    const firstGetConfig = deferNextResponse('get_config')
    const secondGetConfig = deferNextResponse('get_config')
    const catchUp = deferNextResponse('update_config')
    render(<StrictMode><Options /></StrictMode>)
    await openCopilotSection()
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'one-revision' } })
    fireEvent.blur(editor)

    const response = {
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: 'stale-host-value',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }
    await act(async () => firstGetConfig.resolve(response))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    await act(async () => secondGetConfig.resolve(response))
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))

    const getConfigCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'get_config')
    expect(getConfigCalls).toHaveLength(2)
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].payload.payload.user_instructions).toBe(
      'one-revision',
    )
    await act(async () => catchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('allows a later StrictMode hydration callback for a newer touched revision', async () => {
    const firstGetConfig = deferNextResponse('get_config')
    const secondGetConfig = deferNextResponse('get_config')
    const firstCatchUp = deferNextResponse('update_config')
    const secondCatchUp = deferNextResponse('update_config')
    render(<StrictMode><Options /></StrictMode>)
    await openCopilotSection()
    const editor = await openDhInstructionsEditor()
    fireEvent.change(editor, { target: { value: 'revision-1' } })

    const response = {
      status: 'success',
      data: {
        root_path: '',
        _user_instructions_raw: 'stale-host-value',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      },
    }
    await act(async () => firstGetConfig.resolve(response))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    await act(async () => firstCatchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    fireEvent.change(editor, { target: { value: 'revision-2' } })
    await act(async () => secondGetConfig.resolve(response))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(2))
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(updateCalls.at(-1).payload.payload.user_instructions).toBe(
      'revision-2',
    )
    await act(async () => secondCatchUp.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('does not log raw Host prompt or preference values', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      await hydrateOptions({
        host_version: '2.0.74-test',
        root_path: 'SECRET-ROOT',
        _user_instructions_raw: 'SECRET-INSTRUCTIONS',
        prompt_source_status: {
          status: 'error',
          error_code: 'dh_core_prompt_missing',
          error: 'SECRET-FALLBACK',
        },
        extension_preferences: {
          team_manifest_url: 'SECRET-URL',
          use_workspace_only: false,
        },
      })
      const output = JSON.stringify(consoleLog.mock.calls)
      expect(output).toContain('2.0.74-test')
      expect(output).toContain('dh_core_prompt_missing')
      expect(output).not.toContain('SECRET-ROOT')
      expect(output).not.toContain('SECRET-INSTRUCTIONS')
      expect(output).not.toContain('SECRET-FALLBACK')
      expect(output).not.toContain('SECRET-URL')
    } finally {
      consoleLog.mockRestore()
    }
  })

  it('does not log raw non-success get_config responses', async () => {
    const getConfig = deferNextResponse('get_config')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      render(<Options />)
      await act(async () => getConfig.resolve({
        status: 'error',
        error_code: 'future_code',
        error: 'SAFE-FALLBACK',
        data: { secret: 'SECRET-CONFIG' },
      }))
      const output = JSON.stringify(consoleWarn.mock.calls)
      expect(output).toContain('future_code')
      expect(output).not.toContain('SAFE-FALLBACK')
      expect(output).not.toContain('SECRET-CONFIG')
    } finally {
      consoleWarn.mockRestore()
    }
  })
})
