import { describe, expect, it } from 'vitest'
import { teamCacheIsCurrent } from './MenuLogic'

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
