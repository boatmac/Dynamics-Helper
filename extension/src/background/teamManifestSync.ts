import type {
    ManifestFetchResult,
    TeamManifest,
} from '../utils/teamCatalog'

interface TeamCatalogPrefs {
    teamCatalogEnabled?: boolean
    teamManifestUrl?: string
}

interface ManifestInitialState {
    prefs: TeamCatalogPrefs
    etag?: string
}

export interface ManifestOnlyDeps {
    readInitialState: () => Promise<ManifestInitialState>
    readCurrentPrefs: () => Promise<TeamCatalogPrefs>
    fetchManifest: (
        url: string,
        currentEtag?: string,
    ) => Promise<ManifestFetchResult | null>
    writeManifest: (manifest: TeamManifest, etag: string) => Promise<void>
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

    const currentPrefs = await deps.readCurrentPrefs()
    if (
        currentPrefs.teamCatalogEnabled !== true
        || currentPrefs.teamManifestUrl !== manifestUrl
    ) {
        return {
            status: 'success',
            data: { manifestOnly: true, changed: false, skipped: true },
        }
    }

    if (result.changed) {
        await deps.writeManifest(result.manifest, result.etag)
    }
    return {
        status: 'success',
        data: { manifestOnly: true, changed: result.changed },
    }
}
