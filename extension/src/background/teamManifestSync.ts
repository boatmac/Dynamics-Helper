import type {
    ManifestFetchResult,
    SyncResult,
    TeamManifest,
} from '../utils/teamCatalog'

interface TeamCatalogPrefs {
    teamCatalogEnabled?: boolean
    teamManifestUrl?: string
}

interface ManifestInitialState {
    prefs: TeamCatalogPrefs
    etag?: string
    generation?: number
}

export interface ManifestOnlyDeps {
    readInitialState: () => Promise<ManifestInitialState>
    readCurrentPrefs: () => Promise<TeamCatalogPrefs>
    fetchManifest: (
        url: string,
        currentEtag?: string,
    ) => Promise<ManifestFetchResult | null>
    writeManifest: (
        manifest: TeamManifest,
        etag: string,
        manifestUrl: string,
        generation?: number,
    ) => Promise<boolean | void>
}

export async function syncManifestOnly(deps: ManifestOnlyDeps): Promise<any> {
    const initial = await deps.readInitialState()
    const manifestUrl = initial.prefs.teamManifestUrl || ''
    if (!manifestUrl) {
        return { status: 'error', error: 'Manifest URL not configured' }
    }
    if (!initial.prefs.teamCatalogEnabled) {
        return {
            status: 'success',
            data: { manifestOnly: true, changed: false, skipped: true },
        }
    }

    const result = await deps.fetchManifest(manifestUrl, initial.etag)
    const currentPrefs = await deps.readCurrentPrefs()
    if (
        currentPrefs.teamCatalogEnabled !== true
        || currentPrefs.teamManifestUrl !== manifestUrl
    ) {
        return {
            status: 'success',
            data: { manifestOnly: true, changed: false, syncStatus: 'stale' },
        }
    }
    if (!result) {
        return { status: 'error', error: 'Manifest URL not configured' }
    }
    if (!result.ok) {
        return {
            status: 'error',
            error: result.failure.message,
            errorKind: result.failure.kind,
            httpStatus: result.failure.httpStatus,
        }
    }

    if (result.changed) {
        const committed = await deps.writeManifest(
            result.manifest,
            result.etag,
            manifestUrl,
            initial.generation,
        )
        if (committed === false) {
            return {
                status: 'success',
                data: { manifestOnly: true, changed: false, syncStatus: 'stale' },
            }
        }
    }
    return {
        status: 'success',
        data: {
            manifestOnly: true,
            changed: result.changed,
            syncStatus: result.changed ? 'committed' : 'unchanged',
        },
    }
}

export function toSelectedTeamSyncResponse(
    result: SyncResult,
): any {
    const data = {
        syncStatus: result.status,
        identity: result.identity,
        ...(
            result.status === 'skipped' || result.status === 'stale'
                ? {}
                : { items: result.items }
        ),
        ...(result.syncedAt ? { syncedAt: result.syncedAt } : {}),
    }
    if (result.status === 'skipped' || result.status === 'stale') {
        return {
            status: 'success',
            data,
        }
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

export function shouldClearSelectedTeamCache(
    cachedTeamId: string | undefined,
    requestedTeamId: string,
): boolean {
    return Boolean(cachedTeamId && cachedTeamId !== requestedTeamId)
}

export function shouldReportTeamSyncFailure(
    result: SyncResult,
    prefs: TeamCatalogPrefs & { team?: string },
): boolean {
    return result.status === 'failed'
        && Boolean(result.failure)
        && prefs.teamCatalogEnabled === result.identity.enabled
        && prefs.teamManifestUrl === result.identity.manifestUrl
        && prefs.team === result.identity.teamId
}
