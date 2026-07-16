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
})
