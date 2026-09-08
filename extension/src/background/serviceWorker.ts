// Background Service Worker
// Handles communication with the Native Host and Telemetry

import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { TELEMETRY_CONNECTION_STRING } from '../utils/constants';
import { getExtensionVersion } from '../utils/version';
import { setupContextMenu } from './contextMenu';
// teamCatalog is imported statically: dynamic import() is disallowed in
// ServiceWorkerGlobalScope per the HTML spec
// (https://github.com/w3c/ServiceWorker/issues/1356).
import {
    beginTeamSyncGeneration,
    clearTeamBookmarksAtGeneration,
    clearTeamSelectionAtGeneration,
    clearTeamSelectionIfChanged,
    currentTeamIdentityMatches,
    fetchManifest,
    readTeamManifestState,
    syncTeamBookmarks,
    writeTeamManifestForUrl,
} from '../utils/teamCatalog';
import {
    handleTeamCatalogSyncRequest,
    shouldReportTeamSyncFailure,
    syncManifestOnly,
    type TeamCatalogSyncRequest,
} from './teamManifestSync';
import {
    isAnalyzePayload,
    normalizeNativeHostResponse,
    summarizeNativeHostMessage,
    type AnalyzeForwardResponse,
} from './analyzeBridge';
import { resetAnalysisState } from '../utils/analysisStore';
import {
    guardNonAnalyzeNativeMessage,
    handleAnalyzeRequest,
} from './analyzeRequestHandler';
import { postNativeMessageWire } from './nativeMessageWire';
import {
    handleResetExtensionState,
    type ResetExtensionStateRequest,
} from './resetExtensionState';
import { ownDataProperty } from '../utils/ownData';
import {
    handleNativeUpdateError,
    type NativeUpdateErrorDeliveryDeps,
} from '../utils/nativeUpdateError';
import {
    createStatusPortSender,
    createUpdateRuntime,
    parseUpdateCandidate,
    type NativePendingRequest,
    type UpdateState,
    type VerifiedUpdateProduct,
} from './updateRuntime';

const NATIVE_HOST_NAME = "com.dynamics.helper.native";
function createTransactionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
}
const UPDATE_WORKER_VERSION_KEY = 'dh_update_worker_version';
const UPDATE_WORKER_INSTANCE_KEY = 'dh_update_worker_instance';
const updateWorkerInstanceId = createTransactionId();
const UPDATE_ACTIONS = new Set([
    'perform_update',
    'activate_update',
    'finalize_update_status',
    'acknowledge_update_finalization',
]);
const UPDATE_UNAVAILABLE_RESPONSE = Object.freeze({
    status: 'error' as const,
    error_code: 'update_temporarily_unavailable',
    error: 'Dynamics Helper is temporarily unavailable while an update is in progress.',
});

const productionUpdateErrorDeps: NativeUpdateErrorDeliveryDeps = {
    sendRuntime: event => chrome.runtime.sendMessage(event),
    queryActiveTabs: () => chrome.tabs.query({
        active: true,
        currentWindow: true,
    }),
    sendTab: (tabId, event) => chrome.tabs.sendMessage(tabId, event),
};

// Initialize Context Menu
setupContextMenu();

// --- Telemetry Setup ---
const CONNECTION_STRING = TELEMETRY_CONNECTION_STRING;

let appInsights: ApplicationInsights | null = null;
let stableUserId: string | null = null;

// Initialize telemetry async so userId is ready before any events fire.
async function initTelemetry(): Promise<void> {
    try {
        // 1. Resolve stable anonymous user ID FIRST (before loading SDK).
        // Service workers lack cookies/localStorage, so the App Insights SDK
        // cannot persist a user_Id on its own. We use chrome.storage.local.
        const data = await chrome.storage.local.get("telemetryUserId");
        stableUserId = (data.telemetryUserId as string) || null;
        if (!stableUserId) {
            stableUserId = crypto.randomUUID();
            await chrome.storage.local.set({ telemetryUserId: stableUserId });
        }

        // 2. Create and load App Insights.
        appInsights = new ApplicationInsights({
            config: {
                connectionString: CONNECTION_STRING,
                disableAjaxTracking: true,
                disableFetchTracking: true,
                disableExceptionTracking: true,
            }
        });
        appInsights.loadAppInsights();

        // 3. Set user context so SDK populates user_Id in the schema.
        // In a service worker the Properties plugin can fail to initialize the
        // `user` sub-context (it relies on `document`/cookies which SWs lack),
        // leaving `appInsights.context` or `appInsights.context.user` as
        // `undefined`. A direct property assignment in that state throws
        // "Cannot set properties of undefined (setting 'id')" and aborts the
        // whole init (no telemetryInitializer is registered, so even the
        // custom-dimension fallback below never fires). Guard the assignment
        // and rely on the `item.data.userId` stamping in step 4 as the source
        // of truth — the App Insights backend reads the userId from custom
        // dimensions when the schema field is absent.
        if (appInsights.context && appInsights.context.user) {
            appInsights.context.user.id = stableUserId;
            appInsights.context.user.authenticatedId = stableUserId;
        } else {
            console.warn("[DH-SW] App Insights user context unavailable in SW; relying on telemetryInitializer for userId.");
        }

        // 4. Stamp every telemetry item with extensionVersion AND userId
        // as custom dimensions (backup - guarantees they appear even if
        // the SDK drops the context fields).
        const extVersion = getExtensionVersion();
        appInsights.addTelemetryInitializer((item) => {
            item.data = item.data || {};
            item.data.extensionVersion = extVersion;
            item.data.userId = stableUserId;
        });

        console.log("[DH-SW] Telemetry initialized, userId:", stableUserId);
    } catch (e) {
        console.warn("[DH-SW] Failed to initialize Telemetry in Background:", e);
    }
}

// Fire-and-forget but trackBackgroundEvent will queue until ready.
const telemetryReady = initTelemetry();

async function trackBackgroundEvent(name: string, properties: any = {}) {
    await telemetryReady;
    if (appInsights) {
        try {
            console.log(`[DH-SW] Received and tracking event: ${name}`);
            properties.extensionVersion = properties.extensionVersion || getExtensionVersion();
            appInsights.trackEvent({ name }, properties);
        } catch (e) {
            console.error("[DH-SW] Track Event Failed:", e);
        }
    }
}

async function trackBackgroundException(error: any, severityLevel?: number) {
    await telemetryReady;
    if (appInsights) {
        try {
            appInsights.trackException({ error, severityLevel });
        } catch (e) {
            console.error("[DH-SW] Track Exception Failed:", e);
        }
    }
}
// -----------------------

// --- Native Messaging (Persistent Port) ---
let nativePort: chrome.runtime.Port | null = null;
const pendingRequests = new Map<string, {
    resolve: (val: unknown) => void
    reject: (err: unknown) => void
    port: chrome.runtime.Port
}>();

function connectToNativeHost() {
    try {
        console.log("[DH-SW] Connecting to Native Host...");
        const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
        nativePort = port;
        
        port.onMessage.addListener((msg) => {
            const requestId = ownDataProperty(msg, 'requestId')
            const status = ownDataProperty(msg, 'status')
            if (
                requestId.kind === 'value'
                && typeof requestId.value === 'string'
                && pendingRequests.get(requestId.value)?.port === port
            ) {
                if (status.kind === 'value' && status.value === 'progress') {
                    const progress = exactOwnObject(msg, ['requestId', 'status', 'data'])
                    if (
                        progress
                        && progress.requestId === requestId.value
                        && progress.status === 'progress'
                        && typeof progress.data === 'string'
                        && progress.data.length > 0
                    ) {
                        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                            if (tabs[0]?.id) {
                                void chrome.tabs.sendMessage(tabs[0].id, {
                                    type: 'NATIVE_PROGRESS',
                                    requestId: requestId.value,
                                    payload: progress.data,
                                }).catch(() => undefined)
                            }
                        })
                    } else {
                        const pending = pendingRequests.get(requestId.value)!
                        pendingRequests.delete(requestId.value)
                        pending.reject(new Error('Invalid Native Host response'))
                    }
                    return
                }
                if (status.kind === 'value' && (status.value === 'success' || status.value === 'error')) {
                    const pending = pendingRequests.get(requestId.value)!
                    pendingRequests.delete(requestId.value)
                    pending.resolve(msg)
                } else {
                    const pending = pendingRequests.get(requestId.value)!
                    pendingRequests.delete(requestId.value)
                    pending.reject(new Error('Invalid Native Host response'))
                }
                return
            }
            if (requestId.kind !== 'absent') return
            const action = ownDataProperty(msg, 'action')
            if (action.kind === 'value' && action.value === 'update_error') {
                void handleNativeUpdateError({}, productionUpdateErrorDeps)
                return
            }

            console.log("[DH-SW] Received message from host:", summarizeNativeHostMessage(msg));

            // Handle Update Available
            if (action.kind === 'value' && action.value === "update_available") {
                const payload = ownDataProperty(msg, 'payload')
                void acceptNativeUpdateCandidate(payload.kind === 'value' ? payload.value : undefined)
                    .catch(() => handleNativeUpdateError({}, productionUpdateErrorDeps))
                return;
            }

            // Handle Update Not Available
            if (action.kind === 'value' && action.value === "update_not_available") {
                console.log("[DH-SW] Update Not Available (User is up to date)");
                void updateRuntimeReady.then(() => updateRuntime.clearAvailable()).then(state => {
                    if (state.kind !== 'idle' && state.kind !== 'complete') {
                        return handleNativeUpdateError({}, productionUpdateErrorDeps)
                    }
                    void chrome.runtime.sendMessage({
                        type: 'DH_UPDATE_CHECK_RESULT', outcome: 'not-available',
                    }).catch(() => undefined)
                }).catch(() => handleNativeUpdateError({}, productionUpdateErrorDeps))
                return;
            }
        });

        port.onDisconnect.addListener(() => {
            console.log("[DH-SW] Native Host Disconnected:", chrome.runtime.lastError?.message);
            if (nativePort === port) nativePort = null;
            for (const [requestId, pending] of pendingRequests) {
                if (pending.port !== port) continue
                pendingRequests.delete(requestId)
                pending.reject(new Error("Native Host disconnected unexpectedly"));
            }
        });

    } catch (e) {
        console.error("[DH-SW] Failed to connect to Native Host:", e);
    }
}

// Raw correlated lease for strict action-specific parsers.
export function requestNativeMessage(
    forwarded: Readonly<Record<string, unknown>>,
): NativePendingRequest {
    if (!nativePort) connectToNativeHost()
    const port = nativePort
    if (!port) throw new Error('Could not establish connection to Native Host')
    let resolve!: (value: unknown) => void
    let reject!: (reason?: unknown) => void
    const response = new Promise<unknown>((res, rej) => {
        resolve = res
        reject = rej
    })
    let requestId = ''
    let active = true
    let postAttempted = false
    try {
        requestId = postNativeMessageWire(forwarded, {
            createRequestId: () => crypto.randomUUID(),
            register: id => {
                if (pendingRequests.has(id)) {
                    throw new Error('Duplicate Native Host request ID')
                }
                requestId = id
                pendingRequests.set(id, { resolve, reject, port })
            },
            unregister: id => {
                pendingRequests.delete(id)
            },
            postMessage: message => {
                postAttempted = true
                port.postMessage(message)
            },
        })
    } catch (error) {
        active = false
        if (postAttempted) nativePort = null
        throw error
    }
    return Object.freeze({
        requestId,
        response,
        cancel: () => {
            if (!active || !pendingRequests.has(requestId)) return
            active = false
            pendingRequests.delete(requestId)
            reject(new Error('Native Host request cancelled'))
        },
    })
}

// Compatibility adapter for existing Analyze/config callers.
function sendNativeMessage(
    forwarded: Readonly<Record<string, unknown>>,
): Promise<unknown> {
    return requestNativeMessage(forwarded).response.then(normalizeNativeHostResponse)
}
// ------------------------------------------

function exactOwnObject(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
        const descriptors = Object.getOwnPropertyDescriptors(value)
        if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) return null
        if (Object.keys(descriptors).length !== keys.length) return null
        const result: Record<string, unknown> = {}
        for (const key of keys) {
            const descriptor = descriptors[key]
            if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null
            result[key] = descriptor.value
        }
        return result
    } catch {
        return null
    }
}

async function rawMainData(action: string): Promise<unknown> {
    const pending = requestNativeMessage(Object.freeze({ action }))
    const raw = await pending.response
    const envelope = exactOwnObject(raw, ['requestId', 'status', 'data'])
    return envelope?.requestId === pending.requestId && envelope.status === 'success'
        ? envelope.data
        : null
}

async function getVerifiedProduct(): Promise<VerifiedUpdateProduct | null> {
    const expected = getExtensionVersion()
    const capabilities = exactOwnObject(
        await rawMainData('get_capabilities'),
        ['host_version', 'capabilities'],
    )
    if (
        !capabilities
        || capabilities.host_version !== expected
        || !Array.isArray(capabilities.capabilities)
        || capabilities.capabilities.some(value => typeof value !== 'string')
        || !capabilities.capabilities.includes('transactional-update-v1')
    ) return null
    const rawVerification = await rawMainData('verify_installation')
    const development = exactOwnObject(
        rawVerification,
        ['mode', 'integrity', 'host_version'],
    )
    if (
        development?.mode === 'development'
        && development.integrity === 'development'
        && development.host_version === expected
    ) return Object.freeze({ version: expected, mode: 'development' })
    const verification = exactOwnObject(
        rawVerification,
        ['mode', 'integrity', 'host_version', 'extension_version'],
    )
    if (
        !verification
        || verification.mode !== 'packaged'
        || verification.integrity !== 'verified'
        || verification.host_version !== expected
        || verification.extension_version !== expected
    ) return null
    return Object.freeze({ version: expected, mode: 'packaged' })
}

async function broadcastUpdateState(state: UpdateState): Promise<void> {
    const event = Object.freeze({ type: 'DH_UPDATE_STATE', state })
    void chrome.runtime.sendMessage(event).catch(() => undefined)
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
        if (tab.id !== undefined) {
            void chrome.tabs.sendMessage(tab.id, event).catch(() => undefined)
        }
    }
}

const statusSender = createStatusPortSender()
export const updateRuntime = createUpdateRuntime({
    requestMain: requestNativeMessage,
    requestStatus: statusSender,
    createTransactionId,
    now: () => Date.now(),
    sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
    kickRecovery: async () => {
        const pending = requestNativeMessage(Object.freeze({ action: 'ping' }))
        try {
            await pending.response
        } catch {
            // A connect/disconnect is sufficient to trigger frozen startup recovery.
        }
    },
    broadcast: broadcastUpdateState,
    requestFreshCheck: async () => {
        const pending = requestNativeMessage(Object.freeze({ action: 'check_updates' }))
        await pending.response
    },
    freshWorkerVersion: getExtensionVersion(),
    workerInstanceId: updateWorkerInstanceId,
    getVerifiedProduct,
    verifyInstalled: async (transaction, outcome) => {
        const expected = outcome === 'committed'
            ? transaction.targetVersion
            : transaction.priorVersion
        const installed = await getVerifiedProduct()
        return installed?.mode === 'packaged' && installed.version === expected
    },
})
updateRuntime.registerAlarmListener()
async function initializeUpdateRuntime(): Promise<UpdateState> {
    const stored = await chrome.storage.local.get([
        UPDATE_WORKER_VERSION_KEY,
        UPDATE_WORKER_INSTANCE_KEY,
    ])
    const version = ownDataProperty(stored, UPDATE_WORKER_VERSION_KEY)
    const instance = ownDataProperty(stored, UPDATE_WORKER_INSTANCE_KEY)
    const priorWorkerVersion = version.kind === 'value'
        && typeof version.value === 'string'
        ? version.value
        : null
    const priorWorkerInstance = instance.kind === 'value'
        && typeof instance.value === 'string'
        ? instance.value
        : null
    await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set(
            {
                [UPDATE_WORKER_VERSION_KEY]: getExtensionVersion(),
                [UPDATE_WORKER_INSTANCE_KEY]: updateWorkerInstanceId,
            },
            () => chrome.runtime.lastError
                ? reject(new Error('Update worker version write failed.'))
                : resolve(),
        )
    })
    return updateRuntime.initialize({
        resume: false,
        priorWorkerVersion,
        priorWorkerInstance,
    })
}
export const updateRuntimeReady = initializeUpdateRuntime()
void updateRuntimeReady
    .then(() => {
        const state = updateRuntime.getState()
        return state.kind === 'activating' && state.errorCode !== undefined
            ? undefined
            : updateRuntime.resume()
    })
    .catch(() => undefined)

async function requestUpdateCheck(): Promise<void> {
    await updateRuntimeReady
    const lease = await updateRuntime.beginOrdinaryMainHostRequest(
        () => requestNativeMessage(Object.freeze({ action: 'check_updates' })).response,
    )
    if (lease.allowed) await lease.response
}

async function acceptNativeUpdateCandidate(value: unknown): Promise<void> {
    const raw = exactOwnObject(value, ['version', 'url', 'is_prerelease'])
    if (!raw || typeof raw.is_prerelease !== 'boolean') throw new Error('Invalid update candidate')
    const candidate = parseUpdateCandidate({
        version: raw.version,
        url: raw.url,
        isPrerelease: raw.is_prerelease,
    })
    if (!candidate) throw new Error('Invalid update candidate')
    await updateRuntimeReady
    const state = await updateRuntime.acceptCandidate(candidate)
    if ((state.kind !== 'available' && !(state.kind === 'complete' && state.outcome === 'rolled-back'))
        || state.update.version !== candidate.version
        || state.update.url !== candidate.url
        || state.update.isPrerelease !== candidate.isPrerelease) {
        throw new Error('Update candidate not accepted')
    }
    // Discovery has no request ID; this is a shared result, not a correlated reply.
    void chrome.runtime.sendMessage({
        type: 'DH_UPDATE_CHECK_RESULT',
        outcome: state.kind === 'available' ? 'available' : 'finished',
    }).catch(() => undefined)
}

function reservedUpdateAction(value: unknown): boolean {
    const action = ownDataProperty(value, 'action')
    return action.kind === 'value'
        && typeof action.value === 'string'
        && UPDATE_ACTIONS.has(action.value)
}

export { createTransactionId }

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let messageType: string
    try {
        if (typeof message !== 'object' || message === null || Array.isArray(message)) return false
        const type = Object.getOwnPropertyDescriptor(message, 'type')
        if (!type) return false
        if (!Object.hasOwn(type, 'value') || typeof type.value !== 'string') {
            sendResponse({ handled: false })
            return false
        }
        messageType = type.value
    } catch {
        return false
    }
    const payload = ownDataProperty(message, 'payload')
    const messagePayload = payload.kind === 'value' ? payload.value : undefined
    if (
        messageType === 'DH_UPDATE_START'
        || messageType === 'DH_UPDATE_GET_STATE'
        || messageType === 'DH_UPDATE_ACK_COMPLETE'
    ) {
        updateRuntimeReady
            .then(() => updateRuntime.handleMessage(message))
            .then(sendResponse)
            .catch(() => sendResponse({ handled: false }))
        return true
    }
    if (messageType === "NATIVE_MSG") {
        const inner = messagePayload ?? {}
        let request: Promise<AnalyzeForwardResponse | unknown>
        if (reservedUpdateAction(inner)) {
            request = Promise.resolve({
                status: 'error',
                error: 'Invalid Extension Native message metadata.',
                error_code: 'invalid_native_message_metadata',
            })
        } else if (isAnalyzePayload(inner)) {
            request = handleAnalyzeRequest(inner, {
                acquireAuthorizedTransport: async () => {
                    await updateRuntimeReady
                    const allowed = await updateRuntime.ordinaryMainHostAllowed()
                    return allowed
                        ? {
                            allowed: true as const,
                            transport: { send: sendNativeMessage },
                            authorizeSend: async forwarded => {
                                const lease = await updateRuntime.beginOrdinaryMainHostRequest(
                                    () => sendNativeMessage(forwarded),
                                )
                                return lease.allowed
                                    ? lease
                                    : {
                                    allowed: false as const,
                                    response: UPDATE_UNAVAILABLE_RESPONSE,
                                }
                            },
                        }
                        : {
                            allowed: false as const,
                            response: UPDATE_UNAVAILABLE_RESPONSE,
                        }
                },
            })
        } else {
            const guarded = guardNonAnalyzeNativeMessage(inner)
            request = !guarded.ok
                ? Promise.resolve(guarded.response)
                : updateRuntimeReady.then(async () => {
                    const lease = await updateRuntime.beginOrdinaryMainHostRequest(
                        () => sendNativeMessage(guarded.forwarded),
                        guarded.forwarded.action === 'check_updates' ? 'check_updates' : undefined,
                    )
                    if (!lease.allowed) {
                        return UPDATE_UNAVAILABLE_RESPONSE
                    }
                    return lease.response
                })
        }
        request
            .then(sendResponse)
            .catch(() => sendResponse({
                status: 'error',
                error: 'Native Host error',
            }))
        return true
    }
    
    if (messageType === "OPEN_OPTIONS") {
        chrome.runtime.openOptionsPage();
        return false;
    }


    if (messageType === "TELEMETRY_EVENT") {
        const event = messagePayload as { name?: string; properties?: Record<string, unknown> } | undefined
        if (typeof event?.name === 'string') trackBackgroundEvent(event.name, event.properties);
        return false;
    }

    if (messageType === "TELEMETRY_EXCEPTION") {
        const event = messagePayload as { error?: unknown; severityLevel?: number } | undefined
        if (event) trackBackgroundException(event.error, event.severityLevel);
        return false;
    }

    // Team Bookmark Catalog: manual sync from Options page
    if (messageType === "SYNC_TEAM_CATALOG") {
        const request = messagePayload as TeamCatalogSyncRequest;
        if (!request?.identity || !Number.isInteger(request.requestGeneration)) {
            sendResponse({ status: "error", error: "Invalid team catalog request" });
            return false;
        }
        handleTeamCatalogSyncRequest(request, {
            beginGeneration: beginTeamSyncGeneration,
            identityIsCurrent: currentTeamIdentityMatches,
            clearAll: (identity, generation) => clearTeamBookmarksAtGeneration(generation, identity),
            clearSelection: (identity, generation) => clearTeamSelectionAtGeneration(generation, identity),
            clearSelectionIfChanged: clearTeamSelectionIfChanged,
            syncManifest: (captured, generation) => syncManifestOnly(captured, {
                readInitialState: () => readTeamManifestState(captured.identity, generation),
                identityIsCurrent: () => currentTeamIdentityMatches(captured.identity, generation),
                fetchManifest,
                writeManifest: (manifest, etag) => writeTeamManifestForUrl(
                    captured.identity,
                    manifest,
                    etag,
                    generation,
                ),
            }),
            syncSelected: (identity, generation) =>
                syncTeamBookmarks(identity, generation),
        })
            .then(sendResponse)
            .catch(() => {
                console.error('[DH-SW] Team catalog sync failed unexpectedly.');
                sendResponse({ status: "error", error: "Team catalog sync failed" });
            });
        return true; // Keep channel open for async response
    }

    if (messageType === "CLEAR_TEAM_CATALOG") {
        sendResponse({ status: "error", error: "Captured team identity required" });
        return false;
    }

    if (messageType === "RESET_EXTENSION_STATE") {
        handleResetExtensionState(messagePayload as ResetExtensionStateRequest, {
            beginGeneration: beginTeamSyncGeneration,
            identityIsCurrent: currentTeamIdentityMatches,
            clearTeamState: (identity, generation) =>
                clearTeamBookmarksAtGeneration(generation, identity),
            clearAnalysisState: resetAnalysisState,
        }).then(sendResponse);
        return true;
    }
});

console.log("[DH] Background Service Worker Loaded");

// --- Team Bookmark Catalog: Background Sync ---
async function syncTeamCatalogOnStartup() {
    const startupGeneration = beginTeamSyncGeneration();
    try {
        const data = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['dh_prefs'], resolve);
        });
        const prefs = data.dh_prefs || {};
        const enabled = prefs.teamCatalogEnabled === true;
        const manifestUrl = prefs.teamManifestUrl || '';
        const teamId = prefs.team;

        if (!enabled) {
            // Toggle off - do not touch network. This is the default state.
            return;
        }
        if (!manifestUrl) {
            // Toggle on but URL not yet configured - no-op.
            return;
        }
        const startupIdentity = {
            enabled: true,
            manifestUrl,
            teamId: teamId || '',
        };
        if (!await currentTeamIdentityMatches(startupIdentity, startupGeneration)) return;
        if (!teamId) {
            // Use the same post-fetch preference gate as the Options-triggered
            // path so Reset cannot resurrect a stale manifest.
            await syncManifestOnly({
                identity: startupIdentity,
                requestGeneration: 0,
                manifestOnly: true,
                storageGeneration: startupGeneration,
            }, {
                readInitialState: () => readTeamManifestState(startupIdentity, startupGeneration),
                identityIsCurrent: () => currentTeamIdentityMatches(startupIdentity, startupGeneration),
                fetchManifest,
                writeManifest: (nextManifest, etag) =>
                    writeTeamManifestForUrl(
                        startupIdentity,
                        nextManifest,
                        etag,
                        startupGeneration,
                    ),
            });
            return;
        }

        const result = await syncTeamBookmarks(startupIdentity, startupGeneration);
        // Startup hook has no UI to notify — log the outcome including any
        // classified failure. Cached items still get returned so the popup
        // has something to render.
        if (result.status === 'stale' || result.status === 'skipped') return;
        const current = await chrome.storage.local.get('dh_prefs');
        if (shouldReportTeamSyncFailure(result, current.dh_prefs || {})) {
            const failure = result.failure!;
            console.warn('[DH-SW] Startup team sync failed', {
                stage: result.failureStage,
                kind: failure.kind,
                ...(failure.httpStatus === undefined
                    ? {}
                    : { httpStatus: failure.httpStatus }),
            });
            return;
        }
        const currentPrefs = (current.dh_prefs || {}) as {
            teamCatalogEnabled?: boolean;
            teamManifestUrl?: string;
            team?: string;
        };
        if (
            currentPrefs.teamCatalogEnabled !== result.identity.enabled
            || currentPrefs.teamManifestUrl !== result.identity.manifestUrl
            || currentPrefs.team !== result.identity.teamId
        ) return;
        console.log(`[DH-SW] Team catalog sync completed with ${result.items.length} items.`);
    } catch {
        console.warn('[DH-SW] Team catalog sync failed unexpectedly.');
    }
}

// Sync on service worker startup
syncTeamCatalogOnStartup();

// Also sync on install/update
chrome.runtime.onInstalled.addListener(() => {
    syncTeamCatalogOnStartup();
    void requestUpdateCheck().catch(() => undefined)
});

// Also sync on browser startup (when service worker is woken up cold)
chrome.runtime.onStartup.addListener(() => {
    syncTeamCatalogOnStartup();
    void requestUpdateCheck().catch(() => undefined)
});
