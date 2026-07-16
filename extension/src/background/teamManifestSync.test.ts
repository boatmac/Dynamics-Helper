import { describe, expect, it, vi } from 'vitest'
import { syncManifestOnly } from './teamManifestSync'
import { toSelectedTeamSyncResponse } from './teamManifestSync'
import {
  shouldClearSelectedTeamCache,
  shouldReportTeamSyncFailure,
} from './teamManifestSync'

const URL = 'https://catalog.example/manifest.json?sig=secret'
const MANIFEST = { version: 1, teams: [] }

describe('syncManifestOnly preference commit gate', () => {
  it('preserves the existing missing-URL error before a fetch starts', async () => {
    const fetchManifest = vi.fn()
    await expect(syncManifestOnly({
      readInitialState: vi.fn().mockResolvedValue({
        prefs: { teamCatalogEnabled: true, teamManifestUrl: '' },
      }),
      readCurrentPrefs: vi.fn(),
      fetchManifest,
      writeManifest: vi.fn(),
    })).resolves.toEqual({
      status: 'error',
      error: 'Manifest URL not configured',
    })
    expect(fetchManifest).not.toHaveBeenCalled()
  })

  it('skips a fetched manifest when Reset changes the captured preferences', async () => {
    let resolveFetch!: (value: any) => void
    const fetchResult = new Promise<any>(resolve => { resolveFetch = resolve })
    let currentPrefs = {
      teamCatalogEnabled: true,
      teamManifestUrl: URL,
    }
    const writeManifest = vi.fn().mockResolvedValue(undefined)
    const fetchManifest = vi.fn(() => fetchResult)

    const run = syncManifestOnly({
      readInitialState: vi.fn().mockResolvedValue({
        prefs: currentPrefs,
        etag: 'old-etag',
      }),
      readCurrentPrefs: vi.fn(async () => currentPrefs),
      fetchManifest,
      writeManifest,
    })
    await vi.waitFor(() => expect(fetchManifest).toHaveBeenCalledWith(URL, 'old-etag'))

    currentPrefs = {
      teamCatalogEnabled: false,
      teamManifestUrl: '',
    }
    resolveFetch({
      ok: true,
      changed: true,
      manifest: MANIFEST,
      etag: 'new-etag',
    })

    await expect(run).resolves.toEqual({
      status: 'success',
      data: { manifestOnly: true, changed: false, syncStatus: 'stale' },
    })
    expect(writeManifest).not.toHaveBeenCalled()
  })

  it('commits when catalog remains enabled at the exact captured URL', async () => {
    const prefs = { teamCatalogEnabled: true, teamManifestUrl: URL }
    const writeManifest = vi.fn().mockResolvedValue(undefined)

    await expect(syncManifestOnly({
      readInitialState: vi.fn().mockResolvedValue({ prefs, etag: 'old-etag' }),
      readCurrentPrefs: vi.fn().mockResolvedValue(prefs),
      fetchManifest: vi.fn().mockResolvedValue({
        ok: true,
        changed: true,
        manifest: MANIFEST,
        etag: 'new-etag',
      }),
      writeManifest,
    })).resolves.toEqual({
      status: 'success',
      data: {
        manifestOnly: true,
        changed: true,
        syncStatus: 'committed',
      },
    })
    expect(writeManifest).toHaveBeenCalledWith(
      MANIFEST,
      'new-etag',
      URL,
      undefined,
    )
  })

  it.each([
    ['failure', { ok: false, failure: { kind: 'auth', message: 'safe failure' } }],
    ['null', null],
    ['304', { ok: true, changed: false, etag: 'old-etag' }],
  ])('rechecks current preferences after a %s fetch result', async (_name, fetchResult) => {
    const initialPrefs = { teamCatalogEnabled: true, teamManifestUrl: URL }
    const readCurrentPrefs = vi.fn().mockResolvedValue({
      teamCatalogEnabled: false,
      teamManifestUrl: '',
    })

    await expect(syncManifestOnly({
      readInitialState: vi.fn().mockResolvedValue({
        prefs: initialPrefs,
        etag: 'old-etag',
      }),
      readCurrentPrefs,
      fetchManifest: vi.fn().mockResolvedValue(fetchResult),
      writeManifest: vi.fn(),
    })).resolves.toMatchObject({
      status: 'success',
      data: { syncStatus: 'stale' },
    })
    expect(readCurrentPrefs).toHaveBeenCalledOnce()
  })
})

describe('selected-team sync response boundary', () => {
  const identity = {
    enabled: true as const,
    manifestUrl: URL,
    teamId: 'team-a',
  }

  it('does not expose stale items to Service Worker callers', () => {
    expect(toSelectedTeamSyncResponse(
      { status: 'stale', identity, items: [{ label: 'STALE ITEM' }] },
    )).toEqual({
      status: 'success',
      data: { syncStatus: 'stale', identity },
    })
  })

  it.each(['skipped', 'stale'] as const)('suppresses items for %s', status => {
    expect(toSelectedTeamSyncResponse({
      status,
      identity,
      items: [{ label: 'MUST NOT ESCAPE' }],
    })).toEqual({
      status: 'success',
      data: { syncStatus: status, identity },
    })
  })

  it.each(['committed', 'unchanged'] as const)('preserves valid %s status and items', status => {
    const items = [{ label: 'Current item' }]
    expect(toSelectedTeamSyncResponse(
      { status, identity, items, syncedAt: '2026-07-17T00:00:00.000Z' },
    )).toEqual({
      status: 'success',
      data: {
        syncStatus: status,
        identity,
        items,
        syncedAt: '2026-07-17T00:00:00.000Z',
      },
    })
  })

  it('preserves failed status and captured identity', () => {
    expect(toSelectedTeamSyncResponse({
      status: 'failed',
      identity,
      items: [{ label: 'Cached item' }],
      failure: { kind: 'auth', message: 'safe failure' },
      failureStage: 'bookmarks',
    })).toEqual({
      status: 'error',
      error: 'safe failure',
      errorKind: 'auth',
      httpStatus: undefined,
      failureStage: 'bookmarks',
      data: {
        syncStatus: 'failed',
        identity,
        items: [{ label: 'Cached item' }],
      },
    })
  })

  it('queues a selection clear only when cached and requested teams differ', () => {
    expect(shouldClearSelectedTeamCache('team-a', 'team-b')).toBe(true)
    expect(shouldClearSelectedTeamCache('team-a', 'team-a')).toBe(false)
    expect(shouldClearSelectedTeamCache(undefined, 'team-a')).toBe(false)
  })

  it('reports only a failed result whose captured identity is still current', () => {
    const failed = {
      status: 'failed' as const,
      identity,
      items: [],
      failure: { kind: 'auth' as const, message: 'safe failure' },
    }
    expect(shouldReportTeamSyncFailure(failed, {
      teamCatalogEnabled: true,
      teamManifestUrl: URL,
      team: 'team-a',
    })).toBe(true)
    expect(shouldReportTeamSyncFailure(failed, {
      teamCatalogEnabled: true,
      teamManifestUrl: URL,
      team: 'team-b',
    })).toBe(false)
    expect(shouldReportTeamSyncFailure({
      ...failed,
      status: 'stale',
    }, {
      teamCatalogEnabled: true,
      teamManifestUrl: URL,
      team: 'team-a',
    })).toBe(false)
  })
})
