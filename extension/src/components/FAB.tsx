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
    } | null>(null);
    const postRunScanOwnerRef = React.useRef<string | null>(null);
    const analyzeOriginRef = React.useRef<{
        requestId: string;
        pageIdentity: PageIdentity | null;
    } | null>(null);
    const identityChangedDuringAnalyzeRef = React.useRef(false);
    const initialScanStartedRef = React.useRef(false);
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
            && localPage.pageIdentity === currentIdentity,
        );
        const hydratedPending = hydratedPendingRef.current;
        const hydratedVisible = Boolean(
            hydratedPending
            && hydratedPending.caseNumber === hydrationCaseNumberRef.current,
        );
        setIsAnalyzing(localVisible || hydratedVisible);
        isAnalyzingRef.current = Boolean(activeRequestId);
    };

    // When the hook surfaces a persisted result and no popover is open, mirror
    // it into local resultPopover state. Then acknowledge its identity so a
    // future remount doesn't re-open the same result (one-shot semantics).
    useEffect(() => {
        if (!hydration.popover) return;
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
    }, [hydration.popover, resultPopover.isOpen, hydration, hydrationCaseNumber]);

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
    ]);

    useEffect(() => () => {
        if (analyzeSafetyTimerRef.current) {
            clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
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
                && localPage.pageIdentity === currentPageIdentityRef.current,
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

    function applyIdentityScan(fresh: unknown): void {
        const parsed = parsePageIdentitySnapshot(fresh);
        if (!parsed) return;
        const { identity, caseNumber } = parsed;
        const wasInitialized = currentPageIdentityInitializedRef.current;
        const identityChanged = identity !== currentPageIdentityRef.current;
        const caseChanged = caseNumber !== currentCaseNumberRef.current;
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
    ): void {
        const previousIdentity = currentPageIdentityRef.current;
        const plain = parseScrapedDataSnapshot(fresh);
        if (!plain) return;
        const parsed = parsePageIdentitySnapshot(plain);
        if (!parsed) return;
        const nextIdentity = parsed.identity;
        applyIdentityScan(plain);
        const replaceAfterAnalyze = isPostRunScan && (
            identityChangedDuringAnalyzeRef.current
            || nextIdentity !== completedOrigin
        );
        if (replaceAfterAnalyze) {
            isUserEdited.current = false;
            setHasAutoAnalyzed(false);
        }
        setScrapedData(previous => {
            if (replaceAfterAnalyze || nextIdentity !== previousIdentity) {
                isUserEdited.current = false;
                setHasAutoAnalyzed(false);
                return plain;
            }
            if (isUserEdited.current) return previous;
            return plain;
        });
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

    // Auto-scan when opening
    useEffect(() => {
        // Wrapper for async scan
        const doScan = async () => {
             const scan = async () => {
                 try {
                     return await PageReader.scanForErrors();
                 } catch {
                     console.warn('[DH] Page scan failed');
                     return null;
                 }
             };
             if (!initialScanStartedRef.current) {
                 initialScanStartedRef.current = true;
                 // Initial scan on mount (even if closed) to support auto-analyze without opening
                 const initialData = await scan();
                 if (initialData) {
                     if (localAnalyzeRequestIdRef.current) applyIdentityScan(initialData);
                     else applyFullScan(initialData);
                 }
             }

             if (isOpen) {
                 const freshData = await scan();
                 if (freshData) {
                     if (localAnalyzeRequestIdRef.current) applyIdentityScan(freshData);
                     else applyFullScan(freshData);
                 }
             }
        };
        
        doScan();
    }, [isOpen]); 

    // Listen for Context Menu triggers (Right-click -> Analyze Error)
    useEffect(() => {
        const handleTriggerAnalyze = async (e: any) => {
            const { selectionText, rootPath } = e.detail;
            console.log("[DH] Context Menu Triggered:", { selectionText, rootPath });

            // If rootPath is provided, ensure our prefs are consistent
            if (rootPath && rootPath !== effectivePrefs.rootPath) {
                setRootPathOverride(rootPath);
            }

            if (selectionText) {
                // We need to merge the selection with the current page context (Case Number, Product, etc.)
                // so the analysis file is saved in the correct folder.
                let baseData = scrapedData;
                
                // If we don't have cached data (e.g. menu never opened), scan now
                if (!baseData) {
                    baseData = await PageReader.scanForErrors();
                }

                // Construct the data object for analysis
                const dataToAnalyze: ScrapedData = {
                    ...(baseData || {}),
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
                setScrapedData(dataToAnalyze);
                
                // Trigger analysis immediately
                // Note: We use the functional form or pass data directly to avoid stale state issues
                handleAnalyze(dataToAnalyze);
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
            let freshData: ScrapedData | null;
            try {
                freshData = await PageReader.scanForErrors();
            } catch {
                console.warn('[DH] Page scan failed');
                return;
            }
            if (!freshData) return;
            if (localAnalyzeRequestIdRef.current || isOpen) {
                if (localAnalyzeRequestIdRef.current) {
                    applyIdentityScan(freshData);
                }
                return;
            }
            applyFullScan(freshData);
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
        if (!scrapedData || hasAutoAnalyzed) return;

        // --- Auto Analyze Logic ---
        if (prefs.autoAnalyzeMode === 'always') {
            // Check if we have valid data to analyze
            // For auto-analyze, we construct the template if needed to ensure length check passes
            // We use the helper to get the "full" text that would be analyzed
            const fullText = applyCurrentUserPrompt(
                constructTemplate(scrapedData),
                prefs.userPrompt,
            );
            // Simple check: do we have enough *real* content (description/title)? 
            // The template adds headers, so length > 50 is a safe bet for "non-empty".
            // A safer check might be to look at the raw fields again.
            const rawContent = scrapedData.errorText || scrapedData.description || scrapedData.ticketTitle || "";
            
            // Check if we have at least a Ticket ID to consider it valid context for AUTO analysis.
            // We strictly require a Ticket ID here to avoid triggering on List Views (e.g. "My Open Cases").
            const hasValidIdentifier = scrapedData.caseNumber && scrapedData.caseNumber.length > 3; // Relaxed length check for "WO-1" etc
            
            // AND ensure the raw content isn't just whitespace.
            // If we have a valid Ticket ID, we can be more lenient with content length (e.g. short errors like "Access Denied").
            // If we DO NOT have a Ticket ID (unlikely given check above), we'd want strict length.
            // We'll require > 10 chars to avoid noise, but 30 was likely blocking real short errors.
            const hasEnoughContent = rawContent.trim().length > 10;

            console.log("[DH] Auto-Analyze Check:", { 
                hasValidIdentifier, 
                hasEnoughContent, 
                caseNumber: scrapedData.caseNumber, 
                contentLength: rawContent.trim().length 
            });

            if (hasValidIdentifier && hasEnoughContent) { 
                    setHasAutoAnalyzed(true); // Mark as handled immediately to prevent double-fire
                    showStatusBubble(t('analyzing'), 'default', 0); // Show analyzing status persistently until done
                    setTimeout(() => handleAnalyze(scrapedData), 100); // Reduced delay
            }
        } else if (prefs.autoAnalyzeMode === 'critical') {
            // Critical criteria: Sev 1 OR A, AND Status Reason "Initial contact pending"
            const isSevCritical = scrapedData.severity?.includes('1') || scrapedData.severity?.toUpperCase().includes('A');
            const isInitialPending = scrapedData.statusReason?.toLowerCase().includes('initial contact pending');
            
            const rawContent = scrapedData.errorText || scrapedData.description || scrapedData.ticketTitle || "";
            
            // Critical Mode: Same strict check (Case Number required)
            const hasValidIdentifier = scrapedData.caseNumber && scrapedData.caseNumber.length > 5;

            if (isSevCritical && isInitialPending && hasValidIdentifier && rawContent.length > 20) {
                setHasAutoAnalyzed(true);
                showStatusBubble(t('analyzing'), 'default', 0);
                setTimeout(() => handleAnalyze(scrapedData), 100); // Reduced delay
            }
        } else if (prefs.autoAnalyzeMode === 'new_cases') {
             // New Cases criteria: Status Reason "Initial contact pending" (regardless of severity)
             const isInitialPending = scrapedData.statusReason?.toLowerCase().includes('initial contact pending');
             
             const rawContent = scrapedData.errorText || scrapedData.description || scrapedData.ticketTitle || "";
             const hasValidIdentifier = scrapedData.caseNumber && scrapedData.caseNumber.length > 5;

             if (isInitialPending && hasValidIdentifier && rawContent.length > 20) {
                 setHasAutoAnalyzed(true);
                 showStatusBubble(t('analyzing'), 'default', 0);
                 setTimeout(() => handleAnalyze(scrapedData), 100);
             }
        }
    }, [isOpen, scrapedData, prefs.autoAnalyzeMode, prefs.userPrompt, hasAutoAnalyzed]);

    const handleRefreshContext = async () => {
        let data: ScrapedData | null;
        try {
            data = await PageReader.scanForErrors();
        } catch {
            console.warn('[DH] Page scan failed');
            return;
        }
        
        // Ensure data is not null before processing
        if (data) {
            if (localAnalyzeRequestIdRef.current) {
                applyIdentityScan(data);
            } else {
                // Explicit refresh — user wants fresh data, so reset the edit flag
                isUserEdited.current = false;
                setHasAutoAnalyzed(false);
                applyFullScan(data);
            }
        }
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

    const runPostAnalyzeScan = async (requestId: string): Promise<void> => {
        if (postRunScanOwnerRef.current !== requestId) return;
        const originRecord = analyzeOriginRef.current;
        if (!originRecord || originRecord.requestId !== requestId) return;
        const origin = originRecord.pageIdentity;
        postRunScanOwnerRef.current = null;
        try {
            const fresh = await PageReader.scanForErrors();
            if (
                fresh
                && analyzeOriginRef.current?.requestId === requestId
            ) {
                applyFullScan(fresh, origin, true);
            }
        } catch {
            console.warn('[DH] Post-analysis page scan failed');
        } finally {
            if (analyzeOriginRef.current?.requestId === requestId) {
                analyzeOriginRef.current = null;
                identityChangedDuringAnalyzeRef.current = false;
            }
            if (localAnalyzePageRef.current?.requestId === requestId) {
                localAnalyzePageRef.current = null;
            }
        }
    };

    const handleAnalyze = async (dataToAnalyze: ScrapedData | null = null) => {
        // Use provided data or fall back to state
        const targetData = dataToAnalyze || scrapedData;

        if (!targetData) return;
        // Check if we have enough info to analyze (either error text OR title)
        const hasContent = targetData.errorText || targetData.description || targetData.ticketTitle;
        if (!hasContent) return;

        const requestId = crypto.randomUUID();
        const pageIdentityOfRun = currentPageIdentityRef.current;
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
            const requestStillOwnsVisiblePage =
                pageIdentityOfRun !== null
                && pageIdentityOfRun === currentPageIdentityRef.current;
            if (analyzeSafetyTimerRef.current?.requestId === requestId) {
                analyzeSafetyTimerRef.current = null;
            }
            localAnalyzeRequestIdRef.current = null;
            if (latestRequestId.current === requestId) {
                latestRequestId.current = null;
            }
            if (hydratedPendingRef.current?.requestId === requestId) {
                hydratedPendingRef.current = null;
            }
            analyzeFlowEndedAtRef.current = Date.now();
            reconcileVisibleAnalyzingState();
            if (requestStillOwnsVisiblePage) {
                showAnalysisError(
                    t('analysisFailed'),
                    undefined,
                    { requestId, caseNumber: caseNumberOfRun },
                );
                trackEvent('Analyze Timeout');
            }
            void runPostAnalyzeScan(requestId);
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
            if (!statusBubble.visible && pageIdentityOfRun !== null) {
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
                        const caseNum = targetData.caseNumber || '';
                        const caseHash = await hashCaseId(caseNum);
                        if (latestRequestId.current !== requestId) return;
                        const sap = targetData.productCategory || 'Unknown';
                        const severity = targetData.severity || 'Unknown';
                        const requestStillOwnsVisiblePage =
                            pageIdentityOfRun !== null
                            && pageIdentityOfRun === currentPageIdentityRef.current;

                        if (requestStillOwnsVisiblePage) {
                            trackEvent('Analyze Success', {
                                durationSeconds: duration,
                                caseIdHash: caseHash,
                                sap,
                                severity,
                            });

                            // Fire "Case Analyzed" only once per unique case per session.
                            if (caseHash && !reportedCases.current.has(caseHash)) {
                                reportedCases.current.add(caseHash);
                                trackEvent('Case Analyzed', {
                                    caseIdHash: caseHash,
                                    sap,
                                    severity,
                                });
                            }
                            setLastDuration(`${duration.toFixed(1)}s`);
                            showStatusBubble(`${t('analysisComplete')} (${duration.toFixed(1)}s)`, 'success', 3000);
                            popoverIsAnalyze.current = true;
                            setResultPopover({
                                isOpen: true,
                                title: `🤖 Copilot ${t('analyze')}`,
                                content: analysisData.markdown,
                                durabilityWarning,
                                path: analysisData.saved_to,
                                duration: `${duration.toFixed(1)}s`,
                                identity: {
                                    requestId,
                                    caseNumber: caseNumberOfRun,
                                },
                            });
                            setIsOpen(false); // Close menu to show result
                        }
            } else {
                const requestStillOwnsVisiblePage =
                    pageIdentityOfRun !== null
                    && pageIdentityOfRun === currentPageIdentityRef.current;
                if (requestStillOwnsVisiblePage) {
                    showAnalysisError(
                        parsedResponse.error,
                        parsedResponse.error_code,
                        { requestId, caseNumber: caseNumberOfRun },
                        durabilityWarning,
                    );
                    trackEvent('Analyze Host Error', {
                        errorCode: parsedResponse.error_code ?? 'unclassified',
                    });
                }
            }
        } catch (e: any) {
            const requestStillOwnsVisiblePage =
                pageIdentityOfRun !== null
                && pageIdentityOfRun === currentPageIdentityRef.current;
            if (latestRequestId.current === requestId && requestStillOwnsVisiblePage) {
                showAnalysisError(
                    `${t('errorLabel')}: ${safeErrorText(
                        [e?.message, e],
                        t('unknownError'),
                    )}`,
                    undefined,
                    { requestId, caseNumber: caseNumberOfRun },
                );
                trackEvent('Analyze Exception', { errorCode: 'unclassified' });
            }
        } finally {
            if (analyzeSafetyTimerRef.current?.requestId === requestId) {
                clearTimeout(analyzeSafetyTimerRef.current.timeoutId);
                analyzeSafetyTimerRef.current = null;
            }
            if (localAnalyzeRequestIdRef.current === requestId) {
                localAnalyzeRequestIdRef.current = null;
                if (latestRequestId.current === requestId) {
                    latestRequestId.current = null;
                }
                if (hydratedPendingRef.current?.requestId === requestId) {
                    hydratedPendingRef.current = null;
                }
                analyzeFlowEndedAtRef.current = Date.now();
                reconcileVisibleAnalyzingState();
                await runPostAnalyzeScan(requestId);
            }
            // Don't clear bubble here immediately if success/error, let the timeout handle it. 
            // If manual cancel or something else, we might need to check.
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
                                disabled={!scrapedData?.errorText || isAnalyzing}
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
