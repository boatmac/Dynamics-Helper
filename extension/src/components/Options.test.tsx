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
  emitStorageChanges,
  getStorageSnapshot,
  seedStorage,
  chromeMockSpies,
} from '../test/chromeMock'
import { DEFAULT_PREFS } from '../utils/prefs'
import { getTranslation } from '../utils/translations'
import { normalizeNativeHostResponse } from '../background/analyzeBridge'

const teamCatalogMock = vi.hoisted(() => ({
  syncTeamBookmarks: vi.fn(),
}))

const dndMock = vi.hoisted(() => ({
  dropSpecs: [] as any[],
}))

vi.mock('../utils/teamCatalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/teamCatalog')>()),
  syncTeamBookmarks: teamCatalogMock.syncTeamBookmarks,
}))

vi.mock('react-dnd', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dnd')>()),
  DndProvider: ({ children }: { children: unknown }) => children,
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: (spec: any) => {
    dndMock.dropSpecs.push(spec)
    return [{ isOver: false, canDrop: true }, vi.fn()]
  },
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

const openBookmarksSection = async () => {
  const nav = await waitFor(() => {
    const element = document.querySelector(
      '[data-section="bookmarks"]',
    ) as HTMLButtonElement | null
    if (!element) throw new Error('bookmarks nav not rendered')
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

const openUserPromptEditor = async (): Promise<HTMLTextAreaElement> => {
  await openCopilotSection()
  fireEvent.click(screen.getAllByRole('button', { name: /edit|编辑/i }).at(-1)!)
  return screen.getByLabelText(
    /Custom User Prompt|自定义用户提示词/i,
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

const manifestSyncMessages = () => chromeMockSpies.sendMessage.mock.calls
  .map(call => call[0] as any)
  .filter(message => message?.type === 'SYNC_TEAM_CATALOG'
    && message?.payload?.manifestOnly === true)

const resetHostMessages = () => chromeMockSpies.sendMessage.mock.calls
  .map(call => call[0] as any)
  .filter(message => message?.payload?.action === 'update_config'
    && Number.isInteger(message?.payload?.payload?.reset_token))

const extensionResetMessages = () => chromeMockSpies.sendMessage.mock.calls
  .map(call => call[0] as any)
  .filter(message => message?.type === 'RESET_EXTENSION_STATE')

const manifestSyncResponse = (
  message: any,
  syncStatus: 'committed' | 'unchanged' | 'stale' | 'skipped' | 'failed',
) => ({
  status: syncStatus === 'failed' ? 'error' : 'success',
  error: syncStatus === 'failed' ? 'manifest failure' : undefined,
  errorKind: syncStatus === 'failed' ? 'network' : undefined,
  data: {
    manifestOnly: true,
    syncStatus,
    identity: message.payload.identity,
    requestGeneration: message.payload.requestGeneration,
  },
})

const noTeamManifestSyncResponse = (
  message: any,
  syncStatus: 'committed' | 'unchanged' | 'stale' | 'skipped' | 'failed',
) => {
  const response = manifestSyncResponse(message, syncStatus)
  return {
    ...response,
    data: {
      ...response.data,
      identity: {
        enabled: response.data.identity.enabled,
        manifestUrl: response.data.identity.manifestUrl,
      },
    },
  }
}

const findResetMessage = async () => waitFor(() => {
  const message = extensionResetMessages().at(-1)
  if (!message) throw new Error('Reset message not sent')
  return message
})

const resolveCommittedReset = async (
  deferred: ReturnType<typeof deferNextResponse>,
) => {
  const message = await findResetMessage()
  await act(async () => deferred.resolve({
    status: 'success',
    data: {
      syncStatus: 'committed',
      identity: message.payload.identity,
      requestGeneration: message.payload.requestGeneration,
      resetToken: message.payload.resetToken,
    },
  }))
  return message
}

const hydrateBookmarkOptions = async (items: Array<Record<string, unknown>>) => {
  seedStorage({ dh_items: items })
  await hydrateOptions({
    root_path: '',
    prompt_source_status: { status: 'ok' },
    extension_preferences: { use_workspace_only: false },
  })
  await openBookmarksSection()
  await waitFor(() => expect(document.body.textContent).toContain(items[0]?.label))
}

const personalItems = () => getStorageSnapshot().dh_items as Array<any> | undefined

const resetResponseFor = (
  message: any,
  syncStatus: 'committed' | 'stale' | 'failed',
) => ({
  status: syncStatus === 'failed' ? 'error' : 'success',
  error: syncStatus === 'failed' ? 'Extension state reset failed' : undefined,
  data: {
    syncStatus,
    identity: message.payload.identity,
    requestGeneration: message.payload.requestGeneration,
    resetToken: message.payload.resetToken,
  },
})

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

  it('does not send catch-up until its mirror succeeds and retries with the latest payload', async () => {
    const getConfig = deferNextResponse('get_config')
    const retryUpdate = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await waitFor(() => expect(findStorageWrite('language')).toBeDefined())
    const prefsWriteCount = () => chromeMockSpies.storageSet.mock.calls.filter(
      call => Object.hasOwn(call[0] as object, 'dh_prefs'),
    ).length
    const writesBeforeHydration = prefsWriteCount()
    const hydrationMirror = deferNextStorageSet('dh_prefs')
    const catchUpMirror = deferNextStorageSet('dh_prefs')

    await resolveHostConfig(getConfig, { language: 'zh' })
    await waitFor(() => expect(prefsWriteCount()).toBe(writesBeforeHydration + 1))
    expect(countUpdateConfigCalls()).toBe(0)

    await act(async () => hydrationMirror.resolve(undefined))
    await waitFor(() => expect(prefsWriteCount()).toBe(writesBeforeHydration + 2))
    expect(countUpdateConfigCalls()).toBe(0)
    await act(async () => catchUpMirror.reject(new Error('CATCH-UP MIRROR FAILED')))

    expect(countUpdateConfigCalls()).toBe(0)
    expect(await screen.findByRole('alert')).toHaveTextContent('CATCH-UP MIRROR FAILED')

    const retryMirror = deferNextStorageSet('dh_prefs')
    fireEvent.change(language, { target: { value: 'zh' } })
    await waitFor(() => expect(prefsWriteCount()).toBe(writesBeforeHydration + 3))
    expect(countUpdateConfigCalls()).toBe(0)
    await act(async () => retryMirror.resolve(undefined))

    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(
      updateCalls[0].payload.payload.config.extension_preferences.language,
    ).toBe('zh')
    await act(async () => retryUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('suppresses a delayed catch-up Host send when a newer edit is queued', async () => {
    const getConfig = deferNextResponse('get_config')
    const latestUpdate = deferNextResponse('update_config')
    render(<Options />)
    const language = await findLanguageSelect()
    fireEvent.change(language, { target: { value: 'en' } })
    await waitFor(() => expect(findStorageWrite('language')).toBeDefined())
    const prefsWriteCount = () => chromeMockSpies.storageSet.mock.calls.filter(
      call => Object.hasOwn(call[0] as object, 'dh_prefs'),
    ).length
    const writesBeforeHydration = prefsWriteCount()
    const hydrationMirror = deferNextStorageSet('dh_prefs')
    const catchUpMirror = deferNextStorageSet('dh_prefs')

    await resolveHostConfig(getConfig, { language: 'zh' })
    await waitFor(() => expect(prefsWriteCount()).toBe(writesBeforeHydration + 1))
    expect(countUpdateConfigCalls()).toBe(0)
    await act(async () => hydrationMirror.resolve(undefined))
    await waitFor(() => expect(prefsWriteCount()).toBe(writesBeforeHydration + 2))
    expect(countUpdateConfigCalls()).toBe(0)

    const latestMirror = deferNextStorageSet('dh_prefs')
    fireEvent.change(language, { target: { value: 'zh' } })
    expect(prefsWriteCount()).toBe(writesBeforeHydration + 2)
    await act(async () => catchUpMirror.resolve(undefined))
    await waitFor(() => expect(prefsWriteCount()).toBe(writesBeforeHydration + 3))
    expect(countUpdateConfigCalls()).toBe(0)
    await act(async () => latestMirror.resolve(undefined))

    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    const updateCalls = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(
      updateCalls[0].payload.payload.config.extension_preferences.language,
    ).toBe('zh')
    await act(async () => latestUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
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
    expect(extensionResetMessages()).toHaveLength(0)

    // Host responds with a NON-default value that would un-reset us if
    // touched set were empty. We pick language='zh' (DEFAULT_PREFS is
    // 'auto') so merge would visibly clobber if guards failed.
    await resolveHostConfig(getConfigDeferred, {
      language: 'zh',
      button_text: 'Z',
      log_level: 'DEBUG',
    })
    await resolveCommittedReset(resetResponse)

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
    dndMock.dropSpecs = []
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
      await act(async () => catchUp.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await resolveCommittedReset(resetResponse)

      const update = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .find(message => message?.payload?.action === 'update_config')
      const ext = update.payload.payload.config.extension_preferences
      expect(ext.language).toBe(DEFAULT_PREFS.language)
      expect(ext.button_text).toBe(DEFAULT_PREFS.buttonText)
      expect(update.payload.payload.user_instructions).toBe('')
      expect(getStorageSnapshot().dh_prefs).toMatchObject(DEFAULT_PREFS)
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
    expect(document.body.textContent).toContain('0 items')
    expect(document.body.textContent).toContain('Never synced')
  })

  it.each(['failed', 'skipped', 'stale'] as const)(
    'clears team A immediately and never restores it when team B returns %s',
    async syncStatus => {
      const response = deferNextResponse('SYNC_TEAM_CATALOG')
      await hydrateTeamOptions()
      const teamSelect = screen.getByRole('combobox') as HTMLSelectElement

      fireEvent.change(teamSelect, { target: { value: 'team-b' } })

      expect(document.body.textContent).toContain('0 items')
      expect(document.body.textContent).toContain('Never synced')
      expect(document.body.textContent).not.toContain('Cached')
      await act(async () => response.resolve({
        status: syncStatus === 'failed' ? 'error' : 'success',
        error: syncStatus === 'failed' ? 'CURRENT B FAILURE' : undefined,
        errorKind: syncStatus === 'failed' ? 'network' : undefined,
        data: {
          syncStatus,
          identity: {
            enabled: true,
            manifestUrl: 'https://example.com/manifest.json',
            teamId: 'team-b',
          },
          requestGeneration: expect.anything(),
        },
      }))

      expect(document.body.textContent).toContain('0 items')
      expect(document.body.textContent).toContain('Never synced')
      expect(document.body.textContent).not.toContain('Cached')
    },
  )

  it('renders valid team B items only after a current committed response', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    const syncMessage = await waitFor(() => {
      const message = chromeMockSpies.sendMessage.mock.calls
        .map(call => call[0] as any)
        .find(value => value?.type === 'SYNC_TEAM_CATALOG'
          && value.payload?.identity?.teamId === 'team-b')
      if (!message) throw new Error('team B sync not dispatched yet')
      return message
    })

    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'committed',
        identity: syncMessage.payload.identity,
        requestGeneration: syncMessage.payload.requestGeneration,
        items: [{ type: 'link', label: 'TEAM B CURRENT' }],
        syncedAt: '2026-07-17T02:00:00.000Z',
      },
    }))

    expect(document.body.textContent).toContain('1 items')
    fireEvent.click(document.querySelector('[data-section="bookmarks"]') as HTMLButtonElement)
    expect(document.body.textContent).toContain('TEAM B CURRENT')
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
      await resolveCommittedReset(resetResponse)
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
        && (call[0] as any)?.payload?.identity?.enabled === true
        && (call[0] as any)?.payload?.identity?.manifestUrl === 'https://example.com/manifest.json'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-a'
        && Number.isInteger((call[0] as any)?.payload?.requestGeneration),
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
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
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

  it('dispatches Reset only after the default dh_prefs mirror callback commits', async () => {
    const hostUpdate = deferNextResponse('update_config')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      const mirror = deferNextStorageSet('dh_prefs')
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
      expect(chromeMockSpies.sendMessage.mock.calls.some(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toBe(false)

      await act(async () => mirror.resolve(undefined))
      const hostMessage = await waitFor(() => {
        const message = resetHostMessages().at(-1)
        if (!message) throw new Error('reset update_config not sent')
        return message
      })
      expect(extensionResetMessages()).toHaveLength(0)

      await act(async () => hostUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      const resetMessage = await findResetMessage()
      expect(resetMessage.payload.identity).toEqual({
        enabled: false,
        manifestUrl: '',
        teamId: '',
      })
      expect(hostMessage.payload.payload.reset_token).toBe(
        resetMessage.payload.resetToken,
      )
      expect(Number.isInteger(resetMessage.payload.requestGeneration)).toBe(true)
      await resolveCommittedReset(resetResponse)
    } finally {
      confirm.mockRestore()
    }
  })

  it.each([
    ['transport', undefined],
    ['storage', {
      status: 'error',
      error: 'Configuration was not saved.',
    }],
    ['config_saved false', {
      status: 'success',
      data: {
        success: false,
        config_saved: false,
        error: 'Configuration was not saved.',
      },
    }],
  ] as const)(
    'does not dispatch destructive SW Reset after Host %s failure',
    async (_name, response) => {
      const hostUpdate = deferNextResponse('update_config')
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      try {
        await hydrateTeamOptions()
        fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
        await waitFor(() => expect(resetHostMessages()).toHaveLength(1))

        await act(async () => {
          if (response === undefined) {
            hostUpdate.reject(new Error('HOST PORT CLOSED'))
          } else {
            hostUpdate.resolve(response)
          }
        })

        expect(extensionResetMessages()).toHaveLength(0)
        expect(chromeMockSpies.storageRemove.mock.calls.some(call => {
          const keys = call[0] as string[]
          return Array.isArray(keys) && keys.includes('dh_items')
        })).toBe(false)
        expect(screen.queryByText('Reset complete.')).toBeNull()
        expect(await screen.findByRole('alert')).toHaveTextContent(
          /reset did not complete/i,
        )
      } finally {
        confirm.mockRestore()
      }
    },
  )

  it('runs SW Reset after config_saved true and keeps refresh warning separate', async () => {
    const hostUpdate = deferNextResponse('update_config')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(resetHostMessages()).toHaveLength(1))
      expect(extensionResetMessages()).toHaveLength(0)

      await act(async () => hostUpdate.resolve({
        status: 'success',
        data: {
          success: false,
          config_saved: true,
          error: 'Configuration saved but session refresh failed.',
        },
      }))
      await waitFor(() => expect(extensionResetMessages()).toHaveLength(1))
      await resolveCommittedReset(resetResponse)

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
        'Reset complete',
      ))
      expect(screen.getByRole('alert')).toHaveTextContent(/saved/i)
      expect(screen.getByRole('alert')).not.toHaveTextContent(/reset did not complete/i)
    } finally {
      confirm.mockRestore()
    }
  })

  it('retries only SW Reset after the Host phase committed', async () => {
    const hostUpdate = deferNextResponse('update_config')
    const failedReset = deferNextResponse('RESET_EXTENSION_STATE')
    const retryReset = deferNextResponse('RESET_EXTENSION_STATE')
    const unrelatedUpdate = deferNextResponse('update_config')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(resetHostMessages()).toHaveLength(1))
      await act(async () => hostUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      const firstMessage = await findResetMessage()
      await act(async () => failedReset.resolve(resetResponseFor(
        firstMessage,
        'failed',
      )))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /reset did not complete/i,
      )

      fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })
      await waitFor(() => expect(extensionResetMessages()).toHaveLength(2))
      expect(resetHostMessages()).toHaveLength(1)
      expect(extensionResetMessages()[1].payload.resetToken).toBe(
        firstMessage.payload.resetToken,
      )
      await act(async () => unrelatedUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await act(async () => retryReset.resolve(resetResponseFor(
        extensionResetMessages()[1],
        'committed',
      )))
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
        'Reset complete',
      ))
    } finally {
      confirm.mockRestore()
    }
  })

  it('retries only SW Reset after a newer preference edit without losing it', async () => {
    const hostUpdate = deferNextResponse('update_config')
    const firstReset = deferNextResponse('RESET_EXTENSION_STATE')
    const editUpdate = deferNextResponse('update_config')
    const retryReset = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(resetHostMessages()).toHaveLength(1))
      await act(async () => hostUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      const firstMessage = await findResetMessage()

      const language = await findLanguageSelect()
      fireEvent.change(language, { target: { value: 'en' } })
      await act(async () => editUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await act(async () => firstReset.resolve(resetResponseFor(
        firstMessage,
        'failed',
      )))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /reset did not complete/i,
      )

      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(extensionResetMessages()).toHaveLength(2))
      expect(resetHostMessages()).toHaveLength(1)
      expect(language.value).toBe('en')
      expect((getStorageSnapshot().dh_prefs as any).language).toBe('en')
      expect(extensionResetMessages()[1].payload.resetToken).toBe(
        firstMessage.payload.resetToken,
      )

      await act(async () => retryReset.resolve(resetResponseFor(
        extensionResetMessages()[1],
        'committed',
      )))
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
        'Reset complete',
      ))
    } finally {
      confirm.mockRestore()
    }
  })

  it('ignores stale Host Reset callback after a newer edit', async () => {
    const resetUpdate = deferNextResponse('update_config')
    const editUpdate = deferNextResponse('update_config')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(resetHostMessages()).toHaveLength(1))
      fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })
      await waitFor(() => expect(countUpdateConfigCalls()).toBe(2))

      await act(async () => resetUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      expect(extensionResetMessages()).toHaveLength(0)
      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /reset did not complete/i,
      )
      await act(async () => editUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
    } finally {
      confirm.mockRestore()
    }
  })

  it('does not run Host or carried actions after a failed mirror write and retries once', async () => {
    const syncResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    const updateResponse = deferNextResponse('update_config')
    await hydrateTeamOptions()
    const failedMirror = deferNextStorageSet('dh_prefs')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    await act(async () => failedMirror.reject(new Error('STORAGE SET FAILED')))

    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(0)
    expect(countUpdateConfigCalls()).toBe(0)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not saved/i)
    expect(screen.getByRole('alert')).toHaveTextContent('STORAGE SET FAILED')

    fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })

    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(1))
    expect(countUpdateConfigCalls()).toBe(1)
    await act(async () => syncResponse.resolve({
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
    await act(async () => updateResponse.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(1)
  })

  it('serializes newer mirror intent and runs no action between commits', async () => {
    const syncResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    const updateResponse = deferNextResponse('update_config')
    await hydrateTeamOptions()
    const writesBefore = chromeMockSpies.storageSet.mock.calls.filter(
      call => Object.hasOwn(call[0] as object, 'dh_prefs'),
    ).length
    const firstMirror = deferNextStorageSet('dh_prefs')
    const secondMirror = deferNextStorageSet('dh_prefs')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })

    expect(chromeMockSpies.storageSet.mock.calls.filter(
      call => Object.hasOwn(call[0] as object, 'dh_prefs'),
    )).toHaveLength(writesBefore + 1)
    expect(countUpdateConfigCalls()).toBe(0)
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(0)

    await act(async () => firstMirror.resolve(undefined))
    await waitFor(() => expect(chromeMockSpies.storageSet.mock.calls.filter(
      call => Object.hasOwn(call[0] as object, 'dh_prefs'),
    )).toHaveLength(writesBefore + 2))
    expect(countUpdateConfigCalls()).toBe(0)
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(0)

    await act(async () => secondMirror.resolve(undefined))
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(1)
    await act(async () => syncResponse.resolve({
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
    await act(async () => updateResponse.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it.each([
    ['stale', { status: 'success', syncStatus: 'stale' }],
    ['failed', { status: 'error', syncStatus: 'failed' }],
  ])('keeps local defaults but reports a persistent %s Reset response', async (_name, outcome) => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const message = await findResetMessage()
      await act(async () => resetResponse.resolve({
        status: outcome.status,
        error: outcome.status === 'error' ? 'Extension state reset failed' : undefined,
        data: {
          syncStatus: outcome.syncStatus,
          identity: message.payload.identity,
          requestGeneration: message.payload.requestGeneration,
          resetToken: message.payload.resetToken,
        },
      }))

      expect(chromeMockSpies.storageRemove.mock.calls.some(call => {
        const keys = call[0] as string[]
        return Array.isArray(keys) && keys.includes('dh_items')
      })).toBe(false)
      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(/reset did not complete/i)
      expect((getStorageSnapshot().dh_prefs as any).teamCatalogEnabled).toBe(false)
    } finally {
      confirm.mockRestore()
    }
  })

  it('treats Reset transport failure as non-committed and performs no local cleanup', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await findResetMessage()
      await act(async () => resetResponse.reject(new Error('RESET PORT CLOSED')))

      expect(chromeMockSpies.storageRemove.mock.calls.some(call => {
        const keys = call[0] as string[]
        return Array.isArray(keys) && keys.includes('dh_items')
      })).toBe(false)
      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(/reset did not complete/i)
    } finally {
      ;(chrome.runtime as any).lastError = undefined
      confirm.mockRestore()
    }
  })

  it('does not let a committed Reset response clear a newer post-reset edit', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const resetUpdate = deferNextResponse('update_config')
    const editUpdate = deferNextResponse('update_config')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
      await act(async () => resetUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      const resetMessage = await findResetMessage()

      await openCopilotSection()
      const editor = await openDhInstructionsEditor()
      fireEvent.change(editor, { target: { value: 'newer instructions' } })
      fireEvent.blur(editor)
      await waitFor(() => expect(countUpdateConfigCalls()).toBe(2))

      await act(async () => resetResponse.resolve({
        status: 'success',
        data: {
          syncStatus: 'committed',
          identity: resetMessage.payload.identity,
          requestGeneration: resetMessage.payload.requestGeneration,
          resetToken: resetMessage.payload.resetToken,
        },
      }))

      expect(editor.value).toBe('newer instructions')
      expect(chromeMockSpies.storageRemove.mock.calls.some(call => {
        const keys = call[0] as string[]
        return Array.isArray(keys) && keys.includes('dh_items')
      })).toBe(false)
      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(/reset did not complete/i)
      await act(async () => editUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
    } finally {
      confirm.mockRestore()
    }
  })

  it('carries a delayed selected-team sync through an unrelated later edit exactly once', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const teamMirror = deferNextStorageSet('dh_prefs')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    const unrelatedMirror = deferNextStorageSet('dh_prefs')
    fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })

    await act(async () => teamMirror.resolve(undefined))
    await act(async () => unrelatedMirror.resolve(undefined))
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(1))
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(1)
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

  it('waits for a delayed older team mirror before running the carried sync', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const teamMirror = deferNextStorageSet('dh_prefs')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    const unrelatedMirror = deferNextStorageSet('dh_prefs')
    fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })

    await act(async () => unrelatedMirror.resolve(undefined))
    expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(0)

    await act(async () => teamMirror.resolve(undefined))
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG'
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
    )).toHaveLength(1))
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

  it('carries delayed Reset through an unrelated post-reset edit exactly once', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      const resetMirror = deferNextStorageSet('dh_prefs')
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const unrelatedMirror = deferNextStorageSet('dh_prefs')
      fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })

      await act(async () => resetMirror.resolve(undefined))
      await act(async () => unrelatedMirror.resolve(undefined))
      await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toHaveLength(1))
      expect(chromeMockSpies.sendMessage.mock.calls.filter(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toHaveLength(1)
      await resolveCommittedReset(resetResponse)
    } finally {
      confirm.mockRestore()
    }
  })

  it('waits for a delayed reset mirror before running carried Reset', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      const resetMirror = deferNextStorageSet('dh_prefs')
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const unrelatedMirror = deferNextStorageSet('dh_prefs')
      fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })

      await act(async () => unrelatedMirror.resolve(undefined))
      expect(chromeMockSpies.sendMessage.mock.calls.filter(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toHaveLength(0)

      await act(async () => resetMirror.resolve(undefined))
      await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toHaveLength(1))
      await resolveCommittedReset(resetResponse)
    } finally {
      confirm.mockRestore()
    }
  })

  it('cancels a delayed selected-team action after an incompatible team change', async () => {
    const currentResponse = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const oldMirror = deferNextStorageSet('dh_prefs')
    const teamSelect = screen.getByRole('combobox')
    fireEvent.change(teamSelect, { target: { value: 'team-b' } })
    const currentMirror = deferNextStorageSet('dh_prefs')
    fireEvent.change(teamSelect, { target: { value: 'team-a' } })

    await act(async () => oldMirror.resolve(undefined))
    await act(async () => currentMirror.resolve(undefined))
    await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.filter(
      call => (call[0] as any)?.type === 'SYNC_TEAM_CATALOG',
    )).toHaveLength(1))
    const sync = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .find(message => message?.type === 'SYNC_TEAM_CATALOG')
    expect(sync.payload.identity.teamId).toBe('team-a')
    await act(async () => currentResponse.resolve({
      status: 'success',
      data: {
        syncStatus: 'skipped',
        identity: sync.payload.identity,
        requestGeneration: sync.payload.requestGeneration,
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
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
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
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
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
        && (call[0] as any)?.payload?.identity?.teamId === 'team-b',
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

  it('ignores a delayed initial team A cache read after Host hydration selects team B', async () => {
    const manifestUrl = 'https://example.com/manifest.json'
    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        teamCatalogEnabled: true,
        teamManifestUrl: manifestUrl,
        team: 'team-a',
      },
      dh_team_manifest_url: manifestUrl,
      dh_team: 'team-a',
      dh_team_manifest: {
        teams: [{ id: 'team-a', label: 'STALE TEAM A' }],
      },
      dh_team_items: [{ type: 'link', label: 'STALE ITEM A' }],
      dh_team_synced: '2026-01-01T00:00:00.000Z',
    })
    const getConfig = deferNextResponse('get_config')
    const delayedA = deferNextStorageGet('dh_team_items')
    render(<Options />)
    await waitFor(() => expect(chromeMockSpies.storageGet.mock.calls.some(
      call => Array.isArray(call[0]) && call[0].includes('dh_team_items'),
    )).toBe(true))

    seedStorage({
      dh_prefs: {
        ...DEFAULT_PREFS,
        teamCatalogEnabled: true,
        teamManifestUrl: manifestUrl,
        team: 'team-b',
      },
      dh_team_manifest_url: manifestUrl,
      dh_team: 'team-b',
      dh_team_manifest: {
        teams: [{ id: 'team-b', label: 'CURRENT TEAM B' }],
      },
      dh_team_items: [{ type: 'link', label: 'CURRENT ITEM B' }],
      dh_team_synced: '2026-07-17T12:00:00.000Z',
    })
    await act(async () => getConfig.resolve({
      status: 'success',
      data: {
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: {
          team_catalog_enabled: true,
          team_manifest_url: manifestUrl,
          team: 'team-b',
          use_workspace_only: false,
        },
      },
    }))
    fireEvent.click(document.querySelector('[data-section="team"]') as HTMLButtonElement)
    await waitFor(() => {
      expect(document.body.textContent).toContain('CURRENT TEAM B')
      expect(document.body.textContent).toContain('(1 items)')
      expect(document.body.textContent).toContain(
        new Date('2026-07-17T12:00:00.000Z').toLocaleString(),
      )
    })

    await act(async () => delayedA.resolve(undefined))
    expect(document.body.textContent).toContain('CURRENT TEAM B')
    expect(document.body.textContent).not.toContain('STALE TEAM A')
    expect(document.body.textContent).not.toContain('STALE ITEM A')
    expect(document.body.textContent).toContain(
      new Date('2026-07-17T12:00:00.000Z').toLocaleString(),
    )
  })

  it('ignores a delayed team A storage follow-up after switching to team B', async () => {
    const response = deferNextResponse('SYNC_TEAM_CATALOG')
    await hydrateTeamOptions()
    const delayedA = deferNextStorageGet('dh_team_items')
    act(() => emitStorageChanges({
      dh_team_items: {
        oldValue: [],
        newValue: [{ type: 'link', label: 'STALE STORAGE A' }],
      },
      dh_team_synced: {
        oldValue: '2026-01-01T00:00:00.000Z',
        newValue: '2026-01-02T00:00:00.000Z',
      },
    }))

    seedStorage({
      dh_team: 'team-b',
      dh_team_items: [{ type: 'link', label: 'CURRENT STORAGE B' }],
      dh_team_synced: '2026-07-17T13:00:00.000Z',
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'team-b' } })
    await waitFor(() => expect(document.body.textContent).toContain(
      new Date('2026-07-17T13:00:00.000Z').toLocaleString(),
    ))
    await act(async () => delayedA.resolve(undefined))

    expect(document.body.textContent).toContain(
      new Date('2026-07-17T13:00:00.000Z').toLocaleString(),
    )
    fireEvent.click(document.querySelector('[data-section="bookmarks"]') as HTMLButtonElement)
    expect(document.body.textContent).toContain('CURRENT STORAGE B')
    expect(document.body.textContent).not.toContain('STALE STORAGE A')
    const sync = chromeMockSpies.sendMessage.mock.calls
      .map(call => call[0] as any)
      .find(message => message?.type === 'SYNC_TEAM_CATALOG'
        && message?.payload?.identity?.teamId === 'team-b')
    await act(async () => response.resolve({
      status: 'success',
      data: {
        syncStatus: 'skipped',
        identity: sync.payload.identity,
        requestGeneration: sync.payload.requestGeneration,
      },
    }))
  })

  it('ignores a delayed team A storage follow-up after Reset', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateTeamOptions()
      const delayedA = deferNextStorageGet('dh_team_items')
      act(() => emitStorageChanges({
        dh_team_items: {
          oldValue: [],
          newValue: [{ type: 'link', label: 'STALE AFTER RESET' }],
        },
      }))
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await waitFor(() => expect(chromeMockSpies.sendMessage.mock.calls.some(
        call => (call[0] as any)?.type === 'RESET_EXTENSION_STATE',
      )).toBe(true))
      await act(async () => delayedA.resolve(undefined))
      await resolveCommittedReset(resetResponse)

      expect(document.body.textContent).not.toContain('STALE AFTER RESET')
    } finally {
      confirm.mockRestore()
    }
  })
})

describe('Options personal bookmark Reset generation', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    dndMock.dropSpecs = []
  })

  it.each([
    ['add', async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
      await waitFor(() => expect(document.body.textContent).toContain('New Item'))
    }, 'New Item'],
    ['edit', async () => {
      fireEvent.click(screen.getByTitle('Edit'))
      const label = screen.getByPlaceholderText('Label') as HTMLInputElement
      fireEvent.change(label, { target: { value: 'Edited after reset' } })
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))
    }, 'Edited after reset'],
    ['delete', async () => {
      const confirmDelete = vi.spyOn(window, 'confirm').mockReturnValue(true)
      fireEvent.click(screen.getByTitle('Delete'))
      confirmDelete.mockRestore()
    }, null],
    ['import', async () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([
        JSON.stringify([{ type: 'link', label: 'Imported after reset', url: 'https://new.test' }]),
      ], 'bookmarks.json', { type: 'application/json' })
      fireEvent.change(input, { target: { files: [file] } })
      await waitFor(() => expect(document.body.textContent).toContain('Imported after reset'))
    }, 'Imported after reset'],
    ['collapse', async () => {
      fireEvent.click(screen.getByRole('button', { name: /Expand All/i }))
    }, 'Seed child'],
  ] as const)(
    'keeps a newer %s mutation when the Reset response is delayed',
    async (_name, mutate, expectedLabel) => {
      const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
      const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
      try {
        await hydrateBookmarkOptions([{
          type: 'folder',
          label: 'Seed folder',
          collapsed: true,
          children: [{ type: 'link', label: 'Seed child', url: 'https://old.test' }],
        }])
        fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
        await findResetMessage()

        await mutate()
        await waitFor(() => expect(personalItems()).toBeDefined())
        const newerItems = structuredClone(personalItems())
        await resolveCommittedReset(resetResponse)

        await waitFor(() => expect(personalItems()).toEqual(newerItems))
        expect(chromeMockSpies.storageRemove.mock.calls.some(call => {
          const keys = call[0] as string[]
          return Array.isArray(keys) && keys.includes('dh_items')
        })).toBe(false)
        if (expectedLabel) expect(document.body.textContent).toContain(expectedLabel)
        else expect(document.body.textContent).not.toContain('Seed folder')
        expect(screen.queryByText('Reset complete.')).toBeNull()
        expect(await screen.findByRole('alert')).toHaveTextContent(/reset did not complete/i)
        expect(screen.getByRole('alert')).toHaveTextContent(
          /some state may already be cleared/i,
        )
      } finally {
        confirmReset.mockRestore()
      }
    },
  )

  it('keeps a newer reorder when the Reset response is delayed', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateBookmarkOptions([
        { type: 'link', label: 'First', url: 'https://first.test' },
        { type: 'link', label: 'Second', url: 'https://second.test' },
      ])
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await findResetMessage()

      const target = dndMock.dropSpecs.filter(spec => spec.hover).at(-1)
      expect(target).toBeDefined()
      act(() => target.drop(
        { path: [0], type: 'link' },
        {
          didDrop: () => false,
          getClientOffset: () => ({ x: 1, y: 1 }),
        },
      ))
      await waitFor(() => expect(personalItems()?.map(item => item.label)).toEqual([
        'Second',
        'First',
      ]))

      await resolveCommittedReset(resetResponse)
      expect(personalItems()?.map(item => item.label)).toEqual(['Second', 'First'])
      expect(document.body.textContent).toContain('First')
      expect(document.body.textContent).toContain('Second')
    } finally {
      confirmReset.mockRestore()
    }
  })

  it('serializes delayed Reset removal before a newer bookmark write', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const delayedRemove = deferNextStorageRemove('dh_items')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateBookmarkOptions([
        { type: 'link', label: 'Before reset', url: 'https://before.test' },
      ])
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(resetResponse)

      fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
      await waitFor(() => expect(document.body.textContent).toContain('New Item'))
      await act(async () => delayedRemove.resolve(undefined))

      await waitFor(() => expect(personalItems()?.some(
        item => item.label === 'New Item',
      )).toBe(true))
      expect(document.body.textContent).toContain('New Item')
      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(/reset did not complete/i)
    } finally {
      confirmReset.mockRestore()
    }
  })

  it('normal Reset clears personal storage and reloads collapsed defaults', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{
        type: 'folder',
        label: 'Packaged default',
        children: [{ type: 'link', label: 'Default child', url: 'https://default.test' }],
      }]),
    } as Response)
    try {
      await hydrateBookmarkOptions([
        { type: 'link', label: 'Personal only', url: 'https://personal.test' },
      ])
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(resetResponse)

      await waitFor(() => expect(personalItems()).toEqual([{
        type: 'folder',
        label: 'Packaged default',
        collapsed: true,
        children: [{ type: 'link', label: 'Default child', url: 'https://default.test' }],
      }]))
      expect(document.body.textContent).toContain('Packaged default')
      expect(document.body.textContent).not.toContain('Default child')
      expect(document.body.textContent).not.toContain('Personal only')
      expect(screen.getByRole('status')).toHaveTextContent('Reset complete')
    } finally {
      fetchMock.mockRestore()
      confirmReset.mockRestore()
    }
  })

  it('clears an earlier success toast when a later Reset is only partial', async () => {
    const firstReset = deferNextResponse('RESET_EXTENSION_STATE')
    const secondReset = deferNextResponse('RESET_EXTENSION_STATE')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([
        { type: 'link', label: 'Packaged default', url: 'https://default.test' },
      ]),
    } as Response)
    try {
      await hydrateBookmarkOptions([
        { type: 'link', label: 'Personal', url: 'https://personal.test' },
      ])
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(firstReset)
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
        'Reset complete',
      ))

      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const message = await waitFor(() => {
        const messages = chromeMockSpies.sendMessage.mock.calls
          .map(call => call[0] as any)
          .filter(candidate => candidate?.type === 'RESET_EXTENSION_STATE')
        expect(messages).toHaveLength(2)
        return messages.at(-1)
      })
      fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
      await act(async () => secondReset.resolve({
        status: 'success',
        data: {
          syncStatus: 'committed',
          identity: message.payload.identity,
          requestGeneration: message.payload.requestGeneration,
          resetToken: message.payload.resetToken,
        },
      }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /some state may already be cleared/i,
      )
      expect(screen.queryByText('Reset complete.')).toBeNull()
    } finally {
      fetchMock.mockRestore()
      confirmReset.mockRestore()
    }
  })

  it('keeps the failed latest bookmark snapshot visible and retries the next mutation', async () => {
    await hydrateBookmarkOptions([
      { type: 'link', label: 'Stored before failure', url: 'https://stored.test' },
    ])
    const failedWrite = deferNextStorageSet('dh_items')

    fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
    await waitFor(() => expect(document.body.textContent).toContain('New Item'))
    await act(async () => {
      failedWrite.reject(new Error('BOOKMARK SET FAILED'))
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(document.body.textContent).toContain('New Item')
    expect(personalItems()?.map(item => item.label)).toEqual([
      'Stored before failure',
    ])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /bookmark changes are not saved/i,
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('BOOKMARK SET FAILED')

    const retryWrite = deferNextStorageSet('dh_items')
    fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
    await act(async () => {
      retryWrite.resolve(undefined)
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await waitFor(() => expect(personalItems()?.map(item => item.label)).toEqual([
      'Stored before failure',
      'New Item',
      'New Item',
    ]))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('recovers the newest write after deferred Reset removal and write failure', async () => {
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const delayedRemove = deferNextStorageRemove('dh_items')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      await hydrateBookmarkOptions([
        { type: 'link', label: 'Before reset', url: 'https://before.test' },
      ])
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(resetResponse)
      await waitFor(() => expect(chromeMockSpies.storageRemove.mock.calls.some(
        call => call[0] === 'dh_items',
      )).toBe(true))

      const failedWrite = deferNextStorageSet('dh_items')
      fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
      await waitFor(() => expect(document.body.textContent).toContain('New Item'))
      await act(async () => {
        delayedRemove.resolve(undefined)
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      await act(async () => {
        failedWrite.reject(new Error('NEWEST WRITE FAILED'))
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(document.body.textContent).toContain('New Item')
      expect(personalItems()).toBeUndefined()
      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /bookmark changes are not saved/i,
      )
      expect(screen.getByRole('alert')).toHaveTextContent(/reset did not complete/i)

      const retryWrite = deferNextStorageSet('dh_items')
      fireEvent.click(screen.getByRole('button', { name: /Add Root Item/i }))
      await act(async () => {
        retryWrite.resolve(undefined)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      await waitFor(() => expect(personalItems()?.map(item => item.label)).toEqual([
        'Before reset',
        'New Item',
        'New Item',
      ]))
      expect(screen.getByRole('alert')).not.toHaveTextContent(
        /bookmark changes are not saved/i,
      )
      expect(screen.getByRole('alert')).toHaveTextContent(/reset did not complete/i)
    } finally {
      confirmReset.mockRestore()
    }
  })

  it('surfaces failed Reset bookmark removal and recovers on Reset retry', async () => {
    const firstReset = deferNextResponse('RESET_EXTENSION_STATE')
    const failedRemove = deferNextStorageRemove('dh_items')
    const retryReset = deferNextResponse('RESET_EXTENSION_STATE')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([
        { type: 'link', label: 'Packaged retry', url: 'https://default.test' },
      ]),
    } as Response)
    try {
      await hydrateBookmarkOptions([
        { type: 'link', label: 'Before failed remove', url: 'https://before.test' },
      ])
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(firstReset)
      await act(async () => {
        failedRemove.reject(new Error('BOOKMARK REMOVE FAILED'))
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(screen.queryByText('Reset complete.')).toBeNull()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /bookmark changes are not saved/i,
      )
      expect(screen.getByRole('alert')).toHaveTextContent(/reset did not complete/i)
      expect(personalItems()?.[0]?.label).toBe('Before failed remove')

      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(retryReset)

      await waitFor(() => expect(personalItems()?.[0]?.label).toBe('Packaged retry'))
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByRole('status')).toHaveTextContent('Reset complete')
    } finally {
      fetchMock.mockRestore()
      confirmReset.mockRestore()
    }
  })

  it('provides bookmark persistence warning copy in both supported languages', () => {
    expect(getTranslation('bookmarkPersistenceWarning', 'en')).toMatch(
      /bookmark changes are not saved/i,
    )
    expect(getTranslation('bookmarkPersistenceWarning', 'zh')).not.toBe(
      'bookmarkPersistenceWarning',
    )
  })

  it('treats a stored empty personal menu as authoritative on reload', async () => {
    seedStorage({ dh_items: [] })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{
        type: 'link',
        label: 'Must not resurrect',
        url: 'https://default.test',
      }]),
    } as Response)
    try {
      await hydrateOptions({
        root_path: '',
        prompt_source_status: { status: 'ok' },
        extension_preferences: { use_workspace_only: false },
      })
      await openBookmarksSection()

      expect(document.body.textContent).toContain('No bookmarks yet')
      expect(document.body.textContent).not.toContain('Must not resurrect')
      expect(personalItems()).toEqual([])
    } finally {
      fetchMock.mockRestore()
    }
  })
})

describe('Options list_models outer error classification', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    dndMock.dropSpecs = []
  })

  it.each([
    ['auth', /run `copilot` in a terminal to re-auth/i],
    ['unavailable', /Showing cached list; click Refresh to retry/i],
    ['unknown', /Showing cached list; click Refresh to retry/i],
  ] as const)(
    'keeps Host %s classification through the Service Worker response path',
    async (errorKind, expectedCopy) => {
      const getConfig = deferNextResponse('get_config')
      const listModels = deferNextResponse('list_models')
      render(<Options />)
      await act(async () => getConfig.resolve({
        status: 'success',
        data: {
          root_path: '',
          prompt_source_status: { status: 'ok' },
          extension_preferences: { use_workspace_only: false },
        },
      }))

      const normalized = normalizeNativeHostResponse({
        status: 'error',
        error: 'safe model fallback',
        errorKind,
        unsafe: 'must-not-reach-options',
      })
      expect(normalized).toEqual({
        status: 'error',
        error: 'safe model fallback',
        errorKind,
      })
      await act(async () => listModels.resolve(normalized))
      fireEvent.click(document.querySelector('[data-section="model"]') as HTMLButtonElement)

      expect(await screen.findByText(expectedCopy)).toBeInTheDocument()
      expect(document.body.textContent).not.toContain('must-not-reach-options')
    },
  )
})

describe('Options manifest blur retry state', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
    dndMock.dropSpecs = []
  })

  const renderManifestOptions = async (team?: string) => {
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        team_catalog_enabled: true,
        team_manifest_url: 'https://example.com/original.json',
        ...(team ? { team } : {}),
        use_workspace_only: false,
      },
    })
    fireEvent.click(document.querySelector('[data-section="team"]') as HTMLButtonElement)
    return screen.getByPlaceholderText(
      'https://example.com/team-manifest.json',
    ) as HTMLInputElement
  }

  const blurUrl = async (input: HTMLInputElement, url: string) => {
    if (input.value !== url) {
      fireEvent.change(input, { target: { value: url } })
    }
    fireEvent.blur(input)
    await waitFor(() => expect(manifestSyncMessages().at(-1)?.payload.identity.manifestUrl).toBe(url))
  }

  it.each(['auth', 'network'] as const)(
    'retries the same URL after a current %s failure',
    async errorKind => {
      const first = deferNextResponse('SYNC_TEAM_CATALOG')
      const second = deferNextResponse('SYNC_TEAM_CATALOG')
      const input = await renderManifestOptions('team-a')
      const url = 'https://example.com/retry.json'

      await blurUrl(input, url)
      const firstMessage = manifestSyncMessages()[0]
      await act(async () => first.resolve({
        ...manifestSyncResponse(firstMessage, 'failed'),
        errorKind,
      }))
      fireEvent.blur(input)

      await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
      await act(async () => second.resolve(
        manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
      ))
    },
  )

  it('retries the same URL after a transport failure', async () => {
    const first = deferNextResponse('SYNC_TEAM_CATALOG')
    const second = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions('team-a')
    const url = 'https://example.com/transport-retry.json'

    await blurUrl(input, url)
    await act(async () => first.reject(new Error('manifest transport closed')))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Could not fetch manifest/i,
    )
    fireEvent.blur(input)

    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
    await act(async () => second.resolve(
      manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
    ))
  })

  it('surfaces an identity-less failure without marking the URL successful', async () => {
    const first = deferNextResponse('SYNC_TEAM_CATALOG')
    const second = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions('team-a')
    const url = 'https://example.com/identity-less-retry.json'

    await blurUrl(input, url)
    await act(async () => first.resolve({
      status: 'error',
      error: 'generic Service Worker failure',
    }))
    expect(document.body.textContent).toContain('Could not fetch manifest')
    fireEvent.blur(input)

    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
    await act(async () => second.resolve(
      manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
    ))
  })

  it.each(['stale', 'skipped'] as const)(
    'retries the same URL after a current %s response',
    async syncStatus => {
      const first = deferNextResponse('SYNC_TEAM_CATALOG')
      const second = deferNextResponse('SYNC_TEAM_CATALOG')
      const input = await renderManifestOptions('team-a')
      const url = `https://example.com/${syncStatus}-retry.json`

      await blurUrl(input, url)
      await act(async () => first.resolve(
        manifestSyncResponse(manifestSyncMessages()[0], syncStatus),
      ))
      fireEvent.blur(input)

      await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
      await act(async () => second.resolve(
        manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
      ))
    },
  )

  it.each(['committed', 'unchanged'] as const)(
    'skips a repeat blur after a current %s response',
    async syncStatus => {
      const first = deferNextResponse('SYNC_TEAM_CATALOG')
      const input = await renderManifestOptions('team-a')
      const url = `https://example.com/${syncStatus}.json`

      await blurUrl(input, url)
      await act(async () => first.resolve(
        manifestSyncResponse(manifestSyncMessages()[0], syncStatus),
      ))
      fireEvent.blur(input)
      await act(async () => new Promise(resolve => setTimeout(resolve, 0)))

      expect(manifestSyncMessages()).toHaveLength(1)
    },
  )

  it('coalesces duplicate same-URL blurs while the first request is in flight', async () => {
    const first = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions('team-a')
    const url = 'https://example.com/in-flight.json'

    await blurUrl(input, url)
    fireEvent.blur(input)
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))

    expect(manifestSyncMessages()).toHaveLength(1)
    await act(async () => first.resolve(
      manifestSyncResponse(manifestSyncMessages()[0], 'committed'),
    ))
  })

  it('does not let URL A callback clear or complete newer URL B state', async () => {
    const responseA = deferNextResponse('SYNC_TEAM_CATALOG')
    const responseB = deferNextResponse('SYNC_TEAM_CATALOG')
    const retryB = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions('team-a')

    await blurUrl(input, 'https://example.com/a.json')
    const messageA = manifestSyncMessages()[0]
    await blurUrl(input, 'https://example.com/b.json')
    const messageB = manifestSyncMessages()[1]

    await act(async () => responseA.resolve(
      manifestSyncResponse(messageA, 'committed'),
    ))
    fireEvent.blur(input)
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
    expect(manifestSyncMessages()).toHaveLength(2)

    await act(async () => responseB.resolve(
      manifestSyncResponse(messageB, 'failed'),
    ))
    fireEvent.blur(input)
    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(3))
    await act(async () => retryB.resolve(
      manifestSyncResponse(manifestSyncMessages()[2], 'committed'),
    ))
  })

  it('refetches URL A after failed URL B cleared the prior A cache', async () => {
    const responseA = deferNextResponse('SYNC_TEAM_CATALOG')
    const responseB = deferNextResponse('SYNC_TEAM_CATALOG')
    const retryA = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions('team-a')
    const urlA = 'https://example.com/a-return.json'
    const urlB = 'https://example.com/b-failed.json'

    await blurUrl(input, urlA)
    await act(async () => responseA.resolve(
      manifestSyncResponse(manifestSyncMessages()[0], 'committed'),
    ))
    await blurUrl(input, urlB)
    await act(async () => responseB.resolve(
      manifestSyncResponse(manifestSyncMessages()[1], 'failed'),
    ))

    fireEvent.change(input, { target: { value: urlA } })
    fireEvent.blur(input)
    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(3))
    await act(async () => retryA.resolve(
      manifestSyncResponse(manifestSyncMessages()[2], 'committed'),
    ))
  })

  it('allows a first-time no-team URL to retry after failure', async () => {
    const first = deferNextResponse('SYNC_TEAM_CATALOG')
    const second = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions()
    const url = 'https://example.com/no-team.json'

    await blurUrl(input, url)
    expect(manifestSyncMessages()[0].payload.identity.teamId).toBe('')
    await act(async () => first.resolve(
      manifestSyncResponse(manifestSyncMessages()[0], 'failed'),
    ))
    fireEvent.blur(input)

    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
    await act(async () => second.resolve(
      manifestSyncResponse(manifestSyncMessages()[1], 'unchanged'),
    ))
  })

  it.each(['committed', 'unchanged'] as const)(
    'deduplicates a no-team URL after a current %s response',
    async syncStatus => {
      const first = deferNextResponse('SYNC_TEAM_CATALOG')
      const input = await renderManifestOptions()
      const url = `https://example.com/no-team-${syncStatus}.json`

      await blurUrl(input, url)
      await act(async () => first.resolve(noTeamManifestSyncResponse(
        manifestSyncMessages()[0],
        syncStatus,
      )))
      fireEvent.blur(input)
      await act(async () => new Promise(resolve => setTimeout(resolve, 0)))

      expect(manifestSyncMessages()).toHaveLength(1)
      expect(document.body.textContent).not.toContain('Could not fetch manifest')
    },
  )

  it('shows a current no-team failure and retries the same URL', async () => {
    const first = deferNextResponse('SYNC_TEAM_CATALOG')
    const retry = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions()
    const url = 'https://example.com/no-team-failure.json'

    await blurUrl(input, url)
    const failed = {
      ...noTeamManifestSyncResponse(manifestSyncMessages()[0], 'failed'),
      errorKind: 'auth',
      httpStatus: 403,
    }
    await act(async () => first.resolve(failed))

    expect(document.body.textContent).toContain('Manifest URL rejected authentication')
    expect(document.body.textContent).toContain('HTTP 403')
    fireEvent.blur(input)
    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
    await act(async () => retry.resolve(
      manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
    ))
  })

  it.each(['stale', 'skipped'] as const)(
    'retries a no-team URL after a current %s response',
    async syncStatus => {
      const first = deferNextResponse('SYNC_TEAM_CATALOG')
      const retry = deferNextResponse('SYNC_TEAM_CATALOG')
      const input = await renderManifestOptions()
      const url = `https://example.com/no-team-${syncStatus}.json`

      await blurUrl(input, url)
      await act(async () => first.resolve(noTeamManifestSyncResponse(
        manifestSyncMessages()[0],
        syncStatus,
      )))
      fireEvent.blur(input)

      await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
      await act(async () => retry.resolve(
        manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
      ))
    },
  )

  it('ignores a no-team callback after a team is selected', async () => {
    const noTeam = deferNextResponse('SYNC_TEAM_CATALOG')
    const input = await renderManifestOptions()
    const url = 'https://example.com/no-team-stale-after-select.json'

    await blurUrl(input, url)
    const noTeamMessage = manifestSyncMessages()[0]
    await act(async () => {
      emitStorageChanges({
        dh_team_manifest_url: { newValue: url },
        dh_team_manifest: {
          newValue: {
            version: 1,
            teams: [{
              id: 'team-a',
              label: 'Team A',
              url: 'https://example.com/team-a.json',
            }],
          },
        },
      })
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    const teamSelect = await screen.findByRole('combobox')
    await waitFor(() => expect(teamSelect).toHaveTextContent('Team A'))
    fireEvent.change(teamSelect, { target: { value: 'team-a' } })

    const selectedTeamFetch = deferNextResponse('SYNC_TEAM_CATALOG')
    await act(async () => noTeam.resolve(noTeamManifestSyncResponse(
      noTeamMessage,
      'committed',
    )))
    fireEvent.blur(input)

    await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
    expect(manifestSyncMessages()[1].payload.identity.teamId).toBe('team-a')
    await act(async () => selectedTeamFetch.resolve(
      manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
    ))
  })

  it('fetches the same previously successful URL again after Reset', async () => {
    const first = deferNextResponse('SYNC_TEAM_CATALOG')
    const second = deferNextResponse('SYNC_TEAM_CATALOG')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      const input = await renderManifestOptions('team-a')
      const url = 'https://example.com/success-before-reset.json'
      await blurUrl(input, url)
      await act(async () => first.resolve(
        manifestSyncResponse(manifestSyncMessages()[0], 'committed'),
      ))

      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      await resolveCommittedReset(resetResponse)
      fireEvent.click(document.querySelector('[data-section="team"]') as HTMLButtonElement)
      fireEvent.click(screen.getByRole('checkbox', { name: /Enable Team Catalog/i }))
      const resetInput = await screen.findByPlaceholderText(
        'https://example.com/team-manifest.json',
      ) as HTMLInputElement
      fireEvent.change(resetInput, { target: { value: url } })
      fireEvent.blur(resetInput)

      await waitFor(() => expect(manifestSyncMessages()).toHaveLength(2))
      await act(async () => second.resolve(
        manifestSyncResponse(manifestSyncMessages()[1], 'committed'),
      ))
    } finally {
      confirmReset.mockRestore()
    }
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

  it('retains mirrored Custom User Prompt when modern Host omits an unreadable value', async () => {
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userPrompt: 'KEEP-PROMPT-MIRROR' },
    })
    await hydrateOptions({
      root_path: '',
      system_message: { content: 'DO-NOT-USE-AS-PROMPT' },
      prompt_source_status: {
        status: 'error',
        error_code: 'user_prompt_unreadable',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })

    expect((await openUserPromptEditor()).value).toBe('KEEP-PROMPT-MIRROR')
    expect(screen.getByRole('alert').textContent).toMatch(/Custom User Prompt/i)
  })

  it('hydrates legacy Custom User Prompt only when prompt health is absent', async () => {
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userPrompt: 'STALE-PROMPT' },
    })
    await hydrateOptions({
      root_path: '',
      extension_preferences: {
        use_workspace_only: false,
        user_prompt: 'LEGACY-PROMPT',
      },
    })

    expect((await openUserPromptEditor()).value).toBe('LEGACY-PROMPT')
  })

  it('omits Custom User Prompt from unrelated preference updates', async () => {
    const update = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        use_workspace_only: false,
        user_prompt: 'UNCHANGED-PROMPT',
      },
    })

    fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })
    const call = await waitFor(() => {
      const found = chromeMockSpies.sendMessage.mock.calls
        .map(entry => entry[0] as any)
        .find(message => message?.payload?.action === 'update_config')
      if (!found) throw new Error('update_config not sent')
      return found
    })

    expect(Object.hasOwn(call.payload.payload, 'user_prompt')).toBe(false)
    expect(Object.hasOwn(
      call.payload.payload.config.extension_preferences,
      'user_prompt',
    )).toBe(false)
    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('sends an explicit Custom User Prompt replacement and clear', async () => {
    const replacement = deferNextResponse('update_config')
    const clear = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        use_workspace_only: false,
        user_prompt: 'OLD-PROMPT',
      },
    })
    const editor = await openUserPromptEditor()

    fireEvent.change(editor, { target: { value: 'NEW-PROMPT' } })
    fireEvent.blur(editor)
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    let calls = chromeMockSpies.sendMessage.mock.calls
      .map(entry => entry[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(calls[0].payload.payload.user_prompt).toBe('NEW-PROMPT')
    await act(async () => replacement.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))

    fireEvent.change(editor, { target: { value: '' } })
    fireEvent.blur(editor)
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(2))
    calls = chromeMockSpies.sendMessage.mock.calls
      .map(entry => entry[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(calls[1].payload.payload.user_prompt).toBe('')
    await act(async () => clear.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('sends an explicit empty Custom User Prompt on Reset', async () => {
    const update = deferNextResponse('update_config')
    const resetResponse = deferNextResponse('RESET_EXTENSION_STATE')
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        use_workspace_only: false,
        user_prompt: 'CLEAR-ON-RESET',
      },
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
      const call = await waitFor(() => {
        const found = chromeMockSpies.sendMessage.mock.calls
          .map(entry => entry[0] as any)
          .find(message => message?.payload?.action === 'update_config')
        if (!found) throw new Error('reset update_config not sent')
        return found
      })
      expect(call.payload.payload.user_prompt).toBe('')
      await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await resolveCommittedReset(resetResponse)
    } finally {
      confirmSpy.mockRestore()
    }
  })

  it('keeps prompt revision 2 pending when revision 1 succeeds late', async () => {
    const firstUpdate = deferNextResponse('update_config')
    const secondUpdate = deferNextResponse('update_config')
    const retryUpdate = deferNextResponse('update_config')
    await hydrateOptions({
      root_path: '',
      prompt_source_status: { status: 'ok' },
      extension_preferences: {
        use_workspace_only: false,
        user_prompt: 'initial',
      },
    })
    const editor = await openUserPromptEditor()

    fireEvent.change(editor, { target: { value: 'prompt-1' } })
    fireEvent.blur(editor)
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(1))
    fireEvent.change(editor, { target: { value: 'prompt-2' } })
    fireEvent.blur(editor)
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(2))

    await act(async () => firstUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    await act(async () => secondUpdate.resolve({
      status: 'error',
      error: 'retry prompt revision 2',
    }))
    fireEvent.change(await findLanguageSelect(), { target: { value: 'en' } })
    await waitFor(() => expect(countUpdateConfigCalls()).toBe(3))

    const calls = chromeMockSpies.sendMessage.mock.calls
      .map(entry => entry[0] as any)
      .filter(message => message?.payload?.action === 'update_config')
    expect(calls.at(-1).payload.payload.user_prompt).toBe('prompt-2')
    await act(async () => retryUpdate.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
  })

  it('clears unreadable Custom User Prompt health after explicit repair', async () => {
    const update = deferNextResponse('update_config')
    seedStorage({
      dh_prefs: { ...DEFAULT_PREFS, userPrompt: 'MIRRORED-PROMPT' },
    })
    await hydrateOptions({
      root_path: '',
      prompt_source_status: {
        status: 'error',
        error_code: 'user_prompt_unreadable',
        error: 'fallback',
      },
      extension_preferences: { use_workspace_only: false },
    })
    const health = deferNextResponse('get_config')
    const editor = await openUserPromptEditor()
    fireEvent.change(editor, { target: { value: 'REPAIRED-PROMPT' } })
    fireEvent.blur(editor)

    await act(async () => update.resolve({
      status: 'success',
      data: { success: true, config_saved: true },
    }))
    expect(screen.getByRole('alert').textContent).toMatch(/Custom User Prompt/i)
    await act(async () => health.resolve({
      status: 'success',
      data: { prompt_source_status: { status: 'ok' } },
    }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
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
      await act(async () => update.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await resolveCommittedReset(resetResponse)
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

    await act(async () => getConfig.reject(new Error('host unavailable')))
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

    await act(async () => failedUpdate.reject(new Error('PORT CLOSED')))
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
      await act(async () => resetUpdate.resolve({
        status: 'success',
        data: { success: true, config_saved: true },
      }))
      await resolveCommittedReset(resetResponse)
      const editor = await openDhInstructionsEditor()
      fireEvent.change(editor, { target: { value: 'after-reset' } })
      fireEvent.blur(editor)

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
