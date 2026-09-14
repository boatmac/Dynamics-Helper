import React, { useState, useEffect, useRef } from 'react';
import { CUSTOMER_LOOKUP_SELECTOR, PageReader, ScrapedData } from '../utils/pageReader';
import { logCreatedOn } from '../utils/createdOnBridge';
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';
import { useTranslation } from '../utils/i18n';
import { usePrefs } from '../utils/prefs';
import { trackEvent, hashCaseId } from '../utils/telemetry';
import { getExtensionVersion } from '../utils/version';
import { useAnalysisHydration } from '../hooks/useAnalysisHydration';
import { useVisibleCompletionAck } from '../hooks/useVisibleCompletionAck';
import type {
    AnalysisPersistenceWarning,
    LastAnalysisIdentity,
} from '../utils/analysisStore';
import { applyCurrentUserPrompt, applyIrSlaSnapshot, formatIrSlaSnapshot } from '../utils/analysisPrompt';
import { safeErrorText } from '../utils/safeErrorText';
import { ownDataProperty } from '../utils/ownData';
import { subscribeAnalyzeProgress, type AnalyzeProgressMessage } from '../utils/analyzeProgressChannel';
import { analyzeProgressReducer, analyzeProgressLabel, type AnalyzeProgressState, type AnalyzeProgressAction } from '../utils/analyzeProgressState';
import { AnalyzeProgress } from './AnalyzeProgress';
import { parseAnalyzeForwardResult } from '../background/analyzeBridge';
import {
    parseUpdateState,
    type UpdateErrorCode,
    type UpdateState,
} from '../background/updateRuntime';
import {
    parsePageIdentitySnapshot,
    parseScrapedDataSnapshot,
    type PageIdentity,
} from '../utils/pageIdentity';
import {
    readAnalyzeInvocation,
    requestMatchesPage,
    snapshotAnalyzeRequest,
    type AnalyzeInvocation,
    type AnalyzeRequestSnapshot,
} from '../utils/analyzeRequest';
import { ResultPopover } from './ResultPopover';
export { ResultPopover } from './ResultPopover';
import { 
    X, 
    Settings, 
    ArrowLeft, 
    Folder, 
    Link, 
    FileText, 
    ChevronRight, 
    ChevronDown, 
    Activity, 
    Zap,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for class merging
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type AcceptedContextSnapshot = {
    generation: number;
    identity: PageIdentity | null;
    data: ScrapedData;
};

const CUSTOMER_ENRICHMENT_WINDOW_MS = 5000;
const CUSTOMER_ENRICHMENT_POLL_MS = 250;

type CustomerEnrichmentEpoch = {
    identity: PageIdentity;
    caseNumber: string;
    deadline: number;
};

type CustomerEnrichmentBinding = {
    epoch: CustomerEnrichmentEpoch;
    accepted: AcceptedContextSnapshot;
    generation: number;
};

type TerminalRevalidationResult = {
    generation: number;
    accepted: AcceptedContextSnapshot | null;
};

type TerminalRevalidationCoordinator = {
    requestId: string;
    origin: PageIdentity | null;
    latestGeneration: number;
    latestCompletion: Promise<TerminalRevalidationResult> | null;
    version: number;
    changeSignal: TerminalRevalidationChangeSignal;
    closed: boolean;
};

type TerminalRevalidationChangeSignal = {
    promise: Promise<void>;
    resolve: () => void;
};

function createTerminalRevalidationChangeSignal(): TerminalRevalidationChangeSignal {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
}

function safeAnalyzeRejectionText(value: unknown, fallback: string): string {
    const direct = typeof value === 'string' ? value : undefined;
    const messageProperty = ownDataProperty(value, 'message');
    const message = messageProperty.kind === 'value'
        && typeof messageProperty.value === 'string'
        ? messageProperty.value
        : undefined;
    return safeErrorText([message, direct], fallback);
}

function projectedUpdateState(value: unknown): UpdateState | null {
    const property = ownDataProperty(value, 'state');
    return property.kind === 'value' ? parseUpdateState(property.value) : null;
}

function projectedUpdateVersion(state: UpdateState): string | null {
    if (state.kind === 'available' || state.kind === 'complete') {
        return state.update.version;
    }
    if (state.kind === 'recovery-required') {
        return state.transaction?.targetVersion ?? null;
    }
    return state.kind === 'idle' ? null : state.targetVersion;
}

function projectedUpdateError(state: UpdateState): UpdateErrorCode | null {
    if (state.kind === 'recovery-required') return state.code;
    if (state.kind === 'preparing' || state.kind === 'activating') {
        return state.errorCode ?? null;
    }
    if (state.kind === 'reload-pending' || state.kind === 'ack-pending') {
        return state.errorCode ?? null;
    }
    return null;
}

function updateErrorText(errorCode: UpdateErrorCode, t: (key: string) => string): string {
    const keys: Record<UpdateErrorCode, string> = {
        invalid_update_request: 'invalidUpdateRequest',
        installation_integrity_failed: 'updateInstallerRequired',
        update_already_in_progress: 'updateAlreadyInProgress',
        update_prepare_failed: 'updatePrepareFailed',
        update_activation_failed: 'updateActivationFailed',
        update_not_terminal: 'updateNotTerminal',
        update_cleanup_failed: 'updateCleanupFailed',
        source_update_disabled: 'sourceUpdateDisabled',
        manual_recovery_required: 'manualRecoveryRequired',
    };
    return t(keys[errorCode]);
}

function updateIsBusy(state: UpdateState): boolean {
    if (state.kind === 'preparing' || state.kind === 'activating') {
        return state.errorCode === undefined;
    }
    if (state.kind === 'reload-pending' || state.kind === 'ack-pending') {
        return state.errorCode === undefined;
    }
    return state.kind === 'polling';
}

function updateCanStart(state: UpdateState): boolean {
    return state.kind === 'available'
        || state.kind === 'recovery-required' && state.transaction !== undefined
        || state.kind === 'preparing' && state.errorCode !== undefined
        || state.kind === 'activating'
            && state.errorCode !== undefined
            && !state.activationRetryUsed
        || (state.kind === 'reload-pending' || state.kind === 'ack-pending')
            && state.errorCode !== undefined
        || state.kind === 'complete' && state.outcome === 'rolled-back';
}

const FAB: React.FC = () => {
    const { t } = useTranslation();
    const latestTranslationRef = React.useRef(t);
    latestTranslationRef.current = t;
    const { prefs } = usePrefs();
    const latestPrefsRef = React.useRef(prefs);
    latestPrefsRef.current = prefs;
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
    const [resultPopover, setResultPopover] = useState<{ 
        isOpen: boolean;
        title: string;
        content: string; 
        errorCode?: string;
        attachmentNotice?: string;
        path?: string;
        duration?: string;
        durabilityWarning?: string;
        identity?: LastAnalysisIdentity;
    }>({ isOpen: false, title: '', content: '' });
    // NOTE: legacy `errorMsg` state was removed in v2.0.71 (C2a+). It had
    // 9 setters and 0 readers — confirmed dead in
    // docs/specs/analysis-result-persistence.md
    // § 1. All error surfacing now flows through `setResultPopover` so the
    // user sees a persistent popover instead of a 4-second bubble flash.
    const [updateState, setUpdateState] = useState<UpdateState>({ kind: 'idle' });
    const completionTransactionId = updateState.kind === 'complete'
        ? updateState.transactionId
        : null;
    const updateVersion = updateState.kind === 'complete' && updateState.outcome === 'rolled-back'
        ? getExtensionVersion()
        : projectedUpdateVersion(updateState);
    const updateError = projectedUpdateError(updateState);
    const isUpdateBusy = updateIsBusy(updateState);
    const canStartUpdate = updateCanStart(updateState);
    const showUpdateBanner = updateState.kind !== 'idle';
    const updateTitle = updateState.kind === 'available'
        ? t('updateAvailable')
        : updateState.kind === 'complete'
            ? t(updateState.outcome === 'committed' ? 'updateComplete' : 'updateRolledBack')
        : isUpdateBusy
            ? t('updating')
            : t('retryUpdate');
    const updateDetail = updateError
        ? updateErrorText(updateError, t)
        : updateVersion
            ? `${t('version')} ${updateVersion}`
            : t('updateRequiresAttention');

    // Track whether the currently-displayed ResultPopover originated from an
    // analyze flow (vs a bookmark markdown). Only analyze popovers should
    // call markSeen() on close — bookmark popovers have no persisted state.
    const popoverIsAnalyze = React.useRef(false);

    const currentPageIdentityRef = React.useRef<PageIdentity | null>(null);
    const currentPageIdentityInitializedRef = React.useRef(false);
    const currentCaseNumberRef = React.useRef('');
    const editableContextIdentityRef = React.useRef<PageIdentity | null>(null);
    const pageScanGenerationRef = React.useRef(0);
    const pendingPageScanGenerationsRef = React.useRef<Set<number>>(new Set());
    const [pendingPageScanCount, setPendingPageScanCount] = useState(0);
    const acceptedContextSnapshotRef = React.useRef<AcceptedContextSnapshot | null>(null);
    const customerEnrichmentEpochRef = useRef<CustomerEnrichmentEpoch | null>(null);
    const customerEnrichmentBindingRef = useRef<CustomerEnrichmentBinding | null>(null);
    const [customerEnrichment, setCustomerEnrichment] = useState<CustomerEnrichmentBinding | null>(null);
    const editableAnalyzeContextRef = React.useRef<{
        accepted: NonNullable<typeof acceptedContextSnapshotRef.current>;
        data: ScrapedData;
    } | null>(null);
    const [hydrationCaseNumber, setHydrationCaseNumber] = useState('');
    const hydrationCaseNumberRef = React.useRef('');
    
    // Status Bubble State
    const [statusBubble, setStatusBubble] = useState<{ 
        visible: boolean; 
        text: string; 
        type: 'default' | 'success' | 'error';
    }>({ visible: false, text: '', type: 'default' });
    const statusBubbleRef = React.useRef(statusBubble);
    const statusTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const statusCompletionTransactionIdRef = React.useRef<string | null>(null);

    const completionBubbleVisible = completionTransactionId !== null
        && statusBubble.visible
        && statusCompletionTransactionIdRef.current === completionTransactionId;
    const completionSurfaceVisible = completionTransactionId !== null
        && (isOpen || completionBubbleVisible);

    useVisibleCompletionAck({
        transactionId: completionTransactionId,
        surfaceVisible: completionSurfaceVisible,
    });

    function hideStatusBubble(onlyType?: 'default' | 'success' | 'error'): void {
        if (onlyType !== undefined && statusBubbleRef.current.type !== onlyType) return;
        if (statusTimeoutRef.current !== null) {
            clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = null;
        }
        statusCompletionTransactionIdRef.current = null;
        const next = { ...statusBubbleRef.current, visible: false };
        statusBubbleRef.current = next;
        setStatusBubble(next);
    }

    function showStatusBubble(
        text: string,
        type: 'default' | 'success' | 'error' = 'default',
        autoHideDuration = 3000,
        completionTransactionId: string | null = null,
    ): void {
        if (!latestPrefsRef.current.enableStatusBubble) return;

        if (statusTimeoutRef.current !== null) {
            clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = null;
        }
        statusCompletionTransactionIdRef.current = completionTransactionId;
        const next = { visible: true, text, type };
        statusBubbleRef.current = next;
        setStatusBubble(next);

        if (autoHideDuration > 0) {
            const timeoutId = setTimeout(() => {
                if (statusTimeoutRef.current !== timeoutId) return;
                statusTimeoutRef.current = null;
                if (statusCompletionTransactionIdRef.current === completionTransactionId) {
                    statusCompletionTransactionIdRef.current = null;
                }
                const hidden = { ...statusBubbleRef.current, visible: false };
                statusBubbleRef.current = hidden;
                setStatusBubble(hidden);
            }, autoHideDuration);
            statusTimeoutRef.current = timeoutId;
        }
    }

    // Analyze-flow bubble protection (fixes SAP/clipboard notifications
    // clobbering the "analyzing" or "Analysis Complete" bubble). The status
    // bubble is a single-slot last-write-wins state; without a guard, the
    // SAP textarea watcher's 3-second poll can fire DH_NOTIFICATION at any
    // moment and wipe critical analyze-flow feedback. We mirror
    // `isAnalyzing` into a ref (closure-stable for the listener useEffect)
    // and remember when the analyze last completed; SAP/clipboard bubbles
    // are silenced during the analyze and for a short tail window after.
    // The visual signal SAP cares about (red textarea outline + pulse +
    // scrollIntoView in legacyFeatures.ts::highlight) is unaffected — only
    // the redundant bubble notification is suppressed.
    const isAnalyzingRef = React.useRef(false);
    const localAnalyzeRequestIdRef = React.useRef<string | null>(null);
    const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgressState | null>(null);
    const analyzeProgressRef = useRef<AnalyzeProgressState | null>(null);
    const progressPageRef = useRef<{ request: AnalyzeRequestSnapshot; acceptedGeneration: number } | null>(null);
    const menuOpenRef = useRef(isOpen);
    menuOpenRef.current = isOpen;
    function updateAnalyzeProgress(action: AnalyzeProgressAction): boolean {
        const previous = analyzeProgressRef.current;
        const next = analyzeProgressReducer(previous, action);
        if (next === previous) return false;
        analyzeProgressRef.current = next;
        setAnalyzeProgress(next);
        return true;
    }
    const localAnalyzePageRef = React.useRef<{
        request: AnalyzeRequestSnapshot;
        acceptedGeneration: number;
    } | null>(null);
    const postRunScanOwnerRef = React.useRef<string | null>(null);
    const terminalRevalidationRef = React.useRef<TerminalRevalidationCoordinator | null>(null);
    const deferredLocalHydrationRef = React.useRef<{
        requestId: string;
        caseNumber: string;
    } | null>(null);
    const analyzeOriginRef = React.useRef<AnalyzeRequestSnapshot | null>(null);
    const identityChangedDuringAnalyzeRef = React.useRef(false);
    const initialScanStartedRef = React.useRef(false);
    const scheduledAutoAnalyzeRef = React.useRef<{
        context: NonNullable<typeof editableAnalyzeContextRef.current>;
        timeoutId: ReturnType<typeof setTimeout>;
    } | null>(null);
    const analyzeSafetyTimerRef = React.useRef<{
        requestId: string;
        timeoutId: ReturnType<typeof setTimeout>;
    } | null>(null);
    const analyzeFlowEndedAtRef = React.useRef(0);
    const ANALYZE_BUBBLE_PROTECTION_MS = 6000;
    
    // Concurrency Control
    const latestRequestId = React.useRef<string | null>(null);

    // Track whether the user has manually edited the context textarea
    // This prevents background scans and re-opens from overwriting user edits
    const isUserEdited = React.useRef(false);
    const contextEditRevisionRef = React.useRef(0);

    // Track which case IDs have already fired "Case Analyzed" this session
    // to deduplicate: 3 analyses of the same case = 1 "Case Analyzed" event.
    const reportedCases = React.useRef<Set<string>>(new Set());

    // C2a+: re-hydrate persisted analysis result on mount and on case change.
    // See docs/specs/analysis-result-persistence.md
    // The hook reads dh_last_analysis / dh_pending_analysis /
    // dh_seen_analysis from
    // chrome.storage.local and tells us whether to auto-open the popover
    // (matching unseen result inside STALE_WINDOW_MS) or show the spinner
    // (matching pending marker inside MAX_PENDING_DISPLAY_AGE_MS).
    const hydration = useAnalysisHydration(hydrationCaseNumber);
    const hydratedPendingRef = React.useRef(hydration.pending);

    const reconcileVisibleAnalyzingState = () => {
        const activeRequestId = localAnalyzeRequestIdRef.current;
        const localPage = localAnalyzePageRef.current;
        const currentIdentity = currentPageIdentityRef.current;
        const localVisible = Boolean(
            activeRequestId
            && localPage?.request.requestId === activeRequestId
            && currentIdentity !== null
            && requestMatchesPage(localPage.request, currentIdentity)
            && !hasPendingPageScanNewerThan(localPage.acceptedGeneration),
        );
        const hydratedPending = hydratedPendingRef.current;
        const acceptedGeneration = acceptedContextSnapshotRef.current?.generation ?? -1;
        const hydratedVisible = Boolean(
            hydratedPending
            && hydratedPending.caseNumber === hydrationCaseNumberRef.current
            && !hasPendingPageScanNewerThan(acceptedGeneration),
        );
        setIsAnalyzing(localVisible || hydratedVisible);
        isAnalyzingRef.current = Boolean(activeRequestId);
    };

    // When the hook surfaces a persisted result and no popover is open, mirror
    // it into local resultPopover state. Then acknowledge its identity so a
    // future remount doesn't re-open the same result (one-shot semantics).
    useEffect(() => {
        if (!hydration.popover) return;
        const hydrationIdentity = hydration.popover.identity;
        const hydrationRequestId = hydrationIdentity.requestId;
        const localPage = localAnalyzePageRef.current;
        const localCaseNumber = hydrationRequestId !== undefined
            && localPage !== null
            && localPage.request.requestId === hydrationRequestId
            ? localPage.request.caseNumber
            : '';
        // The SW persists before replying, so local hydration must wait for
        // this request's terminal page revalidation path.
        const matchesActiveLocalAnalyze = hydrationRequestId !== undefined
            && (
                hydrationRequestId === localAnalyzeRequestIdRef.current
                || hydrationRequestId === postRunScanOwnerRef.current
                || hydrationRequestId === analyzeOriginRef.current?.requestId
            )
            && (
                !localCaseNumber
                || localCaseNumber === hydrationIdentity.caseNumber
            );
        if (matchesActiveLocalAnalyze) {
            deferredLocalHydrationRef.current = {
                requestId: hydrationRequestId,
                caseNumber: hydrationIdentity.caseNumber,
            };
            return;
        }
        if (
            hydrationRequestId !== undefined
            && deferredLocalHydrationRef.current?.requestId === hydrationRequestId
            && deferredLocalHydrationRef.current.caseNumber === hydrationIdentity.caseNumber
        ) return;
        const acceptedGeneration = acceptedContextSnapshotRef.current?.generation ?? -1;
        if (hasPendingPageScanNewerThan(acceptedGeneration)) return;
        if (hydration.popover.identity.caseNumber !== currentCaseNumberRef.current) return;
        if (resultPopover.isOpen) return;
        popoverIsAnalyze.current = true;
        setResultPopover({
            isOpen: true,
            title: hydration.popover.title,
            content: hydration.popover.content,
            errorCode: hydration.popover.errorCode,
            attachmentNotice: hydration.popover.attachmentNotice,
            path: hydration.popover.savedTo,
            duration: hydration.popover.durationSec === undefined
                ? undefined
                : hydration.popover.durationSec.toFixed(1) + 's',
            identity: hydration.popover.identity,
        });
        // Fire-and-forget; dismissPopover only writes the separate seen
        // identity and closes the hook's internal state - both safe to ignore.
        void hydration.dismissPopover(hydration.popover.identity);
    }, [
        hydration.popover,
        resultPopover.isOpen,
        hydration,
        hydrationCaseNumber,
        pendingPageScanCount,
    ]);

    // Hydrated pending is a mirror, while a locally-started request owns its
    // own in-flight flag. A disappearing/expired pending marker can clear the
    // hydrated spinner but must never clear an active local Analyze.
    useEffect(() => {
        hydratedPendingRef.current = hydration.pending;
        reconcileVisibleAnalyzingState();
    }, [
        hydration.pending?.requestId,
        hydration.pending?.caseNumber,
        hydration.pending?.startTime,
        pendingPageScanCount,
    ]);

    useEffect(() => () => {
        if (analyzeSafetyTimerRef.current) {
            clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
        }
        const coordinator = terminalRevalidationRef.current;
        if (coordinator) {
            coordinator.closed = true;
            coordinator.changeSignal.resolve();
            terminalRevalidationRef.current = null;
        }
        if (statusTimeoutRef.current !== null) {
            clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = null;
        }
        statusCompletionTransactionIdRef.current = null;
    }, []);

    // The Service Worker owns update storage, Host actions, and reloads. FAB
    // only hydrates and renders its projected state.
    useEffect(() => {
        let mounted = true;
        let liveProjectionSeen = false;
        const applyProjection = (value: unknown, announce: boolean) => {
            const next = projectedUpdateState(value);
            if (!mounted || !next) return;
            const nextCompletionTransactionId = next.kind === 'complete'
                ? next.transactionId
                : null;
            if (
                statusCompletionTransactionIdRef.current !== null
                && statusCompletionTransactionIdRef.current !== nextCompletionTransactionId
            ) {
                hideStatusBubble();
            }
            setUpdateState(next);
            if (!announce) return;
            if (next.kind === 'available') {
                showStatusBubble(
                    `${latestTranslationRef.current('updateAvailable')}: ${next.update.version}`,
                    'success',
                    10000,
                );
            } else if (next.kind === 'complete') {
                showStatusBubble(
                    latestTranslationRef.current(
                        next.outcome === 'committed' ? 'updateComplete' : 'updateRolledBack',
                    ),
                    next.outcome === 'committed' ? 'success' : 'error',
                    10000,
                    next.transactionId,
                );
            } else {
                const errorCode = projectedUpdateError(next);
                if (errorCode) {
                    showStatusBubble(
                        updateErrorText(errorCode, latestTranslationRef.current),
                        'error',
                        10000,
                    );
                }
            }
        };
        const handleUpdateState = (message: unknown) => {
            const type = ownDataProperty(message, 'type');
            if (type.kind === 'value' && type.value === 'DH_UPDATE_STATE') {
                const next = projectedUpdateState(message);
                if (next) {
                    liveProjectionSeen = true;
                    applyProjection({ state: next }, true);
                }
            }
        };

        chrome.runtime.onMessage.addListener(handleUpdateState);
        void chrome.runtime.sendMessage({ type: 'DH_UPDATE_GET_STATE' })
            .then(response => {
                const handled = ownDataProperty(response, 'handled');
                if (
                    handled.kind === 'value'
                    && handled.value === true
                    && !liveProjectionSeen
                ) {
                    applyProjection(response, false);
                } else if (handled.kind !== 'value' || handled.value !== true) {
                    showStatusBubble(t('updateRequestFailed'), 'error', 5000);
                }
            })
            .catch(() => undefined);

        return () => {
            mounted = false;
            chrome.runtime.onMessage.removeListener(handleUpdateState);
        };
    }, []);

    // Progress Listener Effect
    useEffect(() => {
        const handleProgress = ({ requestId, payload }: AnalyzeProgressMessage) => {
            if (latestRequestId.current !== requestId
                || localAnalyzeRequestIdRef.current !== requestId) return;
            // Keep ready/tool completion events even while a page scan hides the UI.
            if (!updateAnalyzeProgress({ type: 'progress', requestId, event: payload })) return;
            const localPage = localAnalyzePageRef.current;
            const requestOwnsVisiblePage = Boolean(
                localPage !== null
                && localPage.request.requestId === requestId
                && requestMatchesPage(
                    localPage.request,
                    currentPageIdentityRef.current,
                )
                && !hasPendingPageScanNewerThan(localPage.acceptedGeneration),
            );
            
            if (requestOwnsVisiblePage && !menuOpenRef.current) {
                showStatusBubble(analyzeProgressLabel(analyzeProgressRef.current?.current ?? null, latestTranslationRef.current), 'default', 0);
            }
        };

        const handleUpdateError = (event: Event) => {
            const candidate = ownDataProperty(
                (event as CustomEvent<unknown>).detail,
                'error',
            );
            const error = safeErrorText([
                candidate.kind === 'value' ? candidate.value : undefined,
            ], latestTranslationRef.current('updateCheckFailed'));
            if (!latestPrefsRef.current.enableStatusBubble) return;
            showStatusBubble(error, 'error', 5000);
        };

        const handleNotification = (e: any) => {
            const { text, type } = e.detail;
            // Don't override analyze-flow bubble (see isAnalyzingRef comment).
            const now = Date.now();
            if (isAnalyzingRef.current || (now - analyzeFlowEndedAtRef.current) < ANALYZE_BUBBLE_PROTECTION_MS) {
                console.log('[DH] Suppressed legacy notification during analyze flow:', text);
                return;
            }
            showStatusBubble(text, type || 'default', 5000);
        };
        
        const handleToast = (e: any) => {
            // Same suppression rationale as handleNotification.
            const now = Date.now();
            if (isAnalyzingRef.current || (now - analyzeFlowEndedAtRef.current) < ANALYZE_BUBBLE_PROTECTION_MS) {
                console.log('[DH] Suppressed legacy toast during analyze flow:', e.detail.text);
                return;
            }
            showStatusBubble(e.detail.text, 'default', 3000);
        };

        const unsubscribeProgress = subscribeAnalyzeProgress(handleProgress);
        window.addEventListener('dh-update-error', handleUpdateError);
        window.addEventListener('DH_NOTIFICATION', handleNotification);
        window.addEventListener('DH_TOAST', handleToast);
        
        return () => {
            unsubscribeProgress();
            window.removeEventListener('dh-update-error', handleUpdateError);
            window.removeEventListener('DH_NOTIFICATION', handleNotification);
            window.removeEventListener('DH_TOAST', handleToast);
        };
    }, []);


    // C2a+: surface an analyze failure as a persistent ResultPopover (the
    // prior pattern of an inline error string + 4-second bubble was invisible
    // during long analysis runs — user walks away, bubble auto-hides, no
    // record). The bubble is kept as a brief visual flash; the popover
    // carries the full message and stays until dismissed.
    //
    const showAnalysisError = (
        fallback: string,
        errorCode?: string,
        identity?: LastAnalysisIdentity,
        durabilityWarning?: string,
        attachmentNotice?: string,
    ) => {
        popoverIsAnalyze.current = true;
        setResultPopover({
            isOpen: true,
            title: `❌ ${t('analysisFailed')}`,
            content: fallback,
            errorCode,
            identity,
            durabilityWarning,
            attachmentNotice,
        });
        showStatusBubble(t('analysisFailed'), 'error', 4000);
    };
    
    // UI States
    const [isContextExpanded, setIsContextExpanded] = useState(false);
    // Track if auto-analysis has been attempted for the current data to prevent loops/timing issues
    const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

    function hasPendingPageScanNewerThan(generation: number): boolean {
        for (const pendingGeneration of pendingPageScanGenerationsRef.current) {
            if (pendingGeneration > generation) return true;
        }
        return false;
    }

    function runPageScan<T>(
        failureMessage: string,
        consume: (scan: { generation: number; fresh: unknown }) => T | Promise<T>,
        onStarted?: (generation: number, completion: Promise<T>) => void,
    ): Promise<T> {
        const generation = ++pageScanGenerationRef.current;
        logCreatedOn('scan', 'started', generation);
        pendingPageScanGenerationsRef.current.add(generation);
        setPendingPageScanCount(pendingPageScanGenerationsRef.current.size);
        const localPage = localAnalyzePageRef.current;
        const scheduledAuto = scheduledAutoAnalyzeRef.current;
        if (
            (localPage && generation > localPage.acceptedGeneration)
            || (
                scheduledAuto
                && generation > scheduledAuto.context.accepted.generation
            )
        ) {
            hideStatusBubble();
        }
        reconcileVisibleAnalyzingState();
        const completion = (async () => {
            try {
                let fresh: unknown = null;
                try {
                    fresh = await PageReader.scanForErrors(generation);
                } catch {
                    logCreatedOn('scan', 'scan_failed', generation);
                    console.warn(failureMessage);
                }
                logCreatedOn('scan', fresh ? 'scan_returned' : 'missing', generation);
                return await consume({ generation, fresh });
            } finally {
                pendingPageScanGenerationsRef.current.delete(generation);
                setPendingPageScanCount(pendingPageScanGenerationsRef.current.size);
                reconcileVisibleAnalyzingState();
            }
        })();
        onStarted?.(generation, completion);
        return completion;
    }

    function applyIdentityScan(fresh: unknown): void {
        const parsed = parsePageIdentitySnapshot(fresh);
        if (!parsed) return;
        const { identity, caseNumber } = parsed;
        const wasInitialized = currentPageIdentityInitializedRef.current;
        const identityChanged = identity !== currentPageIdentityRef.current;
        const caseChanged = caseNumber !== currentCaseNumberRef.current;
        if (
            deferredLocalHydrationRef.current
            && caseNumber !== deferredLocalHydrationRef.current.caseNumber
        ) {
            deferredLocalHydrationRef.current = null;
        }
        currentPageIdentityInitializedRef.current = true;
        if (identityChanged || caseChanged) {
            // Identity authority must expire even when the editable preview is protected.
            acceptedContextSnapshotRef.current = null;
            customerEnrichmentEpochRef.current = null;
            customerEnrichmentBindingRef.current = null;
            setCustomerEnrichment(null);
            if (
                localAnalyzeRequestIdRef.current
                && analyzeOriginRef.current?.requestId
                    === localAnalyzeRequestIdRef.current
                && identity !== analyzeOriginRef.current.pageIdentity
            ) {
                identityChangedDuringAnalyzeRef.current = true;
            }
            currentPageIdentityRef.current = identity;
            currentCaseNumberRef.current = caseNumber;
            hydrationCaseNumberRef.current = caseNumber;
            setHydrationCaseNumber(caseNumber);
            if (identityChanged && wasInitialized) {
                setResultPopover(previous => ({ ...previous, isOpen: false }));
                hideStatusBubble();
                setIsOpen(false);
            }
            reconcileVisibleAnalyzingState();
        }
    }

    function applyFullScan(
        fresh: unknown,
        completedOrigin: PageIdentity | null = null,
        isPostRunScan = false,
        generation = pageScanGenerationRef.current,
        forceReplace = false,
    ): typeof acceptedContextSnapshotRef.current {
        if (hasPendingPageScanNewerThan(generation)) {
            logCreatedOn('ui', 'stale_scan', generation);
            return null;
        }
        const plain = parseScrapedDataSnapshot(fresh);
        if (!plain) { logCreatedOn('ui', 'invalid_snapshot', generation); return null; }
        const parsed = parsePageIdentitySnapshot(plain);
        if (!parsed) { logCreatedOn('ui', 'invalid_snapshot', generation); return null; }
        const nextIdentity = parsed.identity;
        const previousContextIdentity = editableContextIdentityRef.current;
        const previousCustomer = editableAnalyzeContextRef.current?.data.customerName;
        // A temporarily unmounted lookup is unknown, not a same-case clear.
        if (nextIdentity === previousContextIdentity && !plain.customerName && previousCustomer) {
            plain.customerName = previousCustomer;
        }
        const accepted = { generation, identity: nextIdentity, data: plain };
        applyIdentityScan(plain);
        acceptedContextSnapshotRef.current = accepted;
        let epoch = customerEnrichmentEpochRef.current;
        if (nextIdentity && /^\d{16}(?:\d{3})?$/.test(parsed.caseNumber)) {
            if (!epoch || epoch.identity !== nextIdentity || epoch.caseNumber !== parsed.caseNumber || forceReplace) {
                epoch = { identity: nextIdentity, caseNumber: parsed.caseNumber, deadline: Date.now() + CUSTOMER_ENRICHMENT_WINDOW_MS };
                customerEnrichmentEpochRef.current = epoch;
            }
            customerEnrichmentBindingRef.current = { epoch, accepted, generation };
            setCustomerEnrichment(!plain.customerName && Date.now() < epoch.deadline ? customerEnrichmentBindingRef.current : null);
        } else {
            customerEnrichmentBindingRef.current = null;
            setCustomerEnrichment(null);
        }
        const replaceAfterAnalyze = isPostRunScan && (
            identityChangedDuringAnalyzeRef.current
            || nextIdentity !== completedOrigin
        );
        if (
            forceReplace
            || replaceAfterAnalyze
            || nextIdentity !== previousContextIdentity
            || !editableAnalyzeContextRef.current
        ) {
            isUserEdited.current = false;
            setHasAutoAnalyzed(false);
            editableContextIdentityRef.current = nextIdentity;
            editableAnalyzeContextRef.current = { accepted, data: plain };
            setScrapedData(plain);
            logCreatedOn('ui', 'applied', generation);
            return accepted;
        }
        const editableContext = editableAnalyzeContextRef.current;
        editableContext.accepted = accepted;
        if (isUserEdited.current) {
            logCreatedOn('ui', 'edited_context', generation);
            return accepted;
        }
        editableContextIdentityRef.current = nextIdentity;
        editableContext.data = plain;
        setScrapedData(plain);
        logCreatedOn('ui', 'applied', generation);
        return accepted;
    }

    function acceptedSnapshotIsCurrent(
        snapshot: NonNullable<typeof acceptedContextSnapshotRef.current>,
    ): boolean {
        return acceptedContextSnapshotRef.current === snapshot
            && snapshot.identity === currentPageIdentityRef.current
            && !hasPendingPageScanNewerThan(snapshot.generation);
    }

    function editableAnalyzeContextIsCurrent(
        context: NonNullable<typeof editableAnalyzeContextRef.current>,
    ): boolean {
        return editableAnalyzeContextRef.current === context
            && acceptedSnapshotIsCurrent(context.accepted);
    }

    function enrichCustomer({ epoch, accepted, generation }: CustomerEnrichmentBinding): boolean {
        const context = editableAnalyzeContextRef.current;
        if (isUserEdited.current || localAnalyzeRequestIdRef.current
            || hydratedPendingRef.current
            || customerEnrichmentEpochRef.current !== epoch
            || pageScanGenerationRef.current !== generation
            || !acceptedSnapshotIsCurrent(accepted)
            || !context || context.accepted !== accepted
            || editableContextIdentityRef.current !== epoch.identity
            || currentCaseNumberRef.current !== epoch.caseNumber
            || context.data.caseNumber !== epoch.caseNumber || context.data.customerName
            || PageReader.readLiveRecordNumber(false) !== epoch.caseNumber) return false;
        const customerName = PageReader.readCustomerName(epoch.caseNumber);
        if (!customerName) return false;
        // Replace only customer metadata; never mutate a captured invocation or edited text.
        const data = { ...context.data, customerName };
        const enriched = { ...accepted, data: { ...accepted.data, customerName } };
        acceptedContextSnapshotRef.current = enriched;
        const enrichedContext = { accepted: enriched, data };
        editableAnalyzeContextRef.current = enrichedContext;
        if (scheduledAutoAnalyzeRef.current?.context === context) {
            clearTimeout(scheduledAutoAnalyzeRef.current.timeoutId);
            scheduledAutoAnalyzeRef.current = null;
            scheduleAutoAnalyze(enrichedContext);
        }
        setScrapedData(data);
        return true;
    }

    useEffect(() => {
        if (!customerEnrichment) return;
        const { accepted, epoch, generation } = customerEnrichment;
        const { caseNumber, deadline } = epoch;
        let stopped = false;
        let observed: Element | null = null;
        const stop = () => {
            stopped = true;
            clearInterval(timer);
            observer.disconnect();
        };
        const read = () => {
            if (stopped) return;
            const context = editableAnalyzeContextRef.current;
            if (Date.now() >= deadline || isUserEdited.current
                || customerEnrichmentEpochRef.current !== epoch
                || acceptedContextSnapshotRef.current !== accepted
                || pageScanGenerationRef.current !== generation
                || currentPageIdentityRef.current !== accepted.identity
                || !context || context.accepted !== accepted
                || context.data.caseNumber !== caseNumber || context.data.customerName
                || PageReader.readLiveRecordNumber(false) !== caseNumber) {
                stop();
                return;
            }
            // Poll discovers/replaces the lookup; no document-wide enrichment observer.
            const field = document.querySelector(CUSTOMER_LOOKUP_SELECTOR);
            if (field !== observed) {
                observer.disconnect();
                observed = field;
                if (field) observer.observe(field, { attributes: true, characterData: true, childList: true, subtree: true });
            }
            if (enrichCustomer(customerEnrichment)) stop();
        };
        const observer = new MutationObserver(read);
        const timer = setInterval(read, CUSTOMER_ENRICHMENT_POLL_MS);
        read();
        return stop;
    }, [customerEnrichment]);

    useEffect(() => {
        const context = editableAnalyzeContextRef.current;
        const epoch = customerEnrichmentEpochRef.current;
        if (!isOpen || !context || !epoch || context.data.customerName
            || isUserEdited.current || localAnalyzeRequestIdRef.current || hydration.pending) return;
        const accepted = context.accepted;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let deadline = 0;
        const check = () => {
            timer = undefined;
            if (Date.now() >= deadline || isUserEdited.current
                || localAnalyzeRequestIdRef.current || hydratedPendingRef.current
                || customerEnrichmentEpochRef.current !== epoch
                || acceptedContextSnapshotRef.current !== accepted
                || editableAnalyzeContextRef.current !== context
                || currentPageIdentityRef.current !== epoch.identity
                || currentCaseNumberRef.current !== epoch.caseNumber
                || PageReader.readLiveRecordNumber(false) !== epoch.caseNumber) return;
            if (hasPendingPageScanNewerThan(accepted.generation)) {
                timer = setTimeout(check, Math.min(CUSTOMER_ENRICHMENT_POLL_MS, deadline - Date.now()));
                return;
            }
            const binding = customerEnrichmentBindingRef.current;
            if (binding?.accepted === accepted && binding.epoch === epoch) enrichCustomer(binding);
        };
        const onScroll = () => {
            clearTimeout(timer);
            deadline = Date.now() + 1000;
            timer = setTimeout(check, 200);
        };
        // Internal D365 panes need capture. Scroll requests one check, not a new polling epoch.
        document.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => {
            clearTimeout(timer);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [isOpen, scrapedData, isAnalyzing, hydration.pending, hydrationCaseNumber]);

    function requestOwnsVisiblePage(
        request: AnalyzeRequestSnapshot,
        acceptedGeneration: number,
    ): boolean {
        return requestMatchesPage(request, currentPageIdentityRef.current)
            && !hasPendingPageScanNewerThan(acceptedGeneration);
    }

    function runTerminalRevalidationParticipant(
        requestId: string,
        failureMessage: string,
        forceReplace = false,
    ): Promise<TerminalRevalidationResult> {
        const editRevision = contextEditRevisionRef.current;
        let containedCompletion: Promise<TerminalRevalidationResult> | null = null;
        const rawCompletion = runPageScan(
            failureMessage,
            scan => {
                const coordinator = terminalRevalidationRef.current;
                if (
                    !coordinator
                    || coordinator.requestId !== requestId
                    || analyzeOriginRef.current?.requestId !== requestId
                    || scan.generation !== pageScanGenerationRef.current
                    || !scan.fresh
                ) {
                    logCreatedOn('ui', !scan.fresh ? 'missing'
                        : scan.generation !== pageScanGenerationRef.current ? 'stale_scan'
                        : 'ownership_rejected', scan.generation);
                    return { generation: scan.generation, accepted: null };
                }
                return {
                    generation: scan.generation,
                    accepted: applyFullScan(
                        scan.fresh,
                        coordinator.origin,
                        true,
                        scan.generation,
                        forceReplace && contextEditRevisionRef.current === editRevision,
                    ),
                };
            },
            (generation, completion) => {
                const coordinator = terminalRevalidationRef.current;
                const contained = completion.catch(() => ({
                    generation,
                    accepted: null,
                }));
                containedCompletion = contained;
                if (
                    !coordinator
                    || coordinator.requestId !== requestId
                    || coordinator.closed
                ) return;
                const previousSignal = coordinator.changeSignal;
                if (coordinator.latestGeneration >= 0) {
                    pendingPageScanGenerationsRef.current.delete(
                        coordinator.latestGeneration,
                    );
                    setPendingPageScanCount(
                        pendingPageScanGenerationsRef.current.size,
                    );
                }
                coordinator.latestGeneration = generation;
                coordinator.latestCompletion = contained;
                coordinator.version += 1;
                coordinator.changeSignal = createTerminalRevalidationChangeSignal();
                previousSignal.resolve();
            },
        );
        return containedCompletion ?? rawCompletion.catch(() => ({
            generation: pageScanGenerationRef.current,
            accepted: null,
        }));
    }

    async function awaitLatestTerminalRevalidation(
        requestId: string,
    ): Promise<AcceptedContextSnapshot | null> {
        while (true) {
            const coordinator = terminalRevalidationRef.current;
            if (!coordinator || coordinator.requestId !== requestId) return null;
            const generation = coordinator.latestGeneration;
            const completion = coordinator.latestCompletion;
            if (!completion) return null;
            const version = coordinator.version;
            const changeSignal = coordinator.changeSignal.promise;
            const settled = await Promise.race([
                completion.then(result => ({ kind: 'completed' as const, result })),
                changeSignal.then(() => ({ kind: 'changed' as const })),
            ]);
            if (settled.kind === 'changed') continue;

            const latest = terminalRevalidationRef.current;
            if (
                !latest
                || latest.requestId !== requestId
                || latest.closed
            ) return null;
            if (
                latest.version !== version
                || latest.latestGeneration !== generation
                || latest.latestCompletion !== completion
            ) continue;
            return settled.result.generation === generation
                ? settled.result.accepted
                : null;
        }
    }

    function activeTerminalRevalidationRequestId(): string | null {
        const coordinator = terminalRevalidationRef.current;
        return coordinator
            && !coordinator.closed
            && localAnalyzeRequestIdRef.current === coordinator.requestId
            ? coordinator.requestId
            : null;
    }

    function closeTerminalRevalidation(requestId: string): void {
        const coordinator = terminalRevalidationRef.current;
        if (!coordinator || coordinator.requestId !== requestId) return;
        coordinator.closed = true;
        coordinator.changeSignal.resolve();
        terminalRevalidationRef.current = null;
    }

    // Duration Logic
    const [lastDuration, setLastDuration] = useState<string | null>(null);

    // Menu Logic
    const {
        currentItems,
        canGoBack,
        navigateTo,
        navigateBack,
        bookmarkLoadIssue,
    } = useMenuLogic();
    const bookmarkLoadWarning = bookmarkLoadIssue === 'bookmark_storage_read_failed'
        ? t('bookmarkStorageReadFailed')
        : bookmarkLoadIssue === 'bookmark_storage_invalid'
            ? t('bookmarkStorageInvalid')
            : bookmarkLoadIssue === 'bookmark_defaults_unreadable'
                ? t('bookmarkDefaultsUnreadable')
                : '';

    // Helper to check if text is already a formatted template
    const isFormattedTemplate = (text: string) => {
        return text.startsWith('## Ticket ID') || text.startsWith('## Case Number');
    };

    // Helper to construct the standardized context template
    const constructTemplate = (data: ScrapedData) => {
        // If the errorText is ALREADY a template (and we are forced to reconstruct for some reason),
        // we should try to preserve it? 
        // Actually, this function is usually called when we *don't* have a template yet,
        // OR when we need to generate one from raw data.
        
        const parts = [
            `## Case Number\n\n${data.caseNumber || ''}`,
            `## Case Title\n\n${data.ticketTitle || ''}`,
            `## Created On\n\n${data.createdOn || ''}`,
            `## Customer Name\n\n${data.customerName || ''}`,
            `## Severity\n\n${data.severity || ''}`,
            `## Status Reason\n\n${data.statusReason || ''}`,
            `## SAP\n\n${data.productCategory || ''}`,
            // Be careful not to double-include if description IS the errorText
            `## Description\n\n${data.description || ((data.errorText && !isFormattedTemplate(data.errorText)) ? data.errorText : '')}`,
            formatIrSlaSnapshot(data),
        ];

        return parts.join('\n\n');
    };

    const scheduleAutoAnalyze = (
        context: NonNullable<typeof editableAnalyzeContextRef.current>,
    ) => {
        if (scheduledAutoAnalyzeRef.current) {
            clearTimeout(scheduledAutoAnalyzeRef.current.timeoutId);
        }
        const timeoutId = setTimeout(() => {
            if (scheduledAutoAnalyzeRef.current?.timeoutId !== timeoutId) return;
            scheduledAutoAnalyzeRef.current = null;
            if (localAnalyzeRequestIdRef.current || hydratedPendingRef.current) return;
            if (!editableAnalyzeContextIsCurrent(context)) {
                if (editableAnalyzeContextRef.current === context) {
                    setHasAutoAnalyzed(false);
                    hideStatusBubble('default');
                }
                return;
            }
            void handleAnalyze(context);
        }, 100);
        scheduledAutoAnalyzeRef.current = { context, timeoutId };
    };

    useEffect(() => () => {
        if (scheduledAutoAnalyzeRef.current) {
            clearTimeout(scheduledAutoAnalyzeRef.current.timeoutId);
            scheduledAutoAnalyzeRef.current = null;
        }
    }, []);

    // Auto-scan when opening
    useEffect(() => {
        // Wrapper for async scan
        const doScan = async () => {
             if (!initialScanStartedRef.current) {
                 initialScanStartedRef.current = true;
                 // Initial scan on mount (even if closed) to support auto-analyze without opening
                 await runPageScan('[DH] Page scan failed', initialScan => {
                     if (
                         initialScan.generation !== pageScanGenerationRef.current
                         || !initialScan.fresh
                     ) {
                         logCreatedOn('ui', initialScan.fresh ? 'stale_scan' : 'missing', initialScan.generation);
                         return;
                     }
                     if (localAnalyzeRequestIdRef.current) {
                         logCreatedOn('ui', 'identity_only', initialScan.generation);
                         applyIdentityScan(initialScan.fresh);
                     }
                     else applyFullScan(initialScan.fresh, null, false, initialScan.generation);
                 });
             }

             if (isOpen) {
                 const terminalRequestId = activeTerminalRevalidationRequestId();
                 if (terminalRequestId) {
                     await runTerminalRevalidationParticipant(
                         terminalRequestId,
                         '[DH] Page scan failed',
                     );
                     return;
                 }
                 await runPageScan('[DH] Page scan failed', openScan => {
                     if (
                         openScan.generation !== pageScanGenerationRef.current
                         || !openScan.fresh
                     ) {
                         logCreatedOn('ui', openScan.fresh ? 'stale_scan' : 'missing', openScan.generation);
                         return;
                     }
                     if (localAnalyzeRequestIdRef.current) {
                         logCreatedOn('ui', 'identity_only', openScan.generation);
                         applyIdentityScan(openScan.fresh);
                     }
                     else applyFullScan(openScan.fresh, null, false, openScan.generation);
                 });
             }
        };
        
        doScan();
    }, [isOpen]); 

    // Listen for Context Menu triggers (Right-click -> Analyze Error)
    useEffect(() => {
        const handleTriggerAnalyze = async (e: any) => {
            const selection = ownDataProperty(e.detail, 'selectionText');
            const selectionText = selection.kind === 'value'
                && typeof selection.value === 'string'
                ? selection.value
                : undefined;
            const analyzeInvocation = readAnalyzeInvocation(e.detail);
            console.log("[DH] Context Menu Triggered");
            let pageSnapshot = acceptedContextSnapshotRef.current;

            if (selectionText) {
                if (pageSnapshot && !acceptedSnapshotIsCurrent(pageSnapshot)) return;
                // We need to merge the selection with the current page context (Case Number, Product, etc.)
                // so the analysis file is saved in the correct folder.
                if (!pageSnapshot) {
                    const terminalRequestId = activeTerminalRevalidationRequestId();
                    if (terminalRequestId) {
                        pageSnapshot = (
                            await runTerminalRevalidationParticipant(
                                terminalRequestId,
                                '[DH] Page scan failed',
                            )
                        ).accepted;
                    } else {
                        pageSnapshot = await runPageScan(
                            '[DH] Page scan failed',
                            scan => {
                                 if (
                                     scan.generation !== pageScanGenerationRef.current
                                     || !scan.fresh
                                 ) {
                                     logCreatedOn('ui', scan.fresh ? 'stale_scan' : 'missing', scan.generation);
                                     return null;
                                 }
                                return applyFullScan(
                                    scan.fresh,
                                    null,
                                    false,
                                    scan.generation,
                                );
                            },
                        );
                    }
                }
                if (!pageSnapshot || !acceptedSnapshotIsCurrent(pageSnapshot)) return;

                // Construct the data object for analysis
                const dataToAnalyze: ScrapedData = {
                    ...pageSnapshot.data,
                    errorText: selectionText, // The selection becomes the primary text to analyze
                    source: "Context Menu Selection"
                };

                // FALLBACK: If Case Number was not found on the page, try to find it in the selected text
                if (!dataToAnalyze.caseNumber) {
                     // Regex: 16 digits OR standard patterns like CAS-..., INC-..., WO-...
                     const idRegex = /(\b\d{16}\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;
                     const match = selectionText.match(idRegex);
                     if (match) {
                         console.log("[DH] Extracted Case Number from Selection:", match[0]);
                         dataToAnalyze.caseNumber = match[0];
                     }
                }
                
                // Update state so the UI reflects what we are analyzing
                const analyzeContext = { accepted: pageSnapshot, data: dataToAnalyze };
                editableAnalyzeContextRef.current = analyzeContext;
                setScrapedData(dataToAnalyze);
                
                // Trigger analysis immediately
                void handleAnalyze(analyzeContext, analyzeInvocation);
            }
        };

        window.addEventListener('dh-trigger-analyze', handleTriggerAnalyze);
        return () => {
            window.removeEventListener('dh-trigger-analyze', handleTriggerAnalyze);
        };
    }, [prefs.rootPath, scrapedData]); // Dependencies keep the invocation on current prefs.

    // Optimized: Use MutationObserver + Debounce instead of fixed interval polling
    useEffect(() => {
        let debounceTimer: ReturnType<typeof setTimeout>;
        let visibilityTimer: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;

        const runScan = async () => {
            if (stopped) return;
            // 1. Performance Check: Don't scan if tab is hidden/inactive
            if (document.hidden) { logCreatedOn('scan', 'hidden'); return; }

            // console.log("[DH] Running Lazy Scan..."); 
            const terminalRequestId = activeTerminalRevalidationRequestId();
            if (terminalRequestId) {
                await runTerminalRevalidationParticipant(
                    terminalRequestId,
                    '[DH] Page scan failed',
                );
                return;
            }

            const enrichmentEpoch = customerEnrichmentEpochRef.current;
            const enrichmentAccepted = acceptedContextSnapshotRef.current;
            await runPageScan('[DH] Page scan failed', scan => {
                if (
                    scan.generation !== pageScanGenerationRef.current
                    || !scan.fresh
                ) {
                    logCreatedOn('ui', scan.fresh ? 'stale_scan' : 'missing', scan.generation);
                    return;
                }
                if (localAnalyzeRequestIdRef.current || menuOpenRef.current) {
                    logCreatedOn('ui', localAnalyzeRequestIdRef.current ? 'identity_only' : 'menu_open', scan.generation);
                    applyIdentityScan(scan.fresh);
                    if (!localAnalyzeRequestIdRef.current && enrichmentEpoch && enrichmentAccepted
                        && customerEnrichmentEpochRef.current === enrichmentEpoch
                        && acceptedContextSnapshotRef.current === enrichmentAccepted
                        && !isUserEdited.current) {
                        // Revalidate customer-only authority, never apply this full
                        // background snapshot to the open editable preview.
                        const plain = parseScrapedDataSnapshot(scan.fresh);
                        const page = plain && parsePageIdentitySnapshot(plain);
                        if (page?.identity === enrichmentEpoch.identity
                            && page.caseNumber === enrichmentEpoch.caseNumber
                            && currentPageIdentityRef.current === enrichmentEpoch.identity
                            && PageReader.readLiveRecordNumber(false) === enrichmentEpoch.caseNumber) {
                            const binding = { epoch: enrichmentEpoch, accepted: enrichmentAccepted, generation: scan.generation };
                            customerEnrichmentBindingRef.current = binding;
                            if (Date.now() < enrichmentEpoch.deadline) setCustomerEnrichment(binding);
                        }
                    }
                    return;
                }
                applyFullScan(scan.fresh, null, false, scan.generation);
            });
        };

        // MutationObserver to detect DOM changes
        // This ensures we only scan when the page *actually* changes, not every 2s
        const observer = new MutationObserver((mutations) => {
            if (stopped) return;
            // Debounce: Wait for 2000ms of "silence" after DOM activity before scanning.
            // This prevents thrashing during heavy page loads.
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runScan, 2000); 
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false, // We usually don't care about attribute changes for page navigation
            characterData: false // Don't scan on typing
        });
        
        // Also scan when tab becomes visible (in case we missed updates while hidden)
        const handleVisibilityChange = () => {
            clearTimeout(visibilityTimer);
            if (stopped) return;
            if (!document.hidden) {
                // Run immediately (or with short delay) when returning to tab
                visibilityTimer = setTimeout(runScan, 500);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            stopped = true;
            observer.disconnect();
            clearTimeout(debounceTimer);
            clearTimeout(visibilityTimer);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isOpen]);

    // Separate effect for Auto Analyze to ensure state (prefs, scrapedData) is current
    useEffect(() => {
        if (hasAutoAnalyzed) return;
        const analyzeContext = editableAnalyzeContextRef.current;
        if (!analyzeContext || !editableAnalyzeContextIsCurrent(analyzeContext)) return;
        const analyzeData = analyzeContext.data;

        // --- Auto Analyze Logic ---
        if (prefs.autoAnalyzeMode === 'always') {
            // Check if we have valid data to analyze
            // For auto-analyze, we construct the template if needed to ensure length check passes
            // We use the helper to get the "full" text that would be analyzed
            const fullText = applyCurrentUserPrompt(
                constructTemplate(analyzeData),
                prefs.userPrompt,
            );
            // Simple check: do we have enough *real* content (description/title)? 
            // The template adds headers, so length > 50 is a safe bet for "non-empty".
            // A safer check might be to look at the raw fields again.
            const rawContent = isUserEdited.current ? (analyzeData.errorText ?? '')
                : analyzeData.errorText || analyzeData.description || analyzeData.ticketTitle || "";
            
            // Check if we have at least a Ticket ID to consider it valid context for AUTO analysis.
            // We strictly require a Ticket ID here to avoid triggering on List Views (e.g. "My Open Cases").
            const hasValidIdentifier = analyzeData.caseNumber && analyzeData.caseNumber.length > 3; // Relaxed length check for "WO-1" etc
            
            // AND ensure the raw content isn't just whitespace.
            // If we have a valid Ticket ID, we can be more lenient with content length (e.g. short errors like "Access Denied").
            // If we DO NOT have a Ticket ID (unlikely given check above), we'd want strict length.
            // We'll require > 10 chars to avoid noise, but 30 was likely blocking real short errors.
            const hasEnoughContent = rawContent.trim().length > 10;

            console.log("[DH] Auto-Analyze Check:", { 
                hasValidIdentifier, 
                hasEnoughContent, 
                caseNumber: analyzeData.caseNumber,
                contentLength: rawContent.trim().length 
            });

            if (hasValidIdentifier && hasEnoughContent) { 
                    setHasAutoAnalyzed(true); // Mark as handled immediately to prevent double-fire
                    showStatusBubble(t('analyzing'), 'default', 0); // Show analyzing status persistently until done
                    scheduleAutoAnalyze(analyzeContext);
            }
        } else if (prefs.autoAnalyzeMode === 'critical') {
            // Critical criteria: Sev 1 OR A, AND Status Reason "Initial contact pending"
            const isSevCritical = analyzeData.severity?.includes('1') || analyzeData.severity?.toUpperCase().includes('A');
            const isInitialPending = analyzeData.statusReason?.toLowerCase().includes('initial contact pending');
            
            const rawContent = isUserEdited.current ? (analyzeData.errorText ?? '')
                : analyzeData.errorText || analyzeData.description || analyzeData.ticketTitle || "";
            
            // Critical Mode: Same strict check (Case Number required)
            const hasValidIdentifier = analyzeData.caseNumber && analyzeData.caseNumber.length > 5;

            if (isSevCritical && isInitialPending && hasValidIdentifier && rawContent.length > 20) {
                setHasAutoAnalyzed(true);
                showStatusBubble(t('analyzing'), 'default', 0);
                scheduleAutoAnalyze(analyzeContext);
            }
        } else if (prefs.autoAnalyzeMode === 'new_cases') {
             // New Cases criteria: Status Reason "Initial contact pending" (regardless of severity)
             const isInitialPending = analyzeData.statusReason?.toLowerCase().includes('initial contact pending');
             
             const rawContent = isUserEdited.current ? (analyzeData.errorText ?? '')
                 : analyzeData.errorText || analyzeData.description || analyzeData.ticketTitle || "";
             const hasValidIdentifier = analyzeData.caseNumber && analyzeData.caseNumber.length > 5;

             if (isInitialPending && hasValidIdentifier && rawContent.length > 20) {
                 setHasAutoAnalyzed(true);
                 showStatusBubble(t('analyzing'), 'default', 0);
                 scheduleAutoAnalyze(analyzeContext);
             }
        }
    }, [
        isOpen,
        scrapedData,
        prefs.autoAnalyzeMode,
        prefs.userPrompt,
        hasAutoAnalyzed,
        pendingPageScanCount,
    ]);

    const handleRefreshContext = async () => {
        const editRevision = contextEditRevisionRef.current;
        const terminalRequestId = activeTerminalRevalidationRequestId();
        if (terminalRequestId) {
            await runTerminalRevalidationParticipant(
                terminalRequestId,
                '[DH] Page scan failed',
                true,
            );
            return;
        }
        await runPageScan('[DH] Page scan failed', scan => {
            if (scan.generation !== pageScanGenerationRef.current || !scan.fresh) {
                logCreatedOn('ui', scan.fresh ? 'stale_scan' : 'missing', scan.generation);
                return;
            }
            if (localAnalyzeRequestIdRef.current) {
                logCreatedOn('ui', 'identity_only', scan.generation);
                applyIdentityScan(scan.fresh);
            } else {
                // Refresh may reset old edits, but not intent entered while it awaited.
                applyFullScan(scan.fresh, null, false, scan.generation,
                    contextEditRevisionRef.current === editRevision);
            }
        });
    };

    const handlePing = async () => {
        trackEvent('Ping Clicked');
        try {
            const response = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { action: "ping", requestId: crypto.randomUUID() }
            });
            // Show result in popover instead of alert
            popoverIsAnalyze.current = false;
            setResultPopover({
                isOpen: true,
                title: `⚡ ${t('pingResult')}`,
                content: "```json\n" + JSON.stringify(response, null, 2) + "\n```"
            });
            // Also close menu to show result clearly? Optional.
            // setIsOpen(false); 
        } catch (e: any) {
            popoverIsAnalyze.current = false;
            setResultPopover({
                isOpen: true,
                title: `❌ ${t('pingError')}`,
                content: `${t('errorLabel')}: ${e.message}`
            });
        }
    };

    const localizeAnalysisWarnings = (
        warnings: readonly AnalysisPersistenceWarning[] | undefined,
    ): string | undefined => {
        if (!warnings?.length) return undefined;
        return warnings.includes('analysis_pending_cleanup_failed')
            ? t('analysisDurabilityAndCleanupWarning')
            : t('analysisDurabilityWarning');
    };

    type AnalyzeTerminalOutcome =
        | {
            kind: 'success';
            markdown: string;
            attachmentNotice?: string;
            savedTo?: string;
            duration: number;
            caseHash: string;
            sap: string;
            severity: string;
            durabilityWarning?: string;
        }
        | {
            kind: 'host-error';
            error: string;
            errorCode?: string;
            attachmentNotice?: string;
            durabilityWarning?: string;
        }
        | { kind: 'exception'; error: string }
        | { kind: 'timeout' };

    const publishAnalyzeTerminalOutcome = (
        requestId: string,
        caseNumber: string,
        outcome: AnalyzeTerminalOutcome,
    ) => {
        if (outcome.kind === 'success') {
            trackEvent('Analyze Success', {
                durationSeconds: outcome.duration,
                caseIdHash: outcome.caseHash,
                sap: outcome.sap,
                severity: outcome.severity,
            });
            if (outcome.caseHash && !reportedCases.current.has(outcome.caseHash)) {
                reportedCases.current.add(outcome.caseHash);
                trackEvent('Case Analyzed', {
                    caseIdHash: outcome.caseHash,
                    sap: outcome.sap,
                    severity: outcome.severity,
                });
            }
            setLastDuration(`${outcome.duration.toFixed(1)}s`);
            showStatusBubble(
                `${t('analysisComplete')} (${outcome.duration.toFixed(1)}s)`,
                'success',
                3000,
            );
            popoverIsAnalyze.current = true;
            setResultPopover({
                isOpen: true,
                title: `🤖 Copilot ${t('analyze')}`,
                content: outcome.markdown,
                attachmentNotice: outcome.attachmentNotice,
                durabilityWarning: outcome.durabilityWarning,
                path: outcome.savedTo,
                duration: `${outcome.duration.toFixed(1)}s`,
                identity: { requestId, caseNumber },
            });
            setIsOpen(false);
            return;
        }
        if (outcome.kind === 'host-error') {
            showAnalysisError(
                outcome.error,
                outcome.errorCode,
                { requestId, caseNumber },
                outcome.durabilityWarning,
                outcome.attachmentNotice,
            );
            trackEvent('Analyze Host Error', {
                errorCode: outcome.errorCode ?? 'unclassified',
            });
            return;
        }
        if (outcome.kind === 'exception') {
            showAnalysisError(
                outcome.error,
                undefined,
                { requestId, caseNumber },
            );
            trackEvent('Analyze Exception', { errorCode: 'unclassified' });
            return;
        }
        showAnalysisError(
            t('analysisFailed'),
            undefined,
            { requestId, caseNumber },
        );
        trackEvent('Analyze Timeout');
    };

    const finishAnalyzeTerminal = async (
        request: AnalyzeRequestSnapshot,
        invocation: NonNullable<typeof editableAnalyzeContextRef.current>,
        acceptedGeneration: number,
        outcome: AnalyzeTerminalOutcome,
    ): Promise<void> => {
        const { requestId, caseNumber } = request;
        if (postRunScanOwnerRef.current !== requestId) return;
        const originRecord = analyzeOriginRef.current;
        if (!originRecord || originRecord.requestId !== requestId) return;
        updateAnalyzeProgress({ type: 'stop', requestId });
        const origin = originRecord.pageIdentity;
        postRunScanOwnerRef.current = null;
        terminalRevalidationRef.current = {
            requestId,
            origin,
            latestGeneration: -1,
            latestCompletion: null,
            version: 0,
            changeSignal: createTerminalRevalidationChangeSignal(),
            closed: false,
        };
        if (analyzeSafetyTimerRef.current?.requestId === requestId) {
            clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
            analyzeSafetyTimerRef.current = null;
        }

        void runTerminalRevalidationParticipant(
            requestId,
            '[DH] Post-analysis page scan failed',
        );
        const terminalSnapshot = await awaitLatestTerminalRevalidation(requestId);

        const ownsTerminalPublication =
            localAnalyzeRequestIdRef.current === requestId
            && latestRequestId.current === requestId
            && analyzeOriginRef.current?.requestId === requestId;
        const canPublishTerminalOutcome = Boolean(
            ownsTerminalPublication
            && terminalSnapshot !== null
            && acceptedSnapshotIsCurrent(terminalSnapshot)
            && editableAnalyzeContextIsCurrent(invocation)
            && requestOwnsVisiblePage(request, acceptedGeneration)
        );
        if (canPublishTerminalOutcome) {
            // Progress completion has the same page authority as the result UI.
            updateAnalyzeProgress({ type: 'settle', requestId, outcome: outcome.kind === 'success' ? 'success' : 'failed' });
            publishAnalyzeTerminalOutcome(requestId, caseNumber, outcome);
        } else if (currentCaseNumberRef.current === caseNumber) {
            deferredLocalHydrationRef.current = { requestId, caseNumber };
        }
        closeTerminalRevalidation(requestId);
        if (!ownsTerminalPublication) return;

        localAnalyzeRequestIdRef.current = null;
        latestRequestId.current = null;
        if (hydratedPendingRef.current?.requestId === requestId) {
            hydratedPendingRef.current = null;
        }
        analyzeOriginRef.current = null;
        identityChangedDuringAnalyzeRef.current = false;
        if (localAnalyzePageRef.current?.request.requestId === requestId) {
            localAnalyzePageRef.current = null;
        }
        analyzeFlowEndedAtRef.current = Date.now();
        reconcileVisibleAnalyzingState();
    };

    const handleAnalyze = async (
        context: NonNullable<typeof editableAnalyzeContextRef.current> | null = null,
        analyzeInvocation?: AnalyzeInvocation,
    ) => {
        const invocation = context || editableAnalyzeContextRef.current;
        if (!invocation || !editableAnalyzeContextIsCurrent(invocation)) return;
        const targetData = invocation.data;
        const page = parseScrapedDataSnapshot(targetData);
        if (!page) return;
        // IR is scan-owned metadata, not an editable template field or a send-time read.
        const irSnapshot = {
            irSlaStatus: invocation.accepted.data.irSlaStatus,
            irSlaCapturedAt: invocation.accepted.data.irSlaCapturedAt,
        };
        // Check if we have enough info to analyze (either error text OR title)
        const hasContent = isUserEdited.current ? page.errorText?.trim()
            : page.errorText || page.description || page.ticketTitle;
        if (!hasContent) return;

        if (scheduledAutoAnalyzeRef.current) {
            clearTimeout(scheduledAutoAnalyzeRef.current.timeoutId);
            scheduledAutoAnalyzeRef.current = null;
        }

        const dataRequest = snapshotAnalyzeRequest(
            crypto.randomUUID(),
            page,
            latestPrefsRef.current.rootPath,
            analyzeInvocation,
        );
        const request = dataRequest.pageIdentity === invocation.accepted.identity
            ? dataRequest
            : Object.freeze({
                ...dataRequest,
                pageIdentity: invocation.accepted.identity,
            });
        const {
            requestId,
            pageIdentity,
            caseNumber,
            rootPath,
            rootPathOverrideProvided,
        } = request;
        const acceptedGenerationOfRun = invocation.accepted.generation;
        if (analyzeSafetyTimerRef.current) {
            clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
            analyzeSafetyTimerRef.current = null;
        }
        latestRequestId.current = requestId;
        localAnalyzeRequestIdRef.current = requestId;
        localAnalyzePageRef.current = {
            request,
            acceptedGeneration: acceptedGenerationOfRun,
        };
        progressPageRef.current = localAnalyzePageRef.current;
        updateAnalyzeProgress({ type: 'start', requestId });
        analyzeOriginRef.current = request;
        identityChangedDuringAnalyzeRef.current = false;
        postRunScanOwnerRef.current = requestId;
        reconcileVisibleAnalyzingState();

        trackEvent('Analyze Clicked', { 
            hasContext: !!page.source,
            sap: page.productCategory || 'Unknown'
        });

        const startTime = Date.now();
        
        // Safety timeout to prevent infinite "Analyzing..." state.
        // Reserve 120s before the model budget for attachment preparation
        // (up to 90s) and Host qualification/import work, plus 10s fallback grace.
        // This does not change the user's configured model timeout.
        const _analyzeTimeoutSec = Math.max(60, Math.min(3600, prefs.analyzeTimeoutSeconds ?? 1200));
        const _attachmentPreparationGraceSec = 120;
        const _safetyTimeoutMs = (_analyzeTimeoutSec + _attachmentPreparationGraceSec + 10) * 1000;
        const timeoutId = setTimeout(() => {
            if (localAnalyzeRequestIdRef.current !== requestId) return;
            void finishAnalyzeTerminal(
                request,
                invocation,
                acceptedGenerationOfRun,
                { kind: 'timeout' },
            );
        }, _safetyTimeoutMs);
        analyzeSafetyTimerRef.current = { requestId, timeoutId };

        try {
            // Construct payload
            // Preserve explicit edits, not just templates, except for the reserved sections.
            // Otherwise (Auto-Analyze or fresh scan), construct the template.
            let fullContext = "";
            if (isUserEdited.current || (page.errorText && isFormattedTemplate(page.errorText))) {
                fullContext = page.errorText ?? '';
            } else {
                fullContext = constructTemplate(page);
            }
            // Keep the Host's first line-level User Prompt boundary, even inside fences.
            // Strip it before inserting IR; only the IR helper is fence-aware.
            fullContext = applyCurrentUserPrompt(fullContext, undefined);
            fullContext = applyIrSlaSnapshot(fullContext, irSnapshot);
            fullContext = applyCurrentUserPrompt(fullContext, prefs.userPrompt);

            // Only show bubble if we initiated manually and it wasn't already shown by auto-analyze logic
            if (
                !statusBubble.visible
                && !menuOpenRef.current
                && requestOwnsVisiblePage(request, acceptedGenerationOfRun)
            ) {
                 showStatusBubble(t('analyzing'), 'default', 0);
            }

            const hostPayload = {
                progressVersion: 1,
                text: fullContext,
                context: page.source || 'Unknown Context',
                timestamp: new Date().toLocaleString(),
                rootPath,
                ...(rootPathOverrideProvided
                    ? { rootPathOverrideProvided: true as const }
                    : {}),
                ...(typeof page.productCategory === 'string'
                    ? { product: page.productCategory }
                    : {}),
                ...(typeof caseNumber === 'string'
                    ? { caseNumber }
                    : {}),
            };
            const response: unknown = await chrome.runtime.sendMessage({
                type: "NATIVE_MSG",
                payload: { 
                    action: "analyze_error", 
                    payload: hostPayload,
                    requestId: requestId,
                    // C2a+: tell the SW to persist pending/result for re-hydration
                    // after the user navigates away from the case page. SW strips
                    // this before forwarding to the host. Titles are pre-translated
                    // here because the SW has no `t()` (spec §3 ctx contract).
                    _persist: {
                        caseNumber,
                        successTitle: `🤖 Copilot ${t('analyze')}`,
                        errorTitle: `❌ ${t('analysisFailed')}`,
                    }
                }
            });
            
            // Check if context switched while we were waiting
            if (latestRequestId.current !== requestId) {
                console.log("Ignoring outdated analysis result");
                return;
            }

            const parsedResponse = parseAnalyzeForwardResult(response);
            // Freeze events during hashing; the existing terminal path owns the outcome.
            updateAnalyzeProgress({ type: 'stop', requestId });
            const durabilityWarning = localizeAnalysisWarnings(
                parsedResponse.extension_warnings,
            );
            if (parsedResponse.status === 'success') {
                const analysisData = parsedResponse.data;
                const duration = (Date.now() - startTime) / 1000;
                const caseHash = await hashCaseId(caseNumber);
                if (latestRequestId.current !== requestId) return;
                await finishAnalyzeTerminal(
                    request,
                    invocation,
                    acceptedGenerationOfRun,
                    {
                        kind: 'success',
                        markdown: analysisData.markdown,
                        attachmentNotice: parsedResponse.attachmentNotice,
                        savedTo: analysisData.saved_to,
                        duration,
                        caseHash,
                        sap: page.productCategory || 'Unknown',
                        severity: page.severity || 'Unknown',
                        durabilityWarning,
                    },
                );
            } else {
                await finishAnalyzeTerminal(
                    request,
                    invocation,
                    acceptedGenerationOfRun,
                    {
                        kind: 'host-error',
                        error: parsedResponse.error,
                        errorCode: parsedResponse.error_code,
                        attachmentNotice: parsedResponse.attachmentNotice,
                        durabilityWarning,
                    },
                );
            }
        } catch (e: unknown) {
            if (latestRequestId.current === requestId) {
                await finishAnalyzeTerminal(
                    request,
                    invocation,
                    acceptedGenerationOfRun,
                    {
                        kind: 'exception',
                        error: `${t('errorLabel')}: ${safeAnalyzeRejectionText(
                            e,
                            t('unknownError'),
                        )}`,
                    },
                );
            }
        } finally {
            if (analyzeSafetyTimerRef.current?.requestId === requestId) {
                clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
                analyzeSafetyTimerRef.current = null;
            }
        }
    };

    const handleOpenOptions = () => {
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
        setIsOpen(false);
    };

    const handleFabUpdate = async () => {
        if (!canStartUpdate) return;
        setIsOpen(false);
        if (updateVersion) {
            trackEvent('FAB Update Started', { version: updateVersion });
        }
        try {
            const response = await chrome.runtime.sendMessage({ type: 'DH_UPDATE_START' });
            const handled = ownDataProperty(response, 'handled');
            if (handled.kind === 'value' && handled.value === true) {
                const next = projectedUpdateState(response);
                if (next) setUpdateState(next);
            } else {
                showStatusBubble(t('updateRequestFailed'), 'error', 5000);
            }
        } catch {
            showStatusBubble(t('updateRequestFailed'), 'error', 5000);
        }
    };

    const handleItemClick = async (item: MenuItem) => {
        if (item.type === 'folder') {
            navigateTo(item);
        } else if (item.type === 'link' && item.url) {
            trackEvent('Bookmark Link Clicked', {
                label: item.label,
                source: item.source || 'personal',
                type: item.type,
            });
            try {
                // We must use chrome.runtime.sendMessage to ask background script to open tab
                // because sometimes window.open is blocked or behaves poorly in content scripts
                // OR we can try direct window.open if permissions allow.
                // But the user reported "no respond", which suggests window.open might be blocked or failing silently.
                // Let's try standard window.open first, but ensure the URL is valid.
                
                const url = await resolveDynamicUrl(item.url);
                if (url) {
                    window.open(url, '_blank');
                }
            } catch {
                console.error("Failed to open bookmark link.");
            }
            setIsOpen(false);
        } else if (item.type === 'markdown') {
            trackEvent('Bookmark Note Clicked', { label: item.label });
            popoverIsAnalyze.current = false;
            // Show markdown content in the result popover
            setResultPopover({
                isOpen: true,
                title: item.label || '📝 Note',
                content: item.content || ''
            });
            setIsOpen(false);
        }
    };

    const progressPage = progressPageRef.current;
    const visibleAnalyzeProgress = analyzeProgress !== null
        && progressPage !== null
        && progressPage.request.requestId === analyzeProgress.requestId
        && (analyzeProgress.settled !== null
            || localAnalyzeRequestIdRef.current === analyzeProgress.requestId)
        && (!hydration.pending
            || localAnalyzeRequestIdRef.current === analyzeProgress.requestId
            || hydration.pending.requestId === analyzeProgress.requestId)
        && requestMatchesPage(progressPage.request, currentPageIdentityRef.current)
        && !hasPendingPageScanNewerThan(progressPage.acceptedGeneration)
        ? analyzeProgress : null;

    return (
        <>
        {/* Analysis Result Popover - rendered outside dh-container to avoid 
            position:fixed stacking context issues with the bottom-right anchored container */}
        <ResultPopover 
            isOpen={resultPopover.isOpen} 
            onClose={() => {
                // C2a+: if the popover came from an analyze flow (success or
                // error), acknowledge its identity so it does not re-hydrate
                // on the next page load. Bookmark popovers leave analysis
                // acknowledgment state untouched.
                if (popoverIsAnalyze.current) {
                    popoverIsAnalyze.current = false;
                    if (resultPopover.identity) {
                        void hydration.dismissPopover(resultPopover.identity);
                    }
                }
                setResultPopover(prev => ({ ...prev, isOpen: false }));
            }} 
            title={resultPopover.title}
            content={resultPopover.content}
            errorCode={resultPopover.errorCode}
            attachmentNotice={resultPopover.attachmentNotice}
            filePath={resultPopover.path}
            duration={resultPopover.duration}
            isAnalyze={popoverIsAnalyze.current}
            durabilityWarning={resultPopover.durabilityWarning}
        />

        <div className="dh-container">
            {/* Status Bubble */}
            <div className={cn(
                "dh-status-bubble",
                statusBubble.visible && "visible",
                statusBubble.type
            )}>
                {statusBubble.type === 'default' && <Zap size={14} className="animate-pulse" />}
                {statusBubble.type === 'success' && <Activity size={14} />}
                {statusBubble.type === 'error' && <AlertCircle size={14} />}
                <span>{statusBubble.text}</span>
            </div>

            {isOpen && (
                <div className="dh-menu">
                    {/* Header */}
                    <div className="dh-header">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {canGoBack && (
                                <button 
                                    onClick={navigateBack}
                                    className="dh-back-btn"
                                    title={t('back')}
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            )}
                            <h3 className="dh-title">{t('appName')}</h3>
                            <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px', fontWeight: 'normal' }}>
                                v{getExtensionVersion()}
                            </span>
                        </div>
                        <button onClick={handleOpenOptions} title={t('settings')} className="dh-settings-btn">
                            <Settings size={16} />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {bookmarkLoadWarning && (
                            <div
                                role="alert"
                                style={{
                                    padding: '10px 12px',
                                    color: '#92400E',
                                    backgroundColor: '#FFFBEB',
                                    borderBottom: '1px solid #FDE68A',
                                    fontSize: '12px',
                                }}
                            >
                                {bookmarkLoadWarning}
                            </div>
                        )}
                        {/* Update Banner */}
                        {showUpdateBanner && (
                            <button
                                onClick={() => { void handleFabUpdate(); }}
                                disabled={!canStartUpdate}
                                className="dh-item"
                                style={{
                                    backgroundColor: updateError ? '#FFF7ED' : '#F0FDF4',
                                    borderBottom: `1px solid ${updateError ? '#FED7AA' : '#BBF7D0'}`,
                                    cursor: canStartUpdate ? 'pointer' : 'default',
                                }}
                            >
                                <span className="dh-item-icon" style={{ color: updateError ? '#EA580C' : '#16A34A' }}>
                                    <RefreshCw size={18} className={isUpdateBusy ? 'animate-spin' : undefined} />
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span className="dh-item-label" style={{ color: updateError ? '#C2410C' : '#15803D' }}>{updateTitle}</span>
                                    <span style={{ fontSize: '11px', color: updateError ? '#EA580C' : '#16A34A', textAlign: 'left' }}>{updateDetail}</span>
                                </div>
                            </button>
                        )}

                        {currentItems.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleItemClick(item)}
                                className="dh-item"
                                data-type={item.type}
                            >
                                <span className="dh-item-icon">
                                    {item.type === 'folder' ? <Folder size={18} /> : 
                                     item.type === 'link' ? <Link size={18} /> : 
                                     <FileText size={18} />}
                                </span>
                                <span className="dh-item-label">{item.label}</span>
                            </button>
                        ))}
                        
                        {currentItems.length === 0 && (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                                <Folder size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <div>{t('noItems')}</div>
                            </div>
                        )}
                    </div>

                    {/* AI Tools Footer */}
                    <div className="dh-footer">
                        {/* Context Preview Box */}
                        <div className="dh-context-box">
                            {/* Header / Toggle */}
                            <div 
                                className="dh-context-header"
                                style={{ justifyContent: 'space-between', cursor: 'default' }}
                            >
                                <div 
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                    onClick={() => setIsContextExpanded(!isContextExpanded)}
                                >
                                    <Activity size={14} color={scrapedData?.errorText ? '#0D9488' : '#94A3B8'} />
                                    <span>{t('caseContext')}</span>
                                    {isContextExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRefreshContext(); }}
                                    title={t('refreshContext')}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>

                            {/* Collapsible Content */}
                            {isContextExpanded && (
                                <div style={{ borderTop: '1px solid #E2E8F0' }}>
                                    <textarea
                                        className="dh-textarea"
                                        value={
                                            scrapedData
                                                ? (() => {
                                                    // If the user has manually edited, always respect their edits
                                                    // (even if they cleared the textarea to empty)
                                                    if (isUserEdited.current) {
                                                        return scrapedData.errorText ?? '';
                                                    }
                                                    // Check if we already have the formatted text in errorText
                                                    if (scrapedData.errorText && isFormattedTemplate(scrapedData.errorText)) {
                                                        return scrapedData.errorText;
                                                    }
                                                    // Use the shared helper to construct the template from raw fields
                                                    return applyCurrentUserPrompt(
                                                        constructTemplate(scrapedData),
                                                        prefs.userPrompt,
                                                    );
                                                })()
                                                : ''
                                        }
                                        onChange={(e) => {
                                            const newVal = e.target.value;
                                             isUserEdited.current = true;
                                             contextEditRevisionRef.current += 1;
                                            const editableContext = editableAnalyzeContextRef.current;
                                            if (editableContext) {
                                                editableContext.data = {
                                                    ...editableContext.data,
                                                    errorText: newVal,
                                                };
                                            }
                                            setScrapedData(prev => {
                                                if (!prev) return { errorText: newVal }; // Should not happen given render condition
                                                return { 
                                                    ...prev, 
                                                    // IMPORTANT: We store the FULL EDITED TEXT in errorText
                                                    // This allows the "value" prop logic above to see "## Case Number..." 
                                                    // and return it as-is, preserving edits.
                                                    errorText: newVal 
                                                };
                                            });
                                        }}
                                        placeholder={t('contextPlaceholder')}
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="dh-actions-row">
                            <button 
                                onClick={handlePing}
                                className="dh-action-btn dh-btn-secondary"
                            >
                                <Activity size={14} /> {t('ping')}
                            </button>
                            
                            {/* Analyze Button */}
                            <button 
                                onClick={() => handleAnalyze()}
                                 disabled={
                                     !(isUserEdited.current ? scrapedData?.errorText?.trim() : scrapedData?.errorText)
                                    || isAnalyzing
                                    || editableContextIdentityRef.current
                                        !== currentPageIdentityRef.current
                                }
                                className="dh-action-btn dh-btn-primary"
                            >
                                <Zap size={14} fill={isAnalyzing ? "none" : "currentColor"} />
                                {t('analyze')}
                            </button>
                        </div>

                        {/* Unified Status Bar */}
                        {(visibleAnalyzeProgress || isAnalyzing) && (
                            <AnalyzeProgress key={visibleAnalyzeProgress?.requestId ?? 'hydrated'} state={visibleAnalyzeProgress} />
                        )}
                        {/* {(() => {
                             // ... existing logic ...
                        })()} */}
                    </div>
                </div>
            )}
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="dh-btn"
            >
                {isOpen ? (
                    <X size={32} strokeWidth={2.5} />
                ) : (
                    <>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{prefs.buttonText}</span>
                        {showUpdateBanner && (
                            <span style={{
                                position: 'absolute',
                                top: '0px',
                                right: '0px',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#EF4444',
                                borderRadius: '50%',
                                border: '2px solid white'
                            }} />
                        )}
                    </>
                )}
            </button>
        </div>
        </>
    );
};

export default FAB;
