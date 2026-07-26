import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleResetExtensionState } from './resetExtensionState'
import {
  beginTeamSyncGeneration,
  clearTeamBookmarksAtGeneration,
  currentTeamIdentityMatches,
} from '../utils/teamCatalog'
import {
  deferNextStorageRemove,
  getStorageSnapshot,
  installChromeMock,
  resetChromeMock,
  seedStorage,
} from '../test/chromeMock'
import {
  pendingAnalysisKey,
  resetAnalysisState,
  seenAnalysisKey,
} from '../utils/analysisStore'

installChromeMock()

beforeEach(() => {
  resetChromeMock()
  installChromeMock()
})

const identity = {
  enabled: false,
  manifestUrl: '',
  teamId: '',
}

function deps(overrides: Record<string, unknown> = {}) {
  return {
    beginGeneration: vi.fn().mockReturnValue(11),
    identityIsCurrent: vi.fn().mockResolvedValue(true),
    clearTeamState: vi.fn().mockResolvedValue(true),
    clearAnalysisState: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('RESET_EXTENSION_STATE response truth', () => {
  it('clears the latest analysis owner during scoped Reset', async () => {
    const requestSeenKey = seenAnalysisKey({
      caseNumber: '1234567890123456',
      requestId: 'req-A',
    })
    seedStorage({
      keep_me: 'safe',
      dh_last_analysis: {
        caseNumber: '1234567890123456',
        requestId: 'req-A',
        status: 'success',
        title: 'Result',
        content: 'Body',
        timestamp: 1,
        seen: false,
      },
      dh_pending_analysis: {
        caseNumber: '1234567890123456',
        requestId: 'legacy',
        startTime: 1,
      },
      [pendingAnalysisKey('req-A')]: {
        caseNumber: '1234567890123456',
        requestId: 'req-A',
        startTime: 2,
      },
      dh_seen_analysis: {
        caseNumber: '1234567890123456',
        requestId: 'legacy-seen',
      },
      [requestSeenKey]: {
        caseNumber: '1234567890123456',
        requestId: 'req-A',
      },
      dh_latest_analysis_owner: {
        caseNumber: '1234567890123456',
        requestId: 'req-A',
        startTime: 2,
      },
    })

    await expect(handleResetExtensionState({
      identity,
      requestGeneration: 6,
      resetToken: 16,
    }, deps({ clearAnalysisState: resetAnalysisState }) as any)).resolves.toMatchObject({
      status: 'success',
      data: { syncStatus: 'committed' },
    })

    expect(getStorageSnapshot()).toEqual({ keep_me: 'safe' })
  })

  it('returns committed with the captured identity and token after both clears', async () => {
    const dependencies = deps()

    await expect(handleResetExtensionState({
      identity,
      requestGeneration: 7,
      resetToken: 17,
    }, dependencies as any)).resolves.toEqual({
      status: 'success',
      data: {
        syncStatus: 'committed',
        identity,
        requestGeneration: 7,
        resetToken: 17,
      },
    })
    expect(dependencies.clearTeamState).toHaveBeenCalledWith(identity, 11)
    expect(dependencies.clearAnalysisState).toHaveBeenCalledOnce()
    expect(dependencies.identityIsCurrent).toHaveBeenCalledTimes(2)
  })

  it('returns stale without clearing when default prefs no longer match', async () => {
    const dependencies = deps({
      identityIsCurrent: vi.fn().mockResolvedValue(false),
    })

    await expect(handleResetExtensionState({
      identity,
      requestGeneration: 8,
      resetToken: 18,
    }, dependencies as any)).resolves.toEqual({
      status: 'success',
      data: {
        syncStatus: 'stale',
        identity,
        requestGeneration: 8,
        resetToken: 18,
      },
    })
    expect(dependencies.clearTeamState).not.toHaveBeenCalled()
    expect(dependencies.clearAnalysisState).not.toHaveBeenCalled()
  })

  it('rechecks default prefs before analysis cleanup', async () => {
    const dependencies = deps({
      identityIsCurrent: vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    })

    await expect(handleResetExtensionState({
      identity,
      requestGeneration: 9,
      resetToken: 19,
    }, dependencies as any)).resolves.toMatchObject({
      status: 'success',
      data: { syncStatus: 'stale', requestGeneration: 9 },
    })
    expect(dependencies.clearTeamState).toHaveBeenCalledOnce()
    expect(dependencies.clearAnalysisState).not.toHaveBeenCalled()
  })

  it('returns failed with captured identity and token when cleanup throws', async () => {
    const dependencies = deps({
      clearTeamState: vi.fn().mockRejectedValue(new Error('storage failed')),
    })

    await expect(handleResetExtensionState({
      identity,
      requestGeneration: 10,
      resetToken: 20,
    }, dependencies as any)).resolves.toEqual({
      status: 'error',
      error: 'Extension state reset failed',
      data: {
        syncStatus: 'failed',
        identity,
        requestGeneration: 10,
        resetToken: 20,
      },
    })
    expect(dependencies.clearAnalysisState).not.toHaveBeenCalled()
  })

  it('returns failed on scoped remove lastError and a later queued Reset recovers', async () => {
    seedStorage({
      dh_prefs: {
        teamCatalogEnabled: false,
        teamManifestUrl: '',
        team: '',
      },
      dh_team: 'team-a',
      dh_team_items: [{ label: 'cached' }],
    })
    const remove = deferNextStorageRemove('dh_team')
    const clearAnalysisState = vi.fn().mockResolvedValue(undefined)
    const actualDeps = {
      beginGeneration: beginTeamSyncGeneration,
      identityIsCurrent: currentTeamIdentityMatches,
      clearTeamState: (
        expectedIdentity: typeof identity,
        generation: number,
      ) => clearTeamBookmarksAtGeneration(generation, expectedIdentity),
      clearAnalysisState,
    }
    const request = { identity, requestGeneration: 12, resetToken: 22 }

    const failedReset = handleResetExtensionState(request, actualDeps)
    await vi.waitFor(() => expect(
      (chrome.storage.local.remove as any).mock.calls.some(
        ([keys]: any[]) => keys.includes('dh_team'),
      ),
    ).toBe(true))
    await remove.reject(new Error('RESET REMOVE FAILED'))

    await expect(failedReset).resolves.toEqual({
      status: 'error',
      error: 'Extension state reset failed',
      data: {
        syncStatus: 'failed',
        identity,
        requestGeneration: 12,
        resetToken: 22,
      },
    })
    expect(clearAnalysisState).not.toHaveBeenCalled()
    expect(getStorageSnapshot()).toHaveProperty('dh_team', 'team-a')

    await expect(handleResetExtensionState(
      { ...request, requestGeneration: 13, resetToken: 23 },
      actualDeps,
    )).resolves.toMatchObject({
      status: 'success',
      data: { syncStatus: 'committed', requestGeneration: 13, resetToken: 23 },
    })
    expect(clearAnalysisState).toHaveBeenCalledOnce()
    expect(getStorageSnapshot()).not.toHaveProperty('dh_team')
  })

  it('rejects a request without a reset token before clearing state', async () => {
    const dependencies = deps()

    await expect(handleResetExtensionState({
      identity,
      requestGeneration: 11,
    } as any, dependencies as any)).resolves.toMatchObject({
      status: 'error',
      data: { syncStatus: 'failed' },
    })
    expect(dependencies.clearTeamState).not.toHaveBeenCalled()
    expect(dependencies.clearAnalysisState).not.toHaveBeenCalled()
    expect(dependencies.beginGeneration).not.toHaveBeenCalled()
  })
})
