// Analysis result persistence — wrapper over chrome.storage.local for the
// two new keys introduced by the C2a+ work (see
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
// Owner of writes: Service Worker only. FAB never writes dh_last_analysis
// or dh_pending_analysis except to flip `seen: true` via markSeen() when
// the user dismisses the popover.

/** Persisted analysis result. Overwritten on every new analysis. */
export interface LastAnalysis {
    caseNumber: string;       // 16-digit case ID
    status: 'success' | 'error';
    title: string;            // popover title, already i18n'd at write time
    content: string;          // markdown body (success: full report; error: host message)
    timestamp: number;        // Date.now() at write
    seen: boolean;            // false until user dismisses popover
    durationSec?: number;     // success only
    savedTo?: string;         // success only, file path
}

/** Pending-analysis marker. Cleared when result arrives or expires. */
export interface PendingAnalysis {
    caseNumber: string;
    requestId: string;        // matches FAB's latestRequestId
    startTime: number;        // Date.now() when SW forwarded to host
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
const KEY_PENDING = 'dh_pending_analysis';

/** Read the current dh_last_analysis, or null if absent. */
export async function getLastAnalysis(): Promise<LastAnalysis | null> {
    const result = await chrome.storage.local.get(KEY_LAST);
    return (result[KEY_LAST] as LastAnalysis | undefined) ?? null;
}

/**
 * Write dh_last_analysis. Also performs garbage collection on
 * dh_pending_analysis: if a pending marker exists and is older than
 * MAX_PENDING_AGE_MS, it's removed in the same write batch. This keeps
 * a long-orphaned marker from blocking the spinner indefinitely on
 * future mounts.
 */
export async function setLastAnalysis(value: LastAnalysis): Promise<void> {
    const pending = await getPendingAnalysis();
    const toRemove: string[] = [];
    if (pending && (Date.now() - pending.startTime) > MAX_PENDING_AGE_MS) {
        toRemove.push(KEY_PENDING);
    }
    await chrome.storage.local.set({ [KEY_LAST]: value });
    if (toRemove.length > 0) {
        await chrome.storage.local.remove(toRemove);
    }
}

/**
 * Set `seen: true` on the currently stored result. No-op if no result
 * exists. Called by FAB when the user closes the popover.
 *
 * Race-safe: re-reads storage immediately before write so it doesn't
 * stomp on a concurrent SW write of a newer result.
 */
export async function markSeen(): Promise<void> {
    const current = await getLastAnalysis();
    if (!current) return;
    if (current.seen) return;
    await chrome.storage.local.set({
        [KEY_LAST]: { ...current, seen: true },
    });
}

/** Read the current dh_pending_analysis, or null if absent. */
export async function getPendingAnalysis(): Promise<PendingAnalysis | null> {
    const result = await chrome.storage.local.get(KEY_PENDING);
    return (result[KEY_PENDING] as PendingAnalysis | undefined) ?? null;
}

/** Write dh_pending_analysis. */
export async function setPendingAnalysis(value: PendingAnalysis): Promise<void> {
    await chrome.storage.local.set({ [KEY_PENDING]: value });
}

/** Unconditionally clear dh_pending_analysis. */
export async function clearPendingAnalysis(): Promise<void> {
    await chrome.storage.local.remove(KEY_PENDING);
}

/**
 * Clear dh_pending_analysis only if its requestId matches the given one.
 *
 * Per spec edge case 6.3: when case A's late response arrives after the
 * user already started case B's analysis, A's response handler must NOT
 * wipe B's pending marker. Guard with requestId equality.
 */
export async function clearPendingIfMatches(requestId: string): Promise<void> {
    const current = await getPendingAnalysis();
    if (current && current.requestId === requestId) {
        await chrome.storage.local.remove(KEY_PENDING);
    }
}
