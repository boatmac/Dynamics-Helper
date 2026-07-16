import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react'
import {
  installChromeMock,
  resetChromeMock,
  deferNextResponse,
  seedStorage,
  chromeMockSpies,
} from '../test/chromeMock'
import { DEFAULT_PREFS } from '../utils/prefs'
import { getTranslation } from '../utils/translations'

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
