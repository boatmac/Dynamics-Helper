import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchManifest,
  fetchTeamBookmarks,
  syncTeamBookmarks,
} from './teamCatalog'
import {
  getStorageSnapshot,
  installChromeMock,
  resetChromeMock,
  seedStorage,
} from '../test/chromeMock'

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

  const BOOKMARK_URL = 'https://catalog.example/team-a.json?sig=BOOKMARK-SECRET'
  const CACHED_ITEMS = [{ type: 'link', label: 'Cached', source: 'team' }]
  const CHANGED_ITEMS = [{ type: 'link', label: 'Changed', url: 'https://safe.example' }]

  function response(status: number, body?: unknown, etag = '') {
    return {
      status,
      statusText: status === 304 ? 'Not Modified' : 'OK',
      ok: status >= 200 && status < 300,
      json: vi.fn().mockResolvedValue(body),
      headers: { get: vi.fn().mockReturnValue(etag) },
    }
  }

  function seedSelectedTeam() {
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: true,
        teamManifestUrl: SECRET_URL,
        team: 'team-a',
      },
      dh_team: 'team-a',
      dh_team_items: CACHED_ITEMS,
      dh_team_etag: 'bookmark-old',
      dh_team_synced: '2026-01-01T00:00:00.000Z',
      dh_team_manifest_etag: 'manifest-old',
      dh_team_manifest: {
        version: 1,
        teams: [{ id: 'team-a', label: 'Team A', url: BOOKMARK_URL }],
      },
    })
  }

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
    expect(result).toEqual({ status: 'stale', items: [] })
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

    await expect(sync).resolves.toEqual({ status: 'stale', items: [] })
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

  it('updates only the timestamp on a valid bookmark 304', async () => {
    seedSelectedTeam()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(304))
      .mockResolvedValueOnce(response(304)))

    const result = await syncTeamBookmarks(SECRET_URL, 'team-a')

    expect(result).toEqual({ status: 'unchanged', items: CACHED_ITEMS })
    expect(getStorageSnapshot()).toMatchObject({
      dh_team_items: CACHED_ITEMS,
      dh_team_etag: 'bookmark-old',
      dh_team_synced: expect.not.stringMatching(/^2026-01-01/),
    })
  })
})
