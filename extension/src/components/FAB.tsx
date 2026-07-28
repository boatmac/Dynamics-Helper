import React, { useState, useEffect, useRef } from 'react';
import { PageReader, ScrapedData } from '../utils/pageReader';
import { useMenuLogic, MenuItem, resolveDynamicUrl } from './MenuLogic';
import { useTranslation } from '../utils/i18n';
import { usePrefs, mergeRootPathOverride } from '../utils/prefs';
import { trackEvent, trackException, hashCaseId } from '../utils/telemetry';
import { getExtensionVersion } from '../utils/version';
import { useAnalysisHydration } from '../hooks/useAnalysisHydration';
import type {
    AnalysisPersistenceWarning,
    LastAnalysisIdentity,
} from '../utils/analysisStore';
import { applyCurrentUserPrompt } from '../utils/analysisPrompt';
import { safeErrorText } from '../utils/safeErrorText';
import { ownDataProperty } from '../utils/ownData';
import { parseAnalyzeForwardResult } from '../background/analyzeBridge';
import {
    parsePageIdentitySnapshot,
    parseScrapedDataSnapshot,
    type PageIdentity,
} from '../utils/pageIdentity';
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

const FAB: React.FC = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
    const [resultPopover, setResultPopover] = useState<{ 
        isOpen: boolean;
        title: string;
        content: string; 
        errorCode?: string;
        path?: string;
        duration?: string;
        durabilityWarning?: string;
        identity?: LastAnalysisIdentity;
    }>({ isOpen: false, title: '', content: '' });
    // NOTE: legacy `errorMsg` state was removed in v2.0.71 (C2a+). It had
    // 9 setters and 0 readers — confirmed dead in
    // docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md
    // § 1. All error surfacing now flows through `setResultPopover` so the
    // user sees a persistent popover instead of a 4-second bubble flash.
    const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null);

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
    const statusTimeoutRef = React.useRef<any>(null);

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
    const localAnalyzePageRef = React.useRef<{
        requestId: string;
        pageIdentity: PageIdentity | null;
        caseNumber: string;
        acceptedGeneration: number;
    } | null>(null);
    const postRunScanOwnerRef = React.useRef<string | null>(null);
    const terminalRevalidationRef = React.useRef<TerminalRevalidationCoordinator | null>(null);
    const deferredLocalHydrationRef = React.useRef<{
        requestId: string;
        caseNumber: string;
    } | null>(null);
    const analyzeOriginRef = React.useRef<{
        requestId: string;
        pageIdentity: PageIdentity | null;
    } | null>(null);
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

    // Track which case IDs have already fired "Case Analyzed" this session
    // to deduplicate: 3 analyses of the same case = 1 "Case Analyzed" event.
    const reportedCases = React.useRef<Set<string>>(new Set());

    // C2a+: re-hydrate persisted analysis result on mount and on case change.
    // See docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md
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
            && localPage?.requestId === activeRequestId
            && currentIdentity !== null
            && localPage.pageIdentity === currentIdentity
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
            && localPage.requestId === hydrationRequestId
            ? localPage.caseNumber
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
    }, []);

    // Initial Health Check to wake up Host and check for updates
    useEffect(() => {
        const checkHealth = async () => {
            try {
                // We don't need to show UI for this, just wake up the host
                // This ensures check_for_updates() runs immediately
                await chrome.runtime.sendMessage({
                    type: "NATIVE_MSG",
                    payload: { action: "health_check", requestId: crypto.randomUUID() }
                });
            } catch (e) {
                // Ignore errors on initial wake-up
                console.debug("[DH] Initial wake-up failed (host might be missing)", e);
            }
        };
        // Small delay to ensure listeners are ready
        setTimeout(checkHealth, 1000);

        // Check persistent storage for pending updates (in case the live event was missed)
        chrome.storage.local.get("pending_update", (data) => {
            const pending = data.pending_update as {version: string, url: string} | undefined;
            if (pending?.version) {
                const currentVer = getExtensionVersion();
                if (pending.version === currentVer) {
                    // Already updated — stale entry, clean up
                    chrome.storage.local.remove("pending_update");
                } else {
                    console.log("[DH-FAB] Found pending update in storage:", pending);
                    setUpdateAvailable(pending);
                }
            }
        });
    }, []);

    // Progress Listener Effect
    useEffect(() => {
        const handleProgress = (e: any) => {
            const { requestId, payload } = e.detail;
            const localPage = localAnalyzePageRef.current;
            const requestOwnsVisiblePage = Boolean(
                localPage !== null
                && localPage.requestId === requestId
                && localPage.pageIdentity !== null
                && localPage.pageIdentity === currentPageIdentityRef.current
                && !hasPendingPageScanNewerThan(localPage.acceptedGeneration),
            );
            
            // Only show progress if it matches our current request
            if (latestRequestId.current === requestId && requestOwnsVisiblePage) {
                 // Update the status bubble with the progress message
                 // Use 'default' type (blue/pulse) but with the new text
                 // Auto-hide is 0 to keep it visible
                 showStatusBubble(payload, 'default', 0);
            }
        };

        const handleUpdate = (e: any) => {
            // Check if available update is NEWER than current
            // If we just updated, current version == available version, so don't show it.
            const currentVer = getExtensionVersion();
            const availableVer = e.detail.version;
            
            // Simple semver compare (assuming x.y.z)
            // If available == current, we are up to date
            if (availableVer === currentVer) {
                setUpdateAvailable(null);
                return;
            }

            setUpdateAvailable(e.detail);
            showStatusBubble(`${t('updateAvailable')}: ${e.detail.version}`, 'success', 10000); 
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

        window.addEventListener('dh-native-progress', handleProgress);
        window.addEventListener('dh-update-available', handleUpdate);
        window.addEventListener('DH_NOTIFICATION', handleNotification);
        window.addEventListener('DH_TOAST', handleToast);
        
        return () => {
            window.removeEventListener('dh-native-progress', handleProgress);
            window.removeEventListener('dh-update-available', handleUpdate);
            window.removeEventListener('DH_NOTIFICATION', handleNotification);
            window.removeEventListener('DH_TOAST', handleToast);
        };
    }, []);


    const showStatusBubble = (text: string, type: 'default' | 'success' | 'error' = 'default', autoHideDuration = 3000) => {
        if (!prefs.enableStatusBubble) return;

        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        
        setStatusBubble({ visible: true, text, type });
        
        if (autoHideDuration > 0) {
            statusTimeoutRef.current = setTimeout(() => {
                setStatusBubble(prev => ({ ...prev, visible: false }));
            }, autoHideDuration);
        }
    };

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
    ) => {
        popoverIsAnalyze.current = true;
        setResultPopover({
            isOpen: true,
            title: `❌ ${t('analysisFailed')}`,
            content: fallback,
            errorCode,
            identity,
            durabilityWarning,
        });
        showStatusBubble(t('analysisFailed'), 'error', 4000);
    };
    
    const { prefs } = usePrefs();
    const [rootPathOverride, setRootPathOverride] = useState<string | null>(null);
    const effectivePrefs = mergeRootPathOverride(prefs, rootPathOverride);
    
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
            setStatusBubble(previous => ({ ...previous, visible: false }));
        }
        reconcileVisibleAnalyzingState();
        const completion = (async () => {
            try {
                let fresh: unknown = null;
                try {
                    fresh = await PageReader.scanForErrors();
                } catch {
                    console.warn(failureMessage);
                }
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
                setStatusBubble(previous => ({ ...previous, visible: false }));
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
        if (hasPendingPageScanNewerThan(generation)) return null;
        const plain = parseScrapedDataSnapshot(fresh);
        if (!plain) return null;
        const parsed = parsePageIdentitySnapshot(plain);
        if (!parsed) return null;
        const nextIdentity = parsed.identity;
        const previousContextIdentity = editableContextIdentityRef.current;
        const accepted = { generation, identity: nextIdentity, data: plain };
        acceptedContextSnapshotRef.current = accepted;
        applyIdentityScan(plain);
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
            return accepted;
        }
        const editableContext = editableAnalyzeContextRef.current;
        editableContext.accepted = accepted;
        if (isUserEdited.current) {
            return accepted;
        }
        editableContextIdentityRef.current = nextIdentity;
        editableContext.data = plain;
        setScrapedData(plain);
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

    function requestOwnsVisiblePage(
        pageIdentity: PageIdentity | null,
        acceptedGeneration: number,
    ): boolean {
        return pageIdentity !== null
            && pageIdentity === currentPageIdentityRef.current
            && !hasPendingPageScanNewerThan(acceptedGeneration);
    }

    function runTerminalRevalidationParticipant(
        requestId: string,
        failureMessage: string,
        forceReplace = false,
    ): Promise<TerminalRevalidationResult> {
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
                    return { generation: scan.generation, accepted: null };
                }
                return {
                    generation: scan.generation,
                    accepted: applyFullScan(
                        scan.fresh,
                        coordinator.origin,
                        true,
                        scan.generation,
                        forceReplace,
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
            `## Severity\n\n${data.severity || ''}`,
            `## Status Reason\n\n${data.statusReason || ''}`,
            `## SAP\n\n${data.productCategory || ''}`,
            // Be careful not to double-include if description IS the errorText
            `## Description\n\n${data.description || ((data.errorText && !isFormattedTemplate(data.errorText)) ? data.errorText : '')}`
        ];

        return parts.join('\n\n');
    };

    const scheduleAutoAnalyze = (
        context: NonNullable<typeof editableAnalyzeContextRef.current>,
    ) => {
        const timeoutId = setTimeout(() => {
            if (scheduledAutoAnalyzeRef.current?.timeoutId === timeoutId) {
                scheduledAutoAnalyzeRef.current = null;
            }
            if (!editableAnalyzeContextIsCurrent(context)) {
                if (editableAnalyzeContextRef.current === context) {
                    setHasAutoAnalyzed(false);
                    setStatusBubble(previous => previous.type === 'default'
                        ? { ...previous, visible: false }
                        : previous);
                }
                return;
            }
            void handleAnalyze(context);
        }, 100);
        scheduledAutoAnalyzeRef.current = { context, timeoutId };
    };

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
                     ) return;
                     if (localAnalyzeRequestIdRef.current) applyIdentityScan(initialScan.fresh);
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
                     ) return;
                     if (localAnalyzeRequestIdRef.current) applyIdentityScan(openScan.fresh);
                     else applyFullScan(openScan.fresh, null, false, openScan.generation);
                 });
             }
        };
        
        doScan();
    }, [isOpen]); 

    // Listen for Context Menu triggers (Right-click -> Analyze Error)
    useEffect(() => {
        const handleTriggerAnalyze = async (e: any) => {
            const { selectionText, rootPath } = e.detail;
            console.log("[DH] Context Menu Triggered:", { selectionText, rootPath });
            let pageSnapshot = acceptedContextSnapshotRef.current;

            // If rootPath is provided, ensure our prefs are consistent
            if (rootPath && rootPath !== effectivePrefs.rootPath) {
                setRootPathOverride(rootPath);
            }

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
                                ) return null;
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
                void handleAnalyze(analyzeContext);
            }
        };

        window.addEventListener('dh-trigger-analyze', handleTriggerAnalyze);
        return () => {
            window.removeEventListener('dh-trigger-analyze', handleTriggerAnalyze);
        };
    }, [effectivePrefs.rootPath, scrapedData]); // Dependencies for the listener

    // Optimized: Use MutationObserver + Debounce instead of fixed interval polling
    useEffect(() => {
        let debounceTimer: ReturnType<typeof setTimeout>;

        const runScan = async () => {
            // 1. Performance Check: Don't scan if tab is hidden/inactive
            if (document.hidden) return;

            // console.log("[DH] Running Lazy Scan..."); 
            const terminalRequestId = activeTerminalRevalidationRequestId();
            if (terminalRequestId) {
                await runTerminalRevalidationParticipant(
                    terminalRequestId,
                    '[DH] Page scan failed',
                );
                return;
            }

            await runPageScan('[DH] Page scan failed', scan => {
                if (
                    scan.generation !== pageScanGenerationRef.current
                    || !scan.fresh
                ) return;
                if (localAnalyzeRequestIdRef.current || isOpen) {
                    if (localAnalyzeRequestIdRef.current) {
                        applyIdentityScan(scan.fresh);
                    }
                    return;
                }
                applyFullScan(scan.fresh, null, false, scan.generation);
            });
        };

        // MutationObserver to detect DOM changes
        // This ensures we only scan when the page *actually* changes, not every 2s
        const observer = new MutationObserver((mutations) => {
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
            if (!document.hidden) {
                // Run immediately (or with short delay) when returning to tab
                setTimeout(runScan, 500); 
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            observer.disconnect();
            clearTimeout(debounceTimer);
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
            const rawContent = analyzeData.errorText || analyzeData.description || analyzeData.ticketTitle || "";
            
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
            
            const rawContent = analyzeData.errorText || analyzeData.description || analyzeData.ticketTitle || "";
            
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
             
             const rawContent = analyzeData.errorText || analyzeData.description || analyzeData.ticketTitle || "";
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
            if (scan.generation !== pageScanGenerationRef.current || !scan.fresh) return;
            if (localAnalyzeRequestIdRef.current) {
                applyIdentityScan(scan.fresh);
            } else {
                // Explicit refresh replaces edits only after the scrape validates.
                applyFullScan(scan.fresh, null, false, scan.generation, true);
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
        requestId: string,
        invocation: NonNullable<typeof editableAnalyzeContextRef.current>,
        pageIdentity: PageIdentity | null,
        acceptedGeneration: number,
        caseNumber: string,
        outcome: AnalyzeTerminalOutcome,
    ): Promise<void> => {
        if (postRunScanOwnerRef.current !== requestId) return;
        const originRecord = analyzeOriginRef.current;
        if (!originRecord || originRecord.requestId !== requestId) return;
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
            && requestOwnsVisiblePage(pageIdentity, acceptedGeneration)
        );
        if (canPublishTerminalOutcome) {
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
        if (localAnalyzePageRef.current?.requestId === requestId) {
            localAnalyzePageRef.current = null;
        }
        analyzeFlowEndedAtRef.current = Date.now();
        reconcileVisibleAnalyzingState();
    };

    const handleAnalyze = async (
        context: NonNullable<typeof editableAnalyzeContextRef.current> | null = null,
    ) => {
        const invocation = context || editableAnalyzeContextRef.current;
        if (!invocation || !editableAnalyzeContextIsCurrent(invocation)) return;
        const targetData = invocation.data;
        // Check if we have enough info to analyze (either error text OR title)
        const hasContent = targetData.errorText || targetData.description || targetData.ticketTitle;
        if (!hasContent) return;

        const requestId = crypto.randomUUID();
        const pageIdentityOfRun = currentPageIdentityRef.current;
        const acceptedGenerationOfRun = invocation.accepted.generation;
        const caseNumberOfRun = targetData.caseNumber || '';
        if (analyzeSafetyTimerRef.current) {
            clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
            analyzeSafetyTimerRef.current = null;
        }
        latestRequestId.current = requestId;
        localAnalyzeRequestIdRef.current = requestId;
        localAnalyzePageRef.current = {
            requestId,
            pageIdentity: pageIdentityOfRun,
            caseNumber: caseNumberOfRun,
            acceptedGeneration: acceptedGenerationOfRun,
        };
        analyzeOriginRef.current = { requestId, pageIdentity: pageIdentityOfRun };
        identityChangedDuringAnalyzeRef.current = false;
        postRunScanOwnerRef.current = requestId;
        reconcileVisibleAnalyzingState();

        trackEvent('Analyze Clicked', { 
            hasContext: !!targetData.source,
            sap: targetData.productCategory || 'Unknown'
        });

        const startTime = Date.now();
        
        // Safety timeout to prevent infinite "Analyzing..." state.
        // Derived from prefs.analyzeTimeoutSeconds (C2b-lite, user-
        // configurable in Options, clamped [60, 3600]) + 10s grace so
        // the host's truthful "Copilot did not finish within Ns" branch
        // always fires before this generic fallback. Default 1200s → 1210s.
        const _analyzeTimeoutSec = Math.max(60, Math.min(3600, prefs.analyzeTimeoutSeconds ?? 1200));
        const _safetyTimeoutMs = (_analyzeTimeoutSec + 10) * 1000;
        const timeoutId = setTimeout(() => {
            if (localAnalyzeRequestIdRef.current !== requestId) return;
            void finishAnalyzeTerminal(
                requestId,
                invocation,
                pageIdentityOfRun,
                acceptedGenerationOfRun,
                caseNumberOfRun,
                { kind: 'timeout' },
            );
        }, _safetyTimeoutMs);
        analyzeSafetyTimerRef.current = { requestId, timeoutId };

        try {
            // Construct payload
            // If the errorText ALREADY looks like our full markdown template (starts with ## Ticket ID or ## Case Number), use it as is.
            // Otherwise (Auto-Analyze or fresh scan), construct the template.
            let fullContext = "";
            if (targetData.errorText && (targetData.errorText.startsWith('## Ticket ID') || targetData.errorText.startsWith('## Case Number'))) {
                fullContext = targetData.errorText;
            } else {
                fullContext = constructTemplate(targetData);
            }
            fullContext = applyCurrentUserPrompt(fullContext, prefs.userPrompt);

            // Only show bubble if we initiated manually and it wasn't already shown by auto-analyze logic
            if (
                !statusBubble.visible
                && requestOwnsVisiblePage(pageIdentityOfRun, acceptedGenerationOfRun)
            ) {
                 showStatusBubble(t('analyzing'), 'default', 0);
            }

            const rootPath = typeof effectivePrefs.rootPath === 'string'
                ? effectivePrefs.rootPath
                : '';
            const hostPayload = {
                text: fullContext,
                context: targetData.source || 'Unknown Context',
                timestamp: new Date().toLocaleString(),
                rootPath,
                ...(typeof targetData.productCategory === 'string'
                    ? { product: targetData.productCategory }
                    : {}),
                ...(typeof targetData.caseNumber === 'string'
                    ? { caseNumber: targetData.caseNumber }
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
                        caseNumber: targetData.caseNumber || '',
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
            const durabilityWarning = localizeAnalysisWarnings(
                parsedResponse.extension_warnings,
            );
            if (parsedResponse.status === 'success') {
                const analysisData = parsedResponse.data;
                const duration = (Date.now() - startTime) / 1000;
                const caseHash = await hashCaseId(caseNumberOfRun);
                if (latestRequestId.current !== requestId) return;
                await finishAnalyzeTerminal(
                    requestId,
                    invocation,
                    pageIdentityOfRun,
                    acceptedGenerationOfRun,
                    caseNumberOfRun,
                    {
                        kind: 'success',
                        markdown: analysisData.markdown,
                        savedTo: analysisData.saved_to,
                        duration,
                        caseHash,
                        sap: targetData.productCategory || 'Unknown',
                        severity: targetData.severity || 'Unknown',
                        durabilityWarning,
                    },
                );
            } else {
                await finishAnalyzeTerminal(
                    requestId,
                    invocation,
                    pageIdentityOfRun,
                    acceptedGenerationOfRun,
                    caseNumberOfRun,
                    {
                        kind: 'host-error',
                        error: parsedResponse.error,
                        errorCode: parsedResponse.error_code,
                        durabilityWarning,
                    },
                );
            }
        } catch (e: unknown) {
            if (latestRequestId.current === requestId) {
                await finishAnalyzeTerminal(
                    requestId,
                    invocation,
                    pageIdentityOfRun,
                    acceptedGenerationOfRun,
                    caseNumberOfRun,
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

    const handleFabUpdate = () => {
        if (!updateAvailable) return;
        setIsOpen(false);
        showStatusBubble(`${t('downloadingVersion')} ${updateAvailable.version.replace(/^v?/, 'v')}...`, 'default', 0);
        trackEvent('FAB Update Started', { version: updateAvailable.version });

        chrome.runtime.sendMessage({
            type: "NATIVE_MSG",
            payload: {
                action: "perform_update",
                payload: { url: updateAvailable.url }
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                showStatusBubble(`${t('updateFailed')}: ` + chrome.runtime.lastError.message, 'error');
                trackException(new Error('FAB Update: ' + chrome.runtime.lastError.message));
                return;
            }

            if (response && response.status === "success") {
                showStatusBubble(t('updateInstalled'), 'success', 5000);
                trackEvent('FAB Update Success', { version: updateAvailable.version });
                setUpdateAvailable(null);
                chrome.storage.local.remove("pending_update");
                setTimeout(() => {
                    chrome.runtime.reload();
                }, 1500);
            } else {
                const errMsg = safeErrorText(
                    [response?.error, response?.message],
                    t('unknownError'),
                );
                showStatusBubble(`${t('updateFailed')}: ` + errMsg, 'error');
                trackEvent('FAB Update Failed', { version: updateAvailable.version, error: errMsg });
            }
        });
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
                        {updateAvailable && (
                            <button
                                onClick={() => { handleFabUpdate(); }}
                                className="dh-item"
                                style={{ backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}
                            >
                                <span className="dh-item-icon" style={{ color: '#16A34A' }}>
                                    <RefreshCw size={18} />
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span className="dh-item-label" style={{ color: '#15803D' }}>{t('updateAvailable')}</span>
                                    <span style={{ fontSize: '11px', color: '#16A34A' }}>{t('version')} {updateAvailable.version}</span>
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
                                    !scrapedData?.errorText
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
                        {updateAvailable && (
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
