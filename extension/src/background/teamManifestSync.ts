import type {
    ManifestFetchResult,
    SyncResult,
    TeamManifest,
    TeamSyncIdentity,
} from '../utils/teamCatalog'

interface ManifestInitialState {
    etag?: string
    current?: boolean
}

export interface TeamCatalogSyncRequest {
    identity: TeamSyncIdentity
    requestGeneration: number
    manifestOnly?: boolean
    resetCache?: boolean
    storageGeneration?: number
}

export interface ManifestOnlyDeps {
    readInitialState: () => Promise<ManifestInitialState>
    identityIsCurrent: () => Promise<boolean>
    fetchManifest: (
        url: string,
        currentEtag?: string,
    ) => Promise<ManifestFetchResult | null>
    writeManifest: (
        manifest: TeamManifest,
        etag: string,
    ) => Promise<boolean | void>
}

function staleResponse(request: TeamCatalogSyncRequest): any {
    return {
        status: 'success',
        data: {
            manifestOnly: request.manifestOnly === true,
            changed: false,
            syncStatus: 'stale',
            identity: request.identity,
            requestGeneration: request.requestGeneration,
        },
    }
}

export async function syncManifestOnly(
    request: TeamCatalogSyncRequest,
    deps: ManifestOnlyDeps,
): Promise<any> {
    const manifestUrl = request.identity.manifestUrl
    if (!manifestUrl) {
        return { status: 'error', error: 'Manifest URL not configured' }
    }

    const initial = await deps.readInitialState()
    if (initial.current === false || !await deps.identityIsCurrent()) {
        return staleResponse(request)
    }

    const result = await deps.fetchManifest(manifestUrl, initial.etag)
    if (!await deps.identityIsCurrent()) return staleResponse(request)
    if (!result) {
        return { status: 'error', error: 'Manifest URL not configured' }
    }
    if (!result.ok) {
        return {
            status: 'error',
            error: result.failure.message,
            errorKind: result.failure.kind,
            httpStatus: result.failure.httpStatus,
            data: {
                manifestOnly: true,
                changed: false,
                syncStatus: 'failed',
                identity: request.identity,
                requestGeneration: request.requestGeneration,
            },
        }
    }

    if (result.changed) {
        const committed = await deps.writeManifest(result.manifest, result.etag)
        if (committed === false) return staleResponse(request)
    }
    return {
        status: 'success',
        data: {
            manifestOnly: true,
            changed: result.changed,
            syncStatus: result.changed ? 'committed' : 'unchanged',
            identity: request.identity,
            requestGeneration: request.requestGeneration,
        },
    }
}

export function toSelectedTeamSyncResponse(
    result: SyncResult,
    requestGeneration?: number,
): any {
    const data = {
        syncStatus: result.status,
        identity: result.identity,
        ...(requestGeneration === undefined ? {} : { requestGeneration }),
        ...(
            result.status === 'skipped' || result.status === 'stale'
                ? {}
                : { items: result.items }
        ),
        ...(result.syncedAt ? { syncedAt: result.syncedAt } : {}),
    }
    if (result.status === 'skipped' || result.status === 'stale') {
        return { status: 'success', data }
    }
    if (result.failure) {
        return {
            status: 'error',
            error: result.failure.message,
            errorKind: result.failure.kind,
            httpStatus: result.failure.httpStatus,
            failureStage: result.failureStage,
            data,
        }
    }
    return { status: 'success', data }
}

export interface TeamCatalogRequestDeps {
    beginGeneration: () => number
    identityIsCurrent: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<boolean>
    clearAll: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<boolean>
    clearSelection: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<boolean>
    clearSelectionIfChanged: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<boolean>
    syncManifest: (
        request: TeamCatalogSyncRequest,
        generation: number,
    ) => Promise<any>
    syncSelected: (
        identity: TeamSyncIdentity,
        generation: number,
    ) => Promise<SyncResult>
}

export function handleTeamCatalogSyncRequest(
    request: TeamCatalogSyncRequest,
    deps: TeamCatalogRequestDeps,
): Promise<any> {
    // Generation invalidation is deliberately outside the async body. Merely
    // accepting a later request must invalidate an older pre-read immediately.
    const generation = deps.beginGeneration()
    const captured = Object.freeze({
        ...request,
        identity: Object.freeze({ ...request.identity }),
        storageGeneration: generation,
    })

    return (async () => {
        if (!await deps.identityIsCurrent(captured.identity, generation)) {
            return staleResponse(captured)
        }

        if (captured.resetCache || captured.identity.enabled === false) {
            if (!await deps.clearAll(captured.identity, generation)) {
                return staleResponse(captured)
            }
            if (!captured.identity.manifestUrl || captured.identity.enabled === false) {
                return {
                    status: 'success',
                    data: {
                        manifestOnly: captured.manifestOnly === true,
                        changed: false,
                        syncStatus: 'skipped',
                        identity: captured.identity,
                        requestGeneration: captured.requestGeneration,
                    },
                }
            }
        }

        if (captured.manifestOnly) {
            return deps.syncManifest(captured, generation)
        }

        if (!captured.identity.teamId) {
            if (!await deps.clearSelection(captured.identity, generation)) {
                return staleResponse(captured)
            }
            return {
                status: 'success',
                data: {
                    syncStatus: 'skipped',
                    identity: captured.identity,
                    requestGeneration: captured.requestGeneration,
                },
            }
        }

        if (!await deps.clearSelectionIfChanged(captured.identity, generation)) {
            return staleResponse(captured)
        }
        const result = await deps.syncSelected(captured.identity, generation)
        return toSelectedTeamSyncResponse(result, captured.requestGeneration)
    })()
}

export function shouldClearSelectedTeamCache(
    cachedTeamId: string | undefined,
    requestedTeamId: string,
): boolean {
    return Boolean(cachedTeamId && cachedTeamId !== requestedTeamId)
}

export function shouldReportTeamSyncFailure(
    result: SyncResult,
    prefs: {
        teamCatalogEnabled?: boolean
        teamManifestUrl?: string
        team?: string
    },
): boolean {
    return result.status === 'failed'
        && Boolean(result.failure)
        && prefs.teamCatalogEnabled === result.identity.enabled
        && prefs.teamManifestUrl === result.identity.manifestUrl
        && prefs.team === result.identity.teamId
}
