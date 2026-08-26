import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  chromeMockSpies,
  deferNextStorageGet,
  emitStorageChanges,
  getStorageSnapshot,
  installChromeMock,
  resetChromeMock,
  seedStorage,
} from '../test/chromeMock'
import { teamCacheIsCurrent, useMenuLogic } from './MenuLogic'

describe('Team Catalog consumer cache identity', () => {
  const prefs = {
    teamCatalogEnabled: true,
    teamManifestUrl: 'https://example.test/manifest.json',
    team: 'team-a',
  }

  it('accepts only an exact enabled, URL, and team cache identity', () => {
    expect(teamCacheIsCurrent({
      dh_team_manifest_url: prefs.teamManifestUrl,
      dh_team: prefs.team,
      dh_prefs: prefs,
    })).toBe(true)
    expect(teamCacheIsCurrent({
      dh_team_manifest_url: 'https://example.test/old.json',
      dh_team: prefs.team,
      dh_prefs: prefs,
    })).toBe(false)
    expect(teamCacheIsCurrent({
      dh_team_manifest_url: prefs.teamManifestUrl,
      dh_team: 'team-b',
      dh_prefs: prefs,
    })).toBe(false)
    expect(teamCacheIsCurrent({
      dh_team_manifest_url: prefs.teamManifestUrl,
      dh_team: prefs.team,
      dh_prefs: { ...prefs, teamCatalogEnabled: false },
    })).toBe(false)
  })
})

describe('MenuLogic latest team load ownership', () => {
  const manifestUrl = 'https://example.test/manifest.json'
  const personal = { type: 'link' as const, label: 'PERSONAL' }

  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  function seedTeam(team: string, label: string) {
    seedStorage({
      dh_items: [personal],
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: manifestUrl,
        team,
      },
      dh_team_manifest_url: manifestUrl,
      dh_team: team,
      dh_team_items: [{ type: 'link', label, source: 'team' }],
    })
  }

  it('ignores delayed team A load after a team B storage event completes', async () => {
    seedTeam('team-a', 'TEAM A')
    const delayedA = deferNextStorageGet('dh_team_items')
    const hook = renderHook(() => useMenuLogic())
    await waitFor(() => expect(hook.result.current.currentItems).toEqual([]))

    await act(async () => emitStorageChanges({
      dh_prefs: {
        oldValue: {},
        newValue: {
          teamCatalogEnabled: true,
          teamManifestUrl: manifestUrl,
          team: 'team-b',
        },
      },
      dh_team: { oldValue: 'team-a', newValue: 'team-b' },
      dh_team_items: {
        oldValue: [],
        newValue: [{ type: 'link', label: 'TEAM B', source: 'team' }],
      },
    }))
    await waitFor(() => expect(
      hook.result.current.currentItems.map(item => item.label),
    ).toContain('TEAM B'))

    await act(async () => delayedA.resolve(undefined))
    expect(hook.result.current.currentItems.map(item => item.label)).toEqual([
      'PERSONAL',
      'TEAM B',
    ])
  })

  it('ignores delayed team A load after Reset clears the team identity', async () => {
    seedTeam('team-a', 'TEAM A')
    const delayedA = deferNextStorageGet('dh_team_items')
    const hook = renderHook(() => useMenuLogic())

    await act(async () => emitStorageChanges({
      dh_prefs: {
        oldValue: {},
        newValue: {
          teamCatalogEnabled: false,
          teamManifestUrl: '',
          team: undefined,
        },
      },
      dh_team: { oldValue: 'team-a', newValue: undefined },
      dh_team_manifest_url: { oldValue: manifestUrl, newValue: undefined },
      dh_team_items: { oldValue: [], newValue: undefined },
    }))
    await waitFor(() => expect(
      hook.result.current.currentItems.map(item => item.label),
    ).toEqual(['PERSONAL']))

    await act(async () => delayedA.resolve(undefined))
    expect(hook.result.current.currentItems.map(item => item.label)).toEqual([
      'PERSONAL',
    ])
  })

  it('keeps a stored empty personal menu empty instead of loading defaults', async () => {
    seedStorage({ dh_items: [] })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([
        { type: 'link', label: 'MUST NOT RESURRECT' },
      ]),
    } as Response)
    try {
      const hook = renderHook(() => useMenuLogic())
      await waitFor(() => expect(hook.result.current.currentItems).toEqual([]))
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })

  it('preserves the accepted menu when a later storage read fails', async () => {
    seedStorage({ dh_items: [personal] })
    const hook = renderHook(() => useMenuLogic())
    await waitFor(() => expect(hook.result.current.currentItems).toEqual([personal]))
    const failedRead = deferNextStorageGet('dh_items')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await act(async () => {
      emitStorageChanges({
        dh_items: { oldValue: [personal], newValue: [personal] },
      })
      await failedRead.reject(new Error('storage unavailable'))
    })

    await waitFor(() => expect(hook.result.current.bookmarkLoadIssue)
      .toBe('bookmark_storage_read_failed'))
    expect(hook.result.current.currentItems).toEqual([personal])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('distinguishes malformed saved bookmarks without loading defaults', async () => {
    seedStorage({ dh_items: [{ type: 'link', label: 7 }] })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{ type: 'link', label: 'DEFAULT' }]),
    } as Response)
    try {
      const hook = renderHook(() => useMenuLogic())
      await waitFor(() => expect(hook.result.current.bookmarkLoadIssue)
        .toBe('bookmark_storage_invalid'))
      expect(hook.result.current.currentItems).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
      expect(chromeMockSpies.storageSet.mock.calls.some(
        call => Object.hasOwn(call[0] as object, 'dh_items'),
      )).toBe(false)
    } finally {
      fetchMock.mockRestore()
    }
  })

  it('loads, collapses, and persists defaults only when storage is absent', async () => {
    const defaults = [{
      type: 'folder' as const,
      label: 'DEFAULTS',
      children: [{ type: 'link' as const, label: 'CHILD' }],
    }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ items: defaults }),
    } as Response)
    try {
      const hook = renderHook(() => useMenuLogic())
      await waitFor(() => expect(hook.result.current.currentItems).toEqual([{
        ...defaults[0],
        collapsed: true,
      }]))
      expect(hook.result.current.bookmarkLoadIssue).toBeNull()
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(getStorageSnapshot().dh_items).toEqual([{
        ...defaults[0],
        collapsed: true,
      }])
      expect(chromeMockSpies.storageSet.mock.calls.filter(
        call => Object.hasOwn(call[0] as object, 'dh_items'),
      )).toHaveLength(1)
    } finally {
      fetchMock.mockRestore()
    }
  })

  it.each([
    ['fetch', () => Promise.reject(new Error('offline'))],
    ['HTML', () => Promise.resolve({
      ok: true,
      text: async () => '<html>not bookmarks</html>',
    } as Response)],
    ['JSON', () => Promise.resolve({
      ok: true,
      text: async () => '{not json',
    } as Response)],
    ['schema', () => Promise.resolve({
      ok: true,
      text: async () => JSON.stringify({ items: [{ type: 'link', label: 7 }] }),
    } as Response)],
  ])('reports unreadable defaults for an absent key with %s failure', async (_name, load) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(load)
    try {
      const hook = renderHook(() => useMenuLogic())
      await waitFor(() => expect(hook.result.current.bookmarkLoadIssue)
        .toBe('bookmark_defaults_unreadable'))
      expect(hook.result.current.currentItems).toEqual([])
      expect(hook.result.current.currentItems.map(item => item.label))
        .not.toEqual(expect.arrayContaining(['Favorites', 'About']))
      expect(chromeMockSpies.storageSet.mock.calls.some(
        call => Object.hasOwn(call[0] as object, 'dh_items'),
      )).toBe(false)
    } finally {
      fetchMock.mockRestore()
    }
  })

  it('reports no issue or fallback for an explicitly saved empty menu', async () => {
    seedStorage({ dh_items: [] })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    try {
      const hook = renderHook(() => useMenuLogic())
      await waitFor(() => expect(hook.result.current.bookmarkLoadIssue).toBeNull())
      expect(hook.result.current.currentItems).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })

  it.each([
    ['malformed items', () => ({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: manifestUrl,
        team: 'team-a',
      },
      dh_team_manifest_url: manifestUrl,
      dh_team: 'team-a',
      dh_team_items: [{ type: 'link', label: 7 }],
    })],
    ['accessor items', (getter: ReturnType<typeof vi.fn>) => {
      const result: Record<string, unknown> = {
        dh_prefs: {
          teamCatalogEnabled: true,
          teamManifestUrl: manifestUrl,
          team: 'team-a',
        },
        dh_team_manifest_url: manifestUrl,
        dh_team: 'team-a',
      }
      Object.defineProperty(result, 'dh_team_items', {
        enumerable: true,
        get: getter,
      })
      return result
    }],
    ['revoked outer result', () => {
      const result = Proxy.revocable({
        dh_prefs: {
          teamCatalogEnabled: true,
          teamManifestUrl: manifestUrl,
          team: 'team-a',
        },
        dh_team_manifest_url: manifestUrl,
        dh_team: 'team-a',
        dh_team_items: [{ type: 'link', label: 'MUST NOT ESCAPE' }],
      }, {})
      result.revoke()
      return result.proxy
    }],
  ])('ignores hostile current-team cache data: %s', async (_name, makeResult) => {
    seedStorage({ dh_items: [personal] })
    const getter = vi.fn(() => [{ type: 'link', label: 'MUST NOT ESCAPE' }])
    const originalGet = chromeMockSpies.storageGet.getMockImplementation()!
    let intercepted = false
    chromeMockSpies.storageGet.mockImplementation((keys?: unknown, callback?: unknown) => {
      if (
        !intercepted
        && Array.isArray(keys)
        && keys.includes('dh_team_items')
        && typeof callback === 'function'
      ) {
        intercepted = true
        queueMicrotask(() => (callback as (value: unknown) => void)(makeResult(getter)))
        return undefined
      }
      return originalGet(keys, callback)
    })
    const logs = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ]
    try {
      const hook = renderHook(() => useMenuLogic())
      await waitFor(() => expect(hook.result.current.currentItems).toEqual([personal]))
      expect(getter).not.toHaveBeenCalled()
      expect(JSON.stringify(logs.flatMap(log => log.mock.calls)))
        .not.toContain('MUST NOT ESCAPE')
    } finally {
      chromeMockSpies.storageGet.mockImplementation(originalGet)
      logs.forEach(log => log.mockRestore())
    }
  })
})
