import type { TeamSyncIdentity } from '../utils/teamCatalog'

export interface ResetExtensionStateRequest {
    identity: TeamSyncIdentity
    requestGeneration: number
    resetToken: number
}

export interface ResetExtensionStateDeps {
    beginGeneration: () => number
    identityIsCurrent: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<boolean>
    clearTeamState: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<boolean>
    clearAnalysisState: () => Promise<void>
}

function responseData(
    request: ResetExtensionStateRequest,
    syncStatus: 'committed' | 'stale' | 'failed',
) {
    return {
        syncStatus,
        identity: request.identity,
        requestGeneration: request.requestGeneration,
        resetToken: request.resetToken,
    }
}

function isDefaultIdentity(identity: TeamSyncIdentity | undefined): boolean {
    return identity?.enabled === false
        && identity.manifestUrl === ''
        && identity.teamId === ''
}

export async function handleResetExtensionState(
    request: ResetExtensionStateRequest,
    deps: ResetExtensionStateDeps,
): Promise<any> {
    const captured = Object.freeze({
        ...request,
        identity: Object.freeze({ ...request?.identity }),
    }) as ResetExtensionStateRequest

    if (
        !isDefaultIdentity(captured.identity)
        || !Number.isInteger(captured.requestGeneration)
        || !Number.isInteger(captured.resetToken)
    ) {
        return {
            status: 'error',
            error: 'Invalid extension reset request',
            data: responseData(captured, 'failed'),
        }
    }

    try {
        const generation = deps.beginGeneration()
        if (!await deps.identityIsCurrent(captured.identity, generation)) {
            return { status: 'success', data: responseData(captured, 'stale') }
        }
        if (!await deps.clearTeamState(captured.identity, generation)) {
            return { status: 'success', data: responseData(captured, 'stale') }
        }
        if (!await deps.identityIsCurrent(captured.identity, generation)) {
            return { status: 'success', data: responseData(captured, 'stale') }
        }
        await deps.clearAnalysisState()
        return { status: 'success', data: responseData(captured, 'committed') }
    } catch {
        return {
            status: 'error',
            error: 'Extension state reset failed',
            data: responseData(captured, 'failed'),
        }
    }
}
