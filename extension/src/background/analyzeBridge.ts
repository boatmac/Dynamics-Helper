// Service Worker analyze persistence bridge.
//
// Wraps the native-host RPC for `action === 'analyze_error'` with
// chrome.storage.local writes so the result survives content-script
// teardown (tab close, navigation, FAB unmount). The FAB content
// script reads dh_last_analysis / dh_pending_analysis on mount to
// re-hydrate the UI.
//
// See:
// - docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md
// - docs/superpowers/plans/2026-06-03-analysis-result-persistence.md
//
// Design: dependency-injected `send` so the bridge can be unit-tested
// against a stubbed RPC without spinning up the full Service Worker
// module (which has top-level side effects: nativePort connect,
// ApplicationInsights init, context-menu registration).

import {
    AnalyzePersistContext,
    recordAnalyzeStart,
    recordAnalyzeSuccess,
    recordAnalyzeError,
} from '../utils/analysisStore';

export interface AnalyzeForwardDeps {
    /** Native-host RPC. Resolves with the outer host wrapper `{status, data}`. */
    send: (payload: any) => Promise<any>;
}

/**
 * Forward a NATIVE_MSG payload to the native host with analyze-specific
 * persistence side effects.
 *
 * Contract:
 * - If `ctx` is null, behaves as a thin pass-through over `deps.send`
 *   (used for non-analyze actions like get_config, update_config).
 * - If `ctx` is provided:
 *   - P-I1: `recordAnalyzeStart` resolves BEFORE `deps.send` is called.
 *   - P-I2: on host success (outer status='success' AND inner status='success'),
 *     `recordAnalyzeSuccess` is called with the inner data object.
 *   - P-I3: on host-reported error (inner status='error'),
 *     `recordAnalyzeError` is called with the host's `error` message.
 *   - P-I4: if `deps.send` rejects, `recordAnalyzeError` is called with
 *     the exception's message AND the rejection is re-thrown so the SW
 *     can still sendResponse(error) to the FAB.
 *
 * The host's analyze_error envelope is double-wrapped:
 *   { status: 'success', data: { status: 'success', data: { markdown, saved_to, ... } } }
 *   { status: 'success', data: { status: 'error', error: '...' } }
 * Outer `status: 'error'` is reserved for SW-level dispatch failures (the
 * `action` itself failed to route, not the analyze logic).
 */
export async function handleAnalyzeForward(
    payload: any,
    ctx: AnalyzePersistContext | null,
    deps: AnalyzeForwardDeps,
): Promise<any> {
    if (!ctx) {
        return deps.send(payload);
    }

    await recordAnalyzeStart(ctx);

    let response: any;
    try {
        response = await deps.send(payload);
    } catch (err: any) {
        const msg =
            err && typeof err === 'object' && 'message' in err
                ? String(err.message)
                : String(err);
        await recordAnalyzeError(ctx, msg);
        throw err;
    }

    const outerOk = response?.status === 'success';
    const inner = response?.data;
    const innerOk = inner?.status === 'success';

    if (outerOk && innerOk) {
        await recordAnalyzeSuccess(ctx, inner.data ?? {});
    } else {
        const msg =
            inner?.error ||
            inner?.message ||
            response?.error ||
            response?.message ||
            'Unknown error';
        await recordAnalyzeError(ctx, String(msg));
    }

    return response;
}
