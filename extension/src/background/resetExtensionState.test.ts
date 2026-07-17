import { describe, expect, it, vi } from 'vitest'
import { handleResetExtensionState } from './resetExtensionState'

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
