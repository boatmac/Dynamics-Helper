import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  deferNextStorageGet,
  emitStorageChanges,
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
})
