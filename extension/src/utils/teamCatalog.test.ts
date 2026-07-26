import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  beginTeamSyncGeneration,
  clearTeamBookmarks,
  clearTeamSelection,
  fetchManifest,
  fetchTeamBookmarks,
  readTeamManifestState,
  syncTeamBookmarks,
  writeTeamManifestForUrl,
} from './teamCatalog'
import {
  chromeMockSpies,
  deferNextStorageSet,
  deferNextStorageGet,
  deferNextStorageRemove,
  getStorageSnapshot,
  installChromeMock,
  resetChromeMock,
  seedStorage,
} from '../test/chromeMock'
import type { MenuItem } from './bookmarkItems'

const SECRET_URL =
  'https://catalog.example/manifest.json?sv=2026-01-01&sig=TOP-SECRET-SAS'

installChromeMock()

function renderedWarnings(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.flatMap(call => call.map(value => {
    if (value instanceof Error) return `${value.name}: ${value.message}`
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  })).join('\n')
}

describe('team catalog diagnostics redact credential-bearing URLs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not log a manifest URL, query, sig, or unsafe HTTP status text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 403,
      statusText: `Forbidden ${SECRET_URL}`,
      ok: false,
    }))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await fetchManifest(SECRET_URL)

    expect(result).toMatchObject({
      ok: false,
      failure: { kind: 'auth', httpStatus: 403 },
    })
    const output = renderedWarnings(warn)
    expect(output).not.toContain(SECRET_URL)
    expect(output).not.toContain('TOP-SECRET-SAS')
    expect(output).not.toMatch(/\b(?:sig|sv)=/i)
  })

  it('does not log a thrown manifest parse object containing the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      ok: true,
      json: vi.fn().mockRejectedValue(new Error(`parse failed for ${SECRET_URL}`)),
      headers: { get: vi.fn().mockReturnValue(null) },
    }))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await fetchManifest(SECRET_URL)

    expect(result).toMatchObject({ ok: false, failure: { kind: 'parse' } })
    const output = renderedWarnings(warn)
    expect(output).not.toContain(SECRET_URL)
    expect(output).not.toContain('TOP-SECRET-SAS')
    expect(output).not.toMatch(/\b(?:sig|sv)=/i)
  })

  it('does not log a thrown bookmark network object containing its URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new Error(`network failed for ${SECRET_URL}`),
    ))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await fetchTeamBookmarks(SECRET_URL)

    expect(result).toMatchObject({ ok: false, failure: { kind: 'network' } })
    const output = renderedWarnings(warn)
    expect(output).not.toContain(SECRET_URL)
    expect(output).not.toContain('TOP-SECRET-SAS')
    expect(output).not.toMatch(/\b(?:sig|sv)=/i)
  })
})

describe('team catalog sync preference commit gate', () => {
  afterEach(() => {
    resetChromeMock()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not persist a selected-team manifest after Reset disables the catalog', async () => {
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: SECRET_URL,
        team: 'team-a',
      },
      dh_team: 'team-a',
    })
    let resolveFetch!: (value: unknown) => void
    const fetchResponse = new Promise(resolve => { resolveFetch = resolve })
    const fetch = vi.fn(() => fetchResponse)
    vi.stubGlobal('fetch', fetch)

    const sync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: false,
        teamManifestUrl: '',
      },
    })
    resolveFetch({
      status: 200,
      statusText: 'OK',
      ok: true,
      json: vi.fn().mockResolvedValue({
        version: 1,
        teams: [{ id: 'team-a', label: 'Team A', url: SECRET_URL }],
      }),
      headers: { get: vi.fn().mockReturnValue('new-etag') },
    })

    await sync
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest_etag')
  })

  it('rechecks generation after a deferred cache read before any fetch starts', async () => {
    seedSelectedTeam()
    const cacheRead = deferNextStorageGet('dh_team_items')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const sync = syncTeamBookmarks({
      enabled: true,
      manifestUrl: SECRET_URL,
      teamId: 'team-a',
    })
    beginTeamSyncGeneration()
    await cacheRead.resolve(undefined)

    await expect(sync).resolves.toMatchObject({ status: 'stale', items: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('validates current preferences before a selected-team network fetch', async () => {
    seedSelectedTeam()
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: SECRET_URL,
        team: 'team-b',
      },
    })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    await expect(syncTeamBookmarks({
      enabled: true,
      manifestUrl: SECRET_URL,
      teamId: 'team-a',
    })).resolves.toMatchObject({ status: 'stale', items: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  const BOOKMARK_URL = 'https://catalog.example/team-a.json?sig=BOOKMARK-SECRET'
  const CACHED_ITEMS = [{ type: 'link', label: 'Cached', source: 'team' }]
  const CHANGED_ITEMS = [{ type: 'link', label: 'Changed', url: 'https://safe.example' }]

  function itemChain(levels: number): MenuItem[] {
    let current: MenuItem = { type: 'link', label: `Level ${levels}` }
    for (let level = levels - 1; level >= 1; level -= 1) {
      current = {
        type: 'folder',
        label: `Level ${level}`,
        children: [current],
      }
    }
    return [current]
  }

  function response(status: number, body?: unknown, etag = '') {
    return {
      status,
      statusText: status === 304 ? 'Not Modified' : 'OK',
      ok: status >= 200 && status < 300,
      json: vi.fn().mockResolvedValue(body),
      headers: { get: vi.fn().mockReturnValue(etag) },
    }
  }

  function seedSelectedTeam(
    cachedItems: unknown = CACHED_ITEMS,
    includeItems = true,
  ) {
    const state: Record<string, unknown> = {
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: SECRET_URL,
        team: 'team-a',
      },
      dh_team: 'team-a',
      dh_team_etag: 'bookmark-old',
      dh_team_synced: '2026-01-01T00:00:00.000Z',
      dh_team_manifest_etag: 'manifest-old',
      dh_team_manifest_url: SECRET_URL,
      dh_team_manifest: {
        version: 1,
        teams: [{ id: 'team-a', label: 'Team A', url: BOOKMARK_URL }],
      },
    }
    if (includeItems) state.dh_team_items = cachedItems
    seedStorage(state)
  }

  async function storedTeamItemsAre(expected: unknown): Promise<boolean> {
    return new Promise(resolve => chrome.storage.local.get('dh_team_items', value => {
      const descriptor = Object.getOwnPropertyDescriptor(value, 'dh_team_items')
      resolve(Boolean(
        descriptor
        && Object.hasOwn(descriptor, 'value')
        && descriptor.value === expected,
      ))
    }))
  }

  it.each([
    ['schema', { items: [{ type: 'link', label: 7 }] }],
    ['cycle', (() => {
      const item: Record<string, unknown> = {
        type: 'folder',
        label: 'Cycle',
        children: [],
      }
      ;(item.children as unknown[]).push(item)
      return { items: [item] }
    })()],
    ['depth 65', { items: itemChain(65) }],
  ])('rejects malformed downloaded bookmark %s data and preserves cache', async (_name, body) => {
    seedSelectedTeam()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, body, 'new-etag')))

    const result = await fetchTeamBookmarks(BOOKMARK_URL)

    expect(result).toMatchObject({
      ok: false,
      failure: { kind: 'parse', message: 'Bookmark schema validation failed' },
    })
    expect(getStorageSnapshot().dh_team_items).toEqual(CACHED_ITEMS)
  })

  async function runStaleBookmarkFetch(
    nextPrefs: Record<string, unknown>,
    bookmarkStatus: 200 | 304,
  ) {
    seedSelectedTeam()
    let resolveBookmarks!: (value: unknown) => void
    const bookmarksResponse = new Promise(resolve => { resolveBookmarks = resolve })
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockImplementationOnce(() => bookmarksResponse)
    vi.stubGlobal('fetch', fetch)

    const sync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    seedStorage({ dh_prefs: nextPrefs })
    resolveBookmarks(bookmarkStatus === 304
      ? response(304)
      : response(200, { version: 1, team: 'team-a', items: CHANGED_ITEMS }, 'bookmark-new'))

    const result = await sync
    expect(result).toMatchObject({ status: 'stale', items: [] })
    expect(getStorageSnapshot()).toMatchObject({
      dh_team: 'team-a',
      dh_team_items: CACHED_ITEMS,
      dh_team_etag: 'bookmark-old',
      dh_team_synced: '2026-01-01T00:00:00.000Z',
    })
  }

  it.each([
    ['Reset', { teamCatalogEnabled: false, teamManifestUrl: '', team: '' }],
    ['team switch', { teamCatalogEnabled: true, teamManifestUrl: SECRET_URL, team: 'team-b' }],
    ['URL switch', { teamCatalogEnabled: true, teamManifestUrl: `${SECRET_URL}-new`, team: 'team-a' }],
  ])('returns stale and commits nothing when %s occurs during a changed bookmark fetch', async (_name, prefs) => {
    await runStaleBookmarkFetch(prefs, 200)
  })

  it.each([
    ['Reset', { teamCatalogEnabled: false, teamManifestUrl: '', team: '' }],
    ['team switch', { teamCatalogEnabled: true, teamManifestUrl: SECRET_URL, team: 'team-b' }],
    ['URL switch', { teamCatalogEnabled: true, teamManifestUrl: `${SECRET_URL}-new`, team: 'team-a' }],
  ])('returns stale and does not update the timestamp when %s occurs on bookmark 304', async (_name, prefs) => {
    await runStaleBookmarkFetch(prefs, 304)
  })

  it('returns stale rather than exposing a failed bookmark fetch after Reset', async () => {
    seedSelectedTeam()
    let resolveBookmarks!: (value: unknown) => void
    const bookmarksResponse = new Promise(resolve => { resolveBookmarks = resolve })
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockImplementationOnce(() => bookmarksResponse)
    vi.stubGlobal('fetch', fetch)

    const sync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    seedStorage({ dh_prefs: { teamCatalogEnabled: false, teamManifestUrl: '', team: '' } })
    resolveBookmarks(response(403))

    await expect(sync).resolves.toMatchObject({ status: 'stale', items: [] })
  })

  it('commits changed bookmarks when enabled, URL, and selected team remain exact', async () => {
    seedSelectedTeam()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(
        200,
        { version: 1, team: 'team-a', items: CHANGED_ITEMS },
        'bookmark-new',
      )))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({ status: 'committed' })
    expect(getStorageSnapshot()).toMatchObject({
      dh_team: 'team-a',
      dh_team_items: [{ ...CHANGED_ITEMS[0], source: 'team' }],
      dh_team_etag: 'bookmark-new',
      dh_team_synced: expect.any(String),
    })
  })

  it('reports a failed manifest mutation and lets the next queued sync recover', async () => {
    seedSelectedTeam()
    const manifestWrite = deferNextStorageSet('dh_team_manifest')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(200, {
        version: 2,
        teams: [{ id: 'team-a', label: 'Team A', url: BOOKMARK_URL }],
      }, 'manifest-new'))
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const failedSync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => value?.dh_team_manifest_etag === 'manifest-new',
      ),
    ).toBe(true))
    await manifestWrite.reject(new Error('MANIFEST STORAGE FAILED'))

    await expect(failedSync).resolves.toMatchObject({
      status: 'failed',
      identity: {
        enabled: true,
        manifestUrl: SECRET_URL,
        teamId: 'team-a',
      },
      items: [],
      failure: {
        kind: 'storage',
        message: 'Team catalog storage mutation failed',
      },
      failureStage: 'manifest',
    })
    expect(getStorageSnapshot()).toMatchObject({
      dh_team_manifest_etag: 'manifest-old',
      dh_team_items: CACHED_ITEMS,
      dh_team_synced: '2026-01-01T00:00:00.000Z',
    })

    await expect(syncTeamBookmarks(SECRET_URL, 'team-a')).resolves.toMatchObject({
      status: 'unchanged',
      items: CACHED_ITEMS,
    })
  })

  it('reports a failed bookmark mutation without exposing new items and recovers', async () => {
    seedSelectedTeam()
    const bookmarkWrite = deferNextStorageSet('dh_team_items')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(
        200,
        { version: 1, team: 'team-a', items: CHANGED_ITEMS },
        'bookmark-new',
      ))
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const failedSync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => value?.dh_team_etag === 'bookmark-new',
      ),
    ).toBe(true))
    await bookmarkWrite.reject(new Error('BOOKMARK STORAGE FAILED'))

    await expect(failedSync).resolves.toMatchObject({
      status: 'failed',
      items: [],
      failure: {
        kind: 'storage',
        message: 'Team catalog storage mutation failed',
      },
      failureStage: 'bookmarks',
    })
    await expect(failedSync).resolves.not.toHaveProperty('syncedAt')
    expect(getStorageSnapshot()).toMatchObject({
      dh_team_items: CACHED_ITEMS,
      dh_team_etag: 'bookmark-old',
      dh_team_synced: '2026-01-01T00:00:00.000Z',
    })

    await expect(syncTeamBookmarks(SECRET_URL, 'team-a')).resolves.toMatchObject({
      status: 'unchanged',
      items: CACHED_ITEMS,
    })
  })

  it('reports a failed 304 timestamp mutation and lets a later timestamp commit', async () => {
    seedSelectedTeam()
    const timestampWrite = deferNextStorageSet('dh_team_synced')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const failedSync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => typeof value?.dh_team_synced === 'string',
      ),
    ).toBe(true))
    await timestampWrite.reject(new Error('TIMESTAMP STORAGE FAILED'))

    await expect(failedSync).resolves.toMatchObject({
      status: 'failed',
      items: [],
      failure: { kind: 'storage' },
      failureStage: 'bookmarks',
    })
    await expect(failedSync).resolves.not.toHaveProperty('syncedAt')
    expect(getStorageSnapshot().dh_team_synced).toBe('2026-01-01T00:00:00.000Z')

    const recovered = await syncTeamBookmarks(SECRET_URL, 'team-a')
    expect(recovered).toMatchObject({ status: 'unchanged', items: CACHED_ITEMS })
    expect(getStorageSnapshot().dh_team_synced).not.toBe('2026-01-01T00:00:00.000Z')
  })

  it('rejects a failed selection clear and does not poison the next clear', async () => {
    seedSelectedTeam()
    const failedRemove = deferNextStorageRemove('dh_team')
    const failedClear = clearTeamSelection()
    await vi.waitFor(() => expect(
      (chrome.storage.local.remove as any).mock.calls.some(
        ([keys]: any[]) => keys.includes('dh_team'),
      ),
    ).toBe(true))
    await failedRemove.reject(new Error('SELECTION REMOVE FAILED'))

    await expect(failedClear).rejects.toThrow('Team catalog storage removal failed')
    expect(getStorageSnapshot()).toHaveProperty('dh_team', 'team-a')

    await expect(clearTeamSelection()).resolves.toBeUndefined()
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_items')
  })

  it('rejects a failed full clear and does not poison the next clear', async () => {
    seedSelectedTeam()
    const failedRemove = deferNextStorageRemove('dh_team_manifest')
    const failedClear = clearTeamBookmarks()
    await vi.waitFor(() => expect(
      (chrome.storage.local.remove as any).mock.calls.some(
        ([keys]: any[]) => keys.includes('dh_team_manifest'),
      ),
    ).toBe(true))
    await failedRemove.reject(new Error('FULL REMOVE FAILED'))

    await expect(failedClear).rejects.toThrow('Team catalog storage removal failed')
    expect(getStorageSnapshot()).toHaveProperty('dh_team_manifest')

    await expect(clearTeamBookmarks()).resolves.toBeUndefined()
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_items')
  })

  it('updates only the timestamp on a valid bookmark 304', async () => {
    seedSelectedTeam()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({ status: 'unchanged', items: CACHED_ITEMS })
    expect(getStorageSnapshot()).toMatchObject({
      dh_team_items: CACHED_ITEMS,
      dh_team_etag: 'bookmark-old',
      dh_team_synced: expect.not.stringMatching(/^2026-01-01/),
    })
    const teamWrites = chromeMockSpies.storageSet.mock.calls.map(call => call[0])
    expect(teamWrites).toHaveLength(1)
    expect(Object.keys(teamWrites[0] as object)).toEqual(['dh_team_synced'])
  })

  it('returns a parsed plain cache snapshot and updates only time on bookmark 304', async () => {
    const cached = [{
      type: 'link',
      label: 'Cached',
      source: 'team',
      future: { values: ['preserved'] },
    }]
    seedSelectedTeam(cached)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({ status: 'unchanged', items: cached })
    expect(result.items).not.toBe(cached)
    expect(result.items[0]).not.toBe(cached[0])
    expect(chromeMockSpies.storageSet.mock.calls.map(call => call[0])).toEqual([
      { dh_team_synced: expect.any(String) },
    ])
  })

  it('keeps an own empty team cache empty and updates only time on bookmark 304', async () => {
    seedSelectedTeam([])
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({ status: 'unchanged', items: [] })
    expect(getStorageSnapshot().dh_team_items).toEqual([])
    expect(chromeMockSpies.storageSet.mock.calls.map(call => call[0])).toEqual([
      { dh_team_synced: expect.any(String) },
    ])
  })

  it('rejects an absent cached bookmark key on 304 without advancing time', async () => {
    seedSelectedTeam(undefined, false)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({
      status: 'failed',
      items: [],
      failure: {
        kind: 'parse',
        message: 'Cached bookmark schema validation failed',
      },
      failureStage: 'bookmarks',
    })
    expect(result).not.toHaveProperty('syncedAt')
    expect(getStorageSnapshot().dh_team_synced).toBe('2026-01-01T00:00:00.000Z')
    expect(chromeMockSpies.storageSet.mock.calls).toHaveLength(0)
  })

  it.each([
    ['malformed', () => [{ type: 'link', label: 7 }]],
    ['accessor', () => {
      const getter = vi.fn(() => 'MUST NOT RUN')
      const item: Record<string, unknown> = { type: 'link' }
      Object.defineProperty(item, 'label', { enumerable: true, get: getter })
      return Object.assign([item], { getter })
    }],
    ['cyclic', () => {
      const item: Record<string, unknown> = {
        type: 'folder', label: 'Cycle', children: [],
      }
      ;(item.children as unknown[]).push(item)
      return [item]
    }],
    ['depth-65', () => itemChain(65)],
    ['revoked', () => {
      const value = Proxy.revocable([{ type: 'link', label: 'Revoked' }], {})
      value.revoke()
      return value.proxy
    }],
  ])('rejects malformed cached bookmarks on 304: %s', async (_name, makeCache) => {
    const rawCache = makeCache()
    seedSelectedTeam(rawCache)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({
      status: 'failed',
      items: [],
      failure: {
        kind: 'parse',
        message: 'Cached bookmark schema validation failed',
      },
      failureStage: 'bookmarks',
    })
    expect(result).not.toHaveProperty('syncedAt')
    expect(await storedTeamItemsAre(rawCache)).toBe(true)
    expect(chromeMockSpies.storageSet.mock.calls).toHaveLength(0)
    if (_name === 'accessor') {
      const getter = (rawCache as unknown as {
        getter: ReturnType<typeof vi.fn>
      }).getter
      expect(getter).not.toHaveBeenCalled()
    }
  })

  it('contains a revoked outer cache result before any fetch or member read', async () => {
    seedSelectedTeam([{ type: 'link', label: 7 }])
    const originalGet = chromeMockSpies.storageGet.getMockImplementation()!
    const outer = Proxy.revocable({
      dh_team: 'team-a',
      dh_team_items: CACHED_ITEMS,
      dh_team_manifest_url: SECRET_URL,
      dh_team_etag: 'bookmark-old',
      dh_team_manifest_etag: 'manifest-old',
    }, {})
    outer.revoke()
    chromeMockSpies.storageGet.mockImplementationOnce((_keys, callback) => {
      queueMicrotask(() => (callback as (value: unknown) => void)(outer.proxy))
      return undefined
    })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    try {
      await expect(syncTeamBookmarks(SECRET_URL, 'team-a')).resolves.toMatchObject({
        status: 'failed',
        items: [],
        failure: { kind: 'parse' },
      })
      expect(fetch).not.toHaveBeenCalled()
      expect(chromeMockSpies.storageSet.mock.calls).toHaveLength(0)
    } finally {
      chromeMockSpies.storageGet.mockImplementation(originalGet)
    }
  })

  it.each([
    ['manifest', [response(403)]],
    ['bookmarks', [response(304), response(403)]],
  ])('keeps %s network failure primary but never returns malformed cache', async (
    _name,
    responses,
  ) => {
    seedSelectedTeam([{ type: 'link', label: 7 }])
    const fetch = vi.fn()
    responses.forEach(value => fetch.mockResolvedValueOnce(value))
    vi.stubGlobal('fetch', fetch)

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({
      status: 'failed',
      items: [],
      failure: { kind: 'auth', httpStatus: 403 },
    })
  })

  it('reparses changed downloaded items before persisting and returning them', async () => {
    const downloaded = [{
      type: 'link',
      label: 'Changed',
      source: 'personal',
      future: { nested: ['preserved'] },
    }]
    seedSelectedTeam()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(200, { items: downloaded }, 'bookmark-new')))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toMatchObject({
      status: 'committed',
      items: [{
        ...downloaded[0],
        source: 'team',
      }],
    })
    expect(result.items).not.toBe(downloaded)
    expect(getStorageSnapshot().dh_team_items).toEqual(result.items)
    expect(chromeMockSpies.storageSet.mock.calls.some(call =>
      Object.hasOwn(call[0] as object, 'dh_team_items'))).toBe(true)
  })

  it.each([
    ['malformed items', {
      ok: true,
      changed: true,
      items: [{ type: 'link', label: 7 }],
      etag: 'forged',
    }],
    ['accessor items', (() => {
      const getter = vi.fn(() => [{ type: 'link', label: 'MUST NOT RUN' }])
      const value: Record<string, unknown> = {
        ok: true,
        changed: true,
        etag: 'forged',
      }
      Object.defineProperty(value, 'items', { enumerable: true, get: getter })
      return Object.assign(value, { getter })
    })()],
    ['revoked items', (() => {
      const items = Proxy.revocable([
        ...CHANGED_ITEMS,
      ], {})
      const value = {
        ok: true,
        changed: true,
        items: items.proxy,
        etag: 'forged',
      }
      items.revoke()
      return value
    })()],
  ])('rejects a typed-cast fetchTeamBookmarks seam with %s', async (_name, forged) => {
    seedSelectedTeam()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(304)))
    const generation = beginTeamSyncGeneration()
    const fetchBookmarks = vi.fn().mockResolvedValue(forged)
    const syncWithSeam = syncTeamBookmarks as unknown as (
      identity: { enabled: boolean; manifestUrl: string; teamId: string },
      generation: number,
      captured: undefined,
      seam: typeof fetchTeamBookmarks,
    ) => ReturnType<typeof syncTeamBookmarks>

    const result = await syncWithSeam({
      enabled: true,
      manifestUrl: SECRET_URL,
      teamId: 'team-a',
    }, generation, undefined, fetchBookmarks as typeof fetchTeamBookmarks)

    expect(result).toMatchObject({
      status: 'failed',
      items: [],
      failure: {
        kind: 'parse',
        message: 'Cached bookmark schema validation failed',
      },
      failureStage: 'bookmarks',
    })
    expect(result).not.toHaveProperty('syncedAt')
    expect(chromeMockSpies.storageSet.mock.calls.some(call => {
      const value = call[0] as Record<string, unknown>
      return Object.hasOwn(value, 'dh_team_items')
        || Object.hasOwn(value, 'dh_team_etag')
        || Object.hasOwn(value, 'dh_team_synced')
    })).toBe(false)
    const getter = (forged as { getter?: ReturnType<typeof vi.fn> }).getter
    if (getter) expect(getter).not.toHaveBeenCalled()
  })

  it('rejects cached manifest, ETag, and items stamped for another URL', async () => {
    seedSelectedTeam()
    seedStorage({ dh_team_manifest_url: `${SECRET_URL}-old` })
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(403))
    vi.stubGlobal('fetch', fetch)

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(fetch).toHaveBeenCalledWith(
      SECRET_URL,
      expect.objectContaining({ headers: {} }),
    )
    expect(result).toMatchObject({ status: 'failed', items: [] })
  })

  it('does not resurrect a changed manifest when Reset queues behind its deferred write', async () => {
    seedSelectedTeam()
    const manifestWrite = deferNextStorageSet('dh_team_manifest')
    let resolveBookmarks!: (value: unknown) => void
    const bookmarksResponse = new Promise(resolve => { resolveBookmarks = resolve })
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(200, {
        version: 1,
        teams: [{ id: 'team-a', label: 'Team A', url: BOOKMARK_URL }],
      }, 'manifest-new'))
      .mockImplementationOnce(() => bookmarksResponse))

    const sync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => value?.dh_team_manifest_etag === 'manifest-new',
      ),
    ).toBe(true))
    seedStorage({ dh_prefs: { teamCatalogEnabled: false, teamManifestUrl: '', team: '' } })
    const reset = clearTeamBookmarks()
    await manifestWrite.resolve(undefined)
    resolveBookmarks(response(200, { items: CHANGED_ITEMS }, 'bookmark-new'))
    await Promise.all([sync, reset])

    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest_etag')
  })

  it('serializes a deferred manifest-only set before a queued reset clear', async () => {
    seedSelectedTeam()
    const generation = beginTeamSyncGeneration()
    const manifestWrite = deferNextStorageSet('dh_team_manifest')
    const identity = {
      enabled: true,
      manifestUrl: SECRET_URL,
      teamId: 'team-a',
    }
    const write = writeTeamManifestForUrl(
      identity,
      { version: 2, teams: [] },
      'manifest-new',
      generation,
    )
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => value?.dh_team_manifest?.version === 2,
      ),
    ).toBe(true))
    seedStorage({ dh_prefs: { teamCatalogEnabled: false, teamManifestUrl: '', team: '' } })
    const reset = clearTeamBookmarks()
    await manifestWrite.resolve(undefined)
    await Promise.all([write, reset])

    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_manifest_etag')
  })

  it('marks a manifest pre-read stale when preferences change before it resolves', async () => {
    seedSelectedTeam()
    const generation = beginTeamSyncGeneration()
    const delayedRead = deferNextStorageGet('dh_team_manifest_etag')
    const identity = {
      enabled: true,
      manifestUrl: SECRET_URL,
      teamId: 'team-a',
    }
    const read = readTeamManifestState(identity, generation)
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: SECRET_URL,
        team: 'team-b',
      },
    })
    await delayedRead.resolve(undefined)

    await expect(read).resolves.toEqual({ current: false, etag: undefined })
  })

  it('does not resurrect changed bookmarks when a team switch queues behind the deferred write', async () => {
    seedSelectedTeam()
    const bookmarkWrite = deferNextStorageSet('dh_team_items')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(200, { items: CHANGED_ITEMS }, 'bookmark-new')))

    const sync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => Array.isArray(value?.dh_team_items),
      ),
    ).toBe(true))
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: SECRET_URL,
        team: 'team-b',
      },
    })
    const switched = clearTeamSelection()
    await bookmarkWrite.resolve(undefined)
    await Promise.all([sync, switched])

    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_items')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_etag')
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_synced')
  })

  it('does not resurrect a 304 timestamp when a URL switch queues behind the deferred write', async () => {
    seedSelectedTeam()
    const timestampWrite = deferNextStorageSet('dh_team_synced')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const sync = syncTeamBookmarks(SECRET_URL, 'team-a')
    await vi.waitFor(() => expect(
      (chrome.storage.local.set as any).mock.calls.some(
        ([value]: any[]) => typeof value?.dh_team_synced === 'string',
      ),
    ).toBe(true))
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: `${SECRET_URL}-new`,
        team: 'team-a',
      },
    })
    const switched = clearTeamBookmarks()
    await timestampWrite.resolve(undefined)
    await Promise.all([sync, switched])

    expect(getStorageSnapshot()).not.toHaveProperty('dh_team_synced')
  })
})
