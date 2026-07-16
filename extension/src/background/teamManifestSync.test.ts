import { describe, expect, it, vi } from 'vitest'
import { syncManifestOnly } from './teamManifestSync'
import { toSelectedTeamSyncResponse } from './teamManifestSync'

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
      data: { manifestOnly: true, changed: false, skipped: true },
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
      data: { manifestOnly: true, changed: true },
    })
    expect(writeManifest).toHaveBeenCalledWith(MANIFEST, 'new-etag')
  })
})

describe('selected-team sync response boundary', () => {
  it('does not expose stale items to Service Worker callers', () => {
    expect(toSelectedTeamSyncResponse(
      { status: 'stale', items: [{ label: 'STALE ITEM' }] },
      'team-a',
    )).toEqual({
      status: 'success',
      data: { skipped: true, stale: true, teamId: 'team-a' },
    })
  })

  it('preserves valid committed items', () => {
    const items = [{ label: 'Current item' }]
    expect(toSelectedTeamSyncResponse(
      { status: 'committed', items },
      'team-a',
    )).toEqual({
      status: 'success',
      data: { items, teamId: 'team-a' },
    })
  })
})
