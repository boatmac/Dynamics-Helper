// Analysis result persistence — wrapper over chrome.storage.local for the
// C2a+ result, pending, and per-identity acknowledgement keys (see
// docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md).
//
// Why a dedicated module:
// - Single source of truth for the storage shape. Both the Service Worker
//   (writer) and FAB.tsx (reader) import from here so the schema can't
//   drift across the boundary.
// - Promise-based API matches the rest of utils/ (prefs.ts, teamCatalog.ts).
// - Constants (STALE_WINDOW_MS, MAX_PENDING_AGE_MS) live next to the code
//   that uses them — easy to find and change.
//
// Owner of result/pending/reset writes: Service Worker only. Short storage
// mutations are serialized so a pending conditional clear cannot interleave a
// newer pending write. FAB acknowledges a displayed identity through its own
// per-identity key, never by rewriting the latest result.

import { ownDataProperty } from './ownData';

/** Persisted analysis result. Overwritten on every new analysis. */
export interface LastAnalysis {
    caseNumber: string;       // 16-digit case ID
    requestId?: string;       // analyze request identity; absent on legacy records
    status: 'success' | 'error';
    title: string;            // popover title, already i18n'd at write time
    content: string;          // markdown body (success: full report; error: host message)
    timestamp: number;        // Date.now() at write
    seen: boolean;            // legacy compatibility; new acks use prefixed identity keys
    durationSec?: number;     // success only
    savedTo?: string;         // success only, file path
    errorCode?: string;       // error only, raw Host machine-readable code
}

export interface LastAnalysisIdentity {
    caseNumber: string;
    timestamp?: number;
    requestId?: string;
}

/** Pending-analysis marker. Cleared when result arrives or expires. */
export interface PendingAnalysis {
    caseNumber: string;
    requestId: string;        // matches FAB's latestRequestId
    startTime: number;        // Date.now() when SW forwarded to host
}

export interface LatestAnalysisOwner {
    caseNumber: string;
    requestId: string;
    startTime: number;
}

// Result considered fresh enough to auto-open the popover on FAB mount.
// 1 hour covers typical lunch break / meeting interruption windows. Past
// this, we assume the user has moved on and don't surprise them with an
// old result.
export const STALE_WINDOW_MS = 60 * 60 * 1000;

// Pending markers older than this are presumed orphaned (e.g., SW
// crashed before response arrived). The garbage-collection pass in
// setLastAnalysis() drops them so the spinner doesn't spin forever.
// 2 hours is comfortably more than the 600s host timeout plus retry.
export const MAX_PENDING_AGE_MS = 2 * 60 * 60 * 1000;

// FAB mount-time check: ignore pending markers older than this when
// deciding whether to render the "analyzing" spinner. 15 min is
// comfortably more than the 600s host timeout. Separate from
// MAX_PENDING_AGE_MS (which deletes on write) so a stale marker can
// be visible-as-ignored without being destructively removed mid-read.
export const MAX_PENDING_DISPLAY_AGE_MS = 15 * 60 * 1000;

const KEY_LAST = 'dh_last_analysis';
const LEGACY_KEY_PENDING = 'dh_pending_analysis';
export const PENDING_ANALYSIS_KEY_PREFIX = 'dh_pending_analysis:';
const LEGACY_KEY_SEEN = 'dh_seen_analysis';
export const SEEN_ANALYSIS_KEY_PREFIX = 'dh_seen_analysis:';
export const LATEST_ANALYSIS_OWNER_KEY = 'dh_latest_analysis_owner';

export type AnalysisPersistenceWarning =
    | 'analysis_result_not_persisted'
    | 'analysis_pending_cleanup_failed';

export const ANALYSIS_PERSISTENCE_WARNING_ORDER: readonly AnalysisPersistenceWarning[] = [
    'analysis_result_not_persisted',
    'analysis_pending_cleanup_failed',
];

function getAnalysisStorage(
    keys: string | string[] | null,
): Promise<{ value: unknown }> {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(keys, stored => {
                try {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Analysis storage read failed'));
                        return;
                    }
                    resolve({ value: stored });
                } catch {
                    reject(new Error('Analysis storage read failed'));
                }
            });
        } catch {
            reject(new Error('Analysis storage read failed'));
        }
    });
}

function setAnalysisStorage(values: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(values, () => {
                try {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Analysis storage write failed'));
                        return;
                    }
                    resolve();
                } catch {
                    reject(new Error('Analysis storage write failed'));
                }
            });
        } catch {
            reject(new Error('Analysis storage write failed'));
        }
    });
}

function removeAnalysisStorage(keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.remove(keys, () => {
                try {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Analysis storage remove failed'));
                        return;
                    }
                    resolve();
                } catch {
                    reject(new Error('Analysis storage remove failed'));
                }
            });
        } catch {
            reject(new Error('Analysis storage remove failed'));
        }
    });
}

function analysisStorageEntries(
    value: unknown,
): Array<readonly [string, unknown]> | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null;
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const entries: Array<readonly [string, unknown]> = [];
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== 'string') continue;
            const descriptor = descriptors[key];
            if (!descriptor) return null;
            entries.push([
                key,
                Object.hasOwn(descriptor, 'value')
                    ? descriptor.value
                    : undefined,
            ] as const);
        }
        return entries;
    } catch {
        return null;
    }
}

function analysisStorageValue(value: unknown, key: string): unknown {
    const field = ownDataProperty(value, key);
    return field.kind === 'value' ? field.value : undefined;
}

let analysisMutationQueue: Promise<void> = Promise.resolve();

function queueAnalysisMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const run = analysisMutationQueue.then(mutation, mutation);
    analysisMutationQueue = run.then(() => undefined, () => undefined);
    return run;
}

export function seenAnalysisKey(identity: LastAnalysisIdentity): string {
    const parsed = parseLastAnalysisIdentity(identity);
    if (!parsed) throw new Error('Invalid analysis persistence value');
    const encodedCase = encodeURIComponent(parsed.caseNumber);
    if (parsed.requestId !== undefined) {
        return `${SEEN_ANALYSIS_KEY_PREFIX}request:${encodedCase}:${encodeURIComponent(parsed.requestId)}`;
    }
    return `${SEEN_ANALYSIS_KEY_PREFIX}legacy:${encodedCase}:${parsed.timestamp}`;
}

export function pendingAnalysisKey(requestId: string): string {
    if (typeof requestId !== 'string') {
        throw new Error('Invalid analysis persistence value');
    }
    return `${PENDING_ANALYSIS_KEY_PREFIX}${encodeURIComponent(requestId)}`;
}

export interface AnalysisSnapshot {
    last: LastAnalysis | null;
    pending: PendingAnalysis | null;
    seen: LastAnalysisIdentity | null;
}

/** One storage generation for result, pending, and the current result's ack. */
export async function getAnalysisSnapshot(caseNumber?: string): Promise<AnalysisSnapshot> {
    const entries = analysisStorageEntries((await getAnalysisStorage(null)).value);
    if (!entries) throw new Error('Analysis storage read failed');
    const values = new Map(entries);
    const last = parseLastAnalysis(values.get(KEY_LAST));
    const pendingCandidates = entries
        .filter(([key]) => key.startsWith(PENDING_ANALYSIS_KEY_PREFIX))
        .map(([, value]) => parsePendingAnalysis(value))
        .filter((value): value is PendingAnalysis => value !== null
            && (!caseNumber || value.caseNumber === caseNumber));
    const legacyPending = parsePendingAnalysis(values.get(LEGACY_KEY_PENDING));
    if (legacyPending && (!caseNumber || legacyPending.caseNumber === caseNumber)) {
        pendingCandidates.push(legacyPending);
    }
    const pending = pendingCandidates.reduce<PendingAnalysis | null>(
        (newest, candidate) => (
            !newest
            || candidate.startTime > newest.startTime
            || (
                candidate.startTime === newest.startTime
                && candidate.requestId > newest.requestId
            )
                ? candidate
                : newest
        ),
        null,
    );
    const identity = last ? getLastAnalysisIdentity(last) : null;
    const seen = identity
        ? (
            parseLastAnalysisIdentity(values.get(seenAnalysisKey(identity)))
            ?? parseLastAnalysisIdentity(values.get(LEGACY_KEY_SEEN))
            ?? null
        )
        : null;
    return { last, pending, seen };
}

/** Read the current dh_last_analysis, or null if absent. */
export async function getLastAnalysis(): Promise<LastAnalysis | null> {
    const result = (await getAnalysisStorage(KEY_LAST)).value;
    return parseLastAnalysis(analysisStorageValue(result, KEY_LAST));
}

/**
 * Write dh_last_analysis. Also performs garbage collection on
 * dh_pending_analysis: if a pending marker exists and is older than
 * MAX_PENDING_AGE_MS, it's removed in the same write batch. This keeps
 * a long-orphaned marker from blocking the spinner indefinitely on
 * future mounts.
 */
export async function setLastAnalysis(value: LastAnalysis): Promise<void> {
    const parsed = parseLastAnalysis(value);
    if (!parsed) throw new Error('Invalid analysis persistence value');
    await queueAnalysisMutation(async () => {
        const entries = analysisStorageEntries((await getAnalysisStorage(null)).value);
        if (!entries) throw new Error('Analysis storage read failed');
        const now = Date.now();
        const staleKeys = entries.flatMap(([key, candidate]) => {
            if (
                key !== LEGACY_KEY_PENDING
                && !key.startsWith(PENDING_ANALYSIS_KEY_PREFIX)
            ) return [];
            const pending = parsePendingAnalysis(candidate);
            return pending && now - pending.startTime > MAX_PENDING_AGE_MS
                ? [key]
                : [];
        });
        await setAnalysisStorage({ [KEY_LAST]: parsed });
        if (staleKeys.length > 0) {
            await removeAnalysisStorage(staleKeys);
        }
    });
}

/**
 * Persist only the identity that FAB consumed. This deliberately never reads
 * or rewrites dh_last_analysis, so an acknowledgement for A cannot overwrite
 * a newer result B regardless of storage callback ordering.
 */
export function getLastAnalysisIdentity(
    value: LastAnalysis,
): LastAnalysisIdentity {
    const last = parseLastAnalysis(value);
    if (!last) throw new Error('Invalid analysis persistence value');
    const parsed = parseLastAnalysisIdentity({
        caseNumber: last.caseNumber,
        timestamp: last.timestamp,
        ...(last.requestId === undefined ? {} : { requestId: last.requestId }),
    });
    if (!parsed) throw new Error('Invalid analysis persistence value');
    return parsed;
}

export function matchesLastAnalysisIdentity(
    value: LastAnalysisIdentity,
    expected: LastAnalysisIdentity | null,
): boolean {
    const parsedValue = parseLastAnalysisIdentity(value);
    const parsedExpected = parseLastAnalysisIdentity(expected);
    if (!parsedValue || !parsedExpected) return false;
    if (parsedValue.caseNumber !== parsedExpected.caseNumber) return false;
    if (
        parsedValue.requestId !== undefined
        || parsedExpected.requestId !== undefined
    ) {
        return parsedValue.requestId === parsedExpected.requestId;
    }
    return parsedExpected.timestamp !== undefined
        && parsedValue.timestamp === parsedExpected.timestamp;
}

export async function markSeen(
    expected: LastAnalysisIdentity,
): Promise<void> {
    const parsed = parseLastAnalysisIdentity(expected);
    if (!parsed) throw new Error('Invalid analysis persistence value');
    await queueAnalysisMutation(async () => {
        await setAnalysisStorage({
            [seenAnalysisKey(parsed)]: parsed,
        });
    });
}

/** Read the acknowledgement for an identity, including the singleton legacy key. */
export async function getSeenAnalysis(
    identity?: LastAnalysisIdentity,
): Promise<LastAnalysisIdentity | null> {
    const parsedIdentity = identity
        ? parseLastAnalysisIdentity(identity)
        : null;
    if (identity && !parsedIdentity) return null;
    const keys = parsedIdentity
        ? [seenAnalysisKey(parsedIdentity), LEGACY_KEY_SEEN]
        : [LEGACY_KEY_SEEN];
    const result = (await getAnalysisStorage(keys)).value;
    return (
        (parsedIdentity
            ? parseLastAnalysisIdentity(analysisStorageValue(
                result,
                seenAnalysisKey(parsedIdentity),
            ))
            : null)
        ?? parseLastAnalysisIdentity(analysisStorageValue(result, LEGACY_KEY_SEEN))
        ?? null
    );
}

/** Read the current dh_pending_analysis, or null if absent. */
export async function getPendingAnalysis(): Promise<PendingAnalysis | null> {
    return (await getAnalysisSnapshot()).pending;
}

/** Write one request-scoped pending marker. */
export async function setPendingAnalysis(value: PendingAnalysis): Promise<void> {
    const parsed = parsePendingAnalysis(value);
    if (!parsed) throw new Error('Invalid analysis persistence value');
    await queueAnalysisMutation(async () => {
        await setAnalysisStorage({ [pendingAnalysisKey(parsed.requestId)]: parsed });
    });
}

/** Clear all pending markers, including the legacy singleton. */
export async function clearPendingAnalysis(): Promise<void> {
    await queueAnalysisMutation(async () => {
        const entries = analysisStorageEntries((await getAnalysisStorage(null)).value);
        if (!entries) throw new Error('Analysis storage read failed');
        const keys = entries.map(([key]) => key).filter(key =>
            key === LEGACY_KEY_PENDING || key.startsWith(PENDING_ANALYSIS_KEY_PREFIX),
        );
        if (keys.length > 0) await removeAnalysisStorage(keys);
    });
}

// ---------------------------------------------------------------------------
// Service-Worker-facing helpers
//
// These wrap the storage primitives above with the field assembly that the
// SW write hooks need (title strings passed in from FAB at request time,
// timestamp stamping, success/error field shaping). FAB never calls these
// directly — it only reads via getLastAnalysis / markSeen / getPendingAnalysis.
//
// The helpers are split out into named functions (vs inlined in the SW
// handler) so each invariant in
// docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md § 5
// can be tested without spinning up the full Service Worker module (which
// has top-level side effects: native port connect, App Insights init, etc).
// ---------------------------------------------------------------------------

/**
 * Per-analyze context the SW carries from request to response. The FAB
 * builds this when it sends a NATIVE_MSG with action='analyze_error' and
 * the SW bridge plumbs it through to the success/error recording helpers.
 *
 * `successTitle` and `errorTitle` are pre-translated by the caller (FAB
 * has access to `t()`; the SW does not). Storing them in the request-scoped
 * context — not in the pending marker — means a SW crash mid-flight loses
 * the titles, but recovery is straightforward: the user retries and the
 * new ctx carries fresh strings. Schema stays minimal.
 */
export interface AnalyzePersistContext {
    caseNumber: string;
    requestId: string;
    successTitle: string;
    errorTitle: string;
}

export type AnalyzeCompletion =
    | { status: 'success'; markdown: string; savedTo?: string }
    | { status: 'error'; error: string; errorCode?: string };

export interface AnalyzePersistenceDeps {
    now?: () => number;
    delay?: (milliseconds: number) => Promise<void>;
    logCleanupFailure?: (attempt: number) => void;
}

function requiredString(value: unknown, key: string): string | null {
    const field = ownDataProperty(value, key);
    return field.kind === 'value' && typeof field.value === 'string'
        ? field.value
        : null;
}

function optionalString(
    value: unknown,
    key: string,
): { valid: boolean; value?: string } {
    const field = ownDataProperty(value, key);
    if (field.kind === 'absent') return { valid: true };
    return field.kind === 'value' && typeof field.value === 'string'
        ? { valid: true, value: field.value }
        : { valid: false };
}

function requiredFinite(value: unknown, key: string): number | null {
    const field = ownDataProperty(value, key);
    return field.kind === 'value'
        && typeof field.value === 'number'
        && Number.isFinite(field.value)
        ? field.value
        : null;
}

function optionalFinite(
    value: unknown,
    key: string,
): { valid: boolean; value?: number } {
    const field = ownDataProperty(value, key);
    if (field.kind === 'absent') return { valid: true };
    return field.kind === 'value'
        && typeof field.value === 'number'
        && Number.isFinite(field.value)
        ? { valid: true, value: field.value }
        : { valid: false };
}

export function parseLastAnalysis(value: unknown): LastAnalysis | null {
    const caseNumber = requiredString(value, 'caseNumber');
    const statusField = ownDataProperty(value, 'status');
    const title = requiredString(value, 'title');
    const content = requiredString(value, 'content');
    const timestamp = requiredFinite(value, 'timestamp');
    const seenField = ownDataProperty(value, 'seen');
    const requestId = optionalString(value, 'requestId');
    const durationSec = optionalFinite(value, 'durationSec');
    const savedTo = optionalString(value, 'savedTo');
    const errorCode = optionalString(value, 'errorCode');
    if (
        caseNumber === null
        || statusField.kind !== 'value'
        || (statusField.value !== 'success' && statusField.value !== 'error')
        || title === null
        || content === null
        || timestamp === null
        || seenField.kind !== 'value'
        || typeof seenField.value !== 'boolean'
        || !requestId.valid
        || !durationSec.valid
        || !savedTo.valid
        || !errorCode.valid
    ) return null;
    return {
        caseNumber,
        ...(requestId.value === undefined ? {} : { requestId: requestId.value }),
        status: statusField.value,
        title,
        content,
        timestamp,
        seen: seenField.value,
        ...(durationSec.value === undefined ? {} : { durationSec: durationSec.value }),
        ...(savedTo.value === undefined ? {} : { savedTo: savedTo.value }),
        ...(errorCode.value === undefined ? {} : { errorCode: errorCode.value }),
    };
}

export function parsePendingAnalysis(value: unknown): PendingAnalysis | null {
    const caseNumber = requiredString(value, 'caseNumber');
    const requestId = requiredString(value, 'requestId');
    const startTime = requiredFinite(value, 'startTime');
    return caseNumber !== null && requestId !== null && startTime !== null
        ? { caseNumber, requestId, startTime }
        : null;
}

export function parseLatestAnalysisOwner(
    value: unknown,
): LatestAnalysisOwner | null {
    const parsed = parsePendingAnalysis(value);
    return parsed ? { ...parsed } : null;
}

export function parseLastAnalysisIdentity(
    value: unknown,
): LastAnalysisIdentity | null {
    const caseNumber = requiredString(value, 'caseNumber');
    const requestId = optionalString(value, 'requestId');
    const timestamp = optionalFinite(value, 'timestamp');
    if (
        caseNumber === null
        || !requestId.valid
        || !timestamp.valid
        || (requestId.value === undefined && timestamp.value === undefined)
    ) return null;
    return {
        caseNumber,
        ...(requestId.value === undefined ? {} : { requestId: requestId.value }),
        ...(timestamp.value === undefined ? {} : { timestamp: timestamp.value }),
    };
}

export function parseAnalyzePersistContextValue(
    value: unknown,
): AnalyzePersistContext | null {
    const caseNumber = requiredString(value, 'caseNumber');
    const requestId = requiredString(value, 'requestId');
    const successTitle = requiredString(value, 'successTitle');
    const errorTitle = requiredString(value, 'errorTitle');
    return caseNumber !== null
        && requestId !== null && requestId.length > 0
        && successTitle !== null && successTitle.length > 0
        && errorTitle !== null && errorTitle.length > 0
        ? { caseNumber, requestId, successTitle, errorTitle }
        : null;
}

function parseAnalyzeCompletionValue(value: unknown): AnalyzeCompletion | null {
    const status = ownDataProperty(value, 'status');
    if (status.kind !== 'value') return null;
    if (status.value === 'success') {
        const markdown = requiredString(value, 'markdown');
        const savedTo = optionalString(value, 'savedTo');
        return markdown !== null && savedTo.valid
            ? {
                status: 'success',
                markdown,
                ...(savedTo.value === undefined ? {} : { savedTo: savedTo.value }),
            }
            : null;
    }
    if (status.value === 'error') {
        const error = requiredString(value, 'error');
        const errorCode = optionalString(value, 'errorCode');
        return error !== null && errorCode.valid
            ? {
                status: 'error',
                error,
                ...(errorCode.value === undefined ? {} : { errorCode: errorCode.value }),
            }
            : null;
    }
    return null;
}

/** Write the pending marker. Called by the SW before forwarding to the host. */
export async function recordAnalyzeStart(
    ctx: AnalyzePersistContext,
    now: () => number = Date.now,
): Promise<void> {
    const parsed = parseAnalyzePersistContextValue(ctx);
    if (!parsed) throw new Error('Invalid analysis persistence value');
    const captured = Object.freeze(parsed);
    await queueAnalysisMutation(async () => {
        let startTime: number;
        try {
            startTime = now();
        } catch {
            throw new Error('Invalid analysis persistence value');
        }
        if (!Number.isFinite(startTime)) {
            throw new Error('Invalid analysis persistence value');
        }
        const pending = parsePendingAnalysis({
            caseNumber: captured.caseNumber,
            requestId: captured.requestId,
            startTime,
        });
        const owner = parseLatestAnalysisOwner({
            caseNumber: captured.caseNumber,
            requestId: captured.requestId,
            startTime,
        });
        if (!pending || !owner) {
            throw new Error('Invalid analysis persistence value');
        }
        await setAnalysisStorage({
            [pendingAnalysisKey(captured.requestId)]: pending,
            [LATEST_ANALYSIS_OWNER_KEY]: owner,
        });
    });
}

function pendingMatches(
    value: unknown,
    caseNumber: string | undefined,
    requestId: string,
): boolean {
    const parsed = parsePendingAnalysis(value);
    return parsed !== null
        && parsed.requestId === requestId
        && (caseNumber === undefined || parsed.caseNumber === caseNumber);
}

async function clearPendingIfMatchesInMutation(
    requestId: string,
    caseNumber?: string,
): Promise<void> {
    const requestKey = pendingAnalysisKey(requestId);
    const stored = (await getAnalysisStorage([
        requestKey,
        LEGACY_KEY_PENDING,
    ])).value;
    const keys: string[] = [];
    if (pendingMatches(analysisStorageValue(stored, requestKey), caseNumber, requestId)) {
        keys.push(requestKey);
    }
    if (pendingMatches(
        analysisStorageValue(stored, LEGACY_KEY_PENDING),
        caseNumber,
        requestId,
    )) {
        keys.push(LEGACY_KEY_PENDING);
    }
    if (keys.length > 0) await removeAnalysisStorage(keys);
}

async function retryAnalyzeCleanup(
    ctx: Readonly<AnalyzePersistContext>,
    delay: (milliseconds: number) => Promise<void>,
    logCleanupFailure: (attempt: number) => void,
): Promise<boolean> {
    const retryDelays = [50, 200] as const;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await clearPendingIfMatchesInMutation(ctx.requestId, ctx.caseNumber);
            return true;
        } catch {
            try {
                logCleanupFailure(attempt);
            } catch {
                // Cleanup diagnostics cannot expose or mask persistence state.
            }
            if (attempt < 3) await delay(retryDelays[attempt - 1]);
        }
    }
    return false;
}

export async function completeAnalyzePersistence(
    ctx: AnalyzePersistContext,
    completion: AnalyzeCompletion,
    deps: AnalyzePersistenceDeps = {},
): Promise<AnalysisPersistenceWarning[]> {
    const parsedContext = parseAnalyzePersistContextValue(ctx);
    const parsedCompletion = parseAnalyzeCompletionValue(completion);
    if (!parsedContext || !parsedCompletion) {
        throw new Error('Invalid analysis persistence value');
    }
    const capturedContext = Object.freeze(parsedContext);
    const capturedCompletion = Object.freeze(parsedCompletion);
    const now = deps.now ?? Date.now;
    const delay = deps.delay
        ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    const logCleanupFailure = deps.logCleanupFailure
        ?? (attempt => console.warn(
            '[DH] Analysis pending cleanup failed',
            { attempt },
        ));

    return queueAnalysisMutation(async () => {
        const observed = new Set<AnalysisPersistenceWarning>();
        const ownerStored = (await getAnalysisStorage(
            LATEST_ANALYSIS_OWNER_KEY,
        )).value;
        const owner = parseLatestAnalysisOwner(analysisStorageValue(
            ownerStored,
            LATEST_ANALYSIS_OWNER_KEY,
        ));

        try {
            if (
                owner?.requestId === capturedContext.requestId
                && owner.caseNumber === capturedContext.caseNumber
            ) {
                let timestamp: number;
                try {
                    timestamp = now();
                } catch {
                    throw new Error('Invalid analysis persistence value');
                }
                const last = parseLastAnalysis({
                    caseNumber: capturedContext.caseNumber,
                    requestId: capturedContext.requestId,
                    status: capturedCompletion.status,
                    title: capturedCompletion.status === 'success'
                        ? capturedContext.successTitle
                        : capturedContext.errorTitle,
                    content: capturedCompletion.status === 'success'
                        ? capturedCompletion.markdown
                        : capturedCompletion.error,
                    timestamp,
                    seen: false,
                    ...(capturedCompletion.status === 'success'
                        && capturedCompletion.savedTo !== undefined
                        ? { savedTo: capturedCompletion.savedTo }
                        : {}),
                    ...(capturedCompletion.status === 'error'
                        && capturedCompletion.errorCode !== undefined
                        ? { errorCode: capturedCompletion.errorCode }
                        : {}),
                });
                if (!last) throw new Error('Invalid analysis persistence value');
                try {
                    await setAnalysisStorage({ [KEY_LAST]: last });
                } catch {
                    observed.add('analysis_result_not_persisted');
                }
            }
        } finally {
            const cleaned = await retryAnalyzeCleanup(
                capturedContext,
                delay,
                logCleanupFailure,
            );
            if (!cleaned) observed.add('analysis_pending_cleanup_failed');
        }

        return ANALYSIS_PERSISTENCE_WARNING_ORDER.filter(warning => (
            observed.has(warning)
        ));
    });
}

// Task 5 migrates the Analyze wire to the warning-bearing completion API.
export async function recordAnalyzeSuccess(
    ctx: AnalyzePersistContext,
    hostData: { markdown?: string; saved_to?: string },
): Promise<void> {
    await completeAnalyzePersistence(ctx, {
        status: 'success',
        markdown: typeof hostData?.markdown === 'string' ? hostData.markdown : '',
        ...(typeof hostData?.saved_to === 'string'
            ? { savedTo: hostData.saved_to }
            : {}),
    });
}

// Task 5 migrates the Analyze wire to the warning-bearing completion API.
export async function recordAnalyzeError(
    ctx: AnalyzePersistContext,
    errorMessage: string,
    errorCode?: string,
): Promise<void> {
    await completeAnalyzePersistence(ctx, {
        status: 'error',
        error: errorMessage,
        ...(errorCode === undefined ? {} : { errorCode }),
    });
}

/**
 * Clear dh_pending_analysis only if its requestId matches the given one.
 *
 * Per spec edge case 6.3: when case A's late response arrives after the
 * user already started case B's analysis, A's response handler must NOT
 * wipe B's pending marker. Guard with requestId equality.
 */
export async function clearPendingIfMatches(requestId: string): Promise<void> {
    await queueAnalysisMutation(async () => {
        await clearPendingIfMatchesInMutation(requestId);
    });
}

/** Serialized Service Worker reset for all analysis state and ack generations. */
export async function resetAnalysisState(): Promise<void> {
    await queueAnalysisMutation(async () => {
        const entries = analysisStorageEntries((await getAnalysisStorage(null)).value);
        if (!entries) throw new Error('Analysis storage read failed');
        const keys = entries.map(([key]) => key).filter(key =>
            key === KEY_LAST
            || key === LATEST_ANALYSIS_OWNER_KEY
            || key === LEGACY_KEY_PENDING
            || key.startsWith(PENDING_ANALYSIS_KEY_PREFIX)
            || key === LEGACY_KEY_SEEN
            || key.startsWith(SEEN_ANALYSIS_KEY_PREFIX),
        );
        if (keys.length > 0) {
            await removeAnalysisStorage(keys);
        }
    });
}
