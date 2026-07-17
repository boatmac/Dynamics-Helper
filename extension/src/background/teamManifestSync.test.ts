import { describe, expect, it, vi } from 'vitest'
import {
  handleTeamCatalogSyncRequest,
  syncManifestOnly,
  toSelectedTeamSyncResponse,
} from './teamManifestSync'
import {
  shouldClearSelectedTeamCache,
  shouldReportTeamSyncFailure,
} from './teamManifestSync'

const URL = 'https://catalog.example/manifest.json?sig=secret'
const MANIFEST = { version: 1, teams: [] }
const MANIFEST_REQUEST = {
  identity: {
    enabled: true,
    manifestUrl: URL,
    teamId: '',
  },
  requestGeneration: 7,
  storageGeneration: 11,
}

function manifestDeps(overrides: Record<string, unknown> = {}) {
  return {
    readInitialState: vi.fn().mockResolvedValue({ etag: 'old-etag' }),
    identityIsCurrent: vi.fn().mockResolvedValue(true),
    fetchManifest: vi.fn().mockResolvedValue({
      ok: true,
      changed: true,
      manifest: MANIFEST,
      etag: 'new-etag',
    }),
    writeManifest: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('syncManifestOnly preference commit gate', () => {
  it('validates the captured identity before starting the network fetch', async () => {
    const deps = manifestDeps({ identityIsCurrent: vi.fn().mockResolvedValue(false) })

    await expect(syncManifestOnly(MANIFEST_REQUEST, deps as any)).resolves.toMatchObject({
      status: 'success',
      data: { syncStatus: 'stale' },
    })
    expect(deps.fetchManifest).not.toHaveBeenCalled()
    expect(deps.writeManifest).not.toHaveBeenCalled()
  })

  it('preserves the existing missing-URL error before a fetch starts', async () => {
    const fetchManifest = vi.fn()
    await expect(syncManifestOnly({
      ...MANIFEST_REQUEST,
      identity: { ...MANIFEST_REQUEST.identity, manifestUrl: '' },
    }, {
      readInitialState: vi.fn(),
      identityIsCurrent: vi.fn(),
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

    const run = syncManifestOnly(MANIFEST_REQUEST, {
      readInitialState: vi.fn().mockResolvedValue({ etag: 'old-etag' }),
      identityIsCurrent: vi.fn(async () => (
        currentPrefs.teamCatalogEnabled === true
        && currentPrefs.teamManifestUrl === URL
      )),
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
      data: {
        manifestOnly: false,
        changed: false,
        syncStatus: 'stale',
        identity: MANIFEST_REQUEST.identity,
        requestGeneration: 7,
      },
    })
    expect(writeManifest).not.toHaveBeenCalled()
  })

  it('commits when catalog remains enabled at the exact captured URL', async () => {
    const prefs = { teamCatalogEnabled: true, teamManifestUrl: URL }
    const writeManifest = vi.fn().mockResolvedValue(undefined)

    await expect(syncManifestOnly(MANIFEST_REQUEST, {
      readInitialState: vi.fn().mockResolvedValue({ etag: 'old-etag' }),
      identityIsCurrent: vi.fn().mockResolvedValue(
        prefs.teamCatalogEnabled && prefs.teamManifestUrl === URL,
      ),
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
        identity: MANIFEST_REQUEST.identity,
        requestGeneration: 7,
      },
    })
    expect(writeManifest).toHaveBeenCalledWith(
      MANIFEST,
      'new-etag',
    )
  })

  it.each([
    ['failure', { ok: false, failure: { kind: 'auth', message: 'safe failure' } }],
    ['null', null],
    ['304', { ok: true, changed: false, etag: 'old-etag' }],
  ])('rechecks current preferences after a %s fetch result', async (_name, fetchResult) => {
    const identityIsCurrent = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    await expect(syncManifestOnly(MANIFEST_REQUEST, {
      readInitialState: vi.fn().mockResolvedValue({ etag: 'old-etag' }),
      identityIsCurrent,
      fetchManifest: vi.fn().mockResolvedValue(fetchResult),
      writeManifest: vi.fn(),
    })).resolves.toMatchObject({
      status: 'success',
      data: { syncStatus: 'stale' },
    })
    expect(identityIsCurrent).toHaveBeenCalledTimes(2)
  })
})

describe('Service Worker team request identity boundary', () => {
  const selectedIdentity = {
    enabled: true,
    manifestUrl: URL,
    teamId: 'team-a',
  }

  function requestDeps() {
    let generation = 0
    return {
      get generation() { return generation },
      beginGeneration: vi.fn(() => ++generation),
      identityIsCurrent: vi.fn(async (_identity, expected) => expected === generation),
      clearAll: vi.fn().mockResolvedValue(true),
      clearSelection: vi.fn().mockResolvedValue(true),
      clearSelectionIfChanged: vi.fn().mockResolvedValue(true),
      syncManifest: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
      syncSelected: vi.fn().mockResolvedValue({
        status: 'committed',
        identity: selectedIdentity,
        items: [],
      }),
    }
  }

  it('allocates generation synchronously before a deferred preference read', async () => {
    const deps = requestDeps()
    let release!: () => void
    const blocked = new Promise<void>(resolve => { release = resolve })
    deps.identityIsCurrent.mockImplementationOnce(async (_identity, expected) => {
      await blocked
      return expected === deps.generation
    })

    const run = handleTeamCatalogSyncRequest({
      identity: selectedIdentity,
      requestGeneration: 41,
    }, deps)
    expect(deps.beginGeneration).toHaveBeenCalledOnce()
    deps.beginGeneration()
    release()

    await expect(run).resolves.toMatchObject({
      status: 'success',
      data: {
        syncStatus: 'stale',
        identity: selectedIdentity,
        requestGeneration: 41,
      },
    })
    expect(deps.clearSelectionIfChanged).not.toHaveBeenCalled()
    expect(deps.syncSelected).not.toHaveBeenCalled()
  })

  it.each([
    ['manifest reset', { identity: { ...selectedIdentity, teamId: '' }, requestGeneration: 1, manifestOnly: true, resetCache: true }],
    ['no-team clear', { identity: { ...selectedIdentity, teamId: '' }, requestGeneration: 2 }],
    ['selected sync', { identity: selectedIdentity, requestGeneration: 3 }],
  ])('a stale %s performs no clear, fetch, or selected sync', async (_name, request) => {
    const deps = requestDeps()
    deps.identityIsCurrent.mockResolvedValue(false)

    await handleTeamCatalogSyncRequest(request, deps)

    expect(deps.clearAll).not.toHaveBeenCalled()
    expect(deps.clearSelection).not.toHaveBeenCalled()
    expect(deps.clearSelectionIfChanged).not.toHaveBeenCalled()
    expect(deps.syncManifest).not.toHaveBeenCalled()
    expect(deps.syncSelected).not.toHaveBeenCalled()
  })

  it('passes one captured identity and storage generation through a valid selected sync', async () => {
    const deps = requestDeps()

    const response = await handleTeamCatalogSyncRequest({
      identity: selectedIdentity,
      requestGeneration: 99,
    }, deps)

    expect(deps.clearSelectionIfChanged).toHaveBeenCalledWith(selectedIdentity, 1)
    expect(deps.syncSelected).toHaveBeenCalledWith(selectedIdentity, 1)
    expect(response.data).toMatchObject({
      identity: selectedIdentity,
      requestGeneration: 99,
    })
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
